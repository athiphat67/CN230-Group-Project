:::mermaid
erDiagram
    booking ||--o{ bookingservice : "includes_service"
    booking ||--o| invoice : "generates (1-to-1)"
    bookingdetail ||--o{ carelog : "has_log"
    bookingdetail ||--o{ inventoryusage : "uses_item"
    inventoryitem ||--o{ bookingservice : "provides"
    inventoryitem ||--o{ inventoryusage : "consumed_in"

    booking {
        serial4 bookingid PK
        booking_status status
    }
    bookingdetail {
        serial4 bookingdetailid PK
        int4 bookingid FK
    }
    carelog {
        serial4 logid PK
        int4 bookingdetailid FK
        timestamp logdate
        food_status_enum foodstatus
        potty_status_enum pottystatus
        mood_type mood
        text staffnote
    }
    inventoryitem {
        serial4 itemid PK
        varchar itemname
        int4 quantityinstock
        numeric unitprice
        bool ischargeable
    }
    bookingservice {
        serial4 bookingserviceid PK
        int4 bookingid FK
        int4 itemid FK
        int4 quantity
        numeric unitprice
    }
    inventoryusage {
        serial4 usageid PK
        int4 bookingdetailid FK
        int4 itemid FK
        int4 quantityused
        timestamp usagedate
    }
    invoice {
        serial4 invoiceid PK
        int4 bookingid FK
        numeric grandtotal
        numeric depositpaid
        numeric amountpaid
        payment_status paymentstatus
    }
:::