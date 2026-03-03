import React from "react";

// Derive a stable hue from the dept name for color variety
function deptColor(name = "") {
  const hues = [211, 142, 280, 25, 160, 340, 55, 190];
  const idx = name.charCodeAt(0) % hues.length;
  return hues[idx];
}

export default function DepartmentBadge({ department, className = "" }) {
  if (!department) return null;
  const hue = deptColor(department.name);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${className}`}
      style={{
        background: `hsl(${hue} 70% 90%)`,
        color: `hsl(${hue} 60% 30%)`,
      }}
    >
      {department.name}
    </span>
  );
}
