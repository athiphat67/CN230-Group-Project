# 🐾 Purrfect Stay — คู่มือ Setup และ Connect API (v3)
> อัปเดต: 21 Apr 2026  
> เพิ่ม: PetProfile.html (FR2) + Notifications.html (FR7) + unit-tests.html  
> Audit: ตรวจสอบตาม Proposal Report เต็ม FR1–FR7

---

## 📂 โครงสร้างไฟล์ที่ถูกต้อง

```
purrfect-stay/
├── index.html
├── login.html
├── register.html
├── forgot-password.html
├── dashboard.html              ← ⚠️ ต้อง refactor (ดู Section 5)
├── Bookings.html
├── PetCare.html
├── PetProfile.html             ← FR2 NEW
├── Billing.html
├── StaffManagement.html
├── Inventory.html
├── Analytics.html
├── Notifications.html          ← FR7 NEW
├── AuditTrail.html
├── unit-tests.html             ← NEW — เปิดใน browser เพื่อรัน tests
│
├── css/
│   ├── main.css
│   ├── components.css
│   └── pages/
│       ├── Bookings.css
│       ├── PetCare.css
│       ├── PetProfile.css      ← FR2 NEW
│       ├── Billing.css
│       ├── StaffManagement.css
│       ├── Inventory.css
│       ├── Analytics.css
│       ├── Notifications.css   ← FR7 NEW
│       └── AuditTrail.css
│
└── js/
    ├── components/
    │   ├── sidebar.js          ← UPDATED
    │   └── navbar.js
    ├── services/
    │   └── api.js
    └── pages/
        ├── Bookings.js
        ├── PetCare.js
        ├── PetProfile.js       ← FR2 NEW
        ├── Billing.js
        ├── StaffManagement.js
        ├── Inventory.js
        ├── Analytics.js
        ├── Notifications.js    ← FR7 NEW
        └── AuditTrail.js
```

---

## ⚙️ Step 1: จัดโฟลเดอร์ให้ถูกต้อง (สำคัญมาก)

ไฟล์ที่ได้รับอยู่ที่ root level ต้องย้ายก่อนรัน:

```bash
mkdir -p css/pages js/pages js/components js/services

# CSS
mv Analytics.css      css/pages/
mv AuditTrail.css     css/pages/
mv Billing.css        css/pages/
mv Bookings.css       css/pages/
mv Inventory.css      css/pages/
mv Notifications.css  css/pages/
mv PetCare.css        css/pages/
mv PetProfile.css     css/pages/
mv StaffManagement.css css/pages/

# JS Pages
mv Analytics.js       js/pages/
mv AuditTrail.js      js/pages/
mv Billing.js         js/pages/
mv Bookings.js        js/pages/
mv Inventory.js       js/pages/
mv Notifications.js   js/pages/
mv PetCare.js         js/pages/
mv PetProfile.js      js/pages/
mv StaffManagement.js js/pages/

# Components & Services
mv sidebar.js         js/components/
mv navbar.js          js/components/
mv api.js             js/services/
```

---

## 🚀 Step 2: รัน Frontend (Local)

### วิธีที่ 1: VS Code Live Server (แนะนำ)
1. ติดตั้ง Extension **Live Server**
2. คลิกขวาที่ `dashboard.html` → **Open with Live Server**
3. เปิด `http://127.0.0.1:5500`

### วิธีที่ 2: Python HTTP Server
```bash
cd purrfect-stay/
python -m http.server 8080
# เปิด http://localhost:8080
```

### วิธีที่ 3: Node.js
```bash
npm install -g http-server
http-server -p 8080
```

> ⚠️ **ห้ามเปิด file:/// โดยตรง** — JS จะถูก block

---

## 🧪 Step 3: รัน Unit Tests

เปิด `http://127.0.0.1:5500/unit-tests.html` ใน browser

**ครอบคลุม 106 tests ใน 15 suites:**

| Suite | Tests | ทดสอบ |
|---|---|---|
| Bookings — calcNights | 5 | คำนวณจำนวนคืนถูกต้อง รวม edge cases |
| Bookings — statusLabel | 6 | แปลง status enum เป็นภาษาไทย |
| Bookings — paymentLabel | 3 | แปลงวิธีชำระ |
| Billing — statusLabel | 4 | รวม null/undefined |
| Billing — paymentLabel | 4 | รวม null |
| Billing — paymentIcon | 4 | emoji icons |
| Billing — formatDate | 3 | null → —, valid date |
| PetProfile — calcAge | 5 | อายุสัตว์เลี้ยง รวม edge cases |
| PetProfile — speciesLabel | 4 | cat/dog/other |
| PetProfile — getVaccStatus | 6 | expired/expiring/valid/mixed |
| PetProfile — getVaccExpiry | 3 | ตรวจวันหมดอายุ |
| Analytics — helpers | 6 | avgBill, occupancyPct, formatShortDate |
| AuditTrail — labels | 10 | actionLabel + formatDateTime |
| Notifications — typeLabel | 7 | ทุก type + unknown |
| Notifications — getFiltered | 7 | filter all/unread/type |
| Inventory — catLabel | 4 | 3 categories + unknown |
| Inventory — getItemStatus | 6 | danger/expiring/low/good + priority |
| PetCare — mood | 10 | moodEmoji + moodLabel |
| PetCare — calcDaysLeft | 4 | past/today/tomorrow/future |
| api.js — authHeaders | 4 | Bearer scheme + content-type |
| Integration — Billing total | 3 | คำนวณยอดรวม + discount |
| Integration — Room pricing | 3 | คูณราคาห้อง × คืน |
| Integration — Inventory 20% | 3 | threshold logic |

**ผลที่คาดหวัง:** ✅ 106/106 PASS (ทุก test ควร pass ด้วย mock data ปัจจุบัน)

---

## 🔌 Step 4: เชื่อม Backend API

### รัน Flask Backend
```bash
cd backend/
pip install flask flask-cors psycopg2-binary
python app.py
# Backend: http://127.0.0.1:5000
```

### ตรวจสอบ CORS
```python
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=["http://127.0.0.1:5500", "http://localhost:8080"])
```

### Login และรับ Token
```javascript
const res = await window.API.auth.login('somchai', 'password123');
if (res.ok) {
  localStorage.setItem('access_token', res.data.access_token);
}
```

---

## 📡 Step 5: Connect API แต่ละหน้า

### PetProfile.html (FR2)
```javascript
// ใน PetProfile.js → แทน mock data:
async function loadFromAPI() {
  const res = await window.API.pets.getAll();
  if (res.ok) { PETS.length = 0; res.data.forEach(p => PETS.push(p)); }
  renderStats(); renderTable();
}
document.addEventListener('DOMContentLoaded', async () => {
  await loadFromAPI();
  bindModalBackdrops(); bindEscapeKey();
});
```

**เพิ่ม endpoints ใน api.js:**
```javascript
pets: {
  getAll:      (params = {})   => apiFetch('/pets?' + new URLSearchParams(params)),
  getById:     (id)            => apiFetch(`/pets/${id}`),
  create:      (data)          => apiFetch('/pets', { method:'POST', body:JSON.stringify(data) }),
  update:      (id, data)      => apiFetch(`/pets/${id}`, { method:'PUT', body:JSON.stringify(data) }),
  getVaccines: (id)            => apiFetch(`/pets/${id}/vaccines`),
  addVaccine:  (id, data)      => apiFetch(`/pets/${id}/vaccines`, { method:'POST', body:JSON.stringify(data) }),
  getMealPlans:(id)            => apiFetch(`/pets/${id}/meal-plans`),
  saveMealPlans:(id, data)     => apiFetch(`/pets/${id}/meal-plans`, { method:'POST', body:JSON.stringify(data) }),
},
```

### Notifications.html (FR7)
```javascript
document.addEventListener('DOMContentLoaded', async () => {
  const res = await window.API.notifications.getAll();
  if (res.ok) { NOTIFICATIONS.length = 0; res.data.forEach(n => NOTIFICATIONS.push(n)); }
  renderStats(); renderList();
});

async function markRead(id) {
  await window.API.notifications.markRead(id);
  const n = NOTIFICATIONS.find(x => x.notification_id === id);
  if (n) n.is_read = true;
  renderStats(); renderList();
}
```

### Analytics.html (FR6)
```javascript
document.addEventListener('DOMContentLoaded', async () => {
  const res = await window.API.analytics.getDashboard({
    start_date: document.getElementById('an-from').value,
    end_date:   document.getElementById('an-to').value,
  });
  const data = res.ok ? res.data : MOCK_ANALYTICS;
  renderKPIs(data); renderRevenueChart(data);
  renderBookingChart(data); renderTopAddons(data);
});
```

### AuditTrail.html (FR1.11)
```javascript
async function applyFilters() {
  const res = await window.API.audit.getAll({
    staff_id:    document.getElementById('filter-staff').value,
    action_type: document.getElementById('filter-action').value,
    start_date:  document.getElementById('filter-from').value,
    end_date:    document.getElementById('filter-to').value,
  });
  filteredLogs = res.ok ? res.data : [];
  currentPage = 1; renderTable();
}
```

---

## 5. ⚠️ dashboard.html — Refactor Plan

`dashboard.html` ยังใช้โครงสร้างเก่า ต้องแก้ไข:

```html
<!-- เพิ่ม head links -->
<link rel="stylesheet" href="css/main.css">
<link rel="stylesheet" href="css/components.css">

<!-- เปลี่ยน body structure -->
<aside id="sidebar-root"></aside>
<main class="main">
  <div id="topbar-root"></div>
  <div class="content">
    <!-- เนื้อหา dashboard -->
  </div>
</main>

<!-- เพิ่ม scripts -->
<script src="js/components/sidebar.js"></script>
<script src="js/components/navbar.js"></script>
<script src="js/services/api.js"></script>
<script src="js/pages/dashboard.js"></script>
<script>
  Sidebar.render({ activePage: 'dashboard', user: { name: 'สมชาย มั่นคง', role: 'Administrator' } });
  Navbar.render({ title: 'Dashboard', breadcrumb: 'Admin › ภาพรวม' });
</script>
```

---

## 6. งานที่ต้องทำเพิ่ม (Feature Backlog)

### 🔴 Priority High
| งาน | FR | วิธีทำ |
|---|---|---|
| Refactor `dashboard.html` | — | ใช้ shared sidebar.js/navbar.js |
| Room Management UI | FR3.5 | สร้างหน้า `Rooms.html` หรือ tab ใน Bookings |

### 🟡 Priority Medium  
| งาน | FR | วิธีทำ |
|---|---|---|
| PDF upload vaccine cert | FR2.2 | เพิ่ม `<input type="file" accept=".pdf">` ใน modal-vaccine |
| Meal Plan edit UI | FR2.4 | เพิ่ม tab ใน modal-pet หรือ modal แยก |
| Print Invoice (PDF) | FR5.3 | `window.print()` หรือ html2pdf library |
| cancelled_by tracking | FR3.6.1 | เพิ่ม field ใน mock + API body |

### 🟢 Priority Low
| งาน | FR | วิธีทำ |
|---|---|---|
| Auto stock deduction | FR6.1 | เชื่อม Inventory กับ care reports |
| Real-time price calc | FR3.2 | คำนวณ nights × rate ใน new booking form |

---

## 7. 🔐 Auth Token Flow

```
1. POST /api/auth/login → ได้ access_token
2. localStorage.setItem('access_token', token)
3. ทุก request: Authorization: Bearer <token>  ← api.js จัดการอัตโนมัติ
4. 401 Unauthorized → redirect login.html
```

---

## 8. 🛠️ Debug ปัญหาที่พบบ่อย

| ปัญหา | สาเหตุ | วิธีแก้ |
|---|---|---|
| CSS/JS 404 | ไม่ได้ย้ายไฟล์ตามโครงสร้าง | รัน bash script Step 1 |
| CORS error | Flask ยังไม่ได้ enable CORS | `pip install flask-cors` + `CORS(app)` |
| 401 Unauthorized | Token หมดหรือไม่มี | Login ใหม่ |
| sidebar ไม่แสดง | script ลำดับผิด | ต้องโหลด `sidebar.js` ก่อน `Sidebar.render()` |
| Chart ไม่ขึ้น | Chart.js CDN ไม่โหลด | ตรวจ internet / CDN URL |
| Unit tests ไม่รัน | เปิดผ่าน file:// | ใช้ Live Server |
| `window.API.pets` undefined | ยังไม่เพิ่ม pets block ใน api.js | เพิ่ม endpoints ตาม Section 5 |
| dashboard หน้าตาต่างจากหน้าอื่น | ใช้ CSS/structure เก่า | Refactor ตาม Section 5 |

---

## 📋 API Endpoints Summary

| หน้า | Method | Endpoint | Mock | Backend |
|---|---|---|---|---|
| Login | POST | `/api/auth/login` | ✅ | 🟡 |
| Staff List | GET | `/api/staff` | ✅ | 🟡 |
| Bookings | GET | `/api/bookings` | ✅ | 🟡 |
| Check-In | PATCH | `/api/bookings/{id}/checkin` | ✅ | 🟡 |
| Check-Out | PATCH | `/api/bookings/{id}/checkout` | ✅ | 🟡 |
| Care Reports | GET | `/api/care-reports` | ✅ | 🟡 |
| **Pets** | **GET** | **`/api/pets`** | **✅ NEW** | **🟡** |
| **Pet Vaccines** | **POST** | **`/api/pets/{id}/vaccines`** | **✅ NEW** | **🟡** |
| **Pet Meal Plans** | **GET/POST** | **`/api/pets/{id}/meal-plans`** | **✅ NEW** | **🟡** |
| Billing | GET | `/api/billing` | ✅ | 🟡 |
| Inventory | GET | `/api/inventory` | ✅ | 🟡 |
| Analytics | GET | `/api/analytics/dashboard` | ✅ | 🟡 |
| **Notifications** | **GET** | **`/api/notifications`** | **✅ NEW** | **🟡** |
| **Mark Read** | **PATCH** | **`/api/notifications/{id}/read`** | **✅ NEW** | **🟡** |
| Audit Trail | GET | `/api/audit` | ✅ | 🟡 |
| Rooms | GET | `/api/rooms` | ❌ ไม่มี UI | 🟡 |
| Room CRUD | PATCH | `/api/rooms/{id}` | ❌ ไม่มี UI | 🟡 |