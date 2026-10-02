# Verification — 26 September 2026

- Server TypeScript build and frontend production build passed.
- Seventeen Node test results passed against a separate PostgreSQL database (`tms_operations_test`). Coverage includes a complete API workflow and calendar validation, including eleven original workflow groups and three showcase/reporting/attendance groups.
- Verified direct and staffing-company passengers, safe CSV previews/imports, duplicate enrollment rejection, capacity enforcement, and idempotent generation.
- Simultaneous conflicting generation requests created exactly one trip; the other was blocked.
- Verified driver/client/supplier scopes, hidden financial fields, historical employer snapshots, required attendance, and allowed trip transitions.
- Verified draft/issued documents, monthly rate snapshots, separate payer, supplier settlements, duplicate billing prevention, partial payments, retry protection, and overpayment rejection.
- Verified expense/payroll/installment validation and finance permissions, suspended users, and session invalidation after access changes.
- Browser verified Arabic and English help, search, three-step schedule form, and preview/create of one illustrative trip with four passengers.
- Responsive browser checks: 320 × 740, 375 × 812, and 1440 × 900. All 20 workspace destinations were checked at phone widths, with no document/workspace horizontal overflow. Operational records stack as labelled cards; retained fleet tables scroll within their containers.
- Desktop sidebar measured top=0 and height=900 before and after main content scrolled 443.5 px. All four metric cards shared the same top position and 175.4 px height at that viewport.
- Verified header destination search, mobile bottom navigation, notification panel/Escape, custom logo loading and successful sign-in through the redesigned form.
- Verified required schedule fields on mobile and a server-rejected invalid contract date showing its error inside the edit dialog; the saved contract remained unchanged.
- New checks cover linked route/site/contract edits, expired documents, unavailable drivers, maintenance periods, supplier revalidation, pause/replacement attendance preservation, and multiple maintenance jobs.
- Removed invented registration defaults and added validation feedback to retained fleet forms. Added the missing per-trip pricing selector, EGP labels, and cache clearing on account changes.
- Client lint exits successfully; remaining warnings concern mixed component/helper exports for hot reload and unused imports in the inactive legacy accounting page. Production build reports a non-blocking bundle-size advisory.
- Lemonada verified as the computed body font. Mobile navigation opens with focus inside the drawer and closes with Escape, returning focus to its trigger.
- PostgreSQL backup restored into `tms_restore_test`; passenger, schedule, user, and migration counts matched the source at backup time.
- Root development launcher started successfully. Frontend returned HTTP 200; `/ready` returned ready.

Additional checks for the simplified dashboard and seeded showcase:

- Additive seeding verified twice in the isolated test database: 288 demo trips and 48 demo passengers, unchanged passwords, preserved user edits, no duplicates, balanced demo document lines/payments.
- Analytics checked against database totals for 7, 30 and 90 days, including departures, attendance, receipts, payments and passenger mix. External portal access is rejected.
- Bulk boarding requires confirmation, an active trip and scoped access. Mixed invalid IDs cause no partial changes; existing attendance remains unchanged, and completed trips reject attendance changes.
- Browser completed a fictional 12-passenger trip through start, bulk boarding and completion on a 375px phone layout. Dashboard drill-down and report period selection worked; the 7-day raw table contained seven rows.
- Charts are loaded in a separate bundle. Desktop and mobile cards and chart layout were visually reviewed.

The container deployment path was prepared but not executed because Docker is unavailable on this host. GPS, messages, statutory accounting/tax integrations, credit notes/refunds, and other release boundaries are documented in README.md and OPERATIONS.md. This verification does not certify those unimplemented integrations or a public production deployment.

## Treasury addition

24 test results pass, including six new treasury groups and their parent result. Coverage includes admin-only account creation, opening dates/amount precision, mandatory account routing, invoice/treasury atomicity, strict payment retries, balanced transfers, concurrent overdrafts, historical dates, supplier outflows, locked paid expenses/payroll/installments, disabled legacy accounting mutations, historical allocation, adjustments and zero-balance archiving. The migration was deployed to both local and dedicated test databases after a local backup.

Browser verified creation of two clearly labelled DEMO bank/cash accounts, a 500 EGP transfer, a 250 EGP demo invoice receipt into the chosen bank, updated customer totals and a 375px client statement. These are fictional records, not real bank transactions. Printable invoice/statement tables include every row rather than only the visible pagination page.
