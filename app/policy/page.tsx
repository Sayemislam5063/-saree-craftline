"use client";

import Link from "next/link";

export default function PolicyPage() {
  return (
    <main className="policy-page">
      <div className="policy-container">
        
        <Link href="/" className="back-link">
          ← হোমপেজে ফিরে যান
        </Link>

        <div className="policy-content">
          <h1 className="main-title">আমাদের নীতিমালা</h1>
          <p className="subtitle">
            Saree Craftline থেকে কেনাকাটার আগে আমাদের প্রাইভেসি এবং ডেলিভারি পলিসি সম্পর্কে জেনে নিন।
          </p>

          {/* ============ প্রাইভেসি পলিসি ============ */}
          <section className="policy-section">
            <h2 className="section-title">🔒 Privacy Policy (প্রাইভেসি পলিসি)</h2>
            
            <div className="policy-card">
              <h3>১. আমরা কী কী তথ্য সংগ্রহ করি?</h3>
              <p>
                অর্ডার প্রসেস করার জন্য আমরা আপনার নাম, মোবাইল নাম্বার, সম্পূর্ণ ডেলিভারি ঠিকানা এবং ইমেইল অ্যাড্রেস সংগ্রহ করি। এছাড়া ওয়েবসাইটের অভিজ্ঞতা উন্নত করতে আমরা কিছু ব্রাউজিং ডেটা ট্র্যাক করি।
              </p>

              <h3>২. তথ্যগুলো কীভাবে ব্যবহার করা হয়?</h3>
              <p>
                আপনার তথ্য শুধুমাত্র অর্ডার ডেলিভারি, কাস্টমার সাপোর্ট এবং আপনার অর্ডার সম্পর্কিত আপডেট পাঠানোর জন্য ব্যবহার করা হয়। আমরা কখনোই আপনার ব্যক্তিগত তথ্য তৃতীয় পক্ষের কাছে বিক্রি বা শেয়ার করি না।
              </p>

              <h3>৩. আপনার নিরাপত্তা</h3>
              <p>
                আপনার ব্যক্তিগত তথ্যের নিরাপত্তা নিশ্চিত করতে আমরা আধুনিক সিকিউরিটি সিস্টেম ব্যবহার করি। তবে ইন্টারনেটে কোনো কিছু ১০০% নিরাপদ নয়, তাই সতর্ক থাকার অনুরোধ করা হলো।
              </p>
            </div>
          </section>

          {/* ============ ডেলিভারি পলিসি ============ */}
          <section className="policy-section">
            <h2 className="section-title">🚚 Delivery Policy (ডেলিভারি পলিসি)</h2>
            
            <div className="policy-card">
              <h3>১. ডেলিভারি চার্জ</h3>
              <p>
                ঢাকার ভিতরে ডেলিভারি চার্জ <strong>১১০ টাকা</strong> এবং ঢাকার বাইরে <strong>১৩০ টাকা</strong>। তবে, আমাদের কিছু নির্দিষ্ট প্রোডাক্টে 'Free Delivery' বা ফ্রি ডেলিভারি সুবিধা রয়েছে।
              </p>

              <h3>২. ডেলিভারি সময়</h3>
              <p>
                সাধারণত ঢাকার ভিতরে <strong>১-২ দিন</strong> এবং ঢাকার বাইরে <strong>৩-4 দিনের</strong> মধ্যে পণ্য পৌঁছে দেওয়া হয়। তবে প্রাকৃতিক দুর্যোগ বা কুরিয়ার সংক্রান্ত জটিলতার কারণে কিছুটা দেরি হতে পারে।
              </p>

              <h3>৩. ক্যাশ অন ডেলিভারি (COD)</h3>
              <p>
                গ্রাহকরা পণ্য হাতে পেয়ে টাকা পরিশোধ করতে পারবেন (Cash on Delivery)। পণ্য গ্রহণের সময় কুরিয়ার এজেন্টকে টাকা দেওয়ার আগে পণ্যটি ভালোভাবে চেক করে নেওয়ার অনুরোধ করা হচ্ছে।
              </p>

              <h3>৪. ডেলিভারি ট্র্যাকিং</h3>
              <p>
                অর্ডার কনফার্ম হওয়ার পর আপনি আমাদের ওয়েবসাইটের <Link href="/order-tracking" className="inline-link">Track Order</Link> পেজে গিয়ে আপনার মোবাইল নাম্বার দিয়ে আপনার পার্সেলের সর্বশেষ অবস্থা জানতে পারবেন।
              </p>
            </div>
          </section>
        </div>
      </div>

      <style jsx>{`
        .policy-page {
          min-height: 80vh;
          padding: 50px 20px 80px;
          background: radial-gradient(circle at top left, rgba(255, 230, 239, 0.5), transparent 40%), #faf7f8;
          font-family: "Inter", sans-serif;
        }
        .policy-container {
          max-width: 850px;
          margin: 0 auto;
        }
        .back-link {
          display: inline-block;
          margin-bottom: 25px;
          color: #a9416e;
          text-decoration: none;
          font-weight: 800;
          font-size: 14px;
          transition: transform 0.2s;
        }
        .back-link:hover {
          transform: translateX(-4px);
        }
        .policy-content {
          background: white;
          padding: 40px;
          border-radius: 24px;
          box-shadow: 0 10px 40px rgba(83, 53, 66, 0.08);
          border: 1px solid #eadde3;
        }
        .main-title {
          font-size: 32px;
          font-weight: 900;
          color: #2b1f26;
          margin: 0 0 10px;
          text-align: center;
        }
        .subtitle {
          text-align: center;
          color: #88757d;
          font-size: 14px;
          margin-bottom: 40px;
        }
        .policy-section {
          margin-bottom: 40px;
        }
        .section-title {
          font-size: 20px;
          font-weight: 900;
          color: #a9416e;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 2px dashed #f0e7eb;
        }
        .policy-card {
          background: #fdfafb;
          padding: 25px;
          border-radius: 16px;
          border: 1px solid #f0e7eb;
        }
        .policy-card h3 {
          font-size: 16px;
          font-weight: 800;
          color: #392f35;
          margin: 20px 0 8px;
        }
        .policy-card h3:first-child {
          margin-top: 0;
        }
        .policy-card p {
          color: #6b5b63;
          line-height: 1.8;
          font-size: 14px;
          margin: 0;
        }
        .inline-link {
          color: #a9416e;
          font-weight: 800;
          text-decoration: underline;
        }

        @media (max-width: 600px) {
          .policy-content {
            padding: 25px 20px;
          }
          .main-title {
            font-size: 26px;
          }
          .section-title {
            font-size: 18px;
          }
          .policy-card {
            padding: 20px;
          }
        }
      `}</style>
    </main>
  );
}