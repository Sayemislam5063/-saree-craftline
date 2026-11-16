"use client";

import { usePathname } from "next/navigation";
import Header from "./header";
import Footer from "./footer";
import Breadcrumb from "../ui/Breadcrumb";

const WHATSAPP_NUMBER = "8801904872658";

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith("/admin");
  const isCheckoutPage = pathname === "/checkout";

  if (isAdminPage) return <>{children}</>;

  return (
    <>
      {!isCheckoutPage && <Header />}
      {!isCheckoutPage && <Breadcrumb />}
      {children}
      {!isCheckoutPage && <Footer />}
      {!isCheckoutPage && (
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}`}
          target="_blank"
          rel="noopener noreferrer"
          className="whatsapp-ball"
          aria-label="WhatsApp-এ যোগাযোগ করুন"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
          </svg>
        </a>
      )}

      <style jsx>{`
        .whatsapp-ball {
          position: fixed;
          right: 22px;
          bottom: 22px;
          z-index: 999;
          width: 60px;
          height: 60px;
          display: grid;
          place-items: center;
          border: 1px solid #efcbd7;
          border-radius: 50%;
          background: radial-gradient(circle at 31% 24%, #fff 0%, #fff5f8 23%, #f5dce5 64%, #eec8d5 100%);
          box-shadow: inset -5px -7px 13px rgba(125, 39, 70, .09), 0 8px 23px rgba(84, 17, 38, .18);
          animation: pingPongBounce 2.2s cubic-bezier(.38,.05,.62,.95) infinite;
          transition: box-shadow .2s ease, filter .2s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .whatsapp-ball::before {
          content: "";
          position: absolute;
          top: 10px;
          left: 13px;
          width: 15px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255,255,255,.82);
          transform: rotate(-35deg);
        }
        .whatsapp-ball svg { position: relative; width: 30px; height: 30px; fill: #64172f; filter: drop-shadow(0 1px 1px rgba(84,17,38,.1)); }
        .whatsapp-ball:hover { filter: saturate(1.08); box-shadow: inset -5px -7px 13px rgba(125,39,70,.08), 0 12px 27px rgba(84,17,38,.24); }
        @keyframes pingPongBounce { 0%, 100% { transform: translateY(0) rotate(0); } 12% { transform: translateY(-13px) rotate(-7deg); } 23% { transform: translateY(0) rotate(6deg); } 31% { transform: translateY(-5px) rotate(-3deg); } 39% { transform: translateY(0) rotate(0); } 72% { transform: translateY(0) rotate(0); } 79% { transform: translateY(-8px) rotate(5deg); } 87% { transform: translateY(0) rotate(-4deg); } 93% { transform: translateY(-3px) rotate(2deg); } }
        @media (max-width: 600px) { .whatsapp-ball { right: 16px; bottom: 18px; width: 54px; height: 54px; } .whatsapp-ball svg { width: 27px; height: 27px; } }
        @media (prefers-reduced-motion: reduce) { .whatsapp-ball { animation: none; } }
      `}</style>
    </>
  );
}
