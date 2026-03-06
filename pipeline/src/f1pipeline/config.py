"""Manual branding data not available from FastF1.

Team colors, logos, background images, driver portraits, and heights
are design choices maintained here. The pipeline merges these with
FastF1 API data to produce the final JSON output.
"""

# FastF1 team name → our app team ID
TEAM_ID_MAP: dict[str, str] = {
    "Red Bull Racing": "red_bull",
    "Ferrari": "ferrari",
    "McLaren": "mclaren",
    "Mercedes": "mercedes",
    "Aston Martin": "aston_martin",
    "Alpine": "alpine",
    "Williams": "williams",
    "RB": "racing_bulls",
    "Racing Bulls": "racing_bulls",
    "Kick Sauber": "sauber",
    "Sauber": "sauber",
    "Haas F1 Team": "haas",
    "Haas": "haas",
}

# FastF1 driver abbreviation → our app driver ID
DRIVER_ID_MAP: dict[str, str] = {
    "VER": "max_verstappen",
    "LAW": "liam_lawson",
    "LEC": "charles_leclerc",
    "HAM": "lewis_hamilton",
    "NOR": "lando_norris",
    "PIA": "oscar_piastri",
    "RUS": "george_russell",
    "ANT": "kimi_antonelli",
    "ALO": "fernando_alonso",
    "STR": "lance_stroll",
    "GAS": "pierre_gasly",
    "COL": "franco_colapinto",
    "ALB": "alexander_albon",
    "SAI": "carlos_sainz",
    "HAD": "isack_hadjar",
    "LIN": "arvid_lindblad",
    "HUL": "nico_hulkenberg",
    "BOR": "gabriel_bortoleto",
    "OCO": "esteban_ocon",
    "BEA": "oliver_bearman",
    "TSU": "yuki_tsunoda",
    "DOO": "jack_doohan",
}

# Race event name → our app race ID
RACE_ID_MAP: dict[str, str] = {
    "Bahrain Grand Prix": "bahrain",
    "Saudi Arabian Grand Prix": "saudi_arabia",
    "Australian Grand Prix": "australia",
    "Japanese Grand Prix": "japan",
    "Chinese Grand Prix": "china",
    "Miami Grand Prix": "miami",
    "Emilia Romagna Grand Prix": "emilia_romagna",
    "Monaco Grand Prix": "monaco",
    "Canadian Grand Prix": "canada",
    "Spanish Grand Prix": "spain",
    "Austrian Grand Prix": "austria",
    "British Grand Prix": "great_britain",
    "Hungarian Grand Prix": "hungary",
    "Belgian Grand Prix": "belgium",
    "Dutch Grand Prix": "netherlands",
    "Italian Grand Prix": "italy",
    "Azerbaijan Grand Prix": "azerbaijan",
    "Singapore Grand Prix": "singapore",
    "United States Grand Prix": "united_states",
    "Mexico City Grand Prix": "mexico",
    "São Paulo Grand Prix": "brazil",
    "Las Vegas Grand Prix": "las_vegas",
    "Qatar Grand Prix": "qatar",
    "Abu Dhabi Grand Prix": "abu_dhabi",
}

# Team branding (colors, logos, background images)
TEAM_BRANDING: dict[str, dict] = {
    "red_bull": {
        "shortName": "Red Bull",
        "primaryColor": "#3671C6",
        "secondaryColor": "#1E5BC6",
        "logoPath": "/team-logos/Red_Bull_Racing-Logo.svg",
        "bgImagePath": "/assets/f1-bg-collection/redbull-bg-2.jpg",
    },
    "ferrari": {
        "shortName": "Ferrari",
        "primaryColor": "#E80020",
        "secondaryColor": "#FFEB00",
        "logoPath": "/team-logos/Ferrari.svg",
        "bgImagePath": "/assets/f1-bg-collection/ferrari-bg-1.webp",
    },
    "mclaren": {
        "shortName": "McLaren",
        "primaryColor": "#FF8000",
        "secondaryColor": "#47C7FC",
        "logoPath": "/team-logos/McLaren_Racing_logo.png",
        "bgImagePath": "/assets/f1-bg-collection/mclaren-bg-2.webp",
    },
    "mercedes": {
        "shortName": "Mercedes",
        "primaryColor": "#27F4D2",
        "secondaryColor": "#00A19C",
        "logoPath": "/team-logos/Mercedes-Benz_in_Formula_One_logo.png",
        "bgImagePath": "/assets/f1-bg-collection/mercedes-bg-2.webp",
    },
    "aston_martin": {
        "shortName": "Aston Martin",
        "primaryColor": "#229971",
        "secondaryColor": "#358C75",
        "logoPath": "/team-logos/Logo_Aston_Martin_F1_Team.svg",
        "bgImagePath": "/assets/f1-bg-collection/astonmartin-bg-2.jpg",
    },
    "alpine": {
        "shortName": "Alpine",
        "primaryColor": "#FF87BC",
        "secondaryColor": "#0093CC",
        "logoPath": "/team-logos/Logo_of_alpine_f1_team_2022.svg",
        "bgImagePath": "/assets/f1-bg-collection/alpine-bg-2.jpg",
    },
    "williams": {
        "shortName": "Williams",
        "primaryColor": "#64C4FF",
        "secondaryColor": "#00A0DE",
        "logoPath": "/team-logos/Logo_Williams_F1.svg",
        "bgImagePath": "/assets/f1-bg-collection/williams-bg-2.jpg",
    },
    "racing_bulls": {
        "shortName": "RB",
        "primaryColor": "#6692FF",
        "secondaryColor": "#1B3D8A",
        "logoPath": "/team-logos/VCARB_F1_logo.svg.svg",
        "bgImagePath": "/assets/f1-bg-collection/rb-bg-1.webp",
    },
    "sauber": {
        "shortName": "Sauber",
        "primaryColor": "#52E252",
        "secondaryColor": "#00F800",
        "logoPath": "/team-logos/Logo_of_Stake_F1_Team_Kick_Sauber.png",
        "bgImagePath": "/assets/f1-bg-collection/sauber-bg-1.jpg",
    },
    "haas": {
        "shortName": "Haas",
        "primaryColor": "#B6BABD",
        "secondaryColor": "#E10600",
        "logoPath": "/team-logos/Haas_F1_Team_Logo.svg.svg",
    },
}

# Driver extra data (portrait paths, heights, career stats)
# Career stats are maintained manually — they change infrequently.
# These are merged with FastF1-sourced data (name, number, nationality, team).
DRIVER_EXTRA: dict[str, dict] = {
    "max_verstappen": {
        "portraitPath": "/f1_2025_driver_portraits/max_verstappen.webp",
        "heightCm": 181,
        "careerStats": {"polePositions": 40, "wins": 62, "podiums": 111, "fastestLaps": 32, "championships": 4},
    },
    "liam_lawson": {
        "portraitPath": "/f1_2025_driver_portraits/liam_lawson.webp",
        "heightCm": 175,
        "careerStats": {"polePositions": 0, "wins": 0, "podiums": 0, "fastestLaps": 0, "championships": 0},
    },
    "charles_leclerc": {
        "portraitPath": "/f1_2025_driver_portraits/charles_leclerc.webp",
        "heightCm": 180,
        "careerStats": {"polePositions": 26, "wins": 8, "podiums": 40, "fastestLaps": 10, "championships": 0},
    },
    "lewis_hamilton": {
        "portraitPath": "/f1_2025_driver_portraits/lewis_hamilton.webp",
        "heightCm": 174,
        "careerStats": {"polePositions": 104, "wins": 105, "podiums": 201, "fastestLaps": 67, "championships": 7},
    },
    "lando_norris": {
        "portraitPath": "/f1_2025_driver_portraits/lando_norris.webp",
        "heightCm": 170,
        "careerStats": {"polePositions": 8, "wins": 4, "podiums": 26, "fastestLaps": 9, "championships": 1},
    },
    "oscar_piastri": {
        "portraitPath": "/f1_2025_driver_portraits/oscar_piastri.webp",
        "heightCm": 178,
        "careerStats": {"polePositions": 3, "wins": 2, "podiums": 14, "fastestLaps": 2, "championships": 0},
    },
    "george_russell": {
        "portraitPath": "/f1_2025_driver_portraits/george_russell.webp",
        "heightCm": 185,
        "careerStats": {"polePositions": 5, "wins": 3, "podiums": 16, "fastestLaps": 7, "championships": 0},
    },
    "kimi_antonelli": {
        "portraitPath": "/f1_2025_driver_portraits/2025mercedesandant01right.webp",
        "heightCm": 175,
        "careerStats": {"polePositions": 0, "wins": 0, "podiums": 0, "fastestLaps": 0, "championships": 0},
    },
    "fernando_alonso": {
        "portraitPath": "/f1_2025_driver_portraits/fernando_alonso.webp",
        "heightCm": 171,
        "careerStats": {"polePositions": 22, "wins": 32, "podiums": 106, "fastestLaps": 24, "championships": 2},
    },
    "lance_stroll": {
        "portraitPath": "/f1_2025_driver_portraits/lance_stroll.webp",
        "heightCm": 182,
        "careerStats": {"polePositions": 1, "wins": 0, "podiums": 3, "fastestLaps": 0, "championships": 0},
    },
    "pierre_gasly": {
        "portraitPath": "/f1_2025_driver_portraits/pierre_gasly.webp",
        "heightCm": 177,
        "careerStats": {"polePositions": 0, "wins": 1, "podiums": 4, "fastestLaps": 3, "championships": 0},
    },
    "franco_colapinto": {
        "portraitPath": "/f1_2025_driver_portraits/franco_colapinto.webp",
        "heightCm": 175,
        "careerStats": {"polePositions": 0, "wins": 0, "podiums": 0, "fastestLaps": 0, "championships": 0},
    },
    "alexander_albon": {
        "portraitPath": "/f1_2025_driver_portraits/alexander_albon.webp",
        "heightCm": 186,
        "careerStats": {"polePositions": 0, "wins": 0, "podiums": 2, "fastestLaps": 0, "championships": 0},
    },
    "carlos_sainz": {
        "portraitPath": "/f1_2025_driver_portraits/carlos_sainz.webp",
        "heightCm": 178,
        "careerStats": {"polePositions": 6, "wins": 4, "podiums": 25, "fastestLaps": 5, "championships": 0},
    },
    "isack_hadjar": {
        "portraitPath": "/f1_2025_driver_portraits/isack_hadjar.webp",
        "heightCm": 175,
        "careerStats": {"polePositions": 0, "wins": 0, "podiums": 0, "fastestLaps": 0, "championships": 0},
    },
    "arvid_lindblad": {
        "portraitPath": "/f1_2025_driver_portraits/arvid_lindblad.webp",
        "heightCm": 173,
        "careerStats": {"polePositions": 0, "wins": 0, "podiums": 0, "fastestLaps": 0, "championships": 0},
    },
    "nico_hulkenberg": {
        "portraitPath": "/f1_2025_driver_portraits/2025kicksaubernichul01right.webp",
        "heightCm": 184,
        "careerStats": {"polePositions": 1, "wins": 0, "podiums": 0, "fastestLaps": 2, "championships": 0},
    },
    "gabriel_bortoleto": {
        "portraitPath": "/f1_2025_driver_portraits/2025kicksaubergabbor01right.avif",
        "heightCm": 170,
        "careerStats": {"polePositions": 0, "wins": 0, "podiums": 0, "fastestLaps": 0, "championships": 0},
    },
    "esteban_ocon": {
        "portraitPath": "/f1_2025_driver_portraits/esteban_ocon.webp",
        "heightCm": 186,
        "careerStats": {"polePositions": 0, "wins": 1, "podiums": 3, "fastestLaps": 0, "championships": 0},
    },
    "oliver_bearman": {
        "portraitPath": "/f1_2025_driver_portraits/oliver_bearman.webp",
        "heightCm": 180,
        "careerStats": {"polePositions": 0, "wins": 0, "podiums": 0, "fastestLaps": 0, "championships": 0},
    },
    "yuki_tsunoda": {
        "portraitPath": "/f1_2025_driver_portraits/2025redbullracingyuktsu01right.webp",
        "heightCm": 159,
        "careerStats": {"polePositions": 0, "wins": 0, "podiums": 1, "fastestLaps": 0, "championships": 0},
    },
    "jack_doohan": {
        "portraitPath": "/f1_2025_driver_portraits/jack_doohan.webp",
        "heightCm": 175,
        "careerStats": {"polePositions": 0, "wins": 0, "podiums": 0, "fastestLaps": 0, "championships": 0},
    },
}

# Driver nationality fallback (FastF1 may not always provide this)
DRIVER_NATIONALITIES: dict[str, str] = {
    "max_verstappen": "Netherlands",
    "liam_lawson": "New Zealand",
    "charles_leclerc": "Monaco",
    "lewis_hamilton": "United Kingdom",
    "lando_norris": "United Kingdom",
    "oscar_piastri": "Australia",
    "george_russell": "United Kingdom",
    "kimi_antonelli": "Italy",
    "fernando_alonso": "Spain",
    "lance_stroll": "Canada",
    "pierre_gasly": "France",
    "franco_colapinto": "Argentina",
    "alexander_albon": "Thailand",
    "carlos_sainz": "Spain",
    "isack_hadjar": "France",
    "arvid_lindblad": "United Kingdom",
    "nico_hulkenberg": "Germany",
    "gabriel_bortoleto": "Brazil",
    "esteban_ocon": "France",
    "oliver_bearman": "United Kingdom",
    "yuki_tsunoda": "Japan",
    "jack_doohan": "Australia",
}

# FastF1 team name → full official team name for our app
TEAM_OFFICIAL_NAMES: dict[str, str] = {
    "Red Bull Racing": "Oracle Red Bull Racing",
    "Ferrari": "Scuderia Ferrari",
    "McLaren": "McLaren F1 Team",
    "Mercedes": "Mercedes-AMG Petronas F1",
    "Aston Martin": "Aston Martin Aramco F1",
    "Alpine": "BWT Alpine F1 Team",
    "Williams": "Williams Racing",
    "RB": "Visa Cash App RB F1 Team",
    "Racing Bulls": "Visa Cash App RB F1 Team",
    "Kick Sauber": "Stake F1 Team Kick Sauber",
    "Sauber": "Stake F1 Team Kick Sauber",
    "Haas F1 Team": "MoneyGram Haas F1 Team",
    "Haas": "MoneyGram Haas F1 Team",
}
