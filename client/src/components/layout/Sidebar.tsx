import React, { useEffect, useState, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  FileText,
  Bus,
  Users,
  MapPin,
  CalendarDays,
  Wrench,
  Receipt,
  BarChart3,
  UserCog,
  X,
  ContactRound,
  Handshake,
  Settings,
  History,
  Route,
  ClipboardList,
  BookOpen,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useWords } from "../../pages/operations/ui";
export const Sidebar = ({ isOpen = false, onClose }: any) => {
  const panel = useRef<HTMLElement>(null);
  const location = useLocation();
  const [mobile, setMobile] = useState(
    () => window.matchMedia("(max-width:1023px)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(max-width:1023px)");
    const listener = () => setMobile(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);
  useEffect(() => {
    if (!isOpen || !mobile) return;
    const previous = document.activeElement as HTMLElement;
    const focusable = () =>
      Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          "a[href],button,summary",
        ) || [],
      ).filter((e) => e.getClientRects().length > 0);
    focusable()[0]?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "Tab") {
        const items = focusable();
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [isOpen, mobile, onClose]);
  const w = useWords();
  const { user, isAdmin } = useAuth();
  const external = ["DRIVER", "CLIENT", "SUPPLIER"].includes(user?.role || "");
  const groups = external
    ? [
        {
          label: w("Your workspace", "مساحة العمل"),
          items: [
            ["/", "My trips", "رحلاتي", ClipboardList],
            ["/guide", "Help & guide", "دليل الاستخدام", BookOpen],
          ],
        },
      ]
    : [
        {
          label: w("OPERATIONS", "التشغيل والرحلات"),
          items: [
            ["/", "Overview", "نظرة عامة", LayoutDashboard],
            ["/trips", "Daily Trips & Dispatch", "تشغيل ورحلات اليوم", ClipboardList],
            ["/reports", "Reports & insights", "التقارير والتحليلات", BarChart3],
            ["/guide", "Help & setup", "المساعدة والإعداد", BookOpen],
          ],
        },
        {
          label: w("NETWORK & FLEET", "الشبكة والأسطول"),
          items: [
            ["/clients", "Clients", "الشركات العملاء", Building2],
            ["/routes", "Route Templates", "قوالب وخطوط السير", Route],
            [
              "/partners",
              "Partners & suppliers",
              "الشركاء والموردون",
              Handshake,
            ],
            ["/vehicles", "Vehicles", "المركبات", Bus],
            ["/drivers", "Drivers", "السائقون", Users],
            ["/maintenance", "Maintenance", "الصيانة", Wrench],
          ],
        },
        {
          label: w("FINANCE & CONTROL", "الحسابات والإدارة"),
          items: [
            ["/accounting", "Accounts & Treasury", "الحسابات والخزينة العامة", Receipt],
            ["/settings", "Workspace settings", "إعدادات التشغيل", Settings],
            ...(isAdmin
              ? [
                  ["/users", "Users", "المستخدمون", UserCog],
                  ["/audit", "Activity log", "سجل النشاط", History],
                ]
              : []),
          ],
        },
      ];
  return (
    <>
      {isOpen && (
        <button
          className="ops-sidebar-backdrop"
          aria-label={w("Close navigation", "إغلاق القائمة")}
          onClick={onClose}
        />
      )}
      <aside
        id="main-navigation"
        ref={panel}
        role={mobile && isOpen ? "dialog" : undefined}
        aria-modal={mobile && isOpen ? true : undefined}
        aria-label={w("Main navigation", "القائمة الرئيسية")}
        inert={mobile && !isOpen}
        className={`ops-sidebar ${isOpen ? "open" : ""}`}
      >
        <div className="ops-brand">
          <div className="ops-brand-mark">
            <img src="/brand/on-time-mark.png" width="45" height="45" alt="ON TIME logo" />
          </div>
          <div>
            <strong>ON TIME</strong>
            <span>{w("Employee transport", "نقل الموظفين")}</span>
          </div>
          <button
            className="ops-sidebar-close"
            aria-label={w("Close navigation", "إغلاق القائمة")}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <nav aria-label={w("Main navigation", "التنقل الرئيسي")}>
          {groups.map((g) => (
            <div className="ops-nav-group" key={g.label}>
              <details
                key={g.label + location.pathname}
                open={
                  g === groups[0] ||
                  g.items.some((item: any) => item[0] === location.pathname)
                }
              >
                <summary>{g.label}</summary>
                {g.items.map(([to, en, ar, Icon]: any) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === "/"}
                    onClick={onClose}
                    className={({ isActive }) => (isActive ? "active" : "")}
                  >
                    <Icon size={18} />
                    <span>{w(en, ar)}</span>
                  </NavLink>
                ))}
              </details>
            </div>
          ))}
        </nav>
        <div className="ops-sidebar-footer">
          <span className="ops-brand-dot" />
          <div>
            <strong>{w("Connected operations", "تشغيل مترابط")}</strong>
            <small>
              {w("People · Fleet · Finance", "موظفون · أسطول · حسابات")}
            </small>
          </div>
        </div>
      </aside>
    </>
  );
};
