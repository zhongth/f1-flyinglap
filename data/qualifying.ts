import type { QualifyingResult, RaceWeekend, MedianGapResult, HeadToHeadResult, Q3RateResult, PerRaceGap } from "@/types";
import racesData from "@/data/generated/2025/races.json";
import qualifyingData from "@/data/generated/2025/qualifying-results.json";
import teammateGapsData from "@/data/generated/2025/computed/teammate-gaps.json";
import headToHeadData from "@/data/generated/2025/computed/head-to-head.json";
import q3RatesData from "@/data/generated/2025/computed/q3-rates.json";

// --- Core data from pipeline JSON ---

export const races2025: RaceWeekend[] = racesData as RaceWeekend[];
export const qualifyingResults: QualifyingResult[] = qualifyingData as QualifyingResult[];

// --- Pre-computed stats (keyed by "{id}.{scope}") ---

const teammateGaps = teammateGapsData as Record<string, MedianGapResult>;
const headToHead = headToHeadData as Record<string, HeadToHeadResult>;
const q3Rates = q3RatesData as Record<string, Q3RateResult>;

// --- Lookup functions (replace previous compute-on-the-fly logic) ---

export function calculateMedianQualifyingGap(
  driver1Id: string,
  driver2Id: string,
  scope: "season" | "last5" = "season"
): MedianGapResult {
  // Find the team these two drivers belong to
  const teamResult = Object.values(teammateGaps).find(
    (g) =>
      g.scope === scope &&
      ((g.driver1Id === driver1Id && g.driver2Id === driver2Id) ||
       (g.driver1Id === driver2Id && g.driver2Id === driver1Id))
  );

  if (teamResult) {
    // If caller order matches data order, return as-is
    if (teamResult.driver1Id === driver1Id) {
      return teamResult;
    }
    // Flip the result for reversed driver order
    return {
      ...teamResult,
      driver1Id,
      driver2Id,
      medianGap: -teamResult.medianGap,
      medianGapFormatted: formatGap(-teamResult.medianGap),
    };
  }

  // Fallback if not found
  return {
    teamId: "",
    driver1Id,
    driver2Id,
    medianGap: 0,
    medianGapFormatted: "+0.000",
    raceCount: 0,
    scope,
  };
}

export function calculateHeadToHead(
  driver1Id: string,
  driver2Id: string,
  scope: "season" | "last5" = "season"
): HeadToHeadResult {
  const result = Object.values(headToHead).find(
    (h) =>
      h.scope === scope &&
      ((h.driver1Id === driver1Id && h.driver2Id === driver2Id) ||
       (h.driver1Id === driver2Id && h.driver2Id === driver1Id))
  );

  if (result) {
    if (result.driver1Id === driver1Id) {
      return result;
    }
    // Flip
    return {
      driver1Id,
      driver2Id,
      driver1Wins: result.driver2Wins,
      driver2Wins: result.driver1Wins,
      scope,
    };
  }

  return { driver1Id, driver2Id, driver1Wins: 0, driver2Wins: 0, scope };
}

export function calculateQ3Rate(
  driverId: string,
  scope: "season" | "last5" = "season"
): Q3RateResult {
  const key = `${driverId}.${scope}`;
  const result = q3Rates[key];

  if (result) return result;

  return { driverId, q3Appearances: 0, totalRaces: 0, q3Rate: 0, scope };
}

// --- Utility functions (kept for any component that might use them) ---

export function parseQualifyingTime(timeStr: string | null): number | null {
  if (!timeStr) return null;
  const [minutes, rest] = timeStr.split(":");
  const [seconds, ms] = rest.split(".");
  return parseInt(minutes) * 60000 + parseInt(seconds) * 1000 + parseInt(ms);
}

export function formatGap(ms: number): string {
  const sign = ms >= 0 ? "+" : "-";
  const absMs = Math.abs(ms);
  const seconds = Math.floor(absMs / 1000);
  const milliseconds = Math.floor(absMs % 1000);
  return `${sign}${seconds}.${milliseconds.toString().padStart(3, "0")}`;
}

export function getQualifyingResultsForDriver(driverId: string): QualifyingResult[] {
  return qualifyingResults.filter((r) => r.driverId === driverId);
}

const RACE_ID_TO_COUNTRY: Record<string, string> = {
  australia: "Australia",
  china: "China",
  japan: "Japan",
  bahrain: "Bahrain",
  saudi_arabia: "Saudi Arabia",
  miami: "USA",
  emilia_romagna: "Italy",
  monaco: "Monaco",
  spain: "Spain",
  canada: "Canada",
  austria: "Austria",
  great_britain: "Great Britain",
  belgium: "Belgium",
  hungary: "Hungary",
  netherlands: "Netherlands",
  italy: "Italy",
  azerbaijan: "Azerbaijan",
  singapore: "Singapore",
  united_states: "USA",
  mexico: "Mexico",
  brazil: "Brazil",
  las_vegas: "USA",
  qatar: "Qatar",
  abu_dhabi: "Abu Dhabi",
};

export function getPerRaceQualifyingGaps(
  driver1Id: string,
  driver2Id: string,
  count: number = 5
): PerRaceGap[] {
  const d1Results = getQualifyingResultsForDriver(driver1Id);
  const d2Results = getQualifyingResultsForDriver(driver2Id);

  // Index by raceId for fast lookup
  const d1ByRace = new Map(d1Results.map((r) => [r.raceId, r]));
  const d2ByRace = new Map(d2Results.map((r) => [r.raceId, r]));

  // Race map for circuit names
  const raceMap = new Map(races2025.map((r) => [r.id, r]));

  // Walk races in reverse chronological order (highest round first)
  const sortedRaces = [...races2025].sort((a, b) => b.round - a.round);
  const gaps: PerRaceGap[] = [];

  for (const race of sortedRaces) {
    if (gaps.length >= count) break;

    const r1 = d1ByRace.get(race.id);
    const r2 = d2ByRace.get(race.id);
    if (!r1 || !r2) continue;

    // Determine highest common session
    let session: "Q1" | "Q2" | "Q3";
    let t1: number | null;
    let t2: number | null;

    if (r1.q3Time && r2.q3Time) {
      session = "Q3";
      t1 = parseQualifyingTime(r1.q3Time);
      t2 = parseQualifyingTime(r2.q3Time);
    } else if (r1.q2Time && r2.q2Time) {
      session = "Q2";
      t1 = parseQualifyingTime(r1.q2Time);
      t2 = parseQualifyingTime(r2.q2Time);
    } else if (r1.q1Time && r2.q1Time) {
      session = "Q1";
      t1 = parseQualifyingTime(r1.q1Time);
      t2 = parseQualifyingTime(r2.q1Time);
    } else {
      continue;
    }

    if (t1 === null || t2 === null) continue;

    const gapMs = t2 - t1; // positive = driver1 faster
    const raceInfo = raceMap.get(race.id);

    gaps.push({
      raceId: race.id,
      circuit: raceInfo?.circuit ?? race.id,
      country: RACE_ID_TO_COUNTRY[race.id] ?? race.id,
      round: race.round,
      gapMs,
      gapFormatted: formatGap(gapMs),
      session,
    });
  }

  // Return in chronological order (oldest first → newest last)
  return gaps.reverse();
}
