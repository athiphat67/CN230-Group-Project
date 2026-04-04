from flask import Blueprint, request, jsonify, current_app
import psycopg2
import bcrypt # เพิ่ม import bcrypt เข้ามา

auth_bp = Blueprint('auth', __name__)

def get_db_connection():
    return psycopg2.connect(current_app.config['SQLALCHEMY_DATABASE_URI'])

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password') # ตรงนี้รับมาเป็นคำว่า 'password123' แบบตรงๆ

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('SELECT StaffID, PasswordHash, Role FROM Staff WHERE StaffUsername = %s', (username,))
    user = cur.fetchone()
    cur.close()
    conn.close()

    # ตรวจสอบว่าพบ User ไหม
    if user:
        # ดึง Hash จากฐานข้อมูลมาแปลงเป็น bytes
        stored_hash = user[1].encode('utf-8')
        # แปลงรหัสผ่านที่รับมาจากหน้าเว็บให้เป็น bytes
        input_password = password.encode('utf-8')
        
        # ใช้ฟังก์ชัน checkpw() ของ bcrypt ตรวจสอบว่ารหัสผ่านตรงกับ Hash หรือไม่
        if bcrypt.checkpw(input_password, stored_hash):
            return jsonify({
                "status": "success", 
                "message": "Login successful!",
                "staff_id": user[0],
                "role": user[2]
            }), 200
            
    # ถ้าหาไม่เจอ หรือเช็ก bcrypt แล้วไม่ผ่าน ให้เด้งกลับไปที่นี่
    return jsonify({"status": "error", "message": "Invalid username or password"}), 401