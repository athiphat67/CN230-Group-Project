:::mermaid
 erDiagram
    %% ── RELATIONSHIPS (Crow's Foot) ──
    customer ||--o{ pet : "owns"
    customer ||--o{ booking : "makes"
    customer ||--o{ notification : "triggers (actor)"
    
    pet ||--o{ vaccinationrecord : "has_record"
    pet ||--o{ mealplan : "has_plan"
    pet ||--o{ bookingdetail : "stays_in"
    
    booking ||--|{ bookingdetail : "contains (at least 1)"
    booking ||--o{ bookingservice : "includes_service"
    booking ||--o| invoice : "generates (1-to-1)"
    booking ||--o{ notification : "has_notification"
    
    room ||--o{ bookingdetail : "hosts"
    
    bookingdetail ||--o{ carelog : "has_log"
    bookingdetail ||--o{ inventoryusage : "uses_item"
    
    inventoryitem ||--o{ bookingservice : "provides"
    inventoryitem ||--o{ inventoryusage : "consumed_in"
    
    staff ||--o{ attendance : "logs"
    staff ||--o{ leaverecord : "requests/approves"
    staff ||--o{ auditlog : "performs"
    staff ||--o{ booking : "creates/cancels"
    staff ||--o{ invoice : "issues"
    staff ||--o{ carelog : "logs"
    staff ||--o{ inventoryusage : "dispenses"
    staff ||--o{ notification : "receives/triggers"

    %% ── TABLES ──
    customer {
        serial4 customerid PK
        varchar customerusername UK
        varchar firstname
        varchar lastname
        varchar phonenumber
        varchar customeremail UK
        text address
    }

    staff {
        serial4 staffid PK
        varchar staffusername UK
        varchar firstname
        varchar lastname
        varchar role
        bool isonduty
        varchar phonenumber
        varchar staffemail UK
        date hiredate
        bool isActive
    }

    pet {
        serial4 petid PK
        int4 customerid FK
        varchar name
        species_enum species
        varchar breed
        numeric weight
        text medicalcondition
        text allergy
        bool isvaccinated
        text vaccinerecord
        date dob
        bpchar sex
        varchar coat_color
        text behavior_notes
    }

    vaccinationrecord {
        serial4 vaccine_id PK
        int4 pet_id FK
        varchar vaccine_name
        date administered_date
        date expiry_date
        varchar vet_clinic
        timestamp created_at
    }

    mealplan {
        serial4 mealplan_id PK
        int4 pet_id FK
        varchar meal_period
        varchar food_type
        numeric quantity_grams
        text notes
        timestamp created_at
    }

    room {
        serial4 roomid PK
        varchar roomnumber UK
        room_size_enum roomsize
        pet_type_enum pettype
        numeric rate
        room_status_enum status
    }

    booking {
        serial4 bookingid PK
        int4 customerid FK
        timestamp checkindate
        timestamp checkoutdate
        booking_status status
        int4 createdby_staffid FK
        numeric lockedrate
        date cancelledat
        int4 cancelledbystaffid FK
    }

    bookingdetail {
        serial4 bookingdetailid PK
        int4 bookingid FK
        int4 petid FK
        int4 roomid FK
    }

    carelog {
        serial4 logid PK
        int4 bookingdetailid FK
        timestamp logdate
        food_status_enum foodstatus
        potty_status_enum pottystatus
        bool medicationgiven
        text staffnote
        varchar photourl
        int4 loggedby_staffid FK
        mood_type mood
        text behavior_notes
    }

    inventoryitem {
        serial4 itemid PK
        varchar itemname
        varchar category
        int4 quantityinstock
        numeric unitprice
        int4 lowstockthreshold
        bool ischargeable
        date expiry_date
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
        int4 staffid FK
    }

    invoice {
        serial4 invoiceid PK
        int4 bookingid FK
        int4 issuedby_staffid FK
        numeric roomtotal
        numeric servicetotal
        numeric vetemergencycost
        numeric grandtotal
        numeric depositpaid
        varchar paymentmethod
        payment_status paymentstatus
        timestamp paymentdate
        numeric amountpaid
        timestamp lastpaymentdate
    }

    attendance {
        serial4 attendanceid PK
        int4 staffid FK
        date workdate
        timestamp clockin
        timestamp clockout
        attendance_status status
        varchar note
    }

    leaverecord {
        serial4 leaveid PK
        int4 staffid FK
        leave_type leavetype
        date startdate
        date enddate
        text reason
        leave_status status
        int4 approvedby FK
        timestamp createdat
        timestamp updatedat
    }

    auditlog {
        serial4 audit_id PK
        int4 staff_id FK
        audit_action action_type
        varchar table_affected
        varchar record_id
        text description
        timestamp timestamp
    }

    notification {
        serial4 notification_id PK
        notification_type type
        varchar title
        text body
        int4 booking_id FK
        bool is_read
        timestamp sent_at
        int4 recipient_staff_id FK
        text message
        int4 related_id
        timestamp created_at
        timestamp updated_at
        int4 actor_staff_id FK
        int4 actor_customer_id FK
        int4 target_id
        jsonb metadata
    }
:::