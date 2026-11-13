"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase/supabase-client"; // আপনার পাথ অনুযায়ী ঠিক করে নিন
import DailyPackingPlan from "../../../components/admin/daily-packing-plan";

// Bangladesh time helpers and resilient order-item parsing.
function getDhakaDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatOrderDate(value: string | Date, withTime = true) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "তারিখ পাওয়া যায়নি";
  return new Intl.DateTimeFormat("en-BD", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    ...(withTime ? { hour: "numeric", minute: "2-digit", hour12: true } : {}),
  }).format(date);
}

function normalizeOrderPhone(value: unknown) {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("880") && digits.length >= 13) digits = `0${digits.slice(3)}`;
  return digits;
}

function getOrderItems(order: any): any[] {
  if (Array.isArray(order?.items)) return order.items;
  if (typeof order?.items === "string") {
    try {
      const parsed = JSON.parse(order.items);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function getItemImage(item: any): string {
  const images = Array.isArray(item?.images) ? item.images : [];
  return String(
    item?.imageUrl ?? item?.image_url ?? item?.thumbnailUrl ??
    item?.thumbnail_url ?? item?.image ?? images[0] ?? ""
  ).trim();
}

function getItemName(item: any) {
  return item?.name || item?.productName || item?.product_name || "Saree";
}

function getOrderPieceCount(order: any) {
  return getOrderItems(order).reduce((sum, item) => {
    const quantity = Number(item?.quantity ?? 1);
    return sum + (Number.isFinite(quantity) && quantity > 0 ? quantity : 1);
  }, 0);
}

function getOrderStatus(order: any) {
  return String(order?.steadfast_delivery_status ?? "processing").toLowerCase();
}

function isPackingExcludedOrder(order: any) {
  const status = String(order?.steadfast_delivery_status ?? "").toLowerCase();
  return (
    order?.fraud_check_status === "blocked" ||
    status === "cancelled" ||
    status === "canceled" ||
    status === "cancelled_approval_pending"
  );
}

function isOrderPackingDone(order: any) {
  const items = getOrderItems(order);
  return items.length > 0 && items.every((item: any) => item?.packingDone === true);
}

// ✨ ডিস্ট্রিক্ট লিস্ট (প্রয়োজন অনুযায়ী আপনি বাড়াতে পারেন)
const districts = ["ঢাকা", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "বরিশাল", "সিলেট", "রংপুর", "ময়মনসিংহ", "কুমিল্লা", "নারায়ণগঞ্জ", "গাজীপুর", "টাঙ্গাইল", "নরসিংদী", "মুন্সিগঞ্জ", "মানিকগঞ্জ", "কিশোরগঞ্জ", "ফরিদপুর", "গোপালগঞ্জ", "মাদারীপুর", "রাজবাড়ী", "শরীয়তপুর", "কক্সবাজার", "ব্রাহ্মণবাড়িয়া", "চাঁদপুর", "ফেনী", "নোয়াখালী", "লক্ষ্মীপুর", "খাগড়াছড়ি", "রাঙামাটি", "বান্দরবান", "নাটোর", "নওগাঁ", "চাঁপাইনবাবগঞ্জ", "পাবনা", "সিরাজগঞ্জ", "বগুড়া", "জয়পুরহাট", "দিনাজপুর", "ঠাকুরগাঁও", "পঞ্চগড়", "কুড়িগ্রাম", "লালমনিরহাট", "নীলফামারী", "গাইবান্ধা", "যশোর", "সাতক্ষীরা", "বাগেরহাট", "ঝিনাইদহ", "মাগুরা", "নড়াইল", "কুষ্টিয়া", "চুয়াডাঙ্গা", "মেহেরপুর", "ভোলা", "পটুয়াখালী", "পিরোজপুর", "বরগুনা", "ঝালকাঠি", "মৌলভীবাজার", "হবিগঞ্জ", "সুনামগঞ্জ", "জামালপুর", "শেরপুর", "নেত্রকোনা"];

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ordersLoadError, setOrdersLoadError] = useState("");
  const [courierBalance, setCourierBalance] = useState<number | null>(null);
  const [courierBalanceError, setCourierBalanceError] = useState("");
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [courierBusyAction, setCourierBusyAction] = useState<string | null>(null);
  const [trackingEvents, setTrackingEvents] = useState<any[]>([]);
  const [trackingError, setTrackingError] = useState("");
  const [returnReason, setReturnReason] = useState("Customer requested return");
  const [returnRequestResult, setReturnRequestResult] = useState<any | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [packingBusyOrderId, setPackingBusyOrderId] = useState<string | null>(null);
  const [packingFilter, setPackingFilter] = useState("all");

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", phone: "", address: "", upazila: "", district: "" });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefreshingFraud, setIsRefreshingFraud] = useState(false);

  // ✨ Manual Order Modal State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ name: "", phone: "", district: "", upazila: "", address: "", note: "" });
  const [searchCode, setSearchCode] = useState("");
  const [searchedProduct, setSearchedProduct] = useState<any | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [manualCart, setManualCart] = useState<any[]>([]);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const getAdminToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Admin session পাওয়া যায়নি। আবার লগইন করো।");
    return session.access_token;
  };

  const loadCourierBalance = async () => {
    setIsLoadingBalance(true);
    setCourierBalanceError("");
    try {
      const token = await getAdminToken();
      const response = await fetch("/api/admin/steadfast?action=balance", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Balance পাওয়া যায়নি।");
      setCourierBalance(Number(result.current_balance));
    } catch (error: any) {
      setCourierBalanceError(error?.message || "Balance পাওয়া যায়নি।");
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const handleCourierAction = async (action: "status" | "tracking" | "return") => {
    if (!selectedOrder || courierBusyAction) return;
    if (action === "return" && !window.confirm("এই parcel-এর জন্য Steadfast-এ Return Request পাঠাবে? এটি সরাসরি parcel cancel করে না; Steadfast-এর approval প্রয়োজন হতে পারে।")) return;

    setCourierBusyAction(action);
    setTrackingError("");
    if (action === "return") setReturnRequestResult(null);
    try {
      const token = await getAdminToken();
      const response = await fetch("/api/admin/steadfast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          orderId: selectedOrder.id,
          ...(action === "return" ? { reason: returnReason } : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Steadfast request failed.");

      if (action === "status") {
        const refreshed = { ...selectedOrder, steadfast_delivery_status: result.delivery_status };
        setSelectedOrder(refreshed);
        setOrders((previous) => previous.map((item) => item.id === refreshed.id ? refreshed : item));
        alert(`Steadfast status আপডেট হয়েছে: ${result.delivery_status}`);
      } else if (action === "tracking") {
        setTrackingEvents(Array.isArray(result.trackings) ? result.trackings : []);
        if (!Array.isArray(result.trackings) || result.trackings.length === 0) {
          setTrackingError("এই Invoice-এর জন্য এখনো Tracking History পাওয়া যায়নি।");
        }
      } else {
        setReturnRequestResult(result.return_request ?? result);
        alert("Return Request Steadfast-এ পাঠানো হয়েছে। এটি এখনো approval pending থাকতে পারে।");
      }
    } catch (error: any) {
      const message = error?.message || "Steadfast request failed.";
      if (action === "tracking") setTrackingError(message);
      else alert(message);
    } finally {
      setCourierBusyAction(null);
    }
  };

  const handleBookParcel = async () => {
    if (!selectedOrder || courierBusyAction) return;
    if (!window.confirm(`Order ${selectedOrder.order_number || selectedOrder.id} Steadfast-এ বুক করবে? এটি একটি বাস্তব courier booking তৈরি করবে।`)) return;
    setCourierBusyAction("book");
    try {
      const token = await getAdminToken();
      const response = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Courier booking করা যায়নি।");
      const { data: updatedOrder, error } = await supabase.from("orders").select("*").eq("id", selectedOrder.id).single();
      if (error) throw error;
      if (updatedOrder) {
        setSelectedOrder(updatedOrder);
        setOrders((previous) => previous.map((item) => item.id === updatedOrder.id ? updatedOrder : item));
      }
      alert(`Steadfast booking সফল হয়েছে।
Consignment ID: ${result.consignment_id}
Tracking Code: ${result.tracking_code}`);
    } catch (error: any) {
      alert(error?.message || "Courier booking করা যায়নি।");
    } finally {
      setCourierBusyAction(null);
    }
  };

  const copyText = async (value: string, label: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      alert(`${label} copy হয়েছে।`);
    } catch {
      alert("Copy করা যায়নি। হাতে select করে copy করো।");
    }
  };

  const handleToggleOrderPacking = async (order: any) => {
    if (!order?.id || packingBusyOrderId) return;
    if (isPackingExcludedOrder(order)) {
      alert("Cancelled বা Fraud Blocked Order প্যাকিং তালিকায় Entry করা যাবে না।");
      return;
    }

    const currentItems = getOrderItems(order);
    if (currentItems.length === 0) {
      alert("এই Order-এ কোনো Product পাওয়া যায়নি।");
      return;
    }

    const nextDone = !isOrderPackingDone(order);
    const packedAt = nextDone ? new Date().toISOString() : null;
    const updatedItems = currentItems.map((item: any) => ({
      ...item,
      packingDone: nextDone,
      packingDoneAt: packedAt,
    }));

    setPackingBusyOrderId(order.id);
    try {
      const { data, error } = await supabase
        .from("orders")
        .update({ items: updatedItems })
        .eq("id", order.id)
        .select("*")
        .single();

      if (error) throw error;
      const updatedOrder = data ?? { ...order, items: updatedItems };
      setOrders((previous) => previous.map((item) => item.id === order.id ? updatedOrder : item));
      setSelectedOrder((previous: any) => previous?.id === order.id ? updatedOrder : previous);
    } catch (error: any) {
      alert("Packing Entry Save হয়নি: " + (error?.message || "Unknown error"));
    } finally {
      setPackingBusyOrderId(null);
    }
  };

  useEffect(() => {
    void loadCourierBalance();
  }, []);

  useEffect(() => {
    setTrackingEvents([]);
    setTrackingError("");
    setReturnRequestResult(null);
    setReturnReason("Customer requested return");
  }, [selectedOrder?.id]);

  useEffect(() => {
    const loadOrders = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Orders load error:", error);
        setOrdersLoadError(error.message || "Supabase থেকে Orders load করা যায়নি।");
        setIsLoading(false);
        return;
      }

      setOrdersLoadError("");
      setOrders(data ?? []);
      
      setSelectedOrder((prevSelected: any) => {
        if (!prevSelected) return null;
        const updated = (data ?? []).find(o => o.id === prevSelected.id);
        return updated || null;
      });

      setIsLoading(false);
    };

    loadOrders();
    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    const todayKey = getDhakaDateKey(new Date());
    const monthKey = todayKey.slice(0, 7);
    const oneYearAgo = new Date();
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);
    const oneYearAgoKey = getDhakaDateKey(oneYearAgo);

    return orders.filter((order) => {
      const matchesSearch = !term ||
        String(order.order_number ?? "").toLowerCase().includes(term) ||
        String(order.id ?? "").toLowerCase().includes(term) ||
        String(order.customer_name ?? "").toLowerCase().includes(term) ||
        String(order.phone ?? "").toLowerCase().includes(term);
      if (!matchesSearch) return false;

      const status = getOrderStatus(order);
      let matchesStatus = true;
      if (statusFilter === "cancelled") matchesStatus = status === "cancelled" || status === "canceled" || status === "cancelled_approval_pending";
      else if (statusFilter === "in_review") matchesStatus = status === "in_review";
      else if (statusFilter === "pending") matchesStatus = status === "pending";
      else if (statusFilter === "partial") matchesStatus = status.includes("partial");
      else if (statusFilter === "delivered") matchesStatus = status === "delivered" || status === "delivered_approval_pending";
      else if (statusFilter === "hold") matchesStatus = status === "hold";
      else if (statusFilter === "processing") matchesStatus = status === "processing" || status === "unknown" || !status;

      if (!matchesStatus) return false;

      if (packingFilter !== "all") {
        if (isPackingExcludedOrder(order)) return false;
        const packed = isOrderPackingDone(order);
        if (packingFilter === "done" && !packed) return false;
        if (packingFilter === "not_entered" && packed) return false;
      }

      const orderDate = getDhakaDateKey(order.created_at);
      if (!orderDate) return false;
      if (dateFilter === "today" && orderDate !== todayKey) return false;
      if (dateFilter === "month" && orderDate.slice(0, 7) !== monthKey) return false;
      if (dateFilter === "year" && orderDate < oneYearAgoKey) return false;
      if (dateFilter === "custom") {
        if (customStartDate && orderDate < customStartDate) return false;
        if (customEndDate && orderDate > customEndDate) return false;
      }
      return true;
    });
  }, [orders, search, statusFilter, dateFilter, customStartDate, customEndDate, packingFilter]);

  const pendingCount = orders.filter((o) => o.steadfast_delivery_status === "pending").length;
  const processingCount = orders.filter((o) => o.steadfast_delivery_status === "in_review" || o.steadfast_delivery_status === "processing").length;
  const deliveredCount = orders.filter((o) => o.steadfast_delivery_status === "delivered").length;

  const getStatusBadge = (order: any) => {
    const status = String(order.steadfast_delivery_status ?? "processing").toLowerCase();
    if (order.fraud_check_status === "blocked") return <span className="status-badge blocked">🚫 Fraud Blocked</span>;
    if (status === "in_review") return <span className="status-badge review">⏳ In Review</span>;
    if (status === "pending") return <span className="status-badge pending">📦 Pending</span>;
    if (status.includes("partial")) return <span className="status-badge partial">🟠 Partial Delivered</span>;
    if (status === "delivered_approval_pending") return <span className="status-badge review">✅ Delivered · Approval Pending</span>;
    if (status === "delivered") return <span className="status-badge delivered">✅ Delivered</span>;
    if (status === "cancelled_approval_pending") return <span className="status-badge review">↩️ Cancelled · Approval Pending</span>;
    if (status === "cancelled" || status === "canceled") return <span className="status-badge cancelled">❌ Cancelled</span>;
    if (status === "hold") return <span className="status-badge pending">⏸ On Hold</span>;
    if (status === "unknown" || status === "unknown_approval_pending") return <span className="status-badge default">? Unknown</span>;
    return <span className="status-badge default">⏳ Processing</span>;
  };

  const handleRefreshFraud = async () => {
    if (!selectedOrder) return;
    setIsRefreshingFraud(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session not found");
      const response = await fetch(`/api/orders/${selectedOrder.id}/fraud-check`, { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` } });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);
      const { data: updatedOrder } = await supabase.from("orders").select("*").eq("id", selectedOrder.id).single();
      if (updatedOrder) {
        setSelectedOrder(updatedOrder);
        setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
      }
      alert("ফ্রড রিপোর্ট সফলভাবে আপডেট হয়েছে!");
    } catch (error: any) {
      alert("আপডেট করতে সমস্যা হয়েছে: " + error.message);
    } finally {
      setIsRefreshingFraud(false);
    }
  };

  const handleEditClick = () => {
    if (!selectedOrder) return;
    if (selectedOrder.steadfast_tracking_code) {
      alert("এই অর্ডারটি ইতিমধ্যে Steadfast-এ বুক করা হয়েছে।");
      return;
    }
    setEditForm({ name: selectedOrder.customer_name || "", phone: selectedOrder.phone || "", address: selectedOrder.address || "", upazila: selectedOrder.upazila || "", district: selectedOrder.district || "" });
    setIsEditing(true);
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase.from("orders").update({ customer_name: editForm.name, phone: editForm.phone, address: editForm.address, upazila: editForm.upazila, district: editForm.district }).eq("id", selectedOrder.id);
      if (error) throw error;
      const updatedOrder = { ...selectedOrder, customer_name: editForm.name, phone: editForm.phone, address: editForm.address, upazila: editForm.upazila, district: editForm.district };
      setOrders((prev) => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
      setSelectedOrder(updatedOrder);
      setIsEditing(false);
      alert("অর্ডার সফলভাবে আপডেট হয়েছে!");
    } catch (err: any) {
      alert("আপডেট করতে সমস্যা হয়েছে: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteOrder = async (order: any) => {
    if (!order?.id || deletingOrderId) return;

    const hasCourierBooking = Boolean(
      order.steadfast_tracking_code ||
      order.steadfast_consignment_id ||
      order.steadfast_booking_status === "booked"
    );
    const warning = hasCourierBooking
      ? "\n\nসতর্কতা: এই অর্ডার Steadfast-এ বুক করা হয়েছে। এখানে ডিলিট করলে শুধু ওয়েবসাইটের অর্ডার রেকর্ড মুছবে; Steadfast courier booking বাতিল হবে না। আগে Steadfast থেকে parcel cancel করে নাও।"
      : "";

    const confirmed = window.confirm(
      `তুমি কি নিশ্চিতভাবে এই অর্ডারটি ডিলিট করতে চাও?\nOrder: ${order.order_number || order.id}${warning}\n\nডিলিট করলে এটি Orders list ও database থেকে মুছে যাবে।`
    );
    if (!confirmed) return;

    setDeletingOrderId(order.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Admin login পাওয়া যায়নি। আবার লগইন করো।");

      const response = await fetch(`/api/orders/${order.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "অর্ডার ডিলিট করা যায়নি।");
      }

      setOrders((previous) => previous.filter((item) => item.id !== order.id));
      setSelectedOrder((previous: any) => previous?.id === order.id ? null : previous);
      alert("অর্ডারটি database থেকে সফলভাবে ডিলিট হয়েছে।");
    } catch (error: any) {
      alert("অর্ডার ডিলিট করতে সমস্যা হয়েছে: " + (error?.message || "Unknown error"));
    } finally {
      setDeletingOrderId(null);
    }
  };

  // ==========================================
  // ✨ MANUAL ORDER LOGIC
  // ==========================================

  const handleProductSearch = async () => {
    if (!searchCode.trim()) return;
    setIsSearching(true);
    setSearchedProduct(null);

    const term = searchCode.trim();

    try {
      // ১. প্রথমে প্রোডাক্ট কোড অথবা নাম দিয়ে সার্চ করা হচ্ছে
      let { data, error } = await supabase
        .from("products")
        .select("*")
        .or(`product_code.ilike.%${term}%,name.ilike.%${term}%`)
        .limit(1)
        .maybeSingle();

      // ২. যদি কোড বা নাম দিয়ে না পাওয়া যায়, তবে চেক করা হচ্ছে এটি কোনো UUID (ID) কি না
      if (!data && !error) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(term);
        if (isUUID) {
          const { data: idData, error: idError } = await supabase
            .from("products")
            .select("*")
            .eq("id", term)
            .maybeSingle();
          data = idData;
          error = idError;
        }
      }

      if (error) {
        console.error("Search error:", error);
        alert(`সার্চ করতে সমস্যা হয়েছে: ${error.message}`);
      } else if (!data) {
        alert(`"${term}" দিয়ে কোনো প্রোডাক্ট পাওয়া যায়নি!\n\nসম্ভাব্য কারণ:\n১. প্রোডাক্টটি ডাটাবেসে নেই।\n২. প্রোডাক্ট কোডটি সঠিকভাবে লেখা হয়নি।\n৩. প্রোডাক্টটি Inactive (লুকানো) আছে।`);
      } else {
        setSearchedProduct(data);
      }
    } catch (err: any) {
      console.error(err);
      alert("সার্চে একটি অপ্রত্যাশিত সমস্যা হয়েছে।");
    } finally {
      setIsSearching(false);
    }
  };

  const addToManualCart = (product: any, qty: number, blouseOption: string) => {
    if (qty > product.stock_quantity) {
      alert(`স্টকে মাত্র ${product.stock_quantity}টি আছে!`);
      return;
    }

    // দাম বের করার লজিক
    let unitPrice = 0;
    if (product.price_type === "single") {
      unitPrice = product.single_discount_price ?? product.single_price;
    } else {
      if (blouseOption === "withBlouse") {
        unitPrice = product.discount_with_blouse_price ?? product.with_blouse_price;
      } else {
        unitPrice = product.discount_without_blouse_price ?? product.without_blouse_price;
      }
    }

    const newItem = {
      productId: product.id,
      name: product.name,
      code: product.product_code,
      price: Number(unitPrice),
      quantity: Number(qty),
      blouseOption: product.price_type === "single" ? "withoutBlouse" : blouseOption,
      isFreeDelivery: Boolean(product.is_free_delivery),
      totalPrice: Number(unitPrice) * Number(qty)
    };

    setManualCart([...manualCart, newItem]);
    setSearchedProduct(null);
    setSearchCode("");
  };

  const removeFromManualCart = (index: number) => {
    setManualCart(manualCart.filter((_, i) => i !== index));
  };

  const handleManualSubmit = async () => {
    if (!manualForm.name || !manualForm.phone || !manualForm.district || !manualForm.address) {
      alert("কাস্টমারের নাম, ফোন, জেলা এবং ঠিকানা অবশ্যই দিতে হবে!");
      return;
    }
    if (manualCart.length === 0) {
      alert("কমপক্ষে ১টি প্রোডাক্ট যোগ করুন!");
      return;
    }

    setIsPlacingOrder(true);

    try {
      const finalDeliveryType = manualForm.district === "ঢাকা" ? "insideDhaka" : "outsideDhaka";

      // আপনার আগের API তে রিকোয়েস্ট পাঠানো হচ্ছে
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: manualForm.name,
          phone: manualForm.phone,
          district: manualForm.district,
          upazila: manualForm.upazila || "N/A",
          address: manualForm.address,
          note: manualForm.note || "Manual Order from Admin",
          delivery_type: finalDeliveryType,
          items: manualCart.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            blouseOption: item.blouseOption
          }))
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "অর্ডার প্লেস করা যায়নি।");
      }

      alert(`সফলভাবে অর্ডার প্লেস হয়েছে! অর্ডার নাম্বার: ${result.order_number}`);
      setIsManualModalOpen(false);
      setManualForm({ name: "", phone: "", district: "", upazila: "", address: "", note: "" });
      setManualCart([]);
      
      // অর্ডার লিস্ট রিফ্রেশ করা
      const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      setOrders(data ?? []);

    } catch (error: any) {
      alert("অর্ডার প্লেস করতে সমস্যা হয়েছে: " + error.message);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Manual Cart Calculations
  const manualSubtotal = manualCart.reduce((sum, item) => sum + item.totalPrice, 0);
  const hasFreeDelivery = manualCart.some(item => item.isFreeDelivery);
  const manualDeliveryCharge = hasFreeDelivery ? 0 : (manualForm.district === "ঢাকা" ? 110 : 130);
  const manualGrandTotal = manualSubtotal + manualDeliveryCharge;

  return (
    <div className="admin-page">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">SC</div>
          <div>
            <div className="brand-name">Saree Craftline</div>
            <div className="brand-subtitle">Admin Panel</div>
          </div>
        </div>
        <div className="menu-title">MAIN MENU</div>
        <nav className="menu">
          <Link href="/admin" className="menu-item"><span className="menu-icon">📊</span><span>Dashboard</span></Link>
          <Link href="/admin/products" className="menu-item"><span className="menu-icon">🛍️</span><span>Products</span></Link>
          <Link href="/admin/categories" className="menu-item"><span className="menu-icon">📁</span><span>Categories</span></Link>
          <Link href="/admin/orders" className="menu-item active"><span className="menu-icon">📦</span><span>Orders</span></Link>
          <Link href="/admin/settings" className="menu-item"><span className="menu-icon">⚙️</span><span>Settings</span></Link>
        </nav>
        <div className="sidebar-bottom">
          <Link href="/" className="view-store"><span>🛒</span> View Store</Link>
        </div>
      </aside>

      <main className="main-content">
        <div className="top-header">
          <div>
            <div className="eyebrow">SAREE CRAFTLINE</div>
            <h1>Orders</h1>
          </div>
          <button className="manual-order-btn" onClick={() => setIsManualModalOpen(true)}>
            ＋ Manual Order
          </button>
        </div>

        {ordersLoadError && (
          <div className="orders-load-error">
            <strong>Orders load করা যায়নি</strong>
            <span>{ordersLoadError}</span>
            <small>Supabase Environment Variables ও orders table-এর SELECT permission / RLS পরীক্ষা করো।</small>
          </div>
        )}

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🛒</div>
            <div><div className="stat-label">TOTAL ORDERS</div><div className="stat-value">{orders.length}</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon pending">⏳</div>
            <div><div className="stat-label">PENDING</div><div className="stat-value">{pendingCount}</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon processing">📦</div>
            <div><div className="stat-label">IN REVIEW / PROCESSING</div><div className="stat-value">{processingCount}</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon delivered">✓</div>
            <div><div className="stat-label">DELIVERED</div><div className="stat-value">{deliveredCount}</div></div>
          </div>
        </div>

        <DailyPackingPlan
          orders={orders}
          onOrderUpdated={(updatedOrder) => {
            setOrders((previous) =>
              previous.map((item) =>
                item.id === updatedOrder.id ? updatedOrder : item
              )
            );
            setSelectedOrder((previous: any) =>
              previous?.id === updatedOrder.id ? updatedOrder : previous
            );
          }}
        />

        <section className="courier-summary-card">
          <div className="courier-summary-copy">
            <span className="courier-summary-label">STEADFAST MERCHANT</span>
            <strong>Courier Account Balance</strong>
            <small>{courierBalanceError ? courierBalanceError : "API থেকে সর্বশেষ Balance"}</small>
          </div>
          <div className="courier-summary-value">
            <strong>{isLoadingBalance ? "লোড হচ্ছে…" : courierBalance === null ? "—" : `৳ ${courierBalance.toLocaleString("en-BD")}`}</strong>
            <button type="button" className="refresh-fraud-btn" onClick={loadCourierBalance} disabled={isLoadingBalance}>
              {isLoadingBalance ? "Wait…" : "↻ Refresh Balance"}
            </button>
          </div>
        </section>

        <div className="search-card">
          <div className="filter-toolbar">
            <div className="search-box">
              <span>⌕</span>
              <input type="text" placeholder="Order ID / Order Number / Customer / Phone দিয়ে সার্চ..." value={search} onChange={(event) => setSearch(event.target.value)} />
              {search && <button type="button" className="clear-search" onClick={() => setSearch("")}>×</button>}
            </div>
            <select className="filter-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by order status">
              <option value="all">All Status</option>
              <option value="cancelled">Cancelled</option>
              <option value="in_review">In Review</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial Delivered</option>
              <option value="delivered">Delivered</option>
              <option value="hold">On Hold</option>
              <option value="processing">Processing / Unknown</option>
            </select>
            <select className="filter-select packing-filter-select" value={packingFilter} onChange={(event) => setPackingFilter(event.target.value)} aria-label="Filter orders by packing entry">
              <option value="all">All Packing</option>
              <option value="not_entered">Not Entry</option>
              <option value="done">Done</option>
            </select>
            <select className="filter-select date-preset" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} aria-label="Filter orders by date">
              <option value="all">All Dates</option>
              <option value="today">Today’s Orders</option>
              <option value="month">This Month</option>
              <option value="year">Last 1 Year</option>
              <option value="custom">Custom Date</option>
            </select>
          </div>
          {dateFilter === "custom" && (
            <div className="custom-date-row">
              <label>From <input type="date" value={customStartDate} onChange={(event) => setCustomStartDate(event.target.value)} /></label>
              <label>To <input type="date" value={customEndDate} min={customStartDate || undefined} onChange={(event) => setCustomEndDate(event.target.value)} /></label>
              <button type="button" className="reset-filter-btn" onClick={() => { setCustomStartDate(""); setCustomEndDate(""); }}>Reset dates</button>
            </div>
          )}
          <div className="filter-result-line">Showing <strong>{filteredOrders.length}</strong> of <strong>{orders.length}</strong> orders</div>
        </div>

        <div className="split-layout">
          <section className="management-card order-list-pane">
            <div className="card-header">
              <div><div className="section-label">ORDER MANAGEMENT</div><h2>All Orders</h2></div>
              <div className="order-count">{filteredOrders.length} of {orders.length} Orders</div>
            </div>

            {isLoading ? (
              <div className="order-loading"><div className="loading-spinner"></div><h3>Loading Orders...</h3></div>
            ) : filteredOrders.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">📦</div><h3>No Orders Found</h3><p>সার্চ অথবা filter পরিবর্তন করে দেখো।</p></div>
            ) : (
              <div className="orders-list">
                {filteredOrders.map((order) => {
                  const items = getOrderItems(order);
                  const pieces = getOrderPieceCount(order);
                  const packed = isOrderPackingDone(order);
                  const packingExcluded = isPackingExcludedOrder(order);
                  return (
                    <div className={`order-card ${selectedOrder?.id === order.id ? "active" : ""}`} key={order.id} onClick={() => { setSelectedOrder(order); setIsEditing(false); }}>
                      <div className="order-summary-row">
                        <div className="order-summary-info">
                          <span className="order-number">{order.order_number || order.id}</span>
                          <strong>{order.customer_name}</strong>
                          <span className="order-card-date">🗓 {formatOrderDate(order.created_at, true)}</span>
                          {order.steadfast_consignment_id ? (
                            <div className="order-card-consignment">
                              <span>STEADFAST CONSIGNMENT ID</span>
                              <strong>{order.steadfast_consignment_id}</strong>
                              <button type="button" onClick={(event) => { event.stopPropagation(); void copyText(String(order.steadfast_consignment_id), "Consignment ID"); }}>Copy ID</button>
                            </div>
                          ) : (
                            <span className="order-card-not-booked">Steadfast: Not booked yet</span>
                          )}
                          <div className="order-mini-products">
                            {items.slice(0, 4).map((item: any, index: number) => {
                              const imageUrl = getItemImage(item);
                              return (
                                <button
                                  type="button"
                                  className="mini-product"
                                  key={`${order.id}-${index}`}
                                  title={`${getItemName(item)} × ${item.quantity ?? 1}${imageUrl ? " · বড় করে দেখতে ক্লিক করো" : ""}`}
                                  disabled={!imageUrl}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    if (imageUrl) setPreviewImage({ url: imageUrl, title: getItemName(item) });
                                  }}
                                  aria-label={`${getItemName(item)} ছবি বড় করে দেখুন`}
                                >
                                  {imageUrl ? <img src={imageUrl} alt={getItemName(item)} loading="lazy" /> : <span className="mini-product-placeholder">🧵</span>}
                                  <span className="mini-product-qty">×{item.quantity ?? 1}</span>
                                </button>
                              );
                            })}
                            {items.length > 4 && <span className="more-products">+{items.length - 4}</span>}
                            <span className="piece-count">{pieces} পিস / {items.length} ডিজাইন</span>
                          </div>
                          {order.fraud_check_status && (
                            <span className="fraud-mini-text">
                              {order.fraud_check_status === "passed" ? "✅ Safe" : order.fraud_check_status === "blocked" ? "🚫 Blocked" : "⚠ Review"}
                              {order.fraud_score ? ` (Score: ${order.fraud_score})` : ""}
                            </span>
                          )}
                        </div>
                        <div className="order-summary-right">
                          <div className="order-card-status">{getStatusBadge(order)}</div>
                          <strong className="order-summary-total">৳ {Number(order.total ?? 0).toLocaleString("en-BD")}</strong>
                          {packingExcluded ? (
                            <span className="packing-excluded-label">Not for packing</span>
                          ) : (
                            <button
                              type="button"
                              className={`order-packing-entry-btn ${packed ? "is-done" : ""}`}
                              title={packed ? "এই Order-এর সব Product Done — Undo করতে ক্লিক করো" : "এই Order-এর সব Product একসঙ্গে Packed Entry করো"}
                              disabled={packingBusyOrderId === order.id || getOrderItems(order).length === 0}
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleToggleOrderPacking(order);
                              }}
                            >
                              {packingBusyOrderId === order.id ? "Saving…" : packed ? "✓ Done" : "＋ Entry"}
                            </button>
                          )}
                          <button
                            type="button"
                            className="delete-order-btn"
                            title="Delete order"
                            disabled={deletingOrderId === order.id}
                            onClick={(event) => { event.stopPropagation(); void handleDeleteOrder(order); }}
                          >{deletingOrderId === order.id ? "..." : "🗑"}</button>
                          <span className="order-expand-icon">{selectedOrder?.id === order.id ? "−" : "+"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="order-details-pane">
            {selectedOrder ? (
              <div className="details-card">
                <div className="details-header">
                  <div><span className="details-order-num">{selectedOrder.order_number || selectedOrder.id}</span><h2>{selectedOrder.customer_name}</h2></div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className="edit-details" onClick={handleEditClick} title="Edit Order">✏️</button>
                    <button className="delete-details" onClick={() => void handleDeleteOrder(selectedOrder)} disabled={deletingOrderId === selectedOrder.id} title="Delete Order">{deletingOrderId === selectedOrder.id ? "..." : "🗑"}</button>
                    <button className="close-details" onClick={() => setSelectedOrder(null)}>×</button>
                  </div>
                </div>
                <div className="details-content">
                  {getStatusBadge(selectedOrder)}
                  {isEditing ? (
                    <form onSubmit={handleUpdateOrder} className="edit-form">
                      <div className="edit-field"><label>Customer Name</label><input type="text" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} required /></div>
                      <div className="edit-field"><label>Phone</label><input type="text" value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} required /></div>
                      <div className="edit-field"><label>District</label><input type="text" value={editForm.district} onChange={(e) => setEditForm({...editForm, district: e.target.value})} required /></div>
                      <div className="edit-field"><label>Upazila</label><input type="text" value={editForm.upazila} onChange={(e) => setEditForm({...editForm, upazila: e.target.value})} required /></div>
                      <div className="edit-field"><label>Address</label><textarea value={editForm.address} onChange={(e) => setEditForm({...editForm, address: e.target.value})} rows={3} required /></div>
                      <div className="edit-actions"><button type="button" onClick={() => setIsEditing(false)} className="btn-cancel">Cancel</button><button type="submit" className="btn-save" disabled={isUpdating}>{isUpdating ? "Saving..." : "Save Changes"}</button></div>
                    </form>
                  ) : (
                    <div className="order-grid">
                      <div className="order-date-banner">
                        <span>🗓 ORDER PLACED ON</span>
                        <strong>{formatOrderDate(selectedOrder.created_at, true)}</strong>
                        <small>Order ID: {selectedOrder.order_number || selectedOrder.id}</small>
                      </div>
                      <section className="courier-order-panel">
                        <div className="courier-order-heading">
                          <div><span>COURIER MANAGEMENT</span><strong>Steadfast Parcel Details</strong></div>
                          {getStatusBadge(selectedOrder)}
                        </div>
                        <div className="courier-id-grid">
                          <div><small>Website Order Number</small><strong>{selectedOrder.order_number || "—"}</strong><button type="button" onClick={() => void copyText(String(selectedOrder.order_number || ""), "Order Number")}>Copy</button></div>
                          <div><small>Database Order ID</small><strong>{selectedOrder.id || "—"}</strong><button type="button" onClick={() => void copyText(String(selectedOrder.id || ""), "Order ID")}>Copy</button></div>
                          <div><small>Consignment ID</small><strong>{selectedOrder.steadfast_consignment_id || "Not booked"}</strong>{selectedOrder.steadfast_consignment_id && <button type="button" onClick={() => void copyText(String(selectedOrder.steadfast_consignment_id), "Consignment ID")}>Copy</button>}</div>
                          <div><small>Tracking Code</small><strong>{selectedOrder.steadfast_tracking_code || "Not available"}</strong>{selectedOrder.steadfast_tracking_code && <button type="button" onClick={() => void copyText(String(selectedOrder.steadfast_tracking_code), "Tracking Code")}>Copy</button>}</div>
                        </div>
                        <div className="courier-actions">
                          {selectedOrder.steadfast_tracking_code && (
                            <>
                              <a className="courier-primary-link" href={`https://steadfast.com.bd/t/${encodeURIComponent(String(selectedOrder.steadfast_tracking_code))}`} target="_blank" rel="noreferrer">↗ Open Tracking Page</a>
                              <button type="button" className="courier-action-btn" onClick={() => void copyText(`https://steadfast.com.bd/t/${encodeURIComponent(String(selectedOrder.steadfast_tracking_code))}`, "Tracking Link")}>Copy Tracking Link</button>
                            </>
                          )}
                          {selectedOrder.steadfast_booking_status === "not_booked" && (
                            <button type="button" className="courier-book-btn" onClick={handleBookParcel} disabled={!!courierBusyAction}>{courierBusyAction === "book" ? "Booking…" : "＋ Send Parcel to Steadfast"}</button>
                          )}
                          {(selectedOrder.steadfast_consignment_id || selectedOrder.steadfast_tracking_code || selectedOrder.order_number) && (
                            <button type="button" className="courier-action-btn" onClick={() => void handleCourierAction("status")} disabled={!!courierBusyAction}>{courierBusyAction === "status" ? "Checking…" : "↻ Refresh Status"}</button>
                          )}
                          {selectedOrder.order_number && (
                            <button type="button" className="courier-action-btn" onClick={() => void handleCourierAction("tracking")} disabled={!!courierBusyAction}>{courierBusyAction === "tracking" ? "Loading…" : "☷ Tracking History"}</button>
                          )}
                        </div>
                        {trackingError && <p className="courier-inline-error">{trackingError}</p>}
                        {trackingEvents.length > 0 && (
                          <div className="tracking-timeline">
                            <strong>Parcel Tracking Timeline</strong>
                            {trackingEvents.map((event: any, index: number) => {
                              const eventDate = event.created_at || event.updated_at || event.date || event.timestamp;
                              const eventText = event.text || event.status || event.description || event.message || event.details || event.note || "Tracking update";
                              return <div className="tracking-event" key={event.id || `${index}-${String(eventText)}`}><span className="tracking-event-dot"/><div><strong>{String(eventText)}</strong>{eventDate && <small>{formatOrderDate(eventDate, true)}</small>}</div></div>;
                            })}
                          </div>
                        )}
                        {(selectedOrder.steadfast_tracking_code || selectedOrder.steadfast_consignment_id) && (
                          <div className="return-request-box">
                            <label htmlFor="returnReason">Parcel Return Request</label>
                            <textarea id="returnReason" value={returnReason} onChange={(event) => setReturnReason(event.target.value)} rows={2} maxLength={500} />
                            <button type="button" className="return-request-btn" onClick={() => void handleCourierAction("return")} disabled={!!courierBusyAction || !returnReason.trim()}>{courierBusyAction === "return" ? "Sending Request…" : "Request Parcel Return"}</button>
                            <small>Return Request পাঠালে parcel সঙ্গে সঙ্গে cancel হয় না; Steadfast-এর approval/status আলাদা।</small>
                            {returnRequestResult && <div className="return-result"><strong>Return Request Response</strong><span>ID: {String(returnRequestResult.id || returnRequestResult.return_request_id || returnRequestResult.consignment_id || "Request created")}</span><span>Status: {String(returnRequestResult.status || "Pending / API response")}</span></div>}
                          </div>
                        )}
                      </section>
                      <div className="order-history-panel">
                        <div className="order-history-heading">
                          <div><span>📚 CUSTOMER HISTORY</span><strong>এই নম্বরের শেষ ৫টি অর্ডার</strong></div>
                          <b>{orders.filter((item) => normalizeOrderPhone(item.phone) === normalizeOrderPhone(selectedOrder.phone)).length} টি মোট</b>
                        </div>
                        <div className="order-history-list">
                          {orders
                            .filter((item) => normalizeOrderPhone(item.phone) === normalizeOrderPhone(selectedOrder.phone))
                            .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
                            .slice(0, 5)
                            .map((historyOrder: any) => (
                              <button type="button" className={`history-order-row ${historyOrder.id === selectedOrder.id ? "current" : ""}`} key={historyOrder.id} onClick={() => { setSelectedOrder(historyOrder); setIsEditing(false); }}>
                                <span className="history-order-main"><strong>{historyOrder.order_number || historyOrder.id}</strong><small>{formatOrderDate(historyOrder.created_at, true)}</small></span>
                                <span className="history-order-side">{getStatusBadge(historyOrder)}<strong>৳ {Number(historyOrder.total ?? 0).toLocaleString("en-BD")}</strong></span>
                              </button>
                            ))}
                          {orders.filter((item) => normalizeOrderPhone(item.phone) === normalizeOrderPhone(selectedOrder.phone)).length === 0 && <p className="history-empty">এই নম্বরে আর কোনো অর্ডার পাওয়া যায়নি।</p>}
                        </div>
                      </div>
                      <div className="fraud-panel">
                        <div className="fraud-header"><span>Steadfast Fraud Report</span><button className="refresh-fraud-btn" onClick={handleRefreshFraud} disabled={isRefreshingFraud}>{isRefreshingFraud ? "Wait..." : "🔄 Refresh"}</button></div>
                        <div className="fraud-main-content">
                          <div className="donut-container"><div className="donut-chart" style={{ "--delivered": `${selectedOrder.fraud_delivery_ratio ?? 0}%` } as React.CSSProperties}><div className="donut-inner"></div></div></div>
                          <div className="fraud-legend-container">
                            <div className="fraud-legend">
                              <div className="legend-item"><span className="dot delivered-dot"></span>Delivered: <strong>{selectedOrder.fraud_delivery_ratio == null ? "তথ্য নেই" : `${selectedOrder.fraud_delivery_ratio}%`}</strong></div>
                              <div className="legend-item"><span className="dot cancelled-dot"></span>Cancelled: <strong>{selectedOrder.fraud_cancellation_ratio == null ? "তথ্য নেই" : `${selectedOrder.fraud_cancellation_ratio}%`}</strong></div>
                            </div>
                            <div className="success-rate">Success Rate: <strong>{selectedOrder.fraud_delivery_ratio == null ? "তথ্য নেই" : `${selectedOrder.fraud_delivery_ratio}%`}</strong></div>
                          </div>
                        </div>
                        <div className="fraud-bottom-boxes">
                          <div className="info-box"><span className="box-icon">📦</span><div className="box-text"><span className="box-label">TOTAL PARCELS</span><strong className="box-value" style={{ color: "#2eaa8f" }}>{selectedOrder.fraud_total_parcels === null || selectedOrder.fraud_total_parcels === undefined || selectedOrder.fraud_total_parcels === "" ? "তথ্য নেই" : Number(selectedOrder.fraud_total_parcels).toLocaleString("en-BD")}</strong></div></div>
                          <div className="info-box"><span className="box-icon">✅</span><div className="box-text"><span className="box-label">DELIVERED</span><strong className="box-value">{selectedOrder.fraud_total_delivered === null || selectedOrder.fraud_total_delivered === undefined || selectedOrder.fraud_total_delivered === "" ? "তথ্য নেই" : Number(selectedOrder.fraud_total_delivered).toLocaleString("en-BD")}</strong></div></div>
                          <div className="info-box"><span className="box-icon">↩️</span><div className="box-text"><span className="box-label">CANCELLED / RETURNED</span><strong className="box-value">{selectedOrder.fraud_total_cancelled === null || selectedOrder.fraud_total_cancelled === undefined || selectedOrder.fraud_total_cancelled === "" ? "তথ্য নেই" : Number(selectedOrder.fraud_total_cancelled).toLocaleString("en-BD")}</strong></div></div>
                          <div className="info-box"><span className="box-icon">🛡️</span><div className="box-text"><span className="box-label">FRAUD REPORTS</span><strong className="box-value">{selectedOrder.fraud_total_reports ?? 0}</strong></div></div>
                        </div>
                      </div>
                      <div className="order-info-block"><span>📞 Phone</span><strong>{selectedOrder.phone}</strong></div>
                      <div className="order-info-block"><span>📍 Address</span><strong>{selectedOrder.address}, {selectedOrder.upazila}, {selectedOrder.district}</strong></div>
                      <div className="order-info-block"><span>🚚 Delivery</span><strong>{selectedOrder.delivery_type === "insideDhaka" ? "Inside Dhaka" : "Outside Dhaka"}</strong></div>
                      {selectedOrder.steadfast_tracking_code && (<div className="order-info-block" style={{ background: "#eef8f3", borderColor: "#c1e8d1" }}><span style={{ color: "#1f6a42" }}>📦 Steadfast Tracking</span><strong style={{ color: "#1f6a42" }}>{selectedOrder.steadfast_tracking_code}</strong></div>)}
                      <div className="order-items">
                        <div className="order-section-title">🛍️ Ordered Products ({getOrderPieceCount(selectedOrder)} পিস)</div>
                        {getOrderItems(selectedOrder).map((item: any, index: number) => {
                          const imageUrl = getItemImage(item);
                          const quantity = Number(item.quantity ?? 1);
                          const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
                          const lineTotal = Number(item.totalPrice ?? item.total_price ?? (unitPrice * quantity));
                          return (
                            <div className="order-product-card" key={`${selectedOrder.id}-${index}`}>
                              <button
                                type="button"
                                className="order-product-image"
                                disabled={!imageUrl}
                                onClick={() => imageUrl && setPreviewImage({ url: imageUrl, title: getItemName(item) })}
                                aria-label={`${getItemName(item)} ছবি বড় করে দেখুন`}
                                title={imageUrl ? "ছবি বড় করে দেখুন" : "ছবি নেই"}
                              >
                                {imageUrl ? <img src={imageUrl} alt={getItemName(item)} loading="lazy" /> : <span>🧵</span>}
                              </button>
                              <div className="order-product-info">
                                <strong>{getItemName(item)}</strong>
                                <span>Code: {item.productCode || item.code || item.product_code || "—"}</span>
                                <span>Qty: {quantity} {item.blouseOption === "withBlouse" ? "· Blouse সহ" : item.blouseOption === "withoutBlouse" ? "· Blouse ছাড়া" : ""}</span>
                              </div>
                              <div className="order-product-price">
                                {lineTotal > 0 && <strong>৳ {lineTotal.toLocaleString("en-BD")}</strong>}
                                {unitPrice > 0 && <small>৳ {unitPrice.toLocaleString("en-BD")} / পিস</small>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="order-price-summary">
                        <div><span>Product Subtotal</span><strong>৳ {Number(selectedOrder.subtotal ?? 0).toLocaleString("en-BD")}</strong></div>
                        <div><span>Delivery Charge</span><strong>৳ {Number(selectedOrder.delivery_charge ?? 0).toLocaleString("en-BD")}</strong></div>
                        <div className="order-grand-total"><span>Total</span><strong>৳ {Number(selectedOrder.total ?? 0).toLocaleString("en-BD")}</strong></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="details-empty"><div className="details-empty-icon">👈</div><h3>Select an Order</h3><p>বাম দিকের লিস্ট থেকে যেকোনো অর্ডারে ক্লিক করুন।</p></div>
            )}
          </aside>
        </div>
      </main>

      {previewImage && (
        <div
          className="image-preview-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Product image preview"
          onClick={() => setPreviewImage(null)}
        >
          <div className="image-preview-dialog" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="image-preview-close" onClick={() => setPreviewImage(null)} aria-label="Close image preview">×</button>
            <img src={previewImage.url} alt={previewImage.title} />
            <div className="image-preview-caption">{previewImage.title}</div>
          </div>
        </div>
      )}

      {/* ============================================
          ✨ MANUAL ORDER MODAL
      ============================================ */}
      {isManualModalOpen && (
        <div className="modal-overlay">
          <div className="manual-modal">
            <div className="modal-header">
              <h2>🛒 Create Manual Order</h2>
              <button className="close-modal" onClick={() => setIsManualModalOpen(false)}>×</button>
            </div>
            
            <div className="modal-body">
              {/* কাস্টমার ইনফো */}
              <div className="form-section">
                <h3>Customer Info</h3>
                <div className="input-grid">
                  <input type="text" placeholder="Customer Name *" value={manualForm.name} onChange={e => setManualForm({...manualForm, name: e.target.value})} />
                  <input type="text" placeholder="Phone Number *" value={manualForm.phone} onChange={e => setManualForm({...manualForm, phone: e.target.value})} />
                  <select value={manualForm.district} onChange={e => setManualForm({...manualForm, district: e.target.value})}>
                    <option value="">Select District *</option>
                    {districts.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <input type="text" placeholder="Upazila" value={manualForm.upazila} onChange={e => setManualForm({...manualForm, upazila: e.target.value})} />
                  <textarea placeholder="Full Address *" value={manualForm.address} onChange={e => setManualForm({...manualForm, address: e.target.value})} rows={2} className="full-width" />
                  <textarea placeholder="Note (Optional)" value={manualForm.note} onChange={e => setManualForm({...manualForm, note: e.target.value})} rows={1} className="full-width" />
                </div>
              </div>

              {/* প্রোডাক্ট সার্চ */}
              <div className="form-section">
                <h3>Add Products</h3>
                <div className="product-search-box">
                  <input type="text" placeholder="Enter Product Code (e.g. SC-A1B2C3)" value={searchCode} onChange={e => setSearchCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleProductSearch()} />
                  <button onClick={handleProductSearch} disabled={isSearching}>{isSearching ? "..." : "Search"}</button>
                </div>

                {/* সার্চ রেজাল্ট */}
                {searchedProduct && (
                  <div className="searched-product-card">
                    <div className="product-info">
                      <img src={searchedProduct.images?.[searchedProduct.thumbnail_index ?? 0] || searchedProduct.images?.[0]} alt={searchedProduct.name} className="search-thumb" />
                      <div>
                        <h4>{searchedProduct.name}</h4>
                        <p>Code: {searchedProduct.product_code}</p>
                        <p>Stock: {searchedProduct.stock_quantity} | Type: {searchedProduct.price_type}</p>
                        {searchedProduct.is_free_delivery && <span style={{ color: "green", fontSize: "11px", fontWeight: "bold" }}>🚚 Free Delivery</span>}
                      </div>
                    </div>
                    <div className="add-controls">
                      <div className="input-row">
                        <label>Qty:</label>
                        <input type="number" id="manualQty" defaultValue={1} min={1} max={searchedProduct.stock_quantity} />
                      </div>
                      {searchedProduct.price_type === "blouse" && (
                        <div className="input-row">
                          <label>Type:</label>
                          <select id="manualBlouse">
                            <option value="withoutBlouse">Without Blouse</option>
                            <option value="withBlouse">With Blouse</option>
                          </select>
                        </div>
                      )}
                      <button className="add-btn" onClick={() => {
                        const qty = Number((document.getElementById("manualQty") as HTMLInputElement).value);
                        const blouse = (document.getElementById("manualBlouse") as HTMLSelectElement)?.value || "withoutBlouse";
                        addToManualCart(searchedProduct, qty, blouse);
                      }}>＋ Add</button>
                    </div>
                  </div>
                )}
              </div>

              {/* সিলেক্ট করা লিস্ট */}
              <div className="selected-items-list">
                <h3>Selected Items ({manualCart.length})</h3>
                {manualCart.length === 0 ? (
                  <p className="empty-text">কোনো প্রোডাক্ট সিলেক্ট করা হয়নি।</p>
                ) : (
                  manualCart.map((item, idx) => (
                    <div className="selected-item" key={idx}>
                      <span>{item.name} (x{item.quantity}) - {item.blouseOption} {item.isFreeDelivery && "🚚"}</span>
                      <button onClick={() => removeFromManualCart(idx)}>×</button>
                    </div>
                  ))
                )}
              </div>

              {/* হিসাব */}
              <div className="order-summary-box">
                <div><span>Subtotal</span><strong>৳ {manualSubtotal}</strong></div>
                <div><span>Delivery Charge</span><strong>{hasFreeDelivery ? "FREE 🎉" : `৳ ${manualDeliveryCharge}`}</strong></div>
                <div className="grand-total"><span>Total</span><strong>৳ {manualGrandTotal}</strong></div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setIsManualModalOpen(false)}>Cancel</button>
              <button className="proceed-btn" onClick={handleManualSubmit} disabled={isPlacingOrder || manualCart.length === 0}>
                {isPlacingOrder ? "Placing Order..." : "Place Order →"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        * { box-sizing: border-box; }

        .admin-page { min-height: 100vh; display: flex; background: radial-gradient(circle at top left, #fdf4f8 0%, #f8f5f7 40%, #f4f1f5 100%); color: #29232a; font-family: "Inter", sans-serif; -webkit-font-smoothing: antialiased; }
        .sidebar { width: 230px; min-height: 100vh; background: linear-gradient(180deg, #251c22 0%, #1a1318 55%, #150f14 100%); color: white; padding: 22px 15px; position: fixed; left: 0; top: 0; bottom: 0; display: flex; flex-direction: column; z-index: 10; }
        .brand { display: flex; align-items: center; gap: 11px; padding: 0 6px 22px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
        .logo { width: 43px; height: 43px; border-radius: 13px; background: linear-gradient(135deg, #d66f99, #b14f79); display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 800; }
        .brand-name { font-size: 13px; font-weight: 800; margin-bottom: 3px; }
        .brand-subtitle { font-size: 10px; color: #b7aab3; }
        .menu-title { font-size: 9px; letter-spacing: 1.5px; color: #887983; font-weight: 800; margin: 24px 8px 12px; }
        .menu { display: flex; flex-direction: column; gap: 5px; }
        .menu-item { height: 43px; padding: 0 13px; border-radius: 11px; display: flex; align-items: center; gap: 12px; color: #c7bcc4; text-decoration: none; font-size: 12px; font-weight: 700; transition: 0.25s; }
        .menu-item:hover { background: rgba(255, 255, 255, 0.06); color: white; }
        .menu-item.active { color: white; background: linear-gradient(90deg, rgba(177, 79, 121, 0.34), rgba(177, 79, 121, 0.15)); box-shadow: inset 3px 0 0 #d56e98; }
        .menu-icon { width: 18px; text-align: center; font-size: 15px; }
        .sidebar-bottom { margin-top: auto; padding-top: 20px; }
        .view-store { height: 42px; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; display: flex; align-items: center; justify-content: center; gap: 9px; color: #d7cdd4; text-decoration: none; font-size: 11px; font-weight: 700; }
        .main-content { margin-left: 230px; width: calc(100% - 230px); padding: 32px 27px 50px; min-height: 100vh; }
        .top-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 25px; }
        .eyebrow { color: #b14f79; font-size: 9px; letter-spacing: 1.7px; font-weight: 900; margin-bottom: 6px; }
        h1 { margin: 0; font-size: 29px; font-weight: 900; }
        
        .manual-order-btn { background: #a9416e; color: white; border: none; padding: 12px 20px; border-radius: 10px; font-weight: 800; font-size: 13px; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 12px rgba(169, 65, 110, 0.3); }
        .manual-order-btn:hover { background: #8f345b; transform: translateY(-2px); }

        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 18px; }
        .stat-card { background: white; border: 1px solid #eee7eb; border-radius: 15px; padding: 17px; display: flex; align-items: center; gap: 13px; box-shadow: 0 5px 18px rgba(45, 25, 38, 0.035); }
        .stat-icon { width: 43px; height: 43px; border-radius: 12px; background: #f8eaf0; display: flex; align-items: center; justify-content: center; font-size: 19px; }
        .stat-icon.pending { background: #fff5df; } .stat-icon.processing { background: #edf2ff; } .stat-icon.delivered { background: #eaf8ef; }
        .stat-label { font-size: 8px; letter-spacing: 1px; color: #9b8d95; font-weight: 900; margin-bottom: 5px; }
        .stat-value { font-size: 20px; font-weight: 900; }

        .search-card { background: white; border: 1px solid #eee7eb; border-radius: 17px; padding: 14px; margin-bottom: 18px; }
        .search-box { height: 44px; border: 1px solid #eadfe5; border-radius: 11px; display: flex; align-items: center; gap: 10px; padding: 0 14px; color: #ad9da7; }
        .search-box span { font-size: 20px; }
        .search-box input { border: 0; outline: 0; width: 100%; font-size: 12.5px; background: transparent; }
        .clear-search { width: 24px; height: 24px; border: 0; border-radius: 50%; background: #fbe9ed; color: #a94f6f; font-size: 16px; cursor: pointer; }

        .split-layout { display: grid; grid-template-columns: 1fr 450px; gap: 20px; align-items: flex-start; }
        .management-card { background: white; border: 1px solid #eee7eb; border-radius: 19px; overflow: hidden; }
        .card-header { padding: 16px 20px; border-bottom: 1px solid #eee7eb; display: flex; justify-content: space-between; background: linear-gradient(135deg, #fff, #fdfafb); }
        .section-label { font-size: 8px; letter-spacing: 1.5px; color: #b14f79; font-weight: 900; margin-bottom: 5px; }
        .card-header h2 { margin: 0; font-size: 17px; }
        .order-count { font-size: 11px; color: #a4446d; font-weight: 700; padding: 6px 12px; border-radius: 20px; background: #f8eaf0; }
        
        .orders-list { display: grid; gap: 8px; padding: 14px; }
        .order-card { border: 1px solid #eee2e8; border-radius: 12px; background: white; cursor: pointer; transition: 0.2s; }
        .order-card:hover { border-color: #d9b8c8; background: #fdfafb; }
        .order-card.active { border-color: #a9416e; box-shadow: 0 4px 12px rgba(169, 65, 110, 0.15); transform: translateX(4px); }
        .order-summary-row { display: flex; align-items: center; justify-content: space-between; padding: 9px 12px; }
        .order-summary-info .order-number { display: block; margin-bottom: 2px; font-size: 11px; color: #a04f72; font-weight: 800; }
        .order-summary-info > strong { display: block; color: #392f35; font-size: 13px; font-weight: 900; }
        .fraud-mini-text { display: block; font-size: 10px; color: #888; margin-top: 4px; font-weight: 600; }
        .order-summary-right { display: flex; align-items: center; gap: 10px; }
        .order-summary-total { color: #a04f72; font-size: 14px; font-weight: 900; }
        .order-packing-entry-btn { min-width: 68px; border: 1px solid #e6c3d2; background: #fff4f8; color: #a3426a; border-radius: 8px; padding: 7px 10px; font-size: 10px; font-weight: 900; cursor: pointer; white-space: nowrap; }
        .order-packing-entry-btn:hover { background: #fce6ef; }
        .order-packing-entry-btn.is-done { border-color: #bfe5d4; background: #eaf8f1; color: #16865f; }
        .order-packing-entry-btn:disabled { opacity: .55; cursor: wait; }
        .packing-excluded-label { color: #a09299; font-size: 8px; font-weight: 800; white-space: nowrap; }
        .order-expand-icon { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 6px; background: #f8edf2; color: #a04f72; font-size: 14px; font-weight: 900; }

        .order-details-pane { position: sticky; top: 24px; min-height: 500px; max-height: calc(100vh - 40px); display: flex; flex-direction: column; }
        .details-empty { background: white; border: 1px dashed #d9b8c8; border-radius: 19px; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #9b8d95; }
        .details-empty-icon { font-size: 40px; margin-bottom: 15px; opacity: 0.5; }
        .details-empty h3 { margin: 0 0 8px; color: #392f35; }
        .details-empty p { margin: 0; font-size: 12px; }
        .details-card { background: white; border: 1px solid #eee2e8; border-radius: 19px; height: 100%; display: flex; flex-direction: column; overflow: hidden; }
        .details-header { padding: 20px; border-bottom: 1px solid #f0e7eb; background: #fdfafb; display: flex; align-items: flex-start; justify-content: space-between; }
        .details-order-num { font-size: 11px; color: #a04f72; font-weight: 800; display: block; margin-bottom: 4px; }
        .details-header h2 { margin: 0; font-size: 18px; color: #2b1f26; }
        .edit-details, .close-details { width: 28px; height: 28px; border: 0; border-radius: 8px; background: #f1e5ea; color: #a04f72; font-size: 14px; cursor: pointer; }
        .details-content { padding: 20px; overflow-y: auto; flex: 1; }
        
        .fraud-panel { background: #fff; border: 1px solid #e9ecef; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
        .fraud-header { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .fraud-header span { font-size: 11px; font-weight: 900; color: #495057; text-transform: uppercase; }
        .refresh-fraud-btn { padding: 4px 10px; border-radius: 6px; border: 1px solid #ced4da; background: #fff; font-size: 10px; cursor: pointer; }
        .fraud-main-content { display: flex; align-items: center; gap: 30px; margin-bottom: 25px; }
        .donut-container { width: 120px; height: 120px; }
        .donut-chart { width: 100%; height: 100%; border-radius: 50%; background: conic-gradient(#2eaa8f 0% var(--delivered), #f45b69 var(--delivered) 100%); display: flex; align-items: center; justify-content: center; }
        .donut-inner { width: 80px; height: 80px; background: white; border-radius: 50%; }
        .fraud-legend-container { display: flex; flex-direction: column; gap: 10px; }
        .fraud-legend { display: flex; gap: 15px; align-items: center; }
        .legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #6c757d; }
        .dot { width: 12px; height: 12px; border-radius: 50%; }
        .delivered-dot { background: #2eaa8f; } .cancelled-dot { background: #f45b69; }
        .success-rate { font-size: 13px; color: #6c757d; font-weight: 600; border-top: 1px dashed #ced4da; padding-top: 10px; }
        .success-rate strong { color: #2eaa8f; }
        .fraud-bottom-boxes { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .info-box { display: flex; align-items: center; gap: 10px; padding: 12px; border: 1px solid #e9ecef; border-radius: 8px; background: #f8f9fa; }
        .box-icon { font-size: 18px; }
        .box-label { font-size: 9px; font-weight: 800; color: #6c757d; }
        .box-value { font-size: 18px; font-weight: 900; }
        
        .status-badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 6px; font-size: 9px; font-weight: 900; margin-bottom: 15px; }
        .status-badge.blocked { background: #2d2d2d; color: #ffcccc; } .status-badge.review { background: #fff3cd; color: #856404; }
        .status-badge.pending { background: #ffe5c7; color: #a05a00; } .status-badge.delivered { background: #d4edda; color: #155724; }
        .status-badge.cancelled { background: #f8d7da; color: #721c24; } .status-badge.partial { background: #fff0dc; color: #9c5b00; } .status-badge.error { background: #f8d7da; color: #721c24; }
        .status-badge.default { background: #f1edf0; color: #756570; }
        
        .order-grid { display: grid; gap: 12px; }
        .order-info-block { padding: 12px; border-radius: 10px; background: #fdfafb; border: 1px solid #f0e7eb; }
        .order-info-block span { display: block; color: #8f8088; font-size: 10px; font-weight: 700; margin-bottom: 3px; }
        .order-info-block strong { color: #4b3b43; font-size: 13px; font-weight: 800; }
        .order-items { padding: 12px; border-radius: 10px; background: #fdfafb; border: 1px solid #f0e7eb; }
        .order-section-title { font-size: 11px; font-weight: 900; color: #a04f72; margin-bottom: 8px; }
        .order-item { padding: 8px 0; border-bottom: 1px dashed #f0e7eb; font-size: 12px; display: flex; justify-content: space-between; }
        .order-price-summary { padding: 14px; border-radius: 10px; background: #fdfafb; border: 1px solid #f0e7eb; display: grid; gap: 8px; }
        .order-price-summary div { display: flex; justify-content: space-between; font-size: 12px; color: #555; }
        .order-grand-total { margin-top: 5px; padding-top: 11px; border-top: 1px dashed #eadfe4; font-size: 17px !important; font-weight: 900; color: #a04f72 !important; }
        
        .edit-form { display: flex; flex-direction: column; gap: 12px; margin-top: 10px; }
        .edit-field label { display: block; font-size: 11px; font-weight: 800; color: #8f8088; margin-bottom: 4px; }
        .edit-field input, .edit-field textarea { width: 100%; border: 1px solid #eadfe5; border-radius: 8px; padding: 10px; font-size: 13px; outline: none; }
        .edit-actions { display: flex; gap: 10px; margin-top: 10px; }
        .btn-cancel { flex: 1; padding: 10px; border-radius: 8px; border: 1px solid #ddd; background: white; cursor: pointer; font-weight: 700; }
        .btn-save { flex: 1; padding: 10px; border-radius: 8px; border: 0; background: #a9416e; color: white; cursor: pointer; font-weight: 700; }

        /* ✨ নতুন ম্যানুয়াল মডাল স্টাইল */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .manual-modal { background: white; width: 100%; max-width: 600px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); display: flex; flex-direction: column; overflow: hidden; animation: modalFade 0.3s ease-out; max-height: 90vh; }
        @keyframes modalFade { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .modal-header { padding: 18px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; background: #fdfafb; }
        .modal-header h2 { margin: 0; font-size: 18px; color: #2b1f26; }
        .close-modal { background: #f1e5ea; border: none; width: 30px; height: 30px; border-radius: 8px; font-size: 20px; cursor: pointer; color: #a9416e; }
        .modal-body { padding: 20px; overflow-y: auto; flex: 1; }
        
        .form-section { margin-bottom: 20px; background: #fdfafb; padding: 16px; border-radius: 12px; border: 1px solid #f0e7eb; }
        .form-section h3 { margin: 0 0 12px; font-size: 14px; color: #4b3b43; border-bottom: 1px solid #eadfe5; padding-bottom: 8px; }
        .input-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .input-grid input, .input-grid select, .input-grid textarea { width: 100%; padding: 10px; border: 1px solid #eadfe5; border-radius: 8px; font-size: 13px; outline: none; }
        .full-width { grid-column: 1 / -1; }

        .product-search-box { display: flex; gap: 10px; margin-bottom: 12px; }
        .product-search-box input { flex: 1; padding: 12px; border: 1px solid #eadfe5; border-radius: 8px; outline: none; font-size: 14px; }
        .product-search-box button { padding: 0 20px; background: #a9416e; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }

        .searched-product-card { background: #fff; border: 1px solid #c1e8d1; border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 12px; }
        .product-info { display: flex; gap: 12px; align-items: center; }
        .search-thumb { width: 50px; height: 50px; border-radius: 8px; object-fit: cover; }
        .product-info h4 { margin: 0 0 4px; font-size: 14px; }
        .product-info p { margin: 0; font-size: 11px; color: #666; }
        
        .add-controls { display: flex; align-items: center; gap: 12px; border-top: 1px dashed #ccc; padding-top: 12px; flex-wrap: wrap; }
        .input-row { display: flex; align-items: center; gap: 6px; }
        .input-row label { font-size: 12px; font-weight: 700; color: #555; }
        .input-row input, .input-row select { padding: 6px; border: 1px solid #ccc; border-radius: 6px; font-size: 12px; outline: none; }
        .add-btn { margin-left: auto; background: #1f6a42; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; }

        .selected-items-list h3 { font-size: 14px; margin-bottom: 10px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 8px; }
        .empty-text { font-size: 12px; color: #999; text-align: center; }
        .selected-item { display: flex; justify-content: space-between; align-items: center; background: #fff; border: 1px solid #eee; padding: 10px; border-radius: 8px; margin-bottom: 8px; font-size: 13px; }
        .selected-item button { background: none; border: none; color: #d32f2f; font-size: 18px; cursor: pointer; }

        .order-summary-box { background: #fff; padding: 16px; border-radius: 12px; border: 1px solid #eadfe5; }
        .order-summary-box div { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #555; }
        .order-summary-box .grand-total { margin-top: 12px; padding-top: 12px; border-top: 1px dashed #ccc; font-size: 18px; font-weight: 900; color: #a9416e; margin-bottom: 0; }

        .modal-footer { padding: 15px 20px; border-top: 1px solid #eee; display: flex; justify-content: flex-end; gap: 10px; background: #fdfafb; }
        .cancel-btn { padding: 10px 16px; border-radius: 8px; border: 1px solid #ccc; background: white; cursor: pointer; font-weight: 700; }
        .proceed-btn { padding: 10px 20px; border-radius: 8px; border: none; background: #a9416e; color: white; cursor: pointer; font-weight: 700; }
        .proceed-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        @media (max-width: 1200px) { .split-layout { grid-template-columns: 1fr 400px; } }
        @media (max-width: 1000px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } .split-layout { grid-template-columns: 1fr; } .order-details-pane { position: static; max-height: none; } }
        @media (max-width: 760px) { 
          .sidebar { width: 72px; padding: 18px 9px; } 
          .brand { justify-content: center; } 
          .brand > div:last-child, .menu-title, .menu-item span:last-child, .view-store { display: none; } 
          .menu-item { justify-content: center; padding: 0; } 
          .main-content { margin-left: 72px; width: calc(100% - 72px); } 
          .top-header { flex-direction: column; align-items: flex-start; gap: 10px; } 
        }
        @media (max-width: 500px) { 
          .stats-grid { grid-template-columns: 1fr; } 
          .order-summary-row { flex-direction: column; align-items: flex-start; gap: 10px; } 
          .order-summary-right { width: 100%; justify-content: space-between; } 
          .fraud-main-content { flex-direction: column; } 
          .fraud-bottom-boxes { grid-template-columns: 1fr; } 
          .search-input-group { flex-direction: column; } 
          .add-controls { flex-direction: column; align-items: flex-start; } 
          .add-btn { margin-left: 0; width: 100%; }
          .input-grid { grid-template-columns: 1fr; }
        }

        /* Order filters, product thumbnails, customer history and delete controls */
        .filter-toolbar { display: grid; grid-template-columns: minmax(220px, 1fr) 155px 145px 145px; gap: 10px; align-items: center; }
        .filter-select, .custom-date-row input { height: 44px; min-width: 0; border: 1px solid #eadfe5; border-radius: 11px; background: #fff; color: #4b3b43; padding: 0 12px; outline: none; font-size: 12px; font-weight: 700; }
        .filter-select:focus, .custom-date-row input:focus { border-color: #b14f79; box-shadow: 0 0 0 3px rgba(177,79,121,.09); }
        .custom-date-row { display: flex; flex-wrap: wrap; align-items: end; gap: 12px; margin-top: 12px; padding-top: 12px; border-top: 1px dashed #eadfe5; }
        .custom-date-row label { display: grid; gap: 5px; color: #8f8088; font-size: 10px; font-weight: 800; }
        .custom-date-row input { height: 36px; }
        .reset-filter-btn { height: 36px; padding: 0 13px; border: 1px solid #eadfe5; border-radius: 8px; background: #fff; color: #a04f72; font-size: 11px; font-weight: 800; cursor: pointer; }
        .filter-result-line { margin-top: 10px; color: #9b8d95; font-size: 10px; }
        .filter-result-line strong { color: #a04f72; }
        .order-card-date { display: block; margin-top: 5px; color: #92838c; font-size: 10px; font-weight: 600; }
        .order-card-consignment { display: flex; align-items: center; flex-wrap: wrap; gap: 5px 9px; margin-top: 8px; padding: 8px 10px; width: fit-content; max-width: 100%; border: 1px solid #cce8dc; border-radius: 9px; background: #f1faf5; }
        .order-card-consignment span { width: 100%; color: #668879; font-size: 8px; letter-spacing: .8px; font-weight: 900; }
        .order-card-consignment strong { color: #137451; font-size: 16px; line-height: 1.2; font-weight: 900; overflow-wrap: anywhere; }
        .order-card-consignment button { border: 1px solid #c5e4d5; border-radius: 6px; background: #fff; color: #19744f; padding: 4px 7px; font-size: 9px; font-weight: 800; cursor: pointer; }
        .order-card-not-booked { display: inline-block; margin-top: 7px; color: #9b8d95; font-size: 9px; font-weight: 700; }
        .order-mini-products { display: flex; align-items: center; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
        .mini-product { width: 38px; height: 38px; position: relative; display: block; padding: 0; border: 1px solid #eee2e8; border-radius: 8px; background: #faf6f8; overflow: hidden; cursor: zoom-in; }
        .mini-product:disabled { cursor: default; }
        .mini-product img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .mini-product-placeholder { display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; font-size: 17px; }
        .mini-product-qty { position: absolute; right: 2px; bottom: 2px; background: #a9416e; color: #fff; border-radius: 5px; padding: 1px 3px; font-size: 8px; font-weight: 900; }
        .more-products { color: #a04f72; background: #f8eaf0; border-radius: 7px; padding: 5px 7px; font-size: 10px; font-weight: 900; }
        .piece-count { color: #786a72; font-size: 10px; font-weight: 800; margin-left: 3px; }
        .order-card-status { display: flex; justify-content: flex-end; }
        .delete-order-btn, .delete-details { width: 28px; height: 28px; border: 1px solid #f1d4db; border-radius: 8px; background: #fff4f5; color: #c23e5b; font-size: 13px; cursor: pointer; }
        .delete-order-btn:hover, .delete-details:hover { background: #ffe3e8; }
        .delete-order-btn:disabled, .delete-details:disabled { opacity: .5; cursor: wait; }
        .order-date-banner { display: grid; gap: 6px; padding: 17px; border: 1px solid #ead5df; border-radius: 13px; background: linear-gradient(135deg, #fff7fa, #fff); }
        .order-date-banner span { color: #a04f72; font-size: 9px; letter-spacing: 1.1px; font-weight: 900; }
        .order-date-banner strong { color: #382832; font-size: 18px; line-height: 1.35; }
        .order-date-banner small { color: #92838c; font-size: 10px; font-weight: 700; overflow-wrap: anywhere; }
        .order-history-panel { border: 1px solid #eee2e8; border-radius: 12px; padding: 13px; background: #fff; }
        .order-history-heading { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 9px; }
        .order-history-heading > div { display: grid; gap: 4px; }
        .order-history-heading span { color: #a04f72; font-size: 8px; letter-spacing: 1px; font-weight: 900; }
        .order-history-heading strong { color: #392f35; font-size: 12px; }
        .order-history-heading > b { flex-shrink: 0; padding: 5px 8px; border-radius: 20px; background: #f8eaf0; color: #a04f72; font-size: 9px; }
        .order-history-list { display: grid; gap: 6px; }
        .history-order-row { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 10px; text-align: left; border: 1px solid #f0e7eb; border-radius: 8px; background: #fdfafb; padding: 9px; cursor: pointer; }
        .history-order-row.current { border-color: #bd7292; background: #fff6fa; }
        .history-order-main, .history-order-side { display: grid; gap: 4px; }
        .history-order-main strong { color: #a04f72; font-size: 10px; overflow-wrap: anywhere; }
        .history-order-main small { color: #91838b; font-size: 9px; }
        .history-order-side { justify-items: end; }
        .history-order-side .status-badge { margin: 0; padding: 3px 6px; font-size: 8px; }
        .history-order-side > strong { color: #4b3b43; font-size: 10px; }
        .history-empty { color: #9b8d95; font-size: 11px; margin: 8px 0 2px; }
        .order-product-card { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px dashed #f0e7eb; }
        .order-product-card:last-child { border-bottom: 0; }
        .order-product-image { width: 58px; height: 68px; flex: 0 0 58px; padding: 0; border: 1px solid #eee2e8; border-radius: 8px; overflow: hidden; background: #f9f3f6; display: flex; align-items: center; justify-content: center; font-size: 21px; cursor: zoom-in; }
        .order-product-image:disabled { cursor: default; }
        .order-product-image img { width: 100%; height: 100%; object-fit: cover; }
        .image-preview-backdrop { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 24px; background: rgba(22, 13, 19, .78); backdrop-filter: blur(4px); }
        .image-preview-dialog { position: relative; display: grid; justify-items: center; gap: 10px; max-width: min(92vw, 760px); max-height: 92vh; padding: 14px; border: 1px solid rgba(255,255,255,.25); border-radius: 16px; background: #fff; box-shadow: 0 24px 80px rgba(0,0,0,.28); }
        .image-preview-dialog img { display: block; max-width: min(86vw, 720px); max-height: 78vh; width: auto; height: auto; object-fit: contain; border-radius: 9px; }
        .image-preview-caption { max-width: 100%; color: #51414a; font-size: 12px; font-weight: 800; text-align: center; overflow-wrap: anywhere; }
        .image-preview-close { position: absolute; top: 7px; right: 7px; z-index: 1; width: 32px; height: 32px; border: 0; border-radius: 50%; background: #251c22; color: #fff; font-size: 22px; line-height: 1; cursor: pointer; }
        .order-product-info { flex: 1; min-width: 0; display: grid; gap: 4px; }
        .order-product-info strong { color: #392f35; font-size: 11px; line-height: 1.4; }
        .order-product-info span { color: #8f8088; font-size: 9px; overflow-wrap: anywhere; }
        .order-product-price { flex: 0 0 auto; display: grid; gap: 4px; text-align: right; }
        .order-product-price strong { color: #a04f72; font-size: 11px; }
        .order-product-price small { color: #9b8d95; font-size: 8px; }
        .details-header { align-items: center; }
        .details-header > div:last-child { flex-shrink: 0; }
        @media (max-width: 1050px) { .filter-toolbar { grid-template-columns: 1fr 1fr; } .filter-toolbar .search-box { grid-column: 1 / -1; } }
        @media (max-width: 760px) { .filter-toolbar { grid-template-columns: 1fr; } .filter-toolbar .search-box { grid-column: auto; } .order-summary-row { align-items: stretch; } .order-summary-right { align-items: center; } .order-date-banner strong { font-size: 15px; } }
        @media (max-width: 500px) { .history-order-row { align-items: flex-start; } .order-product-card { gap: 7px; } .order-product-image { width: 48px; height: 58px; flex-basis: 48px; } .order-product-info strong { font-size: 10px; } .order-product-price strong { font-size: 10px; } .custom-date-row { display: grid; grid-template-columns: 1fr 1fr; } .reset-filter-btn { grid-column: 1 / -1; } }

        .orders-load-error { display: grid; gap: 5px; margin-bottom: 14px; padding: 13px 16px; border: 1px solid #f1c7cc; border-radius: 12px; background: #fff5f5; color: #8e2935; font-size: 12px; }
        .orders-load-error small { color: #96666c; font-size: 10px; }
        .courier-summary-card { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 18px; padding: 16px 19px; border: 1px solid #eadfe5; border-radius: 15px; background: linear-gradient(105deg, #fff, #fff8fb); box-shadow: 0 4px 15px rgba(45,25,38,.03); }
        .courier-summary-copy { display: grid; gap: 5px; }
        .courier-summary-label { color: #a9416e; font-size: 8px; font-weight: 900; letter-spacing: 1.4px; }
        .courier-summary-copy strong { color: #382832; font-size: 13px; }
        .courier-summary-copy small { color: #9b8d95; font-size: 10px; }
        .courier-summary-value { display: flex; align-items: center; gap: 14px; }
        .courier-summary-value > strong { color: #248b70; font-size: 20px; font-weight: 900; white-space: nowrap; }
        .courier-order-panel { display: grid; gap: 12px; padding: 14px; border: 1px solid #e9d9e1; border-radius: 13px; background: #fff; }
        .courier-order-heading { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
        .courier-order-heading > div { display: grid; gap: 4px; }
        .courier-order-heading span { color: #a9416e; font-size: 8px; font-weight: 900; letter-spacing: 1px; }
        .courier-order-heading strong { color: #382832; font-size: 12px; }
        .courier-order-heading .status-badge { margin: 0; }
        .courier-id-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .courier-id-grid > div { min-width: 0; display: grid; gap: 5px; padding: 9px; border: 1px solid #f0e7eb; border-radius: 9px; background: #fdfafb; }
        .courier-id-grid small { color: #95858e; font-size: 9px; font-weight: 700; }
        .courier-id-grid strong { overflow-wrap: anywhere; color: #483640; font-size: 10px; }
        .courier-id-grid button { justify-self: start; padding: 3px 8px; border: 1px solid #ead5df; border-radius: 6px; background: #fff; color: #a04f72; font-size: 9px; font-weight: 800; cursor: pointer; }
        .courier-actions { display: flex; flex-wrap: wrap; gap: 7px; }
        .courier-primary-link, .courier-action-btn, .courier-book-btn, .return-request-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 34px; padding: 7px 10px; border-radius: 8px; font-size: 10px; font-weight: 800; text-decoration: none; cursor: pointer; }
        .courier-primary-link, .courier-book-btn { border: 1px solid #a9416e; background: #a9416e; color: #fff; }
        .courier-action-btn { border: 1px solid #ead5df; background: #fff; color: #8d3b61; }
        .courier-action-btn:disabled, .courier-book-btn:disabled, .return-request-btn:disabled { opacity: .55; cursor: wait; }
        .courier-inline-error { margin: 0; color: #b13d4b; font-size: 10px; }
        .tracking-timeline { display: grid; gap: 9px; padding: 11px; border-radius: 9px; background: #f9f6f8; }
        .tracking-timeline > strong { color: #4b3b43; font-size: 10px; }
        .tracking-event { position: relative; display: flex; align-items: flex-start; gap: 9px; min-height: 33px; }
        .tracking-event-dot { width: 8px; height: 8px; flex: 0 0 8px; margin-top: 4px; border-radius: 50%; background: #b14f79; box-shadow: 0 0 0 3px #f2dfe8; }
        .tracking-event > div { display: grid; gap: 3px; }
        .tracking-event strong { color: #4b3b43; font-size: 10px; }
        .tracking-event small { color: #988a92; font-size: 9px; }
        .return-request-box { display: grid; gap: 7px; padding-top: 10px; border-top: 1px dashed #eadfe5; }
        .return-request-box label { color: #70435a; font-size: 10px; font-weight: 900; }
        .return-request-box textarea { width: 100%; padding: 9px; border: 1px solid #eadfe5; border-radius: 8px; resize: vertical; font: inherit; font-size: 10px; outline: none; }
        .return-request-btn { justify-self: start; border: 1px solid #d8b0c2; background: #fff6fa; color: #963e68; }
        .return-request-box > small { color: #9b8d95; font-size: 9px; line-height: 1.45; }
        .return-result { display: grid; gap: 4px; padding: 9px; border: 1px solid #b9e5d1; border-radius: 8px; background: #f1fbf5; color: #286c4b; font-size: 10px; }
        @media (max-width: 760px) { .courier-summary-card { align-items: flex-start; flex-direction: column; } .courier-summary-value { width: 100%; justify-content: space-between; } }
        @media (max-width: 430px) { .courier-id-grid { grid-template-columns: 1fr; } }

      `}</style>
    </div>
  );
}