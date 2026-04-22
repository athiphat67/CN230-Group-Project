:::mermaid
erDiagram
    Booking ||--o{ BookingService : "includes_service"
    Booking ||--o| Invoice : "generates (1-to-1)"
    BookingDetail ||--o{ CareLog : "has_log"
    BookingDetail ||--o{ InventoryUsage : "uses_item"
    InventoryItem ||--o{ BookingService : "provides"
    InventoryItem ||--o{ InventoryUsage : "consumed_in"

    Booking {
        SERIAL BookingID PK
        booking_status Status
    }
    BookingDetail {
        SERIAL BookingDetailID PK
        INT BookingID FK
    }
    CareLog {
        SERIAL LogID PK
        INT BookingDetailID FK
        TIMESTAMP LogDate
        food_status_enum FoodStatus
        potty_status_enum PottyStatus
        BOOLEAN MedicationGiven
        TEXT StaffNote
    }
    InventoryItem {
        SERIAL ItemID PK
        VARCHAR ItemName
        INT QuantityInStock
        DECIMAL UnitPrice
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
    }
    Invoice {
        SERIAL InvoiceID PK
        INT BookingID FK
        DECIMAL GrandTotal
        DECIMAL DepositPaid
        payment_status PaymentStatus
        TIMESTAMP PaymentDate
    }
:::