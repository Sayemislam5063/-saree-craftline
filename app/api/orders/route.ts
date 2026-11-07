import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { supabaseAdmin } from "../../../lib/supabase/server";
import {
  checkSteadfastFraud,
  createSteadfastBooking,
} from "../../../lib/steadfast/client";

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

type FraudReport = Awaited<ReturnType<typeof checkSteadfastFraud>>;

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

function formatMoney(value: unknown): string {
  const amount = Number(value ?? 0);
  return `৳${(Number.isFinite(amount) ? amount : 0).toLocaleString("en-BD")}`;
}

function formatDhakaDateTime(value: unknown): string {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return "তারিখ পাওয়া যায়নি";
  return date.toLocaleString("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getDhakaDayKey(value: unknown): string {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return "unknown";
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
}

function getDhakaDayLabel(value: unknown): string {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return "অজানা তারিখ";
  return date.toLocaleDateString("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildOrderHistoryText(
  orders: any[],
  totalOrderCount: number
): string {
  const safeOrders = Array.isArray(orders) ? orders : [];
  if (safeOrders.length === 0) {
    return `\n⚠️ <b>CUSTOMER ORDER HISTORY</b>\nএই নম্বরে আগের কোনো অর্ডার পাওয়া যায়নি।\n`;
  }

  const dateCounts = new Map<string, number>();
  for (const order of safeOrders) {
    const key = getDhakaDayKey(order.created_at);
    dateCounts.set(key, (dateCounts.get(key) ?? 0) + 1);
  }

  const latestFive = safeOrders.slice(0, 5);
  const grouped = new Map<string, any[]>();
  for (const order of latestFive) {
    const key = getDhakaDayKey(order.created_at);
    const group = grouped.get(key) ?? [];
    group.push(order);
    grouped.set(key, group);
  }

  let result =
    `\n⚠️ <b>এই নম্বরে অর্ডার হিস্ট্রি</b>\n` +
    `📞 <b>মোট অর্ডার:</b> ${totalOrderCount}\n` +
    `🕘 <b>সর্বশেষ ${latestFive.length}টি অর্ডার:</b>\n`;

  let index = 1;
  for (const [dayKey, dayOrders] of grouped) {
    const dayCount = dateCounts.get(dayKey) ?? dayOrders.length;
    result += `\n📅 <b>${getDhakaDayLabel(dayOrders[0].created_at)} — ${dayCount}টি অর্ডার</b>\n`;

    for (const order of dayOrders) {
      const status =
        order.steadfast_delivery_status ||
        order.steadfast_booking_status ||
        "PENDING";
      result +=
        `${index}️⃣ ${formatDhakaDateTime(order.created_at)} | ` +
        `💰 ${formatMoney(order.total)} | 📦 ${escapeHtml(String(status).toUpperCase())}\n`;
      index += 1;
    }
  }

  return result;
}

function getFraudPercent(
  ratio: number | null,
  count: number | null,
  total: number | null
): string {
  if (ratio !== null && Number.isFinite(ratio)) return `${ratio}%`;
  if (total && total > 0 && count !== null) {
    return `${Math.round((count / total) * 100)}%`;
  }
  return "তথ্য নেই";
}

function buildFraudReportText(fraud: FraudReport | null): string {
  if (!fraud) {
    return `\n📊 <b>STEADFAST FRAUD REPORT</b>\nFraud report পাওয়া যায়নি। পরে আবার চেষ্টা করুন।\n`;
  }

  return (
    `\n📊 <b>STEADFAST FRAUD REPORT</b>\n` +
    `✅ <b>Delivered Rate:</b> ${getFraudPercent(
      fraud.deliveryRatio,
      fraud.totalDelivered,
      fraud.totalParcels
    )}\n` +
    `❌ <b>Cancelled Rate:</b> ${getFraudPercent(
      fraud.cancellationRatio,
      fraud.totalCancelled,
      fraud.totalParcels
    )}\n` +
    `📦 <b>Total Parcels:</b> ${fraud.totalParcels ?? "তথ্য নেই"}\n` +
    `✅ <b>Delivered:</b> ${fraud.totalDelivered ?? "তথ্য নেই"}\n` +
    `❌ <b>Cancelled:</b> ${fraud.totalCancelled ?? "তথ্য নেই"}\n` +
    `🛡️ <b>Fraud Reports:</b> ${fraud.totalFraudReports ?? 0}\n` +
    `⚠️ <b>Fraud Level:</b> ${escapeHtml(fraud.level ?? "তথ্য নেই")}\n`
  );
}

function buildProductDetailsText(items: any[]): {
  text: string;
  productTypeCount: number;
  totalPieces: number;
  calculatedSubtotal: number;
} {
  const safeItems = Array.isArray(items) ? items : [];
  const productKeys = new Set<string>();
  let totalPieces = 0;
  let calculatedSubtotal = 0;
  let text = `\n🛍️ <b>ORDER PRODUCT DETAILS</b>\n`;

  if (safeItems.length === 0) {
    text += `কোনো পণ্যের বিস্তারিত পাওয়া যায়নি।\n`;
  }

  safeItems.forEach((item, index) => {
    const productName = String(
      item.productName ?? item.name ?? item.title ?? "Product"
    );
    const productCode = String(
      item.productCode ?? item.product_code ?? "CODE-N/A"
    );
    const productId = String(item.productId ?? item.product_id ?? productCode);
    const imageUrl = item.imageUrl ?? item.image_url ?? "";
    const quantityValue = Number(item.quantity ?? 1);
    const quantity = Number.isFinite(quantityValue) && quantityValue > 0 ? quantityValue : 1;
    const unitPriceValue = Number(item.unitPrice ?? item.unit_price ?? item.price ?? 0);
    const unitPrice = Number.isFinite(unitPriceValue) ? unitPriceValue : 0;
    const lineTotalValue = Number(item.totalPrice ?? item.total_price ?? unitPrice * quantity);
    const lineTotal = Number.isFinite(lineTotalValue) ? lineTotalValue : unitPrice * quantity;

    productKeys.add(productId);
    totalPieces += quantity;
    calculatedSubtotal += lineTotal;

    const codeLabel = isHttpUrl(imageUrl)
      ? `<a href="${escapeHtml(imageUrl)}">${escapeHtml(productCode)}</a>`
      : `<code>${escapeHtml(productCode)}</code>`;
    const blouseLabel =
      item.blouseOption === "withBlouse"
        ? " | Blouse সহ"
        : item.blouseOption === "withoutBlouse"
          ? " | Blouse ছাড়া"
          : "";

    text +=
      `${index + 1}. ${codeLabel} — <b>${escapeHtml(productName)}</b>\n` +
      `   📦 Quantity: <b>${quantity} pcs</b>${blouseLabel}\n` +
      `   💵 Unit Price: ${formatMoney(unitPrice)}\n` +
      `   🧾 Product Total: <b>${formatMoney(lineTotal)}</b>\n`;
  });

  return {
    text,
    productTypeCount: productKeys.size,
    totalPieces,
    calculatedSubtotal,
  };
}

function buildOrderNotification(input: {
  heading: string;
  orderNumber: string;
  orderDate: string;
  bookingStatus: string;
  customerName: string;
  phone: string;
  address: string;
  items: any[];
  subtotal: number;
  deliveryCharge: number;
  total: number;
  historyOrders: any[];
  historyCount: number;
  fraudReport: FraudReport | null;
  consignmentId?: string | null;
  trackingCode?: string | null;
}): string {
  const productDetails = buildProductDetailsText(input.items);
  const subtotal = Number.isFinite(input.subtotal)
    ? input.subtotal
    : productDetails.calculatedSubtotal;

  let message =
    `🛒 <b>${escapeHtml(input.heading)}</b> 🛒\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `📅 <b>Date:</b> ${escapeHtml(input.orderDate)}\n` +
    `🧾 <b>Order ID:</b> <code>${escapeHtml(input.orderNumber)}</code>\n` +
    `📦 <b>Status:</b> <b>${escapeHtml(input.bookingStatus)}</b>\n\n` +
    `👤 <b>Customer:</b> ${escapeHtml(input.customerName)}\n` +
    `📞 <b>Phone:</b> <code>${escapeHtml(input.phone)}</code>\n` +
    `📍 <b>Address:</b> ${escapeHtml(input.address)}\n`;

  message += productDetails.text;
  message +=
    `\n📊 <b>ORDER SUMMARY</b>\n` +
    `🛍️ <b>Product Types:</b> ${productDetails.productTypeCount}\n` +
    `📦 <b>Total Pieces:</b> ${productDetails.totalPieces}\n` +
    `💰 <b>Product Subtotal:</b> ${formatMoney(subtotal)}\n` +
    `🚚 <b>Delivery Charge:</b> ${formatMoney(input.deliveryCharge)}\n` +
    `💳 <b>TOTAL BILL:</b> <b>${formatMoney(input.total)}</b>\n`;

  message += buildOrderHistoryText(input.historyOrders, input.historyCount);
  message += buildFraudReportText(input.fraudReport);

  message +=
    `\n📦 <b>COURIER INFORMATION</b>\n` +
    `🆔 <b>Consignment ID:</b> <code>${escapeHtml(input.consignmentId || "N/A")}</code>\n` +
    `🚚 <b>Tracking:</b> ${
      input.trackingCode
        ? `<a href="https://steadfast.com.bd/t/${encodeURIComponent(input.trackingCode)}">${escapeHtml(input.trackingCode)}</a>`
        : "N/A"
    }`;

  return message;
}

function normalizePhoneForSearch(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("880") && digits.length === 13) {
    digits = `0${digits.slice(3)}`;
  } else if (digits.length === 10 && digits.startsWith("1")) {
    digits = `0${digits}`;
  }
  return digits;
}

async function getCustomerOrderHistory(phone: string) {
  const normalizedPhone = normalizePhoneForSearch(phone);
  const suffix = normalizedPhone.slice(-10);
  if (suffix.length < 10) {
    return { orders: [] as any[], totalCount: 0 };
  }

  const { data, count, error } = await supabaseAdmin
    .from("orders")
    .select(
      "id, order_number, created_at, total, steadfast_delivery_status, steadfast_booking_status, phone",
      { count: "exact" }
    )
    .ilike("phone", `%${suffix}%`)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("Customer order history lookup failed:", error);
    return { orders: [] as any[], totalCount: 0 };
  }

  const matchingOrders = (data ?? []).filter(
    (order: any) => normalizePhoneForSearch(String(order.phone ?? "")).slice(-10) === suffix
  );

  return {
    orders: matchingOrders,
    totalCount: Math.max(matchingOrders.length, count ?? 0),
  };
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
    throw new Error(`Google Sheet HTTP ${response.status}: ${responseText.slice(0, 400)}`);
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
    // Keep raw response for diagnostics.
  }

  if (!response.ok || result?.ok !== true) {
    throw new Error(
      result?.description ||
        `Telegram ${method} failed (${response.status}): ${responseText.slice(0, 300)}`
    );
  }
  return result;
}

async function sendTelegramNotify(message: string) {
  const token = process.env.TELEGRAM_BOT2_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_NOTIFY_CHAT_ID?.trim();
  if (!token || !chatId) {
    console.error("Telegram alert skipped: bot token or chat ID is missing.");
    return;
  }

  // Alert group receives text only. Product codes in the message link to images.
  try {
    await telegramApi(token, "sendMessage", {
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  } catch (error) {
    console.error("Telegram order details message failed:", error);
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

    const cleanPhone = normalizePhoneForSearch(String(body.phone));
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

    let fraudCheckResult: FraudReport;
    try {
      fraudCheckResult = await checkSteadfastFraud(cleanPhone);
    } catch (fraudError) {
      console.error("Steadfast fraud check failed:", fraudError);
      return NextResponse.json(
        { success: false, message: "Fraud check করা যাচ্ছে না।" },
        { status: 503 }
      );
    }

    const productIds = [...new Set(body.items.map((item) => item.productId))];
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
      const product = productMap.get(String(item.productId));
      if (!product) throw new Error("Product not found");
      if (item.quantity > Number(product.stock_quantity)) {
        throw new Error(`${product.name} এর stock নেই।`);
      }

      const unitPrice = Number(getSellingPrice(product, item.blouseOption));
      const costPrice = product.cost_price === null ? 0 : Number(product.cost_price);
      const imageUrl = getProductImageUrl(product);

      return {
        productId: product.id,
        productName: product.name,
        name: product.name,
        productCode: product.product_code ?? "",
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
    const orderNumber = `SC-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;

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

    const createdOrderRow = Array.isArray(createdOrder) ? createdOrder[0] : createdOrder;
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

    // Google Sheets is a background copy; Supabase remains the primary order store.
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
          steadfast_booking_date: bookingResult.bookedAt || new Date().toISOString(),
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
            bookingError instanceof Error ? bookingError.message : "Unknown error",
        })
        .eq("order_number", orderNumber);
    }

    if (bookingSuccess) {
      // Refresh after booking so the newest order shows its actual courier status in history.
      const latestHistory = await getCustomerOrderHistory(cleanPhone);
      const message = buildOrderNotification({
        heading: "NEW WEBSITE ORDER",
        orderNumber,
        orderDate: formatDhakaDateTime(orderDate),
        bookingStatus: "BOOKED ✅",
        customerName: body.customer_name,
        phone: cleanPhone,
        address: `${body.address}, ${body.upazila}, ${body.district}`,
        items: orderItems,
        subtotal,
        deliveryCharge,
        total,
        historyOrders: latestHistory.orders,
        historyCount: latestHistory.totalCount,
        fraudReport: fraudCheckResult,
        consignmentId: bookingConsignmentId,
        trackingCode: bookingTrackingCode,
      });

      // Telegram notification is also background work; it does not delay the buyer.
      waitUntil(
        sendTelegramNotify(message).catch((error) => {
          console.error("Telegram website order notification failed:", orderNumber, error);
        })
      );
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
