import sys
from flask_sqlalchemy import SQLAlchemy
import pymysql
# Configure PyMySQL to override standard mysql client if needed
pymysql.install_as_MySQLdb()

db = SQLAlchemy()

def init_db(app):
    # Determine database settings
    db_user = app.config.get('DB_USER', 'root')
    db_password = app.config.get('DB_PASSWORD', '')
    db_host = app.config.get('DB_HOST', '127.0.0.1')
    db_port = app.config.get('DB_PORT', '3306')
    db_name = app.config.get('DB_NAME', 'ecosphere')
    
    db_uri = app.config.get('SQLALCHEMY_DATABASE_URI', '')
    is_postgres = 'postgres' in db_uri
    
    mysql_works = False
    
    if not is_postgres:
        # Try connecting to MySQL raw and creating the database
        try:
            conn = pymysql.connect(
                host=db_host,
                user=db_user,
                password=db_password,
                port=int(db_port),
                connect_timeout=3
            )
            with conn.cursor() as cursor:
                cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name}")
            conn.close()
            mysql_works = True
            print(f"Verified MySQL connection and verified database '{db_name}' exists.")
        except Exception as e:
            print(f"WARNING: MySQL connection failed during startup precheck ({e}). Falling back to SQLite.", file=sys.stderr)
            app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///ecosphere_fallback.db'
    else:
        print("Using PostgreSQL/Supabase database. Skipping MySQL prechecks.")

        
    db.init_app(app)
    
    with app.app_context():
        try:
            db.create_all()
            print("Successfully initialized database tables.")
        except Exception as err:
            print(f"CRITICAL: Failed to initialize database tables ({err}).", file=sys.stderr)
            sys.exit(1)
        
        # Seed emission factors
        seed_emission_factors()

def seed_emission_factors():
    from models import EmissionFactor
    
    # Predefined emission factors (kg CO2 per unit)
    default_factors = [
        # Transportation (kg CO2 / km)
        {"category": "transportation", "activity_type": "car", "factor": 0.12, "unit": "km"},
        {"category": "transportation", "activity_type": "bike", "factor": 0.02, "unit": "km"},
        {"category": "transportation", "activity_type": "bus", "factor": 0.05, "unit": "km"},
        {"category": "transportation", "activity_type": "metro", "factor": 0.03, "unit": "km"},
        {"category": "transportation", "activity_type": "train", "factor": 0.04, "unit": "km"},
        {"category": "transportation", "activity_type": "flight", "factor": 0.25, "unit": "km"},
        {"category": "transportation", "activity_type": "walking", "factor": 0.00, "unit": "km"},
        
        # Electricity / Energy (kg CO2 / unit)
        {"category": "electricity", "activity_type": "consumption", "factor": 0.82, "unit": "kWh"},
        {"category": "electricity", "activity_type": "ac_usage", "factor": 1.5, "unit": "hours"},
        {"category": "electricity", "activity_type": "appliance", "factor": 0.35, "unit": "hours"},
        
        # Food (kg CO2 / meal)
        {"category": "food", "activity_type": "vegetarian", "factor": 1.2, "unit": "meals"},
        {"category": "food", "activity_type": "non-vegetarian", "factor": 3.3, "unit": "meals"},
        {"category": "food", "activity_type": "vegan", "factor": 0.7, "unit": "meals"},
        
        # Waste (kg CO2 / kg)
        {"category": "waste", "activity_type": "plastic", "factor": 2.0, "unit": "kg"},
        {"category": "waste", "activity_type": "food_waste", "factor": 0.5, "unit": "kg"},
        {"category": "waste", "activity_type": "paper", "factor": 0.8, "unit": "kg"}
    ]
    
    for factor_data in default_factors:
        existing = EmissionFactor.query.filter_by(
            category=factor_data["category"], 
            activity_type=factor_data["activity_type"]
        ).first()
        if not existing:
            factor_record = EmissionFactor(
                category=factor_data["category"],
                activity_type=factor_data["activity_type"],
                factor=factor_data["factor"],
                unit=factor_data["unit"]
            )
            db.session.add(factor_record)
    
    try:
        db.session.commit()
        print("Default emission factors verified/seeded.")
    except Exception as e:
        db.session.rollback()
        print(f"Error seeding emission factors: {e}", file=sys.stderr)
