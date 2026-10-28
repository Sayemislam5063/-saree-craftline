"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase/supabase-client";
import { uploadToCloudinary } from "../../../../lib/cloudinary/client";

// ✨ ইউনিক প্রোডাক্ট কোড জেনারেট করার ফাংশন
function generateProductCode() {
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SC-${randomStr}`;
}

export default function AddProductPage() {
  const [priceType, setPriceType] = useState<"single" | "blouse">("blouse");
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [thumbnailIndex, setThumbnailIndex] = useState(0);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [stockQuantity, setStockQuantity] = useState("");
  const [withoutBlousePrice, setWithoutBlousePrice] = useState("");
  const [withBlousePrice, setWithBlousePrice] = useState("");
  const [discountWithoutBlousePrice, setDiscountWithoutBlousePrice] = useState("");
  const [discountWithBlousePrice, setDiscountWithBlousePrice] = useState("");
  const [singlePrice, setSinglePrice] = useState("");
  const [singleDiscountPrice, setSingleDiscountPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasDiscount, setHasDiscount] = useState(false);
  const [isFreeDelivery, setIsFreeDelivery] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) {
        console.error("Category load error:", error);
        return;
      }
      setCategories(data ?? []);
    };
    loadCategories();
  }, []);

  useEffect(() => {
    if (!editId) return;

    const loadProductForEdit = async () => {
      const { data: product, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", editId)
        .single();

      if (error || !product) {
        console.error("Product load error:", error);
        alert("Product পাওয়া যায়নি।");
        return;
      }

      setName(product.name ?? "");
      setDescription(product.description ?? "");
      setStockQuantity(String(product.stock_quantity ?? ""));
      setWithoutBlousePrice(String(product.without_blouse_price ?? ""));
      setWithBlousePrice(String(product.with_blouse_price ?? ""));
      setPriceType(product.price_type === "single" ? "single" : "blouse");
      setDiscountWithoutBlousePrice(product.discount_without_blouse_price !== null && product.discount_without_blouse_price !== undefined ? String(product.discount_without_blouse_price) : "");
      setDiscountWithBlousePrice(product.discount_with_blouse_price !== null && product.discount_with_blouse_price !== undefined ? String(product.discount_with_blouse_price) : "");
      setSinglePrice(product.single_price !== null && product.single_price !== undefined ? String(product.single_price) : "");
      setSingleDiscountPrice(product.single_discount_price !== null && product.single_discount_price !== undefined ? String(product.single_discount_price) : "");
      setCostPrice(product.cost_price !== null && product.cost_price !== undefined ? String(product.cost_price) : "");

      const hasAnyDiscount =
        (product.discount_without_blouse_price !== null && product.discount_without_blouse_price !== undefined) ||
        (product.discount_with_blouse_price !== null && product.discount_with_blouse_price !== undefined) ||
        (product.single_discount_price !== null && product.single_discount_price !== undefined);
      setHasDiscount(Boolean(hasAnyDiscount));
      setIsFreeDelivery(Boolean(product.is_free_delivery));

      const productImages = Array.isArray(product.images) ? product.images : [];
      setImages(productImages);
      setImageFiles([]);
      setThumbnailIndex(product.thumbnail_index ?? 0);

      if (product.category_id) {
        const { data: categoryData } = await supabase
          .from("categories")
          .select("slug")
          .eq("id", product.category_id)
          .single();
        setCategory(categoryData?.slug ?? "");
      }
    };

    loadProductForEdit();
  }, [editId]);

  return (
    <main className="admin-page">
      {(isSaving || saveSuccess || saveError) && (
        <div className="saving-overlay">
          <div className="saving-box">
            {saveSuccess ? (
              <>
                <div className="success-icon">✓</div>
                <h3>Product Saved Successfully!</h3>
                <p>{editId ? "Product successfully updated." : "Product successfully added."}</p>
              </>
            ) : saveError ? (
              <>
                <div className="error-icon">!</div>
                <h3>Product Save Failed</h3>
                <p>{saveError}</p>
                <button type="button" className="error-ok-button" onClick={() => setSaveError("")}>OK</button>
              </>
            ) : (
              <>
                <div className="saving-spinner"></div>
                <h3>{editId ? "Product Updating..." : "Product Saving..."}</h3>
                <p>দয়া করে অপেক্ষা করুন...</p>
              </>
            )}
          </div>
        </div>
      )}

      <aside className="sidebar">
        <div className="brand">
          <div className="logo">SC</div>
          <div className="brand-text">
            <strong>Saree Craftline</strong>
            <span>Admin Panel</span>
          </div>
        </div>
        <div className="menu-title">MAIN MENU</div>
        <nav className="nav-menu">
          <Link href="/admin" className="nav-button"><span className="nav-icon">📊</span><span>Dashboard</span></Link>
          <Link href="/admin/products" className="nav-button active"><span className="nav-icon">🛍️</span><span>Products</span></Link>
          <Link href="/admin/categories" className="nav-button"><span className="nav-icon">🗂️</span><span>Categories</span></Link>
          <Link href="/admin/orders" className="nav-button"><span className="nav-icon">📦</span><span>Orders</span></Link>
          <Link href="/admin/settings" className="nav-button"><span className="nav-icon">⚙️</span><span>Settings</span></Link>
        </nav>
        <div className="sidebar-bottom">
          <Link href="/" className="store-button"><span>←</span><span>View Store</span></Link>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <Link href="/admin/products" className="back-link">← Back to Products</Link>
            <p className="welcome-text">PRODUCT MANAGEMENT</p>
            <h1>{editId ? "Edit Product" : "Add New Product"}</h1>
          </div>
        </header>

        <section className="form-card">
          <div className="form-section">
            <div className="section-heading">
              <span className="section-icon">📝</span>
              <div>
                <h2>Basic Information</h2>
                <p>আপনার saree product-এর basic information দিন।</p>
              </div>
            </div>

            <div className="form-grid">
              <div className="field full">
                <label>Saree Name</label>
                <input type="text" placeholder="Enter saree name" value={name} onChange={(event) => setName(event.target.value)} />
              </div>

              <div className="field">
                <label>Category</label>
                <select value={category} onChange={(event) => setCategory(event.target.value)}>
                  <option value="" disabled>Select Category</option>
                  {categories.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
                </select>
              </div>

              <div className="field">
                <label>Stock Quantity</label>
                <input type="number" placeholder="Enter stock quantity" value={stockQuantity} onChange={(event) => setStockQuantity(event.target.value)} />
              </div>

              <div className="field full">
                <label>Product Description / পণ্যের বিবরণ</label>
                <textarea placeholder="এখানে পণ্যের বিস্তারিত বিবরণ লিখুন..." value={description} onChange={(event) => setDescription(event.target.value)} rows={5} />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="section-heading">
              <span className="section-icon">🖼️</span>
              <div>
                <h2>Product Images</h2>
                <p>সর্বোচ্চ ৫টি image যোগ করতে পারবেন।</p>
              </div>
            </div>

            <div className="image-upload-box">
              <div className="upload-icon">📷</div>
              <h3>Upload Product Images</h3>
              <p>4–5টি saree image যোগ করুন।</p>
              <label className="upload-button">
                ＋ Choose Images
                <input type="file" accept="image/*" multiple hidden onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  if (!files.length) return;
                  const remainingSlots = 5 - images.length;
                  const selectedFiles = files.slice(0, remainingSlots);
                  const newImages = selectedFiles.map((file) => URL.createObjectURL(file));
                  setImageFiles((prev) => [...prev, ...selectedFiles]);
                  setImages((prev) => [...prev, ...newImages]);
                }} />
              </label>
            </div>

            {images.length > 0 && (
              <div className="image-preview-grid">
                {images.map((image, index) => (
                  <button type="button" className={`image-preview ${thumbnailIndex === index ? "selected-thumbnail" : ""}`} key={image} onClick={() => setThumbnailIndex(index)}>
                    <img src={image} alt={`Product ${index + 1}`} />
                    {thumbnailIndex === index && <span className="thumbnail-badge">✓ Thumbnail</span>}
                    <span className="remove-image" onClick={(event) => {
                      event.stopPropagation();
                      setImages((currentImages) => currentImages.filter((_, imageIndex) => imageIndex !== index));
                      setThumbnailIndex((currentIndex) => {
                        if (currentIndex === index) return 0;
                        if (currentIndex > index) return currentIndex - 1;
                        return currentIndex;
                      });
                    }}>×</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="form-section">
            <div className="section-heading">
              <span className="section-icon">৳</span>
              <div>
                <h2>Pricing</h2>
                <p>Blouse সহ এবং blouse ছাড়া price সেট করুন।</p>
              </div>
            </div>

            <div className="price-type-section">
              <label className="price-type-label">Product Price Type</label>
              <div className="price-type-options">
                <label className="price-type-option">
                  <input type="radio" name="priceType" value="blouse" checked={priceType === "blouse"} onChange={() => setPriceType("blouse")} />
                  <span>Blouse সহ / ছাড়া</span>
                </label>
                <label className="price-type-option">
                  <input type="radio" name="priceType" value="single" checked={priceType === "single"} onChange={() => setPriceType("single")} />
                  <span>এক দাম / Single Price</span>
                </label>
              </div>
            </div>

            {priceType === "blouse" ? (
              <div className="form-grid two">
                <div className="field">
                  <label>Price Without Blouse</label>
                  <input type="number" min="0" placeholder="৳ 0" value={withoutBlousePrice} onChange={(event) => setWithoutBlousePrice(event.target.value)} />
                </div>
                <div className="field">
                  <label>Price With Blouse</label>
                  <input type="number" min="0" placeholder="৳ 0" value={withBlousePrice} onChange={(event) => setWithBlousePrice(event.target.value)} />
                </div>
              </div>
            ) : (
              <div className="form-grid one">
                <div className="field">
                  <label>Single Price</label>
                  <input type="number" min="0" placeholder="৳ 0" value={singlePrice} onChange={(event) => setSinglePrice(event.target.value)} />
                </div>
              </div>
            )}

            <div className="discount-toggle-box">
              <label className="discount-toggle">
                <input type="checkbox" checked={hasDiscount} onChange={(event) => {
                  const checked = event.target.checked;
                  setHasDiscount(checked);
                  if (!checked) {
                    setDiscountWithoutBlousePrice("");
                    setDiscountWithBlousePrice("");
                    setSingleDiscountPrice("");
                  }
                }} />
                <span className="toggle-checkbox">✓</span>
                <span className="toggle-text">
                  <strong>Discount Price যোগ করুন</strong>
                  <small>ছাড়ের দাম দিতে চাইলে টিক দিন — তখন discount এর ঘর দেখাবে।</small>
                </span>
              </label>
            </div>

            {hasDiscount && (
              priceType === "blouse" ? (
                <div className="form-grid two discount-grid">
                  <div className="field">
                    <label>Discount Price Without Blouse</label>
                    <input type="number" min="0" placeholder="৳ 0" value={discountWithoutBlousePrice} onChange={(event) => setDiscountWithoutBlousePrice(event.target.value)} />
                  </div>
                  <div className="field">
                    <label>Discount Price With Blouse</label>
                    <input type="number" min="0" placeholder="৳ 0" value={discountWithBlousePrice} onChange={(event) => setDiscountWithBlousePrice(event.target.value)} />
                  </div>
                </div>
              ) : (
                <div className="form-grid one discount-grid">
                  <div className="field">
                    <label>Discount Price</label>
                    <input type="number" min="0" placeholder="৳ 0" value={singleDiscountPrice} onChange={(event) => setSingleDiscountPrice(event.target.value)} />
                  </div>
                </div>
              )
            )}

            <div className="free-delivery-toggle-box">
              <label className="free-delivery-toggle">
                <input type="checkbox" checked={isFreeDelivery} onChange={(event) => setIsFreeDelivery(event.target.checked)} />
                <span className="free-toggle-checkbox">✓</span>
                <span className="free-toggle-text">
                  <strong>🚚 Free Delivery / ফ্রি ডেলিভারি</strong>
                  <small>টিক দিলে এই পণ্যটি অর্ডার করলে কোনো delivery charge লাগবে না।</small>
                </span>
              </label>
            </div>

            <div className="purchase-cost-box">
              <div className="field">
                <label>Purchase Cost / কেনা দাম</label>
                <input type="number" min="0" placeholder="৳ 0" value={costPrice} onChange={(event) => setCostPrice(event.target.value)} />
                <small className="private-note">এই দাম শুধু Admin-এর হিসাবের জন্য। Customer এটি দেখতে পারবে না।</small>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <Link href="/admin/products" className="cancel-button">Cancel</Link>
            <button type="button" className="save-button" disabled={isSaving} onClick={async () => {
              if (!name.trim() || !category || !stockQuantity) {
                alert("সব প্রয়োজনীয় তথ্য পূরণ করুন।");
                return;
              }
              if (priceType === "blouse" && (!withoutBlousePrice || !withBlousePrice)) {
                alert("Blouse সহ এবং ছাড়া—দুই ধরনের মূল price দিন।");
                return;
              }
              if (priceType === "single" && !singlePrice) {
                alert("Single Price দিন।");
                return;
              }

              setIsSaving(true);

              try {
                const { data: categoryData, error: categoryError } = await supabase
                  .from("categories")
                  .select("id")
                  .eq("slug", category)
                  .single();

                if (categoryError || !categoryData) {
                  alert("Selected category পাওয়া যায়নি।");
                  setIsSaving(false);
                  return;
                }

                const uploadedImageUrls = [];
                for (const file of imageFiles) {
                  const url = await uploadToCloudinary(file);
                  uploadedImageUrls.push(url);
                }

                const productData = {
                  name: name.trim(),
                  description: description.trim() || null,
                  category_id: categoryData.id,
                  stock_quantity: Number(stockQuantity),
                  is_free_delivery: isFreeDelivery,
                  cost_price: costPrice !== "" ? Number(costPrice) : null,
                  price_type: priceType,
                  without_blouse_price: priceType === "blouse" && withoutBlousePrice ? Number(withoutBlousePrice) : null,
                  discount_without_blouse_price: priceType === "blouse" && hasDiscount && discountWithoutBlousePrice ? Number(discountWithoutBlousePrice) : null,
                  with_blouse_price: priceType === "blouse" && withBlousePrice ? Number(withBlousePrice) : null,
                  discount_with_blouse_price: priceType === "blouse" && hasDiscount && discountWithBlousePrice ? Number(discountWithBlousePrice) : null,
                  single_price: priceType === "single" && singlePrice ? Number(singlePrice) : null,
                  single_discount_price: priceType === "single" && hasDiscount && singleDiscountPrice ? Number(singleDiscountPrice) : null,
                  images: imageFiles.length > 0 ? [...images.slice(0, images.length - imageFiles.length), ...uploadedImageUrls] : images,
                  thumbnail_index: thumbnailIndex,
                };

                const { data, error } = editId
                  ? await supabase
                      .from("products")
                      .update(productData)
                      .eq("id", editId)
                      .select()
                      .single()
                  : await supabase
                      .from("products")
                      .insert({
                        ...productData,
                        is_active: true,
                        product_code: generateProductCode(), // ✨ এখানে নতুন কোড জেনারেট হবে
                      })
                      .select()
                      .single();

                if (error) {
                  console.error("Product save error:", error);
                  setIsSaving(false);
                  setSaveError("Product save failed. দয়া করে আবার চেষ্টা করুন।");
                  return;
                }

                setSaveSuccess(true);
                setTimeout(() => {
                  router.push("/admin/products");
                }, 1200);

              } catch (error) {
                console.error("Image upload error:", error);
                setIsSaving(false);
                alert("Image upload failed.");
              }
            }}>
              {isSaving ? (editId ? "Updating Product..." : "Saving Product...") : (editId ? "Update Product" : "Save Product")}
            </button>
          </div>
        </section>
      </section>

      <style>{`
        /* আপনার আগের সব CSS এখানে হুবহু থাকবে */
        * { box-sizing: border-box; }
        .admin-page { min-height: 100vh; display: flex; background: #f7f4f6; color: #241d22; font-family: "Inter", sans-serif; }
        .sidebar { width: 255px; min-height: 100vh; position: sticky; top: 0; display: flex; flex-direction: column; padding: 22px 15px; background: linear-gradient(180deg, #251c22 0%, #1a1318 100%); color: white; }
        .brand { display: flex; align-items: center; gap: 12px; padding: 5px 8px 25px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); margin-bottom: 18px; }
        .logo { width: 46px; height: 46px; display: grid; place-items: center; border-radius: 14px; background: linear-gradient(135deg, #d47da0, #a94f76); font-size: 16px; font-weight: 900; }
        .brand-text strong, .brand-text span { display: block; }
        .brand-text strong { font-size: 14px; }
        .brand-text span { margin-top: 4px; color: #a99ba1; font-size: 11px; }
        .menu-title { padding: 0 10px 9px; color: #74666d; font-size: 10px; font-weight: 900; letter-spacing: 1.5px; }
        .nav-menu { display: grid; gap: 6px; }
        .nav-button { min-height: 46px; display: flex; align-items: center; gap: 12px; padding: 0 13px; border-radius: 13px; color: #c8bcc2; text-decoration: none; font-size: 13px; font-weight: 700; transition: 0.2s ease; }
        .nav-button:hover { background: rgba(255, 255, 255, 0.07); color: white; }
        .nav-button.active { background: linear-gradient(135deg, rgba(202, 108, 148, 0.25), rgba(169, 79, 118, 0.16)); color: white; box-shadow: inset 3px 0 0 #d17a9f; }
        .nav-icon { width: 25px; text-align: center; }
        .sidebar-bottom { margin-top: auto; padding-top: 20px; }
        .store-button { min-height: 45px; display: flex; align-items: center; gap: 10px; padding: 0 13px; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 13px; background: rgba(255, 255, 255, 0.045); color: #cfc3c8; text-decoration: none; font-size: 13px; font-weight: 700; }
        .content { flex: 1; min-width: 0; padding: 30px; }
        .topbar { margin-bottom: 24px; }
        .back-link { display: inline-block; margin-bottom: 16px; color: #9c7b89; text-decoration: none; font-size: 12px; font-weight: 700; }
        .welcome-text { margin: 0 0 5px; color: #ad5278; font-size: 10px; font-weight: 900; letter-spacing: 1.8px; }
        .topbar h1 { margin: 0; font-size: 30px; font-weight: 900; }
        .form-card { overflow: hidden; border: 1px solid #eee6e9; border-radius: 22px; background: white; box-shadow: 0 12px 35px rgba(70, 45, 56, 0.06); }
        .form-section { padding: 26px; border-bottom: 1px solid #f0e8ec; }
        .section-heading { display: flex; align-items: flex-start; gap: 13px; margin-bottom: 22px; }
        .section-icon { width: 43px; height: 43px; flex: 0 0 43px; display: grid; place-items: center; border-radius: 13px; background: #f8edf2; color: #a94f76; font-size: 19px; font-weight: 900; }
        .section-heading h2 { margin: 0; font-size: 18px; font-weight: 900; }
        .section-heading p { margin: 5px 0 0; color: #97858d; font-size: 11px; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
        .field { min-width: 0; width: 100%; }
        .field.full { grid-column: 1 / -1; }
        .field label { display: block; margin-bottom: 7px; color: #4c3d44; font-size: 11px; font-weight: 800; }
        .field input, .field textarea, .field select { width: 100%; border: 1px solid #e6dce1; border-radius: 12px; outline: none; background: #fcfafb; color: #241d22; font-size: 12px; transition: 0.2s ease; }
        .field input, .field select { height: 45px; padding: 0 13px; }
        .field textarea { padding: 13px; resize: vertical; min-height: 110px; font-family: inherit; line-height: 1.6; }
        .field input:focus, .field textarea:focus, .field select:focus { border-color: #c6819e; box-shadow: 0 0 0 3px rgba(198, 129, 158, 0.1); background: white; }
        .image-upload-box { min-height: 210px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 30px; border: 1.5px dashed #ddc5d0; border-radius: 18px; background: #fdf9fb; text-align: center; }
        .upload-icon { width: 58px; height: 58px; display: grid; place-items: center; margin-bottom: 12px; border-radius: 18px; background: #f7e8ef; font-size: 25px; }
        .image-upload-box h3 { margin: 0; font-size: 15px; font-weight: 900; }
        .image-upload-box p { margin: 6px 0 15px; color: #99878f; font-size: 11px; }
        .upload-button { min-height: 40px; display: inline-flex; align-items: center; justify-content: center; padding: 0 16px; border-radius: 11px; background: #241d22; color: white; font-size: 11px; font-weight: 900; cursor: pointer; }
        .image-preview-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-top: 15px; }
        .image-preview { position: relative; width: 100%; padding: 0; aspect-ratio: 1; overflow: hidden; border-radius: 14px; background: #f4eef1; border: 2px solid transparent; cursor: pointer; transition: border-color 0.2s ease, box-shadow 0.2s ease; }
        .image-preview.selected-thumbnail { border-color: #b14f79; box-shadow: 0 0 0 3px rgba(177, 79, 121, 0.12); }
        .image-preview img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .thumbnail-badge { position: absolute; left: 7px; bottom: 7px; padding: 5px 7px; border-radius: 7px; background: rgba(36, 29, 34, 0.82); color: white; font-size: 8px; font-weight: 800; }
        .remove-image { position: absolute; top: 8px; right: 8px; width: 28px; height: 28px; border-radius: 50%; background: #ffffff; color: #b14f79; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15); z-index: 5; cursor: pointer; }
        .form-actions { display: flex; justify-content: flex-end; gap: 10px; padding: 20px 26px; background: #fdfbfc; }
        .cancel-button, .save-button { min-height: 44px; display: inline-flex; align-items: center; justify-content: center; padding: 0 18px; border-radius: 12px; font-size: 12px; font-weight: 900; cursor: pointer; }
        .cancel-button { border: 1px solid #e5d9df; background: white; color: #66565e; text-decoration: none; }
        .save-button { border: 0; background: #241d22; color: white; }
        .saving-overlay { position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; background: rgba(30, 20, 28, 0.45); backdrop-filter: blur(7px); }
        .saving-box { width: min(340px, calc(100% - 40px)); padding: 30px 24px; border-radius: 22px; background: rgba(255, 255, 255, 0.96); border: 1px solid rgba(255, 255, 255, 0.8); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18); text-align: center; }
        .saving-spinner { width: 42px; height: 42px; margin: 0 auto 16px; border: 4px solid #f1dce5; border-top-color: #a94f6f; border-radius: 50%; animation: saving-spin 0.8s linear infinite; }
        .saving-box h3 { margin: 0; color: #2d2028; font-size: 18px; font-weight: 800; }
        .saving-box p { margin: 8px 0 0; color: #806b76; font-size: 13px; font-weight: 600; }
        .success-icon { width: 52px; height: 52px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #e9f8ef; color: #239653; font-size: 30px; font-weight: 900; }
        .error-icon { width: 52px; height: 52px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #fff0f0; color: #d64545; font-size: 28px; font-weight: 900; }
        .error-ok-button { margin-top: 18px; min-width: 90px; border: 0; padding: 10px 20px; border-radius: 10px; background: #a94f6f; color: white; font-size: 13px; font-weight: 800; cursor: pointer; }
        @keyframes saving-spin { to { transform: rotate(360deg); } }
        .price-type-section { margin-bottom: 20px; }
        .price-type-label { display: block; margin-bottom: 10px; font-weight: 600; }
        .price-type-options { display: flex; gap: 14px; flex-wrap: wrap; }
        .price-type-option { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border: 1px solid #e5d8e1; border-radius: 12px; cursor: pointer; background: #fff; transition: 0.2s ease; }
        .form-grid.one { display: grid; grid-template-columns: minmax(220px, 1fr); gap: 18px; }
        .form-grid.two { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
        .discount-toggle-box { margin-top: 20px; padding: 16px 18px; border: 1px dashed #e5d0dc; border-radius: 14px; background: linear-gradient(135deg, #fdf7fa, #faf1f6); }
        .discount-toggle { display: flex; align-items: flex-start; gap: 12px; cursor: pointer; user-select: none; }
        .discount-toggle input[type="checkbox"] { position: absolute; opacity: 0; pointer-events: none; }
        .toggle-checkbox { width: 24px; height: 24px; flex: 0 0 24px; margin-top: 2px; display: inline-flex; align-items: center; justify-content: center; border: 2px solid #d3b8c6; border-radius: 8px; background: #fff; color: transparent; font-size: 13px; font-weight: 900; transition: all 0.2s ease; }
        .discount-toggle input:checked + .toggle-checkbox { background: linear-gradient(135deg, #b14f79, #8f3f62); border-color: #b14f79; color: #fff; transform: scale(1.05); }
        .toggle-text { display: flex; flex-direction: column; gap: 3px; }
        .toggle-text strong { color: #4c2d3d; font-size: 13px; font-weight: 900; }
        .toggle-text small { color: #8a7380; font-size: 11px; line-height: 1.5; font-weight: 600; }
        .discount-grid { margin-top: 16px; padding: 18px; border: 1px solid #f0d9e3; border-radius: 14px; background: #fff8fb; }
        .free-delivery-toggle-box { margin-top: 20px; padding: 16px 18px; border: 1px dashed #c3e6d1; border-radius: 14px; background: linear-gradient(135deg, #f3fbf5, #e8f7ee); }
        .free-delivery-toggle { display: flex; align-items: flex-start; gap: 12px; cursor: pointer; user-select: none; }
        .free-delivery-toggle input[type="checkbox"] { position: absolute; opacity: 0; pointer-events: none; }
        .free-toggle-checkbox { width: 24px; height: 24px; flex: 0 0 24px; margin-top: 2px; display: inline-flex; align-items: center; justify-content: center; border: 2px solid #a8d4b8; border-radius: 8px; background: #fff; color: transparent; font-size: 13px; font-weight: 900; transition: all 0.2s ease; }
        .free-delivery-toggle input:checked + .free-toggle-checkbox { background: linear-gradient(135deg, #3fa66a, #1f6b42); border-color: #3fa66a; color: #fff; transform: scale(1.05); }
        .free-toggle-text { display: flex; flex-direction: column; gap: 3px; }
        .free-toggle-text strong { color: #1f6b42; font-size: 13px; font-weight: 900; }
        .free-toggle-text small { color: #4d7a5e; font-size: 11px; line-height: 1.5; font-weight: 600; }
        .purchase-cost-box { margin-top: 20px; padding: 18px; border: 1px solid #ead9e2; border-radius: 14px; background: #fff8fb; }
        .private-note { color: #9b6b80; font-size: 10px; font-weight: 600; }
        @media (max-width: 800px) { .admin-page { display: block; } .sidebar { width: 100%; min-height: auto; position: static; } .nav-menu { grid-template-columns: repeat(2, 1fr); } .content { padding: 22px 16px; } }
        @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } .field.full { grid-column: auto; } .image-preview-grid { grid-template-columns: repeat(2, 1fr); } .form-section { padding: 20px; } .form-actions { padding: 16px 20px; } .cancel-button, .save-button { flex: 1; } .form-grid.one, .form-grid.two { grid-template-columns: 1fr; } }
      `}</style>
    </main>
  );
}