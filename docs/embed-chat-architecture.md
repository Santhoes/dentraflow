# Embed Chat Widget — Architecture & Data Flow

## Overview

The embed chat widget lets patients book, change, or cancel appointments and view clinic info via a widget embedded on a clinic’s site. All access is scoped by **clinic slug + signature**; the signature is derived server-side and must be present for any embed API or public clinic fetch.

## Frontend Components

| File | Role |
|------|------|
| `components/embed/EmbedChatClient.tsx` | Loads clinic config from `/api/public/clinic?slug=&sig=&location=&agent=`, then renders `DentalChat`. |
| `components/embed/DentalChat.tsx` | UI shell: header, messages, policy agreement checkbox (when required), suggestion chips, input. Uses `useDentalAgent`. |
| `components/embed/useDentalAgent.ts` | State machine and business logic: states, transitions, API calls (slots, verify-patient, confirm-booking, modify-cancel). |
| `components/embed/ChatMessages.tsx` | Renders message list; message text is rendered as React children (escaped by default). |
| `components/embed/ChatInput.tsx` | Text input and send. |
| `components/embed/SuggestionChips.tsx` | Chip buttons for suggestions. |
| `components/embed/ChatHeader.tsx` | Header with clinic name, logo, dark toggle. |

Other embed UI variants (e.g. `EmbedChat.tsx`, `ChatWidget.tsx`) may call `/api/embed/chat` for server-driven flows; the primary widget path is EmbedChatClient → DentalChat → useDentalAgent with direct calls to slots, verify-patient, confirm-booking, modify-cancel.

## State Machine (useDentalAgent)

- **GREETING** → Book, Change/Cancel, Clinic Info, Emergency.
- **BOOKING_REASON** → Service chips → **BOOKING_DATE** (working days) → **BOOKING_PERIOD** (Morning/Afternoon/Evening) → **BOOKING_TIME** (slot chips) → **PATIENT_DETAILS** (name, then email) → **POLICY_AGREEMENT** (if required) → Confirm → **BOOKING_SUCCESS**.
- **VERIFY_ACCOUNT** → Patient enters email → verify-patient API → **MANAGE_BOOKING** (reschedule/cancel) or back to GREETING.
- **CLINIC_INFO** / **EMERGENCY** → Static info or “call clinic”.
- **MANAGE_BOOKING** → modify-cancel API for cancel or reschedule.

User input enters via free text (onSend) and chip clicks (onChipSelect). Patient name/email/phone are validated in the hook and again on the server.

## Backend APIs

| Endpoint | Method | Purpose | Auth | Rate limit |
|----------|--------|---------|------|------------|
| `/api/public/clinic` | GET | Clinic config for widget (name, hours, services, deposit_required, etc.) | `slug` + `sig` query | — |
| `/api/embed/slots` | GET | Next slots or slots for a date | `clinicSlug` + `sig` query | 30/min per IP |
| `/api/embed/verify-patient` | POST | Find patient by email/phone, return upcoming appointments | Body: `clinicSlug`, `sig`, `patient_email` or `patient_whatsapp` | 30/min per IP |
| `/api/embed/confirm-booking` | POST | Create appointment (name, email, phone, slot, optional policy_accepted_at) | Body: `clinicSlug`, `sig` | 30/min per IP |
| `/api/embed/modify-cancel` | POST | Cancel or reschedule (action, patient_email/phone, new_start_time/new_end_time for modify) | Body: `clinicSlug`, `sig` | 30/min per IP |
| `/api/embed/chat` | POST | Server-driven chat (optional path; some entry points use it) | Body includes `clinicSlug`, `sig` | — |
| `/api/app/embed-url` | GET | Returns signed embed URL + iframe snippet; for logged-in clinic staff only | Bearer token | — |

All embed APIs that mutate or return clinic/patient data validate `verifyClinicSignature(clinicSlug, sig)` and use `createAdminClient()` server-side. Rate limiting uses `embed_api_ip_rate` (per-IP hash, per-minute bucket, 30 requests/min).

## Shared Utilities

- **lib/embed-validate.ts**: `isValidChatEmail`, `isValidChatPhone` (format, length, disposable-email blocklist). Used in useDentalAgent and in verify-patient, confirm-booking, modify-cancel.
- **lib/embed-time-validate.ts**: `validateAppointmentTimes` (ISO, future, duration 15–120 min, within 90 days). Used in confirm-booking and modify-cancel.
- **lib/embed-api-rate-limit.ts**: `checkEmbedApiRateLimit(ip)`, `getClientIp(request)`. Used by slots, verify-patient, confirm-booking, modify-cancel.
- **lib/chat-signature.ts**: `signClinicSlug(slug)`, `verifyClinicSignature(slug, sig)` (HMAC-SHA256 with `CHAT_PROTECTION_SECRET`). Used by all embed and public clinic routes.

## Database / Migrations

- **embed_api_ip_rate**: Table for per-IP, per-minute request counts; RLS denies all direct access (service role only). Migrations: `20250237000000_embed_api_ip_rate.sql`, `20250234000000_embed_chat_ip_rate.sql`, `20250231000000_embed_chat_daily_usage.sql` (if present).

## Data Flow Summary

1. Clinic staff get embed URL (and sig) from App (e.g. Locations → embed or `/api/app/embed-url`).
2. Patient opens widget URL (e.g. `/embed?slug=...&sig=...`). EmbedChatClient fetches `/api/public/clinic` with slug+sig.
3. If valid, widget loads clinic info and useDentalAgent drives the flow. Slots come from GET `/api/embed/slots`; booking from POST `/api/embed/confirm-booking`; verify from POST `/api/embed/verify-patient`; cancel/reschedule from POST `/api/embed/modify-cancel`.
4. All requests include slug+sig; server validates signature and clinic ownership before returning or mutating data.

## PII and logging

- **Collected PII**: Patient name, email, phone (optional), and appointment metadata (start/end times, reason) are collected in the booking and manage-booking flows and stored in `patients` and `appointments`. Clinic-provided data (e.g. cancellation policy text, clinic name) is shown in the widget and may be stored.
- **Logging**: Embed API routes do not log PII. Error handlers log only generic messages (e.g. `(e as Error)?.message ?? "Unknown"`) to avoid leaking request/response or PII into server logs. The chat widget frontend does not log to console in production paths.
- **Policies**: Flows align with the documented Privacy, Cancellation, and Refund policies: patients see cancellation/refund wording where required; refund notifications are sent only when the clinic marks an appointment as refunded; no sensitive data is exposed without a valid signature.

## Security model

- **Authentication**: Embed and public clinic access use **slug + signature** only. The signature is an HMAC-SHA256 of the slug with `CHAT_PROTECTION_SECRET`. Without the secret, an attacker cannot forge a valid sig for another clinic’s slug. The widget never receives the secret; it only receives the pre-signed URL from the clinic (e.g. via `/api/app/embed-url` for staff).
- **Authorization**: Every embed API resolves the clinic by slug (after verifying sig), then scopes all DB reads/writes by `clinic_id`. Cross-clinic access is prevented by application logic. Supabase is called with the admin (service role) client server-side only; RLS is not relied on for embed APIs (table `embed_api_ip_rate` is service-role-only by policy).
- **Input validation**: All patient-supplied inputs (email, phone, name, start/end times) are validated server-side: email/phone via `lib/embed-validate`, times via `lib/embed-time-validate`. Name length is capped (e.g. 200 chars) in confirm-booking. Invalid input returns 400 with a safe message.
- **XSS**: Message and policy text are rendered as React text (no `dangerouslySetInnerHTML` in the embed UI). Clinic logo URL is sanitized in the client to allow only `http(s):` before use in `<img src>`.
- **Rate limiting**: Per-IP limits (30/min for slots, verify-patient, confirm-booking, modify-cancel) reduce abuse. The `/api/embed/chat` route uses a separate chat rate limit. Rate-limit responses are generic (e.g. “Too many requests”) and do not leak data.

## Extension guidelines

- **Adding a new embed API**: Require `clinicSlug` and `sig` in the request; call `verifyClinicSignature(clinicSlug, sig)` before any clinic/patient access; use `createAdminClient()` for DB; apply `checkEmbedApiRateLimit(getClientIp(request))` if the endpoint is user-driven; validate and sanitize all inputs; return JSON with safe, user-facing error messages (no stack traces or internal IDs).
- **Adding a new state or flow in the widget**: Extend the state type and transitions in `useDentalAgent`; keep validation in sync with the server (e.g. use the same `embed-validate` and `embed-time-validate` helpers); ensure error paths show a clear message and a way to retry or go back; do not render unsanitized user or clinic content as HTML.
- **Changing signature or rate limits**: Coordinate with any external embed URLs or scripts; document the new limits or secret rotation in this doc or in env comments.
