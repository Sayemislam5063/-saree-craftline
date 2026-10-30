import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase/server";
import { checkSteadfastFraud, createSteadfastBooking } from "../../../../lib/steadfast/client";

const BOT1_TOKEN = process.env.TELEGRAM_BOT1_TOKEN;
const BOT2_TOKEN = process.env.TELEGRAM_BOT2_TOKEN;
const NOTIFY_CHAT_ID = process.env.TELEGRAM_NOTIFY_CHAT_ID;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

async function sendTelegramMessage(botToken: string, chatId: number | string, text: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: "HTML" }),
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body.message;

    if (!message || !message.text) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;
    const text = message.text.trim();

    // ✨ সিকিউরিটি চেক
    if (ADMIN_CHAT_ID && chatId.toString() !== ADMIN_CHAT_ID) {
      return NextResponse.json({ ok: true });
    }

    // ১. ফ্রড চেক
    if (text.startsWith("/fc ")) {
      const phone = text.split(" ")[1];
      if (!phone) return sendTelegramMessage(BOT1_TOKEN!, chatId, "⚠️ ফোন নাম্বার দিন।");

      await sendTelegramMessage(BOT1_TOKEN!, chatId, "🔄 ফ্রড চেক করা হচ্ছে...");

      try {
        const fraudData = await checkSteadfastFraud(phone);
        let msg = `<b>📊 Steadfast Fraud Report</b>\n\n`;
        msg += `✅ <b>Delivered Ratio:</b> ${fraudData.deliveryRatio ?? 0}%\n`;
        msg += `❌ <b>Cancelled Ratio:</b> ${fraudData.cancellationRatio ?? 0}%\n`;
        msg += `📈 <b>Success Rate:</b> ${fraudData.deliveryRatio ?? 0}%`;
        await sendTelegramMessage(BOT1_TOKEN!, chatId, msg);
      } catch (err: any) {
        await sendTelegramMessage(BOT1_TOKEN!, chatId, `❌ ফ্রড চেক ব্যর্থ: ${err.message}`);
      }
    }

    // ২. অর্ডার চেক (/ck)
    else if (text.startsWith("/ck ")) {
      const phone = text.split(" ")[1];
      if (!phone) return sendTelegramMessage(BOT1_TOKEN!, chatId, "⚠️ ফোন নাম্বার দিন।");

      const { data: order, error } = await supabaseAdmin.from("orders").select("*").eq("phone", phone).order("created_at", { ascending: false }).limit(1).maybeSingle();

      if (error || !order) return sendTelegramMessage(BOT1_TOKEN!, chatId, `❌ এই নাম্বারে কোনো অর্ডার পাওয়া যায়নি।`);

      let msg = `🔍 <b>Order Details</b>\n\n`;
      msg += `🧾 <b>Order ID:</b> ${order.order_number}\n`;
      msg += `👤 <b>Name:</b> ${order.customer_name}\n`;
      msg += `📞 <b>Phone:</b> ${order.phone}\n`;
      msg += `📍 <b>Address:</b> ${order.address}, ${order.upazila}, ${order.district}\n`;
      msg += `💰 <b>Total:</b> ৳${order.total}\n`;
      msg += `📦 <b>Status:</b> ${order.steadfast_delivery_status || "Pending"}\n`;
      msg += `🆔 <b>Consignment ID:</b> ${order.steadfast_consignment_id || "N/A"}\n`;
      msg += `🚚 <b>Tracking:</b> ${order.steadfast_tracking_code || "N/A"}`;

      await sendTelegramMessage(BOT1_TOKEN!, chatId, msg);
    }

    // ৩. ম্যানুয়াল অর্ডার (কোনো কমান্ড ছাড়া)
    else if (text.toLowerCase().includes("name:") && text.toLowerCase().includes("mob:")) {
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

        if (!name || !phone || !productCode) throw new Error("সঠিক ফরম্যাটে লিখুন। name, mob, adrs এবং prod দিন।");

        const { data: product, error: prodErr } = await supabaseAdmin.from("products").select("*").eq("product_code", productCode).single();
        if (prodErr || !product) throw new Error("প্রোডাক্ট কোডটি খুঁজে পাওয়া যায়নি!");

        const price = product.single_price || product.without_blouse_price || 0;
        const deliveryCharge = product.is_free_delivery ? 0 : 130;
        const total = price + deliveryCharge;
        const orderNumber = `TG-${Date.now().toString().slice(-6)}`;

        const finalDistrict = jela || "N/A";
        const finalUpazila = thana || "N/A";
        const finalAddress = address || "N/A";

        const { error: orderError } = await supabaseAdmin.rpc("create_order_with_stock", {
          p_order_number: orderNumber, p_customer_name: name, p_phone: phone, p_district: finalDistrict, p_upazila: finalUpazila, p_address: finalAddress, p_note: "Telegram Bot Order", p_delivery_type: "outsideDhaka",
          p_items: [{ productId: product.id, productName: product.name, quantity: 1, unitPrice: price, totalPrice: price, costPrice: 0, costTotal: 0 }],
          p_subtotal: price, p_delivery_charge: deliveryCharge, p_total: total, p_cost_total: 0,
        });

        if (orderError) throw new Error("ডাটাবেসে অর্ডার সেভ হয়নি: " + orderError.message);

        let bookingSuccess = false;
        let trackingCode = "N/A";
        let consignmentId = "N/A";
        
        try {
          const booking = await createSteadfastBooking({
            invoice: orderNumber, recipient_name: name, recipient_phone: phone, recipient_address: `${finalAddress}, ${finalUpazila}, ${finalDistrict}`, cod_amount: total, item_description: `${product.name} x1`,
          });

          await supabaseAdmin.from("orders").update({
            steadfast_consignment_id: booking.consignmentId, steadfast_tracking_code: booking.trackingCode, steadfast_booking_status: "booked", steadfast_booking_date: booking.bookedAt || new Date().toISOString(), steadfast_delivery_status: booking.status,
          }).eq("order_number", orderNumber);

          trackingCode = booking.trackingCode;
          consignmentId = booking.consignmentId;
          bookingSuccess = true;
        } catch (bookErr: any) {
           await supabaseAdmin.from("orders").update({ steadfast_booking_status: "booking_error", steadfast_booking_error: bookErr.message }).eq("order_number", orderNumber);
        }

        let successMsg = `✅ <b>বুকিং সফল!</b>\n\n🧾 অর্ডার: <b>${orderNumber}</b>\n👤 কাস্টমার: ${name}\n📞 ফোন: ${phone}\n🆔 কনসাইনমেন্ট: <b>${consignmentId}</b>\n📦 ট্র্যাকিং: <b>${trackingCode}</b>`;
        await sendTelegramMessage(BOT1_TOKEN!, chatId, successMsg);

        // 🔔 Bot 2 (Notification) - ছবিসহ
        if (bookingSuccess && NOTIFY_CHAT_ID) {
          let notifyMsg = `🔔 <b>New Manual Order!</b>\n\n🧾 অর্ডার: ${orderNumber}\n👤 কাস্টমার: ${name}\n📞 ফোন: ${phone}\n📍 ঠিকানা: ${finalAddress}, ${finalUpazila}, ${finalDistrict}\n🛍️ প্রোডাক্ট: ${product.name} (${productCode})\n💰 বিল: ৳${total}\n🆔 কনসাইনমেন্ট: <code>${consignmentId}</code>\n🚚 ট্র্যাকিং: <code>${trackingCode}</code>`;

          let productImage = null;
          if (Array.isArray(product.images) && product.images.length > 0) {
            const img = product.images[product.thumbnail_index || 0] || product.images[0];
            productImage = typeof img === 'string' ? img : img?.url;
          }

          if (productImage) {
            await fetch(`https://api.telegram.org/bot${BOT2_TOKEN}/sendPhoto`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: NOTIFY_CHAT_ID, photo: productImage, caption: notifyMsg, parse_mode: "HTML" }),
            });
          } else {
            await sendTelegramMessage(BOT2_TOKEN!, NOTIFY_CHAT_ID, notifyMsg);
          }
        }

      } catch (err: any) {
        await sendTelegramMessage(BOT1_TOKEN!, chatId, `❌ বুকিং ব্যর্থ: ${err.message}`);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: true });
  }
}