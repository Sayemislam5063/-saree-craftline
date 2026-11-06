import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { supabaseAdmin } from "../../../../lib/supabase/server";
import { checkSteadfastFraud, createSteadfastBooking } from "../../../../lib/steadfast/client";

export const runtime = "nodejs";

const BOT1_TOKEN = process.env.TELEGRAM_BOT1_TOKEN?.trim();
const BOT2_TOKEN = process.env.TELEGRAM_BOT2_TOKEN?.trim();
const NOTIFY_CHAT_ID = process.env.TELEGRAM_NOTIFY_CHAT_ID?.trim();
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();

const GOOGLE_SHEET_URL =
  "https://script.google.com/macros/s/AKfycbxFH2iBwJ1mdPazSOo6S67kiN22Ib6OLnzlQ6R3DsAS5h4hk-D6O_lpQHlE_kHGtPbchg/exec";

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
  botToken: string,
  method: string,
  payload: Record<string, unknown>
) {
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    }
  );

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

async function sendTelegramPhoto(
  botToken: string,
  chatId: string,
  imageUrl: string
) {
  try {
    await telegramApi(botToken, "sendPhoto", {
      chat_id: chatId,
      photo: imageUrl,
    });
    return;
  } catch (urlError) {
    // If Telegram cannot fetch the image URL, fetch it server-side and upload the file.
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
    form.append("chat_id", String(chatId));
    form.append("photo", imageBlob, filename);

    const uploadResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/sendPhoto`,
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

async function sendTelegramGroupOrderNotify(
  message: string,
  imageUrl: string
) {
  if (!BOT2_TOKEN || !NOTIFY_CHAT_ID) {
    throw new Error("Telegram alert bot token or alert group ID is missing.");
  }

  if (isHttpUrl(imageUrl)) {
    try {
      await sendTelegramPhoto(BOT2_TOKEN, NOTIFY_CHAT_ID, imageUrl);
    } catch (photoError) {
      console.error("Telegram manual-order photo failed:", photoError);
    }
  }

  // Send full order data separately so it is not limited by photo-caption length.
  await sendTelegramMessage(BOT2_TOKEN, NOTIFY_CHAT_ID, message);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body.message;

    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();

    if (ADMIN_CHAT_ID && chatId.toString() !== ADMIN_CHAT_ID) {
      return NextResponse.json({ ok: true });
    }

    // ১. ফ্রড চেক
    if (text.startsWith("/fc ")) {
      const phone = text.split(/\s+/)[1];
      if (!phone) {
        return sendTelegramMessage(
          BOT1_TOKEN!,
          chatId,
          "⚠️ ফোন নাম্বার দিন।"
        ).then(() => NextResponse.json({ ok: true }));
      }

      await sendTelegramMessage(
        BOT1_TOKEN!,
        chatId,
        "🔄 ফ্রড চেক করা হচ্ছে..."
      );

      try {
        const fraudData = await checkSteadfastFraud(phone);
        let report = `<b>📊 Steadfast Fraud Report</b>\n\n`;
        report += `✅ <b>Delivered:</b> ${fraudData.deliveryRatio ?? 0}%\n`;
        report += `❌ <b>Cancelled:</b> ${fraudData.cancellationRatio ?? 0}%\n`;
        report += `📈 <b>Success Rate:</b> ${fraudData.deliveryRatio ?? 0}%\n\n`;
        report += `🛡️ <b>Fraud Reports:</b> ${fraudData.totalFraudReports ?? 0}`;
        await sendTelegramMessage(BOT1_TOKEN!, chatId, report);
      } catch (error) {
        await sendTelegramMessage(
          BOT1_TOKEN!,
          chatId,
          `❌ ফ্রড চেক ব্যর্থ: ${
            error instanceof Error ? escapeHtml(error.message) : "Unknown error"
          }`
        );
      }
    }

    // ২. অর্ডার চেক
    else if (text.startsWith("/ck ")) {
      const phone = text.split(/\s+/)[1];
      if (!phone) {
        await sendTelegramMessage(BOT1_TOKEN!, chatId, "⚠️ ফোন নাম্বার দিন।");
        return NextResponse.json({ ok: true });
      }

      const { data: order, error } = await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("phone", phone)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !order) {
        await sendTelegramMessage(
          BOT1_TOKEN!,
          chatId,
          "❌ এই নাম্বারে কোনো অর্ডার পাওয়া যায়নি।"
        );
        return NextResponse.json({ ok: true });
      }

      let orderMessage = `🔍 <b>Order Details</b>\n\n`;
      orderMessage += `🧾 <b>Order ID:</b> ${escapeHtml(order.order_number)}\n`;
      orderMessage += `👤 <b>Name:</b> ${escapeHtml(order.customer_name)}\n`;
      orderMessage += `📞 <b>Phone:</b> ${escapeHtml(order.phone)}\n`;
      orderMessage += `📍 <b>Address:</b> ${escapeHtml(order.address)}, ${escapeHtml(order.upazila)}, ${escapeHtml(order.district)}\n`;
      orderMessage += `💰 <b>Total:</b> ৳${Number(order.total || 0)}\n`;
      orderMessage += `📦 <b>Status:</b> ${escapeHtml(order.steadfast_delivery_status || "Pending")}\n`;
      orderMessage += `🆔 <b>Consignment ID:</b> ${escapeHtml(order.steadfast_consignment_id || "N/A")}\n`;
      orderMessage += `🚚 <b>Tracking:</b> ${escapeHtml(order.steadfast_tracking_code || "N/A")}`;
      await sendTelegramMessage(BOT1_TOKEN!, chatId, orderMessage);
    }

    // ৩. ম্যানুয়াল অর্ডার (টেলিগ্রাম)
    else if (
      text.toLowerCase().includes("name:") &&
      text.toLowerCase().includes("mob:")
    ) {
      await sendTelegramMessage(
        BOT1_TOKEN!,
        chatId,
        "🔄 অর্ডার প্রসেস হচ্ছে..."
      );

      try {
        const parseField = (regex: RegExp) => {
          const match = text.match(regex);
          return match ? match[1].trim() : "";
        };

        const name = parseField(
          /name\s*:\s*(.*?)(?=\n|mob\s*:|jela\s*:|thana\s*:|adrs\s*:|prod\s*:|$)/i
        );
        const phone = parseField(
          /mob\s*:\s*(.*?)(?=\n|name\s*:|jela\s*:|thana\s*:|adrs\s*:|prod\s*:|$)/i
        );
        const jela = parseField(
          /jela\s*:\s*(.*?)(?=\n|name\s*:|mob\s*:|thana\s*:|adrs\s*:|prod\s*:|$)/i
        );
        const thana = parseField(
          /thana\s*:\s*(.*?)(?=\n|name\s*:|mob\s*:|jela\s*:|adrs\s*:|prod\s*:|$)/i
        );
        const address = parseField(
          /adrs\s*:\s*(.*?)(?=\n|name\s*:|mob\s*:|jela\s*:|thana\s*:|prod\s*:|$)/i
        );
        const productCode = parseField(
          /prod\s*:\s*(.*?)(?=\n|name\s*:|mob\s*:|jela\s*:|thana\s*:|adrs\s*:|$)/i
        );

        if (!name || !phone || !productCode) {
          throw new Error(
            "সঠিক ফরম্যাটে লিখুন। name, mob, adrs এবং prod দিন।"
          );
        }

        const { data: product, error: productError } = await supabaseAdmin
          .from("products")
          .select("*")
          .eq("product_code", productCode)
          .single();

        if (productError || !product) {
          throw new Error("প্রোডাক্ট কোডটি খুঁজে পাওয়া যায়নি!");
        }

        const { data: previousOrders } = await supabaseAdmin
          .from("orders")
          .select("order_number, created_at, total, steadfast_delivery_status")
          .eq("phone", phone)
          .order("created_at", { ascending: false })
          .limit(5);

        let historyMsg = "";
        if (previousOrders && previousOrders.length > 0) {
          historyMsg = `\n⚠️ <b>এই নাম্বারে আগের অর্ডারগুলো:</b>\n`;
          previousOrders.forEach((previousOrder: any, index: number) => {
            const date = new Date(previousOrder.created_at).toLocaleString(
              "en-GB",
              {
                timeZone: "Asia/Dhaka",
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }
            );
            const status = previousOrder.steadfast_delivery_status
              ? String(previousOrder.steadfast_delivery_status).toUpperCase()
              : "PENDING";
            historyMsg += `${index + 1}️⃣ ${date} | 💰 ${previousOrder.total}৳ | 📦 ${status}\n`;
          });
          historyMsg += `━━━━━━━━━━━━━━━━━━━\n`;
        }

        const price = product.single_price || product.without_blouse_price || 0;

        if (Number(product.stock_quantity) < 1) {
          throw new Error("এই প্রোডাক্টের স্টক নেই।");
        }

        const deliveryCharge = product.is_free_delivery ? 0 : 130;
        const total = price + deliveryCharge;
        const orderNumber = `TG-${Date.now().toString().slice(-6)}`;
        const orderDate = new Date().toISOString();
        const finalDistrict = jela || "N/A";
        const finalUpazila = thana || "N/A";
        const finalAddress = address || "N/A";
        const imageUrl = getProductImageUrl(product);

        const { error: orderError } = await supabaseAdmin.rpc(
          "create_order_with_stock",
          {
            p_order_number: orderNumber,
            p_customer_name: name,
            p_phone: phone,
            p_district: finalDistrict,
            p_upazila: finalUpazila,
            p_address: finalAddress,
            p_note: "Telegram Bot Order",
            p_delivery_type: "outsideDhaka",
            p_items: [
              {
                productId: product.id,
                productName: product.name,
                imageUrl,
                quantity: 1,
                blouseOption: "withoutBlouse",
                unitPrice: price,
                totalPrice: price,
                costPrice: 0,
                costTotal: 0,
              },
            ],
            p_subtotal: price,
            p_delivery_charge: deliveryCharge,
            p_total: total,
            p_cost_total: 0,
          }
        );

        if (orderError) {
          throw new Error("ডাটাবেসে অর্ডার সেভ হয়নি: " + orderError.message);
        }

        const sheetPayload = {
          order_id: orderNumber,
          order_date: orderDate,
          customer_name: name,
          phone: phone,
          district: finalDistrict,
          upazila: finalUpazila,
          address: finalAddress,
          items: [
            {
              productName: product.name,
              quantity: 1,
              unitPrice: price,
              imageUrl,
            },
          ],
          subtotal: price,
          delivery_charge: deliveryCharge,
          total,
          status: "pending",
          purchase_cost: 0,
        };

        // Keep Google Sheets work off the critical order/booking path.
        // Supabase has already saved the order; this sync can finish later.
        waitUntil(
          saveOrderToGoogleSheet(sheetPayload)
            .then((sheetResult) => {
              console.log("Telegram order saved to Google Sheet:", orderNumber, sheetResult);
            })
            .catch((sheetError) => {
              console.error("Google Sheet order save failed:", orderNumber, sheetError);
            })
        );

        let bookingSuccess = false;
        let trackingCode = "N/A";
        let consignmentId = "N/A";

        try {
          const booking = await createSteadfastBooking({
            invoice: orderNumber,
            recipient_name: name,
            recipient_phone: phone,
            recipient_address: `${finalAddress}, ${finalUpazila}, ${finalDistrict}`,
            cod_amount: total,
            item_description: `${product.name} x1`,
          });

          const { error: bookingUpdateError } = await supabaseAdmin
            .from("orders")
            .update({
              steadfast_consignment_id: booking.consignmentId,
              steadfast_tracking_code: booking.trackingCode,
              steadfast_booking_status: "booked",
              steadfast_booking_date:
                booking.bookedAt || new Date().toISOString(),
              steadfast_delivery_status: booking.status,
            })
            .eq("order_number", orderNumber);

          if (bookingUpdateError) {
            console.error(
              "Telegram order booking details update failed:",
              bookingUpdateError
            );
          }

          trackingCode = booking.trackingCode;
          consignmentId = booking.consignmentId;
          bookingSuccess = true;
        } catch (bookingError) {
          console.error("Telegram manual order booking failed:", bookingError);
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

          throw bookingError;
        }

        let successMessage =
          `✅ <b>বুকিং সফল!</b>\n\n` +
          `🧾 অর্ডার: <b>${escapeHtml(orderNumber)}</b>\n` +
          `👤 কাস্টমার: ${escapeHtml(name)}\n` +
          `📞 ফোন: ${escapeHtml(phone)}\n` +
          `🆔 কনসাইনমেন্ট: <b>${escapeHtml(consignmentId)}</b>\n` +
          `📦 ট্র্যাকিং: <b>${escapeHtml(trackingCode)}</b>\n` +
          `📊 Google Sheet: Background sync ⏳`;

        await sendTelegramMessage(BOT1_TOKEN!, chatId, successMessage);

        if (bookingSuccess && NOTIFY_CHAT_ID) {
          const orderDateStr = new Date().toLocaleString("en-GB", {
            timeZone: "Asia/Dhaka",
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });

          let notifyMessage =
            `🛒 <b>NEW MANUAL ORDER</b> 🛒\n━━━━━━━━━━━━━━━━━━━\n` +
            `📅 <b>তারিখ:</b> <b>${orderDateStr}</b>\n` +
            `🧾 <b>Order ID:</b> <code>${escapeHtml(orderNumber)}</code>\n` +
            `📦 <b>Status:</b> <b>BOOKED ✅</b>\n\n` +
            `👤 <b>Customer:</b> ${escapeHtml(name)}\n` +
            `📞 <b>Phone:</b> <code>${escapeHtml(phone)}</code>\n` +
            `📍 <b>Address:</b> ${escapeHtml(finalAddress)}, ${escapeHtml(finalUpazila)}, ${escapeHtml(finalDistrict)}\n\n` +
            `🛍️ <b>Product:</b> ${escapeHtml(product.name)} (<code>${escapeHtml(productCode)}</code>)\n` +
            `💰 <b>Bill:</b> ৳${total}\n` +
            `📊 <b>Google Sheet:</b> Background sync ⏳\n\n`;

          notifyMessage += historyMsg;
          notifyMessage +=
            `\n🆔 <b>CONSIGNMENT ID</b> 🆔\n` +
            `<pre>${escapeHtml(consignmentId)}</pre>\n` +
            `🚚 <b>Tracking:</b> <a href="https://steadfast.com.bd/t/${encodeURIComponent(
              trackingCode
            )}">${escapeHtml(trackingCode)}</a>`;

          try {
            await sendTelegramGroupOrderNotify(notifyMessage, imageUrl);
          } catch (notifyError) {
            console.error("Telegram alert group notification failed:", notifyError);
            await sendTelegramMessage(
              BOT1_TOKEN!,
              chatId,
              "⚠️ Booking সফল হয়েছে, কিন্তু Alert Group-এ notification পাঠানো যায়নি। Server log পরীক্ষা করতে হবে।"
            );
          }
        }
      } catch (error) {
        await sendTelegramMessage(
          BOT1_TOKEN!,
          chatId,
          `❌ বুকিং ব্যর্থ: ${
            error instanceof Error ? escapeHtml(error.message) : "Unknown error"
          }`
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram Webhook Error:", error);
    return NextResponse.json({ ok: true });
  }
}
