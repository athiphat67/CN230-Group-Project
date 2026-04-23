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
-- [FIX 1] เพิ่ม PARTIAL สำหรับสถานะมัดจำ
CREATE TYPE payment_status     AS ENUM ('UNPAID', 'PARTIAL', 'PAID');

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


----- BIG -----------------------
----- BIG -----------------------
----- BIG -----------------------
----- BIG -----------------------
-- public.customer definition

-- Drop table

-- DROP TABLE public.customer;

CREATE TABLE public.customer (
	customerid serial4 NOT NULL,
	customerusername varchar(50) NOT NULL,
	passwordhash varchar(255) NOT NULL,
	firstname varchar(255) NOT NULL,
	lastname varchar(255) NOT NULL,
	phonenumber varchar(20) NULL,
	customeremail varchar(50) NOT NULL,
	address text NULL,
	CONSTRAINT customer_customeremail_key UNIQUE (customeremail),
	CONSTRAINT customer_customerusername_key UNIQUE (customerusername),
	CONSTRAINT customer_pkey PRIMARY KEY (customerid)
);


-- public.inventoryitem definition

-- Drop table

-- DROP TABLE public.inventoryitem;

CREATE TABLE public.inventoryitem (
	itemid serial4 NOT NULL,
	itemname varchar(255) NOT NULL,
	category varchar(50) NULL,
	quantityinstock int4 DEFAULT 0 NOT NULL,
	unitprice numeric(10, 2) NULL,
	lowstockthreshold int4 DEFAULT 0 NOT NULL,
	ischargeable bool DEFAULT true NOT NULL,
	expiry_date date NULL,
	CONSTRAINT chk_stock_non_negative CHECK ((quantityinstock >= 0)),
	CONSTRAINT inventoryitem_pkey PRIMARY KEY (itemid)
);


-- public.room definition

-- Drop table

-- DROP TABLE public.room;

CREATE TABLE public.room (
	roomid serial4 NOT NULL,
	roomnumber varchar(20) NOT NULL,
	roomsize public."room_size_enum" NULL,
	pettype public."pet_type_enum" NULL,
	rate numeric(10, 2) NOT NULL,
	status public."room_status_enum" DEFAULT 'AVAILABLE'::room_status_enum NOT NULL,
	CONSTRAINT room_pkey PRIMARY KEY (roomid),
	CONSTRAINT room_roomnumber_key UNIQUE (roomnumber)
);


-- public.staff definition

-- Drop table

-- DROP TABLE public.staff;

CREATE TABLE public.staff (
	staffid serial4 NOT NULL,
	staffusername varchar(50) NOT NULL,
	passwordhash varchar(255) NOT NULL,
	firstname varchar(255) NOT NULL,
	lastname varchar(255) NOT NULL,
	"role" varchar(50) NOT NULL,
	isonduty bool DEFAULT false NOT NULL,
	phonenumber varchar(20) NULL,
	staffemail varchar(50) NOT NULL,
	hiredate date DEFAULT CURRENT_DATE NOT NULL,
	"isActive" bool DEFAULT true NULL,
	CONSTRAINT staff_pkey PRIMARY KEY (staffid),
	CONSTRAINT staff_staffemail_key UNIQUE (staffemail),
	CONSTRAINT staff_staffusername_key UNIQUE (staffusername)
);


-- public.attendance definition

-- Drop table

-- DROP TABLE public.attendance;

CREATE TABLE public.attendance (
	attendanceid serial4 NOT NULL,
	staffid int4 NOT NULL,
	workdate date NOT NULL,
	clockin timestamp NULL,
	clockout timestamp NULL,
	status public."attendance_status" DEFAULT 'ONTIME'::attendance_status NOT NULL,
	note varchar(255) NULL,
	CONSTRAINT attendance_pkey PRIMARY KEY (attendanceid),
	CONSTRAINT chk_clockout CHECK (((clockout IS NULL) OR (clockout > clockin))),
	CONSTRAINT attendance_staffid_fkey FOREIGN KEY (staffid) REFERENCES public.staff(staffid) ON DELETE CASCADE
);
CREATE INDEX idx_attendance_staff ON public.attendance USING btree (staffid, workdate);


-- public.auditlog definition

-- Drop table

-- DROP TABLE public.auditlog;

CREATE TABLE public.auditlog (
	audit_id serial4 NOT NULL,
	staff_id int4 NOT NULL,
	action_type public."audit_action" NOT NULL,
	table_affected varchar(100) NOT NULL,
	record_id varchar(50) NULL,
	description text NULL,
	"timestamp" timestamp DEFAULT now() NULL,
	CONSTRAINT auditlog_pkey PRIMARY KEY (audit_id),
	CONSTRAINT auditlog_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(staffid)
);


-- public.booking definition

-- Drop table

-- DROP TABLE public.booking;

CREATE TABLE public.booking (
	bookingid serial4 NOT NULL,
	customerid int4 NOT NULL,
	checkindate timestamp NOT NULL,
	checkoutdate timestamp NOT NULL,
	status public."booking_status" DEFAULT 'PENDING'::booking_status NOT NULL,
	createdby_staffid int4 NULL,
	lockedrate numeric(10, 2) NOT NULL,
	cancelledat date NULL,
	cancelledbystaffid int4 NULL,
	CONSTRAINT booking_pkey PRIMARY KEY (bookingid),
	CONSTRAINT chk_booking_dates CHECK ((checkoutdate > checkindate)),
	CONSTRAINT booking_cancelledbystaffid_fkey FOREIGN KEY (cancelledbystaffid) REFERENCES public.staff(staffid),
	CONSTRAINT booking_createdby_staffid_fkey FOREIGN KEY (createdby_staffid) REFERENCES public.staff(staffid),
	CONSTRAINT booking_customerid_fkey FOREIGN KEY (customerid) REFERENCES public.customer(customerid)
);
CREATE INDEX idx_booking_customer ON public.booking USING btree (customerid);
CREATE INDEX idx_booking_status ON public.booking USING btree (status);


-- public.bookingservice definition

-- Drop table

-- DROP TABLE public.bookingservice;

CREATE TABLE public.bookingservice (
	bookingserviceid serial4 NOT NULL,
	bookingid int4 NOT NULL,
	itemid int4 NOT NULL,
	quantity int4 DEFAULT 1 NOT NULL,
	unitprice numeric(10, 2) NOT NULL,
	CONSTRAINT bookingservice_pkey PRIMARY KEY (bookingserviceid),
	CONSTRAINT bookingservice_quantity_check CHECK ((quantity > 0)),
	CONSTRAINT uq_booking_service UNIQUE (bookingid, itemid),
	CONSTRAINT bookingservice_bookingid_fkey FOREIGN KEY (bookingid) REFERENCES public.booking(bookingid) ON DELETE CASCADE,
	CONSTRAINT bookingservice_itemid_fkey FOREIGN KEY (itemid) REFERENCES public.inventoryitem(itemid)
);
CREATE INDEX idx_bookingservice_book ON public.bookingservice USING btree (bookingid);


-- public.invoice definition

-- Drop table

-- DROP TABLE public.invoice;

CREATE TABLE public.invoice (
	invoiceid serial4 NOT NULL,
	bookingid int4 NOT NULL,
	issuedby_staffid int4 NULL,
	roomtotal numeric(10, 2) DEFAULT 0 NOT NULL,
	servicetotal numeric(10, 2) DEFAULT 0 NOT NULL,
	vetemergencycost numeric(10, 2) DEFAULT 0 NOT NULL,
	grandtotal numeric(10, 2) GENERATED ALWAYS AS ((roomtotal + servicetotal + vetemergencycost)) STORED NULL,
	depositpaid numeric(10, 2) DEFAULT 0 NOT NULL,
	paymentmethod varchar(50) NULL,
	paymentstatus public."payment_status" DEFAULT 'UNPAID'::payment_status NOT NULL,
	paymentdate timestamp NULL,
	amountpaid numeric(10, 2) DEFAULT 0 NOT NULL,
	lastpaymentdate timestamp NULL,
	CONSTRAINT invoice_bookingid_key UNIQUE (bookingid),
	CONSTRAINT invoice_pkey PRIMARY KEY (invoiceid),
	CONSTRAINT invoice_bookingid_fkey FOREIGN KEY (bookingid) REFERENCES public.booking(bookingid),
	CONSTRAINT invoice_issuedby_staffid_fkey FOREIGN KEY (issuedby_staffid) REFERENCES public.staff(staffid)
);


-- public.leaverecord definition

-- Drop table

-- DROP TABLE public.leaverecord;

CREATE TABLE public.leaverecord (
	leaveid serial4 NOT NULL,
	staffid int4 NOT NULL,
	leavetype public."leave_type" NOT NULL,
	startdate date NOT NULL,
	enddate date NOT NULL,
	reason text NULL,
	status public."leave_status" DEFAULT 'PENDING'::leave_status NOT NULL,
	approvedby int4 NULL,
	createdat timestamp DEFAULT now() NOT NULL,
	updatedat timestamp NULL,
	CONSTRAINT chk_leave_dates CHECK ((enddate >= startdate)),
	CONSTRAINT leaverecord_pkey PRIMARY KEY (leaveid),
	CONSTRAINT leaverecord_approvedby_fkey FOREIGN KEY (approvedby) REFERENCES public.staff(staffid),
	CONSTRAINT leaverecord_staffid_fkey FOREIGN KEY (staffid) REFERENCES public.staff(staffid) ON DELETE CASCADE
);


-- public.notification definition

-- Drop table

-- DROP TABLE public.notification;

CREATE TABLE public.notification (
	notification_id serial4 NOT NULL,
	"type" public."notification_type" NOT NULL,
	title varchar(300) NOT NULL,
	body text NULL,
	booking_id int4 NULL,
	is_read bool DEFAULT false NULL,
	sent_at timestamp DEFAULT now() NULL,
	recipient_staff_id int4 NULL,
	message text NULL,
	related_id int4 NULL,
	created_at timestamp DEFAULT now() NULL,
	updated_at timestamp DEFAULT now() NULL,
	actor_staff_id int4 NULL,
	actor_customer_id int4 NULL,
	target_id int4 NULL,
	metadata jsonb NULL,
	CONSTRAINT notification_pkey PRIMARY KEY (notification_id),
	CONSTRAINT notification_actor_customer_id_fkey FOREIGN KEY (actor_customer_id) REFERENCES public.customer(customerid) ON DELETE SET NULL,
	CONSTRAINT notification_actor_staff_id_fkey FOREIGN KEY (actor_staff_id) REFERENCES public.staff(staffid) ON DELETE SET NULL,
	CONSTRAINT notification_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.booking(bookingid),
	CONSTRAINT notification_recipient_staff_id_fkey FOREIGN KEY (recipient_staff_id) REFERENCES public.staff(staffid)
);
CREATE INDEX idx_notification_metadata_gin ON public.notification USING gin (metadata);
CREATE INDEX idx_notification_recipient_created ON public.notification USING btree (recipient_staff_id, created_at DESC);
CREATE INDEX idx_notification_staff_read_created ON public.notification USING btree (recipient_staff_id, is_read, created_at DESC);
CREATE INDEX idx_notification_target_id ON public.notification USING btree (target_id);
CREATE INDEX idx_notification_type ON public.notification USING btree (type);
CREATE INDEX idx_notification_type_created ON public.notification USING btree (type, created_at DESC);
CREATE INDEX idx_notification_unread ON public.notification USING btree (recipient_staff_id, is_read);

-- Table Triggers

create trigger trg_notification_updated_at before
update
    on
    public.notification for each row execute function set_notification_updated_at();
ALTER TABLE public.notification ENABLE ROW LEVEL SECURITY;


-- public.pet definition

-- Drop table

-- DROP TABLE public.pet;

CREATE TABLE public.pet (
	petid serial4 NOT NULL,
	customerid int4 NOT NULL,
	"name" varchar(100) NOT NULL,
	species public."species_enum" NOT NULL,
	breed varchar(100) NULL,
	weight numeric(5, 2) NULL,
	medicalcondition text DEFAULT 'ไม่มี'::text NOT NULL,
	allergy text DEFAULT 'ไม่มี'::text NOT NULL,
	isvaccinated bool DEFAULT false NOT NULL,
	vaccinerecord text DEFAULT 'ไม่มี'::text NOT NULL,
	dob date NULL,
	sex bpchar(1) NULL,
	coat_color varchar(100) NULL,
	behavior_notes text NULL,
	CONSTRAINT pet_pkey PRIMARY KEY (petid),
	CONSTRAINT pet_sex_check CHECK ((sex = ANY (ARRAY['M'::bpchar, 'F'::bpchar]))),
	CONSTRAINT pet_customerid_fkey FOREIGN KEY (customerid) REFERENCES public.customer(customerid) ON DELETE CASCADE
);


-- public.vaccinationrecord definition

-- Drop table

-- DROP TABLE public.vaccinationrecord;

CREATE TABLE public.vaccinationrecord (
	vaccine_id serial4 NOT NULL,
	pet_id int4 NOT NULL,
	vaccine_name varchar(100) NOT NULL,
	administered_date date NOT NULL,
	expiry_date date NOT NULL,
	vet_clinic varchar(200) NULL,
	created_at timestamp DEFAULT now() NULL,
	CONSTRAINT vaccinationrecord_pkey PRIMARY KEY (vaccine_id),
	CONSTRAINT vaccinationrecord_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pet(petid) ON DELETE CASCADE
);


-- public.bookingdetail definition

-- Drop table

-- DROP TABLE public.bookingdetail;

CREATE TABLE public.bookingdetail (
	bookingdetailid serial4 NOT NULL,
	bookingid int4 NOT NULL,
	petid int4 NOT NULL,
	roomid int4 NOT NULL,
	CONSTRAINT bookingdetail_pkey PRIMARY KEY (bookingdetailid),
	CONSTRAINT uq_booking_room UNIQUE (bookingid, roomid),
	CONSTRAINT bookingdetail_bookingid_fkey FOREIGN KEY (bookingid) REFERENCES public.booking(bookingid) ON DELETE CASCADE,
	CONSTRAINT bookingdetail_petid_fkey FOREIGN KEY (petid) REFERENCES public.pet(petid),
	CONSTRAINT bookingdetail_roomid_fkey FOREIGN KEY (roomid) REFERENCES public.room(roomid)
);
CREATE INDEX idx_bookingdetail_pet ON public.bookingdetail USING btree (petid);
CREATE INDEX idx_bookingdetail_room ON public.bookingdetail USING btree (roomid);


-- public.carelog definition

-- Drop table

-- DROP TABLE public.carelog;

CREATE TABLE public.carelog (
	logid serial4 NOT NULL,
	bookingdetailid int4 NOT NULL,
	logdate timestamp DEFAULT now() NOT NULL,
	foodstatus public."food_status_enum" NULL,
	pottystatus public."potty_status_enum" NULL,
	medicationgiven bool DEFAULT false NOT NULL,
	staffnote text NULL,
	photourl varchar(255) NULL,
	loggedby_staffid int4 NULL,
	mood public."mood_type" NULL,
	behavior_notes text NULL,
	CONSTRAINT carelog_pkey PRIMARY KEY (logid),
	CONSTRAINT carelog_bookingdetailid_fkey FOREIGN KEY (bookingdetailid) REFERENCES public.bookingdetail(bookingdetailid) ON DELETE CASCADE,
	CONSTRAINT carelog_loggedby_staffid_fkey FOREIGN KEY (loggedby_staffid) REFERENCES public.staff(staffid)
);
CREATE INDEX idx_carelog_detail ON public.carelog USING btree (bookingdetailid);


-- public.inventoryusage definition

-- Drop table

-- DROP TABLE public.inventoryusage;

CREATE TABLE public.inventoryusage (
	usageid serial4 NOT NULL,
	bookingdetailid int4 NOT NULL,
	itemid int4 NOT NULL,
	quantityused int4 NOT NULL,
	usagedate timestamp DEFAULT now() NOT NULL,
	staffid int4 NULL,
	CONSTRAINT inventoryusage_pkey PRIMARY KEY (usageid),
	CONSTRAINT inventoryusage_quantityused_check CHECK ((quantityused > 0)),
	CONSTRAINT inventoryusage_bookingdetailid_fkey FOREIGN KEY (bookingdetailid) REFERENCES public.bookingdetail(bookingdetailid),
	CONSTRAINT inventoryusage_itemid_fkey FOREIGN KEY (itemid) REFERENCES public.inventoryitem(itemid),
	CONSTRAINT inventoryusage_staffid_fkey FOREIGN KEY (staffid) REFERENCES public.staff(staffid)
);
CREATE INDEX idx_inventoryusage_bkdet ON public.inventoryusage USING btree (bookingdetailid);


-- public.mealplan definition

-- Drop table

-- DROP TABLE public.mealplan;

CREATE TABLE public.mealplan (
	mealplan_id serial4 NOT NULL,
	pet_id int4 NOT NULL,
	meal_period varchar(20) NOT NULL,
	food_type varchar(200) NOT NULL,
	quantity_grams numeric(8, 1) NOT NULL,
	notes text NULL,
	created_at timestamp DEFAULT now() NULL,
	CONSTRAINT mealplan_meal_period_check CHECK (((meal_period)::text = ANY ((ARRAY['MORNING'::character varying, 'MIDDAY'::character varying, 'EVENING'::character varying])::text[]))),
	CONSTRAINT mealplan_pet_id_meal_period_key UNIQUE (pet_id, meal_period),
	CONSTRAINT mealplan_pkey PRIMARY KEY (mealplan_id),
	CONSTRAINT mealplan_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pet(petid) ON DELETE CASCADE
);