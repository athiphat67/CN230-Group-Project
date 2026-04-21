from flask import Blueprint, request, jsonify, current_app
import psycopg2
import psycopg2.extras
from utils import token_required # นำเข้าเพื่อเช็คสิทธิ์พนักงาน

care_logs_bp = Blueprint('care_logs', __name__)

def get_db_connection():
    return psycopg2.connect(current_app.config['SQLALCHEMY_DATABASE_URI'])

# ── 1. บันทึกรายงานการดูแลรายวัน (FR4.1 - 4.2) ──
@care_logs_bp.route('', methods=['POST'])
@token_required
def add_care_log(current_user):
    try:
        data = request.get_json()
        
        # ดึงข้อมูลจาก Token (current_user) แทนการรับ staff_id จาก body เพื่อความปลอดภัย
        staff_id = current_user.get('staff_id') 

        conn = get_db_connection()
        cur = conn.cursor()
        
        query = """
            INSERT INTO carelog (
                bookingdetailid, foodstatus, pottystatus, medicationgiven, 
                staffnote, photourl, loggedby_staffid, mood, behavior_notes
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING logid;
        """
        cur.execute(query, (
            data.get('booking_detail_id'), 
            data.get('food_status'), 
            data.get('potty_status'), 
            data.get('medication_given', False),
            data.get('staff_note'), 
            data.get('photo_url'), 
            staff_id,
            data.get('mood'),
            data.get('behavior_notes')
        ))
        
        new_log_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()

        # TODO: FR4.2 - ส่ง Notification ไปหาเจ้าของสัตว์เลี้ยง (Customer) ตรงนี้
        
        return jsonify({"status": "success", "message": "บันทึกรายงานการดูแลสำเร็จ", "log_id": new_log_id}), 201
    except Exception as e:
        return jsonify({"error": True, "code": 500, "message": "Internal Server Error", "detail": str(e)}), 500

# ── 2. ดึงรายงานการดูแลตาม Booking (FR4.5) ──
@care_logs_bp.route('/booking/<int:booking_detail_id>', methods=['GET'])
@token_required
def get_care_logs_by_booking(current_user, booking_detail_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        query = """
            SELECT 
                c.*, 
                s.firstname || ' ' || s.lastname as staff_name
            FROM carelog c
            JOIN staff s ON c.loggedby_staffid = s.staffid
            WHERE c.bookingdetailid = %s
            ORDER BY c.logdate DESC
        """
        cur.execute(query, (booking_detail_id,))
        logs = cur.fetchall()
        cur.close()
        conn.close()
        
        # แปลงวันที่ให้เป็น String
        for log in logs:
            if log['logdate']: log['logdate'] = log['logdate'].isoformat()
            
        return jsonify({"status": "success", "data": logs}), 200
    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500