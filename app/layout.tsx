import type { Metadata, Viewport } from "next";
import "./globals.css";
import SiteChrome from "../components/layout/site-chrome";
import { CartProvider } from "../components/cart/cart-provider";

export const metadata: Metadata = {
  title: "Saree Craftline",
  description:
    "Saree Craftline - সুন্দর ও মানসম্মত শাড়ির অনলাইন শপ",
  applicationName: "Saree Craftline Admin",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Craftline Admin",
  },
  icons: {
    icon: [{ url: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#64172f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" data-scroll-behavior="smooth">
      <body>
        <CartProvider>
          <SiteChrome>{children}</SiteChrome>
        </CartProvider>
      </body>
    </html>
  );
}
