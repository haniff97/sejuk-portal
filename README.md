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
  Attachment viewer on each order card — clicking the attachment count expands a
  panel listing each uploaded photo/video/PDF as a named link (opens in new tab)
  and the payment receipt separately, so managers can inspect job evidence without
  leaving the review queue.
- **AI Operations Query**: a chat panel in the Manager view where questions like
  "How many jobs were completed today?" or "Which technician completed the most
  jobs this week?" are answered from live order data. The model is given two
  fixed, parameterized query functions (`query_jobs`, `count_jobs_by_technician`)
  via function calling — it never sees raw SQL or has direct table access, only
  picks which pre-defined query fits the question and what parameters to use.
- **AI Workflow Supervisor**: a rule-based check (final amount ≥30% over quote, or
  a completed job with no photos) that flags orders automatically in the Manager
  view. Detection is plain business logic, the AI model's only role is
  phrasing the detected flags into a readable summary.

## Tech stack

React + TypeScript (Vite) · Tailwind CSS v4 · Supabase (Postgres + Storage) ·
Vercel (including two serverless functions for the AI modules) · Gemini API
(`gemini-3.5-flash-lite`, chosen for cost — function calling doesn't need a
larger model for this kind of structured, low-ambiguity task)

Auth is a mock role switcher (Admin/Technician/Manager), per the assessment brief,
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
- **AI query surface is deliberately narrow.** The Operations Query and Workflow
  Supervisor modules both give the model a small, fixed set of parameterized
  functions rather than any form of raw database or SQL access — matching the
  brief's explicit requirement that "the AI assistant should not rely on
  unrestricted access to the entire database." Anomaly *detection* in the
  Workflow Supervisor is plain rule-based logic (threshold checks on data already
  in Supabase); the AI's role there is limited to phrasing already-detected flags
  into a readable summary, not deciding what counts as anomalous.
  - **Optional Advanced AI Challenges**: Implemented.
  - **AI Operational Insight**: Implemented via the **Operations Query** module, allowing managers to ask natural language questions about technician performance and job statuses.
  - **Workflow Supervisor (Anomaly Detection)**: Evaluates completed jobs against rules (e.g., missing photos, price variance) and uses AI to generate concise summaries for managers.

## Assumptions

- Phone numbers are Malaysian local format (e.g. `012-345 6789`); the WhatsApp link
  builder normalizes a leading `0` to the `60` country code. International numbers
  entered with a country code already are passed through unchanged.
- One technician per order (matches the brief's single "Assigned Technician" field).
- "In Progress" status exists in the schema per the brief's state list but isn't
  actively set by any current screen — orders move directly from `Assigned` to
  `Job Done` when a technician completes them. Left in the schema/UI filters for
  forward compatibility (e.g. a future "start job" action).

## AI integration

Both AI features run as Vercel serverless functions (`/api/ai-query`, `/api/ai-supervisor`)
using the Gemini API (`gemini-3.5-flash-lite`) via the `@google/genai` v2 SDK with
function calling.

### What types of AI queries are supported

The **Operations Query** panel (Manager view) accepts free-form natural language questions
about the live order data. Supported query types:

| Question type | Example |
|---|---|
| Job lookup by technician | "What jobs did Ali complete?" |
| Job lookup by status | "Show me all in-progress orders" |
| Count by technician | "Who completed the most jobs this week?" |
| Count by status | "How many jobs are done?" |
| Time-filtered queries | "What jobs were completed today?" / "...this week?" |
| Combined filters | "How many jobs did Bala complete this week?" |

The model is constrained to two pre-defined, parameterised functions (`query_jobs`,
`count_jobs_by_technician`). It picks which function fits the question and what
parameters to pass — it has no direct database access and cannot execute arbitrary
queries. On the first turn it is forced to call a tool (`FunctionCallingConfigMode.ANY`)
before answering, so it always retrieves live data rather than guessing from training data.

The **Workflow Supervisor** does not accept queries — it runs automatically when the
Manager opens the dashboard, flags orders matching two hardcoded rules (final amount
≥30% over quoted price; completed job with zero attachments), and uses the AI only to
phrase the already-detected flags into a readable summary paragraph.

### Limitations of the AI implementation

- **No free-form SQL / open-ended queries.** The model can only call two fixed functions.
  Questions outside those (e.g. "What is the average job duration?") will return no
  useful answer because there is no matching tool.
- **50-row cap per query.** `query_jobs` limits results to 50 rows to keep response
  size manageable. High-volume datasets may return incomplete results.
- **No memory across questions.** Each question in the Operations Query panel is an
  independent API call; the model has no context of previous questions in the session.
- **No rate-limiting or cost controls.** There is no guard against repeated or expensive
  queries. In production, per-session rate limiting and cost alerts would be needed.
- **Workflow Supervisor rules are hardcoded.** The 30% price variance threshold and the
  "zero attachments" rule are fixed in code; they cannot be configured without a code
  change.
- **Supervisor re-runs on every page load.** The Workflow Supervisor calls the AI on
  every Manager dashboard load, not just when new flags appear. This makes each visit
  cost an API call even if nothing has changed.

## What's not built (and why)

- **Real authentication**: brief explicitly allows a mock role switch; implemented
  as specified via a simple unified Login Page.

## Implementation limitations

- **Permissive RLS**: Row Level Security is enabled on `orders` and `job-attachments`
  but uses `using (true)` — any authenticated or anon request can read/write all rows.
  Without a real auth layer there is no way to scope policies to a user or role.
- **No optimistic UI**: Every mutation (status change, job completion) triggers a full
  list refetch from Supabase. At low data volumes this is fine; at scale it would need
  optimistic updates and pagination.
- **WhatsApp is a deep link, not an automated send**: Requires the technician to tap a
  button; an actual automatic send needs the paid WhatsApp Business API.
- **KPI Dashboard is client-side aggregated**: Stats are computed in the browser from
  a full `orders` fetch. As order volume grows this would need server-side
  pre-aggregation (e.g. materialized views or an edge function).

## Self-assessment

**Which module was easiest?**
Module 1 (Admin order submission) — standard CRUD form over a single table. The Technician portal was also straightforward, simply listing assigned jobs and providing a form to complete them.

**Which module was hardest?**
The AI Operations Query module — specifically integrating function calling correctly with the `@google/genai` v2 SDK. The SDK's `generateContent` only accepts three top-level fields (`model`, `contents`, `config`), and all configuration (`systemInstruction`, `tools`, and `toolConfig`) must be nested inside `config`. Passing them at the top level causes them to be silently ignored with no error thrown and no TypeScript warning, which made the bug extremely difficult to diagnose. The model appeared to work (no crash) but had no tools and ignored all instructions, responding from training data instead of querying the database.

**What would you improve in a real production system?**
As detailed in the section above, I would focus heavily on true authentication/authorization (Supabase Auth + RLS), automated messaging (WhatsApp Business API), and backend performance optimisations (materialized views for KPIs and caching) to ensure it scales beyond a prototype.

**How did you use AI tools while building this project?**
Built iteratively with AI assistants (Claude, Gemini / Antigravity). I used them to scaffold each module, generate boilerplate for React/Tailwind layouts, and plan out database migrations. Specifically, they were highly useful in help me working on the UI into a modern and card-layout based design, building out the responsive Recharts-based KPI Dashboard, and help me plan writing the SQL migration to add optional payment tracking fields to the schema. Code was verified continuously with `tsc --noEmit` and `vite build` after each addition.

## Coverage vs. assessment brief

This submission covers the full scope; all three core modules plus the Manager
review flow and both optional AI challenges implemented and deployed to a live
Vercel environment. Each module is individually functional and the system works
end-to-end as a complete workflow.


## Running locally

```bash
npm install

cp .env.example .env  
 # fill in Supabase URL/anon key (both VITE_ and server-side
 # versions) and GEMINI_API_KEY
```

The core app (Modules 1–3, Manager review) runs with:

```bash
npm run dev
```

The AI modules (Operations Query, Workflow Supervisor) are Vercel serverless
functions under `/api` — plain `vite dev` doesn't run these. Use the Vercel CLI
instead:

```bash
npm install -g vercel
vercel dev
```

Requires a Supabase project with the `orders` table and `job-attachments` storage
bucket set up — see schema/policy SQL in the project notes, or ask for it again.

## Live demo

https://sejuk-portal-5bp8qk56a-haniff-hamdans-projects.vercel.app/
