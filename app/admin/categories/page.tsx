"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase/supabase-client";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
const [deletingId, setDeletingId] = useState<string | null>(null);

const deleteCategory = async (id: string) => {
  const confirmed = window.confirm(
    "আপনি কি এই category টি delete করতে চান?"
  );

  if (!confirmed) return;

  setDeletingId(id);

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Category delete error:", error);
    alert("Category delete করা যায়নি।");
    setDeletingId(null);
    return;
  }

  setCategories((currentCategories) =>
    currentCategories.filter((category) => category.id !== id)
  );

  setDeletingId(null);
};

  useEffect(() => {
    const loadCategories = async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) {
        console.error("Category load error:", error);
        return;
      }

      setCategories(data ?? []);
      setIsLoading(false);
    };

    loadCategories();
  }, []);

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

          <Link
            href="/admin/categories"
            className="menu-item active"
          >
            <span className="menu-icon">📁</span>
            <span>Categories</span>
          </Link>

          <Link href="/admin/orders" className="menu-item">
            <span className="menu-icon">📦</span>
            <span>Orders</span>
          </Link>

          <Link href="/admin/settings" className="menu-item">
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
            <h1>Categories</h1>
          </div>

          <Link href="/admin/categories/new" className="add-button">
            <span>＋</span>
            Add Category
          </Link>
        </div>

        <div className="search-card">
          <div className="search-box">
            <span>⌕</span>
<input
  type="text"
  placeholder="Search category..."
  value={search}
  onChange={(event) => setSearch(event.target.value)}
/>
          </div>
        </div>

        <section className="management-card">
          <div className="card-header">
            <div>
              <div className="section-label">CATEGORY MANAGEMENT</div>
              <h2>All Categories</h2>
            </div>

<div className="category-count">
  {categories.length} Categories
</div>
          </div>

{isLoading ? (
  <div className="category-loading">
    <div className="loading-spinner"></div>
    <h3>Loading Categories...</h3>
    <p>দয়া করে একটু অপেক্ষা করুন...</p>
  </div>
) : categories.length === 0 ? (
  <div className="empty-state">
    <div className="empty-icon">📁</div>

    <h3>No Categories Yet</h3>

    <p>
      Create your first saree category to organize
      your products.
    </p>

    <Link
      href="/admin/categories/new"
      className="empty-button"
    >
      ＋ Add Your First Category
    </Link>
  </div>
) : (
  <div className="category-list">
    {categories
      .filter((category) =>
        category.name
          .toLowerCase()
          .includes(search.toLowerCase())
      )
      .map((category, index) => (
        <div
          className="category-row"
          key={category.id}
          style={{
            animationDelay: `${index * 0.05}s`,
          }}
        >
          <div className="category-info">
            {category.image_url ? (
              <img
                src={category.image_url}
                alt={category.name}
                className="category-image"
              />
            ) : (
              <div className="category-image-placeholder">
                📁
              </div>
            )}

            <div>
              <h3>{category.name}</h3>
              <p>{category.slug}</p>
            </div>
          </div>

          <span className="category-status">
            Active
          </span>

          <div className="category-actions">
            <Link
              href={`/admin/categories/new?edit=${category.id}`}
              className="edit-category-button"
            >
              ✎ Edit
            </Link>

            <button
              type="button"
              className="delete-category-button"
              onClick={() => deleteCategory(category.id)}
              disabled={deletingId === category.id}
            >
              {deletingId === category.id ? (
                <>
                  <span className="btn-spinner"></span>
                  Deleting...
                </>
              ) : (
                <>🗑 Delete</>
              )}
            </button>
          </div>
        </div>
      ))}
  </div>
)}

        </section>
      </main>

      <style>{`
        * {
          box-sizing: border-box;
        }

        .admin-page {
          min-height: 100vh;
          display: flex;
          background:
            radial-gradient(
              circle at top left,
              #fdf4f8 0%,
              #f8f5f7 40%,
              #f4f1f5 100%
            );
          color: #29232a;
          font-family:
            "Inter",
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Roboto,
            sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        /* =========================
           SIDEBAR
        ========================= */

        .sidebar {
          width: 230px;
          min-height: 100vh;
          background: linear-gradient(
            180deg,
            #241923 0%,
            #1a1319 55%,
            #150f14 100%
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
          overflow: hidden;
        }

        .sidebar::before {
          content: "";
          position: absolute;
          top: -100px;
          right: -80px;
          width: 220px;
          height: 220px;
          border-radius: 50%;
          background:
            radial-gradient(
              circle,
              rgba(212, 125, 160, 0.2),
              transparent 70%
            );
          pointer-events: none;
        }

        .sidebar::after {
          content: "";
          position: absolute;
          bottom: -120px;
          left: -70px;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background:
            radial-gradient(
              circle,
              rgba(120, 80, 200, 0.12),
              transparent 70%
            );
          pointer-events: none;
        }

        .brand {
          position: relative;
          z-index: 1;
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
          animation: logoGlow 4s ease-in-out infinite;
        }

        @keyframes logoGlow {
          0%, 100% {
            box-shadow: 0 8px 20px rgba(177,79,121,0.25);
          }
          50% {
            box-shadow: 0 12px 28px rgba(177,79,121,0.45);
          }
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
          position: relative;
          z-index: 1;
          font-size: 9px;
          letter-spacing: 1.5px;
          color: #887983;
          font-weight: 800;
          margin: 24px 8px 12px;
        }

        .menu {
          position: relative;
          z-index: 1;
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
          transition:
            background 0.25s ease,
            color 0.25s ease,
            transform 0.25s ease;
        }

        .menu-item:hover {
          background: rgba(255,255,255,0.06);
          color: white;
          transform: translateX(3px);
        }

        .menu-item.active {
          color: white;
          background: linear-gradient(
            90deg,
            rgba(177,79,121,0.34),
            rgba(177,79,121,0.15)
          );
          box-shadow:
            inset 3px 0 0 #d56e98,
            0 8px 20px rgba(182, 93, 131, 0.15);
        }

        .menu-icon {
          width: 18px;
          text-align: center;
          font-size: 15px;
        }

        .sidebar-bottom {
          position: relative;
          z-index: 1;
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
          transition: all 0.25s ease;
        }

        .view-store:hover {
          background: rgba(255,255,255,0.06);
          transform: translateY(-2px);
        }

        /* =========================
           MAIN CONTENT
        ========================= */

        .main-content {
          margin-left: 230px;
          width: calc(100% - 230px);
          padding: 32px 27px 50px;
          min-height: 100vh;
          animation: contentFade 0.5s ease-out;
        }

        @keyframes contentFade {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .top-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 28px;
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
          background: linear-gradient(135deg, #29232a, #6b3d55);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .add-button {
          height: 43px;
          padding: 0 18px;
          border-radius: 11px;
          background: linear-gradient(135deg, #b14f79, #a4446d);
          color: white;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
          font-weight: 800;
          box-shadow: 0 8px 20px rgba(177,79,121,0.22);
          transition:
            transform 0.3s cubic-bezier(0.34,1.56,0.64,1),
            box-shadow 0.3s ease;
        }

        .add-button:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 28px rgba(177,79,121,0.32);
        }

        /* =========================
           SEARCH
        ========================= */

        .search-card {
          background: white;
          border: 1px solid #eee7eb;
          border-radius: 17px;
          padding: 14px;
          margin-bottom: 18px;
          box-shadow: 0 5px 18px rgba(45,25,38,0.035);
          animation: cardRise 0.5s ease-out 0.05s backwards;
        }

        @keyframes cardRise {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .search-box {
          height: 41px;
          border: 1px solid #eadfe5;
          border-radius: 11px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 13px;
          color: #ad9da7;
          transition:
            border-color 0.25s ease,
            box-shadow 0.25s ease;
        }

        .search-box:focus-within {
          border-color: #c6819e;
          box-shadow: 0 0 0 3px rgba(198,129,158,0.12);
        }

        .search-box span {
          font-size: 20px;
          line-height: 1;
        }

        .search-box input {
          border: 0;
          outline: 0;
          width: 100%;
          font-size: 12px;
          color: #332b31;
          background: transparent;
        }

        .search-box input::placeholder {
          color: #b9adb4;
        }

        /* =========================
           MANAGEMENT CARD
        ========================= */

        .management-card {
          background: white;
          border: 1px solid #eee7eb;
          border-radius: 19px;
          overflow: hidden;
          min-height: 440px;
          box-shadow: 0 6px 20px rgba(45,25,38,0.035);
          animation: cardRise 0.5s ease-out 0.1s backwards;
        }

        .card-header {
          min-height: 72px;
          padding: 16px 20px;
          border-bottom: 1px solid #eee7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          background:
            linear-gradient(
              135deg,
              rgba(255,255,255,0.99),
              rgba(251,246,249,0.97)
            );
        }

        .section-label {
          font-size: 8px;
          letter-spacing: 1.5px;
          color: #b14f79;
          font-weight: 900;
          margin-bottom: 5px;
        }

        .card-header h2 {
          margin: 0;
          font-size: 17px;
        }

        .category-count {
          font-size: 11px;
          color: #9b8d95;
          font-weight: 700;
          padding: 6px 12px;
          border-radius: 20px;
          background: #f8eaf0;
          color: #a4446d;
        }

        /* =========================
           EMPTY STATE
        ========================= */

        .empty-state {
          min-height: 365px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 35px 20px;
          animation: cardRise 0.5s ease-out;
        }

        .empty-icon {
          width: 65px;
          height: 65px;
          border-radius: 18px;
          background: linear-gradient(135deg, #f8eaf0, #fbdcec);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 27px;
          margin-bottom: 17px;
          animation: iconFloat 3s ease-in-out infinite;
        }

        @keyframes iconFloat {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }

        .empty-state h3 {
          margin: 0 0 7px;
          font-size: 17px;
        }

        .empty-state p {
          margin: 0 0 20px;
          color: #9a8d95;
          font-size: 11px;
          max-width: 320px;
          line-height: 1.7;
        }

        .empty-button {
          height: 41px;
          padding: 0 17px;
          border-radius: 10px;
          background: linear-gradient(135deg, #b14f79, #a4446d);
          color: white;
          text-decoration: none;
          display: flex;
          align-items: center;
          font-size: 11px;
          font-weight: 800;
          box-shadow: 0 7px 17px rgba(177,79,121,0.18);
          transition:
            transform 0.3s cubic-bezier(0.34,1.56,0.64,1),
            box-shadow 0.3s ease;
        }

        .empty-button:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 26px rgba(177,79,121,0.28);
        }

        /* =========================
           CATEGORY LIST
        ========================= */

        .category-list {
          padding: 12px 20px 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .category-row {
          min-height: 68px;
          padding: 12px 15px;
          border: 1px solid #eee7eb;
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          background: #fff;
          transition:
            transform 0.3s cubic-bezier(0.34,1.56,0.64,1),
            border-color 0.25s ease,
            box-shadow 0.25s ease;
          opacity: 0;
          animation: rowSlide 0.45s ease-out forwards;
        }

        @keyframes rowSlide {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .category-row:hover {
          border-color: #e2c4d1;
          transform: translateY(-3px);
          box-shadow: 0 12px 24px rgba(45, 25, 38, 0.08);
        }

        .category-info {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .category-image,
        .category-image-placeholder {
          width: 48px;
          height: 48px;
          border-radius: 11px;
          flex-shrink: 0;
          transition: transform 0.3s ease;
        }

        .category-row:hover .category-image,
        .category-row:hover .category-image-placeholder {
          transform: scale(1.06) rotate(-3deg);
        }

        .category-image {
          object-fit: cover;
        }

        .category-image-placeholder {
          background: linear-gradient(135deg, #f8eaf0, #fbdcec);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 19px;
        }

        .category-row h3 {
          margin: 0 0 4px;
          font-size: 13px;
          color: #332b31;
        }

        .category-row p {
          margin: 0;
          font-size: 10px;
          color: #a4969e;
        }

        .category-status {
          padding: 6px 10px;
          border-radius: 20px;
          background: #edf8f1;
          color: #3b8b5a;
          font-size: 9px;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .category-status::before {
          content: "";
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #3b8b5a;
          animation: dotBlink 2s ease-in-out infinite;
        }

        @keyframes dotBlink {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.35;
          }
        }

        .category-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: auto;
        }

        .edit-category-button,
        .delete-category-button {
          height: 30px;
          padding: 0 11px;
          border: 0;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
          text-decoration: none;
          transition:
            transform 0.25s cubic-bezier(0.34,1.56,0.64,1),
            background 0.25s ease,
            box-shadow 0.25s ease;
        }

        .edit-category-button {
          background: #f3e8ff;
          color: #7c3f8f;
        }

        .edit-category-button:hover {
          background: #e8d5f5;
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(124,63,143,0.15);
        }

        .delete-category-button {
          background: #fbe9ed;
          color: #a94f6f;
        }

        .delete-category-button:hover {
          background: #f4d7df;
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(169,79,111,0.15);
        }

        .delete-category-button:disabled {
          opacity: 0.7;
          cursor: wait;
          transform: none;
        }

        .btn-spinner {
          width: 11px;
          height: 11px;
          border: 2px solid rgba(169,79,111,0.25);
          border-top-color: #a94f6f;
          border-radius: 50%;
          animation: btnSpin 0.7s linear infinite;
        }

        @keyframes btnSpin {
          to {
            transform: rotate(360deg);
          }
        }

        /* =========================
           LOADING
        ========================= */

        .category-loading {
          min-height: 365px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          animation: cardRise 0.4s ease-out;
        }

        .loading-spinner {
          width: 42px;
          height: 42px;
          margin-bottom: 16px;
          border: 4px solid #f1dce5;
          border-top-color: #b14f79;
          border-radius: 50%;
          animation: category-spin 0.8s linear infinite;
        }

        .category-loading h3 {
          margin: 0 0 6px;
          font-size: 16px;
          font-weight: 800;
        }

        .category-loading p {
          margin: 0;
          color: #9a8d95;
          font-size: 11px;
        }

        @keyframes category-spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* =========================
           RESPONSIVE
        ========================= */

        @media (max-width: 650px) {
          .category-row {
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .category-actions {
            width: 100%;
            margin-left: 61px;
          }
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

          .top-header {
            align-items: flex-start;
          }

          h1 {
            font-size: 25px;
          }

          .add-button {
            padding: 0 13px;
          }
        }

        @media (max-width: 500px) {
          .top-header {
            flex-direction: column;
          }

          .add-button {
            width: 100%;
            justify-content: center;
          }

          .card-header {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}