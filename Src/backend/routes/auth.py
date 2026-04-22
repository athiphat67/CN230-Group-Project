from flask import Blueprint, request, jsonify, current_app
import psycopg2
import bcrypt 
import jwt
import datetime
# Import ฟังก์ชันตรวจสอบ Token จาก utils.py
from utils import token_required 

auth_bp = Blueprint('auth', __name__)

def get_db_connection():
    return psycopg2.connect(current_app.config['SQLALCHEMY_DATABASE_URI'])

# -------------------------------------------------------------
# 1. Staff Login (พร้อมระบบ Print Log สำหรับ Debug)
# -------------------------------------------------------------
@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data.get('staff_username') 
        password = data.get('password') 
        
        print(f"\n--- 🔍 [DEBUG] เริ่มการล็อกอินพนักงาน ---")
        print(f"👉 Username ที่ส่งมา: '{username}'")
        
        # ตรวจสอบเบื้องต้น
        if not username or not password:
             print("❌ [DEBUG] ส่งข้อมูลมาไม่ครบ (ขาด username หรือ password)")
             return jsonify({
                 "error": True, 
                 "code": 400, 
                 "message": "Bad Request", 
                 "detail": "Missing staff_username or password"
             }), 400

        conn = get_db_connection()
        cur = conn.cursor()
        
        # ค้นหา Staff
        cur.execute('SELECT staffid, passwordhash, role, firstname, lastname FROM staff WHERE staffusername = %s', (username,))
        user = cur.fetchone()
        cur.close()
        conn.close()

        if user:
            print(f"✅ [DEBUG] เจอพนักงานในระบบ! ID: {user[0]}, ชื่อ: {user[3]} {user[4]}")
            print(f"🔑 [DEBUG] รหัส Hash ใน Database คือ: {user[1]}")
            print(f"📏 [DEBUG] ความยาวของ Hash: {len(user[1])} ตัวอักษร")
            
            try:
                stored_hash = user[1].encode('utf-8')
                input_password = password.encode('utf-8')
                
                # ตรวจสอบรหัสผ่าน
                is_match = bcrypt.checkpw(input_password, stored_hash)
                print(f"⚖️ [DEBUG] ผลการเทียบรหัสผ่าน (Match?): {is_match}")
                
                if is_match:
                    print("✅ [DEBUG] รหัสผ่านถูกต้อง! กำลังสร้าง Token...")
                    
                    # ตรวจสอบว่าพนักงานมี Role หรือไม่
                    role = user[2] if user[2] else 'STAFF'
                    
                    secret_key = current_app.config.get('SECRET_KEY', 'purrfect-super-secret-key')
                    payload = {
                        'staff_id': user[0],
                        'role': role,
                        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=12)
                    }
                    
                    token = jwt.encode(payload, secret_key, algorithm="HS256")
                    
                    print("✅ [DEBUG] ส่ง Token กลับให้ Frontend เรียบร้อย\n")
                    return jsonify({
                        "status": "success", 
                        "message": "Login successful",
                        "access_token": token,
                        "staff_id": user[0],
                        "first_name": user[3],
                        "role": role 
                    }), 200
                else:
                    print("❌ [DEBUG] รหัสผ่านไม่ตรงกัน!")
            except Exception as bcrypt_err:
                print(f"🔥 [DEBUG] เกิด Error ตอนเทียบ Hash (Hash อาจจะผิดฟอร์แมต): {bcrypt_err}")
                
        else:
            print(f"❌ [DEBUG] หาพนักงานชื่อ '{username}' ไม่เจอในตาราง staff")

        print("🚫 [DEBUG] ส่งสถานะ 401 Unauthorized กลับไป\n")
        return jsonify({
            "error": True, 
            "code": 401, 
            "message": "Unauthorized", 
            "detail": "Invalid username or password"
        }), 401
        
    except Exception as e:
         print(f"💥 [DEBUG] เซิร์ฟเวอร์ล่มระหว่างล็อกอิน: {e}\n")
         return jsonify({
            "error": True, 
            "code": 500, 
            "message": "Internal Server Error", 
            "detail": str(e)
        }), 500

# -------------------------------------------------------------
# 2. Staff Logout (ตรงตาม FR1.2)
# -------------------------------------------------------------
@auth_bp.route('/logout', methods=['POST'])
@token_required  # บังคับว่าต้องมี Token แนบมาใน Header จึงจะ Logout ได้
def logout(current_user): # รับ current_user ที่ได้จาก @token_required
    try:
        # โดยหลักการของ JWT การ Logout ฝั่ง Backend อาจจะไม่ได้ลบ Token จริงๆ (เพราะเป็น Stateless)
        # แต่เราสามารถจัดการด้วยการให้ Frontend ลบ Token ของตัวเองออก 
        # หรือถ้าต้องการความปลอดภัยขึ้น สามารถทำ Token Blocklist ได้ในอนาคตครับ
        
        # ตอนนี้เราส่ง Response สำเร็จกลับไปก่อน
        return jsonify({"message": "Logged out successfully"}), 200
        
    except Exception as e:
         return jsonify({
            "error": True, 
            "code": 500, 
            "message": "Internal Server Error", 
            "detail": str(e)
        }), 500

# -------------------------------------------------------------
# 3. Customer Register (ดัดแปลง Error Response ให้ตรงสเปค)
# -------------------------------------------------------------
@auth_bp.route('/register', methods=['POST'])
def register_customer():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password') 
        first_name = data.get('first_name')
        last_name = data.get('last_name')
        phone = data.get('phone')
        email = data.get('email')
        address = data.get('address')
        
        if not all([username, password, first_name, last_name, email]):
             return jsonify({
                 "error": True, 
                 "code": 400, 
                 "message": "Bad Request", 
                 "detail": "Missing required fields"
             }), 400

        hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        conn = get_db_connection()
        cur = conn.cursor()
        
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

        # กรณี Register เป็นของ Customer เราอาจจะไม่ได้เปลี่ยน Format Error 
        # ตาม FR ฝั่ง Staff แต่ปรับให้เป็นมาตรฐานเดียวกันครับ
        return jsonify({
            "status": "success", 
            "message": f"สมัครสมาชิกสำเร็จ! ยินดีต้อนรับคุณ {first_name}",
            "customer_id": new_customer_id
        }), 201

    except psycopg2.IntegrityError as e:
         print(f"🔥 Database Integrity Error: {e}") 
         
         return jsonify({
            "error": True, 
            "code": 409, 
            "message": "Conflict", 
            "detail": "Username หรือ Email นี้มีผู้ใช้งานแล้ว"
        }), 409
    except Exception as e:
         return jsonify({
            "error": True, 
            "code": 500, 
            "message": "Internal Server Error", 
            "detail": str(e)
        }), 500

# -------------------------------------------------------------
# 4. Customer Login 
# -------------------------------------------------------------
@auth_bp.route('/login/customer', methods=['POST'])
def login_customer():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
             return jsonify({
                 "error": True, 
                 "code": 400, 
                 "message": "Bad Request", 
                 "detail": "Missing username or password"
             }), 400

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('SELECT CustomerID, PasswordHash, FirstName, LastName, CustomerEmail FROM Customer WHERE CustomerUsername = %s', (username,))
        user = cur.fetchone()
        cur.close()
        conn.close()

        if user:
            stored_hash = user[1].encode('utf-8')
            input_password = password.encode('utf-8')
            
            if bcrypt.checkpw(input_password, stored_hash):
                # 🟢 เพิ่มการสร้าง JWT Token สำหรับ Customer 🟢
                secret_key = current_app.config.get('SECRET_KEY', 'purrfect-super-secret-key')
                payload = {
                    'customer_id': user[0],
                    'role': 'customer',
                    'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=12)
                }
                token = jwt.encode(payload, secret_key, algorithm="HS256")

                return jsonify({
                    "status": "success", 
                    "message": f"ล็อกอินสำเร็จ! ยินดีต้อนรับคุณ {user[2]}",
                    "access_token": token,  # <-- ส่ง Token กลับไปให้ Frontend
                    "customer": {           # <-- ส่งข้อมูลผู้ใช้กลับไปให้ Frontend เก็บลง LocalStorage
                        "customerid": user[0],
                        "firstname": user[2],
                        "lastname": user[3],
                        "customeremail": user[4]
                    },
                    "role": "customer" 
                }), 200
                
        return jsonify({
            "error": True, 
            "code": 401, 
            "message": "Unauthorized", 
            "detail": "Invalid username or password"
        }), 401
    except Exception as e:
         return jsonify({
            "error": True, 
            "code": 500, 
            "message": "Internal Server Error", 
            "detail": str(e)
        }), 500