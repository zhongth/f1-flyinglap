"use client";

/**
 * Interactive target cursor indicator.
 *
 * Behaviour:
 * – Native cursor remains default on regular content
 * – Custom indicator appears only over interactive elements
 * – Active interactive element gets `cursor: none` while indicator is shown
 */

import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_INTERACTIVE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "summary",
  "label[for]",
  "input:not([type='hidden']):not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[role='button']",
  "[role='link']",
  "[role='menuitem']",
  "[role='tab']",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])",
  "[data-cursor-interactive]",
];

const isHTMLElement = (target: EventTarget | null): target is HTMLElement =>
  target instanceof HTMLElement;

export interface CustomCursorProps {
  circleSize?: number;
  circleColor?: string;
  circleStiffness?: number;
  circleDamping?: number;
  circleBorderWidth?: number;
  className?: string;
  circleClassName?: string;
  showOnTouch?: boolean;
  zIndex?: number;
  elastic?: boolean;
  targets?: string[];
  mixBlendMode?: React.CSSProperties["mixBlendMode"];
  children?: React.ReactNode;
}

const CustomCursor: React.FC<CustomCursorProps> = ({
  circleSize = 28,
  circleColor = "rgba(107, 114, 128, 0.45)",
  circleStiffness = 450,
  circleDamping = 28,
  circleBorderWidth = 0,
  className,
  circleClassName,
  showOnTouch = false,
  zIndex = 9999,
  elastic = false,
  targets = [],
  mixBlendMode,
  children,
}) => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const activeElRef = useRef<HTMLElement | null>(null);
  const activeElInlineCursorRef = useRef<string | null>(null);

  const interactiveSelector = useMemo(
    () =>
      [...new Set([...DEFAULT_INTERACTIVE_SELECTORS, ...targets])].join(", "),
    [targets],
  );

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const posX = useSpring(0, {
    stiffness: circleStiffness,
    damping: circleDamping,
    mass: 0.3,
  });
  const posY = useSpring(0, {
    stiffness: circleStiffness,
    damping: circleDamping,
    mass: 0.3,
  });

  const morphCfg = { stiffness: 450, damping: 36, mass: 0.4 };
  const width = useSpring(circleSize, morphCfg);
  const height = useSpring(circleSize, morphCfg);
  const borderRadius = useSpring(circleSize / 2, morphCfg);

  const opacity = useSpring(0, { stiffness: 500, damping: 40, mass: 0.25 });

  const velX = useVelocity(rawX);
  const velY = useVelocity(rawY);
  const rawScaleX = useTransform(velX, [-1000, 0, 1000], [0.85, 1, 1.15]);
  const rawScaleY = useTransform(velY, [-1000, 0, 1000], [0.85, 1, 1.15]);
  const scaleX = useTransform(rawScaleX, (value) => (elastic ? value : 1));
  const scaleY = useTransform(rawScaleY, (value) => (elastic ? value : 1));

  useEffect(() => {
    width.set(circleSize);
    height.set(circleSize);
    borderRadius.set(circleSize / 2);
  }, [borderRadius, circleSize, height, width]);

  const setActiveTarget = useCallback(
    (target: HTMLElement | null) => {
      if (activeElRef.current === target) {
        return;
      }

      if (activeElRef.current) {
        activeElRef.current.style.cursor =
          activeElInlineCursorRef.current ?? "";
      }

      activeElRef.current = target;
      activeElInlineCursorRef.current = null;

      if (target) {
        activeElInlineCursorRef.current = target.style.cursor;
        target.style.cursor = "none";
        opacity.set(1);
        return;
      }

      opacity.set(0);
    },
    [opacity],
  );

  const resolveInteractiveTarget = useCallback(
    (eventTarget: EventTarget | null): HTMLElement | null => {
      if (!isHTMLElement(eventTarget)) {
        return null;
      }

      // Keep the current target stable while moving within it.
      if (activeElRef.current?.contains(eventTarget)) {
        return activeElRef.current;
      }

      const semanticHit = eventTarget.closest(
        interactiveSelector,
      ) as HTMLElement | null;
      if (semanticHit) {
        return semanticHit;
      }

      return null;
    },
    [interactiveSelector],
  );

  useEffect(() => {
    const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(hasTouch);
    if (hasTouch && !showOnTouch) return;

    const onMove = (e: MouseEvent) => {
      rawX.set(e.clientX);
      rawY.set(e.clientY);
      posX.set(e.clientX);
      posY.set(e.clientY);
      setActiveTarget(resolveInteractiveTarget(e.target));
    };

    const onLeave = () => {
      setActiveTarget(null);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    window.addEventListener("blur", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("blur", onLeave);
      setActiveTarget(null);
    };
  }, [
    showOnTouch,
    posX,
    posY,
    rawX,
    rawY,
    resolveInteractiveTarget,
    setActiveTarget,
  ]);

  if (isTouchDevice && !showOnTouch) return null;

  return (
    <div
      className={cn("pointer-events-none fixed inset-0", className)}
      style={{ zIndex }}
    >
      <motion.div
        className={cn(
          "absolute flex items-center justify-center",
          circleClassName,
        )}
        style={{
          width,
          height,
          borderRadius,
          left: posX,
          top: posY,
          x: "-50%",
          y: "-50%",
          border:
            circleBorderWidth > 0
              ? `${circleBorderWidth}px solid ${circleColor}`
              : "none",
          backgroundColor: circleColor,
          opacity,
          scaleX,
          scaleY,
          mixBlendMode,
          willChange: "transform, width, height, border-radius",
        }}
      >
        {children}
      </motion.div>
    </div>
  );
};

export default CustomCursor;
