export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;

  isActive: boolean;

  createdAt?: string;
  updatedAt?: string;
};