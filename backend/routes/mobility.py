from flask import Blueprint, request, jsonify
from routes.auth import token_required

mobility_bp = Blueprint('mobility', __name__)

@mobility_bp.route('/recommend', methods=['POST'])
@token_required
def recommend_alternatives(current_user):
    data = request.get_json()
    if not data or data.get('distance') is None or not data.get('current_mode'):
        return jsonify({"message": "Distance and current mode are required"}), 400
        
    try:
        distance = float(data.get('distance'))
    except ValueError:
        return jsonify({"message": "Invalid distance value"}), 400
        
    current_mode = data.get('current_mode').strip().lower()
    
    # Standard emission factors (kg CO2 / km)
    factors = {
        "car": 0.12,
        "bike": 0.02,
        "bus": 0.05,
        "metro": 0.03,
        "train": 0.04,
        "flight": 0.25,
        "walking": 0.0
    }
    
    if current_mode not in factors:
        return jsonify({"message": f"Unsupported transportation mode: {current_mode}"}), 400
        
    current_factor = factors[current_mode]
    current_emissions = distance * current_factor
    
    alternatives = []
    # Suggest better alternatives
    potential_alts = ["walking", "bike", "metro", "bus"]
    for alt in potential_alts:
        if alt == current_mode:
            continue
            
        # Only suggest walking for <= 5 km and cycling for <= 15 km
        if alt == "walking" and distance > 5:
            continue
        if alt == "bike" and distance > 15:
            continue
            
        alt_factor = factors[alt]
        alt_emissions = distance * alt_factor
        
        # Monthly savings (assuming 22 working days/month, 2 trips per day = 44 trips)
        monthly_trips = 44
        monthly_savings = (current_emissions - alt_emissions) * monthly_trips
        pct_reduction = ((current_emissions - alt_emissions) / current_emissions * 100) if current_emissions > 0 else 0.0
        
        # We only suggest if it actually saves carbon
        if monthly_savings > 0:
            alternatives.append({
                "mode": alt,
                "emissions": float(round(alt_emissions, 2)),
                "monthly_savings": float(round(monthly_savings, 2)),
                "percentage_reduction": float(round(pct_reduction, 1))
            })
            
    # Sort alternatives by maximum savings
    alternatives.sort(key=lambda x: x["monthly_savings"], reverse=True)
    
    return jsonify({
        "distance": distance,
        "current_mode": current_mode,
        "current_emissions": float(round(current_emissions, 2)),
        "alternatives": alternatives
    }), 200
