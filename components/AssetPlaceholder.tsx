import React from "react";

interface AssetPlaceholderProps {
  type: "driver" | "car" | "garage" | "logo";
  label?: string;
  aspectRatio?: string;
  className?: string;
}

export default function AssetPlaceholder({
  type,
  label,
  aspectRatio = "auto",
  className = "",
}: AssetPlaceholderProps) {
  // Default labels based on type
  const defaultLabels = {
    driver: "DRIVER PNG HERE",
    car: "CAR PNG HERE",
    garage: "GARAGE PHOTO HERE",
    logo: "TEAM LOGO HERE",
  };

  const displayLabel = label || defaultLabels[type];

  return (
    <div
      className={`relative overflow-hidden bg-white/5 border border-dashed border-white/20 ${className}`}
      style={{ aspectRatio }}
    >
      {/* Scanline overlay animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-x-0 h-8 bg-gradient-to-b from-transparent via-white/5 to-transparent scanline" />
      </div>

      {/* Centered label */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-f1-reg text-white/40 text-sm tracking-wider uppercase px-4 text-center">
          {displayLabel}
        </span>
      </div>

      {/* Corner markers (tech aesthetic) */}
      <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-white/20" />
      <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-white/20" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-white/20" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-white/20" />
    </div>
  );
}
