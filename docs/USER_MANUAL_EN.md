# On Time user manual

Open **Start here & help** in the sidebar for the guided setup checklist and searchable answers. Switch Arabic/English using the language button. Lemonada is used throughout the interface.

## First-time setup

1. Add the client receiving transportation, its sites, and its contract. Automated billing supports monthly fixed or per-trip pricing.
2. Add vehicles with actual seat capacity and current documents; add drivers and their licenses.
3. Add transport suppliers and staffing employers under Partners. Link outsourced vehicles/drivers to suppliers in Workspace settings.
4. Create client routes with ordered stops.
5. Add passengers, their receiving client, and optional staffing employer. The employer and invoice recipient are separate concepts. Configure a different payer on the contract in Workspace settings if necessary.
6. Enroll each passenger by route, stop, shift, direction, and effective dates.

## Passenger import

Download the CSV template from Passengers → Import CSV. Keep headers `employeeCode,fullName,phone`. Select the client and optional staffing employer. Upload, validate, fix errors, then import. Maximum: 2,000 rows and 1 MB. Existing employee numbers for that client are skipped. No existing data is replaced.

## Schedule wizard

Step 1 selects the service: name, contract, route, direction, and shift. Step 2 selects the vehicle, driver, and optional transport supplier. Step 3 sets local departure time, duration, weekdays, excluded holiday dates, date range, and rates. Dates must fall within the contract. Excluded dates use comma-separated `YYYY-MM-DD` values.

Create separate outbound and return schedules. The default time zone is Africa/Cairo. The system handles UTC conversion and rejects ambiguous/nonexistent daylight-saving times instead of guessing. The supplier trip cost is a payment to the provider, not necessarily a driver's wage.

After saving, select Generate, choose up to 91 days, preview, and create ready trips. Blocked days include a reason. Repeating generation does not duplicate existing trips.

## Dispatch and attendance

Open Dispatch, choose the date, and open a trip. Review the manifest. If enrollments changed after generation, refresh the passenger list before starting. Start the trip, record every passenger as Boarded, No show, or Cancelled, and complete it. Expected/unrecorded attendance blocks completion.

Scheduled trips may be delayed or cancelled with a reason. Before departure, use Replace resources for substitutions. During an active trip, Pause / breakdown records the problem and allows reassignment before resuming. The original departure and assignment history remain recorded. The replacement must have sufficient capacity; confirm its supplier and agreed cost.

Read readiness errors: overlapping assignments include a 20-minute buffer, expired documents block dispatch, open maintenance prevents use, contracts must be valid, and passenger counts cannot exceed seats.

## Billing and settlement

Administrators and accountants can prepare a draft invoice or supplier settlement for a company and service month. Only completed, unbilled service with a positive rate is included. Per-trip rates and monthly values are saved on generated trips. Monthly fixed contracts bill once per contract/month when completed service exists; there is no automatic proration or zero-service monthly charge. Conflicting monthly payer/rate snapshots require review.

Review the draft, then issue it. Drafts may be discarded and regenerated. Issued documents are locked and visible to the authorized company portal. Print / Save PDF uses the browser's print facility. Credit notes, refunds, statutory tax processing, and post-issue corrections are not implemented in this release.

Record actual receipts/payments with the date, reference, and amount. Partial payments reduce the balance; overpayments are rejected. Payment retries with the same request key cannot duplicate a payment. Recording a payment does not initiate a bank transfer.

## Expenses, payroll, and installments

Record expense categories, amounts, dates, site/vehicle references, and receipt notes. Payroll calculates basic salary plus overtime less deductions, advances, and penalties; negative net pay is rejected. Installments track assets, due dates, amounts, and recorded payment status. CSV exports are available. Do not duplicate supplier trip costs as additional payroll/expenses. These are operational records, not statutory books or automatic disbursements.

## Access and history

Administrators manage users and scopes. Operations managers manage transport. Accountants change financial records. Viewers are read-only. Drivers see assigned trips and record attendance. Clients see their authorized trips and issued invoices. Suppliers see their jobs and issued settlements. Configure external account scope in Workspace settings before giving users access.

Access changes end existing sessions; disabling an account blocks previously issued access tokens. Preserve records with history by deactivating them instead of deleting them. New workflow changes are recorded in the activity log. Historical manifests retain passenger/employer labels even after current details change.

## Daily routine

Morning: review readiness and unassigned/blocked work; check passenger changes; generate or review the day's trips. During service: update departure, attendance, incidents, and completion. End of day: check incomplete trips and missing attendance. At period close: reconcile completed service, prepare documents, approve them, and record payments. Start with a limited client/fleet pilot and reconcile against real source records before wider rollout.

## Navigation and phones

The top bar shows your current page and lets you search destinations by name. The profile button contains your account, user guide and sign-out. On phones, use the bottom bar for frequent pages and the menu for the full workspace. Operational records stack as labelled cards; the navigation stays in place while content scrolls.

After a trip first departs, its passenger list stays locked even during a breakdown. Recorded attendance and the original departure time survive a pause and replacement. An inactive supplier or changed resource ownership blocks dispatch until corrected. Routes, sites and contracts cannot be moved to another client while linked records would become inconsistent.

Future scheduled maintenance blocks conflicting trips. Pause an active trip before starting maintenance. Closing one job does not release a vehicle with another current open job. Only scheduled maintenance can be removed; started and completed service history is retained.

## Dashboard, demo walkthrough, and charts

Home starts with today's trips and next actions. Select a trip to open its passenger list directly; the delayed-trip link opens Dispatch with that filter applied. Setup cards link the four stages of work. Their checkmarks indicate existing records, not complete operational readiness.

Records marked **DEMO** or **تجريبي** are fictional. The additive showcase contains 3 companies, 48 passengers (including staffing-company employees), 4 vehicles/drivers/routes, 8 outbound/return schedules, and 288 trips across the previous 29 days, today, and the next 6 days. It includes supplier-owned resources, completed maintenance and draft, issued, partially paid and paid financial examples. Earlier illustrative records remain present.

Try a demo trip: open it from Home, start and confirm, record absences individually, then use **Mark remaining as boarded** only when every remaining passenger is on board. Confirm, review the count, then complete the trip. Previously recorded attendance is preserved. In Billing, filter client invoices versus supplier dues and select a status; Export uses those two filters. Review a draft before issuing, and record payments only for actual demo transactions when practising.

Reports supports 7, 30 and 90 days ending today in Cairo. Service activity compares completed trips with all dated trips, including cancellations. On-time means departure within 5 minutes of schedule among completed trips with recorded departure times. Attendance is boarded journeys divided by boarded plus no-show journeys on completed trips, not unique people. Cash charts show actual invoice receipts and supplier payments; these are not profit. Passenger mix is the current active population, independent of report dates. No denominator displays as **—**. Open **View chart data** for exact daily values and use CSV export to review them elsewhere. Demo records are included and labelled in the report notice.

To add or refresh the local showcase, run `npm run demo:showcase`. It refuses production mode, uses stable IDs, preserves edits to existing records and passwords, and does not clear data. Repeating it for the same day does not duplicate records. Running on a later day adds missing dated trips; it does not reset existing trip states or extend previously edited contracts automatically.

## Company banks, cash treasury and client statements

**Accounts & treasury (`/treasury`)** holds the transport company's bank and cash accounts in EGP. Clients have separate receivable statements; they do not own your treasury accounts. An administrator creates accounts with an opening date and non-negative opening balance. Choose a cutover date and reconcile the balance before recording historical activity; do not include the same receipt or cost both in opening funds and later movements.

Every new invoice receipt requires a receiving account. Supplier payments require a source account. The invoice payment and treasury entry are committed together, so a failure changes neither. Overpayments, insufficient funds, future dates, dates before account opening, mismatched retries and backdated withdrawals that would create a negative balance are rejected.

On Expenses & payroll, save the cost first, then choose **Pay from treasury** to deduct its full amount once. A paid cost is locked. Installments become Paid through this action; previously paid legacy installments cannot be paid again. Cost payments currently support full settlement only. Receipts and supplier invoice payments support partial settlement.

Transfers debit one company account and credit another atomically; they do not affect company-wide cash or customer balances. An administrator can make a dated balance adjustment with a reference and explanation. Movements cannot be edited/deleted. Archive only zero-balance accounts; archived accounts retain history and cannot receive new movements. These are bookkeeping records, not connections that move money at a bank.

**Historical payments** lists existing invoice payments without an account. They already count as paid on client statements. Admin allocation adds only a treasury entry using the original date and amount. Allocate only when the movement was excluded from the opening balance; otherwise reconcile at cutover and leave it unallocated. Do not invent bank assignments for old records.

**Client statements** shows issued invoices, receipts and outstanding balances by invoice recipient. Open a company to print/save PDF or export invoice rows. Receipt rows identify the receiving account or explicitly say Not allocated. Drafts and void documents are excluded. Reports cash charts continue to show invoice receipts and supplier payments, not opening balances, transfers, adjustments or cost payments. Review the treasury movement ledger for those items.

Currency is EGP only. Customer advances, refunds, credit notes, bank-feed reconciliation, historical client opening-balance import, and a statutory general ledger are not implemented. Reviewed treasury corrections do not reverse or change issued documents.
