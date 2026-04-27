-- Notification integration schema hardening
-- Adds actor/target/metadata columns and performance indexes.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'notification_type' AND n.nspname = 'public'
  ) THEN
    ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'BOOKING_UPDATED';
    ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'BOOKING_CHECKED_OUT';
    ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'BILLING_UPDATED';
  END IF;
END $$;

ALTER TABLE public.notification
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS related_id integer,
  ADD COLUMN IF NOT EXISTS actor_staff_id integer,
  ADD COLUMN IF NOT EXISTS actor_customer_id integer,
  ADD COLUMN IF NOT EXISTS target_id integer,
  ADD COLUMN IF NOT EXISTS metadata jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT now();

UPDATE public.notification
SET
  message = COALESCE(message, body),
  related_id = COALESCE(related_id, booking_id),
  created_at = COALESCE(created_at, sent_at, now()),
  updated_at = COALESCE(updated_at, sent_at, created_at, now())
WHERE
  message IS NULL
  OR related_id IS NULL
  OR created_at IS NULL
  OR updated_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'notification_actor_staff_id_fkey'
  ) THEN
    ALTER TABLE public.notification
      ADD CONSTRAINT notification_actor_staff_id_fkey
      FOREIGN KEY (actor_staff_id) REFERENCES public.staff(staffid)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'notification_actor_customer_id_fkey'
  ) THEN
    ALTER TABLE public.notification
      ADD CONSTRAINT notification_actor_customer_id_fkey
      FOREIGN KEY (actor_customer_id) REFERENCES public.customer(customerid)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notification_staff_read_created
  ON public.notification (recipient_staff_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_type_created
  ON public.notification (type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_target_id
  ON public.notification (target_id);

CREATE INDEX IF NOT EXISTS idx_notification_metadata_gin
  ON public.notification USING GIN (metadata);
