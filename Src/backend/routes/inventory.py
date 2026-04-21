from flask import Blueprint, request, jsonify, current_app
import psycopg2
import psycopg2.extras
from utils import token_required

inventory_bp = Blueprint('inventory', __name__)

def get_db_connection():
    return psycopg2.connect(current_app.config['SQLALCHEMY_DATABASE_URI'])

# --- 1. ดูรายการสินค้าทั้งหมด (FR6.1, 6.4) ---
@inventory_bp.route('/items', methods=['GET'])
@token_required
def get_inventory_items(current_user):
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        # ดึงข้อมูลพร้อมประเมินสถานะสต็อก (Low Stock / Out of Stock)
        query = """
            SELECT itemid, itemname, category, quantityinstock, unitprice, lowstockthreshold, ischargeable, expiry_date,
                   CASE 
                       WHEN quantityinstock <= 0 THEN 'OUT_OF_STOCK'
                       WHEN quantityinstock <= lowstockthreshold THEN 'LOW_STOCK'
                       ELSE 'IN_STOCK'
                   END AS stock_status
            FROM inventoryitem
            ORDER BY category, itemname
        """
        cur.execute(query)
        items = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "data": items}), 200
    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500

# --- 2. บันทึกการใช้งาน/บริการ (Smart Usage) ---
@inventory_bp.route('/usage', methods=['POST'])
@token_required
def record_usage(current_user):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        data = request.get_json()
        item_id = data.get('item_id')
        qty = data.get('quantity', 1)
        booking_detail_id = data.get('booking_detail_id') # ต้องใช้เพื่อผูกกับสัตว์เลี้ยงในห้องนั้น

        # 1. เช็กสต็อกและข้อมูลสินค้า
        cur.execute("SELECT itemname, quantityinstock, unitprice, ischargeable, category FROM inventoryitem WHERE itemid = %s", (item_id,))
        item = cur.fetchone()
        if not item: return jsonify({"error": True, "message": "ไม่พบสินค้า"}), 404
        
        name, stock, price, is_chargeable, category = item

        # 2. ถ้าเป็นสินค้า (ไม่ใช่ Service) ต้องเช็กว่าของพอไหม
        if category != 'SERVICE' and stock < qty:
            return jsonify({"error": True, "message": f"สินค้า '{name}' ไม่พอในสต็อก"}), 400

        # 3. บันทึกประวัติการใช้งาน
        cur.execute("""
            INSERT INTO inventoryusage (bookingdetailid, itemid, quantityused, staffid)
            VALUES (%s, %s, %s, %s)
        """, (booking_detail_id, item_id, qty, current_user['staff_id']))

        # 4. ตัดสต็อก
        if category != 'SERVICE':
            cur.execute("UPDATE inventoryitem SET quantityinstock = quantityinstock - %s WHERE itemid = %s", (qty, item_id))

        # 5. ถ้าต้องคิดเงิน -> ไปอัปเดตยอดใน Invoice ของการจองนั้นๆ
        if is_chargeable:
            added_cost = float(price) * qty
            cur.execute("""
                UPDATE invoice SET servicetotal = servicetotal + %s 
                WHERE bookingid = (SELECT bookingid FROM bookingdetail WHERE bookingdetailid = %s)
            """, (added_cost, booking_detail_id))

        conn.commit()
        return jsonify({"status": "success", "message": f"บันทึกการใช้ {name} เรียบร้อย"}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": True, "message": str(e)}), 500
    finally:
        conn.close()