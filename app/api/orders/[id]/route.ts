import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase/server";
import { verifyAdminRequest } from "../../../../lib/supabase/verify-admin";
import {
  checkSteadfastFraud,
  createSteadfastBooking,
} from "../../../../lib/steadfast/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Existing GET endpoint remains a placeholder.
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      message: "Order ID API is not implemented yet.",
    },
    { status: 501 },
  );
}

// Book one order with Steadfast.
// This function runs only when an authorized admin requests it.
export async function POST(
  request: Request,
  context: RouteContext,
) {
  const verification = await verifyAdminRequest(request);

  if (!verification.authorized) {
    return verification.response;
  }

  const { id } = await context.params;

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (orderError) {
    console.error("Order lookup failed:", orderError.message);

    return NextResponse.json(
      { success: false, message: "অর্ডারের তথ্য পাওয়া যায়নি।" },
      { status: 500 },
    );
  }

  if (!order) {
    return NextResponse.json(
      { success: false, message: "অর্ডার পাওয়া যায়নি।" },
      { status: 404 },
    );
  }

  if (order.steadfast_booking_status !== "not_booked") {
    return NextResponse.json(
      {
        success: false,
        message:
          "এই অর্ডারটি আগে থেকেই processing বা booked অবস্থায় আছে। Duplicate booking এড়াতে আগে Steadfast portal পরীক্ষা করুন।",
        booking_status: order.steadfast_booking_status,
        tracking_code: order.steadfast_tracking_code ?? null,
      },
      { status: 409 },
    );
  }

  // Check the customer's phone again immediately before booking.
  let fraudCheck;

  try {
    fraudCheck = await checkSteadfastFraud(order.phone);
  } catch (error) {
    console.error(
      "Pre-booking fraud check failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Booking-এর আগে fraud check করা যায়নি। পরে আবার চেষ্টা করুন।",
      },
      { status: 503 },
    );
  }

  const fraudStatus = fraudCheck.isFraud
    ? "blocked"
    : fraudCheck.requiresReview
      ? "review"
      : "passed";

  const { error: fraudSaveError } = await supabaseAdmin
    .from("orders")
    .update({
      fraud_check_status: fraudStatus,
      fraud_total_parcels: fraudCheck.totalParcels,
      fraud_total_delivered: fraudCheck.totalDelivered,
      fraud_total_cancelled: fraudCheck.totalCancelled,
      fraud_checked_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (fraudSaveError) {
    console.error(
      "Could not save the latest fraud check:",
      fraudSaveError.message,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Fraud check-এর তথ্য সংরক্ষণ করা যায়নি।",
      },
      { status: 500 },
    );
  }

  if (fraudCheck.isFraud) {
    return NextResponse.json(
      {
        success: false,
        message:
          "এই নম্বরে fraud signal পাওয়া গেছে। Courier booking বন্ধ রাখা হয়েছে।",
      },
      { status: 403 },
    );
  }

  const customerName = String(order.customer_name ?? "").trim();
  const customerPhone = String(order.phone ?? "").trim();

  const customerAddress = [
    order.address,
    order.upazila,
    order.district,
  ]
    .filter(
      (part) => typeof part === "string" && part.trim() !== "",
    )
    .map((part) => String(part).trim())
    .join(", ");

  const orderTotal = Number(order.total);

  if (
    !customerName ||
    !customerPhone ||
    !customerAddress ||
    !Number.isFinite(orderTotal) ||
    orderTotal < 0 ||
    !order.order_number
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "অর্ডারের নাম, ফোন, ঠিকানা বা মোট টাকা সঠিক নয়।",
      },
      { status: 400 },
    );
  }

  const items = Array.isArray(order.items) ? order.items : [];

  const itemDescription = items
    .map((item: unknown) => {
      if (!item || typeof item !== "object") return "";

      const value = item as Record<string, unknown>;

      const name =
        typeof value.name === "string"
          ? value.name
          : typeof value.productName === "string"
            ? value.productName
            : "Saree";

      const quantity = Number(value.quantity ?? 1);

      return `${name} x${
        Number.isFinite(quantity) && quantity > 0
          ? quantity
          : 1
      }`;
    })
    .filter(Boolean)
    .join(", ")
    .slice(0, 250);

  // Atomically claim the order to prevent concurrent duplicate booking.
  const { data: claimedOrder, error: claimError } =
    await supabaseAdmin
      .from("orders")
      .update({
        steadfast_booking_status: "booking",
        steadfast_booking_error: null,
      })
      .eq("id", id)
      .eq("steadfast_booking_status", "not_booked")
      .select("id")
      .maybeSingle();

  if (claimError) {
    console.error("Booking claim failed:", claimError.message);

    return NextResponse.json(
      {
        success: false,
        message: "Booking শুরু করা যায়নি।",
      },
      { status: 500 },
    );
  }

  if (!claimedOrder) {
    return NextResponse.json(
      {
        success: false,
        message:
          "অন্য একটি request এই অর্ডারটি processing করছে। Status পরীক্ষা করুন।",
      },
      { status: 409 },
    );
  }

  try {
    const booking = await createSteadfastBooking({
      invoice: String(order.order_number),
      recipient_name: customerName,
      recipient_phone: customerPhone,
      recipient_address: customerAddress,
      cod_amount:
        order.payment_method === "cod" ? orderTotal : 0,
      note:
        typeof order.note === "string"
          ? order.note.slice(0, 200)
          : "",
      item_description: itemDescription || "Saree order",
    });

    const bookingDate =
      booking.bookedAt ?? new Date().toISOString();

    const { error: saveError } = await supabaseAdmin
      .from("orders")
      .update({
        steadfast_consignment_id: booking.consignmentId,
        steadfast_tracking_code: booking.trackingCode,
        steadfast_booking_status: "booked",
        steadfast_booking_date: bookingDate,
        steadfast_delivery_status: booking.status,
        steadfast_booking_error: null,
      })
      .eq("id", id)
      .eq("steadfast_booking_status", "booking");

    if (saveError) {
      console.error(
        "Could not save booking details:",
        saveError.message,
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Booking সফল হয়ে থাকতে পারে, কিন্তু tracking তথ্য save হয়নি। আবার booking না করে Steadfast portal পরীক্ষা করুন।",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Steadfast courier booking সফল হয়েছে।",
      order_number: order.order_number,
      consignment_id: booking.consignmentId,
      tracking_code: booking.trackingCode,
      booking_date: bookingDate,
      delivery_status: booking.status,
    });
  } catch (error) {
    console.error(
      "Steadfast booking failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    const errorMessage =
      error instanceof Error
        ? error.message.slice(0, 500)
        : "Unknown booking error";

    // Do not automatically retry an uncertain booking.
    const { error: saveError } = await supabaseAdmin
      .from("orders")
      .update({
        steadfast_booking_status: "booking_error",
        steadfast_booking_error: errorMessage,
      })
      .eq("id", id)
      .eq("steadfast_booking_status", "booking");

    if (saveError) {
      console.error(
        "Could not save booking error:",
        saveError.message,
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Booking-এর ফলাফল নিশ্চিত নয়। Duplicate এড়াতে Steadfast portal পরীক্ষা করুন।",
      },
      { status: 502 },
    );
  }
}