from flask import Blueprint, request, jsonify
from routes.auth import token_required
from models import Activity
from database import db
from datetime import datetime, timedelta

simulator_bp = Blueprint('simulator', __name__)

@simulator_bp.route('/simulate', methods=['POST'])
@token_required
def simulate_footprint(current_user):
    data = request.get_json()
    if not data:
        return jsonify({"message": "Simulation input parameters required"}), 400
        
    # User inputs for simulation
    # Transit
    sim_distance = float(data.get('transport_distance', 15)) # km per day
    sim_mode = data.get('transport_mode', 'car').strip().lower()
    
    # Power
    sim_electricity = float(data.get('electricity_kwh', 8)) # kWh per day
    sim_ac_hours = float(data.get('ac_hours', 4)) # hours per day
    
    # Diet
    sim_diet = data.get('diet_type', 'non-vegetarian').strip().lower() # 'vegetarian', 'vegan', 'non-vegetarian'
    
    # Waste
    sim_waste = float(data.get('waste_kg', 2)) # kg per day
    
    # Standard emission factors
    factors = {
        # Transit
        "car": 0.12, "bike": 0.02, "bus": 0.05, "metro": 0.03, "train": 0.04, "flight": 0.25, "walking": 0.0,
        # Energy
        "consumption": 0.82, "ac_usage": 1.5,
        # Diet
        "vegetarian": 1.2, "non-vegetarian": 3.3, "vegan": 0.7,
        # Waste
        "waste_factor": 1.0 # blended plastic, food, paper
    }
    
    # Calculate simulated monthly footprint (30 days)
    sim_transit_monthly = sim_distance * factors.get(sim_mode, 0.12) * 30
    sim_elec_monthly = (sim_electricity * factors["consumption"] + sim_ac_hours * factors["ac_usage"]) * 30
    sim_diet_monthly = factors.get(sim_diet, 3.3) * 30
    sim_waste_monthly = sim_waste * factors["waste_factor"] * 30
    
    projected_monthly = sim_transit_monthly + sim_elec_monthly + sim_diet_monthly + sim_waste_monthly
    
    # Fetch actual current monthly footprint (last 30 days) from user logs to show comparison
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    actual_monthly = db.session.query(db.func.sum(Activity.carbon_footprint)).filter(
        Activity.user_id == current_user.id,
        Activity.timestamp >= thirty_days_ago
    ).scalar() or 0.0
    
    # If they have no logs, we'll establish a default national average monthly baseline
    baseline_monthly = float(actual_monthly) if actual_monthly > 0 else (20 * 0.12 + 10 * 0.82 + 3.3 + 3) * 30 # default baseline
    
    expected_savings = baseline_monthly - projected_monthly
    
    return jsonify({
        "current_monthly_baseline": float(round(baseline_monthly, 2)),
        "projected_monthly_footprint": float(round(projected_monthly, 2)),
        "expected_monthly_savings": float(round(expected_savings, 2)),
        "percentage_savings": float(round((expected_savings / baseline_monthly * 100), 1)) if baseline_monthly > 0 else 0.0,
        "breakdown": {
            "transportation": float(round(sim_transit_monthly, 2)),
            "electricity": float(round(sim_elec_monthly, 2)),
            "food": float(round(sim_diet_monthly, 2)),
            "waste": float(round(sim_waste_monthly, 2))
        }
    }), 200
