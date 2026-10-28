"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase/supabase-client"; // আপনার পাথ অনুযায়ী ঠিক করে নিন

// ✨ ডিস্ট্রিক্ট লিস্ট (প্রয়োজন অনুযায়ী আপনি বাড়াতে পারেন)
const districts = ["ঢাকা", "চট্টগ্রাম", "রাজশাহী", "খুলনা", "বরিশাল", "সিলেট", "রংপুর", "ময়মনসিংহ", "কুমিল্লা", "নারায়ণগঞ্জ", "গাজীপুর", "টাঙ্গাইল", "নরসিংদী", "মুন্সিগঞ্জ", "মানিকগঞ্জ", "কিশোরগঞ্জ", "ফরিদপুর", "গোপালগঞ্জ", "মাদারীপুর", "রাজবাড়ী", "শরীয়তপুর", "কক্সবাজার", "ব্রাহ্মণবাড়িয়া", "চাঁদপুর", "ফেনী", "নোয়াখালী", "লক্ষ্মীপুর", "খাগড়াছড়ি", "রাঙামাটি", "বান্দরবান", "নাটোর", "নওগাঁ", "চাঁপাইনবাবগঞ্জ", "পাবনা", "সিরাজগঞ্জ", "বগুড়া", "জয়পুরহাট", "দিনাজপুর", "ঠাকুরগাঁও", "পঞ্চগড়", "কুড়িগ্রাম", "লালমনিরহাট", "নীলফামারী", "গাইবান্ধা", "যশোর", "সাতক্ষীরা", "বাগেরহাট", "ঝিনাইদহ", "মাগুরা", "নড়াইল", "কুষ্টিয়া", "চুয়াডাঙ্গা", "মেহেরপুর", "ভোলা", "পটুয়াখালী", "পিরোজপুর", "বরগুনা", "ঝালকাঠি", "মৌলভীবাজার", "হবিগঞ্জ", "সুনামগঞ্জ", "জামালপুর", "শেরপুর", "নেত্রকোনা"];

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [search, setSearch] = useState("");

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

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter((order) => {
      return (
        String(order.order_number ?? "").toLowerCase().includes(term) ||
        String(order.customer_name ?? "").toLowerCase().includes(term) ||
        String(order.phone ?? "").toLowerCase().includes(term)
      );
    });
  }, [orders, search]);

  const pendingCount = orders.filter((o) => o.steadfast_delivery_status === "pending").length;
  const processingCount = orders.filter((o) => o.steadfast_delivery_status === "in_review" || o.steadfast_delivery_status === "processing").length;
  const deliveredCount = orders.filter((o) => o.steadfast_delivery_status === "delivered").length;

  const getStatusBadge = (order: any) => {
    if (order.fraud_check_status === "blocked") return <span className="status-badge blocked">🚫 Fraud Blocked</span>;
    if (order.steadfast_delivery_status === "in_review") return <span className="status-badge review">⏳ In Review</span>;
    if (order.steadfast_delivery_status === "pending") return <span className="status-badge pending">📦 Pending</span>;
    if (order.steadfast_delivery_status === "delivered") return <span className="status-badge delivered">✅ Delivered</span>;
    if (order.steadfast_delivery_status === "cancelled") return <span className="status-badge cancelled">❌ Cancelled</span>;
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
          <div className="search-box">
            <span>⌕</span>
            <input type="text" placeholder="Search by order number, customer name or phone..." value={search} onChange={(event) => setSearch(event.target.value)} />
            {search && <button type="button" className="clear-search" onClick={() => setSearch("")}>×</button>}
          </div>
        </div>

        <div className="split-layout">
          <section className="management-card order-list-pane">
            <div className="card-header">
              <div><div className="section-label">ORDER MANAGEMENT</div><h2>All Orders</h2></div>
              <div className="order-count">{search ? `${filteredOrders.length} of ${orders.length} Orders` : `${orders.length} Orders`}</div>
            </div>

            {isLoading ? (
              <div className="order-loading"><div className="loading-spinner"></div><h3>Loading Orders...</h3></div>
            ) : filteredOrders.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">📦</div><h3>No Orders Found</h3></div>
            ) : (
              <div className="orders-list">
                {filteredOrders.map((order) => (
                  <div className={`order-card ${selectedOrder?.id === order.id ? "active" : ""}`} key={order.id} onClick={() => { setSelectedOrder(order); setIsEditing(false); }}>
                    <div className="order-summary-row">
                      <div className="order-summary-info">
                        <span className="order-number">{order.order_number}</span>
                        <strong>{order.customer_name}</strong>
                        {order.fraud_check_status && (
                           <span className="fraud-mini-text">
                             {order.fraud_check_status === "passed" ? "✅ Safe" : order.fraud_check_status === "blocked" ? "🚫 Blocked" : "⚠ Review"} 
                             {order.fraud_score ? ` (Score: ${order.fraud_score})` : ""}
                           </span>
                        )}
                      </div>
                      <div className="order-summary-right">
                        <div style={{ marginRight: "10px" }}>{getStatusBadge(order)}</div>
                        <strong className="order-summary-total">৳ {Number(order.total).toLocaleString("en-BD")}</strong>
                        <span className="order-expand-icon">{selectedOrder?.id === order.id ? "−" : "+"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside className="order-details-pane">
            {selectedOrder ? (
              <div className="details-card">
                <div className="details-header">
                  <div><span className="details-order-num">{selectedOrder.order_number}</span><h2>{selectedOrder.customer_name}</h2></div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className="edit-details" onClick={handleEditClick} title="Edit Order">✏️</button>
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
                        <div className="order-section-title">Ordered Products</div>
                        {Array.isArray(selectedOrder.items) && selectedOrder.items.map((item: any, index: number) => (<div className="order-item" key={index}><div><strong>{item.name || item.productName || "Product"}</strong><span>Qty: {item.quantity ?? 1}</span></div></div>))}
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
        .order-summary-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 15px; }
        .order-summary-info .order-number { display: block; margin-bottom: 2px; font-size: 11px; color: #a04f72; font-weight: 800; }
        .order-summary-info > strong { display: block; color: #392f35; font-size: 13px; font-weight: 900; }
        .fraud-mini-text { display: block; font-size: 10px; color: #888; margin-top: 4px; font-weight: 600; }
        .order-summary-right { display: flex; align-items: center; gap: 10px; }
        .order-summary-total { color: #a04f72; font-size: 14px; font-weight: 900; }
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
        .status-badge.cancelled { background: #f8d7da; color: #721c24; } .status-badge.error { background: #f8d7da; color: #721c24; }
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
      `}</style>
    </div>
  );
}