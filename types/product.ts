export type ProductImage = {
  url: string;
  isThumbnail?: boolean;
  alt?: string;
};

export type ProductPricing = {
  withoutBlouse: number;
  withBlouse: number;
  discountPrice?: number;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;

  categoryId: string;
  categoryName?: string;

  images: ProductImage[];

  pricing: ProductPricing;

  stock: number;

  isActive: boolean;
  isBestSelling: boolean;

  isFreeDelivery: boolean;

  createdAt?: string;
  updatedAt?: string;
};