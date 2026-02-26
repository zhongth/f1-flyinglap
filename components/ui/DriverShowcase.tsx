"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import { getHeightScale } from "@/data/drivers";
import type { Driver, Team } from "@/types";

interface DriverShowcaseProps {
  driver: Driver;
  team: Team;
  position: "left" | "right";
  onClick?: () => void;
}

export function DriverShowcase({
  driver,
  team,
  position,
  onClick,
}: DriverShowcaseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLDivElement>(null);

  // Entry animation
  useEffect(() => {
    if (!containerRef.current) return;

    const direction = position === "left" ? -1 : 1;

    const ctx = gsap.context(() => {
      // Image slides in
      gsap.fromTo(
        imageRef.current,
        { x: direction * 300, opacity: 0, scale: 1.1 },
        { x: 0, opacity: 1, scale: 1, duration: 1, ease: "power3.out", delay: 0.2 }
      );

      // Number fades in
      gsap.fromTo(
        numberRef.current,
        { opacity: 0, y: 50 },
        { opacity: 0.4, y: 0, duration: 0.8, ease: "power2.out", delay: 0.5 }
      );

      // Info slides up
      gsap.fromTo(
        infoRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", delay: 0.7 }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [position]);

  // Calculate height-based scale (taller drivers = larger portraits)
  const heightScale = getHeightScale(driver.heightCm);
  // Scale between 85% and 100% of container height based on driver height
  const imageHeightPercent = 65 + (heightScale * 20); // 65-85% range

  // Hover effects
  const handleMouseEnter = () => {
    if (!imageRef.current) return;
    gsap.to(imageRef.current, {
      scale: 1.03,
      duration: 0.4,
      ease: "power2.out",
    });
  };

  const handleMouseLeave = () => {
    if (!imageRef.current) return;
    gsap.to(imageRef.current, {
      scale: 1,
      duration: 0.4,
      ease: "power2.out",
    });
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-full flex flex-col cursor-pointer group",
        position === "left" ? "items-start" : "items-end"
      )}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Giant driver number - top corner, hollow style */}
      <div
        ref={numberRef}
        className={cn(
          "absolute top-8 font-f1-bold text-[10rem] md:text-[14rem] lg:text-[18rem] leading-none pointer-events-none select-none z-0 text-hollow",
          position === "left" ? "left-8" : "right-8"
        )}
        style={{ "--stroke-color": team.primaryColor } as React.CSSProperties}
      >
        {driver.number}
      </div>

      {/* Driver image container - height based on real driver height */}
      <div
        ref={imageRef}
        className={cn(
          "relative w-full will-change-transform mt-12",
          position === "left" ? "-ml-16 lg:-ml-24" : "-mr-16 lg:-mr-24"
        )}
        style={{ height: `${imageHeightPercent}vh` }}
      >
        {/* Backlight glow */}
        <div
          className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[120%] h-[60%] blur-[100px] opacity-40 z-0"
          style={{
            background: `radial-gradient(ellipse at bottom, ${team.primaryColor} 0%, transparent 70%)`,
          }}
        />

        {/* Driver image */}
        <Image
          src={driver.portraitPath}
          alt={`${driver.firstName} ${driver.lastName}`}
          fill
          className="object-contain object-bottom z-10"
          priority
        />

        {/* Bottom gradient fade */}
      </div>

      {/* Driver info - glass card style */}
      <div
        ref={infoRef}
        className={cn(
          "absolute bottom-8 z-10",
          position === "left" ? "left-8" : "right-8"
        )}
      >
        {/* Glass card */}
        <div
          className={cn(
            "relative px-12 py-10 overflow-hidden",
            position === "left" ? "text-left" : "text-right"
          )}
        >


          {/* Name */}
          <div>
            <p className="font-northwell text-white/80 text-6xl md:text-7xl -mb-1">
              {driver.firstName}
            </p>
            <p
              className={cn(
                "font-f1-bold text-5xl md:text-6xl lg:text-7xl uppercase",
                position === "left" ? "ml-4" : "mr-4"
              )}
              style={{ color: team.primaryColor }}
            >
              {driver.lastName}
            </p>
          </div>


          {/* Hover hint */}
          <div className="mt-4 flex items-center gap-2 text-white/30 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
            <span>View stats</span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
