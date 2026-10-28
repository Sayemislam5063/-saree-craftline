"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import ProductGrid from "../../../components/products/product-grid";
import { supabase } from "../../../lib/supabase/supabase-client";

type CategoryData = {
  id: string;
  name: string;
  slug: string;
  description: string;
};

export default function CategoryPage() {
  const params = useParams<{ slug: string }>();

  const [category, setCategory] =
    useState<CategoryData | null>(null);

  const [products, setProducts] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    async function loadCategoryData() {
      setLoading(true);

      /* 1️⃣ Load category by slug */
      const { data: categoryData, error: categoryError } =
        await supabase
          .from("categories")
          .select("id, name, slug, image_url, is_active")
          .eq("slug", params.slug)
          .eq("is_active", true)
          .maybeSingle();

      if (categoryError || !categoryData) {
        console.error(
          "Category load error:",
          categoryError,
        );
        setCategory(null);
        setLoading(false);
        return;
      }

      setCategory({
        id: categoryData.id,
        name: categoryData.name,
        slug: categoryData.slug,
        description: "",
      });

      /* 2️⃣ Load products for that category */
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
          .eq("category_id", categoryData.id)
          .eq("is_active", true)
          .order("created_at", {
            ascending: false,
          });

      if (productsError) {
        console.error(
          "Category products load error:",
          productsError,
        );
        setProducts([]);
        setLoading(false);
        return;
      }

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

    if (params.slug) {
      loadCategoryData();
    }
  }, [params.slug]);

  /* Loading state */
  if (loading) {
    return (
      <main className="loading-page">
        <div className="loading-box">
          <div className="loading-icon">👗</div>
          <p>Category loading...</p>
        </div>

        <style jsx>{`
          .loading-page {
            min-height: 70vh;
            display: grid;
            place-items: center;
            padding: 40px 20px;
            background: #fff;
            color: #88757d;
          }

          .loading-box {
            text-align: center;
          }

          .loading-icon {
            font-size: 46px;
            margin-bottom: 8px;
            animation: floatIcon 2s ease-in-out
              infinite;
          }

          @keyframes floatIcon {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-8px);
            }
          }

          .loading-box p {
            margin: 0;
            font-size: 13px;
            font-weight: 600;
          }
        `}</style>
      </main>
    );
  }

  if (!category) {
    return (
      <main className="not-found">
        <div className="box">
          <div className="icon">👗</div>

          <h1>Category পাওয়া যায়নি</h1>

          <p>
            এই categoryটি বর্তমানে পাওয়া যাচ্ছে না।
          </p>

          <Link href="/" className="back-button">
            Homepage-এ যান
          </Link>
        </div>

        <style jsx>{`
          .not-found {
            min-height: 70vh;
            display: grid;
            place-items: center;
            padding: 40px 20px;
            background: #fff;
          }

          .box {
            max-width: 500px;
            text-align: center;
            padding: 40px 20px;
          }

          .icon {
            font-size: 56px;
            margin-bottom: 12px;
          }

          .box h1 {
            margin: 0 0 8px;
            font-size: 28px;
          }

          .box p {
            margin: 0 0 22px;
            color: #88757d;
          }

          .back-button {
            display: inline-flex;
            padding: 13px 20px;
            border-radius: 13px;
            background: #241d22;
            color: #fff;
            text-decoration: none;
            font-weight: 800;
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="container">
        <div className="breadcrumb">
          <Link href="/">Home</Link>
          <span>›</span>
          <span>{category.name}</span>
        </div>

        <section className="hero">
          <div>
            <p className="eyebrow">CATEGORY</p>

            <h1>{category.name}</h1>

            {category.description && (
              <p className="description">
                {category.description}
              </p>
            )}
          </div>

          <div className="count">
            {products.length}টি Product
          </div>
        </section>

        {products.length > 0 ? (
          <ProductGrid products={products} />
        ) : (
          <div className="empty">
            <div className="empty-icon">🛍️</div>

            <h2>
              এই category-তে এখনো কোনো product
              নেই
            </h2>

            <Link
              href="/all-products"
              className="all-button"
            >
              সব প্রোডাক্ট দেখুন
            </Link>
          </div>
        )}
      </div>

      <style jsx>{`
        .page {
          min-height: 70vh;
          padding: 30px 0 70px;
          background:
            radial-gradient(
              circle at top left,
              rgba(255, 230, 239, 0.55),
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
          color: #70415a;
          text-decoration: none;
          font-weight: 700;
        }

        .hero {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 20px;
          padding: 24px;
          margin-bottom: 30px;
          border: 1px solid rgba(93, 67, 77, 0.08);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.88);
          box-shadow:
            0 16px 40px rgba(83, 53, 66, 0.06);
        }

        .eyebrow {
          margin: 0 0 8px;
          color: #9a416d;
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

        .description {
          max-width: 650px;
          margin: 12px 0 0;
          color: #77686f;
          line-height: 1.8;
          font-size: 14px;
        }

        .count {
          flex: 0 0 auto;
          padding: 9px 13px;
          border-radius: 999px;
          background: #faeef4;
          color: #8b3d63;
          font-size: 12px;
          font-weight: 800;
        }

        .empty {
          padding: 70px 20px;
          text-align: center;
        }

        .empty-icon {
          font-size: 55px;
          margin-bottom: 14px;
        }

        .empty h2 {
          margin: 0 0 18px;
          color: #3b3035;
          font-size: 20px;
        }

        .all-button {
          display: inline-flex;
          padding: 12px 18px;
          border-radius: 13px;
          background: #241d22;
          color: #fff;
          text-decoration: none;
          font-weight: 800;
        }

        @media (max-width: 650px) {
          .hero {
            align-items: flex-start;
            flex-direction: column;
            padding: 20px;
          }

          .count {
            align-self: flex-start;
          }
        }
      `}</style>
    </main>
  );
}