"use client";

import { useMemo, useState } from "react";
import { supabase } from "../../lib/supabase/supabase-client";

type OrderRecord = {
  id: string;
  order_number?: string | null;
  created_at?: string | null;
  steadfast_delivery_status?: string | null;
  fraud_check_status?: string | null;
  items?: unknown;
  [key: string]: any;
};

type PackingLine = {
  order: OrderRecord;
  item: Record<string, any>;
  itemIndex: number;
  quantity: number;
  done: boolean;
  lineKey: string;
};

type ProductGroup = {
  key: string;
  name: string;
  code: string;
  image: string;
  total: number;
  done: number;
  lines: PackingLine[];
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
  if (Array.isArray(order.items)) return order.items.filter((item) => item && typeof item === "object");
  if (typeof order.items === "string") {
    try {
      const parsed: unknown = JSON.parse(order.items);
      return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === "object") : [];
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

function productIdentity(item: Record<string, any>, name: string, code: string): string {
  const id = item.productId ?? item.product_id;
  if (id) return `id:${String(id)}`;
  if (code) return `code:${code.toLowerCase()}`;
  return `name:${name.trim().toLowerCase()}`;
}

function isCancelled(order: OrderRecord): boolean {
  const status = String(order.steadfast_delivery_status ?? "").toLowerCase();
  return status === "cancelled" || status === "canceled";
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

export default function DailyPackingPlan({
  orders,
  onOrderUpdated,
}: {
  orders: OrderRecord[];
  onOrderUpdated: (updatedOrder: OrderRecord) => void;
}) {
  const [selectedDate, setSelectedDate] = useState(todayInDhaka);
  const [busyLine, setBusyLine] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const products = useMemo<ProductGroup[]>(() => {
    const grouped = new Map<string, ProductGroup>();

    for (const order of orders) {
      if (dhakaDateKey(order.created_at || "") !== selectedDate) continue;
      if (isCancelled(order) || order.fraud_check_status === "blocked") continue;

      const items = readItems(order);
      items.forEach((item, itemIndex) => {
        const name = String(item.productName ?? item.product_name ?? item.name ?? "Saree");
        const code = String(item.productCode ?? item.product_code ?? item.code ?? "");
        const key = productIdentity(item, name, code);
        const quantity = itemQuantity(item);
        const done = item.packingDone === true;
        const line: PackingLine = {
          order,
          item,
          itemIndex,
          quantity,
          done,
          lineKey: `${order.id}:${itemIndex}`,
        };

        let group = grouped.get(key);
        if (!group) {
          group = {
            key,
            name,
            code,
            image: itemImage(item),
            total: 0,
            done: 0,
            lines: [],
          };
          grouped.set(key, group);
        }
        if (!group.image) group.image = itemImage(item);
        group.total += quantity;
        if (done) group.done += quantity;
        group.lines.push(line);
      });
    }

    return Array.from(grouped.values()).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  }, [orders, selectedDate]);

  const totalPieces = products.reduce((sum, product) => sum + product.total, 0);
  const donePieces = products.reduce((sum, product) => sum + product.done, 0);
  const remainingPieces = totalPieces - donePieces;

  const togglePacking = async (line: PackingLine) => {
    if (busyLine) return;
    setBusyLine(line.lineKey);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const items = readItems(line.order);
      if (!items[line.itemIndex]) throw new Error("Order-এর product item পাওয়া যায়নি। Refresh করে আবার চেষ্টা করো।");

      const nextDone = !line.done;
      const updatedItems = items.map((item, index) =>
        index === line.itemIndex
          ? {
              ...item,
              packingDone: nextDone,
              packingDoneAt: nextDone ? new Date().toISOString() : null,
            }
          : item,
      );

      const { data, error } = await supabase
        .from("orders")
        .update({ items: updatedItems })
        .eq("id", line.order.id)
        .select("*")
        .single();

      if (error) throw error;
      onOrderUpdated((data as OrderRecord) ?? { ...line.order, items: updatedItems });
      setSuccessMessage(nextDone ? `${line.quantity} পিস Done হিসেবে Entry হয়েছে।` : "Entry Undo করা হয়েছে।");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Packing Entry save করা যায়নি।";
      setErrorMessage(message);
    } finally {
      setBusyLine(null);
    }
  };

  return (
    <section className="daily-packing-card" aria-label="Daily product packing list">
      <div className="daily-packing-heading">
        <div>
          <span className="daily-packing-eyebrow">DAILY PREPARATION</span>
          <h2>আজকের Product Packing List</h2>
          <p>{formatDayLabel(selectedDate)} · Cancelled ও fraud-blocked order বাদ</p>
        </div>
        <label className="daily-packing-date">
          <span>অর্ডারের তারিখ</span>
          <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
        </label>
      </div>

      <div className="daily-packing-stats">
        <div><span>PRODUCT</span><strong>{products.length}</strong></div>
        <div><span>TOTAL ORDERED</span><strong>{totalPieces} <small>পিস</small></strong></div>
        <div><span>DONE / PACKED</span><strong className="packing-done-number">{donePieces} <small>পিস</small></strong></div>
        <div><span>REMAINING</span><strong className="packing-remaining-number">{remainingPieces} <small>পিস</small></strong></div>
      </div>

      {errorMessage && <div className="packing-feedback packing-error">{errorMessage}</div>}
      {successMessage && <div className="packing-feedback packing-success">{successMessage}</div>}

      {products.length === 0 ? (
        <div className="daily-packing-empty">
          <span>📦</span>
          <strong>এই তারিখে কোনো প্রস্তুত করার মতো Product পাওয়া যায়নি</strong>
          <small>অন্য তারিখ নির্বাচন করে দেখতে পারো।</small>
        </div>
      ) : (
        <div className="daily-packing-list">
          {products.map((product) => {
            const remaining = product.total - product.done;
            const progress = product.total > 0 ? (product.done / product.total) * 100 : 0;
            return (
              <article className="daily-packing-product" key={product.key}>
                <div className="daily-packing-product-main">
                  <div className="daily-packing-image">
                    {product.image ? <img src={product.image} alt={product.name} loading="lazy" /> : <span>🧵</span>}
                  </div>
                  <div className="daily-packing-product-info">
                    <strong>{product.name}</strong>
                    {product.code && <small>Code: {product.code}</small>}
                    <div className="daily-packing-counts">
                      <span>Order: <b>{product.total} পিস</b></span>
                      <span className="packing-done-text">Done: <b>{product.done} পিস</b></span>
                      <span className="packing-remaining-text">বাকি: <b>{remaining} পিস</b></span>
                    </div>
                    <div className="daily-packing-progress"><span style={{ width: `${progress}%` }} /></div>
                  </div>
                </div>

                <div className="daily-packing-lines">
                  {product.lines.map((line) => (
                    <div className={`daily-packing-line ${line.done ? "is-done" : ""}`} key={line.lineKey}>
                      <div className="daily-packing-line-order">
                        <strong>Order: {line.order.order_number || line.order.id}</strong>
                        <small>{line.quantity} পিস{line.item.blouseOption === "withBlouse" ? " · Blouse সহ" : line.item.blouseOption === "withoutBlouse" ? " · Blouse ছাড়া" : ""}</small>
                      </div>
                      {line.done ? (
                        <div className="packing-done-actions">
                          <span className="packing-done-pill">✓ Done</span>
                          <button type="button" className="packing-undo-btn" onClick={() => void togglePacking(line)} disabled={busyLine !== null} title="Entry Undo করো">Undo</button>
                        </div>
                      ) : (
                        <button type="button" className="packing-entry-btn" onClick={() => void togglePacking(line)} disabled={busyLine !== null}>
                          {busyLine === line.lineKey ? "Saving…" : "＋ Entry"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="daily-packing-note">Entry চাপলে ওই অর্ডারের Product Quantity পুরোটা Done হিসেবে গণনা হবে। ভুল হলে Undo করা যাবে। এই Status Supabase-এ Save থাকে।</div>

      <style jsx>{`
        .daily-packing-card { background: #fff; border: 1px solid #eee2e8; border-radius: 17px; padding: 17px; margin: 0 0 18px; box-shadow: 0 5px 18px rgba(45,25,38,.035); color: #392f35; }
        .daily-packing-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
        .daily-packing-eyebrow { display: block; color: #a04f72; font-size: 8px; letter-spacing: 1.4px; font-weight: 900; margin-bottom: 5px; }
        .daily-packing-heading h2 { margin: 0; color: #30252c; font-size: 17px; font-weight: 900; }
        .daily-packing-heading p { color: #91838b; font-size: 10px; margin: 5px 0 0; }
        .daily-packing-date { display: grid; gap: 5px; color: #8f8088; font-size: 9px; font-weight: 800; }
        .daily-packing-date input { height: 37px; border: 1px solid #eadfe5; border-radius: 9px; padding: 0 9px; color: #4b3b43; background: #fff; font-size: 11px; outline: none; }
        .daily-packing-date input:focus { border-color: #b14f79; box-shadow: 0 0 0 3px rgba(177,79,121,.08); }
        .daily-packing-stats { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 9px; margin-bottom: 13px; }
        .daily-packing-stats > div { display: grid; gap: 5px; padding: 11px 12px; border: 1px solid #f0e7eb; border-radius: 11px; background: #fdfafb; }
        .daily-packing-stats span { color: #978992; font-size: 8px; letter-spacing: .7px; font-weight: 900; }
        .daily-packing-stats strong { color: #382832; font-size: 19px; line-height: 1; }
        .daily-packing-stats strong small { font-size: 10px; font-weight: 700; }
        .packing-done-number { color: #1c9a73 !important; }
        .packing-remaining-number { color: #b45b28 !important; }
        .packing-feedback { padding: 9px 11px; border-radius: 9px; font-size: 10px; margin-bottom: 10px; }
        .packing-error { color: #a8324b; background: #fff1f3; border: 1px solid #f4cbd4; }
        .packing-success { color: #187b5e; background: #effaf5; border: 1px solid #ccebdd; }
        .daily-packing-empty { display: grid; justify-items: center; gap: 6px; padding: 24px 12px; border: 1px dashed #eadfe5; border-radius: 12px; color: #796b73; text-align: center; }
        .daily-packing-empty span { font-size: 25px; }
        .daily-packing-empty strong { font-size: 12px; }
        .daily-packing-empty small { color: #a3959d; font-size: 10px; }
        .daily-packing-list { display: grid; gap: 10px; }
        .daily-packing-product { border: 1px solid #eee5e9; border-radius: 12px; padding: 11px; background: #fff; }
        .daily-packing-product-main { display: flex; align-items: center; gap: 11px; }
        .daily-packing-image { width: 57px; height: 67px; flex: 0 0 57px; overflow: hidden; border: 1px solid #eee2e8; border-radius: 8px; background: #faf5f7; display: grid; place-items: center; color: #aa8d9b; font-size: 20px; }
        .daily-packing-image img { width: 100%; height: 100%; object-fit: cover; }
        .daily-packing-product-info { flex: 1; min-width: 0; display: grid; gap: 5px; }
        .daily-packing-product-info > strong { color: #382832; font-size: 12px; line-height: 1.4; }
        .daily-packing-product-info > small { color: #968791; font-size: 9px; }
        .daily-packing-counts { display: flex; flex-wrap: wrap; gap: 10px; color: #655760; font-size: 9px; }
        .daily-packing-counts b { color: #342831; }
        .packing-done-text b { color: #168c68; }
        .packing-remaining-text b { color: #b45b28; }
        .daily-packing-progress { height: 5px; border-radius: 8px; background: #f1e9ed; overflow: hidden; }
        .daily-packing-progress span { display: block; height: 100%; background: #28a77c; border-radius: inherit; transition: width .2s ease; }
        .daily-packing-lines { display: grid; gap: 6px; margin-top: 10px; padding-top: 9px; border-top: 1px dashed #eee4e9; }
        .daily-packing-line { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 7px 8px; border-radius: 8px; background: #fcfafb; }
        .daily-packing-line.is-done { background: #f1faf6; }
        .daily-packing-line-order { display: grid; gap: 3px; min-width: 0; }
        .daily-packing-line-order strong { color: #705c67; font-size: 9px; overflow-wrap: anywhere; }
        .daily-packing-line-order small { color: #9a8b93; font-size: 9px; }
        .packing-entry-btn { flex: 0 0 auto; border: 1px solid #e6c3d2; background: #fff4f8; color: #a3426a; border-radius: 8px; padding: 7px 12px; font-size: 10px; font-weight: 900; cursor: pointer; }
        .packing-entry-btn:hover { background: #fce6ef; }
        .packing-entry-btn:disabled, .packing-undo-btn:disabled { opacity: .55; cursor: wait; }
        .packing-done-actions { display: flex; flex: 0 0 auto; align-items: center; gap: 8px; }
        .packing-done-pill { border: 1px solid #c7eadb; background: #eaf8f1; color: #17865f; border-radius: 8px; padding: 7px 10px; font-size: 10px; font-weight: 900; }
        .packing-undo-btn { border: 0; background: transparent; color: #988892; padding: 5px; font-size: 9px; cursor: pointer; text-decoration: underline; }
        .daily-packing-note { margin-top: 11px; color: #9b8d95; font-size: 9px; line-height: 1.5; }
        @media (max-width: 700px) { .daily-packing-heading { flex-direction: column; } .daily-packing-date { width: 100%; } .daily-packing-date input { width: 100%; } .daily-packing-stats { grid-template-columns: repeat(2,minmax(0,1fr)); } }
        @media (max-width: 420px) { .daily-packing-counts { gap: 6px; } .daily-packing-line { align-items: flex-start; } }
      `}</style>
    </section>
  );
}
