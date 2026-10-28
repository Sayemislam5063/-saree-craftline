"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import ProductGrid from "../../components/products/product-grid";
import { supabase } from "../../lib/supabase/supabase-client";

const FAVORITES_STORAGE_KEY =
  "saree-craftline-favorites";

export default function FavoritesPage() {
  const [favoriteIds, setFavoriteIds] = useState<
    string[]
  >([]);

  const [favoriteProducts, setFavoriteProducts] =
    useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  /* ============================================
     ✨ Load favorite IDs + fetch real products
     ============================================ */
  useEffect(() => {
    async function loadFavorites() {
      try {
        /* 1️⃣ Load favorite IDs from localStorage */
        const savedFavorites =
          localStorage.getItem(
            FAVORITES_STORAGE_KEY,
          );

        let ids: string[] = [];

        if (savedFavorites) {
          const parsed = JSON.parse(savedFavorites);

          if (Array.isArray(parsed)) {
            ids = parsed.filter(
              (id) => typeof id === "string",
            );
          }
        }

        setFavoriteIds(ids);

        if (ids.length === 0) {
          setIsLoading(false);
          return;
        }

        /* 2️⃣ Fetch only these products from Supabase */
        const { data, error } = await supabase
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
          .in("id", ids)
          .eq("is_active", true);

        if (error) {
          console.error(
            "Favorites products load error:",
            error,
          );
          setFavoriteProducts([]);
          setIsLoading(false);
          return;
        }

        /* 3️⃣ Normalize for ProductCard */
        const normalized = (data ?? []).map(
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
                      product.without_blouse_price ??
                        0,
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

        /* 4️⃣ Preserve user's favorite order */
        const ordered = ids
          .map((id) =>
            normalized.find((p) => p.id === id),
          )
          .filter(Boolean);

        setFavoriteProducts(ordered);
        setIsLoading(false);
      } catch (error) {
        console.error(
          "Favorites load error:",
          error,
        );
        setFavoriteProducts([]);
        setIsLoading(false);
      }
    }

    loadFavorites();
  }, []);

  /* ============================================
     ✨ Re-sync when favorites change elsewhere
     ============================================ */
  useEffect(() => {
    const handleChange = () => {
      /* Re-read localStorage and refetch */
      const savedFavorites =
        localStorage.getItem(
          FAVORITES_STORAGE_KEY,
        );

      let ids: string[] = [];

      try {
        if (savedFavorites) {
          const parsed = JSON.parse(savedFavorites);

          if (Array.isArray(parsed)) {
            ids = parsed.filter(
              (id) => typeof id === "string",
            );
          }
        }
      } catch {
        /* ignore */
      }

      if (ids.length === 0) {
        setFavoriteProducts([]);
        return;
      }

      /* Refetch matching products */
      supabase
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
        .in("id", ids)
        .eq("is_active", true)
        .then(({ data, error }) => {
          if (error) {
            console.error(
              "Favorites re-sync error:",
              error,
            );
            return;
          }

          const normalized = (data ?? []).map(
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
                  (
                    url: string,
                    index: number,
                  ) => ({
                    url,
                    isThumbnail:
                      index ===
                      Number(
                        product.thumbnail_index ??
                          0,
                      ),
                    alt: `${product.name} ${
                      index + 1
                    }`,
                  }),
                ),

                pricing: {
                  withoutBlouse: isSingle
                    ? Number(
                        product.single_price ?? 0,
                      )
                    : Number(
                        product.without_blouse_price ??
                          0,
                      ),

                  withBlouse: isSingle
                    ? Number(
                        product.single_price ?? 0,
                      )
                    : Number(
                        product.with_blouse_price ??
                          0,
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

          const ordered = ids
            .map((id) =>
              normalized.find((p) => p.id === id),
            )
            .filter(Boolean);

          setFavoriteProducts(ordered);
        });
    };

    window.addEventListener(
      "saree-craftline-favorites-change",
      handleChange,
    );

    return () => {
      window.removeEventListener(
        "saree-craftline-favorites-change",
        handleChange,
      );
    };
  }, []);

  return (
    <main className="page">
      <div className="container">
        <div className="breadcrumb">
          <Link href="/">Home</Link>
          <span>›</span>
          <span>Favorite</span>
        </div>

        <section className="hero">
          <p className="eyebrow">YOUR FAVORITES</p>

          <h1>আপনার পছন্দের শাড়ি</h1>

          <p>
            আপনি যেসব শাড়ি Favorite করে রেখেছেন
            সেগুলো এখানে পাবেন।
          </p>
        </section>

        {isLoading ? (
          <div className="loading-box">
            <div className="loading-spinner" />
            <p>Favorites loading...</p>
          </div>
        ) : favoriteProducts.length > 0 ? (
          <ProductGrid
            products={favoriteProducts}
          />
        ) : (
          <div className="empty">
            <div className="heart">♡</div>

            <h2>
              এখনো কোনো Favorite product নেই
            </h2>

            <p>
              পছন্দের product-এর ❤️ button-এ click
              করে এখানে save করুন।
            </p>

            <Link href="/" className="home-button">
              শাড়ি দেখা শুরু করুন →
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
          margin-bottom: 24px;
          color: #89767e;
          font-size: 12px;
        }

        .breadcrumb a {
          color: #70415a;
          text-decoration: none;
          font-weight: 700;
          transition: color 0.2s ease;
        }

        .breadcrumb a:hover {
          color: #a04a72;
          text-decoration: underline;
        }

        .hero {
          padding: 28px 24px;
          margin-bottom: 30px;
          border-radius: 24px;
          background:
            linear-gradient(
              135deg,
              rgba(250, 238, 244, 0.95),
              rgba(245, 239, 255, 0.88)
            );
          border: 1px solid rgba(93, 67, 77, 0.08);
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
          font-size: clamp(30px, 5vw, 46px);
          line-height: 1.1;
          color: #241d22;
        }

        .hero p:last-child {
          margin: 12px 0 0;
          color: #77686f;
          line-height: 1.8;
          font-size: 14px;
        }

        /* ============ LOADING ============ */

        .loading-box {
          min-height: 400px;
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
          border: 4px solid #f1dce5;
          border-top-color: #b14f79;
          border-radius: 50%;
          animation: spin 0.8s linear
            infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* ============ EMPTY ============ */

        .empty {
          min-height: 420px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          text-align: center;
          padding: 50px 20px;
        }

        .heart {
          width: 74px;
          height: 74px;
          display: grid;
          place-items: center;
          margin-bottom: 18px;
          border-radius: 22px;
          background: #faeef4;
          color: #d64072;
          font-size: 38px;
        }

        .empty h2 {
          margin: 0;
          color: #332a2f;
          font-size: 22px;
        }

        .empty p {
          max-width: 420px;
          margin: 10px 0 20px;
          color: #85757d;
          line-height: 1.7;
          font-size: 13px;
        }

        .home-button {
          display: inline-flex;
          padding: 13px 20px;
          border-radius: 13px;
          background: #241d22;
          color: #fff;
          text-decoration: none;
          font-weight: 800;
          font-size: 13px;
          transition:
            transform 0.25s
              cubic-bezier(0.34, 1.56, 0.64, 1),
            box-shadow 0.25s ease;
        }

        .home-button:hover {
          transform: translateY(-2px);
          box-shadow:
            0 12px 24px
              rgba(36, 29, 34, 0.2);
        }
      `}</style>
    </main>
  );
}