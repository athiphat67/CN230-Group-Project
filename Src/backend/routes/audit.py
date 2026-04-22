"""
audit.py — FR1.11 Audit Trail
GET /api/audit   (ADMIN / OWNER เท่านั้น)

⚠️ อัปเดตล่าสุด:
  - แก้ไขชื่อตารางเป็น AuditTrail ให้ตรงกับ schema.sql
  - ยกเลิกการ JOIN ตาราง Staff เพราะ AuditTrail มีคอลัมน์ StaffName อยู่แล้ว (ป้องกันข้อมูลหายเมื่อพนักงานถูกลบ)
  - Alias ชื่อคอลัมน์จาก PascalCase เป็น snake_case เพื่อให้ตรงกับที่ Frontend ต้องการ
"""
from flask import Blueprint, request, jsonify, current_app
import psycopg2
import psycopg2.extras
from utils import token_required, admin_required

audit_bp = Blueprint('audit', __name__)

def get_db_connection():
    return psycopg2.connect(current_app.config['SQLALCHEMY_DATABASE_URI'])


@audit_bp.route('', methods=['GET'])
@token_required
@admin_required
def get_audit_logs(current_user):
    try:
        staff_id    = request.args.get('staff_id')
        action_type = request.args.get('action_type')
        start_date  = request.args.get('start_date')
        end_date    = request.args.get('end_date')

        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # ดึงข้อมูลจาก AuditTrail ตรงๆ พร้อม Alias ชื่อคอลัมน์ให้เป็น snake_case ตาม Frontend
        query = """
            SELECT
                AuditID AS audit_id,
                StaffID AS staff_id,
                StaffName AS staff_name,
                ActionType AS action_type,
                TableAffected AS table_affected,
                RecordID AS record_id,
                Description AS description,
                Timestamp AS timestamp
            FROM AuditTrail
            WHERE 1=1
        """
        params = []

        if staff_id:
            query += " AND StaffID = %s"
            params.append(staff_id)
        if action_type:
            query += " AND ActionType = %s"
            params.append(action_type.upper())
        if start_date:
            query += " AND Timestamp >= %s"
            params.append(start_date + " 00:00:00")
        if end_date:
            query += " AND Timestamp <= %s"
            params.append(end_date + " 23:59:59")

        query += " ORDER BY Timestamp DESC LIMIT 500"

        cur.execute(query, tuple(params))
        logs = cur.fetchall()
        cur.close()
        conn.close()

        # แปลง format วันที่ให้ตรงกับมาตรฐาน ISO ตามที่ Frontend คาดหวัง
        for log in logs:
            if log['timestamp']:
                log['timestamp'] = log['timestamp'].strftime('%Y-%m-%dT%H:%M:%S')

        return jsonify({"status": "success", "data": logs}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500