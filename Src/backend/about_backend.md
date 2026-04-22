# About Backend — Purrfect Stay API
> อัปเดตล่าสุด: 21 Apr 2026  
> Base URL: `http://127.0.0.1:5000/api`  
> Stack: Python 3.10 · Flask · psycopg2 · PostgreSQL (Supabase) · bcrypt · PyJWT

---

## โครงสร้างไฟล์ Backend

```
src/backend/
├── app.py                  ← Flask app + Blueprint registry
├── config.py               ← โหลด .env (DATABASE_URL, SECRET_KEY)
├── requirements.txt
├── Dockerfile
├── update_hash.py          ← utility: reset password hash ใน DB
│
└── routes/
    ├── auth.py             ← FR1: /api/auth
    ├── staff.py            ← FR1: /api/staff
    ├── attendance.py       ← FR1: /api/attendance  [NEW]
    ├── leave.py            ← FR1: /api/leave        [NEW]
    ├── audit.py            ← FR1: /api/audit        [NEW]
    ├── pets.py             ← FR2: /api/pets (+ vaccines, meal-plans)
    ├── bookings.py         ← FR3: /api/bookings
    ├── rooms.py            ← FR3: /api/rooms        [NEW]
    ├── care_reports.py     ← FR4: /api/care-reports [NEW — alias care_logs]
    ├── billing.py          ← FR5: /api/billing      [NEW — alias invoice]
    ├── inventory.py        ← FR6: /api/inventory
    ├── analytics.py        ← FR6: /api/analytics    [NEW]
    └── notifications.py    ← FR7: /api/notifications [NEW]
```

---

## Blueprint Registry (app.py)

| Blueprint | URL Prefix | ไฟล์ |
|---|---|---|
| auth_bp | `/api/auth` | auth.py |
| staff_bp | `/api/staff` | staff.py |
| attendance_bp | `/api/attendance` | attendance.py |
| leave_bp | `/api/leave` | leave.py |
| audit_bp | `/api/audit` | audit.py |
| pets_bp | `/api/pets` | pets.py |
| rooms_bp | `/api/rooms` | rooms.py |
| bookings_bp | `/api/bookings` | bookings.py |
| care_reports_bp | `/api/care-reports` | care_reports.py |
| billing_bp | `/api/billing` | billing.py |
| inventory_bp | `/api/inventory` | inventory.py |
| analytics_bp | `/api/analytics` | analytics.py |
| notifications_bp | `/api/notifications` | notifications.py |

---

## Database Schema (inferred)

### ตารางที่มีอยู่แล้ว

```sql
-- FR1: Staff
CREATE TABLE Staff (
    StaffID       SERIAL PRIMARY KEY,
    StaffUsername VARCHAR(50) UNIQUE NOT NULL,
    PasswordHash  TEXT NOT NULL,
    FirstName     VARCHAR(100),
    LastName      VARCHAR(100),
    Role          VARCHAR(20) CHECK (Role IN ('ADMIN','STAFF','VET','OWNER')),
    IsOnDuty      BOOLEAN DEFAULT FALSE,
    PhoneNumber   VARCHAR(20),
    StaffEmail    VARCHAR(100),
    HireDate      DATE,
    "isActive"    BOOLEAN DEFAULT TRUE
);

-- FR1: Customer
CREATE TABLE Customer (
    CustomerID       SERIAL PRIMARY KEY,
    CustomerUsername VARCHAR(50) UNIQUE NOT NULL,
    PasswordHash     TEXT NOT NULL,
    FirstName        VARCHAR(100),
    LastName         VARCHAR(100),
    PhoneNumber      VARCHAR(20),
    CustomerEmail    VARCHAR(100),
    Address          TEXT
);

-- FR2: Pet
CREATE TABLE Pet (
    PetID         SERIAL PRIMARY KEY,
    CustomerID    INT REFERENCES Customer(CustomerID),
    Name          VARCHAR(100) NOT NULL,
    Species       VARCHAR(20),
    Breed         VARCHAR(100),
    Sex           CHAR(1),
    DateOfBirth   DATE,
    Weight        NUMERIC(5,2),
    CoatColor     VARCHAR(50),
    PhotoURL      TEXT,
    MedicalNotes  TEXT,
    Allergies     TEXT,
    BehaviorNotes TEXT
);

-- FR3: Room
CREATE TABLE Room (
    RoomID           SERIAL PRIMARY KEY,
    RoomNumber       VARCHAR(10) UNIQUE,
    RoomSize         VARCHAR(20),
    Rate             NUMERIC(10,2),
    Status           VARCHAR(20) DEFAULT 'AVAILABLE',
    PetType          VARCHAR(10)
);

-- FR3: Booking
CREATE TABLE Booking (
    BookingID          SERIAL PRIMARY KEY,
    CustomerID         INT REFERENCES Customer(CustomerID),
    CheckInDate        TIMESTAMP,
    CheckOutDate       TIMESTAMP,
    Status             VARCHAR(20) DEFAULT 'PENDING',
    LockedRate         NUMERIC(10,2),
    CreatedBy_StaffID  INT REFERENCES Staff(StaffID),
    CancelledAt        DATE,
    CancelledByStaffID INT REFERENCES Staff(StaffID)
);

-- FR3: BookingDetail
CREATE TABLE BookingDetail (
    BookingDetailID SERIAL PRIMARY KEY,
    BookingID       INT REFERENCES Booking(BookingID),
    PetID           INT REFERENCES Pet(PetID),
    RoomID          INT REFERENCES Room(RoomID)
);

-- FR3: BookingService
CREATE TABLE BookingService (
    BookingID  INT REFERENCES Booking(BookingID),
    ItemID     INT REFERENCES InventoryItem(ItemID),
    Quantity   INT DEFAULT 1,
    UnitPrice  NUMERIC(10,2),
    PRIMARY KEY (BookingID, ItemID)
);

-- FR5: Invoice
CREATE TABLE Invoice (
    InvoiceID          SERIAL PRIMARY KEY,
    BookingID          INT REFERENCES Booking(BookingID),
    RoomTotal          NUMERIC(10,2) DEFAULT 0,
    ServiceTotal       NUMERIC(10,2) DEFAULT 0,
    VetEmergencyCost   NUMERIC(10,2) DEFAULT 0,
    DepositPaid        NUMERIC(10,2) DEFAULT 0,
    GrandTotal         NUMERIC(10,2) GENERATED ALWAYS AS (RoomTotal + ServiceTotal + VetEmergencyCost) STORED,
    PaymentMethod      VARCHAR(20),
    PaymentStatus      VARCHAR(20) DEFAULT 'UNPAID',
    PaymentDate        TIMESTAMP,
    IssuedBy_StaffID   INT REFERENCES Staff(StaffID)
);

-- FR4: CareLog
CREATE TABLE CareLog (
    LogID              SERIAL PRIMARY KEY,
    BookingDetailID    INT REFERENCES BookingDetail(BookingDetailID),
    LogDate            TIMESTAMP DEFAULT NOW(),
    FoodStatus         VARCHAR(20),
    PottyStatus        VARCHAR(20),
    MedicationGiven    BOOLEAN DEFAULT FALSE,
    StaffNote          TEXT,
    PhotoURL           TEXT,
    LoggedBy_StaffID   INT REFERENCES Staff(StaffID)
);

-- FR6: InventoryItem
CREATE TABLE InventoryItem (
    ItemID            SERIAL PRIMARY KEY,
    ItemName          VARCHAR(100),
    Category          VARCHAR(20) CHECK (Category IN ('SUPPLY','FOOD','SERVICE')),
    QuantityInStock   INT DEFAULT 0,
    UnitPrice         NUMERIC(10,2),
    LowStockThreshold INT DEFAULT 5,
    IsChargeable      BOOLEAN DEFAULT FALSE
);

-- FR6: InventoryUsage
CREATE TABLE InventoryUsage (
    UsageID         SERIAL PRIMARY KEY,
    BookingDetailID INT REFERENCES BookingDetail(BookingDetailID),
    ItemID          INT REFERENCES InventoryItem(ItemID),
    QuantityUsed    INT,
    UsedAt          TIMESTAMP DEFAULT NOW()
);
```

### ตารางใหม่ที่ต้องสร้าง (DDL)

```sql
-- FR2: Vaccine
CREATE TABLE Vaccine (
    VaccineID         SERIAL PRIMARY KEY,
    PetID             INT REFERENCES Pet(PetID) ON DELETE CASCADE,
    VaccineName       VARCHAR(100) NOT NULL,
    AdministeredDate  DATE,
    ExpiryDate        DATE,
    VetClinic         VARCHAR(200),
    CertURL           TEXT
);

-- FR2: MealPlan
CREATE TABLE MealPlan (
    MealPlanID     SERIAL PRIMARY KEY,
    PetID          INT REFERENCES Pet(PetID) ON DELETE CASCADE,
    MealPeriod     VARCHAR(10) CHECK (MealPeriod IN ('MORNING','MIDDAY','EVENING')),
    FoodType       VARCHAR(100),
    QuantityGrams  INT,
    Notes          TEXT
);

-- FR1: Attendance
CREATE TABLE Attendance (
    AttendanceID SERIAL PRIMARY KEY,
    StaffID      INT REFERENCES Staff(StaffID),
    Action       VARCHAR(10) CHECK (Action IN ('CLOCK_IN','CLOCK_OUT')),
    Timestamp    TIMESTAMP DEFAULT NOW()
);

-- FR1: LeaveRequest
CREATE TABLE LeaveRequest (
    LeaveID            SERIAL PRIMARY KEY,
    StaffID            INT REFERENCES Staff(StaffID),
    StartDate          DATE NOT NULL,
    EndDate            DATE NOT NULL,
    Reason             TEXT,
    Status             VARCHAR(10) DEFAULT 'PENDING' CHECK (Status IN ('PENDING','APPROVED','REJECTED')),
    ApprovedByStaffID  INT REFERENCES Staff(StaffID),
    CreatedAt          TIMESTAMP DEFAULT NOW()
);

-- FR1: AuditLog
CREATE TABLE AuditLog (
    AuditID        SERIAL PRIMARY KEY,
    StaffID        INT REFERENCES Staff(StaffID),
    ActionType     VARCHAR(20) CHECK (ActionType IN ('CREATE','UPDATE','DELETE','CHECKIN','CHECKOUT','APPROVE')),
    TableAffected  VARCHAR(50),
    RecordID       INT,
    Description    TEXT,
    Timestamp      TIMESTAMP DEFAULT NOW()
);

-- FR7: Notification
CREATE TABLE Notification (
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

## Auth — JWT

- Algorithm: `HS256`
- Expiry: 8 ชั่วโมงหลัง login
- Header ทุก request (ยกเว้น `/api/auth/login`):
  ```
  Authorization: Bearer <access_token>
  ```
- Payload Staff: `{ staff_id, role, exp }`
- Payload Customer: `{ customer_id, role: "CUSTOMER", exp }`

---

## URL Mapping — Frontend vs Backend

| Frontend expects | Backend registers | สถานะ |
|---|---|---|
| `/api/auth` | `/api/auth` | ✅ ตรงกัน |
| `/api/staff` | `/api/staff` | ✅ ตรงกัน |
| `/api/attendance` | `/api/attendance` | ✅ (NEW) |
| `/api/leave` | `/api/leave` | ✅ (NEW) |
| `/api/audit` | `/api/audit` | ✅ (NEW) |
| `/api/pets` | `/api/pets` | ✅ ตรงกัน |
| `/api/rooms` | `/api/rooms` | ✅ (NEW) |
| `/api/bookings` | `/api/bookings` | ✅ ตรงกัน |
| `/api/care-reports` | `/api/care-reports` | ✅ (NEW) |
| `/api/billing` | `/api/billing` | ✅ (NEW) |
| `/api/inventory` | `/api/inventory` | ✅ ตรงกัน |
| `/api/analytics` | `/api/analytics` | ✅ (NEW) |
| `/api/notifications` | `/api/notifications` | ✅ (NEW) |

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

HTTP Status: `200` · `201` · `400` · `401` · `403` · `404` · `409` · `500`

---

## สิ่งที่ยังต้องทำ (TODO)

- [ ] JWT middleware decorator `@require_auth` สำหรับทุก protected route
- [ ] Role-based guard `@require_role('ADMIN')` สำหรับ audit, deactivate staff
- [ ] ส่ง notification อัตโนมัติหลัง `POST /api/care-reports` (FR4.2)
- [ ] File upload endpoint สำหรับรูปภาพ care report (`multipart/form-data`)
- [ ] Trigger AuditLog เมื่อมีการ CREATE / UPDATE / DELETE ในทุก module
