<div align="center">

  <img src="documents/Image/LOGO/PurrfectStay_Logo.png" width="150" alt="Logo">

  # Purrfect Stay — Pet Hotel Management System
  ### CN230 Database Systems · Computer Engineering · Thammasat School of Engineering

</div>

## 📖 Project Overview

**Purrfect Stay** is a full-stack web application for managing day-to-day operations of a pet boarding hotel. The system covers room booking, pet check-in/check-out, daily care logging, billing, inventory, staff management, and analytics — built as a CN230 Database Systems course project with emphasis on relational database design and raw SQL execution.

---

## ⚙️ Technology Stack

| Layer | Technology |
|:---|:---|
| **Database** | PostgreSQL 15 (hosted on Supabase) |
| **Backend** | Python 3.10 · Flask · psycopg2-binary · PyJWT · bcrypt |
| **Frontend** | HTML5 · CSS3 (utility-first) · Vanilla JavaScript (ES6+) |
| **Auth** | JWT (HS256, 12-hour expiry) |
| **DevOps** | Docker · Git · GitHub Projects (Kanban) |
| **Design** | Figma (wireframes) · Canva (assets) |

---

## 📁 Project Structure

```
purrfect-stay/
│
├── app.py                   ← Flask application entry point + Blueprint registry
├── config.py                ← Environment variable loader (.env)
├── utils.py                 ← JWT middleware decorators (@token_required, @admin_required)
├── update_hash.py           ← Dev utility: reset all staff passwords to bcrypt hash
├── requirements.txt
├── dockerfile
│
├── routes/                  ← Backend API route modules (Blueprints)
│   ├── auth.py              FR1 — /api/auth
│   ├── staff.py             FR1 — /api/staff
│   ├── attendance.py        FR1 — /api/attendance
│   ├── leave.py             FR1 — /api/leave
│   ├── audit.py             FR1 — /api/audit
│   ├── customer.py          Phase 2 — /api/customers
│   ├── pets.py              FR2 — /api/pets
│   ├── rooms.py             FR3 — /api/rooms
│   ├── bookings.py          FR3 — /api/bookings
│   ├── care_logs.py         FR4 — /api/care-reports
│   ├── billing.py           FR5 — /api/billing
│   ├── inventory.py         FR6 — /api/inventory
│   ├── analytics.py         FR6 — /api/analytics
│   └── norifications.py     FR7 — /api/notifications
│
├── frontend/                ← Static HTML/CSS/JS (no build step required)
│   ├── index.html           Landing page
│   ├── login.html           Staff login
│   ├── register.html        Staff registration
│   ├── forgot-password.html OTP-based password reset
│   ├── dashboard.html       Main dashboard
│   ├── bookings.html        FR3 — Booking & Front Desk
│   ├── PetProfile.html      FR2 — Pet Profiles
│   ├── PetCare.html         FR4 — Daily Care Reports
│   ├── Billing.html         FR5 — Billing & Payment
│   ├── StaffManagement.html FR1 — Staff, Attendance, Leave
│   ├── Inventory.html       FR6 — Inventory Management
│   ├── Analytics.html       FR6 — Analytics Dashboard
│   ├── Notifications.html   FR7 — Notification Center
│   ├── AuditTrail.html      FR1 — Audit Log (Admin only)
│   ├── unit-tests.html      106 frontend unit tests
│   ├── css/
│   │   ├── main.css
│   │   ├── components.css
│   │   └── pages/           ← Per-page stylesheet
│   └── js/
│       ├── components/
│       │   ├── sidebar.js
│       │   └── navbar.js
│       ├── services/
│       │   └── api.js       ← Centralized API service layer (window.API)
│       └── pages/           ← Per-page JS logic
│
└── docs/
    ├── README.md
    ├── about_src.md         ← Source code overview
    ├── about_backend.md     ← Backend architecture & API reference
    ├── about_frontend.md    ← Frontend pages, FR coverage, API contracts
    ├── about_db.md          ← Database schema & ERD notes
    └── SETUP_GUIDE.md       ← Local + Docker setup instructions
```

---

## 🚀 Quick Start

### 1. Clone & Environment Setup

```bash
git clone https://github.com/athiphat67/CN230-Group-Project.git
cd CN230-Group-Project

# Create .env file (never commit this)
cat > .env << EOF
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
SECRET_KEY=your-random-secret-key-here
EOF
```

### 2. Backend (Local)

```bash
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
# → http://127.0.0.1:5000
```

### 3. Backend (Docker)

```bash
docker build -t purrfect-backend .
docker run -p 5000:5000 --env-file .env purrfect-backend
```

### 4. Frontend

```bash
# Option A — VS Code Live Server (recommended)
# Right-click dashboard.html → "Open with Live Server"
# → http://127.0.0.1:5500

# Option B — Python
cd frontend/
python -m http.server 8080
# → http://localhost:8080
```

> ⚠️ Do **not** open HTML files via `file://` — CORS will block API calls.

### 5. Verify Connection

```bash
curl http://127.0.0.1:5000/api/test-connection
# Expected: { "status": "success", "db_version": "PostgreSQL 15.x ..." }
```

### 6. Demo Login

| Account | Username | Password | Role |
|:---|:---|:---|:---|
| Admin | `somchai` | `password123` | ADMIN |
| Staff | `mali` | `password123` | STAFF |

---

## 📊 Functional Requirements Coverage

| FR | Module | Backend | Frontend | Status |
|:---|:---|:---:|:---:|:---:|
| FR1 | User & Access Management | ✅ | ✅ | Complete |
| FR2 | Pet Profile Management | ✅ | ✅ | Complete |
| FR3 | Booking & Front Desk | ✅ | ✅ | Complete |
| FR4 | Pet Care & Monitoring | ✅ | ✅ | Complete |
| FR5 | Billing & Payment | ✅ | ✅ | Complete |
| FR6 | Inventory & Analytics | ✅ | ✅ | Complete |
| FR7 | Notification Management | ✅ | ✅ | Complete |

---

## 📋 Project Progress

| Phase | Deliverable | Due Date | Status |
|:---:|:---|:---:|:---:|
| 1 | Proposal Report & Presentation | 30 Mar 2026 | ✅ Done |
| 2 | Final System & Presentation | 27 May 2026 | 🔵 In Progress |

🔗 **[Kanban Board](https://github.com/users/athiphat67/projects/6/views/2)**

---

## 👥 Team Members

| Student ID | Name | Role |
|:---:|:---|:---|
| `6710615292` | Athiphat Sunsit | Frontend Developer & QA Engineer |
| `6710615060` | Chotiwit Daugstan | Frontend Developer |
| `6710615185` | Purich Ampawa | Project Lead & Backend Developer |
| `6710685014` | Theepob Rattanasapsiri | Database Designer |

---

## 📄 License

Educational project — CN230 Database Systems · Thammasat University · 2026
