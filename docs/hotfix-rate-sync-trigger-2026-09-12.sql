-- Hotfix 2026-09-12
-- Fix PL/pgSQL variable/table-alias collision in rate sync trigger.
-- Production symptom: updating rate_calendar.published failed with
-- "record \"m\" is not assigned yet".

CREATE OR REPLACE FUNCTION public.enqueue_rate_channel_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT
      c.code,
      cm.external_property_id,
      cm.external_room_id,
      cm.external_rate_plan_id
    FROM public.channel_mappings cm
    JOIN public.sales_channels c ON c.id=cm.channel_id
    WHERE cm.villa_id=NEW.villa_id
      AND cm.rate_plan_id=NEW.rate_plan_id
      AND cm.active=true
      AND c.active=true
      AND c.channel_type='ota'
  LOOP
    INSERT INTO public.channel_sync_outbox(
      booking_id,
      villa_id,
      channel_code,
      event_type,
      payload,
      status,
      next_attempt_at
    )
    VALUES(
      NULL,
      NEW.villa_id,
      rec.code,
      'rate_changed',
      jsonb_build_object(
        'source','rate_calendar',
        'rate_plan_id',NEW.rate_plan_id,
        'stay_date',NEW.stay_date,
        'base_rate',NEW.base_rate,
        'min_stay',NEW.min_stay,
        'stop_sell',NEW.stop_sell,
        'closed_to_arrival',NEW.closed_to_arrival,
        'closed_to_departure',NEW.closed_to_departure,
        'published',NEW.published
      ),
      CASE
        WHEN rec.external_property_id IS NULL OR rec.external_room_id IS NULL
          THEN 'waiting_mapping'
        ELSE 'pending'
      END,
      now()
    );
  END LOOP;

  RETURN NEW;
END
$function$;
