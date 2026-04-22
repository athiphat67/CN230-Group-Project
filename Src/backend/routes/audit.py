"""
audit.py — FR1.11 Audit Trail
GET /api/audit   (ADMIN / OWNER เท่านั้น)

⚠️ แก้ไขจากเดิม:
  - ชื่อตาราง: audit_log → auditlog  (ตรงกับ DB schema จริง)
  - ชื่อคอลัมน์: ใช้ snake_case ที่ DB ใช้จริง (audit_id, staff_id, action_type ...)
  - แก้ function signature: get_audit_logs() → get_audit_logs(current_user)
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
def get_audit_logs(current_user):         # ← ต้องรับ current_user เสมอเมื่อใช้ @admin_required
    try:
        staff_id    = request.args.get('staff_id')
        action_type = request.args.get('action_type')
        start_date  = request.args.get('start_date')
        end_date    = request.args.get('end_date')

        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # ชื่อตาราง: auditlog  |  ชื่อ column ตาม schema จริง
        query = """
            SELECT
                a.audit_id,
                a.staff_id,
                s.firstname || ' ' || s.lastname AS staff_name,
                a.action_type,
                a.table_affected,
                a.record_id,
                a.description,
                a.timestamp
            FROM auditlog a
            JOIN staff s ON a.staff_id = s.staffid
            WHERE 1=1
        """
        params = []

        if staff_id:
            query += " AND a.staff_id = %s"
            params.append(staff_id)
        if action_type:
            query += " AND a.action_type = %s"
            params.append(action_type.upper())
        if start_date:
            query += " AND a.timestamp >= %s"
            params.append(start_date + " 00:00:00")
        if end_date:
            query += " AND a.timestamp <= %s"
            params.append(end_date + " 23:59:59")

        query += " ORDER BY a.timestamp DESC LIMIT 500"

        cur.execute(query, tuple(params))
        logs = cur.fetchall()
        cur.close()
        conn.close()

        for log in logs:
            if log['timestamp']:
                log['timestamp'] = log['timestamp'].strftime('%Y-%m-%dT%H:%M:%S')

        return jsonify({"status": "success", "data": logs}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500