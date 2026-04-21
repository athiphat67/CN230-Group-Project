from flask import Blueprint, request, jsonify, current_app
import psycopg2
import bcrypt # เพิ่ม import bcrypt เข้ามา
import jwt
import datetime

auth_bp = Blueprint('auth', __name__)

def get_db_connection():
    return psycopg2.connect(current_app.config['SQLALCHEMY_DATABASE_URI'])

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('staff_username') # เปลี่ยนมารับ staff_username ตามสเปค
    password = data.get('password') 

    conn = get_db_connection()
    cur = conn.cursor()
    # ดึงข้อมูลที่จำเป็นมาทำ Token
    cur.execute('SELECT staffid, passwordhash, role, firstname, lastname FROM staff WHERE staffusername = %s', (username,))
    user = cur.fetchone()
    cur.close()
    conn.close()

    if user:
        stored_hash = user[1].encode('utf-8')
        input_password = password.encode('utf-8')
        
        if bcrypt.checkpw(input_password, stored_hash):
            # สร้าง JWT 
            secret_key = current_app.config.get('SECRET_KEY', 'purrfect-super-secret-key')
            payload = {
                'staff_id': user[0],
                'role': user[2],
                'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=12)
            }
            token = jwt.encode(payload, secret_key, algorithm="HS256")

            # ส่งกลับในโครงสร้างใหม่
            return jsonify({
                "access_token": token,
                "staff_id": user[0],
                "first_name": user[3],
                "last_name": user[4],
                "role": user[2]
            }), 200
            
    return jsonify({"error": True, "code": 401, "message": "Login failed", "detail": "Invalid username or password"}), 401

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