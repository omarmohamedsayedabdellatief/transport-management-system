# On Time — employee transportation operations

Arabic/English transport management with Lemonada typography. React + TypeScript, Express, PostgreSQL 17, and Prisma. The interface includes a guided setup checklist, a three-step schedule wizard, and searchable help at **/guide**.

## Run this checkout

The configured local application is at **http://localhost:5173**. API: **http://127.0.0.1:5001**. Local PostgreSQL: port **55432**, data in `.local/postgres`.

```sh
npm run dev
```

The launcher starts the existing local database when necessary, then the API and client. If the app is already running, use the existing instance rather than starting another. Ctrl+C stops services launched by this command; it leaves PostgreSQL running.

On a fresh machine with Node 20.19+ or 22+ and PostgreSQL 17 installed:

```sh
npm run setup:local
npm run admin:create
npm run dev
```

Set `ADMIN_EMAIL`, `ADMIN_PASSWORD` (at least 12 characters), and optionally `ADMIN_NAME` in your environment before `admin:create`. Passwords are hashed and existing accounts are never overwritten. `PG_BIN` can point to a PostgreSQL bin directory; the setup script recognizes common Intel/Apple Silicon Homebrew installations.

For an explicitly local demonstration, `npm run demo:seed` loads illustrative data and the original demo accounts: `admin@tms.com` / `admin123456`, `ops@tms.com` / `ops123456`, `viewer@tms.com` / `viewer123456`. The expanded fixtures require a non-production environment. Never use these shared accounts for public deployment. The app does not display their passwords or autofill controls by default.

For a richer, additive walkthrough, run `npm run demo:showcase`. It adds clearly labelled fictional companies, 48 passengers, 8 schedules, 288 dated trips and financial examples without clearing existing data or resetting passwords. Repeat runs on the same day preserve existing records. See the manuals for the demo walkthrough and chart definitions.

## User documentation

- [System workflow flowcharts (PDF)](output/pdf/on-time-system-workflows.pdf)

- [Arabic manual](docs/USER_MANUAL_AR.md)
- [English manual](docs/USER_MANUAL_EN.md)
- [Deployment and recovery](docs/OPERATIONS.md)
- [Original improvement roadmap](IMPROVEMENT_PLAN.md)

## Implemented workflow

1. Set up clients, contracts, sites, staffing employers, and transport suppliers.
2. Register passengers or validate/import CSV; enroll them by route, stop, shift, direction, and dates.
3. Create schedules with actual vehicle capacity, supplier costs, weekdays, holidays, and time zone.
4. Preview/generate trips with overlap, maintenance, document, contract, and capacity checks.
5. Dispatch, record attendance, handle replacements and incidents, and complete trips.
6. Prepare/issue client invoices or supplier settlements from completed service; record partial payments and prevent duplicate billing/overpayment.
7. Track expenses, calculated staff payroll, installments, and audited changes.
8. Manage EGP bank/cash accounts, receipt allocation, treasury transfers, cost payments and client statements.
9. Assign scoped driver, client, and supplier accounts, with server-side authorization and session revocation.

Monthly and per-trip automated billing are implemented. Trip rates, monthly values, and payer IDs are saved on generated trips. Mixed monthly snapshots require review instead of silently choosing a rate. Operations costs and staff payroll are recorded separately from supplier service charges.

## Verification

```sh
npm run build
TEST_DATABASE_URL='postgresql://USER:PASSWORD@HOST:PORT/tms_operations_test' npm test
```

The integration suite **clears only the explicitly configured test database**, which must end in `_test`. Create that dedicated database and deploy migrations into it first:

```sh
cd server
DATABASE_URL='postgresql://USER:PASSWORD@HOST:PORT/tms_operations_test' npx prisma migrate deploy
```

Tests run the compiled API on port 5109 (override `TEST_PORT`) and cover real database-backed workflows, concurrent scheduling, portal isolation, history, CSV safety, invoices, supplier settlements, payment retries, session invalidation, and Cairo daylight-saving boundaries.

## Release boundaries

This is a runnable local operational release. Existing clients/fleet/contracts/maintenance screens are retained and extended by the new workflow. The old trip mutation endpoints and destructive spreadsheet replacement endpoint are disabled; new dispatch uses the validated API. Legacy accounting tables are retained for migration/reference; new operational billing does not automatically import their balances.

Not connected in this release: live GPS, route optimization, SMS/WhatsApp/email delivery, offline driver synchronization, bank transfers, government e-invoicing, a statutory general ledger, credit notes/refunds, and automatic payroll disbursement. Driver attendance is manual. Automated billing currently supports monthly fixed and per-trip contracts; other pricing units require further implementation. Supplier commercial terms can be recorded in partner notes and schedule costs; a separate versioned supplier agreement module is not yet implemented. Treasury is EGP-only; customer advances and automatic historical receivable imports are not implemented. Real contracts, opening balances, tax treatment, migration reconciliation, and hosting need validation with the business before rollout beyond a pilot.
