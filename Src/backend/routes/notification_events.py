from __future__ import annotations

import json
import psycopg2.extras


def _get_notification_columns(cur):
    cur.execute("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'notification'
    """)
    return {row['column_name'] for row in cur.fetchall()}


def _json_or_none(metadata):
    if metadata is None:
        return None
    return json.dumps(metadata, ensure_ascii=False)


def emit_notification(
    conn,
    *,
    notif_type,
    title,
    message,
    recipient_staff_id=None,
    related_id=None,
    booking_id=None,
    actor_staff_id=None,
    actor_customer_id=None,
    target_id=None,
    metadata=None,
):
    """
    Insert notification in a schema-compatible way.
    Works with both legacy and extended notification table layouts.
    """
    if not title:
        return None

    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    columns = _get_notification_columns(cur)

    insert_columns = ["type", "title", "is_read"]
    insert_values = [notif_type, title, False]

    if "recipient_staff_id" in columns:
        insert_columns.append("recipient_staff_id")
        insert_values.append(recipient_staff_id)
    if "message" in columns:
        insert_columns.append("message")
        insert_values.append(message)
    if "body" in columns:
        insert_columns.append("body")
        insert_values.append(message)
    if "related_id" in columns:
        insert_columns.append("related_id")
        insert_values.append(related_id)
    if "booking_id" in columns:
        insert_columns.append("booking_id")
        insert_values.append(booking_id)
    if "actor_staff_id" in columns:
        insert_columns.append("actor_staff_id")
        insert_values.append(actor_staff_id)
    if "actor_customer_id" in columns:
        insert_columns.append("actor_customer_id")
        insert_values.append(actor_customer_id)
    if "target_id" in columns:
        insert_columns.append("target_id")
        insert_values.append(target_id)
    if "metadata" in columns:
        insert_columns.append("metadata")
        insert_values.append(_json_or_none(metadata))

    sql_values = []
    params = []
    for value in insert_values:
        sql_values.append("%s")
        params.append(value)

    if "created_at" in columns:
        insert_columns.append("created_at")
        sql_values.append("NOW()")
    if "updated_at" in columns:
        insert_columns.append("updated_at")
        sql_values.append("NOW()")
    if "sent_at" in columns:
        insert_columns.append("sent_at")
        sql_values.append("NOW()")

    cur.execute(
        f"""
        INSERT INTO notification ({", ".join(insert_columns)})
        VALUES ({", ".join(sql_values)})
        RETURNING notification_id
        """,
        params
    )
    created = cur.fetchone()
    cur.close()
    return created["notification_id"] if created else None
