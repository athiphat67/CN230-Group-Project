"""
billing.py — FR5 Billing & Payment Management
GET  /api/billing                    รายการ Invoice ทั้งหมด
GET  /api/billing/{invoice_id}       ดูรายละเอียด Invoice
POST /api/billing/preview            Preview Invoice ก่อน checkout
PATCH /api/billing/{invoice_id}/pay  รับชำระเงิน

⚠️ ไฟล์นี้แทน invoice.py เดิม — ให้ลบ invoice.py และ
   เปลี่ยน url_prefix ใน app.py เป็น /api/billing
"""
from flask import Blueprint, request, jsonify, current_app
import psycopg2
import psycopg2.extras
from datetime import datetime, timedelta
from utils import token_required

billing_bp = Blueprint('billing', __name__)

def get_db_connection():
    return psycopg2.connect(current_app.config['SQLALCHEMY_DATABASE_URI'])

def get_thai_time():
    return datetime.utcnow() + timedelta(hours=7)

def fmt_invoice_id(raw_id):
    """คืนค่า "INV-XXXX" format สำหรับแสดงผล"""
    return f"INV-{str(raw_id).zfill(4)}"

# ── 1. รายการ Invoice ทั้งหมด (GET /api/billing) ──────────────────────
@billing_bp.route('', methods=['GET'])
@token_required
def get_all_invoices(current_user):
    """
    ดึงรายการ Invoice ทั้งหมด
    ---
    tags:
      - Billing
    security:
      - BearerAuth: []
    parameters:
      - name: status
        in: query
        type: string
        required: false
        description: กรองตามสถานะการชำระเงิน (เช่น PAID, UNPAID)
        example: UNPAID
      - name: booking_id
        in: query
        type: integer
        required: false
        description: กรองตาม ID การจอง
    responses:
      200:
        description: รายการ Invoice ทั้งหมด
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
                  invoice_id:
                    type: string
                    example: INV-0001
                  invoice_id_raw:
                    type: integer
                  booking_id:
                    type: integer
                  owner_name:
                    type: string
                  owner_id:
                    type: integer
                  pet_names:
                    type: array
                    items:
                      type: string
                  checkin_date:
                    type: string
                    format: date
                  checkout_date:
                    type: string
                    format: date
                  room_total:
                    type: number
                  service_total:
                    type: number
                  vet_cost:
                    type: number
                  grand_total:
                    type: number
                  deposit_paid:
                    type: number
                  payment_status:
                    type: string
                  payment_method:
                    type: string
                  paid_at:
                    type: string
                    format: date-time
      500:
        description: Internal Server Error
    """
    try:
        status_filter = request.args.get('status')   # PAID | UNPAID
        booking_id    = request.args.get('booking_id')

        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        query = """
            SELECT
                i.invoiceid,
                i.bookingid,
                i.roomtotal,
                i.servicetotal,
                i.vetemergencycost,
                i.grandtotal,
                i.depositpaid,
                i.paymentmethod,
                i.paymentstatus,
                i.paymentdate,
                c.firstname || ' ' || c.lastname   AS owner_name,
                c.customerid                        AS owner_id,
                b.checkindate,
                b.checkoutdate,
                array_agg(DISTINCT p.name)          AS pet_names
            FROM invoice i
            JOIN booking        b  ON i.bookingid   = b.bookingid
            JOIN customer       c  ON b.customerid  = c.customerid
            JOIN bookingdetail  bd ON b.bookingid   = bd.bookingid
            JOIN pet            p  ON bd.petid      = p.petid
            WHERE 1=1
        """
        params = []

        if status_filter:
            query += " AND i.paymentstatus = %s"
            params.append(status_filter.upper())
        if booking_id:
            query += " AND i.bookingid = %s"
            params.append(booking_id)

        query += " GROUP BY i.invoiceid, c.firstname, c.lastname, c.customerid, b.checkindate, b.checkoutdate ORDER BY i.invoiceid DESC"

        cur.execute(query, params)
        invoices = cur.fetchall()
        cur.close()
        conn.close()

        result = []
        for inv in invoices:
            result.append({
                "invoice_id":     fmt_invoice_id(inv['invoiceid']),
                "invoice_id_raw": inv['invoiceid'],
                "booking_id":     inv['bookingid'],
                "owner_name":     inv['owner_name'],
                "owner_id":       inv['owner_id'],
                "pet_names":      inv['pet_names'] or [],
                "checkin_date":   inv['checkindate'].strftime('%Y-%m-%d') if inv['checkindate'] else None,
                "checkout_date":  inv['checkoutdate'].strftime('%Y-%m-%d') if inv['checkoutdate'] else None,
                "room_total":     float(inv['roomtotal']      or 0),
                "service_total":  float(inv['servicetotal']   or 0),
                "vet_cost":       float(inv['vetemergencycost'] or 0),
                "grand_total":    float(inv['grandtotal']     or 0),
                "deposit_paid":   float(inv['depositpaid']    or 0),
                "payment_status": inv['paymentstatus'],
                "payment_method": inv['paymentmethod'],
                "paid_at":        inv['paymentdate'].isoformat() if inv['paymentdate'] else None,
            })

        return jsonify({"status": "success", "data": result}), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500


# ── 2. Preview Invoice ก่อน Checkout  (POST /api/billing/preview) ─────
#  ⚠️ ต้องวางก่อน /<int:invoice_id> เพื่อป้องกัน Flask routing conflict
@billing_bp.route('/preview', methods=['POST'])
@token_required
def preview_invoice(current_user):
    """
    ดูพรีวิว Invoice และคำนวณยอดสุทธิ (ก่อนชำระเงินจริง)
    ---
    tags:
      - Billing
    security:
      - BearerAuth: []
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - booking_id
          properties:
            booking_id:
              type: integer
              description: ID ของการจองที่ต้องการดูยอดชำระ
              example: 1
    responses:
      200:
        description: พรีวิวรายละเอียดบิลและรายการค่าใช้จ่าย (Line Items)
      400:
        description: ข้อมูลไม่ครบถ้วน (ไม่ได้ระบุ booking_id)
      404:
        description: ไม่พบการจอง
      500:
        description: Internal Server Error
    """
    try:
        data       = request.get_json()
        booking_id = data.get('booking_id')

        if not booking_id:
            return jsonify({"error": True, "message": "ต้องระบุ booking_id"}), 400

        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # ดึงข้อมูลการจองและห้อง
        cur.execute("""
            SELECT b.bookingid, b.checkindate, b.checkoutdate, b.lockedrate,
                   c.firstname || ' ' || c.lastname AS owner_name,
                   array_agg(DISTINCT p.name)       AS pet_names,
                   i.invoiceid, i.servicetotal, i.paymentstatus
            FROM booking b
            JOIN customer      c  ON b.customerid = c.customerid
            JOIN bookingdetail bd ON b.bookingid  = bd.bookingid
            JOIN pet           p  ON bd.petid     = p.petid
            LEFT JOIN invoice  i  ON b.bookingid  = i.bookingid
            WHERE b.bookingid = %s
            GROUP BY b.bookingid, b.checkindate, b.checkoutdate, b.lockedrate,
                     c.firstname, c.lastname, i.invoiceid, i.servicetotal, i.paymentstatus
        """, (booking_id,))
        booking = cur.fetchone()

        if not booking:
            cur.close()
            conn.close()
            return jsonify({"error": True, "code": 404, "message": "ไม่พบการจอง"}), 404

        # คำนวณ line_items จาก inventoryusage
        cur.execute("""
            SELECT ii.itemname, SUM(iu.quantityused) AS qty, ii.unitprice,
                   SUM(iu.quantityused * ii.unitprice) AS subtotal
            FROM inventoryusage iu
            JOIN inventoryitem  ii ON iu.itemid          = ii.itemid
            JOIN bookingdetail  bd ON iu.bookingdetailid = bd.bookingdetailid
            WHERE bd.bookingid = %s
            GROUP BY ii.itemname, ii.unitprice
        """, (booking_id,))
        usage_items = cur.fetchall()

        cur.close()
        conn.close()

        nights = max((booking['checkoutdate'] - booking['checkindate']).days, 1)
        room_total    = float(booking['lockedrate'] or 0)
        service_total = float(booking['servicetotal'] or 0)

        line_items = [{
            "description": f"ค่าห้อง × {nights} คืน",
            "amount": room_total,
        }] + [{
            "description": f"{u['itemname']} × {u['qty']}",
            "amount": float(u['subtotal'] or 0),
        } for u in usage_items]

        return jsonify({
            "status": "success",
            "preview": {
                "booking_id":    booking_id,
                "invoice_id":    fmt_invoice_id(booking['invoiceid']) if booking['invoiceid'] else None,
                "owner_name":    booking['owner_name'],
                "pet_names":     booking['pet_names'] or [],
                "checkin_date":  booking['checkindate'].strftime('%Y-%m-%d'),
                "checkout_date": booking['checkoutdate'].strftime('%Y-%m-%d'),
                "nights":        nights,
                "line_items":    line_items,
                "room_total":    room_total,
                "service_total": service_total,
                "grand_total":   room_total + service_total,
                "payment_status": booking['paymentstatus'] or 'UNPAID',
            }
        }), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500


# ── 3. ดูรายละเอียด Invoice (GET /api/billing/{invoice_id}) ──────────
@billing_bp.route('/<int:invoice_id>', methods=['GET'])
@token_required
def get_invoice(current_user, invoice_id):
    """
    ดูรายละเอียด Invoice (รายตัว)
    ---
    tags:
      - Billing
    security:
      - BearerAuth: []
    parameters:
      - name: invoice_id
        in: path
        type: integer
        required: true
        description: รหัส ID (ตัวเลข) ของ Invoice ที่ต้องการดู
    responses:
      200:
        description: ข้อมูลรายละเอียดบิล และรายการสินค้า/บริการทั้งหมด
      404:
        description: ไม่พบ Invoice
      500:
        description: Internal Server Error
    """
    try:
        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute("""
            SELECT i.*, c.firstname, c.lastname, b.checkindate, b.checkoutdate, b.bookingid
            FROM invoice  i
            JOIN booking  b ON i.bookingid  = b.bookingid
            JOIN customer c ON b.customerid = c.customerid
            WHERE i.invoiceid = %s
        """, (invoice_id,))
        invoice = cur.fetchone()

        if not invoice:
            cur.close()
            conn.close()
            return jsonify({"error": True, "code": 404, "message": "ไม่พบ Invoice"}), 404

        # รายการบริการเสริมที่ใช้จริง
        cur.execute("""
            SELECT iu.quantityused, ii.itemname, ii.unitprice,
                   (iu.quantityused * ii.unitprice) AS subtotal
            FROM inventoryusage iu
            JOIN inventoryitem  ii ON iu.itemid          = ii.itemid
            JOIN bookingdetail  bd ON iu.bookingdetailid = bd.bookingdetailid
            WHERE bd.bookingid = %s
        """, (invoice['bookingid'],))
        services = cur.fetchall()

        cur.close()
        conn.close()

        return jsonify({
            "status": "success",
            "data": {
                "invoice_id":    fmt_invoice_id(invoice['invoiceid']),
                "booking_id":    invoice['bookingid'],
                "owner_name":    f"{invoice['firstname']} {invoice['lastname']}",
                "checkin_date":  invoice['checkindate'].strftime('%Y-%m-%d'),
                "checkout_date": invoice['checkoutdate'].strftime('%Y-%m-%d'),
                "room_total":    float(invoice['roomtotal']       or 0),
                "service_total": float(invoice['servicetotal']    or 0),
                "vet_cost":      float(invoice['vetemergencycost'] or 0),
                "grand_total":   float(invoice['grandtotal']      or 0),
                "deposit_paid":  float(invoice['depositpaid']     or 0),
                "payment_status": invoice['paymentstatus'],
                "payment_method": invoice['paymentmethod'],
                "paid_at":       invoice['paymentdate'].isoformat() if invoice['paymentdate'] else None,
                "line_items": [{
                    "description": f"{s['itemname']} × {s['quantityused']}",
                    "unit_price":  float(s['unitprice'] or 0),
                    "qty":         s['quantityused'],
                    "subtotal":    float(s['subtotal'] or 0),
                } for s in services],
            }
        }), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500


# ── 4. รับชำระเงิน (PATCH /api/billing/{invoice_id}/pay) ─────────────
@billing_bp.route('/<int:invoice_id>/pay', methods=['PATCH'])
@token_required
def process_payment(current_user, invoice_id):
    """
    บันทึกการรับชำระเงินและปิดการจอง
    ---
    tags:
      - Billing
    security:
      - BearerAuth: []
    parameters:
      - name: invoice_id
        in: path
        type: integer
        required: true
        description: รหัส ID (ตัวเลข) ของ Invoice ที่ต้องการชำระเงิน
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            payment_method:
              type: string
              description: วิธีการชำระเงิน
              enum: [cash, qr_promptpay, credit_card, bank_transfer]
              example: qr_promptpay
    responses:
      200:
        description: ชำระเงินสำเร็จ และอัปเดตสถานะการจองเป็น COMPLETED (Check-out) แล้ว
      404:
        description: ไม่พบ Invoice
      500:
        description: Internal Server Error
    """
    try:
        data   = request.get_json()
        method = data.get('payment_method')   # cash | qr_promptpay | credit_card

        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # ดึง booking_id จาก invoice
        cur.execute("SELECT bookingid FROM invoice WHERE invoiceid = %s", (invoice_id,))
        row = cur.fetchone()
        if not row:
            cur.close()
            conn.close()
            return jsonify({"error": True, "code": 404, "message": "ไม่พบ Invoice"}), 404

        booking_id = row['bookingid']

        cur2 = conn.cursor()
        # อัปเดต Invoice → PAID
        cur2.execute("""
            UPDATE invoice
            SET paymentstatus    = 'PAID',
                paymentmethod    = %s,
                issuedby_staffid = %s,
                paymentdate      = %s
            WHERE invoiceid = %s
        """, (method, current_user['staff_id'], get_thai_time(), invoice_id))

        # ปิดการจอง → COMPLETED
        cur2.execute("UPDATE booking SET status = 'COMPLETED' WHERE bookingid = %s", (booking_id,))

        conn.commit()
        cur.close()
        cur2.close()
        conn.close()

        return jsonify({
            "status": "success",
            "message": "ชำระเงินสำเร็จ ปิดการจองเรียบร้อยแล้ว",
            "invoice_id": fmt_invoice_id(invoice_id),
            "payment_status": "PAID",
        }), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500