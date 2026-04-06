from flask import Blueprint, jsonify, current_app, request
import psycopg2
import psycopg2.extras
import bcrypt

staff_bp = Blueprint('staff', __name__)

def get_db_connection():
    return psycopg2.connect(current_app.config['SQLALCHEMY_DATABASE_URI'])

# --- 1. Create (C): เพิ่มพนักงานใหม่ ---
@staff_bp.route('/add', methods=['POST'])
def add_staff():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        first_name = data.get('first_name')
        last_name = data.get('last_name')
        role = data.get('role', 'STAFF') # ถ้าไม่ได้ส่งมาให้เป็น STAFF
        phone = data.get('phone')
        email = data.get('email')

        # เข้ารหัสผ่าน
        hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        conn = get_db_connection()
        cur = conn.cursor()
        query = """
            INSERT INTO Staff (StaffUsername, PasswordHash, FirstName, LastName, Role, IsOnDuty, PhoneNumber, StaffEmail, HireDate)
            VALUES (%s, %s, %s, %s, %s, TRUE, %s, %s, CURRENT_DATE)
            RETURNING StaffID;
        """
        cur.execute(query, (username, hashed_pw, first_name, last_name, role, phone, email))
        new_id = cur.fetchone()[0]
        
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"status": "success", "message": f"เพิ่มพนักงาน {first_name} สำเร็จ", "staff_id": new_id}), 201
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# --- 2. Read (R): ดูรายชื่อพนักงานทั้งหมด ---
@staff_bp.route('/', methods=['GET'])
def get_all_staff():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        # ไม่ดึง PasswordHash ออกมาเพื่อความปลอดภัย
        cur.execute("SELECT StaffID, StaffUsername, FirstName, LastName, Role, IsOnDuty, PhoneNumber, StaffEmail FROM Staff")
        staff_list = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "total": len(staff_list), "data": staff_list}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# --- 3. Update (U): อัปเดตข้อมูล (เช่น เปลี่ยนตำแหน่ง หรือสถานะเข้าเวร) ---
@staff_bp.route('/update/<int:staff_id>', methods=['PUT'])
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
@staff_bp.route('/delete/<int:staff_id>', methods=['DELETE'])
def delete_staff(staff_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM Staff WHERE StaffID = %s", (staff_id,))
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"status": "success", "message": f"ลบพนักงาน ID {staff_id} ออกจากระบบแล้ว"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": "ไม่สามารถลบได้ (อาจมีประวัติการดูแลสัตว์เลี้ยงค้างอยู่)"}), 400