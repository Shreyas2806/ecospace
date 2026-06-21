/**
 * @fileoverview Application-wide named constants for EcoSphere AI frontend.
 *
 * Centralising magic values here keeps business rules in one place and
 * prevents silent inconsistencies across components.
 *
 * @module constants
 */

// ── Activity categories ───────────────────────────────────────────────────────

/** All supported carbon-activity category keys. */
export const CATEGORIES = Object.freeze({
  TRANSPORTATION: 'transportation',
  ELECTRICITY: 'electricity',
  FOOD: 'food',
  WASTE: 'waste',
});

/**
 * Activity types grouped by category.
 * Used to populate the activity-type <select> in the logging form.
 * @type {Record<string, string[]>}
 */
export const CATEGORY_TYPES = Object.freeze({
  [CATEGORIES.TRANSPORTATION]: ['car', 'metro', 'bus', 'train', 'bike', 'walking', 'flight'],
  [CATEGORIES.ELECTRICITY]:    ['consumption', 'ac_usage', 'appliance'],
  [CATEGORIES.FOOD]:           ['vegetarian', 'vegan', 'non-vegetarian'],
  [CATEGORIES.WASTE]:          ['plastic', 'food_waste', 'paper'],
});

/**
 * Human-readable unit labels for each category/activity-type combination.
 * @type {Record<string, string>}
 */
export const ACTIVITY_UNITS = Object.freeze({
  // Transportation
  car: 'km', metro: 'km', bus: 'km', train: 'km',
  bike: 'km', walking: 'km', flight: 'km',
  // Electricity
  consumption: 'kWh', ac_usage: 'hours', appliance: 'kWh',
  // Food
  vegetarian: 'meals', vegan: 'meals', 'non-vegetarian': 'meals',
  // Waste
  plastic: 'kg', food_waste: 'kg', paper: 'kg',
});

// ── Green score ───────────────────────────────────────────────────────────────

/** Minimum possible green score. */
export const GREEN_SCORE_MIN = 0;

/** Maximum possible green score. */
export const GREEN_SCORE_MAX = 100;

// ── Mobility ──────────────────────────────────────────────────────────────────

/** Transport modes available in the mobility comparison form. */
export const COMMUTE_MODES = Object.freeze(['car', 'bus', 'metro', 'train', 'flight']);

// ── Goal form ─────────────────────────────────────────────────────────────────

/** Reduction percentage options shown in the goal creation form. */
export const GOAL_REDUCTION_OPTIONS = Object.freeze([10, 15, 20, 30, 50]);

/** Default reduction percentage for new goals. */
export const GOAL_REDUCTION_DEFAULT = 20;

// ── Navigation tabs ───────────────────────────────────────────────────────────

/** Ordered list of main navigation tab keys. */
export const TABS = Object.freeze({
  DASHBOARD:    'dashboard',
  LOG:          'log',
  MOBILITY:     'mobility',
  COACH:        'coach',
  PREDICTIONS:  'predictions',
  GAMIFICATION: 'gamification',
  ADMIN:        'admin',
});

// ── User roles ────────────────────────────────────────────────────────────────

export const ROLES = Object.freeze({
  USER:  'user',
  ADMIN: 'admin',
});

// ── Simulator defaults ────────────────────────────────────────────────────────

/** Default simulation parameters shown on first render. */
export const SIMULATOR_DEFAULTS = Object.freeze({
  car_km_per_day:    30,
  electricity_kwh:   15,
  meat_meals_per_week: 7,
  flights_per_year:   4,
});

// ── Chart colours ─────────────────────────────────────────────────────────────

/** Consistent colour palette for category breakdown charts. */
export const CATEGORY_COLORS = Object.freeze({
  [CATEGORIES.TRANSPORTATION]: 'rgba(239,68,68,0.8)',
  [CATEGORIES.ELECTRICITY]:    'rgba(234,179,8,0.8)',
  [CATEGORIES.FOOD]:           'rgba(34,197,94,0.8)',
  [CATEGORIES.WASTE]:          'rgba(59,130,246,0.8)',
});
