import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  color?: "success" | "danger" | "warning" | "default";
}

export default function Badge({ children, color = "default" }: BadgeProps) {
  const colors = {
    success: "bg-green-100 text-green-700 border-green-200",
    danger: "bg-red-100 text-red-700 border-red-200",
    warning: "bg-yellow-100 text-yellow-700 border-yellow-200",
    default: "bg-gray-100 text-gray-700 border-gray-200",
  };

  return (
    <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${colors[color]}`}>
      {children}
    </span>
  );
}