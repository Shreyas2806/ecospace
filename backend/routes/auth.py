"""
routes/auth.py — Authentication endpoints and JWT middleware for EcoSphere AI.

Provides user registration, login, password-reset, and profile retrieval.
The ``token_required`` decorator is imported by other route modules to protect
any endpoint that requires an authenticated session.
"""

import logging
from datetime import datetime, timedelta
from functools import wraps

import jwt
from flask import Blueprint, request, jsonify

from config import Config
from constants import (
    BADGE_ECO_STARTER,
    BADGE_GREEN_WARRIOR,
    BADGE_CLIMATE_CHAMPION,
    BADGE_CARBON_NEUTRAL_HERO,
    JWT_EXPIRY_DAYS,
    SCORE_CARBON_NEUTRAL_HERO,
    STREAK_CLIMATE_CHAMPION,
    STREAK_GREEN_WARRIOR,
)
from database import db
from models import User

logger = logging.getLogger(__name__)
auth_bp = Blueprint("auth", __name__)


# ── JWT middleware ─────────────────────────────────────────────────────────────

def token_required(f):
    """Flask route decorator that enforces JWT authentication.

    Extracts the Bearer token from the ``Authorization`` header, verifies its
    signature and expiry, and injects the resolved ``User`` object as the first
    positional argument of the decorated view function.

    Args:
        f: The route handler function to protect.

    Returns:
        Wrapped function that returns 401 JSON on any auth failure, or calls
        *f* with ``current_user`` prepended to the argument list on success.
    """

    @wraps(f)
    def decorated(*args, **kwargs):
        token: str | None = None

        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]

        if not token:
            return jsonify({"message": "Token is missing!"}), 401

        try:
            payload = jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
            current_user = User.query.get(payload["user_id"])
            if not current_user:
                return jsonify({"message": "Invalid token user!"}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Token has expired!"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"message": "Invalid token!"}), 401

        return f(current_user, *args, **kwargs)

    return decorated


# ── Helpers ────────────────────────────────────────────────────────────────────

def _add_badge_if_missing(user: User, badge_def: dict) -> None:
    """Award a badge to *user* only if they do not already hold it.

    Also creates an in-app notification to inform the user of the new badge.

    Args:
        user: The recipient ``User`` instance.
        badge_def: A badge definition dict from :mod:`constants`
            with keys ``name``, ``icon``, and ``description``.
    """
    from models import Notification, Reward

    name = badge_def["name"]
    if Reward.query.filter_by(user_id=user.id, badge_name=name).first():
        return

    db.session.add(
        Reward(
            user_id=user.id,
            badge_name=name,
            badge_icon=badge_def["icon"],
            description=badge_def["description"],
        )
    )
    db.session.add(
        Notification(
            user_id=user.id,
            message=f"Congratulations! You unlocked the '{name}' badge: {badge_def['description']}",
        )
    )
    logger.info("Badge '%s' awarded to user %d.", name, user.id)


def check_streak_badges(user: User) -> None:
    """Evaluate and award streak- and score-based badges for *user*.

    This should be called after updating ``user.streak`` or ``user.green_score``
    to ensure the user receives any newly earned badges.

    Badges awarded:
    - **Green Warrior** — streak ≥ 3
    - **Climate Champion** — streak ≥ 7
    - **Carbon Neutral Hero** — green_score ≥ 80

    Args:
        user: The ``User`` whose progress should be evaluated.
    """
    if user.streak >= STREAK_GREEN_WARRIOR:
        _add_badge_if_missing(user, BADGE_GREEN_WARRIOR)
    if user.streak >= STREAK_CLIMATE_CHAMPION:
        _add_badge_if_missing(user, BADGE_CLIMATE_CHAMPION)
    if user.green_score >= SCORE_CARBON_NEUTRAL_HERO:
        _add_badge_if_missing(user, BADGE_CARBON_NEUTRAL_HERO)


def _generate_jwt(user: User) -> str:
    """Create a signed JWT for *user* valid for ``JWT_EXPIRY_DAYS`` days.

    Args:
        user: The authenticated ``User`` instance.

    Returns:
        Encoded JWT string.
    """
    payload = {
        "user_id": user.id,
        "exp": datetime.utcnow() + timedelta(days=JWT_EXPIRY_DAYS),
    }
    return jwt.encode(payload, Config.SECRET_KEY, algorithm="HS256")


# ── Route handlers ─────────────────────────────────────────────────────────────

@auth_bp.route("/register", methods=["POST"])
def register():
    """Register a new EcoSphere AI user account.

    Request JSON body fields:
        - ``email`` (str): Unique email address.
        - ``password`` (str): Plain-text password (hashed before storage).
        - ``name`` (str): Display name.
        - ``role`` (str, optional): ``"user"`` (default) or ``"admin"``.

    Returns:
        201 JSON with the new user's profile on success.
        400 if required fields are missing.
        409 if the email address is already registered.
        500 on unexpected database errors.
    """
    from models import Notification, Reward

    data = request.get_json()
    if not data or not data.get("email") or not data.get("password") or not data.get("name"):
        return jsonify({"message": "Missing registration details"}), 400

    email = data["email"].strip().lower()
    name = data["name"].strip()
    password = data["password"]
    role = data.get("role", "user")

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "User with this email already exists"}), 409

    new_user = User(name=name, email=email, role=role)
    new_user.set_password(password)

    try:
        db.session.add(new_user)
        db.session.flush()  # populate new_user.id before referencing it below

        db.session.add(
            Reward(
                user_id=new_user.id,
                badge_name=BADGE_ECO_STARTER["name"],
                badge_icon=BADGE_ECO_STARTER["icon"],
                description=BADGE_ECO_STARTER["description"],
            )
        )
        db.session.add(
            Notification(
                user_id=new_user.id,
                message=(
                    "Welcome to EcoSphere AI! Start tracking your daily activities "
                    "to calculate your carbon footprint."
                ),
            )
        )
        db.session.commit()
        logger.info("New user registered: %s (role=%s)", email, role)
        return jsonify({"message": "User registered successfully!", "user": new_user.to_dict()}), 201

    except Exception as exc:
        db.session.rollback()
        logger.exception("Registration failed for %s: %s", email, exc)
        return jsonify({"message": f"Registration failed: {exc!s}"}), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    """Authenticate a user and return a JWT access token.

    Also updates the user's login streak and evaluates badge eligibility.

    Request JSON body fields:
        - ``email`` (str): Registered email address.
        - ``password`` (str): Account password.

    Returns:
        200 JSON with ``token`` and serialised ``user`` profile on success.
        400 if email or password is absent.
        401 if credentials are invalid.
    """
    data = request.get_json()
    if not data or not data.get("email") or not data.get("password"):
        return jsonify({"message": "Missing email or password"}), 400

    email = data["email"].strip().lower()
    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(data["password"]):
        return jsonify({"message": "Invalid email or password"}), 401

    # ── Streak update ────────────────────────────────────────────────────────
    today = datetime.utcnow().date()
    if user.last_active_date:
        delta = (today - user.last_active_date).days
        if delta == 1:
            user.streak += 1
        elif delta > 1:
            user.streak = 1
        # delta == 0: same day login — streak unchanged
    else:
        user.streak = 1
    user.last_active_date = today

    check_streak_badges(user)
    db.session.commit()

    logger.info("User %d logged in (streak=%d).", user.id, user.streak)

    return (
        jsonify({"message": "Login successful", "token": _generate_jwt(user), "user": user.to_dict()}),
        200,
    )


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    """Initiate a password-reset flow for the supplied email address.

    The response is deliberately ambiguous — it always returns 200 to prevent
    user-enumeration attacks.

    Request JSON body fields:
        - ``email`` (str): Account email address.

    Returns:
        200 JSON with a generic success message regardless of whether the
        email is registered.
        400 if the email field is absent.
    """
    data = request.get_json()
    if not data or not data.get("email"):
        return jsonify({"message": "Missing email field"}), 400

    # Intentionally uniform response to prevent email enumeration
    return jsonify({"message": "If this email is registered, password reset instructions have been sent."}), 200


@auth_bp.route("/profile", methods=["GET"])
@token_required
def get_profile(current_user: User):
    """Return the full profile of the authenticated user.

    Includes the user's badges (rewards) and active goals in the response.

    Returns:
        200 JSON user profile dict extended with ``badges`` and ``goals`` lists.
    """
    user_data = current_user.to_dict()
    user_data["badges"] = [badge.to_dict() for badge in current_user.rewards]
    user_data["goals"] = [goal.to_dict() for goal in current_user.goals]
    return jsonify(user_data), 200
