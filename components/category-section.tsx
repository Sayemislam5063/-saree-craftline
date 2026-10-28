import Link from "next/link";
import type { Category } from "../types/category";
import type { Product } from "../types/product";
import ProductGrid from "./products/product-grid";

type CategorySectionProps = {
  category: Category;
  products: Product[];
};

export default function CategorySection({
  category,
  products,
}: CategorySectionProps) {
  const visibleProducts = products
    .filter(
      (product) =>
        product.categoryId === category.id,
    )
    .slice(0, 4);

  if (!category.isActive || visibleProducts.length === 0) {
    return null;
  }

  return (
    <section className="section">
      {/* ============ SECTION HEADER ============ */}
      <div className="section-head">
        <div className="section-head-left">
          <div className="title-row">
            <span className="title-icon">
              ✨
            </span>

            <h2 className="section-title">
              {category.name}
            </h2>

            <span className="title-count">
              {visibleProducts.length}+
            </span>
          </div>

          {category.description && (
            <p className="section-text">
              {category.description}
            </p>
          )}
        </div>

        {/* ✨ NEW: Connecting line */}
        <span className="connecting-line" />

        {/* ✨ INLINE STYLE — guaranteed box look */}
        <Link
          href={`/category/${category.slug}`}
          className="see-all"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "11px 20px",
            borderRadius: "24px",
            textDecoration: "none",
            color: "#ffffff",
            background:
              "linear-gradient(135deg, #b14f79, #a4446d)",
            border: "1px solid #a4446d",
            fontSize: "12.5px",
            fontWeight: 900,
            letterSpacing: "0.2px",
            whiteSpace: "nowrap",
            flexShrink: 0,
            boxShadow:
              "0 8px 20px rgba(177, 79, 121, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
            transition:
              "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease, background 0.25s ease",
            cursor: "pointer",
          }}
        >
          <span>সবগুলো দেখুন</span>

          <span
            className="see-all-arrow"
            style={{
              display: "inline-block",
              fontSize: "14px",
              fontWeight: 900,
              lineHeight: 1,
              transition:
                "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            →
          </span>
        </Link>
      </div>

      {/* ============ PRODUCTS GRID ============ */}
      <ProductGrid products={visibleProducts} />

      <style jsx>{`
        .section {
          padding: 34px 0;
          position: relative;
        }

        /* ============ HEADER ============ */

        .section-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 22px;
          position: relative;
          padding-left: 16px;
        }

        /* ✨ Vertical accent bar */
        .section-head::before {
          content: "";
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 4px;
          height: 40px;
          border-radius: 4px;
          background: linear-gradient(
            180deg,
            #d66f99 0%,
            #a9416e 100%
          );
          box-shadow:
            0 4px 12px
              rgba(169, 65, 110, 0.3);
        }

        .section-head-left {
          min-width: 0;
          flex: 0 0 auto;
        }

        /* ============ TITLE ROW ============ */

        .title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .title-icon {
          font-size: 18px;
          line-height: 1;
          animation: sparkle 3s
            ease-in-out infinite;
          display: inline-block;
        }

        @keyframes sparkle {
          0%, 100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
          50% {
            transform: scale(1.15)
              rotate(-8deg);
            opacity: 0.85;
          }
        }

        .section-title {
          margin: 0;
          font-size: 28px;
          letter-spacing: -0.8px;
          color: #241d22;
          font-weight: 900;
          text-transform: capitalize;
          line-height: 1.15;
          background: linear-gradient(
            135deg,
            #241d22 0%,
            #6b3d55 100%
          );
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .title-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 3px 9px;
          border-radius: 10px;
          background:
            linear-gradient(
              135deg,
              #faeef4,
              #f5dfeb
            );
          color: #a4446d;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.3px;
          line-height: 1;
          box-shadow:
            inset 0 0 0 1px
              rgba(154, 65, 109, 0.1);
        }

        .section-text {
          margin: 8px 0 0;
          color: #88757d;
          font-size: 13px;
          line-height: 1.65;
          max-width: 600px;
        }

        /* ============================================
           ✨ NEW: CONNECTING DOTTED LINE
           ============================================ */

        .connecting-line {
          flex: 1;
          height: 2px;
          min-width: 24px;
          position: relative;
          background-image:
            linear-gradient(
              to right,
              rgba(177, 79, 121, 0.35) 50%,
              transparent 50%
            );
          background-size: 10px 2px;
          background-repeat: repeat-x;
          background-position: 0 center;
          margin: 0 4px;
          animation: lineFlow 2s linear infinite;
        }

        /* ✨ Small dot at start of the line */
        .connecting-line::before {
          content: "";
          position: absolute;
          left: -4px;
          top: 50%;
          transform: translateY(-50%);
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #b14f79;
          box-shadow:
            0 0 0 3px
              rgba(177, 79, 121, 0.15);
        }

        /* ✨ Flowing animation on the dotted line */
        @keyframes lineFlow {
          from {
            background-position: 0 center;
          }
          to {
            background-position: 20px center;
          }
        }

        /* ============ SEE ALL BUTTON HOVER ============ */

        .see-all {
          animation: btnSoftPulse 3s
            ease-in-out infinite;
        }

        /* ✨ Soft continuous pulse — very subtle */
        @keyframes btnSoftPulse {
          0%, 100% {
            box-shadow:
              0 8px 20px
                rgba(177, 79, 121, 0.28),
              inset 0 1px 0
                rgba(255, 255, 255, 0.15);
          }
          50% {
            box-shadow:
              0 10px 24px
                rgba(177, 79, 121, 0.4),
              0 0 0 4px
                rgba(177, 79, 121, 0.08),
              inset 0 1px 0
                rgba(255, 255, 255, 0.15);
          }
        }

        .see-all:hover {
          animation: none;
          transform: translateY(-3px) !important;
          background:
            linear-gradient(
              135deg,
              #c15c85,
              #b14f79
            ) !important;
          box-shadow:
            0 14px 28px
              rgba(177, 79, 121, 0.4),
            inset 0 1px 0
              rgba(255, 255, 255, 0.2) !important;
        }

        .see-all:hover .see-all-arrow {
          transform: translateX(4px) !important;
        }

        .see-all:active {
          transform: translateY(-1px) !important;
        }

        /* ============ RESPONSIVE ============ */

        @media (max-width: 600px) {
          .section {
            padding: 26px 0;
          }

          .section-head {
            align-items: center;
            gap: 10px;
            padding-left: 12px;
            margin-bottom: 16px;
          }

          .section-head::before {
            width: 3px;
            height: 32px;
          }

          .section-title {
            font-size: 22px;
          }

          .title-icon {
            font-size: 15px;
          }

          .title-count {
            font-size: 10px;
            padding: 2px 7px;
          }

          .section-text {
            font-size: 11.5px;
            margin-top: 6px;
          }

          .connecting-line {
            min-width: 14px;
          }

          .connecting-line::before {
            width: 5px;
            height: 5px;
          }
        }
      `}</style>
    </section>
  );
}