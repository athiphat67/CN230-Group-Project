"""
analytics.py — FR6 Analytics Dashboard
GET /api/analytics/dashboard  (ADMIN/OWNER เท่านั้น)
ดึงข้อมูลเชิงสรุปจากตารางที่มีอยู่แล้ว ไม่ต้องสร้างตารางใหม่
"""
from flask import Blueprint, request, jsonify, current_app
import psycopg2
import psycopg2.extras
from datetime import datetime, timedelta
from utils import token_required, admin_required

analytics_bp = Blueprint('analytics', __name__)

def get_db_connection():
    return psycopg2.connect(current_app.config['SQLALCHEMY_DATABASE_URI'])

def get_thai_time():
    return datetime.utcnow() + timedelta(hours=7)


@analytics_bp.route('/dashboard', methods=['GET'])
@token_required
@admin_required
def get_dashboard(current_user):
    try:
        today = get_thai_time()
        start_date = request.args.get('start_date', today.replace(day=1).strftime('%Y-%m-%d'))
        end_date   = request.args.get('end_date',   today.strftime('%Y-%m-%d'))

        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # ── 1. สรุป Booking + Revenue ──────────────────────────────────
        cur.execute("""
            SELECT
                COUNT(b.bookingid)                                                         AS total_bookings,
                COUNT(CASE WHEN b.status = 'ACTIVE'    THEN 1 END)                        AS checked_in,
                COUNT(CASE WHEN b.status = 'COMPLETED' THEN 1 END)                        AS checked_out,
                COUNT(CASE WHEN b.status = 'CANCELLED' THEN 1 END)                        AS cancelled,
                COALESCE(SUM(CASE WHEN i.paymentstatus='PAID' THEN i.roomtotal    ELSE 0 END), 0) AS room_revenue,
                COALESCE(SUM(CASE WHEN i.paymentstatus='PAID' THEN i.servicetotal ELSE 0 END), 0) AS addon_revenue,
                COALESCE(SUM(CASE WHEN i.paymentstatus='PAID' THEN i.grandtotal   ELSE 0 END), 0) AS total_revenue
            FROM booking b
            LEFT JOIN invoice i ON b.bookingid = i.bookingid
            WHERE b.checkindate::date >= %s
              AND b.checkindate::date <= %s
        """, (start_date, end_date))
        summary = cur.fetchone()

        # ── 2. Occupancy Rate ──────────────────────────────────────────
        cur.execute("SELECT COUNT(*) AS total FROM room WHERE status != 'MAINTENANCE'")
        total_rooms = cur.fetchone()['total'] or 1

        cur.execute("""
            SELECT COUNT(DISTINCT bd.roomid) AS occupied
            FROM bookingdetail bd
            JOIN booking b ON bd.bookingid = b.bookingid
            WHERE b.status = 'ACTIVE'
        """)
        occupied = cur.fetchone()['occupied'] or 0
        occupancy_rate = round(occupied / total_rooms, 2)

        # ── 3. Top Add-on Services ─────────────────────────────────────
        cur.execute("""
            SELECT
                ii.itemname                                     AS service,
                COUNT(iu.usageid)                               AS count,
                COALESCE(SUM(iu.quantityused * ii.unitprice),0) AS revenue
            FROM inventoryusage iu
            JOIN inventoryitem  ii ON iu.itemid           = ii.itemid
            JOIN bookingdetail  bd ON iu.bookingdetailid  = bd.bookingdetailid
            JOIN booking        b  ON bd.bookingid        = b.bookingid
            WHERE b.checkindate::date >= %s
              AND b.checkindate::date <= %s
            GROUP BY ii.itemname
            ORDER BY count DESC
            LIMIT 5
        """, (start_date, end_date))
        top_addons = cur.fetchall()

        # ── 4. Daily Revenue ───────────────────────────────────────────
        cur.execute("""
            SELECT
                DATE(i.paymentdate) AS date,
                SUM(i.grandtotal)   AS amount
            FROM invoice i
            WHERE i.paymentstatus = 'PAID'
              AND i.paymentdate::date >= %s
              AND i.paymentdate::date <= %s
            GROUP BY DATE(i.paymentdate)
            ORDER BY date
        """, (start_date, end_date))
        daily_revenue = cur.fetchall()

        cur.close()
        conn.close()

        total_revenue  = float(summary['total_revenue']  or 0)
        total_bookings = int(summary['total_bookings']   or 0)

        return jsonify({
            "status": "success",
            "data": {
                "period": {"start": start_date, "end": end_date},
                "revenue": {
                    "total":  total_revenue,
                    "room":   float(summary['room_revenue']  or 0),
                    "addons": float(summary['addon_revenue'] or 0),
                },
                "bookings": {
                    "total":       total_bookings,
                    "checked_in":  int(summary['checked_in']  or 0),
                    "checked_out": int(summary['checked_out'] or 0),
                    "cancelled":   int(summary['cancelled']   or 0),
                },
                "occupancy_rate": occupancy_rate,
                "top_addons": [
                    {
                        "service": a['service'],
                        "count":   int(a['count']),
                        "revenue": float(a['revenue'] or 0),
                    } for a in top_addons
                ],
                "daily_revenue": [
                    {
                        "date":   r['date'].strftime('%Y-%m-%d'),
                        "amount": float(r['amount'] or 0),
                    } for r in daily_revenue
                ],
            }
        }), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500