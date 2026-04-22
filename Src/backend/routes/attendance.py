"""
attendance.py — FR1.4, FR1.7, FR1.8 Attendance
POST /api/attendance/clock    Clock-In / Clock-Out
GET  /api/attendance          ดูบันทึกเวลา

⚠️ แก้ไขจากเดิม:
  - รับ action ทั้ง "IN"/"OUT" (เดิม) และ "CLOCK_IN"/"CLOCK_OUT" (ที่ Frontend ส่งมา)
  - GET รองรับ ?staff_id= filter
"""
from flask import Blueprint, request, jsonify, current_app
import psycopg2
import psycopg2.extras
from datetime import datetime, timedelta

attendance_bp = Blueprint('attendance', __name__)

def get_db_connection():
    return psycopg2.connect(current_app.config['SQLALCHEMY_DATABASE_URI'])

def get_thai_time():
    return datetime.utcnow() + timedelta(hours=7)

def normalize_action(raw: str) -> str:
    """รับได้ทั้ง 'IN'/'OUT' และ 'CLOCK_IN'/'CLOCK_OUT' → คืนค่า 'IN' หรือ 'OUT'"""
    raw = (raw or '').upper().strip()
    if raw in ('IN', 'CLOCK_IN'):
        return 'IN'
    if raw in ('OUT', 'CLOCK_OUT'):
        return 'OUT'
    return raw   # ส่งคืนตามเดิม (จะ return error ภายหลัง)


# ── 1. Clock IN / OUT ─────────────────────────────────────────────────
@attendance_bp.route('/clock', methods=['POST'])
def clock_in_out():
    """
    บันทึกเวลาเข้า-ออกงาน (Clock-In / Clock-Out)
    ---
    tags:
      - Attendance
    security:
      - BearerAuth: []
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - staff_id
            - action
          properties:
            staff_id:
              type: integer
              description: ID ของพนักงาน
              example: 1
            action:
              type: string
              description: ประเภทการลงเวลา (IN, OUT, CLOCK_IN, CLOCK_OUT)
              example: "CLOCK_IN"
            note:
              type: string
              description: หมายเหตุเพิ่มเติม (ถ้ามี)
              example: "มาสายเพราะรถติดหนักมาก"
    responses:
      200:
        description: บันทึกเวลาสำเร็จ
        schema:
          type: object
          properties:
            status:
              type: string
              example: success
            message:
              type: string
            attendance_id:
              type: integer
            staff_id:
              type: integer
            action:
              type: string
            timestamp:
              type: string
              format: date-time
      400:
        description: ลงเวลาเข้า/ออกซ้ำ หรือ Action ไม่ถูกต้อง
      500:
        description: Internal Server Error
    """
    try:
        data     = request.get_json()
        staff_id = data.get('staff_id')
        action   = normalize_action(data.get('action', ''))
        note     = data.get('note', '')

        now          = get_thai_time()
        today_date   = now.date()
        current_time = now.time()

        conn = get_db_connection()
        cur  = conn.cursor()

        if action == 'IN':
            cur.execute(
                "SELECT attendanceid FROM attendance WHERE staffid = %s AND workdate = %s",
                (staff_id, today_date)
            )
            if cur.fetchone():
                cur.close()
                conn.close()
                return jsonify({"status": "error", "message": "วันนี้คุณได้ลงเวลาเข้างานไปแล้ว"}), 400

            status = 'Late' if (current_time.hour > 9 or (current_time.hour == 9 and current_time.minute > 5)) else 'On Time'

            cur.execute("""
                INSERT INTO attendance (staffid, workdate, clockin, status, note)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING attendanceid;
            """, (staff_id, today_date, current_time, status, note))
            attendance_id = cur.fetchone()[0]

            cur.execute("UPDATE staff SET isonduty = TRUE WHERE staffid = %s", (staff_id,))

        elif action == 'OUT':
            cur.execute("""
                UPDATE attendance
                SET clockout = %s,
                    note     = CASE WHEN %s != '' THEN %s ELSE note END
                WHERE staffid = %s AND workdate = %s AND clockout IS NULL
                RETURNING attendanceid;
            """, (current_time, note, note, staff_id, today_date))

            if cur.rowcount == 0:
                cur.close()
                conn.close()
                return jsonify({"status": "error", "message": "ไม่พบข้อมูลเวลาเข้างาน หรือคุณลงเวลาออกไปแล้ว"}), 400

            attendance_id = cur.fetchone()[0]
            cur.execute("UPDATE staff SET isonduty = FALSE WHERE staffid = %s", (staff_id,))

        else:
            cur.close()
            conn.close()
            return jsonify({"status": "error", "message": "action ต้องเป็น CLOCK_IN หรือ CLOCK_OUT"}), 400

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "status":        "success",
            "message":       f"บันทึกเวลา {action} สำเร็จ",
            "attendance_id": attendance_id,
            "staff_id":      staff_id,
            "action":        "CLOCK_IN" if action == 'IN' else "CLOCK_OUT",
            "timestamp":     now.isoformat(),
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ── 2. Get Attendance Records ─────────────────────────────────────────
@attendance_bp.route('', methods=['GET'])
def get_attendance():
    """
    ดึงประวัติการลงเวลาเข้า-ออกงาน
    ---
    tags:
      - Attendance
    security:
      - BearerAuth: []
    parameters:
      - name: start_date
        in: query
        type: string
        format: date
        required: false
        description: วันที่เริ่มต้น (YYYY-MM-DD) หากไม่ระบุจะดึงข้อมูลของวันนี้
      - name: end_date
        in: query
        type: string
        format: date
        required: false
        description: วันที่สิ้นสุด (YYYY-MM-DD) หากไม่ระบุจะดึงข้อมูลของวันนี้
      - name: staff_id
        in: query
        type: integer
        required: false
        description: กรองตาม ID ของพนักงาน
    responses:
      200:
        description: รายการข้อมูลประวัติการลงเวลา
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
                  attendanceid:
                    type: integer
                  staff_id:
                    type: integer
                  first_name:
                    type: string
                  last_name:
                    type: string
                  work_date:
                    type: string
                    format: date
                  clock_in:
                    type: string
                    example: "08:55"
                  clock_out:
                    type: string
                    example: "17:30"
                  status:
                    type: string
                    example: "On Time"
                  remark:
                    type: string
      500:
        description: Internal Server Error
    """
    try:
        start_date = request.args.get('start_date')
        end_date   = request.args.get('end_date')
        staff_id   = request.args.get('staff_id')   # ← NEW filter

        if not start_date or not end_date:
            today      = get_thai_time().strftime('%Y-%m-%d')
            start_date = today
            end_date   = today

        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        query = """
            SELECT
                a.attendanceid,
                a.staffid      AS staff_id,
                s.firstname    AS first_name,
                s.lastname     AS last_name,
                a.workdate     AS work_date,
                a.clockin      AS clock_in,
                a.clockout     AS clock_out,
                a.status,
                a.note         AS remark
            FROM attendance a
            JOIN staff s ON a.staffid = s.staffid
            WHERE a.workdate >= %s AND a.workdate <= %s
        """
        params = [start_date, end_date]

        if staff_id:
            query += " AND a.staffid = %s"
            params.append(staff_id)

        query += " ORDER BY a.workdate DESC, a.clockin DESC"

        cur.execute(query, params)
        records = cur.fetchall()
        cur.close()
        conn.close()

        for r in records:
            r['work_date'] = r['work_date'].strftime('%Y-%m-%d')   if r['work_date'] else None
            r['clock_in']  = r['clock_in'].strftime('%H:%M')       if r['clock_in']  else None
            r['clock_out'] = r['clock_out'].strftime('%H:%M')      if r['clock_out'] else None

        return jsonify({"status": "success", "data": records}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500