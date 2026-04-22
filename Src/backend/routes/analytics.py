"""
analytics.py — FR6 Analytics Dashboard
GET /api/analytics/dashboard  (ADMIN/OWNER เท่านั้น)

อัปเดต: 
- รวมช่วงวันที่ (Start/End Date)
- เพิ่ม Low Stock Alert (FR6.1.1)
- เพิ่ม Pet Species Ratio (กราฟสัดส่วนสัตว์เลี้ยง)
- ปรับปรุง Revenue Logic ให้รวมสถานะ 'PARTIAL' (มัดจำ)
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
    # ปรับเวลาให้เป็นเวลาประเทศไทย (UTC+7)
    return datetime.utcnow() + timedelta(hours=7)


@analytics_bp.route('/dashboard', methods=['GET'])
@token_required
@admin_required
def get_dashboard(current_user):
    try:
        today = get_thai_time()
        # ถ้าไม่ส่งวันที่มา ให้ default เป็นต้นเดือนนี้ถึงวันนี้
        start_date = request.args.get('start_date', today.replace(day=1).strftime('%Y-%m-%d'))
        end_date   = request.args.get('end_date',   today.strftime('%Y-%m-%d'))

        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # ── 1. สรุป Booking + Revenue (รวมสถานะ PAID และ PARTIAL) ────────
        cur.execute("""
            SELECT
                COUNT(b.BookingID) AS total_bookings,
                COUNT(CASE WHEN b.Status = 'ACTIVE'    THEN 1 END) AS checked_in,
                COUNT(CASE WHEN b.Status = 'COMPLETED' THEN 1 END) AS checked_out,
                COUNT(CASE WHEN b.Status = 'CANCELLED' THEN 1 END) AS cancelled,
                COALESCE(SUM(CASE WHEN i.PaymentStatus IN ('PAID', 'PARTIAL') THEN i.RoomTotal    ELSE 0 END), 0) AS room_revenue,
                COALESCE(SUM(CASE WHEN i.PaymentStatus IN ('PAID', 'PARTIAL') THEN i.ServiceTotal ELSE 0 END), 0) AS addon_revenue,
                COALESCE(SUM(CASE WHEN i.PaymentStatus IN ('PAID', 'PARTIAL') THEN i.GrandTotal   ELSE 0 END), 0) AS total_revenue
            FROM Booking b
            LEFT JOIN Invoice i ON b.BookingID = i.BookingID
            WHERE b.CheckInDate::date >= %s
              AND b.CheckInDate::date <= %s
        """, (start_date, end_date))
        summary = cur.fetchone()

        # ── 2. Occupancy Rate (คำนวณจากห้องที่ถูกใช้งานจริง ณ ปัจจุบัน) ────
        cur.execute("SELECT COUNT(*) AS total FROM Room WHERE Status != 'MAINTENANCE'")
        total_rooms = cur.fetchone()['total'] or 1

        cur.execute("""
            SELECT COUNT(DISTINCT bd.RoomID) AS occupied
            FROM BookingDetail bd
            JOIN Booking b ON bd.BookingID = b.BookingID
            WHERE b.Status = 'ACTIVE'
        """)
        occupied = cur.fetchone()['occupied'] or 0
        occupancy_rate = round(occupied / total_rooms, 2)

        # ── 3. Low Stock Alert (FR6.1.1 - สินค้าที่ต้องสั่งเพิ่ม) ──────────
        cur.execute("""
            SELECT COUNT(*) AS low_stock 
            FROM InventoryItem 
            WHERE QuantityInStock <= LowStockThreshold
        """)
        low_stock_items = cur.fetchone()['low_stock'] or 0

        # ── 4. Pet Species Ratio (สัดส่วนสัตว์เลี้ยงที่เข้าพักในจังหวะนี้) ──
        cur.execute("""
            SELECT p.Species, COUNT(DISTINCT p.PetID) AS count
            FROM BookingDetail bd
            JOIN Pet p ON bd.PetID = p.PetID
            JOIN Booking b ON bd.BookingID = b.BookingID
            WHERE b.CheckInDate::date >= %s AND b.CheckInDate::date <= %s
            GROUP BY p.Species
        """, (start_date, end_date))
        pet_ratio = {row['species']: int(row['count']) for row in cur.fetchall()}

        # ── 5. Top Add-on Services (สินค้า/บริการที่ทำเงินสูงสุด) ──────────
        cur.execute("""
            SELECT
                ii.ItemName                                     AS service,
                COUNT(iu.UsageID)                               AS count,
                COALESCE(SUM(iu.QuantityUsed * ii.UnitPrice), 0) AS revenue
            FROM InventoryUsage iu
            JOIN InventoryItem  ii ON iu.ItemID           = ii.ItemID
            JOIN BookingDetail  bd ON iu.BookingDetailID  = bd.BookingDetailID
            JOIN Booking        b  ON bd.BookingID        = b.BookingID
            WHERE b.CheckInDate::date >= %s
              AND b.CheckInDate::date <= %s
            GROUP BY ii.ItemName
            ORDER BY count DESC
            LIMIT 5
        """, (start_date, end_date))
        top_addons = cur.fetchall()

        # ── 6. Daily Revenue Trend (กราฟรายวัน - รวม PAID/PARTIAL) ────────
        cur.execute("""
            SELECT
                DATE(i.PaymentDate) AS date,
                SUM(i.GrandTotal)   AS amount
            FROM Invoice i
            WHERE i.PaymentStatus IN ('PAID', 'PARTIAL')
              AND i.PaymentDate::date >= %s
              AND i.PaymentDate::date <= %s
            GROUP BY DATE(i.PaymentDate)
            ORDER BY date
        """, (start_date, end_date))
        daily_revenue = cur.fetchall()

        cur.close()
        conn.close()

        # แปลงข้อมูลสรุป
       # แปลงข้อมูลสรุปให้โครงสร้างตรงกับ Analytics.js ฝั่ง Frontend
        return jsonify({
            "status": "success",
            "data": {
                "period": { "start": start_date, "end": end_date },
                "revenue": {
                    "total":  float(summary['total_revenue']),
                    "room":   float(summary['room_revenue']),
                    "addons": float(summary['addon_revenue'])
                },
                "bookings": {
                    "total":       int(summary['total_bookings']),
                    "checked_in":  int(summary['checked_in']),
                    "checked_out": int(summary['checked_out']),
                    "cancelled":   int(summary['cancelled'])
                },
                "occupancy_rate": occupancy_rate,
                "low_stock_alert": low_stock_items,
                "pet_ratio": pet_ratio,
                "top_addons": [
                    {
                        "service": a['service'],
                        "count":   int(a['count']),
                        "revenue": float(a['revenue']),
                    } for a in top_addons
                ],
                "daily_revenue": [
                    {
                        "date":   r['date'].strftime('%Y-%m-%d'),
                        "amount": float(r['amount']),
                    } for r in daily_revenue
                ]
            }
        }), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500