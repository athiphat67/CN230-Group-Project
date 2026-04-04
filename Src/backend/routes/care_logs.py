from flask import Blueprint, request, jsonify, current_app
import psycopg2
import psycopg2.extras

care_logs_bp = Blueprint('care_logs', __name__)

def get_db_connection():
    return psycopg2.connect(current_app.config['SQLALCHEMY_DATABASE_URI'])


# --- 1. CREATE: พนักงานเพิ่มบันทึกการดูแลรายวัน ---
@care_logs_bp.route('/add', methods=['POST'])
def add_care_log():
    """
    Body: {
        "booking_detail_id": 1,
        "food_status": "ALL",
        "potty_status": "NORMAL",
        "medication_given": false,
        "staff_note": "...",
        "photo_url": null,
        "staff_id": 3
    }
    """
    conn = None
    try:
        data               = request.get_json()
        booking_detail_id  = data.get('booking_detail_id')
        food_status        = data.get('food_status')
        potty_status       = data.get('potty_status')
        medication         = data.get('medication_given', False)
        note               = data.get('staff_note', '')
        photo_url          = data.get('photo_url', None)
        staff_id           = data.get('staff_id')

        if not all([booking_detail_id, food_status, potty_status, staff_id]):
            return jsonify({"status": "error", "message": "กรุณาส่ง booking_detail_id, food_status, potty_status และ staff_id"}), 400

        conn = get_db_connection()
        cur  = conn.cursor()

        # [FIX] ตรวจสอบว่า Booking ที่เกี่ยวข้องยังเป็น ACTIVE อยู่
        cur.execute("""
            SELECT b.Status FROM Booking b
            JOIN BookingDetail bd ON b.BookingID = bd.BookingID
            WHERE bd.BookingDetailID = %s
        """, (booking_detail_id,))
        row = cur.fetchone()

        if not row:
            conn.close()
            return jsonify({"status": "error", "message": "ไม่พบ BookingDetail นี้ในระบบ"}), 404

        if row[0] != 'ACTIVE':
            conn.close()
            return jsonify({
                "status": "error",
                "message": f"ไม่สามารถเพิ่มบันทึกได้ เพราะการจองนี้มีสถานะ '{row[0]}' (ต้องเป็น ACTIVE เท่านั้น)"
            }), 400

        # บันทึก CareLog
        cur.execute("""
            INSERT INTO CareLog (BookingDetailID, FoodStatus, PottyStatus, MedicationGiven, StaffNote, PhotoURL, LoggedBy_StaffID)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING LogID;
        """, (booking_detail_id, food_status, potty_status, medication, note, photo_url, staff_id))
        log_id = cur.fetchone()[0]

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"status": "success", "message": "บันทึกการดูแลเรียบร้อย", "log_id": log_id}), 201

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500


# --- 2. READ: ดูบันทึกการดูแลทั้งหมดของ Booking (สำหรับลูกค้า/พนักงาน) ---
@care_logs_bp.route('/booking/<int:booking_id>', methods=['GET'])
def get_care_logs(booking_id):
    try:
        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        query = """
            SELECT cl.LogID, cl.LogDate, p.Name AS PetName,
                   cl.FoodStatus, cl.PottyStatus, cl.MedicationGiven,
                   cl.StaffNote, cl.PhotoURL,
                   s.FirstName AS StaffName
            FROM CareLog cl
            JOIN BookingDetail bd ON cl.BookingDetailID = bd.BookingDetailID
            JOIN Pet p            ON bd.PetID = p.PetID
            JOIN Staff s          ON cl.LoggedBy_StaffID = s.StaffID
            WHERE bd.BookingID = %s
            ORDER BY cl.LogDate DESC
        """
        cur.execute(query, (booking_id,))
        logs = cur.fetchall()

        cur.close()
        conn.close()

        return jsonify({"status": "success", "total_logs": len(logs), "data": logs}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# --- 3. UPDATE: พนักงานแก้ไขบันทึก ---
@care_logs_bp.route('/update/<int:log_id>', methods=['PUT'])
def update_care_log(log_id):
    try:
        data         = request.get_json()
        food_status  = data.get('food_status')
        potty_status = data.get('potty_status')
        medication   = data.get('medication_given')
        note         = data.get('staff_note')

        conn = get_db_connection()
        cur  = conn.cursor()

        cur.execute("""
            UPDATE CareLog
            SET FoodStatus = %s, PottyStatus = %s, MedicationGiven = %s, StaffNote = %s
            WHERE LogID = %s
        """, (food_status, potty_status, medication, note, log_id))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"status": "success", "message": f"แก้ไขบันทึกการดูแล ID {log_id} เรียบร้อย"}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# --- 4. DELETE: ลบบันทึกการดูแล ---
@care_logs_bp.route('/delete/<int:log_id>', methods=['DELETE'])
def delete_care_log(log_id):
    try:
        conn = get_db_connection()
        cur  = conn.cursor()

        cur.execute("DELETE FROM CareLog WHERE LogID = %s", (log_id,))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"status": "success", "message": f"ลบบันทึกการดูแล ID {log_id} ออกจากระบบแล้ว"}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
