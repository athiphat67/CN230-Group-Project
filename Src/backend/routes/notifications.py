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


def parse_bool(value):
    if value is None:
        return None
    return str(value).strip().lower() in ('1', 'true', 'yes', 'y')


def parse_positive_int(value, default_value):
    try:
        parsed = int(value)
        return parsed if parsed > 0 else default_value
    except (TypeError, ValueError):
        return default_value


def get_notification_columns(cur):
    cur.execute("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'notification'
    """)
    return {row['column_name'] for row in cur.fetchall()}


@notifications_bp.route('', methods=['POST'])
@token_required
def create_notification(current_user):
    try:
        payload = request.get_json(silent=True) or {}
        n_type = payload.get('type')
        title = payload.get('title')
        message = payload.get('message') or payload.get('body') or ''

        if not n_type or not title:
            return jsonify({
                "error": True,
                "code": 400,
                "message": "Bad Request",
                "detail": "Missing required fields: type, title"
            }), 400

        recipient_staff_id = payload.get('recipient_staff_id')
        if recipient_staff_id is None:
            recipient_staff_id = current_user.get('staff_id')

        related_id = payload.get('related_id')
        booking_id = payload.get('booking_id')
        if related_id is None:
            related_id = booking_id
        actor_staff_id = payload.get('actor_staff_id', current_user.get('staff_id'))
        actor_customer_id = payload.get('actor_customer_id', current_user.get('customer_id'))
        target_id = payload.get('target_id')
        metadata = payload.get('metadata')

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        notification_columns = get_notification_columns(cur)

        insert_columns = ["type", "title", "is_read", "recipient_staff_id"]
        insert_values = [n_type, title, parse_bool(payload.get('is_read')) or False, recipient_staff_id]

        if "message" in notification_columns:
            insert_columns.append("message")
            insert_values.append(message)
        if "body" in notification_columns:
            insert_columns.append("body")
            insert_values.append(message)
        if "related_id" in notification_columns:
            insert_columns.append("related_id")
            insert_values.append(related_id)
        if "booking_id" in notification_columns:
            insert_columns.append("booking_id")
            insert_values.append(booking_id)
        if "actor_staff_id" in notification_columns:
            insert_columns.append("actor_staff_id")
            insert_values.append(actor_staff_id)
        if "actor_customer_id" in notification_columns:
            insert_columns.append("actor_customer_id")
            insert_values.append(actor_customer_id)
        if "target_id" in notification_columns:
            insert_columns.append("target_id")
            insert_values.append(target_id)
        if "metadata" in notification_columns:
            insert_columns.append("metadata")
            insert_values.append(psycopg2.extras.Json(metadata) if metadata is not None else None)
        if "created_at" in notification_columns:
            insert_columns.append("created_at")
            insert_values.append("NOW()")
        if "updated_at" in notification_columns:
            insert_columns.append("updated_at")
            insert_values.append("NOW()")
        if "sent_at" in notification_columns:
            insert_columns.append("sent_at")
            insert_values.append("NOW()")

        placeholders = []
        params = []
        for value in insert_values:
            if value == "NOW()":
                placeholders.append("NOW()")
            else:
                placeholders.append("%s")
                params.append(value)

        insert_sql = f"""
            INSERT INTO notification ({", ".join(insert_columns)})
            VALUES ({", ".join(placeholders)})
            RETURNING notification_id
        """
        try:
            cur.execute(insert_sql, params)
        except psycopg2.Error as db_err:
            # รองรับกรณี sequence ของ notification_id ไม่ sync กับข้อมูลจริง
            if getattr(db_err, "pgcode", None) == "23505":
                conn.rollback()
                cur.execute("""
                    SELECT setval(
                        'public.notification_notification_id_seq',
                        COALESCE((SELECT MAX(notification_id) FROM notification), 0) + 1,
                        false
                    )
                """)
                conn.commit()
                cur.execute(insert_sql, params)
            else:
                raise

        created = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "status": "success",
            "notification_id": created["notification_id"]
        }), 201
    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500


# ── 1. ดึงการแจ้งเตือน ─────────────────────────────────────────────────
@notifications_bp.route('', methods=['GET'])
@token_required
def get_notifications(current_user):
    """
    ดึงรายการการแจ้งเตือนของ Staff
    ---
    tags:
      - Notifications
    security:
      - BearerAuth: []
    parameters:
      - name: is_read
        in: query
        type: string
        required: false
        description: กรองสถานะการอ่าน (true หรือ false) หากไม่ระบุจะแสดงทั้งหมด
        example: "false"
    responses:
      200:
        description: รายการการแจ้งเตือน (จำกัด 100 รายการล่าสุด)
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
                  notification_id:
                    type: integer
                  type:
                    type: string
                  title:
                    type: string
                  body:
                    type: string
                  booking_id:
                    type: integer
                  is_read:
                    type: boolean
                  sent_at:
                    type: string
                    format: date-time
                  recipient_staff_id:
                    type: integer
      500:
        description: Internal Server Error
    """
    try:
        staff_id = current_user.get('staff_id')
        status = request.args.get('status', '').strip().lower()
        # รองรับของเดิม: ?is_read=true/false
        is_read_legacy = parse_bool(request.args.get('is_read'))
        if status in ('read', 'unread'):
            is_read_filter = (status == 'read')
        else:
            is_read_filter = is_read_legacy

        type_filter = request.args.get('type')
        page = parse_positive_int(request.args.get('page'), 1)
        page_size = min(parse_positive_int(request.args.get('page_size'), 10), 100)
        offset = (page - 1) * page_size

        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        notification_columns = get_notification_columns(cur)

        message_expr = "message" if "message" in notification_columns else "body"
        related_expr = "related_id" if "related_id" in notification_columns else "booking_id"
        created_expr = "created_at" if "created_at" in notification_columns else "sent_at"
        updated_expr = "updated_at" if "updated_at" in notification_columns else "sent_at"
        actor_staff_expr = "actor_staff_id" if "actor_staff_id" in notification_columns else "NULL::integer"
        actor_customer_expr = "actor_customer_id" if "actor_customer_id" in notification_columns else "NULL::integer"
        target_expr = "target_id" if "target_id" in notification_columns else "NULL::integer"
        metadata_expr = "metadata" if "metadata" in notification_columns else "NULL::jsonb"

        where_clauses = ["(recipient_staff_id = %s OR recipient_staff_id IS NULL)"]
        params = [staff_id]

        if is_read_filter is not None:
            where_clauses.append("is_read = %s")
            params.append(is_read_filter)

        if type_filter:
            where_clauses.append("type = %s")
            params.append(type_filter)

        where_sql = " AND ".join(where_clauses)

        query = f"""
            SELECT
                notification_id,
                notification_id AS id,
                type,
                title,
                COALESCE({message_expr}, body, '') AS message,
                COALESCE({message_expr}, body, '') AS body,
                COALESCE({related_expr}, booking_id) AS related_id,
                COALESCE({related_expr}, booking_id) AS booking_id,
                is_read,
                {actor_staff_expr} AS actor_staff_id,
                {actor_customer_expr} AS actor_customer_id,
                {target_expr} AS target_id,
                {metadata_expr} AS metadata,
                COALESCE({created_expr}, sent_at) AS created_at,
                COALESCE({created_expr}, sent_at) AS sent_at,
                COALESCE({updated_expr}, sent_at) AS updated_at,
                recipient_staff_id
            FROM notification
            WHERE {where_sql}
            ORDER BY COALESCE({created_expr}, sent_at) DESC
            LIMIT %s OFFSET %s
        """
        cur.execute(query, params + [page_size, offset])
        rows = cur.fetchall()

        count_query = f"""
            SELECT COUNT(*) AS total
            FROM notification
            WHERE {where_sql}
        """
        cur.execute(count_query, params)
        total = cur.fetchone()['total']

        unread_query = """
            SELECT COUNT(*) AS unread_count
            FROM notification
            WHERE (recipient_staff_id = %s OR recipient_staff_id IS NULL) AND is_read = FALSE
        """
        cur.execute(unread_query, (staff_id,))
        unread_count = cur.fetchone()['unread_count']

        for n in rows:
            if n.get('created_at'):
                n['created_at'] = n['created_at'].isoformat()
            if n.get('sent_at'):
                n['sent_at'] = n['sent_at'].isoformat()
            if n.get('updated_at'):
                n['updated_at'] = n['updated_at'].isoformat()

        cur.close()
        conn.close()

        return jsonify({
            "status": "success",
            "data": rows,
            "meta": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": max((total + page_size - 1) // page_size, 1),
                "unread_count": unread_count,
                "filters": {
                    "status": status or 'all',
                    "type": type_filter or 'all'
                }
            }
        }), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500


# ── 2. Mark All as Read ────────────────────────────────────────────────
#  ⚠️ ต้องวางก่อน /<int:notification_id>/read เพื่อป้องกัน Flask routing conflict
@notifications_bp.route('/read-all', methods=['PATCH'])
@token_required
def mark_all_read(current_user):
    """
    ทำเครื่องหมายว่าอ่านการแจ้งเตือนทั้งหมดแล้ว
    ---
    tags:
      - Notifications
    security:
      - BearerAuth: []
    responses:
      200:
        description: อัปเดตสถานะสำเร็จ
        schema:
          type: object
          properties:
            status:
              type: string
              example: success
            message:
              type: string
              example: ทำเครื่องหมายอ่านทั้งหมดแล้ว
      500:
        description: Internal Server Error
    """
    try:
        staff_id = current_user.get('staff_id')
        payload = request.get_json(silent=True) or {}
        target_is_read = parse_bool(payload.get('is_read'))
        if target_is_read is None:
            target_is_read = True

        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        notification_columns = get_notification_columns(cur)
        set_updated_at_sql = ", updated_at = NOW()" if "updated_at" in notification_columns else ""

        cur.execute(f"""
            UPDATE notification
            SET is_read = %s
                {set_updated_at_sql}
            WHERE (recipient_staff_id = %s OR recipient_staff_id IS NULL)
              AND is_read != %s
        """, (target_is_read, staff_id, target_is_read))
        updated_rows = cur.rowcount
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "status": "success",
            "message": "ทำเครื่องหมายอ่านทั้งหมดแล้ว" if target_is_read else "ทำเครื่องหมายยังไม่อ่านทั้งหมดแล้ว",
            "updated": updated_rows,
            "is_read": target_is_read
        }), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500


# ── 3. Mark Single Notification as Read ───────────────────────────────
@notifications_bp.route('/<int:notification_id>/read', methods=['PATCH'])
@token_required
def mark_read(current_user, notification_id):
    """
    ทำเครื่องหมายว่าอ่านการแจ้งเตือนแล้ว (รายตัว)
    ---
    tags:
      - Notifications
    security:
      - BearerAuth: []
    parameters:
      - name: notification_id
        in: path
        type: integer
        required: true
        description: ID ของการแจ้งเตือนที่ต้องการอัปเดตสถานะ
    responses:
      200:
        description: อัปเดตสถานะสำเร็จ
        schema:
          type: object
          properties:
            notification_id:
              type: integer
            is_read:
              type: boolean
              example: true
      404:
        description: ไม่พบการแจ้งเตือน
      500:
        description: Internal Server Error
    """
    try:
        staff_id = current_user.get('staff_id')
        payload = request.get_json(silent=True) or {}
        target_is_read = parse_bool(payload.get('is_read'))
        if target_is_read is None:
            target_is_read = True

        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        notification_columns = get_notification_columns(cur)
        set_updated_at_sql = ", updated_at = NOW()" if "updated_at" in notification_columns else ""
        cur.execute(f"""
            UPDATE notification
            SET is_read = %s
                {set_updated_at_sql}
            WHERE notification_id = %s
              AND (recipient_staff_id = %s OR recipient_staff_id IS NULL)
            RETURNING notification_id, is_read
        """, (target_is_read, notification_id, staff_id))
        updated = cur.fetchone()
        if cur.rowcount == 0:
            conn.rollback()
            return jsonify({"error": True, "code": 404, "message": "ไม่พบการแจ้งเตือน"}), 404

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "notification_id": updated['notification_id'],
            "is_read": updated['is_read']
        }), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500


@notifications_bp.route('/<int:notification_id>/unread', methods=['PATCH'])
@token_required
def mark_unread(current_user, notification_id):
    try:
        staff_id = current_user.get('staff_id')
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        notification_columns = get_notification_columns(cur)
        set_updated_at_sql = ", updated_at = NOW()" if "updated_at" in notification_columns else ""
        cur.execute(f"""
            UPDATE notification
            SET is_read = FALSE
                {set_updated_at_sql}
            WHERE notification_id = %s
              AND (recipient_staff_id = %s OR recipient_staff_id IS NULL)
            RETURNING notification_id, is_read
        """, (notification_id, staff_id))
        updated = cur.fetchone()
        if cur.rowcount == 0:
            conn.rollback()
            return jsonify({"error": True, "code": 404, "message": "ไม่พบการแจ้งเตือน"}), 404

        conn.commit()
        cur.close()
        conn.close()
        return jsonify({
            "notification_id": updated['notification_id'],
            "is_read": updated['is_read']
        }), 200
    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500