# Setup Guide — Purrfect Stay (Backend + Frontend)
> อัปเดตล่าสุด: 21 Apr 2026

---

## 1. Prerequisites

| เครื่องมือ | เวอร์ชันที่แนะนำ |
|---|---|
| Python | 3.10+ |
| pip | 23+ |
| Docker Desktop | 4.x (optional แต่แนะนำ) |
| Node.js | ไม่จำเป็น (Frontend เป็น static HTML) |
| Git | ใดก็ได้ |
| VS Code | แนะนำ + Python extension |

---

## 2. โครงสร้าง Repo

```
purrfect-stay/
├── src/
│   ├── backend/
│   │   ├── routes/
│   │   │   ├── auth.py
│   │   │   ├── staff.py
│   │   │   ├── attendance.py
│   │   │   ├── leave.py
│   │   │   ├── audit.py
│   │   │   ├── pets.py
│   │   │   ├── rooms.py
│   │   │   ├── bookings.py
│   │   │   ├── care_reports.py
│   │   │   ├── billing.py
│   │   │   ├── inventory.py
│   │   │   ├── analytics.py
│   │   │   └── notifications.py
│   │   ├── app.py
│   │   ├── config.py
│   │   ├── requirements.txt
│   │   ├── Dockerfile
│   │   └── .env              ← ต้องสร้างเอง (ดูข้อ 3)
│   └── frontend/
│       ├── dashboard.html
│       ├── Bookings.html
│       ├── ...
│       ├── css/
│       └── js/
└── README.md
```

---

## 3. ตั้งค่า Environment Variables

สร้างไฟล์ `src/backend/.env` (ห้าม commit ขึ้น Git):

```env
# Supabase / PostgreSQL connection string
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@db.[YOUR_PROJECT_REF].supabase.co:5432/postgres

# JWT secret key — ใช้ random string ยาวๆ
SECRET_KEY=your_super_secret_key_here_change_this
```

> **หา DATABASE_URL ได้จาก:**  
> Supabase Dashboard → Project → Settings → Database → Connection String → URI

---

## 4. Run แบบ Local (ไม่ใช้ Docker)

```bash
# 1. เข้าโฟลเดอร์ backend
cd src/backend

# 2. สร้าง virtual environment
python -m venv venv

# 3. activate
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# 4. ติดตั้ง dependencies
pip install -r requirements.txt

# 5. รัน server
python app.py
```

Server จะรันที่ `http://127.0.0.1:5000`

---

## 5. Run แบบ Docker

```bash
# 1. เข้าโฟลเดอร์ backend
cd src/backend

# 2. Build image
docker build -t purrfect-backend .

# 3. Run container (ส่ง .env เข้าไปด้วย)
docker run -p 5000:5000 --env-file .env purrfect-backend
```

> **หมายเหตุ:** Dockerfile ใช้ `python app.py` (debug=True)  
> สำหรับ Production ให้เปลี่ยนเป็น `gunicorn` แทน:
> ```dockerfile
> CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
> ```

---

## 6. ทดสอบ Connection

```bash
curl http://127.0.0.1:5000/api/test-connection
```

Response ที่ถูกต้อง:
```json
{
  "status": "success",
  "db_version": "PostgreSQL 15.x ..."
}
```

---

## 7. ตั้งค่า Database (DDL)

รัน SQL ต่อไปนี้ใน Supabase SQL Editor เพื่อสร้างตารางใหม่:

```sql
-- Vaccine
CREATE TABLE IF NOT EXISTS Vaccine (
    VaccineID         SERIAL PRIMARY KEY,
    PetID             INT REFERENCES Pet(PetID) ON DELETE CASCADE,
    VaccineName       VARCHAR(100) NOT NULL,
    AdministeredDate  DATE,
    ExpiryDate        DATE,
    VetClinic         VARCHAR(200),
    CertURL           TEXT
);

-- MealPlan
CREATE TABLE IF NOT EXISTS MealPlan (
    MealPlanID     SERIAL PRIMARY KEY,
    PetID          INT REFERENCES Pet(PetID) ON DELETE CASCADE,
    MealPeriod     VARCHAR(10) CHECK (MealPeriod IN ('MORNING','MIDDAY','EVENING')),
    FoodType       VARCHAR(100),
    QuantityGrams  INT,
    Notes          TEXT
);

-- Attendance
CREATE TABLE IF NOT EXISTS Attendance (
    AttendanceID SERIAL PRIMARY KEY,
    StaffID      INT REFERENCES Staff(StaffID),
    Action       VARCHAR(10) CHECK (Action IN ('CLOCK_IN','CLOCK_OUT')),
    Timestamp    TIMESTAMP DEFAULT NOW()
);

-- LeaveRequest
CREATE TABLE IF NOT EXISTS LeaveRequest (
    LeaveID            SERIAL PRIMARY KEY,
    StaffID            INT REFERENCES Staff(StaffID),
    StartDate          DATE NOT NULL,
    EndDate            DATE NOT NULL,
    Reason             TEXT,
    Status             VARCHAR(10) DEFAULT 'PENDING'
                           CHECK (Status IN ('PENDING','APPROVED','REJECTED')),
    ApprovedByStaffID  INT REFERENCES Staff(StaffID),
    CreatedAt          TIMESTAMP DEFAULT NOW()
);

-- AuditLog
CREATE TABLE IF NOT EXISTS AuditLog (
    AuditID        SERIAL PRIMARY KEY,
    StaffID        INT REFERENCES Staff(StaffID),
    ActionType     VARCHAR(20) CHECK (ActionType IN (
                       'CREATE','UPDATE','DELETE','CHECKIN','CHECKOUT','APPROVE')),
    TableAffected  VARCHAR(50),
    RecordID       INT,
    Description    TEXT,
    Timestamp      TIMESTAMP DEFAULT NOW()
);

-- Notification
CREATE TABLE IF NOT EXISTS Notification (
    NotificationID SERIAL PRIMARY KEY,
    RecipientType  VARCHAR(10) CHECK (RecipientType IN ('staff','customer')),
    RecipientID    INT NOT NULL,
    Type           VARCHAR(30) CHECK (Type IN (
                       'BOOKING_CONFIRMED','BOOKING_CANCELLED',
                       'CHECKIN_REMINDER','CARE_REPORT',
                       'PAYMENT_CONFIRMED','NEW_BOOKING_ALERT')),
    Title          VARCHAR(200),
    Body           TEXT,
    BookingID      INT REFERENCES Booking(BookingID),
    IsRead         BOOLEAN DEFAULT FALSE,
    SentAt         TIMESTAMP DEFAULT NOW()
);
```

---

## 8. Reset Password Hash (Utility)

กรณีต้องการตั้งรหัสผ่านทุก Staff เป็น `password123` สำหรับ dev:

```bash
cd src/backend
python update_hash.py
```

---

## 9. เชื่อม Frontend กับ Backend

Frontend ทุกไฟล์ใช้ `base URL = http://127.0.0.1:5000/api`

ใน `js/services/api.js` ตั้งค่า:

```javascript
const API_BASE = 'http://127.0.0.1:5000/api';

// ตัวอย่าง fetch พร้อม Auth header
async function apiFetch(path, options = {}) {
    const token = localStorage.getItem('access_token');
    return fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers,
        }
    });
}
```

> **CORS:** Backend เปิด `CORS(app)` ไว้แล้ว รองรับทุก origin ในโหมด dev

---

## 10. ลำดับการ Test API (แนะนำ)

```
1. GET  /api/test-connection         ← ตรวจ DB
2. POST /api/auth/login              ← รับ access_token
3. GET  /api/staff                   ← ทดสอบ auth header
4. GET  /api/pets                    ← ดึงข้อมูล pet
5. GET  /api/bookings/rooms/availability?checkin_date=...&checkout_date=...&pet_type=CAT
6. POST /api/bookings/create         ← สร้าง booking
7. GET  /api/billing/{booking_id}    ← ดู invoice
8. POST /api/attendance/clock        ← clock-in staff
9. GET  /api/notifications           ← ดู notification
```

---

## 11. Troubleshooting

| ปัญหา | สาเหตุ | วิธีแก้ |
|---|---|---|
| `ModuleNotFoundError: psycopg2` | ไม่ได้ติดตั้ง dependencies | `pip install -r requirements.txt` |
| `could not connect to server` | DATABASE_URL ผิด หรือ Supabase offline | เช็ค .env และ Supabase dashboard |
| `401 Unauthorized` | ไม่ได้แนบ Bearer token | เช็ค localStorage และ Authorization header |
| `CORS error` | Frontend เปิดจาก file:// | ใช้ Live Server extension ใน VS Code แทน |
| `bcrypt error` ใน Docker | ขาด gcc | Dockerfile มี `apt-get install gcc` แล้ว ✅ |
| `JWT decode error` | SECRET_KEY ไม่ตรงกัน | เช็ค .env ว่า SECRET_KEY ตรงกับที่ใช้ออก token |
