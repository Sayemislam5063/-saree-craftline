"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import CategorySlider from "../../components/categories/category-slider";
import ProductGrid from "../../components/products/product-grid";
import { supabase } from "../../lib/supabase/supabase-client";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
};

export default function AllProductsPage() {
  const [categories, setCategories] = useState<
    Category[]
  >([]);

  const [products, setProducts] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      /* 1️⃣ Load categories */
      const {
        data: categoriesData,
        error: categoriesError,
      } = await supabase
        .from("categories")
        .select("id, name, slug, image_url, is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (categoriesError) {
        console.error(
          "Categories load error:",
          categoriesError,
        );
      }

      const normalizedCategories = (
        categoriesData ?? []
      ).map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: "",
        imageUrl: cat.image_url ?? "",
        isActive: cat.is_active ?? true,
      }));

      setCategories(normalizedCategories);

      /* 2️⃣ Load all products */
      const { data: productsData, error: productsError } =
        await supabase
          .from("products")
          .select(`
            id,
            name,
            description,
            category_id,
            stock_quantity,
            price_type,
            without_blouse_price,
            discount_without_blouse_price,
            with_blouse_price,
            discount_with_blouse_price,
            single_price,
            single_discount_price,
            images,
            thumbnail_index,
            is_active,
            is_free_delivery,
            categories (
              id,
              name,
              slug
            )
          `)
          .eq("is_active", true)
          .order("created_at", { ascending: false });

      if (productsError) {
        console.error(
          "Products load error:",
          productsError,
        );
        setProducts([]);
        setLoading(false);
        return;
      }

      /* 3️⃣ Normalize products for ProductCard */
      const normalized = (productsData ?? []).map(
        (product: any) => {
          const cat = Array.isArray(
            product.categories,
          )
            ? product.categories[0] ?? null
            : product.categories ?? null;

          const rawImages = Array.isArray(
            product.images,
          )
            ? product.images
            : [];

          const imageUrls = rawImages.filter(
            (image: unknown): image is string =>
              typeof image === "string",
          );

          const isSingle =
            product.price_type === "single";

          return {
            id: product.id,
            name: product.name,
            slug: product.id,
            description:
              product.description ?? "",

            categoryId:
              product.category_id ?? "",

            categoryName: cat?.name ?? "",

            categorySlug: cat?.slug ?? "",

            images: imageUrls.map(
              (url: string, index: number) => ({
                url,
                isThumbnail:
                  index ===
                  Number(
                    product.thumbnail_index ?? 0,
                  ),
                alt: `${product.name} ${index + 1}`,
              }),
            ),

            pricing: {
              withoutBlouse: isSingle
                ? Number(
                    product.single_price ?? 0,
                  )
                : Number(
                    product.without_blouse_price ?? 0,
                  ),

              withBlouse: isSingle
                ? Number(
                    product.single_price ?? 0,
                  )
                : Number(
                    product.with_blouse_price ?? 0,
                  ),

              discountPrice: isSingle
                ? product.single_discount_price !==
                    null &&
                  product.single_discount_price !==
                    undefined
                  ? Number(
                      product.single_discount_price,
                    )
                  : undefined
                : product
                      .discount_without_blouse_price !==
                    null &&
                  product
                    .discount_without_blouse_price !==
                    undefined
                  ? Number(
                      product
                        .discount_without_blouse_price,
                    )
                  : undefined,
            },

            stock: Number(
              product.stock_quantity ?? 0,
            ),

            isActive:
              product.is_active ?? true,

            isBestSelling: false,

            isFreeDelivery: Boolean(
              product.is_free_delivery,
            ),
          };
        },
      );

      setProducts(normalized);
      setLoading(false);
    }

    loadData();
  }, []);

  return (
    <main className="page">
      <div className="container">
        <div className="breadcrumb">
          <Link href="/">Home</Link>
          <span>›</span>
          <span>সব প্রোডাক্ট</span>
        </div>

        <section className="hero">
          <p className="eyebrow">OUR COLLECTION</p>

          <h1>সব প্রোডাক্ট</h1>

          <p>
            Saree Craftline-এর সব শাড়ি এক জায়গায় দেখুন।
          </p>
        </section>

        {/* ============ CATEGORIES ============ */}
        {categories.length > 0 && (
          <section className="category-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">CATEGORIES</p>
                <h2>ক্যাটাগরি</h2>
              </div>
            </div>

            <CategorySlider categories={categories} />
          </section>
        )}

        {/* ============ ALL PRODUCTS ============ */}
        <section className="products-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ALL PRODUCTS</p>
              <h2>সব শাড়ি</h2>
            </div>

            <span className="count">
              {loading
                ? "Loading..."
                : `${products.length}টি Product`}
            </span>
          </div>

          {loading ? (
            <div className="loading-box">
              <div className="loading-spinner" />
              <p>Products loading...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="empty-box">
              <div className="empty-icon">🛍️</div>
              <h3>এখনো কোনো product নেই</h3>
              <p>
                শীঘ্রই নতুন শাড়ি যোগ করা হবে।
              </p>
            </div>
          ) : (
            <ProductGrid products={products} />
          )}
        </section>
      </div>

      <style jsx>{`
        .page {
          min-height: 70vh;
          padding: 30px 0 70px;
          background:
            radial-gradient(
              circle at top left,
              rgba(125, 51, 85, 0.08), /* Maroon tint replacing pink */
              transparent 30%
            ),
            #fff;
        }

        .container {
          width: min(1180px, calc(100% - 24px));
          margin: 0 auto;
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 24px;
          color: #89767e;
          font-size: 12px;
        }

        .breadcrumb a {
          color: #7D3355; /* Maroon */
          text-decoration: none;
          font-weight: 700;
          transition: color 0.2s ease;
        }

        .breadcrumb a:hover {
          color: #9c426b; /* Lighter Maroon on hover */
          text-decoration: underline;
        }

        .hero {
          padding: 28px 24px;
          margin-bottom: 34px;
          border-radius: 24px;
          background:
            linear-gradient(
              135deg,
              rgba(125, 51, 85, 0.05), /* Maroon tint */
              rgba(125, 51, 85, 0.02)
            );
          border: 1px solid rgba(93, 67, 77, 0.08);
        }

        .eyebrow {
          margin: 0 0 8px;
          color: #7D3355; /* Maroon */
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1.5px;
        }

        .hero h1 {
          margin: 0;
          font-size: clamp(30px, 5vw, 48px);
          line-height: 1.1;
          color: #241d22;
        }

        .hero p:last-child {
          margin: 12px 0 0;
          color: #77686f;
          line-height: 1.7;
          font-size: 14px;
        }

        .category-section {
          margin-bottom: 42px;
        }

        .products-section {
          margin-top: 10px;
        }

        .section-heading {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }

        .section-heading h2 {
          margin: 0;
          font-size: 26px;
          color: #241d22;
        }

        .count {
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(125, 51, 85, 0.08); /* Maroon tint bg */
          color: #7D3355; /* Maroon text */
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        /* ============ LOADING ============ */

        .loading-box {
          min-height: 320px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          color: #9a8d95;
          font-size: 12px;
          font-weight: 600;
        }

        .loading-spinner {
          width: 42px;
          height: 42px;
          border: 4px solid rgba(125, 51, 85, 0.15); /* Maroon tint */
          border-top-color: #7D3355; /* Maroon */
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* ============ EMPTY ============ */

        .empty-box {
          min-height: 320px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 10px;
          padding: 40px 20px;
        }

        .empty-icon {
          width: 70px;
          height: 70px;
          display: grid;
          place-items: center;
          border-radius: 20px;
          background: rgba(125, 51, 85, 0.08); /* Maroon tint bg */
          font-size: 32px;
          margin-bottom: 4px;
        }

        .empty-box h3 {
          margin: 0;
          color: #3b3035;
          font-size: 17px;
          font-weight: 800;
        }

        .empty-box p {
          margin: 0;
          color: #9a8d95;
          font-size: 12px;
        }

        /* ============ RESPONSIVE ============ */

        @media (max-width: 600px) {
          .hero {
            padding: 22px 18px;
          }

          .section-heading h2 {
            font-size: 22px;
          }
        }
      `}</style>
    </main>
  );
}