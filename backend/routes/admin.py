from flask import Blueprint, jsonify, request
from routes.auth import token_required
from models import User, Activity, AdminAnalytics
from database import db

admin_bp = Blueprint('admin', __name__)

def admin_required(f):
    @token_required
    def decorated(current_user, *args, **kwargs):
        if current_user.role != 'admin':
            return jsonify({"message": "Admin privileges required!"}), 403
        return f(current_user, *args, **kwargs)
    # Rename endpoint to avoid conflicts in Flask routing
    decorated.__name__ = f.__name__
    return decorated

@admin_bp.route('/analytics', methods=['GET'])
@admin_required
def get_admin_analytics(current_user):
    total_users = User.query.count()
    total_activities = Activity.query.count()
    
    # Calculate most common source
    common_source_query = db.session.query(
        Activity.category, db.func.count(Activity.id)
    ).group_by(Activity.category).order_by(db.func.count(Activity.id).desc()).first()
    
    most_common = common_source_query[0] if common_source_query else "None"
    
    # Calculate carbon saved:
    # Baseline car emissions vs actual public transport/walking/biking
    total_saved = db.session.query(db.func.sum(Activity.value * 0.12 - Activity.carbon_footprint)).filter(
        Activity.category == 'transportation',
        Activity.activity_type.in_(['metro', 'bus', 'walking', 'bike'])
    ).scalar() or 0.0
    
    # Most sustainable users (highest green score)
    top_users = User.query.order_by(User.green_score.desc()).limit(5).all()
    sustainable_users = [u.to_dict() for u in top_users]
    
    # City-wise analytics (mock breakdown based on user distribution for visuals)
    city_analytics = [
        {"city": "New York", "users": int(total_users * 0.4) or 1, "saved_co2": float(round(total_saved * 0.45, 2))},
        {"city": "San Francisco", "users": int(total_users * 0.3) or 1, "saved_co2": float(round(total_saved * 0.35, 2))},
        {"city": "London", "users": int(total_users * 0.2) or 1, "saved_co2": float(round(total_saved * 0.15, 2))},
        {"city": "Tokyo", "users": int(total_users * 0.1) or 1, "saved_co2": float(round(total_saved * 0.05, 2))}
    ]
    
    # Update table
    analytics_record = AdminAnalytics.query.first()
    if not analytics_record:
        analytics_record = AdminAnalytics()
        db.session.add(analytics_record)
        
    analytics_record.total_users = total_users
    analytics_record.total_activities_logged = total_activities
    analytics_record.total_carbon_saved = float(total_saved)
    analytics_record.most_common_source = most_common
    db.session.commit()
    
    return jsonify({
        "total_users": total_users,
        "total_activities_logged": total_activities,
        "total_carbon_saved": float(round(total_saved, 2)),
        "most_common_source": most_common,
        "sustainable_users": sustainable_users,
        "city_analytics": city_analytics
    }), 200

@admin_bp.route('/users', methods=['GET'])
@admin_required
def list_users(current_user):
    users = User.query.all()
    return jsonify([u.to_dict() for u in users]), 200

@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(current_user, user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404
        
    if user.id == current_user.id:
        return jsonify({"message": "Cannot delete your own admin account"}), 400
        
    try:
        db.session.delete(user)
        db.session.commit()
        return jsonify({"message": "User deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Failed to delete user: {str(e)}"}), 500

@admin_bp.route('/report', methods=['GET'])
@admin_required
def generate_report(current_user):
    # Retrieve all users and activities for summary metrics
    total_users = User.query.count()
    activities = Activity.query.all()
    
    total_co2 = sum(a.carbon_footprint for a in activities)
    categories = {"transportation": 0.0, "electricity": 0.0, "food": 0.0, "waste": 0.0}
    for a in activities:
        categories[a.category] = categories.get(a.category, 0.0) + a.carbon_footprint
        
    report = {
        "report_title": "EcoSphere AI Platform Global Sustainability Report",
        "generated_at": datetime.utcnow().isoformat(),
        "total_active_users": total_users,
        "total_emissions_logged_kg": float(round(total_co2, 2)),
        "category_shares_kg": {k: float(round(v, 2)) for k, v in categories.items()},
        "average_emission_per_user_kg": float(round(total_co2 / total_users, 2)) if total_users > 0 else 0.0,
        "status": "APPROVED"
    }
    return jsonify(report), 200
