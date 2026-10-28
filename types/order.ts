import type { BlouseOption } from "./cart";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type OrderItem = {
  productId: string;
  productName: string;
  imageUrl?: string;

  quantity: number;

  blouseOption: BlouseOption;

  unitPrice: number;
  totalPrice: number;
};

export type Order = {
  id: string;
  orderNumber: string;

  customerName: string;
  phone: string;
  address: string;

  items: OrderItem[];

  subtotal: number;
  deliveryCharge: number;
  total: number;

  paymentMethod: "cod";

  status: OrderStatus;

  createdAt?: string;
  updatedAt?: string;
};