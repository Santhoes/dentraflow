-- Appointment service types per clinic (name + duration). Used as suggestion chips (no time in label) and for slot length.
CREATE TABLE IF NOT EXISTS public.clinic_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes > 0 AND duration_minutes <= 480),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_clinic_services_clinic_id ON public.clinic_services(clinic_id);

COMMENT ON TABLE public.clinic_services IS 'Appointment types per clinic: name (chip label) and duration_minutes (for time slots).';

-- Seed default services for clinics that have none yet
INSERT INTO public.clinic_services (clinic_id, name, duration_minutes, sort_order)
SELECT c.id, s.name, s.duration_minutes, s.sort_order
FROM public.clinics c
CROSS JOIN (
  VALUES
    ('Preventive', 30, 1),
    ('Restorative', 45, 2),
    ('Root Canal', 75, 3),
    ('Implant', 90, 4),
    ('Ortho', 30, 5),
    ('Cosmetic', 60, 6),
    ('Oral Surgery', 60, 7),
    ('Gum Care', 60, 8),
    ('Pediatric', 30, 9),
    ('Other', 45, 10)
) AS s(name, duration_minutes, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.clinic_services cs WHERE cs.clinic_id = c.id);

-- RLS: clinic members can manage their clinic's services
ALTER TABLE public.clinic_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic members can manage clinic_services"
  ON public.clinic_services
  FOR ALL
  USING (
    clinic_id IN (SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    clinic_id IN (SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid())
  );

-- Public read for embed: allow anon to read by clinic_id when used with signed embed (enforced at API layer)
CREATE POLICY "Service list readable by clinic for embed"
  ON public.clinic_services
  FOR SELECT
  USING (true);
