const API_BASE_URL = (
  process.env.STEADFAST_BASE_URL ||
  "https://portal.packzy.com/api/v1"
).replace(/\/+$/, "");

type ApiObject = Record<string, unknown>;

export type FraudCheckResult = {
  phone: string;
  totalParcels: number | null;
  totalDelivered: number | null;
  totalCancelled: number | null;
  totalFraudReports: number;
  deliveryRatio: number | null;
  cancellationRatio: number | null;
  returnRatio: number | null;
  score: number | null;
  level: string | null;
  scoringDisabled: boolean;
  doubtfulReports: boolean;
  fraudCategories: string[];
  isFraud: boolean;
  requiresReview: boolean;
  rawData?: any; // ✨ ডিবাগ করার জন্য
};

export type SteadfastBookingInput = {
  invoice: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  cod_amount: number;
  note?: string;
  item_description?: string;
};

export type SteadfastBookingResult = {
  consignmentId: string;
  trackingCode: string;
  status: string;
  bookedAt: string | null;
};

function getCredentials() {
  const apiKey = process.env.STEADFAST_API_KEY;
  const secretKey = process.env.STEADFAST_SECRET_KEY;

  if (!apiKey || !secretKey) {
    throw new Error("Steadfast API credentials are missing.");
  }

  return {
    "Api-Key": apiKey,
    "Secret-Key": secretKey,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function normalizePhone(phone: string): string {
  let normalized = phone.replace(/\D/g, "");
  if (normalized.startsWith("880") && normalized.length === 13) {
    normalized = `0${normalized.slice(3)}`;
  } else if (normalized.length === 10 && normalized.startsWith("1")) {
    normalized = `0${normalized}`;
  }
  if (!/^01[3-9]\d{8}$/.test(normalized)) {
    throw new Error("সঠিক বাংলাদেশি মোবাইল নম্বর পাওয়া যায়নি।");
  }
  return normalized;
}

async function readJson(response: Response): Promise<ApiObject> {
  const result: unknown = await response.json();
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new Error("Steadfast API returned an unexpected response.");
  }
  return result as ApiObject;
}

export async function checkSteadfastFraud(
  phone: string,
): Promise<FraudCheckResult> {
  const normalizedPhone = normalizePhone(phone);

  const response = await fetch(
    `${API_BASE_URL}/fraud_check/score/${encodeURIComponent(normalizedPhone)}`,
    {
      method: "GET",
      headers: getCredentials(),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    },
  );

  const result = await readJson(response);

  if (!response.ok) {
    throw new Error(`Steadfast fraud check failed with HTTP ${response.status}.`);
  }

  const data =
    result.data && typeof result.data === "object" && !Array.isArray(result.data)
      ? (result.data as ApiObject)
      : result;

  const asNumber = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const cleanValue = value.replace(/[%,]/g, "").trim();
      const parsed = Number(cleanValue);
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  };

  // ✨ অ্যারে বা অবজেক্ট—সব ফরম্যাট থেকে সংখ্যা বের করার শক্তিশালী ফাংশন
  const safeCount = (...values: unknown[]): number => {
    for (const value of values) {
      if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
      if (Array.isArray(value)) return value.length;
      if (typeof value === "string") {
        const parsed = Number(value.replace(/[%,]/g, "").trim());
        if (value.trim() !== "" && Number.isFinite(parsed) && parsed >= 0) return parsed;
      }
      if (value && typeof value === "object" && "length" in value && typeof value.length === "number" && value.length >= 0) {
        return value.length;
      }
    }
    return 0;
  };

  // ✨ সম্ভাব্য সব ফিল্ডের নাম চেক করা হচ্ছে
  const delivered = safeCount(data.total_delivered, data.delivered_count, data.delivered, data.delivered_parcels, data.success_parcels, data.success_count);
  const cancelled = safeCount(data.total_cancelled, data.cancelled_count, data.cancelled, data.cancelled_parcels, data.return_parcels, data.cancel_count);
  const parcels = safeCount(data.total_parcels, data.total_parcel, data.parcel_volume, data.total_packets, data.parcels, data.total_parcel_count);
  const finalParcels = parcels > 0 ? parcels : (delivered + cancelled);

  const totalFraudReports = Math.max(0, safeCount(data.total_reports, data.total_fraud_reports, data.fraud_reports));
  const score = asNumber(data.score) ?? asNumber(data.fraud_score);
  const level = typeof data.level === "string" && data.level.trim() ? data.level.trim() : null;
  const scoringDisabled = data.scoring_disabled === true;
  const doubtfulReports = data.doubtful_reports === true;
  const fraudCategories = Array.isArray(data.fraud_categories) ? data.fraud_categories.filter((item): item is string => typeof item === "string") : [];

  const deliveryRatio = asNumber(data.delivery_ratio) ?? asNumber(data.success_ratio) ?? asNumber(data.delivered_ratio);
  const cancellationRatio = asNumber(data.cancellation_ratio) ?? asNumber(data.cancel_ratio);
  const returnRatio = asNumber(data.return_ratio);

  const isFraud = totalFraudReports > 0 || doubtfulReports || fraudCategories.length > 0;
  const normalizedLevel = level?.toLowerCase().replace(/[_-]/g, " ");
  const highRiskLevel = normalizedLevel === "high" || normalizedLevel === "very high" || normalizedLevel === "critical";
  const requiresReview = scoringDisabled || highRiskLevel || (cancellationRatio !== null && cancellationRatio >= 30) || (returnRatio !== null && returnRatio >= 30);

  return {
    phone: normalizedPhone,
    totalParcels: finalParcels,
    totalDelivered: delivered,
    totalCancelled: cancelled,
    totalFraudReports,
    deliveryRatio,
    cancellationRatio,
    returnRatio,
    score,
    level,
    scoringDisabled,
    doubtfulReports,
    fraudCategories,
    isFraud,
    requiresReview,
    rawData: data, // ✨ আসল ডেটা পাঠানো হলো
  };
}

export async function createSteadfastBooking(
  input: SteadfastBookingInput,
): Promise<SteadfastBookingResult> {
  const phone = normalizePhone(input.recipient_phone);

  if (!input.invoice.trim() || !input.recipient_name.trim() || !input.recipient_address.trim()) {
    throw new Error("Courier booking-এর প্রয়োজনীয় তথ্য অসম্পূর্ণ।");
  }

  if (input.recipient_name.length > 100) throw new Error("Customer name 100 characters-এর বেশি হতে পারবে না।");
  if (input.recipient_address.length > 250) throw new Error("Customer address 250 characters-এর মধ্যে রাখুন।");
  if (!Number.isFinite(input.cod_amount) || input.cod_amount < 0) throw new Error("COD amount সঠিক নয়।");

  const response = await fetch(`${API_BASE_URL}/create_order`, {
    method: "POST",
    headers: getCredentials(),
    body: JSON.stringify({ ...input, recipient_phone: phone }),
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });

  const result = await readJson(response);

  if (!response.ok) throw new Error(`Steadfast booking failed (HTTP ${response.status}).`);

  const consignment = result.consignment && typeof result.consignment === "object" ? (result.consignment as ApiObject) : null;

  if (!consignment || consignment.consignment_id == null || !consignment.tracking_code) {
    throw new Error("Steadfast booking confirmation পাওয়া যায়নি।");
  }

  return {
    consignmentId: String(consignment.consignment_id),
    trackingCode: String(consignment.tracking_code),
    status: String(consignment.status || "in_review"),
    bookedAt: typeof consignment.created_at === "string" ? consignment.created_at : null,
  };
}