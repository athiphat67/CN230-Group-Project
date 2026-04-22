from flask import Blueprint, request, jsonify, current_app
import psycopg2
import psycopg2.extras
import bcrypt
from utils import token_required

customer_bp = Blueprint('customer', __name__)

def get_db_connection():
    return psycopg2.connect(current_app.config['SQLALCHEMY_DATABASE_URI'])

# ── 1. READ (Get All & Search) ────────────────────────────────
@customer_bp.route('', methods=['GET'])
@token_required
def get_all_customers(current_user):
    """
    ดึงรายการลูกค้าทั้งหมด หรือค้นหาจากชื่อ/อีเมล
    ---
    tags:
      - Customers
    security:
      - BearerAuth: []
    parameters:
      - name: q
        in: query
        type: string
        required: false
        description: คำค้นหา (ชื่อ, นามสกุล, หรือ อีเมล)
    responses:
      200:
        description: รายการลูกค้า
        schema:
          type: object
          properties:
            status:
              type: string
              example: success
            data:
              type: array
              items:
                type: object
                properties:
                  customerid:
                    type: integer
                  customerusername:
                    type: string
                  firstname:
                    type: string
                  lastname:
                    type: string
                  phonenumber:
                    type: string
                  customeremail:
                    type: string
                  address:
                    type: string
      500:
        description: Database error
    """
    try:
        search = request.args.get('q', '').strip()
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        if search:
            query = """
                SELECT customerid, customerusername, firstname, lastname, phonenumber, customeremail, address 
                FROM customer 
                WHERE firstname ILIKE %s OR lastname ILIKE %s OR customeremail ILIKE %s
            """
            cur.execute(query, (f'%{search}%', f'%{search}%', f'%{search}%'))
        else:
            query = "SELECT customerid, customerusername, firstname, lastname, phonenumber, customeremail, address FROM customer"
            cur.execute(query)
        
        customers = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "data": customers}), 200
    except Exception as e:
        return jsonify({"error": True, "code": 500, "message": "Database error", "detail": str(e)}), 500
    
# get customer pets
@customer_bp.route('/<int:id>/pets', methods=['GET'])
@token_required
def get_customer_pets(current_user, id):
    """
    ดึงรายการสัตว์เลี้ยงของลูกค้า
    ---
    tags:
      - Customers
    security:
      - BearerAuth: []
    parameters:
      - name: id
        in: path
        type: integer
        required: true
        description: ID ของลูกค้า
    responses:
      200:
        description: รายการสัตว์เลี้ยง
      500:
        description: Internal Server Error
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        # ดึงเฉพาะสัตว์เลี้ยงที่เป็นของ Customer ID นี้
        query = "SELECT * FROM pet WHERE customerid = %s"
        cur.execute(query, (id,))
        pets = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "data": pets}), 200
    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500

@customer_bp.route('/me', methods=['GET'])
@token_required
def get_current_customer(current_user):
    customer_id = current_user.get('customer_id')
    if not customer_id:
        return jsonify({"error": True, "code": 403, "message": "Customer token required"}), 403
    return get_customer_by_id.__wrapped__(current_user, customer_id)

# ── 2. READ (Get One by ID) ───────────────────────────────────
@customer_bp.route('/<int:id>', methods=['GET'])
@token_required
def get_customer_by_id(current_user, id):
    """
    ดูข้อมูลลูกค้าด้วย ID
    ---
    tags:
      - Customers
    security:
      - BearerAuth: []
    parameters:
      - name: id
        in: path
        type: integer
        required: true
        description: ID ของลูกค้า
    responses:
      200:
        description: ข้อมูลลูกค้ารายบุคคล
      404:
        description: ไม่พบข้อมูลลูกค้า
      500:
        description: Database error
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT customerid, customerusername, firstname, lastname, phonenumber, customeremail, address FROM customer WHERE customerid = %s", (id,))
        customer = cur.fetchone()
        cur.close()
        conn.close()

        if not customer:
            return jsonify({"error": True, "code": 404, "message": "Customer not found"}), 404
        
        return jsonify({"status": "success", "data": customer}), 200
    except Exception as e:
        return jsonify({"error": True, "code": 500, "message": "Database error", "detail": str(e)}), 500

# ── 3. CREATE (Add New Customer) ──────────────────────────────
@customer_bp.route('', methods=['POST'])
@token_required
def create_customer(current_user):
    """
    เพิ่มข้อมูลลูกค้าใหม่
    ---
    tags:
      - Customers
    security:
      - BearerAuth: []
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            firstname:
              type: string
              example: "Somchai"
            lastname:
              type: string
              example: "Jaidee"
            phonenumber:
              type: string
              example: "0812345678"
            customeremail:
              type: string
              example: "somchai@example.com"
            address:
              type: string
              example: "123/45 BKK"
            password:
              type: string
              example: "123456"
            customer_username:
              type: string
              description: หากไม่ระบุ ระบบจะสร้างจากเบอร์โทรอัตโนมัติ
              example: "user_0812345678"
    responses:
      201:
        description: เพิ่มข้อมูลลูกค้าเรียบร้อย
      409:
        description: Username หรือ Email มีในระบบแล้ว
      500:
        description: Internal Server Error
    """
    try:
        data = request.get_json()
        
        # 1. ดึงข้อมูลโดยรองรับ Key ทั้งจาก Bookings.js และจากหน้าอื่น
        first_name = data.get('firstname') or data.get('first_name')
        last_name  = data.get('lastname') or data.get('last_name')
        phone      = data.get('phonenumber') or data.get('phone_number')
        email      = data.get('customeremail') or data.get('customer_email')
        address    = data.get('address')
        
        password = data.get('password', '123456') # Default password

        # 2. สร้าง Username อัตโนมัติ (เอาเบอร์โทรมาใช้ เพื่อไม่ให้ซ้ำกันเด็ดขาด)
        username = data.get('customer_username')
        if not username:
            # ถ้าไม่มีเบอร์โทร ให้ใช้ "user_ตามด้วยชื่อ" (ดัก Error ไว้ก่อน)
            username = f"user_{phone}" if phone else f"user_{first_name}"

        # เข้ารหัสผ่าน
        hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        conn = get_db_connection()
        cur = conn.cursor()
        
        query = """
            INSERT INTO customer (customerusername, passwordhash, firstname, lastname, phonenumber, customeremail, address)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING customerid;
        """
        cur.execute(query, (
            username, hashed_pw, first_name, last_name, phone, email, address
        ))
        
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()

        # เช็คให้แน่ใจว่าส่ง key 'customer_id' กลับไปให้ Frontend (เพราะ Bookings.js ใช้ท่านี้เช็ค)
        return jsonify({
            "status": "success", 
            "message": "เพิ่มข้อมูลลูกค้าเรียบร้อย", 
            "customer_id": new_id
        }), 201

    except psycopg2.IntegrityError as e:
        # พิมพ์ Error ลง Terminal เพื่อให้เราดูง่ายๆ เวลาติดบั๊ก
        print(f"DB Integrity Error: {e}") 
        return jsonify({"error": True, "code": 409, "message": "Conflict", "detail": "Username หรือ Email นี้มีในระบบแล้ว"}), 409
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": True, "code": 500, "message": "Internal Server Error", "detail": str(e)}), 500

# ── 4. UPDATE (Edit Customer Info) ────────────────────────────
@customer_bp.route('/<int:id>', methods=['PUT'])
@token_required
def update_customer(current_user, id):
    """
    แก้ไขข้อมูลลูกค้า
    ---
    tags:
      - Customers
    security:
      - BearerAuth: []
    parameters:
      - name: id
        in: path
        type: integer
        required: true
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            first_name:
              type: string
            last_name:
              type: string
            phone_number:
              type: string
            customer_email:
              type: string
            address:
              type: string
    responses:
      200:
        description: อัปเดตข้อมูลลูกค้าสำเร็จ
      404:
        description: Customer not found
      500:
        description: Database error
    """
    try:
        data = request.get_json()
        conn = get_db_connection()
        cur = conn.cursor()
        
        query = """
            UPDATE customer 
            SET firstname = %s, lastname = %s, phonenumber = %s, customeremail = %s, address = %s 
            WHERE customerid = %s
        """
        cur.execute(query, (
            data.get('first_name'), data.get('last_name'), data.get('phone_number'), 
            data.get('customer_email'), data.get('address'), id
        ))
        
        if cur.rowcount == 0:
            return jsonify({"error": True, "code": 404, "message": "Customer not found"}), 404

        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": "อัปเดตข้อมูลลูกค้าสำเร็จ"}), 200
    except Exception as e:
        return jsonify({"error": True, "code": 500, "message": "Database error", "detail": str(e)}), 500

# ── 5. DELETE (Remove Customer) ───────────────────────────────
@customer_bp.route('/<int:id>', methods=['DELETE'])
@token_required
def delete_customer(current_user, id):
    """
    ลบข้อมูลลูกค้า
    ---
    tags:
      - Customers
    security:
      - BearerAuth: []
    parameters:
      - name: id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: ลบข้อมูลลูกค้าเรียบร้อย
      400:
        description: Cannot delete customer (ติดประวัติการจอง)
      404:
        description: Customer not found
      500:
        description: Database error
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM customer WHERE customerid = %s", (id,))
        
        if cur.rowcount == 0:
            return jsonify({"error": True, "code": 404, "message": "Customer not found"}), 404

        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": "ลบข้อมูลลูกค้าเรียบร้อย"}), 200
    except Exception as e:
        # กรณีลบไม่ได้เพราะมีการจอง (ForeignKey) ค้างอยู่
        return jsonify({"error": True, "code": 400, "message": "Cannot delete customer", "detail": "ลูกค้ารายนี้มีประวัติการจองอยู่ในระบบ"}), 400
