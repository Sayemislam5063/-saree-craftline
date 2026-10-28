"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase/supabase-client";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  
  // ✨ কপি হওয়া কোড ট্র্যাক করার স্টেট
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // ✨ কোড কপি করার ফাংশন
  const handleCopyCode = (code: string) => {
    if (!code || code === "NO-CODE") return;
    
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code).then(() => {
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
      }).catch(err => console.error("Copy failed: ", err));
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = code;
      textArea.style.position = "absolute";
      textArea.style.left = "-999999px";
      document.body.prepend(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
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

    setProducts((currentProducts) => currentProducts.filter((product) => product.id !== id));
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

  return (
    <main className="admin-page">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">SC</div>
          <div className="brand-text">
            <strong>Saree Craftline</strong>
            <span>Admin Panel</span>
          </div>
        </div>
        <div className="menu-title">MAIN MENU</div>
        <nav className="nav-menu">
          <Link href="/admin" className="nav-button"><span className="nav-icon">📊</span><span>Dashboard</span></Link>
          <Link href="/admin/products" className="nav-button active"><span className="nav-icon">🛍️</span><span>Products</span></Link>
          <Link href="/admin/categories" className="nav-button"><span className="nav-icon">🗂️</span><span>Categories</span></Link>
          <Link href="/admin/orders" className="nav-button"><span className="nav-icon">📦</span><span>Orders</span></Link>
          <Link href="/admin/settings" className="nav-button"><span className="nav-icon">⚙️</span><span>Settings</span></Link>
        </nav>
        <div className="sidebar-bottom">
          <Link href="/" className="store-button"><span>←</span><span>View Store</span></Link>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="welcome-text">SAREE CRAFTLINE</p>
            <h1>Products</h1>
          </div>
          <Link href="/admin/products/new" className="add-button"><span>＋</span> Add Product</Link>
        </header>

        <section className="filter-card">
          <div className="search-box">
            <span>⌕</span>
            <input
              type="text"
              placeholder="Search saree by name or code..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="">All Categories</option>
            {categories.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
          </select>
          <select defaultValue="all">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="hidden">Hidden</option>
          </select>
        </section>

        <section className="product-card">
          <div className="product-card-header">
            <div>
              <span className="section-label">PRODUCT MANAGEMENT</span>
              <h2>All Products</h2>
            </div>
            <span className="product-count">{products.length} Products</span>
          </div>

          {products.length === 0 ? (
            <div className="empty-products">
              <div className="empty-icon">🛍️</div>
              <h3>No Products Yet</h3>
              <p>আপনার প্রথম saree product যোগ করুন।</p>
              <Link href="/admin/products/new" className="empty-add-button">＋ Add Your First Product</Link>
            </div>
          ) : (
            <div className="products-list">
              {products
                .filter((product) => {
                  const matchesSearch = 
                    product.name.toLowerCase().includes(search.toLowerCase()) || 
                    (product.product_code && product.product_code.toLowerCase().includes(search.toLowerCase()));
                  const matchesCategory = categoryFilter === "" || product.categories?.slug === categoryFilter;
                  return matchesSearch && matchesCategory;
                })
                .map((product) => {
                  const images = Array.isArray(product.images) ? product.images : [];
                  const thumbnail = images[product.thumbnail_index] || images[0];
                  const stockNum = Number(product.stock_quantity ?? 0);
                  const stockStatus = getStockStatus(stockNum);
                  const isCopied = copiedCode === product.product_code;

                  return (
                    <div className="product-row" key={product.id}>
                      <div className="product-info">
                        {thumbnail ? (
                          <img src={thumbnail} alt={product.name} className="product-image" />
                        ) : (
                          <div className="product-image-placeholder">🛍️</div>
                        )}
                        <div>
                          <h3>{product.name}</h3>
                          <div className="product-meta">
                            {/* ✨ আপডেট করা ক্লিকেবল প্রোডাক্ট কোড */}
                            <span 
                              className={`product-code ${isCopied ? 'copied' : ''}`}
                              onClick={() => handleCopyCode(product.product_code)}
                              title="Click to copy code"
                            >
                              <span className="code-text">{product.product_code || "NO-CODE"}</span>
                              <span className="copy-icon">{isCopied ? "✅" : "📋"}</span>
                            </span>
                            
                            <p className={`stock-badge ${stockStatus}`}>
                              {stockStatus === "out-of-stock" && <span className="stock-dot"></span>}
                              {stockStatus === "warning" && <span className="stock-dot"></span>}
                              Stock: {stockNum}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="product-details">
                        <div className="product-price">
                          {product.price_type === "single" ? (
                            <>৳ {product.single_discount_price ?? product.single_price}</>
                          ) : (
                            <>৳ {product.discount_without_blouse_price ?? product.without_blouse_price}{" - "}{product.discount_with_blouse_price ?? product.with_blouse_price}</>
                          )}
                        </div>
                        <span className={product.is_active ? "product-status active" : "product-status hidden"}>
                          {product.is_active ? "Active" : "Hidden"}
                        </span>
                      </div>

                      <Link href={`/admin/products/new?edit=${product.id}`} className="edit-product-button">Edit</Link>
                      <button type="button" className="delete-product-button" onClick={() => deleteProduct(product.id)}>Delete</button>
                    </div>
                  );
                })}
            </div>
          )}
        </section>
      </section>

      <style>{`
        * { box-sizing: border-box; }
        .admin-page { min-height: 100vh; display: flex; background: #f7f4f6; color: #241d22; font-family: "Inter", sans-serif; }
        .sidebar { width: 255px; min-height: 100vh; position: sticky; top: 0; display: flex; flex-direction: column; padding: 22px 15px; background: linear-gradient(180deg, #251c22 0%, #1a1318 100%); color: white; }
        .brand { display: flex; align-items: center; gap: 12px; padding: 5px 8px 25px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); margin-bottom: 18px; }
        .logo { width: 46px; height: 46px; display: grid; place-items: center; border-radius: 14px; background: linear-gradient(135deg, #d47da0, #a94f76); font-size: 16px; font-weight: 900; }
        .brand-text strong { display: block; font-size: 14px; }
        .brand-text span { display: block; margin-top: 4px; color: #a99ba1; font-size: 11px; }
        .menu-title { padding: 0 10px 9px; color: #74666d; font-size: 10px; font-weight: 900; letter-spacing: 1.5px; }
        .nav-menu { display: grid; gap: 6px; }
        .nav-button { min-height: 46px; display: flex; align-items: center; gap: 12px; padding: 0 13px; border-radius: 13px; color: #c8bcc2; text-decoration: none; font-size: 13px; font-weight: 700; transition: 0.2s ease; }
        .nav-button:hover { background: rgba(255, 255, 255, 0.07); color: white; }
        .nav-button.active { background: linear-gradient(135deg, rgba(202, 108, 148, 0.25), rgba(169, 79, 118, 0.16)); color: white; box-shadow: inset 3px 0 0 #d17a9f; }
        .nav-icon { width: 25px; text-align: center; font-size: 17px; }
        .sidebar-bottom { margin-top: auto; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.06); }
        .store-button { min-height: 45px; display: flex; align-items: center; gap: 10px; padding: 0 13px; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 13px; background: rgba(255, 255, 255, 0.045); color: #cfc3c8; text-decoration: none; font-size: 13px; font-weight: 700; }
        .content { flex: 1; min-width: 0; padding: 30px; }
        .topbar { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 24px; }
        .welcome-text { margin: 0 0 5px; color: #ad5278; font-size: 10px; font-weight: 900; letter-spacing: 1.8px; }
        .topbar h1 { margin: 0; font-size: 30px; font-weight: 900; }
        .add-button { min-height: 45px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 0 18px; border-radius: 13px; background: #241d22; color: white; text-decoration: none; font-size: 12px; font-weight: 900; box-shadow: 0 8px 20px rgba(36, 29, 34, 0.15); transition: 0.2s ease; }
        .add-button:hover { transform: translateY(-2px); box-shadow: 0 13px 25px rgba(36, 29, 34, 0.2); }
        .filter-card { display: grid; grid-template-columns: 1fr 190px 170px; gap: 12px; padding: 16px; margin-bottom: 18px; border: 1px solid #eee6e9; border-radius: 18px; background: white; box-shadow: 0 8px 25px rgba(70, 45, 56, 0.05); }
        .search-box { height: 44px; display: flex; align-items: center; gap: 9px; padding: 0 13px; border: 1px solid #eadfe4; border-radius: 12px; background: #fcfafb; }
        .search-box span { color: #a9959e; font-size: 20px; }
        .search-box input { width: 100%; height: 100%; border: 0; outline: 0; background: transparent; color: #241d22; font-size: 12px; }
        .filter-card select { height: 44px; padding: 0 12px; border: 1px solid #eadfe4; border-radius: 12px; outline: 0; background: #fcfafb; color: #5e4f56; font-size: 12px; cursor: pointer; }
        .product-card { overflow: hidden; border: 1px solid #eee6e9; border-radius: 22px; background: white; box-shadow: 0 12px 35px rgba(70, 45, 56, 0.06); }
        .products-list { display: grid; gap: 14px; padding: 14px; }
        .product-row { display: grid; grid-template-columns: minmax(360px, 1.45fr) minmax(260px, 1fr) 60px 68px; align-items: center; gap: 18px; min-height: 88px; padding: 14px 18px; border: 1px solid #eee1e7; border-radius: 18px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(251, 246, 249, 0.92)); box-shadow: 0 8px 24px rgba(75, 45, 60, 0.055), inset 0 1px 0 rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); transition: 0.2s ease; }
        .product-row:hover { transform: translateY(-2px); box-shadow: 0 13px 30px rgba(75, 45, 60, 0.09), inset 0 1px 0 rgba(255, 255, 255, 0.95); }
        .product-info { display: flex; align-items: center; gap: 13px; min-width: 0; }
        .product-info > div:last-child { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
        .product-image, .product-image-placeholder { width: 58px; height: 58px; flex: 0 0 58px; border-radius: 13px; }
        .product-image { object-fit: cover; }
        .product-image-placeholder { display: grid; place-items: center; background: #f9edf2; font-size: 22px; }
        .product-info h3 { margin: 0; font-size: 13px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; }
        
        .product-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        
        /* ✨ নতুন প্রোডাক্ট কোড স্টাইল (টেক্সট অপরিবর্তিত থাকবে, শুধু আইকন চেঞ্জ হবে) */
        .product-code { 
          font-size: 10px; 
          font-weight: 900; 
          color: #7c3f8f; 
          background: #f3e8ff; 
          padding: 4px 8px; 
          border-radius: 6px;
          letter-spacing: 0.5px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid transparent;
        }
        .product-code:hover {
          background: #e5d1f8;
          border-color: #d8b4fe;
          transform: translateY(-1px);
        }
        .product-code.copied {
          background: #d1fae5;
          color: #065f46;
          border-color: #34d399;
        }
        .copy-icon {
          font-size: 11px;
        }

        .stock-badge { display: inline-flex; align-items: center; gap: 6px; margin: 0; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; white-space: nowrap; }
        .stock-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; display: inline-block; }
        .stock-badge.normal { background: #f8edf2; color: #8d536d; }
        .stock-badge.warning { background: #fff5d6; color: #a67900; }
        .stock-badge.warning .stock-dot { background: #f5a623; }
        .stock-badge.out-of-stock { background: #fee2e2; color: #dc2626; }
        .stock-badge.out-of-stock .stock-dot { background: #dc2626; }

        .product-details { display: flex; align-items: center; justify-content: center; gap: 12px; min-width: 0; }
        .product-price { color: #a04f72; font-size: 14px; font-weight: 900; white-space: nowrap; }
        .product-status { padding: 6px 9px; border-radius: 999px; font-size: 10px; font-weight: 800; white-space: nowrap; }
        .product-status.active { background: #eaf7ef; color: #348153; }
        .product-status.hidden { background: #f5e9ed; color: #9b6679; }
        .edit-product-button { width: 50px; min-width: 50px; height: 28px; display: inline-flex; align-items: center; justify-content: center; border: 0; padding: 0; border-radius: 9px; background: #f3e8ff; color: #7c3f8f; font-size: 10px; font-weight: 800; text-decoration: none; cursor: pointer; }
        .delete-product-button { width: 58px; min-width: 58px; height: 28px; display: inline-flex; align-items: center; justify-content: center; border: 0; padding: 0; border-radius: 9px; background: #fbe9ed; color: #a94f6f; font-size: 10px; font-weight: 800; cursor: pointer; }
        .product-card-header { min-height: 80px; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 18px 22px; border-bottom: 1px solid #f0e9ec; }
        .section-label { display: block; margin-bottom: 4px; color: #ae5379; font-size: 9px; font-weight: 900; letter-spacing: 1.7px; }
        .product-card-header h2 { margin: 0; font-size: 19px; font-weight: 900; }
        .product-count { padding: 7px 11px; border-radius: 999px; background: #f8edf2; color: #a04f72; font-size: 11px; font-weight: 800; }
        
        @media (max-width: 1100px) { .product-row { grid-template-columns: minmax(280px, 1.3fr) minmax(220px, 1fr) 60px 68px; } }
        @media (max-width: 900px) { .filter-card { grid-template-columns: 1fr 1fr; } .search-box { grid-column: 1 / -1; } .product-row { grid-template-columns: minmax(260px, 1fr) minmax(190px, 0.9fr) 60px 68px; } }
        @media (max-width: 800px) { .admin-page { display: block; } .sidebar { width: 100%; min-height: auto; position: static; } .nav-menu { grid-template-columns: repeat(2, 1fr); } .sidebar-bottom { margin-top: 12px; } .content { padding: 22px 16px; } .product-row { grid-template-columns: 1fr 1fr; } .product-info { grid-column: 1 / -1; } .product-details { justify-content: flex-start; } }
        @media (max-width: 560px) { .topbar { align-items: flex-start; flex-direction: column; } .add-button { width: 100%; } .filter-card { grid-template-columns: 1fr; } .search-box { grid-column: auto; } .product-card-header { align-items: flex-start; flex-direction: column; } .nav-menu { grid-template-columns: 1fr; } .product-row { grid-template-columns: 1fr auto; gap: 12px; padding: 14px; } .product-info { grid-column: 1 / -1; } .product-details { justify-content: flex-start; } .edit-product-button, .delete-product-button { width: 58px; min-width: 58px; } }
      `}</style>
    </main>
  );
}