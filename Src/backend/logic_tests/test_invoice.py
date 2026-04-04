import requests

BASE_URL = 'http://127.0.0.1:5000/api/invoice'

def test_get_invoice():
    # [FIX] เปลี่ยนจาก 17 เป็น 12 เพื่อให้ตรงกับข้อมูลใน seed.sql
    booking_id = 12 
    print(f"\n📄 กำลังเรียกดูรายละเอียดใบแจ้งหนี้สำหรับการจอง ID: {booking_id}...")
    
    response = requests.get(f"{BASE_URL}/{booking_id}")
    print("Status:", response.status_code)
    
    res_data = response.json()
    if res_data['status'] == 'success':
        inv = res_data['data']
        print(f"✅ พบใบเสร็จของคุณ: {inv['firstname']} {inv['lastname']}")
        print(f"💰 ยอดรวมสุทธิ (Grand Total): {inv['grandtotal']} บาท")
        print(f"💳 ยอดที่มัดจำไว้แล้ว (Deposit): {inv['depositpaid']} บาท")
        print(f"🚩 สถานะปัจจุบัน: {inv['paymentstatus']}")

def test_pay_invoice():
    # [FIX] เปลี่ยนจาก 17 เป็น 12
    booking_id = 12
    print(f"\n💸 ลูกค้ากำลังโอนเงินเพิ่มเติม สำหรับการจอง ID: {booking_id}...")
    
    payload = {
        "payment_method": "TRANSFER",
        "staff_id": 3,
        "amount_paid": 3305.00  # ลองจ่ายยอดที่เหลือให้ครบ (GrandTotal ID 12 คือ 3805)
    }
    
    response = requests.put(f"{BASE_URL}/pay/{booking_id}", json=payload)
    print("Status:", response.status_code)
    print("Response:", response.json())

if __name__ == "__main__":
    test_get_invoice()  # 1. ดูบิลก่อน (ควรจะเป็น PARTIAL)
    test_pay_invoice()  # 2. จ่ายเงินเพิ่ม
    test_get_invoice()  # 3. ดูบิลหลังจ่าย (ถ้าจ่ายครบควรเป็น PAID)