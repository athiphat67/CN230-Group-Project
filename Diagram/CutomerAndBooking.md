:::mermaid
    erDiagram
    Customer ||--o{ Pet : "owns"
    Customer ||--o{ Booking : "makes"
    Booking ||--|{ BookingDetail : "contains"
    Pet ||--o{ BookingDetail : "stays_in"
    Room ||--o{ BookingDetail : "hosts"

    Customer {
        SERIAL CustomerID PK
        VARCHAR CustomerUsername UK
        VARCHAR CustomerEmail UK
        VARCHAR FirstName
        VARCHAR LastName
        VARCHAR PhoneNumber
    }
    Pet {
        SERIAL PetID PK
        INT CustomerID FK
        VARCHAR Name
        species_enum Species
        TEXT MedicalCondition
        TEXT Allergy
        BOOLEAN IsVaccinated
    }
    Room {
        SERIAL RoomID PK
        VARCHAR RoomNumber UK
        room_size_enum RoomSize
        room_status_enum Status
        DECIMAL Rate
    }
    Booking {
        SERIAL BookingID PK
        INT CustomerID FK
        TIMESTAMP CheckInDate
        TIMESTAMP CheckOutDate
        booking_status Status
        DECIMAL LockedRate
        INT CreatedBy_StaffID
    }
    BookingDetail {
        SERIAL BookingDetailID PK
        INT BookingID FK
        INT PetID FK
        INT RoomID FK
    }
:::