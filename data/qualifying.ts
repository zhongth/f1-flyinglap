import type { QualifyingResult, RaceWeekend, MedianGapResult } from "@/types";

export const races2025: RaceWeekend[] = [
  { id: "bahrain", name: "Bahrain Grand Prix", circuit: "Sakhir", date: "2025-03-02", round: 1 },
  { id: "saudi_arabia", name: "Saudi Arabian Grand Prix", circuit: "Jeddah", date: "2025-03-09", round: 2 },
  { id: "australia", name: "Australian Grand Prix", circuit: "Melbourne", date: "2025-03-23", round: 3 },
  { id: "japan", name: "Japanese Grand Prix", circuit: "Suzuka", date: "2025-04-06", round: 4 },
  { id: "china", name: "Chinese Grand Prix", circuit: "Shanghai", date: "2025-04-20", round: 5 },
  { id: "miami", name: "Miami Grand Prix", circuit: "Miami", date: "2025-05-04", round: 6 },
  { id: "emilia_romagna", name: "Emilia Romagna Grand Prix", circuit: "Imola", date: "2025-05-18", round: 7 },
  { id: "monaco", name: "Monaco Grand Prix", circuit: "Monaco", date: "2025-05-25", round: 8 },
  { id: "canada", name: "Canadian Grand Prix", circuit: "Montreal", date: "2025-06-15", round: 9 },
  { id: "spain", name: "Spanish Grand Prix", circuit: "Barcelona", date: "2025-06-29", round: 10 },
];

// Generate realistic mock qualifying data
// Times are in format "1:XX.XXX" with realistic gaps
function generateTeamQualifyingTimes(
  teamId: string,
  driver1Id: string,
  driver2Id: string,
  baseLapTime: number, // Base time in milliseconds (e.g., 87500 = 1:27.500)
  driver1Advantage: number, // Typical advantage in ms (negative = driver1 faster)
  variance: number // Random variance in ms
): QualifyingResult[] {
  const results: QualifyingResult[] = [];

  races2025.forEach((race) => {
    // Random variation for this race
    const raceVariance = (Math.random() - 0.5) * variance * 2;
    const driver1Time = baseLapTime + raceVariance;
    const driver2Time = baseLapTime - driver1Advantage + (Math.random() - 0.5) * variance;

    // 10% chance of one driver not setting a time (DNS/mechanical)
    const driver1DNF = Math.random() < 0.05;
    const driver2DNF = Math.random() < 0.05;

    results.push({
      raceId: race.id,
      driverId: driver1Id,
      position: 0, // Will be calculated later
      q1Time: driver1DNF ? null : formatTime(driver1Time + 1500),
      q2Time: driver1DNF ? null : formatTime(driver1Time + 500),
      q3Time: driver1DNF ? null : formatTime(driver1Time),
      bestTime: driver1DNF ? null : formatTime(driver1Time),
    });

    results.push({
      raceId: race.id,
      driverId: driver2Id,
      position: 0,
      q1Time: driver2DNF ? null : formatTime(driver2Time + 1500),
      q2Time: driver2DNF ? null : formatTime(driver2Time + 500),
      q3Time: driver2DNF ? null : formatTime(driver2Time),
      bestTime: driver2DNF ? null : formatTime(driver2Time),
    });
  });

  return results;
}

function formatTime(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = Math.floor(ms % 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
}

// Generate all qualifying data with realistic team-specific parameters
export const qualifyingResults: QualifyingResult[] = [
  // Red Bull - Verstappen typically faster by ~0.2s
  ...generateTeamQualifyingTimes("red_bull", "max_verstappen", "liam_lawson", 87200, -200, 150),
  // Ferrari - Hamilton vs Leclerc close battle
  ...generateTeamQualifyingTimes("ferrari", "charles_leclerc", "lewis_hamilton", 87300, -50, 120),
  // McLaren - Very close pairing
  ...generateTeamQualifyingTimes("mclaren", "lando_norris", "oscar_piastri", 87350, -80, 100),
  // Mercedes - Russell slight edge over rookie
  ...generateTeamQualifyingTimes("mercedes", "george_russell", "kimi_antonelli", 87450, -180, 150),
  // Aston Martin - Alonso typically faster
  ...generateTeamQualifyingTimes("aston_martin", "fernando_alonso", "lance_stroll", 87800, -250, 180),
  // Alpine - Close pairing
  ...generateTeamQualifyingTimes("alpine", "pierre_gasly", "franco_colapinto", 88200, -100, 150),
  // Williams - Sainz slight advantage
  ...generateTeamQualifyingTimes("williams", "carlos_sainz", "alexander_albon", 88100, -120, 140),
  // Racing Bulls - Both rookies
  ...generateTeamQualifyingTimes("racing_bulls", "isack_hadjar", "arvid_lindblad", 88300, -30, 200),
  // Sauber - Hulkenberg experience edge
  ...generateTeamQualifyingTimes("sauber", "nico_hulkenberg", "gabriel_bortoleto", 88500, -150, 180),
  // Haas - Close battle
  ...generateTeamQualifyingTimes("haas", "esteban_ocon", "oliver_bearman", 88400, -80, 160),
];

// Utility functions for calculations
export function parseQualifyingTime(timeStr: string | null): number | null {
  if (!timeStr) return null;
  const [minutes, rest] = timeStr.split(":");
  const [seconds, ms] = rest.split(".");
  return parseInt(minutes) * 60000 + parseInt(seconds) * 1000 + parseInt(ms);
}

export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function formatGap(ms: number): string {
  const sign = ms >= 0 ? "+" : "-";
  const absMs = Math.abs(ms);
  const seconds = Math.floor(absMs / 1000);
  const milliseconds = Math.floor(absMs % 1000);
  return `${sign}${seconds}.${milliseconds.toString().padStart(3, "0")}`;
}

export function calculateMedianQualifyingGap(
  driver1Id: string,
  driver2Id: string,
  scope: "season" | "last5" = "season"
): MedianGapResult {
  // Filter races based on scope
  let raceIds = races2025.map((r) => r.id);
  if (scope === "last5") {
    raceIds = raceIds.slice(-5);
  }

  // Get qualifying results for both drivers
  const driver1Results = qualifyingResults.filter(
    (r) => r.driverId === driver1Id && raceIds.includes(r.raceId)
  );
  const driver2Results = qualifyingResults.filter(
    (r) => r.driverId === driver2Id && raceIds.includes(r.raceId)
  );

  // Calculate gaps for races where both drivers have times
  const gaps: number[] = [];

  for (const r1 of driver1Results) {
    const r2 = driver2Results.find((r) => r.raceId === r1.raceId);
    if (r2 && r1.bestTime && r2.bestTime) {
      const time1 = parseQualifyingTime(r1.bestTime);
      const time2 = parseQualifyingTime(r2.bestTime);
      if (time1 !== null && time2 !== null) {
        gaps.push(time1 - time2); // Negative = driver1 faster
      }
    }
  }

  const medianGap = calculateMedian(gaps);
  const teamId = qualifyingResults.find((r) => r.driverId === driver1Id)?.raceId || "";

  return {
    teamId,
    driver1Id,
    driver2Id,
    medianGap,
    medianGapFormatted: formatGap(medianGap),
    raceCount: gaps.length,
    scope,
  };
}

export function getQualifyingResultsForDriver(driverId: string): QualifyingResult[] {
  return qualifyingResults.filter((r) => r.driverId === driverId);
}
