"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface CarouselProps {
  items: React.ReactNode[];
  initialIndex?: number;
  cardWidth?: number;
  cardAspectRatio?: number;
  gap?: number;
  onCardClick?: (index: number) => void;
  disabled?: boolean;
  className?: string;
}

export function Carousel({
  items,
  initialIndex = 0,
  cardWidth = 340,
  cardAspectRatio = 17 / 10,
  gap = 24,
  onCardClick,
  disabled = false,
  className,
}: CarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  // Calculate side padding so the first/last card can be centered
  const getSidePadding = useCallback(() => {
    if (!carouselRef.current) return 0;
    return (carouselRef.current.clientWidth - cardWidth) / 2;
  }, [cardWidth]);

  // Scroll to a specific card index
  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      if (!carouselRef.current) return;
      const padding = getSidePadding();
      const scrollTarget = index * (cardWidth + gap);
      carouselRef.current.scrollTo({ left: scrollTarget, behavior });
    },
    [cardWidth, gap, getSidePadding],
  );

  // Initial scroll position (no animation)
  useEffect(() => {
    if (!carouselRef.current || items.length === 0) return;
    // Wait one frame for layout
    requestAnimationFrame(() => {
      scrollToIndex(initialIndex, "instant");
      setReady(true);
    });
  }, [items.length, initialIndex, scrollToIndex]);

  const handleClick = useCallback(
    (index: number) => {
      if (disabled) return;
      scrollToIndex(index);
      onCardClick?.(index);
    },
    [disabled, scrollToIndex, onCardClick],
  );

  // Translate vertical mouse wheel into horizontal scroll
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      // Use whichever axis has the larger delta
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta === 0) return;
      e.preventDefault();
      el.scrollBy({ left: delta, behavior: "auto" });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div
      ref={carouselRef}
      className={cn(
        "flex w-full overflow-x-auto overscroll-x-auto scroll-smooth [scrollbar-width:none] snap-x snap-mandatory",
        className,
      )}
      style={{
        paddingLeft: `max(${gap}px, calc((100% - ${cardWidth}px) / 2))`,
        paddingRight: `max(${gap}px, calc((100% - ${cardWidth}px) / 2))`,
        opacity: ready ? 1 : 0,
      }}
    >
      <div
        className="flex flex-row items-end"
        style={{ gap: `${gap}px` }}
      >
        {items.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              delay: 0.05 * index,
              ease: "easeOut",
            }}
            className={cn("shrink-0 snap-center", disabled ? "cursor-default" : "cursor-pointer")}
            style={{
              width: `${cardWidth}px`,
              aspectRatio: `${cardAspectRatio}`,
            }}
            onClick={() => handleClick(index)}
          >
            {item}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
