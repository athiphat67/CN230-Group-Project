"""
inventory.py — FR6 Inventory Management
GET   /api/inventory              รายการสินค้าทั้งหมด
POST  /api/inventory              เพิ่มสินค้าใหม่
PATCH /api/inventory/{item_id}    อัปเดต restock / adjust
GET   /api/inventory/alerts       แจ้งเตือน low stock & near expiry
POST  /api/inventory/usage        บันทึกการใช้งาน (internal)
"""
from flask import Blueprint, request, jsonify, current_app
from datetime import date, timedelta
import psycopg2
import psycopg2.extras
from utils import token_required

inventory_bp = Blueprint('inventory', __name__)

def get_db_connection():
    return psycopg2.connect(current_app.config['SQLALCHEMY_DATABASE_URI'])


# ── 1. รายการสินค้าทั้งหมด (GET /api/inventory) ───────────────────────
@inventory_bp.route('', methods=['GET'])
@token_required
def get_inventory_items(current_user):
    try:
        category = request.args.get('category', '').strip()

        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        query = """
            SELECT itemid          AS item_id,
                   itemname        AS name,
                   category,
                   quantityinstock AS quantity_remaining,
                   unitprice       AS unit_price,
                   lowstockthreshold AS reorder_threshold,
                   ischargeable    AS is_chargeable,
                   expiry_date,
                   CASE
                       WHEN quantityinstock <= 0                 THEN 'OUT_OF_STOCK'
                       WHEN quantityinstock <= lowstockthreshold THEN 'LOW_STOCK'
                       ELSE 'IN_STOCK'
                   END AS stock_status,
                   (quantityinstock <= lowstockthreshold)  AS low_stock,
                   (expiry_date IS NOT NULL AND expiry_date <= CURRENT_DATE + INTERVAL '30 days') AS near_expiry
            FROM inventoryitem
        """
        params = []
        if category:
            query += " WHERE LOWER(category) = %s"
            params.append(category.lower())
        query += " ORDER BY category, itemname"

        cur.execute(query, params)
        items = cur.fetchall()
        cur.close()
        conn.close()

        for it in items:
            it['unit_price'] = float(it['unit_price'] or 0)
            if it['expiry_date']:
                it['expiry_date'] = it['expiry_date'].strftime('%Y-%m-%d')

        return jsonify({"status": "success", "data": items}), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500


# ── 2. เพิ่มสินค้าใหม่ (POST /api/inventory) ──────────────────────────
@inventory_bp.route('', methods=['POST'])
@token_required
def add_inventory_item(current_user):
    try:
        data = request.get_json()

        conn = get_db_connection()
        cur  = conn.cursor()
        cur.execute("""
            INSERT INTO inventoryitem
                (itemname, category, quantityinstock, unitprice, lowstockthreshold, ischargeable, expiry_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING itemid;
        """, (
            data.get('name'),
            data.get('category'),
            data.get('quantity_remaining', 0),
            data.get('unit_price', 0),
            data.get('reorder_threshold', 0),
            data.get('is_chargeable', True),
            data.get('expiry_date'),
        ))
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "status": "success",
            "message": f"เพิ่มสินค้า '{data.get('name')}' เรียบร้อย",
            "item_id": new_id,
        }), 201

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500


# ── 3. Alerts: Low Stock & Near Expiry  ───────────────────────────────
#  ⚠️ ต้องวางก่อน /<int:item_id> เพื่อป้องกัน Flask routing conflict
@inventory_bp.route('/alerts', methods=['GET'])
@token_required
def get_alerts(current_user):
    try:
        conn = get_db_connection()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Low stock
        cur.execute("""
            SELECT itemid AS item_id, itemname AS name,
                   quantityinstock AS quantity_remaining, lowstockthreshold AS reorder_threshold
            FROM inventoryitem
            WHERE quantityinstock <= lowstockthreshold
            ORDER BY quantityinstock
        """)
        low_stock = cur.fetchall()

        # Near expiry (within 30 days)
        cur.execute("""
            SELECT itemid AS item_id, itemname AS name, expiry_date
            FROM inventoryitem
            WHERE expiry_date IS NOT NULL
              AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'
              AND expiry_date >= CURRENT_DATE
            ORDER BY expiry_date
        """)
        near_expiry = cur.fetchall()

        cur.close()
        conn.close()

        for n in near_expiry:
            if n['expiry_date']:
                n['expiry_date'] = n['expiry_date'].strftime('%Y-%m-%d')

        return jsonify({
            "status": "success",
            "data": {
                "low_stock":   list(low_stock),
                "near_expiry": list(near_expiry),
            }
        }), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500


# ── 4. อัปเดต Restock / Adjust (PATCH /api/inventory/{item_id}) ───────
@inventory_bp.route('/<int:item_id>', methods=['PATCH'])
@token_required
def update_inventory_item(current_user, item_id):
    try:
        data = request.get_json()

        updates, params = [], []
        field_map = {
            'quantity_remaining': 'quantityinstock',
            'unit_price':         'unitprice',
            'reorder_threshold':  'lowstockthreshold',
            'expiry_date':        'expiry_date',
            'name':               'itemname',
            'category':           'category',
        }
        for fe_key, db_col in field_map.items():
            if fe_key in data:
                updates.append(f"{db_col} = %s")
                params.append(data[fe_key])

        if not updates:
            return jsonify({"error": True, "message": "ไม่มีข้อมูลที่ต้องอัปเดต"}), 400

        params.append(item_id)
        conn = get_db_connection()
        cur  = conn.cursor()
        cur.execute(f"UPDATE inventoryitem SET {', '.join(updates)} WHERE itemid = %s", params)

        if cur.rowcount == 0:
            conn.rollback()
            return jsonify({"error": True, "code": 404, "message": "ไม่พบสินค้า"}), 404

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"status": "success", "message": f"อัปเดตสินค้า ID {item_id} เรียบร้อย"}), 200

    except Exception as e:
        return jsonify({"error": True, "message": str(e)}), 500


# ── 5. บันทึกการใช้งาน (POST /api/inventory/usage) ────────────────────
@inventory_bp.route('/usage', methods=['POST'])
@token_required
def record_usage(current_user):
    conn = get_db_connection()
    cur  = conn.cursor()
    try:
        data              = request.get_json()
        item_id           = data.get('item_id')
        qty               = data.get('quantity', 1)
        booking_detail_id = data.get('booking_detail_id')

        cur.execute("""
            SELECT itemname, quantityinstock, unitprice, ischargeable, category
            FROM inventoryitem WHERE itemid = %s
        """, (item_id,))
        item = cur.fetchone()
        if not item:
            return jsonify({"error": True, "message": "ไม่พบสินค้า"}), 404

        name, stock, price, is_chargeable, category = item

        if category != 'SERVICE' and stock < qty:
            return jsonify({"error": True, "message": f"สินค้า '{name}' ไม่พอในสต็อก"}), 400

        cur.execute("""
            INSERT INTO inventoryusage (bookingdetailid, itemid, quantityused, staffid)
            VALUES (%s, %s, %s, %s)
        """, (booking_detail_id, item_id, qty, current_user['staff_id']))

        if category != 'SERVICE':
            cur.execute(
                "UPDATE inventoryitem SET quantityinstock = quantityinstock - %s WHERE itemid = %s",
                (qty, item_id)
            )

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
        cur.close()
        conn.close()