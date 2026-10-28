"use client";

import type { Product } from "../../types/product";
import ProductCard from "./product-card";

type ProductGridProps = {
  products: Product[];
};

export default function ProductGrid({
  products,
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div
        style={{
          padding: "50px 20px",
          textAlign: "center",
          color: "#806f77",
        }}
      >
        <div
          style={{
            fontSize: "50px",
            marginBottom: "12px",
          }}
        >
          🛍️
        </div>

        <h3
          style={{
            margin: 0,
            fontSize: "20px",
            color: "#332a2f",
          }}
        >
          কোনো Product পাওয়া যায়নি
        </h3>

        <p
          style={{
            margin: "8px 0 0",
            fontSize: "13px",
          }}
        >
          এই section-এ বর্তমানে কোনো product নেই।
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(4, minmax(0, 1fr))",
        gap: "18px",
      }}
    >
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
        />
      ))}

      <style jsx>{`
        @media (max-width: 1000px) {
          div {
            grid-template-columns:
              repeat(3, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 700px) {
          div {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
            gap: 12px !important;
          }
        }

        @media (max-width: 430px) {
          div {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
            gap: 9px !important;
          }
        }
      `}</style>
    </div>
  );
}