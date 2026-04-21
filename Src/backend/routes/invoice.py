from flask import Blueprint, request, jsonify, current_app
import psycopg2
import psycopg2.extras
from utils import token_required

invoice_bp = Blueprint('invoice', __name__)

def get_db_connection():
    return psycopg2.connect(current_app.config['SQLALCHEMY_DATABASE_URI'])

# --- 1. ดูรายละเอียดใบแจ้งหนี้ (FR5.1) ---
@invoice_bp.route('/<int:booking_id>', methods=['GET'])
@token_required
def get_invoice(current_user, booking_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        # ดึงยอดรวมจาก Invoice และข้อมูลลูกค้า
        query = """
            SELECT i.*, c.firstname, c.lastname, b.checkindate, b.checkoutdate
            FROM invoice i
            JOIN booking b ON i.bookingid = b.bookingid
            JOIN customer c ON b.customerid = c.customerid
            WHERE i.bookingid = %s
        """
        cur.execute(query, (booking_id,))
        invoice = cur.fetchone()
        
        if not invoice:
            return jsonify({"error": True, "message": "ไม่พบใบแจ้งหนี้"}), 404

        # ดึงรายการบริการเสริมที่ใช้ไปจริงจาก inventoryusage
        cur.execute("""
            SELECT iu.quantityused, ii.itemname, ii.unitprice, (iu.quantityused * ii.unitprice) as subtotal
            FROM inventoryusage iu
            JOIN inventoryitem ii ON iu.itemid = ii.itemid
            JOIN bookingdetail bd ON iu.bookingdetailid = bd.bookingdetailid
            WHERE bd.bookingid = %s
        """, (booking_id,))
        services = cur.fetchall()

        cur.close()
        conn.close()
        
        return jsonify({
            "status": "success", 
            "invoice": invoice,
            "usage_details": services
        }), 200
    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500

# --- 2. รับชำระเงิน (FR5.2) ---
@invoice_bp.route('/pay/<int:booking_id>', methods=['POST'])
@token_required
def process_payment(current_user, booking_id):
    try:
        data = request.get_json()
        method = data.get('payment_method') # CASH, TRANSFER, CARD
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # อัปเดตสถานะเป็น PAID และบันทึกพนักงานที่รับเงิน
        cur.execute("""
            UPDATE invoice 
            SET paymentstatus = 'PAID', paymentmethod = %s, 
                issuedby_staffid = %s, paymentdate = NOW()
            WHERE bookingid = %s
        """, (method, current_user['staff_id'], booking_id))
        
        # เมื่อจ่ายเงินแล้ว ให้ปิดการจอง (Status = COMPLETED) ในตาราง Booking ด้วย
        cur.execute("UPDATE booking SET status = 'COMPLETED' WHERE bookingid = %s", (booking_id,))
        
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": "ชำระเงินเรียบร้อยและปิดการจองแล้ว"}), 200
    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500