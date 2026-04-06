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

# -------------------------------------------------------------
# 3. [ใหม่] API สำหรับลูกค้า Login
# -------------------------------------------------------------
@auth_bp.route('/login/customer', methods=['POST'])
def login_customer():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    conn = get_db_connection()
    cur = conn.cursor()
    # เปลี่ยนเป้าหมายไปค้นหาในตาราง Customer แทน Staff
    cur.execute('SELECT CustomerID, PasswordHash, FirstName FROM Customer WHERE CustomerUsername = %s', (username,))
    user = cur.fetchone()
    cur.close()
    conn.close()

    # ตรวจสอบว่าพบ User ไหม
    if user:
        stored_hash = user[1].encode('utf-8')
        input_password = password.encode('utf-8')
        
        # ตรวจสอบรหัสผ่านด้วย bcrypt
        if bcrypt.checkpw(input_password, stored_hash):
            return jsonify({
                "status": "success", 
                "message": f"ล็อกอินสำเร็จ! ยินดีต้อนรับคุณ {user[2]}",
                "customer_id": user[0],
                "role": "CUSTOMER" # ส่ง Role กลับไปให้ Frontend รู้ว่าเป็นลูกค้า
            }), 200
            
    # ถ้าหาไม่เจอ หรือรหัสผิด
    return jsonify({"status": "error", "message": "Username หรือ Password ของลูกค้าไม่ถูกต้อง"}), 401

# -------------------------------------------------------------
# 2. [ใหม่] API สำหรับลูกค้าสมัครสมาชิก (Register)
# -------------------------------------------------------------
@auth_bp.route('/register', methods=['POST'])
def register_customer():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password') # รหัสผ่านที่ลูกค้าพิมพ์
        first_name = data.get('first_name')
        last_name = data.get('last_name')
        phone = data.get('phone')
        email = data.get('email')
        address = data.get('address')

        # 1. เข้ารหัสผ่านก่อนบันทึก
        hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        conn = get_db_connection()
        cur = conn.cursor()
        
        # 2. บันทึกลงตาราง Customer (Create)
        query = """
            INSERT INTO Customer (CustomerUsername, PasswordHash, FirstName, LastName, PhoneNumber, CustomerEmail, Address)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING CustomerID;
        """
        cur.execute(query, (username, hashed_pw, first_name, last_name, phone, email, address))
        new_customer_id = cur.fetchone()[0]
        
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "status": "success", 
            "message": f"สมัครสมาชิกสำเร็จ! ยินดีต้อนรับคุณ {first_name}",
            "customer_id": new_customer_id
        }), 201

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500