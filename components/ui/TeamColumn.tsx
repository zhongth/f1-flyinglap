"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import type { Team } from "@/types";

interface TeamColumnProps {
  team: Team;
  index: number;
  isHovered: boolean;
  isAnyHovered: boolean;
  onHover: (teamId: string | null) => void;
  onClick: (teamId: string) => void;
}

export function TeamColumn({
  team,
  index,
  isHovered,
  isAnyHovered,
  onHover,
  onClick,
}: TeamColumnProps) {
  const columnRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Hover animation
  useEffect(() => {
    if (!logoRef.current || !overlayRef.current) return;

    if (isHovered) {
      // Logo: full color, scale up
      gsap.to(logoRef.current, {
        filter: "grayscale(0%) brightness(1)",
        scale: 1.1,
        duration: 0.3,
        ease: "power2.out",
      });
      // Overlay: reveal team color
      gsap.to(overlayRef.current, {
        opacity: 0.15,
        duration: 0.3,
        ease: "power2.out",
      });
    } else {
      // Logo: grayscale, normal scale
      gsap.to(logoRef.current, {
        filter: "grayscale(100%) brightness(0.6)",
        scale: 1,
        duration: 0.3,
        ease: "power2.out",
      });
      // Overlay: hide
      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.3,
        ease: "power2.out",
      });
    }
  }, [isHovered]);

  return (
    <div
      ref={columnRef}
      data-team={team.id}
      data-index={index}
      className={cn(
        "team-column relative h-full cursor-pointer overflow-hidden transition-[flex-grow] duration-300 ease-out",
        "border-r border-white/5 last:border-r-0",
        "flex items-center justify-center",
        isHovered ? "flex-[2]" : isAnyHovered ? "flex-[0.8]" : "flex-[1]"
      )}
      onMouseEnter={() => onHover(team.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(team.id)}
    >
      {/* Team color overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0 opacity-0 transition-opacity"
        style={{
          background: `linear-gradient(180deg, ${team.primaryColor}00 0%, ${team.primaryColor} 50%, ${team.primaryColor}00 100%)`,
        }}
      />

      {/* Vertical line accent */}
      <div
        className={cn(
          "absolute left-0 top-0 h-full w-[2px] transition-opacity duration-300",
          isHovered ? "opacity-100" : "opacity-0"
        )}
        style={{ backgroundColor: team.primaryColor }}
      />

      {/* Logo container */}
      <div
        ref={logoRef}
        id={`team-logo-${team.id}`}
        className="relative z-10 w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 will-animate"
        style={{
          filter: "grayscale(100%) brightness(0.6)",
        }}
      >
        <Image
          src={team.logoPath}
          alt={team.name}
          fill
          className="object-contain"
          priority={index < 5}
        />
      </div>

      {/* Team name (visible on hover) */}
      <div
        className={cn(
          "absolute bottom-8 left-0 right-0 text-center transition-all duration-300",
          isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        <span
          className="font-f1-wide text-xs md:text-sm tracking-wider uppercase"
          style={{ color: team.primaryColor }}
        >
          {team.shortName}
        </span>
      </div>
    </div>
  );
}
