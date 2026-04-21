from flask import Blueprint, request, jsonify, current_app
import psycopg2
import psycopg2.extras
from utils import token_required

invoice_bp = Blueprint('invoice', __name__)

def get_db_connection():
    return psycopg2.connect(current_app.config['SQLALCHEMY_DATABASE_URI'])

def api_response(data=None, message="Success", status_code=200):
    return jsonify({"error": False, "message": message, "data": data}), status_code

def api_error(code, message, detail):
    return jsonify({"error": True, "code": code, "message": message, "detail": detail}), code

# --- 1. Get All Invoices ---
@invoice_bp.route('/', methods=['GET'])
def get_all_invoices():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        # ใช้ Alias "KeyName" เพื่อให้ JSON Key ตรงกับ Schema.sql เป๊ะๆ
        query = """
            SELECT i."InvoiceID", i."BookingID", c."FirstName", c."LastName", 
                   i."GrandTotal", i."PaymentStatus", i."PaymentDate"
            FROM Invoice i
            JOIN Booking b ON i."BookingID" = b."BookingID"
            JOIN Customer c ON b."CustomerID" = c."CustomerID"
            ORDER BY i."InvoiceID" DESC
        """
        cur.execute(query)
        invoices = cur.fetchall()
        cur.close()
        conn.close()
        return api_response(data=invoices)
    except Exception as e:
        return api_error(500, "Database Error", str(e))

# --- 2. Get Invoice Detail ---
@invoice_bp.route('/<int:invoice_id>', methods=['GET'])
def get_invoice_detail(invoice_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        cur.execute("""
            SELECT i."InvoiceID", i."BookingID", i."RoomTotal", i."ServiceTotal", 
                   i."VetEmergencyCost", i."DepositPaid", i."GrandTotal", i."PaymentMethod", 
                   i."PaymentStatus", i."PaymentDate",
                   c."FirstName", c."LastName"
            FROM Invoice i
            JOIN Booking b ON i."BookingID" = b."BookingID"
            JOIN Customer c ON b."CustomerID" = c."CustomerID"
            WHERE i."InvoiceID" = %s
        """, (invoice_id,))
        invoice = cur.fetchone()
        
        if not invoice:
            return api_error(404, "Not Found", "ไม่พบใบแจ้งหนี้")

        # ดึง Line Items
        cur.execute("""
            SELECT 'Room Charge' AS "Description", "RoomTotal" AS "Amount" FROM Invoice WHERE "InvoiceID" = %s
            UNION ALL
            SELECT 'Service/Add-ons', "ServiceTotal" FROM Invoice WHERE "InvoiceID" = %s
            WHERE "ServiceTotal" > 0
        """, (invoice_id, invoice_id))
        invoice['LineItems'] = cur.fetchall()

        cur.close()
        conn.close()
        return api_response(data=invoice)
    except Exception as e:
        return api_error(500, "Database Error", str(e))

# --- 3. Pay Invoice (PATCH) ---
@invoice_bp.route('/<int:invoice_id>/pay', methods=['PATCH'])
def pay_invoice(invoice_id):
    try:
        data = request.get_json()
        payment_method = data.get('payment_method')
        amount_paid = float(data.get('amount_paid', 0))
        staff_id = data.get('staff_id')
        staff_name = data.get('staff_name', 'System')

        conn = get_db_connection()
        cur = conn.cursor()

        # ตรวจสอบยอด
        cur.execute('SELECT "GrandTotal", "DepositPaid", "BookingID" FROM Invoice WHERE "InvoiceID" = %s', (invoice_id,))
        res = cur.fetchone()
        if not res: return api_error(404, "Not Found", "ไม่พบข้อมูลบิล")
        
        grand_total, current_deposit, booking_id = float(res[0]), float(res[1]), res[2]
        new_deposit = current_deposit + amount_paid
        new_status = 'PAID' if new_deposit >= grand_total else 'PARTIAL'

        # 1. Update Invoice
        cur.execute("""
            UPDATE Invoice SET 
                "PaymentStatus" = %s, "PaymentMethod" = %s, "IssuedBy_StaffID" = %s,
                "DepositPaid" = %s, "PaymentDate" = NOW()
            WHERE "InvoiceID" = %s
        """, (new_status, payment_method, staff_id, new_deposit, invoice_id))

        # 2. Insert AuditTrail (ยึดตามตารางใหม่)
        audit_desc = f"Payment received: {amount_paid} via {payment_method} for Invoice #{invoice_id}"
        cur.execute("""
            INSERT INTO AuditTrail ("StaffID", "StaffName", "ActionType", "TableAffected", "RecordID", "Description")
            VALUES (%s, %s, 'PAYMENT', 'Invoice', %s, %s)
        """, (staff_id, staff_name, invoice_id, audit_desc))

        conn.commit()
        cur.close()
        conn.close()
        return api_response(message=f"ชำระเงินสำเร็จ (สถานะ: {new_status})")
    except Exception as e:
        return api_error(500, "Update Error", str(e))
