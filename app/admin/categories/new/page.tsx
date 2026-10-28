"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import { supabase } from "../../../../lib/supabase/supabase-client";
import { uploadToCloudinary } from "../../../../lib/cloudinary/client";

export default function NewCategoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const editId = searchParams.get("edit");

  const [name, setName] = useState("");
  const [image, setImage] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(Boolean(editId));
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!editId) {
      setIsLoading(false);
      return;
    }

    const loadCategory = async () => {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("id", editId)
        .single();

      if (error || !data) {
        console.error("Category load error:", error);
        alert("Category পাওয়া যায়নি।");
        router.push("/admin/categories");
        return;
      }

      setName(data.name ?? "");
      setImage(data.image_url ?? null);

      setIsLoading(false);
    };

    loadCategory();
  }, [editId, router]);

  const handleImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setIsUploading(true);

    try {
      const imageUrl = await uploadToCloudinary(file);
      setImage(imageUrl);
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      alert("Image upload হয়নি।");
    } finally {
      setIsUploading(false);
    }
  };

const handleSave = async () => {
  const categoryName = name.trim();

  if (!categoryName) {
    return;
  }

  const slug = categoryName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\u0980-\u09FFa-z0-9-]/g, "");

  setIsSaving(true);

  try {
    const categoryData = {
      name: categoryName,
      slug,
      image_url: image,
    };

    const { error } = editId
      ? await supabase
          .from("categories")
          .update(categoryData)
          .eq("id", editId)
      : await supabase
          .from("categories")
          .insert(categoryData);

    if (error) {
      console.error("Category save error:", error);
      setIsSaving(false);
      alert(
        editId
          ? "Category update হয়নি।"
          : "Category save হয়নি।"
      );
      return;
    }

    router.push("/admin/categories");
  } catch (error) {
    console.error("Category save error:", error);
    setIsSaving(false);
    alert("Something went wrong.");
  }
};

  return (
    <div className="admin-page">

      {(isLoading || isSaving || isUploading) && (
        <div className="loading-overlay">
          <div className="loading-box">

            <div className="loading-spinner"></div>

            <h3>
              {isUploading
                ? "Image Uploading..."
                : isSaving
                  ? editId
                    ? "Category Updating..."
                    : "Category Saving..."
                  : "Loading Category..."}
            </h3>

            <p>
              দয়া করে একটু অপেক্ষা করুন...
            </p>

          </div>
        </div>
      )}

      <aside className="sidebar">
        <div className="brand">
          <div className="logo">SC</div>

          <div>
            <div className="brand-name">
              Saree Craftline
            </div>

            <div className="brand-subtitle">
              Admin Panel
            </div>
          </div>
        </div>

        <div className="menu-title">
          MAIN MENU
        </div>

        <nav className="menu">

          <Link
            href="/admin"
            className="menu-item"
          >
            <span className="menu-icon">📊</span>
            <span>Dashboard</span>
          </Link>

          <Link
            href="/admin/products"
            className="menu-item"
          >
            <span className="menu-icon">🛍️</span>
            <span>Products</span>
          </Link>

          <Link
            href="/admin/categories"
            className="menu-item active"
          >
            <span className="menu-icon">📁</span>
            <span>Categories</span>
          </Link>

          <Link
            href="/admin/orders"
            className="menu-item"
          >
            <span className="menu-icon">📦</span>
            <span>Orders</span>
          </Link>

          <Link
            href="/admin/settings"
            className="menu-item"
          >
            <span className="menu-icon">⚙️</span>
            <span>Settings</span>
          </Link>

        </nav>

        <div className="sidebar-bottom">
          <Link
            href="/"
            className="view-store"
          >
            <span>🛒</span>
            View Store
          </Link>
        </div>
      </aside>

      <main className="main-content">

        <div className="top-header">

          <div>

            <div className="eyebrow">
              SAREE CRAFTLINE
            </div>

            <Link
              href="/admin/categories"
              className="back-link"
            >
              <span className="back-arrow">←</span>
              Back to Categories
            </Link>

            <h1>
              {editId
                ? "Edit Category"
                : "Add New Category"}
            </h1>

          </div>

        </div>

        <section className="form-card">

          <div className="section-header">

            <div className="section-icon">
              🏷️
            </div>

            <div>

              <div className="section-label">
                CATEGORY INFORMATION
              </div>

              <h2>
                Basic Information
              </h2>

              <p>
                {editId
                  ? "Update your category information."
                  : "Create a category to organize your saree products."}
              </p>

            </div>

          </div>

          <div className="field">

            <label>
              Category Name
            </label>

            <div className="input-wrap">
              <span className="input-icon">✎</span>

              <input
                type="text"
                placeholder="Enter category name"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
              />
            </div>

          </div>

        </section>

        <section className="form-card">

          <div className="section-header">

            <div className="section-icon">
              🖼️
            </div>

            <div>

              <div className="section-label">
                CATEGORY IMAGE
              </div>

              <h2>
                Category Image
              </h2>

              <p>
                Upload an image that represents this category.
              </p>

            </div>

          </div>

          <label className="upload-area">

            {image ? (
              <div className="image-preview">
                <img
                  src={image}
                  alt="Category preview"
                />

                <div className="image-overlay">
                  <span className="overlay-icon">🔄</span>
                  <span>Click to change image</span>
                </div>
              </div>
            ) : (
              <>
                <div className="upload-icon">
                  🖼️
                </div>

                <div className="upload-title">
                  Upload Category Image
                </div>

                <div className="upload-text">
                  Click here to choose an image
                </div>
              </>
            )}

            <input
              type="file"
              accept="image/*"
              hidden
              onChange={handleImageChange}
            />

          </label>

        </section>

        <div className="actions">

          <Link
            href="/admin/categories"
            className="cancel-button"
          >
            Cancel
          </Link>

          <button
            type="button"
            className="save-button"
            disabled={
              isSaving ||
              isUploading ||
              isLoading
            }
            onClick={handleSave}
          >
            {isSaving ? (
              <>
                <span className="btn-spinner"></span>
                {editId ? "Updating..." : "Saving..."}
              </>
            ) : (
              <>
                <span>{editId ? "💾" : "＋"}</span>
                {editId
                  ? "Update Category"
                  : "Save Category"}
              </>
            )}
          </button>

        </div>

      </main>

      <style>{`
        * {
          box-sizing: border-box;
        }

        .admin-page {
          min-height: 100vh;
          display: flex;
          background:
            radial-gradient(
              circle at top left,
              #fdf4f8 0%,
              #f8f5f7 40%,
              #f4f1f5 100%
            );
          color: #29232a;
          font-family:
            "Inter",
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Roboto,
            sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        /* =========================
           SIDEBAR
        ========================= */

        .sidebar {
          width: 230px;
          min-height: 100vh;
          background: linear-gradient(
            180deg,
            #241923 0%,
            #1a1319 55%,
            #150f14 100%
          );
          color: white;
          padding: 22px 15px;
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          z-index: 10;
          overflow: hidden;
        }

        .sidebar::before {
          content: "";
          position: absolute;
          top: -100px;
          right: -80px;
          width: 220px;
          height: 220px;
          border-radius: 50%;
          background:
            radial-gradient(
              circle,
              rgba(212, 125, 160, 0.2),
              transparent 70%
            );
          pointer-events: none;
        }

        .sidebar::after {
          content: "";
          position: absolute;
          bottom: -120px;
          left: -70px;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background:
            radial-gradient(
              circle,
              rgba(120, 80, 200, 0.12),
              transparent 70%
            );
          pointer-events: none;
        }

        .brand {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 0 6px 22px;
          border-bottom:
            1px solid rgba(255,255,255,0.08);
        }

        .logo {
          width: 43px;
          height: 43px;
          border-radius: 13px;
          background: linear-gradient(
            135deg,
            #d66f99,
            #b14f79
          );
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          font-weight: 800;
          box-shadow:
            0 8px 20px rgba(177,79,121,0.25);
          animation: logoGlow 4s ease-in-out infinite;
        }

        @keyframes logoGlow {
          0%, 100% {
            box-shadow: 0 8px 20px rgba(177,79,121,0.25);
          }
          50% {
            box-shadow: 0 12px 28px rgba(177,79,121,0.45);
          }
        }

        .brand-name {
          font-size: 13px;
          font-weight: 800;
          margin-bottom: 3px;
        }

        .brand-subtitle {
          font-size: 10px;
          color: #b7aab3;
        }

        .menu-title {
          position: relative;
          z-index: 1;
          font-size: 9px;
          letter-spacing: 1.5px;
          color: #887983;
          font-weight: 800;
          margin: 24px 8px 12px;
        }

        .menu {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .menu-item {
          height: 43px;
          padding: 0 13px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #c7bcc4;
          text-decoration: none;
          font-size: 12px;
          font-weight: 700;
          transition:
            background 0.25s ease,
            color 0.25s ease,
            transform 0.25s ease;
        }

        .menu-item:hover {
          background:
            rgba(255,255,255,0.06);
          color: white;
          transform: translateX(3px);
        }

        .menu-item.active {
          color: white;
          background: linear-gradient(
            90deg,
            rgba(177,79,121,0.34),
            rgba(177,79,121,0.15)
          );
          box-shadow:
            inset 3px 0 0 #d56e98,
            0 8px 20px rgba(182, 93, 131, 0.15);
        }

        .menu-icon {
          width: 18px;
          text-align: center;
          font-size: 15px;
        }

        .sidebar-bottom {
          position: relative;
          z-index: 1;
          margin-top: auto;
          padding-top: 20px;
        }

        .view-store {
          height: 42px;
          border:
            1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          color: #d7cdd4;
          text-decoration: none;
          font-size: 11px;
          font-weight: 700;
          transition: all 0.25s ease;
        }

        .view-store:hover {
          background:
            rgba(255,255,255,0.06);
          transform: translateY(-2px);
        }

        /* =========================
           MAIN
        ========================= */

        .main-content {
          margin-left: 230px;
          width: calc(100% - 230px);
          padding: 32px 27px 50px;
          min-height: 100vh;
          animation: contentFade 0.5s ease-out;
        }

        @keyframes contentFade {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .top-header {
          margin-bottom: 24px;
        }

        .eyebrow {
          color: #b14f79;
          font-size: 9px;
          letter-spacing: 1.7px;
          font-weight: 900;
          margin-bottom: 9px;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #8f7f88;
          text-decoration: none;
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 8px;
          transition:
            color 0.25s ease,
            transform 0.25s ease;
        }

        .back-link:hover {
          color: #b14f79;
        }

        .back-link:hover .back-arrow {
          transform: translateX(-3px);
        }

        .back-arrow {
          display: inline-block;
          transition: transform 0.25s ease;
        }

        h1 {
          margin: 0;
          font-size: 29px;
          line-height: 1.1;
          letter-spacing: -0.8px;
          background: linear-gradient(135deg, #29232a, #6b3d55);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* =========================
           FORM CARD
        ========================= */

        .form-card {
          background: white;
          border: 1px solid #eee7eb;
          border-radius: 18px;
          padding: 22px;
          margin-bottom: 18px;
          box-shadow:
            0 6px 20px rgba(45,25,38,0.035);
          animation: cardRise 0.5s ease-out backwards;
          transition:
            box-shadow 0.3s ease,
            border-color 0.3s ease;
        }

        .form-card:nth-of-type(1) {
          animation-delay: 0.05s;
        }

        .form-card:nth-of-type(2) {
          animation-delay: 0.12s;
        }

        @keyframes cardRise {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .form-card:hover {
          box-shadow:
            0 14px 32px rgba(45,25,38,0.07);
        }

        .section-header {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding-bottom: 18px;
          border-bottom:
            1px solid #f0e9ed;
          margin-bottom: 20px;
        }

        .section-icon {
          width: 42px;
          height: 42px;
          flex-shrink: 0;
          border-radius: 12px;
          background: linear-gradient(135deg, #f8eaf0, #fbdcec);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          transition: transform 0.3s ease;
        }

        .form-card:hover .section-icon {
          transform: scale(1.08) rotate(-4deg);
        }

        .section-label {
          font-size: 8px;
          letter-spacing: 1.5px;
          color: #b14f79;
          font-weight: 900;
          margin-bottom: 5px;
        }

        .section-header h2 {
          margin: 0 0 5px;
          font-size: 17px;
        }

        .section-header p {
          margin: 0;
          color: #9b8d95;
          font-size: 11px;
          line-height: 1.6;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .field label {
          font-size: 10px;
          font-weight: 800;
          color: #51464e;
          letter-spacing: 0.3px;
        }

        .input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 13px;
          color: #b9a9b2;
          font-size: 13px;
          pointer-events: none;
          transition: color 0.25s ease;
        }

        .input-wrap:focus-within .input-icon {
          color: #b14f79;
        }

        .field input {
          width: 100%;
          height: 45px;
          border:
            1px solid #e7dde3;
          border-radius: 10px;
          padding: 0 13px 0 36px;
          outline: none;
          font-size: 12px;
          color: #30282e;
          background: #fff;
          transition:
            border-color 0.25s ease,
            box-shadow 0.25s ease;
        }

        .field input:focus {
          border-color: #c66b91;
          box-shadow:
            0 0 0 3px rgba(177,79,121,0.12);
        }

        .field input::placeholder {
          color: #b9adb4;
        }

        /* =========================
           IMAGE UPLOAD
        ========================= */

        .upload-area {
          position: relative;
          min-height: 220px;
          border:
            2px dashed #dfd2d9;
          border-radius: 15px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          cursor: pointer;
          overflow: hidden;
          background: #fdfbfc;
          transition:
            border-color 0.3s ease,
            background 0.3s ease,
            transform 0.3s ease;
        }

        .upload-area:hover {
          border-color: #b14f79;
          background: #fffafd;
        }

        .upload-area:hover .upload-icon {
          transform: scale(1.1) rotate(-6deg);
        }

        .upload-icon {
          width: 58px;
          height: 58px;
          border-radius: 16px;
          background: linear-gradient(135deg, #f8eaf0, #fbdcec);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 25px;
          margin-bottom: 13px;
          transition: transform 0.3s ease;
        }

        .upload-title {
          font-size: 13px;
          font-weight: 800;
          margin-bottom: 5px;
        }

        .upload-text {
          color: #a3949c;
          font-size: 10px;
        }

        .image-preview {
          position: relative;
          width: 100%;
          height: 300px;
        }

        .image-preview img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .image-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: rgba(41, 35, 42, 0.65);
          color: white;
          font-size: 12px;
          font-weight: 800;
          opacity: 0;
          transition: opacity 0.3s ease;
          backdrop-filter: blur(2px);
        }

        .upload-area:hover .image-overlay {
          opacity: 1;
        }

        .overlay-icon {
          font-size: 16px;
        }

        /* =========================
           ACTIONS
        ========================= */

        .actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding-bottom: 20px;
          animation: cardRise 0.5s ease-out 0.2s backwards;
        }

        .cancel-button,
        .save-button {
          height: 43px;
          padding: 0 20px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          text-decoration: none;
          transition:
            transform 0.3s cubic-bezier(0.34,1.56,0.64,1),
            box-shadow 0.3s ease,
            background 0.25s ease,
            border-color 0.25s ease;
        }

        .cancel-button {
          color: #6e626a;
          background: white;
          border:
            1px solid #e4dbe0;
        }

        .cancel-button:hover {
          background: #faf6f8;
          border-color: #d5c2cc;
          transform: translateY(-2px);
          box-shadow:
            0 8px 18px rgba(70,40,55,0.08);
        }

        .save-button {
          border: 0;
          background: linear-gradient(135deg, #b14f79, #a4446d);
          color: white;
          box-shadow:
            0 8px 20px rgba(177,79,121,0.22);
        }

        .save-button:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow:
            0 14px 28px rgba(177,79,121,0.32);
        }

        .save-button:disabled {
          opacity: 0.7;
          cursor: wait;
          transform: none;
        }

        .btn-spinner {
          width: 12px;
          height: 12px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: white;
          border-radius: 50%;
          animation: btnSpin 0.7s linear infinite;
        }

        @keyframes btnSpin {
          to {
            transform: rotate(360deg);
          }
        }

        /* =========================
           LOADING OVERLAY
        ========================= */

        .loading-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            rgba(35, 25, 31, 0.42);
          backdrop-filter: blur(7px);
          animation: overlayFade 0.3s ease-out;
        }

        @keyframes overlayFade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .loading-box {
          width: min(330px, calc(100% - 40px));
          padding: 30px 24px;
          border-radius: 20px;
          background: rgba(255,255,255,0.97);
          box-shadow:
            0 20px 60px rgba(0,0,0,0.16);
          text-align: center;
          animation: boxPop 0.35s cubic-bezier(0.34,1.56,0.64,1);
        }

        @keyframes boxPop {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .loading-spinner {
          width: 44px;
          height: 44px;
          margin: 0 auto 16px;
          border:
            4px solid #f1dce5;
          border-top-color: #b14f79;
          border-radius: 50%;
          animation:
            category-spin 0.8s linear infinite;
        }

        .loading-box h3 {
          margin: 0;
          font-size: 17px;
          font-weight: 800;
          color: #2d2329;
        }

        .loading-box p {
          margin: 8px 0 0;
          color: #95858e;
          font-size: 11px;
        }

        @keyframes category-spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* =========================
           RESPONSIVE
        ========================= */

        @media (max-width: 760px) {
          .sidebar {
            width: 72px;
            padding: 18px 9px;
          }

          .brand {
            justify-content: center;
            padding-left: 0;
            padding-right: 0;
          }

          .brand > div:last-child,
          .menu-title,
          .menu-item span:last-child,
          .view-store {
            display: none;
          }

          .menu-item {
            justify-content: center;
            padding: 0;
          }

          .main-content {
            margin-left: 72px;
            width: calc(100% - 72px);
            padding: 24px 15px 40px;
          }

          h1 {
            font-size: 25px;
          }

          .section-header {
            gap: 11px;
          }

          .section-icon {
            width: 38px;
            height: 38px;
            font-size: 16px;
          }
        }

        @media (max-width: 500px) {
          .actions {
            flex-direction: column-reverse;
          }

          .cancel-button,
          .save-button {
            width: 100%;
          }

          .form-card {
            padding: 18px;
          }

          .image-preview {
            height: 220px;
          }
        }
      `}</style>
    </div>
  );
}