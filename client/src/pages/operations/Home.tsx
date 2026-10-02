import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, CheckCircle2, ClipboardList, Users, Wallet, ArrowRight, BookOpen, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWords, useData, Loading, Status, money, today } from './ui';
import { Dispatch } from './Dispatch';
const Insights = lazy(() => import('./Insights').then(m=>({default:m.Insights})));

export function Home() {
  const w=useWords(),{user}=useAuth();
  const external=['DRIVER','CLIENT','SUPPLIER'].includes(user?.role||'');
  const q=useData('/summary',!external), report=useData('/analytics?days=30',!external);
  if(external) return <Dispatch/>;
  if(!q.data || !report.data) return <Loading query={!q.data?q:report}/>;
  const d=q.data,a=report.data;
  const pending=d.trips.filter((t:any)=>['SCHEDULED','DELAYED','IN_PROGRESS'].includes(t.tripStatus));
  const completed=d.trips.filter((t:any)=>t.tripStatus==='COMPLETED').length;
  const steps=[{label:w('Companies & contracts','الشركات والعقود'),to:'/clients',done:a.setup.clients>0&&a.setup.contracts>0},{label:w('People & routes','الموظفون والخطوط'),to:'/enrollments',done:a.setup.passengers>0&&a.setup.enrollments>0&&a.setup.routes>0},{label:w('Schedule & dispatch','الجدولة والتشغيل'),to:'/schedules',done:a.setup.schedules>0&&a.setup.trips>0}];
  const stats=[{label:w('Trips today','رحلات اليوم'),value:d.trips.length,note:`${completed} ${w('completed','مكتملة')} · ${pending.length} ${w('to follow','للمتابعة')}`,Icon:ClipboardList,to:'/trips',color:'teal'},{label:w('Active passengers','الركاب النشطون'),value:d.passengers,note:w('Direct + staffing employees','موظفون مباشرون وخارجيون'),Icon:Users,to:'/passengers',color:'blue'},{label:w('On-time departures','الانطلاق في الموعد'),value:a.metrics.onTimeRate===null?'—':a.metrics.onTimeRate+'%',note:w('Completed trips · last 30 days','الرحلات المكتملة · آخر ٣٠ يوم'),Icon:CheckCircle2,to:'/reports',color:'violet'},{label:w('Fleet issues','تنبيهات الأسطول'),value:d.issues,note:w('Documents & maintenance','مستندات وصيانة تحتاج مراجعة'),Icon:AlertCircle,to:'/vehicles',color:'amber'}];
  return <div className="ops-page home-page">
    <div className="home-heading"><div><div className="home-kicker"><span/>{w('YOUR DAILY WORKSPACE','مساحة عملك اليومية')}</div><h1>{w('A good day starts on time.','يوم منظم، ورحلات في موعدها.')}</h1><p>{w('Your trips, people and next steps. All in one place.','رحلاتك وركابك وخطوتك التالية، في مكان واحد.')}</p></div><Link className="ops-button" to="/trips"><ClipboardList size={18}/>{w('Open today’s trips','افتح رحلات اليوم')}</Link></div>
    <div className="home-stats">{stats.map(s=><Link key={s.to} className={'home-stat '+s.color} to={s.to}><div className="home-stat-label"><span>{s.label}</span><s.Icon size={19}/></div><strong>{s.value}</strong><small>{s.note}</small></Link>)}</div>
    <div className="home-work-grid">
      <section className="home-today"><div className="home-section-title"><div><h2>{w('Today’s running order','جدول اليوم')}</h2><p><CalendarDays size={14}/>{today()} · {w('Cairo time','توقيت القاهرة')}</p></div><Link className="ops-text-link" to="/trips">{w('View all','عرض الكل')}<ArrowUpRight size={16}/></Link></div>
      {pending.length?<div className="home-trip-queue">{pending.slice(0,4).map((t:any)=><Link key={t.id} to={`/trips?date=${today()}&trip=${t.id}`}><time>{new Date(t.scheduledDeparture).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Africa/Cairo'})}</time><div><strong>{t.route.routeName}</strong><small>{t.vehicle.plateNumber} · {t.driver.fullName}</small></div><Status value={t.tripStatus}/><ArrowUpRight size={17}/></Link>)}</div>:<div className="home-clear"><CheckCircle2 size={30}/><strong>{w('You’re caught up for today','أنجزت متابعة اليوم')}</strong><p>{w('Plan the next service or review your reports.','خطط للتشغيل القادم أو راجع تقاريرك.')}</p><Link className="ops-text-link" to="/schedules">{w('Plan service','تخطيط التشغيل')}<ArrowRight size={16}/></Link></div>}
      </section>
      <section className="home-next"><span className="home-kicker">{w('WHAT’S NEXT','ما الخطوة التالية؟')}</span><h2>{w('Keep the day moving','خلّي يومك أبسط')}</h2><p>{w('Start with the work that needs attention.','ابدأ بما يحتاج متابعتك الآن.')}</p>
        <Link to="/trips?status=DELAYED"><span className="home-next-icon amber"><AlertCircle size={19}/></span><div><strong>{d.trips.filter((t:any)=>t.tripStatus==='DELAYED').length} {w('delayed trips','رحلات متأخرة')}</strong><small>{w('Review and resume the service','راجع السبب واستأنف التشغيل')}</small></div><ArrowUpRight size={17}/></Link>
        <Link to="/schedules"><span className="home-next-icon blue"><CalendarDays size={19}/></span><div><strong>{w('Service schedules','جداول وخطط التشغيل')}</strong><small>{w('Review and plan upcoming routes','مراجعة وتخطيط الرحلات القادمة')}</small></div><ArrowUpRight size={17}/></Link>
        <Link to="/vehicles"><span className="home-next-icon teal"><CheckCircle2 size={19}/></span><div><strong>{d.issues} {w('fleet readiness issues','مركبات تحتاج مراجعة')}</strong><small>{w('Documents and maintenance','المستندات والصيانة')}</small></div><ArrowUpRight size={17}/></Link>
      </section>
    </div>
    <Suspense fallback={<div className="ops-loading" role="status">{w("Loading insights…","جاري تحميل التحليلات…")}</div>}><Insights compact/></Suspense>
    <section className="home-workflow"><div className="home-section-title"><div><h2>{w('Your workflow, step by step','دورة العمل، خطوة بخطوة')}</h2><p>{w('The essentials are connected. Open any stage to continue.','مراحل العمل مترابطة. افتح أي مرحلة للمتابعة.')}</p></div><Link className="ops-text-link" to="/guide"><BookOpen size={16}/>{w('User guide','دليل الاستخدام')}</Link></div><div className="home-steps">{steps.map((s,i)=><Link key={s.to} to={s.to}><span className={s.done?'done':''}>{s.done?<CheckCircle2 size={19}/>:i+1}</span><strong>{s.label}</strong><ArrowUpRight size={16}/></Link>)}</div></section>
  </div>;
}
