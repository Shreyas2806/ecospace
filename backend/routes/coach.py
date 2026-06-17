from flask import Blueprint, jsonify
from routes.auth import token_required
from models import Activity, Goal
from services.ai_service import generate_coaching_recommendations

coach_bp = Blueprint('coach', __name__)

@coach_bp.route('/tips', methods=['GET'])
@token_required
def get_tips(current_user):
    # Retrieve user's last 50 activities to construct the context
    activities = Activity.query.filter_by(user_id=current_user.id).order_by(Activity.timestamp.desc()).limit(50).all()
    # Retrieve user's goals
    goals = Goal.query.filter_by(user_id=current_user.id).all()
    
    coach_text = generate_coaching_recommendations(current_user.name, activities, goals)
    
    return jsonify({
        "coach_recommendations": coach_text
    }), 200
