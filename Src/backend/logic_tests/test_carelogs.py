import requests

BASE_URL = 'http://127.0.0.1:5000/api/care-logs'

def test_add_care_log():
    print("\n📝 [Staff] พนักงานกำลังบันทึกสถานะรายวันให้น้องมะม่วง...")
    payload = {
        "booking_detail_id": 1, # อ้างอิงจาก ID น้องมะม่วงใน Booking 1 (อิงจาก seed.sql)
        "food_status": "ALL",
        "potty_status": "NORMAL",
        "medication_given": False,
        "staff_note": "น้องมะม่วงกินเก่งมาก ร่าเริงสุดๆ เข้าห้องน้ำปกติครับ",
        "staff_id": 3
    }
    
    response = requests.post(f"{BASE_URL}/add", json=payload)
    print("Status:", response.status_code)
    
    res_data = response.json()
    print("Response:", res_data)
    return res_data.get('log_id')

def test_get_care_logs(booking_id):
    print(f"\n📱 [User] ลูกค้ากำลังเปิดดู Timeline บันทึกการดูแลของการจอง ID: {booking_id}...")
    
    response = requests.get(f"{BASE_URL}/booking/{booking_id}")
    print("Status:", response.status_code)
    
    res_data = response.json()
    if res_data['status'] == 'success':
        logs = res_data['data']
        print(f"✅ พบข้อมูลการดูแล {len(logs)} รายการ:")
        for log in logs:
            print(f"----------------------------------------")
            print(f"🐶 น้อง: {log['petname']} | 🗓️ วันที่: {log['logdate']}")
            print(f"🍽️ กินอาหาร: {log['foodstatus']} | 💩 ขับถ่าย: {log['pottystatus']}")
            print(f"💊 ทานยา: {'ใช่' if log['medicationgiven'] else 'ไม่'}")
            print(f"✍️ โน้ตจากพนักงาน ({log['staffname']}): {log['staffnote']}")

def test_update_care_log(log_id):
    print(f"\n✏️ [Staff] พนักงานกำลังแก้ไขข้อความบันทึก ID: {log_id}...")
    payload = {
        "food_status": "ALL",
        "potty_status": "NORMAL",
        "medication_given": True, # เปลี่ยนจาก False เป็น True ลืมว่าป้อนยาไป
        "staff_note": "น้องมะม่วงกินเก่งมาก ร่าเริงสุดๆ (อัปเดต: ป้อนยาบำรุงขนแล้วครับ)"
    }
    
    response = requests.put(f"{BASE_URL}/update/{log_id}", json=payload)
    print("Status:", response.status_code)
    print("Response:", response.json())

def test_delete_care_log(log_id):
    print(f"\n🗑️ [Staff] พนักงานลบบันทึกการดูแล ID: {log_id} ออกจากระบบ...")
    response = requests.delete(f"{BASE_URL}/delete/{log_id}")
    print("Status:", response.status_code)
    print("Response:", response.json())

if __name__ == "__main__":
    TARGET_BOOKING_ID = 1 # เราใช้ Booking 1 เพราะในระบบมี BookingDetailID=1 แน่นอน
    
    # 1. พนักงานเพิ่ม Log ใหม่
    new_log_id = test_add_care_log()
    
    if new_log_id:
        # 2. ลูกค้าเข้ามาดู Log (จะเห็นอันใหม่ที่เพิ่งเพิ่มไปโผล่ขึ้นมาเป็นอันบนสุด)
        test_get_care_logs(TARGET_BOOKING_ID)
        
        # 3. พนักงานแก้ไขข้อมูล
        test_update_care_log(new_log_id)
        test_get_care_logs(TARGET_BOOKING_ID) # ตรวจสอบการแก้ไข
        
        # 4. ทดสอบลบข้อมูล (ปลดคอมเมนต์ถ้าต้องการลบจริง)
        # test_delete_care_log(new_log_id)