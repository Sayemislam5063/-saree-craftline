"use client";

import { usePathname } from "next/navigation";
import Header from "./header";
import Footer from "./footer";
import Breadcrumb from "../ui/Breadcrumb"; // ✨ ১. এখানে ইমপোর্ট করা হলো

const WHATSAPP_NUMBER = "8801904872658";

export default function SiteChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isAdminPage = pathname.startsWith("/admin");

  if (isAdminPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <Breadcrumb /> {/* ✨ ২. এখানে যুক্ত করা হলো */}
      {children}
      <Footer />
      
      {/* Animated WhatsApp pet */}
      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}`}
        target="_blank"
        rel="noopener noreferrer"
        className="floating-whatsapp"
        aria-label="Text me on WhatsApp"
      >
        <span className="whatsapp-label">Text me <span aria-hidden="true">↗</span></span>
        <span className="whatsapp-pet" aria-hidden="true">
          <span className="pet-antenna"><i /></span>
          <span className="pet-arm pet-arm-left" />
          <span className="pet-arm pet-arm-right" />
          <span className="pet-head">
            <span className="pet-face">
              <i className="pet-eye" />
              <i className="pet-eye" />
              <i className="pet-smile" />
            </span>
          </span>
          <span className="pet-body">
            <span className="pet-whatsapp-mark">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.04 2a9.9 9.9 0 0 0-8.48 15.02L2.3 22l5.1-1.34A9.9 9.9 0 1 0 12.04 2Zm0 17.98a8.04 8.04 0 0 1-4.1-1.12l-.3-.18-3.03.8.81-2.96-.2-.31a8.08 8.08 0 1 1 6.82 3.77Zm4.43-6.05c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49l.36-.42c.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.5.58.19 1.1.16 1.52.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" /></svg>
            </span>
          </span>
          <span className="pet-leg pet-leg-left" />
          <span className="pet-leg pet-leg-right" />
          <span className="pet-shadow" />
        </span>
      </a>

      <style jsx>{`
        .floating-whatsapp {
          position: fixed;
          bottom: 22px;
          right: 22px;
          display: flex;
          align-items: flex-end;
          gap: 8px;
          z-index: 999;
          text-decoration: none;
          -webkit-tap-highlight-color: transparent;
        }
        .whatsapp-label {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 23px;
          padding: 9px 13px;
          border: 1px solid #eadde3;
          border-radius: 999px;
          background: #fff;
          color: #541126;
          box-shadow: 0 7px 22px rgba(49, 20, 31, .14);
          font-size: 12px;
          font-weight: 850;
          letter-spacing: .01em;
          animation: bubbleIn .5s ease-out both;
        }
        .whatsapp-label span { color: #16865f; font-size: 14px; }
        .whatsapp-pet {
          position: relative;
          display: block;
          width: 68px;
          height: 84px;
          flex: 0 0 68px;
          filter: drop-shadow(0 7px 7px rgba(49, 20, 31, .18));
          animation: petHop 2.6s ease-in-out infinite;
        }
        .pet-head {
          position: absolute;
          z-index: 2;
          top: 13px;
          left: 9px;
          width: 50px;
          height: 41px;
          display: grid;
          place-items: center;
          border: 2px solid #fff;
          border-radius: 18px 18px 15px 15px;
          background: linear-gradient(145deg, #7a2944, #541126);
          box-shadow: inset 0 -4px 0 rgba(40, 8, 21, .17);
        }
        .pet-face {
          width: 37px;
          height: 25px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          position: relative;
          border-radius: 9px;
          background: #fff;
        }
        .pet-eye { width: 4px; height: 7px; border-radius: 5px; background: #541126; animation: blink 4s infinite; }
        .pet-smile { position: absolute; bottom: 4px; left: 15px; width: 8px; height: 4px; border-bottom: 1.5px solid #541126; border-radius: 0 0 8px 8px; }
        .pet-antenna { position: absolute; z-index: 1; top: 3px; left: 32px; width: 3px; height: 13px; border-radius: 4px; background: #541126; }
        .pet-antenna i { position: absolute; top: -4px; left: -3px; width: 9px; height: 9px; border: 2px solid #fff; border-radius: 50%; background: #16865f; }
        .pet-body { position: absolute; z-index: 2; top: 51px; left: 20px; width: 29px; height: 22px; display: grid; place-items: center; border: 2px solid #fff; border-radius: 9px 9px 11px 11px; background: #64172f; }
        .pet-whatsapp-mark { width: 15px; height: 15px; display: grid; place-items: center; border-radius: 50%; background: #16865f; }
        .pet-whatsapp-mark svg { width: 11px; height: 11px; fill: #fff; }
        .pet-arm { position: absolute; z-index: 1; top: 54px; width: 10px; height: 20px; border: 2px solid #fff; border-radius: 8px; background: #7a2944; transform-origin: top center; }
        .pet-arm-left { left: 12px; transform: rotate(18deg); }
        .pet-arm-right { right: 10px; transform: rotate(-24deg); animation: wave 1.1s ease-in-out infinite; }
        .pet-leg { position: absolute; z-index: 1; top: 70px; width: 10px; height: 10px; border-radius: 3px 3px 6px 6px; background: #541126; }
        .pet-leg-left { left: 23px; }
        .pet-leg-right { right: 22px; }
        .pet-shadow { position: absolute; bottom: 0; left: 17px; width: 36px; height: 6px; border-radius: 50%; background: rgba(49, 20, 31, .16); animation: shadowPulse 2.6s ease-in-out infinite; }
        @keyframes petHop { 0%, 72%, 100% { transform: translateY(0); } 82% { transform: translateY(-13px) rotate(-3deg); } 90% { transform: translateY(-3px) rotate(2deg); } }
        @keyframes wave { 0%, 100% { transform: rotate(-24deg); } 50% { transform: rotate(-55deg); } }
        @keyframes shadowPulse { 0%, 72%, 100% { transform: scaleX(1); opacity: .8; } 82% { transform: scaleX(.7); opacity: .35; } }
        @keyframes blink { 0%, 46%, 50%, 100% { transform: scaleY(1); } 48% { transform: scaleY(.15); } }
        @keyframes bubbleIn { from { opacity: 0; transform: translateX(8px); } to { opacity: 1; transform: translateX(0); } }
        .floating-whatsapp:hover .whatsapp-pet { animation-duration: 1.2s; }
        .floating-whatsapp:hover .whatsapp-label { border-color: #a98290; box-shadow: 0 9px 25px rgba(49, 20, 31, .2); }
        @media (max-width: 600px) {
          .floating-whatsapp { bottom: 16px; right: 12px; gap: 5px; }
          .whatsapp-pet { transform: scale(.9); transform-origin: bottom right; }
          .whatsapp-label { margin-bottom: 20px; padding: 8px 10px; font-size: 11px; }
        }
        @media (prefers-reduced-motion: reduce) { .whatsapp-pet, .pet-shadow, .pet-arm-right, .pet-eye, .whatsapp-label { animation: none; } }
      `}</style>
    </>
  );
}
