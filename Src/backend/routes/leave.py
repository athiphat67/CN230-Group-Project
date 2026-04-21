from flask import Blueprint, request, jsonify, current_app
import psycopg2
import psycopg2.extras
from datetime import datetime, timedelta

leave_bp = Blueprint('leave', __name__)

def get_db_connection():
    return psycopg2.connect(current_app.config['SQLALCHEMY_DATABASE_URI'])

def get_thai_time():
    # บังคับใช้เวลาไทย (UTC+7) เสมอสำหรับการบันทึก Log
    return datetime.utcnow() + timedelta(hours=7)

# --- 1. ดึงรายการคำขอลาทั้งหมด ---
@leave_bp.route('', methods=['GET'])
def get_leave_requests():
    try:
        status_filter = request.args.get('status') # เช่น pending, approved, rejected

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # 🟢 แก้ไข: เปลี่ยนจาก FROM leave เป็น FROM LeaveRecord
        query = """
            SELECT 
                l.leaveid AS leave_id,
                l.staffid AS staff_id,
                s.firstname AS first_name,
                s.lastname AS last_name,
                l.leavetype AS leave_type,
                l.startdate AS start_date,
                l.enddate AS end_date,
                l.reason,
                l.status,
                l.approvedby AS approved_by,
                a.firstname AS approver_name
            FROM LeaveRecord l
            JOIN staff s ON l.staffid = s.staffid
            LEFT JOIN staff a ON l.approvedby = a.staffid
        """
        
        # ถ้ามีการส่ง filter สถานะมา ให้กรองตามนั้น
        if status_filter:
            query += " WHERE l.status = %s ORDER BY l.startdate DESC"
            cur.execute(query, (status_filter.upper(),))
        else:
            query += " ORDER BY l.status = 'PENDING' DESC, l.startdate DESC" # เรียง Pending ขึ้นก่อน
            cur.execute(query)

        requests = cur.fetchall()
        cur.close()
        conn.close()

        # Format Date
        for r in requests:
            r['start_date'] = r['start_date'].strftime('%Y-%m-%d') if r['start_date'] else None
            r['end_date'] = r['end_date'].strftime('%Y-%m-%d') if r['end_date'] else None

        return jsonify({"status": "success", "data": requests}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# --- 2. อนุมัติ / ปฏิเสธ คำขอลา ---
@leave_bp.route('/<int:leave_id>', methods=['PATCH'])
def update_leave_status(leave_id):
    try:
        data = request.get_json()
        new_status = data.get('status') # 'APPROVED' หรือ 'REJECTED'
        approved_by = data.get('approved_by') # รับ ID ของแอดมินที่กดอนุมัติ 

        if new_status not in ['APPROVED', 'REJECTED']:
            return jsonify({"status": "error", "message": "สถานะไม่ถูกต้อง"}), 400

        now = get_thai_time()

        conn = get_db_connection()
        cur = conn.cursor()

        # 🟢 แก้ไข: เปลี่ยนจาก UPDATE leave เป็น UPDATE LeaveRecord
        query = """
            UPDATE LeaveRecord 
            SET status = %s, approvedby = %s, updatedat = %s
            WHERE leaveid = %s AND status = 'PENDING'
            RETURNING leaveid;
        """
        cur.execute(query, (new_status, approved_by, now, leave_id))
        
        if cur.rowcount == 0:
            conn.rollback()
            return jsonify({"status": "error", "message": "ไม่พบรายการลา หรือรายการนี้ถูกจัดการไปแล้ว"}), 404

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"status": "success", "message": f"อัปเดตสถานะเป็น {new_status} เรียบร้อยแล้ว"}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500