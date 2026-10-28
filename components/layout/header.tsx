"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "../cart/cart-provider";
import CartDrawer from "../cart/cart-drawer";
import { supabase } from "../../lib/supabase/supabase-client";

/* ✨ Shared inline style for all icon boxes */
const iconBoxStyle: React.CSSProperties = {
  position: "relative",
  width: "44px",
  height: "44px",
  flex: "0 0 44px",
  display: "grid",
  placeItems: "center",
  border: "0",
  borderRadius: "13px",
  background: "linear-gradient(135deg, #f7f1f4, #f0e5ec)",
  color: "#3b3035",
  textDecoration: "none",
  cursor: "pointer",
  boxSizing: "border-box",
};

export default function Header() {
  const { totalItems } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const router = useRouter();

  // ✨ সার্চ এবং ক্যাটাগরি স্টেট
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categories, setCategories] = useState<{ slug: string; name: string }[]>([]);

  // ✨ হোভার অ্যানিমেশনের জন্য স্টেট (Link-এ কাজ করার জন্য)
  const [hovered, setHovered] = useState<null | "track" | "fav" | "cart" | "logo" | "search">(null);

  useEffect(() => {
    // ক্যাটাগরিগুলো লোড করা হচ্ছে
    const loadCategories = async () => {
      const { data } = await supabase
        .from("categories")
        .select("slug, name")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (data) setCategories(data);
    };
    loadCategories();
  }, []);

  // ✨ সার্চ সাবমিট
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.append("q", searchQuery.trim());
    if (selectedCategory) params.append("category", selectedCategory);
    router.push(`/all-products?${params.toString()}`);
  };

  return (
    <>
      <header className="header">
        <div className="container header-inner">

          {/* ============ LOGO (এখন হোভার অ্যানিমেশনসহ) ============ */}
          <Link
            href="/"
            onMouseEnter={() => setHovered("logo")}
            onMouseLeave={() => setHovered(null)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "12px",
              textDecoration: "none",
              color: "#241d22",
              flexShrink: 0,
              transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease",
              transform: hovered === "logo" ? "translateY(-2px)" : "none",
              opacity: hovered === "logo" ? 0.9 : 1,
            }}
          >
            <img
              src="/assets/brand/logo/logo.png"
              alt="Saree Craftline"
              style={{
                width: "58px",
                height: "58px",
                objectFit: "contain",
                flexShrink: 0,
                display: "block",
                transition: "filter 0.2s ease",
                filter: hovered === "logo" ? "drop-shadow(0 6px 12px rgba(154, 65, 109, 0.18))" : "none",
              }}
            />

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: "5px",
              }}
            >
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: 900,
                  letterSpacing: "-0.3px",
                  color: hovered === "logo" ? "#9a416d" : "#241d22",
                  whiteSpace: "nowrap",
                  lineHeight: "1",
                  transition: "color 0.2s ease",
                }}
              >
                Saree Craftline
              </span>

              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#9a7c88",
                  whiteSpace: "nowrap",
                  lineHeight: "1",
                }}
              >
                সঠিক পণ্য, ন্যায্য দাম
              </span>
            </div>
          </Link>

          {/* ============ NEW SEARCH BAR ============ */}
          <form className="search-bar-container" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search for products"
              aria-label="Search products"
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            
            <div className="search-divider" />

            <select
              className="category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">SELECT CATEGORY</option>
              {categories.map((cat) => (
                <option key={cat.slug} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>

            <button 
              type="submit" 
              className="search-submit-btn" 
              aria-label="Search"
              onMouseEnter={() => setHovered("search")}
              onMouseLeave={() => setHovered(null)}
              style={{
                transform: hovered === "search" ? "scale(1.08) translateY(-1px)" : "scale(1)",
                background: hovered === "search" ? "#a9416e" : "#7d3355",
                boxShadow: hovered === "search" ? "0 4px 12px rgba(169, 65, 110, 0.3)" : "none",
                transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)"
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </button>
          </form>

          {/* ============ ACTIONS ============ */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flex: "0 0 auto",
            }}
          >
            {/* Track Order Icon */}
            <Link
              href="/order-tracking" 
              aria-label="ট্র্যাক অর্ডার"
              className={`icon-btn animated-btn ${hovered === "track" ? "is-hovered" : ""}`}
              style={iconBoxStyle}
              onMouseEnter={() => setHovered("track")}
              onMouseLeave={() => setHovered(null)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13"></rect>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                <circle cx="5.5" cy="18.5" r="2.5"></circle>
                <circle cx="18.5" cy="18.5" r="2.5"></circle>
              </svg>
            </Link>

            {/* Favorites */}
            <Link
              href="/favorites"
              aria-label="Favorites"
              className={`icon-btn animated-btn ${hovered === "fav" ? "is-hovered" : ""}`}
              style={iconBoxStyle}
              onMouseEnter={() => setHovered("fav")}
              onMouseLeave={() => setHovered(null)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </Link>

            {/* Cart */}
            <button
              type="button"
              aria-label="Cart"
              className={`icon-btn animated-btn ${hovered === "cart" ? "is-hovered" : ""}`}
              style={iconBoxStyle}
              onMouseEnter={() => setHovered("cart")}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setCartOpen(true)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1.5" />
                <circle cx="20" cy="21" r="1.5" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>

              {totalItems > 0 && (
                <span className="cart-count">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
      />

      <style jsx>{`
        .header { position: sticky; top: 0; z-index: 50; width: 100%; background: rgba(255, 255, 255, 0.94); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); border-bottom: 1px solid rgba(93, 67, 77, 0.08); box-shadow: 0 4px 20px rgba(83, 53, 66, 0.04); }
        .container { width: min(1240px, calc(100% - 32px)); margin: 0 auto; }
        .header-inner { min-height: 84px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }

        /* ============ NEW SEARCH BAR STYLES ============ */
        .search-bar-container {
          display: flex;
          align-items: center;
          flex: 1;
          max-width: 650px;
          height: 48px;
          background: #fff;
          border: 1px solid #e2d8dd;
          border-radius: 999px;
          padding: 4px;
          margin: 0 20px;
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .search-bar-container:focus-within {
          border-color: #a9416e;
          box-shadow: 0 0 0 3px rgba(169, 65, 110, 0.1);
        }
        .search-input {
          flex: 1;
          height: 100%;
          border: none;
          background: transparent;
          outline: none;
          padding: 0 20px;
          font-size: 14px;
          color: #30262b;
        }
        .search-input::placeholder {
          color: #b9a9b2;
        }
        .search-divider {
          width: 1px;
          height: 24px;
          background: #e2d8dd;
        }
        .category-select {
          height: 100%;
          border: none;
          background: transparent;
          outline: none;
          padding: 0 15px;
          font-size: 12px;
          font-weight: 700;
          color: #6b5b63;
          cursor: pointer;
          max-width: 180px;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236b5b63%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
          background-repeat: no-repeat;
          background-position: right 10px center;
          background-size: 8px;
          padding-right: 25px;
        }
        .search-submit-btn {
          width: 40px;
          height: 40px;
          flex-shrink: 0;
          border: none;
          border-radius: 50%;
          background: #7d3355;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        /* ============ ICON BUTTONS ============ */
        .icon-btn { transition: all 0.3s ease; }
        .animated-btn { animation: iconPulse 2.5s infinite; }
        
        /* CSS :hover এর বদলে is-hovered ক্লাস ব্যবহার করা হয়েছে যাতে Link-এ কাজ করে */
        .icon-btn.is-hovered { 
          background: linear-gradient(135deg, #f3e7ed, #ebd5e2) !important; 
          color: #9a416d !important; 
          animation: iconPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, iconPulseHover 1.5s infinite 0.4s; 
        }
        .icon-btn.is-hovered svg { 
          animation: iconWiggle 0.5s ease-in-out infinite; 
        }
        .icon-btn:active { transform: scale(0.9); }
        
        @keyframes iconPulse { 0% { box-shadow: 0 0 0 0 rgba(154, 65, 109, 0.15); } 50% { box-shadow: 0 0 0 8px rgba(154, 65, 109, 0); } 100% { box-shadow: 0 0 0 0 rgba(154, 65, 109, 0); } }
        @keyframes iconPop { 0% { transform: scale(1); } 50% { transform: scale(1.15) translateY(-3px); } 100% { transform: scale(1) translateY(-2px); } }
        @keyframes iconPulseHover { 0% { box-shadow: 0 0 0 0 rgba(154, 65, 109, 0.4); } 50% { box-shadow: 0 0 0 12px rgba(154, 65, 109, 0); } 100% { box-shadow: 0 0 0 0 rgba(154, 65, 109, 0); } }
        @keyframes iconWiggle { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-10deg); } 75% { transform: rotate(10deg); } }

        /* CART BADGE ANIMATION */
        .cart-count { position: absolute; top: -5px; right: -5px; min-width: 20px; height: 20px; padding: 0 5px; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: linear-gradient(135deg, #a9416e, #7d3355); color: #fff; border: 2px solid #fff; font-size: 10px; font-weight: 900; line-height: 1; pointer-events: none; box-shadow: 0 4px 10px rgba(154, 65, 109, 0.32); animation: badgePop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, badgePulse 2s infinite 1s; }
        @keyframes badgePop { 0% { transform: scale(0); } 100% { transform: scale(1); } }
        @keyframes badgePulse { 0% { box-shadow: 0 0 0 0 rgba(154, 65, 109, 0.5); } 50% { box-shadow: 0 0 0 6px rgba(154, 65, 109, 0); } 100% { box-shadow: 0 0 0 0 rgba(154, 65, 109, 0); } }

        /* RESPONSIVE */
        @media (max-width: 1024px) { 
          .header-inner { min-height: 76px; gap: 14px; } 
          .search-bar-container { margin: 0 10px; max-width: 400px; }
          .category-select { max-width: 120px; font-size: 11px; }
        }
        @media (max-width: 800px) { 
          .header-inner { flex-wrap: wrap; padding: 12px 0; min-height: auto; row-gap: 10px; } 
          .search-bar-container { order: 3; margin: 0; max-width: 100%; width: 100%; flex-basis: 100%; }
        }
        @media (max-width: 460px) { 
          .container { width: calc(100% - 20px); } 
          .header-inner { min-height: 60px; gap: 6px; } 
          .search-bar-container { height: 44px; }
          .category-select { display: none; }
          .search-divider { display: none; }
          .search-input { padding: 0 15px; font-size: 13px; }
        }
      `}</style>
    </>
  );
}