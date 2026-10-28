"use client";

import { useState } from "react";

type ProductGalleryProps = {
  productName: string;
  images: string[];
};

export default function ProductGallery({
  productName,
  images,
}: ProductGalleryProps) {
  const safeImages =
    images.length > 0
      ? images
      : ["", "", "", "", ""];

  const [selectedImage, setSelectedImage] =
    useState(0);

  const currentImage =
    safeImages[selectedImage] ?? "";

  return (
    <section className="gallery">
      {/* MAIN IMAGE */}
      <div className="main-image">
        {currentImage ? (
          <img
            src={currentImage}
            alt={productName}
          />
        ) : (
          <div className="placeholder">
            <span>👗</span>
            <small>
              Image {selectedImage + 1}
            </small>
          </div>
        )}
      </div>

      {/* THUMBNAILS */}
      <div className="thumbnails">
        {safeImages
          .slice(0, 5)
          .map((image, index) => (
            <button
              key={index}
              type="button"
              className={
                selectedImage === index
                  ? "thumbnail active"
                  : "thumbnail"
              }
              onClick={() =>
                setSelectedImage(index)
              }
              aria-label={`Image ${index + 1}`}
            >
              {image ? (
                <img
                  src={image}
                  alt={`${productName} ${index + 1}`}
                />
              ) : (
                <span>
                  👗
                  <small>{index + 1}</small>
                </span>
              )}
            </button>
          ))}
      </div>

      <style jsx>{`
        .gallery {
          min-width: 0;
        }

        .main-image {
          width: 100%;
          aspect-ratio: 4 / 5;
          overflow: hidden;
          border-radius: 28px;
          background:
            radial-gradient(
              circle at 30% 25%,
              rgba(255, 255, 255, 0.85),
              transparent 22%
            ),
            linear-gradient(
              145deg,
              #f8dde7,
              #ebe3ff
            );
          display: grid;
          place-items: center;
          box-shadow:
            0 20px 50px rgba(83, 53, 66, 0.08);
        }

        .main-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 110px;
        }

        .placeholder small {
          font-size: 12px;
          color: #8a737d;
        }

        .thumbnails {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding-top: 12px;
        }

        .thumbnail {
          width: 74px;
          height: 88px;
          flex: 0 0 74px;
          border: 1px solid rgba(93, 67, 77, 0.1);
          border-radius: 14px;
          overflow: hidden;
          background: #f8edf3;
          cursor: pointer;
          display: grid;
          place-items: center;
          padding: 0;
        }

        .thumbnail.active {
          border: 2px solid #9a416d;
        }

        .thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .thumbnail span {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          font-size: 30px;
        }

        .thumbnail span small {
          font-size: 9px;
          color: #8a737d;
        }

        @media (max-width: 600px) {
          .main-image {
            border-radius: 22px;
          }

          .thumbnail {
            width: 64px;
            height: 76px;
            flex-basis: 64px;
          }
        }
      `}</style>
    </section>
  );
}