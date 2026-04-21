from flask import Blueprint, request, jsonify, current_app
import psycopg2
import psycopg2.extras
from datetime import datetime, timedelta
from utils import token_required, admin_required

audit_bp = Blueprint('audit', __name__)

def get_db_connection():
    return psycopg2.connect(current_app.config['SQLALCHEMY_DATABASE_URI'])

def get_thai_time():
    # บังคับใช้เวลาไทย (UTC+7) เสมอ เพื่อให้เวลาใน Log ไม่เพี้ยน
    return datetime.utcnow() + timedelta(hours=7)

# --- 1. ดึงประวัติ Audit Logs พร้อมตัวกรอง ---
@audit_bp.route('', methods=['GET'])
@token_required
@admin_required
def get_audit_logs():
    try:
        # รับ Parameter ตัวกรองจาก Frontend
        staff_id = request.args.get('staff_id')
        action_type = request.args.get('action_type')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # สมมติว่าตารางชื่อ 'audit_log' หรือปรับเปลี่ยนตาม Schema ของคุณ
        query = """
            SELECT 
                a.auditid AS audit_id,
                a.staffid AS staff_id,
                s.firstname || ' ' || s.lastname AS staff_name,
                a.actiontype AS action_type,
                a.tableaffected AS table_affected,
                a.recordid AS record_id,
                a.description,
                a.timestamp
            FROM audit_log a
            JOIN staff s ON a.staffid = s.staffid
            WHERE 1=1
        """
        params = []

        # เพิ่มเงื่อนไขการกรอง (Dynamic WHERE Clause)
        if staff_id:
            query += " AND a.staffid = %s"
            params.append(staff_id)
        if action_type:
            query += " AND a.actiontype = %s"
            params.append(action_type)
        if start_date:
            query += " AND a.timestamp >= %s"
            params.append(start_date + " 00:00:00")
        if end_date:
            query += " AND a.timestamp <= %s"
            params.append(end_date + " 23:59:59")

        query += " ORDER BY a.timestamp DESC"

        cur.execute(query, tuple(params))
        logs = cur.fetchall()
        cur.close()
        conn.close()

        # Format DateTime ให้เป็น ISO format เพื่อให้ JS นำไป render ได้ง่าย
        for log in logs:
            if log['timestamp']:
                log['timestamp'] = log['timestamp'].strftime('%Y-%m-%dT%H:%M:%S')

        return jsonify({"status": "success", "data": logs}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500