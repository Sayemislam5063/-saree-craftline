"use client";

import Link from "next/link";
import ProductCard from "../products/product-card"; // ⚠️ আপনার প্রোডাক্ট কার্ডের সঠিক পাথটি এখানে বসিয়ে নিন

export default function CategorySection({ category, products }: any) {
  const categoryProducts = products.filter(
    (product: any) => product.categoryId === category.id || product.categoryId === category.slug
  );

  if (categoryProducts.length === 0) return null;

  return (
    <section className="category-section">
      <div className="section-header">
        <div className="header-left">
          <span className="vertical-bar"></span> 
          
          <h2 className="category-title">
            ✨ {category.name}
          </h2>
          
          <span className="product-count-badge">
            {categoryProducts.length}+
          </span>
        </div>

        <div className="dotted-line"></div>

        <Link href={`/category/${category.slug}`} className="view-all-btn">
          সবগুলো দেখুন →
        </Link>
      </div>

      <div className="products-grid">
        {categoryProducts.slice(0, 4).map((product: any) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <style jsx>{`
        .category-section {
          padding: 40px 0;
          width: 100%;
          border-bottom: 1px solid #f0e7eb;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 30px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        /* ✨ !important দিয়ে মেরুন কালার ফোর্স করা হলো */
        .vertical-bar {
          width: 5px;
          height: 26px;
          background-color: #7d3355 !important; 
          border-radius: 4px;
        }

        .category-title {
          margin: 0;
          font-size: 24px;
          font-weight: 900;
          color: #2b1f26;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .product-count-badge {
          background-color: #f7e6ef !important; 
          color: #7d3355 !important; 
          font-size: 13px;
          font-weight: 800;
          padding: 4px 12px;
          border-radius: 999px;
        }

        .dotted-line {
          flex: 1;
          height: 2px;
          background-image: linear-gradient(to right, #7d3355 40%, rgba(255,255,255,0) 0%) !important;
          background-position: bottom;
          background-size: 10px 2px;
          background-repeat: repeat-x;
          opacity: 0.25;
        }

        .view-all-btn {
          flex-shrink: 0;
          background-color: #7d3355 !important;
          color: white !important;
          text-decoration: none;
          font-size: 14px;
          font-weight: 800;
          padding: 10px 22px;
          border-radius: 999px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(125, 51, 85, 0.2) !important;
        }

        .view-all-btn:hover {
          background-color: #5e233d !important;
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(125, 51, 85, 0.35) !important;
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 25px;
        }

        @media (max-width: 1024px) {
          .products-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 768px) {
          .products-grid { grid-template-columns: repeat(2, 1fr); }
          .section-header { flex-wrap: wrap; }
          .dotted-line { display: none; }
        }
        @media (max-width: 480px) {
          .category-title { font-size: 20px; }
          .view-all-btn { padding: 8px 16px; font-size: 12px; }
        }
      `}</style>
    </section>
  );
}