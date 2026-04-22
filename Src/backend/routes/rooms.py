"""
rooms.py — FR3 Room Management
GET   /api/rooms                 ดูห้องทั้งหมด
GET   /api/rooms/availability    ห้องว่างตาม check-in / check-out
PATCH /api/rooms/{room_id}       อัปเดตสถานะ/ราคาห้อง (ADMIN เท่านั้น)
"""
from flask import Blueprint, request, jsonify, current_app
import psycopg2
import psycopg2.extras
from utils import token_required, admin_required

rooms_bp = Blueprint('rooms', __name__)

def get_db_connection():
    return psycopg2.connect(current_app.config['SQLALCHEMY_DATABASE_URI'])


# ── 1. Get All Rooms ───────────────────────────────────────────────────
@rooms_bp.route('', methods=['GET'])
@token_required
def get_all_rooms(current_user):
    """
    ดูรายการห้องพักทั้งหมด
    ---
    tags:
      - Rooms
    security:
      - BearerAuth: []
    responses:
      200:
        description: รายการห้องพักทั้งหมดพร้อมสถานะและราคา
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
                  room_id:
                    type: integer
                  room_number:
                    type: string
                  room_type:
                    type: string
                  pet_type:
                    type: string
                  price_per_night:
                    type: number
                  status:
                    type: string
                  is_available:
                    type: boolean
      500:
        description: Internal Server Error
    """
    try:
        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT roomid AS room_id, roomnumber AS room_number,
                   roomsize AS room_type, pettype AS pet_type,
                   rate AS price_per_night, status
            FROM room
            ORDER BY roomnumber
        """)
        rooms = cur.fetchall()
        cur.close()
        conn.close()

        for r in rooms:
            r['price_per_night'] = float(r['price_per_night'])
            r['is_available']    = r['status'] == 'AVAILABLE'

        return jsonify({"status": "success", "data": rooms}), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500


# ── 2. Get Available Rooms ─────────────────────────────────────────────
@rooms_bp.route('/availability', methods=['GET'])
@token_required
def get_available_rooms(current_user):
    """
    ค้นหาห้องว่างตามช่วงเวลาที่กำหนด
    ---
    tags:
      - Rooms
    security:
      - BearerAuth: []
    parameters:
      - name: checkin_date
        in: query
        type: string
        required: true
        description: วันที่เช็คอิน (YYYY-MM-DD)
        example: "2026-05-01"
      - name: checkout_date
        in: query
        type: string
        required: true
        description: วันที่เช็คเอาท์ (YYYY-MM-DD)
        example: "2026-05-05"
      - name: pet_type
        in: query
        type: string
        required: false
        default: CAT
        description: ประเภทของสัตว์เลี้ยง (เช่น CAT, DOG)
    responses:
      200:
        description: รายการห้องที่ว่างในช่วงเวลาที่กำหนด
      400:
        description: ไม่ได้ระบุวันที่เช็คอินหรือเช็คเอาท์
      500:
        description: Internal Server Error
    """
    try:
        checkin  = request.args.get('checkin_date') or request.args.get('check_in')
        checkout = request.args.get('checkout_date') or request.args.get('check_out')
        pet_type = request.args.get('pet_type', 'CAT').upper()

        if not checkin or not checkout:
            return jsonify({"error": True, "message": "ต้องระบุ checkin_date และ checkout_date"}), 400

        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT roomid AS room_id, roomnumber AS room_number,
                   roomsize AS room_type, pettype AS pet_type,
                   rate AS price_per_night, status,
                   TRUE AS is_available
            FROM room
            WHERE pettype = %s
              AND status != 'MAINTENANCE'
              AND roomid NOT IN (
                  SELECT bd.roomid
                  FROM bookingdetail bd
                  JOIN booking b ON bd.bookingid = b.bookingid
                  WHERE b.status NOT IN ('CANCELLED', 'COMPLETED')
                    AND b.checkindate  < %s
                    AND b.checkoutdate > %s
              )
            ORDER BY roomnumber
        """, (pet_type, checkout, checkin))
        rooms = cur.fetchall()
        cur.close()
        conn.close()

        for r in rooms:
            r['price_per_night'] = float(r['price_per_night'])

        return jsonify({"status": "success", "data": rooms}), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500


# ── 3. Update Room (Admin only) ────────────────────────────────────────
@rooms_bp.route('/<int:room_id>', methods=['PATCH'])
@token_required
@admin_required
def update_room(current_user, room_id):
    """
    อัปเดตสถานะหรือราคาห้องพัก (เฉพาะ Admin)
    ---
    tags:
      - Rooms
    security:
      - BearerAuth: []
    parameters:
      - name: room_id
        in: path
        type: integer
        required: true
        description: ID ของห้องที่ต้องการอัปเดต
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            status:
              type: string
              description: สถานะห้อง (เช่น AVAILABLE, MAINTENANCE)
              example: MAINTENANCE
            price_per_night:
              type: number
              description: ราคาต่อคืน
              example: 1200.50
    responses:
      200:
        description: อัปเดตข้อมูลสำเร็จ
      400:
        description: ไม่มีข้อมูลที่ต้องการอัปเดตส่งมา
      404:
        description: ไม่พบห้องที่ต้องการ
      500:
        description: Internal Server Error
    """
    try:
        data   = request.get_json()
        status = data.get('status')
        price  = data.get('price_per_night')

        updates, params = [], []
        if status is not None:
            updates.append("status = %s")
            params.append(status)
        if price is not None:
            updates.append("rate = %s")
            params.append(price)

        if not updates:
            return jsonify({"error": True, "message": "ไม่มีข้อมูลที่ต้องอัปเดต"}), 400

        params.append(room_id)
        conn = get_db_connection()
        cur  = conn.cursor()
        cur.execute(f"UPDATE room SET {', '.join(updates)} WHERE roomid = %s", params)

        if cur.rowcount == 0:
            conn.rollback()
            return jsonify({"error": True, "code": 404, "message": "ไม่พบห้องที่ต้องการ"}), 404

        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": f"อัปเดตห้อง ID {room_id} เรียบร้อย"}), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500