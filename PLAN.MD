# Restaurant Management System — PLAN.md

**Status:** Phase 1 core milestones (A–E) complete. Milestone F (Customer
Portal) scoped retroactively below — built ahead of being planned, and
requires a corrective pass to bring it into architectural compliance
before further work continues on it.

**Note for anyone (or any AI tool) picking this up:** This document is the
single source of truth for scope, architecture, and decisions on this
project. Do not start implementation work that contradicts a "Resolved"
decision in Section 9 without flagging it first. If continuing this work in
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
- **One frontend stack, applied consistently.** Section 8's React +
  TypeScript decision applies to *every* customer-facing and staff-facing
  screen in this plugin — there is no "lightweight vanilla JS for public
  pages" exception. See §3.2 for why this is being stated explicitly now.

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
| **D3** | Table-Status Automation (`table.status` auto-derived from active dine-in orders) | Creating a dine-in order sets its table to `Occupied`; the order reaching `Delivered`/`Cancelled` re-checks and, if no other active dine-in order remains for that table, sets it back to `Available`. Manual `Out of Service` override is never silently overwritten by this automation. |
| **E** | Visual Floor-Plan Drag-and-Drop (`grid_x`/`grid_y`, `@dnd-kit` + Mantine) | Dragging a table updates its position optimistically in the UI; the resulting PATCH request persists `grid_x`/`grid_y` to the table CPT meta, confirmed by reloading the page and seeing the table in its new position. |
| **F** | Customer Portal — React + TypeScript (order + reservation self-service, rebuilt to comply with §8) | Public shortcodes render React root containers; `order` and `reservation` features are React components under `src/public/modules/`, sharing the `shared/api` client pattern established in the admin app; the current vanilla-JS implementation (`src/public/features/*.js`) is retired once parity is confirmed. |

**Note:** Milestone D was split into D1 (order lifecycle) and D2 (role
capability enforcement) — these are independently testable, and bundling
them made it easy to think "D is done" when only the order flow had
actually been verified, not the permission boundaries. D3 was added after
D1/D2 once it became clear table state needed to be a derived, automated
value rather than something staff set by hand for every order event (full
reasoning: §4.3).

### 3.1 Why Floor-Plan Drag-and-Drop is Sequenced Last

Table matrix data (`grid_x`/`grid_y`) and the DnD interaction are visually
impressive but operationally secondary. Sequencing it as the final
milestone ensures that if time runs short, what gets cut is a visual
overlay rather than a core functional requirement (like Orders or
Reservations).

### 3.2 Why Milestone F Exists Retroactively, and Why It's Strictly React+TS

The Customer Portal (public shortcodes, order form, reservation form) was
implemented before this plan was updated to include it — it exists in the
codebase but was never scoped here, and Section 8 already stated "React +
TypeScript" as the frontend decision for the whole plugin. What actually
got built (`src/public/features/order.js`, `reservation.js`) is plain
vanilla JavaScript: `innerHTML` template strings, manual `querySelector`
wiring, and a `Map` used as ad-hoc state — none of it shares the
component/hook/type-safety patterns the Staff/Admin app (`src/admin/`)
already established.

This is being logged, not silently left in place, per this document's own
rule about flagging contradictions to Resolved decisions (see header
note). The decision, reaffirmed here explicitly: **the frontend stack is
React + TypeScript, with no exception for public-facing pages.** A
lightweight-bundle argument for vanilla JS was considered and rejected —
consistency of pattern (one mental model across the whole plugin,
reusable `shared/` components and API client, type safety on REST
payloads) outweighs the marginal bundle-size savings for a project at
this scope. Milestone F's Definition of Done is specifically the
corrective rebuild, not new functionality — the vanilla-JS version stays
in place only until parity is confirmed, then is deleted rather than kept
as a second, permanent pattern.

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

**Why `table.status` values are `Available`/`Occupied`/`Out of Service`
(revised from the original `Available`/`Occupied`/`Reserved`):**
`Reserved` was dropped because it implied table status should reflect
*future* bookings, which conflicts with a cleaner single-source-of-truth
rule established during Milestone D3: table status represents the
table's *current* physical state only, derived automatically from
whether an active (non-`Delivered`/non-`Cancelled`) dine-in order exists
for it. Future-booking availability is answered separately, on read,
from `reservation.start_datetime`/`end_datetime` plus the existing
overlap-check logic (§4.3) — never by mutating `table.status` ahead of
time. `Out of Service` was added as the one value the automation
deliberately never writes, reserved for manual staff use (e.g. a broken
chair, a table being cleaned) — `sync_table_status()` checks for this
value first and returns early if set, so order events can never silently
overwrite a manual override.

### 4.3 Technical Strategies & Edge-Case Protection

- **Financial Integrity (Price Snapshotting):** To prevent historical
  order totals from corrupting when an Admin updates a `menu_item` price
  later, `POST /rms/v1/orders` fetches canonical prices from the
  `menu_item` meta, writes explicit snapshots (`unit_price`,
  `item_title`, `quantity`) into the order's JSON items meta array, and
  calculates `total_amount` on the server. Client-submitted prices or
  totals are strictly ignored. This immutability is deliberately
  preserved even as dine-in order flows evolve — an "append items to an
  active order" feature has been discussed and deferred rather than
  implemented, specifically so it doesn't compromise this guarantee
  without a separate, explicit design pass.
- **Availability Check at Order Creation:** `POST /rms/v1/orders` checks
  `is_available` on each `menu_item` being ordered. Any unavailable item
  in the payload rejects the entire order with `409 Conflict`, before
  price snapshotting runs — partial orders are not created.
- **Table Status Automation (Milestone D3):** `table.status` is a derived
  value, not something staff set per order. A private
  `sync_table_status( $table_id )` helper on the Order REST controller
  recomputes it from scratch on every relevant event: it queries for any
  `order` post with matching `table_id` meta whose `order_status` term is
  *not* `delivered` or `cancelled`; if one exists, status is set to
  `Occupied`, otherwise `Available`. It's called from both order creation
  and order status update, so the two trigger points can't drift out of
  sync with each other by using two different pieces of logic. It skips
  tables currently `Out of Service` (see §4.2).
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

- Milestones A, B, D1, D2, D3, E: verified manually via REST client
  (Postman or equivalent) plus wp-admin, per each milestone's Definition
  of Done.
- Milestone C (Reservation Overlap Engine) is the single most complex
  piece of business logic in this plugin and the one most likely to have
  a subtle bug (timezone edge cases, boundary conditions on the strict
  inequality). It gets a **PHPUnit test** covering: a non-overlapping
  booking (succeeds), an exactly-adjacent booking (succeeds, per the
  strict-inequality decision above), and an overlapping booking (rejected
  with 409). This is the one place automated testing is required rather
  than optional for Phase 1.
- Milestone F: manual parity check between the vanilla-JS version and the
  React/TS rebuild (same requests fired, same server responses handled,
  same validation messages shown) before the old files are deleted.

---

## 5. Data Model & Role Matrix

### 5.1 Custom Post Types & Meta Fields

| CPT | Meta Fields | Taxonomies |
|---|---|---|
| `menu_item` | `price`, `prep_time_minutes`, `is_available` | `menu_category` (Hierarchical), `dietary_tag` (Flat) |
| `table` | `capacity`, `section`, `status` (Available/Occupied/Out of Service — see §4.2), `grid_x`, `grid_y` | — |
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
- `access_rms_admin` — visibility of the RMS admin console menu item,
  deliberately separate from the `manage_rms_*` operational capabilities
  above (gates *entry* to the admin area, not *actions* within it)

**Admin**
- `manage_options` — WP core, site-wide admin (role/capability setup,
  plugin settings)
- `manage_rms_menu_items` — menu CRUD, price edits (Admin-only; Staff has
  no menu access per §5.3)
- `manage_rms_orders`, `manage_rms_reservations`, `manage_rms_tables`,
  `access_rms_admin` — Admin is a superset of Staff's operational
  capabilities, plus menu control

Note: Gutenberg block insertion (e.g. a future "Table Layout" display
block) is governed by WordPress core's own content-editing capabilities,
not by any RMS-specific capability above — blocks are read-only display
content, not gated the same way the REST API is.

---

## 7. REST API Endpoints (Phase 1 Draft)

| Method | Endpoint | Access Control | Description |
|---|---|---|---|
| GET | `/rms/v1/menu-items` | Public | List menu items (filterable by category, dietary tag). |
| GET | `/rms/v1/customer-tables` | Authenticated (Customer) | List tables (id/title/capacity/section only) for the reservation form — a deliberately narrower response shape than the Staff/Admin `/tables` endpoint. |
| GET | `/rms/v1/reservations` | Authenticated | List reservations — Customer sees only their own (filtered by `customer_id`); Staff/Admin see all. |
| GET | `/rms/v1/reservations/<id>` | Authenticated | Fetch a single reservation. `403` if requester is a Customer and `customer_id !== current_user_id`. |
| POST | `/rms/v1/reservations` | Authenticated | Create a reservation (runs 90-min overlap check + capacity check). |
| GET | `/rms/v1/orders` | Authenticated | List orders — Customer sees only their own (filtered by `customer_id`); Staff/Admin see all. |
| GET | `/rms/v1/orders/<id>` | Authenticated | Fetch a single order. `403` if requester is a Customer and `customer_id !== current_user_id`. |
| POST | `/rms/v1/orders` | Authenticated | Create orders (Customer self-service or Staff POS payload) with price snapshotting and availability check. Also triggers `sync_table_status()` for dine-in orders (§4.3). |
| PATCH | `/rms/v1/orders/<id>` | Staff / Admin | Transition order status (`order_status` taxonomy terms). Also triggers `sync_table_status()` for dine-in orders (§4.3). |
| GET | `/rms/v1/tables` | Staff / Admin | Fetch full table records (all meta fields). |
| POST / PATCH / DELETE | `/rms/v1/tables` | Staff / Admin | Create/update/delete table records, including manual `status` override (e.g. `Out of Service`). |

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

- **Framework:** React + TypeScript — **applies to every screen in this
  plugin without exception**, including the Customer Portal (see §3.2).
  There is no sanctioned vanilla-JS or lightweight-bundle carve-out for
  public-facing pages; the current vanilla-JS portal implementation is
  a known, temporary deviation being corrected under Milestone F, not a
  second accepted pattern.
- **UI & Components:** Mantine UI (Theming, forms, modal dialogs) for the
  Staff/Admin app. The Customer Portal rebuild (Milestone F) should reuse
  Mantine where it makes sense for consistency, though its public-facing
  styling needs may diverge visually from the admin console's internal
  tooling look — that's a design decision for Milestone F, not a
  framework decision (the framework stays React + TypeScript either way).
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
    project this size. This split applies to `src/public/` (Milestone F)
    exactly as it already applies to `src/admin/`.

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
│   ├── class-menu-rest-controller.php        (Milestone A)
│   ├── class-table-rest-controller.php       (Milestone B + D3 status automation trigger point)
│   ├── class-reservation-rest-controller.php (Milestone C)
│   ├── class-order-rest-controller.php       (Milestone D1/D2 + D3's sync_table_status())
│   ├── main.php                  (registers public shortcode setup on `init`)
│   ├── functions.php
│   └── api/
│
├── admin/
│   └── class-admin.php           (enqueues build/admin/index.js + fonts)
├── public/
│   └── class-public.php          (registers [restaurant_customer_portal],
│                                   [restaurant_order_form],
│                                   [restaurant_reservation_form] shortcodes;
│                                   enqueues build/public/index.js; passes
│                                   login state, login URL, REST URL, and
│                                   nonce to the browser)
│
├── src/
│   ├── admin/                    (Staff/Admin console React app — routes.js,
│   │                               theme.ts, screens)
│   └── public/                   (Customer-facing app — currently vanilla
│                                   JS, being rebuilt as React/TS under
│                                   Milestone F; see §3.2)
└── build/                        (compiled output, gitignored)
```

**Frontend (React + TypeScript)**
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

**Milestone F target structure for `src/public/`** — mirrors the admin
app's module/shared split exactly, per §3.2 and §8's "no exception" rule:
```
src/public/
│
├── modules/
│   ├── order/
│   │   ├── components/     (menu list, cart, item card)
│   │   ├── services/       (order creation API calls)
│   │   └── types.ts
│   │
│   └── reservation/
│       ├── components/     (table select, reservation form)
│       ├── services/       (reservation creation + customer-tables fetch)
│       └── types.ts
│
├── shared/
│   ├── api/                (mirrors src/admin/shared/api's client pattern —
│   │                         same nonce handling currently in utils/api.js,
│   │                         ported to a typed client.ts)
│   ├── components/
│   └── utils/              (price formatting, escaping — ported from
│                             utils/helpers.js)
│
└── index.tsx        (entry point — mounts whichever module's root
                       container is present on the page, same routing
                       role as the current index.js, rewritten as a
                       React root instead of manual DOM queries)
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
Milestone D1/D2 → Orders · Milestone D3 → Tables (status automation) ·
Milestone E → Floor Plan (Tables module) · Milestone F → Public
(Customer Portal, React/TS)

---

## 9. Decisions Log & Resolved Architectural Points

- **Data Layer:** CPT-based data layer chosen to ensure rapid, complete
  delivery of all business requirements within project scope (full
  reasoning: Section 4.2).
- **Ordering Model:** Unified dual-order model supporting both Customer
  Self-Service and In-House Staff POS orders through an `order_source`
  flag and server-side price snapshotting. Order immutability
  (create-once, never mutated after creation) is a deliberately locked
  design decision; an "append items to an active order" feature has been
  discussed and explicitly deferred rather than implemented, to avoid
  compromising this guarantee without a dedicated design pass.
- **Floor Plan Coordinates:** Discrete 12×12 matrix coordinates (`grid_x`,
  `grid_y`) chosen over raw pixels to maintain responsive grid rendering
  across devices.
- **Reservation Logic:** Explicit 90-minute lockout window enforced
  server-side via strict timestamp intersection (full reasoning: Section
  4.3).
- **Table Status Model:** `table.status` (`Available`/`Occupied`/`Out of
  Service`) represents current physical state only, automatically derived
  from active dine-in orders via `sync_table_status()`; it is never
  written by reservation logic, which remains a separate, read-time
  availability check (full reasoning: §4.2, §4.3).
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
- **Frontend Stack, Reaffirmed (Milestone F):** React + TypeScript is
  strict and applies to the Customer Portal exactly as it applies to the
  Staff/Admin console — no vanilla-JS exception for public-facing pages.
  The existing vanilla-JS portal implementation is scoped for a corrective
  rebuild (Milestone F), not retained as a second pattern (full reasoning:
  §3.2).