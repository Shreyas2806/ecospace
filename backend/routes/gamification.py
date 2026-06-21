"""
routes/gamification.py — Sustainability goals, badges, leaderboard, and notifications.

Provides endpoints for users to set carbon-reduction goals, track badge
achievements, compete on the global leaderboard, and receive in-app
notifications about their eco milestones.
"""

import logging
from datetime import datetime

from flask import Blueprint, request, jsonify

from constants import (
    BADGE_CARBON_NEUTRAL_HERO,
    GOAL_COMPLETION_SCORE_BONUS,
    GOALS_FOR_CARBON_HERO_BADGE,
    GREEN_SCORE_MAX,
    NOTIFICATION_FETCH_LIMIT,
)
from database import db
from models import Goal, Leaderboard, Notification, Reward, User
from routes.auth import token_required

logger = logging.getLogger(__name__)
gamification_bp = Blueprint("gamification", __name__)


# ── Goals ──────────────────────────────────────────────────────────────────────

@gamification_bp.route("/goals", methods=["POST"])
@token_required
def create_goal(current_user: User):
    """Create a new sustainability goal for the authenticated user.

    Request JSON body fields:
        - ``title`` (str): Human-readable goal description.
        - ``category`` (str): Activity category to target (e.g. ``"transportation"``).
        - ``target_reduction_pct`` (float): Desired percentage reduction.
        - ``target_date`` (str): ISO date string ``YYYY-MM-DD``.

    Returns:
        201 JSON with the created goal on success.
        400 if required fields are missing or have invalid formats.
        500 on database errors.
    """
    data = request.get_json()
    required = ("title", "category", "target_date")
    if not data or any(not data.get(k) for k in required) or data.get("target_reduction_pct") is None:
        return jsonify({"message": "Missing goal details"}), 400

    title = data["title"].strip()
    category = data["category"].strip().lower()

    try:
        target_reduction_pct = float(data["target_reduction_pct"])
    except (ValueError, TypeError):
        return jsonify({"message": "Invalid target reduction percentage"}), 400

    try:
        target_date = datetime.strptime(data["target_date"].strip(), "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"message": "Invalid target date format (use YYYY-MM-DD)"}), 400

    new_goal = Goal(
        user_id=current_user.id,
        title=title,
        category=category,
        target_reduction_pct=target_reduction_pct,
        target_date=target_date,
    )

    try:
        db.session.add(new_goal)
        db.session.add(
            Notification(
                user_id=current_user.id,
                message=(
                    f"Goal created: '{title}' — aiming for a "
                    f"{target_reduction_pct}% reduction in {category} emissions."
                ),
            )
        )
        db.session.commit()
        logger.info("User %d created goal: '%s'.", current_user.id, title)
        return jsonify({"message": "Goal created successfully", "goal": new_goal.to_dict()}), 201

    except Exception as exc:
        db.session.rollback()
        logger.exception("Failed to create goal for user %d: %s", current_user.id, exc)
        return jsonify({"message": f"Failed to create goal: {exc!s}"}), 500


@gamification_bp.route("/goals", methods=["GET"])
@token_required
def get_goals(current_user: User):
    """Return all goals belonging to the authenticated user, newest first.

    Returns:
        200 JSON list of serialised :class:`~models.Goal` records.
    """
    goals = Goal.query.filter_by(user_id=current_user.id).order_by(Goal.created_at.desc()).all()
    return jsonify([g.to_dict() for g in goals]), 200


@gamification_bp.route("/goals/<int:goal_id>/complete", methods=["PATCH"])
@token_required
def complete_goal(current_user: User, goal_id: int):
    """Mark a goal as completed and award bonus green-score points.

    Completing a goal:
    - Sets ``goal.status`` to ``"completed"``.
    - Awards ``GOAL_COMPLETION_SCORE_BONUS`` green-score points (capped at 100).
    - Sends a congratulatory notification.
    - If the user now has ≥ ``GOALS_FOR_CARBON_HERO_BADGE`` completed goals,
      awards the *Carbon Neutral Hero* badge.

    Args:
        current_user: Injected by :func:`~routes.auth.token_required`.
        goal_id: Primary key of the goal to complete.

    Returns:
        200 JSON with updated goal and new green score.
        404 if the goal does not belong to the current user.
    """
    goal = Goal.query.filter_by(id=goal_id, user_id=current_user.id).first()
    if not goal:
        return jsonify({"message": "Goal not found"}), 404

    goal.status = "completed"
    current_user.green_score = min(GREEN_SCORE_MAX, current_user.green_score + GOAL_COMPLETION_SCORE_BONUS)

    db.session.add(
        Notification(
            user_id=current_user.id,
            message=(
                f"Hooray! You completed your goal: '{goal.title}' "
                f"and earned +{GOAL_COMPLETION_SCORE_BONUS} Green Score points."
            ),
        )
    )

    completed_count = Goal.query.filter_by(user_id=current_user.id, status="completed").count()
    if completed_count >= GOALS_FOR_CARBON_HERO_BADGE:
        if not Reward.query.filter_by(user_id=current_user.id, badge_name=BADGE_CARBON_NEUTRAL_HERO["name"]).first():
            db.session.add(
                Reward(
                    user_id=current_user.id,
                    badge_name=BADGE_CARBON_NEUTRAL_HERO["name"],
                    badge_icon=BADGE_CARBON_NEUTRAL_HERO["icon"],
                    description=BADGE_CARBON_NEUTRAL_HERO["description"],
                )
            )
            db.session.add(
                Notification(
                    user_id=current_user.id,
                    message=(
                        f"Congratulations! You unlocked the '{BADGE_CARBON_NEUTRAL_HERO['name']}' "
                        "badge for completing 3 sustainability goals."
                    ),
                )
            )
            logger.info("Carbon Neutral Hero badge awarded to user %d.", current_user.id)

    db.session.commit()
    logger.info("User %d completed goal %d.", current_user.id, goal_id)
    return jsonify({"message": "Goal marked as completed", "goal": goal.to_dict(), "new_green_score": current_user.green_score}), 200


# ── Badges ─────────────────────────────────────────────────────────────────────

@gamification_bp.route("/badges", methods=["GET"])
@token_required
def get_badges(current_user: User):
    """Return all badges (rewards) unlocked by the authenticated user.

    Returns:
        200 JSON list of serialised :class:`~models.Reward` records.
    """
    badges = Reward.query.filter_by(user_id=current_user.id).all()
    return jsonify([b.to_dict() for b in badges]), 200


# ── Leaderboard ────────────────────────────────────────────────────────────────

@gamification_bp.route("/leaderboard", methods=["GET"])
@token_required
def get_leaderboard(current_user: User):
    """Regenerate and return the global green-score leaderboard.

    All existing leaderboard records are replaced with a fresh snapshot based
    on the current ``green_score`` values of every registered user.

    Returns:
        200 JSON list of ranked entries.  Each entry includes an
        ``is_current_user`` boolean flag for client-side highlighting.
    """
    users = User.query.order_by(User.green_score.desc()).all()

    # Refresh snapshot atomically
    Leaderboard.query.delete()

    leaderboard_list = []
    for rank, u in enumerate(users, start=1):
        db.session.add(Leaderboard(user_id=u.id, green_score=u.green_score, rank=rank))
        leaderboard_list.append(
            {
                "rank": rank,
                "username": u.name,
                "green_score": u.green_score,
                "is_current_user": u.id == current_user.id,
            }
        )

    db.session.commit()
    return jsonify(leaderboard_list), 200


# ── Notifications ──────────────────────────────────────────────────────────────

@gamification_bp.route("/notifications", methods=["GET"])
@token_required
def get_notifications(current_user: User):
    """Return the most recent in-app notifications for the authenticated user.

    Results are limited to ``NOTIFICATION_FETCH_LIMIT`` records, ordered
    newest-first.

    Returns:
        200 JSON list of serialised :class:`~models.Notification` records.
    """
    notifs = (
        Notification.query
        .filter_by(user_id=current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(NOTIFICATION_FETCH_LIMIT)
        .all()
    )
    return jsonify([n.to_dict() for n in notifs]), 200


@gamification_bp.route("/notifications/read", methods=["POST"])
@token_required
def read_notifications(current_user: User):
    """Mark all unread notifications for the authenticated user as read.

    Returns:
        200 JSON confirmation message.
    """
    Notification.query.filter_by(user_id=current_user.id, is_read=False).update(
        {Notification.is_read: True}
    )
    db.session.commit()
    return jsonify({"message": "All notifications marked as read"}), 200
