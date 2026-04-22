# about_db.md — Database Schema & Design Reference
> Purrfect Stay · PostgreSQL 15 (Supabase)  
> อัปเดตล่าสุด: Apr 2026

---

## Overview

ฐานข้อมูลออกแบบตาม **3NF (Third Normal Form)** รองรับการทำงานของ Pet Hotel Management System ครบทุก FR  
การเชื่อมต่อทำผ่าน `psycopg2` โดยใช้ **raw SQL เท่านั้น** (ไม่ใช้ ORM ตามข้อกำหนดของวิชา)

```
DATABASE
└── purrfect_stay (Supabase PostgreSQL 15)
    ├── Staff               FR1 — พนักงาน
    ├── Attendance          FR1 — บันทึกเวลาเข้า-ออก
    ├── LeaveRecord         FR1 — คำขอลา
    ├── AuditTrail          FR1 — Audit log
    ├── Customer            Phase 2 — ลูกค้า
    ├── Pet                 FR2 — สัตว์เลี้ยง
    ├── VaccinationRecord   FR2 — ประวัติวัคซีน
    ├── MealPlan            FR2 — แผนอาหาร
    ├── Room                FR3 — ห้องพัก
    ├── Booking             FR3 — การจอง
    ├── BookingDetail       FR3 — รายละเอียดการจอง (Booking ↔ Pet ↔ Room)
    ├── BookingService      FR3 — บริการเสริมที่เลือกตอน booking
    ├── Invoice             FR5 — ใบเสร็จ
    ├── CareLog             FR4 — รายงานการดูแลรายวัน
    ├── InventoryItem       FR6 — รายการสินค้าและบริการ
    ├── InventoryUsage      FR6 — บันทึกการใช้งานสินค้า
    └── Notification        FR7 — การแจ้งเตือน
```

---

## Entity Relationship Diagram (Text)

```
Customer ──< Pet >──< VaccinationRecord
    |          |──< MealPlan
    |
    └──< Booking >──< BookingDetail >── Pet
                |              └─────── Room
                |──< BookingService >── InventoryItem
                └──< Invoice
                         └── (Staff: issuedby)

BookingDetail ──< CareLog
BookingDetail ──< InventoryUsage >── InventoryItem

Staff ──< Attendance
Staff ──< LeaveRecord
Staff ──< AuditTrail
Staff ──< CareLog (loggedby)
Staff ──< Booking (createdby, cancelledby)
Staff ──< Invoice (issuedby)
Staff ──< Notification (recipient)
```

---

## Table Definitions

### Staff
> FR1 — พนักงานของโรงแรม

```sql
CREATE TABLE Staff (
    StaffID        SERIAL PRIMARY KEY,
    StaffUsername  VARCHAR(50)  UNIQUE NOT NULL,
    PasswordHash   TEXT         NOT NULL,          -- bcrypt hash
    FirstName      VARCHAR(100),
    LastName       VARCHAR(100),
    Role           VARCHAR(20)  CHECK (Role IN ('ADMIN','STAFF','VET','OWNER')),
    IsOnDuty       BOOLEAN      DEFAULT FALSE,     -- อัปเดตตอน clock-in/out
    PhoneNumber    VARCHAR(20),
    StaffEmail     VARCHAR(100),
    HireDate       DATE,
    "isActive"     BOOLEAN      DEFAULT TRUE       -- ⚠️ double-quoted (case-sensitive)
);
```

**หมายเหตุ:** `"isActive"` ใช้ double quotes เสมอใน SQL (case-sensitive) เพราะเป็น camelCase

---

### Customer
> Phase 2 — ลูกค้าเจ้าของสัตว์เลี้ยง (Phase 1 staff สร้างให้)

```sql
CREATE TABLE Customer (
    CustomerID       SERIAL PRIMARY KEY,
    CustomerUsername VARCHAR(50)  UNIQUE NOT NULL,
    PasswordHash     TEXT         NOT NULL,
    FirstName        VARCHAR(100),
    LastName         VARCHAR(100),
    PhoneNumber      VARCHAR(20),
    CustomerEmail    VARCHAR(100),
    Address          TEXT
);
```

---

### Pet
> FR2 — โปรไฟล์สัตว์เลี้ยง

```sql
CREATE TABLE Pet (
    PetID          SERIAL PRIMARY KEY,
    CustomerID     INT     REFERENCES Customer(CustomerID),
    Name           VARCHAR(100) NOT NULL,
    Species        VARCHAR(20),                    -- 'CAT', 'DOG', 'OTHER'
    Breed          VARCHAR(100),
    Sex            CHAR(1),                        -- 'M' หรือ 'F'
    DOB            DATE,
    Weight         NUMERIC(5,2),
    Coat_Color     VARCHAR(50),
    MedicalCondition TEXT,
    Allergy        TEXT,
    IsVaccinated   BOOLEAN DEFAULT FALSE,
    VaccineRecord  TEXT,                           -- Free-text fallback
    Behavior_Notes TEXT
);
```

---

### VaccinationRecord
> FR2.2 — ประวัติวัคซีนแบบ structured

```sql
CREATE TABLE VaccinationRecord (
    Vaccine_ID        SERIAL PRIMARY KEY,
    Pet_ID            INT  REFERENCES Pet(PetID) ON DELETE CASCADE,
    Vaccine_Name      VARCHAR(100) NOT NULL,
    Administered_Date DATE,
    Expiry_Date       DATE,
    VetClinic         VARCHAR(200),
    CertURL           TEXT         -- URL ไปยัง PDF cert ที่ upload ไว้ใน Storage
);
```

---

### MealPlan
> FR2.4 — แผนอาหารรายวัน

```sql
CREATE TABLE MealPlan (
    MealPlan_ID    SERIAL PRIMARY KEY,
    Pet_ID         INT  REFERENCES Pet(PetID) ON DELETE CASCADE,
    Meal_Period    VARCHAR(10) CHECK (Meal_Period IN ('MORNING','MIDDAY','EVENING')),
    Food_Type      VARCHAR(100),
    Quantity_Grams INT,
    Notes          TEXT
);
```

---

### Room
> FR3 — ห้องพัก

```sql
CREATE TABLE Room (
    RoomID      SERIAL PRIMARY KEY,
    RoomNumber  VARCHAR(10) UNIQUE,
    RoomSize    VARCHAR(20),               -- 'STANDARD', 'DELUXE', 'VIP'
    PetType     VARCHAR(10),               -- 'CAT', 'DOG'
    Rate        NUMERIC(10,2),             -- ราคาต่อคืน (ล็อคใน Booking เวลาจอง)
    Status      VARCHAR(20) DEFAULT 'AVAILABLE'
                CHECK (Status IN ('AVAILABLE','OCCUPIED','MAINTENANCE','CLEANING'))
);
```

---

### Booking
> FR3 — การจองหลัก

```sql
CREATE TABLE Booking (
    BookingID          SERIAL PRIMARY KEY,
    CustomerID         INT   REFERENCES Customer(CustomerID),
    CheckInDate        TIMESTAMP,
    CheckOutDate       TIMESTAMP,
    Status             VARCHAR(20) DEFAULT 'PENDING'
                       CHECK (Status IN ('PENDING','CONFIRMED','ACTIVE','COMPLETED','CANCELLED')),
    LockedRate         NUMERIC(10,2),        -- ล็อคราคาห้อง ณ เวลาจอง (FR3.2)
    CreatedBy_StaffID  INT   REFERENCES Staff(StaffID),
    CancelledAt        DATE,
    CancelledByStaffID INT   REFERENCES Staff(StaffID)
);
```

**Status Flow:**
```
PENDING → ACTIVE (check-in) → COMPLETED (check-out)
PENDING → CANCELLED
```

---

### BookingDetail
> FR3 — เชื่อม Booking ↔ Pet ↔ Room (1 Booking มีได้หลาย pet/room)

```sql
CREATE TABLE BookingDetail (
    BookingDetailID SERIAL PRIMARY KEY,
    BookingID       INT REFERENCES Booking(BookingID),
    PetID           INT REFERENCES Pet(PetID),
    RoomID          INT REFERENCES Room(RoomID)
);
```

---

### BookingService
> FR3.3 — บริการเสริมที่เลือกตอน booking หรือเพิ่มระหว่างพัก

```sql
CREATE TABLE BookingService (
    BookingID  INT           REFERENCES Booking(BookingID),
    ItemID     INT           REFERENCES InventoryItem(ItemID),
    Quantity   INT           DEFAULT 1,
    UnitPrice  NUMERIC(10,2),
    PRIMARY KEY (BookingID, ItemID)
);
```

---

### Invoice
> FR5 — ใบเสร็จ (สร้างพร้อม Booking, อัปเดตตอน check-out)

```sql
CREATE TABLE Invoice (
    InvoiceID          SERIAL PRIMARY KEY,
    BookingID          INT    REFERENCES Booking(BookingID),
    RoomTotal          NUMERIC(10,2)  DEFAULT 0,
    ServiceTotal       NUMERIC(10,2)  DEFAULT 0,
    VetEmergencyCost   NUMERIC(10,2)  DEFAULT 0,
    DepositPaid        NUMERIC(10,2)  DEFAULT 0,
    GrandTotal         NUMERIC(10,2)
                       GENERATED ALWAYS AS (RoomTotal + ServiceTotal + VetEmergencyCost) STORED,
    PaymentMethod      VARCHAR(20),               -- 'cash', 'qr_promptpay', 'credit_card'
    PaymentStatus      VARCHAR(20)  DEFAULT 'UNPAID'
                       CHECK (PaymentStatus IN ('UNPAID','PAID','PARTIAL')),
    PaymentDate        TIMESTAMP,
    IssuedBy_StaffID   INT    REFERENCES Staff(StaffID)
);
```

**หมายเหตุ:** `GrandTotal` เป็น Generated Column — ไม่ต้อง SET ตรงๆ

---

### CareLog
> FR4 — บันทึกการดูแลรายวัน

```sql
CREATE TABLE CareLog (
    LogID             SERIAL PRIMARY KEY,
    BookingDetailID   INT    REFERENCES BookingDetail(BookingDetailID),
    LogDate           TIMESTAMP DEFAULT NOW(),
    FoodStatus        VARCHAR(20) CHECK (FoodStatus IN ('ALL','LITTLE','NONE')),
    PottyStatus       VARCHAR(20) CHECK (PottyStatus IN ('NORMAL','ABNORMAL')),
    Mood              VARCHAR(20) CHECK (Mood IN ('HAPPY','NEUTRAL','ANXIOUS','SICK')),
    Behavior_Notes    TEXT,
    MedicationGiven   BOOLEAN DEFAULT FALSE,
    StaffNote         TEXT,                       -- แจ้งเจ้าของ
    PhotoURL          TEXT,
    LoggedBy_StaffID  INT    REFERENCES Staff(StaffID)
);
```

---

### InventoryItem
> FR6 — รายการสินค้า (ทั้ง consumables และ services ที่คิดเงิน)

```sql
CREATE TABLE InventoryItem (
    ItemID            SERIAL PRIMARY KEY,
    ItemName          VARCHAR(100),
    Category          VARCHAR(20) CHECK (Category IN ('SUPPLY','FOOD','SERVICE')),
    QuantityInStock   INT           DEFAULT 0,
    UnitPrice         NUMERIC(10,2),
    LowStockThreshold INT           DEFAULT 5,
    IsChargeable      BOOLEAN       DEFAULT FALSE, -- ถ้า TRUE = บริการเสริมที่คิดเงินลูกค้า
    Expiry_Date       DATE
);
```

---

### InventoryUsage
> FR6 — บันทึกการใช้งาน (internal consumption ของโรงแรม)

```sql
CREATE TABLE InventoryUsage (
    UsageID          SERIAL PRIMARY KEY,
    BookingDetailID  INT REFERENCES BookingDetail(BookingDetailID),
    ItemID           INT REFERENCES InventoryItem(ItemID),
    QuantityUsed     INT,
    StaffID          INT REFERENCES Staff(StaffID),
    UsedAt           TIMESTAMP DEFAULT NOW()
);
```

---

### Attendance
> FR1.4 — บันทึกเวลาเข้า-ออกงาน

```sql
CREATE TABLE Attendance (
    AttendanceID SERIAL PRIMARY KEY,
    StaffID      INT  REFERENCES Staff(StaffID),
    WorkDate     DATE,
    ClockIn      TIME,
    ClockOut     TIME,
    Status       VARCHAR(10) CHECK (Status IN ('On Time','Late','Absent')),
    Note         TEXT
);
```

---

### LeaveRecord
> FR1 — คำขอลา

```sql
CREATE TABLE LeaveRecord (
    LeaveID           SERIAL PRIMARY KEY,
    StaffID           INT  REFERENCES Staff(StaffID),
    LeaveType         VARCHAR(20) CHECK (LeaveType IN ('SICK_LEAVE','PERSONAL_LEAVE','ANNUAL_LEAVE')),
    StartDate         DATE NOT NULL,
    EndDate           DATE NOT NULL,
    Reason            TEXT,
    Status            VARCHAR(10) DEFAULT 'PENDING'
                      CHECK (Status IN ('PENDING','APPROVED','REJECTED')),
    ApprovedBy        INT  REFERENCES Staff(StaffID),
    CreatedAt         TIMESTAMP DEFAULT NOW(),
    UpdatedAt         TIMESTAMP
);
```

---

### AuditTrail
> FR1.5 — บันทึกกิจกรรมสำคัญในระบบ

```sql
CREATE TABLE AuditTrail (
    AuditID        SERIAL PRIMARY KEY,
    StaffID        INT    REFERENCES Staff(StaffID),
    StaffName      VARCHAR(200),        -- เก็บชื่อไว้ในตาราง (ป้องกันชื่อหายถ้า Staff ถูกลบ)
    ActionType     VARCHAR(20) CHECK (ActionType IN ('CREATE','UPDATE','DELETE','CHECKIN','CHECKOUT','APPROVE')),
    TableAffected  VARCHAR(50),
    RecordID       INT,
    Description    TEXT,
    Timestamp      TIMESTAMP DEFAULT NOW()
);
```

---

### Notification
> FR7 — การแจ้งเตือน

```sql
CREATE TABLE Notification (
    Notification_ID      SERIAL PRIMARY KEY,
    RecipientType        VARCHAR(10) CHECK (RecipientType IN ('staff','customer')),
    Recipient_Staff_ID   INT  REFERENCES Staff(StaffID),   -- NULL = broadcast ทุกคน
    Type                 VARCHAR(30) CHECK (Type IN (
                            'BOOKING_CONFIRMED','BOOKING_CANCELLED',
                            'CHECKIN_REMINDER','CARE_REPORT',
                            'PAYMENT_CONFIRMED','NEW_BOOKING_ALERT')),
    Title                VARCHAR(200),
    Body                 TEXT,
    Booking_ID           INT  REFERENCES Booking(BookingID),
    Is_Read              BOOLEAN DEFAULT FALSE,
    Sent_At              TIMESTAMP DEFAULT NOW()
);
```

---

## Column Naming Conventions

| รูปแบบ | ตัวอย่าง | หมายเหตุ |
|:---|:---|:---|
| PascalCase | `StaffID`, `BookingID` | Primary/Foreign keys และ field หลัก |
| snake_case | `coat_color`, `behavior_notes`, `is_read` | บางตารางใหม่ใช้ snake_case |
| camelCase (double-quoted) | `"isActive"` | ⚠️ ต้องใส่ double quotes ใน SQL เสมอ |

---

## Key Relationships & Constraints

| Relationship | Cardinality | หมายเหตุ |
|:---|:---|:---|
| Customer → Pet | 1:N | 1 Customer มีได้หลาย Pet |
| Booking → BookingDetail | 1:N | 1 Booking มีได้หลาย Pet/Room |
| BookingDetail → CareLog | 1:N | ดูแล 1 pet/room ได้หลายวัน |
| BookingDetail → InventoryUsage | 1:N | ใช้สินค้าหลายรายการต่อ stay |
| Pet → VaccinationRecord | 1:N (CASCADE DELETE) | |
| Pet → MealPlan | 1:N (CASCADE DELETE) | |
| Booking → Invoice | 1:1 | สร้างพร้อมกัน ณ เวลา create booking |
| Booking → BookingService | 1:N | บริการเสริม |

---

## Important Business Rules (Constraints in Code)

| Rule | ที่ enforce |
|:---|:---|
| ราคาห้องล็อคตอนจอง (FR3.2) | `Booking.LockedRate` — บันทึก ณ เวลาจอง ไม่เปลี่ยนแม้ Room.Rate จะเปลี่ยน |
| ห้องว่างตรวจแบบ overlap query | `rooms.py` — `checkindate < checkout_new AND checkoutdate > checkin_new` |
| ยกเลิกได้เฉพาะ status ที่ไม่ใช่ COMPLETED/CANCELLED | `bookings.py cancel()` — WHERE clause |
| CareLog ต้อง resolve ผ่าน booking_id + pet_id | `care_logs.py` — sub-query หา `bookingdetailid` |
| GrandTotal คำนวณอัตโนมัติ | `Invoice.GrandTotal` — GENERATED ALWAYS AS column |

---

## Late Detection Logic (Attendance)

```python
# Clock-in หลัง 09:05 ถือว่า "Late"
status = 'Late' if (
    current_time.hour > 9 or
    (current_time.hour == 9 and current_time.minute > 5)
) else 'On Time'
```

---

## Low Stock Alert Threshold (FR6.1.1)

```sql
-- แจ้งเตือนเมื่อ quantityinstock <= lowstockthreshold
-- ตัวอย่าง: stock 3, threshold 5 → ALERT
-- Frontend Inventory.js ใช้ < 20% ของ quantity_total ด้วย (client-side logic)
```

---

## SQL ที่ใช้บ่อย

### ห้องว่าง (Room Availability)
```sql
SELECT roomid, roomnumber, roomsize, pettype, rate, status
FROM room
WHERE pettype = 'CAT'
  AND status != 'MAINTENANCE'
  AND roomid NOT IN (
      SELECT bd.roomid
      FROM bookingdetail bd
      JOIN booking b ON bd.bookingid = b.bookingid
      WHERE b.status NOT IN ('CANCELLED', 'COMPLETED')
        AND b.checkindate  < '2026-04-28'     -- checkout ใหม่
        AND b.checkoutdate > '2026-04-25'     -- checkin ใหม่
  )
ORDER BY roomnumber;
```

### Analytics Dashboard
```sql
-- Revenue + Booking summary ในช่วงที่เลือก
SELECT
    COUNT(b.bookingid)                                AS total_bookings,
    COUNT(CASE WHEN b.status = 'ACTIVE' THEN 1 END)  AS checked_in,
    COALESCE(SUM(CASE WHEN i.paymentstatus IN ('PAID','PARTIAL')
                   THEN i.grandtotal ELSE 0 END), 0) AS total_revenue
FROM booking b
LEFT JOIN invoice i ON b.bookingid = i.bookingid
WHERE b.checkindate::date >= '2026-04-01'
  AND b.checkindate::date <= '2026-04-30';
```

### Active Stays (Care Reports)
```sql
SELECT b.bookingid, p.name, p.species, r.roomnumber, b.checkoutdate,
       EXISTS (
           SELECT 1 FROM carelog c
           WHERE c.bookingdetailid = bd.bookingdetailid
             AND (c.logdate AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Bangkok')::date
               = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Bangkok')::date
       ) AS reported_today
FROM booking b
JOIN bookingdetail bd ON b.bookingid = bd.bookingid
JOIN pet p ON bd.petid = p.petid
LEFT JOIN room r ON bd.roomid = r.roomid
WHERE CURRENT_DATE >= b.checkindate::date
  AND CURRENT_DATE <= b.checkoutdate::date;
```
