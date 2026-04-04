import requests

BASE_URL = 'http://127.0.0.1:5000/api/auth'

# 1. เทสต์สมัครสมาชิก
def test_customer_register():
    print("\n📝 กำลังทดสอบระบบสมัครสมาชิกลูกค้าใหม่...")
    payload = {
        "username": "user_jaiidee",
        "password": "mypassword123",
        "first_name": "ใจดี",
        "last_name": "รักสัตว์",
        "phone": "089-999-9999",
        "email": "jaidee@example.com",
        "address": "123 ถ.สุขุมวิท กรุงเทพฯ"
    }
    response = requests.post(f"{BASE_URL}/register", json=payload)
    print("Status:", response.status_code)
    print("Response:", response.json())

# 2. เทสต์ล็อกอินด้วยบัญชีลูกค้าที่เพิ่งสมัคร
def test_customer_login():
    print("\n🔑 กำลังทดสอบระบบ Login สำหรับลูกค้า...")
    payload = {
        "username": "user_jaiidee",
        "password": "mypassword123" # ใช้รหัสเดียวกับที่สมัครเมื่อกี้
    }
    
    # ยิงไปที่ Endpoint ของลูกค้าโดยเฉพาะ
    response = requests.post(f"{BASE_URL}/login/customer", json=payload)
    print("Status:", response.status_code)
    print("Response:", response.json())

if __name__ == "__main__":
    # ขั้นตอนที่ 1: รันคำสั่งนี้เพื่อเพิ่มคอลัมน์ใน Supabase (Task 0) ให้เรียบร้อยก่อน
    
    # ขั้นตอนที่ 2: รันเทสต์
    test_customer_register() # อาจจะคอมเมนต์บรรทัดนี้ทิ้ง ถ้ารันสมัครผ่านไปแล้ว 1 รอบเพื่อไม่ให้ Username ซ้ำ
    test_customer_login()