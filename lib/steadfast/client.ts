const API_BASE_URL = (
  process.env.STEADFAST_BASE_URL || "https://portal.packzy.com/api/v1"
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
  rawData?: ApiObject;
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

export type SteadfastStatusLookup = {
  consignmentId?: string | number;
  invoice?: string;
  trackingCode?: string;
};

export type SteadfastReturnRequestInput = {
  consignment_id?: string | number;
  invoice?: string;
  tracking_code?: string;
  reason?: string;
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

async function callSteadfastApi(
  path: string,
  method: "GET" | "POST" = "GET",
  body?: Record<string, unknown>,
): Promise<ApiObject> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: getCredentials(),
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });

  const result = await readJson(response);
  if (!response.ok) {
    const message = typeof result.message === "string" ? result.message : "Steadfast API request failed.";
    throw new Error(`${message} (HTTP ${response.status})`);
  }
  if (typeof result.status === "number" && result.status >= 400) {
    throw new Error(typeof result.message === "string" ? result.message : "Steadfast API returned an error.");
  }
  return result;
}

function responseData(result: ApiObject): ApiObject {
  return result.data && typeof result.data === "object" && !Array.isArray(result.data)
    ? (result.data as ApiObject)
    : result;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(/[%,]/g, "").trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

// Missing values remain null. An unavailable metric must never be represented as zero.
function safeCount(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
    if (Array.isArray(value)) return value.length;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value.replace(/[%,]/g, "").trim());
      if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    }
    if (
      value && typeof value === "object" && "length" in value &&
      typeof value.length === "number" && value.length >= 0
    ) return value.length;
  }
  return null;
}

function bestAvailableCount(...values: unknown[]): number | null {
  const parsed = values.map((value) => safeCount(value)).filter((value): value is number => value !== null);
  // Some API versions send a placeholder zero alongside a populated alias.
  return parsed.find((value) => value > 0) ?? parsed[0] ?? null;
}

function getDeliveredCount(data: ApiObject): number | null {
  return bestAvailableCount(
    data.total_delivered,
    data.delivered_count,
    data.deliveredCount,
    data.totalDelivered,
    data.delivered,
    data.delivered_parcels,
    data.success_parcels,
    data.success_count,
    data.total_success,
  );
}

function getCancelledCount(data: ApiObject): number | null {
  return bestAvailableCount(
    data.total_cancelled,
    data.cancelled_count,
    data.cancelledCount,
    data.totalCancelled,
    data.cancelled,
    data.canceled_count,
    data.cancelled_parcels,
    data.return_parcels,
    data.cancel_count,
    data.total_canceled,
  );
}

function getParcelCount(data: ApiObject): number | null {
  return bestAvailableCount(
    data.total_parcels,
    data.Total_parcels,
    data.totalParcels,
    data.total_parcel,
    data.parcel_volume,
    data.total_packets,
    data.parcels,
    data.total_parcel_count,
    data.total_orders,
    data.totalOrders,
  );
}

function getCourierRows(data: ApiObject): ApiObject[] {
  const value = data.couriers;
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is ApiObject =>
        !!item && typeof item === "object" &&
        String((item as ApiObject).data_type ?? "").toLowerCase() !== "rating",
    );
  }
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).filter(
      (item): item is ApiObject =>
        !!item && typeof item === "object" && !Array.isArray(item) &&
        String((item as ApiObject).data_type ?? "").toLowerCase() !== "rating",
    );
  }
  return [];
}

function sumCourierMetric(rows: ApiObject[], keys: string[]): number | null {
  if (!rows.length) return null;
  const values = rows.map((row) => {
    for (const key of keys) {
      const count = asNumber(row[key]);
      if (count !== null && count >= 0) return count;
    }
    return null;
  });
  if (values.every((value) => value === null)) return null;
  return values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

function useFallbackCount(primary: number | null, fallback: number | null, ratio: number | null): number | null {
  if (fallback !== null && (primary === null || (primary === 0 && ratio !== null && ratio > 0 && fallback > 0))) {
    return fallback;
  }
  if (primary === 0 && ratio !== null && ratio > 0) return null;
  return primary;
}

export async function checkSteadfastFraud(phone: string): Promise<FraudCheckResult> {
  const normalizedPhone = normalizePhone(phone);

  // The score endpoint supplies delivery/cancellation percentages.
  const scoreResult = await callSteadfastApi(
    `/fraud_check/score/${encodeURIComponent(normalizedPhone)}`,
  );
  const data = responseData(scoreResult);

  const deliveryRatio =
    asNumber(data.delivery_ratio) ??
    asNumber(data.success_ratio) ??
    asNumber(data.delivered_ratio) ??
    asNumber(data.delivery_rate);
  const cancellationRatio =
    asNumber(data.cancellation_ratio) ??
    asNumber(data.cancel_ratio) ??
    asNumber(data.cancel_rate);
  const returnRatio = asNumber(data.return_ratio);

  const courierRows = getCourierRows(data);
  let delivered = getDeliveredCount(data) ?? sumCourierMetric(courierRows, ["delivered", "success", "total_delivered"]);
  let cancelled = getCancelledCount(data) ?? sumCourierMetric(courierRows, ["cancelled", "cancel", "total_cancelled"]);
  let parcels = getParcelCount(data) ?? sumCourierMetric(courierRows, ["orders", "total", "parcels"]);

  // Some Steadfast score responses include ratios but omit exact counts. In that
  // case, query the documented legacy fraud endpoint for exact parcel counts.
  // Also retry that endpoint when a zero count contradicts a positive percentage.
  const countsMissing = delivered === null || cancelled === null || parcels === null;
  const countsConflictWithRates =
    (deliveryRatio !== null && deliveryRatio > 0 && delivered === 0) ||
    (cancellationRatio !== null && cancellationRatio > 0 && cancelled === 0);

  let legacyData: ApiObject | null = null;
  if (countsMissing || countsConflictWithRates) {
    try {
      const legacyResult = await callSteadfastApi(
        `/fraud_check/${encodeURIComponent(normalizedPhone)}`,
      );
      legacyData = responseData(legacyResult);
    } catch (error) {
      // Keep score/ratio data usable even when the legacy count endpoint is unavailable.
      console.warn("Steadfast detailed fraud counts unavailable:", error instanceof Error ? error.message : "Unknown error");
    }
  }

  if (legacyData) {
    const legacyDelivered = getDeliveredCount(legacyData);
    const legacyCancelled = getCancelledCount(legacyData);
    const legacyParcels = getParcelCount(legacyData);
    delivered = useFallbackCount(delivered, legacyDelivered, deliveryRatio);
    cancelled = useFallbackCount(cancelled, legacyCancelled, cancellationRatio);
    parcels = useFallbackCount(parcels, legacyParcels, null);
    if (parcels === null && delivered !== null && cancelled !== null) parcels = delivered + cancelled;
  }

  if (parcels === null && delivered !== null && cancelled !== null) {
    parcels = delivered + cancelled;
  }

  const totalFraudReports = Math.max(
    0,
    safeCount(data.total_reports, data.total_fraud_reports, data.fraud_reports) ??
      (legacyData ? safeCount(legacyData.total_reports, legacyData.total_fraud_reports, legacyData.fraud_reports) : null) ??
      0,
  );
  const score = asNumber(data.score) ?? asNumber(data.fraud_score);
  const level = typeof data.level === "string" && data.level.trim() ? data.level.trim() : null;
  const scoringDisabled = data.scoring_disabled === true;
  const doubtfulReports = data.doubtful_reports === true;
  const fraudCategories = Array.isArray(data.fraud_categories)
    ? data.fraud_categories.filter((item): item is string => typeof item === "string")
    : [];

  const isFraud = totalFraudReports > 0 || doubtfulReports || fraudCategories.length > 0;
  const normalizedLevel = level?.toLowerCase().replace(/[_-]/g, " ");
  const highRiskLevel = normalizedLevel === "high" || normalizedLevel === "very high" || normalizedLevel === "critical";
  const requiresReview = scoringDisabled || highRiskLevel ||
    (cancellationRatio !== null && cancellationRatio >= 30) ||
    (returnRatio !== null && returnRatio >= 30);

  return {
    phone: normalizedPhone,
    totalParcels: parcels,
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
    rawData: data,
  };
}

export async function createSteadfastBooking(input: SteadfastBookingInput): Promise<SteadfastBookingResult> {
  const phone = normalizePhone(input.recipient_phone);
  if (!input.invoice.trim() || !input.recipient_name.trim() || !input.recipient_address.trim()) {
    throw new Error("Courier booking-এর প্রয়োজনীয় তথ্য অসম্পূর্ণ।");
  }
  if (input.recipient_name.length > 100) throw new Error("Customer name 100 characters-এর বেশি হতে পারবে না।");
  if (input.recipient_address.length > 250) throw new Error("Customer address 250 characters-এর মধ্যে রাখুন।");
  if (!Number.isFinite(input.cod_amount) || input.cod_amount < 0) throw new Error("COD amount সঠিক নয়।");

  const result = await callSteadfastApi("/create_order", "POST", { ...input, recipient_phone: phone });
  const consignment = result.consignment && typeof result.consignment === "object"
    ? (result.consignment as ApiObject)
    : null;
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

export async function getSteadfastBalance(): Promise<{ currentBalance: number; rawData: ApiObject }> {
  const result = await callSteadfastApi("/get_balance");
  const data = responseData(result);
  const value = asNumber(data.current_balance);
  if (value === null) throw new Error("Steadfast balance response-এ current_balance পাওয়া যায়নি।");
  return { currentBalance: value, rawData: result };
}

export async function getSteadfastOrderStatus(lookup: SteadfastStatusLookup): Promise<{ deliveryStatus: string; rawData: ApiObject }> {
  let path = "";
  if (lookup.consignmentId !== undefined && String(lookup.consignmentId).trim()) {
    path = `/status_by_cid/${encodeURIComponent(String(lookup.consignmentId).trim())}`;
  } else if (lookup.trackingCode?.trim()) {
    path = `/status_by_trackingcode/${encodeURIComponent(lookup.trackingCode.trim())}`;
  } else if (lookup.invoice?.trim()) {
    path = `/status_by_invoice/${encodeURIComponent(lookup.invoice.trim())}`;
  } else {
    throw new Error("Status check-এর জন্য Consignment ID, Tracking Code অথবা Invoice লাগবে।");
  }
  const result = await callSteadfastApi(path);
  const data = responseData(result);
  const deliveryStatus = String(data.delivery_status ?? data.status_text ?? data.status ?? "").trim();
  if (!deliveryStatus || /^\d+$/.test(deliveryStatus)) throw new Error("Steadfast response-এ delivery_status পাওয়া যায়নি।");
  return { deliveryStatus, rawData: result };
}

export async function getSteadfastTrackingsByInvoice(invoice: string): Promise<ApiObject[]> {
  if (!invoice.trim()) throw new Error("Invoice number প্রয়োজন।");
  const result = await callSteadfastApi(`/trackings_by_invoice/${encodeURIComponent(invoice.trim())}`);
  const data = responseData(result);
  const candidates = data.trackings ?? data.tracking ?? data.data;
  if (Array.isArray(candidates)) return candidates.filter((item): item is ApiObject => !!item && typeof item === "object");
  if (candidates && typeof candidates === "object") return [candidates as ApiObject];
  return [];
}

export async function createSteadfastReturnRequest(input: SteadfastReturnRequestInput): Promise<ApiObject> {
  if (!input.consignment_id && !input.invoice?.trim() && !input.tracking_code?.trim()) {
    throw new Error("Return Request-এর জন্য Consignment ID, Invoice অথবা Tracking Code লাগবে।");
  }
  const body: Record<string, unknown> = {};
  if (input.consignment_id) body.consignment_id = String(input.consignment_id);
  else if (input.invoice?.trim()) body.invoice = input.invoice.trim();
  else if (input.tracking_code?.trim()) body.tracking_code = input.tracking_code.trim();
  if (input.reason?.trim()) body.reason = input.reason.trim().slice(0, 500);
  return callSteadfastApi("/create_return_request", "POST", body);
}

export async function getSteadfastReturnRequests(): Promise<ApiObject> {
  return callSteadfastApi("/get_return_requests");
}

export async function getSteadfastReturnRequest(id: string): Promise<ApiObject> {
  if (!id.trim()) throw new Error("Return Request ID প্রয়োজন।");
  return callSteadfastApi(`/get_return_request/${encodeURIComponent(id.trim())}`);
}

export async function getSteadfastPayments(): Promise<ApiObject> {
  return callSteadfastApi("/payments");
}

export async function getSteadfastPayment(paymentId: string): Promise<ApiObject> {
  if (!paymentId.trim()) throw new Error("Payment ID প্রয়োজন।");
  return callSteadfastApi(`/payments/${encodeURIComponent(paymentId.trim())}`);
}

export function getSteadfastTrackingUrl(trackingCode: string): string {
  return `https://steadfast.com.bd/t/${encodeURIComponent(trackingCode.trim())}`;
}
