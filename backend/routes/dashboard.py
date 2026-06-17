from flask import Blueprint, jsonify
from routes.auth import token_required
from models import Activity, Goal
from database import db
from datetime import datetime, timedelta

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('', methods=['GET'])
@token_required
def get_dashboard_data(current_user):
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    week_start = today_start - timedelta(days=7)
    month_start = today_start - timedelta(days=30)
    
    # Calculate emissions
    today_emissions = db.session.query(db.func.sum(Activity.carbon_footprint)).filter(
        Activity.user_id == current_user.id,
        Activity.timestamp >= today_start
    ).scalar() or 0.0
    
    weekly_emissions = db.session.query(db.func.sum(Activity.carbon_footprint)).filter(
        Activity.user_id == current_user.id,
        Activity.timestamp >= week_start
    ).scalar() or 0.0
    
    monthly_emissions = db.session.query(db.func.sum(Activity.carbon_footprint)).filter(
        Activity.user_id == current_user.id,
        Activity.timestamp >= month_start
    ).scalar() or 0.0
    
    # Category Breakdown (Pie Chart)
    breakdown_query = db.session.query(
        Activity.category, db.func.sum(Activity.carbon_footprint)
    ).filter(
        Activity.user_id == current_user.id
    ).group_by(Activity.category).all()
    
    category_breakdown = {cat: float(val) for cat, val in breakdown_query}
    # Ensure all categories are present
    for cat in ['transportation', 'electricity', 'food', 'waste']:
        category_breakdown.setdefault(cat, 0.0)
        
    # Weekly Trends (Last 7 Days - Line Chart)
    trend_data = []
    for i in range(6, -1, -1):
        day = today_start - timedelta(days=i)
        day_end = day + timedelta(days=1)
        day_val = db.session.query(db.func.sum(Activity.carbon_footprint)).filter(
            Activity.user_id == current_user.id,
            Activity.timestamp >= day,
            Activity.timestamp < day_end
        ).scalar() or 0.0
        trend_data.append({
            "date": day.strftime("%b %d"),
            "emissions": float(day_val)
        })
        
    # Comparison Data (Bar Chart)
    # User's monthly average vs City Average (assumed 250 kg CO2 / month)
    comparison = {
        "user": float(monthly_emissions),
        "average": 240.0,
        "optimal": 150.0
    }
    
    # Active Goals Progress
    active_goals = Goal.query.filter_by(user_id=current_user.id, status='active').all()
    goals_progress = []
    for g in active_goals:
        # Calculate reduction achieved for this category in the last 30 days
        # baseline vs actual, or simplistic calculation for demonstration:
        # we check the target date, compare starting date, and how much they logged.
        # Let's return a simple visual percentage based on goal target
        # Let's say progress is related to green score or number of activities logged in that category.
        cat_logs_count = Activity.query.filter(
            Activity.user_id == current_user.id,
            Activity.category == g.category,
            Activity.timestamp >= g.created_at
        ).count()
        
        # progress from 0% to 100% based on activity logs (e.g. 5 logs = 100%)
        progress_pct = min(100.0, float(cat_logs_count * 20.0))
        
        goals_progress.append({
            "id": g.id,
            "title": g.title,
            "category": g.category,
            "target_reduction_pct": g.target_reduction_pct,
            "progress_pct": progress_pct,
            "target_date": g.target_date.isoformat(),
            "status": g.status
        })

    # Total savings calculated from all transportation activities
    # (Baseline car emissions vs alternative transport emissions)
    total_saved = db.session.query(db.func.sum(Activity.value * 0.12 - Activity.carbon_footprint)).filter(
        Activity.user_id == current_user.id,
        Activity.category == 'transportation',
        Activity.activity_type.in_(['metro', 'bus', 'walking', 'bike'])
    ).scalar() or 0.0
    
    return jsonify({
        "today_emissions": float(today_emissions),
        "weekly_emissions": float(weekly_emissions),
        "monthly_emissions": float(monthly_emissions),
        "green_score": current_user.green_score,
        "streak": current_user.streak,
        "category_breakdown": category_breakdown,
        "trend_data": trend_data,
        "comparison": comparison,
        "goals_progress": goals_progress,
        "total_saved": float(max(0.0, total_saved))
    }), 200
