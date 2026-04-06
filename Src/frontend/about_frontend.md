# Frontend API Requirements
> อัปเดตล่าสุด: [15:25 , 5 Apr 2026]
> ผู้รับผิดชอบ frontend: บิ๊ก 

---

## หน้า: Staff Management

### 1. ดึงรายชื่อ staff ทั้งหมด
- Method: GET
- Endpoint: /api/staff
- Request: ไม่มี
- Response ที่ต้องการ:
  [
    {
      "staff_id": 1,
      "first_name": "สมชาย",
      "last_name": "มั่นคง",
      "role": "ADMIN",
      "is_on_duty": true,
      "phone_number": "081-111-0001",
      "staff_email": "somchai@purrfect.com",
      "hire_date": "2022-01-10"
    }
  ]
- สถานะ: 🟡 รอ backend

---

### 2. เพิ่ม staff ใหม่
- Method: POST
- Endpoint: /api/staff
- Request Body:
  {
    "staff_username": "staff_xxx",
    "password": "...",
    "first_name": "...",
    "last_name": "...",
    "role": "STAFF",
    "phone_number": "...",
    "staff_email": "...",
    "hire_date": "..."
  }
- สถานะ: 🟡 รอ backend

---

### 3. แก้ไขข้อมูล staff
- Method: PUT
- Endpoint: /api/staff/{staff_id}
- Request Body: (fields ที่เปลี่ยน)
- สถานะ: 🟡 รอ backend

---

### 4. Deactivate staff
- Method: PATCH
- Endpoint: /api/staff/{staff_id}/deactivate
- Request: ไม่มี
- หมายเหตุ: ต้องการให้เพื่อนเพิ่มคอลัมน์ is_active ใน Staff table ด้วย
- สถานะ: 🟡 รอ backend

---

### 5. ดึง Attendance
- Method: GET
- Endpoint: /api/attendance
- Query Params: ?start_date=2025-04-01&end_date=2025-04-07
- Response ที่ต้องการ:
  [
    {
      "staff_id": 3,
      "first_name": "นริน",
      "work_date": "2025-04-01",
      "clock_in": "08:55",
      "clock_out": "18:05",
      "status": "ONTIME",
      "remark": null
    }
  ]
- สถานะ: 🟡 รอ backend

---

### 6. ดึง Leave Requests
- Method: GET
- Endpoint: /api/leave
- Query Params: ?status=PENDING (optional)
- สถานะ: 🟡 รอ backend

---

### 7. Approve / Reject Leave
- Method: PATCH
- Endpoint: /api/leave/{leave_id}
- Request Body:
  {
    "status": "APPROVED",
    "approved_by": 1
  }
- สถานะ: 🟡 รอ backend

---

## Legend
🟡 รอ backend  
🟢 พร้อมใช้แล้ว  
✅ เชื่อมแล้ว