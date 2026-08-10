# Sejuk Sejuk Service — Operations System (Assessment Submission)

A simplified internal operations system for an aircon installation/servicing/repair
company, built for the Programmer Assessment brief. Covers the full order lifecycle
across three roles: Admin creates and assigns orders, Technicians complete jobs in the
field, Managers review and close them out.

## What was built

- **Module 1 — Admin Portal**: order submission form (auto-generated Order No, customer
  details, service type, quoted price, technician assignment), post-submit order
  summary, live order list.
- **Module 2 — Technician Portal**: mobile-first job list (grouped To Do / Completed),
  job completion form with auto-calculated final amount (quoted + extra charges) and
  photo/video/PDF upload (up to 6 files) to Supabase Storage.
- **Module 3 — WhatsApp Notification Trigger**: fires when a job is marked `Job Done`.
  Generates a `wa.me` deep link pre-filled with the customer's name, order ID,
  technician, and completion time, surfaced as a button both immediately after
  completion and on any completed job in the technician's list.
- **Manager review flow** (ties the above together): review queue for `Job Done`
  orders → `Reviewed` → `Closed`, plus a read-only view of in-progress orders.

## Tech stack

React + TypeScript (Vite) · Tailwind CSS v4 · Supabase (Postgres + Storage) · Vercel

Auth is a mock role switcher (Admin/Technician/Manager), per the assessment brief —
no real authentication implemented.

## Architecture decisions

- **Status as the single source of truth for role transitions.** Every screen filters
  and acts on the `orders.status` enum (`New → Assigned → In Progress → Job Done →
  Reviewed → Closed`) rather than tracking role-specific state separately, so the three
  portals stay in sync through one shared table.
- **Assignment happens at order creation**, not as a separate step — the brief's
  Admin form already asks for "Assigned Technician," so an order is created directly
  in `Assigned` status rather than `New`. This was a deliberate simplification; a
  production version would likely separate "order intake" from "technician
  assignment" as two admin actions.
- **WhatsApp as a manual-trigger deep link, not an automated send.** A real automatic
  send requires the paid WhatsApp Business API; a `wa.me` link opened by the technician
  is the correct scope for this assessment and still satisfies the trigger condition
  (`status = Job Done`) and message template from the brief.
- **Final amount is always auto-calculated** (`quoted_price + extra_charges`) rather
  than technician-entered, to avoid data entry errors feeding into the Manager's
  review numbers.
- **Row Level Security is enabled but permissive** (`using (true)`) for both the
  `orders` table and the `job-attachments` storage bucket, since there's no real auth
  layer to scope policies to. In production this would be tightened to
  role/user-scoped policies once real authentication exists.

## Assumptions

- Phone numbers are Malaysian local format (e.g. `012-345 6789`); the WhatsApp link
  builder normalizes a leading `0` to the `60` country code. International numbers
  entered with a country code already are passed through unchanged.
- One technician per order (matches the brief's single "Assigned Technician" field).
- "In Progress" status exists in the schema per the brief's state list but isn't
  actively set by any current screen — orders move directly from `Assigned` to
  `Job Done` when a technician completes them. Left in the schema/UI filters for
  forward compatibility (e.g. a future "start job" action).

## What's not built (and why)

- **AI Operations Query module**: intentionally deferred. Priority was a fully working
  core workflow across all three roles rather than a partially working core plus a
  rushed AI feature. [Update this section if Phase 7 gets built before submission.]
- **KPI dashboard (bonus)**: same reasoning — out of scope for the time available.
- **Real authentication**: brief explicitly allows a mock role switch; implemented as
  specified.
- **Advanced AI challenges** (document understanding, operational insight): not
  attempted.

## What I'd improve for a real production system

- Real authentication (Supabase Auth) with role-scoped RLS policies instead of the
  current permissive `using (true)` policies.
- Separate "order intake" and "technician assignment" as distinct admin actions,
  rather than assigning at creation time.
- WhatsApp Business API integration for automatic sends instead of a manual deep-link
  button, plus delivery status tracking.
- Audit trail table for status transitions (who changed what, when) — the brief calls
  out that "key actions should be traceable," which the current schema doesn't
  fully capture beyond `updated_at`.
- Optimistic UI updates and proper loading/error states throughout, rather than
  full-list refetches after each mutation.

## Self-assessment

- **Easiest module**: Module 1 (Admin order submission) — standard CRUD form over a
  single table.
- **Hardest module**: Module 3 (WhatsApp trigger) — not technically complex, but
  required the most judgment calls about scope (manual vs. automated send, phone
  number normalization) given no real WhatsApp Business API access.
- **AI tool use while building**: built iteratively with Claude — scaffolding each
  module, then verifying with `tsc --noEmit` and `vite build` after each addition
  before moving on.

## Running locally

```bash
npm install
cp .env
npm run dev
```

Requires a Supabase project with the `orders` table and `job-attachments` storage
bucket set up — see schema/policy SQL in the project notes, or ask for it again.

## Live demo

