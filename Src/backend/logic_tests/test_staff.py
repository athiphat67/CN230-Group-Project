import requests
import datetime

# ลบ / ออกจาก BASE_URL เพื่อป้องกันปัญหา Trailing Slash
BASE_URL = 'http://127.0.0.1:5000/api/staff'

def test_full_crud_staff():
    # 1. READ (ดึงข้อมูลเดิม)
    print("\n🔍 1. กำลังดึงรายชื่อพนักงานทั้งหมด...")
    # เรียก API แบบไม่มี / ต่อท้าย
    res_get = requests.get(BASE_URL)
    print("Status:", res_get.status_code)
    if res_get.status_code == 200:
        print("Response:", res_get.json().get('total'), "records found.")

    # 2. CREATE (เพิ่มพนักงานใหม่)
    print("\n➕ 2. กำลังเพิ่มพนักงานใหม่...")
    
    # สร้างตัวเลขจากเวลาปัจจุบันเพื่อเอาไปต่อท้ายชื่อ ไม่ให้ข้อมูลซ้ำกัน
    timestamp = datetime.datetime.now().strftime("%H%M%S")
    unique_username = f"staff_newbie_{timestamp}"
    unique_email = f"samorn_{timestamp}@purrfect.com"

    # แก้ไขชื่อ Key ให้ตรงกับที่ staff.py ต้องการ
    payload_add = {
        "staff_username": unique_username,
        "password": "password123",
        "first_name": "สมร",
        "last_name": "รักแมว",
        "role": "STAFF",
        "phone_number": "080-000-0000",
        "staff_email": unique_email,
        "hire_date": datetime.date.today().isoformat() 
    }
    # ยิง POST ไปที่ BASE_URL ตรงๆ ไม่ต้องมี /add
    res_add = requests.post(BASE_URL, json=payload_add)
    print("Status:", res_add.status_code)
    print("Response:", res_add.json())
    
    new_id = res_add.json().get('staff_id')

    if new_id:
        # 3. UPDATE (เลื่อนขั้นเป็น ADMIN)
        print(f"\n📝 3. กำลังอัปเดตข้อมูลพนักงาน ID: {new_id}...")
        payload_update = {"role": "ADMIN", "is_on_duty": True}
        # ยิง PUT ไปที่ /id ไม่ต้องมี /update
        res_update = requests.put(f"{BASE_URL}/{new_id}", json=payload_update)
        print("Status:", res_update.status_code)
        print("Response:", res_update.json())

        # 4. DELETE (ทดสอบลบ/ปิดการใช้งานพนักงานที่เพิ่งสร้าง)
        print(f"\n❌ 4. กำลังปิดการใช้งานพนักงาน ID: {new_id}...")
        # ใช้ PATCH และ /id/deactivate
        res_delete = requests.patch(f"{BASE_URL}/{new_id}/deactivate")
        print("Status:", res_delete.status_code)
        print("Response:", res_delete.json())

if __name__ == "__main__":
    test_full_crud_staff()