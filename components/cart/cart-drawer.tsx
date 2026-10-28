"use client";

import Link from "next/link";
import { useCart } from "./cart-provider";
import { useRouter } from "next/navigation";

type CartDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export default function CartDrawer({
  open,
  onClose,
}: CartDrawerProps) {
    const router = useRouter();
  const {
    items,
    subtotal,
    updateQuantity,
    removeFromCart,
  } = useCart();

  if (!open) return null;

  return (
    <>
      <div
        className="drawer-overlay"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className="drawer"
        aria-label="Shopping cart"
      >
        <div className="drawer-header">
          <div>
            <p className="drawer-eyebrow">YOUR CART</p>
            <h2>আপনার কার্ট</h2>
          </div>

          <button
            type="button"
            className="close-button"
            onClick={onClose}
            aria-label="Close cart"
          >
            ×
          </button>
        </div>

        <div className="drawer-body">
          {items.length === 0 ? (
            <div className="empty-cart">
              <div className="empty-icon">🛍️</div>

              <h3>কার্ট এখনো খালি</h3>

              <p>
                পছন্দের শাড়ি কার্টে যোগ করুন।
              </p>

              <button
                type="button"
                className="continue-button"
                onClick={onClose}
              >
                Shopping চালিয়ে যান
              </button>
            </div>
          ) : (
            <div className="items">
              {items.map((item) => {
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

                const thumbnail =
                  item.product.images.find(
                    (image: any) => image.isThumbnail,
                  )?.url ||
                  item.product.images[0]?.url;

                return (
                  <div
                    key={`${item.product.id}-${item.blouseOption}`}
                    className="cart-item"
                  >
                    <div className="item-image">
                      {thumbnail ? (
                        <img
                          src={thumbnail}
                          alt={item.product.name}
                        />
                      ) : (
                        <span>👗</span>
                      )}
                    </div>

                    <div className="item-info">
                      <h3>{item.product.name}</h3>

                      <p>
                        {item.blouseOption === "withBlouse"
                          ? "Blouseসহ"
                          : "Blouse ছাড়া"}
                      </p>

                      <strong>
                        ৳{" "}
                        {price.toLocaleString("bn-BD")}
                      </strong>

                      <div className="item-bottom">
                        <div className="quantity">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(
                                item.product.id,
                                item.blouseOption,
                                item.quantity - 1,
                              )
                            }
                            disabled={item.quantity <= 1}
                          >
                            −
                          </button>

                          <span>{item.quantity}</span>

                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(
                                item.product.id,
                                item.blouseOption,
                                item.quantity + 1,
                              )
                            }
                            disabled={
                              item.quantity >= item.product.stock
                            }
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          className="remove-button"
                          onClick={() =>
                            removeFromCart(
                              item.product.id,
                              item.blouseOption,
                            )
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="drawer-footer">
            <div className="subtotal-row">
              <span>Subtotal</span>

              <strong>
                ৳ {subtotal.toLocaleString("bn-BD")}
              </strong>
            </div>

<Link
  href="/cart"
  onClick={onClose}
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minHeight: "46px",
    marginTop: "9px",
    padding: "0 16px",
    border: "1px solid #e3cbd7",
    borderRadius: "13px",
    background: "#ffffff",
    color: "#5d3b4e",
    textDecoration: "none",
    fontSize: "13px",
    fontWeight: 800,
    cursor: "pointer",
    transition: "all 0.18s ease",
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.background = "#f8eef3";
    e.currentTarget.style.borderColor = "#c99ab1";
    e.currentTarget.style.transform = "translateY(-1px)";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.background = "#ffffff";
    e.currentTarget.style.borderColor = "#e3cbd7";
    e.currentTarget.style.transform = "translateY(0)";
  }}
>
  কার্ট দেখুন
</Link>

<button
  type="button"
  className="checkout-button"
  onClick={() => {
    onClose();
    router.push("/checkout");
  }}
>
  Checkout →
</button>
          </div>
        )}
      </aside>

      <style jsx>{`
        .drawer-overlay {
          position: fixed;
          inset: 0;
          z-index: 90;
          background: rgba(30, 22, 27, 0.42);
          backdrop-filter: blur(3px);
        }

        .drawer {
          position: fixed;
          top: 0;
          right: 0;
          z-index: 100;
          width: min(430px, 100%);
          height: 100dvh;
          display: flex;
          flex-direction: column;
          background: #fff;
          box-shadow: -18px 0 50px rgba(50, 30, 40, 0.18);
          animation: slideIn 0.22s ease-out;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }

          to {
            transform: translateX(0);
          }
        }

        .drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 20px;
          border-bottom: 1px solid rgba(93, 67, 77, 0.1);
        }

        .drawer-eyebrow {
          margin: 0 0 4px;
          color: #9a416d;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.5px;
        }

        .drawer-header h2 {
          margin: 0;
          color: #241d22;
          font-size: 22px;
        }

        .close-button {
          width: 40px;
          height: 40px;
          border: 0;
          border-radius: 12px;
          background: #f7f1f4;
          color: #332a2f;
          cursor: pointer;
          font-size: 27px;
          line-height: 1;
        }

        .drawer-body {
          flex: 1;
          overflow-y: auto;
          padding: 18px;
        }

        .empty-cart {
          min-height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 30px 20px;
        }

        .empty-icon {
          font-size: 58px;
          margin-bottom: 14px;
        }

        .empty-cart h3 {
          margin: 0 0 7px;
          font-size: 19px;
          color: #332a2f;
        }

        .empty-cart p {
          margin: 0 0 18px;
          color: #85757d;
          font-size: 13px;
        }

        .continue-button {
          border: 0;
          border-radius: 13px;
          padding: 12px 16px;
          background: #241d22;
          color: #fff;
          font-weight: 800;
          cursor: pointer;
        }

        .items {
          display: grid;
          gap: 12px;
        }

        .cart-item {
          display: grid;
          grid-template-columns: 78px minmax(0, 1fr);
          gap: 12px;
          padding: 10px;
          border: 1px solid rgba(93, 67, 77, 0.1);
          border-radius: 17px;
          background: #fff;
        }

        .item-image {
          width: 78px;
          height: 96px;
          overflow: hidden;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background:
            linear-gradient(
              145deg,
              #f8dde7,
              #ebe3ff
            );
        }

        .item-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .item-image span {
          font-size: 34px;
        }

        .item-info {
          min-width: 0;
        }

        .item-info h3 {
          margin: 0;
          color: #30262b;
          font-size: 14px;
          line-height: 1.35;
        }

        .item-info p {
          margin: 5px 0;
          color: #88757d;
          font-size: 11px;
        }

        .item-info strong {
          display: block;
          color: #8b3d63;
          font-size: 15px;
        }

        .item-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 9px;
        }

        .quantity {
          display: inline-flex;
          align-items: center;
          overflow: hidden;
          border: 1px solid rgba(93, 67, 77, 0.12);
          border-radius: 10px;
        }

        .quantity button {
          width: 28px;
          height: 28px;
          border: 0;
          background: #f7f1f4;
          cursor: pointer;
          font-size: 16px;
        }

        .quantity button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .quantity span {
          min-width: 28px;
          text-align: center;
          font-size: 12px;
          font-weight: 800;
        }

        .remove-button {
          border: 0;
          background: transparent;
          color: #a34b5d;
          font-size: 11px;
          cursor: pointer;
        }

        .drawer-footer {
          padding: 16px 18px 18px;
          border-top: 1px solid rgba(93, 67, 77, 0.1);
          background: #fff;
        }

        .subtotal-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
          color: #5f5157;
          font-size: 13px;
        }

        .subtotal-row strong {
          color: #241d22;
          font-size: 18px;
        }
.view-cart-button,
.checkout-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 46px;
  margin-top: 9px;
  padding: 0 16px;
  border-radius: 13px;
  text-decoration: none;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease,
    border-color 0.18s ease;
}

/* Cart দেখুন */
.view-cart-button {
  border: 1px solid rgba(154, 65, 109, 0.22);
  background: #fff;
  color: #6d3b55;
}

.view-cart-button:hover {
  background: #faf1f6;
  border-color: rgba(154, 65, 109, 0.35);
  transform: translateY(-1px);
  box-shadow: 0 5px 14px rgba(93, 67, 77, 0.08);
}

/* Checkout */
.checkout-button {
  border: 1px solid #241d22;
  background: #241d22;
  color: #fff;
  box-shadow: 0 7px 18px rgba(36, 29, 34, 0.14);
}

.checkout-button:hover {
  background: #34282f;
  transform: translateY(-1px);
  box-shadow: 0 9px 22px rgba(36, 29, 34, 0.20);
}

.view-cart-button:active,
.checkout-button:active {
  transform: translateY(0);
  box-shadow: none;
}
      `}</style>
    </>
  );
}