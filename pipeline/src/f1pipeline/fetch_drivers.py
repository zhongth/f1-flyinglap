"""Fetch driver data from FastF1 and merge with manual config."""

from __future__ import annotations

import fastf1
import pandas as pd

from .config import DRIVER_ID_MAP, DRIVER_EXTRA, DRIVER_NATIONALITIES, TEAM_ID_MAP
from .schema import Driver, DriverStats


def fetch_drivers(season: int) -> list[Driver]:
    """Fetch driver roster from the latest available session.

    FastF1 provides: firstName, lastName, abbreviation, number, teamName,
    nationality (CountryCode). We merge with config.py for: portraitPath,
    heightCm, careerStats.
    """
    # Load the most recent qualifying session to get the current roster
    schedule = fastf1.get_event_schedule(season)

    drivers_map: dict[str, Driver] = {}

    # Iterate sessions in reverse to get the most recent data first
    for _, event in schedule.iloc[::-1].iterrows():
        if event.get("EventFormat", "") == "testing":
            continue

        try:
            session = fastf1.get_session(season, int(event["RoundNumber"]), "Q")
            session.load()
        except Exception:
            continue

        if session.results is None or session.results.empty:
            continue

        for _, row in session.results.iterrows():
            abbreviation = str(row.get("Abbreviation", ""))
            driver_id = DRIVER_ID_MAP.get(abbreviation)

            if not driver_id or driver_id in drivers_map:
                continue

            # Get team ID
            team_name = str(row.get("TeamName", ""))
            team_id = TEAM_ID_MAP.get(team_name, "")

            # Get extra data from config
            extra = DRIVER_EXTRA.get(driver_id, {})
            career = extra.get("careerStats", {})

            # Try FastF1 CountryCode/Nationality, fall back to config
            country_code = str(row.get("CountryCode", "") or "")
            if not country_code:
                country_code = str(row.get("Nationality", "") or "")
            nationality = _country_from_code(country_code)
            if not nationality:
                nationality = DRIVER_NATIONALITIES.get(driver_id, "")

            first_name = str(row.get("FirstName", ""))
            last_name = str(row.get("LastName", ""))
            number = int(row.get("DriverNumber", 0)) if not pd.isna(row.get("DriverNumber", float("nan"))) else 0

            drivers_map[driver_id] = Driver(
                id=driver_id,
                firstName=first_name,
                lastName=last_name,
                abbreviation=abbreviation,
                number=number,
                teamId=team_id,
                nationality=nationality,
                portraitPath=extra.get("portraitPath", f"/f1_2025_driver_portraits/{driver_id}.webp"),
                heightCm=extra.get("heightCm", 175),
                careerStats=DriverStats(
                    polePositions=career.get("polePositions", 0),
                    wins=career.get("wins", 0),
                    podiums=career.get("podiums", 0),
                    fastestLaps=career.get("fastestLaps", 0),
                    championships=career.get("championships", 0),
                ),
            )

        # If we got all 20 drivers, stop early
        if len(drivers_map) >= 20:
            break

    drivers = list(drivers_map.values())
    print(f"  Fetched {len(drivers)} drivers from FastF1")
    return drivers


# ISO 3166-1 alpha-3 → country name (subset for F1 2025 grid)
_COUNTRY_MAP: dict[str, str] = {
    "NED": "Netherlands",
    "NZL": "New Zealand",
    "MON": "Monaco",
    "GBR": "United Kingdom",
    "AUS": "Australia",
    "ITA": "Italy",
    "ESP": "Spain",
    "CAN": "Canada",
    "FRA": "France",
    "ARG": "Argentina",
    "THA": "Thailand",
    "DEU": "Germany",
    "BRA": "Brazil",
    "GER": "Germany",
    "JPN": "Japan",
}


def _country_from_code(code: str) -> str:
    """Convert 3-letter country code to full country name."""
    return _COUNTRY_MAP.get(code, code)
