"""Fetch race calendar from FastF1."""

from __future__ import annotations

import fastf1

from .config import RACE_ID_MAP
from .schema import RaceWeekend


def fetch_calendar(season: int) -> list[RaceWeekend]:
    """Fetch the race calendar for a season, returning only conventional races."""
    schedule = fastf1.get_event_schedule(season)

    races: list[RaceWeekend] = []
    for _, event in schedule.iterrows():
        event_name = str(event["EventName"])

        # Skip testing and non-race events
        if event.get("EventFormat", "") == "testing":
            continue

        race_id = RACE_ID_MAP.get(event_name)
        if not race_id:
            print(f"  [warn] Unknown race event: {event_name!r}, skipping")
            continue

        session_date = event.get("EventDate") or event.get("Session5Date")
        date_str = str(session_date.date()) if hasattr(session_date, "date") else str(session_date)[:10]

        races.append(
            RaceWeekend(
                id=race_id,
                name=event_name,
                circuit=str(event.get("Location", event.get("Country", ""))),
                date=date_str,
                round=int(event["RoundNumber"]),
            )
        )

    return races
