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

## Roles and trip types

Owner (`ADMIN`) and accountant have full access. Operations managers can add/edit/dispatch trips and change a vehicle’s type; regular users can edit vehicle data and read operational pages. Neither restricted role receives prices or accounting data from the API. Catalog changes, other resource creation/deletion and user management are reserved for the owner/accountant.

In **Settings**, add or deactivate vehicle categories and trip billing types. In **Routes → Trip times and prices**, set independent outbound and return rates and Cairo departure times. Each direction is a separate trip. Existing trips retain their saved prices when route rates change. The dispatch screen shows the selected type, vehicle category and departure/arrival times.

After the showcase seed, `npm --prefix server run demo:types` adds illustrative rates to the four demo routes and the accountant demo login (`accountant@tms.com` / `accountant123456`). It preserves existing account passwords and configured prices.

In **Accounting → Drivers: earnings, deductions and payments**, record deductions with a reason and pay partial or full installments from a selected treasury account. The driver balance and entry history show deductions and cumulative payments; closed financial periods and overpayments are blocked. Driver trip wages are labelled **أجر الدورات**. Payments reduce treasury cash without creating a second wage expense.

For a local walkthrough after `demo:showcase`, run `npm --prefix server run demo:drivers`. This creates clearly labelled fictional trip earnings (400 EGP), a partial payment (100 EGP), and a deduction (25 EGP) for two demo drivers, plus a dedicated demo cash account.

Run the dedicated role/pricing checks against a migrated test database:

```sh
TEST_DATABASE_URL='postgresql://USER:PASSWORD@HOST:PORT/tms_roles_test' npm --prefix server run test:roles
```

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

This is a runnable local operational release. Existing clients/fleet/contracts/maintenance screens are retained and extended by the new workflow. Dispatch uses the validated trip API; the legacy spreadsheet replacement endpoint remains disabled; the reviewed trip Excel workflow below supports scoped replacement. Legacy accounting tables are retained for migration/reference; new operational billing does not automatically import their balances.

Not connected in this release: live GPS, route optimization, SMS/WhatsApp/email delivery, offline driver synchronization, bank transfers, government e-invoicing, a statutory general ledger, credit notes/refunds, and automatic payroll disbursement. Driver attendance is manual. Automated billing currently supports monthly fixed and per-trip contracts; other pricing units require further implementation. Supplier commercial terms can be recorded in partner notes and schedule costs; a separate versioned supplier agreement module is not yet implemented. Treasury is EGP-only; customer advances and automatic historical receivable imports are not implemented. Real contracts, opening balances, tax treatment, migration reconciliation, and hosting need validation with the business before rollout beyond a pilot.

Regular users can be assigned one or more client companies in **Users**. New regular users require a company selection; use **Assign companies** to restrict existing accounts. Existing accounts retain their previous access until assigned. Company changes end existing sessions; sign in again to use the updated scope. Company scope covers lists, linked history, reports and vehicle editing.

### Activity log

Owners and accountants can review `/audit` with actor, date, action and outcome filters. API actions are recorded before execution and finalized with their outcome; record edits and deletions retain available before/after details. Login/logout, exports and denied requests are included. Automatic session checks/refreshes and health probes are omitted. Passwords and authentication tokens are excluded. The log has no edit/delete API.

Migration `202610050007_activity_log` retains previously recorded audit events. Expanded coverage starts after deployment; unrecorded historical actions cannot be reconstructed. A pending entry means completion was not confirmed (for example, an interrupted server), not that the action succeeded.

### Vehicle installments

Accounting → Fleet installments records separate bank payables and driver receivables, each with its own amount and due date. Creation has no cash effect. Bank payments debit treasury; driver cash receipts credit it; driver wage offsets reduce available earnings without a treasury movement. Partial settlements, independent balances, request-key retries, period locks and overpayment protection apply. Driver settlements and exports show offsets separately from ordinary deductions; the overview shows both outstanding sides. Reporting uses actual transaction dates for new payments and preserves the previous treatment of historical paid installments. Legacy customer amounts are retained without inventing a driver assignment or payment.

### Custom roles and permissions

Open **الأدوار والصلاحيات** (`/roles`) to add a named role or edit the permissions of an existing default/custom role. Permission groups separate viewing, creation, editing, deletion, financial visibility, price changes, accounting posting, user administration, and the activity log. Required lookup permissions are selected automatically.

Choose the role when creating a user, or use **تغيير الدور** in Users. Company restrictions can be applied independently. Scoped accounts operate only on assigned-company records; global accounting, configuration changes, and access administration require all-company scope. New company/fleet master records require all-company scope because they do not yet have an assigned-company relationship.

The API checks stored permissions on every request. The UI refreshes access on focus and every 15 seconds; role reassignment ends existing sessions. Role and user access changes appear in the activity log. Administrators cannot grant permissions they do not hold or remove the last active, unscoped account able to manage both users and roles. Concurrent role edits use a revision check.

Apply migration `202610050010_custom_roles` with `npm run db:deploy`, then `npm run db:generate`. Default roles are initialized without changing their previous permissions when role management is first opened. Regression coverage, including custom/default role edits, live revocation, scoped dispatch, accounting view/post separation, audit history, and last-admin protection:

```bash
TEST_DATABASE_URL=postgresql://tms_local@127.0.0.1:55432/tms_roles_test npm --prefix server run test:roles
```

Treasury cash/bank balances, liquidity totals, statements, opening balances, transfers and adjustments are owner-only (`ADMIN`, unscoped), even for custom roles with all permissions. Other accounting users receive an account picker containing only IDs, names, kinds and currencies and may still post authorized receipts/payments. The server checks funds without disclosing available balances; treasury audit payloads are owner-only.

### Editable trip Excel import/export

In **التشغيل → استيراد / تصدير Excel**, select companies and an inclusive date range, then download an editable workbook. Keep trip IDs when editing; leave IDs and trip numbers blank for new trips. Upload the edited workbook, review column mappings and missing information, then preview and confirm. **Add/update** preserves missing rows; **Replace** deletes trips absent from the workbook only within the selected companies and dates, including manually entered trips. Empty-range deletion requires a separate opt-in. Trips outside the selected dates are skipped and counted.

XLSX, XLS and CSV are supported, with Arabic/English header aliases, manual column mapping, selectable worksheet/header row, Excel serial dates, Arabic digits, configurable day/month order and Cairo times (including overnight trips). Limits: 1 MB compressed file, 20 MB inflated XLSX contents, 1,000 trips, 100 columns and a 367-day date range. Paste formulas as values before upload. Each row must represent one outbound or return trip.

Missing companies require explicit selection before creation. Missing routes and direction rates are created from the row only when endpoints, times and all four prices are supplied. An explicit zero is valid; a blank price uses the existing route price. Existing driver/vehicle assignments must be resolved, because a name alone cannot provide identity and license data. Extra source columns are retained in finance-authorized exports; non-financial exports omit prices and arbitrary source metadata.

Import requires unscoped trip view/create/edit/delete, financial visibility, pricing and accounting management; creating missing companies/routes additionally requires their creation permissions. Every preview simulates the complete import and rolls back. Confirmation is actor-bound, expires after 30 minutes, rejects changed source records, and applies the batch atomically. Repeated confirmation is idempotent. The batch retains its input, before-snapshot and summary in `TripImportBatch` for database-level recovery; this is not an end-user undo button. Audit records identify who imported and the affected date/company scope.

Completed-trip accruals and running ledger balances are recalculated while cash receipts/payments remain intact. Changes to invoiced trips, trips with attendance/events, trips in progress, manually settled operation rows and closed financial periods are blocked. Wage reductions below amounts already paid or offset against installments are blocked for accounting review.

Deploy migration `202610060001_trip_excel`, regenerate Prisma and build before starting the updated server:

```sh
npm run db:deploy
npm run db:generate
npm run build
TEST_DATABASE_URL='postgresql://USER:PASSWORD@HOST:PORT/tms_roles_test' npm --prefix server run test:excel
```

The Excel suite uses a migrated database ending in `_test` and API port 5112. It covers preview rollback, permissions, actor binding, retry safety, workbook round trips, scoped replacement, cash preservation, stale previews, assignment conflicts, protected history, period locks and paid-driver protection. Uploaded business workbooks and local database files are not included in source control.
