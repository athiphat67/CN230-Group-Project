from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
import psycopg2
import psycopg2.extras

bookings_bp = Blueprint('bookings', __name__)

def get_db_connection():
    return psycopg2.connect(current_app.config['SQLALCHEMY_DATABASE_URI'])

# ════════════════════════════════════════════════════════════════════
# 1. API: ดึงข้อมูลการจองทั้งหมด (GET /api/bookings)
# สอดคล้องกับ api.js -> API.bookings.getAll()
# ════════════════════════════════════════════════════════════════════
@bookings_bp.route('', methods=['GET'])
def get_all_bookings():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        query = """
            SELECT 
                b.BookingID as id,
                p.Name as pet_name,
                p.Species as pet_type,
                p.Breed as breed,
                c.Name as owner_name,
                c.Phone as owner_phone,
                r.RoomNumber as room,
                r.RoomSize as room_type,
                b.CheckInDate as checkin,
                b.CheckOutDate as checkout,
                b.Status as status,
                b.Notes as notes,
                COALESCE(i.RoomTotal, 0) as price_room,
                COALESCE(i.ServiceTotal, 0) as price_addons,
                array_agg(ii.ItemName) FILTER (WHERE ii.ItemName IS NOT NULL) as addons
            FROM Booking b
            JOIN BookingDetail bd ON b.BookingID = bd.BookingID
            JOIN Pet p ON bd.PetID = p.PetID
            JOIN Customer c ON b.CustomerID = c.CustomerID
            JOIN Room r ON bd.RoomID = r.RoomID
            LEFT JOIN Invoice i ON b.BookingID = i.BookingID
            LEFT JOIN BookingService bs ON b.BookingID = bs.BookingID
            LEFT JOIN InventoryItem ii ON bs.ItemID = ii.ItemID
            GROUP BY b.BookingID, p.Name, p.Species, p.Breed, c.Name, c.Phone, 
                     r.RoomNumber, r.RoomSize, b.CheckInDate, b.CheckOutDate, 
                     b.Status, b.Notes, i.RoomTotal, i.ServiceTotal
            ORDER BY b.CheckInDate DESC
        """
        cur.execute(query)
        rows = cur.fetchall()
        
        # จัด Format ให้ตรงกับที่ Bookings.js คาดหวัง
        formatted_data = []
        for row in rows:
            pet_type = (row['pet_type'] or '').upper()
            if pet_type == 'CAT': pet_emoji = '🐱'
            elif pet_type == 'DOG': pet_emoji = '🐶'
            else: pet_emoji = '🐾'
            
            formatted_data.append({
                "id": f"BK-{row['id']:04d}",
                "pet_name": row['pet_name'],
                "pet_emoji": pet_emoji,
                "breed": row['breed'] or 'ไม่ระบุ',
                "owner_name": row['owner_name'],
                "owner_phone": row['owner_phone'],
                "room": row['room'],
                "room_type": row['room_type'],
                "checkin": row['checkin'].strftime('%Y-%m-%d') if row['checkin'] else None,
                "checkout": row['checkout'].strftime('%Y-%m-%d') if row['checkout'] else None,
                "addons": row['addons'] if row['addons'] else [],
                "status": row['status'],
                "notes": row['notes'] or '',
                "price_room": float(row['price_room']),
                "price_addons": float(row['price_addons'])
            })

        cur.close()
        conn.close()
        return jsonify({"status": "success", "data": formatted_data}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# ════════════════════════════════════════════════════════════════════
# 2. API: สร้างการจองใหม่ (POST /api/bookings)
# สอดคล้องกับ Bookings.js -> saveNewBooking() ส่งข้อความดิบมา
# ════════════════════════════════════════════════════════════════════
@bookings_bp.route('', methods=['POST'])
def create_booking():
    conn = None
    try:
        data = request.get_json()
        
        pet_name = data.get('pet_name')
        owner_name = data.get('owner_name')
        owner_phone = data.get('owner_phone', '')
        room_number = data.get('room')
        checkin_str = data.get('checkin')
        checkout_str = data.get('checkout')
        pet_type = data.get('pet_type', 'CAT').upper()
        breed = data.get('breed', 'ไม่ระบุ')
        notes = data.get('notes', '')
        
        if not all([pet_name, owner_name, room_number, checkin_str, checkout_str]):
            return jsonify({"status": "error", "message": "ข้อมูลไม่ครบถ้วน"}), 400

        # คำนวณจำนวนคืน
        checkin_date = datetime.strptime(checkin_str, '%Y-%m-%d')
        checkout_date = datetime.strptime(checkout_str, '%Y-%m-%d')
        nights = (checkout_date - checkin_date).days
        if nights <= 0: return jsonify({"status": "error", "message": "วันที่ไม่ถูกต้อง"}), 400

        conn = get_db_connection()
        cur = conn.cursor()

        # 1. ตรวจสอบ/สร้าง ข้อมูลลูกค้า (Customer)
        cur.execute("SELECT CustomerID FROM Customer WHERE Name = %s", (owner_name,))
        cust_row = cur.fetchone()
        if cust_row:
            customer_id = cust_row[0]
        else:
            cur.execute("INSERT INTO Customer (Name, Phone) VALUES (%s, %s) RETURNING CustomerID", (owner_name, owner_phone))
            customer_id = cur.fetchone()[0]

        # 2. ตรวจสอบ/สร้าง ข้อมูลสัตว์เลี้ยง (Pet)
        cur.execute("SELECT PetID FROM Pet WHERE Name = %s AND CustomerID = %s", (pet_name, customer_id))
        pet_row = cur.fetchone()
        if pet_row:
            pet_id = pet_row[0]
        else:
            cur.execute("INSERT INTO Pet (Name, Species, Breed, CustomerID) VALUES (%s, %s, %s, %s) RETURNING PetID", (pet_name, pet_type, breed, customer_id))
            pet_id = cur.fetchone()[0]

        # 3. ตรวจสอบข้อมูลห้อง (Room)
        cur.execute("SELECT RoomID, Rate FROM Room WHERE RoomNumber = %s", (room_number,))
        room_row = cur.fetchone()
        if not room_row:
            return jsonify({"status": "error", "message": f"ไม่พบห้อง {room_number}"}), 404
        room_id, room_rate = room_row

        # 4. ตรวจสอบห้องว่าง (ป้องการจองซ้อน)
        cur.execute("""
            SELECT COUNT(*) FROM BookingDetail bd
            JOIN Booking b ON bd.BookingID = b.BookingID
            WHERE bd.RoomID = %s AND b.Status NOT IN ('CANCELLED', 'COMPLETED')
              AND (b.CheckInDate < %s AND b.CheckOutDate > %s)
        """, (room_id, checkout_str, checkin_str))
        if cur.fetchone()[0] > 0:
            return jsonify({"status": "error", "message": "ห้องไม่ว่างในช่วงเวลาดังกล่าว"}), 409

        # 5. สร้างการจอง (Booking)
        cur.execute("""
            INSERT INTO Booking (CustomerID, CheckInDate, CheckOutDate, Status, LockedRate, Notes)
            VALUES (%s, %s, %s, 'PENDING', %s, %s) RETURNING BookingID
        """, (customer_id, checkin_str, checkout_str, room_rate, notes))
        booking_id = cur.fetchone()[0]

        # 6. สร้างรายละเอียดการจอง (BookingDetail)
        cur.execute("INSERT INTO BookingDetail (BookingID, PetID, RoomID) VALUES (%s, %s, %s)", (booking_id, pet_id, room_id))

        # 7. สร้าง Invoice พื้นฐาน (ค่าห้อง)
        room_total = float(room_rate) * nights
        cur.execute("""
            INSERT INTO Invoice (BookingID, RoomTotal, ServiceTotal, PaymentStatus)
            VALUES (%s, %s, 0, 'UNPAID')
        """, (booking_id, room_total))

        conn.commit()
        cur.close()
        conn.close()

        new_booking_id_str = f"BK-{booking_id:04d}"
        return jsonify({"status": "success", "message": "สร้างการจองสำเร็จ", "booking_id": new_booking_id_str}), 201

    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

# ════════════════════════════════════════════════════════════════════
# 3. API: ดึงรายละเอียดการจอง (GET /api/bookings/<id>)
# ════════════════════════════════════════════════════════════════════
@bookings_bp.route('/<string:booking_id_str>', methods=['GET'])
def get_booking_detail(booking_id_str):
    try:
        # รองรับการส่ง ID แบบ BK-0001 หรือ 1
        b_id = int(booking_id_str.replace('BK-', '')) if 'BK-' in booking_id_str else int(booking_id_str)

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        cur.execute("SELECT * FROM Booking WHERE BookingID = %s", (b_id,))
        booking = cur.fetchone()
        
        cur.close()
        conn.close()
        
        if booking:
            return jsonify({"status": "success", "data": booking}), 200
        return jsonify({"status": "error", "message": "ไม่พบการจอง"}), 404
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# ════════════════════════════════════════════════════════════════════
# 4. API: Check-In (PATCH /api/bookings/<id>/checkin)
# ════════════════════════════════════════════════════════════════════
@bookings_bp.route('/<string:booking_id_str>/checkin', methods=['PATCH'])
def checkin_booking(booking_id_str):
    try:
        b_id = int(booking_id_str.replace('BK-', '')) if 'BK-' in booking_id_str else int(booking_id_str)
        data = request.get_json() or {}
        staff_id = data.get('checked_in_by', 1)

        conn = get_db_connection()
        cur = conn.cursor()
        
        # อัปเดตสถานะ Booking เป็น CHECKED_IN
        cur.execute("UPDATE Booking SET Status = 'CHECKED_IN', CreatedBy_StaffID = %s WHERE BookingID = %s", (staff_id, b_id))
        
        # อัปเดตสถานะห้องพักเป็น OCCUPIED
        cur.execute("""
            UPDATE Room SET Status = 'OCCUPIED' 
            WHERE RoomID IN (SELECT RoomID FROM BookingDetail WHERE BookingID = %s)
        """, (b_id,))
        
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": "Check-in สำเร็จ"}), 200
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# ════════════════════════════════════════════════════════════════════
# 5. API: Check-Out (PATCH /api/bookings/<id>/checkout)
# ════════════════════════════════════════════════════════════════════
@bookings_bp.route('/<string:booking_id_str>/checkout', methods=['PATCH'])
def checkout_booking(booking_id_str):
    try:
        b_id = int(booking_id_str.replace('BK-', '')) if 'BK-' in booking_id_str else int(booking_id_str)
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # อัปเดตสถานะ Booking เป็น CHECKED_OUT
        cur.execute("UPDATE Booking SET Status = 'CHECKED_OUT' WHERE BookingID = %s", (b_id,))
        
        # อัปเดตสถานะห้องพักคืนเป็น AVAILABLE
        cur.execute("""
            UPDATE Room SET Status = 'AVAILABLE' 
            WHERE RoomID IN (SELECT RoomID FROM BookingDetail WHERE BookingID = %s)
        """, (b_id,))
        
        # อัปเดตบิลเป็นชำระแล้ว (PAID)
        cur.execute("UPDATE Invoice SET PaymentStatus = 'PAID' WHERE BookingID = %s", (b_id,))
        
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": "Check-out สำเร็จ"}), 200
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# ════════════════════════════════════════════════════════════════════
# 6. API: Cancel Booking (PATCH /api/bookings/<id>/cancel)
# ════════════════════════════════════════════════════════════════════
@bookings_bp.route('/<string:booking_id_str>/cancel', methods=['PATCH'])
def cancel_booking(booking_id_str):
    try:
        b_id = int(booking_id_str.replace('BK-', '')) if 'BK-' in booking_id_str else int(booking_id_str)
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("UPDATE Booking SET Status = 'CANCELLED' WHERE BookingID = %s", (b_id,))
        
        # คืนห้องพักเป็น AVAILABLE เผื่อในกรณีที่ยกเลิกตอนที่ Check-in ไปแล้ว
        cur.execute("""
            UPDATE Room SET Status = 'AVAILABLE' 
            WHERE RoomID IN (SELECT RoomID FROM BookingDetail WHERE BookingID = %s)
        """, (b_id,))
        
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": "ยกเลิกการจองสำเร็จ"}), 200
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# ════════════════════════════════════════════════════════════════════
# 7. API: ค้นหาห้องว่าง (GET /api/bookings/available-rooms)
# (รักษาของเดิมไว้ แต่หากต้องการเปลี่ยนให้ตรง api.js แบบเป๊ะๆ 
# อาจต้องแก้ไขฝั่ง api.js จาก /rooms/availability เป็น /bookings/available-rooms)
# ════════════════════════════════════════════════════════════════════
@bookings_bp.route('/available-rooms', methods=['GET'])
def get_available_rooms():
    try:
        checkin_date = request.args.get('check_in')  
        checkout_date = request.args.get('check_out')
        pet_type = request.args.get('pet_type', 'CAT')

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        query = """
            SELECT RoomID as roomid, RoomNumber as roomnumber, RoomSize as roomsize, 
                   Rate as rate, Status as status
            FROM Room
            WHERE PetType = %s AND Status != 'MAINTENANCE'
              AND RoomID NOT IN (
                  SELECT bd.RoomID FROM BookingDetail bd
                  JOIN Booking b ON bd.BookingID = b.BookingID
                  WHERE b.Status NOT IN ('CANCELLED', 'COMPLETED')
                    AND (b.CheckInDate < %s AND b.CheckOutDate > %s)
              )
            ORDER BY RoomSize, RoomNumber
        """
        cur.execute(query, (pet_type, checkout_date, checkin_date))
        rooms = cur.fetchall()

        # แปลง Decimal ของ rate เป็น float เพื่อให้ดึงไปแปลงเป็น JSON ได้
        for r in rooms:
            r['rate'] = float(r['rate'])

        cur.close()
        conn.close()

        return jsonify({
            "status": "success",
            "total_available": len(rooms),
            "data": rooms
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500