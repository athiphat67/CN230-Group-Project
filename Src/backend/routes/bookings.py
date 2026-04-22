"""
bookings.py — FR3 Booking & Front Desk Management
GET    /api/bookings                      รายการจองทั้งหมด (พร้อม filter)
POST   /api/bookings                      สร้างการจองใหม่
GET    /api/bookings/{id}                 ดูรายละเอียดการจอง
PATCH  /api/bookings/{id}                 แก้ไขการจอง
DELETE /api/bookings/{id}                 ลบการจอง
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

def parse_iso_date(value):
    if not value:
        return None
    text = str(value).strip()
    if len(text) == 10:
        return datetime.strptime(text, '%Y-%m-%d')
    return datetime.fromisoformat(text.replace('Z', '+00:00'))

# Map DB status → Frontend status
STATUS_MAP = {
    'PENDING':   'PENDING',
    'ACTIVE':    'CHECKED_IN',
    'COMPLETED': 'CHECKED_OUT',
    'CANCELLED': 'CANCELLED',
}
STATUS_MAP_REVERSE = {v: k for k, v in STATUS_MAP.items()}


# ── 1. รายการจองทั้งหมด (GET /api/bookings) ───────────────────────────
@bookings_bp.route('', methods=['GET'])
@token_required
def get_all_bookings(current_user):
    """
    ดึงรายการการจองทั้งหมด (พร้อมตัวกรอง)
    ---
    tags:
      - Bookings
    security:
      - BearerAuth: []
    parameters:
      - name: status
        in: query
        type: string
        required: false
        description: สถานะการจอง (เช่น PENDING, CHECKED_IN, CHECKED_OUT, CANCELLED)
      - name: start_date
        in: query
        type: string
        format: date
        required: false
        description: วันที่เช็คอินเริ่มต้น (YYYY-MM-DD)
      - name: end_date
        in: query
        type: string
        format: date
        required: false
        description: วันที่เช็คเอาท์สิ้นสุด (YYYY-MM-DD)
      - name: pet_name
        in: query
        type: string
        required: false
        description: ค้นหาด้วยชื่อสัตว์เลี้ยง
      - name: owner_name
        in: query
        type: string
        required: false
        description: ค้นหาด้วยชื่อเจ้าของ
    responses:
      200:
        description: รายการการจอง
      500:
        description: Internal Server Error
    """
    try:
        status_fe  = request.args.get('status', '')
        start_date = request.args.get('start_date', '')
        end_date   = request.args.get('end_date', '')
        pet_name   = request.args.get('pet_name', '').strip()
        owner_name = request.args.get('owner_name', '').strip()
        
        # 🟢 เพิ่มบรรทัดนี้ เพื่อรับค่ารหัสลูกค้าจากหน้า Dashboard
        customer_id = request.args.get('customerid', '') 

        status_db = STATUS_MAP_REVERSE.get(status_fe.upper(), status_fe.upper()) if status_fe else ''

        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        query = """
            SELECT
                b.bookingid,
                p.petid                                    AS pet_id,
                p.name                                     AS pet_name,
                p.species::text                            AS pet_species,
                p.breed,
                p.allergy                                  AS notes,
                c.customerid                               AS owner_id,
                c.firstname || ' ' || c.lastname           AS owner_name,
                c.phonenumber                              AS owner_phone,
                r.roomid                                   AS room_id,
                r.roomnumber                               AS room_number,
                r.roomsize::text                           AS room_type,
                b.checkindate                              AS checkin_date,
                b.checkoutdate                             AS checkout_date,
                b.status::text                             AS status_db,
                b.cancelledat                              AS cancelled_at,
                s.firstname || ' ' || s.lastname           AS cancelled_by_name,
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
            LEFT JOIN staff    s  ON b.cancelledbystaffid = s.staffid
            WHERE 1=1
        """
        params = []

        if status_db:
            query += " AND b.status::text = %s"
            params.append(status_db)
        if customer_id:
            query += " AND b.customerid = %s"
            params.append(customer_id)
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
            # filter nulls from addons array
            raw_addons = b['addons'] or []
            clean_addons = [a for a in raw_addons if a is not None]
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
                "addons":       clean_addons,
                "booking_detail_id": b['bookingdetailid'],
                "cancelled_by": b.get('cancelled_by_name'),
                "cancelled_at": b['cancelled_at'].strftime('%Y-%m-%d %H:%M') if b.get('cancelled_at') else None,
            })

        return jsonify({"status": "success", "data": result}), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500


# ── 2. สร้างการจองใหม่ (POST /api/bookings) ───────────────────────────
@bookings_bp.route('', methods=['POST'])
@token_required
def create_booking(current_user):
    """
    สร้างการจองใหม่
    ---
    tags:
      - Bookings
    security:
      - BearerAuth: []
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - customer_id
            - checkin_date
            - checkout_date
            - pets
          properties:
            customer_id:
              type: integer
              example: 1
            checkin_date:
              type: string
              format: date
              example: "2026-05-01"
            checkout_date:
              type: string
              format: date
              example: "2026-05-05"
            total_rate:
              type: number
              description: ราคารวมค่าห้องที่คำนวณมาล่วงหน้า
              example: 1500.00
            pets:
              type: array
              description: รายการสัตว์เลี้ยงที่เข้าพักและห้อง
              items:
                type: object
                properties:
                  pet_id:
                    type: integer
                    example: 2
                  room_id:
                    type: integer
                    example: 5
            services:
              type: array
              description: บริการเสริมเริ่มต้น (ตัวเลือก)
              items:
                type: object
                properties:
                  item_id:
                    type: integer
                    example: 1
                  quantity:
                    type: integer
                    example: 1
                  unit_price:
                    type: number
                    example: 300.00
    responses:
      201:
        description: สร้างการจองสำเร็จ
      400:
        description: ข้อมูลไม่ครบถ้วน หรือข้อผิดพลาดอื่นๆ
      500:
        description: Internal Server Error
    """
    conn = get_db_connection()
    cur  = conn.cursor()
    try:
        data       = request.get_json()
        staff_id   = current_user.get('staff_id')
        total_rate = data.get('total_rate', 0)

        # Validate required fields
        required = ['customer_id', 'checkin_date', 'checkout_date']
        for field in required:
            if not data.get(field):
                return jsonify({"error": True, "message": f"ต้องระบุ {field}"}), 400

        pets_list = data.get('pets', [])
        if not pets_list:
            return jsonify({"error": True, "message": "ต้องระบุสัตว์เลี้ยงอย่างน้อย 1 ตัว"}), 400

        cur.execute("""
            INSERT INTO booking (customerid, checkindate, checkoutdate, status, createdby_staffid, lockedrate)
            VALUES (%s, %s, %s, 'PENDING', %s, %s)
            RETURNING bookingid;
        """, (data['customer_id'], data['checkin_date'], data['checkout_date'], staff_id, total_rate))

        booking_id = cur.fetchone()[0]

        # insert pets / rooms
        for item in pets_list:
            cur.execute("""
                INSERT INTO bookingdetail (bookingid, petid, roomid) VALUES (%s, %s, %s)
            """, (booking_id, item['pet_id'], item['room_id']))

        # insert services เสริมเริ่มต้น (ถ้ามี)
        for svc in data.get('services', []):
            cur.execute("""
                INSERT INTO bookingservice (bookingid, itemid, quantity, unitprice)
                VALUES (%s, %s, %s, %s)
            """, (booking_id, svc['item_id'], svc.get('quantity', 1), svc['unit_price']))

        # สร้าง Invoice ว่างพร้อมกัน
        cur.execute("""
            INSERT INTO invoice (bookingid, roomtotal, servicetotal, vetemergencycost, depositpaid, paymentstatus)
            VALUES (%s, %s, 0, 0, 0, 'UNPAID')
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
    """
    ดูรายละเอียดการจอง
    ---
    tags:
      - Bookings
    security:
      - BearerAuth: []
    parameters:
      - name: booking_id
        in: path
        type: integer
        required: true
        description: ID ของการจอง
    responses:
      200:
        description: ข้อมูลรายละเอียดการจอง
      404:
        description: ไม่พบการจอง
      500:
        description: Internal Server Error
    """
    try:
        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT b.bookingid, b.checkindate, b.checkoutdate, b.status::text as status,
                   b.lockedrate, b.cancelledat AS cancelled_at,
                   s.firstname || ' ' || s.lastname AS cancelled_by_name,
                   c.customerid AS owner_id,
                   c.firstname || ' ' || c.lastname AS owner_name,
                   c.phonenumber AS owner_phone,
                   p.petid AS pet_id, p.name AS pet_name,
                   p.species::text AS pet_species,
                   p.breed, p.allergy AS notes,
                   r.roomid AS room_id, r.roomnumber AS room_number,
                   r.roomsize::text AS room_type,
                   COALESCE(i.servicetotal,0) AS price_addons,
                   i.invoiceid,
                   bd.bookingdetailid
            FROM booking       b
            JOIN bookingdetail bd ON b.bookingid  = bd.bookingid
            JOIN pet           p  ON bd.petid     = p.petid
            JOIN room          r  ON bd.roomid    = r.roomid
            JOIN customer      c  ON b.customerid = c.customerid
            LEFT JOIN invoice  i  ON b.bookingid  = i.bookingid
            LEFT JOIN staff    s  ON b.cancelledbystaffid = s.staffid
            WHERE b.bookingid = %s
        """, (booking_id,))
        row = cur.fetchone()
        cur.close()
        conn.close()

        if not row:
            return jsonify({"error": True, "code": 404, "message": "ไม่พบการจอง"}), 404

        conn2 = get_db_connection()
        cur2 = conn2.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur2.execute("""
            SELECT bs.itemid AS item_id, ii.itemname AS name,
                   bs.quantity, bs.unitprice AS unit_price
            FROM bookingservice bs
            JOIN inventoryitem ii ON bs.itemid = ii.itemid
            WHERE bs.bookingid = %s
            ORDER BY ii.itemname
        """, (booking_id,))
        service_rows = cur2.fetchall()
        cur2.close()
        conn2.close()

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
                "services": [{
                    "item_id": s['item_id'],
                    "name": s['name'],
                    "quantity": int(s['quantity'] or 0),
                    "unit_price": float(s['unit_price'] or 0),
                } for s in service_rows],
                "cancelled_by": row.get('cancelled_by_name'),
                "cancelled_at": row['cancelled_at'].strftime('%Y-%m-%d %H:%M') if row.get('cancelled_at') else None,
            }
        }), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500


# ── 4. แก้ไขการจอง (PATCH /api/bookings/{id}) ───────────────────────
@bookings_bp.route('/<int:booking_id>', methods=['PATCH'])
@token_required
def update_booking(current_user, booking_id):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        data = request.get_json() or {}
        cur.execute("""
            SELECT b.bookingid, b.customerid, b.status::text AS status, bd.bookingdetailid, bd.petid, bd.roomid
            FROM booking b
            JOIN bookingdetail bd ON b.bookingid = bd.bookingid
            WHERE b.bookingid = %s
        """, (booking_id,))
        row = cur.fetchone()
        if not row:
            return jsonify({"error": True, "code": 404, "message": "ไม่พบการจอง"}), 404
        if row['status'] not in ('PENDING', 'CONFIRMED'):
            return jsonify({"error": True, "code": 400, "message": "แก้ไขได้เฉพาะรายการที่รอยืนยันเท่านั้น"}), 400

        customer_id = data.get('customer_id', row['customerid'])
        pets = data.get('pets') or [{"pet_id": row['petid'], "room_id": row['roomid']}]
        if not pets or len(pets) != 1:
            return jsonify({"error": True, "message": "รองรับการแก้ไขครั้งละ 1 สัตว์เลี้ยง"}), 400

        pet_id = int(pets[0]['pet_id'])
        room_id = int(pets[0]['room_id'])
        checkin = parse_iso_date(data.get('checkin_date'))
        checkout = parse_iso_date(data.get('checkout_date'))
        if not checkin or not checkout or checkout <= checkin:
            return jsonify({"error": True, "message": "วันที่ Check-out ต้องหลัง Check-in"}), 400

        cur.execute("SELECT petid FROM pet WHERE petid = %s AND customerid = %s", (pet_id, customer_id))
        if not cur.fetchone():
            return jsonify({"error": True, "message": "สัตว์เลี้ยงไม่ตรงกับลูกค้าที่ระบุ"}), 400

        cur.execute("SELECT rate FROM room WHERE roomid = %s", (room_id,))
        room_row = cur.fetchone()
        if not room_row:
            return jsonify({"error": True, "message": "ไม่พบห้องพักที่เลือก"}), 400

        cur.execute("""
            SELECT 1
            FROM bookingdetail bd
            JOIN booking b ON bd.bookingid = b.bookingid
            WHERE bd.roomid = %s
              AND b.bookingid <> %s
              AND b.status::text NOT IN ('CANCELLED', 'COMPLETED')
              AND b.checkindate < %s
              AND b.checkoutdate > %s
            LIMIT 1
        """, (room_id, booking_id, checkout, checkin))
        if cur.fetchone():
            return jsonify({"error": True, "message": "ห้องนี้ไม่ว่างในช่วงวันที่เลือก"}), 400

        nights = max((checkout.date() - checkin.date()).days, 1)
        room_total = float(room_row['rate'] or 0) * nights

        services = data.get('services', None)
        service_total = 0.0
        cur2 = conn.cursor()
        if isinstance(services, list):
            cur2.execute("DELETE FROM bookingservice WHERE bookingid = %s", (booking_id,))
            for svc in services:
                item_id = int(svc.get('item_id'))
                qty = int(svc.get('quantity', 1))
                unit_price = float(svc.get('unit_price', 0))
                cur2.execute("""
                    INSERT INTO bookingservice (bookingid, itemid, quantity, unitprice)
                    VALUES (%s, %s, %s, %s)
                """, (booking_id, item_id, qty, unit_price))
                service_total += qty * unit_price
        else:
            cur.execute("SELECT COALESCE(SUM(quantity * unitprice),0) AS total FROM bookingservice WHERE bookingid = %s", (booking_id,))
            service_total = float((cur.fetchone() or {}).get('total') or 0)

        cur2.execute("""
            UPDATE booking
            SET customerid = %s, checkindate = %s, checkoutdate = %s, lockedrate = %s
            WHERE bookingid = %s
        """, (customer_id, checkin, checkout, room_total, booking_id))
        cur2.execute("""
            UPDATE bookingdetail
            SET petid = %s, roomid = %s
            WHERE bookingdetailid = %s
        """, (pet_id, room_id, row['bookingdetailid']))
        cur2.execute("""
            UPDATE invoice
            SET roomtotal = %s, servicetotal = %s
            WHERE bookingid = %s
        """, (room_total, service_total, booking_id))

        conn.commit()
        cur2.close()
        return jsonify({
            "status": "success",
            "message": "อัปเดตการจองสำเร็จ",
            "booking_id": booking_id,
        }), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": True, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()


# ── 5. ลบการจอง (DELETE /api/bookings/{id}) ─────────────────────────
@bookings_bp.route('/<int:booking_id>', methods=['DELETE'])
@token_required
def delete_booking(current_user, booking_id):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT status::text FROM booking WHERE bookingid = %s", (booking_id,))
        row = cur.fetchone()
        if not row:
            return jsonify({"error": True, "code": 404, "message": "ไม่พบการจอง"}), 404
        if row[0] not in ('PENDING', 'CANCELLED'):
            return jsonify({"error": True, "code": 400, "message": "ลบได้เฉพาะรายการรอยืนยันหรือยกเลิกแล้ว"}), 400

        cur.execute("DELETE FROM invoice WHERE bookingid = %s", (booking_id,))
        cur.execute("DELETE FROM bookingservice WHERE bookingid = %s", (booking_id,))
        cur.execute("DELETE FROM bookingdetail WHERE bookingid = %s", (booking_id,))
        cur.execute("DELETE FROM booking WHERE bookingid = %s", (booking_id,))
        conn.commit()
        return jsonify({"status": "success", "booking_id": booking_id}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": True, "message": str(e)}), 500
    finally:
        cur.close()
        conn.close()


# ── 6. Check-In (PATCH /api/bookings/{id}/checkin) ───────────────────
@bookings_bp.route('/<int:booking_id>/checkin', methods=['PATCH'])
@token_required
def checkin(current_user, booking_id):
    """
    Check-In สัตว์เลี้ยง (เปลี่ยนสถานะเป็น ACTIVE)
    ---
    tags:
      - Bookings
    security:
      - BearerAuth: []
    parameters:
      - name: booking_id
        in: path
        type: integer
        required: true
        description: ID ของการจอง
    responses:
      200:
        description: Check-in สำเร็จ
      400:
        description: ไม่สามารถ Check-in ได้เนื่องจากสถานะปัจจุบัน
      404:
        description: ไม่พบการจอง
      500:
        description: Internal Server Error
    """
    try:
        conn = get_db_connection()
        cur  = conn.cursor()

        # ตรวจสอบว่า booking อยู่ในสถานะที่ check-in ได้
        cur.execute("SELECT status::text FROM booking WHERE bookingid = %s", (booking_id,))
        row = cur.fetchone()
        if not row:
            conn.close()
            return jsonify({"error": True, "code": 404, "message": "ไม่พบการจอง"}), 404
        if row[0] not in ('PENDING', 'CONFIRMED'):
            conn.close()
            return jsonify({"error": True, "code": 400,
                            "message": f"ไม่สามารถ Check-in ได้ สถานะปัจจุบัน: {row[0]}"}), 400

        cur.execute(
            "UPDATE booking SET status = 'ACTIVE' WHERE bookingid = %s RETURNING bookingid",
            (booking_id,)
        )
        if cur.rowcount == 0:
            conn.rollback()
            conn.close()
            return jsonify({"error": True, "code": 404, "message": "ไม่พบการจอง"}), 404

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "status":        "success",
            "booking_id":    booking_id,
            "booking_status": "CHECKED_IN",
            "checked_in_at": get_thai_time().isoformat(),
        }), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500


# ── 7. Check-Out (PATCH /api/bookings/{id}/checkout) ─────────────────
@bookings_bp.route('/<int:booking_id>/checkout', methods=['PATCH'])
@token_required
def checkout(current_user, booking_id):
    """
    Check-Out สัตว์เลี้ยง (เปลี่ยนสถานะเป็น COMPLETED และบันทึกการจ่ายเงิน)
    ---
    tags:
      - Bookings
    security:
      - BearerAuth: []
    parameters:
      - name: booking_id
        in: path
        type: integer
        required: true
        description: ID ของการจอง
      - name: body
        in: body
        required: false
        schema:
          type: object
          properties:
            payment_method:
              type: string
              description: วิธีการชำระเงิน (เช่น CASH, CREDIT_CARD, TRANSFER)
              example: "TRANSFER"
    responses:
      200:
        description: Check-out สำเร็จ
      400:
        description: ไม่สามารถ Check-out ได้เนื่องจากสถานะปัจจุบัน
      404:
        description: ไม่พบการจอง
      500:
        description: Internal Server Error
    """
    try:
        data           = request.get_json() or {}
        payment_method = data.get('payment_method')
        staff_id       = current_user.get('staff_id')

        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # ตรวจสอบ status
        cur.execute("SELECT status::text FROM booking WHERE bookingid = %s", (booking_id,))
        row = cur.fetchone()
        if not row:
            conn.close()
            return jsonify({"error": True, "code": 404, "message": "ไม่พบการจอง"}), 404
        if row['status'] != 'ACTIVE':
            conn.close()
            return jsonify({"error": True, "code": 400,
                            "message": f"ไม่สามารถ Check-out ได้ สถานะปัจจุบัน: {row['status']}"}), 400

        cur2 = conn.cursor()
        cur2.execute(
            "UPDATE booking SET status = 'COMPLETED' WHERE bookingid = %s RETURNING bookingid",
            (booking_id,)
        )

        invoice_id  = None
        grand_total = 0
        if payment_method:
            cur2.execute("""
                UPDATE invoice
                SET paymentstatus = 'PAID', paymentmethod = %s,
                    issuedby_staffid = %s, paymentdate = %s
                WHERE bookingid = %s
                RETURNING invoiceid, grandtotal
            """, (payment_method, staff_id, get_thai_time(), booking_id))
            inv = cur2.fetchone()
            if inv:
                invoice_id  = f"INV-{str(inv[0]).zfill(4)}"
                grand_total = float(inv[1] or 0)

        conn.commit()
        cur.close()
        cur2.close()
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


# ── 8. Cancel Booking (PATCH /api/bookings/{id}/cancel) ──────────────
@bookings_bp.route('/<int:booking_id>/cancel', methods=['PATCH'])
@token_required
def cancel_booking(current_user, booking_id):
    """
    ยกเลิกการจอง
    ---
    tags:
      - Bookings
    security:
      - BearerAuth: []
    parameters:
      - name: booking_id
        in: path
        type: integer
        required: true
        description: ID ของการจอง
      - name: body
        in: body
        required: false
        schema:
          type: object
          properties:
            cancelled_by:
              type: integer
              description: ID พนักงานที่กดยกเลิก (ถ้าไม่ระบุ จะดึงจาก Token อัตโนมัติ)
    responses:
      200:
        description: ยกเลิกการจองสำเร็จ
      400:
        description: ไม่พบการจอง หรืออยู่ในสถานะที่ไม่สามารถยกเลิกได้แล้ว (เช่น Check-out ไปแล้ว)
      500:
        description: Internal Server Error
    """
    try:
        data     = request.get_json() or {}
        staff_id = data.get('cancelled_by', current_user.get('staff_id'))

        conn = get_db_connection()
        cur  = conn.cursor()
        cur.execute("""
            UPDATE booking
            SET status = 'CANCELLED', cancelledat = %s, cancelledbystaffid = %s
            WHERE bookingid = %s AND status::text NOT IN ('COMPLETED', 'CANCELLED')
            RETURNING bookingid
        """, (get_thai_time().date(), staff_id, booking_id))

        if cur.rowcount == 0:
            conn.rollback()
            cur.close()
            conn.close()
            return jsonify({"error": True, "code": 400,
                            "message": "ไม่พบการจอง หรือยกเลิกไม่ได้แล้ว"}), 400

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "status":     "success",
            "booking_id": booking_id,
            "booking_status": "CANCELLED",
        }), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500


# ── 9. Add Add-on Service (POST /api/bookings/{id}/addons) ────────────
@bookings_bp.route('/<int:booking_id>/addons', methods=['POST'])
@token_required
def add_addon(current_user, booking_id):
    """
    เพิ่มบริการเสริม (Add-on) ระหว่างการเข้าพัก
    ---
    tags:
      - Bookings
    security:
      - BearerAuth: []
    parameters:
      - name: booking_id
        in: path
        type: integer
        required: true
        description: ID ของการจอง
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            services:
              type: array
              description: รายการบริการเสริม
              items:
                type: object
                properties:
                  item_id:
                    type: integer
                    example: 1
                  quantity:
                    type: integer
                    example: 1
            item_id:
              type: integer
              description: กรณีส่งรายการเดียว (Fallback แบบเก่า)
            quantity:
              type: integer
              description: จำนวน (Fallback แบบเก่า)
    responses:
      201:
        description: เพิ่มบริการเสริมและอัปเดตยอด Invoice สำเร็จ
      400:
        description: ข้อมูลไม่ครบถ้วน
      500:
        description: Internal Server Error
    """
    conn = get_db_connection()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        data = request.get_json()
        services = data.get('services', [])
        
        # Fallback กรณีส่งมาแค่ชิ้นเดียวแบบเก่า
        if not services and data.get('item_id'):
            services = [{'item_id': data.get('item_id'), 'quantity': data.get('quantity', 1)}]

        if not services:
            return jsonify({"error": True, "message": "ต้องระบุบริการเสริม (services)"}), 400

        total_added_cost = 0
        cur2 = conn.cursor()

        for svc in services:
            item_id = svc.get('item_id')
            qty = svc.get('quantity', 1)

            cur.execute("SELECT itemname, unitprice FROM inventoryitem WHERE itemid = %s", (item_id,))
            item = cur.fetchone()
            if not item:
                continue

            cur2.execute("""
                INSERT INTO bookingservice (bookingid, itemid, quantity, unitprice)
                VALUES (%s, %s, %s, %s)
            """, (booking_id, item_id, qty, item['unitprice']))

            total_added_cost += float(item['unitprice']) * qty

        # อัปเดตยอดรวมใน Invoice
        if total_added_cost > 0:
            cur2.execute("""
                UPDATE invoice SET servicetotal = servicetotal + %s WHERE bookingid = %s
            """, (total_added_cost, booking_id))

        conn.commit()
        cur.close()
        cur2.close()
        conn.close()

        return jsonify({
            "status": "success",
            "message": f"เพิ่มบริการเสริมจำนวน {len(services)} รายการ สำเร็จ",
            "added_cost": total_added_cost,
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": True, "message": str(e)}), 500
    finally:
        conn.close()


# ── 10. Get Chargeable Services (GET /api/bookings/services) ──────────
@bookings_bp.route('/services', methods=['GET'])
@token_required
def get_services(current_user):
    """
    ดึงรายการบริการเสริมที่สามารถคิดเงินได้
    ---
    tags:
      - Bookings
    security:
      - BearerAuth: []
    responses:
      200:
        description: รายการสินค้า/บริการที่มีการคิดเงิน (ischargeable = TRUE)
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
                  item_id:
                    type: integer
                  name:
                    type: string
                  unit_price:
                    type: number
                  category:
                    type: string
      500:
        description: Internal Server Error
    """
    try:
        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT itemid AS item_id, itemname AS name,
                   unitprice AS unit_price, category
            FROM inventoryitem
            WHERE ischargeable = TRUE
            ORDER BY category, itemname
        """)
        items = cur.fetchall()
        cur.close()
        conn.close()
        for it in items:
            it['unit_price'] = float(it['unit_price'] or 0)
        return jsonify({"status": "success", "data": items}), 200
    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500
