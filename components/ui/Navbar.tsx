"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import { teams } from "@/data";
import { useAppStore } from "@/store/useAppStore";
import { Dock, DockIcon } from "@/components/ui/dock";

interface NavbarProps {
  onTeamSelect?: (teamId: string) => void;
  onBack?: () => void;
}

export function Navbar({ onTeamSelect, onBack }: NavbarProps) {
  const navRef = useRef<HTMLDivElement>(null);
  const { selectedTeamId, setSelectedTeamId } = useAppStore();

  // Entrance animation
  useEffect(() => {
    if (!navRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        navRef.current,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "power3.out", delay: 0.4 }
      );
    }, navRef);

    return () => ctx.revert();
  }, []);

  const handleTeamClick = (teamId: string) => {
    if (teamId === selectedTeamId) return;

    if (onTeamSelect) {
      onTeamSelect(teamId);
    } else {
      setSelectedTeamId(teamId);
    }
  };

  const sortedTeams = [...teams].sort(
    (a, b) => a.constructorOrder - b.constructorOrder
  );

  return (
    <nav
      ref={navRef}
      className="fixed bottom-6 left-0 right-0 z-50 flex items-center justify-center"
    >
      {/* Back button - only when handler is provided */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute left-8 flex items-center gap-2 px-4 py-2 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="uppercase tracking-wider text-xs">Back</span>
        </button>
      )}

      <Dock
        iconSize={48}
        iconMagnification={80}
        iconDistance={160}
        direction="bottom"
        className="h-16 gap-2 rounded-full border-white/10 bg-white/[0.04] backdrop-blur-lg px-4 py-2"
      >
        {sortedTeams.map((team) => {
          const isSelected = team.id === selectedTeamId;
          return (
            <DockIcon
              key={team.id}
              onClick={() => handleTeamClick(team.id)}
              className={cn(
                "transition-opacity duration-200",
                isSelected ? "opacity-100" : "opacity-40 hover:opacity-70"
              )}
            >
              <Image
                src={team.logoPath}
                alt={team.shortName}
                width={48}
                height={48}
                className={cn(
                  "object-contain w-full h-full",
                  isSelected ? "" : "grayscale brightness-75"
                )}
              />
            </DockIcon>
          );
        })}
      </Dock>
    </nav>
  );
}
