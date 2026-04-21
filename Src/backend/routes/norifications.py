"""
notifications.py — FR7 Notification Management
GET    /api/notifications             ดึงการแจ้งเตือนของ staff คนนั้น
PATCH  /api/notifications/{id}/read  อ่านแล้ว
PATCH  /api/notifications/read-all   อ่านทั้งหมด

ใช้ตาราง notification ที่มีอยู่ใน Supabase แล้ว
(ดู supabase_notifications.sql สำหรับ mock data)
"""
from flask import Blueprint, request, jsonify, current_app
import psycopg2
import psycopg2.extras
from utils import token_required

notifications_bp = Blueprint('notifications', __name__)

def get_db_connection():
    return psycopg2.connect(current_app.config['SQLALCHEMY_DATABASE_URI'])


# ── 1. ดึงการแจ้งเตือน ─────────────────────────────────────────────────
@notifications_bp.route('', methods=['GET'])
@token_required
def get_notifications(current_user):
    try:
        staff_id = current_user.get('staff_id')
        is_read  = request.args.get('is_read')   # "true" | "false" | ไม่ส่ง = ดูทั้งหมด

        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        query  = """
            SELECT notification_id, type, title, body, booking_id, is_read, sent_at, recipient_staff_id
            FROM notification
            WHERE (recipient_staff_id = %s OR recipient_staff_id IS NULL)
        """
        params = [staff_id]

        if is_read is not None:
            query += " AND is_read = %s"
            params.append(is_read.lower() == 'true')

        query += " ORDER BY sent_at DESC LIMIT 100"

        cur.execute(query, params)
        rows = cur.fetchall()
        cur.close()
        conn.close()

        for n in rows:
            if n['sent_at']:
                n['sent_at'] = n['sent_at'].isoformat()

        return jsonify({"status": "success", "data": rows}), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500


# ── 2. Mark All as Read ────────────────────────────────────────────────
#  ⚠️ ต้องวางก่อน /<int:notification_id>/read เพื่อป้องกัน Flask routing conflict
@notifications_bp.route('/read-all', methods=['PATCH'])
@token_required
def mark_all_read(current_user):
    try:
        staff_id = current_user.get('staff_id')

        conn = get_db_connection()
        cur  = conn.cursor()
        cur.execute("""
            UPDATE notification SET is_read = TRUE
            WHERE (recipient_staff_id = %s OR recipient_staff_id IS NULL)
              AND is_read = FALSE
        """, (staff_id,))
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"status": "success", "message": "ทำเครื่องหมายอ่านทั้งหมดแล้ว"}), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500


# ── 3. Mark Single Notification as Read ───────────────────────────────
@notifications_bp.route('/<int:notification_id>/read', methods=['PATCH'])
@token_required
def mark_read(current_user, notification_id):
    try:
        conn = get_db_connection()
        cur  = conn.cursor()
        cur.execute(
            "UPDATE notification SET is_read = TRUE WHERE notification_id = %s RETURNING notification_id",
            (notification_id,)
        )
        if cur.rowcount == 0:
            conn.rollback()
            return jsonify({"error": True, "code": 404, "message": "ไม่พบการแจ้งเตือน"}), 404

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"notification_id": notification_id, "is_read": True}), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500