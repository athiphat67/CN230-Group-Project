from flask import Blueprint, request, jsonify, current_app
import psycopg2
import psycopg2.extras
from datetime import datetime, timedelta

attendance_bp = Blueprint('attendance', __name__)

def get_db_connection():
    return psycopg2.connect(current_app.config['SQLALCHEMY_DATABASE_URI'])

def get_thai_time():
    # บังคับใช้เวลาไทย (UTC+7) สำหรับการบันทึก Log และเทียบเวลาเสมอ
    return datetime.utcnow() + timedelta(hours=7)

# --- 1. Clock IN / OUT (ลงเวลาเข้า-ออกงาน) ---
@attendance_bp.route('/clock', methods=['POST'])
def clock_in_out():
    try:
        data = request.get_json()
        staff_id = data.get('staff_id')
        action = data.get('action') # รับค่า 'IN' หรือ 'OUT'
        note = data.get('note', '')

        now = get_thai_time()
        today_date = now.date()
        current_time = now.time()

        conn = get_db_connection()
        cur = conn.cursor()

        if action == 'IN':
            # ตรวจสอบว่าวันนี้กด Clock IN ไปหรือยัง
            cur.execute("SELECT attendanceid FROM attendance WHERE staffid = %s AND workdate = %s", (staff_id, today_date))
            if cur.fetchone():
                return jsonify({"status": "error", "message": "วันนี้คุณได้ลงเวลาเข้างานไปแล้ว"}), 400

            # ลอจิกเช็กสาย (สมมติเข้างานหลัง 09:05 ถือว่า Late)
            status = 'Late' if current_time.hour >= 9 and current_time.minute > 5 else 'On Time'

            query = """
                INSERT INTO attendance (staffid, workdate, clockin, status, note)
                VALUES (%s, %s, %s, %s, %s) 
                RETURNING attendanceid;
            """
            cur.execute(query, (staff_id, today_date, current_time, status, note))
            
            # อัปเดตสถานะให้กำลังเข้าเวร (Online) ในตารางพนักงาน
            cur.execute("UPDATE staff SET isonduty = TRUE WHERE staffid = %s", (staff_id,))

        elif action == 'OUT':
            query = """
                UPDATE attendance 
                SET clockout = %s, note = CASE WHEN %s != '' THEN %s ELSE note END
                WHERE staffid = %s AND workdate = %s AND clockout IS NULL
                RETURNING attendanceid;
            """
            cur.execute(query, (current_time, note, note, staff_id, today_date))
            
            if cur.rowcount == 0:
                return jsonify({"status": "error", "message": "ไม่พบข้อมูลเวลาเข้างาน หรือคุณลงเวลาออกไปแล้ว"}), 400
            
            # อัปเดตสถานะให้ออกเวร (Offline)
            cur.execute("UPDATE staff SET isonduty = FALSE WHERE staffid = %s", (staff_id,))

        else:
            return jsonify({"status": "error", "message": "Action ต้องเป็น 'IN' หรือ 'OUT'"}), 400

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"status": "success", "message": f"บันทึกเวลา {action} สำเร็จ", "time": current_time.strftime('%H:%M:%S')}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# --- 2. Get Attendance Logs (ดึงข้อมูลแสดงในตาราง) ---
@attendance_bp.route('', methods=['GET'])
def get_attendance():
    try:
        # รับ Parameter กรองวันที่จากหน้าเว็บ
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        # ถ้าไม่ได้ส่งมา ให้ดึงข้อมูลของวันปัจจุบัน
        if not start_date or not end_date:
            today = get_thai_time().strftime('%Y-%m-%d')
            start_date, end_date = today, today

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        query = """
            SELECT 
                a.attendanceid,
                a.staffid AS staff_id,
                s.firstname AS first_name,
                s.lastname AS last_name,
                a.workdate AS work_date,
                a.clockin AS clock_in,
                a.clockout AS clock_out,
                a.status,
                a.note
            FROM attendance a
            JOIN staff s ON a.staffid = s.staffid
            WHERE a.workdate >= %s AND a.workdate <= %s
            ORDER BY a.workdate DESC, a.clockin DESC
        """
        cur.execute(query, (start_date, end_date))
        records = cur.fetchall()
        cur.close()
        conn.close()

        # แปลง Type ข้อมูล Date/Time ให้เป็น String ก่อนส่งกลับไปเป็น JSON
        for r in records:
            r['work_date'] = r['work_date'].strftime('%Y-%m-%d') if r['work_date'] else None
            r['clock_in'] = r['clock_in'].strftime('%H:%M') if r['clock_in'] else None
            r['clock_out'] = r['clock_out'].strftime('%H:%M') if r['clock_out'] else None

        return jsonify({"status": "success", "data": records}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500