from flask import Blueprint, request, jsonify
from routes.auth import token_required
from models import Goal, Reward, User, Leaderboard, Notification
from database import db
from datetime import datetime

gamification_bp = Blueprint('gamification', __name__)

@gamification_bp.route('/goals', methods=['POST'])
@token_required
def create_goal(current_user):
    data = request.get_json()
    if not data or not data.get('title') or not data.get('category') or data.get('target_reduction_pct') is None or not data.get('target_date'):
        return jsonify({"message": "Missing goal details"}), 400
        
    title = data.get('title').strip()
    category = data.get('category').strip().lower()
    try:
        target_reduction_pct = float(data.get('target_reduction_pct'))
    except ValueError:
        return jsonify({"message": "Invalid target reduction percentage"}), 400
        
    try:
        target_date = datetime.strptime(data.get('target_date').strip(), "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"message": "Invalid target date format (use YYYY-MM-DD)"}), 400
        
    new_goal = Goal(
        user_id=current_user.id,
        title=title,
        category=category,
        target_reduction_pct=target_reduction_pct,
        target_date=target_date
    )
    
    try:
        db.session.add(new_goal)
        
        # Add notification
        notif = Notification(
            user_id=current_user.id,
            message=f"Goal created: '{title}' - aiming for a {target_reduction_pct}% reduction in {category} emissions."
        )
        db.session.add(notif)
        db.session.commit()
        
        return jsonify({"message": "Goal created successfully", "goal": new_goal.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Failed to create goal: {str(e)}"}), 500

@gamification_bp.route('/goals', methods=['GET'])
@token_required
def get_goals(current_user):
    goals = Goal.query.filter_by(user_id=current_user.id).order_by(Goal.created_at.desc()).all()
    return jsonify([g.to_dict() for g in goals]), 200

@gamification_bp.route('/goals/<int:goal_id>/complete', methods=['PATCH'])
@token_required
def complete_goal(current_user, goal_id):
    goal = Goal.query.filter_by(id=goal_id, user_id=current_user.id).first()
    if not goal:
        return jsonify({"message": "Goal not found"}), 404
        
    goal.status = 'completed'
    
    # Increase green score as reward
    current_user.green_score = min(100, current_user.green_score + 10)
    
    # Add notification
    notif = Notification(
        user_id=current_user.id,
        message=f"Hooray! You completed your goal: '{goal.title}' and earned +10 Green Score points."
    )
    db.session.add(notif)
    
    # Check if they unlock a badge (e.g. if they have 3 completed goals)
    completed_count = Goal.query.filter_by(user_id=current_user.id, status='completed').count()
    if completed_count >= 3:
        # Check if they have the badge
        existing_badge = Reward.query.filter_by(user_id=current_user.id, badge_name="Carbon Neutral Hero").first()
        if not existing_badge:
            badge = Reward(
                user_id=current_user.id,
                badge_name="Carbon Neutral Hero",
                badge_icon="🌎",
                description="Completed 3 or more sustainability goals."
            )
            db.session.add(badge)
            db.session.add(Notification(
                user_id=current_user.id,
                message="Congratulations! You unlocked the 'Carbon Neutral Hero' badge for completing 3 sustainability goals."
            ))
            
    db.session.commit()
    return jsonify({"message": "Goal marked as completed", "goal": goal.to_dict(), "new_green_score": current_user.green_score}), 200

@gamification_bp.route('/badges', methods=['GET'])
@token_required
def get_badges(current_user):
    badges = Reward.query.filter_by(user_id=current_user.id).all()
    return jsonify([b.to_dict() for b in badges]), 200

@gamification_bp.route('/leaderboard', methods=['GET'])
@token_required
def get_leaderboard(current_user):
    # Fetch all users ordered by green score
    users = User.query.order_by(User.green_score.desc()).all()
    
    # Clear older leaderboard records
    Leaderboard.query.delete()
    
    leaderboard_list = []
    for rank, u in enumerate(users, start=1):
        leaderboard_item = Leaderboard(
            user_id=u.id,
            green_score=u.green_score,
            rank=rank
        )
        db.session.add(leaderboard_item)
        leaderboard_list.append({
            "rank": rank,
            "username": u.name,
            "green_score": u.green_score,
            "is_current_user": u.id == current_user.id
        })
        
    db.session.commit()
    return jsonify(leaderboard_list), 200

@gamification_bp.route('/notifications', methods=['GET'])
@token_required
def get_notifications(current_user):
    notifs = Notification.query.filter_by(user_id=current_user.id).order_by(Notification.created_at.desc()).limit(20).all()
    return jsonify([n.to_dict() for n in notifs]), 200

@gamification_bp.route('/notifications/read', methods=['POST'])
@token_required
def read_notifications(current_user):
    Notification.query.filter_by(user_id=current_user.id, is_read=False).update({Notification.is_read: True})
    db.session.commit()
    return jsonify({"message": "All notifications marked as read"}), 200
