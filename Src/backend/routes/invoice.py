from flask import Blueprint, request, jsonify, current_app
import psycopg2
import psycopg2.extras

invoice_bp = Blueprint('invoice', __name__)

def get_db_connection():
    return psycopg2.connect(current_app.config['SQLALCHEMY_DATABASE_URI'])

# --- 1. API ดูรายละเอียดใบแจ้งหนี้ (Read) ---
@invoice_bp.route('/<int:booking_id>', methods=['GET'])
def get_invoice(booking_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        # [FIX] เพิ่ม i.DepositPaid ลงในคำสั่ง SELECT
        query = """
            SELECT i.InvoiceID, i.BookingID, i.RoomTotal, i.ServiceTotal, 
                   i.VetEmergencyCost, i.DepositPaid, i.GrandTotal, i.PaymentMethod, 
                   i.PaymentStatus, i.PaymentDate,
                   c.FirstName, c.LastName
            FROM Invoice i
            JOIN Booking b ON i.BookingID = b.BookingID
            JOIN Customer c ON b.CustomerID = c.CustomerID
            WHERE i.BookingID = %s
        """
        cur.execute(query, (booking_id,))
        invoice = cur.fetchone()
        
        cur.close()
        conn.close()

        if invoice:
            return jsonify({"status": "success", "data": invoice}), 200
        return jsonify({"status": "error", "message": "ไม่พบใบแจ้งหนี้สำหรับการจองนี้"}), 404

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# --- 2. API ชำระเงิน (Update Payment) ---
@invoice_bp.route('/pay/<int:booking_id>', methods=['PUT'])
def pay_invoice(booking_id):
    try:
        data = request.get_json()
        payment_method = data.get('payment_method')
        staff_id = data.get('staff_id')
        amount_paid = float(data.get('amount_paid', 0)) # [NEW] รับยอดเงินที่จ่าย

        conn = get_db_connection()
        cur = conn.cursor()

        # เช็กยอด GrandTotal ปัจจุบัน
        cur.execute("SELECT GrandTotal, DepositPaid FROM Invoice WHERE BookingID = %s", (booking_id,))
        invoice = cur.fetchone()
        if not invoice: return jsonify({"status": "error", "message": "ไม่พบบิล"}), 404
        
        grand_total, current_deposit = float(invoice[0]), float(invoice[1])
        new_deposit = current_deposit + amount_paid

        # คำนวณสถานะ: ถ้าจ่ายครบหรือเกิน = PAID, ถ้ายังไม่ครบ = PARTIAL
        new_status = 'PAID' if new_deposit >= grand_total else 'PARTIAL'

        cur.execute("""
            UPDATE Invoice 
            SET PaymentStatus = %s, PaymentMethod = %s, IssuedBy_StaffID = %s,
                DepositPaid = %s, PaymentDate = NOW()
            WHERE BookingID = %s
        """, (new_status, payment_method, staff_id, new_deposit, booking_id))
        
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "status": "success", 
            "message": f"รับชำระเงิน {amount_paid} บาท (สถานะ: {new_status})"
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    
# --- 3. API แก้ไขค่าใช้จ่ายเพิ่มเติม (Update Costs) ---
@invoice_bp.route('/update-costs/<int:booking_id>', methods=['PUT'])
def update_invoice_costs(booking_id):
    try:
        data = request.get_json()
        service_total = data.get('service_total', 0)
        vet_cost = data.get('vet_cost', 0)

        conn = get_db_connection()
        cur = conn.cursor()

        # อัปเดตยอดค่าบริการเพิ่มเติมในบิลใบเดิม (บวกเพิ่มจากยอดเดิม)
        query = """
            UPDATE Invoice 
            SET ServiceTotal = ServiceTotal + %s, 
                VetEmergencyCost = VetEmergencyCost + %s
            WHERE BookingID = %s
        """
        cur.execute(query, (service_total, vet_cost, booking_id))
        
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"status": "success", "message": "อัปเดตค่าใช้จ่ายเพิ่มเติมเรียบร้อยแล้ว"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
