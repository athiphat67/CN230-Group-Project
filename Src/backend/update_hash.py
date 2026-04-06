import psycopg2
import bcrypt
from app import app, get_db_connection

with app.app_context():
    conn = get_db_connection()
    cur = conn.cursor()
    
    # 1. สร้าง Hash ของจริงจากคำว่า 'password123'
    # .encode('utf-8') เพื่อแปลงข้อความเป็น bytes ก่อนเข้ารหัสตามข้อกำหนดของ bcrypt
    real_hash = bcrypt.hashpw(b"password123", bcrypt.gensalt()).decode('utf-8')
    
    # 2. นำ Hash ของจริงไปอัปเดตทับข้อมูลจำลองของพนักงานทุกคนในตาราง
    cur.execute("UPDATE Staff SET PasswordHash = %s", (real_hash,))
    conn.commit()
    
    cur.close()
    conn.close()
    print("✅ อัปเดตรหัสผ่านทุกคนใน Database เป็น bcrypt ของจริงเรียบร้อยแล้ว!")