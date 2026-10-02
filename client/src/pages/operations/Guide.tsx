import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  ArrowUpRight,
  CheckCircle2,
  BookOpen,
  PlayCircle,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useWords, useData, Page, Panel, Button } from "./ui";

export function Guide() {
  const w = useWords();
  const { user } = useAuth();
  const internal = [
    "ADMIN",
    "OPERATIONS_MANAGER",
    "ACCOUNTANT",
    "VIEWER",
  ].includes(user?.role || "");
  const q = useData("/bootstrap", internal);
  const summary = useData("/summary", internal);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("start");
  const d = q.data;
  const steps = [
    {
      title: w(
        "Add your client and service contract",
        "أضف العميل وعقد الخدمة",
      ),
      description: w(
        "Create the company, its destination sites, and a contract with dates and a monthly or per-trip price. If another company pays, set the invoice recipient in Workspace settings.",
        "أضف الشركة ومواقع الوصول وعقدًا بتواريخ واضحة وتسعير شهري أو لكل رحلة. إذا كانت جهة أخرى تدفع، حدد جهة الفوترة في إعدادات التشغيل.",
      ),
      to: "/clients",
      link: w("Open clients", "فتح العملاء"),
      done: !!d?.clients.length && !!d?.contracts.length,
    },
    {
      title: w(
        "Prepare vehicles, drivers, and suppliers",
        "جهز المركبات والسائقين والموردين",
      ),
      description: w(
        "Add vehicles with their actual seat capacity and valid documents. Add drivers. For outsourced resources, add a transport supplier and link the resources in Workspace settings.",
        "أضف المركبات بسعتها الفعلية ومستنداتها السارية والسائقين. للموارد الخارجية أضف مورد نقل ثم اربط المركبات والسائقين به من إعدادات التشغيل.",
      ),
      to: "/vehicles",
      link: w("Open fleet", "فتح الأسطول"),
      done: !!d?.vehicles.length && !!d?.drivers.length,
    },
    {
      title: w("Define routes and pickup stops", "حدد الخطوط ومحطات الركوب"),
      description: w(
        "Create each route for the receiving client. Add ordered pickup stops. Use a separate schedule for each direction and shift.",
        "أضف خط السير للعميل المستفيد ومحطات الركوب بالترتيب. استخدم جدولًا مستقلًا لكل اتجاه ووردية.",
      ),
      to: "/routes",
      link: w("Open routes", "فتح الخطوط"),
      done: !!d?.routes.length,
    },
    {
      title: w(
        "Add passengers and enroll them",
        "أضف الموظفين وسجل اشتراكاتهم",
      ),
      description: w(
        "Add passengers individually or import the CSV template. Choose a staffing employer only for outsourced employees. Then assign each passenger to a route, shift, stop, direction, and valid date range.",
        "أضف الموظفين فرديًا أو استورد نموذج CSV. اختر شركة توظيف للموظفين الخارجيين فقط. ثم حدد لكل موظف الخط والوردية والمحطة والاتجاه وفترة الخدمة.",
      ),
      to: "/passengers",
      link: w("Open passengers", "فتح الموظفين"),
      done: !!d?.passengers.length,
    },
    {
      title: w(
        "Build a schedule and preview trips",
        "أنشئ جدولًا وعاين الرحلات",
      ),
      description: w(
        "Follow the three schedule steps: service, resources, then calendar and rates. Save, choose Generate, preview the dates, fix blocked days, and create the ready trips. Existing trips will not be duplicated.",
        "اتبع خطوات الجدول الثلاث: الخدمة ثم الموارد ثم الأيام والأسعار. احفظ واضغط إنشاء الرحلات ثم عاين الفترة وراجع التعارضات وأنشئ الرحلات الجاهزة. لن تتكرر الرحلات الموجودة.",
      ),
      to: "/schedules",
      link: w("Open schedules", "فتح الجداول"),
      done: (summary.data?.plans || 0) > 0,
    },
    {
      title: w(
        "Run the trip, then close the accounts",
        "نفذ الرحلة ثم أغلق حساباتها",
      ),
      description: w(
        "Open Dispatch, check the passenger list, and start the trip. Record every passenger as boarded, absent, or cancelled before completion. Finance prepares the invoice or supplier settlement, reviews and issues it, then records receipts or payments.",
        "افتح لوحة التشغيل وراجع الركاب وابدأ الرحلة. سجل حضور أو غياب أو إلغاء كل موظف قبل الإتمام. تنشئ الحسابات الفاتورة أو مستحقات المورد وتراجعها وتعتمدها ثم تسجل التحصيل أو السداد.",
      ),
      to: "/trips",
      link: w("Open dispatch", "فتح التشغيل"),
      done: false,
    },
  ];
  const articles = [
    {
      title: w("How do I use company banks and treasury?", "كيف أستخدم بنوك وخزائن الشركة؟"),
      body: w("The administrator creates each bank or cash account in Accounts & treasury with its opening date and balance. These accounts belong to the transport company. When recording an invoice receipt, select Receive into; for supplier payments select Pay from. Expenses, payroll and installments have a Pay from treasury action. Saving a cost alone does not move cash. Only record actual payments, and do not repay historical costs included in opening balances. The system prevents overdrafts and duplicate requests.", "ينشئ المدير كل بنك أو خزينة من الحسابات والخزينة برصيد افتتاحي وتاريخ واضح. الحسابات تخص شركة النقل. عند تحصيل فاتورة اختر التحصيل في، وعند سداد مورد اختر السداد من. للمصروفات والرواتب والأقساط زر سداد من الخزينة. حفظ التكلفة وحده لا يحرك النقدية. سجل المدفوعات الفعلية فقط ولا تسدد تكاليف قديمة محسوبة في الرصيد الافتتاحي. يمنع النظام تجاوز الرصيد وتكرار الحركات."),
      to: "/treasury",
    },
    {
      title: w("What about historical payments and corrections?", "ماذا عن المدفوعات السابقة وتصحيح الرصيد؟"),
      body: w("Old invoice payments remain unallocated until an administrator selects their true account. Allocation affects treasury only and must not duplicate money included in the opening balance. The account opening date must be on or before the payment date. Movements cannot be edited or deleted. Use a documented administrator adjustment for cash corrections, or a transfer to move funds between accounts. Transfers preserve total cash. Only zero-balance accounts can be archived. These actions do not change issued invoice amounts or execute bank transfers.", "تظل الدفعات السابقة غير مرتبطة بخزينة حتى يحدد المدير حسابها الحقيقي. الربط يؤثر على الخزينة فقط ويجب ألا يكرر مبلغاً محسوباً في الرصيد الافتتاحي. يجب أن يبدأ الحساب قبل تاريخ الدفع أو في اليوم نفسه. لا تعدل الحركات أو تحذف؛ استخدم تسوية موثقة من المدير لتصحيح النقدية أو تحويلًا لنقل المال بين الحسابات. التحويل يحافظ على الإجمالي ولا تؤرشف إلا الحسابات ذات الرصيد صفر. هذه الإجراءات لا تعدل مبالغ الفواتير المعتمدة ولا تنفذ تحويلاً بنكياً."),
      to: "/treasury",
    },
    {
      title: w("Where is each client’s account statement?", "أين كشف حساب كل عميل؟"),
      body: w("Open Accounts & treasury, then Client statements. Each invoice recipient has an invoiced, received and outstanding total. Open Statement to see issued invoices, receipts and their receiving accounts, then print/save PDF or export invoices. Drafts and void invoices are excluded. Unallocated historical receipts still count as paid. Customer advances, historical receivable imports, refunds and multiple currencies are outside this release.", "افتح الحسابات والخزينة ثم كشوف العملاء. لكل جهة سداد إجمالي المفوتر والمحصل والمتبقي. افتح كشف الحساب لعرض الفواتير المعتمدة والتحصيلات والحسابات المستقبلة ثم اطبع أو احفظ PDF أو صدّر الفواتير. تستبعد المسودات والملغاة وتظل التحصيلات السابقة غير المرتبطة محسوبة كمدفوعات. الدفعات المقدمة واستيراد المديونيات القديمة والاسترداد وتعدد العملات خارج هذا الإصدار."),
      to: "/treasury",
    },
    {
      title: w("How do I try the demo workflow?", "كيف أجرب دورة العمل؟"),
      body: w("Records labelled DEMO or تجريبي are fictional. From Home, open a demo trip in today’s running order. Start it, record any absences, confirm boarding for the remaining passengers, then complete it. Review client invoices and supplier dues in Billing, and compare 7, 30 or 90 days in Reports. The sample includes direct employees, staffing employees and external vehicles and drivers.", "السجلات المكتوب عليها DEMO أو تجريبي وهمية للتجربة. من الرئيسية افتح رحلة تجريبية في جدول اليوم. ابدأ الرحلة وسجل الغائبين ثم أكد ركوب المتبقين وأتم الرحلة. راجع فواتير العملاء ومستحقات الموردين في الحسابات وقارن ٧ أو ٣٠ أو ٩٠ يوماً في التقارير. تشمل الأمثلة موظفين مباشرين وخارجيين ومركبات وسائقين من الموردين."),
      to: "/trips",
    },
    {
      title: w("What do the charts measure?", "ماذا تعني الرسوم البيانية؟"),
      body: w("Charts use saved records and Cairo service dates. On-time means departure within 5 minutes of schedule among completed trips with a departure time. Attendance counts boarded journeys divided by boarded plus no-show journeys. The cash chart shows actual invoice receipts and supplier payments, not profit. Passenger mix shows currently active people regardless of report period. Open View chart data for the exact daily values or export them as CSV.", "تعتمد الرسوم على السجلات المحفوظة وتواريخ الخدمة بتوقيت القاهرة. الانطلاق في الموعد يعني خلال ٥ دقائق للرحلات المكتملة ذات وقت انطلاق مسجل. الحضور هو مرات الركوب مقسومة على الركوب والغياب. رسم المدفوعات يعرض التحصيل والسداد الفعلي وليس الربح. توزيع الركاب يعرض الموظفين النشطين حالياً بصرف النظر عن فترة التقرير. افتح بيانات الرسم للقيم اليومية أو صدّرها CSV."),
      to: "/reports",
    },
    {
      title: w("How can I record attendance faster?", "كيف أسجل الحضور بسرعة؟"),
      body: w("While a trip is in progress, record absences and cancellations individually first. If every remaining passenger is actually on board, choose Mark remaining as boarded and confirm. Previously recorded attendance is preserved. Refresh and review if another dispatcher changed the list. Complete the trip only after all statuses are recorded.", "أثناء الرحلة سجل الغياب والإلغاء لكل راكب أولاً. إذا كان جميع المتبقين داخل المركبة فعلياً اختر تسجيل حضور المتبقين ثم أكد. يحتفظ النظام بالحالات المسجلة سابقاً. حدّث القائمة وراجعها إذا عدلها مسؤول آخر. أتم الرحلة بعد تسجيل حالة كل الركاب."),
      to: "/trips",
    },
    {
      title: w("How do I move around on a phone?", "كيف أتنقل من الهاتف؟"),
      body: w("Use the bottom bar for Home, Dispatch, Schedules and Help. Open the menu for all sections, or tap the search icon in the top bar and type a page name. Records become labelled cards on small screens. Your account, guide and sign-out are under the profile button.", "استخدم الشريط السفلي للرئيسية والتشغيل والجداول والمساعدة. افتح القائمة لباقي الأقسام أو اضغط البحث في الشريط العلوي واكتب اسم الصفحة. تظهر السجلات كبطاقات واضحة على الشاشات الصغيرة. تجد الحساب والدليل وتسجيل الخروج من زر الحساب."),
      to: "/guide",
    },
    {
      title: w("When does maintenance block a vehicle?", "متى تمنع الصيانة تشغيل المركبة؟"),
      body: w("Scheduled maintenance blocks overlapping trips, without making the vehicle unavailable immediately for a future appointment. Pause an active trip before starting maintenance. Completing one job keeps the vehicle unavailable if another job is still open. Started and completed jobs stay in service history. You can remove an unused scheduled job.", "الصيانة المجدولة تمنع الرحلات المتعارضة مع موعدها دون تعطيل المركبة فوراً بسبب موعد مستقبلي. أوقف الرحلة النشطة قبل بدء الصيانة. إتمام أمر صيانة لا يتيح المركبة إذا بقي أمر آخر مفتوح. يحتفظ النظام بالأعمال التي بدأت أو اكتملت ضمن السجل، ويمكن حذف موعد صيانة مجدول لم يبدأ."),
      to: "/maintenance",
    },
    {
      title: w(
        "How do I add outsourced employees?",
        "كيف أضيف موظفين تابعين لشركة توظيف؟",
      ),
      body: w(
        "Create the staffing company under Partners & suppliers with type Staffing or Both. In the passenger record, select the client receiving the transport and choose the staffing employer separately. This does not change who receives the invoice. Set the payer on the contract in Workspace settings.",
        "أضف شركة التوظيف من الشركاء والموردين بنوع «توظيف» أو «كلاهما». في سجل الموظف اختر العميل المستفيد وشركة التوظيف بشكل منفصل. هذا لا يغير جهة الفوترة؛ حدد جهة السداد للعقد من إعدادات التشغيل.",
      ),
      to: "/partners",
    },
    {
      title: w(
        "What is the difference between a route and a schedule?",
        "ما الفرق بين الخط وجدول التشغيل؟",
      ),
      body: w(
        "A route describes where the vehicle travels and its stops. A schedule describes when the route runs, its direction and shift, assigned resources, operating days, and prices. The schedule generates dated trips that dispatchers and drivers actually operate.",
        "الخط يحدد مسار المركبة ومحطاتها. الجدول يحدد توقيت التشغيل والاتجاه والوردية والموارد والأيام والأسعار. من الجدول تنشأ الرحلات اليومية التي يديرها مسؤول التشغيل والسائق.",
      ),
      to: "/schedules",
    },
    {
      title: w("Why is my passenger list empty?", "لماذا قائمة الركاب فارغة؟"),
      body: w(
        "The passenger needs an active route enrollment matching the trip route, shift, direction, and date. The passenger must also be active. If you enrolled someone after generating a trip, open the trip and choose Refresh passenger list before departure.",
        "يحتاج الموظف إلى اشتراك نشط يطابق خط الرحلة وورديتها واتجاهها وتاريخها، ويجب أن يكون الموظف نشطًا. إذا سجلت موظفًا بعد إنشاء الرحلة، افتح الرحلة واضغط تحديث قائمة الركاب قبل الانطلاق.",
      ),
      to: "/enrollments",
    },
    {
      title: w(
        "Why is a scheduled day blocked?",
        "لماذا يظهر يوم تشغيل يحتاج مراجعة؟",
      ),
      body: w(
        "Read the reason in the generation preview. Common causes are overlapping assignments including the 20-minute buffer, expired documents, unavailable drivers, maintenance, contract dates, or too many passengers. Fix the source record, then preview again.",
        "اقرأ السبب في معاينة إنشاء الرحلات. الأسباب المعتادة: تعارض التعيينات مع مهلة ٢٠ دقيقة، مستندات منتهية، سائق غير متاح، صيانة، تواريخ عقد غير مناسبة أو تجاوز عدد المقاعد. عدل السجل ثم أعد المعاينة.",
      ),
      to: "/schedules",
    },
    {
      title: w(
        "How do I handle a breakdown or change a driver?",
        "كيف أتعامل مع عطل أو أغير السائق؟",
      ),
      body: w(
        "Before departure, open the trip and choose Replace resources. For a trip in progress, choose Pause / breakdown and enter a reason, then assign replacement resources and start again. Confirm capacity and the new supplier cost. The assignment history, original departure time and recorded attendance are preserved. The passenger list cannot be refreshed after the first departure.",
        "قبل الانطلاق افتح الرحلة واختر تبديل المركبة أو السائق. أثناء الرحلة اختر توقف / عطل وسجل السبب ثم حدد البديل واستأنف الرحلة. راجع السعة وتكلفة المورد الجديد. يحتفظ النظام بسجل التعيينات ووقت الانطلاق الأصلي والحضور المسجل. لا يمكن تحديث قائمة الركاب بعد بدء الرحلة.",
      ),
      to: "/trips",
    },
    {
      title: w("How do I finish a trip?", "كيف أنهي الرحلة؟"),
      body: w(
        "Start the trip first. Mark each expected passenger as Boarded, No show, or Cancelled. Then select Complete trip and confirm. Completed trips cannot be reopened through normal dispatch actions. Record an incident note when something needs review.",
        "ابدأ الرحلة أولًا. سجل لكل راكب منتظر: حضر أو غائب أو ملغى. ثم اختر إتمام الرحلة وأكد. لا يمكن إعادة فتح الرحلات المكتملة من إجراءات التشغيل العادية. سجل ملاحظة إذا احتاج الأمر إلى مراجعة.",
      ),
      to: "/trips",
    },
    {
      title: w(
        "Why can’t I prepare an invoice?",
        "لماذا لا أستطيع إنشاء فاتورة؟",
      ),
      body: w(
        "You need administrator or accountant access. Choose the correct payer and month. There must be completed, unbilled service with a positive rate. Monthly contracts use the agreed monthly value once per contract and month; per-trip contracts use the rate saved when each trip was generated.",
        "تحتاج صلاحية مدير أو محاسب. اختر جهة السداد والشهر الصحيحين. يجب وجود خدمة مكتملة وغير مفوترة بسعر أكبر من صفر. العقد الشهري يستخدم قيمته مرة واحدة لكل عقد وشهر، وعقد الرحلة يستخدم السعر المحفوظ عند إنشاء الرحلة.",
      ),
      to: "/billing",
    },
    {
      title: w("How do partial payments work?", "كيف أسجل دفعة جزئية؟"),
      body: w(
        "Open an issued invoice or supplier settlement, choose Record receipt/payment, enter the amount actually received/paid and its reference, then save. The balance decreases. The document becomes Paid only when the total is fully settled. An overpayment is rejected.",
        "افتح فاتورة أو كشف مورد معتمدًا واختر تسجيل تحصيل أو سداد. أدخل المبلغ الفعلي ومرجعه ثم احفظ. ينخفض الرصيد ويصبح المستند مدفوعًا عند اكتمال السداد فقط. لا يسمح بمبلغ يتجاوز المتبقي.",
      ),
      to: "/billing",
    },
    {
      title: w(
        "Can I change an issued document?",
        "هل يمكن تعديل مستند معتمد؟",
      ),
      body: w(
        "Review drafts before issuing. Drafts can be discarded and prepared again. Issued documents are locked to protect their history. This release does not provide credit notes or post-issue corrections; use your controlled accounting process for those cases and retain the reference.",
        "راجع المسودات قبل الاعتماد. يمكن إلغاء المسودة وإعادة إنشائها. المستندات المعتمدة مقفلة لحماية تاريخها. هذا الإصدار لا يوفر إشعارات دائنة أو تعديلًا بعد الاعتماد؛ استخدم إجراءات الحسابات المعتمدة لهذه الحالات واحتفظ بالمرجع.",
      ),
      to: "/billing",
    },
    {
      title: w("What can each user see?", "ماذا يرى كل مستخدم؟"),
      body: w(
        "Administrators manage access. Operations managers plan and dispatch. Accountants manage financial changes. Viewers read only. Drivers see their assigned trips; client and supplier accounts see only their own permitted records. Configure external account scope before sharing access.",
        "يدير المدير الصلاحيات، ومدير التشغيل التخطيط والرحلات، والمحاسب التغييرات المالية، والمشاهد القراءة فقط. يرى السائق رحلاته المحددة، ويرى العميل أو المورد سجلاته المصرح بها فقط. حدد نطاق الحساب الخارجي قبل مشاركته.",
      ),
      to: "/settings",
    },
    {
      title: w(
        "How do I import and export passengers?",
        "كيف أستورد وأصدر الموظفين؟",
      ),
      body: w(
        "Download the CSV template from Passengers → Import CSV. Keep the headers employeeCode, fullName, phone. Upload a file up to 1 MB and 2,000 rows, select the client and optional staffing employer, validate, then import. Existing employee codes within that client are skipped. Fix invalid rows before saving.",
        "حمل النموذج من الموظفين ← استيراد CSV. احتفظ بالعناوين employeeCode وfullName وphone. ارفع ملفًا حتى ١ ميجابايت و٢٠٠٠ صف وحدد العميل وجهة التوظيف إن وجدت ثم افحص واستورد. يتم تخطي الأرقام الموجودة لنفس العميل. أصلح الصفوف الخاطئة قبل الحفظ.",
      ),
      to: "/passengers",
    },
    {
      title: w(
        "How are times and holidays handled?",
        "كيف تعمل الأوقات والإجازات؟",
      ),
      body: w(
        "Schedules default to Africa/Cairo and store actual departures in UTC. Select operating weekdays and enter excluded dates for holidays. Return trips use their own schedules. During ambiguous or nonexistent daylight-saving times, generation asks you to choose another time.",
        "المنطقة الافتراضية Africa/Cairo وتخزن المواعيد الفعلية بتوقيت UTC. حدد أيام العمل وأدخل تواريخ الاستثناء للإجازات. لرحلات العودة جداول مستقلة. يطلب النظام وقتًا آخر إذا كان الموعد غامضًا أو غير موجود عند تغيير التوقيت الصيفي.",
      ),
      to: "/schedules",
    },
  ];
  const filtered = articles.filter((a) =>
    (a.title + " " + a.body).toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <Page
      title={w("Help & getting started", "دليل الاستخدام والبداية")}
      description={w(
        "Simple instructions for the people who run your transport service.",
        "خطوات بسيطة لكل من يعمل على إدارة خدمة النقل.",
      )}
    >
      <div className="ops-actions"><a className="ops-button secondary" href="/docs/on-time-system-workflows.pdf" download>{w("Download workflow guide (PDF, English)", "تحميل مخططات النظام (PDF بالإنجليزية)")}</a></div>
      <div className="ops-help-hero">
        <BookOpen size={36} />
        <div>
          <h2>
            {w("Let’s make the next step clear.", "كل خطوة واضحة من البداية.")}
          </h2>
          <p>
            {w(
              "Set up once. Plan your service. Run each trip. Close the accounts.",
              "جهز البيانات. خطط التشغيل. تابع الرحلات. راجع الحسابات.",
            )}
          </p>
        </div>
      </div>
      <div className="ops-help-tabs" role="tablist">
        {internal && (
          <Button
            role="tab"
            aria-selected={tab === "start"}
            secondary={tab !== "start"}
            onClick={() => setTab("start")}
          >
            <PlayCircle size={17} />
            {w("Setup guide", "دليل الإعداد")}
          </Button>
        )}
        <Button
          role="tab"
          aria-selected={tab === "manual" || !internal}
          secondary={tab !== "manual" && internal}
          onClick={() => setTab("manual")}
        >
          <HelpCircle size={17} />
          {w("User manual & answers", "دليل الاستخدام والأسئلة")}
        </Button>
      </div>
      {tab === "start" && internal ? (
        <>
          <p className="ops-help">
            {w(
              "Checkmarks indicate that starting records exist; they are not a readiness certification. Follow the steps in order for each new client.",
              "علامة الصح تعني وجود بيانات أولية وليست تأكيدًا لاكتمال الإعداد. اتبع الخطوات بالترتيب لكل عميل جديد.",
            )}
          </p>
          <div className="ops-guide-steps">
            {steps.map((s, i) => (
              <article key={s.to} className="ops-guide-step">
                <div className={"ops-guide-number " + (s.done ? "done" : "")}>
                  {s.done ? (
                    <CheckCircle2 size={24} />
                  ) : (
                    String(i + 1).padStart(2, "0")
                  )}
                </div>
                <div>
                  <h2>{s.title}</h2>
                  <p>{s.description}</p>
                  <Link to={s.to} className="ops-text-link">
                    {s.link}
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="ops-search ops-manual-search">
            <Search size={18} />
            <input
              aria-label={w("Search help", "البحث في الدليل")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={w(
                "Search passengers, invoices, breakdowns…",
                "ابحث عن الموظفين، الفواتير، الأعطال…",
              )}
            />
          </div>
          <Panel>
            {filtered.length ? (
              filtered.map((a) => (
                <details key={a.title} className="ops-manual-article">
                  <summary>{a.title}</summary>
                  <p>{a.body}</p>
                  {internal && (
                    <Link className="ops-text-link" to={a.to}>
                      {w("Open workspace", "فتح الصفحة")}
                      <ArrowUpRight size={16} />
                    </Link>
                  )}
                </details>
              ))
            ) : (
              <p className="ops-padded">
                {w(
                  "No matching help articles. Try a shorter search.",
                  "لا توجد نتائج مطابقة. جرب كلمة أقصر.",
                )}
              </p>
            )}
          </Panel>
        </>
      )}
    </Page>
  );
}
