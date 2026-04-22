:::mermaid
    erDiagram
    Staff ||--o{ Attendance : "logs"
    Staff ||--o{ LeaveRecord : "requests"
    Staff ||--o{ LeaveRecord : "approves"
    Staff ||--o{ AuditTrail : "performs"

    Staff {
        SERIAL StaffID PK
        VARCHAR StaffUsername UK
        VARCHAR Role
        BOOLEAN IsOnDuty
        VARCHAR StaffEmail UK
    }
    Attendance {
        SERIAL AttendanceID PK
        INT StaffID FK
        DATE WorkDate
        TIMESTAMP ClockInTime
        TIMESTAMP ClockOutTime
        attendance_status Status
    }
    LeaveRecord {
        SERIAL LeaveID PK
        INT StaffID FK
        leave_type LeaveType
        DATE StartDate
        DATE EndDate
        leave_status Status
        INT ApprovedBy FK
    }
    AuditTrail {
        SERIAL AuditID PK
        INT StaffID FK
        VARCHAR StaffName
        VARCHAR ActionType
        VARCHAR TableAffected
        TIMESTAMP Timestamp
    }
:::