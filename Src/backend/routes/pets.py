from flask import Blueprint, jsonify, current_app, request
import psycopg2
import psycopg2.extras
from utils import token_required

pets_bp = Blueprint('pets', __name__)

def get_db_connection():
    return psycopg2.connect(current_app.config['SQLALCHEMY_DATABASE_URI'])

# ── 1. ชุดคำสั่ง SQL สำหรับดึงข้อมูล (ปรับตาม SQL ล่าสุด) ──
PET_SELECT = """
    SELECT
        p.petid            AS pet_id,
        p.customerid       AS owner_id,
        CONCAT(c.firstname, ' ', c.lastname) AS owner_name,
        p.name,
        p.species,
        p.breed,
        p.sex,
        p.dob,
        p.weight           AS weight_kg,
        p.coat_color,
        p.medicalcondition AS medical_notes,
        p.allergy          AS allergies,
        p.isvaccinated     AS is_vaccinated,
        p.vaccinerecord    AS vaccine_record,
        p.behavior_notes
    FROM pet p
    LEFT JOIN customer c ON p.customerid = c.customerid
"""

# --- 1. Get All Pets: GET /api/pets ---
@pets_bp.route('', methods=['GET'])
@token_required
def get_all_pets(current_user):
    try:
        owner_id = request.args.get('owner_id')
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        if owner_id:
            cur.execute(PET_SELECT + " WHERE p.customerid = %s ORDER BY p.petid", (owner_id,))
        else:
            cur.execute(PET_SELECT + " ORDER BY p.petid")
            
        pets = cur.fetchall()
        cur.close()
        conn.close()

        # Format Date ให้เป็น string
        for p in pets:
            if p['dob']: p['dob'] = p['dob'].strftime('%Y-%m-%d')

        return jsonify({"status": "success", "data": pets}), 200
    except Exception as e:
        return jsonify({"error": True, "message": "Database error", "detail": str(e)}), 500

# --- 2. Create Pet: POST /api/pets ---
@pets_bp.route('', methods=['POST'])
@token_required
def add_pet(current_user):
    try:
        data = request.get_json()
        conn = get_db_connection()
        cur = conn.cursor()
        
        query = """
            INSERT INTO pet (
                customerid, name, species, breed, sex, dob, weight, 
                coat_color, medicalcondition, allergy, isvaccinated, 
                vaccinerecord, behavior_notes
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING petid;
        """
        cur.execute(query, (
            data.get('owner_id'), data.get('name'), data.get('species'),
            data.get('breed'), data.get('sex'), data.get('dob'),
            data.get('weight_kg'), data.get('coat_color'),
            data.get('medical_notes', 'ไม่มี'), data.get('allergies', 'ไม่มี'),
            data.get('is_vaccinated', False), data.get('vaccine_record', 'ไม่มี'),
            data.get('behavior_notes')
        ))
        
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"status": "success", "message": "สร้างโปรไฟล์สัตว์เลี้ยงสำเร็จ", "pet_id": new_id}), 201
    except Exception as e:
        return jsonify({"error": True, "message": "Internal Server Error", "detail": str(e)}), 500

# --- 3. Get Meal Plans: GET /api/pets/<id>/meal-plans ---
@pets_bp.route('/<int:pet_id>/meal-plans', methods=['GET'])
@token_required
def get_meal_plans(current_user, pet_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT meal_period, food_type, quantity_grams, notes FROM mealplan WHERE pet_id = %s", (pet_id,))
        plans = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "data": plans}), 200
    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500

# --- 4. Save Meal Plan: POST /api/pets/<id>/meal-plans (FR2.8) ---
@pets_bp.route('/<int:pet_id>/meal-plans', methods=['POST'])
@token_required
def save_meal_plans(current_user, pet_id):
    try:
        data = request.get_json() # Frontend ส่งเป็น List ของมื้ออาหารมา
        conn = get_db_connection()
        cur = conn.cursor()
        
        # ล้างแผนเก่าเพื่อบันทึกทับ (ตาม Logic ของ Frontend)
        cur.execute("DELETE FROM mealplan WHERE pet_id = %s", (pet_id,))
        
        for plan in data:
            cur.execute("""
                INSERT INTO mealplan (pet_id, meal_period, food_type, quantity_grams, notes)
                VALUES (%s, %s, %s, %s, %s)
            """, (pet_id, plan['meal_period'], plan['food_type'], plan['quantity_grams'], plan.get('notes')))
            
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": "บันทึกแผนการอาหารเรียบร้อย"}), 200
    except Exception as e:
        return jsonify({"error": True, "message": "บันทึกข้อมูลไม่สำเร็จ", "detail": str(e)}), 500