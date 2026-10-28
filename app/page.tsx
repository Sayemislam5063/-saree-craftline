"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CategorySlider from "../components/categories/category-slider";
import CategorySection from "../components/category-section";
import { supabase } from "../lib/supabase/supabase-client";

type HomeCategory = {
  id: string; name: string; slug: string; description: string; imageUrl: string; isActive: boolean;
};
type HomeProduct = {
  id: string; name: string; slug: string; description: string; categoryId: string; categoryName: string;
  images: { url: string; isThumbnail: boolean; alt: string; }[];
  pricing: { withoutBlouse: number; withBlouse: number; discountPrice?: number; };
  stock: number; isActive: boolean; isBestSelling: boolean; isFreeDelivery: boolean;
};

const BUTTON_TRANSITION =
  "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease";

export default function HomePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<HomeCategory[]>([]);
  const [products, setProducts] = useState<HomeProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [current3DIndex, setCurrent3DIndex] = useState(0);
  const [isHovering3D, setIsHovering3D] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

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

      const loadedProducts = (productsResult.data ?? []).map((product: any) => {
        const category = Array.isArray(product.categories) ? product.categories[0] ?? null : product.categories ?? null;
        const rawImages = Array.isArray(product.images) ? product.images : [];
        const imageUrls = rawImages.filter((image: unknown): image is string => typeof image === "string");
        const isSingle = product.price_type === "single";

        return {
          id: product.id, name: product.name, slug: product.id, description: product.description ?? "",
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

  const getDotStyle = (idx: number): React.CSSProperties => {
    const isActive = idx === current3DIndex;
    const isHovered = hovered === `dot-${idx}`;
    return {
      width: isActive ? "30px" : "10px",
      height: "10px",
      borderRadius: isActive ? "10px" : "50%",
      border: "none",
      cursor: "pointer",
      background: isActive ? "#7d3355" : isHovered ? "#5e233d" : "#d1c1c9", 
      transform: isHovered ? "scale(1.35)" : "scale(1)",
      transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease, width 0.35s ease, border-radius 0.35s ease, box-shadow 0.2s ease",
      boxShadow: isHovered ? "0 4px 12px rgba(125, 51, 85, 0.45)" : "none",
    };
  };

  if (loading) return <main className="site"><div style={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>Products loading...</div></main>;

  return (
    <main className="site">
      {topProductsFor3D.length > 0 && (
        <section className="section" style={{ paddingBottom: 0 }}>
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

                  return (
                    <div
                      key={product.id}
                      className={`slider-3d-card ${position}`}
                      onClick={() => handleCardClick(index, position, product.id)}
                      onMouseEnter={() => setHovered(`card-${index}`)}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        transition: "transform 0.75s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.25s ease, filter 0.25s ease, opacity 0.75s ease",
                        filter: isHoveredCard ? "brightness(1.08)" : "brightness(1)",
                        boxShadow: isHoveredCard && position === "active" ? "0 25px 50px rgba(0, 0, 0, 0.15), 0 0 0 3px rgba(125, 51, 85, 0.2)" : "0 10px 30px rgba(0, 0, 0, 0.08)",
                      }}
                    >
                      {imageUrl ? <img src={imageUrl} alt={product.name} /> : <div style={{ width: "100%", height: "75%", display: "grid", placeItems: "center", fontSize: "60px", background: "#fdfafb" }}>👗</div>}
                      
                      <div className="slider-3d-info">
                        <span className="category-tag">{product.categoryName || "SAREE"}</span>
                        <h4>{product.name}</h4>
                        <p>৳ {price.toLocaleString("bn-BD")}</p>
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
              background: hovered === "viewAll" ? "linear-gradient(135deg, #8f3a5f, #7d3355)" : "linear-gradient(135deg, #7d3355, #5e233d)",
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
        .section-title { margin: 0; font-size: clamp(26px, 3.5vw, 34px); letter-spacing: -0.7px; font-weight: 900; color: #7d3355; text-align: center; }
        .section-title-underline { display: block; width: 70px; height: 3px; margin-top: 10px; border-radius: 3px; background: linear-gradient(90deg, transparent, #7d3355, #5e233d, #7d3355, transparent); }
        .section-text { margin: 8px 0 0; color: #88757d; font-size: 13px; text-align: center; }
        .all-products-button { padding: 24px 0 40px; text-align: center; }

        .slider-3d-wrapper { position: relative; height: 460px; display: flex; flex-direction: column; justify-content: center; align-items: center; margin-top: 30px; margin-bottom: 10px; perspective: 1200px; overflow: hidden; }
        .slider-3d-container { position: relative; width: 100%; height: 340px; transform-style: preserve-3d; display: flex; justify-content: center; align-items: center; }
        
        .slider-3d-card { position: absolute; width: 250px; height: 340px; border-radius: 24px; overflow: hidden; background: #fff; cursor: pointer; border: 1px solid rgba(93, 67, 77, 0.1); }
        .slider-3d-card img { width: 100%; height: 75%; object-fit: cover; display: block; }
        
        .slider-3d-info { padding: 14px 15px; text-align: center; background: transparent; }
        .slider-3d-info h4 { margin: 0; font-size: 15px; color: #333; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .slider-3d-info p { margin: 6px 0 0; font-weight: 900; color: #7d3355; font-size: 17px; }
        .slider-3d-info .category-tag { display: block; font-size: 9px; color: #9a7c88; font-weight: 900; text-transform: uppercase; margin-bottom: 4px; }
        
        .slider-3d-card.active { transform: translateX(0) translateZ(0) scale(1.1); z-index: 10; opacity: 1; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12); }
        .slider-3d-card.prev { transform: translateX(-165px) translateZ(-100px) rotateY(28deg); z-index: 5; opacity: 0.9; }
        .slider-3d-card.next { transform: translateX(165px) translateZ(-100px) rotateY(-28deg); z-index: 5; opacity: 0.9; }
        .slider-3d-card.far-prev { transform: translateX(-290px) translateZ(-200px) rotateY(38deg); z-index: 1; opacity: 0.5; }
        .slider-3d-card.far-next { transform: translateX(290px) translateZ(-200px) rotateY(-38deg); z-index: 1; opacity: 0.5; }
        .slider-3d-dots { display: flex; gap: 8px; margin-top: 30px; z-index: 20; }
      `}</style>
    </main>
  );
}