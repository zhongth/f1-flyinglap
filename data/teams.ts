import type { Team } from "@/types";

export const teams: Team[] = [
  {
    id: "red_bull",
    name: "Oracle Red Bull Racing",
    shortName: "Red Bull",
    primaryColor: "#3671C6",
    secondaryColor: "#1E5BC6",
    logoPath: "/team-logos/Red_Bull_Racing-Logo.svg",
    drivers: ["max_verstappen", "liam_lawson"],
    constructorOrder: 1,
  },
  {
    id: "ferrari",
    name: "Scuderia Ferrari",
    shortName: "Ferrari",
    primaryColor: "#E80020",
    secondaryColor: "#FFEB00",
    logoPath: "/team-logos/Ferrari.svg",
    drivers: ["charles_leclerc", "lewis_hamilton"],
    constructorOrder: 2,
  },
  {
    id: "mclaren",
    name: "McLaren F1 Team",
    shortName: "McLaren",
    primaryColor: "#FF8000",
    secondaryColor: "#47C7FC",
    logoPath: "/team-logos/McLaren_Racing_logo.svg.svg",
    drivers: ["lando_norris", "oscar_piastri"],
    constructorOrder: 3,
  },
  {
    id: "mercedes",
    name: "Mercedes-AMG Petronas F1",
    shortName: "Mercedes",
    primaryColor: "#27F4D2",
    secondaryColor: "#00A19C",
    logoPath: "/team-logos/Mercedes-Benz_in_Formula_One_logo.svg.svg",
    drivers: ["george_russell", "kimi_antonelli"],
    constructorOrder: 4,
  },
  {
    id: "aston_martin",
    name: "Aston Martin Aramco F1",
    shortName: "Aston Martin",
    primaryColor: "#229971",
    secondaryColor: "#358C75",
    logoPath: "/team-logos/Logo_Aston_Martin_F1_Team.svg",
    drivers: ["fernando_alonso", "lance_stroll"],
    constructorOrder: 5,
  },
  {
    id: "alpine",
    name: "BWT Alpine F1 Team",
    shortName: "Alpine",
    primaryColor: "#FF87BC",
    secondaryColor: "#0093CC",
    logoPath: "/team-logos/Logo_of_alpine_f1_team_2022.svg",
    drivers: ["pierre_gasly", "franco_colapinto"],
    constructorOrder: 6,
  },
  {
    id: "williams",
    name: "Williams Racing",
    shortName: "Williams",
    primaryColor: "#64C4FF",
    secondaryColor: "#00A0DE",
    logoPath: "/team-logos/Logo_Williams_F1.svg",
    drivers: ["alexander_albon", "carlos_sainz"],
    constructorOrder: 7,
  },
  {
    id: "racing_bulls",
    name: "Visa Cash App RB F1 Team",
    shortName: "RB",
    primaryColor: "#6692FF",
    secondaryColor: "#1B3D8A",
    logoPath: "/team-logos/VCARB_F1_logo.svg.svg",
    drivers: ["isack_hadjar", "arvid_lindblad"],
    constructorOrder: 8,
  },
  {
    id: "sauber",
    name: "Stake F1 Team Kick Sauber",
    shortName: "Sauber",
    primaryColor: "#52E252",
    secondaryColor: "#00F800",
    logoPath: "/team-logos/Logo_of_Stake_F1_Team_Kick_Sauber.svg",
    drivers: ["nico_hulkenberg", "gabriel_bortoleto"],
    constructorOrder: 9,
  },
  {
    id: "haas",
    name: "MoneyGram Haas F1 Team",
    shortName: "Haas",
    primaryColor: "#B6BABD",
    secondaryColor: "#E10600",
    logoPath: "/team-logos/Haas_F1_Team_Logo.svg.svg",
    drivers: ["esteban_ocon", "oliver_bearman"],
    constructorOrder: 10,
  },
];

export function getTeamById(id: string): Team | undefined {
  return teams.find((team) => team.id === id);
}

export function getTeamByDriverId(driverId: string): Team | undefined {
  return teams.find((team) => team.drivers.includes(driverId));
}
