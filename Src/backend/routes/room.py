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


# ── 2. Get Available Rooms  (เดิมอยู่ใน bookings.py) ──────────────────
#  ⚠️ ต้องวางก่อน /<int:room_id> เพื่อป้องกัน Flask routing conflict
@rooms_bp.route('/availability', methods=['GET'])
@token_required
def get_available_rooms(current_user):
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