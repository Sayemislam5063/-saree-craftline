import type { Product } from "./product";

export type BlouseOption = "withoutBlouse" | "withBlouse";

export type CartItem = {
  product: Product;
  quantity: number;
  blouseOption: BlouseOption;
};