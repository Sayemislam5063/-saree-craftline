"use client";

import { useState } from "react";

type PriceFilterProps = {
  onFilter: (
    minPrice: number | null,
    maxPrice: number | null,
  ) => void;
};

export default function PriceFilter({
  onFilter,
}: PriceFilterProps) {
  const [minPrice, setMinPrice] =
    useState("");

  const [maxPrice, setMaxPrice] =
    useState("");

  const handleFilter = () => {
    const min =
      minPrice.trim() === ""
        ? null
        : Number(minPrice);

    const max =
      maxPrice.trim() === ""
        ? null
        : Number(maxPrice);

    onFilter(min, max);
  };

  const handleReset = () => {
    setMinPrice("");
    setMaxPrice("");

    onFilter(null, null);
  };

  return (
    <section className="price-filter">
      <div className="filter-header">
        <div>
          <span className="filter-eyebrow">
            PRICE FILTER
          </span>

          <h2>দাম অনুযায়ী খুঁজুন</h2>

          <p>
            আপনার বাজেটের মধ্যে পছন্দের শাড়ি খুঁজে নিন
          </p>
        </div>
      </div>

      <div className="filter-body">
        <div className="price-field">
          <label htmlFor="min-price">
            সর্বনিম্ন দাম
          </label>

          <div className="input-wrap">
            <span>৳</span>

            <input
              id="min-price"
              type="number"
              min="0"
              value={minPrice}
              onChange={(event) =>
                setMinPrice(event.target.value)
              }
              placeholder="যেমন 500"
            />
          </div>
        </div>

        <div className="price-separator">
          —
        </div>

        <div className="price-field">
          <label htmlFor="max-price">
            সর্বোচ্চ দাম
          </label>

          <div className="input-wrap">
            <span>৳</span>

            <input
              id="max-price"
              type="number"
              min="0"
              value={maxPrice}
              onChange={(event) =>
                setMaxPrice(event.target.value)
              }
              placeholder="যেমন 5000"
            />
          </div>
        </div>

        <button
          type="button"
          className="filter-button"
          onClick={handleFilter}
        >
          🔍 Filter করুন
        </button>

        <button
          type="button"
          className="reset-button"
          onClick={handleReset}
        >
          Reset
        </button>
      </div>

      <style jsx>{`
        .price-filter {
          width: 100%;
          margin: 8px 0 28px;
          padding: 20px;
          border: 1px solid rgba(93, 67, 77, 0.08);
          border-radius: 22px;
          background:
            linear-gradient(
              135deg,
              rgba(255, 247, 250, 0.96),
              rgba(248, 244, 255, 0.96)
            );
          box-shadow:
            0 12px 30px
              rgba(83, 53, 66, 0.06);
        }

        .filter-header {
          margin-bottom: 15px;
        }

        .filter-eyebrow {
          display: inline-block;
          margin-bottom: 5px;
          color: #a14a73;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.3px;
        }

        .filter-header h2 {
          margin: 0;
          color: #241d22;
          font-size: 21px;
          line-height: 1.2;
          letter-spacing: -0.4px;
        }

        .filter-header p {
          margin: 5px 0 0;
          color: #8a7880;
          font-size: 12px;
        }

        .filter-body {
          display: flex;
          align-items: end;
          gap: 12px;
        }

        .price-field {
          flex: 1;
          min-width: 0;
        }

        .price-field label {
          display: block;
          margin-bottom: 7px;
          color: #6d5963;
          font-size: 11px;
          font-weight: 800;
        }

        .input-wrap {
          display: flex;
          align-items: center;
          height: 46px;
          padding: 0 13px;
          border: 1px solid
            rgba(93, 67, 77, 0.12);
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.9);
          transition: 0.2s ease;
        }

        .input-wrap:focus-within {
          border-color: rgba(161, 74, 115, 0.45);
          box-shadow:
            0 0 0 3px
              rgba(161, 74, 115, 0.08);
        }

        .input-wrap span {
          margin-right: 7px;
          color: #a14a73;
          font-size: 13px;
          font-weight: 900;
        }

        .input-wrap input {
          width: 100%;
          height: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: #2b2227;
          font-size: 13px;
          font-weight: 700;
        }

        .input-wrap input::placeholder {
          color: #b4a6ac;
          font-weight: 500;
        }

        .input-wrap input::-webkit-outer-spin-button,
        .input-wrap input::-webkit-inner-spin-button {
          margin: 0;
          -webkit-appearance: none;
        }

        .input-wrap input[type="number"] {
          appearance: textfield;
          -moz-appearance: textfield;
        }

        .price-separator {
          padding-bottom: 13px;
          color: #a7949d;
          font-size: 16px;
          font-weight: 800;
        }

        .filter-button,
        .reset-button {
          height: 46px;
          border-radius: 13px;
          padding: 0 17px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
          transition: 0.25s ease;
        }

        .filter-button {
          border: 0;
          background:
            linear-gradient(
              135deg,
              #b14f79,
              #963f68
            );
          color: #fff;
          box-shadow:
            0 8px 20px
              rgba(177, 79, 121, 0.22);
        }

        .filter-button:hover {
          transform: translateY(-2px);
          box-shadow:
            0 12px 25px
              rgba(177, 79, 121, 0.3);
        }

        .reset-button {
          border: 1px solid
            rgba(99, 54, 78, 0.14);
          background: #fff;
          color: #63364e;
        }

        .reset-button:hover {
          transform: translateY(-2px);
          box-shadow:
            0 8px 18px
              rgba(83, 53, 66, 0.08);
        }

        @media (max-width: 700px) {
          .price-filter {
            padding: 17px;
            border-radius: 19px;
          }

          .filter-body {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          .price-separator {
            display: none;
          }

          .filter-button,
          .reset-button {
            width: 100%;
          }
        }

        @media (max-width: 430px) {
          .filter-body {
            grid-template-columns: 1fr;
          }

          .filter-header h2 {
            font-size: 19px;
          }
        }
      `}</style>
    </section>
  );
}