import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { supabaseAdmin } from "../../../lib/supabase/server";
import { checkSteadfastFraud, createSteadfastBooking } from "../../../lib/steadfast/client";

export const runtime = "nodejs";

type BlouseOption = "withoutBlouse" | "withBlouse";
type OrderItemInput = {
  productId: string;
  quantity: number;
  blouseOption: BlouseOption;
};
type OrderRequest = {
  customer_name: string;
  phone: string;
  district: string;
  upazila: string;
  address: string;
  note?: string;
  delivery_type: "insideDhaka" | "outsideDhaka";
  items: OrderItemInput[];
};

const GOOGLE_SHEET_URL =
  "https://script.google.com/macros/s/AKfycbxFH2iBwJ1mdPazSOo6S67kiN22Ib6OLnzlQ6R3DsAS5h4hk-D6O_lpQHlE_kHGtPbchg/exec";

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function isHttpUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\/\S+$/i.test(value.trim());
}

function getProductImageUrl(product: any): string {
  let images: any[] = [];

  if (Array.isArray(product?.images)) {
    images = product.images;
  } else if (typeof product?.images === "string") {
    const raw = product.images.trim();
    try {
      const parsed = JSON.parse(raw);
      images = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      if (isHttpUrl(raw)) images = [raw];
    }
  } else if (product?.images && typeof product.images === "object") {
    images = [product.images];
  }

  const thumbnail = images.find(
    (image) =>
      image &&
      typeof image === "object" &&
      (image.isThumbnail === true || image.is_thumbnail === true)
  );

  const thumbnailIndex = Number(product?.thumbnail_index);
  const selected =
    thumbnail ??
    (Number.isInteger(thumbnailIndex) && thumbnailIndex >= 0
      ? images[thumbnailIndex]
      : undefined) ??
    images[0];

  const candidates = [
    selected,
    product?.thumbnail_url,
    product?.image_url,
    product?.main_image,
    product?.image,
  ];

  for (const candidate of candidates) {
    const url =
      typeof candidate === "string"
        ? candidate
        : candidate?.url ??
          candidate?.src ??
          candidate?.secure_url ??
          candidate?.imageUrl ??
          candidate?.image_url;

    if (isHttpUrl(url)) return url.trim();
  }

  return "";
}

async function saveOrderToGoogleSheet(payload: Record<string, unknown>) {
  const response = await fetch(GOOGLE_SHEET_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
    redirect: "follow",
    cache: "no-store",
  });

  const responseText = await response.text();
  let result: any = null;

  try {
    result = JSON.parse(responseText);
  } catch {
    // Apps Script may return an HTML permission/error page instead of JSON.
  }

  if (!response.ok) {
    throw new Error(
      `Google Sheet HTTP ${response.status}: ${responseText.slice(0, 400)}`
    );
  }

  if (result?.success !== true) {
    throw new Error(
      result?.message ||
        `Google Sheet returned an unexpected response: ${responseText.slice(0, 400)}`
    );
  }

  return result;
}

async function telegramApi(
  token: string,
  method: string,
  payload: Record<string, unknown>
) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const responseText = await response.text();
  let result: any = null;

  try {
    result = JSON.parse(responseText);
  } catch {
    // Keep the raw response in the error below.
  }

  if (!response.ok || result?.ok !== true) {
    throw new Error(
      result?.description ||
        `Telegram ${method} failed (${response.status}): ${responseText.slice(0, 300)}`
    );
  }

  return result;
}

async function sendTelegramPhoto(
  token: string,
  chatId: string,
  imageUrl: string
) {
  try {
    await telegramApi(token, "sendPhoto", {
      chat_id: chatId,
      photo: imageUrl,
    });
    return;
  } catch (urlError) {
    // If Telegram cannot fetch the image URL itself, upload the image from our server.
    const imageResponse = await fetch(imageUrl, {
      redirect: "follow",
      cache: "no-store",
    });

    if (!imageResponse.ok) {
      throw new Error(
        `Image URL fetch failed (${imageResponse.status}); Telegram URL error: ${
          urlError instanceof Error ? urlError.message : String(urlError)
        }`
      );
    }

    const imageBlob = await imageResponse.blob();
    const filename =
      imageUrl.split("?")[0].split("/").pop() || "product-image.jpg";

    const form = new FormData();
    form.append("chat_id", chatId);
    form.append("photo", imageBlob, filename);

    const uploadResponse = await fetch(
      `https://api.telegram.org/bot${token}/sendPhoto`,
      {
        method: "POST",
        body: form,
        cache: "no-store",
      }
    );

    const uploadText = await uploadResponse.text();
    let uploadResult: any = null;

    try {
      uploadResult = JSON.parse(uploadText);
    } catch {
      // Keep raw response for diagnostics.
    }

    if (!uploadResponse.ok || uploadResult?.ok !== true) {
      throw new Error(
        uploadResult?.description ||
          `Telegram photo upload failed (${uploadResponse.status}): ${uploadText.slice(0, 300)}`
      );
    }
  }
}

async function sendTelegramNotify(message: string, images: string[] = []) {
  const token = process.env.TELEGRAM_BOT2_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_NOTIFY_CHAT_ID?.trim();

  if (!token || !chatId) {
    console.error("Telegram notification skipped: bot token or notify chat ID is missing.");
    return;
  }

  const validImages = [...new Set(images.filter(isHttpUrl))];
  let sentImages = 0;

  for (const imageUrl of validImages) {
    try {
      await sendTelegramPhoto(token, chatId, imageUrl);
      sentImages += 1;
    } catch (error) {
      console.error("Telegram product image send failed:", error);
    }
  }

  // Send the complete order details as a separate message. This avoids Telegram's
  // 1024-character photo-caption limit and guarantees the text is not lost if a photo fails.
  try {
    await telegramApi(token, "sendMessage", {
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  } catch (error) {
    console.error("Telegram order message send failed:", error);
  }

  if (validImages.length > 0 && sentImages === 0) {
    console.error("Telegram notification sent without product photos; all photo attempts failed.");
  }
}

function getSellingPrice(product: any, blouseOption: BlouseOption) {
  if (product.price_type === "single") {
    return product.single_discount_price ?? product.single_price ?? 0;
  }
  if (blouseOption === "withBlouse") {
    return product.discount_with_blouse_price ?? product.with_blouse_price ?? 0;
  }
  return product.discount_without_blouse_price ?? product.without_blouse_price ?? 0;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OrderRequest;

    if (
      !body.customer_name ||
      !body.phone ||
      !body.district ||
      !body.upazila ||
      !body.address ||
      !body.delivery_type ||
      !Array.isArray(body.items) ||
      body.items.length === 0
    ) {
      return NextResponse.json(
        { success: false, message: "Required order information missing." },
        { status: 400 }
      );
    }

    const cleanPhone = String(body.phone).replace(/[\s-]/g, "");
    if (!/^01[3-9]\d{8}$/.test(cleanPhone)) {
      return NextResponse.json(
        { success: false, message: "আপনার নাম্বার টি সঠিক নয়।" },
        { status: 400 }
      );
    }

    for (const item of body.items) {
      if (!item.productId || !Number.isInteger(item.quantity) || item.quantity <= 0) {
        return NextResponse.json(
          { success: false, message: "Invalid product quantity." },
          { status: 400 }
        );
      }
    }

    let fraudCheckResult;
    try {
      fraudCheckResult = await checkSteadfastFraud(body.phone);
    } catch (fraudError) {
      console.error("Steadfast fraud check failed:", fraudError);
      return NextResponse.json(
        { success: false, message: "Fraud check করা যাচ্ছে না।" },
        { status: 503 }
      );
    }

    const productIds = [...new Set(body.items.map((item) => item.productId))];

    // Select all product columns. This is also the query used by the working
    // Telegram manual-order flow, and includes the JSON images column.
    const { data: products, error: productsError } = await supabaseAdmin
      .from("products")
      .select("*")
      .in("id", productIds);

    if (productsError || !products || products.length !== productIds.length) {
      console.error("Order product lookup failed:", productsError);
      return NextResponse.json(
        { success: false, message: "Product information load failed." },
        { status: 500 }
      );
    }

    const productMap = new Map<string, any>(
      (products as any[]).map((product: any) => [String(product.id), product])
    );

    const orderItems = body.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new Error("Product not found");

      if (item.quantity > product.stock_quantity) {
        throw new Error(`${product.name} এর stock নেই।`);
      }

      const unitPrice = getSellingPrice(product, item.blouseOption);
      const costPrice =
        product.cost_price === null ? 0 : Number(product.cost_price);
      const imageUrl = getProductImageUrl(product);

      return {
        productId: product.id,
        productName: product.name,
        imageUrl,
        quantity: item.quantity,
        blouseOption: item.blouseOption,
        unitPrice,
        totalPrice: unitPrice * item.quantity,
        costPrice,
        costTotal: costPrice * item.quantity,
      };
    });

    const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const costTotal = orderItems.reduce((sum, item) => sum + item.costTotal, 0);
    const hasFreeDelivery = products.some(
      (product: any) => product.is_free_delivery === true
    );
    const deliveryCharge = hasFreeDelivery
      ? 0
      : body.delivery_type === "insideDhaka"
        ? 110
        : 130;
    const total = subtotal + deliveryCharge;
    const orderNumber = `SC-${crypto.randomUUID()
      .replace(/-/g, "")
      .slice(0, 10)
      .toUpperCase()}`;

    const { data: createdOrder, error: orderError } = await supabaseAdmin.rpc(
      "create_order_with_stock",
      {
        p_order_number: orderNumber,
        p_customer_name: body.customer_name,
        p_phone: body.phone,
        p_district: body.district,
        p_upazila: body.upazila,
        p_address: body.address,
        p_note: body.note || "",
        p_delivery_type: body.delivery_type,
        p_items: orderItems,
        p_subtotal: subtotal,
        p_delivery_charge: deliveryCharge,
        p_total: total,
        p_cost_total: costTotal,
      }
    );

    if (orderError) {
      console.error("Supabase order save failed:", orderError);
      return NextResponse.json(
        { success: false, message: "Order save করা যায়নি।" },
        { status: 400 }
      );
    }

    const { data: previousOrders } = await supabaseAdmin
      .from("orders")
      .select("order_number, created_at, total, steadfast_delivery_status")
      .eq("phone", cleanPhone)
      .order("created_at", { ascending: false })
      .limit(5);

    let historyMsg = "";
    if (previousOrders && previousOrders.length > 0) {
      historyMsg = `\n⚠️ <b>এই নাম্বারে আগের অর্ডারগুলো:</b>\n`;
      previousOrders.forEach((order: any, index: number) => {
        const date = new Date(order.created_at).toLocaleString("en-GB", {
          timeZone: "Asia/Dhaka",
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        const status = order.steadfast_delivery_status
          ? String(order.steadfast_delivery_status).toUpperCase()
          : "PENDING";
        historyMsg += `${index + 1}️⃣ ${date} | 💰 ${order.total}৳ | 📦 ${status}\n`;
      });
      historyMsg += `━━━━━━━━━━━━━━━━━━━\n`;
    }

    const fraudStatus = fraudCheckResult.isFraud
      ? "blocked"
      : fraudCheckResult.requiresReview
        ? "review"
        : "passed";

    const { error: fraudUpdateError } = await supabaseAdmin
      .from("orders")
      .update({
        fraud_check_status: fraudStatus,
        fraud_total_parcels: fraudCheckResult.totalParcels,
        fraud_total_delivered: fraudCheckResult.totalDelivered,
        fraud_total_cancelled: fraudCheckResult.totalCancelled,
        fraud_score: fraudCheckResult.score,
        fraud_level: fraudCheckResult.level,
        fraud_delivery_ratio: fraudCheckResult.deliveryRatio,
        fraud_cancellation_ratio: fraudCheckResult.cancellationRatio,
        fraud_return_ratio: fraudCheckResult.returnRatio,
        fraud_total_reports: fraudCheckResult.totalFraudReports,
        fraud_checked_at: new Date().toISOString(),
      })
      .eq("order_number", orderNumber);

    if (fraudUpdateError) {
      console.error("Fraud result database update failed:", fraudUpdateError);
    }

    const createdOrderRow = Array.isArray(createdOrder)
      ? createdOrder[0]
      : createdOrder;
    const orderDate = createdOrderRow?.order_date ?? new Date().toISOString();

    const sheetPayload = {
      order_id: orderNumber,
      order_date: orderDate,
      customer_name: body.customer_name,
      phone: cleanPhone,
      district: body.district,
      upazila: body.upazila,
      address: body.address,
      items: orderItems,
      subtotal,
      delivery_charge: deliveryCharge,
      total,
      status: fraudCheckResult.isFraud ? "fraud_blocked" : "pending",
      purchase_cost: costTotal,
    };

    // Google Sheets sync runs in the background. It must never delay the
    // customer's order confirmation after Supabase has saved the order.
    waitUntil(
      saveOrderToGoogleSheet(sheetPayload)
        .then((sheetResult) => {
          console.log("Google Sheet order saved:", orderNumber, sheetResult);
        })
        .catch((sheetError) => {
          console.error("Google Sheet order save failed:", orderNumber, sheetError);
        })
    );

    if (fraudCheckResult.isFraud) {
      return NextResponse.json(
        {
          success: false,
          is_fraud: true,
          message: "অর্ডার গ্রহণ যোগ্য নয়।",
        },
        { status: 403 }
      );
    }

    let bookingSuccess = false;
    let bookingTrackingCode = "Pending";
    let bookingConsignmentId = "Pending";

    try {
      const bookingResult = await createSteadfastBooking({
        invoice: orderNumber,
        recipient_name: body.customer_name,
        recipient_phone: cleanPhone,
        recipient_address: `${body.address}, ${body.upazila}, ${body.district}`,
        cod_amount: total,
        note: body.note || "",
        item_description: orderItems
          .map((item) => `${item.productName} x${item.quantity}`)
          .join(", ")
          .slice(0, 250),
      });

      bookingTrackingCode = bookingResult.trackingCode;
      bookingConsignmentId = bookingResult.consignmentId;

      const { error: bookingUpdateError } = await supabaseAdmin
        .from("orders")
        .update({
          steadfast_consignment_id: bookingResult.consignmentId,
          steadfast_tracking_code: bookingResult.trackingCode,
          steadfast_booking_status: "booked",
          steadfast_booking_date:
            bookingResult.bookedAt || new Date().toISOString(),
          steadfast_delivery_status: bookingResult.status,
        })
        .eq("order_number", orderNumber);

      if (bookingUpdateError) {
        console.error("Steadfast booking details database update failed:", bookingUpdateError);
      }

      bookingSuccess = true;
    } catch (bookingError) {
      console.error("Steadfast booking failed:", bookingError);
      await supabaseAdmin
        .from("orders")
        .update({
          steadfast_booking_status: "booking_error",
          steadfast_booking_error:
            bookingError instanceof Error
              ? bookingError.message
              : "Unknown error",
        })
        .eq("order_number", orderNumber);
    }

    if (bookingSuccess) {
      const orderDateStr = new Date().toLocaleString("en-GB", {
        timeZone: "Asia/Dhaka",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      let message =
        `🛒 <b>NEW WEBSITE ORDER</b> 🛒\n━━━━━━━━━━━━━━━━━━━\n` +
        `📅 <b>তারিখ:</b> <b>${orderDateStr}</b>\n` +
        `🧾 <b>Order ID:</b> <code>${escapeHtml(orderNumber)}</code>\n` +
        `📦 <b>Status:</b> <b>BOOKED ✅</b>\n\n` +
        `👤 <b>Customer:</b> ${escapeHtml(body.customer_name)}\n` +
        `📞 <b>Phone:</b> <code>${escapeHtml(cleanPhone)}</code>\n` +
        `📍 <b>Address:</b> ${escapeHtml(body.address)}, ${escapeHtml(body.upazila)}, ${escapeHtml(body.district)}\n\n` +
        `💰 <b>Total Bill:</b> ৳${total}\n` +
        `📊 <b>Google Sheet:</b> Background sync ⏳\n\n`;

      message += historyMsg;
      message +=
        `\n🆔 <b>CONSIGNMENT ID</b> 🆔\n` +
        `<pre>${escapeHtml(bookingConsignmentId)}</pre>\n` +
        `🚚 <b>Tracking:</b> <a href="https://steadfast.com.bd/t/${encodeURIComponent(
          bookingTrackingCode
        )}">${escapeHtml(bookingTrackingCode)}</a>`;

      const productImages = orderItems
        .map((item) => item.imageUrl)
        .filter((url) => url !== "");

      await sendTelegramNotify(message, productImages);
    }

    return NextResponse.json({
      success: true,
      order_number: orderNumber,
      order_date: orderDate,
      total,
      booking_status: bookingSuccess ? "booked" : "error",
    });
  } catch (error) {
    console.error("Website order processing failed:", error);
    return NextResponse.json(
      { success: false, message: "Order processing failed." },
      { status: 500 }
    );
  }
}
