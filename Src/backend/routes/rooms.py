"""
rooms.py — FR3 Room Management
GET   /api/rooms                 ดูห้องทั้งหมด
POST  /api/rooms                 สร้างห้องพัก
GET   /api/rooms/options         ดูตัวเลือก enum ของห้อง
GET   /api/rooms/availability    ห้องว่างตาม check-in / check-out
GET   /api/rooms/{room_id}       ดูห้องพักรายห้อง
PUT   /api/rooms/{room_id}       อัปเดตข้อมูลห้อง
PATCH /api/rooms/{room_id}       อัปเดตข้อมูลห้องบางส่วน
DELETE /api/rooms/{room_id}      ลบห้องพัก
"""
from flask import Blueprint, request, jsonify, current_app
import psycopg2
import psycopg2.extras
from utils import token_required

rooms_bp = Blueprint('rooms', __name__)

def get_db_connection():
    return psycopg2.connect(current_app.config['SQLALCHEMY_DATABASE_URI'])


ROOM_FIELDS = {
    'roomnumber': 'roomnumber',
    'room_number': 'roomnumber',
    'roomsize': 'roomsize',
    'room_size': 'roomsize',
    'pettype': 'pettype',
    'pet_type': 'pettype',
    'rate': 'rate',
    'price_per_night': 'rate',
    'status': 'status',
}


def require_room_manager(current_user):
    if current_user.get('role') not in ['ADMIN', 'OWNER', 'STAFF']:
        return jsonify({
            "error": True,
            "code": 403,
            "message": "Forbidden",
            "detail": "สิทธิ์การใช้งานไม่เพียงพอ"
        }), 403
    return None


def normalize_room_payload(data, partial=False):
    payload = {}
    for source_key, target_key in ROOM_FIELDS.items():
        if source_key in data:
            payload[target_key] = data.get(source_key)

    for key in ['roomsize', 'pettype', 'status']:
        if payload.get(key):
            payload[key] = str(payload[key]).upper()

    if payload.get('roomnumber') is not None:
        payload['roomnumber'] = str(payload['roomnumber']).strip()

    errors = []
    required = ['roomnumber', 'roomsize', 'pettype', 'rate', 'status']
    if not partial:
        for field in required:
            if payload.get(field) in [None, '']:
                errors.append(f"ต้องระบุ {field}")

    if 'rate' in payload:
        try:
            payload['rate'] = float(payload['rate'])
            if payload['rate'] <= 0:
                errors.append("rate ต้องมากกว่า 0")
        except (TypeError, ValueError):
            errors.append("rate ต้องเป็นตัวเลข")

    return payload, errors


def format_room(row):
    row['price_per_night'] = float(row['price_per_night'])
    row['rate'] = row['price_per_night']
    row['is_available'] = row['status'] == 'AVAILABLE'
    return row


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
            format_room(r)

        return jsonify({"status": "success", "data": rooms}), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500


@rooms_bp.route('', methods=['POST'])
@token_required
def create_room(current_user):
    forbidden = require_room_manager(current_user)
    if forbidden:
        return forbidden

    data = request.get_json() or {}
    payload, errors = normalize_room_payload(data)
    if errors:
        return jsonify({"error": True, "message": "ข้อมูลไม่ถูกต้อง", "detail": errors}), 400

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            INSERT INTO room (roomnumber, roomsize, pettype, rate, status)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING roomid AS room_id, roomnumber AS room_number,
                      roomsize AS room_type, pettype AS pet_type,
                      rate AS price_per_night, status
        """, (
            payload['roomnumber'],
            payload['roomsize'],
            payload['pettype'],
            payload['rate'],
            payload['status'],
        ))
        room = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": "สร้างห้องพักสำเร็จ", "data": format_room(room)}), 201
    except psycopg2.IntegrityError as e:
        if conn:
            conn.rollback()
            conn.close()
        return jsonify({"error": True, "code": 409, "message": "Room number already exists", "detail": str(e)}), 409
    except Exception as e:
        if conn:
            conn.rollback()
            conn.close()
        return jsonify({"error": True, "message": str(e)}), 500


@rooms_bp.route('/options', methods=['GET'])
@token_required
def get_room_options(current_user):
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT enumtypid::regtype::text AS enum_name, enumlabel
            FROM pg_enum
            WHERE enumtypid::regtype::text IN ('room_size_enum', 'pet_type_enum', 'room_status_enum')
            ORDER BY enumtypid::regtype::text, enumsortorder
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()

        options = {
            "room_sizes": [],
            "pet_types": [],
            "statuses": [],
        }
        for row in rows:
            if row['enum_name'] == 'room_size_enum':
                options['room_sizes'].append(row['enumlabel'])
            elif row['enum_name'] == 'pet_type_enum':
                options['pet_types'].append(row['enumlabel'])
            elif row['enum_name'] == 'room_status_enum':
                options['statuses'].append(row['enumlabel'])

        return jsonify({"status": "success", "data": options}), 200
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
        
        # 🟢 แก้ไข: เพิ่ม ::text หลังชื่อคอลัมน์ที่เป็น ENUM เพื่อป้องกัน Error Data Type ไม่ตรงกัน
        cur.execute("""
            SELECT roomid AS room_id, roomnumber AS room_number,
                   roomsize AS room_type, pettype AS pet_type,
                   rate AS price_per_night, status,
                   TRUE AS is_available
            FROM room
            WHERE pettype::text = %s
              AND status::text != 'MAINTENANCE'
              AND roomid NOT IN (
                  SELECT bd.roomid
                  FROM bookingdetail bd
                  JOIN booking b ON bd.bookingid = b.bookingid
                  WHERE b.status::text NOT IN ('CANCELLED', 'COMPLETED')
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
        print(f"Room Availability Error: {e}") # พิมพ์ Error ลง Terminal ให้เห็นชัดๆ
        return jsonify({"error": True, "message": str(e)}), 500

# ── 3. Get / Update / Delete Room ─────────────────────────────────────
@rooms_bp.route('/<int:room_id>', methods=['GET'])
@token_required
def get_room(current_user, room_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT roomid AS room_id, roomnumber AS room_number,
                   roomsize AS room_type, pettype AS pet_type,
                   rate AS price_per_night, status
            FROM room
            WHERE roomid = %s
        """, (room_id,))
        room = cur.fetchone()
        cur.close()
        conn.close()
        if not room:
            return jsonify({"error": True, "code": 404, "message": "ไม่พบห้องที่ต้องการ"}), 404
        return jsonify({"status": "success", "data": format_room(room)}), 200
    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500


@rooms_bp.route('/<int:room_id>', methods=['PUT', 'PATCH'])
@token_required
def update_room(current_user, room_id):
    """
    อัปเดตข้อมูลห้องพัก
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
    conn = None
    try:
        forbidden = require_room_manager(current_user)
        if forbidden:
            return forbidden

        data = request.get_json() or {}
        payload, errors = normalize_room_payload(data, partial=True)
        if errors:
            return jsonify({"error": True, "message": "ข้อมูลไม่ถูกต้อง", "detail": errors}), 400

        updates, params = [], []
        for column in ['roomnumber', 'roomsize', 'pettype', 'rate', 'status']:
            if column in payload:
                updates.append(f"{column} = %s")
                params.append(payload[column])

        if not updates:
            return jsonify({"error": True, "message": "ไม่มีข้อมูลที่ต้องอัปเดต"}), 400

        params.append(room_id)
        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(f"""
            UPDATE room
            SET {', '.join(updates)}
            WHERE roomid = %s
            RETURNING roomid AS room_id, roomnumber AS room_number,
                      roomsize AS room_type, pettype AS pet_type,
                      rate AS price_per_night, status
        """, params)
        room = cur.fetchone()

        if not room:
            conn.rollback()
            cur.close()
            conn.close()
            return jsonify({"error": True, "code": 404, "message": "ไม่พบห้องที่ต้องการ"}), 404

        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": f"อัปเดตห้อง ID {room_id} เรียบร้อย", "data": format_room(room)}), 200

    except psycopg2.IntegrityError as e:
        try:
            conn.rollback()
            conn.close()
        except Exception:
            pass
        return jsonify({"error": True, "code": 409, "message": "Room number already exists", "detail": str(e)}), 409

    except Exception as e:
        if conn:
            conn.rollback()
            conn.close()
        return jsonify({"error": True, "message": str(e)}), 500


@rooms_bp.route('/<int:room_id>', methods=['DELETE'])
@token_required
def delete_room(current_user, room_id):
    forbidden = require_room_manager(current_user)
    if forbidden:
        return forbidden

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM room WHERE roomid = %s", (room_id,))

        if cur.rowcount == 0:
            conn.rollback()
            cur.close()
            conn.close()
            return jsonify({"error": True, "code": 404, "message": "ไม่พบห้องที่ต้องการ"}), 404

        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": "ลบห้องพักเรียบร้อย"}), 200
    except psycopg2.IntegrityError as e:
        if conn:
            conn.rollback()
            conn.close()
        return jsonify({
            "error": True,
            "code": 409,
            "message": "Cannot delete room",
            "detail": "ห้องนี้มีข้อมูลการจองหรือประวัติที่เกี่ยวข้องอยู่"
        }), 409
    except Exception as e:
        if conn:
            conn.rollback()
            conn.close()
        return jsonify({"error": True, "message": str(e)}), 500
