from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
import jwt
from functools import wraps
from models import User
from database import db
from config import Config

auth_bp = Blueprint('auth', __name__)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # Check Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
        
        if not token:
            return jsonify({"message": "Token is missing!"}), 401
        
        try:
            data = jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
            current_user = User.query.get(data['user_id'])
            if not current_user:
                return jsonify({"message": "Invalid token user!"}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Token has expired!"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"message": "Invalid token!"}), 401
            
        return f(current_user, *args, **kwargs)
    return decorated

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password') or not data.get('name'):
        return jsonify({"message": "Missing registration details"}), 400
        
    email = data.get('email').strip().lower()
    name = data.get('name').strip()
    password = data.get('password')
    role = data.get('role', 'user')  # default role user
    
    # Simple validation
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"message": "User with this email already exists"}), 409
        
    new_user = User(name=name, email=email, role=role)
    new_user.set_password(password)
    
    try:
        db.session.add(new_user)
        db.session.commit()
        
        # Award starter badge
        from models import Reward
        starter_badge = Reward(
            user_id=new_user.id,
            badge_name="Eco Starter",
            badge_icon="🌱",
            description="Welcome to EcoSphere AI! You've taken your first step towards carbon footprint awareness."
        )
        db.session.add(starter_badge)
        
        # Add welcome notification
        from models import Notification
        welcome_notif = Notification(
            user_id=new_user.id,
            message="Welcome to EcoSphere AI! Start tracking your daily activities to calculate your carbon footprint."
        )
        db.session.add(welcome_notif)
        db.session.commit()
        
        return jsonify({"message": "User registered successfully!", "user": new_user.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Registration failed: {str(e)}"}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"message": "Missing email or password"}), 400
        
    email = data.get('email').strip().lower()
    password = data.get('password')
    
    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"message": "Invalid email or password"}), 401
        
    # Update Streak
    today = datetime.utcnow().date()
    if user.last_active_date:
        delta = today - user.last_active_date
        if delta.days == 1:
            user.streak += 1
        elif delta.days > 1:
            user.streak = 1
    else:
        user.streak = 1
    user.last_active_date = today
    
    # Recalculate Badges based on streak/green score
    check_streak_badges(user)
    
    db.session.commit()
    
    token = jwt.encode({
        'user_id': user.id,
        'exp': datetime.utcnow() + timedelta(days=7)
    }, Config.SECRET_KEY, algorithm="HS256")
    
    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": user.to_dict()
    }), 200

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    if not data or not data.get('email'):
        return jsonify({"message": "Missing email field"}), 400
    
    email = data.get('email').strip().lower()
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"message": "If this email is registered, we have sent password reset instructions."}), 200
        
    # Mock success password reset
    return jsonify({"message": "Verification link has been sent to your email address."}), 200

@auth_bp.route('/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    # Retrieve badges
    badges = [badge.to_dict() for badge in current_user.rewards]
    # Retrieve active goals
    goals = [goal.to_dict() for goal in current_user.goals]
    
    user_data = current_user.to_dict()
    user_data['badges'] = badges
    user_data['goals'] = goals
    
    return jsonify(user_data), 200

def check_streak_badges(user):
    from models import Reward, Notification
    
    # Helper to avoid duplicates
    def add_badge_if_missing(name, icon, desc):
        exists = Reward.query.filter_by(user_id=user.id, badge_name=name).first()
        if not exists:
            badge = Reward(user_id=user.id, badge_name=name, badge_icon=icon, description=desc)
            db.session.add(badge)
            notif = Notification(user_id=user.id, message=f"Congratulations! You unlocked the '{name}' badge: {desc}")
            db.session.add(notif)
            
    if user.streak >= 3:
        add_badge_if_missing("Green Warrior", "🛡️", "Maintained a sustainable logging streak of 3+ days.")
    if user.streak >= 7:
        add_badge_if_missing("Climate Champion", "🏆", "Maintained an outstanding logging streak of 7+ days.")
    if user.green_score >= 80:
        add_badge_if_missing("Carbon Neutral Hero", "🌍", "Achieved an eco green score of 80+.")
