"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <h3>Saree Craftline</h3>
            <p>সুন্দর, মানসম্মত ও আকর্ষণীয় শাড়ির অনলাইন শপ।</p>
          </div>

          <div>
            <h3>যোগাযোগ</h3>
            <p>WhatsApp / IMO: 01904872658</p>
            <p>Email: sareecraftline@gmail.com</p>
          </div>

          <div>
            <h3>তথ্য</h3>
            <p>
              <Link href="/order-tracking" className="footer-link">
                Order Tracking (অর্ডার ট্র্যাক)
              </Link>
            </p>
            <p>
              <Link href="/policy" className="footer-link">
                Privacy Policy (প্রাইভেসি পলিসি)
              </Link>
            </p>
            <p>
              <Link href="/policy" className="footer-link">
                Delivery Policy (ডেলিভারি পলিসি)
              </Link>
            </p>
          </div>
        </div>

        {/* ✨ এখানে আপনার নাম (Sayem) যোগ করা হলো */}
        <div className="footer-bottom">
          © 2026 Saree Craftline — All Rights Reserved. | Developed by <strong>Sayem</strong>
        </div>
      </div>

      <style jsx>{`
        .footer {
          margin-top: 40px;
          padding: 34px 0;
          background: #241d22;
          color: white;
        }

        .container {
          width: min(1180px, calc(100% - 32px));
          margin: 0 auto;
        }

        .footer-grid {
          display: grid;
          grid-template-columns: 1.3fr 1fr 1fr;
          gap: 30px;
        }

        .footer h3 {
          margin: 0 0 10px;
          font-size: 16px;
          font-weight: 800;
        }

        .footer p {
          color: #cdbfc5;
          font-size: 13px;
          line-height: 1.8;
          margin: 5px 0;
        }

        .footer-link {
          color: #cdbfc5;
          text-decoration: none !important;
          transition: color 0.2s ease, transform 0.2s ease;
          display: inline-block;
        }

        .footer-link:hover {
          color: #ffffff;
          transform: translateX(4px);
        }

        .footer-bottom {
          margin-top: 24px;
          padding-top: 18px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          color: #a99da2;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .footer-bottom strong {
          color: #cdbfc5; /* আপনার নামটি হাইলাইট করার জন্য */
        }

        @media (max-width: 600px) {
          .container {
            width: min(100% - 20px, 1180px);
          }
          .footer-grid {
            grid-template-columns: 1fr;
          }
          .footer-bottom {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </footer>
  );
}