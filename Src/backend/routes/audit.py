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
    """
    ดึงข้อมูลประวัติการใช้งานระบบ (Audit Trail)
    ---
    tags:
      - Audit
    security:
      - BearerAuth: []
    parameters:
      - name: staff_id
        in: query
        type: integer
        required: false
        description: กรองตาม ID ของพนักงาน
      - name: action_type
        in: query
        type: string
        required: false
        description: กรองตามประเภทการกระทำ (เช่น CREATE, UPDATE, DELETE, CHECKIN)
      - name: start_date
        in: query
        type: string
        format: date
        required: false
        description: เริ่มต้นตั้งแต่วันที่ (YYYY-MM-DD)
      - name: end_date
        in: query
        type: string
        format: date
        required: false
        description: สิ้นสุดถึงวันที่ (YYYY-MM-DD)
    responses:
      200:
        description: รายการประวัติการใช้งาน (จำกัด 500 รายการล่าสุด)
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
                  audit_id:
                    type: integer
                    example: 1
                  staff_id:
                    type: integer
                    example: 3
                  staff_name:
                    type: string
                    nullable: true
                    example: null
                  action_type:
                    type: string
                    example: CREATE
                  table_affected:
                    type: string
                    example: booking
                  record_id:
                    type: integer
                    example: 6
                  description:
                    type: string
                    example: "สร้างการจองหมายเลข 6 — ลูกค้า พชรินทร์ บุญมาก (หิมะ)"
                  timestamp:
                    type: string
                    format: date-time
                    example: "2026-04-14T10:23:00"
      500:
        description: Internal Server Error
        schema:
          type: object
          properties:
            status:
              type: string
              example: error
            message:
              type: string
              example: relation "audittrail" does not exist
    """
    try:
        staff_id    = request.args.get('staff_id')
        action_type = request.args.get('action_type')
        start_date  = request.args.get('start_date')
        end_date    = request.args.get('end_date')

        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # 1. ใช้ชื่อคอลัมน์ตามตารางจริงเป๊ะๆ และจำลอง NULL AS staff_name เพื่อให้โครงสร้างตรงกับ Frontend
        # ⚠️ หากใน Supabase ของคุณชื่อตารางไม่มีขีดล่าง ให้ลบ _ ออกเป็น audittrail
        query = """
            SELECT
                audit_id,
                staff_id,
                NULL AS staff_name,  
                action_type,
                table_affected,
                record_id,
                description,
                timestamp
            FROM audit_trail   
            WHERE 1=1
        """
        params = []

        if staff_id:
            query += " AND staff_id = %s"
            params.append(staff_id)
        if action_type:
            query += " AND action_type = %s"
            params.append(action_type.upper())
        if start_date:
            query += " AND timestamp >= %s"
            params.append(start_date + " 00:00:00")
        if end_date:
            query += " AND timestamp <= %s"
            params.append(end_date + " 23:59:59")

        query += " ORDER BY timestamp DESC LIMIT 500"

        cur.execute(query, tuple(params))
        logs = cur.fetchall()
        cur.close()
        conn.close()

        # 2. ตัวป้องกันบัค (Safe Check) สำหรับแปลงรูปแบบวันที่ (ISO 8601) ให้ Frontend
        for log in logs:
            if log.get('timestamp'):
                if hasattr(log['timestamp'], 'strftime'):
                    log['timestamp'] = log['timestamp'].strftime('%Y-%m-%dT%H:%M:%S')
                else:
                    log['timestamp'] = str(log['timestamp'])

        return jsonify({"status": "success", "data": logs}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500