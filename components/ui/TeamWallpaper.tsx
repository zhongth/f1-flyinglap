"use client";

import { useRef, useEffect, useState } from "react";
import { gsap } from "@/lib/gsap";
import type { Team } from "@/types";

interface WallpaperLayer {
  primaryColor: string;
  secondaryColor: string;
  bgImagePath?: string;
  key: number;
}

interface TeamWallpaperProps {
  team: Team | null;
}

export function TeamWallpaper({ team }: TeamWallpaperProps) {
  const [layers, setLayers] = useState<WallpaperLayer[]>(() => {
    if (!team) return [];
    return [
      {
        primaryColor: team.primaryColor,
        secondaryColor: team.secondaryColor,
        bgImagePath: team.bgImagePath,
        key: Date.now(),
      },
    ];
  });
  const layerRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const prevTeamIdRef = useRef<string | null>(team?.id ?? null);

  useEffect(() => {
    if (!team) return;
    if (team.id === prevTeamIdRef.current) return;
    prevTeamIdRef.current = team.id;

    const newLayer: WallpaperLayer = {
      primaryColor: team.primaryColor,
      secondaryColor: team.secondaryColor,
      bgImagePath: team.bgImagePath,
      key: Date.now(),
    };

    setLayers((prev) => {
      // Keep only the last layer + new one
      return [...prev.slice(-1), newLayer];
    });
  }, [team]);

  // Animate layer transitions
  useEffect(() => {
    if (layers.length < 2) return;

    const outgoingKey = layers[layers.length - 2].key;
    const incomingKey = layers[layers.length - 1].key;

    const outgoingEl = layerRefs.current.get(outgoingKey);
    const incomingEl = layerRefs.current.get(incomingKey);

    if (incomingEl) {
      gsap.fromTo(
        incomingEl,
        { opacity: 0 },
        { opacity: 1, duration: 0.8, ease: "power2.inOut" }
      );
    }

    if (outgoingEl) {
      gsap.to(outgoingEl, {
        opacity: 0,
        duration: 0.8,
        ease: "power2.inOut",
        onComplete: () => {
          // Remove old layers
          setLayers((prev) => prev.filter((l) => l.key !== outgoingKey));
          layerRefs.current.delete(outgoingKey);
        },
      });
    }
  }, [layers.length]);

  const setLayerRef = (key: number, el: HTMLDivElement | null) => {
    if (el) {
      layerRefs.current.set(key, el);
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {layers.map((layer, i) => (
        <div
          key={layer.key}
          ref={(el) => setLayerRef(layer.key, el)}
          className="wallpaper-layer"
          style={{
            opacity: i === 0 && layers.length === 1 ? 1 : 0,
            backgroundColor: "rgba(0, 0, 0, 0.3)",
          }}
        >
          {layer.bgImagePath && (
            <img
              src={layer.bgImagePath}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-50"
            />
          )}
        </div>
      ))}
      {/* Vignette overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.85) 100%)",
        }}
      />
    </div>
  );
}
