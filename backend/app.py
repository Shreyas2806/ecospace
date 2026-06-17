import os
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from database import db, init_db
from models import User, Activity
from datetime import datetime, timedelta
import random

# Import blueprints
from routes.auth import auth_bp
from routes.activities import activities_bp
from routes.dashboard import dashboard_bp
from routes.mobility import mobility_bp
from routes.coach import coach_bp
from routes.simulator import simulator_bp
from routes.predictions import predictions_bp
from routes.gamification import gamification_bp
from routes.admin import admin_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Configure CORS
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # Initialize Database
    init_db(app)
    
    # Seed default users and sample activities
    seed_demo_data(app)
    
    # Register Blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(activities_bp, url_prefix='/api/activities')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(mobility_bp, url_prefix='/api/mobility')
    app.register_blueprint(coach_bp, url_prefix='/api/coach')
    app.register_blueprint(simulator_bp, url_prefix='/api/simulator')
    app.register_blueprint(predictions_bp, url_prefix='/api/predictions')
    app.register_blueprint(gamification_bp, url_prefix='/api/gamification')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    
    @app.route('/health', methods=['GET'])
    def health_check():
        return jsonify({
            "status": "healthy",
            "service": "EcoSphere AI API Backend",
            "time": datetime.utcnow().isoformat()
        }), 200
        
    return app

def seed_demo_data(app):
    with app.app_context():
        # Check if users already exist
        admin = User.query.filter_by(email="admin@ecosphere.com").first()
        if not admin:
            admin = User(name="Eco Admin", email="admin@ecosphere.com", role="admin")
            admin.set_password("admin123")
            db.session.add(admin)
            
        user = User.query.filter_by(email="user@ecosphere.com").first()
        if not user:
            user = User(name="Jane Doe", email="user@ecosphere.com", role="user", green_score=68, streak=5)
            user.set_password("user123")
            db.session.add(user)
            db.session.commit()
            
            # Seed 14 days of demo activities for user so that trends and prediction models work instantly
            now = datetime.utcnow()
            categories_pool = [
                ("transportation", "car", 12.0, 0.12),
                ("transportation", "metro", 20.0, 0.03),
                ("electricity", "consumption", 10.0, 0.82),
                ("food", "vegetarian", 3.0, 1.2),
                ("food", "non-vegetarian", 1.0, 3.3),
                ("waste", "plastic", 1.5, 2.0),
                ("waste", "food_waste", 0.5, 0.5)
            ]
            
            for i in range(14, 0, -1):
                day = now - timedelta(days=i, hours=random.randint(1, 10))
                # Log 2 to 3 random activities per day
                daily_acts = random.sample(categories_pool, random.randint(2, 4))
                for cat, act_type, base_val, factor in daily_acts:
                    val = base_val * random.uniform(0.7, 1.3)
                    carbon = val * factor
                    act_record = Activity(
                        user_id=user.id,
                        category=cat,
                        activity_type=act_type,
                        value=val,
                        carbon_footprint=carbon,
                        timestamp=day
                    )
                    db.session.add(act_record)
                    
            # Seed starter badge for Jane
            from models import Reward
            badge1 = Reward(
                user_id=user.id,
                badge_name="Eco Starter",
                badge_icon="🌱",
                description="Welcome to EcoSphere AI! You've taken your first step towards carbon footprint awareness."
            )
            badge2 = Reward(
                user_id=user.id,
                badge_name="Green Warrior",
                badge_icon="🛡️",
                description="Maintained a sustainable logging streak of 3+ days."
            )
            db.session.add(badge1)
            db.session.add(badge2)
            db.session.commit()
            print("Demo users and 14-day sample activities seeded.")

if __name__ == '__main__':
    app = create_app()
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
