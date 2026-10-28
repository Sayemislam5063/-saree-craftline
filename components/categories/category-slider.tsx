"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Category = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  isActive: boolean;
};

export default function CategorySlider({ categories }: { categories: Category[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);

  // ১৬:৯ বক্সে ৩টি ক্যাটাগরি দেখাবে, তাই যদি ৩টির বেশি ক্যাটাগরি থাকে তবেই স্লাইড হবে
  const shouldSlide = categories.length > 3;

  // ✨ ইনফিনিট লুপের জন্য প্রথম ৩টি ক্যাটাগরি ক্লোন করে শেষে যোগ করা হলো
  const displayCategories = shouldSlide 
    ? [...categories, ...categories.slice(0, 3)] 
    : categories;

  // ✨ ৩ সেকেন্ড পর পর স্লাইড হওয়ার লজিক
  useEffect(() => {
    if (!shouldSlide) return;

    const interval = setInterval(() => {
      setIsTransitioning(true);
      setCurrentIndex((prev) => prev + 1);
    }, 3000); // ৩ সেকেন্ড

    return () => clearInterval(interval);
  }, [shouldSlide, currentIndex]); // currentIndex ডিপেন্ডেন্সি দিলে ম্যানুয়াল ক্লিকেও রিসেট হবে

  // ✨ স্লাইডার যখন একদম শেষ ক্লোনে পৌঁছাবে, তখন তাকে চুপিসারে আসল শুরুতে নিয়ে যাবে
  useEffect(() => {
    if (!shouldSlide) return;
    
    if (currentIndex >= categories.length) {
      // অ্যানিমেশন শেষ হওয়া পর্যন্ত অপেক্ষা করবে (৮০০ মিলি সেকেন্ড)
      const timeout = setTimeout(() => {
        setIsTransitioning(false); // ট্রানজিশন বন্ধ
        setCurrentIndex(0);        // শুরুতে রিসেট
      }, 800);
      
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, categories.length, shouldSlide]);

  // রিসেট হওয়ার পর আবার ট্রানজিশন চালু করা
  useEffect(() => {
    if (!isTransitioning) {
      const raf = requestAnimationFrame(() => {
        setIsTransitioning(true);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isTransitioning]);

  if (!categories || categories.length === 0) return null;

  // অ্যাক্টিভ ডট ক্যালকুলেশন
  const activeDot = currentIndex % categories.length;

  return (
    <div className="slider-container">
      <div className="slider-viewport">
        <div 
          className="slider-track" 
          style={{ 
            transform: `translateX(-${currentIndex * (100 / 3)}%)`,
            transition: isTransitioning ? "transform 0.8s cubic-bezier(0.25, 1, 0.5, 1)" : "none"
          }}
        >
          {displayCategories.map((category, index) => (
            <div className="slide-item" key={`${category.id}-${index}`}>
              <Link href={`/category/${category.slug}`} className="category-card">
                {/* ✨ ১৬:৯ রেশিও ইমেজ বক্স */}
                <div className="image-box">
                  {category.imageUrl ? (
                    <img src={category.imageUrl} alt={category.name} />
                  ) : (
                    <div className="no-image">No Image</div>
                  )}
                  
                  {/* ✨ বক্সের ভেতরে লেখা ওভারলে */}
                  <div className="category-name-overlay">
                    <span className="category-name-text">{category.name}</span>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* ডট ইন্ডিকেটর */}
      {shouldSlide && (
        <div className="dots-container">
          {categories.map((_, idx) => (
            <button
              key={idx}
              className={`dot ${idx === activeDot ? "active" : ""}`}
              onClick={() => {
                setIsTransitioning(true);
                setCurrentIndex(idx);
              }}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        .slider-container {
          width: 100%;
          margin: 20px 0;
        }

        .slider-viewport {
          overflow: hidden;
          width: 100%;
        }

        .slider-track {
          display: flex;
          width: 100%;
        }

        .slide-item {
          flex: 0 0 33.3333%;
          padding: 0 10px;
          box-sizing: border-box;
        }

        .category-card {
          display: block;
          text-decoration: none;
          transition: transform 0.3s ease;
          border-radius: 16px;
        }

        .category-card:hover {
          transform: translateY(-5px);
        }

        .image-box {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 20px rgba(125, 51, 85, 0.12);
          border: 1px solid #eadde3;
          background: #fdfafb;
        }

        .image-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }

        .category-card:hover .image-box img {
          transform: scale(1.08);
        }

        .no-image {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          color: #9a7c88;
          font-size: 14px;
        }

        .category-name-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          padding: 30px 15px 15px;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0) 100%);
          display: flex;
          justify-content: center;
          align-items: flex-end;
          transition: background 0.3s ease;
        }

        .category-card:hover .category-name-overlay {
          background: linear-gradient(to top, rgba(125, 51, 85, 0.95) 0%, rgba(125, 51, 85, 0.1) 100%);
        }

        .category-name-text {
          color: #ffffff;
          font-size: 16px;
          font-weight: 900;
          text-align: center;
          text-shadow: 0 2px 4px rgba(0,0,0,0.4);
          letter-spacing: 0.5px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
        }

        .dots-container {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-top: 25px;
        }

        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: none;
          background: rgba(125, 51, 85, 0.2);
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .dot.active {
          width: 25px;
          border-radius: 10px;
          background: #7d3355;
        }

        @media (max-width: 900px) {
          .slide-item {
            flex: 0 0 50%;
          }
          .slider-track {
            /* মোবাইলে ২টি বক্সের জন্য ক্যালকুলেশন */
            transform: translateX(-${currentIndex * 50}%) !important; 
          }
          .category-name-text {
            font-size: 15px;
          }
        }

        @media (max-width: 600px) {
          .slide-item {
            flex: 0 0 100%;
          }
        }
      `}</style>
    </div>
  );
}