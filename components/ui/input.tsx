import React, { forwardRef } from "react";

const Input = forwardRef<HTMLInputElement, any>(({ label, error, className = "", ...props }, ref) => {
  return (
    <div className="custom-input-group">
      {label && <label className="custom-label">{label}</label>}
      <input ref={ref} className={`custom-input ${error ? "has-error" : ""} ${className}`} {...props} />
      {error && <span className="custom-error">{error}</span>}
      
      <style jsx>{`
        .custom-input-group { display: flex; flex-direction: column; gap: 6px; width: 100%; }
        .custom-label { font-size: 13px; font-weight: 800; color: #4b3b43; }
        .custom-input {
          width: 100%;
          padding: 12px 15px;
          border-radius: 12px;
          border: 1px solid #eadfe5;
          background: #fcfafb;
          font-size: 14px;
          outline: none;
          transition: all 0.2s ease;
        }
        .custom-input:focus {
          border-color: #7d3355;
          background: white;
          box-shadow: 0 0 0 3px rgba(125, 51, 85, 0.1);
        }
        .custom-input.has-error { border-color: #d32f2f; }
        .custom-error { font-size: 12px; color: #d32f2f; font-weight: 600; }
      `}</style>
    </div>
  );
});

Input.displayName = "Input";
export default Input;