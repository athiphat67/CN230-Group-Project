from flask import Blueprint, request, jsonify, current_app
import psycopg2
import psycopg2.extras

inventory_bp = Blueprint('inventory', __name__)

def get_db_connection():
    return psycopg2.connect(current_app.config['SQLALCHEMY_DATABASE_URI'])

# --- 1. API ดูรายการคลังสินค้าทั้งหมด ---
@inventory_bp.route('/items', methods=['GET'])
def get_inventory_items():
    try:
        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        query = """
            SELECT ItemID, ItemName, Category, QuantityInStock, UnitPrice, LowStockThreshold, IsChargeable,
                   CASE
                       WHEN QuantityInStock = 0 THEN 'OUT_OF_STOCK'
                       WHEN QuantityInStock <= LowStockThreshold THEN 'LOW_STOCK'
                       ELSE 'IN_STOCK'
                   END AS StockStatus
            FROM InventoryItem
            ORDER BY Category, ItemName
        """
        cur.execute(query)
        items = cur.fetchall()

        cur.close()
        conn.close()
        return jsonify({"status": "success", "total_items": len(items), "data": items}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# --- 2. API เบิกของ / บันทึกบริการระหว่างเข้าพัก ---
@inventory_bp.route('/usage', methods=['POST'])
def record_smart_usage():
    conn = None
    try:
        data              = request.get_json()
        booking_detail_id = data.get('booking_detail_id') # [FIX] เปลี่ยนจาก booking_id เป็น detail_id
        item_id           = data.get('item_id')
        qty               = data.get('quantity_used', 1)

        if not all([booking_detail_id, item_id]) or qty <= 0:
            return jsonify({"status": "error", "message": "กรุณาส่ง booking_detail_id, item_id และ quantity_used (> 0)"}), 400

        conn = get_db_connection()
        cur  = conn.cursor()

        # 1. หา BookingID ต้นทาง เพื่อเอาไปเช็กสถานะและคิดเงิน
        cur.execute("SELECT BookingID FROM BookingDetail WHERE BookingDetailID = %s", (booking_detail_id,))
        b_row = cur.fetchone()
        if not b_row:
            conn.close()
            return jsonify({"status": "error", "message": "ไม่พบสัตว์เลี้ยงในห้องพักนี้"}), 404
        actual_booking_id = b_row[0]

        # 2. ตรวจสอบว่า Booking ยัง ACTIVE อยู่
        cur.execute("SELECT Status FROM Booking WHERE BookingID = %s", (actual_booking_id,))
        booking_row = cur.fetchone()
        if booking_row[0] != 'ACTIVE':
            conn.close()
            return jsonify({"status": "error", "message": f"ไม่สามารถเบิกของได้ เพราะการจองมีสถานะ '{booking_row[0]}' (ต้องเป็น ACTIVE)"}), 400

        # 3. ดึงข้อมูลสินค้า (ตรวจสอบ IsChargeable)
        cur.execute("SELECT ItemName, Category, UnitPrice, QuantityInStock, IsChargeable FROM InventoryItem WHERE ItemID = %s", (item_id,))
        item = cur.fetchone()
        if not item:
            conn.close()
            return jsonify({"status": "error", "message": "ไม่พบสินค้านี้ในระบบ"}), 404

        name, category, price, stock, is_chargeable = item[0], item[1], item[2], item[3], item[4]

        # 4. บันทึกประวัติการใช้งาน
        cur.execute("""
            INSERT INTO InventoryUsage (BookingDetailID, ItemID, QuantityUsed)
            VALUES (%s, %s, %s)
        """, (booking_detail_id, item_id, qty))

        message = ""
        # 5. หักสต็อก (หมวดของใช้และอาหาร)
        if category in ('SUPPLY', 'FOOD'):
            if stock < qty:
                conn.rollback()
                conn.close()
                return jsonify({"status": "error", "message": f"สต็อก '{name}' ไม่พอ (เหลือ {stock} ชิ้น)"}), 400

            cur.execute("UPDATE InventoryItem SET QuantityInStock = QuantityInStock - %s WHERE ItemID = %s", (qty, item_id))
            message += f"เบิก '{name}' {qty} ชิ้น (เหลือ {stock - qty}) "

        # 6. บวกเงินในบิล ถ้าเป็น SERVICE หรือของที่ต้องคิดเงินเพิ่ม
        if category == 'SERVICE' or is_chargeable:
            added_cost = float(price) * qty
            cur.execute("UPDATE Invoice SET ServiceTotal = ServiceTotal + %s WHERE BookingID = %s", (added_cost, actual_booking_id))
            message += f"| คิดเงินลงบิลเพิ่ม {added_cost:.2f} บาท"
        else:
            message += "| (ฟรี ไม่คิดเงินเพิ่ม)"

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"status": "success", "message": message.strip()}), 201

    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500