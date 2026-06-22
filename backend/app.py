"""
app.py — EcoSphere AI Flask application factory.

Entry point that wires together the database, CORS policy, route blueprints,
and demo-data seeding.  All configuration is read from :mod:`config`.
"""

import logging
import os
import random
from datetime import datetime, timedelta

from flask import Flask, jsonify
from flask_cors import CORS

from config import Config
from constants import (
    BADGE_ECO_STARTER,
    BADGE_GREEN_WARRIOR,
    SEED_ACTIVITIES_PER_DAY_MAX,
    SEED_ACTIVITIES_PER_DAY_MIN,
    SEED_DAYS,
    SEED_VALUE_VARIANCE_HIGH,
    SEED_VALUE_VARIANCE_LOW,
)
from database import db, init_db
from models import Activity, User

# Import blueprints
from routes.activities import activities_bp
from routes.admin import admin_bp
from routes.auth import auth_bp
from routes.coach import coach_bp
from routes.dashboard import dashboard_bp
from routes.gamification import gamification_bp
from routes.mobility import mobility_bp
from routes.predictions import predictions_bp
from routes.simulator import simulator_bp

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ── Demo activity pool ────────────────────────────────────────────────────────
# (category, activity_type, base_value, emission_factor)
_DEMO_ACTIVITY_POOL: list[tuple[str, str, float, float]] = [
    ("transportation", "car", 12.0, 0.12),
    ("transportation", "metro", 20.0, 0.03),
    ("electricity", "consumption", 10.0, 0.82),
    ("food", "vegetarian", 3.0, 1.2),
    ("food", "non-vegetarian", 1.0, 3.3),
    ("waste", "plastic", 1.5, 2.0),
    ("waste", "food_waste", 0.5, 0.5),
]


def create_app() -> Flask:
    """Create and configure the Flask application instance.

    Returns:
        Flask: Fully configured application ready to serve requests.
    """
    app = Flask(__name__)
    app.config.from_object(Config)

    # CORS — explicitly allow the Vercel frontend + wildcard fallback
    CORS(
        app,
        resources={r"/api/*": {"origins": [
            "https://ecosphere-six.vercel.app",
            "https://*.vercel.app",
            "http://localhost:5173",
            "http://localhost:3000",
        ]}},
        supports_credentials=False,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    )

    init_db(app)
    seed_demo_data(app)

    # ── Blueprints ────────────────────────────────────────────────────────────
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(activities_bp, url_prefix="/api/activities")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
    app.register_blueprint(mobility_bp, url_prefix="/api/mobility")
    app.register_blueprint(coach_bp, url_prefix="/api/coach")
    app.register_blueprint(simulator_bp, url_prefix="/api/simulator")
    app.register_blueprint(predictions_bp, url_prefix="/api/predictions")
    app.register_blueprint(gamification_bp, url_prefix="/api/gamification")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")

    @app.route("/health", methods=["GET"])
    def health_check():
        """Lightweight liveness probe used by load-balancers and monitoring tools."""
        return (
            jsonify(
                {
                    "status": "healthy",
                    "service": "EcoSphere AI API Backend",
                    "time": datetime.utcnow().isoformat(),
                }
            ),
            200,
        )

    return app


def seed_demo_data(app: Flask) -> None:
    """Populate the database with demo users and 14 days of sample activities.

    This function is idempotent — it checks for existing records before
    inserting so that repeated application restarts do not duplicate data.

    Args:
        app: The Flask application whose context is used for DB access.
    """
    with app.app_context():
        _ensure_admin_user()
        _ensure_demo_user()


def _ensure_admin_user() -> None:
    """Create the admin demo account if it does not already exist."""
    from models import User  # local import avoids circular dependency at module level

    if User.query.filter_by(email="admin@ecosphere.com").first():
        return

    admin = User(name="Eco Admin", email="admin@ecosphere.com", role="admin")
    admin.set_password("admin123")
    db.session.add(admin)
    db.session.commit()
    logger.info("Admin demo user created.")


def _ensure_demo_user() -> None:
    """Create the standard demo user with 14 days of sample activities and starter badges."""
    from models import Notification, Reward, User

    if User.query.filter_by(email="user@ecosphere.com").first():
        return

    user = User(
        name="Jane Doe",
        email="user@ecosphere.com",
        role="user",
        green_score=68,
        streak=5,
    )
    user.set_password("user123")
    db.session.add(user)
    db.session.commit()

    _seed_activities(user)
    _seed_starter_badges(user)
    db.session.commit()
    logger.info("Demo user and %d-day sample activities seeded.", SEED_DAYS)


def _seed_activities(user: User) -> None:
    """Generate randomised historical activities for *user* spanning ``SEED_DAYS`` days.

    Args:
        user: The ``User`` model instance to associate activities with.
    """
    now = datetime.utcnow()
    for i in range(SEED_DAYS, 0, -1):
        day = now - timedelta(days=i, hours=random.randint(1, 10))
        daily_activities = random.sample(
            _DEMO_ACTIVITY_POOL,
            random.randint(SEED_ACTIVITIES_PER_DAY_MIN, SEED_ACTIVITIES_PER_DAY_MAX),
        )
        for cat, act_type, base_val, factor in daily_activities:
            value = base_val * random.uniform(SEED_VALUE_VARIANCE_LOW, SEED_VALUE_VARIANCE_HIGH)
            carbon = value * factor
            db.session.add(
                Activity(
                    user_id=user.id,
                    category=cat,
                    activity_type=act_type,
                    value=value,
                    carbon_footprint=carbon,
                    timestamp=day,
                )
            )


def _seed_starter_badges(user: User) -> None:
    """Award the two starter badges to a newly registered demo user.

    Args:
        user: The ``User`` model instance to receive the badges.
    """
    from models import Reward

    for badge_def in (BADGE_ECO_STARTER, BADGE_GREEN_WARRIOR):
        db.session.add(
            Reward(
                user_id=user.id,
                badge_name=badge_def["name"],
                badge_icon=badge_def["icon"],
                description=badge_def["description"],
            )
        )


if __name__ == "__main__":
    app = create_app()
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
