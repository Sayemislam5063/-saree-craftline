export default function Loading() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fafafa",
      }}
    >
      <div
        style={{
          textAlign: "center",
          padding: "30px",
        }}
      >
        <div
          style={{
            width: "42px",
            height: "42px",
            border: "4px solid #e5e7eb",
            borderRadius: "50%",
            margin: "0 auto 16px",
          }}
        />

        <p
          style={{
            margin: 0,
            color: "#555",
            fontSize: "15px",
          }}
        >
          Saree Craftline লোড হচ্ছে...
        </p>
      </div>
    </main>
  );
}