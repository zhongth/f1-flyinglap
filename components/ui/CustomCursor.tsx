"use client";

/**
 * Adapted from React Bits CustomCursor (https://pro.reactbits.dev/docs/components/custom-cursor)
 * - Dot removed
 * - Targets use querySelectorAll to match multiple elements per selector
 * - Global cursor hiding injected automatically
 */

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  motion,
  useSpring,
  useMotionValue,
  useVelocity,
  useTransform,
} from "motion/react";
import { cn } from "@/lib/utils";

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
  targetPadding?: number;
  mixBlendMode?: React.CSSProperties["mixBlendMode"];
  children?: React.ReactNode;
}

const CustomCursor: React.FC<CustomCursorProps> = ({
  circleSize = 40,
  circleColor = "rgba(255, 255, 255, 0.5)",
  circleStiffness = 450,
  circleDamping = 15,
  circleBorderWidth = 2,
  className,
  circleClassName,
  showOnTouch = false,
  zIndex = 9999,
  elastic = false,
  targets = [],
  targetPadding = -1,
  mixBlendMode,
  children,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [activeElement, setActiveElement] = useState<HTMLElement | null>(null);
  const [activeRect, setActiveRect] = useState<DOMRect | null>(null);

  // Initialize at 0 — cursor is invisible until first mousemove anyway,
  // and using window.innerWidth here causes SSR hydration mismatches.
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);

  const circleWidthMV = useMotionValue(circleSize);
  const circleHeightMV = useMotionValue(circleSize);
  const circleBorderRadiusMV = useMotionValue(circleSize / 2);
  const circleXMV = useMotionValue(0);
  const circleYMV = useMotionValue(0);

  const springConfig = {
    stiffness: 450,
    damping: 32,
    mass: 0.4,
  };

  const circleWidth = useSpring(circleWidthMV, springConfig);
  const circleHeight = useSpring(circleHeightMV, springConfig);
  const circleBorderRadius = useSpring(circleBorderRadiusMV, springConfig);
  const circleXSpring = useSpring(circleXMV, springConfig);
  const circleYSpring = useSpring(circleYMV, springConfig);

  const cursorFollowX = useSpring(cursorX, {
    stiffness: circleStiffness,
    damping: circleDamping,
    mass: 0.3,
  });
  const cursorFollowY = useSpring(cursorY, {
    stiffness: circleStiffness,
    damping: circleDamping,
    mass: 0.3,
  });

  const velocityX = useVelocity(cursorX);
  const velocityY = useVelocity(cursorY);

  const scaleX = useTransform(velocityX, [-1000, 0, 1000], [0.85, 1, 1.15]);
  const scaleY = useTransform(velocityY, [-1000, 0, 1000], [0.85, 1, 1.15]);

  const isOnTarget = activeElement !== null;

  const currentTargetData = useMemo(() => {
    if (!activeElement || !activeRect) return null;
    const borderRadiusValue =
      parseFloat(window.getComputedStyle(activeElement).borderRadius) || 16;
    return { rect: activeRect, borderRadiusValue };
  }, [activeElement, activeRect]);

  const isCircle = useMemo(() => {
    if (!currentTargetData) return false;
    const { rect, borderRadiusValue } = currentTargetData;
    return (
      Math.abs(rect.width - rect.height) < 1 &&
      borderRadiusValue >= rect.width / 2 - 1
    );
  }, [currentTargetData]);

  // Update circle spring targets when hovering/leaving targets
  useEffect(() => {
    if (isOnTarget && currentTargetData) {
      const { rect, borderRadiusValue } = currentTargetData;
      const newWidth = rect.width + targetPadding * 2;
      const newHeight = rect.height + targetPadding * 2;

      circleWidthMV.set(newWidth);
      circleHeightMV.set(newHeight);

      if (isCircle) {
        circleBorderRadiusMV.set(newWidth / 2);
      } else {
        circleBorderRadiusMV.set(borderRadiusValue + targetPadding);
      }

      circleXMV.set(rect.left + rect.width / 2);
      circleYMV.set(rect.top + rect.height / 2);
    } else if (!isOnTarget) {
      circleWidthMV.set(circleSize);
      circleHeightMV.set(circleSize);
      circleBorderRadiusMV.set(circleSize / 2);

      const unsubX = cursorFollowX.on("change", (v) => circleXMV.set(v));
      const unsubY = cursorFollowY.on("change", (v) => circleYMV.set(v));

      return () => {
        unsubX();
        unsubY();
      };
    }
  }, [
    isOnTarget,
    currentTargetData,
    circleSize,
    circleWidthMV,
    circleHeightMV,
    circleBorderRadiusMV,
    circleXMV,
    circleYMV,
    cursorFollowX,
    cursorFollowY,
    targetPadding,
    isCircle,
  ]);

  // Attach mouseenter/mouseleave to all elements matching target selectors
  useEffect(() => {
    if (!targets || targets.length === 0) return;

    const cleanupFunctions: (() => void)[] = [];

    const attachListeners = () => {
      cleanupFunctions.forEach((cleanup) => cleanup());
      cleanupFunctions.length = 0;

      targets.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => {
          const element = el as HTMLElement;

          const enterHandler = () => {
            const rect = element.getBoundingClientRect();
            setActiveElement(element);
            setActiveRect(rect);
          };

          const leaveHandler = () => {
            setActiveElement((prev) => (prev === element ? null : prev));
            setActiveRect((prev) => {
              // Only clear if this element is the active one
              return prev ? null : prev;
            });
          };

          element.addEventListener("mouseenter", enterHandler);
          element.addEventListener("mouseleave", leaveHandler);

          cleanupFunctions.push(() => {
            element.removeEventListener("mouseenter", enterHandler);
            element.removeEventListener("mouseleave", leaveHandler);
          });
        });
      });
    };

    attachListeners();

    let debounceTimer: NodeJS.Timeout;
    const debouncedAttach = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        attachListeners();
      }, 200);
    };

    const observer = new MutationObserver(() => {
      debouncedAttach();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Update rects on scroll/resize
    const updateActiveRect = () => {
      setActiveElement((el) => {
        if (el) {
          setActiveRect(el.getBoundingClientRect());
        }
        return el;
      });
    };

    window.addEventListener("scroll", updateActiveRect, true);
    window.addEventListener("resize", updateActiveRect);

    return () => {
      observer.disconnect();
      clearTimeout(debounceTimer);
      cleanupFunctions.forEach((cleanup) => cleanup());
      window.removeEventListener("scroll", updateActiveRect, true);
      window.removeEventListener("resize", updateActiveRect);
    };
  }, [targets]);

  // Touch detection and mouse tracking
  useEffect(() => {
    const hasTouch =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0;
    setIsTouchDevice(hasTouch);

    const handleMouseMove = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseEnter = () => setIsVisible(true);
    const handleMouseLeave = () => setIsVisible(false);

    if (!hasTouch || showOnTouch) {
      window.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseenter", handleMouseEnter);
      document.addEventListener("mouseleave", handleMouseLeave);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseenter", handleMouseEnter);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [cursorX, cursorY, isVisible, showOnTouch]);

  // Hide native cursor globally
  useEffect(() => {
    if (isTouchDevice && !showOnTouch) return;

    const style = document.createElement("style");
    style.setAttribute("data-custom-cursor", "");
    style.textContent = "*, *::before, *::after { cursor: none !important; }";
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, [isTouchDevice, showOnTouch]);

  if (isTouchDevice && !showOnTouch) {
    return null;
  }

  return (
    <div
      className={cn("pointer-events-none fixed inset-0", className)}
      style={{ zIndex }}
    >
      {/* Outer Circle */}
      <motion.div
        className={cn(
          "absolute flex items-center justify-center",
          circleClassName,
        )}
        style={{
          width: circleWidth,
          height: circleHeight,
          borderRadius: circleBorderRadius,
          left: circleXSpring,
          top: circleYSpring,
          x: "-50%",
          y: "-50%",
          border: `${circleBorderWidth}px solid ${circleColor}`,
          opacity: isVisible ? 1 : 0,
          scaleX: elastic && !isOnTarget ? scaleX : 1,
          scaleY: elastic && !isOnTarget ? scaleY : 1,
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
