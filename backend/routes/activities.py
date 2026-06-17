from flask import Blueprint, request, jsonify
from routes.auth import token_required
from models import Activity, EmissionFactor, User, AdminAnalytics
from database import db
from datetime import datetime

activities_bp = Blueprint('activities', __name__)

@activities_bp.route('', methods=['POST'])
@token_required
def log_activity(current_user):
    data = request.get_json()
    if not data or not data.get('category') or not data.get('activity_type') or data.get('value') is None:
        return jsonify({"message": "Missing activity details"}), 400
        
    category = data.get('category').strip().lower()
    activity_type = data.get('activity_type').strip().lower()
    try:
        value = float(data.get('value'))
    except ValueError:
        return jsonify({"message": "Invalid activity value"}), 400
        
    # Get Emission Factor
    factor_record = EmissionFactor.query.filter_by(category=category, activity_type=activity_type).first()
    
    if factor_record:
        factor = factor_record.factor
    else:
        # Static defaults just in case
        defaults = {
            "car": 0.12, "bike": 0.02, "bus": 0.05, "metro": 0.03, "train": 0.04, "flight": 0.25, "walking": 0.0,
            "consumption": 0.82, "ac_usage": 1.5, "appliance": 0.35,
            "vegetarian": 1.2, "non-vegetarian": 3.3, "vegan": 0.7,
            "plastic": 2.0, "food_waste": 0.5, "paper": 0.8
        }
        factor = defaults.get(activity_type, 0.10)
        
    carbon_footprint = value * factor
    
    new_activity = Activity(
        user_id=current_user.id,
        category=category,
        activity_type=activity_type,
        value=value,
        carbon_footprint=carbon_footprint
    )
    
    try:
        db.session.add(new_activity)
        
        # Calculate impact on Green Score
        # High impact: adjust score up or down based on carbon footprint severity
        old_score = current_user.green_score
        score_change = 0
        
        if category == 'transportation':
            # reference is average car (0.12 kg/km) vs public transport/active transit
            if factor < 0.05: # walking, cycling, metro
                score_change = 3
            else:
                score_change = -3
        elif category == 'electricity':
            # High daily consumption (> 10 kWh) or long AC usage (> 4 hours) degrades score
            if (activity_type == 'consumption' and value > 10) or (activity_type == 'ac_usage' and value > 4):
                score_change = -4
            else:
                score_change = 2
        elif category == 'food':
            # Vegetarian/Vegan yields positive score
            if activity_type in ['vegetarian', 'vegan']:
                score_change = 3
            else:
                score_change = -3
        elif category == 'waste':
            # Any waste logged reduces score, but recycling/low waste increases slightly
            if value > 5:
                score_change = -3
            else:
                score_change = 1
                
        current_user.green_score = max(0, min(100, current_user.green_score + score_change))
        
        # Update Admin Analytics
        analytics = AdminAnalytics.query.first()
        if not analytics:
            analytics = AdminAnalytics(total_users=User.query.count(), total_activities_logged=0, total_carbon_saved=0.0)
            db.session.add(analytics)
            
        analytics.total_activities_logged += 1
        
        # Compute saved carbon relative to bad baseline
        # E.g. baseline is traveling same distance by car
        saved = 0.0
        if category == 'transportation':
            car_factor = 0.12
            baseline_emissions = value * car_factor
            saved = max(0.0, baseline_emissions - carbon_footprint)
            analytics.total_carbon_saved += saved
            
        db.session.commit()
        
        return jsonify({
            "message": "Activity logged successfully",
            "activity": new_activity.to_dict(),
            "new_green_score": current_user.green_score,
            "green_score_delta": current_user.green_score - old_score,
            "carbon_saved": saved
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Failed to log activity: {str(e)}"}), 500

@activities_bp.route('', methods=['GET'])
@token_required
def get_activities(current_user):
    category = request.args.get('category')
    
    query = Activity.query.filter_by(user_id=current_user.id)
    if category:
        query = query.filter_by(category=category.strip().lower())
        
    activities = query.order_by(Activity.timestamp.desc()).all()
    return jsonify([act.to_dict() for act in activities]), 200

@activities_bp.route('/factors', methods=['GET'])
def get_factors():
    factors = EmissionFactor.query.all()
    return jsonify([f.to_dict() for f in factors]), 200
