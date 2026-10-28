"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase/supabase-client"; // আপনার পাথ অনুযায়ী চেক করে নিন

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
    // ১. তারিখ অনুযায়ী অর্ডার ফিল্টার
    const start = new Date(fromDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);

    const filteredOrders = orders.filter((order) => {
      if (order.fraud_check_status === "blocked") return false; // ফ্রড অর্ডার বাদ
      const orderDate = new Date(order.created_at || order.order_date);
      return orderDate >= start && orderDate <= end;
    });

    // ২. বেসিক স্ট্যাটস
    let totalSales = 0;
    let totalCost = 0;
    let totalProfit = 0;
    
    const productStats: Record<string, { id: string; name: string; qty: number; revenue: number }> = {};

    filteredOrders.forEach((order) => {
      const orderTotal = Number(order.total || 0);
      const orderCost = Number(order.cost_total || 0);
      
      totalSales += orderTotal;
      totalCost += orderCost;
      totalProfit += (orderTotal - orderCost);

      // ৩. প্রোডাক্ট ভিত্তিক বিক্রি (Top Selling)
      if (Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const pId = item.productId || item.id || item.name;
          const pName = item.productName || item.name || "Unknown Product";
          
          if (!productStats[pId]) {
            productStats[pId] = { id: pId, name: pName, qty: 0, revenue: 0 };
          }
          
          productStats[pId].qty += Number(item.quantity || 1);
          productStats[pId].revenue += Number(item.totalPrice || (item.unitPrice * item.quantity) || 0);
        });
      }
    });

    // সবচেয়ে বেশি বিক্রি হওয়া প্রোডাক্টগুলো সর্ট করা (Top 10)
    const topProducts = Object.values(productStats)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    return {
      totalOrders: filteredOrders.length,
      totalSales,
      totalCost,
      totalProfit,
      topProducts,
    };
  }, [orders, fromDate, toDate]);

  return (
    <div className="admin-page">
      {/* SIDEBAR */}
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
          <Link href="/admin" className="menu-item active"><span className="menu-icon">📊</span><span>Dashboard</span></Link>
          <Link href="/admin/products" className="menu-item"><span className="menu-icon">🛍️</span><span>Products</span></Link>
          <Link href="/admin/categories" className="menu-item"><span className="menu-icon">📁</span><span>Categories</span></Link>
          <Link href="/admin/orders" className="menu-item"><span className="menu-icon">📦</span><span>Orders</span></Link>
          <Link href="/admin/settings" className="menu-item"><span className="menu-icon">⚙️</span><span>Settings</span></Link>
        </nav>
        <div className="sidebar-bottom">
          <Link href="/" className="view-store"><span>🛒</span> View Store</Link>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <div className="top-header">
          <div>
            <div className="eyebrow">OVERVIEW</div>
            <h1>Dashboard</h1>
          </div>
        </div>

        {/* ✨ প্রফেশনাল ও বড় ডেট ফিল্টার */}
        <div className="date-filter-card">
          <div className="filter-header">
            <span className="filter-icon">📅</span>
            <h3>Report Date Range</h3>
          </div>
          <div className="filter-inputs">
            <div className="input-group">
              <label>From Date</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="input-group">
              <label>To Date</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <div className="quick-filters">
              <button onClick={() => { setFromDate(today); setToDate(today); }}>Today</button>
              <button onClick={() => {
                const d = new Date(); d.setDate(d.getDate() - 7);
                setFromDate(d.toISOString().split("T")[0]); setToDate(today);
              }}>Last 7 Days</button>
              <button onClick={() => {
                const d = new Date(); d.setDate(1);
                setFromDate(d.toISOString().split("T")[0]); setToDate(today);
              }}>This Month</button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        {isLoading ? (
          <div className="loading-box">Loading Dashboard Data...</div>
        ) : (
          <>
            <div className="stats-grid">
              <div className="stat-card sales">
                <div className="stat-icon">💰</div>
                <div>
                  <div className="stat-label">TOTAL SALES</div>
                  <div className="stat-value">৳ {dashboardData.totalSales.toLocaleString("en-BD")}</div>
                </div>
              </div>
              <div className="stat-card profit">
                <div className="stat-icon">📈</div>
                <div>
                  <div className="stat-label">NET PROFIT</div>
                  <div className="stat-value">৳ {dashboardData.totalProfit.toLocaleString("en-BD")}</div>
                </div>
              </div>
              <div className="stat-card orders">
                <div className="stat-icon">📦</div>
                <div>
                  <div className="stat-label">TOTAL ORDERS</div>
                  <div className="stat-value">{dashboardData.totalOrders}</div>
                </div>
              </div>
              <div className="stat-card cost">
                <div className="stat-icon">📉</div>
                <div>
                  <div className="stat-label">PURCHASE COST</div>
                  <div className="stat-value">৳ {dashboardData.totalCost.toLocaleString("en-BD")}</div>
                </div>
              </div>
            </div>

            {/* ✨ Top Selling Products */}
            <div className="top-products-card">
              <div className="card-header">
                <div>
                  <div className="section-label">PERFORMANCE</div>
                  <h2>Top Selling Products</h2>
                  <p>সিলেক্ট করা তারিখের সবচেয়ে বেশি বিক্রি হওয়া পণ্য</p>
                </div>
              </div>

              {dashboardData.topProducts.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📉</div>
                  <h3>No Sales Data</h3>
                  <p>এই তারিখের মধ্যে কোনো সেলস ডেটা পাওয়া যায়নি।</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="top-products-table">
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
                        <tr key={index}>
                          <td>
                            <span className={`rank-badge rank-${index + 1}`}>{index + 1}</span>
                          </td>
                          <td className="product-name">
                            {product.name}
                          </td>
                          <td>
                            {/* ✨ প্রোডাক্ট কোডে ক্লিক করলে এডিট পেজে যাবে */}
                            <Link 
                              href={`/admin/products/new?edit=${product.id}`}
                              className="product-code-link"
                            >
                              🔗 {product.id?.substring(0, 8) || "N/A"}
                            </Link>
                          </td>
                          <td>
                            <strong className="qty-text">{product.qty} pcs</strong>
                          </td>
                          <td>
                            <strong className="revenue-text">৳ {product.revenue.toLocaleString("en-BD")}</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <style>{`
        * { box-sizing: border-box; }

        .admin-page {
          min-height: 100vh;
          display: flex;
          background: radial-gradient(circle at top left, #fdf4f8 0%, #f8f5f7 40%, #f4f1f5 100%);
          color: #29232a;
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        /* SIDEBAR STYLES (আগের মতোই) */
        .sidebar { width: 230px; min-height: 100vh; background: linear-gradient(180deg, #251c22 0%, #1a1318 55%, #150f14 100%); color: white; padding: 22px 15px; position: fixed; left: 0; top: 0; bottom: 0; display: flex; flex-direction: column; z-index: 10; }
        .brand { display: flex; align-items: center; gap: 11px; padding: 0 6px 22px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
        .logo { width: 43px; height: 43px; border-radius: 13px; background: linear-gradient(135deg, #d66f99, #b14f79); display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 800; }
        .brand-name { font-size: 13px; font-weight: 800; margin-bottom: 3px; }
        .brand-subtitle { font-size: 10px; color: #b7aab3; }
        .menu-title { font-size: 9px; letter-spacing: 1.5px; color: #887983; font-weight: 800; margin: 24px 8px 12px; }
        .menu { display: flex; flex-direction: column; gap: 5px; }
        .menu-item { height: 43px; padding: 0 13px; border-radius: 11px; display: flex; align-items: center; gap: 12px; color: #c7bcc4; text-decoration: none; font-size: 12px; font-weight: 700; transition: 0.2s; }
        .menu-item:hover { background: rgba(255, 255, 255, 0.06); color: white; }
        .menu-item.active { color: white; background: linear-gradient(90deg, rgba(177, 79, 121, 0.34), rgba(177, 79, 121, 0.15)); box-shadow: inset 3px 0 0 #d56e98; }
        .menu-icon { width: 18px; text-align: center; font-size: 15px; }
        .sidebar-bottom { margin-top: auto; padding-top: 20px; }
        .view-store { height: 42px; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; display: flex; align-items: center; justify-content: center; gap: 9px; color: #d7cdd4; text-decoration: none; font-size: 11px; font-weight: 700; }
        .view-store:hover { background: rgba(255, 255, 255, 0.08); }

        /* MAIN CONTENT */
        .main-content { margin-left: 230px; width: calc(100% - 230px); padding: 32px 27px 50px; }
        .top-header { margin-bottom: 25px; }
        .eyebrow { color: #b14f79; font-size: 9px; letter-spacing: 1.7px; font-weight: 900; margin-bottom: 6px; }
        h1 { margin: 0; font-size: 29px; background: linear-gradient(135deg, #29232a, #6b3d55); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 900; }

        /* ✨ প্রফেশনাল ডেট ফিল্টার */
        .date-filter-card {
          background: white;
          border: 1px solid #eee7eb;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 24px;
          box-shadow: 0 6px 20px rgba(45, 25, 38, 0.04);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .filter-header { display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #f0e7eb; padding-bottom: 12px; }
        .filter-icon { font-size: 18px; }
        .filter-header h3 { margin: 0; font-size: 15px; font-weight: 800; color: #392f35; }
        
        .filter-inputs { display: flex; align-items: flex-end; gap: 15px; flex-wrap: wrap; }
        .input-group { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 200px; }
        .input-group label { font-size: 11px; font-weight: 800; color: #8f8088; text-transform: uppercase; }
        .input-group input { height: 44px; padding: 0 14px; border: 1px solid #eadfe5; border-radius: 10px; outline: none; font-size: 13px; color: #332b31; font-weight: 600; transition: 0.2s; }
        .input-group input:focus { border-color: #a9416e; box-shadow: 0 0 0 3px rgba(169, 65, 110, 0.1); }
        
        .quick-filters { display: flex; gap: 8px; }
        .quick-filters button { height: 44px; padding: 0 16px; border: 1px solid #eadfe5; background: #fdfafb; border-radius: 10px; font-size: 12px; font-weight: 700; color: #6b5b63; cursor: pointer; transition: 0.2s; }
        .quick-filters button:hover { background: #f3e8ed; border-color: #d9b8c8; color: #a9416e; }

        /* STATS GRID */
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
        .stat-card { background: white; border: 1px solid #eee7eb; border-radius: 16px; padding: 20px; display: flex; align-items: center; gap: 15px; box-shadow: 0 6px 20px rgba(45, 25, 38, 0.04); transition: 0.2s; }
        .stat-card:hover { transform: translateY(-3px); box-shadow: 0 12px 25px rgba(45, 25, 38, 0.08); }
        .stat-icon { width: 48px; height: 48px; border-radius: 14px; display: grid; place-items: center; font-size: 22px; }
        .stat-card.sales .stat-icon { background: #eef8f3; }
        .stat-card.profit .stat-icon { background: #e8f4fc; }
        .stat-card.orders .stat-icon { background: #fff5df; }
        .stat-card.cost .stat-icon { background: #fde8e8; }
        
        .stat-label { font-size: 10px; color: #9b8d95; font-weight: 900; letter-spacing: 1px; margin-bottom: 5px; }
        .stat-value { font-size: 22px; font-weight: 900; color: #241d22; }
        .stat-card.sales .stat-value { color: #1f6a42; }
        .stat-card.profit .stat-value { color: #1a73e8; }

        /* TOP PRODUCTS CARD */
        .top-products-card { background: white; border: 1px solid #eee7eb; border-radius: 20px; box-shadow: 0 6px 20px rgba(45, 25, 38, 0.04); overflow: hidden; }
        .card-header { padding: 20px 24px; border-bottom: 1px solid #f0e7eb; background: linear-gradient(135deg, #fff, #fdfafb); }
        .section-label { font-size: 9px; color: #b14f79; font-weight: 900; letter-spacing: 1.5px; margin-bottom: 4px; }
        .card-header h2 { margin: 0; font-size: 18px; font-weight: 900; color: #2b1f26; }
        .card-header p { margin: 4px 0 0; font-size: 12px; color: #8f8088; }

        .table-responsive { width: 100%; overflow-x: auto; }
        .top-products-table { width: 100%; border-collapse: collapse; text-align: left; }
        .top-products-table th { padding: 14px 24px; font-size: 11px; font-weight: 800; color: #8f8088; text-transform: uppercase; background: #fdfafb; border-bottom: 1px solid #f0e7eb; }
        .top-products-table td { padding: 16px 24px; border-bottom: 1px solid #f6f0f3; vertical-align: middle; }
        .top-products-table tr:last-child td { border-bottom: 0; }
        .top-products-table tr:hover { background: #fdfafb; }

        .rank-badge { width: 24px; height: 24px; display: grid; place-items: center; border-radius: 6px; background: #f1edf0; color: #6b5b63; font-size: 12px; font-weight: 900; }
        .rank-1 { background: #ffeaa7; color: #d6a000; }
        .rank-2 { background: #e2e6ea; color: #5f6c7b; }
        .rank-3 { background: #fce4d6; color: #c0683d; }

        .product-name { font-weight: 800; color: #392f35; font-size: 14px; }
        
        .product-code-link { display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; background: #f3e8ff; color: #7c3f8f; border-radius: 6px; font-size: 12px; font-weight: 800; text-decoration: none; transition: 0.2s; }
        .product-code-link:hover { background: #e5d1f8; transform: translateY(-1px); }

        .qty-text { color: #2f6bff; font-size: 15px; font-weight: 900; }
        .revenue-text { color: #1f6a42; font-size: 15px; font-weight: 900; }

        /* EMPTY STATE */
        .empty-state { padding: 60px 20px; text-align: center; }
        .empty-icon { font-size: 40px; margin-bottom: 10px; opacity: 0.5; }
        .empty-state h3 { margin: 0 0 6px; font-size: 16px; font-weight: 800; }
        .empty-state p { margin: 0; font-size: 12px; color: #8f8088; }

        .loading-box { text-align: center; padding: 50px; color: #8f8088; font-weight: 600; font-size: 14px; }

        /* RESPONSIVE */
        @media (max-width: 1024px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 760px) {
          .sidebar { width: 72px; padding: 18px 9px; }
          .brand { justify-content: center; padding-left: 0; padding-right: 0; }
          .brand > div:last-child, .menu-title, .menu-item span:last-child, .view-store { display: none; }
          .menu-item { justify-content: center; padding: 0; }
          .main-content { margin-left: 72px; width: calc(100% - 72px); padding: 24px 15px 40px; }
          .filter-inputs { flex-direction: column; align-items: stretch; }
          .quick-filters { width: 100%; }
          .quick-filters button { flex: 1; padding: 0; }
          .top-products-table th, .top-products-table td { padding: 12px 15px; }
        }
        @media (max-width: 500px) { .stats-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}