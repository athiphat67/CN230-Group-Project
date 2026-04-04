from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
import psycopg2
import psycopg2.extras

bookings_bp = Blueprint('bookings', __name__)

def get_db_connection():
    return psycopg2.connect(current_app.config['SQLALCHEMY_DATABASE_URI'])

# --- 1. API ค้นหาห้องว่าง (Search Available Rooms) สำหรับ User ---
@bookings_bp.route('/available-rooms', methods=['GET'])
def get_available_rooms():
    try:
        check_in  = request.args.get('check_in')
        check_out = request.args.get('check_out')
        pet_type  = request.args.get('pet_type')  # 'DOG' หรือ 'CAT'

        if not all([check_in, check_out, pet_type]):
            return jsonify({"status": "error", "message": "กรุณาส่ง check_in, check_out และ pet_type ให้ครบ"}), 400

        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        query = """
            SELECT RoomID, RoomNumber, RoomSize, Rate, Status
            FROM Room
            WHERE PetType = %s
              AND Status != 'MAINTENANCE'
              AND RoomID NOT IN (
                  SELECT bd.RoomID
                  FROM BookingDetail bd
                  JOIN Booking b ON bd.BookingID = b.BookingID
                  WHERE b.Status NOT IN ('CANCELLED', 'COMPLETED')
                    AND (b.CheckInDate < %s AND b.CheckOutDate > %s)
              )
            ORDER BY RoomSize, RoomNumber;
        """
        cur.execute(query, (pet_type, check_out, check_in))
        available_rooms = cur.fetchall()

        cur.close()
        conn.close()

        return jsonify({
            "status": "success",
            "total_available": len(available_rooms),
            "data": available_rooms
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# --- 2. API ดูรายการบริการพิเศษที่ลูกค้าเลือกได้ตอนจอง ---
@bookings_bp.route('/services', methods=['GET'])
def get_bookable_services():
    """ดึงรายการ SERVICE จาก InventoryItem เพื่อให้ลูกค้าเลือกตอนจอง"""
    try:
        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT ItemID, ItemName, UnitPrice
            FROM InventoryItem
            WHERE Category = 'SERVICE'
            ORDER BY ItemName
        """)
        services = cur.fetchall()
        cur.close()
        conn.close()

        return jsonify({"status": "success", "data": services}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# --- 3. API สร้างการจอง พร้อมเลือกบริการพิเศษล่วงหน้า ---
@bookings_bp.route('/create', methods=['POST'])
def create_booking():
    """
    Body (JSON):
    {
        "customer_id": 1,
        "pet_id": 1,
        "room_id": 1,
        "check_in": "2026-04-20 12:00:00",
        "check_out": "2026-04-25 12:00:00",
        "services": [               <-- optional
            {"item_id": 9, "quantity": 1},
            {"item_id": 12, "quantity": 1}
        ]
    }
    """
    conn = None
    try:
        data          = request.get_json()
        customer_id   = data.get('customer_id')
        pet_id        = data.get('pet_id')
        room_id       = data.get('room_id')
        check_in_str  = data.get('check_in')
        check_out_str = data.get('check_out')
        services      = data.get('services', [])  # [{"item_id": X, "quantity": Y}, ...]

        if not all([customer_id, pet_id, room_id, check_in_str, check_out_str]):
            return jsonify({"status": "error", "message": "กรุณาส่งข้อมูลให้ครบ"}), 400

        check_in_date  = datetime.strptime(check_in_str,  '%Y-%m-%d %H:%M:%S')
        check_out_date = datetime.strptime(check_out_str, '%Y-%m-%d %H:%M:%S')
        nights = (check_out_date - check_in_date).days
        if nights <= 0:
            return jsonify({"status": "error", "message": "วันที่เช็กเอาต์ต้องมากกว่าวันที่เช็กอิน"}), 400

        conn = get_db_connection()
        cur  = conn.cursor()

        # [FIX] ตรวจสอบว่าห้องว่างจริงก่อน INSERT (ป้องกัน race condition)
        cur.execute("""
            SELECT COUNT(*) FROM BookingDetail bd
            JOIN Booking b ON bd.BookingID = b.BookingID
            WHERE bd.RoomID = %s
              AND b.Status NOT IN ('CANCELLED', 'COMPLETED')
              AND (b.CheckInDate < %s AND b.CheckOutDate > %s)
        """, (room_id, check_out_str, check_in_str))
        conflict_count = cur.fetchone()[0]
        if conflict_count > 0:
            conn.close()
            return jsonify({"status": "error", "message": "ห้องนี้ถูกจองในช่วงวันที่เลือกแล้ว กรุณาเลือกห้องอื่น"}), 409

        # 1. ดึงราคาห้องพัก
        cur.execute("SELECT Rate FROM Room WHERE RoomID = %s", (room_id,))
        row = cur.fetchone()
        if not row:
            conn.close()
            return jsonify({"status": "error", "message": "ไม่พบห้องที่เลือก"}), 404
        room_rate = row[0]

        # 2. บันทึก Booking
        cur.execute("""
            INSERT INTO Booking (CustomerID, CheckInDate, CheckOutDate, Status, LockedRate)
            VALUES (%s, %s, %s, 'PENDING', %s) RETURNING BookingID;
        """, (customer_id, check_in_str, check_out_str, room_rate))
        booking_id = cur.fetchone()[0]

        # 3. บันทึก BookingDetail
        cur.execute("""
            INSERT INTO BookingDetail (BookingID, PetID, RoomID)
            VALUES (%s, %s, %s);
        """, (booking_id, pet_id, room_id))

        # 4. บันทึก BookingService (บริการพิเศษที่เลือกล่วงหน้า)
        service_total = 0.0
        for svc in services:
            item_id  = svc.get('item_id')
            quantity = svc.get('quantity', 1)

            # ดึงราคา ณ วันที่จอง (lock ราคาไว้)
            cur.execute("""
                SELECT UnitPrice FROM InventoryItem
                WHERE ItemID = %s AND Category = 'SERVICE'
            """, (item_id,))
            svc_row = cur.fetchone()
            if not svc_row:
                continue  # ข้ามรายการที่ไม่ใช่ SERVICE หรือไม่พบ

            unit_price = float(svc_row[0])
            cur.execute("""
                INSERT INTO BookingService (BookingID, ItemID, Quantity, UnitPrice)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (BookingID, ItemID) DO NOTHING;
            """, (booking_id, item_id, quantity, unit_price))
            service_total += unit_price * quantity

        # 5. ออก Invoice (ค่าห้อง + ค่าบริการที่จองล่วงหน้า)
        room_total = float(room_rate) * nights
        cur.execute("""
            INSERT INTO Invoice (BookingID, RoomTotal, ServiceTotal, PaymentStatus)
            VALUES (%s, %s, %s, 'UNPAID');
        """, (booking_id, room_total, service_total))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "status": "success",
            "message": "สร้างการจองและออกใบแจ้งหนี้สำเร็จ",
            "booking_id": booking_id,
            "room_total": room_total,
            "service_total": service_total,
            "grand_total": room_total + service_total
        }), 201

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500


# --- 4. API อัปเดตสถานะการจอง (สำหรับ Admin/Staff) ---
@bookings_bp.route('/update-status/<int:booking_id>', methods=['PUT'])
def update_booking_status(booking_id):
    """
    Body: { "status": "ACTIVE" | "COMPLETED" | "CANCELLED", "staff_id": 3 }
    """
    try:
        data       = request.get_json()
        new_status = data.get('status')
        staff_id   = data.get('staff_id')

        allowed = {'ACTIVE', 'COMPLETED', 'CANCELLED'}
        if new_status not in allowed:
            return jsonify({"status": "error", "message": f"status ต้องเป็นหนึ่งใน {allowed}"}), 400

        conn = get_db_connection()
        cur  = conn.cursor()

        # อัปเดตสถานะ Booking
        cur.execute("""
            UPDATE Booking
            SET Status = %s, CreatedBy_StaffID = %s
            WHERE BookingID = %s
        """, (new_status, staff_id, booking_id))

        if new_status == 'ACTIVE':
            # เช็กอิน: เปลี่ยนห้องเป็น OCCUPIED
            cur.execute("""
                UPDATE Room SET Status = 'OCCUPIED'
                WHERE RoomID IN (SELECT RoomID FROM BookingDetail WHERE BookingID = %s)
            """, (booking_id,))

        elif new_status in ('COMPLETED', 'CANCELLED'):
            # เช็กเอาต์หรือยกเลิก: คืนสถานะห้องเป็น AVAILABLE
            cur.execute("""
                UPDATE Room SET Status = 'AVAILABLE'
                WHERE RoomID IN (SELECT RoomID FROM BookingDetail WHERE BookingID = %s)
            """, (booking_id,))

            if new_status == 'CANCELLED':
                cur.execute("""
                    UPDATE Booking SET CancelledAt = CURRENT_DATE, CancelledByStaffID = %s
                    WHERE BookingID = %s
                """, (staff_id, booking_id))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "status": "success",
            "message": f"อัปเดตสถานะการจอง ID {booking_id} เป็น {new_status} เรียบร้อย"
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# --- 5. API ดูประวัติการจองของลูกค้า ---
@bookings_bp.route('/customer/<int:customer_id>', methods=['GET'])
def get_customer_bookings(customer_id):
    try:
        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        query = """
            SELECT b.BookingID, b.CheckInDate, b.CheckOutDate, b.Status,
                   p.Name AS PetName, r.RoomNumber,
                   i.RoomTotal, i.ServiceTotal, i.VetEmergencyCost,
                   i.GrandTotal, i.PaymentStatus
            FROM Booking b
            JOIN BookingDetail bd ON b.BookingID = bd.BookingID
            JOIN Pet p            ON bd.PetID    = p.PetID
            JOIN Room r           ON bd.RoomID   = r.RoomID
            JOIN Invoice i        ON b.BookingID = i.BookingID
            WHERE b.CustomerID = %s
            ORDER BY b.CheckInDate DESC
        """
        cur.execute(query, (customer_id,))
        history = cur.fetchall()

        cur.close()
        conn.close()

        return jsonify({"status": "success", "data": history}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# --- 6. API ดูรายละเอียดการจอง พร้อมบริการที่เลือกล่วงหน้า ---
@bookings_bp.route('/detail/<int:booking_id>', methods=['GET'])
def get_booking_detail(booking_id):
    try:
        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # ข้อมูล Booking หลัก
        cur.execute("""
            SELECT b.BookingID, b.CheckInDate, b.CheckOutDate, b.Status,
                   p.Name AS PetName, p.Species, r.RoomNumber, r.RoomSize,
                   i.RoomTotal, i.ServiceTotal, i.GrandTotal, i.PaymentStatus
            FROM Booking b
            JOIN BookingDetail bd ON b.BookingID = bd.BookingID
            JOIN Pet p            ON bd.PetID    = p.PetID
            JOIN Room r           ON bd.RoomID   = r.RoomID
            JOIN Invoice i        ON b.BookingID = i.BookingID
            WHERE b.BookingID = %s
        """, (booking_id,))
        booking = cur.fetchone()

        if not booking:
            cur.close()
            conn.close()
            return jsonify({"status": "error", "message": "ไม่พบการจองนี้"}), 404

        # บริการพิเศษที่จองล่วงหน้า
        cur.execute("""
            SELECT ii.ItemName, bs.Quantity, bs.UnitPrice,
                   (bs.Quantity * bs.UnitPrice) AS Subtotal
            FROM BookingService bs
            JOIN InventoryItem ii ON bs.ItemID = ii.ItemID
            WHERE bs.BookingID = %s
        """, (booking_id,))
        pre_services = cur.fetchall()

        cur.close()
        conn.close()

        return jsonify({
            "status": "success",
            "data": {
                **booking,
                "pre_booked_services": pre_services
            }
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
