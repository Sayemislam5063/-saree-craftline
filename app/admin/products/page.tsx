"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase/supabase-client";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categories, setCategories] = useState<
    { id: string; name: string; slug: string }[]
  >([]);

  // ✨ কপি হওয়া কোড ট্র্যাক করার স্টেট
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // ✨ মোবাইল সাইডবার স্টেট
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ✨ কোড কপি করার ফাংশন
  const handleCopyCode = (code: string) => {
    if (!code || code === "NO-CODE") return;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(code)
        .then(() => {
          setCopiedCode(code);
          setTimeout(() => setCopiedCode(null), 2000);
        })
        .catch((err) => console.error("Copy failed: ", err));
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = code;
      textArea.style.position = "absolute";
      textArea.style.left = "-999999px";
      document.body.prepend(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
      } catch (error) {
        console.error(error);
      } finally {
        textArea.remove();
      }
    }
  };

  const deleteProduct = async (id: string) => {
    const confirmed = window.confirm("আপনি কি এই product টি delete করতে চান?");
    if (!confirmed) return;

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      console.error("Product delete error:", error);
      alert("Product delete করা যায়নি।");
      return;
    }

    setProducts((currentProducts) =>
      currentProducts.filter((product) => product.id !== id)
    );
    alert("Product deleted successfully!");
  };

  useEffect(() => {
    const loadProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(id, name, slug)")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Product load error:", error);
        return;
      }
      setProducts(data ?? []);
    };
    loadProducts();
  }, []);

  useEffect(() => {
    const loadCategories = async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) {
        console.error("Category load error:", error);
        return;
      }
      setCategories(data ?? []);
    };
    loadCategories();
  }, []);

  const getStockStatus = (stock: number) => {
    if (stock <= 0) return "out-of-stock";
    if (stock <= 2) return "warning";
    return "normal";
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      (product.product_code &&
        product.product_code.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory =
      categoryFilter === "" || product.categories?.slug === categoryFilter;
    return matchesSearch && matchesCategory;
  });

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
          <Link href="/admin" className="menu-item">
            <span className="menu-icon">📊</span>
            <span className="menu-label">Dashboard</span>
          </Link>
          <Link href="/admin/products" className="menu-item active">
            <span className="menu-icon">🛍️</span>
            <span className="menu-label">Products</span>
          </Link>
          <Link href="/admin/categories" className="menu-item">
            <span className="menu-icon">🗂️</span>
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

      {/* MAIN CONTENT */}
      <main className="main-content">
        {/* TOPBAR */}
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
            <span className="eyebrow">PRODUCTS</span>
            <h1>Manage Products</h1>
          </div>
          <Link href="/admin/products/new" className="add-button">
            <span className="add-icon">＋</span>
            <span className="add-text">Add Product</span>
          </Link>
        </div>

        {/* FILTERS */}
        <section className="filter-card">
          <div className="search-box">
            <span className="search-icon">⌕</span>
            <input
              type="text"
              placeholder="Search saree by name or code..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="filter-selects">
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
            <select defaultValue="all">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>
        </section>

        {/* PRODUCTS */}
        <section className="products-card">
          <div className="products-header">
            <div>
              <span className="section-label">PRODUCT MANAGEMENT</span>
              <h2>All Products</h2>
            </div>
            <span className="product-count">
              {filteredProducts.length}{" "}
              {filteredProducts.length === 1 ? "Product" : "Products"}
            </span>
          </div>

          {products.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🛍️</div>
              <h3>No Products Yet</h3>
              <p>আপনার প্রথম saree product যোগ করুন।</p>
              <Link href="/admin/products/new" className="empty-add-button">
                ＋ Add Your First Product
              </Link>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <h3>No Matches Found</h3>
              <p>আপনার সার্চ বা ফিল্টার অনুযায়ী কোনো প্রোডাক্ট পাওয়া যায়নি।</p>
            </div>
          ) : (
            <div className="products-list">
              {filteredProducts.map((product, index) => {
                const images = Array.isArray(product.images)
                  ? product.images
                  : [];
                const thumbnail = images[product.thumbnail_index] || images[0];
                const stockNum = Number(product.stock_quantity ?? 0);
                const stockStatus = getStockStatus(stockNum);
                const isCopied = copiedCode === product.product_code;

                return (
                  <div
                    className="product-row"
                    key={product.id}
                    style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                  >
                    {/* LEFT: image + name + code + stock */}
                    <div className="product-info">
                      {thumbnail ? (
                        <img
                          src={thumbnail}
                          alt={product.name}
                          className="product-image"
                        />
                      ) : (
                        <div className="product-image-placeholder">🛍️</div>
                      )}
                      <div className="product-info-text">
                        <h3 className="product-name">{product.name}</h3>
                        <div className="product-meta">
                          <button
                            type="button"
                            className={`product-code ${
                              isCopied ? "copied" : ""
                            }`}
                            onClick={() =>
                              handleCopyCode(product.product_code)
                            }
                            title="Click to copy code"
                          >
                            <span className="code-text">
                              {product.product_code || "NO-CODE"}
                            </span>
                            <span className="copy-icon">
                              {isCopied ? "✅" : "📋"}
                            </span>
                          </button>
                          <span className={`stock-badge ${stockStatus}`}>
                            {(stockStatus === "out-of-stock" ||
                              stockStatus === "warning") && (
                              <span className="stock-dot" />
                            )}
                            Stock: {stockNum}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* MIDDLE: price + status */}
                    <div className="product-details">
                      <div className="product-price">
                        {product.price_type === "single" ? (
                          <>
                            ৳{" "}
                            {product.single_discount_price ??
                              product.single_price}
                          </>
                        ) : (
                          <>
                            ৳{" "}
                            {product.discount_without_blouse_price ??
                              product.without_blouse_price}
                            {" - "}
                            {product.discount_with_blouse_price ??
                              product.with_blouse_price}
                          </>
                        )}
                      </div>
                      <span
                        className={`product-status ${
                          product.is_active ? "active" : "hidden"
                        }`}
                      >
                        {product.is_active ? "Active" : "Hidden"}
                      </span>
                    </div>

                    {/* ACTIONS */}
                    <div className="product-actions">
                      <Link
                        href={`/admin/products/new?edit=${product.id}`}
                        className="edit-btn"
                      >
                        <span className="btn-icon">✎</span>
                        <span>Edit</span>
                      </Link>
                      <button
                        type="button"
                        className="delete-btn"
                        onClick={() => deleteProduct(product.id)}
                      >
                        <span className="btn-icon">🗑</span>
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
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
          margin-bottom: 24px;
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
          flex-shrink: 0;
        }
        .hamburger span {
          display: block;
          height: 2px;
          border-radius: 2px;
          background: var(--accent);
        }
        .hamburger:hover { background: #faf6f8; }

        .topbar-title { flex: 1; min-width: 0; }
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
          font-size: 28px;
          font-weight: 900;
          letter-spacing: -0.6px;
          background: linear-gradient(135deg, #2a1d24, #6b3d55);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .add-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: 14px;
          background: linear-gradient(135deg, #8a2a4a, #5a1329);
          color: #fff;
          text-decoration: none;
          font-size: 13px;
          font-weight: 800;
          box-shadow: 0 10px 22px rgba(138, 42, 74, 0.3);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          flex-shrink: 0;
        }
        .add-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 28px rgba(138, 42, 74, 0.4);
        }
        .add-icon { font-size: 16px; font-weight: 900; }

        /* FILTER CARD */
        .filter-card {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 12px;
          padding: 16px;
          margin-bottom: 18px;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 18px;
          box-shadow: 0 8px 28px rgba(45, 25, 38, 0.05);
          animation: fadeUp 0.55s ease both;
        }
        .search-box {
          height: 46px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 15px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: #fbfafc;
          transition: all 0.22s ease;
        }
        .search-box:focus-within {
          border-color: var(--accent);
          background: #fff;
          box-shadow: 0 0 0 4px var(--accent-glow);
        }
        .search-icon { color: var(--text-muted); font-size: 20px; font-weight: 700; }
        .search-box input {
          width: 100%;
          height: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--text);
          font-size: 13px;
          font-weight: 500;
        }
        .search-box input::placeholder { color: var(--text-muted); }

        .filter-selects { display: flex; gap: 10px; }
        .filter-selects select {
          height: 46px;
          padding: 0 14px;
          border: 1px solid var(--border);
          border-radius: 12px;
          outline: 0;
          background: #fbfafc;
          color: var(--text-soft);
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.22s ease;
          min-width: 150px;
        }
        .filter-selects select:hover { border-color: #d8ccd4; background: #fff; }
        .filter-selects select:focus {
          border-color: var(--accent);
          background: #fff;
          box-shadow: 0 0 0 4px var(--accent-glow);
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
          display: block;
        }
        .products-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 900;
          color: var(--text);
          letter-spacing: -0.3px;
        }
        .product-count {
          padding: 8px 14px;
          border-radius: 999px;
          background: var(--purple-soft);
          color: var(--purple);
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        /* PRODUCTS LIST */
        .products-list { display: grid; gap: 12px; padding: 16px; }

        .product-row {
          display: grid;
          grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) auto;
          align-items: center;
          gap: 16px;
          padding: 14px 18px;
          border: 1px solid var(--border);
          border-radius: 16px;
          background: linear-gradient(135deg, #ffffff, #fbf7fa);
          box-shadow: 0 4px 14px rgba(45, 25, 38, 0.04);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          animation: rowIn 0.45s ease both;
        }
        @keyframes rowIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .product-row:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 26px rgba(45, 25, 38, 0.09);
          border-color: #dfd6dc;
        }

        .product-info {
          display: flex;
          align-items: center;
          gap: 13px;
          min-width: 0;
        }
        .product-info-text {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
          flex: 1;
        }

        .product-image,
        .product-image-placeholder {
          width: 58px;
          height: 58px;
          flex: 0 0 58px;
          border-radius: 13px;
        }
        .product-image {
          object-fit: cover;
          border: 1px solid var(--border);
        }
        .product-image-placeholder {
          display: grid;
          place-items: center;
          background: var(--purple-soft);
          font-size: 22px;
        }

        .product-name {
          margin: 0;
          font-size: 13.5px;
          font-weight: 800;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
        }

        .product-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .product-code {
          font-size: 10.5px;
          font-weight: 800;
          color: var(--purple);
          background: var(--purple-soft);
          padding: 4px 9px;
          border-radius: 7px;
          letter-spacing: 0.4px;
          cursor: pointer;
          transition: all 0.22s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid transparent;
          font-family: inherit;
        }
        .product-code:hover {
          background: var(--purple);
          color: #fff;
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(124, 63, 143, 0.28);
        }
        .product-code.copied {
          background: #d1fae5;
          color: #065f46;
          border-color: #34d399;
        }
        .product-code.copied:hover {
          background: #d1fae5;
          color: #065f46;
          box-shadow: none;
        }
        .copy-icon { font-size: 11px; }

        .stock-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin: 0;
          padding: 4px 9px;
          border-radius: 7px;
          font-size: 10.5px;
          font-weight: 800;
          white-space: nowrap;
        }
        .stock-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .stock-badge.normal { background: var(--green-soft); color: var(--green); }
        .stock-badge.warning { background: var(--amber-soft); color: #a67900; }
        .stock-badge.warning .stock-dot { background: #f5a623; }
        .stock-badge.out-of-stock { background: var(--red-soft); color: var(--red); }
        .stock-badge.out-of-stock .stock-dot { background: var(--red); }

        .product-details {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 12px;
          min-width: 0;
          flex-wrap: wrap;
        }
        .product-price {
          color: var(--accent);
          font-size: 14px;
          font-weight: 900;
          white-space: nowrap;
        }
        .product-status {
          padding: 5px 10px;
          border-radius: 999px;
          font-size: 10.5px;
          font-weight: 800;
          white-space: nowrap;
        }
        .product-status.active { background: var(--green-soft); color: var(--green); }
        .product-status.hidden { background: #f2eef1; color: var(--text-soft); }

        /* ACTIONS */
        .product-actions { display: flex; gap: 8px; }
        .edit-btn,
        .delete-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 34px;
          padding: 0 14px;
          border: 1px solid transparent;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 800;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.22s ease;
          font-family: inherit;
          white-space: nowrap;
        }
        .btn-icon { font-size: 12px; }

        .edit-btn {
          background: var(--purple-soft);
          color: var(--purple);
        }
        .edit-btn:hover {
          background: var(--purple);
          color: #fff;
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(124, 63, 143, 0.3);
        }

        .delete-btn {
          background: var(--red-soft);
          color: var(--red);
        }
        .delete-btn:hover {
          background: var(--red);
          color: #fff;
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(194, 58, 58, 0.3);
        }

        /* EMPTY */
        .empty-state {
          padding: 70px 20px;
          text-align: center;
        }
        .empty-icon {
          font-size: 48px;
          margin-bottom: 14px;
          opacity: 0.5;
        }
        .empty-state h3 {
          margin: 0 0 6px;
          font-size: 17px;
          font-weight: 800;
          color: var(--text);
        }
        .empty-state p {
          margin: 0 0 18px;
          font-size: 13px;
          color: var(--text-muted);
        }
        .empty-add-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 22px;
          border-radius: 12px;
          background: linear-gradient(135deg, #8a2a4a, #5a1329);
          color: #fff;
          text-decoration: none;
          font-size: 13px;
          font-weight: 800;
          box-shadow: 0 10px 22px rgba(138, 42, 74, 0.3);
          transition: all 0.25s ease;
        }
        .empty-add-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 28px rgba(138, 42, 74, 0.4);
        }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 1100px) {
          .product-row {
            grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) auto;
          }
        }

        @media (max-width: 960px) {
          .filter-card { grid-template-columns: 1fr; }
          .filter-selects { width: 100%; }
          .filter-selects select { flex: 1; min-width: 0; }
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

        @media (max-width: 720px) {
          /* Mobile: card-stack layout */
          .product-row {
            grid-template-columns: 1fr;
            gap: 14px;
            padding: 14px;
          }
          .product-info {
            width: 100%;
          }
          .product-details {
            justify-content: space-between;
            width: 100%;
            padding-top: 10px;
            border-top: 1px dashed var(--border);
          }
          .product-price { font-size: 15px; }
          .product-actions {
            width: 100%;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .edit-btn,
          .delete-btn {
            height: 40px;
            justify-content: center;
            font-size: 12.5px;
            border-radius: 11px;
          }
        }

        @media (max-width: 560px) {
          h1 { font-size: 22px; }
          .add-button { padding: 10px 15px; font-size: 12px; }
          .add-text { display: none; }
          .add-icon { font-size: 18px; }
          .products-header {
            padding: 16px;
            align-items: flex-start;
            flex-direction: column;
          }
          .products-header h2 { font-size: 16px; }
          .product-count { align-self: flex-start; }
          .products-list { padding: 12px; gap: 10px; }
          .product-image,
          .product-image-placeholder {
            width: 52px;
            height: 52px;
            flex: 0 0 52px;
            border-radius: 12px;
          }
          .product-name { font-size: 13px; }
          .filter-selects { flex-direction: column; }
          .filter-selects select { width: 100%; }
        }

        @media (max-width: 400px) {
          .product-meta { gap: 6px; }
          .product-code { font-size: 10px; padding: 3px 7px; }
          .stock-badge { font-size: 10px; padding: 3px 7px; }
        }
      `}</style>
    </div>
  );
}