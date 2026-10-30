import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { supabaseAdmin } from "../../../lib/supabase/server";
import { checkSteadfastFraud, createSteadfastBooking } from "../../../lib/steadfast/client";

type BlouseOption = "withoutBlouse" | "withBlouse";
type OrderItemInput = { productId: string; quantity: number; blouseOption: BlouseOption; };
type OrderRequest = { customer_name: string; phone: string; district: string; upazila: string; address: string; note?: string; delivery_type: "insideDhaka" | "outsideDhaka"; items: OrderItemInput[]; };

const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbxFH2iBwJ1mdPazSOo6S67kiN22Ib6OLnzlQ6R3DsAS5h4hk-D6O_lpQHlE_kHGtPbchg/exec";

// ✨ আপডেট করা ফাংশন: বারকোড ছাড়া, শুধু ছবিসহ মেসেজ
async function sendTelegramNotify(message: string, images: string[] = []) {
  const token = process.env.TELEGRAM_BOT2_TOKEN;
  const chatId = process.env.TELEGRAM_NOTIFY_CHAT_ID;
  if (!token || !chatId) return;

  try {
    // প্রথমে টেক্সট মেসেজ পাঠানো
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
    });

    // এরপর ছবিগুলো পাঠানো
    for (let i = 0; i < images.length; i++) {
      await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, photo: images[i] }),
      });
    }
  } catch (err) {
    console.error("Telegram notify error:", err);
  }
}

function getSellingPrice(product: any, blouseOption: BlouseOption) {
  if (product.price_type === "single") return product.single_discount_price ?? product.single_price ?? 0;
  if (blouseOption === "withBlouse") return product.discount_with_blouse_price ?? product.with_blouse_price ?? 0;
  return product.discount_without_blouse_price ?? product.without_blouse_price ?? 0;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OrderRequest;
    if (!body.customer_name || !body.phone || !body.district || !body.upazila || !body.address || !body.delivery_type || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ success: false, message: "Required order information missing." }, { status: 400 });
    }

    const cleanPhone = String(body.phone).replace(/[\s-]/g, "");
    if (!/^01[3-9]\d{8}$/.test(cleanPhone)) {
      return NextResponse.json({ success: false, message: "আপনার নাম্বার টি সঠিক নয়।" }, { status: 400 });
    }

    for (const item of body.items) {
      if (!item.productId || !Number.isInteger(item.quantity) || item.quantity <= 0) {
        return NextResponse.json({ success: false, message: "Invalid product quantity." }, { status: 400 });
      }
    }

    let fraudCheckResult;
    try {
      fraudCheckResult = await checkSteadfastFraud(body.phone);
    } catch (fraudError) {
      return NextResponse.json({ success: false, message: "Fraud check করা যাচ্ছে না।" }, { status: 503 });
    }

    const productIds = [...new Set(body.items.map((item) => item.productId))];
    const { data: products, error: productsError } = await supabaseAdmin.from("products").select(`*, images`).in("id", productIds);

    if (productsError || !products || products.length !== productIds.length) {
      return NextResponse.json({ success: false, message: "Product information load failed." }, { status: 500 });
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    const orderItems = body.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new Error(`Product not found`);
      if (item.quantity > product.stock_quantity) throw new Error(`${product.name} এর stock নেই।`);

      const unitPrice = getSellingPrice(product, item.blouseOption);
      const costPrice = product.cost_price === null ? 0 : Number(product.cost_price);

      return {
        productId: product.id, productName: product.name, imageUrl: product.images?.find((img: any) => img?.isThumbnail)?.url ?? product.images?.[0]?.url ?? "",
        quantity: item.quantity, blouseOption: item.blouseOption, unitPrice, totalPrice: unitPrice * item.quantity, costPrice, costTotal: costPrice * item.quantity,
      };
    });

    const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const costTotal = orderItems.reduce((sum, item) => sum + item.costTotal, 0);
    const hasFreeDelivery = products.some((p: any) => p.is_free_delivery === true);
    const deliveryCharge = hasFreeDelivery ? 0 : body.delivery_type === "insideDhaka" ? 110 : 130;
    const total = subtotal + deliveryCharge;
    const orderNumber = `SC-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;

    const { data: createdOrder, error: orderError } = await supabaseAdmin.rpc("create_order_with_stock", {
      p_order_number: orderNumber, p_customer_name: body.customer_name, p_phone: body.phone, p_district: body.district, p_upazila: body.upazila, p_address: body.address, p_note: body.note || "", p_delivery_type: body.delivery_type,
      p_items: orderItems, p_subtotal: subtotal, p_delivery_charge: deliveryCharge, p_total: total, p_cost_total: costTotal,
    });

    if (orderError) return NextResponse.json({ success: false, message: "Order save করা যায়নি।" }, { status: 400 });

    const fraudStatus = fraudCheckResult.isFraud ? "blocked" : fraudCheckResult.requiresReview ? "review" : "passed";

    await supabaseAdmin.from("orders").update({
      fraud_check_status: fraudStatus, fraud_total_parcels: fraudCheckResult.totalParcels, fraud_total_delivered: fraudCheckResult.totalDelivered, fraud_total_cancelled: fraudCheckResult.totalCancelled,
      fraud_score: fraudCheckResult.score, fraud_level: fraudCheckResult.level, fraud_delivery_ratio: fraudCheckResult.deliveryRatio, fraud_cancellation_ratio: fraudCheckResult.cancellationRatio,
      fraud_return_ratio: fraudCheckResult.returnRatio, fraud_total_reports: fraudCheckResult.totalFraudReports, fraud_checked_at: new Date().toISOString(),
    }).eq("order_number", orderNumber);

    const orderDate = createdOrder?.[0]?.order_date ?? new Date().toISOString();
    const sheetPayload = { order_id: orderNumber, order_date: orderDate, customer_name: body.customer_name, phone: body.phone, district: body.district, upazila: body.upazila, address: body.address, items: orderItems, subtotal, delivery_charge: deliveryCharge, total, status: fraudCheckResult.isFraud ? "fraud_blocked" : "pending", purchase_cost: costTotal };

    waitUntil(fetch(GOOGLE_SHEET_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sheetPayload) }).catch((err) => console.error(err)));

    if (fraudCheckResult.isFraud) return NextResponse.json({ success: false, is_fraud: true, message: "অর্ডার গ্রহণ যোগ্য নয়।" }, { status: 403 });

    let bookingSuccess = false;
    let bookingTrackingCode = "Pending";
    
    try {
      const bookingResult = await createSteadfastBooking({
        invoice: orderNumber, recipient_name: body.customer_name, recipient_phone: body.phone, recipient_address: `${body.address}, ${body.upazila}, ${body.district}`,
        cod_amount: total, note: body.note || "", item_description: orderItems.map(i => `${i.productName} x${i.quantity}`).join(", ").slice(0, 250)
      });

      bookingTrackingCode = bookingResult.trackingCode;
      await supabaseAdmin.from("orders").update({
        steadfast_consignment_id: bookingResult.consignmentId, steadfast_tracking_code: bookingResult.trackingCode, steadfast_booking_status: "booked", steadfast_booking_date: bookingResult.bookedAt || new Date().toISOString(), steadfast_delivery_status: bookingResult.status,
      }).eq("order_number", orderNumber);
      bookingSuccess = true;
    } catch (bookingError) {
      await supabaseAdmin.from("orders").update({ steadfast_booking_status: "booking_error", steadfast_booking_error: bookingError instanceof Error ? bookingError.message : "Unknown error" }).eq("order_number", orderNumber);
    }

    // ✨ নোটিফিকেশন মেসেজ (বারকোড ছাড়া, প্রোডাক্ট ছবিসহ)
    if (bookingSuccess) {
      let msg = `🛒 <b>New Website Order!</b>\n\n🧾 <b>অর্ডার:</b> ${orderNumber}\n👤 <b>কাস্টমার:</b> ${body.customer_name}\n📞 <b>ফোন:</b> ${body.phone}\n📍 <b>ঠিকানা:</b> ${body.address}, ${body.upazila}, ${body.district}\n💰 <b>মোট বিল:</b> ৳${total}\n📦 <b>ট্র্যাকিং:</b> <code>${bookingTrackingCode}</code>`;
      const productImages = orderItems.map(item => item.imageUrl).filter(url => url !== "");
      waitUntil(sendTelegramNotify(msg, productImages));
    }

    return NextResponse.json({ success: true, order_number: orderNumber, order_date: orderDate, total, booking_status: bookingSuccess ? "booked" : "error" });

  } catch (error) {
    return NextResponse.json({ success: false, message: "Order processing failed." }, { status: 500 });
  }
}