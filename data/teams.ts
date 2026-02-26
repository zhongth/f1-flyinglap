import type { Team } from "@/types";
import teamsData from "@/data/generated/2025/teams.json";

export const teams: Team[] = teamsData as Team[];

export function getTeamById(id: string): Team | undefined {
  return teams.find((team) => team.id === id);
}

export function getTeamByDriverId(driverId: string): Team | undefined {
  return teams.find((team) => team.drivers.includes(driverId));
}
