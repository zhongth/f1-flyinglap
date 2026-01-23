export interface Team {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor?: string;
  gradientStops: string[];
  logoUrl: string | null;
  garagePhotoUrl: string | null;
}

export interface Driver {
  id: string;
  name: string;
  number: number;
  teamId: string;
  photoUrl: string | null;
  carPhotoUrl: string | null;
  stats: {
    wins: number;
    poles: number;
    dnfs: number;
    bestQualifyingTime: string;
  };
}

// 10 F1 Teams for 2025 Season
export const teams: Team[] = [
  {
    id: "ferrari",
    name: "Scuderia Ferrari",
    primaryColor: "#DC0000",
    secondaryColor: "#8B0000",
    gradientStops: ["#DC0000", "#8B0000", "#000000"],
    logoUrl: "/team-logos/Ferrari.svg",
    garagePhotoUrl: null,
  },
  {
    id: "redbull",
    name: "Oracle Red Bull Racing",
    primaryColor: "#0600EF",
    secondaryColor: "#000080",
    gradientStops: ["#0600EF", "#000080", "#000000"],
    logoUrl: "/team-logos/Red_Bull_Racing-Logo.svg",
    garagePhotoUrl: null,
  },
  {
    id: "mercedes",
    name: "Mercedes-AMG Petronas",
    primaryColor: "#00D2BE",
    secondaryColor: "#006666",
    gradientStops: ["#00D2BE", "#006666", "#000000"],
    logoUrl: "/team-logos/Mercedes-Benz_in_Formula_One_logo.svg.svg",
    garagePhotoUrl: null,
  },
  {
    id: "mclaren",
    name: "McLaren F1 Team",
    primaryColor: "#FF8700",
    secondaryColor: "#CC6600",
    gradientStops: ["#FF8700", "#CC6600", "#000000"],
    logoUrl: "/team-logos/McLaren_Racing_logo.svg.svg",
    garagePhotoUrl: null,
  },
  {
    id: "astonmartin",
    name: "Aston Martin Aramco",
    primaryColor: "#006F62",
    secondaryColor: "#003D35",
    gradientStops: ["#006F62", "#003D35", "#000000"],
    logoUrl: "/team-logos/Logo_Aston_Martin_F1_Team.svg",
    garagePhotoUrl: null,
  },
  {
    id: "alpine",
    name: "BWT Alpine F1 Team",
    primaryColor: "#0090FF",
    secondaryColor: "#004D8C",
    gradientStops: ["#0090FF", "#004D8C", "#000000"],
    logoUrl: "/team-logos/Logo_of_alpine_f1_team_2022.svg",
    garagePhotoUrl: null,
  },
  {
    id: "williams",
    name: "Williams Racing",
    primaryColor: "#005AFF",
    secondaryColor: "#003380",
    gradientStops: ["#005AFF", "#003380", "#000000"],
    logoUrl: "/team-logos/Logo_Williams_F1.svg",
    garagePhotoUrl: null,
  },
  {
    id: "haas",
    name: "MoneyGram Haas F1",
    primaryColor: "#FFFFFF",
    secondaryColor: "#787878",
    gradientStops: ["#FFFFFF", "#787878", "#000000"],
    logoUrl: "/team-logos/Haas_F1_Team_Logo.svg.svg",
    garagePhotoUrl: null,
  },
  {
    id: "sauber",
    name: "Stake F1 Team Sauber",
    primaryColor: "#00FF00",
    secondaryColor: "#006600",
    gradientStops: ["#00FF00", "#006600", "#000000"],
    logoUrl: "/team-logos/Logo_of_Stake_F1_Team_Kick_Sauber.svg",
    garagePhotoUrl: null,
  },
  {
    id: "rb",
    name: "Visa Cash App RB",
    primaryColor: "#6692FF",
    secondaryColor: "#3355AA",
    gradientStops: ["#6692FF", "#3355AA", "#000000"],
    logoUrl: "/team-logos/VCARB_F1_logo.svg.svg",
    garagePhotoUrl: null,
  },
];

// 20 Drivers (2 per team)
export const drivers: Driver[] = [
  // Ferrari
  {
    id: "leclerc",
    name: "Charles Leclerc",
    number: 16,
    teamId: "ferrari",
    photoUrl: null,
    carPhotoUrl: null,
    stats: {
      wins: 6,
      poles: 18,
      dnfs: 12,
      bestQualifyingTime: "1:10.270",
    },
  },
  {
    id: "hamilton",
    name: "Lewis Hamilton",
    number: 44,
    teamId: "ferrari",
    photoUrl: null,
    carPhotoUrl: null,
    stats: {
      wins: 105,
      poles: 104,
      dnfs: 28,
      bestQualifyingTime: "1:10.166",
    },
  },
  // Red Bull
  {
    id: "verstappen",
    name: "Max Verstappen",
    number: 1,
    teamId: "redbull",
    photoUrl: null,
    carPhotoUrl: null,
    stats: {
      wins: 63,
      poles: 40,
      dnfs: 22,
      bestQualifyingTime: "1:09.921",
    },
  },
  {
    id: "lawson",
    name: "Liam Lawson",
    number: 30,
    teamId: "redbull",
    photoUrl: null,
    carPhotoUrl: null,
    stats: {
      wins: 0,
      poles: 0,
      dnfs: 1,
      bestQualifyingTime: "1:10.845",
    },
  },
  // Mercedes
  {
    id: "russell",
    name: "George Russell",
    number: 63,
    teamId: "mercedes",
    photoUrl: null,
    carPhotoUrl: null,
    stats: {
      wins: 3,
      poles: 4,
      dnfs: 7,
      bestQualifyingTime: "1:10.189",
    },
  },
  {
    id: "antonelli",
    name: "Andrea Kimi Antonelli",
    number: 12,
    teamId: "mercedes",
    photoUrl: null,
    carPhotoUrl: null,
    stats: {
      wins: 0,
      poles: 0,
      dnfs: 0,
      bestQualifyingTime: "1:11.203",
    },
  },
  // McLaren
  {
    id: "norris",
    name: "Lando Norris",
    number: 4,
    teamId: "mclaren",
    photoUrl: null,
    carPhotoUrl: null,
    stats: {
      wins: 4,
      poles: 7,
      dnfs: 8,
      bestQualifyingTime: "1:10.012",
    },
  },
  {
    id: "piastri",
    name: "Oscar Piastri",
    number: 81,
    teamId: "mclaren",
    photoUrl: null,
    carPhotoUrl: null,
    stats: {
      wins: 2,
      poles: 1,
      dnfs: 4,
      bestQualifyingTime: "1:10.278",
    },
  },
  // Aston Martin
  {
    id: "alonso",
    name: "Fernando Alonso",
    number: 14,
    teamId: "astonmartin",
    photoUrl: null,
    carPhotoUrl: null,
    stats: {
      wins: 32,
      poles: 22,
      dnfs: 41,
      bestQualifyingTime: "1:10.544",
    },
  },
  {
    id: "stroll",
    name: "Lance Stroll",
    number: 18,
    teamId: "astonmartin",
    photoUrl: null,
    carPhotoUrl: null,
    stats: {
      wins: 0,
      poles: 1,
      dnfs: 18,
      bestQualifyingTime: "1:10.923",
    },
  },
  // Alpine
  {
    id: "gasly",
    name: "Pierre Gasly",
    number: 10,
    teamId: "alpine",
    photoUrl: null,
    carPhotoUrl: null,
    stats: {
      wins: 1,
      poles: 0,
      dnfs: 15,
      bestQualifyingTime: "1:10.667",
    },
  },
  {
    id: "doohan",
    name: "Jack Doohan",
    number: 7,
    teamId: "alpine",
    photoUrl: null,
    carPhotoUrl: null,
    stats: {
      wins: 0,
      poles: 0,
      dnfs: 2,
      bestQualifyingTime: "1:11.456",
    },
  },
  // Williams
  {
    id: "albon",
    name: "Alexander Albon",
    number: 23,
    teamId: "williams",
    photoUrl: null,
    carPhotoUrl: null,
    stats: {
      wins: 0,
      poles: 0,
      dnfs: 11,
      bestQualifyingTime: "1:10.789",
    },
  },
  {
    id: "sainz",
    name: "Carlos Sainz",
    number: 55,
    teamId: "williams",
    photoUrl: null,
    carPhotoUrl: null,
    stats: {
      wins: 4,
      poles: 6,
      dnfs: 14,
      bestQualifyingTime: "1:10.334",
    },
  },
  // Haas
  {
    id: "ocon",
    name: "Esteban Ocon",
    number: 31,
    teamId: "haas",
    photoUrl: null,
    carPhotoUrl: null,
    stats: {
      wins: 1,
      poles: 0,
      dnfs: 16,
      bestQualifyingTime: "1:11.012",
    },
  },
  {
    id: "bearman",
    name: "Oliver Bearman",
    number: 87,
    teamId: "haas",
    photoUrl: null,
    carPhotoUrl: null,
    stats: {
      wins: 0,
      poles: 0,
      dnfs: 3,
      bestQualifyingTime: "1:11.445",
    },
  },
  // Sauber
  {
    id: "hulkenberg",
    name: "Nico Hulkenberg",
    number: 27,
    teamId: "sauber",
    photoUrl: null,
    carPhotoUrl: null,
    stats: {
      wins: 0,
      poles: 1,
      dnfs: 24,
      bestQualifyingTime: "1:10.998",
    },
  },
  {
    id: "bortoleto",
    name: "Gabriel Bortoleto",
    number: 5,
    teamId: "sauber",
    photoUrl: null,
    carPhotoUrl: null,
    stats: {
      wins: 0,
      poles: 0,
      dnfs: 1,
      bestQualifyingTime: "1:11.678",
    },
  },
  // RB
  {
    id: "tsunoda",
    name: "Yuki Tsunoda",
    number: 22,
    teamId: "rb",
    photoUrl: null,
    carPhotoUrl: null,
    stats: {
      wins: 0,
      poles: 0,
      dnfs: 9,
      bestQualifyingTime: "1:10.712",
    },
  },
  {
    id: "hadjar",
    name: "Isack Hadjar",
    number: 6,
    teamId: "rb",
    photoUrl: null,
    carPhotoUrl: null,
    stats: {
      wins: 0,
      poles: 0,
      dnfs: 0,
      bestQualifyingTime: "1:11.234",
    },
  },
];

/**
 * Get drivers for a specific team
 */
export function getDriversByTeam(teamId: string): Driver[] {
  return drivers.filter((driver) => driver.teamId === teamId);
}

/**
 * Get team by ID
 */
export function getTeamById(teamId: string): Team | undefined {
  return teams.find((team) => team.id === teamId);
}

/**
 * Get driver by ID
 */
export function getDriverById(driverId: string): Driver | undefined {
  return drivers.find((driver) => driver.id === driverId);
}

/**
 * Calculate median qualifying gap between two drivers
 * Returns formatted string with sign (e.g., "-0.124s", "+0.087s")
 * Negative = Driver A is faster (green)
 * Positive = Driver B is faster (red)
 */
export function getMedianGap(driverA: Driver, driverB: Driver): string {
  // Convert qualifying times to milliseconds
  const timeToMs = (time: string): number => {
    const [minutes, seconds] = time.split(":");
    return parseFloat(minutes) * 60000 + parseFloat(seconds) * 1000;
  };

  const timeA = timeToMs(driverA.stats.bestQualifyingTime);
  const timeB = timeToMs(driverB.stats.bestQualifyingTime);

  // Calculate gap in seconds
  const gapMs = timeA - timeB;
  const gapSeconds = gapMs / 1000;

  // Format with sign and 3 decimal places
  const sign = gapSeconds <= 0 ? "" : "+";
  return `${sign}${gapSeconds.toFixed(3)}s`;
}

/**
 * Calculate median gap as percentage
 * Returns formatted percentage string (e.g., "0.025%")
 */
export function getMedianGapPercentage(driverA: Driver, driverB: Driver): string {
  // Convert qualifying times to milliseconds
  const timeToMs = (time: string): number => {
    const [minutes, seconds] = time.split(":");
    return parseFloat(minutes) * 60000 + parseFloat(seconds) * 1000;
  };

  const timeA = timeToMs(driverA.stats.bestQualifyingTime);
  const timeB = timeToMs(driverB.stats.bestQualifyingTime);

  // Calculate percentage difference
  const avgTime = (timeA + timeB) / 2;
  const gapMs = Math.abs(timeA - timeB);
  const percentage = (gapMs / avgTime) * 100;

  return `${percentage.toFixed(3)}%`;
}

/**
 * Determine if driver A is faster than driver B
 */
export function isDriverAFaster(driverA: Driver, driverB: Driver): boolean {
  const timeToMs = (time: string): number => {
    const [minutes, seconds] = time.split(":");
    return parseFloat(minutes) * 60000 + parseFloat(seconds) * 1000;
  };

  const timeA = timeToMs(driverA.stats.bestQualifyingTime);
  const timeB = timeToMs(driverB.stats.bestQualifyingTime);

  return timeA < timeB;
}
