import { canVisit } from './navigation';
import { NavLink } from "react-router-dom";
import { LayoutDashboard, ClipboardList, CalendarDays, BookOpen, Receipt } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useWords } from "../../pages/operations/ui";
export function MobileNav() {
  const { user } = useAuth();
  const w = useWords();
  const portal = ["DRIVER", "CLIENT", "SUPPLIER"].includes(user?.role || "");
  const links = portal ? [
    { to: "/", en: "My trips", ar: "رحلاتي", Icon: ClipboardList },
    ...(user?.role !== "DRIVER" ? [{ to: "/billing", en: "Statements", ar: "المستندات", Icon: Receipt }] : []),
    { to: "/guide", en: "Help", ar: "المساعدة", Icon: BookOpen },
  ] : [
    { to: "/", en: "Home", ar: "الرئيسية", Icon: LayoutDashboard },
    { to: "/trips", en: "Dispatch", ar: "التشغيل", Icon: ClipboardList },
    { to: "/schedules", en: "Schedules", ar: "الجداول", Icon: CalendarDays },
    { to: "/guide", en: "Help", ar: "المساعدة", Icon: BookOpen },
  ];
  return <nav className="ops-mobile-nav" aria-label={w("Quick navigation", "التنقل السريع")}>{links.filter(link=>canVisit(link.to,user)).map(({to,en,ar,Icon}) => <NavLink key={to} to={to} end={to === "/"}><Icon size={20}/><span>{w(en,ar)}</span></NavLink>)}</nav>;
}
