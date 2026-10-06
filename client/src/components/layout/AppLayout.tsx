import { canVisit } from './navigation';
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { MobileNav } from "./MobileNav";
import { useAuth } from "../../contexts/AuthContext";
export const AppLayout: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated, loading, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const m = window.matchMedia("(max-width:1023px)");
    const changed = () => {
      if (!m.matches) setSidebarOpen(false);
    };
    m.addEventListener("change", changed);
    return () => m.removeEventListener("change", changed);
  }, []);
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [location.pathname]);
  if (loading)
    return (
      <div className="ops-session-loading" role="status">
        جاري تحميل مساحة العمل…
      </div>
    );
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (
    ["DRIVER", "CLIENT", "SUPPLIER"].includes(user?.role || "") &&
    !["/", "/trips", "/billing", "/guide"].includes(location.pathname)
  )
    return <Navigate to="/" replace />;
  if (user?.role === "DRIVER" && location.pathname === "/billing")
    return <Navigate to="/" replace />;
  if (!canVisit(location.pathname, user)) return <Navigate to="/guide" replace />;
  return (
    <div className="ops-app-shell">
      <a href="#workspace" className="ops-skip-link">
        Skip to workspace / الانتقال للمحتوى
      </a>
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="ops-main-shell" inert={sidebarOpen}>
        <Navbar sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <main
          ref={mainRef}
          id="workspace"
          className="ops-main-scroll"
          tabIndex={-1}
        >
          <div className="ops-content">
            <Outlet />
          </div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
};
