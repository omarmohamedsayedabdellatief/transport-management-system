from pathlib import Path
from math import atan2, cos, sin
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, Color, white
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/pdf/on-time-system-workflows.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
W,H=landscape(A4)
INK='#203B43'; TEAL='#177C70'; BLUE='#547AA5'; GOLD='#AF7323'; MUTED='#526972'; BORDER='#D9E4E5'; BG='#F5F8F8'; MINT='#E8F4EF'; SKY='#EDF3FB'; AMBER='#FFF4DE'; RED='#A7483F'; ROSE='#FCEEEB'
c=canvas.Canvas(str(OUT),pagesize=(W,H))
c.setTitle('On Time | System Workflow Guide & Verification')
c.setAuthor('On Time project documentation')
c.setSubject('Implemented workflows, decision paths, testing evidence and release boundaries')
PAGE=0

def text(x,y,w,s,size=10.5,color=INK,bold=False,align=0,maxh=None):
    style=ParagraphStyle('p',fontName='Helvetica-Bold' if bold else 'Helvetica',fontSize=size,leading=size*1.38,textColor=HexColor(color),alignment=align,spaceAfter=0)
    p=Paragraph(s,style); _,hh=p.wrap(w,1000)
    if maxh is not None and hh>maxh+0.1: raise ValueError(f'Overflow {hh}>{maxh}: {s}')
    p.drawOn(c,x,H-y-hh)
    return hh

def rect(x,y,w,h,fill='#FFFFFF',stroke=BORDER,r=11):
    c.setFillColor(HexColor(fill)); c.setStrokeColor(HexColor(stroke)); c.setLineWidth(.8)
    c.roundRect(x,H-y-h,w,h,r,fill=1,stroke=1)

def node(x,y,w,h,title,body='',fill=MINT):
    rect(x,y,w,h,fill)
    th=text(x+12,y+11,w-24,title,11,bold=True,align=TA_CENTER,maxh=h-18)
    if body: text(x+12,y+14+th,w-24,body,9.4,color=MUTED,align=TA_CENTER,maxh=h-22-th)

def diamond(x,y,w,h,title):
    c.setFillColor(HexColor(AMBER)); c.setStrokeColor(HexColor('#E2C994')); c.setLineWidth(.9)
    p=c.beginPath(); p.moveTo(x+w/2,H-y); p.lineTo(x+w,H-y-h/2); p.lineTo(x+w/2,H-y-h); p.lineTo(x,H-y-h/2); p.close(); c.drawPath(p,fill=1,stroke=1)
    text(x+w*.19,y+h*.30,w*.62,title,10.2,bold=True,align=TA_CENTER,maxh=h*.5)

def arrow(points,label=None,lx=0,ly=0,lw=85,color=TEAL,dashed=False):
    c.setStrokeColor(HexColor(color)); c.setFillColor(HexColor(color)); c.setLineWidth(1.4)
    if dashed:c.setDash(4,3)
    p=c.beginPath();p.moveTo(points[0][0],H-points[0][1])
    for x,y in points[1:]: p.lineTo(x,H-y)
    c.drawPath(p);c.setDash()
    x,y=points[-1];px,py=points[-2];a=atan2(y-py,x-px)
    q=c.beginPath(); q.moveTo(x,H-y)
    q.lineTo(x-6*cos(a-.45),H-(y-6*sin(a-.45)))
    q.lineTo(x-6*cos(a+.45),H-(y-6*sin(a+.45)));q.close();c.drawPath(q,fill=1,stroke=0)
    if label:text(lx,ly,lw,label,8.7,color=color,bold=True,align=TA_CENTER)

def panel(x,y,w,h,title,body,fill='#FFFFFF'):
    rect(x,y,w,h,fill)
    text(x+15,y+13,w-30,title,11.5,bold=True)
    text(x+15,y+39,w-30,body,10.2,maxh=h-50)

def page(kicker,title,sub):
    global PAGE
    PAGE+=1
    c.setFillColor(HexColor(BG));c.rect(0,0,W,H,fill=1,stroke=0)
    c.setFillColor(HexColor(TEAL));c.rect(0,H-6,W,6,fill=1,stroke=0)
    logo=ROOT/'client/public/brand/on-time-mark.png'
    c.drawImage(str(logo),36,H-64,width=40,height=40,mask='auto',preserveAspectRatio=True)
    text(88,23,590,'ON TIME  /  '+kicker.upper(),9,color=TEAL,bold=True)
    text(88,41,690,title,23,bold=True)
    text(36,88,768,sub,10.5,color=MUTED,maxh=32)
    c.setStrokeColor(HexColor(BORDER));c.line(36,43,W-36,43)
    text(36,H-31,630,'LOCAL OPERATIONAL RELEASE  |  Verified 26 September 2026  |  English guide',8,color=MUTED)
    text(W-100,H-31,64,f'{PAGE:02d} / 11',8,color=MUTED,align=2)

def done(): c.showPage()

# 1
page('Start here','How the whole system works','A practical map for an employee-transport company serving client businesses, including outsourced people and transport resources.')
panel(36,130,770,81,'Are all flows working?', '<b>The core implemented flows pass the current checks.</b> A fresh API/database run returned 24 test results with zero failures (including group results). This verifies the tested paths; it is not proof that every real-world case or production integration is complete.',MINT)
xs=[36,302,568]
for i,(title,body) in enumerate([('1  Set up the business','Clients, contracts, sites, fleet and partners'),('2  Register & assign people','Passengers, employers, routes and enrollments'),('3  Plan dated service','Schedules, readiness checks and trip generation')]):node(xs[i],235,238,79,title,body)
arrow([(274,274),(302,274)]);arrow([(540,274),(568,274)])
arrow([(687,314),(687,343)])
for x,title,body in [(568,'4  Run the trips','Start, attendance, incidents and completion'),(302,'5  Bill & settle','Client invoices, supplier dues and actual payments'),(36,'6  Review the business','Reports, outstanding balances and service quality')]:node(x,343,238,79,title,body,SKY)
arrow([(568,382),(540,382)]);arrow([(302,382),(274,382)])
text(36,444,490,'<b>Two different kinds of outsourcing</b><br/>Staffing companies employ passengers. Transport suppliers provide vehicles or drivers. These are separate relationships in the system.',10.5)
text(553,444,253,'<b>Diagram key</b><br/>Rounded box: action or state<br/>Diamond: decision/check<br/>Amber box: review or exception',10)
done()

# 2
page('Business relationships','Who receives the service, who employs, who pays','Create these records before planning daily trips. A passenger employer is not automatically the invoice recipient.')
node(36,139,225,86,'Client company','The company whose employees receive transport')
node(308,139,225,86,'Service contract','Dates, monthly or per-trip pricing; optional separate payer')
node(580,139,225,86,'Invoice recipient','Client by default, or the payer configured on the contract',SKY)
arrow([(261,182),(308,182)]);arrow([(533,182),(580,182)])
node(36,276,225,86,'Passenger + work site','Link to the receiving client; add the destination site')
node(308,276,225,86,'Employer relationship','Direct employee, or a separate staffing-company partner',SKY)
arrow([(148,225),(148,276)],'receives service',156,238,125)
arrow([(308,319),(261,319)])
node(580,276,225,86,'Transport supplier','Link outsourced vehicles/drivers and agree a schedule cost',AMBER)
node(580,410,225,71,'Supplier settlement','Completed supplied trips create supplier dues',SKY)
arrow([(692,362),(692,410)],'transport cost',699,376,97)
panel(36,397,497,110,'Example', 'A factory receives transport. Some passengers work for a staffing agency. Your own bus and an external supplier bus can serve the factory. The contract determines the invoice recipient; the supplier receives a separate settlement.')
text(580,494,225,'A partner may be Staffing, Transport or Both. Supplier terms currently use notes and schedule costs.',9,color=MUTED)
done()

# 3
page('People and route setup','From a passenger record to a trip manifest','Owner: administrator or operations manager. Passengers become eligible through a matching active enrollment.')
node(36,145,205,73,'Add manually','Select client, optional employer and site')
node(36,258,205,85,'Or import CSV','Template: employeeCode, fullName, phone. Select client/employer; preview first.',SKY)
node(298,201,207,89,'Validate & save','Fix invalid rows; existing employee codes for that client are skipped')
arrow([(241,182),(269,182),(269,246),(298,246)]);arrow([(241,300),(269,300),(269,246)])
node(562,201,243,89,'Enroll on a route','Stop, shift, outbound/return/both and effective dates')
arrow([(505,246),(562,246)])
node(562,350,243,85,'Generated passenger list','Active passenger + active enrollment matching route, shift, direction and date',SKY)
arrow([(683,290),(683,350)])
panel(36,383,469,127,'Rules that prevent the wrong people being assigned', 'Routes and sites belong to a receiving client. Enrollments must remain consistent with that client and the route stops. Duplicate or conflicting enrollment is rejected. Import is additive; it does not replace existing data. CSV limit: 2,000 rows / 1 MB.')
text(562,455,243,'<b>Before first departure:</b> refresh the passenger list if enrollments changed.<br/><b>After first departure:</b> keep the manifest locked, including during a breakdown.',10)
done()

# 4
page('Scheduling and generation','Turn a repeating plan into dated trips','Owner: administrator or operations manager. Use a separate schedule for each direction and shift.')
node(36,135,230,81,'1  Service','Contract + route + direction + shift')
node(306,135,230,81,'2  Resources','Vehicle + driver + optional supplier; actual seat capacity')
node(576,135,230,81,'3  Calendar & price','Local time, duration, weekdays, exclusions, dates and rates')
arrow([(266,175),(306,175)]);arrow([(536,175),(576,175)])
node(576,247,230,72,'Save, then Generate','Choose up to 91 days and preview',SKY)
arrow([(691,216),(691,247)])
diamond(326,245,186,96,'Ready for this date?')
arrow([(576,283),(512,283)])
node(36,253,230,80,'Create ready trips','Save the dated assignment, manifest and billing snapshots')
arrow([(326,292),(266,292)],'Yes',275,271,43)
node(306,397,260,84,'Fix the reported issue','Correct source records, then preview again',AMBER)
arrow([(419,341),(419,397)],'No',431,357,30)
arrow([(566,439),(820,439),(820,282),(806,282)],'preview again',685,421,110,color=GOLD,dashed=True)
text(36,371,230,'<b>Readiness checks</b><br/>Contract and resource availability<br/>Valid vehicle/driver documents<br/>Maintenance overlap<br/>Passenger count within seats<br/>Assignment overlap + 20-minute buffer',10.1)
text(601,347,194,'<b>Repeat safely</b><br/>A plan/date already generated is not duplicated. Non-operating and excluded dates are skipped.',10.2)
text(306,494,496,'Default zone: Africa/Cairo. Invalid or ambiguous daylight-saving times are rejected rather than guessed.',9.5,color=MUTED)
done()

# 5
page('Dispatch and attendance','Operate the trip and handle exceptions','Owners: operations team or the assigned driver. Resource replacement belongs to the operations team.')
node(36,141,190,71,'SCHEDULED','Review resources and manifest')
node(300,141,208,71,'IN PROGRESS','Start after readiness checks')
node(591,141,214,71,'Record attendance','Boarded / No show / Cancelled')
arrow([(226,176),(300,176)],'Start',238,155,48);arrow([(508,176),(591,176)])
diamond(610,244,177,92,'All statuses recorded?')
arrow([(698,212),(698,244)])
node(591,389,214,69,'COMPLETED','Save arrival; eligible for billing',SKY)
arrow([(699,336),(699,389)],'Yes',710,351,37)
arrow([(787,290),(820,290),(820,176),(805,176)],'No',787,219,31,color=GOLD)
node(300,286,208,83,'DELAYED / PAUSED','Enter the delay or breakdown reason',AMBER)
arrow([(404,212),(404,286)],'Pause',414,244,47)
arrow([(300,316),(270,316),(270,193),(300,193)],'Resume',195,240,65,color=BLUE)
node(36,286,190,83,'CANCELLED','Reason required; no ordinary reopen',ROSE)
arrow([(131,212),(131,286)],'Cancel',141,239,48,color=RED)
arrow([(300,344),(226,344)],'Cancel',236,324,54,color=RED)
panel(36,399,472,113,'Breakdown and fast attendance', '<b>Breakdown:</b> pause, replace resources if needed, check capacity/supplier cost, then resume. Original departure and recorded attendance remain.<br/><b>Fast boarding:</b> record exceptions first; confirm that all remaining passengers are on board. Existing statuses are preserved.')
text(591,476,214,'Completion is blocked while any passenger is still Expected. Completed trips cannot be reopened through normal dispatch.',9.5,color=MUTED)
done()

# 6
page('Client billing and supplier dues','From completed service to a settled balance','Owner: administrator or accountant. Recording a payment is a ledger entry; it does not transfer money through a bank.')
node(36,137,225,94,'Client invoice','Choose payer + month. Completed, unbilled service with positive rates.')
node(36,273,225,94,'Supplier settlement','Choose supplier + month. Completed, unbilled supplied trips and costs.',SKY)
node(314,205,198,78,'DRAFT','Review the generated lines and total')
arrow([(261,183),(286,183),(286,244),(314,244)]);arrow([(261,320),(286,320),(286,244)])
node(578,205,227,78,'ISSUED','Approve and lock the document')
arrow([(512,244),(578,244)],'Issue',524,223,44)
node(314,321,198,73,'VOID DRAFT','Discard before issue; lines can be prepared again',AMBER)
arrow([(413,283),(413,321)])
node(578,332,227,81,'Record receipt/payment','Select bank/cash account, amount, date and reference. Do not exceed the balance.')
arrow([(692,283),(692,332)])
node(578,463,227,53,'PAID','Reached only at zero balance',SKY)
arrow([(692,413),(692,463)],'Fully settled',705,430,92)
arrow([(805,373),(821,373),(821,244),(805,244)],color=BLUE,dashed=True)
text(568,299,114,'Partial: stays Issued',8.7,color=BLUE)
panel(36,405,476,118,'Pricing and controls', '<b>Per trip:</b> use saved trip sale rates. <b>Monthly:</b> charge once per contract/month when completed service exists; no automatic proration. Mixed payer/rate snapshots require review. Duplicate billing and repeated payment requests are guarded. Issued-document correction, credit notes and refunds are not implemented.')
done()

# Treasury
page('Banks and cash treasury','Choose where each receipt goes','Accounts belong to the transport company. Client statements track invoices and receipts separately from your cash balances.')
node(36,140,226,82,'Admin creates an account','Bank or cash, opening date, actual opening balance. Currency: EGP.')
node(309,140,227,82,'Client pays an invoice','In Billing: record receipt and select the receiving account')
node(580,140,226,82,'Two records, one save','Client balance decreases; selected bank/cash balance increases',SKY)
arrow([(262,181),(309,181)]);arrow([(536,181),(580,181)])
node(36,270,226,82,'Supplier / cost payment','Choose the source account. Expenses, payroll and installments have a Pay action.')
diamond(335,259,178,104,'Enough available balance?')
arrow([(262,311),(335,311)])
node(580,276,226,77,'Record the withdrawal','Bank/cash balance decreases. Paid cost records are locked.',SKY)
arrow([(513,311),(580,311)],'Yes',534,289,32)
arrow([(424,363),(424,395)],'No',435,369,31,color=GOLD)
node(309,395,227,57,'Reject without partial changes','Correct the account, date or funds',AMBER)
panel(36,386,226,142,'Transfer between accounts','Record the debit and matching credit together. Total company cash is unchanged. Duplicate retries and concurrent overdrafts are blocked. No bank transfer is executed.')
panel(580,386,226,142,'Historical payments','Old payments remain unallocated until an admin assigns their real account. Do not allocate movements already included in an opening balance. Allocation does not change the invoice paid total.')
text(309,471,227,'Movements are not edited/deleted. Admin corrections require a reason. Only a zero-balance account can be archived. Client statements can print/export.',9.7)
done()

# 7
page('Fleet care and other costs','Maintenance, expenses, payroll and installments','Maintain operational records without counting the same supplier cost again as payroll or another expense.')
text(36,130,770,'MAINTENANCE AND VEHICLE AVAILABILITY',10,color=TEAL,bold=True)
node(36,158,215,75,'Schedule maintenance','Vehicle, date, job type and cost')
node(309,158,215,75,'Start work','Pause any active trip first')
node(591,158,215,75,'Complete work','Keep service history')
arrow([(251,195),(309,195)]);arrow([(524,195),(591,195)])
text(36,249,215,'A future appointment blocks overlapping trips without immediately making the vehicle unavailable.',10)
text(309,249,215,'In-progress work prevents dispatch. Only unused scheduled jobs may be removed.',10)
text(591,249,215,'The vehicle stays unavailable if another current job remains open; otherwise it becomes available.',10)
text(36,328,770,'SEPARATE OPERATIONAL FINANCE RECORDS',10,color=TEAL,bold=True)
for x,title,body,end in [
(36,'Expenses','Category, amount, date, vehicle/site and receipt notes','Save, then pay once from treasury'),
(300,'Payroll','Basic + overtime - deductions, advances and penalties','Validate net pay, then pay from treasury'),
(564,'Installments','Asset, due date, amount and payment status','Pay from treasury; status becomes Paid')]:
    node(x,355,242,85,title,body,SKY)
    arrow([(x+121,440),(x+121,467)])
    node(x,467,242,49,end,'',MINT)
text(36,528,770,'These records do not form a statutory general ledger and do not automatically disburse payroll or installment payments.',9,color=MUTED)
done()

# 8
page('Access and accountability','Every action depends on the account and scope','Authentication checks the current account. Changing access invalidates existing sessions; suspended accounts are blocked.')
node(36,137,199,61,'Sign in','Account must be active')
node(293,137,220,61,'Check role + record scope','Which company, supplier or driver?')
node(571,137,235,61,'Permit or reject action','Server enforces the rule')
arrow([(235,167),(293,167)]);arrow([(513,167),(571,167)])
# rows
rows=[('Administrator','Manage operations, treasury accounts, adjustments, finance, users and scopes.'),('Operations manager','Manage transport setup, schedules, dispatch and resources.'),('Accountant','Prepare/issue finance documents and record payments; read internal operations.'),('Viewer','Read internal workspace records; cannot change operational data.'),('Driver','Assigned trips and attendance; no finance access.'),('Client','Its authorized trips and issued invoices.'),('Supplier','Its authorized jobs and issued settlements.')]
y=232
for i,(role,scope) in enumerate(rows):
    rect(36,y,770,33,MINT if i%2==0 else '#FFFFFF',r=5)
    text(49,y+9,181,role,10,bold=True)
    text(240,y+9,550,scope,10)
    y+=36
text(36,500,376,'<b>Configure first:</b> set the external account scope in Workspace settings before giving the account access.',9.8)
text(440,500,366,'<b>Keep the history:</b> workflow changes are audited. Historical manifests keep their saved passenger/employer labels.',9.8)
done()

# 9
page('Reports and charts','Understand what each number actually measures','Internal users can compare 7, 30 or 90 days ending today, using Cairo service dates. Chart values come from saved records.')
node(36,139,223,73,'Trip + attendance records','Dates, states, departures and passenger outcomes')
node(36,246,223,73,'Document payments','Actual receipts and supplier payments',SKY)
node(312,195,215,77,'Reporting calculation','Fill every day in the period, including days with zero activity')
arrow([(259,175),(283,175),(283,232),(312,232)]);arrow([(259,282),(283,282),(283,232)])
node(583,195,223,77,'Charts + daily data','Visual overview, accessible table and CSV export')
arrow([(527,232),(583,232)])
items=[
('Service activity','Completed trips versus all dated trips, including cancellations.'),
('On-time departures','Actual departure no later than 5 minutes after schedule; completed trips with a recorded departure only.'),
('Attendance','Boarded / (Boarded + No show) on completed trips. Counts journeys, not unique employees.'),
('Cash movements','Invoice receipts and supplier payments on their payment dates. Draft and void documents are excluded.'),
('Passenger mix','Currently active direct versus staffing-company employees. Independent of the date filter.'),
('Route performance','Completed trip counts, boardings and absences, grouped by route.')]
for i,(title,body) in enumerate(items):
    x=36+(i%3)*264; y=349+(i//3)*92
    rect(x,y,242,80,'#FFFFFF')
    text(x+12,y+10,218,title,10.5,bold=True)
    text(x+12,y+30,218,body,9.3,maxh=45)
text(36,534,770,'No denominator displays as a dash. Cash movements are not profit. Fictional demo records are included and labelled in the interface.',8.8,color=MUTED)
done()

# 10
page('Use it with confidence','A walkthrough, the evidence, and what is still missing','Scope: this local checkout on 26 September 2026. Successful tests support a controlled pilot, not an unconditional production guarantee.')
# Three distinct columns
panel(36,132,241,304,'Try the complete daily flow', '<b>1.</b> Open Home and a trip labelled DEMO.<br/><br/><b>2.</b> Review its vehicle, driver and 12-passenger list.<br/><br/><b>3.</b> Start and confirm. Record absences, then confirm the remaining passengers boarded.<br/><br/><b>4.</b> Complete the trip. Open Billing, choose payer/month and prepare unbilled service.<br/><br/><b>5.</b> Review and issue the draft; practise recording a demo receipt.<br/><br/><b>6.</b> Compare reports and inspect the daily data.',MINT)
panel(297,132,241,304,'Verified in the current release', '<b>Fresh run:</b> 24 test results, zero failures; includes grouped test results.<br/><br/>Real database-backed checks cover imports/enrollment, scheduling/capacity, concurrent generation, portal isolation, trip states, breakdowns, documents and maintenance.<br/><br/>Also tested: invoice/settlement rules, monthly snapshots, payments, session revocation, demo seeding, analytics, bulk attendance and treasury routing/transfer integrity.<br/><br/><b>Browser checks:</b> mobile trip completion, billing filters, reports, help and responsive layouts.')
panel(558,132,248,304,'Not implemented / not verified', 'No live GPS, route optimization, outbound SMS/WhatsApp/email, or offline driver sync.<br/><br/>No executed bank transfers, government e-invoicing, statutory general ledger, credit notes/refunds, or automatic payroll disbursement.<br/><br/>Pricing beyond monthly/per-trip and a versioned supplier-agreement module need implementation.<br/><br/>Public deployment is not verified. The container path was not run on this host. Real tax rules, opening balances and migrated data still need business review.',AMBER)
text(36,452,770,'<b>Before wider rollout:</b> use one client/fleet pilot, check real contract terms, reconcile trips and balances against source records, replace demo access, and validate hosting plus backup/restore. Treasury is EGP-only; customer advances and historical receivable imports are not automatic.',10.1,maxh=32)
text(36,495,770,'<b>Source of truth:</b> README.md; docs/USER_MANUAL_EN.md; docs/VERIFICATION.md; server/tests/workflows.test.ts; server/src/modules/operations/operations.routes.ts, operations.logic.ts, analytics.ts and treasury.ts.',8.5,color=MUTED,maxh=28)
text(36,526,770,'Local app: <link href="http://localhost:5173" color="#177C70">localhost:5173</link>  |  In-app manual: <link href="http://localhost:5173/guide" color="#177C70">/guide</link>  |  Reports: <link href="http://localhost:5173/reports" color="#177C70">/reports</link>  |  Demo seed: 48 passengers, 8 schedules, 288 trips (fictional).',8.6,color=MUTED)
done()
c.save()
r=PdfReader(str(OUT))
assert len(r.pages)==11
for i,p in enumerate(r.pages):
    s=p.extract_text()
    assert len(s)>450,(i,len(s))
public=ROOT/'client/public/docs/on-time-system-workflows.pdf'
public.parent.mkdir(parents=True, exist_ok=True)
public.write_bytes(OUT.read_bytes())
print(f'Created {OUT}; {len(r.pages)} pages; {OUT.stat().st_size:,} bytes')
