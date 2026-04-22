# Frontend API Requirements — Purrfect Stay Admin Panel
> อัปเดตล่าสุด: [23:30 น. 21 Apr 2026]  
> Frontend Lead: บิ๊ก  
> Base URL: `http://127.0.0.1:5000/api`

---

## Legend
🟡 รอ backend · 🟢 พร้อมใช้แล้ว · ✅ เชื่อมแล้ว · ⚠️ ทำบางส่วน · ❌ ยังไม่ได้ทำ

---

## สถานะหน้าทั้งหมด (Module Coverage)

| หน้า | FR | ไฟล์ | Mock Data | พร้อม Connect API | หมายเหตุ |
|---|---|---|---|---|---|
| Dashboard | — | `dashboard.html` | ⚠️ (เก่า) | 🟡 | ใช้ CSS/JS แยก ไม่ใช้ sidebar.js |
| Bookings | FR3 | `Bookings.html` | ✅ | 🟡 | |
| Pet Care | FR4 | `PetCare.html` | ✅ | 🟡 | |
| Billing | FR5 | `Billing.html` | ✅ | 🟡 | |
| **Pet Profiles** | **FR2** | **`PetProfile.html`** | **✅ NEW** | **🟡** | |
| Staff Management | FR1 | `StaffManagement.html` | ✅ | 🟡 | |
| Inventory | FR6 | `Inventory.html` | ✅ | 🟡 | |
| Analytics | FR6 | `Analytics.html` | ✅ | 🟡 | |
| **Notifications** | **FR7** | **`Notifications.html`** | **✅ NEW** | **🟡** | |
| Audit Trail | FR1.11 | `AuditTrail.html` | ✅ | 🟡 | |
| **Unit Tests** | — | **`unit-tests.html`** | **✅ NEW** | — | 106 tests |

---

## 🔍 Audit ตาม Proposal Report (FR1–FR7)

### FR1 — User & Access Management

| FR | คำอธิบาย (จาก Proposal) | สถานะ Frontend | ไฟล์ที่เกี่ยวข้อง |
|---|---|---|---|
| FR1.1 | OTP registration สำหรับ pet owner | ✅ Mock OTP flow (6 หลัก: 123456) | `register.html`, `forgot-password.html` |
| FR1.2 | Role-based auth → dashboard ตาม role | ✅ Demo login 2 accounts | `login.html` → `dashboard.html` |
| FR1.3 | Manager สร้าง/แก้ไข/deactivate staff | ✅ CRUD modal ครบ | `StaffManagement.html/.js` |
| FR1.4 | บันทึกเวลาเข้า-ออก (clock-in/out) | ✅ Attendance tab (mock) | `StaffManagement.html/.js` |
| FR1.5 | Audit Trail (ADMIN only) | ✅ ครบ + pagination | `AuditTrail.html/.js` |
| FR1.x | FR3.6.1: บันทึกว่าใครยกเลิก booking | ⚠️ ไม่มี `cancelled_by` field ใน mock | `Bookings.js` |

---

### FR2 — Pet Profile Management

| FR | คำอธิบาย (จาก Proposal) | สถานะ Frontend | ไฟล์ที่เกี่ยวข้อง |
|---|---|---|---|
| FR2.1 | สร้าง/แก้ไข pet profile (ชื่อ, species, breed, dob, weight) | ✅ ครบ | `PetProfile.html/.js` |
| FR2.2 | บันทึกประวัติวัคซีน + แนบ PDF cert | ⚠️ บันทึกได้ แต่ **ยังไม่มี PDF upload** | `PetProfile.js` → `openAddVaccine()` |
| FR2.3 | Medical notes, allergies, behavior notes | ✅ ครบ ทั้ง view + edit | `PetProfile.js` |
| FR2.4 | Meal Plan สำหรับแต่ละ pet | ⚠️ **ดูได้ แต่ยังไม่มี UI สร้าง/แก้ไข** meal plan | `PetProfile.js` → `openViewPet()` |

**งานที่ต้องทำเพิ่ม (FR2):**
- [ ] PDF upload input ใน vaccine modal (FR2.2)
- [ ] Modal/tab สำหรับ edit meal plan (FR2.4) → endpoint: `POST /api/pets/{id}/meal-plans`

---

### FR3 — Booking & Front Desk Management

| FR | คำอธิบาย (จาก Proposal) | สถานะ Frontend | ไฟล์ที่เกี่ยวข้อง |
|---|---|---|---|
| FR3.1 | แสดง real-time room availability | 🟢 พร้อมใช้แล้ว | `Bookings.html/.js` |
| FR3.1.1 | เลือกประเภทห้อง | 🟢 พร้อมใช้แล้ว | `modal-new-booking` |
| FR3.2 | คำนวณราคาห้องอัตโนมัติ | 🟢 พร้อมใช้แล้ว | `saveNewBooking()` |
| FR3.3 | Add-on services ตอน booking + ระหว่างพัก | 🟢 พร้อมใช้แล้ว| `Bookings.html` |
| FR3.4 | Check-in / Check-out → อัปเดต status | 🟢 พร้อมใช้แล้ว | `Bookings.js` |
| FR3.5 | Admin เพิ่ม/แก้ไขห้อง (room management) | 🟢 พร้อมใช้แล้ว| — |
| FR3.6 | ยกเลิก booking ก่อน check-in | 🟢 พร้อมใช้แล้ว | `Bookings.js` |
| FR3.6.1 | บันทึกว่าใครยกเลิก เมื่อไร | 🟢 พร้อมใช้แล้ว| `Bookings.js` |

**งานที่ต้องทำเพิ่ม (FR3):**
- [ 🟢 พร้อมใช้แล้ว ] Room Management page (FR3.5) — `GET/PATCH /api/rooms/{room_id}`
- [ 🟢 พร้อมใช้แล้ว] เพิ่ม `cancelled_by` + `cancelled_at` ใน mock data และ cancel API call (FR3.6.1)
- [ 🟢 พร้อมใช้แล้ว ] คำนวณ price_room แบบ real-time ใน new booking form

---

### FR4 — Pet Care & Monitoring

| FR | คำอธิบาย (จาก Proposal) | สถานะ Frontend | ไฟล์ที่เกี่ยวข้อง |
|---|---|---|---|
| FR4.1 | บันทึก Daily Report (อาหาร, ขับถ่าย, อารมณ์, รูป) | ✅ ครบทุก field | `PetCare.html/.js` |
| FR4.2 | Auto-notify owner หลัง submit report | ⚠️ **ทำใน frontend (TODO comment) — backend ต้อง trigger** | `PetCare.js` → `submitReport()` |
| FR4.3 | Reminder 1 วันก่อน check-in | ✅ มีใน Notifications mock (CHECKIN_REMINDER) | `Notifications.js` |

---

### FR5 — Billing & Payment Management

| FR | คำอธิบาย (จาก Proposal) | สถานะ Frontend | ไฟล์ที่เกี่ยวข้อง |
|---|---|---|---|
| FR5.1 | รวมยอด + ออก Invoice | ✅ `openDetail()` แสดง line items ครบ | `Billing.js` |
| FR5.2 | รับชำระหลายวิธี (cash, QR, card) | ✅ radio buttons + `confirmPayment()` | `Billing.js` |
| FR5.3 | ออกใบเสร็จ printable / PDF | ⚠️ **`printInvoice()` เป็น stub → TODO** | `Billing.js` |

**งานที่ต้องทำเพิ่ม (FR5):**
- [ ] Implement `printInvoice()` → window.print() หรือ PDF generation

---

### FR6 — Inventory & Analytics Management

| FR | คำอธิบาย (จาก Proposal) | สถานะ Frontend | ไฟล์ที่เกี่ยวข้อง |
|---|---|---|---|
| FR6.1 | หักสต็อกอัตโนมัติจากการใช้งาน | ❌ **ยังไม่มี — ปัจจุบัน manual เท่านั้น** | `Inventory.js` |
| FR6.1.1 | Alert เมื่อสต็อก < 20% | ✅ `getAlerts()` + alert banner | `Inventory.js` |
| FR6.3 | Management Dashboard (revenue, occupancy, addons) | ✅ Charts + KPI cards | `Analytics.html/.js` |

**งานที่ต้องทำเพิ่ม (FR6):**
- [ ] หน้า/ฟังก์ชัน deduct stock เมื่อใช้อาหาร/อุปกรณ์ (FR6.1)

---

### FR7 — Notification Management

| FR | คำอธิบาย (จาก Proposal) | สถานะ Frontend | ไฟล์ที่เกี่ยวข้อง |
|---|---|---|---|
| FR7.1 | Notify owner เมื่อ booking status เปลี่ยน | ✅ mock notifications ครบทุก type | `Notifications.html/.js` |
| FR7.2 | Notify receptionist เมื่อมี booking ใหม่ | ✅ `NEW_BOOKING_ALERT` ใน mock | `Notifications.js` |

---

## ⚠️ Dashboard — ปัญหาที่ต้องแก้

`dashboard.html` ใช้ **โครงสร้างเก่า** — ยังไม่ migrate มาใช้ `sidebar.js` / `navbar.js` ร่วมกับหน้าอื่น:

| จุดที่ต้องแก้ | รายละเอียด |
|---|---|
| ใช้ CSS แยก (`dashboard.css`) | หน้าอื่นใช้ `main.css` + `components.css` |
| Sidebar hardcode ใน HTML | หน้าอื่นใช้ `Sidebar.render()` จาก `sidebar.js` |
| ไม่มี `id="sidebar-root"` / `id="topbar-root"` | ไม่ compatible กับ shared components |
| `dashboard.js` ยัง stub มาก | ไม่ได้ใช้ `window.API` เลย |

**แนะนำ:** Refactor `dashboard.html` ให้ใช้ pattern เดียวกับหน้าอื่น

---

## สรุป งานที่ยังขาด (ตาม FR Priority)

| Priority | งาน | FR | ความยาก |
|---|---|---|---|
| 🔴 HIGH | Room Management UI | FR3.5 | Medium |
| 🔴 HIGH | Refactor dashboard.html → shared components | — | Easy |
| 🟡 MED | PDF upload สำหรับ vaccine cert | FR2.2 | Easy |
| 🟡 MED | Meal Plan edit UI | FR2.4 | Medium |
| 🟡 MED | printInvoice() → PDF/print | FR5.3 | Easy |
| 🟡 MED | cancelled_by tracking | FR3.6.1 | Easy |
| 🟢 LOW | Auto stock deduction | FR6.1 | Hard |
| 🟢 LOW | Real-time price calculation ใน new booking | FR3.2 | Easy |

---

## โครงสร้างไฟล์ที่ถูกต้อง

```
purrfect-stay/
├── index.html
├── login.html
├── register.html
├── forgot-password.html
├── dashboard.html              ← ⚠️ ต้อง refactor
├── Bookings.html
├── PetCare.html
├── PetProfile.html             ← FR2 (NEW)
├── Billing.html
├── StaffManagement.html
├── Inventory.html
├── Analytics.html
├── Notifications.html          ← FR7 (NEW)
├── AuditTrail.html
├── unit-tests.html             ← NEW (106 tests)
│
├── css/
│   ├── main.css
│   ├── components.css
│   └── pages/
│       ├── Bookings.css
│       ├── PetCare.css
│       ├── PetProfile.css      ← FR2 (NEW)
│       ├── Billing.css
│       ├── StaffManagement.css
│       ├── Inventory.css
│       ├── Analytics.css
│       ├── Notifications.css   ← FR7 (NEW)
│       └── AuditTrail.css
│
└── js/
    ├── components/
    │   ├── sidebar.js          ← UPDATED (Pet Profiles + Notifications)
    │   └── navbar.js
    ├── services/
    │   └── api.js
    └── pages/
        ├── Bookings.js
        ├── PetCare.js
        ├── PetProfile.js       ← FR2 (NEW)
        ├── Billing.js
        ├── StaffManagement.js
        ├── Inventory.js
        ├── Analytics.js
        ├── Notifications.js    ← FR7 (NEW)
        └── AuditTrail.js
```

> ⚠️ **หมายเหตุ:** ไฟล์ CSS/JS ใน /mnt/project ถูกจัดเก็บที่ root level แต่ HTML อ้างอิงผ่าน `css/pages/` และ `js/pages/` — ต้องจัดโฟลเดอร์ก่อน deploy (ดู SETUP_GUIDE.md)

---

## FR1 — User & Access Management (Staff)

### 1.1 Login
- **Method:** POST · **Endpoint:** `/api/auth/login`
- **Request Body:**
  ```json
  { "staff_username": "somchai", "password": "••••••••" }
  ```
- **Response:**
  ```json
  { "access_token": "eyJ...", "staff_id": 1, "first_name": "สมชาย", "last_name": "มั่นคง", "role": "ADMIN" }
  ```
- **สถานะ:** 🟡 รอ backend · Token ใช้เป็น Bearer Auth ทุก request

---

### 1.2 Logout
- **Method:** POST · **Endpoint:** `/api/auth/logout`
- **Response:** `{ "message": "Logged out successfully" }`
- **สถานะ:** 🟡 รอ backend

---

### 1.3 Get All Staff
- **Method:** GET · **Endpoint:** `/api/staff`
- **สถานะ:** 🟡 รอ backend

---

### 1.4 Create Staff
- **Method:** POST · **Endpoint:** `/api/staff`
- **สถานะ:** 🟡 รอ backend

---

### 1.5 Update Staff
- **Method:** PUT · **Endpoint:** `/api/staff/{staff_id}`
- **สถานะ:** 🟡 รอ backend

---

### 1.6 Deactivate Staff
- **Method:** PATCH · **Endpoint:** `/api/staff/{staff_id}/deactivate`
- **สถานะ:** 🟡 รอ backend

---

### 1.7 Clock-In / Clock-Out
- **Method:** POST · **Endpoint:** `/api/attendance/clock`
- **Request Body:** `{ "staff_id": 3, "action": "CLOCK_IN" }`
- **สถานะ:** 🟡 รอ backend

---

### 1.8 Get Attendance Records
- **Method:** GET · **Endpoint:** `/api/attendance`
- **Query Params:** `?start_date=2025-04-01&end_date=2025-04-07&staff_id=3`
- **สถานะ:** 🟡 รอ backend

---

### 1.9 Get Leave Requests
- **Method:** GET · **Endpoint:** `/api/leave`
- **Query Params:** `?status=PENDING`
- **สถานะ:** 🟡 รอ backend

---

### 1.10 Approve / Reject Leave
- **Method:** PATCH · **Endpoint:** `/api/leave/{leave_id}`
- **สถานะ:** 🟡 รอ backend

---

### 1.11 Get Audit Trail
- **Method:** GET · **Endpoint:** `/api/audit`
- **Query Params:** `?staff_id=1&action_type=DELETE&start_date=2026-04-01&end_date=2026-04-30`
- **Response:**
  ```json
  [{
    "audit_id": 5, "staff_id": 1, "staff_name": "สมชาย มั่นคง",
    "action_type": "DELETE", "table_affected": "Invoice",
    "record_id": 23, "description": "ลบ Invoice #INV-0023 ของการจอง BK-0004",
    "timestamp": "2026-04-21T14:30:00"
  }]
  ```
  `action_type` enum: `"CREATE"` | `"UPDATE"` | `"DELETE"` | `"CHECKIN"` | `"CHECKOUT"` | `"APPROVE"`
- **สถานะ:** 🟡 รอ backend · เข้าถึงได้เฉพาะ ADMIN/OWNER

---

## FR2 — Pet Profile Management

### 2.1 Get All Pets
- **Method:** GET · **Endpoint:** `/api/pets`
- **Query Params:** `?owner_id=5&species=cat` (optional)
- **สถานะ:** 🟡 รอ backend

---

### 2.2 Get Pet by ID
- **Method:** GET · **Endpoint:** `/api/pets/{pet_id}`
- **สถานะ:** 🟡 รอ backend

---

### 2.3 Create Pet Profile
- **Method:** POST · **Endpoint:** `/api/pets`
- **สถานะ:** 🟡 รอ backend

---

### 2.4 Update Pet Profile
- **Method:** PUT · **Endpoint:** `/api/pets/{pet_id}`
- **สถานะ:** 🟡 รอ backend

---

### 2.5 Get Vaccination History
- **Method:** GET · **Endpoint:** `/api/pets/{pet_id}/vaccines`
- **สถานะ:** 🟡 รอ backend

---

### 2.6 Add Vaccine Record
- **Method:** POST · **Endpoint:** `/api/pets/{pet_id}/vaccines`
- **หมายเหตุ:** ⚠️ Frontend ยังไม่รองรับ PDF cert upload — ต้องเพิ่ม multipart/form-data
- **สถานะ:** 🟡 รอ backend

---

### 2.7 Get Meal Plans for Pet
- **Method:** GET · **Endpoint:** `/api/pets/{pet_id}/meal-plans`
- **สถานะ:** 🟡 รอ backend

---

### 2.8 Save Meal Plan
- **Method:** POST · **Endpoint:** `/api/pets/{pet_id}/meal-plans`
- **หมายเหตุ:** ⚠️ Frontend ยังไม่มี UI สำหรับ create/edit meal plan
- **สถานะ:** 🟡 รอ backend

---

## FR3 — Booking & Front Desk Management

### 3.1 Get All Bookings
- **Method:** GET · **Endpoint:** `/api/bookings`
- **Query Params:** `?status=CHECKED_IN&start_date=...&end_date=...&pet_name=...&owner_name=...`
- **สถานะ:** 🟡 รอ backend

---

### 3.2 – 3.10 (Booking Actions)
- Create Booking: `POST /api/bookings`
- Check-In: `PATCH /api/bookings/{id}/checkin`
- Check-Out: `PATCH /api/bookings/{id}/checkout`
- Cancel: `PATCH /api/bookings/{id}/cancel`
  - ⚠️ ต้องเพิ่ม `cancelled_by` + `cancelled_at` (FR3.6.1)
- Add Add-on: `POST /api/bookings/{id}/addons`
- Room Availability: `GET /api/rooms/availability`
- All Rooms: `GET /api/rooms`
- Update Room: `PATCH /api/rooms/{room_id}` ← ❌ ไม่มี UI ฝั่ง frontend
- **สถานะทั้งหมด:** 🟡 รอ backend

---

## FR4 — Pet Care & Daily Monitoring

### 4.1 Get Daily Care Reports
- **Method:** GET · **Endpoint:** `/api/care-reports`
- **Query Params:** `?booking_id=BK-0001&date=2025-04-03`
- **สถานะ:** 🟡 รอ backend

---

### 4.2 Create Daily Care Report
- **Method:** POST · **Endpoint:** `/api/care-reports`
- **หมายเหตุ:** Backend ต้อง trigger notification ไป owner หลัง save (FR4.2) — frontend มี TODO comment แล้ว
- **สถานะ:** 🟡 รอ backend

---

### 4.3 Upload Care Report Photos
- **Method:** POST · **Endpoint:** `/api/care-reports/{report_id}/photos`
- **Request:** `multipart/form-data` with field `photos[]`
- **สถานะ:** 🟡 รอ backend

---

## FR5 — Billing & Payment Management

### 5.1 Get Invoices
- **Method:** GET · **Endpoint:** `/api/billing`
- **สถานะ:** 🟡 รอ backend

### 5.2 – 5.4
- Get by ID: `GET /api/billing/{invoice_id}`
- Preview: `POST /api/billing/preview`
- Record Payment: `PATCH /api/billing/{invoice_id}/pay`
- ⚠️ `printInvoice()` ใน `Billing.js` ยังเป็น stub — ต้อง implement PDF/print
- **สถานะทั้งหมด:** 🟡 รอ backend

---

## FR6 — Inventory & Analytics Management

### 6.1 – 6.5
- Get All Items: `GET /api/inventory`
- Add Item: `POST /api/inventory`
- Update Item: `PATCH /api/inventory/{item_id}`
- Alerts: `GET /api/inventory/alerts`
- Dashboard Summary: `GET /api/analytics/dashboard`
- ❌ ยังไม่มี endpoint/UI สำหรับ **auto deduct stock** (FR6.1)
- **สถานะทั้งหมด:** 🟡 รอ backend

---

## FR7 — Notification Management

### 7.1 Get Notifications
- **Method:** GET · **Endpoint:** `/api/notifications`
- **Query Params:** `?is_read=false` (optional)
- **สถานะ:** 🟡 รอ backend

### 7.2 Mark Notification as Read
- **Method:** PATCH · **Endpoint:** `/api/notifications/{notification_id}/read`
- **สถานะ:** 🟡 รอ backend

### 7.3 Mark All as Read
- **Method:** PATCH · **Endpoint:** `/api/notifications/read-all`
- **สถานะ:** 🟡 รอ backend

---

## Customer / Pet Owner APIs (Phase 2)

> ตาม Assumption 4.1.3 ของ Proposal: Phase แรกเป็น **Internal Staff เท่านั้น**

| Endpoint | Method | Description |
|---|---|---|
| `/api/customers` | GET | ดึง customer ทั้งหมด |
| `/api/customers/{id}` | GET/PUT | ดูและแก้ไข customer |
| `/api/customers/register` | POST | สมัครสมาชิก + OTP verify |
| `/api/customers/{id}/pets` | GET | ดูรายการสัตว์เลี้ยงของ customer |

---

## Error Response Format

```json
{
  "error": true,
  "code": 404,
  "message": "Booking not found",
  "detail": "booking_id BK-9999 does not exist"
}
```

HTTP Status: `200` OK · `201` Created · `400` Bad Request · `401` Unauthorized · `403` Forbidden · `404` Not Found · `409` Conflict · `500` Internal Server Error

---

## Auth Header (ทุก request ยกเว้น /auth/login)

```
Authorization: Bearer <access_token>
```
