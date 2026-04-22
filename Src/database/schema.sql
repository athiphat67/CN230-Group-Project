-- ============================================================
-- Purrfect Stay — schema.sql (v2 — Business Logic Fixed)
-- แก้ไข 4 จุด: PARTIAL deposit, Pet NOT NULL, IsChargeable, BookingDetailID
-- ============================================================

-- ── ENUMS ────────────────────────────────────────────────────
CREATE TYPE species_enum       AS ENUM ('DOG', 'CAT', 'BIRD', 'OTHER');
CREATE TYPE attendance_status  AS ENUM ('ONTIME', 'LATE', 'ABSENT');
CREATE TYPE leave_type         AS ENUM ('SICK_LEAVE', 'PERSONAL_LEAVE', 'ANNUAL_LEAVE');
CREATE TYPE leave_status       AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE room_size_enum     AS ENUM ('SMALL', 'MEDIUM', 'LARGE');
CREATE TYPE pet_type_enum      AS ENUM ('CAT', 'DOG');
CREATE TYPE room_status_enum   AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE');
CREATE TYPE booking_status     AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE food_status_enum   AS ENUM ('ALL', 'LITTLE', 'NONE');
CREATE TYPE potty_status_enum  AS ENUM ('NORMAL', 'ABNORMAL', 'NONE');
-- [FIX 1] รองรับสถานะบิลที่ยกเลิกจากหน้า Billing
CREATE TYPE payment_status     AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'CANCELLED');

-- ── 1. CUSTOMER ──────────────────────────────────────────────
CREATE TABLE Customer (
    CustomerID       SERIAL PRIMARY KEY,
    CustomerUsername VARCHAR(50)  NOT NULL UNIQUE,
    PasswordHash     VARCHAR(255) NOT NULL,
    FirstName        VARCHAR(255) NOT NULL,
    LastName         VARCHAR(255) NOT NULL,
    PhoneNumber      VARCHAR(20),
    CustomerEmail    VARCHAR(50)  NOT NULL UNIQUE,
    Address          TEXT
);

-- ── 2. STAFF ─────────────────────────────────────────────────
CREATE TABLE Staff (
    StaffID       SERIAL PRIMARY KEY,
    StaffUsername VARCHAR(50)  NOT NULL UNIQUE,
    PasswordHash  VARCHAR(255) NOT NULL,
    FirstName     VARCHAR(255) NOT NULL,
    LastName      VARCHAR(255) NOT NULL,
    Role          VARCHAR(50)  NOT NULL,
    IsOnDuty      BOOLEAN      NOT NULL DEFAULT FALSE,
    PhoneNumber   VARCHAR(20),
    StaffEmail    VARCHAR(50)  NOT NULL UNIQUE,
    HireDate      DATE         NOT NULL DEFAULT CURRENT_DATE
);

-- ── 3. ATTENDANCE ─────────────────────────────────────────────
CREATE TABLE Attendance (
    AttendanceID SERIAL PRIMARY KEY,
    StaffID      INT               NOT NULL REFERENCES Staff(StaffID) ON DELETE CASCADE,
    WorkDate     DATE              NOT NULL,
    ClockInTime  TIMESTAMP,
    ClockOutTime TIMESTAMP,
    Status       attendance_status NOT NULL DEFAULT 'ONTIME',
    Remark       VARCHAR(255),
    CONSTRAINT chk_clockout CHECK (ClockOutTime IS NULL OR ClockOutTime > ClockInTime)
);

-- ── 4. LEAVE RECORD ───────────────────────────────────────────
CREATE TABLE LeaveRecord (
    LeaveID    SERIAL PRIMARY KEY,
    StaffID    INT          NOT NULL REFERENCES Staff(StaffID) ON DELETE CASCADE,
    LeaveType  leave_type   NOT NULL,
    StartDate  DATE         NOT NULL,
    EndDate    DATE         NOT NULL,
    Reason     TEXT,
    Status     leave_status NOT NULL DEFAULT 'PENDING',
    ApprovedBy INT          REFERENCES Staff(StaffID),
    CreatedAt  TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_leave_dates CHECK (EndDate >= StartDate)
);

-- ── 5. PET ────────────────────────────────────────────────────
-- [FIX 2] บังคับ MedicalCondition, Allergy, VaccineRecord ด้วย DEFAULT 'ไม่มี'
CREATE TABLE Pet (
    PetID            SERIAL PRIMARY KEY,
    CustomerID       INT          NOT NULL REFERENCES Customer(CustomerID) ON DELETE CASCADE,
    Name             VARCHAR(100) NOT NULL,
    Species          species_enum NOT NULL,
    Breed            VARCHAR(100),
    Weight           DECIMAL(5,2),
    MedicalCondition TEXT         NOT NULL DEFAULT 'ไม่มี',
    Allergy          TEXT         NOT NULL DEFAULT 'ไม่มี',
    IsVaccinated     BOOLEAN      NOT NULL DEFAULT FALSE,
    VaccineRecord    TEXT         NOT NULL DEFAULT 'ไม่มี'
);

-- ── 6. ROOM ───────────────────────────────────────────────────
CREATE TABLE Room (
    RoomID     SERIAL PRIMARY KEY,
    RoomNumber VARCHAR(20)      NOT NULL UNIQUE,
    RoomSize   room_size_enum,
    PetType    pet_type_enum,
    Rate       DECIMAL(10,2)    NOT NULL,
    Status     room_status_enum NOT NULL DEFAULT 'AVAILABLE'
);

-- ── 7. BOOKING ────────────────────────────────────────────────
CREATE TABLE Booking (
    BookingID          SERIAL PRIMARY KEY,
    CustomerID         INT            NOT NULL REFERENCES Customer(CustomerID),
    CheckInDate        TIMESTAMP      NOT NULL,
    CheckOutDate       TIMESTAMP      NOT NULL,
    Status             booking_status NOT NULL DEFAULT 'PENDING',
    CreatedBy_StaffID  INT            REFERENCES Staff(StaffID),
    LockedRate         DECIMAL(10,2)  NOT NULL,
    CancelledAt        DATE,
    CancelledByStaffID INT            REFERENCES Staff(StaffID),
    CONSTRAINT chk_booking_dates CHECK (CheckOutDate > CheckInDate)
);

-- ── 8. BOOKING DETAIL ─────────────────────────────────────────
CREATE TABLE BookingDetail (
    BookingDetailID SERIAL PRIMARY KEY,
    BookingID       INT NOT NULL REFERENCES Booking(BookingID) ON DELETE CASCADE,
    PetID           INT NOT NULL REFERENCES Pet(PetID),
    RoomID          INT NOT NULL REFERENCES Room(RoomID),
    CONSTRAINT uq_booking_room UNIQUE (BookingID, RoomID)
);

-- ── 9. CARE LOG ──────────────────────────────────────────────
CREATE TABLE CareLog (
    LogID            SERIAL PRIMARY KEY,
    BookingDetailID  INT               NOT NULL REFERENCES BookingDetail(BookingDetailID) ON DELETE CASCADE,
    LogDate          TIMESTAMP         NOT NULL DEFAULT NOW(),
    FoodStatus       food_status_enum,
    PottyStatus      potty_status_enum,
    MedicationGiven  BOOLEAN           NOT NULL DEFAULT FALSE,
    StaffNote        TEXT,
    PhotoURL         VARCHAR(255),
    LoggedBy_StaffID INT               REFERENCES Staff(StaffID)
);

-- ── 10. INVENTORY ITEM ────────────────────────────────────────
-- [FIX 3] เพิ่ม IsChargeable เพื่อแยกของฟรี vs คิดเงิน
CREATE TABLE InventoryItem (
    ItemID            SERIAL PRIMARY KEY,
    ItemName          VARCHAR(255)  NOT NULL,
    Category          VARCHAR(50),   -- 'FOOD' | 'SUPPLY' | 'SERVICE'
    QuantityInStock   INT           NOT NULL DEFAULT 0,
    UnitPrice         DECIMAL(10,2),
    LowStockThreshold INT           NOT NULL DEFAULT 0,
    IsChargeable      BOOLEAN       NOT NULL DEFAULT TRUE,  -- FALSE = ของฟรี/รวมในแพ็กเกจ
    CONSTRAINT chk_stock_non_negative CHECK (QuantityInStock >= 0)
);

-- ── 11. BOOKING SERVICE ────────────────────────────────────────
CREATE TABLE BookingService (
    BookingServiceID SERIAL PRIMARY KEY,
    BookingID        INT NOT NULL REFERENCES Booking(BookingID) ON DELETE CASCADE,
    ItemID           INT NOT NULL REFERENCES InventoryItem(ItemID),
    Quantity         INT NOT NULL DEFAULT 1 CHECK (Quantity > 0),
    UnitPrice        DECIMAL(10,2) NOT NULL,
    CONSTRAINT uq_booking_service UNIQUE (BookingID, ItemID)
);

-- ── 12. INVENTORY USAGE ───────────────────────────────────────
-- [FIX 4] เปลี่ยนจาก BookingID → BookingDetailID เพื่อระบุตัวสัตว์ที่ใช้ของ
CREATE TABLE InventoryUsage (
    UsageID         SERIAL PRIMARY KEY,
    BookingDetailID INT       NOT NULL REFERENCES BookingDetail(BookingDetailID),
    ItemID          INT       NOT NULL REFERENCES InventoryItem(ItemID),
    QuantityUsed    INT       NOT NULL CHECK (QuantityUsed > 0),
    UsageDate       TIMESTAMP NOT NULL DEFAULT NOW(),
    StaffID         INT       REFERENCES Staff(StaffID)   -- พนักงานที่เบิกของ
);

-- ── 13. INVOICE ───────────────────────────────────────────────
-- [FIX 1] เพิ่ม DepositPaid สำหรับยอดมัดจำที่รับมาแล้ว
CREATE TABLE Invoice (
    InvoiceID        SERIAL PRIMARY KEY,
    BookingID        INT            NOT NULL UNIQUE REFERENCES Booking(BookingID),
    IssuedBy_StaffID INT            REFERENCES Staff(StaffID),
    RoomTotal        DECIMAL(10,2)  NOT NULL DEFAULT 0,
    ServiceTotal     DECIMAL(10,2)  NOT NULL DEFAULT 0,
    VetEmergencyCost DECIMAL(10,2)  NOT NULL DEFAULT 0,
    GrandTotal       DECIMAL(10,2)  GENERATED ALWAYS AS (RoomTotal + ServiceTotal + VetEmergencyCost) STORED,
    DepositPaid      DECIMAL(10,2)  NOT NULL DEFAULT 0,    -- ยอดมัดจำที่รับไปแล้ว
    PaymentMethod    VARCHAR(50),
    PaymentStatus    payment_status NOT NULL DEFAULT 'UNPAID',
    PaymentDate      TIMESTAMP
);

-- ── INDEXES ───────────────────────────────────────────────────
CREATE INDEX idx_booking_customer     ON Booking(CustomerID);
CREATE INDEX idx_booking_status       ON Booking(Status);
CREATE INDEX idx_bookingdetail_room   ON BookingDetail(RoomID);
CREATE INDEX idx_bookingdetail_pet    ON BookingDetail(PetID);
CREATE INDEX idx_carelog_detail       ON CareLog(BookingDetailID);
CREATE INDEX idx_attendance_staff     ON Attendance(StaffID, WorkDate);
CREATE INDEX idx_bookingservice_book  ON BookingService(BookingID);
CREATE INDEX idx_inventoryusage_bkdet ON InventoryUsage(BookingDetailID);

-- ── 14. AUDIT TRAIL ───────────────────────────────────────────
CREATE TABLE AuditTrail (
    AuditID       SERIAL PRIMARY KEY,
    StaffID       INT          REFERENCES Staff(StaffID) ON DELETE SET NULL,
    StaffName     VARCHAR(255), -- เก็บชื่อไว้เผื่อ Staff ถูกลบ
    ActionType    VARCHAR(50)  NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'PAYMENT'
    TableAffected VARCHAR(50),
    RecordID      INT,
    Description   TEXT,
    Timestamp     TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_staff ON AuditTrail(StaffID);
CREATE INDEX idx_audit_time  ON AuditTrail(Timestamp);
