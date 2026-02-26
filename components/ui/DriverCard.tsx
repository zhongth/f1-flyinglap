"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import type { Driver } from "@/types";
import type { Team } from "@/types";

interface DriverCardProps {
  driver: Driver;
  team: Team;
  position: "left" | "right";
  onClick?: () => void;
  animateIn?: boolean;
}

export function DriverCard({
  driver,
  team,
  position,
  onClick,
  animateIn = true,
}: DriverCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);

  // Entrance animation
  useEffect(() => {
    if (!cardRef.current || !animateIn) return;

    const ctx = gsap.context(() => {
      const direction = position === "left" ? -1 : 1;

      // Image slides in from outside
      gsap.fromTo(
        imageRef.current,
        { x: direction * 200, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.7, ease: "power3.out", delay: 0.2 }
      );

      // Name fades in
      gsap.fromTo(
        nameRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "power2.out", delay: 0.5 }
      );
    }, cardRef);

    return () => ctx.revert();
  }, [animateIn, position]);

  // Hover animation
  const handleMouseEnter = () => {
    if (!imageRef.current) return;
    gsap.to(imageRef.current, {
      scale: 1.02,
      duration: 0.3,
      ease: "power2.out",
    });
  };

  const handleMouseLeave = () => {
    if (!imageRef.current) return;
    gsap.to(imageRef.current, {
      scale: 1,
      duration: 0.3,
      ease: "power2.out",
    });
  };

  return (
    <div
      ref={cardRef}
      data-driver={driver.id}
      className={cn(
        "relative flex flex-col items-center cursor-pointer group",
        position === "left" ? "items-start" : "items-end"
      )}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Driver portrait - larger for immersive view */}
      <div
        ref={imageRef}
        className="relative w-72 h-[24rem] md:w-96 md:h-[32rem] lg:w-[28rem] lg:h-[36rem] xl:w-[32rem] xl:h-[40rem] will-animate"
      >
        <Image
          src={driver.portraitPath}
          alt={`${driver.firstName} ${driver.lastName}`}
          fill
          className="object-contain object-bottom"
          priority
        />

        {/* Gradient overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[var(--background)] to-transparent" />
      </div>

      {/* Driver info */}
      <div
        ref={nameRef}
        className={cn(
          "mt-4 text-center",
          position === "left" ? "text-left" : "text-right"
        )}
      >
        {/* Driver number */}
        <div
          className="font-f1-bold text-7xl md:text-8xl lg:text-9xl opacity-20 leading-none"
          style={{ color: team.primaryColor }}
        >
          {driver.number}
        </div>

        {/* Driver name */}
        <div className="-mt-10 relative z-10">
          <p className="font-f1 text-base md:text-lg text-white/60 uppercase tracking-wider">
            {driver.firstName}
          </p>
          <p
            className="font-f1-wide text-3xl md:text-4xl lg:text-5xl uppercase tracking-wide"
            style={{ color: team.primaryColor }}
          >
            {driver.lastName}
          </p>
        </div>

        {/* Abbreviation badge */}
        <div
          className={cn(
            "inline-block mt-3 px-3 py-1 rounded text-xs font-f1-bold tracking-wider",
            "bg-white/10 text-white/80"
          )}
        >
          {driver.abbreviation}
        </div>
      </div>

      {/* Click hint */}
      <div
        className={cn(
          "absolute bottom-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
          "text-xs text-white/40"
        )}
      >
        Click for details
      </div>
    </div>
  );
}
