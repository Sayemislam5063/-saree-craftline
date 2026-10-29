import { NextResponse } from "next/server";
// ✨ আপনার ফাইল স্ট্রাকচার অনুযায়ী সঠিক পাথ (৪ ধাপ পেছনে)
import { supabaseAdmin } from "../../../../lib/supabase/server"; 
import { checkSteadfastFraud, createSteadfastBooking } from "../../../../lib/steadfast/client";

const BOT1_TOKEN = process.env.TELEGRAM_BOT1_TOKEN;
const BOT2_TOKEN = process.env.TELEGRAM_BOT2_TOKEN;
const NOTIFY_CHAT_ID = process.env.TELEGRAM_NOTIFY_CHAT_ID;

// টেলিগ্রামে মেসেজ পাঠানোর ফাংশন
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

    // ==========================================
    // ১. ফ্রড চেক কমান্ড (/fc 017XXXXXXXX)
    // ==========================================
    if (text.startsWith("/fc ")) {
      const phone = text.split(" ")[1];
      if (!phone) return sendTelegramMessage(BOT1_TOKEN!, chatId, "⚠️ ফোন নাম্বার দিন। উদাহরণ: /fc 017XXXXXXXX");

      await sendTelegramMessage(BOT1_TOKEN!, chatId, "🔄 ফ্রড চেক করা হচ্ছে... অপেক্ষা করুন।");

      try {
        const fraudData = await checkSteadfastFraud(phone);
        
        let msg = `<b>📊 Steadfast Fraud Report</b>\n\n`;
        msg += `📞 <b>Phone:</b> ${fraudData.phone}\n`;
        msg += `📦 <b>Total Parcels:</b> ${fraudData.totalParcels ?? 0}\n`;
        msg += `✅ <b>Delivered:</b> ${fraudData.totalDelivered ?? 0}\n`;
        msg += `❌ <b>Cancelled:</b> ${fraudData.totalCancelled ?? 0}\n`;
        msg += `📈 <b>Success Rate:</b> ${fraudData.deliveryRatio ?? 0}%\n`;
        msg += `🚨 <b>Fraud Reports:</b> ${fraudData.totalFraudReports}\n\n`;
        
        if (fraudData.isFraud) {
          msg += `🔴 <b>Status: FRAUD DETECTED!</b>`;
        } else if (fraudData.requiresReview) {
          msg += `🟡 <b>Status: NEEDS REVIEW</b>`;
        } else {
          msg += `🟢 <b>Status: SAFE</b>`;
        }

        await sendTelegramMessage(BOT1_TOKEN!, chatId, msg);
      } catch (err: any) {
        await sendTelegramMessage(BOT1_TOKEN!, chatId, `❌ ফ্রড চেক ব্যর্থ: ${err.message}`);
      }
    }

    // ==========================================
    // ২. অর্ডার বুকিং কমান্ড (/slas Name | Phone | Address | ProductCode)
    // ==========================================
    else if (text.startsWith("/slas ")) {
      const parts = text.replace("/slas ", "").split("|").map((p: string) => p.trim());
      
      if (parts.length < 4) {
        return sendTelegramMessage(BOT1_TOKEN!, chatId, "⚠️ সঠিক ফরম্যাটে লিখুন:\n/slas নাম | ফোন | ঠিকানা | প্রোডাক্ট কোড\n\nউদাহরণ: /slas Sayem | 01712345678 | Dhaka, Mirpur | SC-A1B2C3");
      }

      const [name, phone, address, productCode] = parts;
      await sendTelegramMessage(BOT1_TOKEN!, chatId, "🔄 অর্ডার প্রসেস হচ্ছে...");

      try {
        const { data: product, error: prodErr } = await supabaseAdmin.from("products").select("*").eq("product_code", productCode).single();
        if (prodErr || !product) throw new Error("প্রোডাক্ট কোডটি খুঁজে পাওয়া যায়নি!");

        const price = product.single_price || product.without_blouse_price || 0;
        const deliveryCharge = 130;
        const total = price + deliveryCharge;
        const orderNumber = `TG-${Date.now().toString().slice(-6)}`;

        const { data: createdOrder, error: orderError } = await supabaseAdmin.rpc("create_order_with_stock", {
          p_order_number: orderNumber,
          p_customer_name: name,
          p_phone: phone,
          p_district: "Unknown",
          p_upazila: "Unknown",
          p_address: address,
          p_note: "Telegram Bot Order",
          p_delivery_type: "outsideDhaka",
          p_items: [{ productId: product.id, productName: product.name, quantity: 1, unitPrice: price, totalPrice: price, costPrice: 0, costTotal: 0 }],
          p_subtotal: price,
          p_delivery_charge: deliveryCharge,
          p_total: total,
          p_cost_total: 0,
        });

        if (orderError) throw new Error("ডাটাবেসে অর্ডার সেভ হয়নি: " + orderError.message);

        let bookingSuccess = false;
        let trackingCode = "N/A";
        
        try {
          const booking = await createSteadfastBooking({
            invoice: orderNumber,
            recipient_name: name,
            recipient_phone: phone,
            recipient_address: address,
            cod_amount: total,
            item_description: `${product.name} x1`,
          });

          await supabaseAdmin.from("orders").update({
            steadfast_consignment_id: booking.consignmentId,
            steadfast_tracking_code: booking.trackingCode,
            steadfast_booking_status: "booked",
            steadfast_booking_date: booking.bookedAt || new Date().toISOString(),
            steadfast_delivery_status: booking.status,
          }).eq("order_number", orderNumber);

          trackingCode = booking.trackingCode;
          bookingSuccess = true;
        } catch (bookErr: any) {
           await supabaseAdmin.from("orders").update({ steadfast_booking_status: "booking_error", steadfast_booking_error: bookErr.message }).eq("order_number", orderNumber);
        }

        let successMsg = `✅ <b>বুকিং সফল হয়েছে!</b>\n\n`;
        successMsg += `🧾 অর্ডার নং: <b>${orderNumber}</b>\n`;
        successMsg += `👤 কাস্টমার: ${name}\n`;
        successMsg += `📞 ফোন: ${phone}\n`;
        successMsg += `📦 ট্র্যাকিং কোড: <b>${trackingCode}</b>`;
        await sendTelegramMessage(BOT1_TOKEN!, chatId, successMsg);

        if (bookingSuccess && NOTIFY_CHAT_ID) {
          let notifyMsg = `🔔 <b>New Manual Order (Telegram)</b>\n\n`;
          notifyMsg += `🧾 অর্ডার: ${orderNumber}\n👤 কাস্টমার: ${name}\n📞 ফোন: ${phone}\n📍 ঠিকানা: ${address}\n🛍️ প্রোডাক্ট: ${product.name} (${productCode})\n💰 বিল: ৳${total}\n🚚 ট্র্যাকিং: <code>${trackingCode}</code>`;
          await sendTelegramMessage(BOT2_TOKEN!, NOTIFY_CHAT_ID, notifyMsg);
        }

      } catch (err: any) {
        await sendTelegramMessage(BOT1_TOKEN!, chatId, `❌ বুকিং ব্যর্থ: ${err.message}`);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram Webhook Error:", error);
    return NextResponse.json({ ok: true });
  }
}