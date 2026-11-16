"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase/supabase-client"; // আপনার পাথ অনুযায়ী চেক করে নিন

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ডেট ফিল্টার স্টেট (ডিফল্ট: আজকের তারিখ)
  const today = new Date().toISOString().split("T")[0];
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  useEffect(() => {
    const loadOrders = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Dashboard data load error:", error);
      } else {
        setOrders(data ?? []);
      }
      setIsLoading(false);
    };

    loadOrders();
  }, []);

  // ✨ ফিল্টার করা অর্ডার এবং ক্যালকুলেশন
  const dashboardData = useMemo(() => {
    const start = new Date(fromDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);

    const filteredOrders = orders.filter((order) => {
      if (order.fraud_check_status === "blocked") return false;
      const orderDate = new Date(order.created_at || order.order_date);
      return orderDate >= start && orderDate <= end;
    });

    const deliveredOrders = filteredOrders.filter((order) => {
      const status = String(order.steadfast_delivery_status || order.status || "")
        .toLowerCase()
        .trim();
      return status === "delivered";
    });
    const cancelledOrders = filteredOrders.filter((order) => {
      const status = String(order.steadfast_delivery_status || order.status || "")
        .toLowerCase()
        .trim();
      return status === "cancelled" || status === "canceled";
    });

    const totalSales = deliveredOrders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    );
    const totalCost = deliveredOrders.reduce(
      (sum, order) => sum + Number(order.cost_total || 0),
      0
    );
    const cancellationLoss = cancelledOrders.reduce(
      (sum, order) => sum + Number(order.delivery_charge || 0),
      0
    );
    const totalProfit = totalSales - totalCost - cancellationLoss;

    const productStats: Record<
      string,
      { id: string; name: string; qty: number; revenue: number }
    > = {};

    deliveredOrders.forEach((order) => {
      if (Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const pId = item.productId || item.id || item.name;
          const pName = item.productName || item.name || "Unknown Product";

          if (!productStats[pId]) {
            productStats[pId] = { id: pId, name: pName, qty: 0, revenue: 0 };
          }

          productStats[pId].qty += Number(item.quantity || 1);
          productStats[pId].revenue += Number(
            item.totalPrice || item.unitPrice * item.quantity || 0
          );
        });
      }
    });

    const topProducts = Object.values(productStats)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    return {
      totalOrders: deliveredOrders.length,
      totalSales,
      totalCost,
      totalProfit,
      cancellationLoss,
      cancelledOrders: cancelledOrders.length,
      topProducts,
    };
  }, [orders, fromDate, toDate]);

  const setToday = () => {
    setFromDate(today);
    setToDate(today);
  };
  const setLast7Days = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    setFromDate(d.toISOString().split("T")[0]);
    setToDate(today);
  };
  const setThisMonth = () => {
    const d = new Date();
    d.setDate(1);
    setFromDate(d.toISOString().split("T")[0]);
    setToDate(today);
  };

  return (
    <div className="admin-shell">
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? "show" : ""}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* SIDEBAR */}
      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="logo">SC</div>
          <div className="brand-text">
            <div className="brand-name">Saree Craftline</div>
            <div className="brand-subtitle">Admin Panel</div>
          </div>
          <button
            className="sidebar-close"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <div className="menu-title">MAIN MENU</div>
        <nav className="menu">
          <Link href="/admin" className="menu-item active">
            <span className="menu-icon">📊</span>
            <span className="menu-label">Dashboard</span>
          </Link>
          <Link href="/admin/products" className="menu-item">
            <span className="menu-icon">🛍️</span>
            <span className="menu-label">Products</span>
          </Link>
          <Link href="/admin/categories" className="menu-item">
            <span className="menu-icon">📁</span>
            <span className="menu-label">Categories</span>
          </Link>
          <Link href="/admin/orders" className="menu-item">
            <span className="menu-icon">📦</span>
            <span className="menu-label">Orders</span>
          </Link>
          <Link href="/admin/settings" className="menu-item">
            <span className="menu-icon">⚙️</span>
            <span className="menu-label">Settings</span>
          </Link>
        </nav>

        <div className="sidebar-bottom">
          <Link href="/" className="view-store">
            <span>🛒</span>
            <span>View Store</span>
          </Link>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main-content">
        {/* TOP BAR */}
        <div className="topbar">
          <button
            className="hamburger"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open menu"
          >
            <span />
            <span />
            <span />
          </button>
          <div className="topbar-title">
            <span className="eyebrow">OVERVIEW</span>
            <h1>Dashboard</h1>
          </div>
          <div className="topbar-badge">
            <span className="dot" />
            Live
          </div>
        </div>

        {/* DATE FILTER */}
        <section className="filter-card">
          <div className="filter-top">
            <div className="filter-heading">
              <div className="filter-icon-wrap">📅</div>
              <div>
                <h3>Report Date Range</h3>
                <p>Select a range to filter dashboard metrics</p>
              </div>
            </div>
          </div>

          <div className="filter-body">
            <div className="field-group">
              <label>From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="field-group">
              <label>To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <div className="quick-filters">
              <button onClick={setToday}>Today</button>
              <button onClick={setLast7Days}>Last 7 Days</button>
              <button onClick={setThisMonth}>This Month</button>
            </div>
          </div>
        </section>

        {isLoading ? (
          <div className="skeleton-grid">
            {Array.from({ length: 5 }).map((_, i) => (
              <div className="skeleton-card" key={i}>
                <div className="skeleton-icon shimmer" />
                <div className="skeleton-lines">
                  <div className="skeleton-line short shimmer" />
                  <div className="skeleton-line long shimmer" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* STATS */}
            <section className="stats-grid">
              <div className="stat-card accent-sales">
                <div className="stat-icon-wrap">💰</div>
                <div className="stat-body">
                  <div className="stat-label">Delivered Sales</div>
                  <div className="stat-value">
                    ৳ {dashboardData.totalSales.toLocaleString("en-BD")}
                  </div>
                </div>
                <div className="stat-glow" />
              </div>

              <div className="stat-card accent-profit">
                <div className="stat-icon-wrap">📈</div>
                <div className="stat-body">
                  <div className="stat-label">Net Profit</div>
                  <div className="stat-value">
                    ৳ {dashboardData.totalProfit.toLocaleString("en-BD")}
                  </div>
                </div>
                <div className="stat-glow" />
              </div>

              <div className="stat-card accent-orders">
                <div className="stat-icon-wrap">📦</div>
                <div className="stat-body">
                  <div className="stat-label">Delivered Orders</div>
                  <div className="stat-value">{dashboardData.totalOrders}</div>
                </div>
                <div className="stat-glow" />
              </div>

              <div className="stat-card accent-cost">
                <div className="stat-icon-wrap">📉</div>
                <div className="stat-body">
                  <div className="stat-label">Purchase Cost</div>
                  <div className="stat-value">
                    ৳ {dashboardData.totalCost.toLocaleString("en-BD")}
                  </div>
                </div>
                <div className="stat-glow" />
              </div>

              <div className="stat-card accent-loss">
                <div className="stat-icon-wrap">⚠️</div>
                <div className="stat-body">
                  <div className="stat-label">Cancelled Delivery Loss</div>
                  <div className="stat-value">
                    ৳ {dashboardData.cancellationLoss.toLocaleString("en-BD")}
                  </div>
                  <div className="stat-note">
                    {dashboardData.cancelledOrders} cancelled orders
                  </div>
                </div>
                <div className="stat-glow" />
              </div>
            </section>

            <p className="accounting-note">
              <span className="note-dot" />
              Sales, purchase cost ও product profit-এ শুধু Delivered order ধরা
              হয়েছে। Cancelled order-এর সংরক্ষিত delivery charge-কে loss ধরা
              হয়েছে।
            </p>

            {/* TOP PRODUCTS */}
            <section className="products-card">
              <div className="products-header">
                <div>
                  <div className="section-label">PERFORMANCE</div>
                  <h2>Top Selling Products</h2>
                  <p>
                    সিলেক্ট করা তারিখের Delivered order থেকে সবচেয়ে বেশি বিক্রি
                    হওয়া পণ্য
                  </p>
                </div>
                <div className="products-count">
                  {dashboardData.topProducts.length} items
                </div>
              </div>

              {dashboardData.topProducts.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📉</div>
                  <h3>No Sales Data</h3>
                  <p>এই তারিখের মধ্যে কোনো সেলস ডেটা পাওয়া যায়নি।</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="products-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Product Name</th>
                        <th>Product Code / ID</th>
                        <th>Quantity Sold</th>
                        <th>Total Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.topProducts.map((product, index) => (
                        <tr key={index} style={{ animationDelay: `${index * 40}ms` }}>
                          <td>
                            <span className={`rank-badge rank-${index + 1}`}>
                              {index + 1}
                            </span>
                          </td>
                          <td className="product-name">{product.name}</td>
                          <td>
                            <Link
                              href={`/admin/products/new?edit=${product.id}`}
                              className="product-code-link"
                            >
                              🔗 {product.id?.substring(0, 8) || "N/A"}
                            </Link>
                          </td>
                          <td>
                            <strong className="qty-text">
                              {product.qty} pcs
                            </strong>
                          </td>
                          <td>
                            <strong className="revenue-text">
                              ৳ {product.revenue.toLocaleString("en-BD")}
                            </strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <style>{`
        * { box-sizing: border-box; }

        :root {
          --accent: #64172f;
          --accent-soft: #8a2a4a;
          --accent-glow: rgba(100, 23, 47, 0.18);
          --bg: #f6f4f7;
          --card: #ffffff;
          --border: #ece7ee;
          --text: #241d22;
          --text-soft: #6e626a;
          --text-muted: #9b8d95;
          --green: #1f6a42;
          --green-soft: #e8f6ee;
          --blue: #2f6bff;
          --blue-soft: #e9f0ff;
          --amber: #d68a00;
          --amber-soft: #fff4dc;
          --red: #c23a3a;
          --red-soft: #fdeaea;
          --purple: #7c3f8f;
          --purple-soft: #f3e9f7;
        }

        .admin-shell {
          min-height: 100vh;
          display: flex;
          background:
            radial-gradient(1200px 600px at 0% -10%, #f9eef2 0%, transparent 55%),
            radial-gradient(900px 500px at 100% 0%, #eef1fa 0%, transparent 50%),
            var(--bg);
          color: var(--text);
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI",
            Roboto, sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        /* ===== SIDEBAR ===== */
        .sidebar {
          width: 250px;
          height: 100vh;
          position: fixed;
          left: 0;
          top: 0;
          padding: 22px 16px;
          display: flex;
          flex-direction: column;
          color: #fff;
          background:
            radial-gradient(400px 300px at 0% 0%, rgba(138, 42, 74, 0.35), transparent 60%),
            linear-gradient(180deg, #251a20 0%, #1a1217 60%, #140d12 100%);
          z-index: 30;
          box-shadow: 8px 0 40px rgba(30, 12, 22, 0.18);
          transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 6px 22px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          position: relative;
        }
        .logo {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          font-size: 15px;
          font-weight: 800;
          letter-spacing: 0.5px;
          background: linear-gradient(135deg, #8a2a4a, #5a1329);
          box-shadow: 0 8px 20px rgba(138, 42, 74, 0.45),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
          color: #fff;
        }
        .brand-text { flex: 1; }
        .brand-name { font-size: 14px; font-weight: 800; margin-bottom: 2px; }
        .brand-subtitle {
          font-size: 10px;
          color: #b7aab3;
          letter-spacing: 0.5px;
        }
        .sidebar-close {
          display: none;
          background: transparent;
          border: none;
          color: #c7bcc4;
          font-size: 16px;
          cursor: pointer;
          padding: 6px;
        }

        .menu-title {
          font-size: 9px;
          letter-spacing: 1.8px;
          color: #887983;
          font-weight: 800;
          margin: 24px 10px 12px;
        }
        .menu { display: flex; flex-direction: column; gap: 6px; }
        .menu-item {
          height: 46px;
          padding: 0 14px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 13px;
          color: #c7bcc4;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.22s ease;
          position: relative;
          overflow: hidden;
        }
        .menu-item:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
          transform: translateX(3px);
        }
        .menu-item.active {
          color: #fff;
          background: linear-gradient(90deg, rgba(138, 42, 74, 0.55), rgba(138, 42, 74, 0.12));
          box-shadow: inset 3px 0 0 #8a2a4a, 0 6px 18px rgba(138, 42, 74, 0.25);
        }
        .menu-icon { width: 20px; text-align: center; font-size: 16px; }
        .menu-label { letter-spacing: 0.2px; }

        .sidebar-bottom { margin-top: auto; padding-top: 20px; }
        .view-store {
          height: 46px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: #e2d7dd;
          text-decoration: none;
          font-size: 12px;
          font-weight: 700;
          transition: all 0.22s ease;
        }
        .view-store:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.25);
          transform: translateY(-1px);
        }

        /* overlay */
        .sidebar-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(20, 8, 15, 0.55);
          backdrop-filter: blur(3px);
          z-index: 25;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }
        .sidebar-overlay.show { opacity: 1; pointer-events: auto; }

        /* ===== MAIN ===== */
        .main-content {
          flex: 1;
          margin-left: 250px;
          width: calc(100% - 250px);
          padding: 28px 30px 60px;
          animation: fadeUp 0.5s ease both;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* TOPBAR */
        .topbar {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 26px;
        }
        .hamburger {
          display: none;
          flex-direction: column;
          justify-content: center;
          gap: 4px;
          width: 42px;
          height: 42px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--card);
          cursor: pointer;
          padding: 0 11px;
          transition: all 0.2s;
        }
        .hamburger span {
          display: block;
          height: 2px;
          border-radius: 2px;
          background: var(--accent);
          transition: all 0.2s;
        }
        .hamburger:hover { background: #faf6f8; }

        .topbar-title { flex: 1; }
        .eyebrow {
          color: var(--accent);
          font-size: 9.5px;
          letter-spacing: 2px;
          font-weight: 900;
          margin-bottom: 4px;
          display: block;
        }
        h1 {
          margin: 0;
          font-size: 30px;
          font-weight: 900;
          letter-spacing: -0.6px;
          background: linear-gradient(135deg, #2a1d24, #6b3d55);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .topbar-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 15px;
          border-radius: 999px;
          background: var(--card);
          border: 1px solid var(--border);
          font-size: 12px;
          font-weight: 700;
          color: var(--text-soft);
          box-shadow: 0 4px 14px rgba(45, 25, 38, 0.04);
        }
        .topbar-badge .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.6);
          animation: pulse 1.8s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5); }
          70% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }

        /* FILTER CARD */
        .filter-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 20px 22px;
          margin-bottom: 22px;
          box-shadow: 0 8px 28px rgba(45, 25, 38, 0.05);
          animation: fadeUp 0.55s ease both;
        }
        .filter-top { margin-bottom: 16px; }
        .filter-heading { display: flex; align-items: center; gap: 12px; }
        .filter-icon-wrap {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: var(--purple-soft);
          font-size: 18px;
        }
        .filter-heading h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 800;
          color: var(--text);
        }
        .filter-heading p {
          margin: 2px 0 0;
          font-size: 11.5px;
          color: var(--text-muted);
        }

        .filter-body {
          display: flex;
          align-items: flex-end;
          gap: 14px;
          flex-wrap: wrap;
        }
        .field-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
          min-width: 180px;
        }
        .field-group label {
          font-size: 10.5px;
          font-weight: 800;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }
        .field-group input {
          height: 46px;
          padding: 0 14px;
          border: 1px solid var(--border);
          border-radius: 12px;
          outline: none;
          font-size: 13px;
          color: var(--text);
          font-weight: 600;
          background: #fbfafc;
          transition: all 0.22s ease;
        }
        .field-group input:focus {
          border-color: var(--accent);
          background: #fff;
          box-shadow: 0 0 0 4px var(--accent-glow);
        }

        .quick-filters { display: flex; gap: 8px; flex-wrap: wrap; }
        .quick-filters button {
          height: 46px;
          padding: 0 18px;
          border: 1px solid var(--border);
          background: #fbfafc;
          border-radius: 12px;
          font-size: 12.5px;
          font-weight: 700;
          color: var(--text-soft);
          cursor: pointer;
          transition: all 0.22s ease;
          white-space: nowrap;
        }
        .quick-filters button:hover {
          background: var(--accent);
          border-color: var(--accent);
          color: #fff;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px var(--accent-glow);
        }
        .quick-filters button:active { transform: translateY(0); }

        /* STATS */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 14px;
        }
        .stat-card {
          position: relative;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 20px;
          display: flex;
          align-items: flex-start;
          gap: 14px;
          overflow: hidden;
          box-shadow: 0 6px 22px rgba(45, 25, 38, 0.05);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: cardIn 0.6s ease both;
        }
        .stat-card:nth-child(1) { animation-delay: 0.05s; }
        .stat-card:nth-child(2) { animation-delay: 0.1s; }
        .stat-card:nth-child(3) { animation-delay: 0.15s; }
        .stat-card:nth-child(4) { animation-delay: 0.2s; }
        .stat-card:nth-child(5) { animation-delay: 0.25s; }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(14px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 34px rgba(45, 25, 38, 0.1);
          border-color: #dfd6dc;
        }
        .stat-icon-wrap {
          width: 50px;
          height: 50px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          font-size: 22px;
          flex-shrink: 0;
          transition: transform 0.3s ease;
        }
        .stat-card:hover .stat-icon-wrap { transform: scale(1.08) rotate(-4deg); }

        .stat-body { flex: 1; min-width: 0; }
        .stat-label {
          font-size: 10.5px;
          color: var(--text-muted);
          font-weight: 800;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
          text-transform: uppercase;
        }
        .stat-value {
          font-size: 22px;
          font-weight: 900;
          color: var(--text);
          letter-spacing: -0.4px;
          line-height: 1.15;
        }
        .stat-note {
          margin-top: 4px;
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 600;
        }
        .stat-glow {
          position: absolute;
          right: -30px;
          bottom: -30px;
          width: 90px;
          height: 90px;
          border-radius: 50%;
          opacity: 0.35;
          filter: blur(20px);
          pointer-events: none;
        }

        .accent-sales .stat-icon-wrap { background: var(--purple-soft); color: var(--purple); }
        .accent-sales .stat-glow { background: #c084fc; }
        .accent-sales .stat-value { color: var(--purple); }

        .accent-profit .stat-icon-wrap { background: var(--green-soft); color: var(--green); }
        .accent-profit .stat-glow { background: #4ade80; }
        .accent-profit .stat-value { color: var(--green); }

        .accent-orders .stat-icon-wrap { background: var(--amber-soft); color: var(--amber); }
        .accent-orders .stat-glow { background: #fbbf24; }
        .accent-orders .stat-value { color: #b07400; }

        .accent-cost .stat-icon-wrap { background: var(--blue-soft); color: var(--blue); }
        .accent-cost .stat-glow { background: #60a5fa; }
        .accent-cost .stat-value { color: #1e50c9; }

        .accent-loss .stat-icon-wrap { background: var(--red-soft); color: var(--red); }
        .accent-loss .stat-glow { background: #f87171; }
        .accent-loss .stat-value { color: var(--red); }

        .accounting-note {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin: 0 0 24px;
          padding: 13px 16px;
          border: 1px solid var(--border);
          border-left: 3px solid var(--accent);
          border-radius: 12px;
          background: #fff;
          color: var(--text-soft);
          font-size: 12px;
          line-height: 1.65;
          animation: fadeUp 0.6s ease both;
        }
        .note-dot {
          flex-shrink: 0;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--accent);
          margin-top: 6px;
        }

        /* PRODUCTS CARD */
        .products-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 20px;
          box-shadow: 0 8px 28px rgba(45, 25, 38, 0.05);
          overflow: hidden;
          animation: fadeUp 0.65s ease both;
        }
        .products-header {
          padding: 22px 26px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          background: linear-gradient(135deg, #ffffff, #fbf7fa);
        }
        .section-label {
          font-size: 9.5px;
          color: var(--accent);
          font-weight: 900;
          letter-spacing: 1.6px;
          margin-bottom: 5px;
        }
        .products-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 900;
          color: var(--text);
          letter-spacing: -0.3px;
        }
        .products-header p {
          margin: 5px 0 0;
          font-size: 12px;
          color: var(--text-muted);
        }
        .products-count {
          padding: 8px 14px;
          border-radius: 999px;
          background: var(--purple-soft);
          color: var(--purple);
          font-size: 12px;
          font-weight: 800;
        }

        .table-responsive { width: 100%; overflow-x: auto; }
        .products-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .products-table thead th {
          padding: 14px 24px;
          font-size: 10.5px;
          font-weight: 800;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.6px;
          background: #fbfafc;
          border-bottom: 1px solid var(--border);
          white-space: nowrap;
        }
        .products-table tbody td {
          padding: 16px 24px;
          border-bottom: 1px solid #f6f2f5;
          vertical-align: middle;
          font-size: 13px;
        }
        .products-table tbody tr {
          transition: background 0.2s ease, transform 0.2s ease;
          animation: rowIn 0.45s ease both;
        }
        @keyframes rowIn {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .products-table tbody tr:hover { background: #fbf7fa; }
        .products-table tbody tr:last-child td { border-bottom: 0; }

        .rank-badge {
          width: 28px;
          height: 28px;
          display: grid;
          place-items: center;
          border-radius: 8px;
          background: #f2eef1;
          color: var(--text-soft);
          font-size: 12px;
          font-weight: 900;
        }
        .rank-1 { background: linear-gradient(135deg, #ffe9a8, #f9d77a); color: #8a6200; box-shadow: 0 4px 10px rgba(249, 215, 122, 0.5); }
        .rank-2 { background: linear-gradient(135deg, #e5e9ee, #cdd4dc); color: #566171; }
        .rank-3 { background: linear-gradient(135deg, #fbdcc8, #f2c2a3); color: #a15422; }

        .product-name {
          font-weight: 800;
          color: var(--text);
          font-size: 13.5px;
        }
        .product-code-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 11px;
          background: var(--purple-soft);
          color: var(--purple);
          border-radius: 8px;
          font-size: 12px;
          font-weight: 800;
          text-decoration: none;
          transition: all 0.22s ease;
        }
        .product-code-link:hover {
          background: var(--purple);
          color: #fff;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(124, 63, 143, 0.3);
        }
        .qty-text { color: var(--blue); font-size: 14px; font-weight: 900; }
        .revenue-text { color: var(--green); font-size: 14px; font-weight: 900; }

        /* EMPTY / SKELETON */
        .empty-state { padding: 70px 20px; text-align: center; }
        .empty-icon { font-size: 44px; margin-bottom: 12px; opacity: 0.45; }
        .empty-state h3 { margin: 0 0 6px; font-size: 16px; font-weight: 800; }
        .empty-state p { margin: 0; font-size: 12.5px; color: var(--text-muted); }

        .skeleton-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 14px;
        }
        .skeleton-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 20px;
          border-radius: 18px;
          background: var(--card);
          border: 1px solid var(--border);
        }
        .skeleton-icon {
          width: 50px;
          height: 50px;
          border-radius: 14px;
          flex-shrink: 0;
        }
        .skeleton-lines { flex: 1; }
        .skeleton-line {
          height: 12px;
          border-radius: 6px;
          margin-bottom: 8px;
        }
        .skeleton-line.short { width: 55%; }
        .skeleton-line.long { width: 80%; }
        .shimmer {
          background: linear-gradient(90deg, #f2eef1 25%, #e8e2e8 50%, #f2eef1 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 1280px) {
          .stats-grid, .skeleton-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }

        @media (max-width: 1024px) {
          .stats-grid, .skeleton-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        @media (max-width: 900px) {
          .sidebar {
            transform: translateX(-100%);
            box-shadow: none;
          }
          .sidebar.open {
            transform: translateX(0);
            box-shadow: 20px 0 60px rgba(20, 8, 15, 0.4);
          }
          .sidebar-close { display: block; }
          .sidebar-overlay { display: block; }
          .main-content {
            margin-left: 0;
            width: 100%;
            padding: 20px 16px 50px;
          }
          .hamburger { display: flex; }
        }

        @media (max-width: 640px) {
          .stats-grid, .skeleton-grid { grid-template-columns: 1fr; }
          h1 { font-size: 24px; }
          .filter-body { flex-direction: column; align-items: stretch; }
          .field-group { min-width: 100%; }
          .quick-filters { width: 100%; }
          .quick-filters button { flex: 1; padding: 0 10px; font-size: 12px; }
          .stat-value { font-size: 20px; }
          .products-header { padding: 18px; }
          .products-table thead th,
          .products-table tbody td { padding: 12px 14px; }
          .products-header h2 { font-size: 16px; }
          .topbar-badge { display: none; }
        }

        @media (max-width: 400px) {
          .stat-card { padding: 16px; }
          .stat-icon-wrap { width: 44px; height: 44px; font-size: 19px; }
        }
      `}</style>
    </div>
  );
}