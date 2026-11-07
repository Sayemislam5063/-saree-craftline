import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { supabaseAdmin } from "../../../../lib/supabase/server";
import {
  checkSteadfastFraud,
  createSteadfastBooking,
} from "../../../../lib/steadfast/client";

export const runtime = "nodejs";

const BOT1_TOKEN = process.env.TELEGRAM_BOT1_TOKEN?.trim();
const BOT2_TOKEN = process.env.TELEGRAM_BOT2_TOKEN?.trim();
const NOTIFY_CHAT_ID = process.env.TELEGRAM_NOTIFY_CHAT_ID?.trim();
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();

const GOOGLE_SHEET_URL =
  "https://script.google.com/macros/s/AKfycbxFH2iBwJ1mdPazSOo6S67kiN22Ib6OLnzlQ6R3DsAS5h4hk-D6O_lpQHlE_kHGtPbchg/exec";

type FraudReport = Awaited<ReturnType<typeof checkSteadfastFraud>>;

function isHttpUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\/\S+$/i.test(value.trim());
}

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

function parseOrderItems(rawItems: unknown): any[] {
  if (Array.isArray(rawItems)) return rawItems;
  if (typeof rawItems === "string") {
    try {
      const parsed = JSON.parse(rawItems);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function hydrateOrderItems(rawItems: unknown): Promise<any[]> {
  const items = parseOrderItems(rawItems);
  const productIds = [
    ...new Set(
      items
        .map((item: any) => String(item.productId ?? item.product_id ?? ""))
        .filter(Boolean)
    ),
  ];

  let productMap = new Map<string, any>();
  if (productIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("id, product_code, images, thumbnail_index, name")
      .in("id", productIds);

    if (error) {
      console.error("Product metadata lookup for order notification failed:", error);
    } else {
      productMap = new Map(
        (data ?? []).map((product: any) => [String(product.id), product])
      );
    }
  }

  return items.map((item: any) => {
    const productId = String(item.productId ?? item.product_id ?? "");
    const product = productMap.get(productId);
    return {
      ...item,
      productId,
      productName:
        item.productName ?? item.name ?? product?.name ?? "Product",
      productCode:
        item.productCode ?? item.product_code ?? product?.product_code ?? "",
      imageUrl: isHttpUrl(item.imageUrl ?? item.image_url)
        ? String(item.imageUrl ?? item.image_url).trim()
        : getProductImageUrl(product),
      quantity: Number(item.quantity ?? 1),
      unitPrice: Number(item.unitPrice ?? item.unit_price ?? item.price ?? 0),
      totalPrice: Number(
        item.totalPrice ??
          item.total_price ??
          Number(item.unitPrice ?? item.unit_price ?? item.price ?? 0) *
            Number(item.quantity ?? 1)
      ),
    };
  });
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

function buildOrderHistoryText(orders: any[], totalOrderCount: number): string {
  const safeOrders = Array.isArray(orders) ? orders : [];
  if (safeOrders.length === 0) {
    return `\n⚠️ <b>CUSTOMER ORDER HISTORY</b>\nএই নম্বরে কোনো অর্ডার পাওয়া যায়নি।\n`;
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
    return `\n📊 <b>STEADFAST FRAUD REPORT</b>\nFraud report পাওয়া যায়নি।\n`;
  }
  return (
    `\n📊 <b>STEADFAST FRAUD REPORT</b>\n` +
    `✅ <b>Delivered Rate:</b> ${getFraudPercent(fraud.deliveryRatio, fraud.totalDelivered, fraud.totalParcels)}\n` +
    `❌ <b>Cancelled Rate:</b> ${getFraudPercent(fraud.cancellationRatio, fraud.totalCancelled, fraud.totalParcels)}\n` +
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

  if (safeItems.length === 0) text += `পণ্যের বিস্তারিত পাওয়া যায়নি।\n`;

  safeItems.forEach((item, index) => {
    const productName = String(item.productName ?? item.name ?? "Product");
    const productCode = String(item.productCode ?? item.product_code ?? "CODE-N/A");
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
  const products = buildProductDetailsText(input.items);
  const subtotal = Number.isFinite(input.subtotal)
    ? input.subtotal
    : products.calculatedSubtotal;

  let message =
    `🛒 <b>${escapeHtml(input.heading)}</b> 🛒\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `📅 <b>Date:</b> ${escapeHtml(input.orderDate)}\n` +
    `🧾 <b>Order ID:</b> <code>${escapeHtml(input.orderNumber)}</code>\n` +
    `📦 <b>Status:</b> <b>${escapeHtml(input.bookingStatus)}</b>\n\n` +
    `👤 <b>Customer:</b> ${escapeHtml(input.customerName)}\n` +
    `📞 <b>Phone:</b> <code>${escapeHtml(input.phone)}</code>\n` +
    `📍 <b>Address:</b> ${escapeHtml(input.address)}\n`;

  message += products.text;
  message +=
    `\n📊 <b>ORDER SUMMARY</b>\n` +
    `🛍️ <b>Product Types:</b> ${products.productTypeCount}\n` +
    `📦 <b>Total Pieces:</b> ${products.totalPieces}\n` +
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
  if (digits.startsWith("880") && digits.length === 13) digits = `0${digits.slice(3)}`;
  else if (digits.length === 10 && digits.startsWith("1")) digits = `0${digits}`;
  return digits;
}

async function getCustomerOrderHistory(phone: string) {
  const suffix = normalizePhoneForSearch(phone).slice(-10);
  if (suffix.length < 10) return { orders: [] as any[], totalCount: 0 };

  const { data, count, error } = await supabaseAdmin
    .from("orders")
    .select("*", { count: "exact" })
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
    // Apps Script may return an HTML permission/error page.
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
  botToken: string,
  method: string,
  payload: Record<string, unknown>
) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
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

async function sendTelegramMessage(
  botToken: string,
  chatId: number | string,
  message: string
) {
  await telegramApi(botToken, "sendMessage", {
    chat_id: chatId,
    text: message,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}

async function sendTelegramGroupOrderNotify(message: string) {
  if (!BOT2_TOKEN || !NOTIFY_CHAT_ID) {
    console.error("Telegram alert bot token or alert group ID is missing.");
    return;
  }
  // Alert group gets text only. Product code links open the product image.
  await sendTelegramMessage(BOT2_TOKEN, NOTIFY_CHAT_ID, message);
}

async function saveFraudReportToOrder(orderNumber: string, fraud: FraudReport) {
  const { error } = await supabaseAdmin
    .from("orders")
    .update({
      fraud_check_status: fraud.isFraud ? "blocked" : fraud.requiresReview ? "review" : "passed",
      fraud_total_parcels: fraud.totalParcels,
      fraud_total_delivered: fraud.totalDelivered,
      fraud_total_cancelled: fraud.totalCancelled,
      fraud_score: fraud.score,
      fraud_level: fraud.level,
      fraud_delivery_ratio: fraud.deliveryRatio,
      fraud_cancellation_ratio: fraud.cancellationRatio,
      fraud_return_ratio: fraud.returnRatio,
      fraud_total_reports: fraud.totalFraudReports,
      fraud_checked_at: new Date().toISOString(),
    })
    .eq("order_number", orderNumber);
  if (error) console.error("Fraud report save failed:", error);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body.message;
    if (!message || !message.text) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;
    const text = String(message.text).trim();

    if (ADMIN_CHAT_ID && chatId.toString() !== ADMIN_CHAT_ID) {
      return NextResponse.json({ ok: true });
    }

    // ১. Fraud check command: /fc 01XXXXXXXXX
    if (/^\/fc(?:@\w+)?(?:\s+|$)/i.test(text)) {
      const phone = text.split(/\s+/)[1];
      if (!phone) {
        await sendTelegramMessage(BOT1_TOKEN!, chatId, "⚠️ ফোন নাম্বার দিন। উদাহরণ: /fc 01XXXXXXXXX");
        return NextResponse.json({ ok: true });
      }

      await sendTelegramMessage(BOT1_TOKEN!, chatId, "🔄 ফ্রড চেক করা হচ্ছে...");
      try {
        const fraud = await checkSteadfastFraud(phone);
        await sendTelegramMessage(
          BOT1_TOKEN!,
          chatId,
          `<b>📊 STEADFAST FRAUD REPORT</b>\n${buildFraudReportText(fraud)}`
        );
      } catch (error) {
        await sendTelegramMessage(
          BOT1_TOKEN!,
          chatId,
          `❌ ফ্রড চেক ব্যর্থ: ${error instanceof Error ? escapeHtml(error.message) : "Unknown error"}`
        );
      }
    }

    // ২. Order search command. Both /ck and /cek are supported.
    else if (/^\/(?:ck|cek)(?:@\w+)?(?:\s+|$)/i.test(text)) {
      const phone = text.split(/\s+/)[1];
      if (!phone) {
        await sendTelegramMessage(
          BOT1_TOKEN!,
          chatId,
          "⚠️ ফোন নাম্বার দিন। উদাহরণ: /cek 01XXXXXXXXX"
        );
        return NextResponse.json({ ok: true });
      }

      const history = await getCustomerOrderHistory(phone);
      const order = history.orders[0];
      if (!order) {
        await sendTelegramMessage(BOT1_TOKEN!, chatId, "❌ এই নম্বরে কোনো অর্ডার পাওয়া যায়নি।");
        return NextResponse.json({ ok: true });
      }

      const items = await hydrateOrderItems(order.items);
      let fraud: FraudReport | null = null;
      try {
        fraud = await checkSteadfastFraud(phone);
        if (order.order_number) await saveFraudReportToOrder(order.order_number, fraud);
      } catch (error) {
        console.error("Fraud refresh during order search failed:", error);
      }

      const messageText = buildOrderNotification({
        heading: "CUSTOMER ORDER SEARCH",
        orderNumber: String(order.order_number ?? "N/A"),
        orderDate: formatDhakaDateTime(order.created_at),
        bookingStatus: String(
          order.steadfast_delivery_status || order.steadfast_booking_status || "PENDING"
        ).toUpperCase(),
        customerName: String(order.customer_name ?? "N/A"),
        phone: String(order.phone ?? phone),
        address: [order.address, order.upazila, order.district]
          .filter(Boolean)
          .map((part: unknown) => String(part))
          .join(", "),
        items,
        subtotal: Number(order.subtotal ?? items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0)),
        deliveryCharge: Number(order.delivery_charge ?? order.deliveryCharge ?? 0),
        total: Number(order.total ?? 0),
        historyOrders: history.orders,
        historyCount: history.totalCount,
        fraudReport: fraud,
        consignmentId: order.steadfast_consignment_id,
        trackingCode: order.steadfast_tracking_code,
      });

      await sendTelegramMessage(BOT1_TOKEN!, chatId, messageText);
    }

    // ৩. Manual order through Telegram message fields.
    else if (
      text.toLowerCase().includes("name:") &&
      text.toLowerCase().includes("mob:")
    ) {
      await sendTelegramMessage(BOT1_TOKEN!, chatId, "🔄 অর্ডার প্রসেস হচ্ছে...");

      try {
        const parseField = (regex: RegExp) => {
          const match = text.match(regex);
          return match ? match[1].trim() : "";
        };

        const name = parseField(/name\s*:\s*(.*?)(?=\n|mob\s*:|jela\s*:|thana\s*:|adrs\s*:|prod\s*:|$)/i);
        const phone = parseField(/mob\s*:\s*(.*?)(?=\n|name\s*:|jela\s*:|thana\s*:|adrs\s*:|prod\s*:|$)/i);
        const jela = parseField(/jela\s*:\s*(.*?)(?=\n|name\s*:|mob\s*:|thana\s*:|adrs\s*:|prod\s*:|$)/i);
        const thana = parseField(/thana\s*:\s*(.*?)(?=\n|name\s*:|mob\s*:|jela\s*:|adrs\s*:|prod\s*:|$)/i);
        const address = parseField(/adrs\s*:\s*(.*?)(?=\n|name\s*:|mob\s*:|jela\s*:|thana\s*:|prod\s*:|$)/i);
        const productCode = parseField(/prod\s*:\s*(.*?)(?=\n|name\s*:|mob\s*:|jela\s*:|thana\s*:|adrs\s*:|$)/i);

        if (!name || !phone || !productCode) {
          throw new Error("সঠিক ফরম্যাটে লিখুন। name, mob, adrs এবং prod দিন।");
        }

        const normalizedPhone = normalizePhoneForSearch(phone);
        if (!/^01[3-9]\d{8}$/.test(normalizedPhone)) {
          throw new Error("সঠিক বাংলাদেশি ফোন নম্বর দিন।");
        }

        const { data: product, error: productError } = await supabaseAdmin
          .from("products")
          .select("*")
          .eq("product_code", productCode)
          .single();
        if (productError || !product) throw new Error("প্রোডাক্ট কোডটি খুঁজে পাওয়া যায়নি!");

        if (Number(product.stock_quantity) < 1) {
          throw new Error("এই প্রোডাক্টের স্টক নেই।");
        }

        // Keep the existing Telegram manual-order price calculation unchanged.
        const price = Number(product.single_price || product.without_blouse_price || 0);
        const deliveryCharge = product.is_free_delivery ? 0 : 130;
        const total = price + deliveryCharge;
        const orderNumber = `TG-${Date.now().toString().slice(-6)}`;
        const orderDate = new Date().toISOString();
        const finalDistrict = jela || "N/A";
        const finalUpazila = thana || "N/A";
        const finalAddress = address || "N/A";
        const imageUrl = getProductImageUrl(product);

        const manualItems = [
          {
            productId: product.id,
            productName: product.name,
            name: product.name,
            productCode: product.product_code ?? productCode,
            imageUrl,
            quantity: 1,
            blouseOption: "withoutBlouse",
            unitPrice: price,
            totalPrice: price,
            costPrice: 0,
            costTotal: 0,
          },
        ];

        const { error: orderError } = await supabaseAdmin.rpc("create_order_with_stock", {
          p_order_number: orderNumber,
          p_customer_name: name,
          p_phone: normalizedPhone,
          p_district: finalDistrict,
          p_upazila: finalUpazila,
          p_address: finalAddress,
          p_note: "Telegram Bot Order",
          p_delivery_type: "outsideDhaka",
          p_items: manualItems,
          p_subtotal: price,
          p_delivery_charge: deliveryCharge,
          p_total: total,
          p_cost_total: 0,
        });

        if (orderError) {
          throw new Error("ডাটাবেসে অর্ডার সেভ হয়নি: " + orderError.message);
        }

        const sheetPayload = {
          order_id: orderNumber,
          order_date: orderDate,
          customer_name: name,
          phone: normalizedPhone,
          district: finalDistrict,
          upazila: finalUpazila,
          address: finalAddress,
          items: manualItems,
          subtotal: price,
          delivery_charge: deliveryCharge,
          total,
          status: "pending",
          purchase_cost: 0,
        };

        waitUntil(
          saveOrderToGoogleSheet(sheetPayload)
            .then((result) => console.log("Telegram order saved to Google Sheet:", orderNumber, result))
            .catch((error) => console.error("Google Sheet order save failed:", orderNumber, error))
        );

        let booking: Awaited<ReturnType<typeof createSteadfastBooking>>;
        try {
          booking = await createSteadfastBooking({
            invoice: orderNumber,
            recipient_name: name,
            recipient_phone: normalizedPhone,
            recipient_address: `${finalAddress}, ${finalUpazila}, ${finalDistrict}`,
            cod_amount: total,
            item_description: `${product.name} x1`,
          });
        } catch (bookingError) {
          await supabaseAdmin
            .from("orders")
            .update({
              steadfast_booking_status: "booking_error",
              steadfast_booking_error:
                bookingError instanceof Error ? bookingError.message : "Unknown error",
            })
            .eq("order_number", orderNumber);
          throw bookingError;
        }

        const { error: bookingUpdateError } = await supabaseAdmin
          .from("orders")
          .update({
            steadfast_consignment_id: booking.consignmentId,
            steadfast_tracking_code: booking.trackingCode,
            steadfast_booking_status: "booked",
            steadfast_booking_date: booking.bookedAt || new Date().toISOString(),
            steadfast_delivery_status: booking.status,
          })
          .eq("order_number", orderNumber);
        if (bookingUpdateError) {
          console.error("Telegram order booking details update failed:", bookingUpdateError);
        }

        let fraudReport: FraudReport | null = null;
        try {
          fraudReport = await checkSteadfastFraud(normalizedPhone);
          await saveFraudReportToOrder(orderNumber, fraudReport);
        } catch (fraudError) {
          console.error("Fraud report after Telegram booking failed:", fraudError);
        }

        await sendTelegramMessage(
          BOT1_TOKEN!,
          chatId,
          `✅ <b>বুকিং সফল!</b>\n🧾 Order: <code>${escapeHtml(orderNumber)}</code>\n🆔 Consignment: <code>${escapeHtml(booking.consignmentId)}</code>\n🚚 Tracking: ${escapeHtml(booking.trackingCode)}`
        );

        const history = await getCustomerOrderHistory(normalizedPhone);
        if (NOTIFY_CHAT_ID) {
          const notifyMessage = buildOrderNotification({
            heading: "NEW MANUAL ORDER",
            orderNumber,
            orderDate: formatDhakaDateTime(orderDate),
            bookingStatus: String(booking.status || "BOOKED").toUpperCase(),
            customerName: name,
            phone: normalizedPhone,
            address: `${finalAddress}, ${finalUpazila}, ${finalDistrict}`,
            items: manualItems,
            subtotal: price,
            deliveryCharge,
            total,
            historyOrders: history.orders,
            historyCount: history.totalCount,
            fraudReport,
            consignmentId: booking.consignmentId,
            trackingCode: booking.trackingCode,
          });

          try {
            await sendTelegramGroupOrderNotify(notifyMessage);
          } catch (notifyError) {
            console.error("Telegram alert group notification failed:", notifyError);
            await sendTelegramMessage(
              BOT1_TOKEN!,
              chatId,
              "⚠️ Booking সফল হয়েছে, কিন্তু Alert Group-এ details পাঠানো যায়নি।"
            );
          }
        }
      } catch (error) {
        await sendTelegramMessage(
          BOT1_TOKEN!,
          chatId,
          `❌ অর্ডার/বুকিং ব্যর্থ: ${error instanceof Error ? escapeHtml(error.message) : "Unknown error"}`
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram Webhook Error:", error);
    return NextResponse.json({ ok: true });
  }
}
