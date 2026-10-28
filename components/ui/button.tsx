import React from "react";

export default function Button({ children, variant = "primary", className = "", ...props }: any) {
  return (
    <button className={`custom-btn ${variant} ${className}`} {...props}>
      {children}
      <style jsx>{`
        .custom-btn {
          padding: 10px 20px;
          border-radius: 12px;
          font-weight: 800;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .custom-btn.primary {
          background: #7d3355;
          color: white;
        }
        .custom-btn.primary:hover {
          background: #5e233d;
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(125, 51, 85, 0.3);
        }
        .custom-btn.outline {
          background: transparent;
          color: #7d3355;
          border: 1px solid #7d3355;
        }
        .custom-btn.outline:hover {
          background: #f7e6ef;
        }
      `}</style>
    </button>
  );
}