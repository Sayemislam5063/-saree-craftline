import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase/server";
import { verifyAdminRequest } from "../../../../lib/supabase/verify-admin";
import {
  createSteadfastReturnRequest,
  getSteadfastBalance,
  getSteadfastOrderStatus,
  getSteadfastPayments,
  getSteadfastReturnRequests,
  getSteadfastTrackingsByInvoice,
} from "../../../../lib/steadfast/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OrderRecord = {
  id: string;
  order_number: string | null;
  steadfast_consignment_id: string | number | null;
  steadfast_tracking_code: string | null;
  steadfast_booking_status: string | null;
  steadfast_delivery_status: string | null;
};

async function findOrder(orderId: unknown): Promise<OrderRecord> {
  const id = String(orderId ?? "").trim();
  if (!id || id.length > 100) throw new Error("সঠিক Order ID দেওয়া হয়নি।");

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("id, order_number, steadfast_consignment_id, steadfast_tracking_code, steadfast_booking_status, steadfast_delivery_status")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error("অর্ডারের তথ্য পাওয়া যায়নি: " + error.message);
  if (!data) throw new Error("অর্ডারটি পাওয়া যায়নি।");
  return data as OrderRecord;
}

export async function GET(request: Request) {
  const verification = await verifyAdminRequest(request);
  if (!verification.authorized) return verification.response;

  const action = new URL(request.url).searchParams.get("action");
  try {
    if (action === "balance") {
      const result = await getSteadfastBalance();
      return NextResponse.json({ success: true, current_balance: result.currentBalance });
    }
    if (action === "returns") {
      const result = await getSteadfastReturnRequests();
      return NextResponse.json({ success: true, data: result });
    }
    if (action === "payments") {
      const result = await getSteadfastPayments();
      return NextResponse.json({ success: true, data: result });
    }
    return NextResponse.json({ success: false, message: "Unknown Steadfast action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Steadfast API request failed.";
    console.error("Admin Steadfast GET failed:", message);
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const verification = await verifyAdminRequest(request);
  if (!verification.authorized) return verification.response;

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid request body.");
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, message: "সঠিক Request Body পাঠানো হয়নি।" }, { status: 400 });
  }

  const action = String(body.action ?? "");
  try {
    const order = await findOrder(body.orderId);

    if (action === "status") {
      const result = await getSteadfastOrderStatus({
        consignmentId: order.steadfast_consignment_id ?? undefined,
        trackingCode: order.steadfast_tracking_code ?? undefined,
        invoice: order.order_number ?? undefined,
      });
      const { error } = await supabaseAdmin
        .from("orders")
        .update({ steadfast_delivery_status: result.deliveryStatus })
        .eq("id", order.id);
      if (error) throw new Error("Status পাওয়া গেছে, কিন্তু database update হয়নি: " + error.message);
      return NextResponse.json({ success: true, delivery_status: result.deliveryStatus, raw: result.rawData });
    }

    if (action === "tracking") {
      if (!order.order_number) throw new Error("এই অর্ডারের Invoice / Order Number পাওয়া যায়নি।");
      const trackings = await getSteadfastTrackingsByInvoice(order.order_number);
      return NextResponse.json({ success: true, trackings });
    }

    if (action === "return") {
      if (order.steadfast_booking_status === "booking") {
        return NextResponse.json({ success: false, message: "Booking এখন processing অবস্থায় আছে। পরে চেষ্টা করো।" }, { status: 409 });
      }
      if (!order.steadfast_consignment_id && !order.steadfast_tracking_code && !order.order_number) {
        throw new Error("এই অর্ডারের Steadfast Consignment / Tracking / Invoice তথ্য নেই।");
      }
      const reason = String(body.reason ?? "Customer requested return").trim().slice(0, 500);
      const result = await createSteadfastReturnRequest({
        consignment_id: order.steadfast_consignment_id ?? undefined,
        tracking_code: order.steadfast_tracking_code ?? undefined,
        invoice: order.order_number ?? undefined,
        reason,
      });
      return NextResponse.json({ success: true, return_request: result });
    }

    return NextResponse.json({ success: false, message: "Unknown Steadfast action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Steadfast request failed.";
    console.error("Admin Steadfast POST failed:", action, message);
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}
