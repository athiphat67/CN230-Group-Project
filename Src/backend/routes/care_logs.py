"""
care_logs.py — FR4 Pet Care & Daily Monitoring
(Blueprint ยังชื่อ care_logs_bp แต่ register ที่ /api/care-reports ใน app.py)

POST /api/care-reports                       บันทึก Daily Care Report
GET  /api/care-reports                       ดูรายงานทั้งหมด (?booking_id=1&date=2025-04-03)
POST /api/care-reports/{report_id}/photos    upload รูป (stub — ต้องต่อ Storage เอง)

⚠️ แก้ไขจากเดิม:
  - URL เปลี่ยนเป็น /api/care-reports (แก้ที่ app.py)
  - POST รับ booking_id + pet_id แล้ว resolve เป็น bookingdetailid อัตโนมัติ
  - GET รับ ?booking_id= แทน booking_detail_id
"""
from flask import Blueprint, request, jsonify, current_app
import psycopg2
import psycopg2.extras
from utils import token_required

care_logs_bp = Blueprint('care_logs', __name__)

def get_db_connection():
    return psycopg2.connect(current_app.config['SQLALCHEMY_DATABASE_URI'])


# ── 1. บันทึก Daily Care Report (POST /api/care-reports) ──────────────
@care_logs_bp.route('', methods=['POST'])
@token_required
def add_care_log(current_user):
    try:
        data     = request.get_json()
        staff_id = current_user.get('staff_id')

        # Frontend ส่ง booking_id + pet_id → resolve เป็น bookingdetailid
        booking_id = data.get('booking_id')
        pet_id     = data.get('pet_id')

        # ถ้าส่ง booking_detail_id มาตรงๆ ก็ใช้ได้เลย
        booking_detail_id = data.get('booking_detail_id')

        if not booking_detail_id:
            if not booking_id:
                return jsonify({"error": True, "message": "ต้องระบุ booking_id หรือ booking_detail_id"}), 400

            conn = get_db_connection()
            cur  = conn.cursor()

            if pet_id:
                cur.execute("""
                    SELECT bookingdetailid FROM bookingdetail
                    WHERE bookingid = %s AND petid = %s LIMIT 1
                """, (booking_id, pet_id))
            else:
                cur.execute("""
                    SELECT bookingdetailid FROM bookingdetail
                    WHERE bookingid = %s LIMIT 1
                """, (booking_id,))

            row = cur.fetchone()
            cur.close()
            conn.close()

            if not row:
                return jsonify({"error": True, "code": 404, "message": "ไม่พบ bookingdetail สำหรับการจองนี้"}), 404

            booking_detail_id = row[0]

        conn = get_db_connection()
        cur  = conn.cursor()
        cur.execute("""
            INSERT INTO carelog
                (bookingdetailid, foodstatus, pottystatus, medicationgiven,
                 staffnote, photourl, loggedby_staffid, mood, behavior_notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING logid;
        """, (
            booking_detail_id,
            data.get('food_status') or data.get('food_intake'),
            data.get('potty_status') or data.get('bowel_activity'),
            data.get('medication_given', False),
            data.get('staff_note') or data.get('behavior_notes'),
            data.get('photo_url'),
            staff_id,
            data.get('mood'),
            data.get('behavior_notes'),
        ))
        new_log_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()

        # TODO: FR4.2 — trigger notification ไปหาเจ้าของสัตว์เลี้ยง

        return jsonify({
            "status":  "success",
            "message": "บันทึกรายงานการดูแลสำเร็จ",
            "log_id":  new_log_id,
        }), 201

    except Exception as e:
        return jsonify({"error": True, "code": 500, "message": str(e)}), 500


# ── 2. ดึงรายงาน (GET /api/care-reports?booking_id=&date=) ───────────
@care_logs_bp.route('', methods=['GET'])
@token_required
def get_care_logs(current_user):
    try:
        booking_id = request.args.get('booking_id')
        date_str   = request.args.get('date')

        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        query = """
            SELECT
                c.logid                             AS report_id,
                bd.bookingid                        AS booking_id,
                p.petid                             AS pet_id,
                p.name                              AS pet_name,
                c.logdate                           AS report_date,
                c.foodstatus                        AS food_intake,
                c.pottystatus                       AS bowel_activity,
                c.mood,
                c.behavior_notes,
                c.photourl                          AS photo_url,
                c.medicationgiven                   AS medication_given,
                c.staffnote                         AS staff_note,
                c.loggedby_staffid                  AS reported_by,
                s.firstname || ' ' || s.lastname    AS caretaker_name
            FROM carelog c
            JOIN bookingdetail bd ON c.bookingdetailid = bd.bookingdetailid
            JOIN pet           p  ON bd.petid          = p.petid
            LEFT JOIN staff    s  ON c.loggedby_staffid = s.staffid
            WHERE 1=1
        """
        params = []

        if booking_id:
            query += " AND bd.bookingid = %s"
            params.append(booking_id)
        if date_str:
            query += " AND c.logdate::date = %s"
            params.append(date_str)

        query += " ORDER BY c.logdate DESC"

        cur.execute(query, params)
        logs = cur.fetchall()
        cur.close()
        conn.close()

        for log in logs:
            if log['report_date']:
                log['report_date'] = log['report_date'].isoformat()

        return jsonify({"status": "success", "data": logs}), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500


# ── 3. Upload รูป (POST /api/care-reports/{id}/photos) ── STUB ─────────
@care_logs_bp.route('/<int:report_id>/photos', methods=['POST'])
@token_required
def upload_photos(current_user, report_id):
    """
    TODO: ต่อ Supabase Storage หรือ S3 เพื่ออัปโหลดรูปจริง
    ปัจจุบัน: รับ URL จาก body แล้วอัปเดต carelog.photourl
    """
    try:
        data      = request.get_json()
        photo_url = data.get('photo_url')   # ให้ Frontend upload ไป Storage แล้วส่ง URL มา

        if not photo_url:
            return jsonify({"error": True, "message": "ต้องระบุ photo_url"}), 400

        conn = get_db_connection()
        cur  = conn.cursor()
        cur.execute("UPDATE carelog SET photourl = %s WHERE logid = %s", (photo_url, report_id))

        if cur.rowcount == 0:
            return jsonify({"error": True, "code": 404, "message": "ไม่พบรายงาน"}), 404

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "report_id":  report_id,
            "photo_urls": [photo_url],
        }), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500