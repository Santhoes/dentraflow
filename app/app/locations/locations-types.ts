export interface ClinicLocation {
  id: string;
  clinic_id: string;
  name: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  timezone: string | null;
  phone: string | null;
  is_primary: boolean;
  sort_order: number;
  working_hours?: Record<string, { open: string; close: string }> | null;
  accepts_insurance?: boolean;
  insurance_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type LocationFormState = {
  name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  timezone: string;
  phone: string;
  whatsapp_phone?: string;
  accepts_insurance: boolean;
  insurance_notes: string;
  working_hours: Record<string, { open: string; close: string } | null>;
  default_appointment_charge?: string;
};

export type HolidayFormState = { date: string; end_date: string; label: string };

export type HolidayItem = { id: string; holiday_date: string; end_date: string | null; label: string | null };
