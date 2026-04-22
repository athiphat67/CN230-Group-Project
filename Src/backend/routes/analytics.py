"""
analytics.py — FR6 Analytics Dashboard
Blueprint : analytics_bp
Mount ใน app.py:
    from routes.analytics import analytics_bp
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')

แก้ไขจาก version เดิม:
  - top_addons  : เปลี่ยนจาก inventoryusage → bookingservice (chargeable items เท่านั้น)
  - bookings    : เพิ่ม pending count
  - revenue     : เพิ่ม prev_period + growth_pct สำหรับ trend arrow
  - pet_ratio   : กรอง CANCELLED ออก
  - low_stock   : คง logic เดิม
  - daily_revenue: filter ด้วย paymentdate (ตามที่ชำระจริง)
"""

from flask import Blueprint, request, jsonify, current_app
import psycopg2
import psycopg2.extras
from datetime import datetime, timedelta
from utils import token_required, admin_required

analytics_bp = Blueprint('analytics', __name__)


# ─────────────────────────────────────────────────────────────
def _get_db():
    return psycopg2.connect(current_app.config['SQLALCHEMY_DATABASE_URI'])


def _thai_now():
    """คืนค่าเวลาปัจจุบัน UTC+7"""
    return datetime.utcnow() + timedelta(hours=7)


def _parse_date(s):
    return datetime.strptime(s, '%Y-%m-%d').date()


# ─────────────────────────────────────────────────────────────
@analytics_bp.route('/dashboard', methods=['GET'])
@token_required
@admin_required
def get_dashboard(current_user):
    """
    ดึงข้อมูลสถิติและภาพรวมของระบบ (Dashboard Analytics)
    ---
    tags:
      - Analytics
    security:
      - BearerAuth: []
    parameters:
      - name: start_date
        in: query
        type: string
        format: date
        required: false
        description: วันที่เริ่มต้น (YYYY-MM-DD) ค่าเริ่มต้นคือวันแรกของเดือนปัจจุบัน
      - name: end_date
        in: query
        type: string
        format: date
        required: false
        description: วันที่สิ้นสุด (YYYY-MM-DD) ค่าเริ่มต้นคือวันนี้
    responses:
      200:
        description: ข้อมูลสถิติของ Dashboard แบบละเอียด
        schema:
          type: object
          properties:
            status:
              type: string
              example: success
            data:
              type: object
              properties:
                period:
                  type: object
                  properties:
                    start:
                      type: string
                      format: date
                    end:
                      type: string
                      format: date
                revenue:
                  type: object
                  properties:
                    total:
                      type: number
                    room:
                      type: number
                    addons:
                      type: number
                    avg_bill:
                      type: number
                    growth_pct:
                      type: number
                      description: เปอร์เซ็นต์การเติบโตเทียบกับช่วงเวลาก่อนหน้า
                      nullable: true
                    prev_total:
                      type: number
                bookings:
                  type: object
                  properties:
                    total:
                      type: integer
                    checked_in:
                      type: integer
                    checked_out:
                      type: integer
                    cancelled:
                      type: integer
                    pending:
                      type: integer
                occupancy_rate:
                  type: number
                  description: อัตราการเข้าพัก (0.0 - 1.0)
                low_stock_alert:
                  type: integer
                  description: จำนวนสินค้าที่ใกล้หมดสต็อก
                low_stock_items:
                  type: array
                  items:
                    type: object
                    properties:
                      name:
                        type: string
                      in_stock:
                        type: integer
                      threshold:
                        type: integer
                pet_ratio:
                  type: object
                  description: สัดส่วนประเภทสัตว์เลี้ยงที่เข้าพัก
                  additionalProperties:
                    type: integer
                  example: {"CAT": 15, "DOG": 8}
                top_addons:
                  type: array
                  description: บริการเสริมยอดนิยม 5 อันดับแรก
                  items:
                    type: object
                    properties:
                      service:
                        type: string
                      count:
                        type: integer
                      revenue:
                        type: number
                daily_revenue:
                  type: array
                  description: แนวโน้มรายได้รายวัน
                  items:
                    type: object
                    properties:
                      date:
                        type: string
                        format: date
                      amount:
                        type: number
      500:
        description: Internal Server Error
    """
    try:
        today      = _thai_now()
        start_date = request.args.get('start_date', today.replace(day=1).strftime('%Y-%m-%d'))
        end_date   = request.args.get('end_date',   today.strftime('%Y-%m-%d'))

        conn = _get_db()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # ── 1. Booking summary + revenue ─────────────────────────────────
        # กรอง booking ที่ checkindate อยู่ในช่วง; รวม revenue จาก PAID/PARTIAL เท่านั้น
        cur.execute("""
            SELECT
                COUNT(b.bookingid)                                                          AS total_bookings,
                COUNT(CASE WHEN b.status = 'ACTIVE'    THEN 1 END)                         AS checked_in,
                COUNT(CASE WHEN b.status = 'COMPLETED' THEN 1 END)                         AS checked_out,
                COUNT(CASE WHEN b.status = 'CANCELLED' THEN 1 END)                         AS cancelled,
                COUNT(CASE WHEN b.status = 'PENDING'   THEN 1 END)                         AS pending,
                COALESCE(SUM(CASE WHEN i.paymentstatus IN ('PAID','PARTIAL')
                               THEN i.roomtotal    ELSE 0 END), 0)                         AS room_revenue,
                COALESCE(SUM(CASE WHEN i.paymentstatus IN ('PAID','PARTIAL')
                               THEN i.servicetotal ELSE 0 END), 0)                         AS addon_revenue,
                COALESCE(SUM(CASE WHEN i.paymentstatus IN ('PAID','PARTIAL')
                               THEN i.grandtotal   ELSE 0 END), 0)                         AS total_revenue
            FROM booking b
            LEFT JOIN invoice i ON b.bookingid = i.bookingid
            WHERE b.checkindate::date >= %s
              AND b.checkindate::date <= %s
        """, (start_date, end_date))
        summary = cur.fetchone()

        # ── 2. Occupancy Rate (ห้องที่ใช้งานอยู่ ณ ปัจจุบัน / ห้องทั้งหมดที่ไม่ใช่ MAINTENANCE) ──
        cur.execute("""
            SELECT COUNT(*) AS total
            FROM room
            WHERE status != 'MAINTENANCE'
        """)
        total_rooms = int(cur.fetchone()['total'] or 1)

        cur.execute("""
            SELECT COUNT(DISTINCT bd.roomid) AS occupied
            FROM bookingdetail bd
            JOIN booking b ON bd.bookingid = b.bookingid
            WHERE b.status = 'ACTIVE'
        """)
        occupied      = int(cur.fetchone()['occupied'] or 0)
        occupancy_rate = round(occupied / total_rooms, 4)

        # ── 3. Low Stock Alert (จำนวน item ที่สต็อก ≤ lowstockthreshold) ──
        cur.execute("""
            SELECT COUNT(*) AS cnt
            FROM inventoryitem
            WHERE quantityinstock <= lowstockthreshold
        """)
        low_stock = int(cur.fetchone()['cnt'] or 0)

        # ── 4. Low Stock Item Names (แสดงในหน้า frontend) ──────────────────
        cur.execute("""
            SELECT itemname, quantityinstock, lowstockthreshold
            FROM inventoryitem
            WHERE quantityinstock <= lowstockthreshold
            ORDER BY quantityinstock ASC
            LIMIT 5
        """)
        low_stock_items = [
            {
                "name":      r['itemname'],
                "in_stock":  int(r['quantityinstock']),
                "threshold": int(r['lowstockthreshold']),
            }
            for r in cur.fetchall()
        ]

        # ── 5. Pet Species Ratio (ช่วงที่เลือก, ไม่รวม CANCELLED) ──────────
        cur.execute("""
            SELECT p.species, COUNT(DISTINCT p.petid) AS cnt
            FROM bookingdetail bd
            JOIN pet     p ON bd.petid     = p.petid
            JOIN booking b ON bd.bookingid = b.bookingid
            WHERE b.checkindate::date >= %s
              AND b.checkindate::date <= %s
              AND b.status != 'CANCELLED'
            GROUP BY p.species
            ORDER BY cnt DESC
        """, (start_date, end_date))
        pet_ratio = {row['species']: int(row['cnt']) for row in cur.fetchall()}

        # ── 6. Top Add-on Services — จาก bookingservice (ischargeable = true) ──
        #       BUG FIX: version เดิมใช้ inventoryusage (internal usage ไม่ใช่บริการเสริม)
        cur.execute("""
            SELECT
                ii.itemname                         AS service,
                SUM(bs.quantity)                    AS count,
                SUM(bs.quantity * bs.unitprice)     AS revenue
            FROM bookingservice bs
            JOIN inventoryitem  ii ON bs.itemid    = ii.itemid
            JOIN booking        b  ON bs.bookingid = b.bookingid
            WHERE b.checkindate::date >= %s
              AND b.checkindate::date <= %s
              AND b.status != 'CANCELLED'
            GROUP BY ii.itemname
            ORDER BY revenue DESC
            LIMIT 5
        """, (start_date, end_date))
        top_addons = cur.fetchall()

        # ── 7. Daily Revenue Trend (กรองด้วย paymentdate — วันที่รับเงินจริง) ──
        cur.execute("""
            SELECT
                DATE(i.paymentdate) AS date,
                SUM(i.grandtotal)   AS amount
            FROM invoice i
            WHERE i.paymentstatus IN ('PAID', 'PARTIAL')
              AND i.paymentdate::date >= %s
              AND i.paymentdate::date <= %s
            GROUP BY DATE(i.paymentdate)
            ORDER BY date
        """, (start_date, end_date))
        daily_revenue = cur.fetchall()

        # ── 8. Previous Period Revenue (สำหรับ trend arrow ใน KPI) ──────────
        try:
            start_dt  = _parse_date(start_date)
            end_dt    = _parse_date(end_date)
            period_len = (end_dt - start_dt).days
            prev_end   = start_dt - timedelta(days=1)
            prev_start = prev_end - timedelta(days=period_len)

            cur.execute("""
                SELECT COALESCE(SUM(i.grandtotal), 0) AS prev_rev
                FROM invoice i
                WHERE i.paymentstatus IN ('PAID', 'PARTIAL')
                  AND i.paymentdate::date >= %s
                  AND i.paymentdate::date <= %s
            """, (prev_start.strftime('%Y-%m-%d'), prev_end.strftime('%Y-%m-%d')))
            prev_revenue = float(cur.fetchone()['prev_rev'] or 0)
        except Exception:
            prev_revenue = 0.0

        cur.close()
        conn.close()

        # ── สร้าง Response ──────────────────────────────────────────────────
        total_rev  = float(summary['total_revenue'])
        room_rev   = float(summary['room_revenue'])
        addon_rev  = float(summary['addon_revenue'])
        growth_pct = None
        if prev_revenue > 0:
            growth_pct = round(((total_rev - prev_revenue) / prev_revenue) * 100, 1)

        total_bk = int(summary['total_bookings'])
        avg_bill = round(total_rev / total_bk, 2) if total_bk > 0 else 0.0

        return jsonify({
            "status": "success",
            "data": {
                "period": {
                    "start": start_date,
                    "end":   end_date,
                },
                "revenue": {
                    "total":      total_rev,
                    "room":       room_rev,
                    "addons":     addon_rev,
                    "avg_bill":   avg_bill,
                    "growth_pct": growth_pct,   # None = ไม่มีข้อมูลช่วงก่อน
                    "prev_total": prev_revenue,
                },
                "bookings": {
                    "total":       total_bk,
                    "checked_in":  int(summary['checked_in']),
                    "checked_out": int(summary['checked_out']),
                    "cancelled":   int(summary['cancelled']),
                    "pending":     int(summary['pending']),
                },
                "occupancy_rate":   occupancy_rate,
                "low_stock_alert":  low_stock,
                "low_stock_items":  low_stock_items,
                "pet_ratio":        pet_ratio,
                "top_addons": [
                    {
                        "service": a['service'],
                        "count":   int(a['count']),
                        "revenue": float(a['revenue']),
                    }
                    for a in top_addons
                ],
                "daily_revenue": [
                    {
                        "date":   r['date'].strftime('%Y-%m-%d'),
                        "amount": float(r['amount']),
                    }
                    for r in daily_revenue
                ],
            }
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": True, "message": str(e)}), 500