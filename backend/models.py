from database import db
from datetime import datetime
import werkzeug.security

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default='user')  # 'user' or 'admin'
    green_score = db.Column(db.Integer, default=50)  # scale 0 to 100
    streak = db.Column(db.Integer, default=0)
    last_active_date = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    activities = db.relationship('Activity', backref='user', lazy=True, cascade="all, delete-orphan")
    goals = db.relationship('Goal', backref='user', lazy=True, cascade="all, delete-orphan")
    rewards = db.relationship('Reward', backref='user', lazy=True, cascade="all, delete-orphan")
    predictions = db.relationship('Prediction', backref='user', lazy=True, cascade="all, delete-orphan")
    notifications = db.relationship('Notification', backref='user', lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = werkzeug.security.generate_password_hash(password)

    def check_password(self, password):
        return werkzeug.security.check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "green_score": self.green_score,
            "streak": self.streak,
            "last_active_date": self.last_active_date.isoformat() if self.last_active_date else None,
            "created_at": self.created_at.isoformat()
        }

class Activity(db.Model):
    __tablename__ = 'activities'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    category = db.Column(db.String(50), nullable=False)  # 'transportation', 'electricity', 'food', 'waste'
    activity_type = db.Column(db.String(50), nullable=False)  # e.g., 'car', 'metro', 'vegetarian', 'plastic'
    value = db.Column(db.Float, nullable=False)  # km, kWh, meals, kg
    carbon_footprint = db.Column(db.Float, nullable=False)  # in kg CO2
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "category": self.category,
            "activity_type": self.activity_type,
            "value": self.value,
            "carbon_footprint": self.carbon_footprint,
            "timestamp": self.timestamp.isoformat()
        }

class EmissionFactor(db.Model):
    __tablename__ = 'emission_factors'
    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(50), nullable=False)
    activity_type = db.Column(db.String(50), nullable=False)
    factor = db.Column(db.Float, nullable=False)  # kg CO2 per unit
    unit = db.Column(db.String(20), nullable=False)  # e.g., 'km', 'kWh', 'meals', 'kg'

    def to_dict(self):
        return {
            "id": self.id,
            "category": self.category,
            "activity_type": self.activity_type,
            "factor": self.factor,
            "unit": self.unit
        }

class Goal(db.Model):
    __tablename__ = 'goals'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(50), nullable=False)  # e.g., 'transportation', 'electricity', 'overall'
    target_reduction_pct = db.Column(db.Float, nullable=False)  # e.g., 20.0 for 20%
    target_value = db.Column(db.Float, nullable=True)  # custom targets if any
    status = db.Column(db.String(50), default='active')  # 'active', 'completed', 'failed'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    target_date = db.Column(db.Date, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "category": self.category,
            "target_reduction_pct": self.target_reduction_pct,
            "target_value": self.target_value,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "target_date": self.target_date.isoformat()
        }

class Reward(db.Model):
    __tablename__ = 'rewards'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    badge_name = db.Column(db.String(100), nullable=False)
    badge_icon = db.Column(db.String(100), nullable=False)  # emoji or CSS icon name
    description = db.Column(db.String(255), nullable=False)
    unlocked_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "badge_name": self.badge_name,
            "badge_icon": self.badge_icon,
            "description": self.description,
            "unlocked_at": self.unlocked_at.isoformat()
        }

class Prediction(db.Model):
    __tablename__ = 'predictions'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    target_period = db.Column(db.String(50), nullable=False)  # 'next_week', 'next_month'
    predicted_value = db.Column(db.Float, nullable=False)  # in kg CO2
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "target_period": self.target_period,
            "predicted_value": self.predicted_value,
            "created_at": self.created_at.isoformat()
        }

class Notification(db.Model):
    __tablename__ = 'notifications'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "message": self.message,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat()
        }

class Leaderboard(db.Model):
    __tablename__ = 'leaderboard'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    green_score = db.Column(db.Integer, nullable=False)
    rank = db.Column(db.Integer, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Dynamic relationship back to User
    user = db.relationship('User', foreign_keys=[user_id])

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "username": self.user.name if self.user else "Unknown User",
            "green_score": self.green_score,
            "rank": self.rank,
            "updated_at": self.updated_at.isoformat()
        }

class AdminAnalytics(db.Model):
    __tablename__ = 'admin_analytics'
    id = db.Column(db.Integer, primary_key=True)
    total_users = db.Column(db.Integer, default=0)
    total_activities_logged = db.Column(db.Integer, default=0)
    total_carbon_saved = db.Column(db.Float, default=0.0)
    most_common_source = db.Column(db.String(100), nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "total_users": self.total_users,
            "total_activities_logged": self.total_activities_logged,
            "total_carbon_saved": self.total_carbon_saved,
            "most_common_source": self.most_common_source,
            "updated_at": self.updated_at.isoformat()
        }
