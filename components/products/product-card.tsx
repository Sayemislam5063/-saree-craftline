"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { Product } from "../../types/product";
import { supabase } from "../../lib/supabase/supabase-client";
import { useCart } from "../cart/cart-provider";

type ProductCardProps = {
  product: Product;
};

const FAVORITES_STORAGE_KEY =
  "saree-craftline-favorites";

export default function ProductCard({
  product,
}: ProductCardProps) {
  const router = useRouter();
  const { addToCart } = useCart();

  const [isFavorite, setIsFavorite] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [quickViewOption, setQuickViewOption] = useState<"withoutBlouse" | "withBlouse" | null>(null);
  const [quickViewQuantity, setQuickViewQuantity] = useState(1);
  const [quickViewNotice, setQuickViewNotice] = useState("");

  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);

  const [poppedButton, setPoppedButton] = useState<
    "cart" | "order" | null
  >(null);

  const thumbnail =
    product.images.find(
      (image) => image.isThumbnail,
    )?.url ||
    product.images[0]?.url ||
    "";

  const pricing = product.pricing as {
    withoutBlouse: number;
    withBlouse: number;
    discountPrice?: number;
    discountWithoutBlouse?: number;
    discountWithBlouse?: number;
  };

  const isSinglePrice =
    pricing.withoutBlouse === pricing.withBlouse;

  const singlePrice =
    pricing.discountPrice ??
    pricing.withoutBlouse;
  const quickViewWithoutBlousePrice = pricing.discountWithoutBlouse ?? pricing.withoutBlouse;
  const quickViewWithBlousePrice = pricing.discountWithBlouse ?? pricing.withBlouse;

  /*
    Stock 0 বা তার কম হলে Out of Stock
  */
  const outOfStock =
    Number(product.stock ?? 0) <= 0;

  const productDetailsUrl =
    `/products/${product.id}`;

  const reviewUrl =
    `/products/${product.id}#reviews`;

  useEffect(() => {
    try {
      const savedFavorites =
        localStorage.getItem(
          FAVORITES_STORAGE_KEY,
        );

      if (!savedFavorites) return;

      const parsed =
        JSON.parse(savedFavorites);

      if (Array.isArray(parsed)) {
        setIsFavorite(
          parsed.includes(product.id),
        );
      }
    } catch (error) {
      console.error(
        "Saree Craftline favorite load error:",
        error,
      );
    }
  }, [product.id]);

  useEffect(() => {
    let cancelled = false;

    async function loadReviewSummary() {
      try {
        const { data, error } =
          await supabase
            .from("reviews")
            .select("rating")
            .eq(
              "product_id",
              product.id,
            );

        if (cancelled) return;

        if (error) {
          console.error(
            "Review summary error:",
            error,
          );

          setReviewsLoaded(true);
          return;
        }

        const list = data ?? [];
        const count = list.length;

        const avg =
          count > 0
            ? list.reduce(
                (sum, r: any) =>
                  sum +
                  Number(
                    r.rating ?? 0,
                  ),
                0,
              ) / count
            : 0;

        setAvgRating(avg);
        setReviewCount(count);
        setReviewsLoaded(true);
      } catch (error) {
        if (cancelled) return;

        console.error(
          "Review summary error:",
          error,
        );

        setReviewsLoaded(true);
      }
    }

    loadReviewSummary();

    return () => {
      cancelled = true;
    };
  }, [product.id]);

  useEffect(() => {
    if (!quickViewOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setQuickViewOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [quickViewOpen]);

  function toggleFavorite() {
    try {
      const savedFavorites =
        localStorage.getItem(
          FAVORITES_STORAGE_KEY,
        );

      const parsed = savedFavorites
        ? JSON.parse(savedFavorites)
        : [];

      const currentIds: string[] =
        Array.isArray(parsed)
          ? parsed
          : [];

      const nextIds =
        currentIds.includes(product.id)
          ? currentIds.filter(
              (id) =>
                id !== product.id,
            )
          : [
              ...currentIds,
              product.id,
            ];

      localStorage.setItem(
        FAVORITES_STORAGE_KEY,
        JSON.stringify(nextIds),
      );

      setIsFavorite(
        nextIds.includes(product.id),
      );

      window.dispatchEvent(
        new Event(
          "saree-craftline-favorites-change",
        ),
      );
    } catch (error) {
      console.error(
        "Saree Craftline favorite save error:",
        error,
      );
    }
  }

  /*
    Out of Stock হলে এই function-এ যাওয়া হবে না।
  */
  function handleButtonClick(
    event: React.MouseEvent<HTMLButtonElement>,
    button: "cart" | "order",
  ) {
    event.preventDefault();

    if (outOfStock) return;

    if (poppedButton !== null) return;

    setPoppedButton(button);
    setQuickViewNotice("");
    setQuickViewOption(null);
    setQuickViewQuantity(1);
    setQuickViewOpen(true);
    window.setTimeout(() => setPoppedButton(null), 400);
  }

  function completeQuickView(action: "cart" | "order") {
    if (outOfStock) return;
    if (!isSinglePrice && !quickViewOption) {
      setQuickViewNotice("আগে শাড়ির অপশন বেছে নিন");
      return;
    }
    const quantity = Math.max(1, Math.min(Number(quickViewQuantity) || 1, Number(product.stock) || 1));
    addToCart(product, quickViewOption ?? "withoutBlouse", quantity);
    if (action === "order") {
      router.push("/checkout");
      return;
    }
    setQuickViewNotice("পণ্যটি কার্টে যোগ হয়েছে");
    window.setTimeout(() => setQuickViewOpen(false), 900);
  }

  const roundedRating =
    Math.round(avgRating * 2) / 2;

  const hasReviews =
    reviewCount > 0;

  return (
    <article className="product-card">
      {/* IMAGE */}
      <Link
        href={productDetailsUrl}
        className="product-image-link"
      >
        <div className="product-image-wrap">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={product.name}
              className="product-image"
            />
          ) : (
            <div className="product-image-placeholder">
              <span>👗</span>
              <small>
                Product Image
              </small>
            </div>
          )}

          {/* FREE DELIVERY */}
          {product.isFreeDelivery && (
            <span className="free-delivery-badge">
              <span className="free-badge-icon">
                🚚
              </span>

              <span className="free-badge-text">
                FREE
              </span>
            </span>
          )}
        </div>
      </Link>

      {/* WISHLIST */}
      <button
        type="button"
        className={
          isFavorite
            ? "wishlist-btn active"
            : "wishlist-btn"
        }
        aria-label={
          isFavorite
            ? "Remove from wishlist"
            : "Add to wishlist"
        }
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          toggleFavorite();
        }}
      >
        {isFavorite ? "♥" : "♡"}
      </button>

      {/* INFO */}
      <div className="product-info">
        {product.categoryName && (
          <p className="product-category">
            {product.categoryName}
          </p>
        )}

        <Link
          href={productDetailsUrl}
          className="product-name-link"
        >
          <h3 className="product-name">
            {product.name}
          </h3>
        </Link>

        {/* STAR RATING */}
        {reviewsLoaded &&
          hasReviews && (
            <Link
              href={reviewUrl}
              className="rating-link"
              aria-label={`${avgRating.toFixed(
                1,
              )} star, ${reviewCount} reviews`}
            >
              <span className="rating-stars">
                {[1, 2, 3, 4, 5].map(
                  (star) => (
                    <span
                      key={star}
                      className={
                        star <=
                        roundedRating
                          ? "rating-star filled"
                          : "rating-star"
                      }
                    >
                      ★
                    </span>
                  ),
                )}
              </span>

              <span className="rating-value">
                {avgRating.toFixed(1)}
              </span>

              <span className="rating-count">
                ({reviewCount})
              </span>
            </Link>
          )}

        {/* NO REVIEWS */}
        {reviewsLoaded &&
          !hasReviews && (
            <Link
              href={reviewUrl}
              className="review-pill-link"
            >
              <span className="review-pill-stars">
                <span className="review-pill-star">
                  ★
                </span>

                <span className="review-pill-star">
                  ★
                </span>

                <span className="review-pill-star">
                  ★
                </span>

                <span className="review-pill-star">
                  ★
                </span>

                <span className="review-pill-star">
                  ★
                </span>
              </span>

              <span className="review-pill-text">
                রিভিউ দিন
              </span>
            </Link>
          )}

        {/* PRICE */}
        <div className="price-wrap">
          {isSinglePrice ? (
            <strong className="price">
              ৳{" "}
              {singlePrice.toLocaleString(
                "bn-BD",
              )}
            </strong>
          ) : (
            <strong className="price">
              ৳{" "}
              {pricing.withoutBlouse.toLocaleString(
                "bn-BD",
              )}{" "}
              -{" "}
              {pricing.withBlouse.toLocaleString(
                "bn-BD",
              )}
            </strong>
          )}
        </div>

         {/* ============ BUTTONS ============ */}
        <div
          style={{
            display: "grid",
            gap: "8px",
            marginTop: "14px",
          }}
        >
          {outOfStock ? (
            /* Out of Stock state */
            <div
              style={{
                width: "100%",
                minHeight: "42px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "12px",
                boxSizing: "border-box",
                background:
                  "linear-gradient(135deg, #f8f7f7, #eae0e5)",
                color: "#806d74",
                border: "1px solid #e5dfe1",
                fontSize: "12px",
                fontWeight: 900,
                cursor: "not-allowed",
                letterSpacing: "0.3px",
              }}
            >
              🚫 Out of Stock
            </div>
          ) : (
            <>
              {/* CART BUTTON */}
              <button
                type="button"
                onClick={(event) =>
                  handleButtonClick(event, "cart")
                }
                className="product-card-action product-card-cart-action"
                style={{
                  width: "100%",
                  minHeight: "42px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  borderRadius: "12px",
                  boxSizing: "border-box",
                  border: "1px solid #e5dfe1",
                  background:
                    "linear-gradient(135deg, #f8f7f7, #f8f7f7)",
                  color: "#541126",
                  fontSize: "12px",
                  fontWeight: 800,
                  textDecoration: "none",
                  cursor: "pointer",
                  boxShadow:
                    "0 2px 6px rgba(84, 17, 38, 0.08)",
                  transition:
                    "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease, background 0.25s ease",
                  animation:
                    poppedButton === "cart"
                      ? "jellyPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)"
                      : "none",
                }}
              >
                🛒 কার্টে যোগ করুন
              </button>

              {/* ORDER BUTTON */}
              <button
                type="button"
                onClick={(event) =>
                  handleButtonClick(event, "order")
                }
                className="product-card-action product-card-order-action"
                style={{
                  width: "100%",
                  minHeight: "42px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  borderRadius: "12px",
                  boxSizing: "border-box",
                  border: 0,
                  background:
                    "linear-gradient(135deg, #2b2227, #1a1318)",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 800,
                  textDecoration: "none",
                  cursor: "pointer",
                  boxShadow:
                    "0 6px 16px rgba(36, 29, 34, 0.22)",
                  transition:
                    "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease, background 0.25s ease",
                  animation:
                    poppedButton === "order"
                      ? "jellyPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)"
                      : "none",
                }}
              >
                🛍️ অর্ডার করুন
              </button>
            </>
          )}
        </div>
      </div>

      {quickViewOpen && typeof document !== "undefined" && createPortal((
        <div className="quick-view-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setQuickViewOpen(false); }}>
          <section className="quick-view-dialog" role="dialog" aria-modal="true" aria-label={`${product.name} quick view`}>
            <button type="button" className="quick-view-close" onClick={() => setQuickViewOpen(false)} aria-label="Close">×</button>
            <div className="quick-view-photo">{thumbnail ? <img src={thumbnail} alt={product.name} /> : <span>🧵</span>}</div>
            <div className="quick-view-content">
              {product.categoryName && <span className="quick-view-eyebrow">{product.categoryName}</span>}
              <h2>{product.name}</h2>
              <p className="quick-view-price">
                {isSinglePrice
                  ? `৳ ${Number(singlePrice).toLocaleString("bn-BD")}`
                  : quickViewOption === null
                    ? `৳ ${Number(quickViewWithoutBlousePrice).toLocaleString("bn-BD")} – ${Number(quickViewWithBlousePrice).toLocaleString("bn-BD")}`
                    : `৳ ${Number(quickViewOption === "withBlouse" ? quickViewWithBlousePrice : quickViewWithoutBlousePrice).toLocaleString("bn-BD")}`}
              </p>
              {product.description && <p className="quick-view-description">{String(product.description).slice(0, 180)}</p>}
              {!isSinglePrice && <fieldset className="quick-view-options"><legend>শাড়ির অপশন</legend><button type="button" className={quickViewOption === "withoutBlouse" ? "selected" : ""} aria-pressed={quickViewOption === "withoutBlouse"} onClick={() => { setQuickViewOption("withoutBlouse"); setQuickViewNotice(""); }}>ব্লাউজ ছাড়া</button><button type="button" className={quickViewOption === "withBlouse" ? "selected" : ""} aria-pressed={quickViewOption === "withBlouse"} onClick={() => { setQuickViewOption("withBlouse"); setQuickViewNotice(""); }}>ব্লাউজসহ</button></fieldset>}
              {!isSinglePrice && !quickViewOption && <p className="quick-view-selection-hint">কার্টে যোগ বা অর্ডার করার আগে একটি অপশন বেছে নিন।</p>}
              <div className="quick-view-quantity"><span>পরিমাণ</span><button type="button" onClick={() => setQuickViewQuantity((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button><strong>{quickViewQuantity}</strong><button type="button" onClick={() => setQuickViewQuantity((q) => Math.min(Number(product.stock) || 1, q + 1))} aria-label="Increase quantity">+</button><small>স্টক {product.stock}</small></div>
              <div className="quick-view-actions"><button type="button" className="quick-view-cart" disabled={!isSinglePrice && !quickViewOption} onClick={() => completeQuickView("cart")}>কার্টে যোগ করুন</button><button type="button" className="quick-view-order" disabled={!isSinglePrice && !quickViewOption} onClick={() => completeQuickView("order")}>এখনই অর্ডার</button></div>
              {quickViewNotice && <p className="quick-view-notice" role="status">✓ {quickViewNotice}</p>}
              <Link className="quick-view-full-details" href={productDetailsUrl}>সম্পূর্ণ বিস্তারিত দেখুন →</Link>
            </div>
          </section>
        </div>
      ), document.body)}

      {/* GLOBAL KEYFRAMES */}
      <style jsx global>{`
        @keyframes jellyPop {
          0% {
            transform: scale(1);
          }

          30% {
            transform:
              scale(0.92)
              translateY(2px);
          }

          55% {
            transform:
              scale(1.08)
              translateY(-3px);
          }

          75% {
            transform:
              scale(0.97)
              translateY(1px);
          }

          100% {
            transform:
              scale(1)
              translateY(0);
          }
        }
      `}</style>

      <style jsx>{`
        /* ============================================
           PRODUCT CARD
           ============================================ */

        .product-card {
          position: relative;
          overflow: hidden;
          border-radius: 20px;
          background: #ffffff;
          border: 1px solid #e5dfe1;
          box-shadow:
            0 8px 32px
              rgba(83, 53, 66, 0.08),
            0 1px 0
              rgba(255, 255, 255, 0.9)
              inset;
          transition:
            transform 0.4s
              cubic-bezier(
                0.34,
                1.56,
                0.64,
                1
              ),
            box-shadow 0.4s ease,
            border-color 0.3s ease;
        }

        .product-card:hover {
          transform: translateY(-5px);
          box-shadow:
            0 20px 50px
              rgba(83, 53, 66, 0.14),
            0 1px 0
              rgba(255, 255, 255, 0.95)
              inset;
          border-color: #a98290;
        }

        /* IMAGE */

        .product-image-link {
          display: block;
          text-decoration: none;
        }

        .product-image-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          overflow: hidden;
          background:
            linear-gradient(
              145deg,
              #f8f7f7,
              #f8f7f7
            );
        }

        .product-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition:
            transform 0.6s
              cubic-bezier(
                0.34,
                1.56,
                0.64,
                1
              );
        }

        .product-card:hover
          .product-image {
          transform: scale(1.05);
        }

        .product-image-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 6px;
          color: #8a737d;
        }

        .product-image-placeholder span {
          font-size: 64px;
        }

        .product-image-placeholder small {
          font-size: 11px;
        }

        /* FREE DELIVERY */

        .free-delivery-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          z-index: 4;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding:
            4px 9px 4px 7px;
          border-radius: 20px;
          background:
            rgba(255, 255, 255, 0.78);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter:
            blur(10px);
          border:
            1px solid
            rgba(63, 166, 106, 0.4);
          color: #1f6b42;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.4px;
          line-height: 1;
          box-shadow:
            0 3px 10px
              rgba(31, 107, 66, 0.15);
          white-space: nowrap;
          pointer-events: none;
          animation:
            freeBadgePop 0.5s
            cubic-bezier(
              0.34,
              1.56,
              0.64,
              1
            );
        }

        .free-badge-icon {
          font-size: 10px;
          line-height: 1;
        }

        .free-badge-text {
          font-size: 9px;
          font-weight: 900;
          line-height: 1;
        }

        @keyframes freeBadgePop {
          from {
            opacity: 0;
            transform:
              scale(0.7)
              translateY(-4px);
          }

          to {
            opacity: 1;
            transform:
              scale(1)
              translateY(0);
          }
        }

        /* WISHLIST */

        .wishlist-btn {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 34px;
          height: 34px;
          padding: 0;
          border:
            1px solid
            rgba(255, 255, 255, 0.9);
          border-radius: 12px;
          background:
            rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter:
            blur(8px);
          color: #241d22;
          cursor: pointer;
          z-index: 5;
          display: grid;
          place-items: center;
          font-size: 20px;
          line-height: 1;
          box-shadow:
            0 4px 12px
              rgba(83, 53, 66, 0.12);
          transition:
            transform 0.3s
              cubic-bezier(
                0.34,
                1.56,
                0.64,
                1
              ),
            background 0.25s ease,
            color 0.25s ease;
        }

        .wishlist-btn:hover {
          transform:
            scale(1.12)
            rotate(-6deg);
        }

        .wishlist-btn:active {
          transform: scale(0.9);
        }

        .wishlist-btn.active {
          background:
            rgba(255, 235, 243, 0.95);
          color: #64172f;
        }

        /* INFO */

        .product-info {
          padding:
            14px 14px 16px;
        }

        .product-category {
          margin: 0 0 5px;
          color: #96727f;
          font-size: 11px;
          line-height: 1.3;
        }

        .product-name-link {
          display: block;
          color: #241d22;
          text-decoration: none;
        }

        .product-name {
          margin: 0;
          font-size: 16px;
          line-height: 1.4;
          font-weight: 800;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* RATING */

        .rating-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 6px;
          text-decoration: none;
          cursor: pointer;
          transition:
            transform 0.2s ease;
        }

        .rating-link:hover {
          transform:
            translateX(2px);
        }

        .rating-stars {
          display: inline-flex;
          gap: 1px;
          line-height: 1;
        }

        .rating-star {
          color: #cfc3c8;
          font-size: 13px;
          line-height: 1;
        }

        .rating-star.filled {
          color: #f5a623;
        }

        .rating-value {
          color: #96727f;
          font-size: 11px;
          font-weight: 700;
        }

        .rating-count {
          color: #b9a9b2;
          font-size: 11px;
        }

        /* REVIEW PILL */

        .review-pill-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 6px;
          padding:
            4px 10px;
          border-radius: 20px;
          background: #f8f7f7;
          border:
            1px solid #f8f7f7;
          text-decoration: none;
          cursor: pointer;
          transition:
            transform 0.25s
              cubic-bezier(
                0.34,
                1.56,
                0.64,
                1
              ),
            background 0.2s ease,
            border-color 0.2s ease,
            box-shadow 0.25s ease;
        }

        .review-pill-link:hover {
          transform:
            translateY(-1px);
          background: #f8f7f7;
          border-color: #a98290;
          box-shadow:
            0 6px 14px
              rgba(
                196,
                108,
                148,
                0.15
              );
        }

        .review-pill-link:active {
          transform: scale(0.96);
        }

        .review-pill-stars {
          display: inline-flex;
          gap: 1px;
          line-height: 1;
        }

        .review-pill-star {
          color: #a98290;
          font-size: 11px;
          line-height: 1;
        }

        .review-pill-text {
          color: #64172f;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.2px;
        }

        /* PRICE */

        .price-wrap {
          margin-top: 10px;
          min-height: 30px;
          display: flex;
          align-items: center;
        }

        .price {
          font-size: 17px;
          color: #64172f;
          font-weight: 800;
          letter-spacing: -0.3px;
        }

        /* ACTION BUTTONS */

        .action-buttons {
          display: grid;
          gap: 8px;
          margin-top: 14px;
        }

        .cart-button,
        .order-button {
          width: 100%;
          min-height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border-radius: 12px;
          box-sizing: border-box;
          font-size: 12px;
          font-weight: 800;
          text-decoration: none;
          cursor: pointer;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            background 0.2s ease;
        }

        .cart-button {
          border:
            1px solid #e5dfe1;
          background:
            linear-gradient(
              135deg,
              #f8f7f7,
              #f8f7f7
            );
          color: #541126;
          box-shadow:
            0 2px 6px
              rgba(
                160,
                74,
                114,
                0.08
              );
        }

        .order-button {
          border: 0;
          background:
            linear-gradient(
              135deg,
              #2b2227,
              #1a1318
            );
          color: #ffffff;
          box-shadow:
            0 6px 16px
              rgba(
                36,
                29,
                34,
                0.22
              );
        }

        .cart-button:hover,
        .order-button:hover {
          transform:
            translateY(-2px);
        }

        /* OUT OF STOCK */

        .out-of-stock-button {
          width: 100%;
          min-height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          box-sizing: border-box;
          background: #f8f7f7;
          color: #806d74;
          border:
            1px solid #e5dfe1;
          font-size: 12px;
          font-weight: 900;
          cursor: not-allowed;
        }

        @media (max-width: 600px) {
          .product-name {
            font-size: 14px;
          }

          .price {
            font-size: 15px;
          }

          .product-info {
            padding:
              12px 12px 14px;
          }

          .review-pill-link {
            padding:
              3px 8px;
          }

          .review-pill-text {
            font-size: 9px;
          }

          .free-delivery-badge {
            top: 8px;
            left: 8px;
            padding:
              3px 7px 3px 6px;
            font-size: 8px;
          }

          .free-badge-icon {
            font-size: 9px;
          }

          .free-badge-text {
            font-size: 8px;
          }
        }
      `}</style>
    </article>
  );
}
