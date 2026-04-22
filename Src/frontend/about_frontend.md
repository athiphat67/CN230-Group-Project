# about_frontend.md — Frontend Architecture & FR Coverage
> Purrfect Stay Admin Panel  
> Frontend Lead: บิ๊ก (Athiphat)  
> Base URL: `http://127.0.0.1:5000/api`  
> อัปเดตล่าสุด: Apr 2026

---

## Legend

🟢 เชื่อม API แล้ว / พร้อมใช้งาน · 🟡 รอ Backend · ✅ ครบถ้วน · ⚠️ บางส่วน · ❌ ยังไม่ทำ

---

## สถานะหน้าทั้งหมด

| หน้า | FR | ไฟล์ | เชื่อม API | หมายเหตุ |
|:---|:---|:---|:---:|:---|
| Landing Page | — | `index.html` | — | Static, ไม่ต้อง login |
| Login | FR1 | `login.html` | 🟢 | ยิง `/api/auth/login` จริง |
| Register | FR1 | `register.html` | 🟢 | ยิง `/api/staff` จริง |
| Forgot Password | FR1 | `forgot-password.html` | — | Mock OTP (123456) |
| Dashboard | — | `dashboard.html` | 🟢 | ดึงจาก API จริง |
| Bookings | FR3 | `bookings.html` | 🟢 | Full CRUD + 4-step modal |
| Pet Profiles | FR2 | `PetProfile.html` | 🟢 | CRUD + vaccines |
| Pet Care | FR4 | `PetCare.html` | 🟢 | Active stays + care reports |
| Billing | FR5 | `Billing.html` | 🟢 | Invoice + payment + print |
| Staff Management | FR1 | `StaffManagement.html` | 🟢 | Staff + Attendance + Leave |
| Inventory | FR6 | `Inventory.html` | ⚠️ | Mock data, loadFromAPI() มีอยู่แต่ comment ไว้ |
| Analytics | FR6 | `Analytics.html` | 🟢 | Chart.js + live API |
| Notifications | FR7 | `Notifications.html` | 🟢 | ยิง `/api/notifications` จริง |
| Audit Trail | FR1 | `AuditTrail.html` | 🟢 | ยิง `/api/audit` จริง |
| Unit Tests | — | `unit-tests.html` | — | 106 pure JS tests |

---

## FR Coverage ตาม Proposal Report

### FR1 — User & Access Management

| FR | คำอธิบาย | สถานะ | ไฟล์ |
|:---|:---|:---:|:---|
| FR1.1 | OTP registration สำหรับ staff | ✅ | `register.html` (3-step), `forgot-password.html` (4-step, OTP mock: `123456`) |
| FR1.2 | Role-based auth → dashboard ตาม role | ✅ | `login.html` → `dashboard.html` |
| FR1.3 | Manager สร้าง/แก้ไข/deactivate staff | ✅ | `StaffManagement.html/.js` |
| FR1.4 | บันทึกเวลาเข้า-ออก (clock-in/out) | ✅ | `dashboard.html` (clock button), `StaffManagement.html` (Attendance tab) |
| FR1.5 | Audit Trail (ADMIN only) | ✅ | `AuditTrail.html/.js` |
| FR3.6.1 | บันทึก cancelled_by / cancelled_at | ✅ | `Bookings.js` |

---

### FR2 — Pet Profile Management

| FR | คำอธิบาย | สถานะ | ไฟล์ |
|:---|:---|:---:|:---|
| FR2.1 | สร้าง/แก้ไข pet profile | ✅ | `PetProfile.html/.js` (3-tab modal) |
| FR2.2 | บันทึกประวัติวัคซีน | ⚠️ | Vaccine modal มีแล้ว แต่ **ไม่มี PDF upload** |
| FR2.3 | Medical notes, allergies, behavior notes | ✅ | `PetProfile.js` — Health tab |
| FR2.4 | Meal Plan สำหรับแต่ละ pet | ⚠️ | **อ่านได้** แต่ **ยังไม่มี UI แก้ไข** meal plan |

**งานที่ต้องทำเพิ่ม (FR2):**
- [ ] PDF upload ใน vaccine modal → `multipart/form-data` ไป `/api/pets/{id}/vaccines`
- [ ] Modal สำหรับ edit meal plan → `POST /api/pets/{id}/meal-plans`

---

### FR3 — Booking & Front Desk Management

| FR | คำอธิบาย | สถานะ | ไฟล์ |
|:---|:---|:---:|:---|
| FR3.1 | Real-time room availability | ✅ | `bookings.html/.js` |
| FR3.1.1 | เลือกประเภทห้อง | ✅ | `modal-new-booking` Step 3 |
| FR3.2 | คำนวณราคาห้องอัตโนมัติ (real-time) | ✅ | `updatePricePreview()` ใน Bookings.js |
| FR3.3 | Add-on services ตอน booking + ระหว่างพัก | ✅ | `openAddServiceModal()` ใน Bookings.js |
| FR3.4 | Check-in / Check-out → อัปเดต status | ✅ | `confirmCheckin()`, `confirmCheckout()` |
| FR3.5 | Admin เพิ่ม/แก้ไขห้อง | ✅ | ผ่าน `PATCH /api/rooms/{room_id}` |
| FR3.6 | ยกเลิก booking ก่อน check-in | ✅ | `cancelBooking()` |
| FR3.6.1 | บันทึกว่าใครยกเลิก เมื่อไร | ✅ | แสดงใน detail modal + cancelled_by field |

**New Booking Flow (4 Steps):**
```
Step 1: ค้นหาลูกค้าที่มีอยู่ (search) หรือสร้างใหม่ inline
Step 2: เลือกสัตว์เลี้ยงที่มีอยู่ หรือเพิ่มใหม่ inline
Step 3: เลือกวันที่ + ค้นหาห้องว่าง + เลือกห้อง
Step 4: Add-on Services (optional) + Price Preview
```

---

### FR4 — Pet Care & Monitoring

| FR | คำอธิบาย | สถานะ | ไฟล์ |
|:---|:---|:---:|:---|
| FR4.1 | บันทึก Daily Report (อาหาร, ขับถ่าย, อารมณ์, รูป) | ✅ | `PetCare.html/.js` |
| FR4.2 | Auto-notify owner หลัง submit report | ⚠️ | Frontend ส่ง API แล้ว แต่ **Backend ยังไม่ trigger notification** |
| FR4.3 | Reminder 1 วันก่อน check-in | ✅ | แสดงใน Notifications page |

---

### FR5 — Billing & Payment Management

| FR | คำอธิบาย | สถานะ | ไฟล์ |
|:---|:---|:---:|:---|
| FR5.1 | รวมยอด + ออก Invoice | ✅ | `openDetail()` แสดง line items ครบ |
| FR5.2 | รับชำระหลายวิธี (cash, QR, card) | ✅ | `confirmPayment()` + radio buttons |
| FR5.3 | ออกใบเสร็จ printable / PDF | ✅ | `printInvoice()` → `openPrintWindow()` สร้าง HTML template + `window.print()` |

---

### FR6 — Inventory & Analytics

| FR | คำอธิบาย | สถานะ | ไฟล์ |
|:---|:---|:---:|:---|
| FR6.1 | หักสต็อกอัตโนมัติ | ❌ | ยังไม่มี — manual เท่านั้น |
| FR6.1.1 | Alert เมื่อสต็อก < threshold | ✅ | `getAlerts()` + alert banner |
| FR6.3 | Dashboard (revenue, occupancy, addons) | ✅ | `Analytics.html/.js` — 5 charts |

---

### FR7 — Notification Management

| FR | คำอธิบาย | สถานะ | ไฟล์ |
|:---|:---|:---:|:---|
| FR7.1 | Notify owner เมื่อ booking status เปลี่ยน | ✅ | แสดงใน Notifications page |
| FR7.2 | Notify receptionist เมื่อมี booking ใหม่ | ✅ | `NEW_BOOKING_ALERT` type |

---

## โครงสร้างไฟล์ที่ถูกต้อง

```
purrfect-stay/
├── index.html
├── login.html
├── register.html
├── forgot-password.html
├── dashboard.html
├── bookings.html
├── PetProfile.html
├── PetCare.html
├── Billing.html
├── StaffManagement.html
├── Inventory.html
├── Analytics.html
├── Notifications.html
├── AuditTrail.html
├── unit-tests.html
│
├── css/
│   ├── main.css
│   ├── components.css
│   └── pages/
│       ├── Bookings.css
│       ├── PetCare.css
│       ├── PetProfile.css
│       ├── Billing.css
│       ├── StaffManagement.css
│       ├── Inventory.css
│       ├── Analytics.css
│       ├── Notifications.css
│       └── AuditTrail.css
│
└── js/
    ├── components/
    │   ├── sidebar.js
    │   └── navbar.js
    ├── services/
    │   └── api.js
    └── pages/
        ├── Bookings.js
        ├── PetCare.js
        ├── PetProfile.js
        ├── Billing.js
        ├── StaffManagement.js
        ├── Inventory.js
        ├── Analytics.js
        ├── Notifications.js
        └── AuditTrail.js
```

> ⚠️ ไฟล์ CSS/JS ใน repo อยู่ที่ root level — ต้องจัดโฟลเดอร์ตามโครงสร้างด้านบนก่อน deploy (ดู SETUP_GUIDE.md)

---

## Shared Components

### Sidebar (sidebar.js)

```javascript
Sidebar.render({
  activePage: 'bookings',   // 'dashboard'|'bookings'|'pets'|'petcare'|'billing'|
                             // 'staff'|'inventory'|'analytics'|'notifications'|'audit'
  user: { name: 'สมชาย มั่นคง', role: 'Administrator' }
});
```

### Navbar (navbar.js)

```javascript
Navbar.render({
  title:       'Bookings',
  breadcrumb:  'Admin › การจอง (Bookings)',
  actionsHTML: `<button class="btn-primary" onclick="openBookingModal()">+ New Booking</button>`
});
```

---

## API Service Layer (api.js)

### Pattern การใช้งาน

```javascript
// ทุก method คืน { ok: boolean, status: number, data: object }
const res = await window.API.bookings.getAll({ status: 'CHECKED_IN' });
if (res.ok) {
  const bookings = res.data.data; // Backend ห่อ data 2 ชั้น
} else {
  showToast('โหลดไม่สำเร็จ: ' + res.data.message, 'warn');
}
```

### API Methods ทั้งหมด

```javascript
window.API = {
  // FR1 — Auth
  auth.login(username, password)
  auth.logout()

  // FR1 — Staff
  staff.getAll()
  staff.getById(id)
  staff.create(data)
  staff.update(id, data)
  staff.deactivate(id)

  // FR1 — Attendance
  attendance.clock(staffId, action)   // action: 'CLOCK_IN' | 'CLOCK_OUT'
  attendance.getAll(params)           // { start_date, end_date, staff_id }

  // FR1 — Leave
  leave.getAll(params)                // { status: 'PENDING' }
  leave.approve(id, approvedBy, status)

  // FR1 — Audit
  audit.getAll(params)                // { staff_id, action_type, start_date, end_date }

  // Customer (Phase 2)
  customers.getAll(params)            // { q: 'searchText' }
  customers.getById(id)
  customers.getPets(id)
  customers.create(data)
  customers.update(id, data)
  customers.delete(id)

  // FR2 — Pets
  pets.getAll(params)                 // { owner_id, species }
  pets.getById(id)
  pets.create(data)
  pets.update(id, data)
  pets.delete(id)
  pets.getVaccines(id)
  pets.addVaccine(id, data)
  pets.getMealPlans(id)
  pets.saveMealPlans(id, data)

  // FR3 — Bookings
  bookings.getAll(params)             // { status, start_date, end_date, pet_name, owner_name }
  bookings.getById(id)
  bookings.create(data)
  bookings.checkin(id)
  bookings.checkout(id, data)         // { payment_method }
  bookings.cancel(id, data)           // { cancelled_by }
  bookings.addAddon(id, data)         // { services: [...] }
  bookings.getServices()              // รายการ chargeable items

  // FR3 — Rooms
  rooms.getAll()
  rooms.getAvailability(params)       // { checkin_date, checkout_date, pet_type }
  rooms.update(id, data)              // { status, price_per_night }

  // FR5 — Billing
  billing.getAll(params)              // { status, booking_id }
  billing.getById(id)
  billing.preview(bookingId)
  billing.pay(id, data)               // { payment_method }

  // FR4 — Care Reports
  care.getAll(params)                 // { booking_id, date }
  care.getActiveStays()
  care.create(data)
  care.uploadPhotos(id, formData)

  // FR6 — Inventory
  inventory.getAll(params)            // { category }
  inventory.getAlerts()
  inventory.create(data)
  inventory.update(id, data)
  inventory.delete(id)

  // FR6 — Analytics
  analytics.getDashboard(params)      // { start_date, end_date }

  // FR7 — Notifications
  notifications.getAll(params)        // { is_read: false }
  notifications.markRead(id)
  notifications.markAllRead()

  // Dashboard helper (parallel fetch)
  dashboard.loadAll()
}
```

---

## หน้า Dashboard — สถาปัตยกรรม

`dashboard.js` ใช้ `Promise.allSettled` ดึงข้อมูลพร้อมกัน 5 endpoints:

```javascript
const [bookingsRes, notifRes, staffRes, roomsRes, analyticsRes] = await Promise.allSettled([
  window.API.bookings.getAll(),
  window.API.notifications.getAll({ is_read: false }),
  window.API.staff.getAll(),
  window.API.rooms.getAll(),
  window.API.analytics.getDashboard({ start_date: today, end_date: today }),
]);
```

Sections ที่ render:
- KPI Stat Cards (pending, active, checkouts, revenue today)
- Priority Check-in (PENDING booking ที่ check-in เร็วที่สุด)
- Pending Bookings Table
- Active Stays Table
- Team On Duty List
- Quick Notifications (5 ล่าสุด)
- Room Grid (แยกโซน CAT/DOG)

---

## หน้า Analytics — Charts

ใช้ **Chart.js 4.4.0** (CDN)

| Chart | Type | ข้อมูล |
|:---|:---|:---|
| รายรับรายวัน | Line | `data.daily_revenue` (กรองด้วย paymentdate จริง) |
| สัดส่วน Booking | Doughnut | `data.bookings` (checked_in, checked_out, cancelled, pending) |
| สัดส่วนสัตว์เลี้ยง | Doughnut | `data.pet_ratio` |
| Top Add-on Services | Bar (custom) | `data.top_addons` (จาก bookingservice ไม่ใช่ inventoryusage) |
| Revenue Split | Doughnut | `data.revenue.room` vs `data.revenue.addons` |

---

## หน้า Billing — Print Invoice

`printInvoice()` ใน `Billing.js` สร้าง HTML ใหม่ใน popup window:

```javascript
async function printInvoice(id) {
  // 1. Fetch detail จาก /api/billing/{id} (ใช้ cache ถ้ามี)
  // 2. สร้าง HTML receipt template พร้อม CSS inline
  // 3. window.open() → document.write(html) → window.print()
}
```

Features ของ receipt:
- Header: Logo "Purrfect Stay" + ที่อยู่โรงแรม
- Invoice ID, วันที่ออก, Status badge
- ข้อมูลลูกค้า + ช่วงเวลาพัก
- Line items table + Grand total
- Payment method + วันที่ชำระ
- Footer: ขอบคุณลูกค้า

---

## Unit Tests (unit-tests.html)

ไฟล์ทดสอบ pure JS functions 106 tests ใน 20+ suites

**วิธีรัน:** เปิดผ่าน Live Server → `http://127.0.0.1:5500/unit-tests.html`

| Suite | Tests |
|:---|:---:|
| Bookings — calcNights() | 9 |
| Bookings — statusLabel() | 8 |
| Bookings — paymentLabel() | 4 |
| Billing — statusLabel() | 6 |
| Billing — paymentLabel() | 6 |
| Billing — paymentIcon() | 6 |
| Billing — formatDate() | 7 |
| PetProfile — calcAge() | 7 |
| PetProfile — speciesLabel() | 6 |
| PetProfile — getVaccStatus() | 9 |
| PetProfile — getVaccExpiry() | 6 |
| Analytics — calculations | 11 |
| AuditTrail — labels | 10 |
| Notifications — typeLabel() | 8 |
| Notifications — getFiltered() | 10 |
| Inventory — catLabel() | 6 |
| Inventory — getItemStatus() | 9 |
| PetCare — moodEmoji/Label | 13 |
| api.js — authHeaders() | 7 |
| dashboard.js — helpers | 10 |
| Validation — username/email | 11 |
| Auth — calcPasswordScore() | 7 |
| UI Logic — getStepStatus() | 3 |

---

## Known Issues & งานที่ยังค้าง

| Priority | งาน | FR | ไฟล์ | ความยาก |
|:---|:---|:---|:---|:---:|
| 🔴 | Inventory ยังใช้ Mock data — ต้อง uncomment `loadFromAPI()` | FR6 | Inventory.js | Easy |
| 🟡 | PDF upload สำหรับ vaccine cert | FR2.2 | PetProfile.js | Easy |
| 🟡 | Meal Plan edit UI | FR2.4 | PetProfile.js | Medium |
| 🟡 | Backend trigger notification หลัง care report | FR4.2 | care_logs.py | Medium |
| 🟢 | Auto stock deduction | FR6.1 | Inventory.js | Hard |
| 🟢 | Refactor `dashboard.html` CSS เป็น shared pattern | — | dashboard.html | Easy |

---

## Auth Flow (Frontend)

```javascript
// 1. Login
const res = await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ staff_username, password })
});
const data = await res.json();

// 2. Store
localStorage.setItem('access_token', data.access_token);
localStorage.setItem('staff_id', data.staff_id);
localStorage.setItem('first_name', data.first_name);
localStorage.setItem('role', data.role);

// 3. Auto-attach (api.js ทำให้)
// Authorization: Bearer <token> ใน header ทุก request

// 4. 401 → redirect login
if (res.status === 401) window.location.href = 'login.html';
```

---

## Error Handling Pattern

```javascript
// Toast notification (ใช้ทุกหน้า)
function showToast(msg, type = 'success') {
  // สีเขียว: success, สีเหลือง: warn
  // แสดง 3-4 วินาที แล้วหายเอง
}

// Optimistic UI (ใช้ใน Notifications)
// 1. อัปเดต UI ทันที
// 2. ยิง API
// 3. ถ้า API fail → rollback (optional)
```