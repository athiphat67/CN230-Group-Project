from flask import Blueprint, jsonify, current_app, request
import psycopg2
import psycopg2.extras
import bcrypt
from pydantic import BaseModel, Field, ValidationError, EmailStr
from datetime import date

staff_bp = Blueprint('staff', __name__)

def get_db_connection():
    return psycopg2.connect(current_app.config['SQLALCHEMY_DATABASE_URI'])

# ==========================================
# 1. สร้าง Schema สำหรับ Validate ข้อมูลด้วย Pydantic
# ==========================================
class StaffCreateSchema(BaseModel):
    staff_username: str = Field(..., min_length=3, description="ชื่อผู้ใช้งาน (อย่างน้อย 3 ตัวอักษร)")
    password: str = Field(..., min_length=6, description="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)")
    first_name: str = Field(...)
    last_name: str = Field(...)
    role: str = Field('STAFF')
    phone_number: str = Field(..., max_length=15)
    staff_email: str = Field(...) # หากต้องการความเป๊ะ สามารถใช้ EmailStr จาก pydantic[email] ได้
    hire_date: date = Field(...)

class StaffUpdateSchema(BaseModel):
    first_name: str = Field(...)
    last_name: str = Field(...)
    role: str = Field(...)
    staff_email: str = Field(...)
    phone_number: str = Field(...)

# ==========================================
# 2. Routes
# ==========================================

# --- 1. Create (C): เพิ่มพนักงานใหม่ ---
@staff_bp.route('', methods=['POST'])
def add_staff():
    """
    เพิ่มพนักงานใหม่เข้าสู่ระบบ
    รับข้อมูลจาก Frontend ตรวจสอบความถูกต้อง และบันทึกลงฐานข้อมูลพร้อม Hash รหัสผ่าน
    ---
    tags:
      - Staff
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            staff_username:
              type: string
              example: admin_jane
            password:
              type: string
              example: securepass123
            first_name:
              type: string
              example: Jane
            last_name:
              type: string
              example: Doe
            role:
              type: string
              example: MANAGER
            phone_number:
              type: string
              example: "0891234567"
            staff_email:
              type: string
              example: jane.d@purrfectstay.com
            hire_date:
              type: string
              format: date
              example: "2026-04-15"
    responses:
      201:
        description: เพิ่มพนักงานสำเร็จ
      400:
        description: ข้อมูลที่ส่งมาไม่ถูกต้อง (Validation Error)
      500:
        description: Internal Server Error
    """
    try:
        raw_data = request.get_json()
        
        # 🟢 Pydantic Validation ด่านแรก: เช็กว่าข้อมูลครบและฟอร์แมตถูกไหม
        valid_data = StaffCreateSchema(**raw_data)
        
        hashed_pw = bcrypt.hashpw(valid_data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        conn = get_db_connection()
        cur = conn.cursor()
        query = """
            INSERT INTO staff (staffusername, passwordhash, firstname, lastname, role, isonduty, phonenumber, staffemail, hiredate, "isActive")
            VALUES (%s, %s, %s, %s, %s, TRUE, %s, %s, %s, TRUE)
            RETURNING staffid;
        """
        cur.execute(query, (
            valid_data.staff_username, 
            hashed_pw, 
            valid_data.first_name, 
            valid_data.last_name, 
            valid_data.role, 
            valid_data.phone_number, 
            valid_data.staff_email, 
            valid_data.hire_date
        ))
        
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"status": "success", "message": f"เพิ่มพนักงาน {valid_data.first_name} สำเร็จ", "staff_id": new_id}), 201
    
    except ValidationError as e:
        # 🔴 ถ้าข้อมูลผิด Pydantic จะเด้งมาที่นี่ทันที พร้อมบอกรายละเอียดว่าผิดที่ฟิลด์ไหน
        return jsonify({"status": "error", "message": "ข้อมูลไม่ถูกต้อง", "details": e.errors()}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# --- 2. Read (R): ดูรายชื่อพนักงานทั้งหมด ---
@staff_bp.route('', methods=['GET'])
def get_all_staff():
    """
    ดึงข้อมูลรายชื่อพนักงานทั้งหมดที่ยังทำงานอยู่
    ---
    tags:
      - Staff
    responses:
      200:
        description: คืนค่าข้อมูลพนักงานทั้งหมดในรูปแบบ Array
      500:
        description: Internal Server Error
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
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

# --- 3. Update (U): อัปเดตข้อมูล ---
@staff_bp.route('/<int:staff_id>', methods=['PUT'])
def update_staff(staff_id):
    """
    อัปเดตข้อมูลพนักงาน
    ---
    tags:
      - Staff
    parameters:
      - in: path
        name: staff_id
        required: true
        type: integer
        description: ID ของพนักงานที่ต้องการแก้ไข
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            first_name:
              type: string
              example: John
            last_name:
              type: string
              example: Smith
            role:
              type: string
              example: ADMIN
            staff_email:
              type: string
              example: john.smith@example.com
            phone_number:
              type: string
              example: "0899999999"
    responses:
      200:
        description: อัปเดตข้อมูลสำเร็จ
      400:
        description: ข้อมูลที่ส่งมาไม่ถูกต้อง (Validation Error)
    """
    try:
        raw_data = request.get_json()
        
        # 🟢 Pydantic Validation ด่านแรก
        valid_data = StaffUpdateSchema(**raw_data)

        conn = get_db_connection()
        cur = conn.cursor()
        
        query = """
            UPDATE staff 
            SET firstname = %s, lastname = %s, role = %s, staffemail = %s, phonenumber = %s 
            WHERE staffid = %s
        """
        cur.execute(query, (
            valid_data.first_name, 
            valid_data.last_name, 
            valid_data.role, 
            valid_data.staff_email, 
            valid_data.phone_number, 
            staff_id
        ))
        
        if cur.rowcount == 0:
            conn.rollback()
            return jsonify({"status": "error", "message": "ไม่พบพนักงานที่ต้องการอัปเดต"}), 404
            
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"status": "success", "message": f"อัปเดตข้อมูลพนักงาน ID {staff_id} สำเร็จ"}), 200
    
    except ValidationError as e:
        return jsonify({"status": "error", "message": "ข้อมูลไม่ถูกต้อง", "details": e.errors()}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# --- 4. Delete (D): ลบพนักงาน (Soft Delete) ---
@staff_bp.route('/<int:staff_id>/deactivate', methods=['PATCH'])
def deactivate_staff(staff_id):
    """
    ปิดการใช้งานพนักงาน (Soft Delete)
    เปลี่ยนสถานะ isActive เป็น FALSE แทนการลบข้อมูลทิ้ง
    ---
    tags:
      - Staff
    parameters:
      - in: path
        name: staff_id
        required: true
        type: integer
        description: ID ของพนักงานที่ต้องการ Deactivate
    responses:
      200:
        description: ปิดการใช้งานสำเร็จ
      404:
        description: ไม่พบพนักงานที่ต้องการ
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        query = 'UPDATE staff SET "isActive" = FALSE WHERE staffid = %s'
        cur.execute(query, (staff_id,))
        
        if cur.rowcount == 0:
            conn.rollback()
            return jsonify({"status": "error", "message": "ไม่พบพนักงานที่ต้องการ Deactivate"}), 404
            
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"status": "success", "message": f"ปิดการใช้งานพนักงาน ID {staff_id} เรียบร้อยแล้ว"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500