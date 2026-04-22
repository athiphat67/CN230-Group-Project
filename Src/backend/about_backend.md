# about_backend.md — Backend Architecture & API Reference
> Purrfect Stay · Flask Backend  
> Base URL: `http://127.0.0.1:5000/api`  
> Stack: Python 3.10 · Flask · psycopg2 · PostgreSQL (Supabase) · bcrypt · PyJWT  
> อัปเดตล่าสุด: Apr 2026

---

## โครงสร้างไฟล์ Backend

```
app.py              Flask app factory + 14 Blueprint registrations + CORS + error handler
config.py           โหลด .env → app.config['SQLALCHEMY_DATABASE_URI'], app.config['SECRET_KEY']
utils.py            @token_required, @admin_required decorators
update_hash.py      Dev utility: reset all staff passwords → bcrypt("password123")
requirements.txt
dockerfile

routes/
├── auth.py             /api/auth
├── staff.py            /api/staff
├── attendance.py       /api/attendance
├── leave.py            /api/leave
├── audit.py            /api/audit
├── customer.py         /api/customers
├── pets.py             /api/pets
├── rooms.py            /api/rooms
├── bookings.py         /api/bookings
├── care_logs.py        /api/care-reports
├── billing.py          /api/billing
├── inventory.py        /api/inventory
├── analytics.py        /api/analytics
└── norifications.py    /api/notifications  ⚠️ typo ในชื่อไฟล์
```

---

## Auth System

**Algorithm:** HS256  
**Token Expiry:** 12 ชั่วโมงหลัง login  
**Header ทุก request (ยกเว้น `/api/auth/login`):**

```
Authorization: Bearer <access_token>
```

**JWT Payload (Staff):**
```json
{ "staff_id": 1, "role": "ADMIN", "exp": 1745000000 }
```

**Decorators ใน utils.py:**

| Decorator | หน้าที่ |
|:---|:---|
| `@token_required` | ถอดรหัส JWT → ส่ง `current_user` เป็น arg แรก, คืน 401 ถ้า token ไม่ถูกต้อง |
| `@admin_required` | ตรวจ `current_user['role'] in ['ADMIN','OWNER']`, คืน 403 ถ้าไม่ใช่ |

---

## Error Response Format (มาตรฐานทุก endpoint)

```json
{
  "error": true,
  "code": 404,
  "message": "Booking not found",
  "detail": "booking_id BK-9999 does not exist"
}
```

HTTP Status: `200` · `201` · `400` · `401` · `403` · `404` · `409` · `500`

---

## FR1 — User & Access Management

### POST /api/auth/login
**Auth required:** ❌

**Request:**
```json
{ "staff_username": "somchai", "password": "password123" }
```
**Response 200:**
```json
{ "access_token": "eyJ...", "staff_id": 1, "first_name": "สมชาย", "last_name": "มั่นคง", "role": "ADMIN" }
```

---

### POST /api/auth/logout
**Auth required:** ✅ (ต้องมี token แนบมา แต่ไม่ได้ blacklist — client-side logout)

**Response 200:** `{ "message": "Logged out successfully" }`

---

### GET /api/staff
**Auth required:** ✅  
**Response:** array ของ staff ที่ `isActive = TRUE`

```json
{
  "status": "success",
  "data": [{
    "staff_id": 1,
    "staff_username": "somchai",
    "first_name": "สมชาย",
    "last_name": "มั่นคง",
    "role": "ADMIN",
    "is_on_duty": true,
    "phone_number": "081-111-0001",
    "staff_email": "somchai@purrfect.com",
    "hire_date": "2022-01-10"
  }]
}
```

---

### POST /api/staff
**Auth required:** ✅  
**Request:**
```json
{
  "staff_username": "narin",
  "password": "password123",
  "first_name": "นริน",
  "last_name": "พรหมดี",
  "role": "STAFF",
  "phone_number": "082-222-0001",
  "staff_email": "narin@purrfect.com",
  "hire_date": "2023-01-05"
}
```

---

### PUT /api/staff/{staff_id}
**Auth required:** ✅  
**Request:** `first_name, last_name, role, staff_email, phone_number` (ไม่เปลี่ยน username/password)

---

### PATCH /api/staff/{staff_id}/deactivate
**Auth required:** ✅  
**Effect:** `SET "isActive" = FALSE` — ไม่ลบข้อมูลออกจาก DB

---

### POST /api/attendance/clock
**Auth required:** ✅  
**Request:**
```json
{ "staff_id": 3, "action": "CLOCK_IN" }
```
รองรับทั้ง `"CLOCK_IN"/"CLOCK_OUT"` และ `"IN"/"OUT"` (normalize อัตโนมัติ)

**Logic:**
- `CLOCK_IN`: ตรวจสอบว่าไม่ได้ clock-in วันนี้แล้ว → INSERT attendance, SET `isonduty = TRUE`
- `CLOCK_OUT`: UPDATE clockout, SET `isonduty = FALSE`
- Late detection: `clockin > 09:05` → `status = 'Late'`

---

### GET /api/attendance
**Auth required:** ✅  
**Query params:** `?start_date=2026-04-01&end_date=2026-04-30&staff_id=3`

---

### GET /api/leave
**Auth required:** ✅  
**Query params:** `?status=PENDING`

---

### PATCH /api/leave/{leave_id}
**Auth required:** ✅  
**Request:**
```json
{ "status": "APPROVED", "approved_by": 1 }
```

---

### GET /api/audit
**Auth required:** ✅ @admin_required  
**Query params:** `?staff_id=1&action_type=DELETE&start_date=2026-04-01&end_date=2026-04-30`

**Response data fields:**
```json
{
  "audit_id": 5, "staff_id": 1, "staff_name": "สมชาย มั่นคง",
  "action_type": "DELETE", "table_affected": "Invoice",
  "record_id": 23, "description": "ลบ Invoice #INV-0023",
  "timestamp": "2026-04-21T14:30:00"
}
```
`action_type` enum: `CREATE` | `UPDATE` | `DELETE` | `CHECKIN` | `CHECKOUT` | `APPROVE`

---

## FR2 — Pet Profile Management

### GET /api/pets
**Auth required:** ✅  
**Query params:** `?owner_id=5&species=cat`

**Response data fields per pet:**
```json
{
  "pet_id": 1, "owner_id": 5, "owner_name": "สมชาย มั่นคง",
  "owner_phone": "081-111-0001", "owner_email": "...",
  "name": "มะม่วง", "species": "CAT", "breed": "Scottish Fold",
  "sex": "F", "dob": "2021-03-15", "weight_kg": 4.2,
  "coat_color": "น้ำตาล-ขาว", "medical_notes": "ไม่มี",
  "allergies": "ไม่มี", "is_vaccinated": true,
  "vaccine_record": "...", "behavior_notes": "..."
}
```

---

### POST /api/pets
**Auth required:** ✅  
Key mapping: รองรับทั้ง `customerid/owner_id/customer_id`, `weight/weight_kg`, `medicalcondition/medical_notes`, `allergy/allergies`, `isvaccinated/is_vaccinated`

---

### PUT /api/pets/{pet_id}
**Auth required:** ✅  
ใช้ `COALESCE` — ส่งเฉพาะ field ที่ต้องการแก้ไข

---

### DELETE /api/pets/{pet_id}
**Auth required:** ✅

---

### GET /api/pets/{pet_id}/vaccines
**Auth required:** ✅  
คืน array จากตาราง `vaccinationrecord`

---

### POST /api/pets/{pet_id}/vaccines
**Auth required:** ✅  
**Request:** `{ "vaccine_name": "FVRCP", "administered_date": "2025-01-15", "expiry_date": "2026-01-15" }`  
Effect: INSERT + `SET isvaccinated = TRUE`

---

### GET /api/pets/{pet_id}/meal-plans
**Auth required:** ✅  
คืน array จากตาราง `mealplan`

---

### POST /api/pets/{pet_id}/meal-plans
**Auth required:** ✅  
**Request:** array ของมื้ออาหาร → DELETE เก่าแล้ว INSERT ใหม่ทั้งหมด

---

## FR3 — Booking & Front Desk Management

### GET /api/bookings
**Auth required:** ✅  
**Query params:** `?status=CHECKED_IN&start_date=...&end_date=...&pet_name=...&owner_name=...`

**Status mapping (DB → Frontend):**
```
PENDING   → PENDING
ACTIVE    → CHECKED_IN
COMPLETED → CHECKED_OUT
CANCELLED → CANCELLED
```

---

### POST /api/bookings
**Auth required:** ✅  
**Request:**
```json
{
  "customer_id": 5,
  "checkin_date": "2026-04-25",
  "checkout_date": "2026-04-28",
  "total_rate": 4500,
  "pets": [{ "pet_id": 3, "room_id": 12 }],
  "services": [{ "item_id": 7, "quantity": 1, "unit_price": 300 }],
  "notes": "แพ้ไก่"
}
```
**Effect:** INSERT Booking → INSERT BookingDetail → INSERT BookingService → INSERT Invoice (UNPAID)

---

### PATCH /api/bookings/{id}/checkin
**Auth required:** ✅  
**Effect:** `status: PENDING/CONFIRMED → ACTIVE`

---

### PATCH /api/bookings/{id}/checkout
**Auth required:** ✅  
**Request:** `{ "payment_method": "cash" }`  
**Effect:** `status → COMPLETED`, Invoice `paymentstatus → PAID`

---

### PATCH /api/bookings/{id}/cancel
**Auth required:** ✅  
**Request:** `{ "cancelled_by": 1 }` (optional, fallback ใช้ staff จาก token)  
**Effect:** `status → CANCELLED`, บันทึก `cancelledat` + `cancelledbystaffid`

---

### POST /api/bookings/{id}/addons
**Auth required:** ✅  
**Request:** `{ "services": [{ "item_id": 5, "quantity": 1, "unit_price": 200 }] }`  
**Effect:** INSERT BookingService + UPDATE Invoice.servicetotal

---

### GET /api/bookings/services
**Auth required:** ✅  
คืนรายการ InventoryItem ที่ `ischargeable = TRUE` สำหรับใช้ใน booking form

---

### GET /api/rooms
**Auth required:** ✅

---

### GET /api/rooms/availability
**Auth required:** ✅  
**Query params:** `?checkin_date=2026-04-25&checkout_date=2026-04-28&pet_type=CAT`  
Logic: ห้องที่ `pettype = pet_type` AND `status != MAINTENANCE` AND ไม่มี booking ที่ overlap

---

### PATCH /api/rooms/{room_id}
**Auth required:** ✅ @admin_required  
**Request:** `{ "status": "MAINTENANCE", "price_per_night": 800 }`

---

## FR4 — Pet Care & Daily Monitoring

### POST /api/care-reports
**Auth required:** ✅  
**Request:**
```json
{
  "booking_id": 1,
  "pet_id": 3,
  "food_status": "ALL",
  "potty_status": "NORMAL",
  "mood": "HAPPY",
  "behavior_notes": "วิ่งเล่นตลอด",
  "staff_note": "แจ้งเจ้าของว่า...",
  "medication_given": false
}
```
Logic: Resolve `booking_id + pet_id → bookingdetailid` → INSERT carelog

> ⚠️ TODO: trigger notification ไปหาเจ้าของหลัง submit (FR4.2 ยังไม่ implement)

---

### GET /api/care-reports
**Auth required:** ✅  
**Query params:** `?booking_id=1&date=2026-04-21`

---

### GET /api/care-reports/active-stays
**Auth required:** ✅  
คืนรายชื่อสัตว์เลี้ยงที่ `checkindate <= today <= checkoutdate` พร้อม `reported_today` flag

---

### POST /api/care-reports/{report_id}/photos
**Auth required:** ✅  
**Request:** `{ "photo_url": "https://..." }` (Frontend อัปโหลดไป Storage ก่อน แล้วส่ง URL มา)

---

## FR5 — Billing & Payment Management

### GET /api/billing
**Auth required:** ✅  
**Query params:** `?status=PAID&booking_id=5`

**Response data fields:**
```json
{
  "invoice_id": "INV-0001", "invoice_id_raw": 1,
  "booking_id": 1, "owner_name": "สมชาย มั่นคง",
  "pet_names": ["มะม่วง"],
  "checkin_date": "2026-04-20", "checkout_date": "2026-04-24",
  "room_total": 2000, "service_total": 500,
  "vet_cost": 0, "grand_total": 2500, "deposit_paid": 0,
  "payment_status": "PAID", "payment_method": "cash",
  "paid_at": "2026-04-24T15:30:00"
}
```

---

### GET /api/billing/{invoice_id}
**Auth required:** ✅  
เพิ่ม `line_items` array (รายละเอียดแต่ละรายการ)

---

### POST /api/billing/preview
**Auth required:** ✅  
**Request:** `{ "booking_id": 1 }`  
คำนวณ preview invoice ก่อน checkout จาก inventoryusage

---

### PATCH /api/billing/{invoice_id}/pay
**Auth required:** ✅  
**Request:** `{ "payment_method": "qr_promptpay" }`  
**Effect:** Invoice `paymentstatus → PAID`, Booking `status → COMPLETED`

---

## FR6 — Inventory & Analytics

### GET /api/inventory
**Auth required:** ✅  
**Query params:** `?category=food`

---

### POST /api/inventory
**Auth required:** ✅  
**Request:** `{ "name": "...", "category": "food", "quantity_remaining": 20, "unit_price": 150, "reorder_threshold": 5, "is_chargeable": false, "expiry_date": "2026-12-31" }`

---

### PATCH /api/inventory/{item_id}
**Auth required:** ✅  
Field mapping: `quantity_remaining` → `quantityinstock`, `unit_price` → `unitprice`, etc.

---

### GET /api/inventory/alerts
**Auth required:** ✅  
คืน `{ "low_stock": [...], "near_expiry": [...] }` (near_expiry = ภายใน 30 วัน)

---

### POST /api/inventory/usage
**Auth required:** ✅  
**Request:** `{ "item_id": 3, "quantity": 1, "booking_detail_id": 5 }`  
Logic: INSERT InventoryUsage + ลดสต็อก + ถ้า `ischargeable = TRUE` → UPDATE Invoice.servicetotal

---

### GET /api/analytics/dashboard
**Auth required:** ✅ @admin_required  
**Query params:** `?start_date=2026-04-01&end_date=2026-04-30`

**Response structure:**
```json
{
  "status": "success",
  "data": {
    "period":          { "start": "...", "end": "..." },
    "revenue":         { "total": 128500, "room": 95000, "addons": 33500, "avg_bill": 3059, "growth_pct": 12.5, "prev_total": 114200 },
    "bookings":        { "total": 42, "checked_in": 8, "checked_out": 28, "cancelled": 4, "pending": 2 },
    "occupancy_rate":  0.84,
    "low_stock_alert": 2,
    "low_stock_items": [{ "name": "...", "in_stock": 3, "threshold": 5 }],
    "pet_ratio":       { "CAT": 24, "DOG": 18 },
    "top_addons":      [{ "service": "อาบน้ำ", "count": 15, "revenue": 4500 }],
    "daily_revenue":   [{ "date": "2026-04-01", "amount": 4200 }]
  }
}
```

> Source: top_addons ดึงจาก `bookingservice` (บริการเสริมที่คิดเงิน) ไม่ใช่ `inventoryusage`

---

## FR7 — Notification Management

### GET /api/notifications
**Auth required:** ✅  
**Query params:** `?is_read=false`  
กรองตาม `recipient_staff_id = current_user.staff_id` OR `recipient_staff_id IS NULL` (broadcast)

---

### PATCH /api/notifications/{notification_id}/read
**Auth required:** ✅

---

### PATCH /api/notifications/read-all
**Auth required:** ✅

---

## Customers (Phase 2 — Internal Staff Use)

### GET /api/customers
**Query params:** `?q=สมชาย` (ค้นหาด้วยชื่อ/email)

### GET /api/customers/{id}/pets
คืนสัตว์เลี้ยงของ customer รายนี้ — ใช้ใน new booking flow

### POST /api/customers
รองรับ key ทั้ง `firstname/first_name`, `phonenumber/phone_number`, `customeremail/customer_email`  
Auto-generate `customer_username` จาก phone number ถ้าไม่ส่งมา

---

## Blueprint Routing ที่ต้องระวัง

| ปัญหา | แก้ไข |
|:---|:---|
| `/api/billing/preview` ต้องวางก่อน `/<int:invoice_id>` | ✅ แก้ไขแล้วใน billing.py |
| `/api/rooms/availability` ต้องวางก่อน `/<int:room_id>` | ✅ แก้ไขแล้วใน rooms.py |
| `/api/inventory/alerts` ต้องวางก่อน `/<int:item_id>` | ✅ แก้ไขแล้วใน inventory.py |
| `/api/notifications/read-all` ต้องวางก่อน `/<int:id>/read` | ✅ แก้ไขแล้ว |

---

## Thai Timezone Handling

เวลาในระบบใช้ UTC+7 โดยคำนวณผ่าน helper function:
```python
def get_thai_time():
    return datetime.utcnow() + timedelta(hours=7)
```
ใช้กับ: Attendance clock timestamps, Booking cancellation dates, Invoice payment dates