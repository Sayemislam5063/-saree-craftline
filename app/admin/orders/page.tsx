"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase/supabase-client";

/* ---------- helpers (unchanged) ---------- */
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
  if (Number.isNaN(date.getTime())) return "তারিখ পাওয়া যায়নি";
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

const districts = ["ঢাকা", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "বরিশাল", "সিলেট", "রংপুর", "ময়মনসিংহ", "কুমিল্লা", "নারায়ণগঞ্জ", "গাজীপুর", "টাঙ্গাইল", "নরসিংদী", "মুন্সিগঞ্জ", "মানিকগঞ্জ", "কিশোরগঞ্জ", "ফরিদপুর", "গোপালগঞ্জ", "মাদারীপুর", "রাজবাড়ী", "শরীয়তপুর", "কক্সবাজার", "ব্রাহ্মণবাড়িয়া", "চাঁদপুর", "ফেনী", "নোয়াখালী", "লক্ষ্মীপুর", "খাগড়াছড়ি", "রাঙামাটি", "বান্দরবান", "নাটোর", "নওগাঁ", "চাঁপাইনবাবগঞ্জ", "পাবনা", "সিরাজগঞ্জ", "বগুড়া", "জয়পুরহাট", "দিনাজপুর", "ঠাকুরগাঁও", "পঞ্চগড়", "কুড়িগ্রাম", "লালমনিরহাট", "নীলফামারী", "গাইবান্ধা", "যশোর", "সাতক্ষীরা", "বাগেরহাট", "ঝিনাইদহ", "মাগুরা", "নড়াইল", "কুষ্টিয়া", "চুয়াডাঙ্গা", "মেহেরপুর", "ভোলা", "পটুয়াখালী", "পিরোজপুর", "বরগুনা", "ঝালকাঠি", "মৌলভীবাজার", "হবিগঞ্জ", "সুনামগঞ্জ", "জামালপুর", "শেরপুর", "নেত্রকোনা"];

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", phone: "", address: "", upazila: "", district: "" });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefreshingFraud, setIsRefreshingFraud] = useState(false);

  /* ✨ LIGHTBOX (image enlarge) */
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);

  /* Manual Order Modal */
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ name: "", phone: "", district: "", upazila: "", address: "", note: "" });
  const [searchCode, setSearchCode] = useState("");
  const [searchedProduct, setSearchedProduct] = useState<any | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [manualCart, setManualCart] = useState<any[]>([]);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  useEffect(() => {
    const loadOrders = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Orders load error:", error);
        setIsLoading(false);
        return;
      }

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

  /* ✨ Close lightbox with ESC */
  useEffect(() => {
    if (!lightboxImage) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLightboxImage(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxImage]);

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
      if (statusFilter === "cancelled") matchesStatus = status === "cancelled" || status === "canceled";
      else if (statusFilter === "in_review") matchesStatus = status === "in_review";
      else if (statusFilter === "pending") matchesStatus = status === "pending";
      else if (statusFilter === "partial") matchesStatus = status.includes("partial");
      else if (statusFilter === "delivered") matchesStatus = status === "delivered";
      else if (statusFilter === "processing") matchesStatus = status === "processing" || !status;

      if (!matchesStatus) return false;

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
  }, [orders, search, statusFilter, dateFilter, customStartDate, customEndDate]);

  const pendingCount = orders.filter((o) => o.steadfast_delivery_status === "pending").length;
  const processingCount = orders.filter((o) => o.steadfast_delivery_status === "in_review" || o.steadfast_delivery_status === "processing").length;
  const deliveredCount = orders.filter((o) => o.steadfast_delivery_status === "delivered").length;

  const getStatusBadge = (order: any) => {
    if (order.fraud_check_status === "blocked") return <span className="status-badge blocked">🚫 Fraud Blocked</span>;
    if (order.steadfast_delivery_status === "in_review") return <span className="status-badge review">⏳ In Review</span>;
    if (order.steadfast_delivery_status === "pending") return <span className="status-badge pending">📦 Pending</span>;
    if (String(order.steadfast_delivery_status ?? "").toLowerCase().includes("partial")) return <span className="status-badge partial">🟠 Partial Delivered</span>;
    if (order.steadfast_delivery_status === "delivered") return <span className="status-badge delivered">✅ Delivered</span>;
    if (order.steadfast_delivery_status === "cancelled" || order.steadfast_delivery_status === "canceled") return <span className="status-badge cancelled">❌ Cancelled</span>;
    return <span className="status-badge default">⏳ Processing</span>;
  };

  /* ---------- handlers (unchanged) ---------- */
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
      alert("ফ্রড রিপোর্ট সফলভাবে আপডেট হয়েছে!");
    } catch (error: any) {
      alert("আপডেট করতে সমস্যা হয়েছে: " + error.message);
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
    const hasCourierBooking = Boolean(order.steadfast_tracking_code || order.steadfast_consignment_id || order.steadfast_booking_status === "booked");
    const warning = hasCourierBooking
      ? "\n\nসতর্কতা: এই অর্ডার Steadfast-এ বুক করা হয়েছে। এখানে ডিলিট করলে শুধু ওয়েবসাইটের অর্ডার রেকর্ড মুছবে; Steadfast courier booking বাতিল হবে না। আগে Steadfast থেকে parcel cancel করে নাও।"
      : "";
    const confirmed = window.confirm(`তুমি কি নিশ্চিতভাবে এই অর্ডারটি ডিলিট করতে চাও?\nOrder: ${order.order_number || order.id}${warning}\n\nডিলিট করলে এটি Orders list ও database থেকে মুছে যাবে।`);
    if (!confirmed) return;

    setDeletingOrderId(order.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Admin login পাওয়া যায়নি। আবার লগইন করো।");
      const response = await fetch(`/api/orders/${order.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${session.access_token}` } });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "অর্ডার ডিলিট করা যায়নি।");
      setOrders((previous) => previous.filter((item) => item.id !== order.id));
      setSelectedOrder((previous: any) => previous?.id === order.id ? null : previous);
      alert("অর্ডারটি database থেকে সফলভাবে ডিলিট হয়েছে।");
    } catch (error: any) {
      alert("অর্ডার ডিলিট করতে সমস্যা হয়েছে: " + (error?.message || "Unknown error"));
    } finally {
      setDeletingOrderId(null);
    }
  };

  /* ---------- manual order logic (unchanged) ---------- */
  const handleProductSearch = async () => {
    if (!searchCode.trim()) return;
    setIsSearching(true);
    setSearchedProduct(null);
    const term = searchCode.trim();
    try {
      let { data, error } = await supabase.from("products").select("*").or(`product_code.ilike.%${term}%,name.ilike.%${term}%`).limit(1).maybeSingle();
      if (!data && !error) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(term);
        if (isUUID) {
          const { data: idData, error: idError } = await supabase.from("products").select("*").eq("id", term).maybeSingle();
          data = idData;
          error = idError;
        }
      }
      if (error) {
        console.error("Search error:", error);
        alert(`সার্চ করতে সমস্যা হয়েছে: ${error.message}`);
      } else if (!data) {
        alert(`"${term}" দিয়ে কোনো প্রোডাক্ট পাওয়া যায়নি!`);
      } else {
        setSearchedProduct(data);
      }
    } catch (err: any) {
      console.error(err);
      alert("সার্চে একটি অপ্রত্যাশিত সমস্যা হয়েছে।");
    } finally {
      setIsSearching(false);
    }
  };

  const addToManualCart = (product: any, qty: number, blouseOption: string) => {
    if (qty > product.stock_quantity) {
      alert(`স্টকে মাত্র ${product.stock_quantity}টি আছে!`);
      return;
    }
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
          items: manualCart.map(item => ({ productId: item.productId, quantity: item.quantity, blouseOption: item.blouseOption }))
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "অর্ডার প্লেস করা যায়নি।");
      alert(`সফলভাবে অর্ডার প্লেস হয়েছে! অর্ডার নাম্বার: ${result.order_number}`);
      setIsManualModalOpen(false);
      setManualForm({ name: "", phone: "", district: "", upazila: "", address: "", note: "" });
      setManualCart([]);
      const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      setOrders(data ?? []);
    } catch (error: any) {
      alert("অর্ডার প্লেস করতে সমস্যা হয়েছে: " + error.message);
    } finally {
      setIsPlacingOrder(false);
    }
  };

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

        <div className="search-card">
          <div className="filter-toolbar">
            <div className="search-box">
              <span>⌕</span>
              <input type="text" placeholder="Order ID / Order Number / Customer / Phone দিয়ে সার্চ..." value={search} onChange={(event) => setSearch(event.target.value)} />
              {search && <button type="button" className="clear-search" onClick={() => setSearch("")}>×</button>}
            </div>
            <select className="filter-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by order status">
              <option value="all">All Status</option>
              <option value="cancelled">Cancelled</option>
              <option value="in_review">In Review</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial Delivered</option>
              <option value="delivered">Delivered</option>
              <option value="processing">Processing</option>
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
                  return (
                    <div className={`order-card ${selectedOrder?.id === order.id ? "active" : ""}`} key={order.id} onClick={() => { setSelectedOrder(order); setIsEditing(false); }}>
                      <div className="order-summary-row">
                        <div className="order-summary-info">
                          <span className="order-number">{order.order_number || order.id}</span>
                          <strong>{order.customer_name}</strong>
                          <span className="order-card-date">🗓 {formatOrderDate(order.created_at, true)}</span>
                          <div className="order-mini-products">
                            {items.slice(0, 4).map((item: any, index: number) => {
                              const imageUrl = getItemImage(item);
                              return (
                                <div
                                  className="mini-product"
                                  key={`${order.id}-${index}`}
                                  title={`${getItemName(item)} × ${item.quantity ?? 1}`}
                                  onClick={(e) => {
                                    if (!imageUrl) return;
                                    e.stopPropagation();
                                    setLightboxImage({ src: imageUrl, alt: `${getItemName(item)} × ${item.quantity ?? 1}` });
                                  }}
                                >
                                  {imageUrl ? <img src={imageUrl} alt={getItemName(item)} loading="lazy" /> : <span className="mini-product-placeholder">🧵</span>}
                                  <span className="mini-product-qty">×{item.quantity ?? 1}</span>
                                </div>
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
                          {orders.filter((item) => normalizeOrderPhone(item.phone) === normalizeOrderPhone(selectedOrder.phone)).length === 0 && <p className="history-empty">এই নম্বরে আর কোনো অর্ডার পাওয়া যায়নি।</p>}
                        </div>
                      </div>
                      <div className="fraud-panel">
                        <div className="fraud-header"><span>Steadfast Fraud Report</span><button className="refresh-fraud-btn" onClick={handleRefreshFraud} disabled={isRefreshingFraud}>{isRefreshingFraud ? "Wait..." : "🔄 Refresh"}</button></div>
                        <div className="fraud-main-content">
                          <div className="donut-container"><div className="donut-chart" style={{ "--delivered": `${selectedOrder.fraud_delivery_ratio || 0}%` } as React.CSSProperties}><div className="donut-inner"></div></div></div>
                          <div className="fraud-legend-container">
                            <div className="fraud-legend">
                              <div className="legend-item"><span className="dot delivered-dot"></span>Delivered: <strong>{selectedOrder.fraud_delivery_ratio || 0}%</strong></div>
                              <div className="legend-item"><span className="dot cancelled-dot"></span>Cancelled: <strong>{selectedOrder.fraud_cancellation_ratio || 0}%</strong></div>
                            </div>
                            <div className="success-rate">Success Rate: <strong>{selectedOrder.fraud_delivery_ratio || 0}%</strong></div>
                          </div>
                        </div>
                        <div className="fraud-bottom-boxes">
                          <div className="info-box"><span className="box-icon">📦</span><div className="box-text"><span className="box-label">PARCEL VOLUME</span><strong className="box-value" style={{ color: "#2eaa8f" }}>{selectedOrder.fraud_total_parcels ?? 0}</strong></div></div>
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
                              <div
                                className={`order-product-image ${imageUrl ? "clickable" : ""}`}
                                onClick={() => { if (imageUrl) setLightboxImage({ src: imageUrl, alt: getItemName(item) }); }}
                              >
                                {imageUrl ? <img src={imageUrl} alt={getItemName(item)} loading="lazy" /> : <span>🧵</span>}
                              </div>
                              <div className="order-product-info">
                                <strong>{getItemName(item)}</strong>
                                <span>Code: {item.productCode || item.code || item.product_code || "—"}</span>
                                <span>Qty: {quantity} {item.blouseOption === "withBlouse" ? "· Blouse সহ" : item.blouseOption === "withoutBlouse" ? "· Blouse ছাড়া" : ""}</span>
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

      {/* ============ LIGHTBOX ============ */}
      {lightboxImage && (
        <div className="lightbox-overlay" onClick={() => setLightboxImage(null)}>
          <button className="lightbox-close" onClick={() => setLightboxImage(null)} aria-label="Close">×</button>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxImage.src} alt={lightboxImage.alt} />
            <p>{lightboxImage.alt}</p>
          </div>
        </div>
      )}

      {/* ============ MANUAL ORDER MODAL ============ */}
      {isManualModalOpen && (
        <div className="modal-overlay">
          <div className="manual-modal">
            <div className="modal-header">
              <h2>🛒 Create Manual Order</h2>
              <button className="close-modal" onClick={() => setIsManualModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
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
              <div className="form-section">
                <h3>Add Products</h3>
                <div className="product-search-box">
                  <input type="text" placeholder="Enter Product Code (e.g. SC-A1B2C3)" value={searchCode} onChange={e => setSearchCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleProductSearch()} />
                  <button onClick={handleProductSearch} disabled={isSearching}>{isSearching ? "..." : "Search"}</button>
                </div>
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
              <div className="selected-items-list">
                <h3>Selected Items ({manualCart.length})</h3>
                {manualCart.length === 0 ? (
                  <p className="empty-text">কোনো প্রোডাক্ট সিলেক্ট করা হয়নি।</p>
                ) : (
                  manualCart.map((item, idx) => (
                    <div className="selected-item" key={idx}>
                      <span>{item.name} (x{item.quantity}) - {item.blouseOption} {item.isFreeDelivery && "🚚"}</span>
                      <button onClick={() => removeFromManualCart(idx)}>×</button>
                    </div>
                  ))
                )}
              </div>
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
        html, body { margin: 0; padding: 0; }

        .admin-page {
          min-height: 100vh;
          display: flex;
          background: #f6f4f7;
          color: #2b2026;
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        /* ===== SIDEBAR ===== */
        .sidebar {
          width: 240px;
          min-height: 100vh;
          background: linear-gradient(180deg, #221a20 0%, #171018 60%, #120c11 100%);
          color: #fff;
          padding: 22px 14px;
          position: fixed;
          inset: 0 auto 0 0;
          display: flex;
          flex-direction: column;
          z-index: 20;
          box-shadow: 2px 0 16px rgba(30,10,25,0.12);
        }
        .brand { display: flex; align-items: center; gap: 11px; padding: 0 6px 22px; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .logo { width: 44px; height: 44px; border-radius: 13px; background: linear-gradient(135deg, #d66f99, #a9416e); display: grid; place-items: center; font-size: 15px; font-weight: 800; }
        .brand-name { font-size: 13px; font-weight: 800; margin-bottom: 3px; }
        .brand-subtitle { font-size: 10px; color: #b7aab3; }
        .menu-title { font-size: 9px; letter-spacing: 1.5px; color: #887983; font-weight: 800; margin: 24px 8px 12px; }
        .menu { display: flex; flex-direction: column; gap: 5px; }
        .menu-item {
          height: 43px; padding: 0 13px; border-radius: 10px;
          display: flex; align-items: center; gap: 12px;
          color: #c7bcc4; text-decoration: none; font-size: 12.5px; font-weight: 700;
          transition: all .2s ease;
        }
        .menu-item:hover { background: rgba(255,255,255,0.06); color: #fff; }
        .menu-item.active {
          color: #fff;
          background: linear-gradient(90deg, rgba(177,79,121,0.36), rgba(177,79,121,0.14));
          box-shadow: inset 3px 0 0 #d56e98;
        }
        .menu-icon { width: 18px; text-align: center; font-size: 15px; }
        .sidebar-bottom { margin-top: auto; padding-top: 20px; }
        .view-store {
          height: 42px; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px;
          display: flex; align-items: center; justify-content: center; gap: 9px;
          color: #d7cdd4; text-decoration: none; font-size: 11.5px; font-weight: 700;
          transition: .2s;
        }
        .view-store:hover { background: rgba(255,255,255,0.05); color: #fff; }

        /* ===== MAIN ===== */
        .main-content {
          margin-left: 240px;
          width: calc(100% - 240px);
          padding: 28px 24px 60px;
          min-height: 100vh;
        }
        .top-header {
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; margin-bottom: 22px; flex-wrap: wrap;
        }
        .eyebrow { color: #a9416e; font-size: 9px; letter-spacing: 1.7px; font-weight: 900; margin-bottom: 5px; }
        h1 { margin: 0; font-size: 28px; font-weight: 900; color: #241a20; }
        .manual-order-btn {
          background: linear-gradient(135deg, #b74c7c, #a9416e);
          color: #fff; border: 0; padding: 12px 22px; border-radius: 12px;
          font-weight: 800; font-size: 13px; cursor: pointer;
          transition: transform .15s ease, box-shadow .2s ease;
          box-shadow: 0 6px 16px rgba(169,65,110,0.28);
        }
        .manual-order-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(169,65,110,0.36); }
        .manual-order-btn:active { transform: translateY(0); }

        /* ===== STATS ===== */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 18px;
        }
        .stat-card {
          background: #fff; border: 1px solid #ede5ea; border-radius: 16px;
          padding: 16px; display: flex; align-items: center; gap: 12px;
          box-shadow: 0 4px 14px rgba(45,25,38,0.04);
          transition: transform .15s ease, box-shadow .2s ease;
        }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(45,25,38,0.07); }
        .stat-icon { width: 44px; height: 44px; border-radius: 12px; background: #f8eaf0; display: grid; place-items: center; font-size: 19px; flex-shrink: 0; }
        .stat-icon.pending { background: #fff5df; }
        .stat-icon.processing { background: #edf2ff; }
        .stat-icon.delivered { background: #eaf8ef; }
        .stat-label { font-size: 9px; letter-spacing: .9px; color: #9b8d95; font-weight: 900; margin-bottom: 5px; }
        .stat-value { font-size: 21px; font-weight: 900; color: #241a20; }

        /* ===== SEARCH CARD ===== */
        .search-card {
          background: #fff; border: 1px solid #ede5ea; border-radius: 16px;
          padding: 14px; margin-bottom: 18px;
          box-shadow: 0 4px 14px rgba(45,25,38,0.04);
        }
        .filter-toolbar {
          display: grid;
          grid-template-columns: minmax(220px, 1fr) 170px 180px;
          gap: 10px; align-items: center;
        }
        .search-box {
          height: 44px; border: 1px solid #ede0e7; border-radius: 11px;
          display: flex; align-items: center; gap: 10px; padding: 0 14px;
          color: #ad9da7; background: #fdfbfc;
          transition: border-color .2s, box-shadow .2s;
        }
        .search-box:focus-within { border-color: #b14f79; box-shadow: 0 0 0 3px rgba(177,79,121,0.09); background: #fff; }
        .search-box span { font-size: 19px; }
        .search-box input { border: 0; outline: 0; width: 100%; font-size: 13px; background: transparent; color: #2b2026; }
        .search-box input::placeholder { color: #b3a5ad; }
        .clear-search {
          width: 24px; height: 24px; border: 0; border-radius: 50%;
          background: #fbe9ed; color: #a94f6f; font-size: 16px;
          cursor: pointer; display: grid; place-items: center; line-height: 1;
        }
        .clear-search:hover { background: #f8dbe3; }

        .filter-select, .custom-date-row input {
          height: 44px; border: 1px solid #ede0e7; border-radius: 11px;
          background: #fff; color: #4b3b43; padding: 0 12px; outline: none;
          font-size: 12.5px; font-weight: 700;
          transition: border-color .2s, box-shadow .2s;
        }
        .filter-select:focus, .custom-date-row input:focus {
          border-color: #b14f79; box-shadow: 0 0 0 3px rgba(177,79,121,0.09);
        }

        .custom-date-row {
          display: flex; flex-wrap: wrap; align-items: end; gap: 12px;
          margin-top: 12px; padding-top: 12px; border-top: 1px dashed #ede0e7;
        }
        .custom-date-row label {
          display: grid; gap: 5px; color: #8f8088; font-size: 10.5px; font-weight: 800;
        }
        .custom-date-row input { height: 38px; }
        .reset-filter-btn {
          height: 38px; padding: 0 14px; border: 1px solid #ede0e7;
          border-radius: 9px; background: #fff; color: #a04f72;
          font-size: 11.5px; font-weight: 800; cursor: pointer; transition: .2s;
        }
        .reset-filter-btn:hover { background: #fdf4f8; border-color: #d9b8c8; }

        .filter-result-line {
          margin-top: 10px; color: #9b8d95; font-size: 11px;
        }
        .filter-result-line strong { color: #a04f72; }

        /* ===== SPLIT LAYOUT ===== */
        .split-layout {
          display: grid;
          grid-template-columns: 1fr 470px;
          gap: 20px;
          align-items: flex-start;
        }
        .management-card {
          background: #fff; border: 1px solid #ede5ea; border-radius: 18px;
          overflow: hidden; box-shadow: 0 4px 14px rgba(45,25,38,0.04);
        }
        .card-header {
          padding: 16px 20px; border-bottom: 1px solid #ede5ea;
          display: flex; justify-content: space-between; align-items: center;
          background: linear-gradient(135deg, #fff, #fdfafb);
          flex-wrap: wrap; gap: 10px;
        }
        .section-label { font-size: 8.5px; letter-spacing: 1.4px; color: #b14f79; font-weight: 900; margin-bottom: 4px; }
        .card-header h2 { margin: 0; font-size: 17px; color: #241a20; }
        .order-count {
          font-size: 11px; color: #a4446d; font-weight: 800;
          padding: 6px 12px; border-radius: 20px; background: #f8eaf0;
          white-space: nowrap;
        }

        /* ===== ORDERS LIST ===== */
        .orders-list { display: grid; gap: 9px; padding: 14px; }
        .order-card {
          border: 1px solid #eee2e8; border-radius: 12px; background: #fff;
          cursor: pointer; transition: all .2s ease;
        }
        .order-card:hover { border-color: #d9b8c8; background: #fdfafb; transform: translateY(-1px); }
        .order-card.active {
          border-color: #a9416e; box-shadow: 0 4px 14px rgba(169,65,110,0.14);
          background: #fdf6f9;
        }
        .order-summary-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 13px 15px; gap: 14px;
        }
        .order-summary-info { flex: 1; min-width: 0; }
        .order-summary-info .order-number {
          display: block; margin-bottom: 2px; font-size: 11px;
          color: #a04f72; font-weight: 800;
        }
        .order-summary-info > strong { display: block; color: #392f35; font-size: 13.5px; font-weight: 900; }
        .fraud-mini-text { display: block; font-size: 10.5px; color: #888; margin-top: 5px; font-weight: 600; }
        .order-summary-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .order-summary-total { color: #a04f72; font-size: 14.5px; font-weight: 900; white-space: nowrap; }
        .order-expand-icon {
          width: 26px; height: 26px; display: grid; place-items: center;
          border-radius: 7px; background: #f8edf2; color: #a04f72;
          font-size: 15px; font-weight: 900;
        }
        .order-card-date { display: block; margin-top: 5px; color: #92838c; font-size: 10.5px; font-weight: 600; }

        .order-mini-products {
          display: flex; align-items: center; gap: 6px;
          margin-top: 9px; flex-wrap: wrap;
        }
        .mini-product {
          width: 40px; height: 40px; position: relative;
          border: 1px solid #eee2e8; border-radius: 8px;
          background: #faf6f8; overflow: hidden;
          transition: transform .15s ease, border-color .15s ease;
        }
        .mini-product:hover { transform: scale(1.06); border-color: #d9b8c8; }
        .mini-product img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .mini-product-placeholder {
          display: grid; place-items: center; width: 100%; height: 100%; font-size: 17px;
        }
        .mini-product-qty {
          position: absolute; right: 2px; bottom: 2px;
          background: #a9416e; color: #fff; border-radius: 5px;
          padding: 1px 4px; font-size: 8px; font-weight: 900;
        }
        .more-products {
          color: #a04f72; background: #f8eaf0;
          border-radius: 7px; padding: 6px 8px; font-size: 10px; font-weight: 900;
        }
        .piece-count { color: #786a72; font-size: 10.5px; font-weight: 800; margin-left: 3px; }

        .order-card-status { display: flex; justify-content: flex-end; }
        .delete-order-btn, .delete-details {
          width: 30px; height: 30px; border: 1px solid #f1d4db;
          border-radius: 8px; background: #fff4f5; color: #c23e5b;
          font-size: 13px; cursor: pointer; transition: .15s;
          display: grid; place-items: center;
        }
        .delete-order-btn:hover, .delete-details:hover { background: #ffe3e8; }
        .delete-order-btn:disabled, .delete-details:disabled { opacity: .5; cursor: wait; }

        /* ===== DETAILS PANE ===== */
        .order-details-pane {
          position: sticky; top: 20px;
          max-height: calc(100vh - 40px);
          display: flex; flex-direction: column;
        }
        .details-empty {
          background: #fff; border: 1px dashed #d9b8c8; border-radius: 18px;
          min-height: 400px; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          text-align: center; color: #9b8d95; padding: 30px;
        }
        .details-empty-icon { font-size: 42px; margin-bottom: 15px; opacity: .55; }
        .details-empty h3 { margin: 0 0 8px; color: #392f35; font-size: 16px; }
        .details-empty p { margin: 0; font-size: 12px; }

        .details-card {
          background: #fff; border: 1px solid #eee2e8; border-radius: 18px;
          height: 100%; display: flex; flex-direction: column; overflow: hidden;
          box-shadow: 0 4px 14px rgba(45,25,38,0.04);
        }
        .details-header {
          padding: 18px 20px; border-bottom: 1px solid #f0e7eb;
          background: #fdfafb; display: flex; align-items: center;
          justify-content: space-between; gap: 12px;
        }
        .details-order-num { font-size: 11px; color: #a04f72; font-weight: 800; display: block; margin-bottom: 3px; }
        .details-header h2 { margin: 0; font-size: 18px; color: #2b1f26; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 240px; }
        .edit-details, .close-details {
          width: 30px; height: 30px; border: 0; border-radius: 8px;
          background: #f1e5ea; color: #a04f72; font-size: 14px; cursor: pointer;
          transition: .15s; display: grid; place-items: center;
        }
        .edit-details:hover, .close-details:hover { background: #e8d5de; }
        .details-content { padding: 18px; overflow-y: auto; flex: 1; }
        .details-content::-webkit-scrollbar { width: 6px; }
        .details-content::-webkit-scrollbar-thumb { background: #e8d5de; border-radius: 10px; }

        /* ===== STATUS BADGES ===== */
        .status-badge {
          display: inline-flex; align-items: center; padding: 4px 10px;
          border-radius: 7px; font-size: 9.5px; font-weight: 900;
          margin-bottom: 12px; letter-spacing: .2px; white-space: nowrap;
        }
        .status-badge.blocked { background: #2d2d2d; color: #ffcccc; }
        .status-badge.review { background: #fff3cd; color: #856404; }
        .status-badge.pending { background: #ffe5c7; color: #a05a00; }
        .status-badge.delivered { background: #d4edda; color: #155724; }
        .status-badge.cancelled { background: #f8d7da; color: #721c24; }
        .status-badge.partial { background: #fff0dc; color: #9c5b00; }
        .status-badge.default { background: #f1edf0; color: #756570; }

        /* ===== ORDER INFO ===== */
        .order-grid { display: grid; gap: 12px; }
        .order-info-block {
          padding: 12px 14px; border-radius: 10px;
          background: #fdfafb; border: 1px solid #f0e7eb;
        }
        .order-info-block span { display: block; color: #8f8088; font-size: 10px; font-weight: 700; margin-bottom: 3px; }
        .order-info-block strong { color: #4b3b43; font-size: 13px; font-weight: 800; }

        .order-items {
          padding: 14px; border-radius: 12px;
          background: #fdfafb; border: 1px solid #f0e7eb;
        }
        .order-section-title { font-size: 11.5px; font-weight: 900; color: #a04f72; margin-bottom: 10px; }

        .order-product-card {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 0; border-bottom: 1px dashed #f0e7eb;
        }
        .order-product-card:last-child { border-bottom: 0; }
        .order-product-image {
          width: 60px; height: 72px; flex: 0 0 60px;
          border: 1px solid #eee2e8; border-radius: 9px; overflow: hidden;
          background: #f9f3f6; display: grid; place-items: center; font-size: 22px;
          transition: .2s;
        }
        .order-product-image.clickable { cursor: zoom-in; }
        .order-product-image.clickable:hover { border-color: #a9416e; box-shadow: 0 4px 10px rgba(169,65,110,0.18); transform: scale(1.02); }
        .order-product-image img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .order-product-info { flex: 1; min-width: 0; display: grid; gap: 3px; }
        .order-product-info strong { color: #392f35; font-size: 11.5px; line-height: 1.4; overflow-wrap: anywhere; }
        .order-product-info span { color: #8f8088; font-size: 9.5px; overflow-wrap: anywhere; }
        .order-product-price { flex: 0 0 auto; display: grid; gap: 4px; text-align: right; }
        .order-product-price strong { color: #a04f72; font-size: 11.5px; }
        .order-product-price small { color: #9b8d95; font-size: 8.5px; }

        .order-price-summary {
          padding: 14px; border-radius: 12px;
          background: #fdfafb; border: 1px solid #f0e7eb;
          display: grid; gap: 8px;
        }
        .order-price-summary div { display: flex; justify-content: space-between; font-size: 12.5px; color: #555; }
        .order-grand-total {
          margin-top: 5px; padding-top: 11px;
          border-top: 1px dashed #eadfe4;
          font-size: 17px !important; font-weight: 900; color: #a04f72 !important;
        }

        /* ===== DATE BANNER ===== */
        .order-date-banner {
          display: grid; gap: 6px; padding: 16px;
          border: 1px solid #ead5df; border-radius: 13px;
          background: linear-gradient(135deg, #fff7fa, #fff);
        }
        .order-date-banner span { color: #a04f72; font-size: 9px; letter-spacing: 1.1px; font-weight: 900; }
        .order-date-banner strong { color: #382832; font-size: 17px; line-height: 1.35; }
        .order-date-banner small { color: #92838c; font-size: 10px; font-weight: 700; overflow-wrap: anywhere; }

        /* ===== HISTORY ===== */
        .order-history-panel {
          border: 1px solid #eee2e8; border-radius: 12px;
          padding: 13px; background: #fff;
        }
        .order-history-heading {
          display: flex; justify-content: space-between; align-items: center;
          gap: 10px; margin-bottom: 9px;
        }
        .order-history-heading > div { display: grid; gap: 3px; }
        .order-history-heading span { color: #a04f72; font-size: 8.5px; letter-spacing: 1px; font-weight: 900; }
        .order-history-heading strong { color: #392f35; font-size: 12px; }
        .order-history-heading > b {
          flex-shrink: 0; padding: 5px 9px; border-radius: 20px;
          background: #f8eaf0; color: #a04f72; font-size: 9.5px;
        }
        .order-history-list { display: grid; gap: 6px; }
        .history-order-row {
          width: 100%; display: flex; justify-content: space-between;
          align-items: center; gap: 10px; text-align: left;
          border: 1px solid #f0e7eb; border-radius: 9px;
          background: #fdfafb; padding: 9px 10px; cursor: pointer;
          transition: .15s;
        }
        .history-order-row:hover { border-color: #d9b8c8; background: #fff; }
        .history-order-row.current { border-color: #bd7292; background: #fff6fa; }
        .history-order-main, .history-order-side { display: grid; gap: 3px; }
        .history-order-main strong { color: #a04f72; font-size: 10.5px; overflow-wrap: anywhere; }
        .history-order-main small { color: #91838b; font-size: 9.5px; }
        .history-order-side { justify-items: end; }
        .history-order-side .status-badge { margin: 0; padding: 3px 6px; font-size: 8px; }
        .history-order-side > strong { color: #4b3b43; font-size: 10.5px; }
        .history-empty { color: #9b8d95; font-size: 11px; margin: 8px 0 2px; }

        /* ===== FRAUD ===== */
        .fraud-panel {
          background: #fff; border: 1px solid #e9ecef;
          border-radius: 12px; padding: 16px;
        }
        .fraud-header { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 18px; }
        .fraud-header span { font-size: 11px; font-weight: 900; color: #495057; text-transform: uppercase; }
        .refresh-fraud-btn {
          padding: 5px 11px; border-radius: 7px; border: 1px solid #ced4da;
          background: #fff; font-size: 10px; cursor: pointer; font-weight: 700;
          transition: .15s;
        }
        .refresh-fraud-btn:hover { background: #f8f9fa; }
        .refresh-fraud-btn:disabled { opacity: .6; cursor: wait; }
        .fraud-main-content { display: flex; align-items: center; gap: 26px; margin-bottom: 22px; }
        .donut-container { width: 118px; height: 118px; flex-shrink: 0; }
        .donut-chart {
          width: 100%; height: 100%; border-radius: 50%;
          background: conic-gradient(#2eaa8f 0% var(--delivered), #f45b69 var(--delivered) 100%);
          display: grid; place-items: center;
        }
        .donut-inner { width: 78px; height: 78px; background: #fff; border-radius: 50%; }
        .fraud-legend-container { display: flex; flex-direction: column; gap: 10px; flex: 1; min-width: 0; }
        .fraud-legend { display: flex; flex-direction: column; gap: 6px; }
        .legend-item { display: flex; align-items: center; gap: 7px; font-size: 12px; color: #6c757d; }
        .dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
        .delivered-dot { background: #2eaa8f; }
        .cancelled-dot { background: #f45b69; }
        .success-rate { font-size: 12.5px; color: #6c757d; font-weight: 600; border-top: 1px dashed #ced4da; padding-top: 10px; }
        .success-rate strong { color: #2eaa8f; }
        .fraud-bottom-boxes { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .info-box {
          display: flex; align-items: center; gap: 10px; padding: 12px;
          border: 1px solid #e9ecef; border-radius: 9px; background: #f8f9fa;
        }
        .box-icon { font-size: 18px; }
        .box-label { font-size: 9px; font-weight: 800; color: #6c757d; display: block; }
        .box-value { font-size: 18px; font-weight: 900; }

        /* ===== EDIT FORM ===== */
        .edit-form { display: flex; flex-direction: column; gap: 12px; margin-top: 10px; }
        .edit-field label { display: block; font-size: 11px; font-weight: 800; color: #8f8088; margin-bottom: 4px; }
        .edit-field input, .edit-field textarea {
          width: 100%; border: 1px solid #eadfe5; border-radius: 9px;
          padding: 10px; font-size: 13px; outline: none;
          transition: border-color .2s, box-shadow .2s;
        }
        .edit-field input:focus, .edit-field textarea:focus {
          border-color: #b14f79; box-shadow: 0 0 0 3px rgba(177,79,121,0.09);
        }
        .edit-actions { display: flex; gap: 10px; margin-top: 10px; }
        .btn-cancel {
          flex: 1; padding: 11px; border-radius: 9px; border: 1px solid #ddd;
          background: #fff; cursor: pointer; font-weight: 700; color: #555;
        }
        .btn-save {
          flex: 1; padding: 11px; border-radius: 9px; border: 0;
          background: #a9416e; color: #fff; cursor: pointer; font-weight: 700;
        }
        .btn-save:disabled { opacity: .6; cursor: wait; }

        /* ===== LOADING / EMPTY ===== */
        .order-loading, .empty-state { padding: 60px 20px; text-align: center; color: #9b8d95; }
        .loading-spinner {
          width: 32px; height: 32px; border: 3px solid #f0e7eb;
          border-top-color: #a9416e; border-radius: 50%;
          animation: spin .8s linear infinite; margin: 0 auto 15px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .empty-icon { font-size: 44px; margin-bottom: 12px; opacity: .5; }
        .empty-state h3 { margin: 0 0 6px; color: #392f35; font-size: 15px; }
        .empty-state p { margin: 0; font-size: 12px; }

        /* ===== LIGHTBOX ===== */
        .lightbox-overlay {
          position: fixed; inset: 0; z-index: 5000;
          background: rgba(15, 10, 18, 0.88);
          backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: 24px; animation: fadeIn .18s ease-out;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .lightbox-content {
          max-width: min(560px, 92vw); max-height: 92vh;
          display: flex; flex-direction: column; align-items: center; gap: 14px;
          animation: zoomIn .22s ease-out;
        }
        @keyframes zoomIn { from { opacity: 0; transform: scale(.92); } to { opacity: 1; transform: scale(1); } }
        .lightbox-content img {
          max-width: 100%; max-height: 78vh;
          border-radius: 14px; object-fit: contain;
          box-shadow: 0 20px 60px rgba(0,0,0,0.6);
          background: #fff;
        }
        .lightbox-content p {
          color: #f5eef2; font-size: 14px; font-weight: 700;
          margin: 0; text-align: center; letter-spacing: .2px;
        }
        .lightbox-close {
          position: absolute; top: 20px; right: 22px;
          width: 42px; height: 42px; border-radius: 50%;
          border: 0; background: rgba(255,255,255,0.14);
          color: #fff; font-size: 26px; line-height: 1;
          cursor: pointer; transition: .2s;
          display: grid; place-items: center;
        }
        .lightbox-close:hover { background: rgba(255,255,255,0.28); transform: rotate(90deg); }

        /* ===== MANUAL ORDER MODAL ===== */
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(15,10,18,0.55);
          backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
          z-index: 3000; display: flex; align-items: center;
          justify-content: center; padding: 16px;
          animation: fadeIn .18s ease-out;
        }
        .manual-modal {
          background: #fff; width: 100%; max-width: 620px;
          border-radius: 18px; box-shadow: 0 24px 60px rgba(0,0,0,0.3);
          display: flex; flex-direction: column; overflow: hidden;
          max-height: 92vh; animation: modalFade .25s ease-out;
        }
        @keyframes modalFade { from { opacity: 0; transform: scale(.96) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .modal-header {
          padding: 18px 20px; border-bottom: 1px solid #eee;
          display: flex; justify-content: space-between; align-items: center;
          background: #fdfafb;
        }
        .modal-header h2 { margin: 0; font-size: 17px; color: #2b1f26; }
        .close-modal {
          background: #f1e5ea; border: 0; width: 32px; height: 32px;
          border-radius: 9px; font-size: 20px; cursor: pointer; color: #a9416e;
          display: grid; place-items: center; line-height: 1;
        }
        .close-modal:hover { background: #e8d5de; }
        .modal-body { padding: 20px; overflow-y: auto; flex: 1; }

        .form-section {
          margin-bottom: 18px; background: #fdfafb;
          padding: 15px; border-radius: 12px; border: 1px solid #f0e7eb;
        }
        .form-section h3 {
          margin: 0 0 12px; font-size: 13.5px; color: #4b3b43;
          border-bottom: 1px solid #eadfe5; padding-bottom: 8px;
        }
        .input-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .input-grid input, .input-grid select, .input-grid textarea {
          width: 100%; padding: 10px; border: 1px solid #eadfe5;
          border-radius: 9px; font-size: 13px; outline: none;
          transition: border-color .2s, box-shadow .2s;
        }
        .input-grid input:focus, .input-grid select:focus, .input-grid textarea:focus {
          border-color: #b14f79; box-shadow: 0 0 0 3px rgba(177,79,121,0.09);
        }
        .full-width { grid-column: 1 / -1; }

        .product-search-box { display: flex; gap: 10px; margin-bottom: 12px; }
        .product-search-box input {
          flex: 1; min-width: 0; padding: 12px;
          border: 1px solid #eadfe5; border-radius: 9px;
          outline: none; font-size: 14px; transition: .2s;
        }
        .product-search-box input:focus { border-color: #b14f79; box-shadow: 0 0 0 3px rgba(177,79,121,0.09); }
        .product-search-box button {
          padding: 0 20px; background: #a9416e; color: #fff;
          border: 0; border-radius: 9px; font-weight: 700; cursor: pointer;
          transition: .15s; white-space: nowrap;
        }
        .product-search-box button:hover { background: #923a61; }
        .product-search-box button:disabled { opacity: .6; cursor: wait; }

        .searched-product-card {
          background: #fff; border: 1px solid #c1e8d1;
          border-radius: 11px; padding: 12px;
          display: flex; flex-direction: column; gap: 12px;
        }
        .product-info { display: flex; gap: 12px; align-items: center; }
        .search-thumb { width: 54px; height: 54px; border-radius: 9px; object-fit: cover; flex-shrink: 0; }
        .product-info h4 { margin: 0 0 4px; font-size: 14px; color: #241a20; }
        .product-info p { margin: 0 0 2px; font-size: 11.5px; color: #666; }

        .add-controls {
          display: flex; align-items: center; gap: 12px;
          border-top: 1px dashed #ccc; padding-top: 12px; flex-wrap: wrap;
        }
        .input-row { display: flex; align-items: center; gap: 6px; }
        .input-row label { font-size: 12px; font-weight: 700; color: #555; }
        .input-row input, .input-row select {
          padding: 7px 9px; border: 1px solid #ccc;
          border-radius: 7px; font-size: 12.5px; outline: none;
        }
        .add-btn {
          margin-left: auto; background: #1f6a42; color: #fff;
          border: 0; padding: 9px 18px; border-radius: 8px;
          cursor: pointer; font-weight: 800; font-size: 12.5px;
          transition: .15s;
        }
        .add-btn:hover { background: #175334; }

        .selected-items-list h3 {
          font-size: 13.5px; margin-bottom: 10px; color: #333;
          border-bottom: 1px solid #eee; padding-bottom: 8px;
        }
        .empty-text { font-size: 12px; color: #999; text-align: center; padding: 12px 0; }
        .selected-item {
          display: flex; justify-content: space-between; align-items: center;
          background: #fff; border: 1px solid #eee; padding: 10px 12px;
          border-radius: 9px; margin-bottom: 8px; font-size: 12.5px;
        }
        .selected-item button {
          background: none; border: 0; color: #d32f2f;
          font-size: 19px; cursor: pointer; line-height: 1;
          padding: 0 4px;
        }

        .order-summary-box {
          background: #fff; padding: 15px; border-radius: 12px;
          border: 1px solid #eadfe5;
        }
        .order-summary-box div {
          display: flex; justify-content: space-between;
          margin-bottom: 8px; font-size: 13.5px; color: #555;
        }
        .order-summary-box .grand-total {
          margin-top: 12px; padding-top: 12px;
          border-top: 1px dashed #ccc;
          font-size: 17px; font-weight: 900; color: #a9416e;
          margin-bottom: 0;
        }

        .modal-footer {
          padding: 14px 20px; border-top: 1px solid #eee;
          display: flex; justify-content: flex-end; gap: 10px;
          background: #fdfafb; flex-wrap: wrap;
        }
        .cancel-btn {
          padding: 11px 18px; border-radius: 9px; border: 1px solid #ccc;
          background: #fff; cursor: pointer; font-weight: 700; color: #555;
        }
        .proceed-btn {
          padding: 11px 22px; border-radius: 9px; border: 0;
          background: #a9416e; color: #fff; cursor: pointer; font-weight: 800;
          transition: .15s;
        }
        .proceed-btn:hover:not(:disabled) { background: #923a61; }
        .proceed-btn:disabled { opacity: .5; cursor: not-allowed; }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 1200px) {
          .split-layout { grid-template-columns: 1fr 420px; }
        }
        @media (max-width: 1050px) {
          .split-layout { grid-template-columns: 1fr; }
          .order-details-pane { position: static; max-height: none; }
          .details-header h2 { max-width: none; }
          .filter-toolbar { grid-template-columns: 1fr 1fr; }
          .filter-toolbar .search-box { grid-column: 1 / -1; }
        }
        @media (max-width: 900px) {
          .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 760px) {
          .sidebar { width: 72px; padding: 16px 8px; }
          .brand { justify-content: center; padding: 0 0 18px; }
          .brand > div:last-child, .menu-title, .menu-item span:last-child, .view-store span:last-child { display: none; }
          .view-store { font-size: 0; }
          .menu-item { justify-content: center; padding: 0; }
          .main-content { margin-left: 72px; width: calc(100% - 72px); padding: 20px 14px 50px; }
          .top-header { gap: 12px; }
          h1 { font-size: 24px; }
          .manual-order-btn { padding: 10px 16px; font-size: 12px; }
          .filter-toolbar { grid-template-columns: 1fr; }
          .filter-toolbar .search-box { grid-column: auto; }
          .order-summary-row { flex-direction: column; align-items: stretch; gap: 12px; }
          .order-summary-right { justify-content: space-between; }
          .details-header h2 { font-size: 16px; }
          .order-date-banner strong { font-size: 15px; }
          .input-grid { grid-template-columns: 1fr; }
          .manual-modal { max-width: 100%; }
        }
        @media (max-width: 500px) {
          .stats-grid { grid-template-columns: 1fr; }
          .custom-date-row { display: grid; grid-template-columns: 1fr 1fr; }
          .reset-filter-btn { grid-column: 1 / -1; }
          .fraud-main-content { flex-direction: column; align-items: flex-start; }
          .fraud-bottom-boxes { grid-template-columns: 1fr; }
          .order-product-card { gap: 8px; }
          .order-product-image { width: 50px; height: 60px; flex-basis: 50px; }
          .order-product-info strong { font-size: 10.5px; }
          .order-product-price strong { font-size: 10.5px; }
          .add-controls { flex-direction: column; align-items: stretch; }
          .add-btn { margin-left: 0; width: 100%; }
          .modal-footer { flex-direction: column; }
          .cancel-btn, .proceed-btn { width: 100%; }
          .product-search-box { flex-direction: column; }
          .product-search-box button { padding: 12px; }
          .history-order-row { align-items: flex-start; }
          .lightbox-close { top: 12px; right: 14px; width: 36px; height: 36px; font-size: 22px; }
          .lightbox-content img { max-height: 72vh; }
        }
      `}</style>
    </div>
  );
}