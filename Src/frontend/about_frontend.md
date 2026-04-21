# Frontend API Requirements — Purrfect Stay Admin Panel
> อัปเดตล่าสุด: [21 Apr 2026]  
> Frontend Lead: บิ๊ก (Chotiwit)  
> Base URL: `http://127.0.0.1:5000/api`

---

## Legend
🟡 รอ backend · 🟢 พร้อมใช้แล้ว · ✅ เชื่อมแล้ว

---

## FR1 — User & Access Management (Staff)

### 1.1 Login
- **Method:** POST
- **Endpoint:** `/api/auth/login`
- **Request Body:**
  ```json
  {
    "staff_username": "somchai",
    "password": "••••••••"
  }
  ```
- **Response:**
  ```json
  {
    "access_token": "eyJ...",
    "staff_id": 1,
    "first_name": "สมชาย",
    "last_name": "มั่นคง",
    "role": "ADMIN"
  }
  ```
- **สถานะ:** 🟡 รอ backend  
- **หมายเหตุ:** Token ใช้เป็น Bearer Auth ใน header ทุก request ต่อไป

---

### 1.2 Logout
- **Method:** POST
- **Endpoint:** `/api/auth/logout`
- **Request:** ไม่มี body (ใช้ token จาก header)
- **Response:** `{ "message": "Logged out successfully" }`
- **สถานะ:** 🟡 รอ backend

---

### 1.3 Get All Staff
- **Method:** GET
- **Endpoint:** `/api/staff`
- **Response:**
  ```json
  [
    {
      "staff_id": 1,
      "first_name": "สมชาย",
      "last_name": "มั่นคง",
      "role": "ADMIN",
      "is_on_duty": true,
      "phone_number": "081-111-0001",
      "staff_email": "somchai@purrfect.com",
      "hire_date": "2022-01-10",
      "is_active": true
    }
  ]
  ```
- **สถานะ:** 🟡 รอ backend

---

### 1.4 Create Staff
- **Method:** POST
- **Endpoint:** `/api/staff`
- **Request Body:**
  ```json
  {
    "staff_username": "staff_xxx",
    "password": "••••••••",
    "first_name": "...",
    "last_name": "...",
    "role": "STAFF",
    "phone_number": "0XX-XXX-XXXX",
    "staff_email": "xxx@purrfect.com",
    "hire_date": "2026-04-21"
  }
  ```
- **Response:** Staff object ที่เพิ่งสร้าง
- **สถานะ:** 🟡 รอ backend

---

### 1.5 Update Staff
- **Method:** PUT
- **Endpoint:** `/api/staff/{staff_id}`
- **Request Body:** fields ที่เปลี่ยน (partial)
  ```json
  {
    "phone_number": "081-999-8888",
    "role": "ADMIN"
  }
  ```
- **สถานะ:** 🟡 รอ backend

---

### 1.6 Deactivate Staff
- **Method:** PATCH
- **Endpoint:** `/api/staff/{staff_id}/deactivate`
- **Request:** ไม่มี body
- **Response:** `{ "message": "Staff deactivated" }`
- **สถานะ:** 🟡 รอ backend  
- **หมายเหตุ:** ต้องการคอลัมน์ `is_active` ใน Staff table

---

### 1.7 Clock-In / Clock-Out
- **Method:** POST
- **Endpoint:** `/api/attendance/clock`
- **Request Body:**
  ```json
  {
    "staff_id": 3,
    "action": "CLOCK_IN"
  }
  ```
  `action` enum: `"CLOCK_IN"` | `"CLOCK_OUT"`
- **Response:**
  ```json
  {
    "attendance_id": 42,
    "staff_id": 3,
    "action": "CLOCK_IN",
    "timestamp": "2026-04-21T09:00:00"
  }
  ```
- **สถานะ:** 🟡 รอ backend

---

### 1.8 Get Attendance Records
- **Method:** GET
- **Endpoint:** `/api/attendance`
- **Query Params:** `?start_date=2025-04-01&end_date=2025-04-07&staff_id=3` (optional)
- **Response:**
  ```json
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
  ```
  `status` enum: `"ONTIME"` | `"LATE"` | `"ABSENT"`
- **สถานะ:** 🟡 รอ backend

---

### 1.9 Get Leave Requests
- **Method:** GET
- **Endpoint:** `/api/leave`
- **Query Params:** `?status=PENDING` (optional)
- **Response:**
  ```json
  [
    {
      "leave_id": 1,
      "staff_id": 4,
      "first_name": "แพร",
      "last_name": "งามพร้อม",
      "leave_type": "ลากิจ",
      "start_date": "2025-04-15",
      "end_date": "2025-04-16",
      "reason": "ย้ายบ้านใหม่",
      "status": "PENDING",
      "approved_by": null
    }
  ]
  ```
  `status` enum: `"PENDING"` | `"APPROVED"` | `"REJECTED"`
- **สถานะ:** 🟡 รอ backend

---

### 1.10 Approve / Reject Leave
- **Method:** PATCH
- **Endpoint:** `/api/leave/{leave_id}`
- **Request Body:**
  ```json
  {
    "status": "APPROVED",
    "approved_by": 1
  }
  ```
- **สถานะ:** 🟡 รอ backend

---

### 1.11 Get Audit Trail
- **Method:** GET
- **Endpoint:** `/api/audit`
- **Query Params:** `?staff_id=1&action_type=DELETE&start_date=2026-04-01&end_date=2026-04-30`
- **Response:**
  ```json
  [
    {
      "audit_id": 5,
      "staff_id": 1,
      "staff_name": "สมชาย มั่นคง",
      "action_type": "DELETE",
      "table_affected": "Invoice",
      "record_id": 23,
      "description": "ลบ Invoice #INV-0023 ของการจอง BK-0004",
      "timestamp": "2026-04-21T14:30:00"
    }
  ]
  ```
  `action_type` enum: `"CREATE"` | `"UPDATE"` | `"DELETE"` | `"CHECKIN"` | `"CHECKOUT"` | `"APPROVE"`
- **สถานะ:** 🟡 รอ backend  
- **หมายเหตุ:** เข้าถึงได้เฉพาะ ADMIN / OWNER เท่านั้น

---

## FR2 — Pet Profile Management

### 2.1 Get All Pets
- **Method:** GET
- **Endpoint:** `/api/pets`
- **Query Params:** `?owner_id=5` (optional)
- **Response:**
  ```json
  [
    {
      "pet_id": 1,
      "owner_id": 5,
      "owner_name": "อาพิญา ศ.",
      "name": "มะม่วง",
      "species": "cat",
      "breed": "Scottish Fold",
      "sex": "F",
      "dob": "2021-03-15",
      "weight_kg": 4.2,
      "coat_color": "น้ำตาล-ขาว",
      "photo_url": null,
      "medical_notes": "แพ้ไก่",
      "allergies": "ไก่",
      "behavior_notes": "ขี้อาย ต้องใช้เวลาทำความรู้จัก"
    }
  ]
  ```
- **สถานะ:** 🟡 รอ backend

---

### 2.2 Get Pet by ID
- **Method:** GET
- **Endpoint:** `/api/pets/{pet_id}`
- **Response:** Pet object เดี่ยว
- **สถานะ:** 🟡 รอ backend

---

### 2.3 Create Pet Profile
- **Method:** POST
- **Endpoint:** `/api/pets`
- **Request Body:**
  ```json
  {
    "owner_id": 5,
    "name": "มะม่วง",
    "species": "cat",
    "breed": "Scottish Fold",
    "sex": "F",
    "dob": "2021-03-15",
    "weight_kg": 4.2,
    "coat_color": "น้ำตาล-ขาว",
    "medical_notes": "แพ้ไก่",
    "allergies": "ไก่",
    "behavior_notes": ""
  }
  ```
- **สถานะ:** 🟡 รอ backend

---

### 2.4 Update Pet Profile
- **Method:** PUT
- **Endpoint:** `/api/pets/{pet_id}`
- **Request Body:** fields ที่เปลี่ยน
- **สถานะ:** 🟡 รอ backend

---

### 2.5 Get Vaccination History
- **Method:** GET
- **Endpoint:** `/api/pets/{pet_id}/vaccines`
- **Response:**
  ```json
  [
    {
      "vaccine_id": 1,
      "pet_id": 1,
      "vaccine_name": "FVRCP",
      "administered_date": "2025-01-10",
      "expiry_date": "2026-01-10",
      "vet_clinic": "คลินิกสัตวแพทย์สุขสันต์",
      "cert_url": null
    }
  ]
  ```
- **สถานะ:** 🟡 รอ backend

---

### 2.6 Add Vaccine Record
- **Method:** POST
- **Endpoint:** `/api/pets/{pet_id}/vaccines`
- **Request Body:**
  ```json
  {
    "vaccine_name": "FVRCP",
    "administered_date": "2025-01-10",
    "expiry_date": "2026-01-10",
    "vet_clinic": "คลินิกสัตวแพทย์สุขสันต์"
  }
  ```
- **สถานะ:** 🟡 รอ backend

---

### 2.7 Get Meal Plans for Pet
- **Method:** GET
- **Endpoint:** `/api/pets/{pet_id}/meal-plans`
- **Response:**
  ```json
  [
    {
      "meal_plan_id": 1,
      "pet_id": 1,
      "meal_period": "MORNING",
      "food_type": "Royal Canin Kitten",
      "quantity_grams": 80,
      "notes": "ผสมน้ำอุ่นนิดหน่อย"
    }
  ]
  ```
  `meal_period` enum: `"MORNING"` | `"MIDDAY"` | `"EVENING"`
- **สถานะ:** 🟡 รอ backend

---

### 2.8 Save Meal Plan
- **Method:** POST
- **Endpoint:** `/api/pets/{pet_id}/meal-plans`
- **Request Body:**
  ```json
  [
    { "meal_period": "MORNING",  "food_type": "Royal Canin Kitten", "quantity_grams": 80, "notes": "" },
    { "meal_period": "MIDDAY",   "food_type": "Royal Canin Kitten", "quantity_grams": 60, "notes": "" },
    { "meal_period": "EVENING",  "food_type": "Royal Canin Kitten", "quantity_grams": 80, "notes": "" }
  ]
  ```
- **สถานะ:** 🟡 รอ backend

---

## FR3 — Booking & Front Desk Management

### 3.1 Get All Bookings
- **Method:** GET
- **Endpoint:** `/api/bookings`
- **Query Params:**
  ```
  ?status=CHECKED_IN        (optional: PENDING|CONFIRMED|CHECKED_IN|CHECKED_OUT|CANCELLED)
  &start_date=2025-04-01    (optional)
  &end_date=2025-04-30      (optional)
  &pet_name=มะม่วง          (optional, search)
  &owner_name=อาพิญา        (optional, search)
  ```
- **Response:**
  ```json
  [
    {
      "booking_id": "BK-0001",
      "pet_id": 1,
      "pet_name": "มะม่วง",
      "pet_species": "cat",
      "breed": "Scottish Fold",
      "owner_id": 5,
      "owner_name": "อาพิญา ศ.",
      "owner_phone": "081-234-5678",
      "room_id": 1,
      "room_number": "A01",
      "room_type": "Standard (AC)",
      "checkin_date": "2025-04-02",
      "checkout_date": "2025-04-06",
      "status": "CHECKED_IN",
      "addons": ["อาบน้ำ", "ถ่ายรูป"],
      "notes": "แพ้ไก่",
      "price_room": 2000,
      "price_addons": 350,
      "created_at": "2025-04-01T10:30:00"
    }
  ]
  ```
  `status` enum: `"PENDING"` | `"CONFIRMED"` | `"CHECKED_IN"` | `"CHECKED_OUT"` | `"CANCELLED"`
- **สถานะ:** 🟡 รอ backend

---

### 3.2 Get Booking by ID
- **Method:** GET
- **Endpoint:** `/api/bookings/{booking_id}`
- **Response:** Booking object เดี่ยว (เหมือนด้านบน + invoice_id ถ้ามี)
- **สถานะ:** 🟡 รอ backend

---

### 3.3 Create Booking
- **Method:** POST
- **Endpoint:** `/api/bookings`
- **Request Body:**
  ```json
  {
    "pet_id": 1,
    "owner_id": 5,
    "room_id": 1,
    "checkin_date": "2025-04-02",
    "checkout_date": "2025-04-06",
    "addons": ["bathing", "photo"],
    "notes": "แพ้ไก่ ห้ามให้อาหารที่มีส่วนผสมของไก่"
  }
  ```
- **Response:** Booking object ที่สร้างใหม่ พร้อม `booking_id`
- **สถานะ:** 🟡 รอ backend  
- **หมายเหตุ:** ราคาต้องถูก lock ณ เวลาสร้าง booking

---

### 3.4 Check-In
- **Method:** PATCH
- **Endpoint:** `/api/bookings/{booking_id}/checkin`
- **Request:** ไม่มี body  
  (หรือ `{ "checked_in_by": 1 }` ถ้าต้องการ log staff ที่ทำ)
- **Response:**
  ```json
  {
    "booking_id": "BK-0001",
    "status": "CHECKED_IN",
    "checked_in_at": "2026-04-21T09:15:00"
  }
  ```
- **สถานะ:** 🟡 รอ backend

---

### 3.5 Check-Out
- **Method:** PATCH
- **Endpoint:** `/api/bookings/{booking_id}/checkout`
- **Request Body:**
  ```json
  {
    "payment_method": "cash",
    "checked_out_by": 1
  }
  ```
  `payment_method` enum: `"cash"` | `"qr_promptpay"` | `"credit_card"`
- **Response:**
  ```json
  {
    "booking_id": "BK-0001",
    "status": "CHECKED_OUT",
    "invoice_id": "INV-0023",
    "total_amount": 2350,
    "checked_out_at": "2026-04-21T12:00:00"
  }
  ```
- **สถานะ:** 🟡 รอ backend

---

### 3.6 Cancel Booking
- **Method:** PATCH
- **Endpoint:** `/api/bookings/{booking_id}/cancel`
- **Request Body:**
  ```json
  {
    "cancelled_by": 1,
    "cancel_reason": "เจ้าของป่วย"
  }
  ```
- **Response:** `{ "booking_id": "...", "status": "CANCELLED" }`
- **สถานะ:** 🟡 รอ backend

---

### 3.7 Add Add-on Service to Active Booking
- **Method:** POST
- **Endpoint:** `/api/bookings/{booking_id}/addons`
- **Request Body:**
  ```json
  {
    "service_type": "grooming",
    "scheduled_date": "2025-04-04",
    "notes": ""
  }
  ```
- **สถานะ:** 🟡 รอ backend

---

### 3.8 Get Room Availability
- **Method:** GET
- **Endpoint:** `/api/rooms/availability`
- **Query Params:** `?checkin_date=2025-04-05&checkout_date=2025-04-10`
- **Response:**
  ```json
  [
    {
      "room_id": 3,
      "room_number": "A02",
      "room_type": "Standard (AC)",
      "capacity": "small-medium",
      "price_per_night": 500,
      "is_available": true,
      "status": "AVAILABLE"
    }
  ]
  ```
  `status` enum: `"AVAILABLE"` | `"OCCUPIED"` | `"CLEANING"` | `"MAINTENANCE"`
- **สถานะ:** 🟡 รอ backend

---

### 3.9 Get All Rooms
- **Method:** GET
- **Endpoint:** `/api/rooms`
- **Response:** array of room objects (เหมือน availability แต่ไม่มี date filter)
- **สถานะ:** 🟡 รอ backend

---

### 3.10 Update Room Status (Admin only)
- **Method:** PATCH
- **Endpoint:** `/api/rooms/{room_id}`
- **Request Body:**
  ```json
  {
    "status": "CLEANING",
    "price_per_night": 550
  }
  ```
- **สถานะ:** 🟡 รอ backend

---

## FR4 — Pet Care & Daily Monitoring

### 4.1 Get Daily Care Reports
- **Method:** GET
- **Endpoint:** `/api/care-reports`
- **Query Params:** `?booking_id=BK-0001&date=2025-04-03`
- **Response:**
  ```json
  [
    {
      "report_id": 1,
      "booking_id": "BK-0001",
      "pet_id": 1,
      "pet_name": "มะม่วง",
      "report_date": "2025-04-03",
      "food_intake": "กินหมด 80g",
      "bowel_activity": "ปกติ",
      "mood": "HAPPY",
      "behavior_notes": "วิ่งเล่น ร้องขอกอด",
      "photo_urls": [],
      "reported_by": 3,
      "caretaker_name": "นริน พรหมดี",
      "created_at": "2025-04-03T18:00:00"
    }
  ]
  ```
  `mood` enum: `"HAPPY"` | `"NEUTRAL"` | `"ANXIOUS"` | `"SICK"`
- **สถานะ:** 🟡 รอ backend

---

### 4.2 Create Daily Care Report
- **Method:** POST
- **Endpoint:** `/api/care-reports`
- **Request Body:**
  ```json
  {
    "booking_id": "BK-0001",
    "report_date": "2025-04-03",
    "food_intake": "กินหมด 80g",
    "bowel_activity": "ปกติ",
    "mood": "HAPPY",
    "behavior_notes": "วิ่งเล่น ร้องขอกอด",
    "reported_by": 3
  }
  ```
- **Response:** Report object ที่สร้างใหม่
- **สถานะ:** 🟡 รอ backend  
- **หมายเหตุ:** Backend ต้อง trigger notification ไป owner หลัง save

---

### 4.3 Upload Care Report Photos
- **Method:** POST
- **Endpoint:** `/api/care-reports/{report_id}/photos`
- **Request:** `multipart/form-data` with field `photos[]`
- **Response:** `{ "report_id": 1, "photo_urls": ["..."] }`
- **สถานะ:** 🟡 รอ backend

---

## FR5 — Billing & Payment Management

### 5.1 Get Invoices
- **Method:** GET
- **Endpoint:** `/api/billing`
- **Query Params:** `?status=PAID&booking_id=BK-0001`
  `status` enum: `"PENDING_PAYMENT"` | `"PAID"`
- **Response:**
  ```json
  [
    {
      "invoice_id": "INV-0023",
      "booking_id": "BK-0001",
      "pet_name": "มะม่วง",
      "owner_name": "อาพิญา ศ.",
      "issue_date": "2025-04-06",
      "line_items": [
        { "description": "ค่าห้อง A01 (Standard AC) × 4 คืน", "amount": 2000 },
        { "description": "อาบน้ำ",  "amount": 200 },
        { "description": "ถ่ายรูป", "amount": 150 }
      ],
      "subtotal": 2350,
      "discount": 0,
      "total_amount": 2350,
      "payment_status": "PAID",
      "payment_method": "cash",
      "paid_at": "2025-04-06T12:30:00"
    }
  ]
  ```
- **สถานะ:** 🟡 รอ backend

---

### 5.2 Get Invoice by ID
- **Method:** GET
- **Endpoint:** `/api/billing/{invoice_id}`
- **Response:** Invoice object เดี่ยว (เหมือนด้านบน)
- **สถานะ:** 🟡 รอ backend

---

### 5.3 Generate Invoice (pre-checkout preview)
- **Method:** POST
- **Endpoint:** `/api/billing/preview`
- **Request Body:**
  ```json
  { "booking_id": "BK-0001" }
  ```
- **Response:** Invoice object (ยังไม่บันทึก ใช้แค่แสดงผลก่อน checkout)
- **สถานะ:** 🟡 รอ backend

---

### 5.4 Record Payment (mark as PAID)
- **Method:** PATCH
- **Endpoint:** `/api/billing/{invoice_id}/pay`
- **Request Body:**
  ```json
  {
    "payment_method": "qr_promptpay",
    "received_by": 1
  }
  ```
- **Response:** Invoice object พร้อม `payment_status: "PAID"` และ `paid_at`
- **สถานะ:** 🟡 รอ backend

---

## FR6 — Inventory & Analytics Management

### 6.1 Get All Inventory Items
- **Method:** GET
- **Endpoint:** `/api/inventory`
- **Query Params:** `?category=food` (optional)
  `category` enum: `"food"` | `"supplies"` | `"medicine"`
- **Response:**
  ```json
  [
    {
      "item_id": 1,
      "name": "Royal Canin Kitten",
      "category": "food",
      "unit": "กิโลกรัม",
      "quantity_remaining": 8.5,
      "quantity_total": 20,
      "reorder_threshold": 4,
      "expiry_date": "2026-06-30",
      "low_stock": false,
      "near_expiry": false,
      "last_updated": "2026-04-20T08:00:00"
    }
  ]
  ```
- **สถานะ:** 🟡 รอ backend

---

### 6.2 Add Inventory Item
- **Method:** POST
- **Endpoint:** `/api/inventory`
- **Request Body:**
  ```json
  {
    "name": "Royal Canin Kitten",
    "category": "food",
    "unit": "กิโลกรัม",
    "quantity_remaining": 20,
    "quantity_total": 20,
    "reorder_threshold": 4,
    "expiry_date": "2026-06-30"
  }
  ```
- **สถานะ:** 🟡 รอ backend

---

### 6.3 Update Inventory (restock / adjust)
- **Method:** PATCH
- **Endpoint:** `/api/inventory/{item_id}`
- **Request Body:**
  ```json
  {
    "quantity_remaining": 18.5,
    "expiry_date": "2026-06-30"
  }
  ```
- **สถานะ:** 🟡 รอ backend

---

### 6.4 Get Low-Stock / Near-Expiry Alerts
- **Method:** GET
- **Endpoint:** `/api/inventory/alerts`
- **Response:**
  ```json
  {
    "low_stock": [
      { "item_id": 3, "name": "Cat Litter", "quantity_remaining": 2, "reorder_threshold": 5 }
    ],
    "near_expiry": [
      { "item_id": 7, "name": "Flea Treatment", "expiry_date": "2026-05-01" }
    ]
  }
  ```
- **สถานะ:** 🟡 รอ backend

---

### 6.5 Get Dashboard Summary (Analytics)
- **Method:** GET
- **Endpoint:** `/api/analytics/dashboard`
- **Query Params:** `?start_date=2026-04-01&end_date=2026-04-30`
- **Response:**
  ```json
  {
    "period": { "start": "2026-04-01", "end": "2026-04-30" },
    "revenue": {
      "total": 128500,
      "room": 95000,
      "addons": 33500
    },
    "bookings": {
      "total": 42,
      "checked_in": 12,
      "checked_out": 28,
      "cancelled": 2
    },
    "occupancy_rate": 0.84,
    "top_addons": [
      { "service": "อาบน้ำ", "count": 18, "revenue": 3600 },
      { "service": "ตัดขน", "count": 12, "revenue": 4200 }
    ],
    "daily_revenue": [
      { "date": "2026-04-01", "amount": 4200 }
    ]
  }
  ```
- **สถานะ:** 🟡 รอ backend  
- **หมายเหตุ:** เข้าถึงได้เฉพาะ ADMIN / OWNER

---

## FR7 — Notification Management

### 7.1 Get Notifications (for current staff/owner)
- **Method:** GET
- **Endpoint:** `/api/notifications`
- **Query Params:** `?is_read=false` (optional)
- **Response:**
  ```json
  [
    {
      "notification_id": 1,
      "recipient_type": "owner",
      "recipient_id": 5,
      "type": "CARE_REPORT",
      "title": "รายงานดูแลรายวัน — มะม่วง",
      "body": "นริน พรหมดี ได้อัปเดตรายงานดูแลน้องมะม่วงประจำวันที่ 3 เม.ย. แล้ว",
      "booking_id": "BK-0001",
      "is_read": false,
      "sent_at": "2025-04-03T18:05:00"
    }
  ]
  ```
  `type` enum: `"BOOKING_CONFIRMED"` | `"BOOKING_CANCELLED"` | `"CHECKIN_REMINDER"` | `"CARE_REPORT"` | `"PAYMENT_CONFIRMED"` | `"NEW_BOOKING_ALERT"`
- **สถานะ:** 🟡 รอ backend

---

### 7.2 Mark Notification as Read
- **Method:** PATCH
- **Endpoint:** `/api/notifications/{notification_id}/read`
- **Request:** ไม่มี body
- **Response:** `{ "notification_id": 1, "is_read": true }`
- **สถานะ:** 🟡 รอ backend

---

### 7.3 Mark All as Read
- **Method:** PATCH
- **Endpoint:** `/api/notifications/read-all`
- **Request:** ไม่มี body
- **สถานะ:** 🟡 รอ backend

---

## Customer / Pet Owner APIs (ถ้าจะทำในอนาคต)

> ตาม Assumption 1.3 ของ Proposal: Phase แรกเป็น **Internal Staff เท่านั้น**  
> ส่วนนี้เป็น API ที่อาจต้องเพิ่มในอนาคตสำหรับ Customer Portal

| Endpoint | Method | Description |
|---|---|---|
| `/api/customers` | GET | ดึง customer ทั้งหมด |
| `/api/customers/{id}` | GET/PUT | ดูและแก้ไข customer |
| `/api/customers/register` | POST | สมัครสมาชิก + OTP verify |
| `/api/customers/{id}/pets` | GET | ดูรายการสัตว์เลี้ยงของ customer |

---

## Error Response Format (ทุก endpoint)

```json
{
  "error": true,
  "code": 404,
  "message": "Booking not found",
  "detail": "booking_id BK-9999 does not exist"
}
```

HTTP Status Codes ที่ใช้:
- `200` OK
- `201` Created
- `400` Bad Request (validation error)
- `401` Unauthorized (token หมดอายุหรือไม่มี)
- `403` Forbidden (role ไม่มีสิทธิ์)
- `404` Not Found
- `409` Conflict (เช่น ห้องถูกจองแล้ว)
- `500` Internal Server Error

---

## Auth Header (ทุก request ยกเว้น /auth/login)

```
Authorization: Bearer <access_token>
```

---

## หน้าที่มีอยู่แล้ว

| หน้า | ไฟล์ | สถานะ |
|---|---|---|
| Dashboard | `dashboard.html` | ✅ UI พร้อม (mock data) |
| Staff Management | `StaffManagement.html` | ✅ UI พร้อม (mock data) |
| Bookings | `Bookings.html` | ✅ UI พร้อม (mock data) |

## หน้าที่ต้องทำต่อ

| หน้า | โมดูล | Priority |
|---|---|---|
| `Billing.html` | FR5 | HIGH |
| `PetCare.html` | FR4 | HIGH |
| `Inventory.html` | FR6 | MEDIUM |
| `Analytics.html` | FR6 dashboard | MEDIUM |
| `AuditTrail.html` | FR1.11 | LOW |