"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type BlouseOption = "withoutBlouse" | "withBlouse";

type CartItem = {
  product: any;
  quantity: number;
  blouseOption: BlouseOption;
};

type CartContextType = {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  addToCart: (product: any, blouseOption: BlouseOption) => void;
  removeFromCart: (productId: string, blouseOption: BlouseOption) => void;
  updateQuantity: (productId: string, blouseOption: BlouseOption, quantity: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // ✨ ১. পেজ লোড হলে localStorage থেকে ডেটা আনা
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("saree-cart");
      if (savedCart) {
        setItems(JSON.parse(savedCart));
      }
    } catch (error) {
      console.error("Failed to load cart from localStorage", error);
    }
    // ডেটা লোড হওয়া শেষ হলে isInitialized true হবে
    setIsInitialized(true);
  }, []);

  // ✨ ২. কার্টে কোনো পরিবর্তন হলে localStorage-এ সেভ করা
  useEffect(() => {
    // ইনিশিয়াল লোড হওয়ার আগে খালি কার্ট সেভ করা যাবে না, তাই চেক
    if (isInitialized) {
      localStorage.setItem("saree-cart", JSON.stringify(items));
    }
  }, [items, isInitialized]);

  // ✨ ৩. কার্টে প্রোডাক্ট যোগ করা
  const addToCart = (product: any, blouseOption: BlouseOption) => {
    setItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.product.id === product.id && item.blouseOption === blouseOption
      );

      if (existingItem) {
        return currentItems.map((item) =>
          item.product.id === product.id && item.blouseOption === blouseOption
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...currentItems, { product, quantity: 1, blouseOption }];
    });
  };

  // ✨ ৪. কার্ট থেকে প্রোডাক্ট রিমুভ করা
  const removeFromCart = (productId: string, blouseOption: BlouseOption) => {
    setItems((currentItems) =>
      currentItems.filter(
        (item) => !(item.product.id === productId && item.blouseOption === blouseOption)
      )
    );
  };

  // ✨ ৫. কার্টের কোয়ান্টিটি আপডেট করা
  const updateQuantity = (productId: string, blouseOption: BlouseOption, quantity: number) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.product.id === productId && item.blouseOption === blouseOption
          ? { ...item, quantity: Math.max(1, quantity) }
          : item
      )
    );
  };

  // ✨ ৬. পুরো কার্ট খালি করা (অর্ডার প্লেস করার পর কাজে লাগবে)
  const clearCart = () => {
    setItems([]);
  };

  // ক্যালকুলেশন
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  
  const subtotal = items.reduce((sum, item) => {
    let price = 0;
    if (item.product.price_type === "single") {
      price = item.product.pricing.discountPrice ?? item.product.pricing.withoutBlouse ?? 0;
    } else {
      price = item.blouseOption === "withBlouse"
        ? (item.product.pricing.discountWithBlouse ?? item.product.pricing.withBlouse ?? 0)
        : (item.product.pricing.discountWithoutBlouse ?? item.product.pricing.withoutBlouse ?? 0);
    }
    return sum + (price * item.quantity);
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        subtotal,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}