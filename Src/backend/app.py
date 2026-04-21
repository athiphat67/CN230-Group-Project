"""
app.py (ผู้จัดการร้าน/เซิร์ฟเวอร์หลัก): เป็นตัวรันเปิดร้าน (เปิด Port 5000) 
มันจะเรียกใช้กุญแจจาก config.py เพื่อสร้างท่อเชื่อมต่อไปยังโกดัง (Supabase) 
และเป็นจุดศูนย์กลางที่คอยรับคำสั่งทั้งหมดที่เข้ามายังระบบ
"""
import psycopg2
from config import Config
from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

# import Blueprint routes ต่างๆ เข้ามาใช้งานใน app หลัก
from routes.auth import auth_bp
from routes.pets import pets_bp
from routes.staff import staff_bp
from routes.bookings import bookings_bp
from routes.invoice import invoice_bp
from routes.care_logs import care_logs_bp   
from routes.inventory import inventory_bp
from routes.attendance import attendance_bp
from routes.leave import leave_bp
from routes.audit import audit_bp
from routes.customer import customer_bp

app = Flask(__name__)
app.config.from_object(Config)

CORS(app)

def get_db_connection():
    # เชื่อมต่อโดยใช้ URI จากไฟล์ .env
    return psycopg2.connect(app.config['SQLALCHEMY_DATABASE_URI'])

@app.route('/api/test-connection')
def test_connection():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('SELECT version();')
        db_version = cur.fetchone()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "db_version": db_version[0]}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    
@app.errorhandler(Exception)
def handle_exception(e):
    # ถ้าเป็น Error ปกติของ HTTP (เช่น 404, 405)
    if isinstance(e, HTTPException):
        return jsonify({
            "error": True,
            "code": e.code,
            "message": e.name,
            "detail": e.description
        }), e.code
    
    # ถ้าเป็น Error ระบบ (500)
    return jsonify({
        "error": True,
        "code": 500,
        "message": "Internal Server Error",
        "detail": str(e)
    }), 500
    
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(pets_bp, url_prefix='/api/pets')
app.register_blueprint(staff_bp, url_prefix='/api/staff')
app.register_blueprint(bookings_bp, url_prefix='/api/bookings')
app.register_blueprint(invoice_bp, url_prefix='/api/billing')
app.register_blueprint(care_logs_bp, url_prefix='/api/care-logs')
app.register_blueprint(inventory_bp, url_prefix='/api/inventory')
app.register_blueprint(attendance_bp, url_prefix='/api/attendance')
app.register_blueprint(leave_bp, url_prefix='/api/leave')
app.register_blueprint(audit_bp, url_prefix='/api/audit')
app.register_blueprint(customer_bp, url_prefix='/api/customers')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)