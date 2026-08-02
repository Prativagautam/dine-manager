# Restaurant Management System — PLAN.md

**Status:** Phase 1 scope confirmed, architecture finalized, ready to build.

**Note for anyone (or any AI tool) picking this up:** This document is the
single source of truth for scope, architecture, and decisions on this
project. Do not start implementation work that contradicts a "Resolved"
decision in Section 8 without flagging it first. If continuing this work in
a different tool (e.g. OpenCode), read this entire document before writing
any code — it contains the reasoning behind each decision, not just the
decision itself, since the reasoning is what should guide judgment calls on
unstated details.

---

## 1. Overview

**What this is:** A WordPress plugin implementing a REST-driven restaurant
management system — menu, table, reservation, and order management — built
to demonstrate system design understanding, security controls, and clean
API modeling.

**What this is NOT:** A commercial-grade POS/ordering platform. Real
products in this space (RestroPress, FoodMaster) represent years of
iteration by teams. This plan deliberately scopes down from that on
purpose, not by oversight.

---

## 2. Primary Goals & Non-Goals

Designing and exposing a REST-driven business workflow in WordPress, backed
by a correctly modeled CPT/taxonomy/meta data layer. Every feature in this
plan is evaluated against this single theme — if a feature doesn't
reinforce it, it's deprioritized or cut.

### 2.1 Goals

- Demonstrate real system design understanding: data modeling, REST API
  design, authentication/authorization, and frontend-to-backend
  integration.
- Support two order sources:
  - **Staff POS orders** (dine-in / walk-in) — created by staff for seated
    or walk-in guests.
  - **Customer self-service orders** (takeout) — created by the customer
    directly.
- Build something fully working and explainable end-to-end — depth over
  breadth.
- Reuse and reinforce patterns already learned on prior projects:
  CPT/taxonomy/meta, custom REST controllers, and role-based capabilities
  (`add_role()`).

### 2.2 Non-Goals (Explicitly out of scope for Phase 1)

- Real payment processing (Stripe/PayPal terminal hardware).
- Real-time/live-updating WebSocket/SSE infrastructure (Kitchen Display
  System).
- Multi-branch/multi-location support.
- Production-scale transaction volume handling.

---

## 3. Scope & Phased Milestones

Phase 1 — core sequenced milestones. Each milestone leaves a working
system, not a partial one:

| Milestone | Scope | Definition of Done |
|---|---|---|
| **A** | Menu Core (CPT + `menu_category` + `dietary_tag` + Meta) | CRUD tested via REST & wp-admin; at least 5 real menu items seeded across 2+ categories. |
| **B** | Tables & Grid Schema (CPT + status/capacity/section/grid coordinates) | CRUD tested; status and matrix grid coordinate updates verified via REST endpoints restricted to Staff/Admin. |
| **C** | Reservations & Conflict Engine (CPT + REST + 90-min overlap engine) | REST tested with both a successful booking and a rejected double-booking attempt (409 Conflict). |
| **D1** | Orders & Lifecycle (CPT + `order_status` + REST + Price Snapshotting) | Full order lifecycle (Pending → Delivered) tested via REST; dual ordering (POS & Customer) verified; price snapshotting tested; unavailable menu items rejected at order creation. |
| **D2** | Role Capability Enforcement (capabilities registered + `permission_callback`s wired) | Each role's access verified independently of order lifecycle: a Customer cannot access another customer's order/reservation; Staff cannot access `manage_options`-gated actions; Admin has full access. |
| **E** | Visual Floor-Plan Drag-and-Drop (`grid_x`/`grid_y`, `@dnd-kit` + Mantine) | Dragging a table updates its position optimistically in the UI; the resulting PATCH request persists `grid_x`/`grid_y` to the table CPT meta, confirmed by reloading the page and seeing the table in its new position. |

**Note:** Milestone D was split into D1 (order lifecycle) and D2 (role
capability enforcement) — these are independently testable, and bundling
them made it easy to think "D is done" when only the order flow had
actually been verified, not the permission boundaries.

### 3.1 Why Floor-Plan Drag-and-Drop is Sequenced Last

Table matrix data (`grid_x`/`grid_y`) and the DnD interaction are visually
impressive but operationally secondary. Sequencing it as the final
milestone ensures that if time runs short, what gets cut is a visual
overlay rather than a core functional requirement (like Orders or
Reservations).

---

## 4. Architecture & Technical Decisions

### 4.1 Backend Architecture

- **Framework:** WordPress plugin utilizing the singleton pattern, custom
  REST namespace (`/rms/v1`), and custom capabilities (`add_role()`).
- **Data Layer:** Custom Post Types (`menu_item`, `table`, `reservation`,
  `order`); taxonomies (`menu_category` — hierarchical, `dietary_tag` —
  flat, `order_status` — flat); meta fields per CPT.

### 4.2 Explicit Defense of Architectural Choices

**Why Orders are modeled as CPTs (tradeoff acknowledgment):**
An order is a transaction, not content. While a high-volume commercial
system would move order items to custom `$wpdb` SQL tables for indexing
and strict database normalization, choosing CPTs for this project is a
deliberate scoping and delivery tradeoff. It guarantees a fast, reliable,
end-to-end demonstrable project while utilizing built-in WP REST
controllers and metadata sanitization.

**Why `table.status` is meta but `order_status` is a taxonomy:**
The deciding test is: *does anything need to filter a REST query by this
field?* `order_status` genuinely needs query filtering (e.g.,
`GET /rms/v1/orders?order_status=preparing` for Kitchen views and
reports), which taxonomies provide natively via REST API params.
`table.status` has no equivalent need — the floor-plan canvas fetches all
tables in one payload and colors/renders them client-side.

### 4.3 Technical Strategies & Edge-Case Protection

- **Financial Integrity (Price Snapshotting):** To prevent historical
  order totals from corrupting when an Admin updates a `menu_item` price
  later, `POST /rms/v1/orders` fetches canonical prices from the
  `menu_item` meta, writes explicit snapshots (`unit_price`,
  `item_title`, `quantity`) into the order's JSON items meta array, and
  calculates `total_amount` on the server. Client-submitted prices or
  totals are strictly ignored.
- **Availability Check at Order Creation:** `POST /rms/v1/orders` checks
  `is_available` on each `menu_item` being ordered. Any unavailable item
  in the payload rejects the entire order with `409 Conflict`, before
  price snapshotting runs — partial orders are not created.
- **Reservation Overlap Logic:** Every reservation blocks its table for a
  default 90-minute window (`start_datetime` to `start_datetime + 90
  mins`). A new reservation interval `[T_start, T_end]` is rejected with
  `409 Conflict` if an existing reservation for `table_id` satisfies:
  `Existing_start < T_end AND Existing_end > T_start`.
  This uses **strict inequality** deliberately — a reservation ending
  exactly at 2:00 PM and one starting exactly at 2:00 PM do not conflict,
  allowing back-to-back bookings. (Code implementing this should carry a
  comment noting this is intentional, not a bug.)
- **Capacity Validation:** `POST /rms/v1/reservations` rejects with `422
  Unprocessable Entity` if `party_size` exceeds the `capacity` meta of the
  requested `table_id`. This is enforced server-side, not just as a UI
  hint.
- **Grid-Based Floor Plan Math:** To prevent responsive layout breakages
  across different screen sizes, floor-plan coordinates are stored as
  discrete matrix values (`grid_x ∈ [0..11]`, `grid_y ∈ [0..11]`) rather
  than fixed pixel dimensions. Mantine UI renders the canvas using
  responsive CSS Grid calculations (`calc(100% / 12)`).

### 4.4 Security, Validation & Data Integrity

- **Authentication:** All protected REST endpoints use standard WordPress
  cookie authentication with a nonce (`X-WP-Nonce`). Both the Staff POS
  app and the Customer self-service app are enqueued and served from
  within WordPress itself (not a separately-deployed/headless frontend),
  so nonce-based cookie auth is sufficient and is the WordPress-recommended
  approach for this architecture. Application Passwords/JWT are
  deliberately not used in Phase 1 — they solve a cross-origin problem
  this plugin doesn't have; revisit only if a fully headless frontend is
  ever introduced. Note the nonce and the cookie protect against two
  different threats: the nonce prevents CSRF (a forged request from
  another site), while the auth cookie itself is set `HttpOnly` by
  WordPress core by default — meaning it cannot be read by JavaScript
  even if an XSS vulnerability exists elsewhere on the page. No extra
  code is needed for this; it's WordPress's default cookie behavior, but
  it's worth stating explicitly here since it's the piece that protects
  session data specifically, as distinct from what the nonce protects.
- **Authorization & Capability Enforcement:** Every custom REST endpoint
  registers explicit `permission_callback` functions checking custom
  capabilities (see Section 6, Capabilities). Access is rejected with
  `401 Unauthorized` or `403 Forbidden` if permissions are missing.
- **REST Request Validation:** Incoming payloads are validated against
  REST schema definitions registered in `args` (`type`, `required`,
  `validate_callback`). Malformed or out-of-range parameters (e.g.,
  `grid_x > 11` or invalid date strings) are rejected before controller
  logic executes.
- **Sanitization:** All raw inputs pass through strict WordPress
  sanitization utilities (`sanitize_text_field()`, `absint()`,
  `rest_sanitize_boolean()`) prior to post creation or metadata storage.
- **Escaping:** All backend data output to HTML or XML contexts is safely
  escaped (`esc_html()`, `esc_attr()`, `wp_json_encode()`).
- **Server-Side Financial Integrity:** All calculations for
  `total_amount` occur strictly on the backend. Pricing data submitted
  directly in client requests is ignored, preventing client-side price
  tampering.
- **Reservation Conflict Enforcement:** Overlap checks run inside
  database transactions or strict date-time queries to guarantee zero
  double-bookings under concurrent booking attempts.
- **Data Ownership Rules:** Customers can read and create only their own
  reservations and orders (`customer_id === current_user_id`, checked
  against the `customer_id` meta field stored on both the `reservation`
  and `order` CPTs — see Section 5.1). Staff and Admin roles hold global
  read/update access across all records.
- **Timezone Handling (open, must resolve before Milestone C):** All
  `start_datetime`/`end_datetime` values are stored in the database as
  UTC. The REST API accepts and returns ISO 8601 datetime strings with
  explicit UTC offsets. Conversion to the site's local timezone
  (`wp_timezone()`) for display happens client-side only. This avoids the
  overlap-conflict math silently breaking when the WordPress site
  timezone and a customer's browser timezone disagree.

### 4.5 Plugin Lifecycle

- **Activation:** Register CPTs/taxonomies, register custom roles and
  capabilities (Section 6), then call `flush_rewrite_rules()`.
- **Deactivation:** Remove custom capabilities from roles and
  `flush_rewrite_rules()` again. CPT content itself is **not** deleted on
  deactivation (only on uninstall, if ever implemented) — deactivation
  should be safely reversible.

### 4.6 Testing Strategy

- Milestones A, B, D1, D2, E: verified manually via REST client (Postman
  or equivalent) plus wp-admin, per each milestone's Definition of Done.
- Milestone C (Reservation Overlap Engine) is the single most complex
  piece of business logic in this plugin and the one most likely to have
  a subtle bug (timezone edge cases, boundary conditions on the strict
  inequality). It gets a **PHPUnit test** covering: a non-overlapping
  booking (succeeds), an exactly-adjacent booking (succeeds, per the
  strict-inequality decision above), and an overlapping booking (rejected
  with 409). This is the one place automated testing is required rather
  than optional for Phase 1.

---

## 5. Data Model & Role Matrix

### 5.1 Custom Post Types & Meta Fields

| CPT | Meta Fields | Taxonomies |
|---|---|---|
| `menu_item` | `price`, `prep_time_minutes`, `is_available` | `menu_category` (Hierarchical), `dietary_tag` (Flat) |
| `table` | `capacity`, `section`, `status` (Available/Occupied/Reserved), `grid_x`, `grid_y` | — |
| `reservation` | `table_id`, `customer_id`, `party_size`, `start_datetime`, `end_datetime`, `contact_name`, `contact_phone` | — |
| `order` | `order_type` (dine_in/takeout), `order_source` (staff_pos/customer_portal), `items` (JSON snapshot array), `total_amount`, `table_id`, `customer_id`, `created_by` | `order_status` (Flat: Pending, Confirmed, Preparing, Ready, Delivered, Cancelled) |

`reservation.customer_id` was added to match the Data Ownership Rule in
Section 4.4 — without it, the ownership check for reservations has nothing
to check against.

### 5.2 Storage Decision Matrix

| Entity | Storage Type |
|---|---|
| Menu Item | CPT (`menu_item`) |
| Menu Category | Taxonomy (`menu_category`) |
| Dietary Tag | Taxonomy (`dietary_tag`) |
| Table | CPT (`table`) |
| Reservation | CPT (`reservation`) |
| Order | CPT (`order`) |
| Order Status | Taxonomy (`order_status`) |

### 5.3 Roles & Operational Scope

| Role | Operational Scope |
|---|---|
| **Customer** | Self-registers. Can browse menu, book reservations for themselves, and place online takeout orders. Restricted from viewing internal staff tools or other users' data. |
| **Staff** | Internal employees. Full access to Staff POS: place orders for walk-ins/seated tables, manage floor-plan table states, update order workflow statuses (Pending → Delivered), and verify reservations. |
| **Admin** | Unrestricted system control (menu CPT CRUD, price edits, role capability setup, analytics/reports). |

---

## 6. Capabilities

A flat `create_`/`manage_` scheme, deliberately simpler than WordPress's
`edit_`/`edit_others_` meta-capability convention. The `edit_others_`
pattern only pays off when `map_meta_cap()` can auto-resolve ownership by
checking a post's `post_author` — but this plugin's ownership field is
`customer_id` (a separate meta field, not `post_author`), since a Staff
POS order's author (`created_by`) and its owning customer (`customer_id`)
are deliberately different people. That means WordPress's automatic
ownership resolution never actually applies to these CPTs — ownership
still has to be checked manually in every `permission_callback` either
way (see Data Ownership Rules, §4.4). Given that, the flat scheme achieves
the same access control with less to implement.

**Customer**
- `create_rms_orders` — create their own orders (`customer_portal` only)
- `create_rms_reservations` — create their own reservations

**Staff**
- `manage_rms_orders` — full CRUD across all orders (POS creation +
  status transitions)
- `manage_rms_reservations` — full CRUD across all reservations
- `manage_rms_tables` — floor-plan/table CRUD

**Admin**
- `manage_options` — WP core, site-wide admin (role/capability setup,
  plugin settings)
- `manage_rms_menu_items` — menu CRUD, price edits (Admin-only; Staff has
  no menu access per §5.3)
- `manage_rms_orders`, `manage_rms_reservations`, `manage_rms_tables` —
  Admin is a superset of Staff's operational capabilities, plus menu
  control

Note: Gutenberg block insertion (e.g. a future "Table Layout" display
block) is governed by WordPress core's own content-editing capabilities,
not by any RMS-specific capability above — blocks are read-only display
content, not gated the same way the REST API is.

---

## 7. REST API Endpoints (Phase 1 Draft)

| Method | Endpoint | Access Control | Description |
|---|---|---|---|
| GET | `/rms/v1/menu-items` | Public | List menu items (filterable by category, dietary tag). |
| GET | `/rms/v1/reservations` | Authenticated | List reservations — Customer sees only their own (filtered by `customer_id`); Staff/Admin see all. |
| GET | `/rms/v1/reservations/<id>` | Authenticated | Fetch a single reservation. `403` if requester is a Customer and `customer_id !== current_user_id`. |
| POST | `/rms/v1/reservations` | Authenticated | Create a reservation (runs 90-min overlap check + capacity check). |
| GET | `/rms/v1/orders` | Authenticated | List orders — Customer sees only their own (filtered by `customer_id`); Staff/Admin see all. |
| GET | `/rms/v1/orders/<id>` | Authenticated | Fetch a single order. `403` if requester is a Customer and `customer_id !== current_user_id`. |
| POST | `/rms/v1/orders` | Authenticated | Create orders (Customer self-service or Staff POS payload) with price snapshotting and availability check. |
| PATCH | `/rms/v1/orders/<id>` | Staff / Admin | Transition order status (`order_status` taxonomy terms). |
| GET / PATCH | `/rms/v1/tables` | Staff / Admin | Fetch table states or update status and `grid_x`/`grid_y` coordinates. |

**Example — `POST /rms/v1/orders` (Customer self-service, takeout):**

```json
{
  "order_type": "takeout",
  "order_source": "customer_portal",
  "items": [
    { "menu_item_id": 42, "quantity": 2 },
    { "menu_item_id": 57, "quantity": 1 }
  ]
}
```

Note: no price data is sent by the client — `unit_price`, `item_title`,
and `total_amount` are all resolved server-side from canonical
`menu_item` meta.

**Revenue definition:** revenue reporting (Phase 2) counts `total_amount`
from orders with `order_status = Delivered` only.

---

## 8. Frontend Stack & Architecture

- **Framework:** React + TypeScript.
- **UI & Components:** Mantine UI (Theming, forms, modal dialogs).
- **Drag-and-Drop:** `@dnd-kit` (paired with Mantine for 2D floor-plan
  grid dragging — Mantine has no built-in DnD).
- **Component Organization:** A pragmatic **two-tier** split rather than
  strict five-tier Atomic Design:
  - `shared/components/` — generic, reusable, business-agnostic UI
    (buttons, inputs, badges, labeled fields). The test: would this
    component still make sense, unchanged, in a completely unrelated app?
    If yes, it belongs here.
  - `modules/<domain>/components/` — anything that bakes in knowledge of
    this specific business (e.g. a `TableGridCell` that knows about
    `table.status`, a `ReservationForm` that knows about `party_size`).
    No further subdivision into atoms/molecules/organisms — the strict
    three-tier naming is useful as a *mental test* for deciding shared vs.
    module-specific, but isn't worth the folder/labeling overhead on a
    project this size.

### 8.1 Project Structure

**Note (updated after Milestone A):** the backend structure below was
originally planned as nested per-domain folders (`includes/Menu/`,
`includes/Tables/`, etc.). What's actually implemented, matching this
boilerplate's real convention (same pattern as the mock-exam-engine
project), is a **flat `includes/` directory** — one file per concern
(`class-post-types.php` handles all CPTs/taxonomies/meta across every
domain in one file with separate methods per domain, `class-roles.php`
for capabilities, `class-menu-rest-controller.php` per REST controller).
The structure below is corrected to match what's actually built.

**Backend (WordPress / PHP)**
```
restaurant-management-system/
│
├── restaurant-management-system.php
│
├── includes/
│   ├── class-loader.php          (boilerplate — orchestrates hooks)
│   ├── class-i18n.php            (boilerplate)
│   ├── class-include.php         (boilerplate — shared init/admin+public hooks)
│   ├── class-activator.php       (calls Roles::add_roles_and_capabilities() on activation)
│   ├── class-deactivator.php     (calls Roles::remove_roles_and_capabilities() on deactivation)
│   ├── class-roles.php           (RMS custom roles + capabilities, PLAN.md §6)
│   ├── class-post-types.php      (ALL CPTs/taxonomies/meta — one file, one method
│   │                               per domain: register_menu_item_post_type(),
│   │                               register_table_post_type(), etc. as each
│   │                               milestone adds its domain)
│   ├── class-menu-rest-controller.php       (Milestone A: GET /rms/v1/menu-items)
│   ├── class-table-rest-controller.php      (Milestone B, not yet built)
│   ├── class-reservation-rest-controller.php (Milestone C, not yet built)
│   ├── class-order-rest-controller.php      (Milestone D1, not yet built)
│   ├── functions.php
│   └── api/
│
├── admin/
│   └── class-admin.php           (enqueues build/admin/index.js + fonts)
├── public/
│   └── class-public.php          (enqueues build/public/index.js)
│
├── src/
│   ├── admin/                    (Staff/Admin console React app — routes.js,
│   │                               theme.ts, screens)
│   └── public/                   (Customer-facing React app)
└── build/                        (compiled output, gitignored)
```

**Frontend (React + TypeScript)** — unchanged from original plan; not yet
built out beyond the boilerplate scaffold (`src/admin/routes.js`,
`theme.ts`). The `modules/`/`shared/` split below is still the target
structure for when actual screen components are built:
```
src/admin/
│
├── modules/
│   │
│   ├── menu/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── services/
│   │   └── types.ts
│   │
│   ├── tables/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── services/
│   │   └── types.ts
│   │
│   ├── reservations/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── services/
│   │   └── types.ts
│   │
│   └── orders/
│       ├── pages/
│       ├── components/
│       ├── services/
│       └── types.ts
│
├── shared/
│   ├── api/
│   │   ├── client.ts
│   │   ├── endpoints.ts
│   │   └── types.ts
│   ├── components/
│   ├── hooks/
│   └── utils/
│
├── routes.js       (entry point — MantineProvider + theme.ts wired in)
└── theme.ts         (Mantine theme, generated from DESIGN.md)
```

**React ↔ WordPress Data Flow**
```
React Page
    ↓
Feature Service
    ↓
REST Endpoint (/rms/v1/*)
    ↓
REST Controller
    ↓
CPT / Taxonomy / Meta
    ↓
JSON Response
    ↓
React UI
```

This architecture keeps each module self-contained and aligns directly
with the milestone structure:
Milestone A → Menu · Milestone B → Tables · Milestone C → Reservations ·
Milestone D1/D2 → Orders · Milestone E → Floor Plan (Tables module)

---

## 9. Decisions Log & Resolved Architectural Points

- **Data Layer:** CPT-based data layer chosen to ensure rapid, complete
  delivery of all business requirements within project scope (full
  reasoning: Section 4.2).
- **Ordering Model:** Unified dual-order model supporting both Customer
  Self-Service and In-House Staff POS orders through an `order_source`
  flag and server-side price snapshotting.
- **Floor Plan Coordinates:** Discrete 12×12 matrix coordinates (`grid_x`,
  `grid_y`) chosen over raw pixels to maintain responsive grid rendering
  across devices.
- **Reservation Logic:** Explicit 90-minute lockout window enforced
  server-side via strict timestamp intersection (full reasoning: Section
  4.3).
- **Auth Mechanism:** Nonce-based cookie authentication for both Staff POS
  and Customer apps, since both are served from within WordPress itself
  (full reasoning: Section 4.4).
- **Capability Naming:** Flat `create_`/`manage_` scheme (NOT
  `edit_`/`edit_others_`) — the meta-capability convention was rejected
  because ownership lives in a separate `customer_id` meta field, not
  `post_author`, so WordPress's automatic ownership resolution never
  actually applied here; the flat scheme achieves the same access control
  with less to implement (full reasoning: Section 6).
- **Component Organization:** Two-tier `shared/` vs. `modules/*/`
  structure over strict five-tier Atomic Design, for a project of this
  size (full reasoning: Section 8).