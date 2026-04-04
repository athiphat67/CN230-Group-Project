import requests

# 1. ตั้งค่า URL หลักของ API
BASE_URL = 'http://127.0.0.1:5000/api/pets'

# ---------------------------------------------------------
# CASE 1: [READ] ดูรายชื่อสัตว์เลี้ยงทั้งหมด
# ---------------------------------------------------------
def test_get_all_pets():
    print("\n🔍 กำลังดึงรายชื่อสัตว์เลี้ยงทั้งหมด...")
    response = requests.get(f"{BASE_URL}/")
    print("Status:", response.status_code)
    print("Data:", response.json())

# ---------------------------------------------------------
# CASE 2: [CREATE] เพิ่มสัตว์เลี้ยงตัวใหม่
# ---------------------------------------------------------
def test_add_pet():
    print("\n➕ กำลังเพิ่มสัตว์เลี้ยงใหม่: ถุงทอง")
    payload = {
        "customer_id": 1,
        "name": "ถุงทอง",
        "species": "CAT",
        "breed": "Thai",
        "weight": 4.5
    }
    response = requests.post(f"{BASE_URL}/add", json=payload)
    print("Status:", response.status_code)
    return response.json().get('pet_id') # คืนค่า ID มาเพื่อใช้เทสต์ต่อ

# ---------------------------------------------------------
# CASE 3: [UPDATE] แก้ไขข้อมูล (เช่น เปลี่ยนน้ำหนัก)
# ---------------------------------------------------------
def test_update_pet(pet_id):
    print(f"\n📝 กำลังอัปเดตน้ำหนักสัตว์เลี้ยง ID: {pet_id}")
    payload = {
        "weight": 5.2,
        "medical_condition": "อ้วนขึ้นเล็กน้อย"
    }
    # ใช้ PUT สำหรับการอัปเดต
    response = requests.put(f"{BASE_URL}/update/{pet_id}", json=payload)
    print("Status:", response.status_code)
    print("Response:", response.json())

# ---------------------------------------------------------
# CASE 4: [DELETE] ลบข้อมูล
# ---------------------------------------------------------
def test_delete_pet(pet_id):
    print(f"\n❌ กำลังลบสัตว์เลี้ยง ID: {pet_id}")
    # ใช้ DELETE สำหรับการลบ
    response = requests.delete(f"{BASE_URL}/delete/{pet_id}")
    print("Status:", response.status_code)
    print("Response:", response.json())

# --- ส่วนของการรันเทสต์ ---
if __name__ == "__main__":
    # 1. ลองดึงข้อมูลดูก่อน
    test_get_all_pets()
    
    # 2. เพิ่มตัวใหม่และเก็บ ID ไว้
    new_id = test_add_pet()
    
    if new_id:
        # 3. ลองอัปเดตตัวที่เพิ่งเพิ่ม
        test_update_pet(new_id)
        
        # 4. ลองลบตัวที่เพิ่งเพิ่ม (เพื่อไม่ให้ข้อมูลขยะค้างใน DB)
        # test_delete_pet(new_id) # ปลดคอมเมนต์ถ้าต้องการลองลบจริง