export interface DriverStats {
  polePositions: number;
  wins: number;
  podiums: number;
  fastestLaps: number;
  championships: number;
}

export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  abbreviation: string;
  number: number;
  teamId: string;
  nationality: string;
  portraitPath: string;
  heightCm: number; // Driver's real height in centimeters
  careerStats: DriverStats;
}
