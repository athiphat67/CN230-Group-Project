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
# 1. Staff Login (ตรงตาม FR1.1)
# -------------------------------------------------------------
@auth_bp.route('/login', methods=['POST'])
def login():
    """
    เข้าสู่ระบบสำหรับพนักงาน (Staff Login)
    ---
    tags:
      - Authentication
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - staff_username
            - password
          properties:
            staff_username:
              type: string
              example: admin
            password:
              type: string
              example: 123456
    responses:
      200:
        description: เข้าสู่ระบบสำเร็จ (พร้อมรับ JWT Token นำไปใส่ในช่อง Authorize)
        schema:
          type: object
          properties:
            access_token:
              type: string
            staff_id:
              type: integer
            first_name:
              type: string
            last_name:
              type: string
            role:
              type: string
      400:
        description: Bad Request (ส่งข้อมูลมาไม่ครบ)
      401:
        description: Unauthorized (Username หรือ Password ไม่ถูกต้อง)
      500:
        description: Internal Server Error
    """
    try:
        data = request.get_json()
        username = data.get('staff_username') 
        password = data.get('password') 
        
        # ตรวจสอบเบื้องต้น
        if not username or not password:
             return jsonify({
                 "error": True, 
                 "code": 400, 
                 "message": "Bad Request", 
                 "detail": "Missing staff_username or password"
             }), 400

        conn = get_db_connection()
        cur = conn.cursor()
        
        # ค้นหา Staff
        cur.execute('SELECT staffid, passwordhash, role, firstname, lastname FROM staff WHERE staffusername = %s AND "isActive" = TRUE', (username,))
        user = cur.fetchone()
        cur.close()
        conn.close()

        if user:
            stored_hash = user[1].encode('utf-8')
            input_password = password.encode('utf-8')
            
            # ตรวจสอบรหัสผ่าน
            if bcrypt.checkpw(input_password, stored_hash):
                secret_key = current_app.config.get('SECRET_KEY', 'purrfect-super-secret-key')
                # สร้าง Payload สำหรับ Token
                payload = {
                    'staff_id': user[0],
                    'role': user[2],
                    'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=12)
                }
                token = jwt.encode(payload, secret_key, algorithm="HS256")

                # ส่งกลับตามรูปแบบที่ Frontend ต้องการ
                return jsonify({
                    "access_token": token,
                    "staff_id": user[0],
                    "first_name": user[3],
                    "last_name": user[4],
                    "role": user[2]
                }), 200
                
        # หากไม่พบ User หรือรหัสผ่านผิด
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

# -------------------------------------------------------------
# 2. Staff Logout (ตรงตาม FR1.2)
# -------------------------------------------------------------
@auth_bp.route('/logout', methods=['POST'])
@token_required  # บังคับว่าต้องมี Token แนบมาใน Header จึงจะ Logout ได้
def logout(current_user): # รับ current_user ที่ได้จาก @token_required
    """
    ออกจากระบบสำหรับพนักงาน (Staff Logout)
    ---
    tags:
      - Authentication
    security:
      - BearerAuth: []
    responses:
      200:
        description: ออกจากระบบสำเร็จ
      401:
        description: Unauthorized (Token ไม่ถูกต้องหรือหมดอายุ)
      500:
        description: Internal Server Error
    """
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
    """
    สมัครสมาชิกสำหรับลูกค้า (Customer Register)
    ---
    tags:
      - Authentication
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - username
            - password
            - first_name
            - last_name
            - email
          properties:
            username:
              type: string
              example: "somchai123"
            password:
              type: string
              example: "password123"
            first_name:
              type: string
              example: "Somchai"
            last_name:
              type: string
              example: "Jaidee"
            phone:
              type: string
              example: "0812345678"
            email:
              type: string
              example: "somchai@example.com"
            address:
              type: string
              example: "123/4 BKK"
    responses:
      201:
        description: สมัครสมาชิกสำเร็จ
      400:
        description: Bad Request (ส่งข้อมูลมาไม่ครบ)
      409:
        description: Conflict (Username หรือ Email ซ้ำในระบบ)
      500:
        description: Internal Server Error
    """
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
         return jsonify({
            "error": True, 
            "code": 409, 
            "message": "Conflict", 
            "detail": "Username or Email already exists"
        }), 409
    except Exception as e:
         return jsonify({
            "error": True, 
            "code": 500, 
            "message": "Internal Server Error", 
            "detail": str(e)
        }), 500

# -------------------------------------------------------------
# 4. Customer Login (ดัดแปลง Error Response ให้ตรงสเปค)
# -------------------------------------------------------------
@auth_bp.route('/login/customer', methods=['POST'])
def login_customer():
    """
    เข้าสู่ระบบสำหรับลูกค้า (Customer Login)
    ---
    tags:
      - Authentication
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - username
            - password
          properties:
            username:
              type: string
              example: "somchai123"
            password:
              type: string
              example: "password123"
    responses:
      200:
        description: ล็อกอินสำเร็จ (โดยปกติสำหรับลูกค้าระบบนี้จะยังไม่ได้คืนค่า JWT Token แต่คืนสถานะแทน)
      400:
        description: Bad Request (ส่งข้อมูลมาไม่ครบ)
      401:
        description: Unauthorized (Username หรือ Password ไม่ถูกต้อง)
      500:
        description: Internal Server Error
    """
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
        cur.execute('SELECT CustomerID, PasswordHash, FirstName FROM Customer WHERE CustomerUsername = %s', (username,))
        user = cur.fetchone()
        cur.close()
        conn.close()

        if user:
            stored_hash = user[1].encode('utf-8')
            input_password = password.encode('utf-8')
            
            if bcrypt.checkpw(input_password, stored_hash):
                 return jsonify({
                    "status": "success", 
                    "message": f"ล็อกอินสำเร็จ! ยินดีต้อนรับคุณ {user[2]}",
                    "customer_id": user[0],
                    "role": "CUSTOMER" 
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