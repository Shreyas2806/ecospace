import os
import google.generativeai as genai
from config import Config

def generate_coaching_recommendations(user_name, activities, goals):
    # Prepare summary data from user's logs
    categories = {"transportation": 0, "electricity": 0, "food": 0, "waste": 0}
    types = {}
    total_co2 = 0.0
    
    for act in activities:
        categories[act.category] = categories.get(act.category, 0) + act.carbon_footprint
        types[act.activity_type] = types.get(act.activity_type, 0) + 1
        total_co2 += act.carbon_footprint
        
    highest_category = max(categories, key=categories.get) if total_co2 > 0 else "None"
    
    # Check if Gemini API key is configured
    api_key = Config.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        # Rules-based Mock/Fallback AI response generator
        return generate_mock_coach_tips(user_name, categories, highest_category, total_co2, goals)
        
    try:
        genai.configure(api_key=api_key)
        # Using gemini-2.5-flash or gemini-1.5-flash
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        prompt = f"""
        You are EcoSphere AI Coach, a friendly, professional ClimateTech coach helping users reduce their carbon footprint.
        User Name: {user_name}
        Total Carbon Logged recently: {total_co2:.2f} kg CO2.
        Category breakdown of CO2 emissions: {categories}
        User's logged activities frequency count: {types}
        User's goals: {[g.title for g in goals]}
        
        Provide:
        1. A brief encouraging opening statement.
        2. 3 highly specific, actionable, bulleted recommendations based on their highest emission source: '{highest_category}'.
        3. A green motivational quote.
        Keep the response clear, structured, and easy to read using markdown formatting.
        """
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Error calling Gemini API: {e}. Falling back to rule-based tips.")
        return generate_mock_coach_tips(user_name, categories, highest_category, total_co2, goals)

def generate_mock_coach_tips(user_name, categories, highest_category, total_co2, goals):
    tips = f"### Hello, {user_name}! 🌱\n\nI am your **EcoSphere AI Coach**. I've analyzed your recent carbon footprint logs. Currently, you have logged a total of **{total_co2:.2f} kg CO2**.\n\n"
    
    if highest_category == "None" or total_co2 == 0:
        tips += "You haven't logged much activity yet. Log your daily commute, food, energy use, or waste to get custom AI-powered coaching tips!\n\n"
        tips += "Here are some generic eco-tips to get started:\n"
        tips += "- **Commuting**: Walking or cycling for trips under 3km saves fuel and reduces emission directly to zero.\n"
        tips += "- **Diet**: Incorporating vegan or vegetarian meals just twice a week reduces your food carbon footprint by up to 30%.\n"
        tips += "- **Power**: Unplug appliances not in use to avoid phantom energy draw.\n"
    else:
        tips += f"Your primary source of emissions is **{highest_category.capitalize()}** (emitted **{categories[highest_category]:.2f} kg CO2**).\n\n"
        tips += "#### Here are 3 personalized recommendations:\n"
        
        if highest_category == "transportation":
            tips += "1. **Shift to Public Transit**: Consider taking the metro or bus for your daily commute. This can cut transit emissions by up to 75%.\n"
            tips += "2. **Eco-Friendly Commuting**: Try walking or cycling for short commutes under 5 km. It's clean and healthy!\n"
            tips += "3. **Carpooling**: When driving is necessary, try carpooling with colleagues to distribute the footprint.\n"
        elif highest_category == "electricity":
            tips += "1. **Regulate Thermostat**: Set your AC to a moderate 24°C (75°F). Every degree warmer saves up to 6% on energy bills.\n"
            tips += "2. **Appliance Audits**: Unplug major appliances when sleeping or away. Avoid leaving chargers plugged in overnight.\n"
            tips += "3. **Switch to LED**: Replace traditional bulbs with ENERGY STAR-rated LEDs which use 75% less energy.\n"
        elif highest_category == "food":
            tips += "1. **Meat-free Days**: Try hosting a meat-free Monday. Sourcing vegetarian or vegan meals significantly reduces agricultural carbon footprints.\n"
            tips += "2. **Local Sourcing**: Purchase locally grown organic produce to reduce the 'food miles' footprint of long-haul logistics.\n"
            tips += "3. **Meal Planning**: Prepare meals in advance to avoid waste and minimize disposal footprints.\n"
        else: # waste
            tips += "1. **Minimize Single-Use Plastics**: Carry a reusable water bottle and cloth grocery bags. Plastic manufacturing has a high CO2 factor.\n"
            tips += "2. **Compost Organic Waste**: Composting organic waste prevents methane emissions in landfills.\n"
            tips += "3. **Responsible Recycling**: Separate paper and cardboard to ensure they enter standard recycling cycles.\n"
            
    tips += "\n> *\"The greatest threat to our planet is the belief that someone else will save it.\"* — **Robert Swan**\n"
    return tips
