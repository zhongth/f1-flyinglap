"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import { teams } from "@/data";
import { useAppStore } from "@/store/useAppStore";
import type { Team } from "@/types";

interface NavbarProps {
  onTeamSelect?: (teamId: string) => void;
  onBack?: () => void;
}

export function Navbar({ onTeamSelect, onBack }: NavbarProps) {
  const navRef = useRef<HTMLDivElement>(null);
  const { selectedTeamId, setSelectedTeamId, setStage, setIsAnimating } =
    useAppStore();

  // Entrance animation
  useEffect(() => {
    if (!navRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        navRef.current,
        { y: 100, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }
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
      className="fixed bottom-8 left-0 right-0 z-50 h-(--navbar-height)"
    >
      <div className="h-full mx-auto px-4 flex items-center justify-between">
        {/* Back button or spacer */}
        <div className="w-24">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="uppercase tracking-wider text-xs">Back</span>
            </button>
          )}
        </div>

        {/* Team logos */}
        <div className="flex items-center gap-2">
          {sortedTeams.map((team) => (
            <NavbarTeamLogo
              key={team.id}
              team={team}
              isSelected={team.id === selectedTeamId}
              onClick={() => handleTeamClick(team.id)}
            />
          ))}
        </div>

        {/* Spacer for balance */}
        <div className="w-24" />
      </div>
    </nav>
  );
}

interface NavbarTeamLogoProps {
  team: Team;
  isSelected: boolean;
  onClick: () => void;
}

function NavbarTeamLogo({ team, isSelected, onClick }: NavbarTeamLogoProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-10 h-10 p-1.5 rounded-md transition-all duration-200",
        isSelected ? "" : "opacity-50 hover:opacity-100 hover:bg-white/10"
      )}
      style={{
        backgroundColor: isSelected ? `${team.primaryColor}30` : undefined,
        boxShadow: isSelected ? `0 0 0 2px ${team.primaryColor}` : undefined,
      }}
      title={team.name}
    >
      <div className="relative w-full h-full">
        <Image
          src={team.logoPath}
          alt={team.shortName}
          fill
          className={cn(
            "object-contain transition-all duration-200",
            isSelected ? "" : "grayscale brightness-75"
          )}
        />
      </div>
    </button>
  );
}
