"""Fetch team data from FastF1 and merge with manual branding config."""

from __future__ import annotations

from .config import TEAM_ID_MAP, TEAM_BRANDING, TEAM_OFFICIAL_NAMES
from .schema import Driver, Team


def build_teams(
    drivers: list[Driver],
    constructor_standings: dict[str, int] | None = None,
) -> list[Team]:
    """Build team list from driver data and manual branding config.

    We derive teams from the driver roster (each team has exactly 2 drivers)
    and merge with the branding data from config.py (colors, logos, bg images).

    Constructor order is assigned from actual standings when available,
    otherwise from branding config order (previous season's standings).
    """
    # Group drivers by team
    team_drivers: dict[str, list[str]] = {}
    team_names_from_fastf1: dict[str, str] = {}

    for driver in drivers:
        tid = driver.teamId
        if tid not in team_drivers:
            team_drivers[tid] = []
        team_drivers[tid].append(driver.id)

    # Build teams with branding
    teams: list[Team] = []

    # Use TEAM_BRANDING order for constructor order
    constructor_order = 1
    for team_id, branding in TEAM_BRANDING.items():
        if team_id not in team_drivers:
            print(f"  [warn] Team {team_id} in branding config but no drivers found")
            continue

        driver_ids = team_drivers[team_id]
        if len(driver_ids) < 2:
            print(f"  [warn] Team {team_id} has only {len(driver_ids)} driver(s)")
            # Pad with empty if needed
            while len(driver_ids) < 2:
                driver_ids.append("")

        points = (constructor_standings or {}).get(team_id, 0)

        teams.append(
            Team(
                id=team_id,
                name=_get_official_name(team_id),
                shortName=branding.get("shortName", team_id),
                primaryColor=branding.get("primaryColor", "#FFFFFF"),
                secondaryColor=branding.get("secondaryColor", "#000000"),
                logoPath=branding.get("logoPath", ""),
                bgImagePath=branding.get("bgImagePath"),
                drivers=(driver_ids[0], driver_ids[1]),
                constructorOrder=constructor_order,
                constructorPoints=points,
            )
        )
        constructor_order += 1

    # Add any teams found in drivers but missing from branding
    for team_id in team_drivers:
        if team_id not in TEAM_BRANDING:
            print(f"  [warn] Team {team_id} found in drivers but missing branding config")
            driver_ids = team_drivers[team_id]
            if len(driver_ids) < 2:
                while len(driver_ids) < 2:
                    driver_ids.append("")
            teams.append(
                Team(
                    id=team_id,
                    name=team_id,
                    shortName=team_id,
                    primaryColor="#FFFFFF",
                    secondaryColor="#000000",
                    logoPath="",
                    drivers=(driver_ids[0], driver_ids[1]),
                    constructorOrder=constructor_order,
                    constructorPoints=(constructor_standings or {}).get(team_id, 0),
                )
            )
            constructor_order += 1

    # Sort by constructor points (descending) and assign order
    teams.sort(key=lambda t: t.constructorPoints, reverse=True)
    for i, team in enumerate(teams):
        team.constructorOrder = i + 1

    print(f"  Built {len(teams)} teams")
    return teams


def _get_official_name(team_id: str) -> str:
    """Get the official team name from config, falling back to title-cased ID."""
    # Search TEAM_OFFICIAL_NAMES values by team_id match
    for fastf1_name, official_name in TEAM_OFFICIAL_NAMES.items():
        if TEAM_ID_MAP.get(fastf1_name) == team_id:
            return official_name
    return team_id.replace("_", " ").title()
