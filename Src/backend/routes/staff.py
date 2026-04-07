from flask import Blueprint, jsonify, current_app, request
import psycopg2
import psycopg2.extras
import bcrypt

staff_bp = Blueprint('staff', __name__)

def get_db_connection():
    return psycopg2.connect(current_app.config['SQLALCHEMY_DATABASE_URI'])

# --- 1. Create (C): เพิ่มพนักงานใหม่ ---
# ✅ โค้ดใหม่ที่ถูกต้อง -- เปลี่ยน route เป็น '' แทน '/add' และแก้ชื่อ Key ใน JSON ให้ตรงกับที่ Frontend ส่งมา
# เปลี่ยนตัวแปรรับ requests ให้ตรงกับที่ Frontend ส่งมา เช่น staff_username, staff_email, phone_number และเพิ่ม hire_date ตามสเปค
@staff_bp.route('', methods=['POST']) # แก้ Route ตรงนี้
def add_staff():
    try:
        data = request.get_json()
        # แก้ชื่อ Key ให้ตรงกับ Frontend ส่งมา
        username = data.get('staff_username') 
        password = data.get('password')
        first_name = data.get('first_name')
        last_name = data.get('last_name')
        role = data.get('role', 'STAFF')
        phone = data.get('phone_number')
        email = data.get('staff_email')
        hire_date = data.get('hire_date') # รับ hire_date เพิ่มเข้ามาตามสเปค

        hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        conn = get_db_connection()
        cur = conn.cursor()
        # เพิ่มคอลัมน์ HireDate และ IsActive (ถ้าไม่ได้ตั้ง default ไว้) ในคำสั่ง SQL
        query = """
            INSERT INTO staff (staffusername, passwordhash, firstname, lastname, role, isonduty, phonenumber, staffemail, hiredate, "isActive")
            VALUES (%s, %s, %s, %s, %s, TRUE, %s, %s, %s, TRUE)
            RETURNING staffid;
        """
        cur.execute(query, (username, hashed_pw, first_name, last_name, role, phone, email, hire_date))
        # ... (เหมือนเดิม)
        new_id = cur.fetchone()[0]
        
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"status": "success", "message": f"เพิ่มพนักงาน {first_name} สำเร็จ", "staff_id": new_id}), 201
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# --- 2. Read (R): ดูรายชื่อพนักงานทั้งหมด ---
# ✅ โค้ดใหม่ที่ถูกต้อง
@staff_bp.route('', methods=['GET'])
def get_all_staff():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        # ใส่ AS เพื่อให้ชื่อ Key ตรงกับที่ Frontend รอรับ (snake_case)
        query = """
            SELECT 
                staffid AS staff_id, 
                staffusername AS staff_username, 
                firstname AS first_name, 
                lastname AS last_name, 
                role AS role, 
                isonduty AS is_on_duty, 
                phonenumber AS phone_number, 
                staffemail AS staff_email,
                hiredate AS hire_date
            FROM staff
            WHERE "isActive" = TRUE
        """
        cur.execute(query)
        staff_list = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "total": len(staff_list), "data": staff_list}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# --- 3. Update (U): อัปเดตข้อมูล (เช่น เปลี่ยนตำแหน่ง หรือสถานะเข้าเวร) ---
@staff_bp.route('/<int:staff_id>', methods=['PUT'])
def update_staff(staff_id):
    try:
        data = request.get_json()
        role = data.get('role')
        is_on_duty = data.get('is_on_duty')

        conn = get_db_connection()
        cur = conn.cursor()
        query = "UPDATE Staff SET Role = %s, IsOnDuty = %s WHERE StaffID = %s"
        cur.execute(query, (role, is_on_duty, staff_id))
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"status": "success", "message": f"อัปเดตข้อมูลพนักงาน ID {staff_id} สำเร็จ"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# --- 4. Delete (D): ลบพนักงาน (กรณีลาออก) ---
# ✅ โค้ดใหม่ที่ถูกต้อง
@staff_bp.route('/<int:staff_id>/deactivate', methods=['PATCH'])
def deactivate_staff(staff_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # เปลี่ยนสถานะเป็น FALSE แทนการลบข้อมูล
        query = "UPDATE Staff SET IsActive = FALSE WHERE StaffID = %s"
        cur.execute(query, (staff_id,))
        
        # ตรวจสอบว่ามีแถวถูกอัปเดตจริงไหม (เผื่อส่ง ID ผิดมา)
        if cur.rowcount == 0:
            conn.rollback()
            return jsonify({"status": "error", "message": "ไม่พบพนักงานที่ต้องการ Deactivate"}), 404
            
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"status": "success", "message": f"ปิดการใช้งานพนักงาน ID {staff_id} เรียบร้อยแล้ว"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500