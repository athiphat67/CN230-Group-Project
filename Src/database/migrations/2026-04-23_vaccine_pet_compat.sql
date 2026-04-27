-- Vaccine and Pet compatibility migration
-- Purpose:
-- 1) Ensure vaccine CRUD table/columns exist for backend pets routes
-- 2) Keep legacy "vaccine" table data readable by migrating into "vaccinationrecord"
-- 3) Add missing pet profile columns used by frontend/backend payloads

BEGIN;

-- Pet columns expected by routes/pets.py
ALTER TABLE pet ADD COLUMN IF NOT EXISTS sex CHAR(1);
ALTER TABLE pet ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE pet ADD COLUMN IF NOT EXISTS coat_color VARCHAR(80);
ALTER TABLE pet ADD COLUMN IF NOT EXISTS behavior_notes TEXT;

-- Canonical vaccine table expected by current backend routes
CREATE TABLE IF NOT EXISTS vaccinationrecord (
    vaccine_id         SERIAL PRIMARY KEY,
    pet_id             INT NOT NULL REFERENCES pet(petid) ON DELETE CASCADE,
    vaccine_name       VARCHAR(120) NOT NULL,
    administered_date  DATE NOT NULL,
    expiry_date        DATE NOT NULL,
    vet_clinic         VARCHAR(255),
    CONSTRAINT chk_vaccine_dates CHECK (expiry_date >= administered_date)
);

-- Migrate legacy data from table "vaccine" if present
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'vaccine'
    ) THEN
        INSERT INTO vaccinationrecord (pet_id, vaccine_name, administered_date, expiry_date, vet_clinic)
        SELECT
            v.petid,
            v.vaccinename,
            v.administereddate,
            v.expirydate,
            v.vetclinic
        FROM vaccine v
        WHERE NOT EXISTS (
            SELECT 1
            FROM vaccinationrecord vr
            WHERE vr.pet_id = v.petid
              AND vr.vaccine_name = v.vaccinename
              AND vr.administered_date = v.administereddate
              AND vr.expiry_date = v.expirydate
              AND COALESCE(vr.vet_clinic, '') = COALESCE(v.vetclinic, '')
        );
    END IF;
END $$;

COMMIT;
