"use client";

import { FormEvent, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase/supabase-client";
import Link from "next/link";

import { useCart } from "../../components/cart/cart-provider";
import type { BlouseOption } from "../../types/cart";

const GOOGLE_SHEET_WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbwiAzscsL8wCALvZBQeHNWWYuGpQIm67pLIaxzcoJmO4uprTX7OWxp6gyeo_pnOO4wBXw/exec";

function getItemPrice(
  item: {
    product: {
      pricing: {
        withoutBlouse: number;
        discountWithoutBlouse?: number;
        withBlouse: number;
        discountWithBlouse?: number;
        discountPrice?: number;
      };
    };
    blouseOption: BlouseOption;
  },
) {
  if (item.blouseOption === "withBlouse") {
    return (
      item.product.pricing.discountWithBlouse ??
      item.product.pricing.withBlouse
    );
  }

  return (
    item.product.pricing.discountWithoutBlouse ??
    item.product.pricing.discountPrice ??
    item.product.pricing.withoutBlouse
  );
}

const districts = [
  "ঢাকা", "টাঙ্গাইল", "গাজীপুর", "নারায়ণগঞ্জ", "নরসিংদী", "মুন্সিগঞ্জ", "মানিকগঞ্জ",
  "কিশোরগঞ্জ", "ময়মনসিংহ", "জামালপুর", "শেরপুর", "নেত্রকোনা", "ফরিদপুর", "গোপালগঞ্জ",
  "মাদারীপুর", "রাজবাড়ী", "শরীয়তপুর", "চট্টগ্রাম", "কক্সবাজার", "কুমিল্লা",
  "ব্রাহ্মণবাড়িয়া", "চাঁদপুর", "ফেনী", "নোয়াখালী", "লক্ষ্মীপুর", "খাগড়াছড়ি",
  "রাঙামাটি", "বান্দরবান", "রাজশাহী", "নাটোর", "নওগাঁ", "চাঁপাইনবাবগঞ্জ", "পাবনা",
  "সিরাজগঞ্জ", "বগুড়া", "জয়পুরহাট", "রংপুর", "দিনাজপুর", "ঠাকুরগাঁও", "পঞ্চগড়",
  "কুড়িগ্রাম", "লালমনিরহাট", "নীলফামারী", "গাইবান্ধা", "খুলনা", "যশোর", "সাতক্ষীরা",
  "বাগেরহাট", "ঝিনাইদহ", "মাগুরা", "নড়াইল", "কুষ্টিয়া", "চুয়াডাঙ্গা", "মেহেরপুর",
  "বরিশাল", "ভোলা", "পটুয়াখালী", "পিরোজপুর", "বরগুনা", "ঝালকাঠি", "সিলেট",
  "মৌলভীবাজার", "হবিগঞ্জ", "সুনামগঞ্জ"
];

const upazilasByDistrict: Record<string, string[]> = {
  ঢাকা: ["ধামরাই", "দোহার", "কেরানীগঞ্জ", "নবাবগঞ্জ", "সাভার"],
  টাঙ্গাইল: ["বাসাইল", "ভূঞাপুর", "দেলদুয়ার", "ধনবাড়ী", "ঘাটাইল", "গোপালপুর", "কালিহাতী", "মধুপুর", "মির্জাপুর", "নাগরপুর", "সখিপুর", "টাঙ্গাইল সদর"],
  গাজীপুর: ["গাজীপুর সদর", "কালিয়াকৈর", "কালীগঞ্জ", "কাপাসিয়া", "শ্রীপুর"],
  নারায়ণগঞ্জ: ["আড়াইহাজার", "সোনারগাঁ", "নারায়ণগঞ্জ সদর", "রূপগঞ্জ", "বন্দর"],
  নরসিংদী: ["বেলাবো", "মনোহরদী", "নরসিংদী সদর", "পলাশ", "রায়পুরা", "শিবপুর"],
  মুন্সিগঞ্জ: ["গজারিয়া", "লৌহজং", "মুন্সীগঞ্জ সদর", "সিরাজদিখান", "শ্রীনগর", "টংগিবাড়ী"],
  মানিকগঞ্জ: ["দৌলতপুর", "ঘিওর", "হরিরামপুর", "মানিকগঞ্জ সদর", "সাটুরিয়া", "শিবালয়", "সিংগাইর"],
  কিশোরগঞ্জ: ["অষ্টগ্রাম", "বাজিতপুর", "ভৈরব", "হোসেনপুর", "ইটনা", "করিমগঞ্জ", "কটিয়াদী", "কিশোরগঞ্জ সদর", "কুলিয়ারচর", "মিঠামইন", "নিকলী", "পাকুন্দিয়া", "তাড়াইল"],
  ফরিদপুর: ["আলফাডাঙ্গা", "ভাঙ্গা", "বোয়ালমারী", "চরভদ্রাসন", "ফরিদপুর সদর", "মধুখালী", "নগরকান্দা", "সদরপুর", "সালথা"],
  গোপালগঞ্জ: ["গোপালগঞ্জ সদর", "কাশিয়ানী", "কোটালীপাড়া", "মুকসুদপুর", "টুঙ্গিপাড়া"],
  মাদারীপুর: ["কালকিনি", "মাদারীপুর সদর", "রাজৈর", "শিবচর", "ডাসার"],
  রাজবাড়ী: ["বালিয়াকান্দি", "গোয়ালন্দ", "কালুখালী", "পাংশা", "রাজবাড়ী সদর"],
  শরীয়তপুর: ["ভেদরগঞ্জ", "ডামুড্যা", "গোসাইরহাট", "নড়িয়া", "শরীয়তপুর সদর", "জাজিরা"],
  চট্টগ্রাম: ["আনোয়ারা", "বাঁশখালী", "বোয়ালখালী", "চন্দনাইশ", "ফটিকছড়ি", "হাটহাজারী", "লোহাগাড়া", "মীরসরাই", "পটিয়া", "রাঙ্গুনিয়া", "রাউজান", "সন্দ্বীপ", "সাতকানিয়া", "সীতাকুন্ড", "কর্ণফুলী"],
  কক্সবাজার: ["চকরিয়া", "কক্সবাজার সদর", "কুতুবদিয়া", "মহেশখালী", "পেকুয়া", "রামু", "টেকনাফ", "উখিয়া", "ঈদগাঁও"],
  কুমিল্লা: ["বরুড়া", "ব্রাহ্মণপাড়া", "বুড়িচং", "চান্দিনা", "চৌদ্দগ্রাম", "আদর্শ সদর", "সদর দক্ষিণ", "দাউদকান্দি", "দেবিদ্বার", "হোমনা", "লাকসাম", "মনোহরগঞ্জ", "মেঘনা", "মুরাদনগর", "নাঙ্গলকোট", "তিতাস", "লালমাই"],
  ব্রাহ্মণবাড়িয়া: ["আখাউড়া", "বাঞ্ছারামপুর", "বিজয়নগর", "ব্রাহ্মণবাড়িয়া সদর", "আশুগঞ্জ", "কসবা", "নবীনগর", "নাসিরনগর", "সরাইল"],
  চাঁদপুর: ["চাঁদপুর সদর", "ফরিদগঞ্জ", "হাইমচর", "হাজীগঞ্জ", "কচুয়া", "মতলব দক্ষিণ", "মতলব উত্তর", "শাহরাস্তি"],
  ফেনী: ["ছাগলনাইয়া", "দাগনভূঞা", "ফেনী সদর", "ফুলগাজী", "পরশুরাম", "সোনাগাজী"],
  নোয়াখালী: ["বেগমগঞ্জ", "চাটখিল", "কোম্পানীগঞ্জ", "হাতিয়া", "সেনবাগ", "সোনাইমুড়ী", "সুবর্ণচর", "নোয়াখালী সদর", "কবিরহাট"],
  লক্ষ্মীপুর: ["কমলনগর", "লক্ষ্মীপুর সদর", "রায়পুর", "রামগঞ্জ", "রামগতি", "চন্দ্রগঞ্জ"],
  খাগড়াছড়ি: ["দীঘিনালা", "মানিকছড়ি", "খাগড়াছড়ি সদর", "লক্ষীছড়ি", "মহালছড়ি", "মাটিরাঙ্গা", "পানছড়ি", "রামগড়", "গুইমারা"],
  রাঙামাটি: ["বাঘাইছড়ি", "বরকল", "কাউখালী", "কাপ্তাই", "জুরাছড়ি", "লংগদু", "নানিয়ারচর", "রাঙ্গামাটি সদর", "রাজস্থলী", "বিলাইছড়ি"],
  বান্দরবান: ["আলীকদম", "বান্দরবান সদর", "লামা", "নাইক্ষ্যংছড়ি", "রোয়াংছড়ি", "রুমা", "থানচি"],
  রাজশাহী: ["বাঘা", "বাগমারা", "চারঘাট", "দুর্গাপুর", "গোদাগাড়ী", "মোহনপুর", "পবা", "পুঠিয়া", "তানোর"],
  নাটোর: ["বাগাতিপাড়া", "বড়াইগ্রাম", "গুরুদাসপুর", "লালপুর", "নাটোর সদর", "সিংড়া", "নলডাঙ্গা"],
  নওগাঁ: ["আত্রাই", "ধামইরহাট", "মান্দা", "মহাদেবপুর", "নওগাঁ সদর", "নিয়ামতপুর", "পত্নীতলা", "রাণীনগর", "সাপাহার", "বদলগাছী", "পোরশা"],
  চাঁপাইনবাবগঞ্জ: ["ভোলাহাট", "গোমস্তাপুর", "নাচোল", "চাঁপাইনবাবগঞ্জ সদর", "শিবগঞ্জ"],
  পাবনা: ["আটঘরিয়া", "বেড়া", "ভাঙ্গুড়া", "চাটমোহর", "ফরিদপুর", "ঈশ্বরদী", "পাবনা সদর", "সাঁথিয়া", "সুজানগর"],
  সিরাজগঞ্জ: ["বেলকুচি", "চৌহালি", "কামারখন্দ", "কাজীপুর", "রায়গঞ্জ", "শাহজাদপুর", "সিরাজগঞ্জ সদর", "তাড়াশ", "উল্লাপাড়া"],
  বগুড়া: ["আদমদিঘি", "বগুড়া সদর", "ধুনট", "দুপচাচিঁয়া", "গাবতলী", "কাহালু", "নন্দিগ্রাম", "সারিয়াকান্দি", "শাজাহানপুর", "শেরপুর", "শিবগঞ্জ", "সোনাতলা", "মোকামতলা"],
  জয়পুরহাট: ["আক্কেলপুর", "জয়পুরহাট সদর", "কালাই", "পাঁচবিবি", "ক্ষেতলাল"],
  রংপুর: ["বদরগঞ্জ", "কাউনিয়া", "রংপুর সদর", "মিঠাপুকুর", "পীরগাছা", "পীরগঞ্জ", "তারাগঞ্জ", "গংগাচড়া"],
  দিনাজপুর: ["বিরামপুর", "বীরগঞ্জ", "বিরল", "বোচাগঞ্জ", "চিরিরবন্দর", "ফুলবাড়ী", "ঘোড়াঘাট", "হাকিমপুর", "কাহারোল", "খানসামা", "নবাবগঞ্জ", "পার্বতীপুর", "দিনাজপুর সদর"],
  ঠাকুরগাঁও: ["বালিয়াডাঙ্গী", "হরিপুর", "পীরগঞ্জ", "রাণীশংকৈল", "ঠাকুরগাঁও সদর", "ভূল্লী", "রুহিয়া"],
  পঞ্চগড়: ["আটোয়ারী", "বোদা", "দেবীগঞ্জ", "পঞ্চগড় সদর", "তেঁতুলিয়া"],
  কুড়িগ্রাম: ["ভূরুঙ্গামারী", "চর রাজিবপুর", "চিলমারী", "ফুলবাড়ী", "কুড়িগ্রাম সদর", "নাগেশ্বরী", "রাজারহাট", "রৌমারী", "উলিপুর"],
  লালমনিরহাট: ["আদিতমারী", "হাতীবান্ধা", "কালীগঞ্জ", "লালমনিরহাট সদর", "পাটগ্রাম"],
  নীলফামারী: ["ডোমার", "জলঢাকা", "কিশোরগঞ্জ", "নীলফামারী সদর", "সৈয়দপুর", "ডিমলা"],
  গাইবান্ধা: ["ফুলছড়ি", "গাইবান্ধা সদর", "গোবিন্দগঞ্জ", "পলাশবাড়ী", "সাদুল্লাপুর", "সাঘাটা", "সুন্দরগঞ্জ"],
  খুলনা: ["বটিয়াঘাটা", "দাকোপ", "ডুমুরিয়া", "কয়রা", "পাইকগাছা", "ফুলতলা", "রূপসা", "তেরখাদা", "দিঘলিয়া"],
  যশোর: ["অভয়নগর", "বাঘারপাড়া", "চৌগাছা", "ঝিকরগাছা", "কেশবপুর", "যশোর সদর", "মণিরামপুর", "শার্শা"],
  সাতক্ষীরা: ["আশাশুনি", "দেবহাটা", "কলারোয়া", "কালিগঞ্জ", "সাতক্ষীরা সদর", "শ্যামনগর", "তালা"],
  বাগেরহাট: ["চিতলমারী", "ফকিরহাট", "কচুয়া", "মোল্লাহাট", "মোংলা", "মোরেলগঞ্জ", "রামপাল", "শরণখোলা", "বাগেরহাট সদর"],
  ঝিনাইদহ: ["হরিণাকুন্ডু", "ঝিনাইদহ সদর", "কালীগঞ্জ", "কোটচাঁদপুর", "মহেশপুর", "শৈলকুপা"],
  মাগুরা: ["মাগুরা সদর", "মহম্মদপুর", "শালিখা", "শ্রীপুর"],
  নড়াইল: ["কালিয়া", "লোহাগড়া", "নড়াইল সদর"],
  কুষ্টিয়া: ["ভেড়ামারা", "দৌলতপুর", "খোকসা", "কুমারখালী", "কুষ্টিয়া সদর", "মিরপুর"],
  চুয়াডাঙ্গা: ["আলমডাঙ্গা", "চুয়াডাঙ্গা সদর", "দামুড়হুদা", "জীবননগর"],
  মেহেরপুর: ["গাংনী", "মুজিবনগর", "মেহেরপুর সদর"],
  বরিশাল: ["আগৈলঝাড়া", "বাবুগঞ্জ", "বাকেরগঞ্জ", "বানারীপাড়া", "গৌরনদী", "হিজলা", "বরিশাল সদর", "মেহেন্দিগঞ্জ", "মুলাদী", "উজিরপুর"],
  ভোলা: ["ভোলা সদর", "বোরহানউদ্দিন", "দৌলতখান", "লালমোহন", "মনপুরা", "তজুমদ্দিন", "চরফ্যাশন"],
  পটুয়াখালী: ["বাউফল", "দশমিনা", "দুমকী", "কলাপাড়া", "মির্জাগঞ্জ", "পটুয়াখালী সদর", "রাঙ্গাবালী", "গলাচিপা"],
  পিরোজপুর: ["ভান্ডারিয়া", "কাউখালী", "মঠবাড়ীয়া", "নাজিরপুর", "পিরোজপুর সদর", "নেছারাবাদ", "জিয়ানগর"],
  বরগুনা: ["আমতলী", "বামনা", "বরগুনা সদর", "বেতাগী", "পাথরঘাটা", "তালতলী"],
  ঝালকাঠি: ["ঝালকাঠি সদর", "নলছিটি", "কাঠালিয়া", "রাজাপুর"],
  সিলেট: ["বালাগঞ্জ", "বিয়ানীবাজার", "বিশ্বনাথ", "কোম্পানীগঞ্জ", "দক্ষিণ সুরমা", "ফেঞ্চুগঞ্জ", "গোলাপগঞ্জ", "গোয়াইনঘাট", "জৈন্তাপুর", "কানাইঘাট", "সিলেট সদর", "জকিগঞ্জ", "ওসমানী নগর"],
  মৌলভীবাজার: ["বড়লেখা", "জুড়ী", "কমলগঞ্জ", "কুলাউড়া", "মৌলভীবাজার সদর", "রাজনগর", "শ্রীমঙ্গল"],
  হবিগঞ্জ: ["আজমিরীগঞ্জ", "বাহুবল", "বানিয়াচং", "চুনারুঘাট", "হবিগঞ্জ সদর", "লাখাই", "মাধবপুর", "নবীগঞ্জ", "শায়েস্তাগঞ্জ"],
  সুনামগঞ্জ: ["বিশ্বম্ভরপুর", "ছাতক", "দিরাই", "ধর্মপাশা", "দোয়ারাবাজার", "জগন্নাথপুর", "জামালগঞ্জ", "শাল্লা", "সুনামগঞ্জ সদর", "তাহিরপুর", "শান্তিগঞ্জ", "মধ্যনগর"],
  জামালপুর: ["বকশীগঞ্জ", "দেওয়ানগঞ্জ", "ইসলামপুর", "জামালপুর সদর", "মাদারগঞ্জ", "মেলান্দহ", "সরিষাবাড়ী"],
  ময়মনসিংহ: ["ভালুকা", "ধোয়াবাউড়া", "ফুলবাড়ীয়া", "গফরগাঁও", "গৌরীপুর", "হালুয়াঘাট", "ঈশ্বরগঞ্জ", "ময়মনসিংহ সদর", "মুক্তাগাছা", "নান্দাইল", "ফুলপুর", "তারাকান্দা", "ত্রিশাল"],
  শেরপুর: ["ঝিনাইগাতী", "নকলা", "নালিতাবাড়ী", "শেরপুর সদর", "শ্রীবরদী"],
  নেত্রকোনা: ["আটপাড়া", "বারহাট্টা", "দুর্গাপুর", "খালিয়াজুরী", "কলমাকান্দা", "কেন্দুয়া", "মদন", "মোহনগঞ্জ", "নেত্রকোণা সদর", "পূর্বধলা"],
};

export default function CheckoutPage() {
  const {
    items,
    totalItems,
    subtotal,
    removeFromCart,
    updateQuantity,
  } = useCart();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [district, setDistrict] = useState("");
  const [upazila, setUpazila] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [deliveryType, setDeliveryType] = useState<"insideDhaka" | "outsideDhaka">("outsideDhaka");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // ✨ এরর স্টেটগুলো
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [fraudError, setFraudError] = useState<string | null>(null);

  const upazilas = useMemo(() => {
    return upazilasByDistrict[district] ?? [];
  }, [district]);

  const hasFreeDelivery = items.some(
    (item) => (item.product as any).isFreeDelivery === true,
  );

  const deliveryCharge = hasFreeDelivery
    ? 0
    : deliveryType === "insideDhaka"
      ? 110
      : 130;

  const grandTotal = subtotal + deliveryCharge;

  function handleDistrictChange(value: string) {
    setDistrict(value);
    setUpazila("");

    if (value === "ঢাকা") {
      setDeliveryType("insideDhaka");
    } else if (value) {
      setDeliveryType("outsideDhaka");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting || submitted) return;

    setPhoneError(null);
    setFraudError(null);

    // ✨ ফোন নাম্বার চেক
    const cleanPhone = phone.replace(/[\s-]/g, "");
    const isValidBDPhone = /^01[3-9]\d{8}$/.test(cleanPhone);

    if (!isValidBDPhone) {
      setPhoneError("আপনার নাম্বার টি সঠিক নয়, দয়া করে নাম্বার টি ঠিক করুন।");
      return;
    }

    const finalDeliveryType: "insideDhaka" | "outsideDhaka" =
      district === "ঢাকা" ? "insideDhaka" : "outsideDhaka";

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_name: name,
          phone,
          district,
          upazila,
          address,
          note,
          delivery_type: finalDeliveryType,
          items: items.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            blouseOption: item.blouseOption,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        if (result.is_fraud) {
          setFraudError(result.message);
          setIsSubmitting(false);
          return;
        }
        // ✨ ব্যাকএন্ড থেকেও যদি ফোন নাম্বার এরর আসে
        if (result.message && result.message.includes("নাম্বার")) {
          setPhoneError(result.message);
          setIsSubmitting(false);
          return;
        }
        throw new Error(result.message || "Order save করা যায়নি।");
      }

      setIsSubmitting(false);
      setSubmitted(true);
    } catch (error) {
      console.error("Order submit error:", error);
      setIsSubmitting(false);
      alert(
        error instanceof Error
          ? error.message
          : "Order save করা যায়নি। আবার চেষ্টা করুন।",
      );
    }
  }

  /* ============================================
     LOADING OVERLAY
  ============================================ */
  if (isSubmitting) {
    return (
      <main className="overlay-page">
        <div className="overlay-box">
          <div className="order-spinner">
            <span className="spinner-ring" />
            <span className="spinner-icon">🛍️</span>
          </div>
          <h2>Order Saving...</h2>
          <p>আপনার অর্ডারটি প্রসেস করা হচ্ছে,<br />দয়া করে অপেক্ষা করুন...</p>
          <div className="progress-bar">
            <div className="progress-fill" />
          </div>
        </div>

        <style jsx>{`
          .overlay-page {
            position: fixed; inset: 0; z-index: 9999; display: grid; place-items: center; padding: 20px;
            background: radial-gradient(circle at 30% 30%, rgba(255, 230, 239, 0.55), transparent 40%),
                        radial-gradient(circle at 70% 70%, rgba(230, 220, 255, 0.4), transparent 45%),
                        rgba(255, 255, 255, 0.96);
            backdrop-filter: blur(6px); animation: overlayIn 0.3s ease-out;
          }
          @keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }
          .overlay-box {
            width: min(400px, 100%); padding: 40px 28px; text-align: center; border-radius: 26px;
            background: #ffffff; border: 1px solid #eadde3;
            box-shadow: 0 30px 60px rgba(83, 53, 66, 0.14), 0 8px 20px rgba(83, 53, 66, 0.08);
            animation: boxPop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          @keyframes boxPop { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
          .order-spinner { position: relative; width: 90px; height: 90px; margin: 0 auto 22px; display: grid; place-items: center; }
          .spinner-ring { position: absolute; inset: 0; border-radius: 50%; border: 4px solid #f4e5ee; border-top-color: #a9416e; border-right-color: #d47da0; animation: orderSpin 0.9s linear infinite; }
          @keyframes orderSpin { to { transform: rotate(360deg); } }
          .spinner-icon { font-size: 36px; animation: iconBounce 1.2s ease-in-out infinite; }
          @keyframes iconBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
          .overlay-box h2 { margin: 0 0 10px; color: #2b1f26; font-size: 22px; font-weight: 900; letter-spacing: -0.3px; }
          .overlay-box p { margin: 0 0 22px; color: #88757d; font-size: 13px; line-height: 1.7; }
          .progress-bar { width: 100%; height: 6px; border-radius: 20px; background: #f4e9ef; overflow: hidden; }
          .progress-fill { height: 100%; width: 40%; border-radius: 20px; background: linear-gradient(90deg, #d47da0, #a9416e); animation: progressSlide 1.4s ease-in-out infinite; }
          @keyframes progressSlide { 0% { transform: translateX(-100%); } 100% { transform: translateX(350%); } }
        `}</style>
      </main>
    );
  }

  /* ============================================
     SUCCESS SCREEN
  ============================================ */
  if (submitted) {
    return (
      <main className="success-page">
        <div className="success-box">
          <div className="success-icon">✓</div>
          <p className="eyebrow">SAREE CRAFTLINE</p>
          <h1>অর্ডার সফল হয়েছে!</h1>
          <p>আপনার অর্ডারটি আমরা পেয়েছি। শীঘ্রই আমাদের প্রতিনিধি আপনার সাথে যোগাযোগ করবেন।</p>

          <div className="order-preview">
            <div><span>Customer</span><strong>{name}</strong></div>
            <div><span>Phone</span><strong>{phone}</strong></div>
            <div><span>District</span><strong>{district}</strong></div>
            <div><span>Upazila</span><strong>{upazila}</strong></div>
            <div><span>Delivery</span><strong>{deliveryType === "insideDhaka" ? "ঢাকার ভিতরে" : "ঢাকার বাইরে"}</strong></div>
            <div><span>Total</span><strong>৳ {grandTotal.toLocaleString("bn-BD")}</strong></div>
          </div>

          <div className="success-address">
            <span>সম্পূর্ণ ঠিকানা</span>
            <strong>{address}</strong>
          </div>

          {/* ✨ নতুন যোগ করা ট্র্যাকিং সেকশন */}
          <div className="tracking-cta">
            <p>আপনার পার্সেলের লোকেশন বা কোথায় আছে জানতে এখানে ক্লিক করুন</p>
            <Link href="/order-tracking" className="track-button">
              📦 অর্ডার ট্র্যাক করুন
            </Link>
          </div>

          <Link href="/" className="home-button">Homepage-এ যান</Link>
        </div>

        <style jsx>{`
          .success-page { min-height: 75vh; display: grid; place-items: center; padding: 40px 20px; background: radial-gradient(circle at top left, rgba(255, 230, 239, 0.55), transparent 30%), #fff; }
          .success-box { width: min(700px, 100%); padding: 40px 24px; text-align: center; border-radius: 26px; background: rgba(255, 255, 255, 0.95); box-shadow: 0 20px 50px rgba(83, 53, 66, 0.09); animation: successIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
          @keyframes successIn { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
          .success-icon { width: 72px; height: 72px; margin: 0 auto 16px; display: grid; place-items: center; border-radius: 50%; background: linear-gradient(135deg, #d1f0da, #b6e6c6); color: #1f6a42; font-size: 36px; font-weight: 900; box-shadow: 0 12px 28px rgba(31, 106, 66, 0.2); animation: iconPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s backwards; }
          @keyframes iconPop { 0% { transform: scale(0); opacity: 0; } 70% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }
          .eyebrow { margin: 0 0 6px; color: #a9416e; font-size: 11px; font-weight: 800; letter-spacing: 1px; }
          .success-box h1 { margin: 0 0 8px; font-size: 28px; color: #2b1f26; }
          .success-box > p:not(.eyebrow) { color: #76676e; line-height: 1.8; margin: 0 0 24px; }
          .order-preview { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 24px 0; }
          .order-preview div { padding: 14px 10px; border-radius: 14px; background: #faf5f7; }
          .order-preview span, .success-address span { display: block; color: #88757d; font-size: 11px; margin-bottom: 4px; }
          .order-preview strong { font-size: 14px; }
          .success-address { margin-bottom: 22px; padding: 15px; border-radius: 14px; background: #faf5f7; text-align: left; }
          .success-address strong { font-size: 14px; line-height: 1.7; }
          
          /* ✨ নতুন ট্র্যাকিং স্টাইল */
          .tracking-cta { margin-bottom: 24px; padding: 20px; border-radius: 16px; background: #eef8f3; border: 1px solid #c1e8d1; text-align: center; }
          .tracking-cta p { margin: 0 0 12px; color: #1f6a42; font-size: 13px; font-weight: 700; }
          .track-button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 24px; border-radius: 12px; background: #25D366; color: white; text-decoration: none; font-weight: 900; font-size: 14px; transition: all 0.25s ease; box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3); }
          .track-button:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(37, 211, 102, 0.4); }

          .home-button { display: inline-flex; padding: 13px 24px; border-radius: 13px; background: #241d22; color: #fff; text-decoration: none; font-weight: 800; transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease; box-shadow: 0 8px 20px rgba(36, 29, 34, 0.18); }
          .home-button:hover { transform: translateY(-3px); box-shadow: 0 14px 28px rgba(36, 29, 34, 0.26); }
          @media (max-width: 600px) { .order-preview { grid-template-columns: 1fr 1fr; } }
        `}</style>
      </main>
    );
  }

  // ✨ ফ্রড এরর স্ক্রিন 
  if (fraudError) {
    return (
      <main className="empty-page">
        <div className="empty-box" style={{ border: "2px solid #ffcccc", background: "#fff5f5" }}>
          <div className="icon">🚫</div>
          <h1 style={{ color: "#d32f2f", fontSize: "22px", marginBottom: "10px" }}>অর্ডার গ্রহণ করা সম্ভব হয়নি</h1>
          <p style={{ color: "#666", fontSize: "13px", lineHeight: "1.6" }}>{fraudError}</p>
          
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "20px", flexWrap: "wrap" }}>
            <a 
              href={`https://wa.me/8801700000000?text=আসসালামু%20আলাইকুম,%20আমার%20অর্ডারটি%20গ্রহণ%20করা%20হয়নি।%20সাহায্য%20করুন।`} 
              target="_blank" 
              rel="noreferrer"
              className="shop-link" 
              style={{ background: "#25D366", display: "inline-flex", gap: "8px", padding: "12px 20px", borderRadius: "10px", color: "white", textDecoration: "none", fontWeight: "bold", fontSize: "13px" }}
            >
              <span>💬</span> WhatsApp-এ যোগাযোগ করুন
            </a>
            
            <button 
              onClick={() => setFraudError(null)} 
              style={{ background: "#e0e0e0", border: "none", cursor: "pointer", padding: "12px 20px", borderRadius: "10px", color: "#333", fontWeight: "bold", fontSize: "13px" }}
            >
              আবার চেষ্টা করুন
            </button>
          </div>
        </div>

        <style jsx>{`
          .empty-page { min-height: 75vh; display: grid; place-items: center; padding: 40px 20px; background: #fff; }
          .empty-box { width: min(520px, 100%); padding: 45px 24px; text-align: center; border-radius: 24px; background: #ffffff; box-shadow: 0 18px 45px rgba(83, 53, 66, 0.08); }
          .icon { font-size: 56px; margin-bottom: 14px; }
        `}</style>
      </main>
    );
  }

  if (!items.length) {
    return (
      <main className="empty-page">
        <div className="empty-box">
          <div className="icon">🛍️</div>
          <h1>Checkout করার জন্য Cart-এ product নেই</h1>
          <p>আগে পছন্দের saree Cart-এ যোগ করুন।</p>
          <Link href="/" className="shop-link">Shopping করুন →</Link>
        </div>
        <style jsx>{`
          .empty-page { min-height: 75vh; display: grid; place-items: center; padding: 40px 20px; background: #fff; }
          .empty-box { width: min(520px, 100%); padding: 45px 24px; text-align: center; border-radius: 24px; background: #ffffff; box-shadow: 0 18px 45px rgba(83, 53, 66, 0.08); }
          .icon { font-size: 56px; margin-bottom: 14px; }
          .empty-box h1 { margin: 0 0 10px; font-size: 26px; }
          .empty-box p { margin: 0 0 22px; color: #88757d; }
          .shop-link { display: inline-flex; padding: 13px 20px; border-radius: 13px; background: #241d22; color: white; text-decoration: none; font-weight: 800; }
        `}</style>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="container">
        <div className="heading">
          <p className="eyebrow">SAREE CRAFTLINE</p>
          <h1>Checkout</h1>
          <p>আপনার তথ্য দিন এবং Delivery Option নির্বাচন করে order দিন।</p>
        </div>

        <div className="layout">
          <form className="form-card" onSubmit={handleSubmit}>
            <h2>Customer Information</h2>

            <div className="field">
              <label htmlFor="name">আপনার নাম *</label>
              <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="আপনার পূর্ণ নাম" required disabled={isSubmitting} />
            </div>

            <div className="field">
              <label htmlFor="phone">মোবাইল নম্বর *</label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  if (phoneError) setPhoneError(null); 
                }}
                placeholder="01XXXXXXXXX"
                required
                disabled={isSubmitting}
                style={{ borderColor: phoneError ? "#d32f2f" : undefined }} 
              />
              {phoneError && <span className="error-text">{phoneError}</span>}
            </div>

            <div className="address-grid">
              <div className="field">
                <label htmlFor="district">জেলা *</label>
                <select id="district" value={district} onChange={(e) => handleDistrictChange(e.target.value)} required disabled={isSubmitting}>
                  <option value="">জেলা নির্বাচন করুন</option>
                  {districts.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>

              <div className="field">
                <label htmlFor="upazila">উপজেলা *</label>
                <select id="upazila" value={upazila} onChange={(e) => setUpazila(e.target.value)} disabled={!district || isSubmitting} required>
                  <option value="">{district ? "উপজেলা নির্বাচন করুন" : "আগে জেলা নির্বাচন করুন"}</option>
                  {upazilas.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                {district && upazilas.length === 0 && <small>এই জেলার উপজেলা তালিকা পরে আরও যোগ করা যাবে।</small>}
              </div>
            </div>

            <div className="field">
              <label htmlFor="address">সম্পূর্ণ ঠিকানা *</label>
              <textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="বাড়ি, রোড, এলাকা, বাজার ইত্যাদি" rows={5} required disabled={isSubmitting} />
            </div>

            <div className="delivery-section">
              <div className="delivery-header">
                <h2>Delivery Charge</h2>
                {hasFreeDelivery ? (
                  <span className="auto-badge free">🚚 Free Delivery Applied</span>
                ) : (
                  <span className="auto-badge">🔒 জেলা অনুযায়ী auto</span>
                )}
              </div>

              {hasFreeDelivery ? (
                <div className="delivery-auto-card free">
                  <div className="delivery-left">
                    <span className="delivery-icon free">🎉</span>
                    <div className="delivery-info">
                      <strong className="free-text">ফ্রি ডেলিভারি!</strong>
                      <span>আপনার অর্ডারে Free Delivery product আছে — কোনো delivery charge লাগবে না।</span>
                    </div>
                  </div>
                  <strong className="delivery-charge free">FREE</strong>
                </div>
              ) : district ? (
                <div className="delivery-auto-card">
                  <div className="delivery-left">
                    <span className="delivery-icon">{deliveryType === "insideDhaka" ? "🏙️" : "🚚"}</span>
                    <div className="delivery-info">
                      <strong>{deliveryType === "insideDhaka" ? "ঢাকার ভিতরে" : "ঢাকার বাইরে"}</strong>
                      <span>{district} জেলার জন্য নির্ধারিত চার্জ</span>
                    </div>
                  </div>
                  <strong className="delivery-charge">৳ {deliveryCharge.toLocaleString("bn-BD")}</strong>
                </div>
              ) : (
                <div className="delivery-auto-card empty">
                  <span className="delivery-empty-icon">📍</span>
                  <span className="delivery-empty-text">জেলা select করলে delivery charge auto দেখানো হবে</span>
                </div>
              )}
            </div>

            <div className="field">
              <label htmlFor="note">অতিরিক্ত নির্দেশনা</label>
              <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="কোনো বিশেষ কথা থাকলে লিখুন" rows={3} disabled={isSubmitting} />
            </div>

            <div className="payment">
              <h2>Payment Method</h2>
              <div className="payment-option">
                <div>
                  <strong>Cash on Delivery</strong>
                  <span>Product হাতে পেয়ে payment করবেন</span>
                </div>
                <span className="checked">✓</span>
              </div>
            </div>

            <button type="submit" className="place-order" disabled={isSubmitting || submitted}>
              {isSubmitting ? (
                <><span className="btn-spinner" />Order Saving...</>
              ) : (
                <>COD দিয়ে Order করুন →</>
              )}
            </button>
          </form>

          <aside className="summary">
            <div className="summary-title">
              <h2>আপনার Order</h2>
              <span>{totalItems}টি item</span>
            </div>

            <div className="items">
              {items.map((item) => {
                const price = getItemPrice(item);
                const thumbnail = item.product.images.find((image) => image.isThumbnail)?.url ?? item.product.images[0]?.url;
                const itemIsFree = (item.product as any).isFreeDelivery === true;

                return (
                  <div className="item" key={`${item.product.id}-${item.blouseOption}`}>
                    <div className="item-top">
                      <div className="item-image">
                        {thumbnail ? <img src={thumbnail} alt={item.product.name} /> : <span>👗</span>}
                      </div>
                      <div className="item-info">
                        <h3>{item.product.name}</h3>
                        <p>{item.blouseOption === "withBlouse" ? "Blouseসহ" : "Blouse ছাড়া"}</p>
                        {itemIsFree && <span className="item-free-tag">🚚 Free Delivery</span>}
                        <span className="item-unit-price">৳ {price.toLocaleString("bn-BD")}</span>
                      </div>
                      <button type="button" className="item-remove" onClick={() => removeFromCart(item.product.id, item.blouseOption)} aria-label="Remove item" disabled={isSubmitting}>×</button>
                    </div>
                    <div className="item-bottom">
                      <div className="qty-control">
                        <button type="button" className="qty-btn" onClick={() => updateQuantity(item.product.id, item.blouseOption, Math.max(1, item.quantity - 1))} disabled={item.quantity <= 1 || isSubmitting} aria-label="Decrease quantity">−</button>
                        <span className="qty-value">{item.quantity}</span>
                        <button type="button" className="qty-btn" onClick={() => updateQuantity(item.product.id, item.blouseOption, Math.min(item.product.stock, item.quantity + 1))} disabled={item.quantity >= item.product.stock || isSubmitting} aria-label="Increase quantity">+</button>
                      </div>
                      <strong className="item-total">৳ {(price * item.quantity).toLocaleString("bn-BD")}</strong>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="line" />

            {(name || phone || district || upazila || address) && (
              <div className="customer-preview">
                <h3>আপনার তথ্য</h3>
                {name && <p><span>নাম</span><strong>{name}</strong></p>}
                {phone && <p><span>ফোন</span><strong>{phone}</strong></p>}
                {district && <p><span>জেলা</span><strong>{district}</strong></p>}
                {upazila && <p><span>উপজেলা</span><strong>{upazila}</strong></p>}
                {address && <p><span>ঠিকানা</span><strong>{address}</strong></p>}
              </div>
            )}

            <div className="line" />

            <div className="summary-row">
              <span>Subtotal</span>
              <strong>৳ {subtotal.toLocaleString("bn-BD")}</strong>
            </div>

            <div className="summary-row">
              <span>Delivery Charge</span>
              <strong className={hasFreeDelivery ? "free-value" : ""}>
                {hasFreeDelivery ? "FREE 🎉" : `৳ ${deliveryCharge.toLocaleString("bn-BD")}`}
              </strong>
            </div>

            <div className="line" />

            <div className="total-row">
              <span>Total</span>
              <strong>৳ {grandTotal.toLocaleString("bn-BD")}</strong>
            </div>

            <div className="secure">🔒 Secure Checkout</div>
          </aside>
        </div>
      </div>

      <style jsx>{`
        /* ✨ লাল রঙের এরর টেক্সট */
        .error-text {
          display: block;
          margin-top: 5px;
          color: #d32f2f;
          font-size: 12px;
          font-weight: 700;
          animation: slideDown 0.2s ease-out;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .page { min-height: 75vh; padding: 38px 0 70px; background: radial-gradient(circle at top left, rgba(255, 230, 239, 0.55), transparent 30%), #fff; font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
        .container { width: min(1180px, calc(100% - 24px)); margin: 0 auto; }
        .heading { margin-bottom: 25px; }
        .eyebrow { margin: 0 0 6px; color: #a9416e; font-size: 11px; font-weight: 800; letter-spacing: 1px; }
        .heading h1 { margin: 0; font-size: 36px; }
        .heading > p:last-child { margin: 8px 0 0; color: #88757d; font-size: 13px; }
        .layout { display: grid; grid-template-columns: minmax(0, 1fr) 390px; gap: 22px; align-items: start; }
        .form-card, .summary { border: 1px solid rgba(93, 67, 77, 0.1); border-radius: 24px; background: rgba(255, 255, 255, 0.9); box-shadow: 0 16px 35px rgba(83, 53, 66, 0.07); }
        .form-card { padding: 24px; }
        .form-card h2, .payment h2, .delivery-section h2 { margin: 0 0 18px; font-size: 19px; }
        .field { margin-bottom: 16px; }
        .field label { display: block; margin-bottom: 7px; font-size: 13px; font-weight: 700; color: #4d3f45; }
        .field input, .field textarea, .field select { width: 100%; border: 1px solid rgba(93, 67, 77, 0.14); border-radius: 14px; outline: none; padding: 13px 14px; background: #fff; color: #201a1d; font-size: 14px; resize: vertical; transition: border-color 0.2s ease, box-shadow 0.2s ease; }
        .field select { cursor: pointer; resize: none; }
        .field select:disabled { background: #f5f1f3; color: #9a8b92; cursor: not-allowed; }
        .field input:disabled, .field textarea:disabled { background: #f5f1f3; cursor: not-allowed; opacity: 0.7; }
        .field small { display: block; margin-top: 5px; color: #a06d83; font-size: 10px; }
        .field input:focus, .field textarea:focus, .field select:focus { border-color: #bd7696; box-shadow: 0 0 0 4px rgba(189, 118, 150, 0.08); }
        .address-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .delivery-section { margin: 24px 0; }
        .delivery-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 14px; }
        .delivery-header h2 { margin: 0; font-size: 19px; }
        .auto-badge { display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; border-radius: 20px; background: linear-gradient(135deg, #fdf2f8, #f7e6ef); border: 1px solid #edc9dc; color: #8a3d5f; font-size: 10px; font-weight: 800; letter-spacing: 0.3px; }
        .auto-badge.free { background: linear-gradient(135deg, #d5efe0, #c1e8d1); border-color: #b7dfc8; color: #1f6a42; }
        .delivery-auto-card { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 16px 18px; border-radius: 16px; background: linear-gradient(135deg, #fdf2f8, #f7e6ef); border: 1px solid #edc9dc; animation: deliveryIn 0.4s ease-out; }
        .delivery-auto-card.free { background: linear-gradient(135deg, #e8f7ee, #d5efe0); border-color: #b7dfc8; }
        @keyframes deliveryIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .delivery-auto-card.empty { justify-content: center; background: #faf5f7; border: 1px dashed #d9c4cd; padding: 22px 16px; }
        .delivery-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .delivery-icon { width: 44px; height: 44px; flex: 0 0 44px; display: grid; place-items: center; border-radius: 12px; background: #fff; font-size: 22px; box-shadow: 0 4px 12px rgba(169, 65, 110, 0.12); }
        .delivery-icon.free { box-shadow: 0 4px 12px rgba(31, 107, 66, 0.18); animation: freeIconPulse 2s ease-in-out infinite; }
        @keyframes freeIconPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
        .delivery-info { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
        .delivery-info strong { color: #4d1f36; font-size: 14px; font-weight: 900; }
        .delivery-info strong.free-text { color: #1f6a42; }
        .delivery-info span { color: #8a5d75; font-size: 11.5px; font-weight: 600; }
        .delivery-charge { color: #a9416e; font-size: 20px; font-weight: 900; white-space: nowrap; letter-spacing: -0.3px; }
        .delivery-charge.free { color: #1f6a42; font-size: 22px; letter-spacing: 1px; }
        .delivery-empty-icon { font-size: 26px; margin-right: 10px; }
        .delivery-empty-text { color: #8a5d75; font-size: 12.5px; font-weight: 600; }
        .payment { margin-top: 24px; }
        .payment-option { display: flex; align-items: center; justify-content: space-between; gap: 15px; padding: 15px; border: 1px solid #c38ba5; border-radius: 16px; background: #fbf0f5; }
        .payment-option strong { display: block; font-size: 14px; }
        .payment-option span:not(.checked) { display: block; margin-top: 4px; color: #88757d; font-size: 12px; }
        .checked { width: 28px; height: 28px; flex: 0 0 28px; display: grid; place-items: center; border-radius: 50%; background: #a9416e; color: #fff; font-weight: 900; }
        .place-order { width: 100%; margin-top: 22px; min-height: 50px; border: 0; border-radius: 15px; background: #241d22; color: #fff; font-size: 14px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 9px; transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease, opacity 0.2s ease; }
        .place-order:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 14px 28px rgba(36, 29, 34, 0.24); }
        .place-order:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
        .btn-spinner { width: 14px; height: 14px; border: 2px solid rgba(255, 255, 255, 0.35); border-top-color: #fff; border-radius: 50%; animation: btnSpin 0.7s linear infinite; }
        @keyframes btnSpin { to { transform: rotate(360deg); } }
        .summary { position: sticky; top: 100px; padding: 22px; }
        .summary-title { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .summary-title h2 { margin: 0; font-size: 20px; }
        .summary-title span { color: #88757d; font-size: 12px; }
        .items { display: grid; gap: 12px; margin-top: 18px; }
        .item { padding: 12px; border-radius: 16px; background: #fdfafb; border: 1px solid #f2e6ed; display: flex; flex-direction: column; gap: 10px; transition: box-shadow 0.2s ease; }
        .item:hover { box-shadow: 0 8px 20px rgba(83, 53, 66, 0.06); }
        .item-top { display: grid; grid-template-columns: 56px minmax(0, 1fr) auto; gap: 10px; align-items: flex-start; }
        .item-image { width: 56px; height: 56px; overflow: hidden; border-radius: 12px; display: grid; place-items: center; background: linear-gradient(145deg, #f8dde7, #ebe3ff); font-size: 24px; flex-shrink: 0; }
        .item-image img { width: 100%; height: 100%; object-fit: cover; }
        .item-info { min-width: 0; }
        .item-info h3 { margin: 0; font-size: 13px; line-height: 1.35; color: #30262b; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
        .item-info p { margin: 3px 0; color: #a9416e; font-size: 10px; font-weight: 700; }
        .item-free-tag { display: inline-flex; align-items: center; gap: 3px; margin: 2px 0; padding: 2px 7px; border-radius: 10px; background: #d5efe0; color: #1f6a42; font-size: 9px; font-weight: 800; letter-spacing: 0.2px; }
        .item-unit-price { color: #88757d; font-size: 11px; font-weight: 600; }
        .item-remove { width: 26px; height: 26px; flex-shrink: 0; padding: 0; border: 0; border-radius: 50%; background: #fbe9ed; color: #b14f79; font-size: 18px; font-weight: 700; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s ease, transform 0.2s ease; }
        .item-remove:hover:not(:disabled) { background: #f4d7df; transform: scale(1.08); }
        .item-remove:disabled { opacity: 0.5; cursor: not-allowed; }
        .item-bottom { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .qty-control { display: inline-flex; align-items: center; border: 1px solid #eadde3; border-radius: 10px; background: #fff; overflow: hidden; }
        .qty-btn { width: 30px; height: 30px; border: 0; background: transparent; color: #4d3f45; font-size: 15px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: background 0.2s ease, color 0.2s ease; }
        .qty-btn:hover:not(:disabled) { background: #faf1f6; color: #a9416e; }
        .qty-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .qty-value { min-width: 30px; text-align: center; font-size: 12.5px; font-weight: 800; color: #30262b; }
        .item-total { font-size: 13px; font-weight: 900; color: #30262b; white-space: nowrap; }
        .customer-preview { padding: 14px; border-radius: 15px; background: #faf5f7; }
        .customer-preview h3 { margin: 0 0 10px; font-size: 14px; }
        .customer-preview p { display: flex; justify-content: space-between; gap: 10px; margin: 7px 0; font-size: 11px; }
        .customer-preview p span { color: #88757d; flex: 0 0 auto; }
        .customer-preview p strong { text-align: right; word-break: break-word; }
        .line { height: 1px; margin: 18px 0; background: rgba(93, 67, 77, 0.08); }
        .summary-row, .total-row { display: flex; justify-content: space-between; gap: 12px; }
        .summary-row { margin-top: 11px; color: #76676e; font-size: 13px; }
        .summary-row strong { color: #201a1d; }
        .summary-row strong.free-value { color: #1f6a42; font-weight: 900; }
        .total-row { align-items: center; font-size: 17px; }
        .secure { margin-top: 18px; padding: 10px; border-radius: 11px; background: #f6f2f4; text-align: center; color: #76676e; font-size: 11px; }
        @media (max-width: 850px) { .layout { grid-template-columns: 1fr; } .summary { position: static; } }
        @media (max-width: 600px) { .page { padding-top: 25px; } .heading h1 { font-size: 30px; } .form-card, .summary { border-radius: 20px; } .form-card { padding: 17px; } .summary { padding: 17px; } .address-grid { grid-template-columns: 1fr; } .customer-preview p { align-items: flex-start; flex-direction: column; gap: 2px; } .customer-preview p strong { text-align: left; } .delivery-charge { font-size: 18px; } .delivery-charge.free { font-size: 20px; } }
      `}</style>
    </main>
  );
}