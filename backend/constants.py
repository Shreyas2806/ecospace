"""
constants.py — Application-wide named constants for EcoSphere AI backend.

Centralizing magic values here prevents duplication and makes business-rule
changes a single-file operation.
"""

# ── User roles ────────────────────────────────────────────────────────────────
ROLE_USER = "user"
ROLE_ADMIN = "admin"

# ── Green score bounds ────────────────────────────────────────────────────────
GREEN_SCORE_MIN: int = 0
GREEN_SCORE_MAX: int = 100
GREEN_SCORE_DEFAULT: int = 50

# ── Emission factors (kg CO₂ per unit) ───────────────────────────────────────
EMISSION_FACTORS: dict[str, float] = {
    # Transportation (per km)
    "car": 0.12,
    "bike": 0.02,
    "bus": 0.05,
    "metro": 0.03,
    "train": 0.04,
    "flight": 0.25,
    "walking": 0.00,
    # Electricity (per kWh)
    "consumption": 0.82,
    "ac_usage": 1.50,
    "appliance": 0.35,
    # Food (per meal)
    "vegetarian": 1.20,
    "non-vegetarian": 3.30,
    "vegan": 0.70,
    # Waste (per kg)
    "plastic": 2.00,
    "food_waste": 0.50,
    "paper": 0.80,
}

# Default factor when activity type is not recognised
DEFAULT_EMISSION_FACTOR: float = 0.10

# Baseline car emission factor used to compute carbon savings
CAR_BASELINE_FACTOR: float = 0.12

# ── Green-score delta rules ───────────────────────────────────────────────────
SCORE_DELTA_LOW_EMISSION_TRANSPORT: int = 3    # walking, cycling, metro
SCORE_DELTA_HIGH_EMISSION_TRANSPORT: int = -3
SCORE_DELTA_GOOD_ELECTRICITY: int = 2
SCORE_DELTA_BAD_ELECTRICITY: int = -4
ELECTRICITY_HIGH_KWH_THRESHOLD: float = 10.0
AC_LONG_USAGE_HOURS_THRESHOLD: float = 4.0
SCORE_DELTA_PLANT_BASED_FOOD: int = 3
SCORE_DELTA_MEAT_FOOD: int = -3
WASTE_HIGH_KG_THRESHOLD: float = 5.0
SCORE_DELTA_LOW_WASTE: int = 1
SCORE_DELTA_HIGH_WASTE: int = -3

# ── Goal completion reward ────────────────────────────────────────────────────
GOAL_COMPLETION_SCORE_BONUS: int = 10
GOALS_FOR_CARBON_HERO_BADGE: int = 3

# ── Badge definitions ─────────────────────────────────────────────────────────
BADGE_ECO_STARTER = {
    "name": "Eco Starter",
    "icon": "🌱",
    "description": (
        "Welcome to EcoSphere AI! You've taken your first step "
        "towards carbon footprint awareness."
    ),
}
BADGE_GREEN_WARRIOR = {
    "name": "Green Warrior",
    "icon": "🛡️",
    "description": "Maintained a sustainable logging streak of 3+ days.",
}
BADGE_CLIMATE_CHAMPION = {
    "name": "Climate Champion",
    "icon": "🏆",
    "description": "Maintained an outstanding logging streak of 7+ days.",
}
BADGE_CARBON_NEUTRAL_HERO = {
    "name": "Carbon Neutral Hero",
    "icon": "🌍",
    "description": "Achieved an eco green score of 80+.",
}

# Streak thresholds that unlock badges
STREAK_GREEN_WARRIOR: int = 3
STREAK_CLIMATE_CHAMPION: int = 7
SCORE_CARBON_NEUTRAL_HERO: int = 80

# ── JWT ───────────────────────────────────────────────────────────────────────
JWT_EXPIRY_DAYS: int = 7

# ── Leaderboard ───────────────────────────────────────────────────────────────
NOTIFICATION_FETCH_LIMIT: int = 20

# ── Seeding ───────────────────────────────────────────────────────────────────
SEED_DAYS: int = 14
SEED_ACTIVITIES_PER_DAY_MIN: int = 2
SEED_ACTIVITIES_PER_DAY_MAX: int = 4
SEED_VALUE_VARIANCE_LOW: float = 0.70
SEED_VALUE_VARIANCE_HIGH: float = 1.30
