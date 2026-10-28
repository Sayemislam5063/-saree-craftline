"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Breadcrumb() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  const pathSegments = pathname.split("/").filter((segment) => segment !== "");

  const formatText = (text: string) => {
    if (text === "all-products") return "All Products";
    if (text === "order-tracking") return "Track Order";
    if (text === "checkout") return "Checkout";
    if (text === "cart") return "Shopping Cart";
    
    return text
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="breadcrumb-wrapper">
      {/* 
        ✨ গ্লোবাল CSS ট্রিক 
        এটি আপনার ওয়েবসাইটের পুরোনো ব্রেডক্রাম্বগুলোকে (যেমন: breadcrumb, breadcrumbs ক্লাস) 
        অটোমেটিক লুকিয়ে ফেলবে। 
      */}
      <style jsx global>{`
        /* পুরোনো ব্রেডক্রাম্ব লুকানোর নিয়ম */
        .breadcrumb:not(.breadcrumb-wrapper),
        .breadcrumbs,
        nav[aria-label="breadcrumb"],
        .old-breadcrumb,
        .page-breadcrumb {
          display: none !important;
        }
      `}</style>

      <div className="breadcrumb-container">
        <nav className="breadcrumb-nav">
          <Link href="/" className="breadcrumb-link">
            Home
          </Link>

          {pathSegments.map((segment, index) => {
            const href = `/${pathSegments.slice(0, index + 1).join("/")}`;
            const isLast = index === pathSegments.length - 1;

            return (
              <span key={index} className="breadcrumb-item">
                <span className="breadcrumb-separator">›</span>
                {isLast ? (
                  <span className="breadcrumb-current">{formatText(segment)}</span>
                ) : (
                  <Link href={href} className="breadcrumb-link">
                    {formatText(segment)}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>
      </div>

      <style jsx>{`
        .breadcrumb-wrapper {
          width: 100%;
          padding: 12px 0;
          background: #ffffff;
          border-bottom: 1px solid #eadde3;
          font-family: "Inter", sans-serif;
        }

        .breadcrumb-container {
          width: min(1180px, calc(100% - 32px));
          margin: 0 auto;
        }

        .breadcrumb-nav {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          font-size: 13px;
        }

        .breadcrumb-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .breadcrumb-link {
          color: #88757d;
          text-decoration: none;
          font-weight: 600;
          transition: color 0.2s ease;
        }

        .breadcrumb-link:hover {
          color: #7d3355; 
        }

        .breadcrumb-separator {
          color: #c5b5bd;
          font-size: 14px;
        }

        .breadcrumb-current {
          color: #7d3355; 
          font-weight: 800;
          text-transform: capitalize;
          max-width: 250px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @media (max-width: 600px) {
          .breadcrumb-container { width: calc(100% - 20px); }
          .breadcrumb-nav { font-size: 12px; }
        }
      `}</style>
    </div>
  );
}