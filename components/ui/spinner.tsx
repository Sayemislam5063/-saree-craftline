import React from "react";

export default function Spinner() {
  return (
    <div className="spinner-wrapper">
      <div className="spinner"></div>
      <style jsx>{`
        .spinner-wrapper { display: flex; justify-content: center; align-items: center; padding: 20px; }
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e5dfe1;
          border-top-color: #3f0d20;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}