"use client";

import { useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";
import { cn, getTeamDarkColors } from "@/lib/utils";
import type { Driver, Team } from "@/types";
import type { PedigreeTier } from "@/data/drivers";

interface DriverShowcaseProps {
  driver: Driver;
  team: Team;
  position: "left" | "right";
  q3Rate?: number; // 0–1
  pedigreeLabel?: string;
  pedigreeTier?: PedigreeTier;
  onClick?: () => void;
}

export function DriverShowcase({
  driver,
  team,
  position,
  q3Rate,
  pedigreeLabel,
  pedigreeTier,
  onClick,
}: DriverShowcaseProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLParagraphElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  const darkColors = useMemo(
    () => getTeamDarkColors(team.primaryColor),
    [team.primaryColor]
  );

  const isLeft = position === "left";

  // Entry animation — only animate inner elements, NOT the outer div
  useEffect(() => {
    if (!cardRef.current) return;

    const dir = isLeft ? -1 : 1;

    const ctx = gsap.context(() => {
      if (imageRef.current) {
        gsap.fromTo(
          imageRef.current,
          { x: dir * 40, opacity: 0, scale: 1.05 },
          {
            x: 0,
            opacity: 1,
            scale: 1,
            duration: 1,
            ease: "power3.out",
            delay: 0.3,
          }
        );
      }

      if (numberRef.current) {
        gsap.fromTo(
          numberRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", delay: 0.4 }
        );
      }

      if (nameRef.current) {
        gsap.fromTo(
          nameRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", delay: 0.6 }
        );
      }

      if (statsRef.current) {
        gsap.fromTo(
          statsRef.current,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", delay: 0.7 }
        );
      }
    }, cardRef);

    return () => ctx.revert();
  }, [isLeft]);

  return (
    <div
      ref={cardRef}
      data-driver-card
      className="relative cursor-pointer group shrink-0"
      style={{
        width: 480,
        height: 606,
        borderRadius: 40,
        backgroundColor: darkColors.cardBg,
        border: `3px solid ${darkColors.cardBorder}`,
      }}
      onClick={onClick}
    >
      {/* Driver portrait - overflows card bounds */}
      <div
        ref={imageRef}
        className={cn(
          "absolute will-change-transform",
          isLeft ? "right-0" : "left-[2%]"
        )}
        style={{ top: "-9%", width: "52%", height: "130%" }}
      >
        <Image
          src={driver.portraitPath}
          alt={`${driver.firstName} ${driver.lastName}`}
          fill
          sizes="250px"
          className="object-contain object-bottom"
          priority
        />
      </div>

      {/* Driver number */}
      <p
        ref={numberRef}
        className={cn(
          "absolute font-f1-bold leading-[1.36] z-10",
          isLeft ? "left-[40px] top-[26px]" : "right-[21px] top-[8px]"
        )}
        style={{ color: darkColors.cardBorder, fontSize: 128 }}
      >
        {driver.number}
      </p>

      {/* Team logo */}
      <div
        className={cn(
          "absolute z-10",
          isLeft
            ? "left-[40px] top-[200px] w-[34px] h-[44px]"
            : "right-[33px] top-[182px] w-[27px] h-[36px]"
        )}
      >
        <Image
          src={team.logoPath}
          alt={team.shortName}
          fill
          sizes="34px"
          className="object-contain"
        />
      </div>

      {/* Driver name + pedigree */}
      <div
        ref={nameRef}
        className={cn(
          "absolute bottom-[44px] z-10 leading-[1.36]",
          isLeft ? "left-[40px] text-left" : "right-[18px] text-right"
        )}
      >
        <p className="font-northwell text-white text-[64px]">
          {driver.firstName}
        </p>
        <p className="font-f1-bold text-white text-[40px] uppercase">
          {driver.lastName}
        </p>
        {pedigreeLabel && (
          <span
            className={cn(
              "inline-block mt-2 px-3 py-0.5 rounded-full text-[11px] font-f1-bold uppercase tracking-wider",
              pedigreeTier === "champion"
                ? "bg-amber-500/20 text-amber-400"
                : pedigreeTier === "winner"
                  ? "bg-white/15 text-white/80"
                  : pedigreeTier === "podium"
                    ? "bg-white/10 text-white/60"
                    : "bg-white/8 text-white/40"
            )}
          >
            {pedigreeLabel}
          </span>
        )}
      </div>

      {/* Q3 rate stat */}
      {q3Rate !== undefined && (
        <div
          ref={statsRef}
          className={cn(
            "absolute z-10",
            isLeft ? "left-[40px] top-[260px]" : "right-[18px] top-[242px]",
            isLeft ? "text-left" : "text-right"
          )}
        >
          <span className="text-[12px] font-f1 text-white/40 uppercase tracking-wider">
            Q3{" "}
          </span>
          <span className="text-[16px] font-f1-bold text-white/70 tabular-nums">
            {Math.round(q3Rate * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}
