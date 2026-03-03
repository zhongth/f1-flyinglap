"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { gsap } from "@/lib/gsap";
import { cn } from "@/lib/utils";

export interface GradientCarouselItem {
  /** Unique identifier for stable rendering */
  id: string | number;
  /** Optional image source (kept for compatibility with image-only usage) */
  image?: string;
  /** Optional custom card content */
  content?: ReactNode;
  /** Optional card background (e.g., gradient) */
  background?: string;
  /** Optional stronger background for the centered/active card */
  activeBackground?: string;
  /** Optional primary color override for animated backdrop */
  primaryColor?: string;
  /** Optional secondary color override for animated backdrop */
  secondaryColor?: string;
  /** Optional image alt text */
  alt?: string;
  /** Optional per-card class override */
  cardClassName?: string;
}

export interface GradientCarouselProps {
  /** Legacy array of image URLs to display in the carousel */
  images?: string[];
  /** Rich item list with optional custom content */
  items?: GradientCarouselItem[];
  /** Additional CSS classes for the wrapper */
  className?: string;
  /** Additional CSS classes for each card wrapper */
  cardClassName?: string;
  /** Additional CSS classes for custom content wrapper */
  contentClassName?: string;
  /** Render animated canvas backdrop behind cards */
  showBackdrop?: boolean;
  /** Render loading overlay while initializing */
  showLoadingOverlay?: boolean;
  /** Maximum rotation angle for cards in degrees */
  maxRotationDegrees?: number;
  /** Maximum depth on Z-axis in pixels */
  maxDepthPx?: number;
  /** Minimum scale factor for cards */
  minScale?: number;
  /** Gap between cards in pixels */
  cardGap?: number;
  /** Velocity decay factor (0-1, lower = more friction) */
  frictionFactor?: number;
  /** Mouse wheel sensitivity multiplier */
  wheelSensitivity?: number;
  /** Drag sensitivity multiplier */
  dragSensitivity?: number;
  /** Blur intensity for background gradient */
  backgroundBlur?: number;
  /** Size of the gradient (0-1, affects radius) */
  gradientSize?: number;
  /** Intensity/opacity of the gradient (0-1) */
  gradientIntensity?: number;
  /** Enable keyboard arrow keys navigation */
  enableKeyboard?: boolean;
  /** Callback when active card changes */
  onCardChange?: (index: number) => void;
  /** Callback when the active card is tapped (not dragged) */
  onCardClick?: (index: number) => void;
  /** Fixed card width in pixels (falls back to responsive width if omitted) */
  cardWidthPx?: number;
  /** Aspect ratio of cards (width/height) */
  cardAspectRatio?: number;
  /** Initial card index to display */
  initialIndex?: number;
  /** Play an intro spin animation on first load */
  introSpin?: boolean;
  /** Number of full rounds to travel during intro spin */
  introSpinRounds?: number;
  /** Duration of intro spin in milliseconds */
  introSpinDurationMs?: number;
  /** Callback fired when intro spin completes */
  onIntroComplete?: () => void;
}

interface CardItem {
  element: HTMLDivElement;
  surface?: HTMLDivElement;
  position: number;
}

interface ColorPair {
  primary: number[];
  secondary: number[];
}

interface GradientState {
  r1: number;
  g1: number;
  b1: number;
  r2: number;
  g2: number;
  b2: number;
}

const GradientCarousel: React.FC<GradientCarouselProps> = ({
  images = [],
  items,
  className = "",
  cardClassName = "",
  contentClassName = "",
  showBackdrop = true,
  showLoadingOverlay = true,
  maxRotationDegrees = 28,
  maxDepthPx = 140,
  minScale = 0.92,
  cardGap = 28,
  frictionFactor = 0.92,
  wheelSensitivity = 0.5,
  dragSensitivity = 1.2,
  backgroundBlur = 32,
  gradientSize = 0.65,
  gradientIntensity = 0.7,
  enableKeyboard = true,
  onCardChange,
  onCardClick,
  cardWidthPx,
  cardAspectRatio = 4 / 5,
  initialIndex = 0,
  introSpin = false,
  introSpinRounds = 1,
  introSpinDurationMs = 2600,
  onIntroComplete,
}) => {
  const stableItems = useMemo<GradientCarouselItem[]>(
    () =>
      items && items.length > 0
        ? items
        : images.map((src, index) => ({
            id: index,
            image: src,
            alt: `Carousel item ${index + 1}`,
          })),
    [items, images],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardsRef = useRef<CardItem[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const bgAnimationFrameRef = useRef<number | null>(null);
  const showBackdropRef = useRef(showBackdrop);
  const introSpinRef = useRef(introSpin);
  const introSpinRoundsRef = useRef(introSpinRounds);
  const introSpinDurationRef = useRef(introSpinDurationMs);
  const onIntroCompleteRef = useRef(onIntroComplete);

  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  const velocityRef = useRef(0);
  const scrollOffsetRef = useRef(0);
  const lastTimeRef = useRef(0);
  const isDraggingRef = useRef(false);
  const lastPointerXRef = useRef(0);
  const lastPointerTimeRef = useRef(0);
  const lastDeltaRef = useRef(0);
  const pointerStartXRef = useRef(0);
  const pointerStartYRef = useRef(0);
  const cardWidthRef = useRef(300);
  const cardHeightRef = useRef(400);
  const cardStepRef = useRef(328);
  const totalTrackLengthRef = useRef(0);
  const viewportHalfRef = useRef(0);
  const colorPaletteRef = useRef<ColorPair[]>([]);
  const currentGradientRef = useRef<GradientState>({
    r1: 240,
    g1: 240,
    b1: 240,
    r2: 235,
    g2: 235,
    b2: 235,
  });
  const activeCardIndexRef = useRef(-1);
  const lastBgDrawTimeRef = useRef(0);
  const fastRenderUntilRef = useRef(0);
  const pointerDownCardIndexRef = useRef<number | null>(null);
  const snapTweenRef = useRef<ReturnType<typeof gsap.to> | null>(null);
  const introPlayedRef = useRef(false);
  const introAnimatingRef = useRef(false);

  useEffect(() => {
    showBackdropRef.current = showBackdrop;
  }, [showBackdrop]);

  useEffect(() => {
    introSpinRef.current = introSpin;
  }, [introSpin]);

  useEffect(() => {
    introSpinRoundsRef.current = introSpinRounds;
  }, [introSpinRounds]);

  useEffect(() => {
    introSpinDurationRef.current = introSpinDurationMs;
  }, [introSpinDurationMs]);

  useEffect(() => {
    onIntroCompleteRef.current = onIntroComplete;
  }, [onIntroComplete]);

  const wrapValue = useCallback((value: number, max: number): number => {
    return ((value % max) + max) % max;
  }, []);

  const rgbToHsl = useCallback(
    (r: number, g: number, b: number): [number, number, number] => {
      r /= 255;
      g /= 255;
      b /= 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0;
      let s = 0;
      const l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r:
            h = (g - b) / d + (g < b ? 6 : 0);
            break;
          case g:
            h = (b - r) / d + 2;
            break;
          default:
            h = (r - g) / d + 4;
            break;
        }
        h /= 6;
      }
      return [h * 360, s, l];
    },
    [],
  );

  const hslToRgb = useCallback(
    (h: number, s: number, l: number): [number, number, number] => {
      h = ((h % 360) + 360) % 360;
      h /= 360;
      let r: number, g: number, b: number;
      if (s === 0) {
        r = g = b = l;
      } else {
        const hue2rgb = (p: number, q: number, t: number) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1 / 6) return p + (q - p) * 6 * t;
          if (t < 1 / 2) return q;
          if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
          return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
      }
      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    },
    [],
  );

  const generateFallbackColors = useCallback(
    (index: number): ColorPair => {
      const h = (index * 37) % 360;
      const s = 0.65;
      const primary = hslToRgb(h, s, 0.52);
      const secondary = hslToRgb(h, s, 0.72);
      return { primary, secondary };
    },
    [hslToRgb],
  );

  const parseHexColor = useCallback(
    (value?: string): [number, number, number] | null => {
      if (!value) return null;
      const normalized = value.trim().replace(/^#/, "");
      const expanded =
        normalized.length === 3
          ? normalized
              .split("")
              .map((c) => c + c)
              .join("")
          : normalized;
      if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return null;
      const intValue = Number.parseInt(expanded, 16);
      return [(intValue >> 16) & 255, (intValue >> 8) & 255, intValue & 255];
    },
    [],
  );

  const extractImageColors = useCallback(
    (img: HTMLImageElement, index: number): ColorPair => {
      try {
        const maxSize = 48;
        const aspectRatio =
          img.naturalWidth && img.naturalHeight
            ? img.naturalWidth / img.naturalHeight
            : 1;
        const tempWidth =
          aspectRatio >= 1
            ? maxSize
            : Math.max(16, Math.round(maxSize * aspectRatio));
        const tempHeight =
          aspectRatio >= 1
            ? Math.max(16, Math.round(maxSize / aspectRatio))
            : maxSize;

        const canvas = document.createElement("canvas");
        canvas.width = tempWidth;
        canvas.height = tempHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return generateFallbackColors(index);

        ctx.drawImage(img, 0, 0, tempWidth, tempHeight);
        const imageData = ctx.getImageData(0, 0, tempWidth, tempHeight).data;

        const hueBins = 36;
        const satBins = 5;
        const totalBins = hueBins * satBins;
        const weightSum = new Float32Array(totalBins);
        const redSum = new Float32Array(totalBins);
        const greenSum = new Float32Array(totalBins);
        const blueSum = new Float32Array(totalBins);

        for (let i = 0; i < imageData.length; i += 4) {
          const alpha = imageData[i + 3] / 255;
          if (alpha < 0.05) continue;
          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];
          const [h, s, l] = rgbToHsl(r, g, b);
          if (l < 0.1 || l > 0.92 || s < 0.08) continue;
          const weight = alpha * (s * s) * (1 - Math.abs(l - 0.5) * 0.6);
          const hueIndex = Math.max(
            0,
            Math.min(hueBins - 1, Math.floor((h / 360) * hueBins)),
          );
          const satIndex = Math.max(
            0,
            Math.min(satBins - 1, Math.floor(s * satBins)),
          );
          const binIndex = hueIndex * satBins + satIndex;
          weightSum[binIndex] += weight;
          redSum[binIndex] += r * weight;
          greenSum[binIndex] += g * weight;
          blueSum[binIndex] += b * weight;
        }

        let primaryIndex = -1;
        let primaryWeight = 0;
        for (let i = 0; i < totalBins; i++) {
          if (weightSum[i] > primaryWeight) {
            primaryWeight = weightSum[i];
            primaryIndex = i;
          }
        }

        if (primaryIndex < 0 || primaryWeight <= 0)
          return generateFallbackColors(index);

        const primaryHue = Math.floor(primaryIndex / satBins) * (360 / hueBins);
        let secondaryIndex = -1;
        let secondaryWeight = 0;
        for (let i = 0; i < totalBins; i++) {
          const w = weightSum[i];
          if (w <= 0) continue;
          const h = Math.floor(i / satBins) * (360 / hueBins);
          let hueDiff = Math.abs(h - primaryHue);
          hueDiff = Math.min(hueDiff, 360 - hueDiff);
          if (hueDiff >= 25 && w > secondaryWeight) {
            secondaryWeight = w;
            secondaryIndex = i;
          }
        }

        const getAverageRgb = (idx: number): [number, number, number] => {
          const w = weightSum[idx] || 1e-6;
          return [
            Math.round(redSum[idx] / w),
            Math.round(greenSum[idx] / w),
            Math.round(blueSum[idx] / w),
          ];
        };

        const [pr, pg, pb] = getAverageRgb(primaryIndex);
        const [h1, s1Raw] = rgbToHsl(pr, pg, pb);
        const s1 = Math.max(0.45, Math.min(1, s1Raw * 1.15));
        const primary = hslToRgb(h1, s1, 0.5);

        let secondary: [number, number, number];
        if (secondaryIndex >= 0 && secondaryWeight >= primaryWeight * 0.6) {
          const [sr, sg, sb] = getAverageRgb(secondaryIndex);
          const [h2, s2Raw] = rgbToHsl(sr, sg, sb);
          const s2 = Math.max(0.45, Math.min(1, s2Raw * 1.05));
          secondary = hslToRgb(h2, s2, 0.72);
        } else {
          secondary = hslToRgb(h1, s1, 0.72);
        }
        return { primary, secondary };
      } catch {
        return generateFallbackColors(index);
      }
    },
    [rgbToHsl, hslToRgb, generateFallbackColors],
  );

  const calculateCardTransform = useCallback(
    (screenPositionX: number) => {
      const normalizedPosition = Math.max(
        -1,
        Math.min(1, screenPositionX / viewportHalfRef.current),
      );
      const absNormalized = Math.abs(normalizedPosition);
      const inverseNormalized = 1 - absNormalized;
      const rotateY = -normalizedPosition * maxRotationDegrees;
      const translateZ = inverseNormalized * maxDepthPx;
      const scaleRange = 0.1;
      const scale = minScale + inverseNormalized * scaleRange;
      return {
        transform: `translate3d(-50%,-50%,0) translate3d(${screenPositionX}px,0,${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
        zDepth: translateZ,
      };
    },
    [maxRotationDegrees, maxDepthPx, minScale],
  );

  const updateActiveGradient = useCallback((index: number) => {
    if (
      index < 0 ||
      index >= colorPaletteRef.current.length ||
      index === activeCardIndexRef.current
    )
      return;
    activeCardIndexRef.current = index;
    const colors = colorPaletteRef.current[index] || {
      primary: [240, 240, 240],
      secondary: [235, 235, 235],
    };
    const targetState = {
      r1: colors.primary[0],
      g1: colors.primary[1],
      b1: colors.primary[2],
      r2: colors.secondary[0],
      g2: colors.secondary[1],
      b2: colors.secondary[2],
    };
    fastRenderUntilRef.current = performance.now() + 800;
    gsap.to(currentGradientRef.current, {
      ...targetState,
      duration: 0.45,
      ease: "power2.out",
    });
  }, []);

  const updateAllCardTransforms = useCallback(() => {
    if (
      cardsRef.current.length === 0 ||
      totalTrackLengthRef.current <= 0 ||
      viewportHalfRef.current <= 0
    ) {
      return;
    }

    const halfTrack = totalTrackLengthRef.current / 2;
    const wrappedPositions = new Float32Array(cardsRef.current.length);
    let closestIndex = -1;
    let closestDistance = Infinity;

    for (let i = 0; i < cardsRef.current.length; i++) {
      const card = cardsRef.current[i];
      let relativePos = card.position - scrollOffsetRef.current;
      if (relativePos < -halfTrack) relativePos += totalTrackLengthRef.current;
      if (relativePos > halfTrack) relativePos -= totalTrackLengthRef.current;
      wrappedPositions[i] = relativePos;
      const distance = Math.abs(relativePos);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    }

    const prevIndex =
      (closestIndex - 1 + cardsRef.current.length) % cardsRef.current.length;
    const nextIndex = (closestIndex + 1) % cardsRef.current.length;

    for (let i = 0; i < cardsRef.current.length; i++) {
      const card = cardsRef.current[i];
      const pos = wrappedPositions[i];
      const norm = Math.max(-1, Math.min(1, pos / viewportHalfRef.current));
      const { transform, zDepth } = calculateCardTransform(pos);
      const isActive = i === closestIndex;
      card.element.style.transform = transform;
      card.element.style.zIndex = String(1000 + Math.round(zDepth));
      const isCoreCard =
        i === closestIndex || i === prevIndex || i === nextIndex;
      const blurAmount = isCoreCard ? 0 : 2 * Math.abs(norm) ** 1.1;
      card.element.style.filter = `blur(${blurAmount.toFixed(2)}px)`;

      const item = stableItems[i];
      if (card.surface && item) {
        const defaultBackground = item.background ?? "";
        const activeBackground = item.activeBackground ?? defaultBackground;
        card.surface.style.background = isActive
          ? activeBackground
          : defaultBackground;
        card.surface.style.borderColor = isActive
          ? "rgba(255, 255, 255, 0.18)"
          : "rgba(255, 255, 255, 0.06)";
        const teamColor = item.primaryColor ?? "255, 255, 255";
        card.surface.style.boxShadow = isActive
          ? `0 24px 48px rgba(0, 0, 0, 0.45), 0 0 40px ${teamColor}20, inset 0 0 0 1px rgba(255, 255, 255, 0.10)`
          : "0 12px 32px rgba(0, 0, 0, 0.30)";
      }
    }

    if (closestIndex !== activeCardIndexRef.current && closestIndex >= 0) {
      if (showBackdropRef.current) {
        updateActiveGradient(closestIndex);
      } else {
        activeCardIndexRef.current = closestIndex;
      }
      if (onCardChange) {
        onCardChange(closestIndex);
      }
    }
  }, [calculateCardTransform, stableItems, updateActiveGradient, onCardChange]);

  const focusCardIndex = useCallback(
    (index: number) => {
      const cardCount = cardsRef.current.length;
      const totalLength = totalTrackLengthRef.current;
      if (cardCount === 0 || totalLength <= 0) return;
      if (index < 0 || index >= cardCount) return;

      const targetOffset = index * cardStepRef.current;
      const currentOffset = scrollOffsetRef.current;
      const deltas = [
        targetOffset - currentOffset,
        targetOffset - currentOffset + totalLength,
        targetOffset - currentOffset - totalLength,
      ];
      const shortestDelta = deltas.reduce((best, delta) =>
        Math.abs(delta) < Math.abs(best) ? delta : best,
      );

      const tweenState = { offset: currentOffset };
      snapTweenRef.current?.kill();
      velocityRef.current = 0;

      snapTweenRef.current = gsap.to(tweenState, {
        offset: currentOffset + shortestDelta,
        duration: 0.36,
        ease: "power3.out",
        onUpdate: () => {
          scrollOffsetRef.current = wrapValue(tweenState.offset, totalLength);
          updateAllCardTransforms();
        },
        onComplete: () => {
          scrollOffsetRef.current = wrapValue(targetOffset, totalLength);
          updateAllCardTransforms();
        },
      });
    },
    [updateAllCardTransforms, wrapValue],
  );

  const runIntroSpin = useCallback(
    (targetIndex: number): boolean => {
      const cardCount = cardsRef.current.length;
      const totalLength = totalTrackLengthRef.current;
      if (cardCount === 0 || totalLength <= 0) return false;
      if (targetIndex < 0 || targetIndex >= cardCount) return false;

      const rounds = Math.max(0.25, introSpinRoundsRef.current);
      const durationSec = Math.max(0.4, introSpinDurationRef.current / 1000);
      const targetOffset = targetIndex * cardStepRef.current;
      const startOffset = targetOffset - totalLength * rounds;
      const tweenState = { offset: startOffset };

      snapTweenRef.current?.kill();
      velocityRef.current = 0;
      introAnimatingRef.current = true;
      scrollOffsetRef.current = wrapValue(startOffset, totalLength);
      updateAllCardTransforms();

      snapTweenRef.current = gsap.to(tweenState, {
        offset: targetOffset,
        duration: durationSec,
        ease: "power4.out",
        onUpdate: () => {
          scrollOffsetRef.current = wrapValue(tweenState.offset, totalLength);
          updateAllCardTransforms();
        },
        onComplete: () => {
          scrollOffsetRef.current = wrapValue(targetOffset, totalLength);
          introAnimatingRef.current = false;
          updateAllCardTransforms();
          setIsReady(true);
          onIntroCompleteRef.current?.();
        },
      });

      return true;
    },
    [updateAllCardTransforms, wrapValue],
  );

  const animationLoop = useCallback(
    (timestamp: number) => {
      if (totalTrackLengthRef.current <= 0) {
        animationFrameRef.current = requestAnimationFrame(animationLoop);
        return;
      }

      if (introAnimatingRef.current) {
        lastTimeRef.current = timestamp;
        animationFrameRef.current = requestAnimationFrame(animationLoop);
        return;
      }

      const deltaTime = lastTimeRef.current
        ? (timestamp - lastTimeRef.current) / 1000
        : 0;
      lastTimeRef.current = timestamp;
      scrollOffsetRef.current = wrapValue(
        scrollOffsetRef.current + velocityRef.current * deltaTime,
        totalTrackLengthRef.current,
      );
      const decayFactor = frictionFactor ** (deltaTime * 60);
      velocityRef.current *= decayFactor;
      if (Math.abs(velocityRef.current) < 0.02) velocityRef.current = 0;
      updateAllCardTransforms();
      animationFrameRef.current = requestAnimationFrame(animationLoop);
    },
    [wrapValue, frictionFactor, updateAllCardTransforms],
  );

  const renderBackground = useCallback(
    function renderBg() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) return;

      const now = performance.now();
      const minInterval = now < fastRenderUntilRef.current ? 16 : 33;
      if (now - lastBgDrawTimeRef.current < minInterval) {
        bgAnimationFrameRef.current = requestAnimationFrame(renderBg);
        return;
      }
      lastBgDrawTimeRef.current = now;

      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const tw = Math.floor(w * dpr);
      const th = Math.floor(h * dpr);
      if (canvas.width !== tw || canvas.height !== th) {
        canvas.width = tw;
        canvas.height = th;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, w, h);

      const time = now * 0.0002;
      const centerX = w * 0.5;
      const centerY = h * 0.5;
      const baseAmplitude = Math.min(w, h) * 0.2;
      const amplitude1 = baseAmplitude * gradientSize;
      const amplitude2 = baseAmplitude * 0.75 * gradientSize;
      const x1 = centerX + Math.cos(time) * amplitude1;
      const y1 = centerY + Math.sin(time * 0.8) * amplitude1 * 0.4;
      const x2 = centerX + Math.cos(-time * 0.9 + 1.2) * amplitude2;
      const y2 = centerY + Math.sin(-time * 0.7 + 0.7) * amplitude2 * 0.5;
      const radius1 = Math.min(w, h) * gradientSize;
      const radius2 = Math.min(w, h) * gradientSize * 0.9;

      const grad1 = ctx.createRadialGradient(x1, y1, 0, x1, y1, radius1);
      const { r1, g1, b1 } = currentGradientRef.current;
      const intensity1 = gradientIntensity;
      const intensity1Mid = gradientIntensity * 0.45;
      grad1.addColorStop(0, `rgba(${r1},${g1},${b1},${intensity1})`);
      grad1.addColorStop(0.6, `rgba(${r1},${g1},${b1},${intensity1Mid})`);
      grad1.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, w, h);

      const grad2 = ctx.createRadialGradient(x2, y2, 0, x2, y2, radius2);
      const { r2, g2, b2 } = currentGradientRef.current;
      const intensity2 = gradientIntensity * 0.85;
      const intensity2Mid = gradientIntensity * 0.35;
      grad2.addColorStop(0, `rgba(${r2},${g2},${b2},${intensity2})`);
      grad2.addColorStop(0.6, `rgba(${r2},${g2},${b2},${intensity2Mid})`);
      grad2.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, w, h);

      bgAnimationFrameRef.current = requestAnimationFrame(renderBg);
    },
    [gradientSize, gradientIntensity],
  );

  useEffect(() => {
    if (!containerRef.current || !cardsContainerRef.current) return;
    if (stableItems.length === 0) {
      setIsLoading(false);
      setIsReady(false);
      return;
    }

    let isCancelled = false;

    const init = async () => {
      cardsRef.current = cardsRef.current.slice(0, stableItems.length);

      const resolvedPalette = await Promise.all(
        stableItems.map(async (item, index) => {
          const fallback = generateFallbackColors(index);
          const primaryFromItem = parseHexColor(item.primaryColor);
          const secondaryFromItem = parseHexColor(item.secondaryColor);

          if (primaryFromItem || secondaryFromItem) {
            return {
              primary: primaryFromItem ?? fallback.primary,
              secondary:
                secondaryFromItem ?? primaryFromItem ?? fallback.secondary,
            };
          }

          const imageSrc = item.image;
          if (!imageSrc) return fallback;

          const imageElement = await new Promise<HTMLImageElement>(
            (resolve) => {
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.onload = () => resolve(img);
              img.onerror = () => resolve(img);
              img.src = imageSrc;
            },
          );

          return extractImageColors(imageElement, index);
        }),
      );
      if (isCancelled) return;

      const containerWidth =
        containerRef.current?.clientWidth || window.innerWidth;
      const sampleCard = cardsRef.current[0]?.element;
      if (sampleCard) {
        const rect = sampleCard.getBoundingClientRect();
        cardWidthRef.current = rect.width || 300;
        cardHeightRef.current = rect.height || 400;
        cardStepRef.current = cardWidthRef.current + cardGap;
        totalTrackLengthRef.current =
          cardsRef.current.length * cardStepRef.current;
        cardsRef.current.forEach((card, i) => {
          card.position = i * cardStepRef.current;
        });
      } else {
        cardWidthRef.current = cardWidthPx ?? 300;
        cardHeightRef.current = cardWidthRef.current / cardAspectRatio;
        cardStepRef.current = cardWidthRef.current + cardGap;
        totalTrackLengthRef.current = stableItems.length * cardStepRef.current;
      }

      viewportHalfRef.current = containerWidth * 0.5;
      colorPaletteRef.current = resolvedPalette;

      const clampedInitialIndex = Math.max(
        0,
        Math.min(initialIndex, cardsRef.current.length - 1),
      );
      scrollOffsetRef.current = clampedInitialIndex * cardStepRef.current;
      updateActiveGradient(clampedInitialIndex);
      updateAllCardTransforms();
      if (onCardChange) {
        onCardChange(clampedInitialIndex);
      }

      setIsLoading(false);
      lastTimeRef.current = 0;
      animationFrameRef.current = requestAnimationFrame(animationLoop);
      if (showBackdropRef.current) {
        bgAnimationFrameRef.current = requestAnimationFrame(renderBackground);
      }

      const shouldPlayIntro = introSpinRef.current && !introPlayedRef.current;
      if (shouldPlayIntro) {
        introPlayedRef.current = true;
        setIsReady(false);
        const started = runIntroSpin(clampedInitialIndex);
        if (!started) {
          introAnimatingRef.current = false;
          setIsReady(true);
        }
      } else {
        setIsReady(true);
      }
    };

    setIsLoading(true);
    setIsReady(false);
    init();

    return () => {
      isCancelled = true;
      introAnimatingRef.current = false;
      snapTweenRef.current?.kill();
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
      if (bgAnimationFrameRef.current)
        cancelAnimationFrame(bgAnimationFrameRef.current);
    };
  }, [
    stableItems,
    initialIndex,
    cardAspectRatio,
    cardGap,
    cardWidthPx,
    animationLoop,
    renderBackground,
    runIntroSpin,
    updateActiveGradient,
    updateAllCardTransforms,
    generateFallbackColors,
    parseHexColor,
    extractImageColors,
    onCardChange,
  ]);

  useEffect(() => {
    const handleResize = () => {
      const prevStep = cardStepRef.current || 1;
      const ratio =
        scrollOffsetRef.current / (cardsRef.current.length * prevStep);
      const sampleCard = cardsRef.current[0]?.element;
      if (sampleCard) {
        const rect = sampleCard.getBoundingClientRect();
        cardWidthRef.current = rect.width || 300;
        cardHeightRef.current = rect.height || 400;
        cardStepRef.current = cardWidthRef.current + cardGap;
        totalTrackLengthRef.current =
          cardsRef.current.length * cardStepRef.current;
        cardsRef.current.forEach((card, i) => {
          card.position = i * cardStepRef.current;
        });
      }
      const containerWidth =
        containerRef.current?.clientWidth || window.innerWidth;
      viewportHalfRef.current = containerWidth * 0.5;
      scrollOffsetRef.current = wrapValue(
        ratio * totalTrackLengthRef.current,
        totalTrackLengthRef.current,
      );
      updateAllCardTransforms();
    };

    let resizeTimeout: ReturnType<typeof setTimeout>;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 80);
    };
    window.addEventListener("resize", debouncedResize);
    return () => window.removeEventListener("resize", debouncedResize);
  }, [cardGap, updateAllCardTransforms, wrapValue]);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (
        !isReady ||
        introAnimatingRef.current ||
        totalTrackLengthRef.current <= 0
      ) {
        return;
      }
      e.preventDefault();
      snapTweenRef.current?.kill();
      const delta =
        Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      velocityRef.current += delta * wheelSensitivity * 20;
    },
    [isReady, wheelSensitivity],
  );

  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      if (!isReady || introAnimatingRef.current) return;
      const eventTarget = e.target instanceof Element ? e.target : null;
      const cardElement = eventTarget?.closest?.("[data-carousel-index]");
      const clickedIndexRaw = cardElement?.getAttribute("data-carousel-index");
      const clickedIndex = clickedIndexRaw ? Number(clickedIndexRaw) : NaN;
      pointerDownCardIndexRef.current = Number.isFinite(clickedIndex)
        ? clickedIndex
        : null;

      snapTweenRef.current?.kill();
      isDraggingRef.current = true;
      setIsDragging(true);
      lastPointerXRef.current = e.clientX;
      lastPointerTimeRef.current = performance.now();
      lastDeltaRef.current = 0;
      pointerStartXRef.current = e.clientX;
      pointerStartYRef.current = e.clientY;
      if (containerRef.current) {
        containerRef.current.setPointerCapture(e.pointerId);
      }
    },
    [isReady],
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDraggingRef.current || totalTrackLengthRef.current <= 0) return;
      const now = performance.now();
      const dx = e.clientX - lastPointerXRef.current;
      const dt = Math.max(1, now - lastPointerTimeRef.current) / 1000;
      scrollOffsetRef.current = wrapValue(
        scrollOffsetRef.current - dx * dragSensitivity,
        totalTrackLengthRef.current,
      );
      lastDeltaRef.current = dx / dt;
      lastPointerXRef.current = e.clientX;
      lastPointerTimeRef.current = now;
    },
    [dragSensitivity, wrapValue],
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);
      const dx = e.clientX - pointerStartXRef.current;
      const dy = e.clientY - pointerStartYRef.current;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const clickedCardIndex = pointerDownCardIndexRef.current;
      pointerDownCardIndexRef.current = null;

      if (distance < 8 && clickedCardIndex !== null) {
        if (clickedCardIndex === activeCardIndexRef.current) {
          if (onCardClick && activeCardIndexRef.current >= 0) {
            onCardClick(activeCardIndexRef.current);
          }
        } else {
          focusCardIndex(clickedCardIndex);
        }
      } else {
        velocityRef.current = -lastDeltaRef.current * dragSensitivity;
      }
      if (containerRef.current) {
        containerRef.current.releasePointerCapture(e.pointerId);
      }
    },
    [dragSensitivity, onCardClick, focusCardIndex],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const wheelHandler = handleWheel as unknown as EventListener;
    const pointerDownHandler = handlePointerDown as unknown as EventListener;
    const pointerMoveHandler = handlePointerMove as unknown as EventListener;
    const pointerUpHandler = handlePointerUp as unknown as EventListener;
    container.addEventListener("wheel", wheelHandler, { passive: false });
    container.addEventListener("pointerdown", pointerDownHandler);
    container.addEventListener("pointermove", pointerMoveHandler);
    container.addEventListener("pointerup", pointerUpHandler);
    container.addEventListener("dragstart", (e) => e.preventDefault());
    return () => {
      container.removeEventListener("wheel", wheelHandler);
      container.removeEventListener("pointerdown", pointerDownHandler);
      container.removeEventListener("pointermove", pointerMoveHandler);
      container.removeEventListener("pointerup", pointerUpHandler);
    };
  }, [handleWheel, handlePointerDown, handlePointerMove, handlePointerUp]);

  useEffect(() => {
    if (!enableKeyboard || !isReady) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (introAnimatingRef.current) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const direction = e.key === "ArrowLeft" ? -1 : 1;
        velocityRef.current += direction * cardStepRef.current * 5;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enableKeyboard, isReady]);

  useEffect(() => {
    if (!showBackdrop) return;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animationFrameRef.current)
          cancelAnimationFrame(animationFrameRef.current);
        if (bgAnimationFrameRef.current)
          cancelAnimationFrame(bgAnimationFrameRef.current);
      } else {
        lastTimeRef.current = 0;
        animationFrameRef.current = requestAnimationFrame(animationLoop);
        bgAnimationFrameRef.current = requestAnimationFrame(renderBackground);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [animationLoop, renderBackground, showBackdrop]);

  useEffect(() => {
    if (!showBackdrop) return;
    if (!isReady) return;
    if (bgAnimationFrameRef.current) {
      cancelAnimationFrame(bgAnimationFrameRef.current);
    }
    bgAnimationFrameRef.current = requestAnimationFrame(renderBackground);
    return () => {
      if (bgAnimationFrameRef.current) {
        cancelAnimationFrame(bgAnimationFrameRef.current);
      }
    };
  }, [isReady, renderBackground, showBackdrop]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full overflow-hidden",
        showBackdrop ? "bg-[#0a0a0a]" : "bg-transparent",
        "touch-none select-none",
        isDragging ? "cursor-grabbing" : "cursor-grab",
        className,
      )}
      style={{ perspective: "1800px" }}
    >
      {isLoading && showLoadingOverlay && (
        <div
          className={cn(
            "absolute inset-0 z-50 flex items-center justify-center",
            showBackdrop ? "bg-[#0a0a0a]" : "bg-transparent",
          )}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-9 h-9 border-3 border-neutral-700 border-t-neutral-200 rounded-full animate-spin" />
          </div>
        </div>
      )}

      {showBackdrop ? (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block pointer-events-none"
          style={{
            filter: `blur(${backgroundBlur}px) saturate(1.05)`,
          }}
        />
      ) : null}

      <div
        ref={cardsContainerRef}
        className="absolute inset-0 z-10"
        style={{ transformStyle: "preserve-3d" }}
      >
        {stableItems.map((item, i) => (
          <div
            key={item.id}
            data-carousel-index={i}
            ref={(el) => {
              if (el) {
                if (!cardsRef.current[i]) {
                  cardsRef.current[i] = { element: el, position: 0 };
                } else {
                  cardsRef.current[i].element = el;
                }
              }
            }}
            className="absolute top-1/2 left-1/2 will-change-transform"
            style={{
              width: cardWidthPx ? `${cardWidthPx}px` : "min(26vw, 360px)",
              aspectRatio: String(cardAspectRatio),
              transformStyle: "preserve-3d",
              backfaceVisibility: "hidden",
              transformOrigin: "90% center",
            }}
          >
            <div
              ref={(el) => {
                if (cardsRef.current[i]) {
                  cardsRef.current[i].surface = el ?? undefined;
                }
              }}
              className={cn(
                "w-full h-full rounded-2xl overflow-hidden pointer-events-none select-none shadow-2xl border border-white/10 transition-[background,border-color,box-shadow] duration-300",
                cardClassName,
                item.cardClassName,
              )}
              style={
                item.background ? { background: item.background } : undefined
              }
            >
              {item.content ? (
                <div
                  className={cn(
                    "w-full h-full flex items-center justify-center",
                    contentClassName,
                  )}
                >
                  {item.content}
                </div>
              ) : item.image ? (
                <img
                  src={item.image}
                  alt={item.alt ?? `Carousel item ${i + 1}`}
                  className="w-full h-full object-cover"
                  draggable={false}
                  style={{ userSelect: "none" }}
                />
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

GradientCarousel.displayName = "GradientCarousel";

export default GradientCarousel;
