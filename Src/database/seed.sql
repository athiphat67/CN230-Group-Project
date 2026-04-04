-- ============================================================
-- Purrfect Stay — seed.sql
-- PasswordHash ทุกคน = bcrypt('password123')
-- ============================================================

-- ── STAFF ────────────────────────────────────────────────────
INSERT INTO Staff (StaffUsername, PasswordHash, FirstName, LastName, Role, IsOnDuty, PhoneNumber, StaffEmail, HireDate) VALUES
('admin_somchai',  '$2b$12$KIX8X1lFz5kQwZq3GpN2/.abc123hashXXXXXXXXXXXXXXXXXXXX', 'สมชาย',   'มั่นคง',     'ADMIN', TRUE,  '081-111-0001', 'somchai@purrfect.com',   '2022-01-10'),
('admin_malee',    '$2b$12$KIX8X1lFz5kQwZq3GpN2/.abc123hashXXXXXXXXXXXXXXXXXXXX', 'มาลี',    'สุขสันต์',   'ADMIN', TRUE,  '081-111-0002', 'malee@purrfect.com',     '2022-03-15'),
('staff_narin',    '$2b$12$KIX8X1lFz5kQwZq3GpN2/.abc123hashXXXXXXXXXXXXXXXXXXXX', 'นริน',    'พรหมดี',     'STAFF', TRUE,  '082-222-0001', 'narin@purrfect.com',     '2023-01-05'),
('staff_porn',     '$2b$12$KIX8X1lFz5kQwZq3GpN2/.abc123hashXXXXXXXXXXXXXXXXXXXX', 'ปอร์น',   'ใจดี',       'STAFF', FALSE, '082-222-0002', 'porn@purrfect.com',      '2023-04-20'),
('staff_krit',     '$2b$12$KIX8X1lFz5kQwZq3GpN2/.abc123hashXXXXXXXXXXXXXXXXXXXX', 'กฤต',     'ทองดี',      'STAFF', TRUE,  '082-222-0003', 'krit@purrfect.com',      '2023-06-01'),
('staff_wan',      '$2b$12$KIX8X1lFz5kQwZq3GpN2/.abc123hashXXXXXXXXXXXXXXXXXXXX', 'วรรณ',    'สว่างใจ',    'STAFF', TRUE,  '082-222-0004', 'wan@purrfect.com',       '2024-01-10'),
('staff_pat',      '$2b$12$KIX8X1lFz5kQwZq3GpN2/.abc123hashXXXXXXXXXXXXXXXXXXXX', 'ปัทมา',  'ดอกไม้',     'STAFF', FALSE, '082-222-0005', 'pat@purrfect.com',       '2024-03-22');

-- ── ATTENDANCE ───────────────────────────────────────────────
INSERT INTO Attendance (StaffID, WorkDate, ClockInTime, ClockOutTime, Status, Remark) VALUES
(3, '2025-04-01', '2025-04-01 08:55:00', '2025-04-01 18:05:00', 'ONTIME', NULL),
(3, '2025-04-02', '2025-04-02 09:10:00', '2025-04-02 18:00:00', 'LATE',   'รถติดถนนพหลโยธิน'),
(4, '2025-04-01', '2025-04-01 09:00:00', '2025-04-01 18:00:00', 'ONTIME', NULL),
(5, '2025-04-01', '2025-04-01 08:50:00', '2025-04-01 17:55:00', 'ONTIME', NULL),
(5, '2025-04-02', NULL,                  NULL,                   'ABSENT', 'ลาป่วย'),
(6, '2025-04-01', '2025-04-01 09:00:00', '2025-04-01 18:00:00', 'ONTIME', NULL),
(7, '2025-04-01', '2025-04-01 09:30:00', '2025-04-01 18:00:00', 'LATE',   'ลืมนาฬิกาปลุก');

-- ── LEAVE RECORD ─────────────────────────────────────────────
INSERT INTO LeaveRecord (StaffID, LeaveType, StartDate, EndDate, Reason, Status, ApprovedBy, CreatedAt) VALUES
(4, 'SICK_LEAVE',     '2025-04-05', '2025-04-06', 'ไข้หวัดใหญ่',          'APPROVED', 1, '2025-04-04 10:00:00'),
(7, 'PERSONAL_LEAVE', '2025-04-10', '2025-04-10', 'ธุระส่วนตัว',           'PENDING',  NULL, '2025-04-03 09:00:00'),
(5, 'ANNUAL_LEAVE',   '2025-05-01', '2025-05-05', 'พักร้อนวันหยุดยาว',    'APPROVED', 2, '2025-04-01 08:00:00');

-- ── CUSTOMER ─────────────────────────────────────────────────
INSERT INTO Customer (CustomerUsername, FirstName, LastName, PhoneNumber, CustomerEmail, Address) VALUES
('user_apinya',   'อาพิญา',  'ศรีสวัสดิ์', '086-001-0001', 'apinya@gmail.com',   '12 ถ.รามอินทรา กรุงเทพฯ'),
('user_boonme',   'บุญมี',   'แสงทอง',     '086-001-0002', 'boonme@gmail.com',   '45 ถ.ลาดพร้าว กรุงเทพฯ'),
('user_chanya',   'ชัญญา',   'ดีงาม',      '086-001-0003', 'chanya@gmail.com',   '7 ซ.อ่อนนุช กรุงเทพฯ'),
('user_decha',    'เดชา',    'พลังดี',     '086-001-0004', 'decha@gmail.com',    '99 ถ.พัฒนาการ กรุงเทพฯ'),
('user_ekamai',   'เอกมัย',  'สุริยา',     '086-001-0005', 'ekamai@gmail.com',   '3 ซ.เอกมัย กรุงเทพฯ'),
('user_fon',      'ฝน',      'ตกลงมา',     '086-001-0006', 'fon@gmail.com',      '21 ถ.งามวงศ์วาน นนทบุรี'),
('user_gun',      'กัน',     'ยิ้มเสมอ',   '086-001-0007', 'gun@gmail.com',      '88 ถ.ติวานนท์ นนทบุรี'),
('user_honey',    'ฮันนี่',  'หวานใจ',     '086-001-0008', 'honey@gmail.com',    '5 ถ.ประชาชื่น กรุงเทพฯ'),
('user_ing',      'อิง',     'พึ่งตน',     '086-001-0009', 'ing@gmail.com',      '14 ถ.รัชดา กรุงเทพฯ'),
('user_joy',      'จอย',     'สุขใจ',      '086-001-0010', 'joy@gmail.com',      '60 ถ.เพชรบุรี กรุงเทพฯ'),
('user_kla',      'กล้า',    'หาญชัย',     '086-001-0011', 'kla@gmail.com',      '33 ถ.บางนา กรุงเทพฯ'),
('user_lek',      'เล็ก',    'แต่เก่ง',    '086-001-0012', 'lek@gmail.com',      '77 ถ.สุขุมวิท กรุงเทพฯ');

-- ── PET ──────────────────────────────────────────────────────
INSERT INTO Pet (CustomerID, Name, Species, Breed, Weight, MedicalCondition, Allergy, IsVaccinated, VaccineRecord) VALUES
(1,  'มะม่วง',   'CAT', 'Scottish Fold',     4.2,  NULL,             NULL,          TRUE,  'วัคซีนครบ มี.ค. 2025'),
(1,  'มะนาว',   'CAT', 'Ragdoll',            3.8,  NULL,             'ปลาทะเล',    TRUE,  'วัคซีนครบ ก.พ. 2025'),
(2,  'บิ๊กบอย',  'DOG', 'Golden Retriever',  28.0, NULL,             NULL,          TRUE,  'วัคซีนครบ ม.ค. 2025'),
(3,  'โดนัท',   'CAT', 'Persian',            3.5,  'ต้อกระจก',      NULL,          TRUE,  'วัคซีนครบ เม.ย. 2025'),
(4,  'ชิโร่',   'DOG', 'Shiba Inu',         10.0, NULL,             NULL,          TRUE,  'วัคซีนครบ ม.ค. 2025'),
(4,  'คุโระ',   'DOG', 'Shiba Inu',          9.5,  NULL,             NULL,          TRUE,  'วัคซีนครบ ม.ค. 2025'),
(5,  'บัตเตอร์', 'CAT', 'British Shorthair', 5.1,  'โรคไต ระยะต้น',  NULL,          TRUE,  'วัคซีนครบ มี.ค. 2025'),
(6,  'นูนู่',   'DOG', 'Pomeranian',         3.2,  NULL,             'ไก่',         TRUE,  'วัคซีนครบ ก.พ. 2025'),
(7,  'มีโกะ',   'CAT', 'Siamese',            3.0,  NULL,             NULL,          FALSE, NULL),
(8,  'อาร์โนลด์','DOG', 'Bulldog',           22.0, 'ภูมิแพ้ผิวหนัง', 'ถั่วเหลือง', TRUE,  'วัคซีนครบ ม.ค. 2025'),
(9,  'ขนฟู',    'CAT', 'Maine Coon',          6.5,  NULL,             NULL,          TRUE,  'วัคซีนครบ เม.ย. 2025'),
(10, 'ป๊อปคอร์น','DOG', 'Beagle',             8.8,  NULL,             NULL,          TRUE,  'วัคซีนครบ มี.ค. 2025'),
(11, 'มิ้นต์',   'CAT', 'Tabby',              3.3,  NULL,             NULL,          TRUE,  'วัคซีนครบ ก.พ. 2025'),
(12, 'แฮมเบอร์เกอร์','DOG','Corgi',           9.0,  NULL,             NULL,          TRUE,  'วัคซีนครบ มี.ค. 2025'),
(12, 'ฮอทดอก',  'DOG', 'Dachshund',           6.0,  NULL,             NULL,          TRUE,  'วัคซีนครบ มี.ค. 2025');

-- ── ROOM ─────────────────────────────────────────────────────
INSERT INTO Room (RoomNumber, RoomSize, PetType, Rate, Status) VALUES
('A01', 'SMALL',  'CAT', 250.00,  'AVAILABLE'),
('A02', 'SMALL',  'CAT', 250.00,  'AVAILABLE'),
('A03', 'MEDIUM', 'CAT', 400.00,  'OCCUPIED'),
('A04', 'MEDIUM', 'CAT', 400.00,  'AVAILABLE'),
('A05', 'LARGE',  'CAT', 600.00,  'AVAILABLE'),
('B01', 'SMALL',  'DOG', 300.00,  'OCCUPIED'),
('B02', 'SMALL',  'DOG', 300.00,  'AVAILABLE'),
('B03', 'MEDIUM', 'DOG', 500.00,  'OCCUPIED'),
('B04', 'MEDIUM', 'DOG', 500.00,  'AVAILABLE'),
('B05', 'LARGE',  'DOG', 800.00,  'AVAILABLE'),
('B06', 'LARGE',  'DOG', 800.00,  'MAINTENANCE'),
('C01', 'LARGE',  'CAT', 700.00,  'AVAILABLE'),
('C02', 'LARGE',  'DOG', 900.00,  'AVAILABLE');

-- ── BOOKING ──────────────────────────────────────────────────
INSERT INTO Booking (CustomerID, CheckInDate, CheckOutDate, Status, CreatedBy_StaffID, LockedRate, CancelledAt, CancelledByStaffID) VALUES
(1,  '2025-04-01 12:00', '2025-04-05 12:00', 'COMPLETED', 3, 250.00, NULL, NULL),  -- 1
(1,  '2025-04-10 12:00', '2025-04-12 12:00', 'COMPLETED', 3, 400.00, NULL, NULL),  -- 2
(2,  '2025-04-01 12:00', '2025-04-04 12:00', 'COMPLETED', 3, 300.00, NULL, NULL),  -- 3
(3,  '2025-04-03 12:00', '2025-04-06 12:00', 'COMPLETED', 4, 400.00, NULL, NULL),  -- 4
(4,  '2025-04-05 12:00', '2025-04-08 12:00', 'COMPLETED', 3, 300.00, NULL, NULL),  -- 5
(4,  '2025-04-05 12:00', '2025-04-08 12:00', 'COMPLETED', 3, 300.00, NULL, NULL),  -- 6 (คุโระ คนละห้อง)
(5,  '2025-04-08 12:00', '2025-04-10 12:00', 'COMPLETED', 5, 400.00, NULL, NULL),  -- 7
(6,  '2025-04-09 12:00', '2025-04-11 12:00', 'COMPLETED', 3, 300.00, NULL, NULL),  -- 8
(7,  '2025-04-10 12:00', '2025-04-13 12:00', 'CANCELLED', 4, 250.00, '2025-04-09', 4),  -- 9
(8,  '2025-04-12 12:00', '2025-04-15 12:00', 'ACTIVE',    3, 500.00, NULL, NULL),  -- 10
(9,  '2025-04-12 12:00', '2025-04-14 12:00', 'ACTIVE',    5, 400.00, NULL, NULL),  -- 11
(10, '2025-04-13 12:00', '2025-04-16 12:00', 'ACTIVE',    3, 500.00, NULL, NULL),  -- 12
(11, '2025-04-14 12:00', '2025-04-17 12:00', 'PENDING',   3, 250.00, NULL, NULL),  -- 13
(12, '2025-04-15 12:00', '2025-04-18 12:00', 'PENDING',   3, 300.00, NULL, NULL),  -- 14
(12, '2025-04-15 12:00', '2025-04-18 12:00', 'PENDING',   3, 300.00, NULL, NULL);  -- 15

-- ── BOOKING DETAIL ───────────────────────────────────────────
INSERT INTO BookingDetail (BookingID, PetID, RoomID) VALUES
(1,  1,  1),   -- มะม่วง → A01
(2,  2,  3),   -- มะนาว → A03
(3,  3,  6),   -- บิ๊กบอย → B01
(4,  4,  4),   -- โดนัท → A04 (Medium Cat)
(5,  5,  6),   -- ชิโร่ → B01
(6,  6,  7),   -- คุโระ → B02
(7,  7,  4),   -- บัตเตอร์ → A04
(8,  8,  6),   -- นูนู่ → B01
(10, 10, 8),   -- อาร์โนลด์ → B03
(11, 11, 4),   -- ขนฟู → A04
(12, 12, 8),   -- ป๊อปคอร์น → B03
(13, 13, 1),   -- มิ้นต์ → A01
(14, 14, 7),   -- แฮมเบอร์เกอร์ → B02
(15, 15, 7);   -- ฮอทดอก → B02 (คนละห้อง)

-- ── CARE LOG ─────────────────────────────────────────────────
INSERT INTO CareLog (BookingDetailID, LogDate, FoodStatus, PottyStatus, MedicationGiven, StaffNote, LoggedBy_StaffID) VALUES
(1, '2025-04-01 18:00', 'ALL',    'NORMAL',   FALSE, 'มะม่วงปรับตัวได้ดี ร้องหาเจ้าของนิดหน่อย',  3),
(1, '2025-04-02 18:00', 'ALL',    'NORMAL',   FALSE, 'ร่าเริง วิ่งเล่นในกรง',                       3),
(1, '2025-04-03 18:00', 'LITTLE', 'NORMAL',   FALSE, 'กินน้อยลง อาจเครียดจากสภาพแวดล้อม',          5),
(2, '2025-04-10 18:00', 'ALL',    'NORMAL',   FALSE, 'มะนาวนอนหลับตลอดวัน ปกติดี',                 3),
(3, '2025-04-01 18:00', 'ALL',    'NORMAL',   FALSE, 'บิ๊กบอยกินเยอะมาก ขี้เล่น',                  4),
(3, '2025-04-02 18:00', 'ALL',    'ABNORMAL', FALSE, 'อุจจาระเหลว แนะนำติดตามดูอาการ',             4),
(4, '2025-04-03 18:00', 'ALL',    'NORMAL',   TRUE,  'ป้อนยาตาครบ เงียบขรึมแต่ปกติ',               5),
(5, '2025-04-05 18:00', 'ALL',    'NORMAL',   FALSE, 'ชิโร่ซน ขุดพื้นกรงตลอด',                     3),
(10,'2025-04-12 18:00', 'LITTLE', 'NORMAL',   FALSE, 'อาร์โนลด์ดูเศร้า อาจคิดถึงเจ้าของ',          3),
(10,'2025-04-13 18:00', 'ALL',    'NORMAL',   FALSE, 'ดีขึ้นมาก ยอมให้อุ้ม',                        5),
(11,'2025-04-12 18:00', 'ALL',    'NORMAL',   FALSE, 'ขนฟูนอนตลอด ไม่ค่อยขยับ',                    3),
(12,'2025-04-13 18:00', 'ALL',    'NORMAL',   FALSE, 'ป๊อปคอร์นชอบเห่า แต่ไม่ก้าวร้าว',            4);

-- ── INVENTORY ITEM ───────────────────────────────────────────
INSERT INTO InventoryItem (ItemName, Category, QuantityInStock, UnitPrice, LowStockThreshold) VALUES
('อาหารแมวแบบเม็ด Royal Canin',   'FOOD',    50,  120.00, 10),
('อาหารแมวแบบเปียก Whiskas',      'FOOD',    80,   25.00, 15),
('อาหารสุนัขแบบเม็ด Purina',      'FOOD',    60,  150.00, 10),
('อาหารสุนัขแบบเปียก Pedigree',   'FOOD',    40,   35.00, 10),
('ทรายแมว Unicharm',               'SUPPLY',  30,   80.00,  5),
('ผ้าอ้อมสุนัข S',                 'SUPPLY',  100,  15.00, 20),
('ผ้าอ้อมสุนัข M',                 'SUPPLY',  80,   20.00, 20),
('แชมพูสัตว์เลี้ยง',               'SUPPLY',  20,   90.00,  5),
('บริการอาบน้ำแมว',                'SERVICE', 999, 200.00,  0),
('บริการอาบน้ำสุนัขเล็ก',          'SERVICE', 999, 250.00,  0),
('บริการอาบน้ำสุนัขใหญ่',          'SERVICE', 999, 400.00,  0),
('บริการตัดเล็บ',                   'SERVICE', 999,  80.00,  0),
('ยาถ่ายพยาธิ',                    'SUPPLY',  25,   50.00,  5),
('วิตามินบำรุงขน',                  'SUPPLY',  30,   60.00,  5);

-- ── INVENTORY USAGE ──────────────────────────────────────────
INSERT INTO InventoryUsage (BookingID, ItemID, QuantityUsed, UsageDate) VALUES
(1,  1, 4, '2025-04-01 18:00'),  -- มะม่วง กิน Royal Canin 4 วัน
(1,  5, 1, '2025-04-01 18:00'),  -- ทรายแมว
(2,  2, 2, '2025-04-10 18:00'),  -- มะนาว กิน Whiskas
(3,  3, 3, '2025-04-01 18:00'),  -- บิ๊กบอย กิน Purina
(4,  1, 3, '2025-04-03 18:00'),
(5,  3, 3, '2025-04-05 18:00'),
(7,  1, 2, '2025-04-08 18:00'),
(8,  3, 2, '2025-04-09 18:00'),
(10, 4, 3, '2025-04-12 18:00'),  -- อาร์โนลด์ กิน Pedigree
(10, 11,1, '2025-04-13 10:00'),  -- บริการอาบน้ำสุนัขใหญ่
(11, 1, 2, '2025-04-12 18:00'),
(12, 3, 3, '2025-04-13 18:00'),
(12, 10,1, '2025-04-14 10:00'),  -- บริการอาบน้ำสุนัขเล็ก
(1,  12,1, '2025-04-04 10:00'),  -- ตัดเล็บมะม่วง
(3,  12,1, '2025-04-03 10:00');  -- ตัดเล็บบิ๊กบอย

-- ── INVOICE ──────────────────────────────────────────────────
INSERT INTO Invoice (BookingID, IssuedBy_StaffID, RoomTotal, ServiceTotal, VetEmergencyCost, PaymentMethod, PaymentStatus, PaymentDate) VALUES
(1,  3, 1000.00, 200.00,   0.00, 'TRANSFER', 'PAID',   '2025-04-05 13:00'),  -- 4 คืน × 250
(2,  3,  800.00,  25.00,   0.00, 'CASH',     'PAID',   '2025-04-12 12:30'),  -- 2 คืน × 400
(3,  4,  900.00, 130.00,   0.00, 'TRANSFER', 'PAID',   '2025-04-04 12:00'),  -- 3 คืน × 300
(4,  4, 1200.00,   0.00,   0.00, 'CASH',     'PAID',   '2025-04-06 12:00'),  -- 3 คืน × 400
(5,  3,  900.00,   0.00,   0.00, 'CASH',     'PAID',   '2025-04-08 12:00'),
(6,  3,  900.00,   0.00,   0.00, 'CASH',     'PAID',   '2025-04-08 12:00'),
(7,  5,  800.00,   0.00,   0.00, 'TRANSFER', 'PAID',   '2025-04-10 12:00'),
(8,  3,  600.00,   0.00,   0.00, 'CASH',     'PAID',   '2025-04-11 12:00'),
(10, 3, 1500.00, 400.00, 500.00, 'TRANSFER', 'UNPAID', NULL),                -- ฉุกเฉิน
(11, 5,  800.00,   0.00,   0.00, 'CASH',     'UNPAID', NULL),
(12, 3, 1500.00, 250.00,   0.00, 'TRANSFER', 'UNPAID', NULL);
