from flask import Blueprint, request, jsonify, current_app
from datetime import datetime, timedelta
import psycopg2
import psycopg2.extras
from utils import token_required

bookings_bp = Blueprint('bookings', __name__)

def get_db_connection():
    return psycopg2.connect(current_app.config['SQLALCHEMY_DATABASE_URI'])

def get_thai_time():
    # บังคับใช้เวลาไทย (UTC+7) ตามมาตรฐานของโปรเจกต์
    return datetime.utcnow() + timedelta(hours=7)

# ── 1. ดึงรายการจองทั้งหมด (GET /api/bookings) ──
@bookings_bp.route('', methods=['GET'])
@token_required
def get_all_bookings(current_user):
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        query = """
            SELECT 
                b.bookingid AS id,
                c.firstname || ' ' || c.lastname AS owner_name,
                b.checkindate AS checkin,
                b.checkoutdate AS checkout,
                b.status,
                b.lockedrate AS total_price,
                array_agg(p.name) AS pet_names
            FROM booking b
            JOIN customer c ON b.customerid = c.customerid
            JOIN bookingdetail bd ON b.bookingid = bd.bookingid
            JOIN pet p ON bd.petid = p.petid
            GROUP BY b.bookingid, c.firstname, c.lastname
            ORDER BY b.checkindate DESC
        """
        cur.execute(query)
        bookings = cur.fetchall()
        cur.close()
        conn.close()

        # Format วันที่
        for b in bookings:
            b['checkin'] = b['checkin'].strftime('%Y-%m-%d %H:%M')
            b['checkout'] = b['checkout'].strftime('%Y-%m-%d %H:%M')
            b['total_price'] = float(b['total_price'])

        return jsonify({"status": "success", "data": bookings}), 200
    except Exception as e:
        return jsonify({"error": True, "message": "Database error", "detail": str(e)}), 500

# ── 2. สร้างการจองใหม่ (POST /api/bookings) — FR3.2, 3.3 ──
@bookings_bp.route('', methods=['POST'])
@token_required
def create_booking(current_user):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        data = request.get_json()
        staff_id = current_user.get('staff_id')
        
        # 1. คำนวณราคาและเตรียมข้อมูล (Locked Rate)
        # ในระบบจริงควรมีการ Join กับตาราง Room เพื่อดึงราคาปัจจุบันมาคำนวณ
        total_rate = data.get('total_rate', 0) 

        # 2. INSERT ลงตารางหลัก: booking
        cur.execute("""
            INSERT INTO booking (customerid, checkindate, checkoutdate, status, createdby_staffid, lockedrate)
            VALUES (%s, %s, %s, 'PENDING', %s, %s)
            RETURNING bookingid;
        """, (data['customer_id'], data['checkin_date'], data['checkout_date'], staff_id, total_rate))
        
        booking_id = cur.fetchone()[0]

        # 3. INSERT รายละเอียดสัตว์เลี้ยงและห้อง: bookingdetail
        for item in data.get('pets', []):
            cur.execute("""
                INSERT INTO bookingdetail (bookingid, petid, roomid)
                VALUES (%s, %s, %s)
            """, (booking_id, item['pet_id'], item['room_id']))

        # 4. INSERT บริการเสริม (ถ้ามี): bookingservice
        for svc in data.get('services', []):
            cur.execute("""
                INSERT INTO bookingservice (bookingid, itemid, quantity, unitprice)
                VALUES (%s, %s, %s, %s)
            """, (booking_id, svc['item_id'], svc['quantity'], svc['unit_price']))

        conn.commit()
        return jsonify({"status": "success", "message": "สร้างการจองสำเร็จ", "booking_id": booking_id}), 201

    except Exception as e:
        conn.rollback() # หากผิดพลาดแม้แต่จุดเดียว ให้ยกเลิกทั้งหมด
        return jsonify({"error": True, "code": 400, "message": "ไม่สามารถสร้างการจองได้", "detail": str(e)}), 400
    finally:
        cur.close()
        conn.close()

# ── 3. เช็กห้องว่าง (GET /api/bookings/available-rooms) — FR3.4 ──
@bookings_bp.route('/available-rooms', methods=['GET'])
@token_required
def get_available_rooms(current_user):
    try:
        checkin = request.args.get('check_in')
        checkout = request.args.get('check_out')
        pet_type = request.args.get('pet_type', 'CAT')

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Logic: หาห้องที่ไม่อยู่ในช่วงเวลาที่ถูกจอง และสถานะไม่เป็น MAINTENANCE
        query = """
            SELECT roomid, roomnumber, roomsize, rate
            FROM room
            WHERE pettype = %s AND status != 'MAINTENANCE'
              AND roomid NOT IN (
                  SELECT bd.roomid FROM bookingdetail bd
                  JOIN booking b ON bd.bookingid = b.bookingid
                  WHERE b.status NOT IN ('CANCELLED', 'COMPLETED')
                    AND (b.checkindate < %s AND b.checkoutdate > %s)
              )
        """
        cur.execute(query, (pet_type, checkout, checkin))
        rooms = cur.fetchall()
        
        cur.close()
        conn.close()
        
        for r in rooms:
            r['rate'] = float(r['rate'])

        return jsonify({"status": "success", "data": rooms}), 200
    except Exception as e:
        return jsonify({"error": True, "message": "Database error", "detail": str(e)}), 500

# ── 4. อัปเดตสถานะการจอง (PATCH /api/bookings/<id>/status) — FR3.10, 3.11 ──
@bookings_bp.route('/<int:booking_id>/status', methods=['PATCH'])
@token_required
def update_booking_status(current_user, booking_id):
    try:
        data = request.get_json()
        new_status = data.get('status') # 'ACTIVE' (Check-in), 'COMPLETED' (Check-out), 'CANCELLED'
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # กรณีขอยกเลิก (CANCELLED) ให้เก็บข้อมูลพนักงานที่กดยกเลิกด้วย
        if new_status == 'CANCELLED':
            cur.execute("""
                UPDATE booking SET status = %s, cancelledat = %s, cancelledbystaffid = %s
                WHERE bookingid = %s
            """, (new_status, get_thai_time().date(), current_user['staff_id'], booking_id))
        else:
            cur.execute("UPDATE booking SET status = %s WHERE bookingid = %s", (new_status, booking_id))
        
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": f"เปลี่ยนสถานะเป็น {new_status} เรียบร้อย"}), 200
    except Exception as e:
        return jsonify({"error": True, "message": "ไม่สามารถอัปเดตสถานะได้", "detail": str(e)}), 500