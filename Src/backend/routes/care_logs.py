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
from datetime import datetime, timezone, timedelta

care_logs_bp = Blueprint('care_logs', __name__)

def get_db_connection():
    return psycopg2.connect(current_app.config['SQLALCHEMY_DATABASE_URI'])

# แก้ไขใน care_logs.py
@care_logs_bp.route('', methods=['POST'])
@token_required
def add_care_log(current_user):
    try:
        data = request.get_json()
        staff_id = current_user.get('staff_id')
        
        # 1. ดึงข้อมูลที่ส่งมาจาก Frontend
        booking_id = data.get('booking_id')
        pet_id     = data.get('pet_id')

        # 2. ค้นหา bookingdetailid จากตาราง bookingdetail
        conn = get_db_connection()
        cur  = conn.cursor()
        cur.execute("""
            SELECT bookingdetailid FROM bookingdetail 
            WHERE bookingid = %s AND petid = %s 
            LIMIT 1
        """, (booking_id, pet_id))
        
        result = cur.fetchone()
        if not result:
            return jsonify({"error": True, "message": "ไม่พบข้อมูลการจองสำหรับสัตว์เลี้ยงตัวนี้"}), 404
        
        booking_detail_id = result[0] # ได้ ID มาใช้งานแล้ว

        # 3. นำ booking_detail_id ที่หาได้ไป Insert ลง carelog
        cur.execute("""
            INSERT INTO carelog
                (bookingdetailid, foodstatus, pottystatus, medicationgiven,
                 staffnote, loggedby_staffid, mood, behavior_notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING logid;   # <--- ต้องเติมบรรทัดนี้
        """, (
            booking_detail_id,
            data.get('food_status'),
            data.get('potty_status'),
            data.get('medication_given', False),
            data.get('staff_note'),
            staff_id,
            data.get('mood'),
            data.get('behavior_notes')
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
                p.species                           AS species,        -- เพิ่มเพื่อส่งไปทำ Emoji
                COALESCE(r.roomnumber, 'N/A')       AS room,           -- JOIN ห้องพักมาแสดง
                c.logdate                           AS report_date,
                c.foodstatus                        AS food_intake,
                c.pottystatus                       AS bowel_activity,
                c.mood                              AS mood,
                c.behavior_notes                    AS behavior_notes,
                c.photourl                          AS photo_url,
                c.medicationgiven                   AS medication_given,
                c.staffnote                         AS notes,          -- เปลี่ยนจาก staff_note เป็น notes
                COALESCE(s.firstname || ' ' || s.lastname, 'Unknown') AS reported_by -- รวมชื่อส่งไปเลย
            FROM carelog c
            JOIN bookingdetail bd ON c.bookingdetailid = bd.bookingdetailid
            JOIN pet           p  ON bd.petid          = p.petid
            LEFT JOIN room     r  ON bd.roomid         = r.roomid
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
    
# เพิ่มโค้ดนี้ต่อจากฟังก์ชันเดิมใน care_logs.py
# ── 4. ดึงรายชื่อสัตว์เลี้ยงที่เข้าพักอยู่ (GET /api/care-reports/active-stays) ─────────
@care_logs_bp.route('/active-stays', methods=['GET'])
@token_required
def get_active_stays(current_user):
    try:
        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        cur.execute("""
            SELECT 
                b.bookingid AS booking_id,
                bd.petid AS pet_id,
                p.name AS pet_name,
                p.species AS species,
                p.breed AS breed,
                r.roomnumber AS room,
                b.checkindate AS checkin,
                b.checkoutdate AS checkout,
                EXISTS (
                    SELECT 1 FROM carelog c 
                    WHERE c.bookingdetailid = bd.bookingdetailid 
                    AND (c.logdate AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Bangkok')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Bangkok')::date
                ) AS reported_today
            FROM booking b
            JOIN bookingdetail bd ON b.bookingid = bd.bookingid
            JOIN pet p ON bd.petid = p.petid
            LEFT JOIN room r ON bd.roomid = r.roomid
            WHERE (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Bangkok')::date >= b.checkindate 
              AND (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Bangkok')::date <= b.checkoutdate
        """)
        
        stays = cur.fetchall()
        cur.close()
        conn.close()

        for s in stays:
            if s['checkin']: s['checkin'] = s['checkin'].strftime('%Y-%m-%d')
            if s['checkout']: s['checkout'] = s['checkout'].strftime('%Y-%m-%d')

        return jsonify({"status": "success", "data": stays}), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500