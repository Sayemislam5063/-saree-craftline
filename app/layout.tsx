import type { Metadata } from "next";
import "./globals.css";
import SiteChrome from "../components/layout/site-chrome";
import { CartProvider } from "../components/cart/cart-provider";

export const metadata: Metadata = {
  title: "Saree Craftline",
  description:
    "Saree Craftline - সুন্দর ও মানসম্মত শাড়ির অনলাইন শপ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <CartProvider>
          <SiteChrome>{children}</SiteChrome>
        </CartProvider>
      </body>
    </html>
  );
}