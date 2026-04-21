"""
bookings.py — FR3 Booking & Front Desk Management
GET    /api/bookings                      รายการจองทั้งหมด (พร้อม filter)
POST   /api/bookings                      สร้างการจองใหม่
GET    /api/bookings/{id}                 ดูรายละเอียดการจอง
PATCH  /api/bookings/{id}/checkin         Check-In
PATCH  /api/bookings/{id}/checkout        Check-Out
PATCH  /api/bookings/{id}/cancel          ยกเลิกการจอง
POST   /api/bookings/{id}/addons          เพิ่มบริการเสริมระหว่างพัก
"""
from flask import Blueprint, request, jsonify, current_app
from datetime import datetime, timedelta
import psycopg2
import psycopg2.extras
from utils import token_required

bookings_bp = Blueprint('bookings', __name__)

def get_db_connection():
    return psycopg2.connect(current_app.config['SQLALCHEMY_DATABASE_URI'])

def get_thai_time():
    return datetime.utcnow() + timedelta(hours=7)

# Map DB status → Frontend status
STATUS_MAP = {
    'PENDING':   'PENDING',
    'ACTIVE':    'CHECKED_IN',
    'COMPLETED': 'CHECKED_OUT',
    'CANCELLED': 'CANCELLED',
}
# Map Frontend status → DB status
STATUS_MAP_REVERSE = {v: k for k, v in STATUS_MAP.items()}


# ── 1. รายการจองทั้งหมด (GET /api/bookings) ───────────────────────────
@bookings_bp.route('', methods=['GET'])
@token_required
def get_all_bookings(current_user):
    try:
        # Query params
        status_fe  = request.args.get('status', '')
        start_date = request.args.get('start_date', '')
        end_date   = request.args.get('end_date', '')
        pet_name   = request.args.get('pet_name', '').strip()
        owner_name = request.args.get('owner_name', '').strip()

        status_db = STATUS_MAP_REVERSE.get(status_fe.upper(), status_fe.upper())

        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        query = """
            SELECT
                b.bookingid,
                p.petid                                    AS pet_id,
                p.name                                     AS pet_name,
                p.species                                  AS pet_species,
                p.breed,
                p.allergy                                  AS notes,
                c.customerid                               AS owner_id,
                c.firstname || ' ' || c.lastname           AS owner_name,
                c.phonenumber                              AS owner_phone,
                r.roomid                                   AS room_id,
                r.roomnumber                               AS room_number,
                r.roomsize                                 AS room_type,
                b.checkindate                              AS checkin_date,
                b.checkoutdate                             AS checkout_date,
                b.status                                   AS status_db,
                b.lockedrate                               AS price_room,
                COALESCE(i.servicetotal, 0)                AS price_addons,
                bd.bookingdetailid,
                (SELECT array_agg(ii.itemname)
                 FROM bookingservice bs
                 JOIN inventoryitem ii ON bs.itemid = ii.itemid
                 WHERE bs.bookingid = b.bookingid)         AS addons
            FROM booking       b
            JOIN bookingdetail bd ON b.bookingid   = bd.bookingid
            JOIN pet           p  ON bd.petid      = p.petid
            JOIN room          r  ON bd.roomid     = r.roomid
            JOIN customer      c  ON b.customerid  = c.customerid
            LEFT JOIN invoice  i  ON b.bookingid   = i.bookingid
            WHERE 1=1
        """
        params = []

        if status_db:
            query += " AND b.status = %s"
            params.append(status_db)
        if start_date:
            query += " AND b.checkindate::date >= %s"
            params.append(start_date)
        if end_date:
            query += " AND b.checkoutdate::date <= %s"
            params.append(end_date)
        if pet_name:
            query += " AND p.name ILIKE %s"
            params.append(f'%{pet_name}%')
        if owner_name:
            query += " AND (c.firstname || ' ' || c.lastname) ILIKE %s"
            params.append(f'%{owner_name}%')

        query += " ORDER BY b.checkindate DESC"

        cur.execute(query, params)
        rows = cur.fetchall()
        cur.close()
        conn.close()

        result = []
        for b in rows:
            result.append({
                "booking_id":   b['bookingid'],
                "pet_id":       b['pet_id'],
                "pet_name":     b['pet_name'],
                "pet_species":  b['pet_species'],
                "breed":        b['breed'],
                "notes":        b['notes'],
                "owner_id":     b['owner_id'],
                "owner_name":   b['owner_name'],
                "owner_phone":  b['owner_phone'],
                "room_id":      b['room_id'],
                "room_number":  b['room_number'],
                "room_type":    b['room_type'],
                "checkin_date": b['checkin_date'].strftime('%Y-%m-%d %H:%M') if b['checkin_date'] else None,
                "checkout_date":b['checkout_date'].strftime('%Y-%m-%d %H:%M') if b['checkout_date'] else None,
                "status":       STATUS_MAP.get(b['status_db'], b['status_db']),
                "price_room":   float(b['price_room']   or 0),
                "price_addons": float(b['price_addons'] or 0),
                "addons":       b['addons'] or [],
                "booking_detail_id": b['bookingdetailid'],
            })

        return jsonify({"status": "success", "data": result}), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500


# ── 2. สร้างการจองใหม่ (POST /api/bookings) ───────────────────────────
@bookings_bp.route('', methods=['POST'])
@token_required
def create_booking(current_user):
    conn = get_db_connection()
    cur  = conn.cursor()
    try:
        data       = request.get_json()
        staff_id   = current_user.get('staff_id')
        total_rate = data.get('total_rate', 0)

        cur.execute("""
            INSERT INTO booking (customerid, checkindate, checkoutdate, status, createdby_staffid, lockedrate)
            VALUES (%s, %s, %s, 'PENDING', %s, %s)
            RETURNING bookingid;
        """, (data['customer_id'], data['checkin_date'], data['checkout_date'], staff_id, total_rate))

        booking_id = cur.fetchone()[0]

        # pets / rooms
        for item in data.get('pets', []):
            cur.execute("""
                INSERT INTO bookingdetail (bookingid, petid, roomid) VALUES (%s, %s, %s)
            """, (booking_id, item['pet_id'], item['room_id']))

        # services เสริมเริ่มต้น
        for svc in data.get('services', []):
            cur.execute("""
                INSERT INTO bookingservice (bookingid, itemid, quantity, unitprice)
                VALUES (%s, %s, %s, %s)
            """, (booking_id, svc['item_id'], svc['quantity'], svc['unit_price']))

        # สร้าง Invoice ว่างพร้อมกัน
        cur.execute("""
            INSERT INTO invoice (bookingid, roomtotal, servicetotal, vetemergencycost, depositpaid, paymentstatus)
            VALUES (%s, %s, 0, 0, 0, 'UNPAID')
            ON CONFLICT (bookingid) DO NOTHING;
        """, (booking_id, total_rate))

        conn.commit()
        return jsonify({
            "status": "success",
            "message": "สร้างการจองสำเร็จ",
            "booking_id": booking_id,
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": True, "code": 400, "message": "ไม่สามารถสร้างการจองได้", "detail": str(e)}), 400
    finally:
        cur.close()
        conn.close()


# ── 3. ดูรายละเอียดการจอง (GET /api/bookings/{id}) ───────────────────
@bookings_bp.route('/<int:booking_id>', methods=['GET'])
@token_required
def get_booking_by_id(current_user, booking_id):
    try:
        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT b.bookingid, b.checkindate, b.checkoutdate, b.status, b.lockedrate,
                   c.customerid AS owner_id,
                   c.firstname || ' ' || c.lastname AS owner_name, c.phonenumber AS owner_phone,
                   p.petid AS pet_id, p.name AS pet_name, p.species AS pet_species, p.breed, p.allergy AS notes,
                   r.roomid AS room_id, r.roomnumber AS room_number, r.roomsize AS room_type,
                   COALESCE(i.servicetotal,0) AS price_addons, i.invoiceid,
                   bd.bookingdetailid
            FROM booking       b
            JOIN bookingdetail bd ON b.bookingid  = bd.bookingid
            JOIN pet           p  ON bd.petid     = p.petid
            JOIN room          r  ON bd.roomid    = r.roomid
            JOIN customer      c  ON b.customerid = c.customerid
            LEFT JOIN invoice  i  ON b.bookingid  = i.bookingid
            WHERE b.bookingid = %s
        """, (booking_id,))
        row = cur.fetchone()
        cur.close()
        conn.close()

        if not row:
            return jsonify({"error": True, "code": 404, "message": "ไม่พบการจอง"}), 404

        return jsonify({
            "status": "success",
            "data": {
                "booking_id":        row['bookingid'],
                "pet_id":            row['pet_id'],
                "pet_name":          row['pet_name'],
                "pet_species":       row['pet_species'],
                "breed":             row['breed'],
                "notes":             row['notes'],
                "owner_id":          row['owner_id'],
                "owner_name":        row['owner_name'],
                "owner_phone":       row['owner_phone'],
                "room_id":           row['room_id'],
                "room_number":       row['room_number'],
                "room_type":         row['room_type'],
                "checkin_date":      row['checkindate'].strftime('%Y-%m-%d %H:%M'),
                "checkout_date":     row['checkoutdate'].strftime('%Y-%m-%d %H:%M'),
                "status":            STATUS_MAP.get(row['status'], row['status']),
                "price_room":        float(row['lockedrate']    or 0),
                "price_addons":      float(row['price_addons']  or 0),
                "invoice_id":        f"INV-{str(row['invoiceid']).zfill(4)}" if row['invoiceid'] else None,
                "booking_detail_id": row['bookingdetailid'],
            }
        }), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500


# ── 4. Check-In (PATCH /api/bookings/{id}/checkin) ───────────────────
@bookings_bp.route('/<int:booking_id>/checkin', methods=['PATCH'])
@token_required
def checkin(current_user, booking_id):
    try:
        conn = get_db_connection()
        cur  = conn.cursor()
        cur.execute("UPDATE booking SET status = 'ACTIVE' WHERE bookingid = %s RETURNING bookingid", (booking_id,))
        if cur.rowcount == 0:
            conn.rollback()
            return jsonify({"error": True, "code": 404, "message": "ไม่พบการจอง"}), 404

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "status": "success",
            "booking_id": booking_id,
            "status": "CHECKED_IN",
            "checked_in_at": get_thai_time().isoformat(),
        }), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500


# ── 5. Check-Out (PATCH /api/bookings/{id}/checkout) ─────────────────
@bookings_bp.route('/<int:booking_id>/checkout', methods=['PATCH'])
@token_required
def checkout(current_user, booking_id):
    try:
        data           = request.get_json() or {}
        payment_method = data.get('payment_method')
        staff_id       = current_user.get('staff_id')

        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute("UPDATE booking SET status = 'COMPLETED' WHERE bookingid = %s RETURNING bookingid", (booking_id,))
        if cur.rowcount == 0:
            conn.rollback()
            cur.close()
            conn.close()
            return jsonify({"error": True, "code": 404, "message": "ไม่พบการจอง"}), 404

        # อัปเดต Invoice ถ้ามี payment_method
        invoice_id = None
        if payment_method:
            cur.execute("""
                UPDATE invoice
                SET paymentstatus = 'PAID', paymentmethod = %s, issuedby_staffid = %s, paymentdate = %s
                WHERE bookingid = %s
                RETURNING invoiceid, grandtotal
            """, (payment_method, staff_id, get_thai_time(), booking_id))
            inv = cur.fetchone()
            if inv:
                invoice_id  = f"INV-{str(inv['invoiceid']).zfill(4)}"
                grand_total = float(inv['grandtotal'] or 0)
            else:
                grand_total = 0
        else:
            grand_total = 0

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "status":         "success",
            "booking_id":     booking_id,
            "booking_status": "CHECKED_OUT",
            "invoice_id":     invoice_id,
            "total_amount":   grand_total,
            "checked_out_at": get_thai_time().isoformat(),
        }), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500


# ── 6. Cancel Booking (PATCH /api/bookings/{id}/cancel) ──────────────
@bookings_bp.route('/<int:booking_id>/cancel', methods=['PATCH'])
@token_required
def cancel_booking(current_user, booking_id):
    try:
        data      = request.get_json() or {}
        staff_id  = data.get('cancelled_by', current_user.get('staff_id'))

        conn = get_db_connection()
        cur  = conn.cursor()
        cur.execute("""
            UPDATE booking
            SET status = 'CANCELLED', cancelledat = %s, cancelledbystaffid = %s
            WHERE bookingid = %s AND status NOT IN ('COMPLETED', 'CANCELLED')
            RETURNING bookingid
        """, (get_thai_time().date(), staff_id, booking_id))

        if cur.rowcount == 0:
            conn.rollback()
            cur.close()
            conn.close()
            return jsonify({"error": True, "code": 400, "message": "ไม่พบการจอง หรือยกเลิกไม่ได้แล้ว"}), 400

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "status":     "success",
            "booking_id": booking_id,
            "status":     "CANCELLED",
        }), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500


# ── 7. Add Add-on Service (POST /api/bookings/{id}/addons) ────────────
@bookings_bp.route('/<int:booking_id>/addons', methods=['POST'])
@token_required
def add_addon(current_user, booking_id):
    conn = get_db_connection()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        data    = request.get_json()
        item_id = data.get('item_id')

        if not item_id:
            return jsonify({"error": True, "message": "ต้องระบุ item_id"}), 400

        # ดึงราคาปัจจุบันของบริการ
        cur.execute("SELECT itemname, unitprice FROM inventoryitem WHERE itemid = %s", (item_id,))
        item = cur.fetchone()
        if not item:
            return jsonify({"error": True, "message": "ไม่พบบริการ/สินค้า"}), 404

        qty = data.get('quantity', 1)

        cur2 = conn.cursor()
        cur2.execute("""
            INSERT INTO bookingservice (bookingid, itemid, quantity, unitprice)
            VALUES (%s, %s, %s, %s)
        """, (booking_id, item_id, qty, item['unitprice']))

        # อัปเดต servicetotal ใน invoice
        added_cost = float(item['unitprice']) * qty
        cur2.execute("""
            UPDATE invoice SET servicetotal = servicetotal + %s WHERE bookingid = %s
        """, (added_cost, booking_id))

        conn.commit()
        cur.close()
        cur2.close()
        conn.close()

        return jsonify({
            "status":  "success",
            "message": f"เพิ่มบริการ '{item['itemname']}' สำเร็จ",
            "added_cost": added_cost,
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": True, "message": str(e)}), 500
    finally:
        conn.close()