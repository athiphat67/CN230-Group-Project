import requests

BASE_URL    = 'http://127.0.0.1:5000/api/inventory'
INVOICE_URL = 'http://127.0.0.1:5000/api/invoice'

def test_get_inventory():
    print("\n📦 พนักงานเช็กสต็อกสินค้าทั้งหมด...")
    response = requests.get(f"{BASE_URL}/items")
    print("Status:", response.status_code)

    data = response.json()
    if data['status'] == 'success':
        for item in data['data'][:6]:
            icon = "🔴" if item['stockstatus'] == 'OUT_OF_STOCK' else "🟡" if item['stockstatus'] == 'LOW_STOCK' else "🟢"
            print(f" {icon} [{item['category']}] {item['itemname']} - เหลือ: {item['quantityinstock']} (ราคา {item['unitprice']} บ.)")

def test_check_invoice(booking_id):
    print(f"\n📄 ใบแจ้งหนี้การจอง ID: {booking_id}")
    response = requests.get(f"{INVOICE_URL}/{booking_id}")
    data = response.json()
    if data['status'] == 'success':
        inv = data['data']
        print(f"💰 ค่าห้อง: {inv['roomtotal']} | ค่าบริการ: {inv['servicetotal']} | Grand Total: {inv['grandtotal']}")

def test_record_usage_supply(booking_id):
    print(f"\n🧴 CASE 1: เบิก SUPPLY (แชมพู ID=8) สำหรับการจอง ID: {booking_id}...")
    payload = {"booking_id": booking_id, "item_id": 8, "quantity_used": 1}
    response = requests.post(f"{BASE_URL}/usage", json=payload)
    print("Status:", response.status_code)
    print("Response:", response.json())

def test_record_usage_service(booking_id):
    print(f"\n🛀 CASE 2: บันทึก SERVICE (อาบน้ำสุนัขใหญ่ ID=11) สำหรับการจอง ID: {booking_id}...")
    payload = {"booking_id": booking_id, "item_id": 11, "quantity_used": 1}
    response = requests.post(f"{BASE_URL}/usage", json=payload)
    print("Status:", response.status_code)
    print("Response:", response.json())

def test_record_usage_out_of_stock(booking_id):
    print(f"\n⛔ CASE 3: เบิกเกินสต็อก -> ต้องได้ Error...")
    payload = {"booking_id": booking_id, "item_id": 8, "quantity_used": 9999}
    response = requests.post(f"{BASE_URL}/usage", json=payload)
    print("Status:", response.status_code, "(คาดหวัง 400)")
    print("Response:", response.json())

def test_record_usage_inactive_booking():
    print(f"\n⛔ CASE 4: เบิกของใน Booking ที่ COMPLETED -> ต้องได้ Error...")
    payload = {"booking_id": 1, "item_id": 8, "quantity_used": 1}  # Booking 1 = COMPLETED
    response = requests.post(f"{BASE_URL}/usage", json=payload)
    print("Status:", response.status_code, "(คาดหวัง 400)")
    print("Response:", response.json())

if __name__ == "__main__":
    TARGET_BOOKING_ID = 10  # Booking 10 = ACTIVE (อาร์โนลด์)

    test_get_inventory()

    print("\n--- ก่อนเบิก ---")
    test_check_invoice(TARGET_BOOKING_ID)

    test_record_usage_supply(TARGET_BOOKING_ID)
    test_record_usage_service(TARGET_BOOKING_ID)
    test_record_usage_out_of_stock(TARGET_BOOKING_ID)
    test_record_usage_inactive_booking()

    print("\n--- หลังเบิก (ServiceTotal ต้องเพิ่มขึ้นจากบริการอาบน้ำ) ---")
    test_check_invoice(TARGET_BOOKING_ID)
