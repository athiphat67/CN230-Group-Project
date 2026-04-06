-- ============================================================
-- Purrfect Stay — seed.sql (v2 — Thai Context, Rich Data)
-- PasswordHash ทุกคน = bcrypt('password123')
-- ============================================================

-- ── 1. STAFF ────────────────────────────────────────────────────
INSERT INTO Staff (StaffUsername, PasswordHash, FirstName, LastName, Role, IsOnDuty, PhoneNumber, StaffEmail, HireDate) VALUES
('admin_somchai',  '$2b$12$KIX8X1lFz5kQwZq3GpN2/.abc123hashXXXXXXXXXXXXXXXXXXXX', 'สมชาย',   'มั่นคง',     'ADMIN', TRUE,  '081-111-0001', 'somchai@purrfect.com',  '2022-01-10'),
('admin_malee',    '$2b$12$KIX8X1lFz5kQwZq3GpN2/.abc123hashXXXXXXXXXXXXXXXXXXXX', 'มาลี',    'สุขสันต์',   'ADMIN', TRUE,  '081-111-0002', 'malee@purrfect.com',    '2022-03-15'),
('staff_narin',    '$2b$12$KIX8X1lFz5kQwZq3GpN2/.abc123hashXXXXXXXXXXXXXXXXXXXX', 'นริน',    'พรหมดี',     'STAFF', TRUE,  '082-222-0001', 'narin@purrfect.com',    '2023-01-05'),
('staff_porn',     '$2b$12$KIX8X1lFz5kQwZq3GpN2/.abc123hashXXXXXXXXXXXXXXXXXXXX', 'ปอร์น',   'ใจดี',       'STAFF', FALSE, '082-222-0002', 'porn@purrfect.com',     '2023-04-20'),
('staff_krit',     '$2b$12$KIX8X1lFz5kQwZq3GpN2/.abc123hashXXXXXXXXXXXXXXXXXXXX', 'กฤต',     'ทองดี',      'STAFF', TRUE,  '082-222-0003', 'krit@purrfect.com',     '2023-06-01'),
('staff_wan',      '$2b$12$KIX8X1lFz5kQwZq3GpN2/.abc123hashXXXXXXXXXXXXXXXXXXXX', 'วรรณ',    'สว่างใจ',    'STAFF', TRUE,  '082-222-0004', 'wan@purrfect.com',      '2024-01-10'),
('staff_pat',      '$2b$12$KIX8X1lFz5kQwZq3GpN2/.abc123hashXXXXXXXXXXXXXXXXXXXX', 'ปัทมา',  'ดอกไม้',     'STAFF', FALSE, '082-222-0005', 'pat@purrfect.com',      '2024-03-22'),
('staff_prae',     '$2b$12$KIX8X1lFz5kQwZq3GpN2/.abc123hashXXXXXXXXXXXXXXXXXXXX', 'แพร',     'งามพร้อม',   'STAFF', TRUE,  '082-222-0006', 'prae@purrfect.com',     '2024-07-01'),
('staff_tong',     '$2b$12$KIX8X1lFz5kQwZq3GpN2/.abc123hashXXXXXXXXXXXXXXXXXXXX', 'ต้อง',    'ทำได้',      'STAFF', TRUE,  '082-222-0007', 'tong@purrfect.com',     '2024-09-15');

-- ── 2. ATTENDANCE ───────────────────────────────────────────────
INSERT INTO Attendance (StaffID, WorkDate, ClockInTime, ClockOutTime, Status, Remark) VALUES
(3, '2025-04-01', '2025-04-01 08:55:00', '2025-04-01 18:05:00', 'ONTIME', NULL),
(3, '2025-04-02', '2025-04-02 09:10:00', '2025-04-02 18:00:00', 'LATE',   'รถติดถนนพหลโยธิน'),
(3, '2025-04-03', '2025-04-03 08:50:00', '2025-04-03 18:10:00', 'ONTIME', NULL),
(4, '2025-04-01', '2025-04-01 09:00:00', '2025-04-01 18:00:00', 'ONTIME', NULL),
(4, '2025-04-02', NULL,                  NULL,                   'ABSENT', 'ลาป่วย ไข้สูง'),
(5, '2025-04-01', '2025-04-01 08:50:00', '2025-04-01 17:55:00', 'ONTIME', NULL),
(5, '2025-04-02', '2025-04-02 09:05:00', '2025-04-02 18:00:00', 'ONTIME', NULL),
(5, '2025-04-03', NULL,                  NULL,                   'ABSENT', 'ลาป่วย'),
(6, '2025-04-01', '2025-04-01 09:00:00', '2025-04-01 18:00:00', 'ONTIME', NULL),
(6, '2025-04-02', '2025-04-02 08:58:00', '2025-04-02 18:02:00', 'ONTIME', NULL),
(7, '2025-04-01', '2025-04-01 09:30:00', '2025-04-01 18:00:00', 'LATE',   'ลืมนาฬิกาปลุก'),
(7, '2025-04-02', '2025-04-02 09:00:00', '2025-04-02 18:00:00', 'ONTIME', NULL),
(8, '2025-04-01', '2025-04-01 09:00:00', '2025-04-01 18:00:00', 'ONTIME', NULL),
(9, '2025-04-01', '2025-04-01 08:45:00', '2025-04-01 17:50:00', 'ONTIME', NULL),
(9, '2025-04-02', '2025-04-02 09:20:00', '2025-04-02 18:00:00', 'LATE',   'รถไฟฟ้าขัดข้อง');

-- ── 3. LEAVE RECORD ─────────────────────────────────────────────
INSERT INTO LeaveRecord (StaffID, LeaveType, StartDate, EndDate, Reason, Status, ApprovedBy, CreatedAt) VALUES
(4, 'SICK_LEAVE',     '2025-04-05', '2025-04-06', 'ไข้หวัดใหญ่',                    'APPROVED', 1, '2025-04-04 10:00:00'),
(7, 'PERSONAL_LEAVE', '2025-04-10', '2025-04-10', 'ธุระส่วนตัว งานแต่งญาติ',          'APPROVED', 2, '2025-04-03 09:00:00'),
(5, 'ANNUAL_LEAVE',   '2025-05-01', '2025-05-05', 'พักร้อนวันหยุดยาวสงกรานต์',       'APPROVED', 1, '2025-04-01 08:00:00'),
(8, 'SICK_LEAVE',     '2025-04-08', '2025-04-08', 'ปวดท้องกะทันหัน',                 'APPROVED', 2, '2025-04-07 20:00:00'),
(9, 'PERSONAL_LEAVE', '2025-04-15', '2025-04-16', 'ย้ายบ้านใหม่',                    'PENDING',  NULL, '2025-04-05 11:00:00'),
(3, 'ANNUAL_LEAVE',   '2025-06-01', '2025-06-07', 'ท่องเที่ยวต่างประเทศ ญี่ปุ่น',    'PENDING',  NULL, '2025-04-10 09:30:00');

-- ── 4. CUSTOMER ─────────────────────────────────────────────────
INSERT INTO Customer (CustomerUsername, PasswordHash, FirstName, LastName, PhoneNumber, CustomerEmail, Address) VALUES
('user_apinya',   '$2b$12$KIX8X1lFz5kQwZq3GpN2/.abc123hashXXXXXXXXXXXXXXXXXXXX', 'อาพิญา',  'ศรีสวัสดิ์',  '086-001-0001', 'apinya@gmail.com',   '12 ถ.รามอินทรา แขวงอนุสาวรีย์ บางเขน กรุงเทพฯ 10220'),
('user_boonme',   '$2b$12$KIX8X1lFz5kQwZq3GpN2/.abc123hashXXXXXXXXXXXXXXXXXXXX', 'บุญมี',   'แสงทอง',      '086-001-0002', 'boonme@gmail.com',   '45 ถ.ลาดพร้าว แขวงจันทรเกษม จตุจักร กรุงเทพฯ 10900'),
('user_chanya',   '$2b$12$KIX8X1lFz5kQwZq3GpN2/.abc123hashXXXXXXXXXXXXXXXXXXXX', 'ชัญญา',   'ดีงาม',       '086-001-0003', 'chanya@gmail.com',   '7 ซ.อ่อนนุช 70 แขวงประเวศ กรุงเทพฯ 10250'),
('user_decha',    '$2b$12$KIX8X1lFz5kQwZq3GpN2/.abc123hashXXXXXXXXXXXXXXXXXXXX', 'เดชา',    'พลังดี',      '086-001-0004', 'decha@gmail.com',    '99 ถ.พัฒนาการ แขวงสวนหลวง กรุงเทพฯ 10250'),
('user_ekamai',   '$2b$12$KIX8X1lFz5kQwZq3GpN2/.abc123hashXXXXXXXXXXXXXXXXXXXX', 'เอกมัย',  'สุริยา',      '086-001-0005', 'ekamai@gmail.com',   '3 ซ.เอกมัย 10 แขวงคลองเตยเหนือ วัฒนา กรุงเทพฯ 10110'),
('user_fon',      '$2b$12$KIX8X1lFz5kQwZq3GpN2/.abc123hashXXXXXXXXXXXXXXXXXXXX', 'ฝน',      'ตกลงมา',      '086-001-0006', 'fon@gmail.com',      '21 ถ.งามวงศ์วาน ต.บางเขน อ.เมือง นนทบุรี 11000'),
('user_gun',      '$2b$12$KIX8X1lFz5kQwZq3GpN2/.abc123hashXXXXXXXXXXXXXXXXXXXX', 'กัน',     'ยิ้มเสมอ',    '086-001-0007', 'gun@gmail.com',      '88 ถ.ติวานนท์ ต.ท่าทราย อ.เมือง นนทบุรี 11000'),
('user_honey',    '$2b$12$KIX8X1lFz5kQwZq3GpN2/.abc123hashXXXXXXXXXXXXXXXXXXXX', 'ฮันนี่',  'หวานใจ',      '086-001-0008', 'honey@gmail.com',    '5 ถ.ประชาชื่น แขวงทุ่งสองห้อง หลักสี่ กรุงเทพฯ 10210'),
('user_ing',      '$2b$12$KIX8X1lFz5kQwZq3GpN2/.abc123hashXXXXXXXXXXXXXXXXXXXX', 'อิง',     'พึ่งตน',      '086-001-0009', 'ing@gmail.com',      '14 ถ.รัชดาภิเษก แขวงดินแดง กรุงเทพฯ 10400'),
('user_joy',      '$2b$12$KIX8X1lFz5kQwZq3GpN2/.abc123hashXXXXXXXXXXXXXXXXXXXX', 'จอย',     'สุขใจ',       '086-001-0010', 'joy@gmail.com',      '60 ถ.เพชรบุรีตัดใหม่ แขวงมักกะสัน ราชเทวี กรุงเทพฯ 10400'),
('user_kla',      '$2b$12$KIX8X1lFz5kQwZq3GpN2/.abc123hashXXXXXXXXXXXXXXXXXXXX', 'กล้า',    'หาญชัย',      '086-001-0011', 'kla@gmail.com',      '33 ถ.บางนา-ตราด แขวงบางนา กรุงเทพฯ 10260'),
('user_lek',      '$2b$12$KIX8X1lFz5kQwZq3GpN2/.abc123hashXXXXXXXXXXXXXXXXXXXX', 'เล็ก',    'แต่เก่ง',     '086-001-0012', 'lek@gmail.com',      '77 ถ.สุขุมวิท 71 แขวงพระโขนงเหนือ วัฒนา กรุงเทพฯ 10110'),
('user_may',      '$2b$12$KIX8X1lFz5kQwZq3GpN2/.abc123hashXXXXXXXXXXXXXXXXXXXX', 'เมย์',    'ใจงาม',       '086-001-0013', 'may@gmail.com',      '9 ซ.ลาดกระบัง 54 แขวงลาดกระบัง กรุงเทพฯ 10520'),
('user_nat',      '$2b$12$KIX8X1lFz5kQwZq3GpN2/.abc123hashXXXXXXXXXXXXXXXXXXXX', 'ณัฐ',     'วิชาดี',      '086-001-0014', 'nat@gmail.com',      '202 ถ.เจริญกรุง แขวงบางรัก กรุงเทพฯ 10500'),
('user_on',       '$2b$12$KIX8X1lFz5kQwZq3GpN2/.abc123hashXXXXXXXXXXXXXXXXXXXX', 'อ้อน',    'อ่อนหวาน',    '086-001-0015', 'on@gmail.com',       '55 ม.3 ต.คลองหลวง อ.คลองหลวง ปทุมธานี 12120');

-- ── 5. PET ──────────────────────────────────────────────────────
-- [FIX 2] ทุก row มี MedicalCondition, Allergy, VaccineRecord ครบ
INSERT INTO Pet (CustomerID, Name, Species, Breed, Weight, MedicalCondition, Allergy, IsVaccinated, VaccineRecord) VALUES
-- อาพิญา มี 2 แมว
(1,  'มะม่วง',        'CAT', 'Scottish Fold',     4.2,  'ไม่มี',                        'ไม่มี',           TRUE,  'FVRCP + Rabies มี.ค. 2025'),
(1,  'มะนาว',         'CAT', 'Ragdoll',            3.8,  'ไม่มี',                        'ปลาทะเล',        TRUE,  'FVRCP + Rabies ก.พ. 2025'),
-- บุญมี มี 1 สุนัข
(2,  'ขาวมณี',        'DOG', 'Shih Tzu',           4.5,  'ไม่มี',                        'ไม่มี',           TRUE,  'DHPPiL + Rabies ม.ค. 2025'),
-- ชัญญา มี 2 สัตว์
(3,  'เจ้าส้ม',       'CAT', 'Orange Tabby',       5.1,  'โรคไต ระยะแรก',                'ไก่',             TRUE,  'FVRCP มี.ค. 2025'),
(3,  'ลูกพีช',        'DOG', 'Pomeranian',         2.8,  'ไม่มี',                        'ไม่มี',           TRUE,  'DHPPiL + Rabies ก.พ. 2025'),
-- เดชา มี 1 สุนัข
(4,  'ดำเพชร',        'DOG', 'Thai Bangkaew',      12.0, 'ไม่มี',                        'ไม่มี',           TRUE,  'DHPPiL + Rabies ธ.ค. 2024'),
-- เอกมัย มี 1 แมว
(5,  'ครีม',          'CAT', 'British Shorthair',  5.5,  'ภูมิแพ้อาหาร',                 'กุ้ง, ปลาแซลมอน','TRUE',  'FVRCP ม.ค. 2025'),
-- ฝน มี 2 สุนัข
(6,  'ท็อฟฟี่',       'DOG', 'Golden Retriever',   28.0, 'ไม่มี',                        'ไม่มี',           TRUE,  'DHPPiL + Rabies พ.ย. 2024'),
(6,  'บิสกิต',        'DOG', 'Beagle',             10.5, 'ลิ้นหัวใจรั่ว ระยะเฝ้าระวัง', 'ไม่มี',           TRUE,  'DHPPiL + Rabies พ.ย. 2024'),
-- กัน มี 1 แมว
(7,  'เจ้าเหมียว',    'CAT', 'Domestic Shorthair', 3.9,  'ไม่มี',                        'ไม่มี',           FALSE, 'ไม่มี'),
-- ฮันนี่ มี 1 สุนัข
(8,  'มอคค่า',        'DOG', 'French Bulldog',     9.2,  'ระบบทางเดินหายใจ Brachycephalic','ไม่มี',          TRUE,  'DHPPiL + Rabies ม.ค. 2025'),
-- อิง มี 1 นก
(9,  'แก้วมุกดา',     'BIRD','Cockatiel',           0.09, 'ไม่มี',                        'ไม่มี',           FALSE, 'ไม่มี'),
-- จอย มี 2 แมว
(10, 'โยเกิร์ต',      'CAT', 'Siamese',            3.5,  'ไม่มี',                        'ไม่มี',           TRUE,  'FVRCP + Rabies ก.พ. 2025'),
(10, 'ชีส',           'CAT', 'Persian',             4.8,  'โรคทางเดินปัสสาวะ FLUTD',     'ไม่มี',           TRUE,  'FVRCP + Rabies ก.พ. 2025'),
-- กล้า มี 1 สุนัข
(11, 'เจ้าดุ',        'DOG', 'German Shepherd',    30.0, 'ไม่มี',                        'ไม่มี',           TRUE,  'DHPPiL + Rabies ต.ค. 2024'),
-- เล็ก มี 1 สุนัข
(12, 'หมาชอบวิ่ง',    'DOG', 'Labrador Retriever', 25.0, 'ไม่มี',                        'ไม่มี',           TRUE,  'DHPPiL + Rabies ก.ย. 2024'),
-- เมย์ มี 1 แมว
(13, 'บัตเตอร์',      'CAT', 'Maine Coon',          6.8,  'ไม่มี',                        'ไม่มี',           TRUE,  'FVRCP + Rabies มี.ค. 2025'),
-- ณัฐ มี 2 สัตว์
(14, 'น้ำผึ้ง',       'CAT', 'Abyssinian',          3.2,  'ไม่มี',                        'ไม่มี',           TRUE,  'FVRCP ธ.ค. 2024'),
(14, 'ขนมปัง',        'DOG', 'Dachshund',           6.0,  'หมอนรองกระดูกกดทับเส้นประสาท','ไม่มี',           TRUE,  'DHPPiL + Rabies ก.พ. 2025'),
-- อ้อน มี 1 แมว
(15, 'วานิลลา',       'CAT', 'Ragdoll',             4.1,  'ไม่มี',                        'ไม่มี',           TRUE,  'FVRCP + Rabies มี.ค. 2025');

-- ── 6. ROOM ───────────────────────────────────────────────────
INSERT INTO Room (RoomNumber, RoomSize, PetType, Rate, Status) VALUES
-- ห้องแมว
('C-01', 'SMALL',  'CAT', 250.00,  'OCCUPIED'),
('C-02', 'SMALL',  'CAT', 250.00,  'OCCUPIED'),
('C-03', 'MEDIUM', 'CAT', 380.00,  'OCCUPIED'),
('C-04', 'MEDIUM', 'CAT', 380.00,  'AVAILABLE'),
('C-05', 'LARGE',  'CAT', 550.00,  'AVAILABLE'),
('C-06', 'SMALL',  'CAT', 250.00,  'MAINTENANCE'),
-- ห้องสุนัข
('D-01', 'SMALL',  'DOG', 300.00,  'OCCUPIED'),
('D-02', 'SMALL',  'DOG', 300.00,  'AVAILABLE'),
('D-03', 'MEDIUM', 'DOG', 450.00,  'OCCUPIED'),
('D-04', 'MEDIUM', 'DOG', 450.00,  'OCCUPIED'),
('D-05', 'LARGE',  'DOG', 650.00,  'OCCUPIED'),
('D-06', 'LARGE',  'DOG', 650.00,  'AVAILABLE'),
('D-07', 'MEDIUM', 'DOG', 450.00,  'MAINTENANCE');

-- ── 7. BOOKING ─────────────────────────────────────────────────
-- LockedRate = ราคาห้องรวมทุกตัวต่อคืน (อิง booking)
INSERT INTO Booking (CustomerID, CheckInDate, CheckOutDate, Status, CreatedBy_StaffID, LockedRate, CancelledAt, CancelledByStaffID) VALUES
-- BK1: อาพิญา จอง 2 แมว (มะม่วง + มะนาว) COMPLETED
(1,  '2025-03-01 14:00:00', '2025-03-05 12:00:00', 'COMPLETED', 1, 630.00, NULL, NULL),
-- BK2: บุญมี จอง 1 สุนัข COMPLETED
(2,  '2025-03-10 14:00:00', '2025-03-13 12:00:00', 'COMPLETED', 3, 450.00, NULL, NULL),
-- BK3: ชัญญา จอง 2 สัตว์ (แมว + หมา) COMPLETED
(3,  '2025-03-15 14:00:00', '2025-03-18 12:00:00', 'COMPLETED', 2, 730.00, NULL, NULL),
-- BK4: ฝน จอง 2 สุนัข ACTIVE (อยู่ระหว่างฝาก)
(6,  '2025-04-01 14:00:00', '2025-04-07 12:00:00', 'ACTIVE',    3, 1100.00, NULL, NULL),
-- BK5: ฮันนี่ จอง 1 สุนัข ACTIVE
(8,  '2025-04-02 14:00:00', '2025-04-06 12:00:00', 'ACTIVE',    5, 450.00, NULL, NULL),
-- BK6: จอย จอง 2 แมว ACTIVE
(10, '2025-04-03 14:00:00', '2025-04-08 12:00:00', 'ACTIVE',    6, 760.00, NULL, NULL),
-- BK7: กล้า จอง 1 สุนัข PENDING
(11, '2025-04-10 14:00:00', '2025-04-14 12:00:00', 'PENDING',   3, 650.00, NULL, NULL),
-- BK8: เล็ก จอง 1 สุนัข PENDING
(12, '2025-04-12 14:00:00', '2025-04-15 12:00:00', 'PENDING',   1, 650.00, NULL, NULL),
-- BK9: เมย์ จอง 1 แมว ใหญ่ PENDING
(13, '2025-04-15 14:00:00', '2025-04-20 12:00:00', 'PENDING',   2, 550.00, NULL, NULL),
-- BK10: เดชา CANCELLED
(4,  '2025-03-20 14:00:00', '2025-03-23 12:00:00', 'CANCELLED', 1, 650.00, '2025-03-18', 1),
-- BK11: อ้อน ACTIVE
(15, '2025-04-02 14:00:00', '2025-04-09 12:00:00', 'ACTIVE',    6, 380.00, NULL, NULL),
-- BK12: ณัฐ จอง 2 สัตว์ ACTIVE
(14, '2025-04-03 14:00:00', '2025-04-07 12:00:00', 'ACTIVE',    3, 750.00, NULL, NULL);

-- ── 8. BOOKING DETAIL ──────────────────────────────────────────
INSERT INTO BookingDetail (BookingID, PetID, RoomID) VALUES
-- BK1: มะม่วง→C-01, มะนาว→C-02
(1,  1,  1),
(1,  2,  2),
-- BK2: ขาวมณี→D-03
(2,  3,  9),
-- BK3: เจ้าส้ม→C-03, ลูกพีช→D-01
(3,  4,  3),
(3,  5,  7),
-- BK4: ท็อฟฟี่→D-05, บิสกิต→D-04
(4,  8,  11),
(4,  9,  10),
-- BK5: มอคค่า→D-03
(5,  11, 9),
-- BK6: โยเกิร์ต→C-01, ชีส→C-02
(6,  13, 1),
(6,  14, 2),
-- BK7: เจ้าดุ→D-05
(7,  16, 11),
-- BK8: หมาชอบวิ่ง→D-05
(8,  17, 11),
-- BK9: บัตเตอร์→C-05
(9,  18, 5),
-- BK10: ดำเพชร (CANCELLED ไม่มี room ถูก occupy)
(10, 6,  11),
-- BK11: วานิลลา→C-03
(11, 20, 3),
-- BK12: น้ำผึ้ง→C-02, ขนมปัง→D-04
(12, 19, 2),
(12, 19, 10);  -- หมายเหตุ: ขนมปัง PetID=19 (row ที่ 19 = ขนมปัง)

-- ── 9. INVENTORY ITEM ──────────────────────────────────────────
-- [FIX 3] มีคอลัมน์ IsChargeable
INSERT INTO InventoryItem (ItemName, Category, QuantityInStock, UnitPrice, LowStockThreshold, IsChargeable) VALUES
-- อาหาร (FOOD) — คิดเงิน
('อาหารแมวเม็ด Royal Canin Adult',      'FOOD',    50,  35.00,  10, TRUE),
('อาหารแมวเม็ด Hills Science Diet',     'FOOD',    40,  40.00,  10, TRUE),
('อาหารสุนัขเม็ด Purina Pro Plan',       'FOOD',    60,  45.00,  10, TRUE),
('อาหารสุนัขเม็ด Royal Canin Medium',   'FOOD',    45,  50.00,  10, TRUE),
('อาหารเปียกแมว Fancy Feast',           'FOOD',    80,  25.00,  20, TRUE),
('อาหารเปียกสุนัข Pedigree',            'FOOD',    70,  28.00,  20, TRUE),
('ขนมแมว Temptations',                  'FOOD',    100, 15.00,  30, TRUE),
('ขนมสุนัข Milk-Bone',                  'FOOD',    90,  18.00,  30, TRUE),
-- วิตามินเสริม — คิดเงิน
('วิตามินบำรุงขน Omega-3 แมว',          'SUPPLY',  30,  80.00,  5,  TRUE),
('วิตามินบำรุงข้อ Glucosamine สุนัข',   'SUPPLY',  25,  90.00,  5,  TRUE),
-- ของใช้ทั่วไป — ฟรี (รวมในแพ็กเกจ)
('ทรายแมว Catsan 10L',                  'SUPPLY',  20,  120.00, 5,  FALSE),
('แผ่นรองซับสุนัข',                     'SUPPLY',  200, 5.00,   50, FALSE),
('ถุงเก็บอุจจาระสุนัข',                 'SUPPLY',  500, 1.00,   100,FALSE),
-- บริการพิเศษ — คิดเงิน
('บริการอาบน้ำตัดขนแมว',               'SERVICE', 999, 250.00, 0,  TRUE),
('บริการอาบน้ำตัดขนสุนัขเล็ก',         'SERVICE', 999, 300.00, 0,  TRUE),
('บริการอาบน้ำตัดขนสุนัขใหญ่',         'SERVICE', 999, 450.00, 0,  TRUE),
('บริการ Spa & Massage สัตว์เลี้ยง',   'SERVICE', 999, 350.00, 0,  TRUE),
('ค่าพาไปหาหมอฉุกเฉิน',               'SERVICE', 999, 500.00, 0,  TRUE),
-- ยา — คิดเงิน
('ยาถ่ายพยาธิ Drontal',                 'SUPPLY',  30,  60.00,  5,  TRUE),
('ยาหยอดหมัด Frontline',                'SUPPLY',  40,  180.00, 10, TRUE);

-- ── 10. BOOKING SERVICE ────────────────────────────────────────
INSERT INTO BookingService (BookingID, ItemID, Quantity, UnitPrice) VALUES
-- BK1: อาหารแมว + ขนม
(1, 1, 8,  35.00),  -- Royal Canin 8 มื้อ (4 วัน x 2 ตัว)
(1, 7, 2,  15.00),  -- Temptations
-- BK2: อาหารสุนัข + บริการอาบน้ำ
(2, 3, 6,  45.00),
(2, 15,1,  300.00),
-- BK3: อาหารแมว + อาหารหมา + ขนม
(3, 1, 3,  35.00),
(3, 3, 3,  45.00),
(3, 7, 1,  15.00),
(3, 8, 1,  18.00),
-- BK4: อาหารสุนัขใหญ่ + วิตามิน + อาบน้ำ (2 ตัว)
(4, 4, 12, 50.00),
(4, 10,2,  90.00),  -- Glucosamine สำหรับบิสกิต (ลิ้นหัวใจรั่ว)
(4, 16,2,  450.00), -- อาบน้ำ 2 ครั้ง
-- BK5: อาหารสุนัข (French Bulldog กินน้อย)
(5, 3, 4,  45.00),
-- BK6: อาหารแมว + Spa
(6, 2, 10, 40.00),  -- Hills (เพราะชีสเป็นโรคทางเดินปัสสาวะ)
(6, 17,1,  350.00), -- Spa
-- BK11: อาหารแมว
(11,1, 7,  35.00),
-- BK12: อาหารแมว + อาหารหมา
(12,1, 4,  35.00),
(12,3, 4,  45.00);

-- ── 11. CARE LOG ───────────────────────────────────────────────
-- BK4 (ACTIVE): ท็อฟฟี่ BD=6, บิสกิต BD=7
INSERT INTO CareLog (BookingDetailID, LogDate, FoodStatus, PottyStatus, MedicationGiven, StaffNote, PhotoURL, LoggedBy_StaffID) VALUES
-- ท็อฟฟี่
(6,  '2025-04-01 20:00:00', 'ALL',    'NORMAL',   FALSE, 'น้องทานอาหารหมด วิ่งเล่นสนุก', 'https://cdn.purrfect.com/logs/bk4-toffee-day1.jpg', 3),
(6,  '2025-04-02 20:00:00', 'ALL',    'NORMAL',   FALSE, 'แข็งแรงดี ขี้หางสูง', 'https://cdn.purrfect.com/logs/bk4-toffee-day2.jpg', 5),
(6,  '2025-04-03 20:00:00', 'LITTLE', 'NORMAL',   FALSE, 'ทานน้อยลงนิดหน่อย อาจเบื่ออาหาร จะสังเกตต่อ', NULL, 3),
-- บิสกิต (ลิ้นหัวใจรั่ว — ต้องระวัง)
(7,  '2025-04-01 20:00:00', 'ALL',    'NORMAL',   TRUE,  'ให้ยาตามที่เจ้าของสั่ง หัวใจยังปกติดี', 'https://cdn.purrfect.com/logs/bk4-biscuit-day1.jpg', 5),
(7,  '2025-04-02 20:00:00', 'ALL',    'NORMAL',   TRUE,  'ยาครบ สุขภาพดี หายใจปกติ ไม่หอบ', NULL, 3),
(7,  '2025-04-03 20:00:00', 'ALL',    'ABNORMAL', TRUE,  'อุจจาระเหลวเล็กน้อย แจ้งเจ้าของแล้ว กำลังเฝ้าดู', NULL, 6),
-- BK5 (ACTIVE): มอคค่า BD=8
(8,  '2025-04-02 20:00:00', 'ALL',    'NORMAL',   FALSE, 'French Bulldog น่ารักมาก แต่กรนเสียงดังตอนนอน ปกติของสายพันธุ์', 'https://cdn.purrfect.com/logs/bk5-mocha-day1.jpg', 6),
(8,  '2025-04-03 20:00:00', 'LITTLE', 'NORMAL',   FALSE, 'ทานข้าวน้อย อากาศค่อนข้างร้อน ดื่มน้ำเยอะขึ้น', NULL, 3),
-- BK6 (ACTIVE): โยเกิร์ต BD=9, ชีส BD=10
(9,  '2025-04-03 20:00:00', 'ALL',    'NORMAL',   FALSE, 'แมว Siamese ร้องเรียกตลอด คาดว่าคิดถึงเจ้าของ 😅', 'https://cdn.purrfect.com/logs/bk6-yogurt-day1.jpg', 8),
(9,  '2025-04-04 20:00:00', 'ALL',    'NORMAL',   FALSE, 'เริ่มคุ้นกับสถานที่แล้ว ไม่ร้องแล้ว', NULL, 3),
(10, '2025-04-03 20:00:00', 'ALL',    'NORMAL',   FALSE, 'ชีสทานอาหาร Hills เรียบร้อย ปัสสาวะปกติ สังเกตสีปัสสาวะอยู่', NULL, 6),
(10, '2025-04-04 20:00:00', 'ALL',    'NORMAL',   FALSE, 'ปกติดีทุกอย่าง ปัสสาวะสีเหลืองใสดี', 'https://cdn.purrfect.com/logs/bk6-cheese-day2.jpg', 8),
-- BK11 (ACTIVE): วานิลลา BD=14
(14, '2025-04-02 20:00:00', 'ALL',    'NORMAL',   FALSE, 'วานิลลาเงียบๆ ชอบนอนมุมห้อง', NULL, 9),
(14, '2025-04-03 20:00:00', 'ALL',    'NORMAL',   FALSE, 'กินข้าวเรียบร้อย ขนสวยมาก', 'https://cdn.purrfect.com/logs/bk11-vanilla-day2.jpg', 8),
-- BK12 (ACTIVE): น้ำผึ้ง BD=15, ขนมปัง BD=16
(15, '2025-04-03 20:00:00', 'ALL',    'NORMAL',   FALSE, 'น้ำผึ้งวิ่งเล่นตลอด กระฉับกระเฉงมาก', NULL, 3),
(16, '2025-04-03 20:00:00', 'LITTLE', 'NORMAL',   TRUE,  'ขนมปังทานน้อย เนื่องจากปวดหลัง ให้ยาตามที่สั่ง จำกัดการเคลื่อนไหว', NULL, 5);

-- ── 12. INVENTORY USAGE ────────────────────────────────────────
-- [FIX 4] เชื่อมกับ BookingDetailID แทน BookingID
INSERT INTO InventoryUsage (BookingDetailID, ItemID, QuantityUsed, UsageDate, StaffID) VALUES
-- BK4 ท็อฟฟี่ (BD=6)
(6,  4,  1, '2025-04-01 08:00:00', 3),  -- Royal Canin Medium
(6,  4,  1, '2025-04-02 08:00:00', 5),
(6,  4,  1, '2025-04-03 08:00:00', 3),
(6,  13, 1, '2025-04-01 07:00:00', 3),  -- ถุงเก็บอุจจาระ (ฟรี)
(6,  13, 1, '2025-04-02 07:00:00', 5),
(6,  13, 1, '2025-04-03 07:00:00', 3),
-- BK4 บิสกิต (BD=7)
(7,  4,  1, '2025-04-01 08:00:00', 5),
(7,  4,  1, '2025-04-02 08:00:00', 3),
(7,  4,  1, '2025-04-03 08:00:00', 6),
(7,  10, 1, '2025-04-01 09:00:00', 5),  -- Glucosamine
(7,  10, 1, '2025-04-02 09:00:00', 3),
(7,  13, 1, '2025-04-01 07:00:00', 5),  -- ถุงเก็บอุจจาระ (ฟรี)
(7,  12, 1, '2025-04-01 06:00:00', 5),  -- แผ่นรองซับ (ฟรี)
-- BK5 มอคค่า (BD=8)
(8,  3,  1, '2025-04-02 08:00:00', 6),  -- Purina Pro Plan
(8,  3,  1, '2025-04-03 08:00:00', 3),
(8,  12, 1, '2025-04-02 06:00:00', 6),  -- แผ่นรองซับ (ฟรี)
-- BK6 โยเกิร์ต (BD=9)
(9,  2,  1, '2025-04-03 08:00:00', 8),  -- Hills
(9,  2,  1, '2025-04-04 08:00:00', 3),
(9,  11, 1, '2025-04-03 06:00:00', 8),  -- ทรายแมว (ฟรี)
-- BK6 ชีส (BD=10)
(10, 2,  1, '2025-04-03 08:00:00', 6),  -- Hills (โรคทางเดินปัสสาวะ)
(10, 2,  1, '2025-04-04 08:00:00', 8),
(10, 11, 1, '2025-04-03 06:00:00', 6),  -- ทรายแมว (ฟรี)
-- BK12 ขนมปัง (BD=16) — ให้ยา
(16, 19, 1, '2025-04-03 09:00:00', 5);  -- ยาถ่ายพยาธิ (ตามแพทย์สั่ง)

-- ── 13. INVOICE ────────────────────────────────────────────────
-- [FIX 1] มี DepositPaid + payment_status = PARTIAL/PAID/UNPAID
INSERT INTO Invoice (BookingID, IssuedBy_StaffID, RoomTotal, ServiceTotal, VetEmergencyCost, DepositPaid, PaymentMethod, PaymentStatus, PaymentDate) VALUES
-- BK1 COMPLETED: 4 คืน x 250x2 = 2000, Service=(8x35)+(2x15)=310, Deposit=500 → PAID
(1,  1, 2000.00, 310.00,  0.00,   500.00, 'โอนธนาคาร',  'PAID',    '2025-03-05 12:30:00'),
-- BK2 COMPLETED: 3 คืน x 450 = 1350, Service=(6x45)+(300)=570, Deposit=300 → PAID
(2,  3, 1350.00, 570.00,  0.00,   300.00, 'เงินสด',      'PAID',    '2025-03-13 12:30:00'),
-- BK3 COMPLETED: 3 คืน x 730 = 2190, Service=(3x35)+(3x45)+(15)+(18)=378, Deposit=500 → PAID
(3,  2, 2190.00, 378.00,  0.00,   500.00, 'บัตรเครดิต', 'PAID',    '2025-03-18 12:30:00'),
-- BK4 ACTIVE: มัดจำแล้ว 1000 รอจ่ายส่วนที่เหลือ → PARTIAL
(4,  NULL, 6600.00, 1590.00, 0.00, 1000.00, NULL,        'PARTIAL', NULL),
-- BK5 ACTIVE: มัดจำ 500 → PARTIAL
(5,  NULL, 1800.00, 180.00,  0.00,  500.00, NULL,        'PARTIAL', NULL),
-- BK6 ACTIVE: มัดจำ 500 → PARTIAL
(6,  NULL, 3800.00, 750.00,  0.00,  500.00, NULL,        'PARTIAL', NULL),
-- BK7 PENDING: ยังไม่ได้มัดจำ → UNPAID
(7,  NULL, 2600.00, 0.00,    0.00,    0.00, NULL,        'UNPAID',  NULL),
-- BK8 PENDING: ยังไม่ได้มัดจำ → UNPAID
(8,  NULL, 1950.00, 0.00,    0.00,    0.00, NULL,        'UNPAID',  NULL),
-- BK9 PENDING: มัดจำแล้ว 500 → PARTIAL
(9,  NULL, 2750.00, 0.00,    0.00,  500.00, NULL,        'PARTIAL', NULL),
-- BK11 ACTIVE: มัดจำ 300 → PARTIAL
(11, NULL, 2660.00, 245.00,  0.00,  300.00, NULL,        'PARTIAL', NULL),
-- BK12 ACTIVE: มัดจำ 500, บิสกิตต้องพาหาหมาฉุกเฉิน (+500) → PARTIAL
(12, NULL, 3000.00, 305.00, 500.00, 500.00, NULL,        'PARTIAL', NULL);
