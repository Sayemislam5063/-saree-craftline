"use client";

import Link from "next/link";
import { useCart } from "../../components/cart/cart-provider";

export default function CartPage() {
  const {
    items,
    subtotal,
    removeFromCart,
    updateQuantity,
  } = useCart();

  const deliveryCharge = subtotal >= 3000 ? 0 : 80;
  const total = subtotal + deliveryCharge;

  if (items.length === 0) {
    return (
      <main
        style={{
          minHeight: "70vh",
          padding: "60px 16px",
          background:
            "radial-gradient(circle at top left, rgba(125, 51, 85, 0.08), transparent 35%), #fff", // Maroon tint
        }}
      >
        <div
          style={{
            maxWidth: 760,
            margin: "0 auto",
            textAlign: "center",
            padding: "55px 20px",
            border: "1px solid #eee3e8",
            borderRadius: 24,
            background: "#fff",
            boxShadow: "0 15px 40px rgba(60,30,45,0.06)",
          }}
        >
          <div
            style={{
              fontSize: 58,
              marginBottom: 14,
            }}
          >
            🛍️
          </div>

          <h1
            style={{
              margin: "0 0 8px",
              fontSize: 30,
              color: "#241d22",
            }}
          >
            আপনার কার্ট খালি
          </h1>

          <p
            style={{
              margin: "0 0 26px",
              color: "#88757d",
            }}
          >
            আপনার পছন্দের শাড়ি কার্টে যোগ করুন।
          </p>

          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 48,
              padding: "0 22px",
              borderRadius: 14,
              background: "#7D3355", // Maroon button
              color: "#fff",
              textDecoration: "none",
              fontWeight: 800,
              boxShadow: "0 8px 20px rgba(125, 51, 85, 0.16)",
            }}
          >
            শাড়ি দেখুন →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "75vh",
        padding: "36px 16px 70px",
        background:
          "radial-gradient(circle at top left, rgba(125, 51, 85, 0.08), transparent 32%), #fff", // Maroon tint
      }}
    >
      <div
        style={{
          width: "min(1180px, 100%)",
          margin: "0 auto",
        }}
      >
        {/* PAGE HEADER */}
        <div
          style={{
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: 1,
              color: "#7D3355", // Maroon text
              marginBottom: 5,
            }}
          >
            SAREE CRAFTLINE
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 34,
              lineHeight: 1.15,
              color: "#241d22",
            }}
          >
            আপনার কার্ট
          </h1>

          <p
            style={{
              margin: "7px 0 0",
              color: "#88757d",
              fontSize: 13,
            }}
          >
            আপনার পছন্দের শাড়িগুলো এখানে রয়েছে।
          </p>
        </div>

        {/* TWO COLUMN */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 300px",
            gap: 20,
            alignItems: "start",
          }}
        >
          {/* CART ITEMS */}
          <div
            style={{
              display: "grid",
              gap: 14,
            }}
          >
{items.map((item) => {
  const image =
    item.product.images.find(
      (img: any) => img.isThumbnail,
    )?.url ||
    item.product.images[0]?.url ||
    "";
              const pricing = item.product.pricing as {
                withoutBlouse: number;
                discountWithoutBlouse?: number;
                withBlouse: number;
                discountWithBlouse?: number;
                discountPrice?: number;
              };

              const price =
                item.blouseOption === "withBlouse"
                  ? pricing.discountWithBlouse ??
                    pricing.withBlouse
                  : pricing.discountWithoutBlouse ??
                    pricing.discountPrice ??
                    pricing.withoutBlouse;

              const itemTotal = price * item.quantity;

              return (
                <div
                  key={`${item.product.id}-${item.blouseOption}`}
                  style={{
                    position: "relative",
                    display: "grid",
                    gridTemplateColumns: "86px minmax(0,1fr) auto",
                    gap: 14,
                    alignItems: "center",
                    padding: 12,
                    border: "1px solid #eee5e9",
                    borderRadius: 18,
                    background: "#fff",
                    boxShadow:
                      "0 10px 30px rgba(60,30,45,0.05)",
                  }}
                >
                  {/* IMAGE — 1:1 SQUARE */}
                  <div
                    style={{
                      width: 86,
                      height: 86,
                      borderRadius: 13,
                      overflow: "hidden",
                      flexShrink: 0,
                      background:
                        "linear-gradient(135deg, #fcf4f6, #f2e4e9)", // Maroon tint placeholder
                    }}
                  >
                    {image ? (
                      <img
                        src={image}
                        alt={item.product.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "grid",
                          placeItems: "center",
                          fontSize: 32,
                        }}
                      >
                        👗
                      </div>
                    )}
                  </div>

                  {/* INFO */}
                  <div
                    style={{
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        color: "#7D3355", // Maroon category text
                        fontSize: 11,
                        fontWeight: 800,
                        marginBottom: 3,
                      }}
                    >
                      {item.product.categoryName}
                    </div>

                    <Link
                      href={`/products/${item.product.id}`}
                      style={{
                        color: "#241d22",
                        fontSize: 16,
                        fontWeight: 800,
                        textDecoration: "underline",
                        textUnderlineOffset: 3,
                      }}
                    >
                      {item.product.name}
                    </Link>

                    <div
                      style={{
                        marginTop: 5,
                        fontSize: 12,
                        color: "#88757d",
                      }}
                    >
                      {item.blouseOption === "withBlouse"
                        ? "Blouseসহ"
                        : "Blouse ছাড়া"}
                    </div>

                    <div
                      style={{
                        marginTop: 5,
                        fontSize: 16,
                        fontWeight: 900,
                        color: "#241d22",
                      }}
                    >
                      ৳{" "}
                      {price.toLocaleString("bn-BD")}
                    </div>

                    {/* QUANTITY */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        width: "fit-content",
                        marginTop: 9,
                        border: "1px solid #e8dce2",
                        borderRadius: 10,
                        overflow: "hidden",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(
                            item.product.id,
                            item.blouseOption,
                            Math.max(1, item.quantity - 1),
                          )
                        }
                        disabled={item.quantity <= 1}
                        style={{
                          width: 34,
                          height: 32,
                          border: 0,
                          background: "#faf5f7", // Soft maroon tint
                          color: "#3d3036",
                          fontSize: 17,
                          cursor:
                            item.quantity <= 1
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            item.quantity <= 1 ? 0.4 : 1,
                        }}
                      >
                        −
                      </button>

                      <span
                        style={{
                          width: 38,
                          textAlign: "center",
                          fontWeight: 800,
                          fontSize: 13,
                        }}
                      >
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(
                            item.product.id,
                            item.blouseOption,
                            Math.min(
                              item.product.stock,
                              item.quantity + 1,
                            ),
                          )
                        }
                        disabled={
                          item.quantity >= item.product.stock
                        }
                        style={{
                          width: 34,
                          height: 32,
                          border: 0,
                          background: "#faf5f7", // Soft maroon tint
                          color: "#3d3036",
                          fontSize: 17,
                          cursor:
                            item.quantity >= item.product.stock
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            item.quantity >= item.product.stock
                              ? 0.4
                              : 1,
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* RIGHT SIDE */}
                  <div
                    style={{
                      alignSelf: "stretch",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      justifyContent: "space-between",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        removeFromCart(
                          item.product.id,
                          item.blouseOption,
                        )
                      }
                      aria-label="Remove product"
                      style={{
                        width: 32,
                        height: 32,
                        border: 0,
                        borderRadius: 10,
                        background: "#fff",
                        color: "#7D3355", // Maroon remove cross
                        fontSize: 18,
                        cursor: "pointer",
                      }}
                    >
                      ×
                    </button>

                    <strong
                      style={{
                        fontSize: 17,
                        color: "#241d22",
                        whiteSpace: "nowrap",
                      }}
                    >
                      ৳{" "}
                      {itemTotal.toLocaleString("bn-BD")}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ORDER SUMMARY */}
          <aside
            style={{
              border: "1px solid #eee5e9",
              borderRadius: 20,
              background: "#fff",
              padding: 20,
              boxShadow:
                "0 12px 35px rgba(60,30,45,0.06)",
              position: "sticky",
              top: 90,
            }}
          >
            <h2
              style={{
                margin: "0 0 20px",
                fontSize: 20,
                color: "#241d22",
              }}
            >
              অর্ডার সামারি
            </h2>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 15,
                marginBottom: 12,
                color: "#77686f",
                fontSize: 13,
              }}
            >
              <span>Subtotal</span>
              <strong style={{ color: "#3b3035" }}>
                ৳ {subtotal.toLocaleString("bn-BD")}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 15,
                marginBottom: 16,
                color: "#77686f",
                fontSize: 13,
              }}
            >
              <span>Delivery Charge</span>

              <strong style={{ color: "#3b3035" }}>
                {deliveryCharge === 0
                  ? "FREE"
                  : `৳ ${deliveryCharge.toLocaleString(
                      "bn-BD",
                    )}`}
              </strong>
            </div>

            <div
              style={{
                height: 1,
                background: "#eee5e9",
                margin: "4px 0 17px",
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 15,
                marginBottom: 18,
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  color: "#55464d",
                }}
              >
                Total
              </span>

              <strong
                style={{
                  fontSize: 23,
                  color: "#241d22",
                }}
              >
                ৳ {total.toLocaleString("bn-BD")}
              </strong>
            </div>

            {/* CHECKOUT BUTTON */}
            <Link
              href="/checkout"
              style={{
                width: "100%",
                minHeight: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 14,
                background:
                  "linear-gradient(135deg, #7D3355, #561827)", // Deep Maroon gradient
                color: "#fff",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 900,
                boxShadow:
                  "0 9px 20px rgba(125, 51, 85, 0.2)",
                transition: "transform 0.18s ease",
              }}
            >
              Checkout করুন →
            </Link>

            {/* CONTINUE SHOPPING */}
            <Link
              href="/"
              style={{
                width: "100%",
                minHeight: 44,
                marginTop: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 14,
                border: "1px solid #d1bcc5", // Maroon tinted border
                background: "#fff",
                color: "#7D3355", // Maroon text
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              ← আরো শাড়ি কিনুন
            </Link>
          </aside>
        </div>

        {/* BOTTOM CONTINUE BUTTON */}
        <div
          style={{
            marginTop: 26,
            textAlign: "center",
          }}
        >
        </div>
      </div>

      {/* MOBILE RESPONSIVE */}
      <style jsx>{`
        @media (max-width: 800px) {
          main > div > div:last-child {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 560px) {
          main {
            padding-left: 10px !important;
            padding-right: 10px !important;
          }

          main > div > div:last-child {
            gap: 14px !important;
          }

          main > div > div:last-child > div {
            grid-template-columns: 70px minmax(0, 1fr) auto !important;
            gap: 10px !important;
            padding: 9px !important;
          }

          /* Mobile এ image container কে 70x70 square করা */
          main > div > div:last-child > div > div:first-child {
            width: 70px !important;
            height: 70px !important;
          }
        }
      `}</style>
    </main>
  );
}