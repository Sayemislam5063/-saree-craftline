"use client";

import { useEffect, useMemo, useState } from "react";

type OrderRecord = {
  id: string;
  order_number?: string | null;
  created_at?: string | null;
  steadfast_delivery_status?: string | null;
  fraud_check_status?: string | null;
  items?: unknown;
  [key: string]: any;
};

type ProductGroup = {
  key: string;
  name: string;
  code: string;
  image: string;
  total: number;
  done: number;
  orderIds: Set<string>;
};

function dhakaDateKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function todayInDhaka(): string {
  return dhakaDateKey(new Date());
}

function readItems(order: OrderRecord): Record<string, any>[] {
  if (Array.isArray(order.items)) {
    return order.items.filter((item) => item && typeof item === "object") as Record<string, any>[];
  }
  if (typeof order.items === "string") {
    try {
      const parsed: unknown = JSON.parse(order.items);
      return Array.isArray(parsed)
        ? (parsed.filter((item) => item && typeof item === "object") as Record<string, any>[])
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

function itemQuantity(item: Record<string, any>): number {
  const quantity = Number(item.quantity ?? 1);
  return Number.isFinite(quantity) && quantity > 0 ? Math.round(quantity) : 1;
}

function itemImage(item: Record<string, any>): string {
  const images = Array.isArray(item.images) ? item.images : [];
  const image = item.imageUrl ?? item.image_url ?? item.thumbnailUrl ?? item.thumbnail_url ?? item.image ?? images[0] ?? "";
  if (typeof image === "string") return image.trim();
  if (image && typeof image === "object") {
    return String(image.url ?? image.src ?? image.secure_url ?? "").trim();
  }
  return "";
}

function itemName(item: Record<string, any>): string {
  return String(item.productName ?? item.product_name ?? item.name ?? "Saree").trim() || "Saree";
}

function itemCode(item: Record<string, any>): string {
  return String(item.productCode ?? item.product_code ?? item.code ?? "").trim();
}

function productIdentity(item: Record<string, any>, name: string, code: string): string {
  const id = item.productId ?? item.product_id;
  if (id) return `id:${String(id)}`;
  if (code) return `code:${code.toLowerCase()}`;
  return `name:${name.trim().toLowerCase()}`;
}

function isPackingExcluded(order: OrderRecord): boolean {
  const status = String(order.steadfast_delivery_status ?? "").toLowerCase();
  return (
    order.fraud_check_status === "blocked" ||
    status === "cancelled" ||
    status === "canceled" ||
    status === "cancelled_approval_pending"
  );
}

function isOrderPacked(order: OrderRecord): boolean {
  const items = readItems(order);
  return items.length > 0 && items.every((item) => item.packingDone === true);
}

function formatDayLabel(dateKey: string): string {
  if (!dateKey) return "নির্বাচিত তারিখ";
  const date = new Date(`${dateKey}T12:00:00+06:00`);
  if (Number.isNaN(date.getTime())) return dateKey;
  return new Intl.DateTimeFormat("bn-BD", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "long",
    year: "numeric",
    weekday: "long",
  }).format(date);
}

export default function DailyPackingPlan({ orders }: { orders: OrderRecord[]; onOrderUpdated?: (updatedOrder: OrderRecord) => void }) {
  const [selectedDate, setSelectedDate] = useState(todayInDhaka);
  const [followsToday, setFollowsToday] = useState(true);

  // Keep the default view on the current Bangladesh date. A manually selected
  // historical date stays selected until the user chooses today's date again.
  useEffect(() => {
    if (!followsToday) return;
    const syncToday = () => setSelectedDate(todayInDhaka());
    syncToday();
    const interval = window.setInterval(syncToday, 30_000);
    return () => window.clearInterval(interval);
  }, [followsToday]);

  const products = useMemo<ProductGroup[]>(() => {
    const grouped = new Map<string, ProductGroup>();

    for (const order of orders) {
      if (dhakaDateKey(order.created_at || "") !== selectedDate) continue;
      if (isPackingExcluded(order)) continue;

      const items = readItems(order);
      if (!items.length) continue;
      const packed = isOrderPacked(order);

      for (const item of items) {
        const name = itemName(item);
        const code = itemCode(item);
        const key = productIdentity(item, name, code);
        const quantity = itemQuantity(item);
        let group = grouped.get(key);

        if (!group) {
          group = {
            key,
            name,
            code,
            image: itemImage(item),
            total: 0,
            done: 0,
            orderIds: new Set<string>(),
          };
          grouped.set(key, group);
        }

        if (!group.image) group.image = itemImage(item);
        group.total += quantity;
        if (packed) group.done += quantity;
        group.orderIds.add(order.id);
      }
    }

    return Array.from(grouped.values()).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  }, [orders, selectedDate]);

  const totalOrders = new Set(
    orders
      .filter((order) => dhakaDateKey(order.created_at || "") === selectedDate && !isPackingExcluded(order) && readItems(order).length > 0)
      .map((order) => order.id),
  ).size;
  const totalPieces = products.reduce((sum, product) => sum + product.total, 0);
  const donePieces = products.reduce((sum, product) => sum + product.done, 0);
  const remainingPieces = Math.max(0, totalPieces - donePieces);

  const handleDateChange = (value: string) => {
    setSelectedDate(value);
    setFollowsToday(value === todayInDhaka());
  };

  return (
    <section className="daily-packing-card" aria-label="Daily product packing summary">
      <div className="daily-packing-heading">
        <div>
          <span className="daily-packing-eyebrow">DAILY PRODUCT PREPARATION</span>
          <h2>আজকের কোন শাড়ি কত পিস প্রস্তুত করতে হবে</h2>
          <p>{formatDayLabel(selectedDate)} · Cancelled ও fraud-blocked order বাদ</p>
        </div>
        <label className="daily-packing-date">
          <span>অর্ডারের তারিখ</span>
          <input type="date" value={selectedDate} onChange={(event) => handleDateChange(event.target.value)} />
        </label>
      </div>

      <div className="daily-packing-stats">
        <div><span>PRODUCT</span><strong>{products.length}</strong></div>
        <div><span>ORDERS</span><strong>{totalOrders}</strong></div>
        <div><span>TOTAL ORDERED</span><strong>{totalPieces} <small>পিস</small></strong></div>
        <div><span>DONE / REMAINING</span><strong><em>{donePieces}</em> / <small>{remainingPieces} পিস বাকি</small></strong></div>
      </div>

      {products.length === 0 ? (
        <div className="daily-packing-empty">
          <span>📦</span>
          <strong>এই তারিখে কোনো প্রস্তুত করার মতো Product পাওয়া যায়নি</strong>
          <small>অন্য তারিখ নির্বাচন করে দেখতে পারো।</small>
        </div>
      ) : (
        <div className="daily-packing-list">
          {products.map((product) => {
            const remaining = Math.max(0, product.total - product.done);
            const progress = product.total > 0 ? (product.done / product.total) * 100 : 0;
            const allDone = remaining === 0;
            return (
              <article className={`daily-packing-product ${allDone ? "is-all-done" : ""}`} key={product.key}>
                <div className="daily-packing-image">
                  {product.image ? <img src={product.image} alt={product.name} loading="lazy" /> : <span>🧵</span>}
                </div>
                <div className="daily-packing-product-info">
                  <div className="daily-packing-title-row">
                    <div className="daily-packing-name-wrap">
                      <strong>{product.name}</strong>
                      {product.code && <small>Code: {product.code}</small>}
                      <small>{product.orderIds.size}টি অর্ডার</small>
                    </div>
                    {allDone && <span className="daily-packing-all-done">✓ ALL DONE</span>}
                  </div>
                  <div className="daily-packing-counts">
                    <span>আজ অর্ডার: <b>{product.total} পিস</b></span>
                    <span className="packing-done-text">Done: <b>{product.done} পিস</b></span>
                    <span className="packing-remaining-text">বাকি: <b>{remaining} পিস</b></span>
                  </div>
                  <div className="daily-packing-progress"><span style={{ width: `${progress}%` }} /></div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="daily-packing-note">
        Orders-এর প্রতিটি Card-এ Entry চাপলে ওই অর্ডারের সব ডিজাইন ও সব পিস Done হবে। রাত ১২টায় Bangladesh time অনুযায়ী আজকের তালিকা নতুন দিনের জন্য নিজে থেকে বদলাবে; আগের দিনের Entry সংরক্ষিত থাকবে।
      </div>

      <style jsx>{`
        .daily-packing-card { background: #fff; border: 1px solid #eee2e8; border-radius: 15px; padding: 15px; margin: 0 0 18px; box-shadow: 0 4px 14px rgba(45,25,38,.03); color: #392f35; }
        .daily-packing-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; margin-bottom: 12px; }
        .daily-packing-eyebrow { display: block; color: #a04f72; font-size: 8px; letter-spacing: 1.3px; font-weight: 900; margin-bottom: 5px; }
        .daily-packing-heading h2 { margin: 0; color: #30252c; font-size: 16px; font-weight: 900; }
        .daily-packing-heading p { color: #91838b; font-size: 10px; margin: 5px 0 0; }
        .daily-packing-date { display: grid; gap: 5px; color: #8f8088; font-size: 9px; font-weight: 800; flex: 0 0 auto; }
        .daily-packing-date input { height: 36px; border: 1px solid #eadfe5; border-radius: 9px; padding: 0 9px; color: #4b3b43; background: #fff; font-size: 11px; outline: none; }
        .daily-packing-date input:focus { border-color: #b14f79; box-shadow: 0 0 0 3px rgba(177,79,121,.08); }
        .daily-packing-stats { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 8px; margin-bottom: 11px; }
        .daily-packing-stats > div { display: grid; gap: 5px; padding: 9px 11px; border: 1px solid #f0e7eb; border-radius: 10px; background: #fdfafb; min-width: 0; }
        .daily-packing-stats span { color: #978992; font-size: 8px; letter-spacing: .65px; font-weight: 900; }
        .daily-packing-stats strong { color: #382832; font-size: 18px; line-height: 1.1; white-space: nowrap; }
        .daily-packing-stats strong small { color: #8b7d85; font-size: 9px; font-weight: 700; white-space: normal; }
        .daily-packing-stats strong em { color: #168c68; font-style: normal; }
        .daily-packing-empty { display: grid; justify-items: center; gap: 6px; padding: 20px 12px; border: 1px dashed #eadfe5; border-radius: 11px; color: #796b73; text-align: center; }
        .daily-packing-empty span { font-size: 23px; }
        .daily-packing-empty strong { font-size: 12px; }
        .daily-packing-empty small { color: #a3959d; font-size: 10px; }
        .daily-packing-list { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px; }
        .daily-packing-product { display: flex; align-items: center; gap: 10px; min-width: 0; padding: 9px; border: 1px solid #eee5e9; border-radius: 10px; background: #fff; }
        .daily-packing-product.is-all-done { border-color: #ccebdd; background: #fbfffd; }
        .daily-packing-image { width: 49px; height: 58px; flex: 0 0 49px; overflow: hidden; border: 1px solid #eee2e8; border-radius: 7px; background: #faf5f7; display: grid; place-items: center; color: #aa8d9b; font-size: 19px; }
        .daily-packing-image img { width: 100%; height: 100%; object-fit: cover; }
        .daily-packing-product-info { flex: 1; min-width: 0; display: grid; gap: 5px; }
        .daily-packing-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 6px; }
        .daily-packing-name-wrap { min-width: 0; display: grid; gap: 2px; }
        .daily-packing-name-wrap strong { color: #382832; font-size: 11px; line-height: 1.3; overflow-wrap: anywhere; }
        .daily-packing-name-wrap small { color: #968791; font-size: 8px; }
        .daily-packing-all-done { flex: 0 0 auto; color: #16865f; background: #eaf8f1; border: 1px solid #c7eadb; border-radius: 6px; padding: 4px 6px; font-size: 7px; font-weight: 900; }
        .daily-packing-counts { display: flex; flex-wrap: wrap; gap: 7px; color: #655760; font-size: 8px; }
        .daily-packing-counts b { color: #342831; }
        .packing-done-text b { color: #168c68; }
        .packing-remaining-text b { color: #b45b28; }
        .daily-packing-progress { height: 4px; border-radius: 8px; background: #f1e9ed; overflow: hidden; }
        .daily-packing-progress span { display: block; height: 100%; background: #28a77c; border-radius: inherit; transition: width .2s ease; }
        .daily-packing-note { margin-top: 10px; color: #9b8d95; font-size: 9px; line-height: 1.5; }
        @media (max-width: 850px) { .daily-packing-list { grid-template-columns: 1fr; } }
        @media (max-width: 700px) { .daily-packing-heading { flex-direction: column; } .daily-packing-date { width: 100%; } .daily-packing-date input { width: 100%; } .daily-packing-stats { grid-template-columns: repeat(2,minmax(0,1fr)); } }
      `}</style>
    </section>
  );
}
