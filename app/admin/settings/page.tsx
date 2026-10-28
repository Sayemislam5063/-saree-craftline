"use client";

import Link from "next/link";

export default function SettingsPage() {
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
          <Link href="/admin" className="menu-item">
            <span className="menu-icon">📊</span>
            <span>Dashboard</span>
          </Link>

          <Link href="/admin/products" className="menu-item">
            <span className="menu-icon">🛍️</span>
            <span>Products</span>
          </Link>

          <Link href="/admin/categories" className="menu-item">
            <span className="menu-icon">📁</span>
            <span>Categories</span>
          </Link>

          <Link href="/admin/orders" className="menu-item">
            <span className="menu-icon">📦</span>
            <span>Orders</span>
          </Link>

          <Link
            href="/admin/settings"
            className="menu-item active"
          >
            <span className="menu-icon">⚙️</span>
            <span>Settings</span>
          </Link>
        </nav>

        <div className="sidebar-bottom">
          <Link href="/" className="view-store">
            <span>🛒</span>
            View Store
          </Link>
        </div>
      </aside>

      <main className="main-content">
        <div className="top-header">
          <div>
            <div className="eyebrow">SAREE CRAFTLINE</div>
            <h1>Settings</h1>
          </div>
        </div>

        <section className="settings-card">
          <div className="section-header">
            <div>
              <div className="section-label">STORE SETTINGS</div>
              <h2>Store Information</h2>
              <p>
                Manage the basic information of your Saree
                Craftline store.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label>Store Name</label>
              <input
                type="text"
                defaultValue="Saree Craftline"
                placeholder="Enter store name"
              />
            </div>

            <div className="field">
              <label>WhatsApp Number</label>
              <input
                type="text"
                defaultValue="01904872658"
                placeholder="Enter WhatsApp number"
              />
            </div>

            <div className="field full">
              <label>Email Address</label>
              <input
                type="email"
                defaultValue="sareecraftline@gmail.com"
                placeholder="Enter email address"
              />
            </div>
          </div>
        </section>

        <section className="settings-card">
          <div className="section-header">
            <div>
              <div className="section-label">
                DELIVERY SETTINGS
              </div>
              <h2>Delivery Charges</h2>
              <p>
                Set the delivery charge for different
                delivery areas.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label>Inside Dhaka</label>

              <div className="input-with-symbol">
                <span>৳</span>
                <input
                  type="number"
                  defaultValue="80"
                  min="0"
                />
              </div>
            </div>

            <div className="field">
              <label>Outside Dhaka</label>

              <div className="input-with-symbol">
                <span>৳</span>
                <input
                  type="number"
                  defaultValue="130"
                  min="0"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="settings-card">
          <div className="section-header">
            <div>
              <div className="section-label">
                PAYMENT SETTINGS
              </div>
              <h2>Payment Method</h2>
              <p>
                Currently available payment method for
                customer orders.
              </p>
            </div>
          </div>

          <div className="payment-option">
            <div className="payment-icon">💵</div>

            <div>
              <strong>Cash on Delivery</strong>
              <p>Customer pays when the order is delivered.</p>
            </div>

            <span className="enabled-badge">
              Enabled
            </span>
          </div>
        </section>

        <div className="save-area">
          <button
            type="button"
            className="save-button"
            onClick={() => {
              alert("Settings are ready to be connected!");
            }}
          >
            Save Settings
          </button>
        </div>
      </main>

      <style>{`
        * {
          box-sizing: border-box;
        }

        .admin-page {
          min-height: 100vh;
          display: flex;
          background: #f8f5f7;
          color: #29232a;
        }

        .sidebar {
          width: 230px;
          min-height: 100vh;
          background: linear-gradient(
            180deg,
            #241923 0%,
            #19131a 100%
          );
          color: white;
          padding: 22px 15px;
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          z-index: 10;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 0 6px 22px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .logo {
          width: 43px;
          height: 43px;
          border-radius: 13px;
          background: linear-gradient(
            135deg,
            #d66f99,
            #b14f79
          );
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          font-weight: 800;
          box-shadow: 0 8px 20px rgba(177,79,121,0.25);
        }

        .brand-name {
          font-size: 13px;
          font-weight: 800;
          margin-bottom: 3px;
        }

        .brand-subtitle {
          font-size: 10px;
          color: #b7aab3;
        }

        .menu-title {
          font-size: 9px;
          letter-spacing: 1.5px;
          color: #887983;
          font-weight: 800;
          margin: 24px 8px 12px;
        }

        .menu {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .menu-item {
          height: 43px;
          padding: 0 13px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #c7bcc4;
          text-decoration: none;
          font-size: 12px;
          font-weight: 700;
          transition: 0.2s ease;
        }

        .menu-item:hover {
          background: rgba(255,255,255,0.06);
          color: white;
        }

        .menu-item.active {
          color: white;
          background: linear-gradient(
            90deg,
            rgba(177,79,121,0.32),
            rgba(177,79,121,0.15)
          );
          box-shadow:
            inset 3px 0 0 #d56e98,
            0 5px 15px rgba(0,0,0,0.08);
        }

        .menu-icon {
          width: 18px;
          text-align: center;
          font-size: 15px;
        }

        .sidebar-bottom {
          margin-top: auto;
          padding-top: 20px;
        }

        .view-store {
          height: 42px;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          color: #d7cdd4;
          text-decoration: none;
          font-size: 11px;
          font-weight: 700;
        }

        .view-store:hover {
          background: rgba(255,255,255,0.05);
        }

        .main-content {
          margin-left: 230px;
          width: calc(100% - 230px);
          padding: 32px 27px 50px;
          min-height: 100vh;
        }

        .top-header {
          margin-bottom: 25px;
        }

        .eyebrow {
          color: #b14f79;
          font-size: 9px;
          letter-spacing: 1.7px;
          font-weight: 900;
          margin-bottom: 6px;
        }

        h1 {
          margin: 0;
          font-size: 29px;
          line-height: 1.1;
          letter-spacing: -0.8px;
        }

        .settings-card {
          background: white;
          border: 1px solid #eee7eb;
          border-radius: 18px;
          padding: 22px;
          margin-bottom: 18px;
          box-shadow: 0 6px 20px rgba(45,25,38,0.035);
        }

        .section-header {
          padding-bottom: 18px;
          border-bottom: 1px solid #f0e9ed;
          margin-bottom: 20px;
        }

        .section-label {
          font-size: 8px;
          letter-spacing: 1.5px;
          color: #b14f79;
          font-weight: 900;
          margin-bottom: 5px;
        }

        .section-header h2 {
          margin: 0 0 5px;
          font-size: 17px;
        }

        .section-header p {
          margin: 0;
          color: #9b8d95;
          font-size: 11px;
          line-height: 1.6;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 17px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .field.full {
          grid-column: 1 / -1;
        }

        .field label {
          font-size: 10px;
          font-weight: 800;
          color: #51464e;
        }

        .field input {
          width: 100%;
          height: 43px;
          border: 1px solid #e7dde3;
          border-radius: 10px;
          padding: 0 13px;
          outline: none;
          font-size: 12px;
          color: #30282e;
          background: #fff;
        }

        .field input:focus {
          border-color: #c66b91;
          box-shadow: 0 0 0 3px rgba(177,79,121,0.08);
        }

        .input-with-symbol {
          height: 43px;
          border: 1px solid #e7dde3;
          border-radius: 10px;
          display: flex;
          align-items: center;
          overflow: hidden;
        }

        .input-with-symbol span {
          width: 38px;
          text-align: center;
          color: #9b8d95;
          font-weight: 800;
          font-size: 12px;
        }

        .input-with-symbol input {
          border: 0;
          height: 100%;
          border-radius: 0;
          padding-left: 0;
        }

        .payment-option {
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 15px;
          border: 1px solid #eee3e8;
          border-radius: 13px;
          background: #fdfbfc;
        }

        .payment-icon {
          width: 43px;
          height: 43px;
          border-radius: 12px;
          background: #eaf8ef;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 19px;
        }

        .payment-option strong {
          font-size: 12px;
        }

        .payment-option p {
          margin: 4px 0 0;
          font-size: 10px;
          color: #9b8d95;
        }

        .enabled-badge {
          margin-left: auto;
          padding: 6px 10px;
          border-radius: 20px;
          background: #eaf8ef;
          color: #3b8c58;
          font-size: 9px;
          font-weight: 900;
        }

        .save-area {
          display: flex;
          justify-content: flex-end;
          padding-bottom: 20px;
        }

        .save-button {
          border: 0;
          height: 43px;
          padding: 0 22px;
          border-radius: 11px;
          background: #b14f79;
          color: white;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(177,79,121,0.2);
        }

        .save-button:hover {
          background: #a4446d;
        }

        @media (max-width: 760px) {
          .sidebar {
            width: 72px;
            padding: 18px 9px;
          }

          .brand {
            justify-content: center;
            padding-left: 0;
            padding-right: 0;
          }

          .brand > div:last-child,
          .menu-title,
          .menu-item span:last-child,
          .view-store {
            display: none;
          }

          .menu-item {
            justify-content: center;
            padding: 0;
          }

          .main-content {
            margin-left: 72px;
            width: calc(100% - 72px);
            padding: 24px 15px 40px;
          }

          h1 {
            font-size: 25px;
          }
        }

        @media (max-width: 560px) {
          .form-grid {
            grid-template-columns: 1fr;
          }

          .field.full {
            grid-column: auto;
          }

          .payment-option {
            align-items: flex-start;
          }

          .enabled-badge {
            margin-left: auto;
          }
        }
      `}</style>
    </div>
  );
}