from flask import Blueprint, jsonify, current_app, request
import psycopg2
import psycopg2.extras # นำเข้าเครื่องมือพิเศษสำหรับแปลงข้อมูลเป็น JSON อัตโนมัติ

# สร้าง Blueprint ชื่อ 'pets'
pets_bp = Blueprint('pets', __name__)

def get_db_connection():
    return psycopg2.connect(current_app.config['SQLALCHEMY_DATABASE_URI'])

# สร้าง API สำหรับดึงข้อมูลสัตว์เลี้ยงทั้งหมด (ใช้ GET method)
@pets_bp.route('/', methods=['GET'])
def get_all_pets():
    try:
        conn = get_db_connection()
        # ใช้ RealDictCursor เพื่อให้ผลลัพธ์ออกมาเป็น Dictionary (JSON) ทันที
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        # ดึงข้อมูลสัตว์เลี้ยง พร้อมชื่อเจ้าของ (ดึงข้ามตารางด้วย JOIN)
        query = """
            SELECT 
                p.PetID, p.Name, p.Species, p.Breed, p.Weight, 
                c.FirstName AS OwnerName
            FROM Pet p
            LEFT JOIN Customer c ON p.CustomerID = c.CustomerID
        """
        cur.execute(query)
        pets = cur.fetchall()
        
        cur.close()
        conn.close()

        # ส่งข้อมูลกลับไปให้ Frontend
        return jsonify({
            "status": "success", 
            "total_pets": len(pets),
            "data": pets
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    
@pets_bp.route('/add', methods=['POST'])
def add_pet():
    try:
        data = request.get_json()
        
        customer_id = data.get('customer_id')
        name = data.get('name')
        species = data.get('species')
        breed = data.get('breed')
        weight = data.get('weight')
        
        # [NEW] รับข้อมูลสุขภาพมาบังคับกรอก
        is_vaccinated = data.get('is_vaccinated')
        vaccine_record = data.get('vaccine_record')
        medical_condition = data.get('medical_condition', 'ไม่มี')
        allergy = data.get('allergy', 'ไม่มี')

        # บังคับว่าต้องแจ้งสถานะวัคซีน (ป้องกันการรับสัตว์ที่ไม่ได้ฉีดวัคซีนเข้าพัก)
        if is_vaccinated is None:
            return jsonify({"status": "error", "message": "กรุณาระบุสถานะการฉีดวัคซีน"}), 400

        conn = get_db_connection()
        cur = conn.cursor()
        
        query = """
            INSERT INTO Pet (CustomerID, Name, Species, Breed, Weight, IsVaccinated, VaccineRecord, MedicalCondition, Allergy)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING PetID;
        """
        cur.execute(query, (customer_id, name, species, breed, weight, is_vaccinated, vaccine_record, medical_condition, allergy))
        new_id = cur.fetchone()[0]
        
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"status": "success", "pet_id": new_id}), 201

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    
# --- ส่วนของ Update (U) ---
@pets_bp.route('/update/<int:pet_id>', methods=['PUT'])
def update_pet(pet_id):
    try:
        data = request.get_json()
        weight = data.get('weight')
        medical_condition = data.get('medical_condition')

        conn = get_db_connection()
        cur = conn.cursor()
        
        # ใช้คำสั่ง UPDATE เพื่อแก้ไขข้อมูลเดิม
        query = """
            UPDATE Pet 
            SET Weight = %s, MedicalCondition = %s 
            WHERE PetID = %s
        """
        cur.execute(query, (weight, medical_condition, pet_id))
        
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"status": "success", "message": f"อัปเดตข้อมูลสัตว์เลี้ยงรหัส {pet_id} เรียบร้อยแล้ว"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# --- ส่วนของ Delete (D) ---
@pets_bp.route('/delete/<int:pet_id>', methods=['DELETE'])
def delete_pet(pet_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # ใช้คำสั่ง DELETE เพื่อลบข้อมูล
        cur.execute("DELETE FROM Pet WHERE PetID = %s", (pet_id,))
        
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"status": "success", "message": f"ลบสัตว์เลี้ยงรหัส {pet_id} ออกจากระบบแล้ว"}), 200
    except Exception as e:
        # หากลบไม่ได้ (เช่น น้องมีประวัติการจองอยู่) จะติด Foreign Key Constraint
        return jsonify({"status": "error", "message": "ไม่สามารถลบได้เนื่องจากข้อมูลนี้ถูกใช้งานอยู่ในส่วนอื่น"}), 400