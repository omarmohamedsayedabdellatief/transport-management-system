# Employee transportation system — improvement plan

Prepared 26 September 2026. This is a proposed implementation plan, not a claim that these features have been implemented or fully tested.

**Business scope confirmed by the owner**

The company transports employees for client businesses using cars, Hiace minibuses, and buses. Resources may be company-owned or supplied by external transport providers. Passengers may be employed directly by the client or by an external staffing company. Both forms of outsourcing are in scope.

The target is one connected workflow: client agreement → passenger demand → route and shift planning → dispatch → recorded service delivery → approved charges and costs → invoices and settlements → management reporting.

## 1. Current foundation and gaps

The reviewed code already provides clients, contracts, vehicles, drivers, routes and stops, trips, basic batch generation, maintenance, dashboard reports, Arabic/English UI, and three user roles. Accounting includes daily operations, overtime, expenses, payroll records, installments, client transactions, and imports tailored to the two supplied Excel workbooks. Startup, builds, admin login, and dashboard API were verified; the remaining workflows need end-to-end assessment.

| Area | Observed gap | Proposed change |
|---|---|---|
| Passengers | No passenger, enrollment, or attendance models in the current schema | Add employees, employer relationships, transport eligibility, route enrollment, and trip manifests |
| Outsourcing | No supplier organization or supplier agreement models | Track suppliers, resource ownership/employment, agreed service costs, and settlements |
| Assignments | Trips require the driver's permanent one-to-one vehicle pairing | Retain default pairings but introduce dated assignments, substitutions, and history |
| Scheduling | Batch generation exists, but takes one departure time across selected shifts | Add explicit shift schedules, outbound/return legs, service calendars, and previewable generation |
| Accounting links | Daily operations store driver, route, and company names as text | Link financial records to stable IDs and service evidence; preserve legacy source text |
| Permissions | Accounting routes authenticate users without the role checks present in other modules | Enforce action and record scope permissions on the server |
| Imports | Workbook-specific imports delete existing rows in several accounting tables | Add staging, validation, deduplication, reconciliation, and explicit approved replacement only where needed |
| History | Trip deletion is supported; contract deletion deletes its trips | Preserve completed/financially referenced activity through archival, cancellation, and corrections |
| Dispatch | Existing validation checks overlaps and some document/status rules | Add capacity, contract/route consistency, all required document checks, and concurrent-booking protection |

Source areas: `server/prisma/schema.prisma`, `server/src/modules/trips/`, `server/src/modules/contracts/`, `server/src/modules/accounting/`, and `server/src/modules/auth/`. These findings are a targeted review, not a complete security or accounting audit.

## 2. Business model to establish first

Keep the passenger's employer, the site receiving the transport service, the billed organization, and the transport supplier separate. They may be different organizations. One organization may hold multiple roles.

Example: Factory A receives transport services; some passengers work for Factory A and some for Staffing Company B. Transport Supplier C provides a Hiace and driver. The client agreement explicitly determines whether Factory A or Staffing Company B receives the invoice. Supplier C's payable is governed by a separate supplier agreement. Passenger employment must never automatically determine the payer.

Use actual seat capacity, make/model, and vehicle category rather than assuming every Hiace has the same capacity. Track vehicle owner, operating supplier, driver employer, and payment recipient separately where the business requires it. Supplier cost must not automatically be treated as the driver's personal wage.

Record effective dates for passenger employment, transport eligibility, assignments, and rates. Historical trips must retain the employer, provider, assignment, and applicable pricing context at the time of service.

## 3. People, organizations, and contracts

Add client sites/branches, contacts, staffing organizations, transport suppliers, passengers, and resource ownership. Passenger records need a client-scoped employee number, name, necessary contact information, employer, served site, shift, pickup/drop-off stop, and active transport dates. Avoid collecting unnecessary identity or home-address data.

Allow bulk passenger enrollment, temporary suspensions, site transfers, shift changes, route changes, and date-specific exceptions. Preserve history when an employee moves employer or client site.

Expand client contracts into service lines for site, route, direction, shift, required capacity, service calendar, pricing unit, effective dates, payment terms, and service requirements. Support agreed monthly, daily, trip, distance, or passenger-based rates without implementing a formula until its exact business meaning is confirmed. Add extra-trip, waiting, cancellation, and replacement rules when applicable.

Create separate supplier agreements and rates. Identify who supplies the driver, fuel, maintenance, insurance, and replacement vehicle. Include subcontracted driver-only, vehicle-only, and combined services where used.

## 4. Planning and dispatch

Create reusable schedules with operating weekdays, holidays, seasonal exceptions, separate shift times, outbound and return legs, overnight trips, and site time zones. Use a preview before generating trips, display conflicts and skipped rows, and ensure repeating the same generation request cannot duplicate trips.

Build a dispatcher board organized by date, client/site, shift, and status. Each trip should expose its route, stops, planned passenger count, capacity, driver, vehicle, supplier, readiness issues, and actual progress. Highlight unassigned, late, cancelled, and blocked trips.

Default driver–vehicle pairings should speed up planning while allowing authorized temporary substitutions. Track who changed an assignment, when, why, and which trip legs were affected. A breakdown replacement must preserve the original record and service history.

Before dispatch, validate overlapping assignments, configurable turnaround/travel time, capacity, driver availability, required documents, vehicle condition, contract validity, and consistency among client, contract, site, and route. Recheck when assigning, editing, and dispatching. Protect against simultaneous requests booking the same resource.

Define allowed trip transitions and separate scheduled times from actual times. Record delays, cancellations, incidents, extra distance, substitutions, and evidence of completion. Changes to completed trips require traceable corrections.

## 5. Passenger and driver experience

Generate a dated passenger manifest from valid enrollments, with stop order and pickup/drop-off information. Support outbound and return attendance separately, boarded/no-show/cancelled states, temporary passengers, and manual corrections with reasons. Define whether capacity is reserved by enrollment or confirmed per trip; never silently overbook.

Provide a mobile-friendly driver view showing only assigned trips and the minimum passenger information needed. Drivers acknowledge work, start/complete trips, record attendance, and report incidents. Provide manual attendance first; add QR check-in if it helps real operations. QR payloads should use opaque IDs rather than passenger personal details.

Provide a client coordinator portal scoped to that client's authorized sites. It can expose schedules, passenger rosters, attendance, exceptions, service approval, and invoices according to permissions. Staffing coordinators see only their authorized passenger group and service context. Supplier coordinators see their own resources, jobs, and statements. These portals can follow the internal operational pilot.

## 6. Connected finance

Link approved service records to charge items and supplier/driver cost items. Store the rate version, quantity, source, approval, and calculation breakdown. Monthly fixed contracts must follow their agreed billing period rules; they must not create a full monthly charge for every completed trip.

Separate operational completion, client service approval, invoice approval, and payment recording. Generate draft invoices with supporting trip statements; provide invoice numbering, credit/correction documents, partial payments, allocations, outstanding balances, and disputes. Prevent duplicate billing of the same approved charge.

Create supplier statements and driver settlements from approved cost items, keeping supplier invoices, driver earnings, advances, deductions, and actual payments distinct. Prevent duplicate settlement or counting the same overtime/cost from both manual entries and generated records.

Use precise decimal calculations, explicit rounding, effective-dated rates, currency, and a clear approval trail. Tax settings and accounting treatment must be confirmed by the company's accountant; the existing code's default percentage is not an approved business rule. Treat statutory filing or government integrations as separate requirements after jurisdiction is confirmed.

Support receipt attachments, fuel/toll/maintenance costs, expense approvals, and contract/route/vehicle cost allocation. Show direct contribution and allocated operating results distinctly, with the allocation method visible. Reconcile historical Excel totals before relying on migrated reports.

Use the transport system as the source for operational billing and settlements. Decide separately whether statutory books will live in an existing accounting system or require a later general-ledger module. Do not label the current spreadsheet-style reports a complete accounting system.

## 7. Maintenance, controls, and reporting

Extend maintenance to date/mileage reminders, work orders, downtime, costs, attachments, and release checks. Store document metadata and protected files with expiry alerts. Ensure overlapping maintenance jobs and trip assignments cannot incorrectly release an unavailable vehicle.

Provide roles for administrator, operations manager, dispatcher, fleet manager, accountant, approver, driver, client coordinator, supplier coordinator, and scoped viewer as needed. Permissions must cover both actions and accessible clients/sites/suppliers; hiding a UI button is insufficient. Financial exports and passenger contact data need the same controls as normal screens.

Improve session revocation, disabled-user enforcement, login abuse protection, configuration validation, audit trails, secure file access, backups, restoration, and error monitoring. Public deployment must use production configuration rather than the local demo credentials and setup.

Define each KPI before building charts: delivered vs scheduled trips, on-time arrivals under the agreed tolerance, passengers boarded vs expected, no-shows, peak occupied seats vs capacity, vehicle downtime, expiring documents, supplier fulfillment, approved/unbilled service, overdue invoices, and contract contribution. Filters should include client, site, staffing employer, supplier, route, and period where relevant. Show data freshness and incomplete records.

Prioritize an Arabic-first dispatcher workflow, consistent English support, fast search, saved filters, bulk actions, clear validation, useful empty states, and mobile layouts. Each role should land on its relevant work queue.

## 8. Implementation approach

Keep the current React/TypeScript, Express, PostgreSQL, and Prisma foundation. Organize it into modules for organizations, passengers, fleet, schedules, dispatch, service evidence, billing, settlements, and reporting. Use shared validation and explicit business services; split the large accounting service as its workflows are changed.

Proposed data groups include Organization/OrganizationRole/Site; Passenger/Employment/TransportEnrollment; SupplierAgreement/RateVersion; Schedule/ServiceCalendar; ResourceAssignment/AssignmentHistory; TripManifest/Attendance/TripEvent; Charge/Cost/Invoice/PaymentAllocation/Settlement; AuditEvent/ImportBatch/ImportRow. Final names and relations belong in a reviewed schema design, not an immediate wholesale rewrite.

Extend existing tables through versioned migrations. Backfill references and flag ambiguous name matches for review. Preserve legacy labels and source rows. Take backups and verify reconciliation before enforcing new required fields. Do not overwrite operational data to make a migration succeed.

Introduce background processing when recurring generation, imports, reminders, or reports require it. Jobs need retry safety and visible status. Keep live GPS, automated optimization, and external messaging behind separate integration boundaries so daily operations do not depend on them.

## 9. Delivery phases and acceptance gates

| Phase | Work and dependencies | Completion gate |
|---|---|---|
| 0 — Business rules and baseline | Review a real contract, supplier agreement, passenger roster, shift sheet, and anonymized invoice/settlement; document payer rules, calendars, roles, volumes, and current defects | Approved workflow examples and backlog; reproducible local setup; agreed pilot scope |
| 1 — Data and access foundation | Add organization/site/employer/supplier relationships; permissions; migrations; audit events; safe import staging; protect history | Supplier/employer/payer distinctions work; viewer cannot mutate accounting; migration and restore demonstrated |
| 2 — Passengers and transport demand | Passenger records, employment, eligibility, enrollments, stops, bulk preview/import, manifests, capacity checks | A mixed direct/staffing passenger roster is assigned to outbound and return trips without duplicate identities or overbooking |
| 3 — Daily operation | Service calendars, shift-specific trip generation, dispatch board, flexible assignments, attendance, mobile driver view, incidents | Run a representative service week including overnight trips, absences, duplicate-generation retries, and breakdown replacements; verify concurrent-booking rejection |
| 4 — Commercial close | Versioned client/supplier rates, approved charges/costs, invoices, statements, settlements, receipts, payment allocations, reconciliation | One billing period reconciles from delivered service to invoices, supplier/driver amounts, and recorded payments; duplicate billing is blocked |
| 5 — Production pilot | Monitoring, backups/restore drill, deployment procedures, user training, realistic load testing, scoped client/supplier portal if required for approvals | Pilot one client/site and a small mix of owned/outsourced vehicles through operations and financial close; resolve release-blocking issues before expansion |
| 6 — Expansion | More clients/sites, richer portals, notifications, GPS, route optimization, passenger self-service, accounting integrations where justified | Each addition has a business owner, measurable benefit, privacy/access rules, and independently verified integration |

Dependencies are primarily sequential: finance depends on stable identities, contracts, and reliable service evidence. Security and migration checks accompany every phase. Detailed estimates should follow Phase 0 and the agreed team capacity; this roadmap is not a delivery-date commitment.

## 10. Essential verification scenarios

1. Direct and staffing-company passengers ride the same trip; employer changes do not rewrite history or accidentally change the billed party.
2. An outsourced vehicle/driver can be replaced with an owned vehicle/driver; original evidence and the correct payable recipient remain visible.
3. Simultaneous dispatch requests cannot double-book a driver or vehicle; identical generation retries do not duplicate trips.
4. Shift calendars handle weekends, holidays, midnight crossings, and Cairo daylight-saving changes; outbound and return attendance remain independent.
5. Expired required documents, maintenance blocks, mismatched contracts/routes, and excess passenger capacity prevent dispatch with clear reasons.
6. A client cannot see another client's passengers or invoices; a supplier cannot see other suppliers' rates; a viewer cannot write or import accounting data.
7. Fixed monthly and per-trip contracts produce the agreed charges; rate changes do not rewrite approved historical charges; retries cannot duplicate invoices or settlements.
8. Partial payments, disputed service, corrections, overtime, advances, and expenses reconcile without duplicate cost or payment records.
9. Import previews identify invalid dates, ambiguous names, duplicates, and totals; failed imports preserve existing data and produce a recoverable result.
10. A backup restores into a clean environment, and a representative pilot workload meets agreed response-time and recovery targets.

## 11. Decisions to settle during Phase 0

Confirm owned and outsourced fleet size; daily passenger/trip volumes; number of clients/sites; actual pricing units; who pays for staffing passengers; handling of fuel and supplier replacements; whether attendance is mandatory; who approves completed service; invoicing/accounting ownership; operating geography/time zones; expected offline use; and required notification channels.

The first implementation milestone should be **safe identities and permissions plus one complete passenger-to-trip workflow**, followed by dispatch and the financial close. Success means staff can trace who traveled, for whom, with which resources, what was delivered, what is owed, and what was paid without re-entering the same activity in disconnected records.
