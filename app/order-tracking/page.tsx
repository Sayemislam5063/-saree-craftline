"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase/supabase-client";

export default function TrackOrderPage() {
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;

    setIsLoading(true);
    setSearched(true);
    setOrders([]);

    // ফোন নাম্বার ক্লিন করা (যেমন: +8801... কে 01... করা)
    let cleanPhone = phone.replace(/[\s-]/g, "");
    if (cleanPhone.startsWith("+880")) cleanPhone = "0" + cleanPhone.slice(4);
    if (cleanPhone.startsWith("880")) cleanPhone = "0" + cleanPhone.slice(3);

    // ডাটাবেস থেকে ওই ফোন নাম্বারের অর্ডার খোঁজা
    const { data, error } = await supabase
      .from("orders")
      .select("id, order_number, created_at, total, steadfast_delivery_status, steadfast_tracking_code, items, fraud_check_status")
      .eq("phone", cleanPhone)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setOrders(data);
    }
    setIsLoading(false);
  };

  // স্ট্যাটাস অনুযায়ী সুন্দর টেক্সট এবং কালার
  const getStatusInfo = (status: string, fraudStatus: string) => {
    if (fraudStatus === "blocked") {
      return { text: "বাতিল (Fraud)", color: "#d32f2f", bg: "#fee2e2", icon: "🚫" };
    }
    switch (status) {
      case "pending":
        return { text: "প্রসেসিং হচ্ছে", color: "#a05a00", bg: "#ffe5c7", icon: "⏳" };
      case "in_review":
        return { text: "কুরিয়ারে রিভিউতে আছে", color: "#856404", bg: "#fff3cd", icon: "🔍" };
      case "delivered":
        return { text: "ডেলিভারি সম্পন্ন", color: "#155724", bg: "#d4edda", icon: "✅" };
      case "cancelled":
      case "returned":
        return { text: "বাতিল / ফেরত", color: "#721c24", bg: "#f8d7da", icon: "❌" };
      default:
        return { text: "প্রসেসিং হচ্ছে", color: "#6c757d", bg: "#f1edf0", icon: "📦" };
    }
  };

  return (
    <main className="track-page">
      <div className="container">
        <div className="header">
          <Link href="/" className="back-link">← হোমপেজে ফিরে যান</Link>
          <h1>অর্ডার ট্র্যাক করুন</h1>
          <p>আপনার মোবাইল নাম্বারটি দিন এবং আপনার পার্সেলের সর্বশেষ অবস্থা জেনে নিন।</p>
        </div>

        <form onSubmit={handleSearch} className="search-form">
          <div className="input-group">
            <span className="icon">📞</span>
            <input
              type="tel"
              placeholder="আপনার মোবাইল নাম্বার (যেমন: 017XXXXXXXX)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={isLoading}>
            {isLoading ? "খোঁজা হচ্ছে..." : "সার্চ করুন"}
          </button>
        </form>

        {/* সার্চ রেজাল্ট */}
        {searched && !isLoading && (
          <div className="results-section">
            {orders.length === 0 ? (
              <div className="no-result">
                <div className="empty-icon">🔍</div>
                <h3>কোনো অর্ডার পাওয়া যায়নি</h3>
                <p>এই নাম্বার দিয়ে কোনো অর্ডার করা হয়নি। নাম্বারটি চেক করে আবার চেষ্টা করুন।</p>
              </div>
            ) : (
              <div className="orders-list">
                <h3>আপনার অর্ডারসমূহ ({orders.length})</h3>
                {orders.map((order) => {
                  const statusInfo = getStatusInfo(order.steadfast_delivery_status, order.fraud_check_status);
                  
                  return (
                    <div className="order-card" key={order.id}>
                      <div className="order-header">
                        <div>
                          <span className="order-num">অর্ডার: {order.order_number}</span>
                          <span className="order-date">
                            তারিখ: {new Date(order.created_at).toLocaleDateString("bn-BD", { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="status-badge" style={{ background: statusInfo.bg, color: statusInfo.color }}>
                          {statusInfo.icon} {statusInfo.text}
                        </div>
                      </div>

                      <div className="order-body">
                        <div className="order-items">
                          {Array.isArray(order.items) && order.items.map((item: any, idx: number) => (
                            <div className="item-row" key={idx}>
                              <span>{item.name || item.productName} (x{item.quantity})</span>
                            </div>
                          ))}
                        </div>
                        <div className="order-total">
                          <span>মোট বিল:</span>
                          <strong>৳ {Number(order.total).toLocaleString("bn-BD")}</strong>
                        </div>
                      </div>

                      {order.steadfast_tracking_code && (
                        <div className="tracking-info">
                          <span>ট্র্যাকিং কোড: <strong>{order.steadfast_tracking_code}</strong></span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .track-page {
          min-height: 80vh;
          padding: 40px 20px 80px;
          background: radial-gradient(circle at top left, rgba(255, 230, 239, 0.6), transparent 40%), #fff;
          font-family: "Inter", sans-serif;
        }
        .container {
          max-width: 700px;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .back-link {
          display: inline-block;
          margin-bottom: 20px;
          color: #a9416e;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
        }
        .back-link:hover { text-decoration: underline; }
        .header h1 {
          font-size: 28px;
          font-weight: 900;
          color: #2b1f26;
          margin: 0 0 10px;
        }
        .header p {
          color: #88757d;
          font-size: 14px;
          margin: 0;
        }
        .search-form {
          display: flex;
          gap: 10px;
          background: white;
          padding: 20px;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(83, 53, 66, 0.08);
          border: 1px solid #eadde3;
        }
        .input-group {
          flex: 1;
          display: flex;
          align-items: center;
          background: #fdfafb;
          border: 1px solid #eadfe5;
          border-radius: 12px;
          padding: 0 15px;
        }
        .input-group .icon {
          font-size: 18px;
          margin-right: 10px;
        }
        .input-group input {
          width: 100%;
          height: 50px;
          border: none;
          background: transparent;
          outline: none;
          font-size: 15px;
          color: #332b31;
        }
        .search-form button {
          height: 50px;
          padding: 0 30px;
          background: #a9416e;
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 800;
          font-size: 14px;
          cursor: pointer;
          transition: 0.2s;
          white-space: nowrap;
        }
        .search-form button:hover:not(:disabled) {
          background: #8f345b;
          transform: translateY(-2px);
        }
        .search-form button:disabled {
          opacity: 0.7;
        }

        .results-section {
          margin-top: 30px;
        }
        .no-result {
          text-align: center;
          background: white;
          padding: 40px 20px;
          border-radius: 20px;
          border: 1px dashed #d9b8c8;
        }
        .empty-icon {
          font-size: 40px;
          margin-bottom: 10px;
        }
        .no-result h3 {
          margin: 0 0 5px;
          color: #392f35;
        }
        .no-result p {
          margin: 0;
          color: #88757d;
          font-size: 13px;
        }

        .orders-list h3 {
          font-size: 16px;
          color: #2b1f26;
          margin-bottom: 15px;
        }
        .order-card {
          background: white;
          border: 1px solid #eadfe5;
          border-radius: 16px;
          margin-bottom: 15px;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0,0,0,0.02);
        }
        .order-header {
          padding: 15px 20px;
          background: #fdfafb;
          border-bottom: 1px solid #eadfe5;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }
        .order-num {
          display: block;
          font-size: 13px;
          font-weight: 800;
          color: #a9416e;
          margin-bottom: 3px;
        }
        .order-date {
          font-size: 11px;
          color: #88757d;
        }
        .status-badge {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .order-body {
          padding: 15px 20px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 15px;
        }
        .order-items {
          flex: 1;
        }
        .item-row {
          font-size: 13px;
          color: #4b3b43;
          margin-bottom: 5px;
        }
        .order-total {
          text-align: right;
        }
        .order-total span {
          display: block;
          font-size: 11px;
          color: #88757d;
          margin-bottom: 3px;
        }
        .order-total strong {
          font-size: 18px;
          color: #a9416e;
          font-weight: 900;
        }
        .tracking-info {
          padding: 10px 20px;
          background: #eef8f3;
          border-top: 1px solid #c1e8d1;
          font-size: 12px;
          color: #1f6a42;
        }

        @media (max-width: 600px) {
          .search-form { flex-direction: column; }
          .search-form button { width: 100%; }
          .order-body { flex-direction: column; align-items: flex-start; }
          .order-total { text-align: left; width: 100%; border-top: 1px dashed #eee; padding-top: 10px; }
        }
      `}</style>
    </main>
  );
}