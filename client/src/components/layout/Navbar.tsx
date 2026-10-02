import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { LogOut, Globe, Menu, BookOpen, Search, ArrowUpRight, UserRound } from "lucide-react";
import { NotificationDropdown } from "./NotificationDropdown";
import { Dialog, Empty } from "../../pages/operations/ui";
import { allowedDestinations } from "./navigation";

export const Navbar = ({ onToggleSidebar, sidebarOpen = false }: { onToggleSidebar?: () => void; sidebarOpen?: boolean }) => {
  const { user, logout } = useAuth();
  const { lang, toggleLang } = useLanguage();
  const { pathname } = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ar = lang === "ar";
  const portal = ["DRIVER", "CLIENT", "SUPPLIER"].includes(user?.role || "");
  const pages = allowedDestinations(user?.role);
  const current = pages.find(([path]) => path === pathname);
  const results = pages.filter((page) => page.join(" ").toLowerCase().includes(search.trim().toLowerCase()));
  const closeSearch = () => { setSearchOpen(false); setSearch(""); };
  return (
    <>
      <header className="ops-navbar">
        <div className="ops-navbar-start">
          <button className="ops-icon ops-menu-toggle" aria-label={ar ? "القائمة الرئيسية" : "Open navigation"} aria-controls="main-navigation" aria-expanded={sidebarOpen} onClick={onToggleSidebar}><Menu size={21} /></button>
          <Link to="/" className="ops-navbar-logo" aria-label="ON TIME"><img src="/brand/on-time-mark.png" alt="" width="36" height="36" /></Link>
          <div className="ops-navbar-context"><span>ON TIME <span className="ops-navbar-divider">/</span> {ar ? "مساحة العمل" : "Workspace"}</span><strong>{current?.[ar ? 2 : 1] || (ar ? "مساحة العمل" : "Workspace")}</strong></div>
        </div>
        <nav className="ops-navbar-end" aria-label={ar ? "أدوات مساحة العمل" : "Workspace tools"}>
          <button className="ops-page-finder" onClick={() => setSearchOpen(true)} aria-label={ar ? "البحث عن صفحة" : "Find a page"}><Search size={18} /><span>{ar ? "انتقل إلى صفحة…" : "Find a page…"}</span></button>
          {!portal && <NotificationDropdown />}
          <button className="ops-language" onClick={toggleLang} aria-label={ar ? "Switch to English" : "التبديل إلى العربية"}><Globe size={16} /><span>{ar ? "EN" : "ع"}</span></button>
          <button className="ops-avatar" onClick={() => setAccountOpen(true)} aria-label={ar ? "الحساب والمساعدة" : "Account and help"} title={user?.fullName}><UserRound size={19} /></button>
        </nav>
      </header>
      {searchOpen && <Dialog title={ar ? "إلى أين تريد الانتقال؟" : "Where would you like to go?"} onClose={closeSearch}>
        <label className="ops-search ops-nav-search"><Search size={19} /><input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder={ar ? "ابحث باسم الصفحة…" : "Search pages…"} aria-label={ar ? "البحث عن صفحة" : "Search pages"} /></label>
        <nav className="ops-search-results" aria-label={ar ? "نتائج البحث" : "Page results"}>
          {results.map(([path, en, arabic]) => <Link key={path} to={path} onClick={closeSearch} aria-current={path === pathname ? "page" : undefined}><span>{ar ? arabic : en}</span><ArrowUpRight size={17} /></Link>)}
          {!results.length && <Empty>{ar ? "لا توجد صفحة بهذا الاسم. جرّب كلمة أخرى." : "No matching pages. Try another word."}</Empty>}
        </nav>
      </Dialog>}
      {accountOpen && <Dialog title={ar ? "الحساب والمساعدة" : "Account and help"} onClose={() => setAccountOpen(false)}>
        <div className="ops-account-card"><img src="/brand/on-time-mark.png" alt="ON TIME" width="64" height="64" /><div><strong>{user?.fullName}</strong><small dir="ltr">{user?.email}</small></div></div>
        <div className="ops-account-actions"><Link className="ops-button secondary" to="/guide" onClick={() => setAccountOpen(false)}><BookOpen size={18} />{ar ? "دليل الاستخدام" : "User guide"}</Link><button className="ops-button secondary danger" onClick={logout}><LogOut size={18} />{ar ? "تسجيل الخروج" : "Sign out"}</button></div>
      </Dialog>}
    </>
  );
};
