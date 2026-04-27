-- Notification schema alignment for API/UI end-to-end flow
-- Adds canonical fields while preserving backward compatibility.

ALTER TABLE public.notification
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS related_id integer,
  ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT now();

-- Backfill canonical fields from legacy columns.
UPDATE public.notification
SET
  message = COALESCE(message, body),
  related_id = COALESCE(related_id, booking_id),
  created_at = COALESCE(created_at, sent_at, now()),
  updated_at = COALESCE(updated_at, sent_at, created_at, now());

CREATE INDEX IF NOT EXISTS idx_notification_recipient_created
  ON public.notification (recipient_staff_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_unread
  ON public.notification (recipient_staff_id, is_read);

CREATE INDEX IF NOT EXISTS idx_notification_type
  ON public.notification (type);

CREATE OR REPLACE FUNCTION public.set_notification_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notification_updated_at ON public.notification;
CREATE TRIGGER trg_notification_updated_at
BEFORE UPDATE ON public.notification
FOR EACH ROW
EXECUTE FUNCTION public.set_notification_updated_at();
