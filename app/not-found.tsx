export default function NotFound() {
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
          textAlign: "center",
          padding: "40px",
          maxWidth: "500px",
        }}
      >
        <h1
          style={{
            fontSize: "48px",
            margin: "0 0 12px",
            fontWeight: 700,
          }}
        >
          404
        </h1>

        <h2
          style={{
            fontSize: "24px",
            margin: "0 0 12px",
          }}
        >
          Page পাওয়া যায়নি
        </h2>

        <p
          style={{
            color: "#666",
            margin: 0,
          }}
        >
          Saree Craftline-এর requested pageটি পাওয়া যায়নি।
        </p>
      </div>
    </main>
  );
}