:::mermaid
    erDiagram
    %% ── RELATIONSHIPS ──
    Customer ||--o{ Pet : "owns"
    Customer ||--o{ Booking : "makes"
    
    Booking ||--|{ BookingDetail : "contains"
    Pet ||--o{ BookingDetail : "stays_in"
    Room ||--o{ BookingDetail : "hosts"
    
    BookingDetail ||--o{ CareLog : "has_log"
    
    Booking ||--o{ BookingService : "includes_service"
    InventoryItem ||--o{ BookingService : "provides"
    
    BookingDetail ||--o{ InventoryUsage : "uses_item"
    InventoryItem ||--o{ InventoryUsage : "consumed_in"
    
    Booking ||--o| Invoice : "generates (1-to-1)"
    
    Staff ||--o{ Attendance : "logs"
    Staff ||--o{ LeaveRecord : "requests"
    Staff ||--o{ LeaveRecord : "approves"
    Staff ||--o{ AuditTrail : "performs"
    
    %% Staff involvement in operations
    Staff ||--o{ Booking : "creates"
    Staff ||--o{ Booking : "cancels"
    Staff ||--o{ CareLog : "logs"
    Staff ||--o{ InventoryUsage : "dispenses"
    Staff ||--o{ Invoice : "issues"

    %% ── TABLES ──
    Customer {
        SERIAL CustomerID PK
        VARCHAR CustomerUsername UK
        VARCHAR PasswordHash
        VARCHAR FirstName
        VARCHAR LastName
        VARCHAR PhoneNumber
        VARCHAR CustomerEmail UK
        TEXT Address
    }

    Staff {
        SERIAL StaffID PK
        VARCHAR StaffUsername UK
        VARCHAR PasswordHash
        VARCHAR FirstName
        VARCHAR LastName
        VARCHAR Role
        BOOLEAN IsOnDuty
        VARCHAR PhoneNumber
        VARCHAR StaffEmail UK
        DATE HireDate
    }

    Pet {
        SERIAL PetID PK
        INT CustomerID FK
        VARCHAR Name
        species_enum Species
        VARCHAR Breed
        DECIMAL Weight
        TEXT MedicalCondition
        TEXT Allergy
        BOOLEAN IsVaccinated
        TEXT VaccineRecord
    }

    Room {
        SERIAL RoomID PK
        VARCHAR RoomNumber UK
        room_size_enum RoomSize
        pet_type_enum PetType
        DECIMAL Rate
        room_status_enum Status
    }

    Booking {
        SERIAL BookingID PK
        INT CustomerID FK
        TIMESTAMP CheckInDate
        TIMESTAMP CheckOutDate
        booking_status Status
        INT CreatedBy_StaffID FK
        DECIMAL LockedRate
        DATE CancelledAt
        INT CancelledByStaffID FK
    }

    BookingDetail {
        SERIAL BookingDetailID PK
        INT BookingID FK
        INT PetID FK
        INT RoomID FK
    }

    CareLog {
        SERIAL LogID PK
        INT BookingDetailID FK
        TIMESTAMP LogDate
        food_status_enum FoodStatus
        potty_status_enum PottyStatus
        BOOLEAN MedicationGiven
        TEXT StaffNote
        VARCHAR PhotoURL
        INT LoggedBy_StaffID FK
    }

    InventoryItem {
        SERIAL ItemID PK
        VARCHAR ItemName
        VARCHAR Category
        INT QuantityInStock
        DECIMAL UnitPrice
        INT LowStockThreshold
        BOOLEAN IsChargeable
    }

    BookingService {
        SERIAL BookingServiceID PK
        INT BookingID FK
        INT ItemID FK
        INT Quantity
        DECIMAL UnitPrice
    }

    InventoryUsage {
        SERIAL UsageID PK
        INT BookingDetailID FK
        INT ItemID FK
        INT QuantityUsed
        TIMESTAMP UsageDate
        INT StaffID FK
    }

    Invoice {
        SERIAL InvoiceID PK
        INT BookingID FK
        INT IssuedBy_StaffID FK
        DECIMAL RoomTotal
        DECIMAL ServiceTotal
        DECIMAL VetEmergencyCost
        DECIMAL GrandTotal
        DECIMAL DepositPaid
        VARCHAR PaymentMethod
        payment_status PaymentStatus
        TIMESTAMP PaymentDate
    }

    Attendance {
        SERIAL AttendanceID PK
        INT StaffID FK
        DATE WorkDate
        TIMESTAMP ClockInTime
        TIMESTAMP ClockOutTime
        attendance_status Status
        VARCHAR Remark
    }

    LeaveRecord {
        SERIAL LeaveID PK
        INT StaffID FK
        leave_type LeaveType
        DATE StartDate
        DATE EndDate
        TEXT Reason
        leave_status Status
        INT ApprovedBy FK
        TIMESTAMP CreatedAt
    }

    AuditTrail {
        SERIAL AuditID PK
        INT StaffID FK
        VARCHAR StaffName
        VARCHAR ActionType
        VARCHAR TableAffected
        INT RecordID
        TEXT Description
        TIMESTAMP Timestamp
    }
:::