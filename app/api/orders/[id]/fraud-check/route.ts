import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase/server";
import { verifyAdminRequest } from "../../../../../lib/supabase/verify-admin";
import { checkSteadfastFraud } from "../../../../../lib/steadfast/client";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: Request,
  context: RouteContext,
) {
  const verification = await verifyAdminRequest(request);
  if (!verification.authorized) return verification.response;

  const { id } = await context.params;

  // ১. অর্ডার লোড করুন
  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("phone")
    .eq("id", id)
    .maybeSingle();

  if (orderError || !order) {
    return NextResponse.json({ success: false, message: "অর্ডার পাওয়া যায়নি।" }, { status: 404 });
  }

  try {
    // ২. Steadfast থেকে নতুন ফ্রড রিপোর্ট আনুন
    const fraudData = await checkSteadfastFraud(order.phone);

    const fraudStatus = fraudData.isFraud 
      ? "blocked" 
      : fraudData.requiresReview 
        ? "review" 
        : "passed";

    // ৩. ডাটাবেসে আপডেট করুন
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        fraud_check_status: fraudStatus,
        fraud_total_parcels: fraudData.totalParcels,
        fraud_total_delivered: fraudData.totalDelivered,
        fraud_total_cancelled: fraudData.totalCancelled,
        fraud_score: fraudData.score,
        fraud_level: fraudData.level,
        fraud_delivery_ratio: fraudData.deliveryRatio,
        fraud_cancellation_ratio: fraudData.cancellationRatio,
        fraud_return_ratio: fraudData.returnRatio,
        fraud_total_reports: fraudData.totalFraudReports,
        fraud_checked_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, message: "ফ্রড ডেটা আপডেট হয়েছে।" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "ফ্রড চেক করা যায়নি।" },
      { status: 500 }
    );
  }
}