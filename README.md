# ✈️ Wanderlust: Tourism & Travel Portal

An **AI-assisted web application prototype** for a real-world problem: helping travellers discover
destinations, compare tour packages, plan trips on a budget and book online. The portal also
gives the travel agency an admin dashboard to manage the business.

Frontend and backend live in one project. Data is stored in a **SQLite** database, and the
project deploys to **Vercel** as is.

---

## 1. Problem Statement

Planning a holiday means switching between many websites to find destinations, compare prices,
check itineraries and contact agents. Small travel agencies often manage bookings by phone and
spreadsheets. **Wanderlust** puts discovery, planning, booking and agency management on one
simple platform.

## 2. Features

### Traveller (user)
| Feature | Description |
|---|---|
| 🏠 Home | Hero search, popular destinations, featured packages |
| 🗺️ Destinations | Search + category filter (Beach, Mountain, Heritage…), detail page with highlights & best season |
| 🧳 Tour packages | Search, filter by type/budget, sort by price/duration/rating |
| 📄 Package detail | Inclusions, day-wise itinerary timeline, live price calculator, seats left |
| 💳 Booking | Date & traveller selection, 10% group discount (5+), 5% GST, demo payment, booking reference |
| 🧾 My bookings | View details, cancel (refund status shown) |
| ❤️ Wishlist | Save / remove packages |
| ⭐ Reviews | Rate packages 1–5 with comments (one review per user); rating auto-recalculated |
| ✨ Smart Trip Planner | Scores every package against budget, days, month, interests and India/International, then returns the top 3 with match % and reasons |
| 👤 Auth & profile | Register, login, edit profile, change password |
| ✉️ Contact & newsletter | Enquiry form with FAQs, newsletter subscription |

### Admin (`admin@wanderlust.com` / `admin123`)
- 📊 Dashboard: revenue, bookings, customers, bookings-by-status chart, top packages
- 🧾 Manage bookings: filter and change status (Pending / Confirmed / Completed / Cancelled)
- 🧳 Package CRUD: add, edit, delete (blocked while active bookings exist)
- 🗺️ Destination management: add and delete
- 👥 Users list, ✉️ messages inbox (mark read / delete), ↺ reset demo data

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3 (responsive, CSS variables), Vanilla JavaScript ES modules, hash-based SPA router |
| Backend | Node.js 18+ serverless function (Vercel) / Node `http` server (local) |
| Auth | `crypto.scrypt` password hashing + HMAC-SHA256 signed JWT tokens |
| Database | **SQLite** via `@libsql/client`: local file `data/wanderlust.db`, or **Turso** (cloud SQLite) on Vercel |
| Testing | End-to-end API test suite (`npm test`, 18 scenarios incl. restart persistence) |

### Database schema (SQLite)

```
users        (id PK, name, email UNIQUE, phone, password, role, created_at)
destinations (id PK, name, country, region, category, image, description, best_time, rating, highlights JSON)
packages     (id PK, title, destination_id FK→destinations, days, nights, price, image, type, seats,
              featured, inclusions JSON, itinerary JSON, created_at)
reviews      (id PK, package_id FK→packages, user_id FK→users, rating 1-5, comment, created_at,
              UNIQUE(package_id, user_id))
bookings     (id PK, ref UNIQUE, user_id FK→users, package_id, package_title, package_image, days,
              travel_date, travelers, contact_name, contact_phone, special_requests, payment_method,
              payment_status, status, subtotal, discount, taxes, total, created_at, cancelled_at)
wishlist     (user_id FK, package_id FK, created_at, PRIMARY KEY(user_id, package_id))
messages     (id PK, name, email, subject, message, is_read, created_at)
newsletter   (email PK, created_at)
```

Package rating and seats left are **calculated with SQL** (`AVG(reviews.rating)`, `seats − SUM(active bookings)`),
so they are always correct. Tables are created and demo data seeded automatically on first start.
| Hosting | Vercel |

## 4. Project Structure

```
├── api/
│   └── index.js                  # Vercel serverless entry: all /api/* requests
├── lib/
│   ├── router.js                 # Route table, auth guard, error handling
│   ├── db.js                     # SQLite schema, seeding & query helpers
│   ├── auth.js                   # Password hashing & JWT tokens
│   ├── http.js                   # JSON response / body parsing helpers
│   ├── utils.js                  # Validation & helper functions
│   ├── seed.js                   # Demo destinations & packages
│   └── controllers/
│       ├── auth.controller.js
│       ├── destinations.controller.js
│       ├── packages.controller.js
│       ├── bookings.controller.js
│       └── misc.controller.js    # Wishlist, contact, planner, admin stats
├── public/                       # Static frontend (served by Vercel)
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── app.js                # Entry: routes, navbar, navigation
│       ├── api.js                # Fetch wrapper + auth state
│       ├── router.js             # Hash router
│       ├── ui.js                 # Shared UI helpers & card templates
│       └── pages/                # home, destinations, packages, planner, auth, account, contact, admin
├── tests/api.test.js             # End-to-end API tests
├── server.js                     # Local development server
├── vercel.json                   # Vercel routing config
├── package.json
├── PROMPTS.md                    # Prompt engineering log (ESE documentation)
└── README.md
```

## 5. Run Locally

Requires **Node.js 18 or newer** (https://nodejs.org).

```bash
npm install        # installs the SQLite driver (@libsql/client)
npm start          # http://localhost:3000
npm test           # runs the API test suite
```

All data is saved in the SQLite file `data/wanderlust.db`. You can open it with any SQLite viewer
(e.g. "DB Browser for SQLite" or the VS Code "SQLite Viewer" extension). Delete the file, or use
**Admin → Reset demo data**, to restore the demo data.

## 6. Deploy to Vercel

### Option A: GitHub + Vercel dashboard (recommended)
1. Push this folder to a new GitHub repository.
2. Go to https://vercel.com/new and import the repository.
3. Framework preset: **Other**. Leave the build command empty. `vercel.json` already sets the output directory to `public`.
4. Click **Deploy**.

### Option B: Vercel CLI
```bash
npm i -g vercel
vercel           # preview deployment
vercel --prod    # production deployment
```

### ⚠️ Make the data permanent on Vercel (important)
Vercel functions have no permanent disk. Without extra setup the portal still works, but the SQLite
file lives in `/tmp` and **resets when the function restarts** (users may be logged out unexpectedly).
**Turso** is free hosted SQLite, and the same code uses it automatically:

1. Create a free account at https://turso.tech and create a database
   (or in Vercel: **Storage → Marketplace → Turso**).
2. Copy the database URL (`libsql://...`) and an auth token.
3. In Vercel → Project → **Settings → Environment Variables**, add `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.
4. **Redeploy.** Tables and demo data are created automatically, and the admin dashboard shows
   "Database: SQLite on Turso cloud (permanent)".

### Environment variables
| Variable | Purpose |
|---|---|
| `JWT_SECRET` | Secret used to sign login tokens. **Set a long random value in production.** |
| `ADMIN_PASSWORD` | Password for the seeded admin account (default `admin123`) |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | Cloud SQLite connection for Vercel |
| `DATABASE_FILE` | Optional custom path for the local SQLite file |

## 7. API Reference

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/health` | Public | Health & database mode |
| POST | `/api/auth/register` | Public | Create account |
| POST | `/api/auth/login` | Public | Log in, returns token |
| GET / PUT | `/api/auth/me` | User | Get / update profile |
| GET | `/api/destinations?q=&category=` | Public | List destinations |
| GET | `/api/destinations/:id` | Public | Destination + its packages |
| POST / DELETE | `/api/destinations[/:id]` | Admin | Create / delete destination |
| GET | `/api/packages?q=&type=&maxPrice=&sort=&featured=` | Public | List packages |
| GET | `/api/packages/:id` | Public | Package detail |
| POST / PUT / DELETE | `/api/packages[/:id]` | Admin | Package CRUD |
| POST | `/api/packages/:id/reviews` | User | Add review |
| POST / GET | `/api/bookings` | User | Create / list my bookings |
| GET | `/api/bookings/:id` | User | Booking detail |
| POST | `/api/bookings/:id/cancel` | User | Cancel booking |
| GET | `/api/wishlist` · POST `/api/wishlist/:id` | User | List / toggle wishlist |
| POST | `/api/planner` | Public | Smart trip recommendations |
| POST | `/api/contact`, `/api/newsletter` | Public | Enquiry / subscribe |
| GET | `/api/admin/stats`, `/users`, `/bookings`, `/messages` | Admin | Dashboard data |
| PATCH | `/api/admin/bookings/:id` | Admin | Update booking status |
| PATCH / DELETE | `/api/admin/messages/:id` | Admin | Mark read / delete |
| POST | `/api/admin/reset` | Admin | Restore demo data |

## 8. Testing

`npm test` starts the server on a random port with a temporary SQLite database and checks
that data survives a server restart, plus:
health, filtering, search & sort, 404s, registration validation, login, role protection,
booking with group discount, past-date rejection, cancellation & refund, wishlist, reviews &
rating, planner, contact, newsletter, admin package CRUD, booking status, destinations and static files.

## 9. Limitations & Future Scope
- Payment is simulated. A real gateway (Razorpay / Stripe) can be added.
- Images use Unsplash URLs, with a gradient fallback if one fails to load.
- Future: email confirmations, PDF tickets, hotel & flight search APIs, an LLM-powered itinerary chatbot.
