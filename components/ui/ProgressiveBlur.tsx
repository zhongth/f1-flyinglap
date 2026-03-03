"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

type BlurPosition = "top" | "bottom" | "left" | "right";

export interface ProgressiveBlurProps {
  className?: string;
  size?: string;
  position?: BlurPosition;
  blurLevels?: number[];
  tintOpacity?: number;
}

const POSITION_CLASSNAMES: Record<BlurPosition, string> = {
  top: "inset-x-0 top-0",
  bottom: "inset-x-0 bottom-0",
  left: "inset-y-0 left-0",
  right: "inset-y-0 right-0",
};

const buildMaskGradient = (
  position: BlurPosition,
  transparentStart: number,
  opaqueStart: number,
  opaqueEnd: number,
  transparentEnd: number,
) =>
  `linear-gradient(to ${position}, rgba(0,0,0,0) ${transparentStart}%, rgba(0,0,0,1) ${opaqueStart}%, rgba(0,0,0,1) ${opaqueEnd}%, rgba(0,0,0,0) ${transparentEnd}%)`;

const buildEdgeMaskGradient = (
  position: BlurPosition,
  transparentStart: number,
  opaqueEnd: number,
) =>
  `linear-gradient(to ${position}, rgba(0,0,0,0) ${transparentStart}%, rgba(0,0,0,1) ${opaqueEnd}%)`;

const blurLayerStyle = (blurPx: number, maskImage: string): CSSProperties => ({
  backdropFilter: `blur(${blurPx}px)`,
  WebkitBackdropFilter: `blur(${blurPx}px)`,
  maskImage,
  WebkitMaskImage: maskImage,
});

const buildTintGradient = (position: BlurPosition, tintOpacity: number) =>
  `linear-gradient(to ${position === "left" ? "right" : position === "right" ? "left" : position === "top" ? "bottom" : "top"}, rgba(0,0,0,${tintOpacity}) 0%, rgba(0,0,0,${Math.max(0, tintOpacity * 0.45)}) 45%, rgba(0,0,0,0) 100%)`;

export function ProgressiveBlur({
  className,
  size = "14%",
  position = "bottom",
  blurLevels = [0.5, 1, 2, 4, 8, 16, 32, 64],
  tintOpacity = 0.72,
}: ProgressiveBlurProps) {
  const layerCount = Math.max(0, blurLevels.length - 2);
  const isHorizontal = position === "left" || position === "right";

  return (
    <div
      className={cn(
        "pointer-events-none absolute z-20",
        POSITION_CLASSNAMES[position],
        className,
      )}
      style={isHorizontal ? { width: size, height: "100%" } : { height: size }}
    >
      <div
        className="absolute inset-0"
        style={{
          zIndex: 0,
          background: buildTintGradient(position, tintOpacity),
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          zIndex: 1,
          ...blurLayerStyle(
            blurLevels[0] ?? 0,
            buildMaskGradient(position, 0, 12.5, 25, 37.5),
          ),
        }}
      />

      {Array.from({ length: layerCount }, (_, index) => {
        const blurIndex = index + 1;
        const startPercent = blurIndex * 12.5;
        const midPercent = (blurIndex + 1) * 12.5;
        const endPercent = (blurIndex + 2) * 12.5;
        const tailPercent = Math.min(100, endPercent + 12.5);

        return (
          <div
            key={`blur-layer-${blurIndex}`}
            className="absolute inset-0"
            style={{
              zIndex: blurIndex + 1,
              ...blurLayerStyle(
                blurLevels[blurIndex] ?? 0,
                buildMaskGradient(
                  position,
                  startPercent,
                  midPercent,
                  endPercent,
                  tailPercent,
                ),
              ),
            }}
          />
        );
      })}

      <div
        className="absolute inset-0"
        style={{
          zIndex: blurLevels.length + 1,
          ...blurLayerStyle(
            blurLevels[blurLevels.length - 1] ?? 0,
            buildEdgeMaskGradient(position, 87.5, 100),
          ),
        }}
      />
    </div>
  );
}

export default ProgressiveBlur;
