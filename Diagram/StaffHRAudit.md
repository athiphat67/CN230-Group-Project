:::mermaid
erDiagram
    staff ||--o{ attendance : "logs"
    staff ||--o{ leaverecord : "requests/approves"
    staff ||--o{ auditlog : "performs"
    staff ||--o{ notification : "receives/triggers"

    staff {
        serial4 staffid PK
        varchar staffusername UK
        varchar role
        bool isonduty
        bool isActive
    }
    attendance {
        serial4 attendanceid PK
        int4 staffid FK
        date workdate
        timestamp clockin
        timestamp clockout
        attendance_status status
    }
    leaverecord {
        serial4 leaveid PK
        int4 staffid FK
        leave_type leavetype
        date startdate
        date enddate
        leave_status status
    }
    auditlog {
        serial4 audit_id PK
        int4 staff_id FK
        audit_action action_type
        varchar table_affected
        timestamp timestamp
    }
    notification {
        serial4 notification_id PK
        notification_type type
        varchar title
        int4 recipient_staff_id FK
        int4 actor_staff_id FK
        int4 actor_customer_id
        bool is_read
        jsonb metadata
    }
:::