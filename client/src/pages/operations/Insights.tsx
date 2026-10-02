import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowUpRight, Download, TrendingUp, Users, Wallet, CheckCircle2 } from 'lucide-react';
import { useWords, useData, Page, Panel, Loading, money, Button, exportCsv } from './ui';
import { useLanguage } from '../../contexts/LanguageContext';

const chartColors = { completed: '#168978', total: '#5279b9', receipts: '#168978', payouts: '#db8b3a', outsourced: '#6981bc' };
const shortDate = (v: string) => v.slice(5).replace('-', '/');
export function Insights({ compact = false }: { compact?: boolean }) {
  const [days,setDays] = useState(30);
  const [dataOpen,setDataOpen] = useState(false);
  const w=useWords(), {lang}=useLanguage();
  const q=useData('/analytics?days='+days);
  if(!q.data) return <Loading query={q}/>;
  const d=q.data,m=d.metrics;
  const mix=[{name:w('Direct employees','موظفون مباشرون'),value:d.passengerMix.direct},{name:w('Staffing employees','موظفو شركات التوظيف'),value:d.passengerMix.outsourced}];
  const cash:any[]=[];
  const groupSize = days === 7 ? 1 : 7;
  d.daily.forEach((v:any,i:number)=> { const group=Math.floor(i/groupSize); if(!cash[group]) cash[group]={date:v.date,receipts:0,payouts:0}; cash[group].receipts+=v.receipts; cash[group].payouts+=v.payouts; });
  const columns=[{key:'date',label:w('Date','التاريخ')},{key:'trips',label:w('All trips','كل الرحلات')},{key:'completed',label:w('Completed','المكتملة')},{key:'boarded',label:w('Boardings','مرات الركوب')},{key:'noShow',label:w('Absences','مرات الغياب')},{key:'receipts',label:w('Receipts EGP','التحصيل EGP')},{key:'payouts',label:w('Payments EGP','السداد EGP')}];
  const charts=<>
    <div className="insights-heading"><div><h2>{w('A clearer view of your business','صورة أوضح لأعمالك')}</h2><p>{d.start} — {d.end} · {w('Cairo time','بتوقيت القاهرة')}</p></div><div className="insights-range" role="group" aria-label={w('Reporting period','فترة التقرير')}>{[7,30,90].map(n=><button key={n} aria-pressed={days===n} className={days===n?'active':''} onClick={()=>setDays(n)}>{n} {w('days','يوم')}</button>)}</div></div>
    {d.demoPresent && <div className="insights-demo"><span className="demo-dot"/>{w('Includes clearly labelled fictional demo records. All charts use saved records.','تتضمن البيانات سجلات تجريبية موضحة بالاسم. كل الرسوم محسوبة من السجلات المحفوظة.')}</div>}
    {!compact && <div className="insights-kpis">{[
      {label:w('Completed trips','رحلات مكتملة'),value:m.completed,Icon:CheckCircle2},
      {label:w('On-time departures','الانطلاق في الموعد'),value:m.onTimeRate===null?'—':m.onTimeRate+'%',Icon:TrendingUp},
      {label:w('Passenger attendance','حضور الركاب'),value:m.attendanceRate===null?'—':m.attendanceRate+'%',Icon:Users},
      {label:w('Receipts collected','تحصيلات فعلية'),value:money(m.receipts),Icon:Wallet},
    ].map(v=><div className="insights-kpi" key={v.label}><v.Icon size={20}/><span>{v.label}</span><strong>{v.value}</strong></div>)}</div>}
    <div className="insights-chart-grid">
      <Panel title={w('Service activity','حركة التشغيل')} actions={<span className="ops-muted">{m.completed} {w('completed','مكتملة')}</span>}>
        <div className="insights-legend"><span><i style={{background:chartColors.total}}/>{w('All trips','كل الرحلات')}</span><span><i style={{background:chartColors.completed}}/>{w('Completed','المكتملة')}</span></div>
        <div className="insights-chart" dir="ltr" role="img" aria-label={w(`${m.completed} completed trips out of ${m.trips}. Daily values are available in the data table.`,`${m.completed} رحلة مكتملة من ${m.trips}. القيم اليومية متاحة في جدول البيانات.`)}>
          <ResponsiveContainer width="100%" height="100%"><AreaChart data={d.daily} margin={{top:8,right:18,left:-18,bottom:0}} accessibilityLayer>
            <defs><linearGradient id="completed-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={chartColors.completed} stopOpacity={0.2}/><stop offset="100%" stopColor={chartColors.completed} stopOpacity={0.015}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 4" vertical={false} stroke="#e4eae7"/><XAxis dataKey="date" tickFormatter={shortDate} minTickGap={24} tickLine={false} axisLine={false}/><YAxis allowDecimals={false} tickLine={false} axisLine={false}/><Tooltip labelFormatter={(v)=>String(v)} contentStyle={{borderRadius:12,border:'1px solid #dfe8e3',fontSize:12}}/>
            <Area type="monotone" dataKey="trips" name={w('All trips','كل الرحلات')} stroke={chartColors.total} fill="transparent" strokeDasharray="5 4" strokeWidth={2} isAnimationActive={false}/><Area type="monotone" dataKey="completed" name={w('Completed','المكتملة')} stroke={chartColors.completed} fill="url(#completed-fill)" strokeWidth={2.5} isAnimationActive={false}/>
          </AreaChart></ResponsiveContainer>
        </div><p className="insights-note">{w('Completed service compared with all scheduled service, including cancellations.','الخدمات المكتملة مقارنة بكل الرحلات المسجلة، بما فيها الملغاة.')}</p>
      </Panel>
      <Panel title={w('Who you transport','من تنقل؟')} actions={<Link className="ops-text-link" to="/passengers">{w('Passengers','الركاب')}<ArrowUpRight size={14}/></Link>}>
        <div className="insights-mix"><div className="insights-donut" dir="ltr" role="img" aria-label={w(`${mix[0].value} direct employees and ${mix[1].value} staffing employees.`,`${mix[0].value} موظف مباشر و${mix[1].value} من شركات التوظيف.`)}>
          <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={mix} dataKey="value" innerRadius="68%" outerRadius="88%" paddingAngle={3} stroke="none" isAnimationActive={false}>{mix.map((v,i)=><Cell key={v.name} fill={i?chartColors.outsourced:chartColors.completed}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer><div className="insights-donut-label"><strong>{mix[0].value+mix[1].value}</strong><span>{w('active','نشط')}</span></div>
        </div><div className="insights-mix-legend">{mix.map((v,i)=><div key={v.name}><i style={{background:i?chartColors.outsourced:chartColors.completed}}/><span>{v.name}</span><strong>{v.value}</strong></div>)}</div></div><p className="insights-note">{w('Current active passengers. This card is independent of the date filter.','الموظفون النشطون حالياً. هذه البطاقة لا تتغير مع فترة التقرير.')}</p>
      </Panel>
      {!compact && <Panel title={w('Cash collected & paid','التحصيل والسداد الفعلي')}><div className="insights-legend"><span><i style={{background:chartColors.receipts}}/>{w('Receipts','التحصيل')}</span><span><i style={{background:chartColors.payouts}}/>{w('Supplier payments','سداد الموردين')}</span></div><div className="insights-chart" dir="ltr" role="img" aria-label={w('Actual receipts and supplier payments in EGP. See the data table for daily values.','التحصيل والسداد الفعلي بالجنيه المصري. راجع القيم اليومية في جدول البيانات.')}><ResponsiveContainer width="100%" height="100%"><BarChart data={cash} margin={{top:8,right:18,left:0,bottom:0}} accessibilityLayer><CartesianGrid vertical={false} strokeDasharray="3 4"/><XAxis dataKey="date" tickFormatter={shortDate} tickLine={false} axisLine={false}/><YAxis tickFormatter={v=>v>=1000?(v/1000)+'k':v} tickLine={false} axisLine={false}/><Tooltip formatter={(v:any)=>money(v)} labelFormatter={v=>groupSize===1?String(v):w('Week starting ','أسبوع يبدأ ')+v}/><Bar dataKey="receipts" name={w('Receipts','التحصيل')} fill={chartColors.receipts} radius={[4,4,0,0]} isAnimationActive={false}/><Bar dataKey="payouts" name={w('Supplier payments','سداد الموردين')} fill={chartColors.payouts} radius={[4,4,0,0]} isAnimationActive={false}/></BarChart></ResponsiveContainer></div><p className="insights-note">{w('Actual document payments, not revenue or profit. Draft and void documents are excluded.','مدفوعات المستندات الفعلية وليست الإيراد أو الربح. تستبعد المسودات والمستندات الملغاة.')}</p></Panel>}
      {!compact && <Panel title={w('Most active routes','الخطوط الأكثر نشاطاً')}><div className="insights-route-bars">{d.routes.length?d.routes.slice(0,5).map((r:any)=><div key={r.id}><div><span>{r.name}</span><strong>{r.completed} {w('trips','رحلة')}</strong></div><progress max={Math.max(...d.routes.map((x:any)=>x.completed))} value={r.completed} aria-label={r.name}/><small>{r.boarded} {w('boardings','مرة ركوب')} · {r.noShow} {w('absences','مرة غياب')}</small></div>):<p>{w('Complete your first trip to see route performance.','أكمل أول رحلة لعرض أداء الخطوط.')}</p>}</div></Panel>}
    </div>
    <div className="insights-footer"><button className="ops-text-link" aria-expanded={dataOpen} onClick={()=>setDataOpen(!dataOpen)}>{dataOpen?w('Hide chart data','إخفاء بيانات الرسم'):w('View chart data','عرض بيانات الرسم')}</button>{compact?<Link className="ops-text-link" to="/reports">{w('Full report','التقرير الكامل')}<ArrowUpRight size={16}/></Link>:<Button secondary onClick={()=>exportCsv('operations-'+days+'-days',d.daily,columns)}><Download size={16}/>{w('Export daily data','تصدير البيانات اليومية')}</Button>}</div>
    {dataOpen && <div className="ops-table-wrap"><table className="ops-table"><caption className="insights-note">{w('Daily operations and cash movements','التشغيل اليومي وحركة المدفوعات')}</caption><thead><tr>{columns.map(c=><th scope="col" key={c.key}>{c.label}</th>)}</tr></thead><tbody>{d.daily.map((r:any)=><tr key={r.date}>{columns.map(c=><td key={c.key}>{c.key==='date'?r[c.key]:new Intl.NumberFormat(lang==='ar'?'ar-EG':'en-EG').format(r[c.key])}</td>)}</tr>)}</tbody></table></div>}
    {!compact && <p className="insights-note">{w('On-time: departure no later than 5 minutes after schedule, for completed trips with a recorded departure. Attendance: boarded ÷ (boarded + no-show) on completed trips; these are journeys, not unique people. No denominator is shown as —.','الانطلاق في الموعد: خلال ٥ دقائق من الوقت المحدد، للرحلات المكتملة ذات وقت انطلاق مسجل. الحضور: مرات الركوب ÷ (الركوب + الغياب) في الرحلات المكتملة؛ وليست أعداد موظفين فريدة. تظهر — عند عدم وجود بيانات كافية.')}</p>}
  </>;
  return compact?<section className="insights-section">{charts}</section>:<Page title={w('Reports & insights','التقارير والتحليلات')} description={w('Understand service performance and actual cash movements.','تابع جودة التشغيل وحركة التحصيل والسداد الفعلية.')}>{charts}</Page>;
}
