"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#fafafa",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "500px",
          padding: "32px",
          textAlign: "center",
          borderRadius: "20px",
          background: "#ffffff",
          boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ fontSize: "28px", marginBottom: "12px" }}>
          দুঃখিত! কিছু একটা সমস্যা হয়েছে।
        </h1>

        <p style={{ color: "#666", marginBottom: "24px" }}>
          আবার চেষ্টা করুন।
        </p>

        <button
          onClick={() => reset()}
          style={{
            border: "none",
            borderRadius: "10px",
            padding: "12px 22px",
            cursor: "pointer",
            background: "#111827",
            color: "#ffffff",
            fontSize: "15px",
          }}
        >
          আবার চেষ্টা করুন
        </button>
      </div>
    </main>
  );
}