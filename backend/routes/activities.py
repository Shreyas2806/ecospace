"""
routes/activities.py — Carbon activity logging and retrieval endpoints.

Provides REST endpoints for users to log daily carbon-producing activities,
retrieve their history, and query emission factor reference data.
"""

import logging
from flask import Blueprint, request, jsonify
from routes.auth import token_required
from models import Activity, EmissionFactor, User, AdminAnalytics
from database import db
from datetime import datetime
from constants import (
    EMISSION_FACTORS,
    DEFAULT_EMISSION_FACTOR,
    CAR_BASELINE_FACTOR,
    GREEN_SCORE_MIN,
    GREEN_SCORE_MAX,
    SCORE_DELTA_LOW_EMISSION_TRANSPORT,
    SCORE_DELTA_HIGH_EMISSION_TRANSPORT,
    SCORE_DELTA_GOOD_ELECTRICITY,
    SCORE_DELTA_BAD_ELECTRICITY,
    ELECTRICITY_HIGH_KWH_THRESHOLD,
    AC_LONG_USAGE_HOURS_THRESHOLD,
    SCORE_DELTA_PLANT_BASED_FOOD,
    SCORE_DELTA_MEAT_FOOD,
    WASTE_HIGH_KG_THRESHOLD,
    SCORE_DELTA_LOW_WASTE,
    SCORE_DELTA_HIGH_WASTE,
)

logger = logging.getLogger(__name__)
activities_bp = Blueprint("activities", __name__)

# Emission factor threshold below which transport is considered low-emission
_LOW_EMISSION_TRANSPORT_THRESHOLD: float = 0.05

# Activity types that earn a positive food score
_PLANT_BASED_FOOD_TYPES: frozenset[str] = frozenset({"vegetarian", "vegan"})


def _get_emission_factor(category: str, activity_type: str) -> float:
    """Retrieve the kg CO₂ emission factor for a given activity.

    The function first queries the ``EmissionFactor`` database table for a
    persisted value.  If no record is found it falls back to the hardcoded
    ``EMISSION_FACTORS`` dictionary, and finally to ``DEFAULT_EMISSION_FACTOR``.

    Args:
        category: High-level activity category (e.g. ``"transportation"``).
        activity_type: Specific activity sub-type (e.g. ``"car"``).

    Returns:
        Emission factor as a float (kg CO₂ per unit).
    """
    factor_record = EmissionFactor.query.filter_by(
        category=category, activity_type=activity_type
    ).first()
    if factor_record:
        return factor_record.factor
    return EMISSION_FACTORS.get(activity_type, DEFAULT_EMISSION_FACTOR)


def _calculate_score_delta(category: str, activity_type: str, value: float, factor: float) -> int:
    """Compute the green-score change resulting from logging an activity.

    Business rules:
    - **Transportation**: Low-emission transport (metro, walk, bike) earns
      positive points; high-emission transport (car, flight) loses points.
    - **Electricity**: Heavy consumption loses points; moderate usage earns.
    - **Food**: Plant-based meals earn points; meat-heavy meals lose points.
    - **Waste**: Small amounts earn a point; large amounts lose points.

    Args:
        category: High-level activity category.
        activity_type: Specific activity sub-type.
        value: Quantity logged (km, kWh, meals, kg …).
        factor: Emission factor used for the activity.

    Returns:
        Integer delta to apply to the user's green score (may be negative).
    """
    if category == "transportation":
        return (
            SCORE_DELTA_LOW_EMISSION_TRANSPORT
            if factor < _LOW_EMISSION_TRANSPORT_THRESHOLD
            else SCORE_DELTA_HIGH_EMISSION_TRANSPORT
        )

    if category == "electricity":
        high_consumption = (
            activity_type == "consumption" and value > ELECTRICITY_HIGH_KWH_THRESHOLD
        ) or (activity_type == "ac_usage" and value > AC_LONG_USAGE_HOURS_THRESHOLD)
        return SCORE_DELTA_BAD_ELECTRICITY if high_consumption else SCORE_DELTA_GOOD_ELECTRICITY

    if category == "food":
        return (
            SCORE_DELTA_PLANT_BASED_FOOD
            if activity_type in _PLANT_BASED_FOOD_TYPES
            else SCORE_DELTA_MEAT_FOOD
        )

    if category == "waste":
        return SCORE_DELTA_HIGH_WASTE if value > WASTE_HIGH_KG_THRESHOLD else SCORE_DELTA_LOW_WASTE

    return 0


def _compute_carbon_saved(category: str, value: float, carbon_footprint: float) -> float:
    """Calculate how much CO₂ was saved compared to the car baseline.

    Only transportation activities are evaluated — other categories return
    ``0.0`` because there is no meaningful single baseline to compare against.

    Args:
        category: High-level activity category.
        value: Distance or quantity logged.
        carbon_footprint: Actual kg CO₂ produced by the logged activity.

    Returns:
        Non-negative float representing kg CO₂ saved vs. car baseline.
    """
    if category != "transportation":
        return 0.0
    baseline = value * CAR_BASELINE_FACTOR
    return max(0.0, baseline - carbon_footprint)


@activities_bp.route("", methods=["POST"])
@token_required
def log_activity(current_user: User):
    """Log a new carbon-producing activity for the authenticated user.

    Request JSON body fields:
        - ``category`` (str): e.g. ``"transportation"``.
        - ``activity_type`` (str): e.g. ``"car"``, ``"metro"``.
        - ``value`` (float): Quantity in the appropriate unit (km, kWh, etc.).

    Returns:
        201 JSON with the saved activity, updated green score, and carbon saved.
        400 if required fields are missing or ``value`` is non-numeric.
        500 if a database error occurs.
    """
    data = request.get_json()
    if not data or not data.get("category") or not data.get("activity_type") or data.get("value") is None:
        return jsonify({"message": "Missing activity details"}), 400

    category = data["category"].strip().lower()
    activity_type = data["activity_type"].strip().lower()

    try:
        value = float(data["value"])
    except (ValueError, TypeError):
        return jsonify({"message": "Invalid activity value — must be a number"}), 400

    factor = _get_emission_factor(category, activity_type)
    carbon_footprint = value * factor

    new_activity = Activity(
        user_id=current_user.id,
        category=category,
        activity_type=activity_type,
        value=value,
        carbon_footprint=carbon_footprint,
    )

    try:
        db.session.add(new_activity)

        old_score = current_user.green_score
        score_delta = _calculate_score_delta(category, activity_type, value, factor)
        current_user.green_score = max(GREEN_SCORE_MIN, min(GREEN_SCORE_MAX, old_score + score_delta))

        # Update platform-wide analytics
        analytics = AdminAnalytics.query.first()
        if not analytics:
            analytics = AdminAnalytics(
                total_users=User.query.count(),
                total_activities_logged=0,
                total_carbon_saved=0.0,
            )
            db.session.add(analytics)

        analytics.total_activities_logged += 1
        saved = _compute_carbon_saved(category, value, carbon_footprint)
        analytics.total_carbon_saved += saved

        db.session.commit()
        logger.info(
            "User %d logged activity: %s/%s (%.2f units, %.4f kg CO₂, score delta %+d)",
            current_user.id,
            category,
            activity_type,
            value,
            carbon_footprint,
            score_delta,
        )

        return (
            jsonify(
                {
                    "message": "Activity logged successfully",
                    "activity": new_activity.to_dict(),
                    "new_green_score": current_user.green_score,
                    "green_score_delta": score_delta,
                    "carbon_saved": saved,
                }
            ),
            201,
        )

    except Exception as exc:
        db.session.rollback()
        logger.exception("Failed to log activity for user %d: %s", current_user.id, exc)
        return jsonify({"message": f"Failed to log activity: {exc!s}"}), 500


@activities_bp.route("", methods=["GET"])
@token_required
def get_activities(current_user: User):
    """Return the authenticated user's activity history, newest first.

    Query parameters:
        - ``category`` (str, optional): Filter by activity category.

    Returns:
        200 JSON list of serialised :class:`Activity` records.
    """
    category = request.args.get("category")

    query = Activity.query.filter_by(user_id=current_user.id)
    if category:
        query = query.filter_by(category=category.strip().lower())

    activities = query.order_by(Activity.timestamp.desc()).all()
    return jsonify([act.to_dict() for act in activities]), 200


@activities_bp.route("/factors", methods=["GET"])
def get_factors():
    """Return all emission factors stored in the database.

    This public endpoint allows the frontend to display reference emission
    data without requiring authentication.

    Returns:
        200 JSON list of serialised :class:`EmissionFactor` records.
    """
    factors = EmissionFactor.query.all()
    return jsonify([f.to_dict() for f in factors]), 200
