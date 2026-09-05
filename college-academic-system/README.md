# CAMS — College Academic Management System

A full-stack academic dashboard for colleges: attendance, class test marks, assignments,
calendar, notices and analytics — for students, faculty and administrators.

Every figure the interface shows is computed from records in PostgreSQL. There are no
hard-coded percentages anywhere in the frontend.

```
college-academic-system/
├── backend/          Express + TypeScript REST API, Prisma, PostgreSQL
├── frontend/         React + TypeScript + Vite + Tailwind SPA
├── docker-compose.yml
└── README.md
```

---

## Contents

- [Quick start](#quick-start)
- [Demo logins](#demo-logins)
- [Architecture](#architecture)
- [How the numbers are calculated](#how-the-numbers-are-calculated)
- [API reference](#api-reference)
- [Database schema](#database-schema)
- [Security](#security)
- [Scripts](#scripts)
- [Testing](#testing)
- [What is and is not verified](#what-is-and-is-not-verified)

---

## Quick start

**Prerequisites:** Node.js 20+, npm 10+, and PostgreSQL 14+ (or Docker).

### 1. Start PostgreSQL

With Docker:

```bash
docker compose up -d db
```

Or point `DATABASE_URL` at any PostgreSQL instance you already run.

### 2. Backend

```bash
cd backend
cp .env.example .env          # then edit the two JWT secrets
npm install
npx prisma migrate deploy     # or: npx prisma migrate dev
npm run seed
npm run dev                   # http://localhost:4000
```

Generate real secrets before running anything beyond a local demo:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

The Vite dev server proxies `/api` and `/uploads` to `http://localhost:4000`, so no CORS
configuration is needed in development. Open <http://localhost:5173> and sign in.

### Production build

```bash
cd backend  && npm run build && npm start
cd frontend && npm run build && npm run preview
```

Set `VITE_API_URL` at build time if the API is served from a different origin.

---

## Demo logins

Seeded by `npm run seed`. **Development only — change or remove these before any real deployment.**

| Role    | Email / roll number                 | Password       | Lands on             |
| ------- | ----------------------------------- | -------------- | -------------------- |
| Student | `student@demo.com` or `23CS042`     | `Student@123`  | `/dashboard`         |
| Teacher | `teacher@demo.com` or `FAC-CSE-01`  | `Teacher@123`  | `/teacher/dashboard` |
| Admin   | `admin@demo.com`                    | `Admin@123`    | `/admin/dashboard`   |

Sign-in accepts an **email address, a roll number, or an employee code**.

The demo student is **Rohan Sharma**, roll no. `23CS042`, B.Tech CSE, 2nd year (Semester 4,
Section A). His subjects deliberately span all three attendance bands — one Good, one
Warning and one Critical — so the colour rules and the automatic warning notifications are
visible immediately.

### What the seed creates

1 admin · 3 teachers · 30 students · 7 subjects · 2 semesters · 2 sections · 2 departments,
plus roughly 2,900 attendance records over 8 weeks, 14 tests with marks, 14 assignments with
submissions, calendar events, notices and notifications. All names are fictional.

The seed is deterministic — re-running it produces the same figures. It **clears existing
data first**, so do not run it against a database you care about.

---

## Architecture

### Backend — `backend/`

```
src/
├── config/env.ts           Zod-validated environment; the server refuses to boot if it is wrong
├── controllers/            Request handling per role: auth, student, teacher, admin, calendar, report
├── routes/                 Route table, wiring validation + auth middleware to controllers
├── middleware/             authenticate, authorize, validate, upload, centralised error handler
├── services/               Business logic: analytics, notifications, tokens, settings, reports
├── utils/                  academics.ts (all the maths), prisma client, ApiError, response helpers
└── validation/schemas.ts   Every request shape, as Zod schemas
prisma/
├── schema.prisma           21 models
└── seed.ts                 Deterministic demo data
```

The maths lives in one place (`utils/academics.ts`) and is used by the API, the reports and
the seed, so the dashboard, the PDF export and the seeded warnings can never disagree.

### Frontend — `frontend/`

```
src/
├── components/     ui/ primitives (shadcn-style, built on Radix), charts/, DataTable, StatCard…
├── pages/          student/, teacher/, admin/, plus shared Login, Calendar, Notices, Settings
├── layouts/        DashboardLayout — navy sidebar, top bar, mobile drawer
├── services/       api.ts (axios + token refresh) and one service object per domain
├── context/        AuthContext — session, role-based home routes
├── hooks/ utils/   formatting, tone mapping, chart colours
└── types/          Shared response types
```

State is TanStack Query throughout: caching, loading states, mutations and invalidation.
Forms are React Hook Form + Zod, using the same rules the API enforces.

### Design

Dark navy sidebar, blue primary actions, white cards on a light-grey ground. Status colour is
consistent everywhere — green for good, orange for warning, red for poor attendance, purple
for assignments — defined once as CSS custom properties in `src/index.css` and consumed
through Tailwind tokens, so the whole palette can be re-skinned in one file.

Responsive from 390 px to 1920 px: the sidebar becomes a drawer below `lg`, wide tables scroll
inside their own container, and charts resize with their card.

---

## How the numbers are calculated

All of this is server-side, in `backend/src/utils/academics.ts`.

**Attendance**

```
attendance % = present / (present + absent) × 100
```

`LEAVE` is deliberately excluded from the denominator — an approved leave neither helps nor
hurts, which matches how most Indian universities compute the figure. The dashboard shows
leave separately so the exclusion is visible rather than hidden.

**Class tests** — total marks obtained over total maximum, across published tests only:

```
test % = Σ obtained / Σ maximum × 100
```

An absent student counts as 0 for that test rather than being dropped.

**Assignments**

```
assignment % = Σ obtained / Σ maximum   (across graded submissions)
```

Before anything has been graded, the submission rate is used instead, so a new student's
overall score is not dragged to zero by an empty gradebook.

**Overall score**

```
overall = attendance% × Wa + test% × Wt + assignment% × Wg
```

Default weights **30 / 40 / 30**, configurable by an admin at `/admin/settings`. The weights
are normalised before use, so a mis-configured setting cannot push a score above 100.

All percentages are rounded to one decimal place.

**Attendance status bands** (also admin-configurable):

| Band     | Default range | Colour |
| -------- | ------------- | ------ |
| Good     | ≥ 75%         | Green  |
| Warning  | 65–74%        | Orange |
| Critical | < 65%         | Red    |

When attendance is saved, any student who has dropped below the threshold is notified
automatically. The notification is de-duplicated per student, subject and band, so a student
is told once per band rather than after every class.

---

## API reference

Base URL `http://localhost:4000/api`. All responses use one envelope:

```jsonc
// success
{ "success": true, "data": { }, "meta": { } }   // meta only on paginated lists

// failure
{ "success": false, "message": "Something went wrong", "errors": { "field": "reason" } }
```

Authenticate with `Authorization: Bearer <accessToken>`. Access tokens last 15 minutes;
the client refreshes them silently using the rotating refresh token.

### Authentication

| Method | Path                        | Access | Purpose                                          |
| ------ | --------------------------- | ------ | ------------------------------------------------ |
| POST   | `/auth/login`               | public | `{ identifier, password, rememberMe }`           |
| POST   | `/auth/register`            | public | Self-registration as a student                   |
| POST   | `/auth/refresh`             | public | Rotates the refresh token, returns a new access token |
| POST   | `/auth/logout`              | public | Revokes the presented refresh token              |
| GET    | `/auth/me`                  | any    | The signed-in user with their student/teacher profile |
| POST   | `/auth/change-password`     | any    | Also signs the user out of every other device    |
| GET    | `/reference`                | public | Departments, courses, semesters, sections (fills the sign-up form) |

### Student

| Method | Path                                       | Purpose                                    |
| ------ | ------------------------------------------ | ------------------------------------------ |
| GET    | `/students/me`                             | Full profile                               |
| GET    | `/students/me/dashboard`                   | KPIs, subject attendance, trend, upcoming, recent marks and assignments |
| GET    | `/students/me/attendance`                  | `?subjectId&from&to` — per-subject totals plus the register |
| GET    | `/students/me/attendance/trend`            | `?range=4w\|8w\|semester`                  |
| GET    | `/students/me/tests`                       | Published marks, average and upcoming tests |
| GET    | `/students/me/assignments`                 | Assignments with submission status and feedback |
| GET    | `/students/me/subjects`                    | Enrolled subjects with faculty              |
| POST   | `/students/me/assignments/:id/submit`      | multipart — text and/or one file; late detection is server-side |
| GET    | `/students/me/notifications`               | Alias of `/notifications`                   |

### Teacher (admins may use these too)

| Method | Path                                       | Purpose                                     |
| ------ | ------------------------------------------ | ------------------------------------------- |
| GET    | `/teacher/dashboard`                       | KPIs, today's classes, recent tests, deadlines |
| GET    | `/teacher/subjects`                        | Only the caller's own subjects              |
| GET    | `/teacher/students`                        | `?subjectId` — the class roster             |
| GET    | `/teacher/attendance/sheet`                | `?subjectId&date&period` — roster pre-filled with anything already saved |
| POST   | `/teacher/attendance`                      | Save a full sheet; idempotent per student/subject/date/period |
| PUT    | `/teacher/attendance/:id`                  | Correct a single record                     |
| GET/POST | `/teacher/tests`                         | List / create a class test                  |
| PUT/DELETE | `/teacher/tests/:id`                   | Update / delete                             |
| GET    | `/teacher/tests/:id/marks`                 | Mark sheet, pre-filled                      |
| POST   | `/teacher/tests/:id/marks`                 | Save marks, optionally publishing them      |
| GET/POST | `/teacher/assignments`                   | List / create (multipart, optional attachment) |
| PUT/DELETE | `/teacher/assignments/:id`             | Update / delete                             |
| GET    | `/teacher/assignments/:id/submissions`     | Every student's submission                  |
| POST   | `/teacher/assignments/:id/close`           | Flag overdue submissions as not submitted   |
| POST   | `/teacher/submissions/:id/grade`           | Marks and feedback                          |
| GET    | `/teacher/subjects/:subjectId/performance` | Class-level report                          |

Teachers may only read or write subjects assigned to them; anything else returns **403**.

### Admin

| Method | Path                          | Purpose                                    |
| ------ | ----------------------------- | ------------------------------------------ |
| GET/POST | `/admin/students`           | Paginated + searchable; create enrols the student automatically |
| PUT/DELETE | `/admin/students/:id`     | Update / remove                            |
| GET/POST | `/admin/teachers`           | Faculty records                            |
| PUT/DELETE | `/admin/teachers/:id`     | Update / remove                            |
| GET/POST | `/admin/subjects`           | Create enrols the matching cohort          |
| PUT/DELETE | `/admin/subjects/:id`     | Update / remove                            |
| GET    | `/admin/users`                | All accounts, filterable by role           |
| PATCH  | `/admin/users/:id/role`       | Change role (revokes that user's sessions) |
| PATCH  | `/admin/users/:id/active`     | Activate / deactivate                      |
| GET    | `/admin/analytics`            | Institute-wide KPIs and all five charts    |
| GET/PUT | `/admin/settings`            | Score weights, attendance thresholds, college name |
| GET    | `/admin/audit-logs`           | Recent privileged actions                  |
| POST/DELETE | `/admin/notices[/:id]`   | Publish / remove a notice (notifies the audience) |

### Shared

| Method | Path                | Access | Purpose                                     |
| ------ | ------------------- | ------ | ------------------------------------------- |
| GET    | `/notifications`    | any    | Newest first, with an unread count          |
| PATCH  | `/notifications/:id/read`, `/notifications/read-all` | any | Mark read |
| GET    | `/notices`          | any    | Active notices                              |
| GET    | `/calendar`         | any    | `?from&to&type` — scoped to the caller's subjects |
| POST/DELETE | `/calendar[/:id]` | staff | Manage events                              |
| GET    | `/reports/:kind`    | any    | `?format=pdf\|excel` — `attendance`, `marks`, `assignments`, `performance`, `subject` |
| GET    | `/health`           | public | Liveness                                    |

Students can only export their own records; `subject` reports are staff-only.

---

## Database schema

21 Prisma models with UUID primary keys and foreign keys throughout.

**Identity** `User` · `RefreshToken`
**Organisation** `Department` · `Course` · `AcademicSession` · `Semester` · `Section`
**People** `Student` · `Teacher`
**Academics** `Subject` · `Enrollment` · `Attendance` · `Test` · `TestMark` · `Assignment` · `AssignmentSubmission`
**Communication** `Notification` · `Notice` · `CalendarEvent`
**Platform** `AppSetting` · `AuditLog`

Uniqueness constraints that matter:

- `Attendance` — `@@unique([studentId, subjectId, date, period])`. Duplicate attendance is
  impossible at the database level, not merely discouraged in code; saving a sheet twice
  updates the existing rows.
- `TestMark` — `@@unique([testId, studentId])`
- `AssignmentSubmission` — `@@unique([assignmentId, studentId])`
- `Enrollment` — `@@unique([studentId, subjectId])`
- `Notification` — `@@unique([userId, dedupeKey])`, which is what keeps automatic attendance
  warnings from repeating.

Deleting a `User` cascades to their student or teacher profile and all dependent records.
Deleting a teacher leaves their subjects in place, unassigned.

---

## Security

- Passwords are hashed with bcrypt (cost 12) and never leave the database — no endpoint
  returns a hash.
- Short-lived JWT access tokens; refresh tokens are stored only as SHA-256 hashes and are
  **rotated on every use**. Presenting a used refresh token fails.
- Changing a password, changing a role, or deactivating an account revokes every refresh
  token for that user.
- Role middleware on every private route, plus per-subject ownership checks so a teacher
  cannot touch another teacher's class.
- Every request body, query and parameter is validated with Zod before it reaches a controller.
- Helmet security headers, CORS restricted to a configured origin list, and rate limiting
  (tighter on the credential endpoints).
- Uploads are limited by size, extension and MIME type, and are stored under generated names —
  a client-supplied filename never reaches the filesystem.
- Prisma parameterises all queries, so string interpolation into SQL is not possible.
- Login answers "no such user" and "wrong password" identically, with a matched bcrypt
  comparison in the miss case so response timing does not leak which accounts exist.

Before deploying anywhere real: set fresh JWT secrets, change the database password, delete
the demo accounts, and serve over HTTPS (the refresh cookie is marked `secure` when
`NODE_ENV=production`).

---

## Scripts

**backend**

| Command | Does |
| --- | --- |
| `npm run dev` | Watch-mode API on port 4000 |
| `npm run build` / `npm start` | Compile to `dist/` and run it |
| `npm run typecheck` | TypeScript, no emit |
| `npm run prisma:migrate` | Create and apply a migration |
| `npm run prisma:deploy` | Apply existing migrations (use in CI/production) |
| `npm run prisma:studio` | Browse the data |
| `npm run seed` | Reset and reseed demo data |
| `npm test` | API integration suite (needs a running server — see [Testing](#testing)) |

**frontend**

| Command | Does |
| --- | --- |
| `npm run dev` | Vite dev server on 5173, proxying the API |
| `npm run build` | Typecheck and build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | TypeScript, no emit |
| `npm run test:e2e` | Browser end-to-end suite (see [Testing](#testing)) |

---

## Testing

Two suites ship with the code. Both run against a **live stack**, so start the API and the
frontend first.

```bash
# API integration — 33 checks, no framework, no dependencies
cd backend
npm run seed          # the assertions expect the seeded demo data
npm run dev           # in another terminal
npm test              # -> ALL PASSED

# Browser end-to-end — 43 checks across all three roles
cd frontend
npm i -D playwright && npx playwright install chromium   # one-off
npm run dev           # in another terminal
npm run test:e2e      # -> ALL PASSED, screenshots in tests/screenshots/
```

Playwright is deliberately not a default dependency, because installing it downloads a
browser. `PLAYWRIGHT_CHROMIUM=/path/to/chromium` points the suite at an existing binary.

**`npm test` mutates the database** — it creates a test, an assignment, marks attendance and
marks notifications read. Re-run `npm run seed` afterwards for a clean demo.

**Reset the database before starting the API, not while it is running.** `prisma migrate
reset` drops and recreates the schema, and a running server keeps pooled connections to the
old one; requests fail transiently until those reconnect. Restart the API after a reset.

**What the API suite covers:** all three logins by email and by roll number; role separation
(403 at every boundary, including a teacher reaching for another teacher's subject);
attendance idempotency and future-date rejection; marks validation at both bounds; assignment
submission with server-side late detection; grading limits; automatic attendance warnings;
admin analytics; live re-weighting of the overall score when an admin changes the weights; PDF
and Excel export; refusal to export another student's record; and refresh-token rotation with
replay rejection.

**What the browser suite covers:** every route for all three roles, charts actually painting
SVG rather than rendering empty containers, the notification dropdown, teacher attendance
marking end-to-end through to the success toast, admin search, role redirects, the 404 page,
horizontal-overflow checks at 390/768/1024/1920 px, the mobile drawer, and an assertion that
no console errors or uncaught exceptions occur anywhere.

---

## What is and is not verified

Verified by running it, not by inspection:

- Prisma migration applies cleanly to an empty database; the seed populates ~2,900 attendance
  records, 204 test marks and 204 submissions.
- Backend typechecks; the API boots and answers.
- `backend/npm test` — 33 API integration checks pass.
- Frontend typechecks and builds; the compiled backend (`npm run build && npm start`) serves.
- `frontend/npm run test:e2e` — 43 browser checks pass, including no console or uncaught errors.
- No horizontal overflow at 390, 768, 1024 and 1920 px.

Not verified, and worth knowing:

- **There are no unit tests.** Both suites are integration-level and need a running server and
  database. `utils/academics.ts` in particular is pure and deserves unit tests; it does not
  have them. There is also no CI configuration.
- Only Chromium was exercised. No Firefox or Safari testing.
- No load or concurrency testing. `getAdminAnalytics` reads every attendance row into memory
  to compute its charts; that is fine at demo scale and will need aggregate SQL well before
  it reaches a real institution's data volume.
- Accessibility was built for (semantic HTML, labelled controls, visible focus rings,
  `aria-live` toasts, WCAG-minded contrast) but has not been audited with a screen reader or
  an automated checker.
- Uploaded files are stored on the local filesystem, which will not survive a container
  restart or work across more than one instance.
