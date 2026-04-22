# about_src.md — Source Code Overview
> Purrfect Stay · Pet Hotel Management System  
> CN230 Database Systems · Thammasat School of Engineering  
> อัปเดตล่าสุด: Apr 2026

---

## ภาพรวมสถาปัตยกรรม

```
┌─────────────────────────────────────────────────────┐
│                   BROWSER (Client)                   │
│  HTML + CSS + Vanilla JS  ·  window.API (api.js)    │
└────────────────────────┬────────────────────────────┘
                         │  HTTP / JSON (Bearer JWT)
                         ▼
┌─────────────────────────────────────────────────────┐
│              Flask Application (app.py)              │
│   Blueprints: 14 route modules  ·  JWT Middleware   │
└────────────────────────┬────────────────────────────┘
                         │  psycopg2 (raw SQL)
                         ▼
┌─────────────────────────────────────────────────────┐
│          PostgreSQL 15 — Supabase Cloud             │
│   15+ tables  ·  Foreign Keys  ·  ACID transactions │
└─────────────────────────────────────────────────────┘
```

ระบบใช้แนวคิด **3-tier architecture** โดยเจตนาไม่ใช้ ORM เพื่อให้เขียน SQL ได้โดยตรงตามข้อกำหนดของวิชา CN230

---

## โครงสร้างไฟล์ทั้งหมด

### Backend (Python / Flask)

```
app.py                   Flask entry point — สร้าง Flask app, register Blueprints, CORS, error handler
config.py                โหลด DATABASE_URL และ SECRET_KEY จาก .env
utils.py                 Decorator: @token_required, @admin_required
update_hash.py           Dev utility — bcrypt ทุก staff password เป็น "password123"
requirements.txt         Flask, psycopg2-binary, PyJWT, bcrypt, python-dotenv, flask-cors
dockerfile               Python 3.10-slim + gcc (ต้องการสำหรับ bcrypt)

routes/
├── auth.py              POST /api/auth/login, /logout, /register, /login/customer
├── staff.py             GET/POST /api/staff, PUT /{id}, PATCH /{id}/deactivate
├── attendance.py        POST /api/attendance/clock, GET /api/attendance
├── leave.py             GET /api/leave, PATCH /{leave_id}
├── audit.py             GET /api/audit  (ADMIN/OWNER only)
├── customer.py          CRUD /api/customers, GET /{id}/pets
├── pets.py              CRUD /api/pets, vaccines, meal-plans, DELETE
├── rooms.py             GET /api/rooms, /availability, PATCH /{room_id}
├── bookings.py          CRUD /api/bookings, checkin, checkout, cancel, addons, services
├── care_logs.py         POST/GET /api/care-reports, /active-stays, /{id}/photos
├── billing.py           GET/POST /api/billing, /preview, /{id}/pay
├── inventory.py         CRUD /api/inventory, /alerts, /usage
├── analytics.py         GET /api/analytics/dashboard
└── norifications.py     GET/PATCH /api/notifications, /read-all, /{id}/read
```

> ⚠️ หมายเหตุ: `norifications.py` มีการสะกดผิด (typo) — ชื่อจริงในระบบ แต่ Blueprint ลงทะเบียนถูกต้องแล้วใน `app.py`

---

### Frontend (HTML / CSS / JS)

```
Public Pages (ไม่ต้อง Login)
├── index.html             Landing page — feature overview, CTA
├── login.html             Staff login form + JWT handling
├── register.html          3-step staff registration
└── forgot-password.html   OTP-based password reset (4 screens)

Admin Panel Pages (ต้อง Login)
├── dashboard.html         KPI cards, priority check-in, room grid, notifications
├── bookings.html          Booking table + 4-step new booking modal
├── PetProfile.html        Pet table + CRUD modal (3 tabs) + vaccine modal
├── PetCare.html           Active stays list + care report form + mood filter
├── Billing.html           Invoice table + payment modal + print invoice
├── StaffManagement.html   Staff list + attendance + leave management (tabs)
├── Inventory.html         Inventory table + add/edit modal + alerts
├── Analytics.html         KPI cards + 5 charts (Chart.js)
├── Notifications.html     Notification list with type filters
├── AuditTrail.html        Audit log table with filters + pagination
└── unit-tests.html        106 unit tests สำหรับ pure JS functions

Legacy Pages (ไม่ได้ใช้ใน main flow)
├── invoice.html           Old billing prototype
└── payment.html           Old payment prototype

Shared JS Components
├── js/components/sidebar.js    Sidebar.render({ activePage, user }) — render sidebar ทุกหน้า
├── js/components/navbar.js     Navbar.render({ title, breadcrumb, actionsHTML })
└── js/services/api.js          window.API — centralized fetch wrapper + Bearer token

CSS Architecture
├── css/main.css           Global layout: body, .main, .content, CSS variables
├── css/components.css     Shared components: buttons, badges, modals, forms
└── css/pages/             Per-page stylesheets (Bookings.css, PetCare.css, etc.)
```

---

## Blueprint Registry (app.py)

| Blueprint Object | URL Prefix | ไฟล์ | หมายเหตุ |
|:---|:---|:---|:---|
| `auth_bp` | `/api/auth` | auth.py | ไม่ต้องการ Token สำหรับ /login |
| `staff_bp` | `/api/staff` | staff.py | — |
| `attendance_bp` | `/api/attendance` | attendance.py | — |
| `leave_bp` | `/api/leave` | leave.py | — |
| `audit_bp` | `/api/audit` | audit.py | @admin_required |
| `customer_bp` | `/api/customers` | customer.py | Phase 2 |
| `pets_bp` | `/api/pets` | pets.py | — |
| `rooms_bp` | `/api/rooms` | rooms.py | — |
| `bookings_bp` | `/api/bookings` | bookings.py | — |
| `care_logs_bp` | `/api/care-reports` | care_logs.py | Blueprint ชื่อ care_logs แต่ prefix ใช้ care-reports |
| `billing_bp` | `/api/billing` | billing.py | — |
| `inventory_bp` | `/api/inventory` | inventory.py | — |
| `analytics_bp` | `/api/analytics` | analytics.py | @admin_required |
| `notifications_bp` | `/api/notifications` | norifications.py | — |

---

## Auth & Security Flow

```
1. POST /api/auth/login
   → ตรวจสอบ username + bcrypt.checkpw(password, hash)
   → สร้าง JWT payload { staff_id, role, exp: now+12h }
   → คืน { access_token, staff_id, first_name, role }

2. Frontend: localStorage.setItem('access_token', token)

3. ทุก API request:
   → api.js ดึง token จาก localStorage
   → ใส่ Authorization: Bearer <token> ใน header

4. Backend: @token_required decorator
   → jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
   → คืน current_user = { staff_id, role }
   → ส่งต่อไปยัง route function

5. @admin_required (ต่อจาก @token_required)
   → ตรวจสอบว่า current_user['role'] in ['ADMIN', 'OWNER']
```

---

## Frontend Component Pattern

ทุกหน้า Admin Panel ใช้ pattern เดียวกัน:

```html
<!-- HTML Structure -->
<aside id="sidebar-root"></aside>
<main class="main">
  <div id="topbar-root"></div>
  <div class="content">
    <!-- page content -->
  </div>
</main>

<!-- Scripts (ลำดับสำคัญมาก) -->
<script src="js/components/sidebar.js"></script>
<script src="js/components/navbar.js"></script>
<script src="js/services/api.js"></script>
<script src="js/pages/PageName.js"></script>
<script>
  const currentUser = { name: '...', role: '...' };
  Sidebar.render({ activePage: 'pagename', user: currentUser });
  Navbar.render({ title: '...', breadcrumb: '...', actionsHTML: '...' });
</script>
```

---

## window.API Structure (api.js)

```javascript
window.API = {
  auth:          { login, logout },
  staff:         { getAll, getById, create, update, deactivate },
  customers:     { getAll, getById, getPets, create, update, delete },
  bookings:      { getAll, getById, create, checkin, checkout, cancel, addAddon, getServices },
  rooms:         { getAll, getAvailability, update },
  billing:       { getAll, getById, preview, pay },
  care:          { getAll, getActiveStays, create, uploadPhotos },
  inventory:     { getAll, getAlerts, create, update, delete },
  analytics:     { getDashboard },
  audit:         { getAll },
  attendance:    { clock, getAll },
  leave:         { getAll, approve },
  notifications: { getAll, markRead, markAllRead },
  pets:          { getAll, getById, create, update, delete, getVaccines, addVaccine, getMealPlans, saveMealPlans },
  dashboard:     { loadAll },
}
```

ทุก method คืนค่า `{ ok: boolean, status: number, data: object }` — ไม่โยน exception

