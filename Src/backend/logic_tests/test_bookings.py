import requests

BASE_URL = 'http://127.0.0.1:5000/api/bookings'

def test_search_available_rooms():
    print("\n🔍 ลูกค้ากำลังค้นหาห้องพักสำหรับน้องแมว (CAT)...")
    print("📅 วันที่: 20-04-2026 ถึง 25-04-2026")

    params = {
        "check_in":  "2026-04-20 12:00:00",
        "check_out": "2026-04-25 12:00:00",
        "pet_type":  "CAT"
    }

    response = requests.get(f"{BASE_URL}/available-rooms", params=params)
    print("Status:", response.status_code)

    res_data = response.json()
    print(f"✅ พบห้องว่างทั้งหมด: {res_data.get('total_available')} ห้อง")

    for room in res_data.get('data', []):
        print(f" - ห้อง: {room['roomnumber']} (Size: {room['roomsize']}) | ราคา: {room['rate']} บาท/คืน")


def test_get_bookable_services():
    print("\n🛎️  ลูกค้ากำลังดูรายการบริการพิเศษที่เลือกล่วงหน้าได้...")

    response = requests.get(f"{BASE_URL}/services")
    print("Status:", response.status_code)

    res_data = response.json()
    for svc in res_data.get('data', []):
        print(f" - [{svc['itemid']}] {svc['itemname']}: {svc['unitprice']} บาท")


def test_create_booking():
    print("\n📝 ลูกค้า (ID: 1) จองห้อง A01 สำหรับน้องมะม่วง พร้อมเลือกบริการตัดเล็บล่วงหน้า...")

    payload = {
        "customer_id": 1,
        "pet_id":      1,
        "room_id":     1,   # A01
        "check_in":    "2026-04-20 12:00:00",
        "check_out":   "2026-04-25 12:00:00",
        "services": [
            {"item_id": 12, "quantity": 1}  # บริการตัดเล็บ 80 บาท
        ]
    }

    response = requests.post(f"{BASE_URL}/create", json=payload)
    print("Status:", response.status_code)
    print("Response:", response.json())
    return response.json().get('booking_id')


def test_create_booking_conflict():
    print("\n⚠️  ทดสอบจองห้องเดิม (A01) ในช่วงวันเดิม -> ต้องได้รับ Error 409...")

    payload = {
        "customer_id": 2,
        "pet_id":      9,   # มีโกะ
        "room_id":     1,   # A01 เดิม
        "check_in":    "2026-04-22 12:00:00",
        "check_out":   "2026-04-26 12:00:00",
    }

    response = requests.post(f"{BASE_URL}/create", json=payload)
    print("Status:", response.status_code, "(คาดหวัง 409)")
    print("Response:", response.json())


def test_staff_update_booking(booking_id):
    print(f"\n👨‍💼 พนักงาน (ID: 3) ยืนยัน Check-in สำหรับการจอง ID: {booking_id}...")

    payload = {"status": "ACTIVE", "staff_id": 3}

    response = requests.put(f"{BASE_URL}/update-status/{booking_id}", json=payload)
    print("Status:", response.status_code)
    print("Response:", response.json())


def test_get_customer_bookings():
    customer_id = 1
    print(f"\n📱 ลูกค้า (ID: {customer_id}) ดูประวัติการจองทั้งหมด...")

    response = requests.get(f"{BASE_URL}/customer/{customer_id}")
    print("Status:", response.status_code)

    res_data = response.json()
    if res_data['status'] == 'success':
        bookings = res_data['data']
        print(f"✅ พบประวัติการจองทั้งหมด: {len(bookings)} รายการ")
        for b in bookings:
            print(f"--- Booking ID: {b['bookingid']} ---")
            print(f" 🐶 สัตว์เลี้ยง: {b['petname']} | 🏨 ห้อง: {b['roomnumber']}")
            print(f" 📅 {b['checkindate']} → {b['checkoutdate']}")
            print(f" 💰 Grand Total: {b['grandtotal']} บาท ({b['paymentstatus']}) | 🚩 {b['status']}")
    else:
        print("❌ เกิดข้อผิดพลาด:", res_data['message'])


def test_get_booking_detail(booking_id):
    print(f"\n📋 ดูรายละเอียดการจอง ID: {booking_id} พร้อมบริการที่จองล่วงหน้า...")

    response = requests.get(f"{BASE_URL}/detail/{booking_id}")
    print("Status:", response.status_code)

    res_data = response.json()
    if res_data['status'] == 'success':
        d = res_data['data']
        print(f"🐾 {d['petname']} ({d['species']}) | ห้อง {d['roomnumber']} ({d['roomsize']})")
        print(f"💰 ค่าห้อง: {d['roomtotal']} | ค่าบริการ: {d['servicetotal']} | Grand Total: {d['grandtotal']}")
        print(f"🛎️  บริการที่จองล่วงหน้า:")
        for svc in d.get('pre_booked_services', []):
            print(f"   - {svc['itemname']} x{svc['quantity']} = {svc['subtotal']} บาท")


if __name__ == "__main__":
    test_search_available_rooms()
    test_get_bookable_services()

    new_booking_id = test_create_booking()
    test_create_booking_conflict()  # ต้องได้ error

    if new_booking_id:
        test_get_booking_detail(new_booking_id)
        test_staff_update_booking(new_booking_id)

    test_get_customer_bookings()
