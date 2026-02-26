export interface QualifyingResult {
  raceId: string;
  driverId: string;
  position: number;
  q1Time: string | null;
  q2Time: string | null;
  q3Time: string | null;
  bestTime: string | null;
}

export interface RaceWeekend {
  id: string;
  name: string;
  circuit: string;
  date: string;
  round: number;
}

export interface MedianGapResult {
  teamId: string;
  driver1Id: string;
  driver2Id: string;
  medianGap: number;
  medianGapFormatted: string;
  raceCount: number;
  scope: "season" | "last5";
}
