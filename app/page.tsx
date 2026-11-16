"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "../components/cart/cart-provider";
import CategorySlider from "../components/categories/category-slider";
import CategorySection from "../components/category-section";
import { supabase } from "../lib/supabase/supabase-client";

type HomeCategory = {
  id: string; name: string; slug: string; description: string; imageUrl: string; isActive: boolean;
};
type HomeProduct = {
  id: string; name: string; slug: string; description: string; categoryId: string; categoryName: string;
  images: { url: string; isThumbnail: boolean; alt: string; }[];
  price_type: string;
  pricing: { withoutBlouse: number; withBlouse: number; discountPrice?: number; };
  stock: number; isActive: boolean; isBestSelling: boolean; isFreeDelivery: boolean;
  averageRating?: number; reviewCount?: number;
};

const BUTTON_TRANSITION =
  "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease";

export default function HomePage() {
  const router = useRouter();
  const { addToCart } = useCart();
  const [categories, setCategories] = useState<HomeCategory[]>([]);
  const [products, setProducts] = useState<HomeProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [current3DIndex, setCurrent3DIndex] = useState(0);
  const [isHovering3D, setIsHovering3D] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("saree-craftline-favorites");
      const parsed = saved ? JSON.parse(saved) : [];
      if (Array.isArray(parsed)) setFavoriteIds(parsed);
    } catch (error) {
      console.error("Favorite load error:", error);
    }
  }, []);

  useEffect(() => {
    async function loadHomepageData() {
      setLoading(true);
      const [categoriesResult, productsResult] = await Promise.all([
        supabase.from("categories").select("id, name, slug, image_url, is_active").eq("is_active", true),
        supabase.from("products").select(`
          id, name, description, category_id, stock_quantity, price_type,
          without_blouse_price, discount_without_blouse_price, with_blouse_price, discount_with_blouse_price,
          single_price, single_discount_price, images, thumbnail_index, is_active, is_free_delivery,
          categories ( id, name, slug )
        `).eq("is_active", true).order("created_at", { ascending: false }),
      ]);

      const loadedCategories = (categoriesResult.data ?? []).map((category: any) => ({
        id: category.id, name: category.name, slug: category.slug, description: "", imageUrl: category.image_url ?? "", isActive: category.is_active ?? true,
      }));

      let loadedProducts: HomeProduct[] = (productsResult.data ?? []).map((product: any) => {
        const category = Array.isArray(product.categories) ? product.categories[0] ?? null : product.categories ?? null;
        const rawImages = Array.isArray(product.images) ? product.images : [];
        const imageUrls = rawImages.filter((image: unknown): image is string => typeof image === "string");
        const isSingle = product.price_type === "single";

        return {
          id: product.id, name: product.name, slug: product.id, description: product.description ?? "",
          price_type: product.price_type,
          categoryId: product.category_id ?? "", categoryName: category?.name ?? "",
          images: imageUrls.map((url: string, index: number) => ({ url, isThumbnail: index === Number(product.thumbnail_index ?? 0), alt: `${product.name} ${index + 1}` })),
          pricing: {
            withoutBlouse: isSingle ? Number(product.single_price ?? 0) : Number(product.without_blouse_price ?? 0),
            withBlouse: isSingle ? Number(product.single_price ?? 0) : Number(product.with_blouse_price ?? 0),
            discountPrice: isSingle ? (product.single_discount_price ?? undefined) : (product.discount_without_blouse_price ?? undefined),
          },
          stock: Number(product.stock_quantity ?? 0), isActive: product.is_active ?? true, isBestSelling: false, isFreeDelivery: Boolean(product.is_free_delivery),
        };
      });

      const featuredProductIds = loadedProducts.slice(0, 5).map((product) => product.id);
      if (featuredProductIds.length > 0) {
        const reviewsResult = await supabase
          .from("reviews")
          .select("product_id, rating")
          .in("product_id", featuredProductIds);
        const summaries = new Map<string, { total: number; count: number }>();
        for (const review of reviewsResult.data ?? []) {
          const current = summaries.get(review.product_id) ?? { total: 0, count: 0 };
          current.total += Number(review.rating ?? 0);
          current.count += 1;
          summaries.set(review.product_id, current);
        }
        loadedProducts = loadedProducts.map((product) => {
          const summary = summaries.get(product.id);
          return summary
            ? { ...product, averageRating: summary.total / summary.count, reviewCount: summary.count }
            : product;
        });
      }

      setCategories(loadedCategories);
      setProducts(loadedProducts);
      setLoading(false);
    }
    loadHomepageData();
  }, []);

  const topProductsFor3D = [...products].slice(0, 5);

  useEffect(() => {
    if (topProductsFor3D.length <= 1 || isHovering3D) return;
    const interval = setInterval(() => setCurrent3DIndex((prev) => (prev + 1) % topProductsFor3D.length), 3500);
    return () => clearInterval(interval);
  }, [topProductsFor3D.length, isHovering3D]);

  function handleCardClick(index: number, position: string, productId: string) {
    if (position === "active") router.push(`/products/${productId}`);
    else setCurrent3DIndex(index);
  }

  function toggleHomeFavorite(productId: string) {
    const next = favoriteIds.includes(productId)
      ? favoriteIds.filter((id) => id !== productId)
      : [...favoriteIds, productId];
    setFavoriteIds(next);
    localStorage.setItem("saree-craftline-favorites", JSON.stringify(next));
    window.dispatchEvent(new Event("saree-craftline-favorites-change"));
  }

  const getDotStyle = (idx: number): React.CSSProperties => {
    const isActive = idx === current3DIndex;
    const isHovered = hovered === `dot-${idx}`;
    return {
      width: isActive ? "30px" : "10px",
      height: "10px",
      borderRadius: isActive ? "10px" : "50%",
      border: "none",
      cursor: "pointer",
      background: isActive ? "#3f0d20" : isHovered ? "#5e233d" : "#d1c1c9", 
      transform: isHovered ? "scale(1.35)" : "scale(1)",
      transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease, width 0.35s ease, border-radius 0.35s ease, box-shadow 0.2s ease",
      boxShadow: isHovered ? "0 4px 12px rgba(125, 51, 85, 0.45)" : "none",
    };
  };

  if (loading) return <main className="site"><div style={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>Products loading...</div></main>;

  return (
    <main className="site">
      {topProductsFor3D.length > 0 && (
        <section className="section" style={{ paddingTop: 12, paddingBottom: 0 }}>
          <div className="container">
            <div className="slider-3d-wrapper" onMouseEnter={() => setIsHovering3D(true)} onMouseLeave={() => setIsHovering3D(false)}>
              <div className="slider-3d-container">
                {topProductsFor3D.map((product, index) => {
                  let position = "hidden";
                  if (index === current3DIndex) position = "active";
                  else if (index === (current3DIndex - 1 + topProductsFor3D.length) % topProductsFor3D.length) position = "prev";
                  else if (index === (current3DIndex + 1) % topProductsFor3D.length) position = "next";
                  else if (index === (current3DIndex - 2 + topProductsFor3D.length) % topProductsFor3D.length) position = "far-prev";
                  else if (index === (current3DIndex + 2) % topProductsFor3D.length) position = "far-next";
                  else return null;

                  const imageUrl = product.images.find((img) => img.isThumbnail)?.url || product.images[0]?.url || "";
                  const price = product.pricing.discountPrice || product.pricing.withoutBlouse;
                  const isHoveredCard = hovered === `card-${index}`;
                  const isFavorite = favoriteIds.includes(product.id);
                  const badge = product.isBestSelling ? "Best Seller" : index === 0 ? "Featured" : index === 1 ? "Trending" : "New";

                  return (
                    <div
                      key={product.id}
                      className={`slider-3d-card ${position}`}
                      onClick={() => handleCardClick(index, position, product.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleCardClick(index, position, product.id);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`${product.name}, ৳ ${price.toLocaleString("bn-BD")}`}
                      onMouseEnter={() => setHovered(`card-${index}`)}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        transition: "transform 0.75s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.25s ease, filter 0.25s ease, opacity 0.75s ease",
                        filter: isHoveredCard ? "brightness(1.08)" : "brightness(1)",
                        boxShadow: isHoveredCard && position === "active" ? "0 25px 50px rgba(0, 0, 0, 0.15), 0 0 0 3px rgba(125, 51, 85, 0.2)" : "0 10px 30px rgba(0, 0, 0, 0.08)",
                      }}
                    >
                      <div className="slider-3d-image-wrap">
                        {imageUrl ? <img src={imageUrl} alt={product.name} /> : <div className="slider-no-image">👗</div>}
                        <span className="slider-product-badge">✦ {badge}</span>
                        <button
                          type="button"
                          className={`slider-favorite ${isFavorite ? "is-favorite" : ""}`}
                          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleHomeFavorite(product.id);
                          }}
                        >
                          {isFavorite ? "♥" : "♡"}
                        </button>
                      </div>
                      <div className="slider-3d-info">
                        <h4>{product.name}</h4>
                        <div className="slider-rating" aria-label={product.reviewCount ? `Rated ${product.averageRating?.toFixed(1)} from ${product.reviewCount} reviews` : "No reviews yet"}>
                          <span className="slider-stars">{Array.from({ length: 5 }, (_, star) => <i className={star < Math.round(product.averageRating ?? 0) ? "filled" : ""} key={star}>★</i>)}</span>
                          <small>{product.reviewCount ? `${product.averageRating?.toFixed(1)} · ${product.reviewCount} Reviews` : "নতুন কালেকশন"}</small>
                        </div>
                        <p>৳ {price.toLocaleString("bn-BD")}</p>
                        <div className="slider-actions">
                          <button
                            type="button"
                            className="slider-add-to-cart"
                            disabled={product.stock <= 0}
                            onClick={(event) => {
                              event.stopPropagation();
                              addToCart(product, "withoutBlouse", 1);
                            }}
                          >
                            {product.stock <= 0 ? "স্টক নেই" : "🛒 কার্টে যোগ করুন"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="slider-3d-dots">
                {topProductsFor3D.map((_, idx) => (
                  <button key={idx} onClick={() => setCurrent3DIndex(idx)} onMouseEnter={() => setHovered(`dot-${idx}`)} onMouseLeave={() => setHovered(null)} style={getDotStyle(idx)} />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2 className="section-title">আমাদের কালেকশন</h2>
            <span className="section-title-underline" />
            <p className="section-text">আপনার পছন্দের শাড়ির ক্যাটাগরি বেছে নিন</p>
          </div>
          <CategorySlider categories={categories} />
        </div>
      </section>

      <div className="container">
        {categories.map((category) => (
          <CategorySection key={category.id} category={category} products={products} />
        ))}
        <div className="all-products-button">
          <Link
            href="/all-products"
            onMouseEnter={() => setHovered("viewAll")}
            onMouseLeave={() => setHovered(null)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "14px 28px",
              borderRadius: "999px",
              textDecoration: "none",
              color: "#ffffff",
              background: hovered === "viewAll" ? "linear-gradient(135deg, #64172f, #3f0d20)" : "linear-gradient(135deg, #3f0d20, #5e233d)",
              border: "1px solid #5e233d",
              fontSize: "13.5px",
              fontWeight: 900,
              transition: BUTTON_TRANSITION,
              transform: hovered === "viewAll" ? "translateY(-3px) scale(1.04)" : "translateY(0) scale(1)",
              boxShadow: hovered === "viewAll" ? "0 14px 30px rgba(125, 51, 85, 0.4)" : "0 6px 16px rgba(125, 51, 85, 0.18)",
              cursor: "pointer",
            }}
          >
            <span>সব প্রোডাক্ট দেখুন</span>
          </Link>
        </div>
      </div>

      <style jsx>{`
        /* ✨ এখানে ব্যাকগ্রাউন্ড সম্পূর্ণ সাদা করা হয়েছে */
        .site { min-height: 100vh; background: #ffffff; color: #201a1d; font-family: "Inter", sans-serif; }
        .container { width: min(1180px, calc(100% - 32px)); margin: 0 auto; }
        .section { padding: 34px 0; }
        .section-head { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 4px; margin-bottom: 26px; }
        .section-title { margin: 0; font-size: clamp(26px, 3.5vw, 34px); letter-spacing: -0.7px; font-weight: 900; color: #3f0d20; text-align: center; }
        .section-title-underline { display: block; width: 70px; height: 3px; margin-top: 10px; border-radius: 3px; background: linear-gradient(90deg, transparent, #3f0d20, #5e233d, #3f0d20, transparent); }
        .section-text { margin: 8px 0 0; color: #88757d; font-size: 13px; text-align: center; }
        .all-products-button { padding: 24px 0 40px; text-align: center; }

        .slider-3d-wrapper { position: relative; height: 530px; display: flex; flex-direction: column; justify-content: center; align-items: center; margin: 0 0 4px; perspective: 1400px; overflow: hidden; }
        .slider-3d-container { position: relative; width: 100%; height: 460px; transform-style: preserve-3d; display: flex; justify-content: center; align-items: center; }
        .slider-3d-card { position: absolute; width: clamp(290px, 34vw, 400px); height: 450px; border-radius: 23px; overflow: hidden; background: #fff; cursor: pointer; border: 1px solid #e5dfe1; box-shadow: 0 12px 32px rgba(47, 24, 33, .1); transform-origin: center; transition: transform .7s cubic-bezier(.22,.75,.25,1), box-shadow .3s ease, opacity .5s ease; }
        .slider-3d-card.active { transform: translateX(0) translateZ(0) scale(1); z-index: 10; opacity: 1; box-shadow: 0 24px 60px rgba(47, 24, 33, .2); }
        .slider-3d-card.prev { transform: translateX(-270px) translateZ(-110px) rotateY(20deg) scale(.88); z-index: 5; opacity: .96; }
        .slider-3d-card.next { transform: translateX(270px) translateZ(-110px) rotateY(-20deg) scale(.88); z-index: 5; opacity: .96; }
        .slider-3d-card.far-prev { transform: translateX(-500px) translateZ(-220px) rotateY(30deg) scale(.74); z-index: 1; opacity: .8; }
        .slider-3d-card.far-next { transform: translateX(500px) translateZ(-220px) rotateY(-30deg) scale(.74); z-index: 1; opacity: .8; }
        .slider-3d-image-wrap { height: 62%; width: 100%; position: relative; overflow: hidden; background: #f8f7f7; }
        .slider-3d-image-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .5s ease; }
        .slider-3d-card.active:hover .slider-3d-image-wrap img { transform: scale(1.035); }
        .slider-no-image { display: grid; width: 100%; height: 100%; place-items: center; font-size: 72px; }
        .slider-product-badge { position: absolute; top: 18px; left: 18px; display: inline-flex; align-items: center; gap: 6px; padding: 9px 13px; border-radius: 999px; background: #64172f; color: #fff; box-shadow: 0 6px 18px rgba(84,17,38,.2); font-size: 11px; font-weight: 850; letter-spacing: .02em; }
        .slider-favorite { position: absolute; top: 16px; right: 16px; width: 42px; height: 42px; display: grid; place-items: center; border: 0; border-radius: 50%; background: rgba(255,255,255,.96); color: #64172f; box-shadow: 0 4px 14px rgba(30,15,20,.16); font-size: 25px; line-height: 1; cursor: pointer; transition: transform .2s ease, background .2s ease; }
        .slider-favorite:hover { transform: scale(1.08); }
        .slider-favorite.is-favorite { background: #64172f; color: #fff; }
        .slider-3d-info { display: flex; height: 38%; flex-direction: column; align-items: center; justify-content: center; gap: 5px; padding: 12px 18px 14px; text-align: center; background: #fff; }
        .slider-3d-info h4 { max-width: 100%; margin: 0; color: #281c21; font-size: clamp(16px, 1.5vw, 21px); font-weight: 850; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .slider-3d-info p { margin: 2px 0 0; color: #64172f; font-size: 22px; font-weight: 950; }
        .slider-rating { display: flex; align-items: center; justify-content: center; gap: 8px; color: #64172f; line-height: 1; }
        .slider-stars { display: inline-flex; gap: 1px; }
        .slider-stars i { color: #d5cdd1; font-size: 15px; font-style: normal; }
        .slider-stars i.filled { color: #64172f; }
        .slider-rating small { color: #6e626a; font-size: 11px; }
        .slider-actions { display: flex; width: min(100%, 330px); margin-top: 7px; }
        .slider-3d-card:not(.active) .slider-actions { visibility: hidden; height: 0; margin: 0; }
        .slider-add-to-cart { flex: 1; min-height: 48px; padding: 0 16px; border: 1px solid #64172f; border-radius: 999px; background: #64172f; color: #fff; font: inherit; font-size: 14px; font-weight: 850; cursor: pointer; transition: background .2s ease, transform .2s ease, box-shadow .2s ease; }
        .slider-add-to-cart:hover:not(:disabled) { transform: translateY(-2px); background: #3f0d20; box-shadow: 0 8px 20px rgba(84,17,38,.2); }
        .slider-add-to-cart:disabled { border-color: #d9d2d5; background: #f1eff0; color: #81777b; cursor: not-allowed; }
        .slider-3d-dots { display: flex; gap: 9px; margin-top: 16px; z-index: 20; }

        @media (max-width: 900px) {
          .slider-3d-wrapper { height: 500px; }
          .slider-3d-container { height: 430px; }
          .slider-3d-card { width: min(340px, 50vw); height: 420px; }
          .slider-3d-card.prev { transform: translateX(-215px) translateZ(-100px) rotateY(18deg) scale(.82); }
          .slider-3d-card.next { transform: translateX(215px) translateZ(-100px) rotateY(-18deg) scale(.82); }
          .slider-3d-card.far-prev { transform: translateX(-375px) translateZ(-180px) rotateY(26deg) scale(.68); }
          .slider-3d-card.far-next { transform: translateX(375px) translateZ(-180px) rotateY(-26deg) scale(.68); }
          .slider-3d-info { padding: 12px 14px; }
          .slider-3d-info p { font-size: 19px; }
          .slider-stars i { font-size: 13px; }
          .slider-rating small { font-size: 10px; }
        }
        @media (max-width: 600px) {
          .slider-3d-wrapper { height: 420px; margin-top: 0; }
          .slider-3d-container { height: 360px; }
          .slider-3d-card { width: min(310px, 78vw); height: 350px; border-radius: 20px; }
          .slider-3d-card.prev { transform: translateX(-142px) translateZ(-80px) rotateY(12deg) scale(.78); }
          .slider-3d-card.next { transform: translateX(142px) translateZ(-80px) rotateY(-12deg) scale(.78); }
          .slider-3d-card.far-prev { transform: translateX(-270px) translateZ(-150px) rotateY(18deg) scale(.65); }
          .slider-3d-card.far-next { transform: translateX(270px) translateZ(-150px) rotateY(-18deg) scale(.65); }
          .slider-3d-image-wrap { height: 57%; }
          .slider-3d-info { height: 43%; gap: 3px; padding: 8px 12px 10px; }
          .slider-product-badge { top: 12px; left: 12px; padding: 7px 10px; font-size: 9px; }
          .slider-favorite { top: 11px; right: 11px; width: 36px; height: 36px; font-size: 22px; }
          .slider-3d-info h4 { font-size: 16px; }
          .slider-3d-info p { font-size: 19px; }
          .slider-actions { width: min(100%, 300px); margin-top: 5px; }
          .slider-add-to-cart { min-height: 42px; padding: 0 10px; font-size: 12px; }
          .slider-3d-dots { margin-top: 10px; }
        }
      `}</style>
    </main>
  );
}
