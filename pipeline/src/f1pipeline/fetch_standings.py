"""Fetch constructor and driver standings from FastF1's Ergast interface."""

from __future__ import annotations

import fastf1

from .config import DRIVER_ID_MAP, TEAM_ID_MAP


def fetch_constructor_standings(season: int) -> dict[str, int]:
    """Return a dict mapping our app team_id -> constructor points."""
    ergast = fastf1.ergast.Ergast()
    response = ergast.get_constructor_standings(season=season)
    df = response.content[0]

    standings: dict[str, int] = {}
    for _, row in df.iterrows():
        constructor_name = str(row.get("constructorName", ""))
        points = int(row.get("points", 0))

        # Map Ergast constructor name to our app team ID
        team_id = TEAM_ID_MAP.get(constructor_name)
        if not team_id:
            # Try matching by constructorId (e.g. "red_bull", "mclaren")
            constructor_id = str(row.get("constructorId", ""))
            for map_name, map_id in TEAM_ID_MAP.items():
                if constructor_id == map_id:
                    team_id = map_id
                    break
            if not team_id:
                # Direct ID match as fallback
                team_id = constructor_id

        if team_id:
            standings[team_id] = points

    print(f"  Fetched constructor standings for {len(standings)} teams")
    return standings


def fetch_driver_standings(season: int) -> dict[str, int]:
    """Return a dict mapping our app driver_id -> championship points."""
    ergast = fastf1.ergast.Ergast()
    response = ergast.get_driver_standings(season=season)
    df = response.content[0]

    standings: dict[str, int] = {}
    for _, row in df.iterrows():
        abbreviation = str(row.get("driverCode", ""))
        points = int(row.get("points", 0))

        # Map Ergast driver abbreviation to our app driver ID
        driver_id = DRIVER_ID_MAP.get(abbreviation)
        if not driver_id:
            # Try driverId as fallback
            driver_id = str(row.get("driverId", ""))

        if driver_id:
            standings[driver_id] = points

    print(f"  Fetched driver standings for {len(standings)} drivers")
    return standings
