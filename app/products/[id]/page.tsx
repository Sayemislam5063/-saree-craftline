"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { supabase } from "../../../lib/supabase/supabase-client";
import { uploadToCloudinary } from "../../../lib/cloudinary/client";
import { useCart } from "../../../components/cart/cart-provider";
import ProductGallery from "../../../components/products/product-gallery";

type BlouseOption = "withoutBlouse" | "withBlouse";

type DbProduct = {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  stock_quantity: number;

  price_type: "single" | "blouse";

  without_blouse_price: number | null;
  discount_without_blouse_price: number | null;

  with_blouse_price: number | null;
  discount_with_blouse_price: number | null;

  single_price: number | null;
  single_discount_price: number | null;

  images: string[];
  thumbnail_index: number;
  is_active: boolean;
  is_free_delivery: boolean;  

  categories: {
    name: string;
    slug: string;
  } | null;
};

type Pricing = {
  withoutBlouse: number;
  discountWithoutBlouse?: number;
  withBlouse: number;
  discountWithBlouse?: number;
};

type ProductData = {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  images: {
    url: string;
    isThumbnail: boolean;
    alt: string;
  }[];
  pricing: Pricing;
  stock: number;
  isActive: boolean;
  isBestSelling: boolean;
  isFreeDelivery: boolean;   
};

type InfoTab = "description" | "additional" | "reviews";

type Review = {
  id: string;
  product_id: string;
  reviewer_name: string;
  reviewer_contact: string;
  rating: number;
  review_text: string;
  images: string[];
  created_at: string;
};

const OFFICIAL_WHATSAPP_NUMBER = "8801904872658";
const OFFICIAL_WHATSAPP_DISPLAY = "+880 1904-872658";

export default function ProductDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const { addToCart, updateQuantity } = useCart();

  const [dbProduct, setDbProduct] = useState<DbProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [blouseOption, setBlouseOption] = useState<BlouseOption | null>(null);
  const [optionError, setOptionError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeInfoTab, setActiveInfoTab] = useState<InfoTab>("description");
  const [copied, setCopied] = useState(false);

  // ✨ Related Products State
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);

  /* =========================
     REVIEWS STATE
  ========================= */
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewName, setReviewName] = useState("");
  const [reviewContact, setReviewContact] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [reviewImageFiles, setReviewImageFiles] = useState<File[]>([]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    async function loadProduct() {
      setLoading(true);

      const { data, error } = await supabase
        .from("products")
        .select(`
          id,
          name,
          description,
          category_id,
          stock_quantity,
          price_type,
          without_blouse_price,
          discount_without_blouse_price,
          with_blouse_price,
          discount_with_blouse_price,
          single_price,
          single_discount_price,
          images,
          thumbnail_index,
          is_active,
          is_free_delivery,
          categories ( name, slug )
        `)
        .eq("id", params.id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("Product load error:", error);
        setDbProduct(null);
        setLoading(false);
        return;
      }

      if (!data) {
        setDbProduct(null);
        setLoading(false);
        return;
      }

      const row = data as any;

      const imageUrls = Array.isArray(row.images)
        ? row.images.filter((image: unknown): image is string => typeof image === "string")
        : [];

      const categoryData = Array.isArray(row.categories)
        ? row.categories[0] ?? null
        : row.categories ?? null;

      setDbProduct({
        id: row.id,
        name: row.name,
        description: row.description,
        category_id: row.category_id,
        stock_quantity: Number(row.stock_quantity ?? 0),
        price_type: row.price_type === "single" ? "single" : "blouse",
        without_blouse_price: row.without_blouse_price !== null ? Number(row.without_blouse_price) : null,
        discount_without_blouse_price: row.discount_without_blouse_price !== null ? Number(row.discount_without_blouse_price) : null,
        with_blouse_price: row.with_blouse_price !== null ? Number(row.with_blouse_price) : null,
        discount_with_blouse_price: row.discount_with_blouse_price !== null ? Number(row.discount_with_blouse_price) : null,
        single_price: row.single_price !== null ? Number(row.single_price) : null,
        single_discount_price: row.single_discount_price !== null ? Number(row.single_discount_price) : null,
        images: imageUrls,
        thumbnail_index: Number(row.thumbnail_index ?? 0),
        is_active: Boolean(row.is_active),
        is_free_delivery: Boolean(row.is_free_delivery),
        categories: categoryData,
      });

      setLoading(false);
    }

    loadProduct();
  }, [params.id]);

  /* =========================
     LOAD RELATED PRODUCTS
  ========================= */
  useEffect(() => {
    async function fetchRelated() {
      if (!dbProduct || !dbProduct.category_id) return;

      const { data, error } = await supabase
        .from("products")
        .select("id, name, images, thumbnail_index, price_type, single_price, single_discount_price, without_blouse_price, discount_without_blouse_price, is_free_delivery")
        .eq("category_id", dbProduct.category_id)
        .neq("id", dbProduct.id) // বর্তমান প্রোডাক্টটি বাদ
        .eq("is_active", true)
        .limit(4);

      if (!error && data) {
        setRelatedProducts(data);
      }
    }
    fetchRelated();
  }, [dbProduct?.category_id, dbProduct?.id]);


  /* =========================
     LOAD REVIEWS
  ========================= */
  useEffect(() => {
    async function loadReviews() {
      setReviewsLoading(true);

      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", params.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Reviews load error:", error);
        setReviewsLoading(false);
        return;
      }

      const normalized = (data ?? []).map((review: any) => ({
        id: review.id,
        product_id: review.product_id,
        reviewer_name: review.reviewer_name ?? "",
        reviewer_contact: review.reviewer_contact ?? "",
        rating: Number(review.rating ?? 5),
        review_text: review.review_text ?? "",
        images: Array.isArray(review.images)
          ? review.images.filter((img: unknown): img is string => typeof img === "string")
          : [],
        created_at: review.created_at ?? "",
      }));

      setReviews(normalized);
      setReviewsLoading(false);
    }

    loadReviews();
  }, [params.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const openReviewsFromHash = () => {
      if (window.location.hash === "#reviews") {
        setActiveInfoTab("reviews");
        window.setTimeout(() => {
          const el = document.querySelector(".information-card");
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 250);
      }
    };

    openReviewsFromHash();
    window.addEventListener("hashchange", openReviewsFromHash);

    return () => {
      window.removeEventListener("hashchange", openReviewsFromHash);
    };
  }, []);
  
  if (loading) {
    return (
      <main className="loading-page">
        <div className="loading-box">
          <div className="loading-icon">👗</div>
          <p>Product loading...</p>
        </div>
        <style jsx>{`
          .loading-page { min-height: 75vh; display: grid; place-items: center; padding: 40px 20px; background: radial-gradient(circle at top left, rgba(255, 230, 239, 0.45), transparent 30%), #ffffff; }
          .loading-box { text-align: center; color: #7d6c74; }
          .loading-icon { margin-bottom: 8px; font-size: 46px; animation: floatIcon 2s ease-in-out infinite; }
          .loading-box p { margin: 0; font-size: 13px; font-weight: 600; }
          @keyframes floatIcon { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        `}</style>
      </main>
    );
  }

  if (!dbProduct) {
    return (
      <main className="not-found">
        <div className="not-found-box">
          <div className="not-found-icon">👗</div>
          <h1>Product পাওয়া যায়নি</h1>
          <p>এই productটি বর্তমানে খুঁজে পাওয়া যাচ্ছে না।</p>
          <Link href="/" className="back-button">Homepage-এ যান</Link>
        </div>
        <style jsx>{`
          .not-found { min-height: 70vh; display: grid; place-items: center; padding: 40px 20px; background: #ffffff; }
          .not-found-box { max-width: 500px; text-align: center; padding: 40px 20px; animation: boxIn 0.45s ease-out; }
          @keyframes boxIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
          .not-found-icon { margin-bottom: 12px; font-size: 56px; }
          .not-found-box h1 { margin: 0 0 8px; color: #241d22; font-size: 28px; }
          .not-found-box p { margin: 0 0 22px; color: #88757d; font-size: 14px; }
          .back-button { display: inline-flex; align-items: center; justify-content: center; min-height: 46px; padding: 0 20px; border-radius: 13px; background: #241d22; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 800; transition: transform 0.25s ease, box-shadow 0.25s ease; box-shadow: 0 8px 18px rgba(36, 29, 34, 0.15); }
          .back-button:hover { transform: translateY(-2px); box-shadow: 0 14px 26px rgba(36, 29, 34, 0.22); }
        `}</style>
      </main>
    );
  }

  const product: ProductData = {
    id: dbProduct.id,
    name: dbProduct.name,
    slug: dbProduct.id,
    description: dbProduct.description ?? "",
    categoryId: dbProduct.category_id ?? "",
    categoryName: dbProduct.categories?.name ?? "",
    categorySlug: dbProduct.categories?.slug ?? "",
    images: dbProduct.images.map((url, index) => ({
      url,
      isThumbnail: index === dbProduct.thumbnail_index,
      alt: `${dbProduct.name} ${index + 1}`,
    })),
    pricing: {
      withoutBlouse: dbProduct.price_type === "single" ? dbProduct.single_price ?? 0 : dbProduct.without_blouse_price ?? 0,
      discountWithoutBlouse: dbProduct.price_type === "single" ? dbProduct.single_discount_price ?? undefined : dbProduct.discount_without_blouse_price ?? undefined,
      withBlouse: dbProduct.price_type === "single" ? dbProduct.single_price ?? 0 : dbProduct.with_blouse_price ?? 0,
      discountWithBlouse: dbProduct.price_type === "single" ? dbProduct.single_discount_price ?? undefined : dbProduct.discount_with_blouse_price ?? undefined,
    },
    stock: dbProduct.stock_quantity,
    isActive: dbProduct.is_active,
    isBestSelling: false,
    isFreeDelivery: dbProduct.is_free_delivery,
  };

  const isSinglePrice = dbProduct.price_type === "single";
  const finalWithoutBlouse = product.pricing.discountWithoutBlouse ?? product.pricing.withoutBlouse;
  const finalWithBlouse = product.pricing.discountWithBlouse ?? product.pricing.withBlouse;

  const currentPrice = isSinglePrice
    ? finalWithoutBlouse
    : blouseOption === "withBlouse"
      ? finalWithBlouse
      : blouseOption === "withoutBlouse"
        ? finalWithoutBlouse
        : null;

  function decreaseQuantity() {
    setQuantity((current) => Math.max(1, current - 1));
  }

  function increaseQuantity() {
    setQuantity((current) => Math.min(product.stock, current + 1));
  }

  function handleAddToCart() {
    const selectedOption: BlouseOption = isSinglePrice ? "withoutBlouse" : blouseOption!;

    if (!isSinglePrice && !blouseOption) {
      setOptionError("Please select Blouse option first.");
      return;
    }

    setOptionError("");
    addToCart(product, selectedOption);

    if (quantity > 1) {
      updateQuantity(product.id, selectedOption, quantity);
    }

    setAdded(true);
    window.setTimeout(() => { setAdded(false); }, 1600);
  }

  function handleBuyNow() {
    const selectedOption: BlouseOption = isSinglePrice ? "withoutBlouse" : blouseOption!;

    if (!isSinglePrice && !blouseOption) {
      setOptionError("Please select Blouse option first.");
      return;
    }

    setOptionError("");
    addToCart(product, selectedOption);

    if (quantity > 1) {
      updateQuantity(product.id, selectedOption, quantity);
    }

    router.push("/checkout");
  }

  async function handleCopyNumber() {
    const numberText = OFFICIAL_WHATSAPP_DISPLAY;

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(numberText);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = numberText;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      window.setTimeout(() => { setCopied(false); }, 1800);
    } catch (error) {
      console.error("Copy number error:", error);
    }
  }

  function handleReviewImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    const remainingSlots = 3 - reviewImages.length;
    if (remainingSlots <= 0) return;

    const selectedFiles = files.slice(0, remainingSlots);
    const newImages = selectedFiles.map((file) => URL.createObjectURL(file));

    setReviewImageFiles((prev) => [...prev, ...selectedFiles]);
    setReviewImages((prev) => [...prev, ...newImages]);
  }

  function removeReviewImage(index: number) {
    setReviewImages((prev) => prev.filter((_, i) => i !== index));
    setReviewImageFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmitReview() {
    const name = reviewName.trim();
    const contact = reviewContact.trim();
    const text = reviewText.trim();

    if (!name) { setReviewError("আপনার নাম লিখুন।"); return; }
    if (!contact) { setReviewError("ফোন অথবা ইমেইল দিন।"); return; }
    if (!text) { setReviewError("রিভিউ লিখুন।"); return; }

    setReviewError("");
    setReviewSubmitting(true);

    try {
      const uploadedUrls: string[] = [];
      for (const file of reviewImageFiles) {
        const url = await uploadToCloudinary(file);
        uploadedUrls.push(url);
      }

      const { data, error } = await supabase
        .from("reviews")
        .insert({
          product_id: product.id,
          reviewer_name: name,
          reviewer_contact: contact,
          rating: reviewRating,
          review_text: text,
          images: uploadedUrls,
        })
        .select()
        .single();

      if (error) {
        console.error("Review insert error:", error);
        setReviewError("রিভিউ সাবমিট করা যায়নি। আবার চেষ্টা করুন।");
        setReviewSubmitting(false);
        return;
      }

      const newReview: Review = {
        id: data.id,
        product_id: data.product_id,
        reviewer_name: data.reviewer_name ?? "",
        reviewer_contact: data.reviewer_contact ?? "",
        rating: Number(data.rating ?? 5),
        review_text: data.review_text ?? "",
        images: Array.isArray(data.images) ? data.images : [],
        created_at: data.created_at ?? "",
      };

      setReviews((prev) => [newReview, ...prev]);
      setReviewName("");
      setReviewContact("");
      setReviewRating(5);
      setReviewText("");
      setReviewImages([]);
      setReviewImageFiles([]);
      setReviewSuccess(true);

      window.setTimeout(() => { setReviewSuccess(false); }, 2500);
    } catch (error) {
      console.error("Review submit error:", error);
      setReviewError("কিছু সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setReviewSubmitting(false);
    }
  }

  const hasWithoutBlouseDiscount = product.pricing.discountWithoutBlouse !== undefined;
  const hasWithBlouseDiscount = product.pricing.discountWithBlouse !== undefined;
  const whatsappUrl = `https://wa.me/${OFFICIAL_WHATSAPP_NUMBER}`;
  const averageRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : "0.0";

  return (
    <main className="page">
      <div className="container">
        {/* BREADCRUMB */}
        <nav className="breadcrumb">
          <Link href="/">Home</Link>
          <span className="crumb-sep">›</span>
          {product.categorySlug ? (
            <Link href={`/category/${product.categorySlug}`}>{product.categoryName}</Link>
          ) : (
            <span>{product.categoryName}</span>
          )}
          <span className="crumb-sep">›</span>
          <span className="crumb-current">{product.name}</span>
        </nav>

        {/* MAIN PRODUCT CARD */}
        <section className="product-card">
          <div className="gallery-column">
            <ProductGallery productName={product.name} images={product.images.map((image) => image.url)} />
          </div>
          <section className="details">
            <div className="meta-line">
              <span className="meta-pill">{product.categoryName}</span>
              {product.stock > 0 ? (
                <span className="meta-pill success">✓ In Stock</span>
              ) : (
                <span className="meta-pill danger">Out of Stock</span>
              )}
              {product.isFreeDelivery && (
                <span className="meta-pill free-delivery-pill">🚚 Free Delivery</span>
              )}
            </div>

            <h1>{product.name}</h1>

            <div className="top-price">
              {isSinglePrice ? (
                <div className="single-price">
                  <strong>৳ {finalWithoutBlouse.toLocaleString("bn-BD")}</strong>
                  {hasWithoutBlouseDiscount && (
                    <span className="old-price">৳ {product.pricing.withoutBlouse.toLocaleString("bn-BD")}</span>
                  )}
                </div>
              ) : (
                <div className="dual-price">
                  <strong>৳ {finalWithoutBlouse.toLocaleString("bn-BD")}</strong>
                  <span className="dual-sep">—</span>
                  <strong>৳ {finalWithBlouse.toLocaleString("bn-BD")}</strong>
                </div>
              )}
            </div>

            {!isSinglePrice && (
              <div className="option-section">
                <h2 className="section-title">শাড়ির অপশন</h2>
                <div className="option-grid">
                  <button
                    type="button"
                    className={blouseOption === "withoutBlouse" ? "option selected" : "option"}
                    onClick={() => { setBlouseOption("withoutBlouse"); setOptionError(""); }}
                  >
                    <span className="option-label">Blouse ছাড়া</span>
                    <strong className="option-price">৳ {finalWithoutBlouse.toLocaleString("bn-BD")}</strong>
                    {hasWithoutBlouseDiscount && (
                      <span className="option-old-price">৳ {product.pricing.withoutBlouse.toLocaleString("bn-BD")}</span>
                    )}
                    <span className="option-check">✓</span>
                  </button>

                  <button
                    type="button"
                    className={blouseOption === "withBlouse" ? "option selected" : "option"}
                    onClick={() => { setBlouseOption("withBlouse"); setOptionError(""); }}
                  >
                    <span className="option-label">Blouseসহ</span>
                    <strong className="option-price">৳ {finalWithBlouse.toLocaleString("bn-BD")}</strong>
                    {hasWithBlouseDiscount && (
                      <span className="option-old-price">৳ {product.pricing.withBlouse.toLocaleString("bn-BD")}</span>
                    )}
                    <span className="option-check">✓</span>
                  </button>
                </div>
              </div>
            )}

            {!isSinglePrice && blouseOption && (
              <div className="selected-price">
                <div className="selected-info">
                  <span className="selected-label">{blouseOption === "withBlouse" ? "Blouseসহ" : "Blouse ছাড়া"}</span>
                  <strong className="selected-current-price">৳ {currentPrice?.toLocaleString("bn-BD")}</strong>
                </div>
                {blouseOption === "withBlouse" && hasWithBlouseDiscount && (
                  <span className="selected-old-price">৳ {product.pricing.withBlouse.toLocaleString("bn-BD")}</span>
                )}
                {blouseOption === "withoutBlouse" && hasWithoutBlouseDiscount && (
                  <span className="selected-old-price">৳ {product.pricing.withoutBlouse.toLocaleString("bn-BD")}</span>
                )}
              </div>
            )}

            {optionError && <p className="option-error">⚠️ {optionError}</p>}

            <div className="quantity-section">
              <h2 className="section-title">Quantity</h2>
              <div className="quantity-box">
                <button type="button" onClick={decreaseQuantity} disabled={quantity <= 1} aria-label="Decrease quantity">−</button>
                <span>{quantity}</span>
                <button type="button" onClick={increaseQuantity} disabled={quantity >= product.stock} aria-label="Increase quantity">+</button>
              </div>
            </div>

            <div className="actions">
              <button
                type="button"
                className={added ? "add-button added" : "add-button"}
                disabled={!product.stock || (!isSinglePrice && !blouseOption)}
                onClick={handleAddToCart}
              >
                {added ? "✓ কার্টে যোগ হয়েছে" : "কার্টে যোগ করুন"}
              </button>
              <button
                type="button"
                className="buy-button"
                disabled={!product.stock || (!isSinglePrice && !blouseOption)}
                onClick={handleBuyNow}
              >
                এখনই কিনুন →
              </button>
            </div>
          </section>
        </section>

        {/* INFORMATION CARD */}
        <section className="information-card">
          <div className="info-tabs">
            <button type="button" className={activeInfoTab === "description" ? "info-tab active" : "info-tab"} onClick={() => setActiveInfoTab("description")}>DESCRIPTION</button>
            <button type="button" className={activeInfoTab === "additional" ? "info-tab active" : "info-tab"} onClick={() => setActiveInfoTab("additional")}>ADDITIONAL INFORMATION</button>
            <button type="button" className={activeInfoTab === "reviews" ? "info-tab active" : "info-tab"} onClick={() => setActiveInfoTab("reviews")}>REVIEWS ({reviews.length})</button>
          </div>

          {activeInfoTab === "description" && (
            <div className="description-content">
              <h2>পণ্যের বিস্তারিত</h2>
              {product.description ? <p>{product.description}</p> : <p>এই পণ্যের বিস্তারিত তথ্য খুব শীঘ্রই এখানে যোগ করা হবে।</p>}
            </div>
          )}

          {activeInfoTab === "additional" && (
            <div className="additional-content">
              <div className="warning-card">
                <div className="warning-icon">⚠️</div>
                <div className="warning-body">
                  <h3>গুরুত্বপূর্ণ সতর্কবার্তা</h3>
                  <p>আমাদের অফিসিয়াল নম্বর ছাড়া <strong>অন্য কোনো নম্বরে আমাদের নাম বলে টাকা চাইলে</strong> কখনোই দিবেন না। আমরা কখনোই কাউকে আমাদের নাম ব্যবহার করে টাকা চাইতে বলি না।</p>
                </div>
              </div>
              <div className="policy-card">
                <h3>🛡️ আমাদের পলিসি</h3>
                <ul className="policy-list">
                  <li><span className="policy-bullet">✔</span><span>আমরা কখনোই <strong>অগ্রিম টাকা নিই না</strong>। পণ্য হাতে পেয়ে দেখে নিশ্চিত হওয়ার পরেই পেমেন্ট করুন।</span></li>
                  <li><span className="policy-bullet">✔</span><span>কোনো কারণে অর্ডার <strong>বাতিল / ক্যান্সেল</strong> করতে হলে অবশ্যই আমাদের অফিসিয়াল নম্বরে যোগাযোগ করবেন।</span></li>
                  <li><span className="policy-bullet">✔</span><span>প্রতিটি শাড়ি <strong>প্রিমিয়াম মানের</strong> — আমরা সবসময় কোয়ালিটি মেইনটেইন করি।</span></li>
                  <li><span className="policy-bullet">✔</span><span>আমরা <strong>বিশ্বাসের সাথে</strong> ব্যবসা করি — আপনিও বিশ্বাস রাখুন, এটাই আমাদের আসল লক্ষ্য।</span></li>
                </ul>
              </div>
              <div className="number-card">
                <div className="number-icon">📞</div>
                <div className="number-body">
                  <span className="number-label">আমাদের অফিসিয়াল WhatsApp নম্বর</span>
                  <div className="number-row">
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="number-value" aria-label="WhatsApp এ যোগাযোগ করুন">
                      <span className="whatsapp-icon">🟢</span>
                      {OFFICIAL_WHATSAPP_DISPLAY}
                    </a>
                    <button type="button" className={copied ? "copy-button copied" : "copy-button"} onClick={handleCopyNumber} aria-label="নম্বর কপি করুন">
                      {copied ? (<><span className="copy-icon">✓</span>Copied!</>) : (<><span className="copy-icon">⧉</span>Copy</>)}
                    </button>
                  </div>
                  <span className="number-note">নম্বরে click করলে সরাসরি WhatsApp এ চলে যাবেন। যেকোনো প্রয়োজনে — অর্ডার, বাতিল, বা সমস্যার জন্য — শুধু এই নম্বরেই যোগাযোগ করবেন।</span>
                </div>
              </div>
            </div>
          )}

          {activeInfoTab === "reviews" && (
            <div className="reviews-content">
              <div className="reviews-summary">
                <div className="summary-left">
                  <strong className="summary-score">{averageRating}</strong>
                  <div className="summary-stars">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className={star <= Math.round(Number(averageRating)) ? "summary-star filled" : "summary-star"}>★</span>
                    ))}
                  </div>
                  <span className="summary-count">{reviews.length}টি রিভিউ</span>
                </div>
              </div>

              <div className="review-form-card">
                <h3 className="review-form-title">আপনার রিভিউ লিখুন</h3>
                <div className="review-form-grid">
                  <div className="review-field">
                    <label>আপনার নাম *</label>
                    <input type="text" placeholder="নাম লিখুন" value={reviewName} onChange={(e) => setReviewName(e.target.value)} />
                  </div>
                  <div className="review-field">
                    <label>ফোন / ইমেইল *</label>
                    <input type="text" placeholder="ফোন নম্বর বা ইমেইল" value={reviewContact} onChange={(e) => setReviewContact(e.target.value)} />
                  </div>
                </div>

                <div className="review-field">
                  <label>রেটিং</label>
                  <div className="star-picker">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} type="button" className={star <= reviewRating ? "star-button filled" : "star-button"} onClick={() => setReviewRating(star)} aria-label={`${star} star`}>★</button>
                    ))}
                    <span className="star-label">{reviewRating} / 5</span>
                  </div>
                </div>

                <div className="review-field">
                  <label>রিভিউ *</label>
                  <textarea placeholder="পণ্য সম্পর্কে আপনার মতামত লিখুন..." rows={4} value={reviewText} onChange={(e) => setReviewText(e.target.value)} />
                </div>

                <div className="review-field">
                  <label>ছবি যোগ করুন (সর্বোচ্চ ৩টি)</label>
                  <div className="review-image-row">
                    {reviewImages.map((img, index) => (
                      <div key={img} className="review-image-thumb">
                        <img src={img} alt={`Review ${index + 1}`} />
                        <button type="button" className="review-image-remove" onClick={() => removeReviewImage(index)} aria-label="Remove image">×</button>
                      </div>
                    ))}
                    {reviewImages.length < 3 && (
                      <label className="review-image-add">
                        <span>＋</span>
                        <span className="add-text">ছবি যোগ করুন</span>
                        <input type="file" accept="image/*" multiple hidden onChange={handleReviewImageChange} />
                      </label>
                    )}
                  </div>
                </div>

                {reviewError && <p className="review-error">⚠️ {reviewError}</p>}
                {reviewSuccess && <p className="review-success">✓ আপনার রিভিউ সফলভাবে যোগ হয়েছে!</p>}

                <button type="button" className="review-submit" disabled={reviewSubmitting} onClick={handleSubmitReview}>
                  {reviewSubmitting ? (<><span className="review-spinner" />সাবমিট হচ্ছে...</>) : (<>রিভিউ সাবমিট করুন</>)}
                </button>
              </div>

              <div className="review-list-wrap">
                <h3 className="review-list-title">সব রিভিউ ({reviews.length})</h3>
                {reviewsLoading ? (
                  <div className="review-list-loading">
                    <div className="review-list-spinner" />
                    <span>রিভিউ লোড হচ্ছে...</span>
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="review-empty">
                    <div className="review-empty-icon">💬</div>
                    <h4>এখনো কোনো রিভিউ নেই</h4>
                    <p>প্রথম রিভিউটি আপনিই দিন!</p>
                  </div>
                ) : (
                  <div className="review-list">
                    {reviews.map((review) => (
                      <div key={review.id} className="review-item">
                        <div className="review-head">
                          <div className="review-avatar">{review.reviewer_name.charAt(0).toUpperCase() || "?"}</div>
                          <div className="review-head-info">
                            <strong>{review.reviewer_name}</strong>
                            <div className="review-stars">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span key={star} className={star <= review.rating ? "review-star filled" : "review-star"}>★</span>
                              ))}
                            </div>
                          </div>
                          <span className="review-date">
                            {review.created_at ? new Date(review.created_at).toLocaleDateString("bn-BD", { day: "numeric", month: "short", year: "numeric" }) : ""}
                          </span>
                        </div>
                        <p className="review-body">{review.review_text}</p>
                        {review.images.length > 0 && (
                          <div className="review-images">
                            {review.images.map((img, idx) => (
                              <button key={`${review.id}-${idx}`} type="button" className="review-image-btn" onClick={() => setLightboxImage(img)}>
                                <img src={img} alt={`Review image ${idx + 1}`} />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ============================================
            ✨ RELATED PRODUCTS SECTION
        ============================================ */}
        {relatedProducts.length > 0 && (
          <section className="related-section">
            <div className="related-header">
              <h2 className="related-title">✨ সম্পর্কিত পণ্য (Related Products)</h2>
              <div className="related-line"></div>
            </div>
            
            <div className="related-grid">
              {relatedProducts.map((rp) => {
                const img = rp.images?.[rp.thumbnail_index ?? 0] || rp.images?.[0];
                let price = 0;
                if (rp.price_type === "single") {
                  price = rp.single_discount_price ?? rp.single_price ?? 0;
                } else {
                  price = rp.discount_without_blouse_price ?? rp.without_blouse_price ?? 0;
                }

                return (
                  <Link href={`/products/${rp.id}`} key={rp.id} className="related-card">
                    <div className="related-img-box">
                      {img ? <img src={img} alt={rp.name} /> : <div className="no-img">👗</div>}
                      {rp.is_free_delivery && <span className="related-free-badge">Free Delivery</span>}
                    </div>
                    <div className="related-info">
                      <h3>{rp.name}</h3>
                      <p>৳ {Number(price).toLocaleString("bn-BD")}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

      </div>

      {/* LIGHTBOX */}
      {lightboxImage && (
        <div className="lightbox" onClick={() => setLightboxImage(null)}>
          <button type="button" className="lightbox-close" onClick={() => setLightboxImage(null)} aria-label="Close">×</button>
          <img src={lightboxImage} alt="Review" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <style jsx>{`
        .page {
          min-height: 75vh;
          padding: 28px 0 70px;
          background: #ffffff;
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        .container {
          width: min(1120px, calc(100% - 28px));
          margin: 0 auto;
          animation: pageIn 0.45s ease-out;
        }

        @keyframes pageIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* BREADCRUMB */
        .breadcrumb { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; margin-bottom: 16px; color: #8b7881; font-size: 12px; }
        .breadcrumb a { color: #70415a; text-decoration: none; font-weight: 600; transition: color 0.2s ease; }
        .breadcrumb a:hover { color: #a04a72; text-decoration: underline; }
        .crumb-sep { color: #c4b4bd; }
        .crumb-current { color: #6a5a63; font-weight: 600; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        /* PRODUCT CARD */
        .product-card { display: grid; grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr); gap: 36px; padding: 24px; border: 1px solid #eadde3; border-radius: 20px; background: #ffffff; box-shadow: 0 16px 44px rgba(83, 53, 66, 0.06); }
        .gallery-column { min-width: 0; }
        .details { padding: 8px 2px 8px; display: flex; flex-direction: column; }
        .meta-line { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; margin-bottom: 12px; }
        .meta-pill { display: inline-flex; align-items: center; padding: 5px 11px; border-radius: 20px; background: #f6ecf1; color: #7a3f5d; font-size: 10px; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase; }
        .meta-pill.success { background: #e7f6ed; color: #2f7a4d; }
        .meta-pill.danger { background: #fbe9ed; color: #a94f6f; }
        .meta-pill.free-delivery-pill { background: linear-gradient(135deg, #d5efe0, #c1e8d1); color: #1f6b42; border: 1px solid #b7dfc8; animation: freePillPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
        @keyframes freePillPop { from { opacity: 0; transform: scale(0.7); } to { opacity: 1; transform: scale(1); } }

        .details h1 { margin: 0; color: #30262b; font-size: clamp(26px, 4vw, 36px); line-height: 1.18; font-weight: 800; letter-spacing: -0.6px; }
        .top-price { margin-top: 14px; }
        .single-price { display: flex; align-items: baseline; flex-wrap: wrap; gap: 12px; }
        .single-price strong { color: #8e4768; font-size: 28px; font-weight: 900; letter-spacing: -0.5px; }
        .old-price { color: #a08e95; font-size: 15px; text-decoration: line-through; font-weight: 600; }
        .dual-price { display: flex; align-items: baseline; flex-wrap: wrap; gap: 18px; }
        .dual-price strong { color: #8e4768; font-size: 26px; font-weight: 900; letter-spacing: -0.5px; }
        .dual-sep { color: #c4b4bd; font-size: 20px; font-weight: 700; line-height: 1; margin: 0 4px; transform: translateY(-2px); }

        .section-title { margin: 0 0 10px; color: #3d3238; font-size: 13px; font-weight: 800; letter-spacing: 0.2px; }
        .option-section { margin-top: 24px; }
        .option-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .option { position: relative; min-height: 74px; padding: 12px 14px; border: 1.5px solid #e2d5dc; border-radius: 13px; background: #ffffff; color: #44383e; cursor: pointer; text-align: left; display: flex; flex-direction: column; gap: 3px; overflow: hidden; transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease; }
        .option:hover { transform: translateY(-2px); border-color: #c9a7b7; box-shadow: 0 10px 22px rgba(160, 74, 114, 0.08); }
        .option-label { color: #7e7077; font-size: 10px; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; }
        .option-price { color: #30262b; font-size: 16px; font-weight: 900; }
        .option-old-price { color: #a08e95; font-size: 10px; font-weight: 600; text-decoration: line-through; }
        .option-check { position: absolute; top: 10px; right: 10px; width: 20px; height: 20px; border-radius: 50%; background: #a04a72; color: white; font-size: 11px; font-weight: 900; display: flex; align-items: center; justify-content: center; opacity: 0; transform: scale(0.5); transition: opacity 0.25s ease, transform 0.35s cubic-bezier(0.34,1.56,0.64,1); }
        .option.selected { border-color: #a04a72; background: linear-gradient(135deg, #faeef4, #f7e4ed); box-shadow: 0 10px 22px rgba(160, 74, 114, 0.14); }
        .option.selected .option-check { opacity: 1; transform: scale(1); }

        .selected-price { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 14px; padding: 12px 14px; border-radius: 12px; background: linear-gradient(135deg, #faf4f7, #f5e9f0); border: 1px solid #eedbe4; animation: stripIn 0.3s ease-out; }
        @keyframes stripIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .selected-info { display: flex; align-items: baseline; gap: 10px; }
        .selected-label { color: #806d75; font-size: 11px; font-weight: 700; }
        .selected-current-price { color: #8e4768; font-size: 18px; font-weight: 900; }
        .selected-old-price { color: #a08e95; font-size: 12px; font-weight: 600; text-decoration: line-through; }

        .option-error { margin: 10px 0 0; padding: 9px 12px; border-radius: 10px; background: #fbe9ed; color: #a53d5c; font-size: 11px; font-weight: 700; animation: shake 0.4s ease; }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }

        .quantity-section { margin-top: 22px; }
        .quantity-box { display: flex; align-items: center; width: fit-content; overflow: hidden; border: 1.5px solid #e2d5dc; border-radius: 12px; background: #ffffff; }
        .quantity-box button { width: 42px; height: 40px; border: 0; background: #f9f2f6; color: #41343a; cursor: pointer; font-size: 19px; font-weight: 700; transition: background 0.2s ease, color 0.2s ease; }
        .quantity-box button:hover:not(:disabled) { background: #f1e3eb; color: #a04a72; }
        .quantity-box button:disabled { opacity: 0.35; cursor: not-allowed; }
        .quantity-box span { min-width: 48px; text-align: center; color: #30262b; font-size: 14px; font-weight: 900; }

        .actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 22px; }
        .add-button, .buy-button { min-height: 50px; border: 0; border-radius: 12px; cursor: pointer; font-size: 13px; font-weight: 900; letter-spacing: 0.2px; transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease, background 0.25s ease; }
        .add-button { background: linear-gradient(135deg, #f4e7ee, #eddcE6); color: #63364e; border: 1px solid #ecd4e0; }
        .add-button:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 12px 24px rgba(160, 74, 114, 0.15); }
        .add-button.added { background: linear-gradient(135deg, #d5efe0, #c1e8d1); color: #1f6a42; border-color: #b7dfc8; }
        .buy-button { background: linear-gradient(135deg, #2b2227, #1a1318); color: #ffffff; box-shadow: 0 8px 20px rgba(36, 29, 34, 0.18); }
        .buy-button:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 14px 28px rgba(36, 29, 34, 0.26); }
        .add-button:disabled, .buy-button:disabled { background: #eeeeee; color: #999999; cursor: not-allowed; transform: none; box-shadow: none; border-color: #eeeeee; }

        /* INFORMATION CARD */
        .information-card { margin-top: 28px; padding: 22px 22px 26px; border: 1px solid #eadde3; border-radius: 20px; background: #ffffff; box-shadow: 0 10px 30px rgba(83, 53, 66, 0.045); }
        .info-tabs { display: flex; align-items: center; gap: 28px; overflow-x: auto; border-bottom: 1px solid #eadde3; scrollbar-width: none; }
        .info-tabs::-webkit-scrollbar { display: none; }
        .info-tab { padding: 0 0 12px; white-space: nowrap; color: #74666d; font-size: 10px; font-weight: 800; letter-spacing: 0.7px; cursor: pointer; transition: color 0.2s ease, border-color 0.2s ease; background: transparent; border: 0; border-bottom: 2px solid transparent; font-family: inherit; }
        .info-tab:hover { color: #a04a72; }
        .info-tab.active { color: #70415a; border-bottom-color: #a04a72; }

        .description-content { padding: 22px 4px 0; animation: tabFade 0.35s ease-out; }
        @keyframes tabFade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .description-content h2 { margin: 0 0 10px; color: #3d3238; font-size: 16px; font-weight: 800; }
        .description-content p { margin: 0; color: #766970; font-size: 13px; line-height: 1.9; white-space: pre-wrap; word-break: break-word; }

        /* ADDITIONAL INFORMATION */
        .additional-content { padding: 22px 2px 0; display: grid; gap: 16px; animation: tabFade 0.35s ease-out; }
        .warning-card { display: flex; align-items: flex-start; gap: 14px; padding: 18px; border-radius: 16px; background: linear-gradient(135deg, #fff5e6, #ffefd6); border: 1px solid #ffdca0; box-shadow: 0 8px 22px rgba(220, 140, 30, 0.08); }
        .warning-icon { width: 44px; height: 44px; flex: 0 0 44px; display: grid; place-items: center; border-radius: 12px; background: #fff; font-size: 22px; box-shadow: 0 4px 12px rgba(220, 140, 30, 0.18); animation: warningPulse 2.2s ease-in-out infinite; }
        @keyframes warningPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
        .warning-body h3 { margin: 0 0 6px; color: #8a4d00; font-size: 15px; font-weight: 900; }
        .warning-body p { margin: 0; color: #7a5a2e; font-size: 12.5px; line-height: 1.75; }
        .warning-body strong { color: #c26b00; font-weight: 900; }

        .policy-card { padding: 18px 20px; border-radius: 16px; background: linear-gradient(135deg, #f3fbf5, #e8f7ee); border: 1px solid #c3e6d1; }
        .policy-card h3 { margin: 0 0 12px; color: #1f6b42; font-size: 15px; font-weight: 900; }
        .policy-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
        .policy-list li { display: flex; align-items: flex-start; gap: 10px; color: #2c4a3a; font-size: 12.5px; line-height: 1.7; }
        .policy-list strong { color: #1f6b42; font-weight: 900; }
        .policy-bullet { width: 20px; height: 20px; flex: 0 0 20px; margin-top: 2px; display: grid; place-items: center; border-radius: 50%; background: #3fa66a; color: #fff; font-size: 11px; font-weight: 900; }

        .number-card { display: flex; align-items: center; gap: 16px; padding: 18px 20px; border-radius: 16px; background: linear-gradient(135deg, #fdf2f8, #f7e6ef); border: 1px solid #edc9dc; box-shadow: 0 8px 22px rgba(160, 74, 114, 0.08); }
        .number-icon { width: 52px; height: 52px; flex: 0 0 52px; display: grid; place-items: center; border-radius: 14px; background: linear-gradient(135deg, #25D366, #128C7E); color: #fff; font-size: 22px; box-shadow: 0 8px 18px rgba(37, 211, 102, 0.32); }
        .number-body { display: flex; flex-direction: column; gap: 8px; min-width: 0; flex: 1; }
        .number-label { color: #8a5d75; font-size: 10px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; }
        .number-row { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
        .number-value { display: inline-flex; align-items: center; gap: 6px; color: #4d1f36; font-size: 20px; font-weight: 900; letter-spacing: 0.4px; text-decoration: none; transition: color 0.2s ease, transform 0.2s ease; }
        .number-value:hover { color: #128C7E; transform: translateY(-1px); }
        .whatsapp-icon { font-size: 14px; }
        .copy-button { display: inline-flex; align-items: center; gap: 5px; padding: 7px 13px; border: 1px solid #edc9dc; border-radius: 20px; background: #ffffff; color: #a04a72; font-size: 11px; font-weight: 800; cursor: pointer; font-family: inherit; letter-spacing: 0.2px; transition: background 0.25s ease, border-color 0.25s ease, color 0.25s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease; }
        .copy-button:hover { background: #fdf2f8; border-color: #d9a5c1; transform: translateY(-2px); box-shadow: 0 8px 18px rgba(160, 74, 114, 0.14); }
        .copy-button.copied { background: linear-gradient(135deg, #d5efe0, #c1e8d1); border-color: #b7dfc8; color: #1f6a42; }
        .copy-icon { font-size: 12px; font-weight: 900; }
        .number-note { color: #7a566a; font-size: 11.5px; line-height: 1.6; }

        /* REVIEWS TAB */
        .reviews-content { padding: 22px 2px 0; animation: tabFade 0.35s ease-out; }
        .reviews-summary { display: flex; align-items: center; gap: 18px; padding: 18px 20px; margin-bottom: 20px; border-radius: 16px; background: linear-gradient(135deg, #fdf2f8, #f7e6ef); border: 1px solid #edc9dc; }
        .summary-left { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        .summary-score { color: #8e4768; font-size: 34px; font-weight: 900; letter-spacing: -0.5px; line-height: 1; }
        .summary-stars { display: flex; gap: 3px; }
        .summary-star { color: #ddd0d7; font-size: 20px; line-height: 1; }
        .summary-star.filled { color: #f5a623; }
        .summary-count { color: #8a5d75; font-size: 12px; font-weight: 700; }

        .review-form-card { padding: 20px; border-radius: 16px; background: #fdfafb; border: 1px solid #eadde3; margin-bottom: 24px; }
        .review-form-title { margin: 0 0 16px; color: #3d3238; font-size: 15px; font-weight: 900; }
        .review-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .review-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; min-width: 0; }
        .review-field label { color: #4c3d44; font-size: 11px; font-weight: 800; letter-spacing: 0.2px; }
        .review-field input, .review-field textarea { width: 100%; border: 1px solid #e6dce1; border-radius: 11px; padding: 0 12px; outline: none; background: #ffffff; color: #241d22; font-size: 12.5px; font-family: inherit; transition: border-color 0.2s ease, box-shadow 0.2s ease; }
        .review-field input { height: 42px; }
        .review-field textarea { padding: 11px 12px; min-height: 90px; resize: vertical; line-height: 1.6; }
        .review-field input:focus, .review-field textarea:focus { border-color: #c6819e; box-shadow: 0 0 0 3px rgba(198, 129, 158, 0.12); }
        .review-field input::placeholder, .review-field textarea::placeholder { color: #b9adb4; }

        .star-picker { display: flex; align-items: center; gap: 4px; }
        .star-button { width: 32px; height: 32px; border: 0; padding: 0; background: transparent; color: #ddd0d7; font-size: 26px; line-height: 1; cursor: pointer; transition: transform 0.15s ease, color 0.15s ease; }
        .star-button:hover { transform: scale(1.15); }
        .star-button.filled { color: #f5a623; }
        .star-label { margin-left: 8px; color: #8a5d75; font-size: 11px; font-weight: 800; }

        .review-image-row { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
        .review-image-thumb { position: relative; width: 70px; height: 70px; border-radius: 10px; overflow: hidden; border: 1px solid #e6dce1; background: #f4eef1; }
        .review-image-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .review-image-remove { position: absolute; top: 3px; right: 3px; width: 20px; height: 20px; border: 0; border-radius: 50%; background: rgba(255, 255, 255, 0.95); color: #b14f79; font-size: 15px; font-weight: 900; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15); }
        .review-image-add { width: 70px; height: 70px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; border: 1.5px dashed #d9b8c8; border-radius: 10px; background: #fff; color: #a04a72; cursor: pointer; text-align: center; transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease; }
        .review-image-add:hover { border-color: #a04a72; background: #fdf2f8; transform: translateY(-2px); }
        .review-image-add > span:first-child { font-size: 22px; font-weight: 700; line-height: 1; }
        .add-text { font-size: 9px; font-weight: 800; letter-spacing: 0.3px; }

        .review-error { margin: 0 0 12px; padding: 9px 12px; border-radius: 10px; background: #fbe9ed; color: #a53d5c; font-size: 11.5px; font-weight: 700; }
        .review-success { margin: 0 0 12px; padding: 9px 12px; border-radius: 10px; background: #e7f6ed; color: #1f6b42; font-size: 11.5px; font-weight: 800; animation: successPop 0.4s ease-out; }
        @keyframes successPop { 0% { opacity: 0; transform: translateY(-4px); } 100% { opacity: 1; transform: translateY(0); } }

        .review-submit { min-height: 46px; padding: 0 22px; border: 0; border-radius: 12px; background: linear-gradient(135deg, #a04a72, #7d3355); color: #fff; font-size: 12.5px; font-weight: 900; letter-spacing: 0.2px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease; }
        .review-submit:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 14px 26px rgba(160, 74, 114, 0.32); }
        .review-submit:disabled { opacity: 0.65; cursor: wait; transform: none; }
        .review-spinner { width: 13px; height: 13px; border: 2px solid rgba(255, 255, 255, 0.35); border-top-color: #fff; border-radius: 50%; animation: reviewSpin 0.7s linear infinite; }
        @keyframes reviewSpin { to { transform: rotate(360deg); } }

        .review-list-wrap { margin-top: 8px; }
        .review-list-title { margin: 0 0 14px; color: #3d3238; font-size: 14px; font-weight: 900; }
        .review-list-loading { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 30px; color: #8a7380; font-size: 12px; font-weight: 600; }
        .review-list-spinner { width: 20px; height: 20px; border: 3px solid #f1dce5; border-top-color: #a04a72; border-radius: 50%; animation: reviewSpin 0.8s linear infinite; }
        .review-empty { text-align: center; padding: 36px 20px; border: 1px dashed #e6dce1; border-radius: 14px; background: #fdfbfc; }
        .review-empty-icon { font-size: 36px; margin-bottom: 10px; }
        .review-empty h4 { margin: 0 0 4px; color: #3d3238; font-size: 14px; font-weight: 900; }
        .review-empty p { margin: 0; color: #8a7380; font-size: 12px; }
        .review-list { display: grid; gap: 14px; }
        .review-item { padding: 16px 18px; border: 1px solid #eadde3; border-radius: 14px; background: #fff; box-shadow: 0 6px 16px rgba(83, 53, 66, 0.035); transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease; animation: reviewItemIn 0.4s ease-out; }
        @keyframes reviewItemIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .review-item:hover { transform: translateY(-2px); box-shadow: 0 12px 26px rgba(83, 53, 66, 0.08); }
        .review-head { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
        .review-avatar { width: 42px; height: 42px; flex: 0 0 42px; border-radius: 50%; display: grid; place-items: center; background: linear-gradient(135deg, #d66f99, #a94f76); color: #fff; font-size: 16px; font-weight: 900; box-shadow: 0 6px 14px rgba(169, 79, 118, 0.24); }
        .review-head-info { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
        .review-head-info strong { color: #30262b; font-size: 13.5px; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 220px; }
        .review-stars { display: flex; gap: 2px; }
        .review-star { color: #ddd0d7; font-size: 13px; line-height: 1; }
        .review-star.filled { color: #f5a623; }
        .review-date { margin-left: auto; color: #9b8d95; font-size: 11px; font-weight: 600; }
        .review-body { margin: 0; color: #4d3e45; font-size: 12.5px; line-height: 1.75; white-space: pre-wrap; word-break: break-word; }
        .review-images { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
        .review-image-btn { width: 72px; height: 72px; padding: 0; border: 1px solid #eadde3; border-radius: 10px; overflow: hidden; background: #f4eef1; cursor: pointer; transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease; }
        .review-image-btn:hover { transform: translateY(-2px) scale(1.03); box-shadow: 0 10px 20px rgba(83, 53, 66, 0.14); }
        .review-image-btn img { width: 100%; height: 100%; object-fit: cover; display: block; }

        /* ============================================
           ✨ RELATED PRODUCTS STYLES
        ============================================ */
        .related-section {
          margin-top: 40px;
          padding-top: 30px;
          border-top: 1px solid #eadde3;
        }

        .related-header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 24px;
        }

        .related-title {
          margin: 0;
          font-size: 20px;
          font-weight: 900;
          color: #2b1f26;
          white-space: nowrap;
        }

        .related-line {
          flex: 1;
          height: 1px;
          background: #eadde3;
        }

        .related-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .related-card {
          display: flex;
          flex-direction: column;
          text-decoration: none;
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid #eadde3;
          transition: all 0.3s ease;
        }

        .related-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 28px rgba(125, 51, 85, 0.12);
          border-color: #7d3355;
        }

        .related-img-box {
          position: relative;
          width: 100%;
          aspect-ratio: 1;
          background: #fdfafb;
          overflow: hidden;
        }

        .related-img-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }

        .related-card:hover .related-img-box img {
          transform: scale(1.08);
        }

        .no-img {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          font-size: 40px;
          color: #d9b8c8;
        }

        .related-free-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          background: #1f6b42;
          color: #fff;
          font-size: 9px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 6px;
          box-shadow: 0 4px 10px rgba(31, 107, 66, 0.3);
        }

        .related-info {
          padding: 15px;
          text-align: center;
        }

        .related-info h3 {
          margin: 0 0 8px;
          font-size: 14px;
          font-weight: 800;
          color: #392f35;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .related-info p {
          margin: 0;
          font-size: 16px;
          font-weight: 900;
          color: #7d3355;
        }

        .lightbox { position: fixed; inset: 0; z-index: 9999; background: rgba(20, 12, 18, 0.88); display: flex; align-items: center; justify-content: center; padding: 30px; cursor: zoom-out; animation: lightboxIn 0.25s ease-out; }
        @keyframes lightboxIn { from { opacity: 0; } to { opacity: 1; } }
        .lightbox img { max-width: 92vw; max-height: 88vh; border-radius: 14px; box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6); animation: lightboxPop 0.35s cubic-bezier(0.34,1.56,0.64,1); }
        @keyframes lightboxPop { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .lightbox-close { position: absolute; top: 20px; right: 24px; width: 42px; height: 42px; border: 0; border-radius: 50%; background: rgba(255, 255, 255, 0.15); color: #fff; font-size: 26px; font-weight: 300; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1; transition: background 0.2s ease; }
        .lightbox-close:hover { background: rgba(255, 255, 255, 0.28); }

        /* RESPONSIVE */
        @media (max-width: 850px) {
          .container { width: min(100%, calc(100% - 20px)); }
          .product-card { grid-template-columns: 1fr; gap: 26px; padding: 16px; border-radius: 16px; }
          .details { padding: 0 4px 6px; }
          .related-grid { grid-template-columns: repeat(3, 1fr); }
        }

        @media (max-width: 600px) {
          .page { padding-top: 20px; }
          .product-card { border-radius: 14px; padding: 14px; }
          .details h1 { font-size: 26px; }
          .option-grid { grid-template-columns: 1fr; }
          .actions { grid-template-columns: 1fr; }
          .single-price strong { font-size: 24px; }
          .dual-price strong { font-size: 22px; }
          .description-content, .reviews-content { padding-left: 2px; padding-right: 2px; }
          .warning-card { padding: 14px; gap: 11px; }
          .warning-icon { width: 38px; height: 38px; flex-basis: 38px; font-size: 18px; }
          .warning-body h3 { font-size: 13.5px; }
          .warning-body p { font-size: 12px; }
          .policy-card { padding: 15px 16px; }
          .policy-card h3 { font-size: 13.5px; }
          .policy-list li { font-size: 12px; }
          .number-card { flex-direction: column; text-align: center; align-items: center; gap: 12px; padding: 16px; }
          .number-body { align-items: center; }
          .number-row { justify-content: center; }
          .number-value { font-size: 17px; }
          .number-note { font-size: 11px; }
          .reviews-summary { padding: 14px 16px; }
          .summary-score { font-size: 28px; }
          .summary-star { font-size: 17px; }
          .review-form-grid { grid-template-columns: 1fr; }
          .review-form-card { padding: 16px; }
          .review-submit { width: 100%; justify-content: center; }
          .review-head { flex-wrap: wrap; }
          .review-date { margin-left: 0; width: 100%; margin-top: 4px; }
          .review-image-btn { width: 64px; height: 64px; }
          
          .related-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .related-title { font-size: 18px; }
          .related-info h3 { font-size: 13px; }
          .related-info p { font-size: 15px; }
        }
      `}</style>
    </main>
  );
}