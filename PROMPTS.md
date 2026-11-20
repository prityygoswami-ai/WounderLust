# 🧠 Prompt Engineering Log: Wanderlust Travel Portal

**Project:** AI-Assisted Web Application: Tourism (Travel Portal)
**AI tool used:** Claude (Claude Code, AI coding assistant)
**Goal of this document:** show how prompts were used to **plan, design, generate, improve, test and explain** the application.

> The prompting technique used in each step is shown in *italics* (role prompting, constraints,
> few-shot, iterative refinement, chain-of-thought, etc.).

---

## Phase 1: Planning

### Prompt 1.1: Initial requirement *(zero-shot, goal-oriented)*
> Make the full working project of a Tourism (Travel Portal): full working portal with frontend and
> backend combined, with all functions fully working, deployed on Vercel.

**AI output:** asked the clarifying design questions itself and proposed:
- the real-world problem (scattered trip planning, manual agency bookings)
- two user roles (Traveller, Admin)
- a feature list: destinations, packages, booking, wishlist, reviews, trip planner, admin dashboard
- an architecture that fits Vercel: static frontend in `/public` plus one serverless API function

### Prompt 1.2: Constraint refinement *(adding constraints)*
> Generate it in this folder only. Everything should be professionally correct, well managed,
> correctly formatted code with a well-arranged, structured layout.

**Effect:** the AI separated the backend into layers (router → controllers → storage), split the
frontend into ES modules (`api`, `router`, `ui`, `pages/*`), and added section comments in CSS.

### Prompt 1.3: Architecture reasoning *(chain-of-thought)*
> Vercel functions have no permanent disk. Think step by step: how can the app store users and
> bookings so it works both locally and on Vercel, without a paid database?

**AI decision:**
1. Wrap all data access in one module (`lib/db.js`).
2. Use **SQLite** through `@libsql/client`: a local file (`data/wanderlust.db`) on a PC.
3. On Vercel, connect the same code to **Turso** (hosted SQLite, free tier) through environment variables.
4. Keep the rest dependency-free (native `crypto`, `http`) so deployment stays simple.

---

## Phase 2: Design

### Prompt 2.1: Data model *(structured output)*
> Design JSON schemas for users, destinations, packages, bookings, messages. Return each as a table
> of field, type, purpose.

| Entity | Key fields |
|---|---|
| User | id, name, email, phone, password (scrypt hash), role, wishlist[] |
| Destination | id (slug), name, country, region, category, bestTime, rating, highlights[] |
| Package | id, title, destinationId, days, nights, price, type, seats, inclusions[], itinerary[], reviews[], rating |
| Booking | id, ref, userId, packageId, travelDate, travelers, subtotal, discount, taxes, total, paymentMethod, paymentStatus, status |
| Message | id, name, email, subject, message, read |

### Prompt 2.2: API design *(role prompting)*
> Act as a senior backend engineer. Design REST endpoints for this portal with HTTP methods, access
> level (public/user/admin) and status codes.

**Output:** the API table in `README.md §7`; error statuses 400/401/403/404/409.

### Prompt 2.3: UI/UX design *(persona + few-shot style reference)*
> Act as a UI designer. Design a modern travel-website look: teal primary, orange accent, rounded
> cards with image, badge, rating and price, like popular booking sites. It must be mobile responsive.

**Output:** CSS design tokens (`:root` variables), card components, hero search, sticky booking panel,
itinerary timeline, dashboard KPIs, three responsive breakpoints.

---

## Phase 3: Generation

| # | Prompt *(technique)* | Generated files |
|---|---|---|
| 3.1 | "Write a zero-dependency Node router that maps `METHOD /path/:param` to controller functions and enforces `public/user/admin` access." *(specification prompt)* | `lib/router.js` |
| 3.2 | "Implement secure password hashing and JWT using only Node's crypto module." *(constraint prompt)* | `lib/auth.js` |
| 3.3 | "Write the booking controller: validate a future date, check seats, apply a 10% discount for 5+ travellers and 5% GST, generate a booking reference." *(business rules as bullet list)* | `bookings.controller.js` |
| 3.4 | "Create a rule-based Smart Trip Planner that scores packages on budget, days, interests, month and scope, and explains *why* each is recommended." *(explainable output)* | `misc.controller.js → plan()` |
| 3.5 | "Seed 12 realistic destinations (India + international) and 12 packages with day-wise itineraries in INR." *(few-shot: one sample object given)* | `lib/seed.js` |
| 3.6 | "Build a vanilla-JS SPA with a hash router; one module per page; reusable card templates; escape all user content." *(modular design prompt)* | `public/js/**` |
| 3.7 | "Create an admin dashboard with KPIs, bar charts in pure CSS, booking status editor, package CRUD modal." | `pages/admin.js` |

---

## Phase 4: Improvement (iterative refinement)

| Issue found | Refinement prompt | Fix applied |
|---|---|---|
| Old page event listeners piled up on `#app` | "Listeners from previous pages fire again after navigation. Fix it without a framework." | Fresh container element on every navigation (`app.js`) |
| Broken external images would show empty boxes | "Handle image load failures gracefully." | `onerror` gradient fallback in `ui.js` |
| Editing a package sent the itinerary as objects and corrupted it | "Itinerary may arrive as text or as objects; accept both." | Normalised parsing in `packages.controller.js` |
| Planner layout broke on mobile | "The planner sidebar overflows on phones." | Moved inline grid to a `.planner-layout` class overridden by media queries |
| XSS risk from user reviews/messages | "Review the frontend for injection risks." | `esc()` applied to every dynamic value |
| Temporary storage on Vercel was not obvious | "Make the storage mode visible to the admin." | `/api/health` reports storage; dashboard shows a warning |
| An empty white bar appeared over the home page (found by running the app and taking a screenshot) | "Why is this bar showing? Fix it." *(prompt with screenshot as evidence)* | Cause: `.modal { display: grid }` overrode the HTML `hidden` attribute. Fixed with `[hidden] { display: none !important; }` |
| A JSON document store is not a real database | "Apply SQLite so the app can store data and everything is functional." *(technology constraint)* | Rewrote the data layer: 8 normalised SQLite tables with foreign keys, UNIQUE/CHECK constraints and indexes. Ratings and seats are calculated with SQL. Turso supported for Vercel. |

---

## Phase 5: Testing

### Prompt 5.1: Test generation *(test-driven prompting)*
> Write an end-to-end API test that starts the server with a temporary database and covers every
> main user and admin flow, including invalid inputs.

**Result:** `tests/api.test.js` covers 18 scenarios (the 18th restarts the server and confirms the
SQLite data persisted). Run with `npm test`:

```
✔ health check                      ✔ my bookings & cancel
✔ list & filter destinations        ✔ wishlist toggle
✔ list, search & sort packages      ✔ reviews update rating
✔ package detail & 404              ✔ smart trip planner
✔ register validation & success     ✔ contact & newsletter
✔ login (user & admin)              ✔ admin package CRUD & booking status
✔ protected routes need login/admin ✔ admin destinations & messages
✔ booking with group discount       ✔ static frontend is served
✔ reject booking with past date
✔ data persists in SQLite after server restart
All 18 tests passed ✅
```

### Manual test checklist
- [ ] Register → log in → book a package → see it in My Bookings → cancel
- [ ] Wishlist heart on cards → Wishlist page
- [ ] Post a review → rating updates
- [ ] Planner with ₹40,000 / 2 people / Beach → recommendations shown
- [ ] Admin login → change booking status → add/edit/delete a package
- [ ] Resize to mobile width → hamburger menu and stacked layouts

---

## Phase 6: Explanation

### Prompt 6.1: Explain to a viewer *(audience-targeted prompt)*
> Explain how a booking flows through the system, in simple steps, for an exam viva.

1. The user clicks **Book Now**. The frontend (`packages.js`) opens the checkout modal.
2. `api.js` sends `POST /api/bookings` with the JWT token in the `Authorization` header.
3. Vercel rewrites the request to `api/index.js` → `router.js` matches the route and verifies the token.
4. `bookings.controller.js` validates the date, seats and phone, computes discount + GST and creates the booking.
5. `db.js` runs an `INSERT INTO bookings ...` SQL statement on the SQLite database.
6. The response returns the booking reference, and the frontend shows a confirmation modal.

---

## Key Learnings on Prompt Engineering
1. **Specific constraints** ("zero dependencies", "deploy on Vercel") produced more deployable code than vague requests.
2. **Role prompts** ("act as a senior backend engineer") improved structure and error handling.
3. **Iterative refinement** with concrete bug descriptions fixed issues faster than regenerating everything.
4. **Asking for reasons** (planner explanations, chain-of-thought architecture) made the output explainable.
5. **AI-generated tests** gave fast, repeatable checks after every change.
