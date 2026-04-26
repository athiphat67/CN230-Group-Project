:::mermaid
erDiagram
    customer ||--o{ pet : "owns"
    customer ||--o{ booking : "makes"
    pet ||--o{ vaccinationrecord : "has_record"
    pet ||--o{ mealplan : "has_plan"
    booking ||--|{ bookingdetail : "contains"
    pet ||--o{ bookingdetail : "stays_in"
    room ||--o{ bookingdetail : "hosts"

    customer {
        serial4 customerid PK
        varchar customerusername
        varchar firstname
        varchar lastname
    }
    pet {
        serial4 petid PK
        int4 customerid FK
        varchar name
        species_enum species
        bool isvaccinated
        bpchar sex
    }
    vaccinationrecord {
        serial4 vaccine_id PK
        int4 pet_id FK
        varchar vaccine_name
        date administered_date
        date expiry_date
    }
    mealplan {
        serial4 mealplan_id PK
        int4 pet_id FK
        varchar meal_period
        varchar food_type
        numeric quantity_grams
    }
    room {
        serial4 roomid PK
        varchar roomnumber UK
        room_size_enum roomsize
        numeric rate
        room_status_enum status
    }
    booking {
        serial4 bookingid PK
        int4 customerid FK
        timestamp checkindate
        timestamp checkoutdate
        booking_status status
    }
    bookingdetail {
        serial4 bookingdetailid PK
        int4 bookingid FK
        int4 petid FK
        int4 roomid FK
    }
:::