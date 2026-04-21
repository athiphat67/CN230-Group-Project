from flask import Blueprint, jsonify, current_app, request
import psycopg2
import psycopg2.extras

pets_bp = Blueprint('pets', __name__)

def get_db_connection():
    return psycopg2.connect(current_app.config['SQLALCHEMY_DATABASE_URI'])

# 1. ใช้ชื่อ Field ตามฝั่ง Frontend (Snake Case)
PET_SELECT = """
    SELECT
        p.PetID         AS pet_id,
        p.CustomerID    AS owner_id,
        CONCAT(c.FirstName, ' ', LEFT(c.LastName, 1), '.') AS owner_name,
        p.Name          AS name,
        p.Species       AS species,
        p.Breed         AS breed,
        p.Sex           AS sex,
        p.DateOfBirth   AS dob,
        p.Weight        AS weight_kg,
        p.CoatColor     AS coat_color,
        p.MedicalNotes  AS medical_notes,
        p.Allergies     AS allergies,
        p.BehaviorNotes AS behavior_notes
    FROM Pet p
    LEFT JOIN Customer c ON p.CustomerID = c.CustomerID
"""

# --- 1. Read All: GET /api/pets ---
@pets_bp.route('', methods=['GET'])
def get_all_pets():
    try:
        owner_id = request.args.get('owner_id')
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        if owner_id:
            cur.execute(PET_SELECT + " WHERE p.CustomerID = %s ORDER BY p.PetID", (owner_id,))
        else:
            cur.execute(PET_SELECT + " ORDER BY p.PetID")

        pets = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "total_pets": len(pets), "data": pets}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# --- 2. Create: POST /api/pets ---
@pets_bp.route('', methods=['POST'])
def add_pet():
    try:
        data = request.get_json()
        
        # 2. รับข้อมูลมาจัดการเฉพาะตาราง Pet อย่างเดียว
        cur_fields = {
            'owner_id':       data.get('owner_id'),
            'name':           data.get('name'),
            'species':        data.get('species'),
            'breed':          data.get('breed'),
            'sex':            data.get('sex'),
            'dob':            data.get('dob'),
            'weight_kg':      data.get('weight_kg'),
            'coat_color':     data.get('coat_color'),
            'medical_notes':  data.get('medical_notes', 'ปกติ'),
            'allergies':      data.get('allergies', 'ไม่มี'),
            'behavior_notes': data.get('behavior_notes')
        }

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO Pet
                (CustomerID, Name, Species, Breed, Sex, DateOfBirth, Weight, CoatColor, MedicalNotes, Allergies, BehaviorNotes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING PetID;
        """, list(cur_fields.values()))
        
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"status": "success", "message": f"เพิ่มโปรไฟล์ {cur_fields['name']} สำเร็จ", "pet_id": new_id}), 201
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# --- 3. Update: PUT /api/pets/<pet_id> ---
@pets_bp.route('/<int:pet_id>', methods=['PUT'])
def update_pet(pet_id):
    try:
        data = request.get_json()
        allowed_fields = {
            'name':           'Name',
            'species':        'Species',
            'breed':          'Breed',
            'sex':            'Sex',
            'dob':            'DateOfBirth',
            'weight_kg':      'Weight',
            'coat_color':     'CoatColor',
            'medical_notes':  'MedicalNotes',
            'allergies':      'Allergies',
            'behavior_notes': 'BehaviorNotes'
        }

        updates = {db_col: data[key] for key, db_col in allowed_fields.items() if key in data}
        if not updates:
            return jsonify({"status": "error", "message": "ไม่มีข้อมูลสำหรับอัปเดต"}), 400

        set_clause = ', '.join(f'{col} = %s' for col in updates)
        values = list(updates.values()) + [pet_id]

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(f"UPDATE Pet SET {set_clause} WHERE PetID = %s", values)
        
        if cur.rowcount == 0:
            return jsonify({"status": "error", "message": "ไม่พบสัตว์เลี้ยง"}), 404

        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": "อัปเดตข้อมูลเรียบร้อยแล้ว"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# --- 4. Add Vaccine (Route เพิ่มเติม 1): POST /api/pets/<pet_id>/vaccines ---
@pets_bp.route('/<int:pet_id>/vaccines', methods=['POST'])
def add_vaccine(pet_id):
    try:
        data = request.get_json()
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO VaccineRecord (PetID, VaccineName, AdministeredDate, ExpiryDate, VetClinic)
            VALUES (%s, %s, %s, %s, %s)
        """, (pet_id, data.get('vaccine_name'), data.get('administered_date'), data.get('expiry_date'), data.get('vet_clinic')))
        
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": "บันทึกประวัติวัคซีนสำเร็จ"}), 201
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# --- 5. Care Reports (Route เพิ่มเติม 2): POST /api/care-reports ---
@pets_bp.route('/care-reports', methods=['POST'])
def add_care_report():
    try:
        data = request.get_json()
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO CareReport (BookingID, ReportDate, FoodIntake, BowelActivity, Mood, BehaviorNotes, Notes, ReportedBy)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (data.get('booking_id'), data.get('report_date'), data.get('food_intake'), 
              data.get('bowel_activity'), data.get('mood'), data.get('behavior_notes'), 
              data.get('notes'), data.get('reported_by', 'Staff')))
        
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": "บันทึกรายงานการดูแลสำเร็จ"}), 201
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500