from flask import Blueprint, jsonify
from routes.auth import token_required
from models import Activity, Prediction
from database import db
from services.ml_service import predict_user_emissions

predictions_bp = Blueprint('predictions', __name__)

@predictions_bp.route('', methods=['GET'])
@token_required
def get_predictions(current_user):
    # Retrieve all logged activities of the user
    activities = Activity.query.filter_by(user_id=current_user.id).all()
    
    # Run prediction model
    results = predict_user_emissions(activities)
    
    # Save the predictions to database
    # Clear older predictions first
    Prediction.query.filter_by(user_id=current_user.id).delete()
    
    pred_week = Prediction(
        user_id=current_user.id,
        target_period='next_week',
        predicted_value=results["next_week_emissions"]
    )
    pred_month = Prediction(
        user_id=current_user.id,
        target_period='next_month',
        predicted_value=results["next_month_emissions"]
    )
    
    db.session.add(pred_week)
    db.session.add(pred_month)
    db.session.commit()
    
    return jsonify(results), 200
