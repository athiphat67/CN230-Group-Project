import requests

# URL ของ API Login ที่เราสร้างไว้
url = 'http://127.0.0.1:5000/api/auth/login'

# ข้อมูลจำลองที่ Frontend จะส่งมาให้เรา (ใส่ข้อมูลที่มีจริงใน Database)
payload = {
    "username": "admin_somchai",
    "password": "password123" 
}

print(f"กำลังส่งข้อมูลไปที่ {url} ...")

# ยิง Request แบบ POST พร้อมแนบข้อมูลไปด้วย
try:
    response = requests.post(url, json=payload)
    print("Status Code:", response.status_code)
    print("Response Data:", response.json())
except Exception as e:
    print("เกิดข้อผิดพลาด:", e)