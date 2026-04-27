


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."attendance_status" AS ENUM (
    'ONTIME',
    'LATE',
    'ABSENT'
);


ALTER TYPE "public"."attendance_status" OWNER TO "postgres";


CREATE TYPE "public"."audit_action" AS ENUM (
    'CREATE',
    'UPDATE',
    'DELETE',
    'CHECKIN',
    'CHECKOUT',
    'APPROVE'
);


ALTER TYPE "public"."audit_action" OWNER TO "postgres";


CREATE TYPE "public"."booking_status" AS ENUM (
    'PENDING',
    'ACTIVE',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE "public"."booking_status" OWNER TO "postgres";


CREATE TYPE "public"."food_status_enum" AS ENUM (
    'ALL',
    'LITTLE',
    'NONE'
);


ALTER TYPE "public"."food_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."leave_status" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE "public"."leave_status" OWNER TO "postgres";


CREATE TYPE "public"."leave_type" AS ENUM (
    'SICK_LEAVE',
    'PERSONAL_LEAVE',
    'ANNUAL_LEAVE'
);


ALTER TYPE "public"."leave_type" OWNER TO "postgres";


CREATE TYPE "public"."mood_type" AS ENUM (
    'HAPPY',
    'NEUTRAL',
    'ANXIOUS',
    'SICK'
);


ALTER TYPE "public"."mood_type" OWNER TO "postgres";


CREATE TYPE "public"."notification_type" AS ENUM (
    'NEW_BOOKING_ALERT',
    'BOOKING_CONFIRMED',
    'BOOKING_CANCELLED',
    'CARE_REPORT',
    'PAYMENT_CONFIRMED',
    'CHECKIN_REMINDER'
);


ALTER TYPE "public"."notification_type" OWNER TO "postgres";


CREATE TYPE "public"."payment_status" AS ENUM (
    'UNPAID',
    'PARTIAL',
    'PAID'
);


ALTER TYPE "public"."payment_status" OWNER TO "postgres";


CREATE TYPE "public"."pet_type_enum" AS ENUM (
    'CAT',
    'DOG'
);


ALTER TYPE "public"."pet_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."potty_status_enum" AS ENUM (
    'NORMAL',
    'ABNORMAL',
    'NONE'
);


ALTER TYPE "public"."potty_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."room_size_enum" AS ENUM (
    'SMALL',
    'MEDIUM',
    'LARGE'
);


ALTER TYPE "public"."room_size_enum" OWNER TO "postgres";


CREATE TYPE "public"."room_status_enum" AS ENUM (
    'AVAILABLE',
    'OCCUPIED',
    'MAINTENANCE'
);


ALTER TYPE "public"."room_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."species_enum" AS ENUM (
    'DOG',
    'CAT',
    'BIRD',
    'OTHER'
);


ALTER TYPE "public"."species_enum" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."attendance" (
    "attendanceid" integer NOT NULL,
    "staffid" integer NOT NULL,
    "workdate" "date" NOT NULL,
    "clockin" timestamp without time zone,
    "clockout" timestamp without time zone,
    "status" "public"."attendance_status" DEFAULT 'ONTIME'::"public"."attendance_status" NOT NULL,
    "note" character varying(255),
    CONSTRAINT "chk_clockout" CHECK ((("clockout" IS NULL) OR ("clockout" > "clockin")))
);


ALTER TABLE "public"."attendance" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."attendance_attendanceid_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."attendance_attendanceid_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."attendance_attendanceid_seq" OWNED BY "public"."attendance"."attendanceid";



CREATE TABLE IF NOT EXISTS "public"."auditlog" (
    "audit_id" integer NOT NULL,
    "staff_id" integer NOT NULL,
    "action_type" "public"."audit_action" NOT NULL,
    "table_affected" character varying(100) NOT NULL,
    "record_id" character varying(50),
    "description" "text",
    "timestamp" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."auditlog" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."auditlog_audit_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."auditlog_audit_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."auditlog_audit_id_seq" OWNED BY "public"."auditlog"."audit_id";



CREATE TABLE IF NOT EXISTS "public"."booking" (
    "bookingid" integer NOT NULL,
    "customerid" integer NOT NULL,
    "checkindate" timestamp without time zone NOT NULL,
    "checkoutdate" timestamp without time zone NOT NULL,
    "status" "public"."booking_status" DEFAULT 'PENDING'::"public"."booking_status" NOT NULL,
    "createdby_staffid" integer,
    "lockedrate" numeric(10,2) NOT NULL,
    "cancelledat" "date",
    "cancelledbystaffid" integer,
    CONSTRAINT "chk_booking_dates" CHECK (("checkoutdate" > "checkindate"))
);


ALTER TABLE "public"."booking" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."booking_bookingid_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."booking_bookingid_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."booking_bookingid_seq" OWNED BY "public"."booking"."bookingid";



CREATE TABLE IF NOT EXISTS "public"."bookingdetail" (
    "bookingdetailid" integer NOT NULL,
    "bookingid" integer NOT NULL,
    "petid" integer NOT NULL,
    "roomid" integer NOT NULL
);


ALTER TABLE "public"."bookingdetail" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."bookingdetail_bookingdetailid_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."bookingdetail_bookingdetailid_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."bookingdetail_bookingdetailid_seq" OWNED BY "public"."bookingdetail"."bookingdetailid";



CREATE TABLE IF NOT EXISTS "public"."bookingservice" (
    "bookingserviceid" integer NOT NULL,
    "bookingid" integer NOT NULL,
    "itemid" integer NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "unitprice" numeric(10,2) NOT NULL,
    CONSTRAINT "bookingservice_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."bookingservice" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."bookingservice_bookingserviceid_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."bookingservice_bookingserviceid_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."bookingservice_bookingserviceid_seq" OWNED BY "public"."bookingservice"."bookingserviceid";



CREATE TABLE IF NOT EXISTS "public"."carelog" (
    "logid" integer NOT NULL,
    "bookingdetailid" integer NOT NULL,
    "logdate" timestamp without time zone DEFAULT "now"() NOT NULL,
    "foodstatus" "public"."food_status_enum",
    "pottystatus" "public"."potty_status_enum",
    "medicationgiven" boolean DEFAULT false NOT NULL,
    "staffnote" "text",
    "photourl" character varying(255),
    "loggedby_staffid" integer,
    "mood" "public"."mood_type",
    "behavior_notes" "text"
);


ALTER TABLE "public"."carelog" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."carelog_logid_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."carelog_logid_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."carelog_logid_seq" OWNED BY "public"."carelog"."logid";



CREATE TABLE IF NOT EXISTS "public"."customer" (
    "customerid" integer NOT NULL,
    "customerusername" character varying(50) NOT NULL,
    "passwordhash" character varying(255) NOT NULL,
    "firstname" character varying(255) NOT NULL,
    "lastname" character varying(255) NOT NULL,
    "phonenumber" character varying(20),
    "customeremail" character varying(50) NOT NULL,
    "address" "text"
);


ALTER TABLE "public"."customer" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."customer_customerid_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."customer_customerid_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."customer_customerid_seq" OWNED BY "public"."customer"."customerid";



CREATE TABLE IF NOT EXISTS "public"."inventoryitem" (
    "itemid" integer NOT NULL,
    "itemname" character varying(255) NOT NULL,
    "category" character varying(50),
    "quantityinstock" integer DEFAULT 0 NOT NULL,
    "unitprice" numeric(10,2),
    "lowstockthreshold" integer DEFAULT 0 NOT NULL,
    "ischargeable" boolean DEFAULT true NOT NULL,
    "expiry_date" "date",
    CONSTRAINT "chk_stock_non_negative" CHECK (("quantityinstock" >= 0))
);


ALTER TABLE "public"."inventoryitem" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."inventoryitem_itemid_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."inventoryitem_itemid_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."inventoryitem_itemid_seq" OWNED BY "public"."inventoryitem"."itemid";



CREATE TABLE IF NOT EXISTS "public"."inventoryusage" (
    "usageid" integer NOT NULL,
    "bookingdetailid" integer NOT NULL,
    "itemid" integer NOT NULL,
    "quantityused" integer NOT NULL,
    "usagedate" timestamp without time zone DEFAULT "now"() NOT NULL,
    "staffid" integer,
    CONSTRAINT "inventoryusage_quantityused_check" CHECK (("quantityused" > 0))
);


ALTER TABLE "public"."inventoryusage" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."inventoryusage_usageid_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."inventoryusage_usageid_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."inventoryusage_usageid_seq" OWNED BY "public"."inventoryusage"."usageid";



CREATE TABLE IF NOT EXISTS "public"."invoice" (
    "invoiceid" integer NOT NULL,
    "bookingid" integer NOT NULL,
    "issuedby_staffid" integer,
    "roomtotal" numeric(10,2) DEFAULT 0 NOT NULL,
    "servicetotal" numeric(10,2) DEFAULT 0 NOT NULL,
    "vetemergencycost" numeric(10,2) DEFAULT 0 NOT NULL,
    "grandtotal" numeric(10,2) GENERATED ALWAYS AS ((("roomtotal" + "servicetotal") + "vetemergencycost")) STORED,
    "depositpaid" numeric(10,2) DEFAULT 0 NOT NULL,
    "paymentmethod" character varying(50),
    "paymentstatus" "public"."payment_status" DEFAULT 'UNPAID'::"public"."payment_status" NOT NULL,
    "paymentdate" timestamp without time zone,
    "amountpaid" numeric(10,2) DEFAULT 0 NOT NULL,
    "lastpaymentdate" timestamp without time zone
);


ALTER TABLE "public"."invoice" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."invoice_invoiceid_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."invoice_invoiceid_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."invoice_invoiceid_seq" OWNED BY "public"."invoice"."invoiceid";



CREATE TABLE IF NOT EXISTS "public"."leaverecord" (
    "leaveid" integer NOT NULL,
    "staffid" integer NOT NULL,
    "leavetype" "public"."leave_type" NOT NULL,
    "startdate" "date" NOT NULL,
    "enddate" "date" NOT NULL,
    "reason" "text",
    "status" "public"."leave_status" DEFAULT 'PENDING'::"public"."leave_status" NOT NULL,
    "approvedby" integer,
    "createdat" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updatedat" timestamp without time zone,
    CONSTRAINT "chk_leave_dates" CHECK (("enddate" >= "startdate"))
);


ALTER TABLE "public"."leaverecord" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."leaverecord_leaveid_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."leaverecord_leaveid_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."leaverecord_leaveid_seq" OWNED BY "public"."leaverecord"."leaveid";



CREATE TABLE IF NOT EXISTS "public"."mealplan" (
    "mealplan_id" integer NOT NULL,
    "pet_id" integer NOT NULL,
    "meal_period" character varying(20) NOT NULL,
    "food_type" character varying(200) NOT NULL,
    "quantity_grams" numeric(8,1) NOT NULL,
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "mealplan_meal_period_check" CHECK ((("meal_period")::"text" = ANY ((ARRAY['MORNING'::character varying, 'MIDDAY'::character varying, 'EVENING'::character varying])::"text"[])))
);


ALTER TABLE "public"."mealplan" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."mealplan_mealplan_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."mealplan_mealplan_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."mealplan_mealplan_id_seq" OWNED BY "public"."mealplan"."mealplan_id";



CREATE TABLE IF NOT EXISTS "public"."notification" (
    "notification_id" integer NOT NULL,
    "type" "public"."notification_type" NOT NULL,
    "title" character varying(300) NOT NULL,
    "body" "text",
    "booking_id" integer,
    "is_read" boolean DEFAULT false,
    "sent_at" timestamp without time zone DEFAULT "now"(),
    "recipient_staff_id" integer
);


ALTER TABLE "public"."notification" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."notification_notification_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."notification_notification_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."notification_notification_id_seq" OWNED BY "public"."notification"."notification_id";



CREATE TABLE IF NOT EXISTS "public"."pet" (
    "petid" integer NOT NULL,
    "customerid" integer NOT NULL,
    "name" character varying(100) NOT NULL,
    "species" "public"."species_enum" NOT NULL,
    "breed" character varying(100),
    "weight" numeric(5,2),
    "medicalcondition" "text" DEFAULT 'ไม่มี'::"text" NOT NULL,
    "allergy" "text" DEFAULT 'ไม่มี'::"text" NOT NULL,
    "isvaccinated" boolean DEFAULT false NOT NULL,
    "vaccinerecord" "text" DEFAULT 'ไม่มี'::"text" NOT NULL,
    "dob" "date",
    "sex" character(1),
    "coat_color" character varying(100),
    "behavior_notes" "text",
    CONSTRAINT "pet_sex_check" CHECK (("sex" = ANY (ARRAY['M'::"bpchar", 'F'::"bpchar"])))
);


ALTER TABLE "public"."pet" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."pet_petid_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."pet_petid_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."pet_petid_seq" OWNED BY "public"."pet"."petid";



CREATE TABLE IF NOT EXISTS "public"."room" (
    "roomid" integer NOT NULL,
    "roomnumber" character varying(20) NOT NULL,
    "roomsize" "public"."room_size_enum",
    "pettype" "public"."pet_type_enum",
    "rate" numeric(10,2) NOT NULL,
    "status" "public"."room_status_enum" DEFAULT 'AVAILABLE'::"public"."room_status_enum" NOT NULL
);


ALTER TABLE "public"."room" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."room_roomid_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."room_roomid_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."room_roomid_seq" OWNED BY "public"."room"."roomid";



CREATE TABLE IF NOT EXISTS "public"."staff" (
    "staffid" integer NOT NULL,
    "staffusername" character varying(50) NOT NULL,
    "passwordhash" character varying(255) NOT NULL,
    "firstname" character varying(255) NOT NULL,
    "lastname" character varying(255) NOT NULL,
    "role" character varying(50) NOT NULL,
    "isonduty" boolean DEFAULT false NOT NULL,
    "phonenumber" character varying(20),
    "staffemail" character varying(50) NOT NULL,
    "hiredate" "date" DEFAULT CURRENT_DATE NOT NULL,
    "isActive" boolean DEFAULT true
);


ALTER TABLE "public"."staff" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."staff_staffid_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."staff_staffid_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."staff_staffid_seq" OWNED BY "public"."staff"."staffid";



CREATE TABLE IF NOT EXISTS "public"."vaccinationrecord" (
    "vaccine_id" integer NOT NULL,
    "pet_id" integer NOT NULL,
    "vaccine_name" character varying(100) NOT NULL,
    "administered_date" "date" NOT NULL,
    "expiry_date" "date" NOT NULL,
    "vet_clinic" character varying(200),
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."vaccinationrecord" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."vaccinationrecord_vaccine_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."vaccinationrecord_vaccine_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."vaccinationrecord_vaccine_id_seq" OWNED BY "public"."vaccinationrecord"."vaccine_id";



ALTER TABLE ONLY "public"."attendance" ALTER COLUMN "attendanceid" SET DEFAULT "nextval"('"public"."attendance_attendanceid_seq"'::"regclass");



ALTER TABLE ONLY "public"."auditlog" ALTER COLUMN "audit_id" SET DEFAULT "nextval"('"public"."auditlog_audit_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."booking" ALTER COLUMN "bookingid" SET DEFAULT "nextval"('"public"."booking_bookingid_seq"'::"regclass");



ALTER TABLE ONLY "public"."bookingdetail" ALTER COLUMN "bookingdetailid" SET DEFAULT "nextval"('"public"."bookingdetail_bookingdetailid_seq"'::"regclass");



ALTER TABLE ONLY "public"."bookingservice" ALTER COLUMN "bookingserviceid" SET DEFAULT "nextval"('"public"."bookingservice_bookingserviceid_seq"'::"regclass");



ALTER TABLE ONLY "public"."carelog" ALTER COLUMN "logid" SET DEFAULT "nextval"('"public"."carelog_logid_seq"'::"regclass");



ALTER TABLE ONLY "public"."customer" ALTER COLUMN "customerid" SET DEFAULT "nextval"('"public"."customer_customerid_seq"'::"regclass");



ALTER TABLE ONLY "public"."inventoryitem" ALTER COLUMN "itemid" SET DEFAULT "nextval"('"public"."inventoryitem_itemid_seq"'::"regclass");



ALTER TABLE ONLY "public"."inventoryusage" ALTER COLUMN "usageid" SET DEFAULT "nextval"('"public"."inventoryusage_usageid_seq"'::"regclass");



ALTER TABLE ONLY "public"."invoice" ALTER COLUMN "invoiceid" SET DEFAULT "nextval"('"public"."invoice_invoiceid_seq"'::"regclass");



ALTER TABLE ONLY "public"."leaverecord" ALTER COLUMN "leaveid" SET DEFAULT "nextval"('"public"."leaverecord_leaveid_seq"'::"regclass");



ALTER TABLE ONLY "public"."mealplan" ALTER COLUMN "mealplan_id" SET DEFAULT "nextval"('"public"."mealplan_mealplan_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."notification" ALTER COLUMN "notification_id" SET DEFAULT "nextval"('"public"."notification_notification_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."pet" ALTER COLUMN "petid" SET DEFAULT "nextval"('"public"."pet_petid_seq"'::"regclass");



ALTER TABLE ONLY "public"."room" ALTER COLUMN "roomid" SET DEFAULT "nextval"('"public"."room_roomid_seq"'::"regclass");



ALTER TABLE ONLY "public"."staff" ALTER COLUMN "staffid" SET DEFAULT "nextval"('"public"."staff_staffid_seq"'::"regclass");



ALTER TABLE ONLY "public"."vaccinationrecord" ALTER COLUMN "vaccine_id" SET DEFAULT "nextval"('"public"."vaccinationrecord_vaccine_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_pkey" PRIMARY KEY ("attendanceid");



ALTER TABLE ONLY "public"."auditlog"
    ADD CONSTRAINT "auditlog_pkey" PRIMARY KEY ("audit_id");



ALTER TABLE ONLY "public"."booking"
    ADD CONSTRAINT "booking_pkey" PRIMARY KEY ("bookingid");



ALTER TABLE ONLY "public"."bookingdetail"
    ADD CONSTRAINT "bookingdetail_pkey" PRIMARY KEY ("bookingdetailid");



ALTER TABLE ONLY "public"."bookingservice"
    ADD CONSTRAINT "bookingservice_pkey" PRIMARY KEY ("bookingserviceid");



ALTER TABLE ONLY "public"."carelog"
    ADD CONSTRAINT "carelog_pkey" PRIMARY KEY ("logid");



ALTER TABLE ONLY "public"."customer"
    ADD CONSTRAINT "customer_customeremail_key" UNIQUE ("customeremail");



ALTER TABLE ONLY "public"."customer"
    ADD CONSTRAINT "customer_customerusername_key" UNIQUE ("customerusername");



ALTER TABLE ONLY "public"."customer"
    ADD CONSTRAINT "customer_pkey" PRIMARY KEY ("customerid");



ALTER TABLE ONLY "public"."inventoryitem"
    ADD CONSTRAINT "inventoryitem_pkey" PRIMARY KEY ("itemid");



ALTER TABLE ONLY "public"."inventoryusage"
    ADD CONSTRAINT "inventoryusage_pkey" PRIMARY KEY ("usageid");



ALTER TABLE ONLY "public"."invoice"
    ADD CONSTRAINT "invoice_bookingid_key" UNIQUE ("bookingid");



ALTER TABLE ONLY "public"."invoice"
    ADD CONSTRAINT "invoice_pkey" PRIMARY KEY ("invoiceid");



ALTER TABLE ONLY "public"."leaverecord"
    ADD CONSTRAINT "leaverecord_pkey" PRIMARY KEY ("leaveid");



ALTER TABLE ONLY "public"."mealplan"
    ADD CONSTRAINT "mealplan_pet_id_meal_period_key" UNIQUE ("pet_id", "meal_period");



ALTER TABLE ONLY "public"."mealplan"
    ADD CONSTRAINT "mealplan_pkey" PRIMARY KEY ("mealplan_id");



ALTER TABLE ONLY "public"."notification"
    ADD CONSTRAINT "notification_pkey" PRIMARY KEY ("notification_id");



ALTER TABLE ONLY "public"."pet"
    ADD CONSTRAINT "pet_pkey" PRIMARY KEY ("petid");



ALTER TABLE ONLY "public"."room"
    ADD CONSTRAINT "room_pkey" PRIMARY KEY ("roomid");



ALTER TABLE ONLY "public"."room"
    ADD CONSTRAINT "room_roomnumber_key" UNIQUE ("roomnumber");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_pkey" PRIMARY KEY ("staffid");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_staffemail_key" UNIQUE ("staffemail");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_staffusername_key" UNIQUE ("staffusername");



ALTER TABLE ONLY "public"."bookingdetail"
    ADD CONSTRAINT "uq_booking_room" UNIQUE ("bookingid", "roomid");



ALTER TABLE ONLY "public"."bookingservice"
    ADD CONSTRAINT "uq_booking_service" UNIQUE ("bookingid", "itemid");



ALTER TABLE ONLY "public"."vaccinationrecord"
    ADD CONSTRAINT "vaccinationrecord_pkey" PRIMARY KEY ("vaccine_id");



CREATE INDEX "idx_attendance_staff" ON "public"."attendance" USING "btree" ("staffid", "workdate");



CREATE INDEX "idx_booking_customer" ON "public"."booking" USING "btree" ("customerid");



CREATE INDEX "idx_booking_status" ON "public"."booking" USING "btree" ("status");



CREATE INDEX "idx_bookingdetail_pet" ON "public"."bookingdetail" USING "btree" ("petid");



CREATE INDEX "idx_bookingdetail_room" ON "public"."bookingdetail" USING "btree" ("roomid");



CREATE INDEX "idx_bookingservice_book" ON "public"."bookingservice" USING "btree" ("bookingid");



CREATE INDEX "idx_carelog_detail" ON "public"."carelog" USING "btree" ("bookingdetailid");



CREATE INDEX "idx_inventoryusage_bkdet" ON "public"."inventoryusage" USING "btree" ("bookingdetailid");



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_staffid_fkey" FOREIGN KEY ("staffid") REFERENCES "public"."staff"("staffid") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."auditlog"
    ADD CONSTRAINT "auditlog_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("staffid");



ALTER TABLE ONLY "public"."booking"
    ADD CONSTRAINT "booking_cancelledbystaffid_fkey" FOREIGN KEY ("cancelledbystaffid") REFERENCES "public"."staff"("staffid");



ALTER TABLE ONLY "public"."booking"
    ADD CONSTRAINT "booking_createdby_staffid_fkey" FOREIGN KEY ("createdby_staffid") REFERENCES "public"."staff"("staffid");



ALTER TABLE ONLY "public"."booking"
    ADD CONSTRAINT "booking_customerid_fkey" FOREIGN KEY ("customerid") REFERENCES "public"."customer"("customerid");



ALTER TABLE ONLY "public"."bookingdetail"
    ADD CONSTRAINT "bookingdetail_bookingid_fkey" FOREIGN KEY ("bookingid") REFERENCES "public"."booking"("bookingid") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookingdetail"
    ADD CONSTRAINT "bookingdetail_petid_fkey" FOREIGN KEY ("petid") REFERENCES "public"."pet"("petid");



ALTER TABLE ONLY "public"."bookingdetail"
    ADD CONSTRAINT "bookingdetail_roomid_fkey" FOREIGN KEY ("roomid") REFERENCES "public"."room"("roomid");



ALTER TABLE ONLY "public"."bookingservice"
    ADD CONSTRAINT "bookingservice_bookingid_fkey" FOREIGN KEY ("bookingid") REFERENCES "public"."booking"("bookingid") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookingservice"
    ADD CONSTRAINT "bookingservice_itemid_fkey" FOREIGN KEY ("itemid") REFERENCES "public"."inventoryitem"("itemid");



ALTER TABLE ONLY "public"."carelog"
    ADD CONSTRAINT "carelog_bookingdetailid_fkey" FOREIGN KEY ("bookingdetailid") REFERENCES "public"."bookingdetail"("bookingdetailid") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."carelog"
    ADD CONSTRAINT "carelog_loggedby_staffid_fkey" FOREIGN KEY ("loggedby_staffid") REFERENCES "public"."staff"("staffid");



ALTER TABLE ONLY "public"."inventoryusage"
    ADD CONSTRAINT "inventoryusage_bookingdetailid_fkey" FOREIGN KEY ("bookingdetailid") REFERENCES "public"."bookingdetail"("bookingdetailid");



ALTER TABLE ONLY "public"."inventoryusage"
    ADD CONSTRAINT "inventoryusage_itemid_fkey" FOREIGN KEY ("itemid") REFERENCES "public"."inventoryitem"("itemid");



ALTER TABLE ONLY "public"."inventoryusage"
    ADD CONSTRAINT "inventoryusage_staffid_fkey" FOREIGN KEY ("staffid") REFERENCES "public"."staff"("staffid");



ALTER TABLE ONLY "public"."invoice"
    ADD CONSTRAINT "invoice_bookingid_fkey" FOREIGN KEY ("bookingid") REFERENCES "public"."booking"("bookingid");



ALTER TABLE ONLY "public"."invoice"
    ADD CONSTRAINT "invoice_issuedby_staffid_fkey" FOREIGN KEY ("issuedby_staffid") REFERENCES "public"."staff"("staffid");



ALTER TABLE ONLY "public"."leaverecord"
    ADD CONSTRAINT "leaverecord_approvedby_fkey" FOREIGN KEY ("approvedby") REFERENCES "public"."staff"("staffid");



ALTER TABLE ONLY "public"."leaverecord"
    ADD CONSTRAINT "leaverecord_staffid_fkey" FOREIGN KEY ("staffid") REFERENCES "public"."staff"("staffid") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mealplan"
    ADD CONSTRAINT "mealplan_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pet"("petid") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification"
    ADD CONSTRAINT "notification_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."booking"("bookingid");



ALTER TABLE ONLY "public"."notification"
    ADD CONSTRAINT "notification_recipient_staff_id_fkey" FOREIGN KEY ("recipient_staff_id") REFERENCES "public"."staff"("staffid");



ALTER TABLE ONLY "public"."pet"
    ADD CONSTRAINT "pet_customerid_fkey" FOREIGN KEY ("customerid") REFERENCES "public"."customer"("customerid") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vaccinationrecord"
    ADD CONSTRAINT "vaccinationrecord_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pet"("petid") ON DELETE CASCADE;



ALTER TABLE "public"."notification" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";








































































































































































GRANT ALL ON TABLE "public"."attendance" TO "anon";
GRANT ALL ON TABLE "public"."attendance" TO "authenticated";
GRANT ALL ON TABLE "public"."attendance" TO "service_role";



GRANT ALL ON SEQUENCE "public"."attendance_attendanceid_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."attendance_attendanceid_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."attendance_attendanceid_seq" TO "service_role";



GRANT ALL ON TABLE "public"."auditlog" TO "anon";
GRANT ALL ON TABLE "public"."auditlog" TO "authenticated";
GRANT ALL ON TABLE "public"."auditlog" TO "service_role";



GRANT ALL ON SEQUENCE "public"."auditlog_audit_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."auditlog_audit_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."auditlog_audit_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."booking" TO "anon";
GRANT ALL ON TABLE "public"."booking" TO "authenticated";
GRANT ALL ON TABLE "public"."booking" TO "service_role";



GRANT ALL ON SEQUENCE "public"."booking_bookingid_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."booking_bookingid_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."booking_bookingid_seq" TO "service_role";



GRANT ALL ON TABLE "public"."bookingdetail" TO "anon";
GRANT ALL ON TABLE "public"."bookingdetail" TO "authenticated";
GRANT ALL ON TABLE "public"."bookingdetail" TO "service_role";



GRANT ALL ON SEQUENCE "public"."bookingdetail_bookingdetailid_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."bookingdetail_bookingdetailid_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."bookingdetail_bookingdetailid_seq" TO "service_role";



GRANT ALL ON TABLE "public"."bookingservice" TO "anon";
GRANT ALL ON TABLE "public"."bookingservice" TO "authenticated";
GRANT ALL ON TABLE "public"."bookingservice" TO "service_role";



GRANT ALL ON SEQUENCE "public"."bookingservice_bookingserviceid_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."bookingservice_bookingserviceid_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."bookingservice_bookingserviceid_seq" TO "service_role";



GRANT ALL ON TABLE "public"."carelog" TO "anon";
GRANT ALL ON TABLE "public"."carelog" TO "authenticated";
GRANT ALL ON TABLE "public"."carelog" TO "service_role";



GRANT ALL ON SEQUENCE "public"."carelog_logid_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."carelog_logid_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."carelog_logid_seq" TO "service_role";



GRANT ALL ON TABLE "public"."customer" TO "anon";
GRANT ALL ON TABLE "public"."customer" TO "authenticated";
GRANT ALL ON TABLE "public"."customer" TO "service_role";



GRANT ALL ON SEQUENCE "public"."customer_customerid_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."customer_customerid_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."customer_customerid_seq" TO "service_role";



GRANT ALL ON TABLE "public"."inventoryitem" TO "anon";
GRANT ALL ON TABLE "public"."inventoryitem" TO "authenticated";
GRANT ALL ON TABLE "public"."inventoryitem" TO "service_role";



GRANT ALL ON SEQUENCE "public"."inventoryitem_itemid_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."inventoryitem_itemid_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."inventoryitem_itemid_seq" TO "service_role";



GRANT ALL ON TABLE "public"."inventoryusage" TO "anon";
GRANT ALL ON TABLE "public"."inventoryusage" TO "authenticated";
GRANT ALL ON TABLE "public"."inventoryusage" TO "service_role";



GRANT ALL ON SEQUENCE "public"."inventoryusage_usageid_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."inventoryusage_usageid_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."inventoryusage_usageid_seq" TO "service_role";



GRANT ALL ON TABLE "public"."invoice" TO "anon";
GRANT ALL ON TABLE "public"."invoice" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice" TO "service_role";



GRANT ALL ON SEQUENCE "public"."invoice_invoiceid_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."invoice_invoiceid_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."invoice_invoiceid_seq" TO "service_role";



GRANT ALL ON TABLE "public"."leaverecord" TO "anon";
GRANT ALL ON TABLE "public"."leaverecord" TO "authenticated";
GRANT ALL ON TABLE "public"."leaverecord" TO "service_role";



GRANT ALL ON SEQUENCE "public"."leaverecord_leaveid_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."leaverecord_leaveid_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."leaverecord_leaveid_seq" TO "service_role";



GRANT ALL ON TABLE "public"."mealplan" TO "anon";
GRANT ALL ON TABLE "public"."mealplan" TO "authenticated";
GRANT ALL ON TABLE "public"."mealplan" TO "service_role";



GRANT ALL ON SEQUENCE "public"."mealplan_mealplan_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."mealplan_mealplan_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."mealplan_mealplan_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."notification" TO "anon";
GRANT ALL ON TABLE "public"."notification" TO "authenticated";
GRANT ALL ON TABLE "public"."notification" TO "service_role";



GRANT ALL ON SEQUENCE "public"."notification_notification_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."notification_notification_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."notification_notification_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pet" TO "anon";
GRANT ALL ON TABLE "public"."pet" TO "authenticated";
GRANT ALL ON TABLE "public"."pet" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pet_petid_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pet_petid_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pet_petid_seq" TO "service_role";



GRANT ALL ON TABLE "public"."room" TO "anon";
GRANT ALL ON TABLE "public"."room" TO "authenticated";
GRANT ALL ON TABLE "public"."room" TO "service_role";



GRANT ALL ON SEQUENCE "public"."room_roomid_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."room_roomid_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."room_roomid_seq" TO "service_role";



GRANT ALL ON TABLE "public"."staff" TO "anon";
GRANT ALL ON TABLE "public"."staff" TO "authenticated";
GRANT ALL ON TABLE "public"."staff" TO "service_role";



GRANT ALL ON SEQUENCE "public"."staff_staffid_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."staff_staffid_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."staff_staffid_seq" TO "service_role";



GRANT ALL ON TABLE "public"."vaccinationrecord" TO "anon";
GRANT ALL ON TABLE "public"."vaccinationrecord" TO "authenticated";
GRANT ALL ON TABLE "public"."vaccinationrecord" TO "service_role";



GRANT ALL ON SEQUENCE "public"."vaccinationrecord_vaccine_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."vaccinationrecord_vaccine_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."vaccinationrecord_vaccine_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

alter table "public"."mealplan" drop constraint "mealplan_meal_period_check";

alter table "public"."mealplan" add constraint "mealplan_meal_period_check" CHECK (((meal_period)::text = ANY ((ARRAY['MORNING'::character varying, 'MIDDAY'::character varying, 'EVENING'::character varying])::text[]))) not valid;

alter table "public"."mealplan" validate constraint "mealplan_meal_period_check";


