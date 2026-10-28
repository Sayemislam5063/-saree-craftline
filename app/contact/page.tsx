export default function ContactPage() {
  return (
    <main
      style={{
        minHeight: "70vh",
        padding: "60px 20px",
        background: "#fff8fb",
        color: "#30232a",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <section
        style={{
          maxWidth: "650px",
          margin: "0 auto",
          padding: "32px",
          background: "#ffffff",
          border: "1px solid #f0dce6",
          borderRadius: "20px",
          textAlign: "center",
          boxShadow: "0 10px 30px rgba(100, 50, 75, 0.08)",
        }}
      >
        <h1 style={{ marginTop: 0 }}>
          যোগাযোগ করুন
        </h1>

        <p>
          Saree Craftline-এ যোগাযোগ করার জন্য
          নিচের মাধ্যমগুলো ব্যবহার করুন।
        </p>

        <p>
          <strong>WhatsApp / IMO</strong>
        </p>

        <p>01904872658</p>

        <a
          href="https://wa.me/8801904872658"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            margin: "8px",
            padding: "13px 22px",
            borderRadius: "12px",
            background: "#258653",
            color: "#ffffff",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          WhatsApp-এ যোগাযোগ করুন
        </a>

        <p style={{ marginTop: "28px" }}>
          <strong>Email</strong>
        </p>

        <a href="mailto:sareecraftline@gmail.com">
          sareecraftline@gmail.com
        </a>
      </section>
    </main>
  );
}