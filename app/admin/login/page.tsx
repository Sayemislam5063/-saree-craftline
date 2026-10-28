"use client";

import { FormEvent, useState } from "react";
import { supabase } from "../../../lib/supabase/supabase-client";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert("Login failed: " + error.message);
    return;
  }

  window.location.href = "/admin";
}

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="logo-circle">SC</div>

        <p className="eyebrow">SAREE CRAFTLINE</p>

        <h1>Admin Login</h1>

        <p className="subtitle">
          আপনার Admin Panel-এ প্রবেশ করুন
        </p>

        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              placeholder="sareecraftline@gmail.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <button type="submit">
            Login →
          </button>
        </form>

        <p className="back-text">
          Saree Craftline Admin Panel
        </p>
      </div>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
          background:
            radial-gradient(
              circle at top left,
              rgba(190, 111, 143, 0.18),
              transparent 35%
            ),
            linear-gradient(135deg, #fff8fb, #f8f1f5);
        }

        .login-card {
          width: min(430px, 100%);
          padding: 38px 28px;
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 28px;
          background: rgba(255, 255, 255, 0.82);
          box-shadow: 0 25px 70px rgba(83, 53, 66, 0.14);
          backdrop-filter: blur(18px);
        }

        .logo-circle {
          width: 64px;
          height: 64px;
          display: grid;
          place-items: center;
          margin: 0 auto 18px;
          border-radius: 50%;
          background: #241d22;
          color: white;
          font-size: 20px;
          font-weight: 900;
        }

        .eyebrow {
          margin: 0 0 8px;
          text-align: center;
          font-size: 12px;
          letter-spacing: 2px;
          font-weight: 800;
          color: #a04f72;
        }

        h1 {
          margin: 0;
          text-align: center;
          font-size: 30px;
          color: #241d22;
        }

        .subtitle {
          margin: 8px 0 28px;
          text-align: center;
          color: #88757d;
        }

        form {
          display: grid;
          gap: 18px;
        }

        label {
          display: grid;
          gap: 8px;
          font-size: 14px;
          font-weight: 800;
          color: #3c3036;
        }

        input {
          width: 100%;
          padding: 14px 15px;
          border: 1px solid #eadde3;
          border-radius: 14px;
          outline: none;
          background: #fff;
          color: #241d22;
        }

        input:focus {
          border-color: #b86b8a;
          box-shadow: 0 0 0 4px rgba(184, 107, 138, 0.1);
        }

        button {
          margin-top: 6px;
          padding: 15px;
          border: 0;
          border-radius: 14px;
          background: #241d22;
          color: white;
          font-weight: 900;
          cursor: pointer;
          transition: transform 0.2s ease, opacity 0.2s ease;
        }

        button:hover {
          transform: translateY(-1px);
          opacity: 0.94;
        }

        .back-text {
          margin: 24px 0 0;
          text-align: center;
          font-size: 12px;
          color: #9a8990;
        }

        @media (max-width: 480px) {
          .login-card {
            padding: 32px 20px;
            border-radius: 22px;
          }

          h1 {
            font-size: 26px;
          }
        }
      `}</style>
    </main>
  );
}