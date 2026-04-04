"""
app.py (ผู้จัดการร้าน/เซิร์ฟเวอร์หลัก): เป็นตัวรันเปิดร้าน (เปิด Port 5000) 
มันจะเรียกใช้กุญแจจาก config.py เพื่อสร้างท่อเชื่อมต่อไปยังโกดัง (Supabase) 
และเป็นจุดศูนย์กลางที่คอยรับคำสั่งทั้งหมดที่เข้ามายังระบบ
"""
import psycopg2
from config import Config
from flask import Flask, jsonify

# import Blueprint routes ต่างๆ เข้ามาใช้งานใน app หลัก
from routes.auth import auth_bp
from routes.pets import pets_bp
from routes.staff import staff_bp
from routes.bookings import bookings_bp
from routes.invoice import invoice_bp
from routes.care_logs import care_logs_bp   
from routes.inventory import inventory_bp

app = Flask(__name__)
app.config.from_object(Config)

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
    
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(pets_bp, url_prefix='/api/pets')
app.register_blueprint(staff_bp, url_prefix='/api/staff')
app.register_blueprint(bookings_bp, url_prefix='/api/bookings')
app.register_blueprint(invoice_bp, url_prefix='/api/invoice')
app.register_blueprint(care_logs_bp, url_prefix='/api/care-logs')
app.register_blueprint(inventory_bp, url_prefix='/api/inventory')

if __name__ == '__main__':
    app.run(debug=True)