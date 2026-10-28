import Link from "next/link";
import type { Category } from "../../types/category";

type CategoryBubbleProps = {
  category: Category;
};

export default function CategoryBubble({
  category,
}: CategoryBubbleProps) {
  return (
    <Link
      href={`/category/${category.slug}`}
      className="bubble"
      aria-label={`${category.name} category`}
    >
      <div className="image-wrap">
        {category.imageUrl ? (
          <img
            src={category.imageUrl}
            alt={category.name}
            className="category-image"
          />
        ) : (
          <div className="placeholder">👗</div>
        )}
      </div>

      <span className="name">{category.name}</span>

      <style jsx>{`
        .bubble {
          width: 118px;
          flex: 0 0 118px;
          padding: 10px;
          border-radius: 22px;
          border: 1px solid rgba(93, 67, 77, 0.1);
          background: rgba(255, 255, 255, 0.78);
          box-shadow: 0 12px 24px rgba(83, 53, 66, 0.06);
          text-decoration: none;
          color: #201a1d;
          text-align: center;
          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease;
        }

        .bubble:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 28px rgba(83, 53, 66, 0.11);
        }

        .image-wrap {
          width: 76px;
          height: 76px;
          margin: 0 auto 9px;
          overflow: hidden;
          border-radius: 50%;
          background: linear-gradient(145deg, #fff0f5, #f0eaff);
        }

        .category-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .placeholder {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          font-size: 30px;
        }

        .name {
          display: block;
          font-size: 13px;
          font-weight: 700;
          line-height: 1.35;
        }
      `}</style>
    </Link>
  );
}