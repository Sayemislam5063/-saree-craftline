import React, { forwardRef } from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && <label className="text-sm font-bold text-gray-700">{label}</label>}
        <select
          ref={ref}
          className={`w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 focus:bg-white outline-none cursor-pointer transition-all duration-200 focus:border-[#7d3355] focus:ring-2 focus:ring-[#7d3355]/20 ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
);

Select.displayName = "Select";
export default Select;