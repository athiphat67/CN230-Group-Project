import requests
import datetime

BASE_URL = 'http://127.0.0.1:5000/api/auth'

# 1. เทสต์สมัครสมาชิก
def test_customer_register():
    print("\n📝 กำลังทดสอบระบบสมัครสมาชิกลูกค้าใหม่...")
    
    # สร้าง Timestamp เพื่อให้ Username และ Email ไม่ซ้ำกัน
    timestamp = datetime.datetime.now().strftime("%H%M%S")
    unique_username = f"user_jaiidee_{timestamp}"
    unique_email = f"jaidee_{timestamp}@example.com"
    password = "mypassword123"

    payload = {
        "username": unique_username,
        "password": password,
        "first_name": "ใจดี",
        "last_name": "รักสัตว์",
        "phone": "089-999-9999",
        "email": unique_email,
        "address": "123 ถ.สุขุมวิท กรุงเทพฯ"
    }
    
    response = requests.post(f"{BASE_URL}/register", json=payload)
    print("Status:", response.status_code)
    print("Response:", response.json())
    
    # ส่งคืนค่า username และ password ที่เพิ่งสร้างกลับไปให้ระบบนำไปใช้ต่อ
    return unique_username, password

# 2. เทสต์ล็อกอินด้วยบัญชีลูกค้าที่เพิ่งสมัคร
def test_customer_login(username, password):
    print("\n🔑 กำลังทดสอบระบบ Login สำหรับลูกค้า...")
    payload = {
        "username": username,
        "password": password 
    }
    
    # ยิงไปที่ Endpoint ของลูกค้าโดยเฉพาะ
    response = requests.post(f"{BASE_URL}/login/customer", json=payload)
    print("Status:", response.status_code)
    print("Response:", response.json())

if __name__ == "__main__":
    # ขั้นตอนที่ 1: รันเทสต์สมัครสมาชิกและรับ username/password ที่ไม่ซ้ำกลับมา
    new_username, new_password = test_customer_register()
    
    # ขั้นตอนที่ 2: นำ username/password ใหม่ไปทดสอบล็อกอินทันที
    test_customer_login(new_username, new_password)