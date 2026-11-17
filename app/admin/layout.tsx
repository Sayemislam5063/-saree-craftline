"use client";

import "./admin-mobile.css";
import { createContext, useContext, useState, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const SidebarContext = createContext({
  openSidebar: () => {},
  closeSidebar: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  const openSidebar = () => setIsSidebarOpen(true);
  const closeSidebar = () => setIsSidebarOpen(false);

  const menuItems = [
    { name: "Dashboard", path: "/admin", icon: "📊" },
    { name: "Products", path: "/admin/products", icon: "🛍️" },
    { name: "Categories", path: "/admin/categories", icon: "🗂️" },
    { name: "Orders", path: "/admin/orders", icon: "📦" },
    { name: "Settings", path: "/admin/settings", icon: "⚙️" },
  ];

  return (
    <SidebarContext.Provider value={{ openSidebar, closeSidebar }}>
      <div className="layout-shell">
        {/* মোবাইল ওভারলে */}
        <div
          className={`layout-overlay ${isSidebarOpen ? "show" : ""}`}
          onClick={closeSidebar}
        />

        {/* গ্লোবাল সাইডবার */}
        <aside className={`layout-sidebar ${isSidebarOpen ? "open" : ""}`}>
          <div className="layout-brand">
            <div className="layout-logo">SC</div>
            <div className="layout-brand-text">
              <div className="layout-brand-name">Saree Craftline</div>
              <div className="layout-brand-subtitle">Admin Panel</div>
            </div>
            <button
              className="layout-sidebar-close"
              onClick={closeSidebar}
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>

          <div className="layout-menu-title">MAIN MENU</div>
          <nav className="layout-menu">
            {menuItems.map((item) => {
              const isActive =
                item.path === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.path);

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`layout-menu-item ${isActive ? "active" : ""}`}
                  onClick={closeSidebar}
                >
                  <span className="layout-menu-icon">{item.icon}</span>
                  <span className="layout-menu-label">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="layout-sidebar-bottom">
            <Link href="/" className="layout-view-store">
              <span>🛒</span> <span>View Store</span>
            </Link>
          </div>
        </aside>

        {/* মেইন কন্টেন্ট এরিয়া */}
        <div className="layout-main-wrapper">
          <div className="layout-mobile-header">
            <button
              className="layout-hamburger"
              onClick={openSidebar}
              aria-label="Open menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
            <span className="layout-mobile-title">Admin Panel</span>
          </div>

          <main className="layout-main-content">
            {/* 
              ✨ ম্যাজিক সিএসএস ✨
              এটি আপনার অন্যান্য পেজের (Dashboard, Products) পুরনো সাইডবার 
              এবং এক্সট্রা গ্যাপগুলোকে অটোমেটিক লুকিয়ে ফেলবে। 
            */}
            <style>{`
              .layout-main-content aside.sidebar,
              .layout-main-content .hamburger {
                display: none !important;
              }

              .layout-main-content > .admin-page,
              .layout-main-content > .admin-shell {
                background: transparent !important;
                display: block !important;
                padding: 0 !important;
                margin: 0 !important;
                min-height: auto !important;
                width: 100% !important;
              }

              .layout-main-content .admin-page > .main-content,
              .layout-main-content .admin-page > .content,
              .layout-main-content .admin-shell > .main-content {
                margin-left: 0 !important;
                width: 100% !important;
                padding: 0 !important;
                min-height: auto !important;
              }
            `}</style>

            {children}
          </main>
        </div>
      </div>

      {/* গ্লোবাল ডিজাইন সিএসএস */}
      <style>{`
        * { box-sizing: border-box; }
        :root {
          --accent: #64172f;
          --bg: #f6f4f7;
          --text: #241d22;
          --text-muted: #9b8d95;
          --border: #ece7ee;
        }
        body { margin: 0; padding: 0; }

        .layout-shell {
          min-height: 100vh;
          display: flex;
          background: radial-gradient(1200px 600px at 0% -10%, #f9eef2 0%, transparent 55%),
            radial-gradient(900px 500px at 100% 0%, #eef1fa 0%, transparent 50%),
            var(--bg);
          color: var(--text);
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        /* সাইডবার ডিজাইন */
        .layout-sidebar {
          width: 250px; height: 100vh; position: fixed; left: 0; top: 0;
          padding: 22px 16px; display: flex; flex-direction: column; color: #fff;
          background: radial-gradient(400px 300px at 0% 0%, rgba(138, 42, 74, 0.35), transparent 60%),
            linear-gradient(180deg, #251a20 0%, #1a1217 60%, #140d12 100%);
          z-index: 50; transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .layout-brand { display: flex; align-items: center; gap: 12px; padding-bottom: 22px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
        .layout-logo { width: 46px; height: 46px; border-radius: 14px; display: grid; place-items: center; font-size: 15px; font-weight: 800; background: linear-gradient(135deg, #8a2a4a, #5a1329); box-shadow: 0 8px 20px rgba(138, 42, 74, 0.45); }
        .layout-brand-text { flex: 1; }
        .layout-brand-name { font-size: 14px; font-weight: 800; margin-bottom: 2px; }
        .layout-brand-subtitle { font-size: 10px; color: #b7aab3; letter-spacing: 0.5px; }
        .layout-sidebar-close { display: none; background: transparent; border: none; color: #c7bcc4; font-size: 16px; cursor: pointer; padding: 6px; }
        
        .layout-menu-title { font-size: 9px; letter-spacing: 1.8px; color: #887983; font-weight: 800; margin: 24px 10px 12px; }
        .layout-menu { display: flex; flex-direction: column; gap: 6px; }
        .layout-menu-item { height: 46px; padding: 0 14px; border-radius: 12px; display: flex; align-items: center; gap: 13px; color: #c7bcc4; text-decoration: none; font-size: 13px; font-weight: 600; transition: all 0.22s ease; }
        .layout-menu-item:hover { background: rgba(255, 255, 255, 0.06); color: #fff; transform: translateX(3px); }
        .layout-menu-item.active { color: #fff; background: linear-gradient(90deg, rgba(138, 42, 74, 0.55), rgba(138, 42, 74, 0.12)); box-shadow: inset 3px 0 0 #8a2a4a, 0 6px 18px rgba(138, 42, 74, 0.25); }
        .layout-menu-icon { width: 20px; text-align: center; font-size: 16px; }
        
        .layout-sidebar-bottom { margin-top: auto; padding-top: 20px; }
        .layout-view-store { height: 46px; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 10px; color: #e2d7dd; text-decoration: none; font-size: 12px; font-weight: 700; transition: all 0.22s ease; }
        .layout-view-store:hover { background: rgba(255, 255, 255, 0.08); transform: translateY(-1px); }

        .layout-overlay { display: none; position: fixed; inset: 0; background: rgba(20, 8, 15, 0.55); backdrop-filter: blur(3px); z-index: 40; opacity: 0; pointer-events: none; transition: opacity 0.3s ease; }
        .layout-overlay.show { opacity: 1; pointer-events: auto; }

        .layout-main-wrapper { flex: 1; margin-left: 250px; width: calc(100% - 250px); min-width: 0; display: flex; flex-direction: column; }
        .layout-main-content { padding: 28px 30px 60px; width: 100%; animation: fadeUp 0.5s ease both; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

        .layout-mobile-header {
          display: none; align-items: center; gap: 12px; padding: 12px 16px;
          background: #ffffff; border-bottom: 1px solid var(--border);
          position: sticky; top: 0; z-index: 30;
        }
        .layout-hamburger {
          display: flex; flex-direction: column; justify-content: center; gap: 4px;
          width: 38px; height: 38px; border-radius: 10px; border: 1px solid var(--border);
          background: #fbfafc; cursor: pointer; padding: 0 9px;
        }
        .layout-hamburger span { display: block; height: 2px; border-radius: 2px; background: var(--accent); }
        .layout-mobile-title { font-size: 14px; font-weight: 800; color: var(--text); }

        @media (max-width: 900px) {
          .layout-sidebar { transform: translateX(-100%); box-shadow: none; }
          .layout-sidebar.open { transform: translateX(0); box-shadow: 20px 0 60px rgba(20, 8, 15, 0.4); }
          .layout-sidebar-close { display: block; }
          .layout-overlay { display: block; }
          .layout-main-wrapper { margin-left: 0; width: 100%; }
          .layout-main-content { padding: 16px 16px 50px; }
          .layout-mobile-header { display: flex; }
        }
      `}</style>
    </SidebarContext.Provider>
  );
}