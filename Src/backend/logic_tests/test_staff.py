import requests

BASE_URL = 'http://127.0.0.1:5000/api/staff'

def test_full_crud_staff():
    # 1. READ (ดึงข้อมูลเดิม)
    print("\n🔍 1. กำลังดึงรายชื่อพนักงานทั้งหมด...")
    res_get = requests.get(f"{BASE_URL}/")
    print("Status:", res_get.status_code)

    # 2. CREATE (เพิ่มพนักงานใหม่)
    print("\n➕ 2. กำลังเพิ่มพนักงานใหม่...")
    payload_add = {
        "username": "staff_newbie",
        "password": "password123",
        "first_name": "สมร",
        "last_name": "รักแมว",
        "role": "STAFF",
        "phone": "080-000-0000",
        "email": "samorn@purrfect.com"
    }
    res_add = requests.post(f"{BASE_URL}/add", json=payload_add)
    print("Status:", res_add.status_code)
    
    new_id = res_add.json().get('staff_id')

    if new_id:
        # 3. UPDATE (เลื่อนขั้นเป็น ADMIN)
        print(f"\n📝 3. กำลังอัปเดตข้อมูลพนักงาน ID: {new_id}...")
        payload_update = {"role": "ADMIN", "is_on_duty": True}
        res_update = requests.put(f"{BASE_URL}/update/{new_id}", json=payload_update)
        print("Status:", res_update.status_code)

        # 4. DELETE (ทดสอบลบพนักงานที่เพิ่งสร้าง)
        print(f"\n❌ 4. กำลังลบพนักงาน ID: {new_id}...")
        res_delete = requests.delete(f"{BASE_URL}/delete/{new_id}")
        print("Status:", res_delete.status_code)

if __name__ == "__main__":
    test_full_crud_staff()