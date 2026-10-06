import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AuthProvider } from "./contexts/AuthContext";
import { AppLayout } from "./components/layout/AppLayout";
import "./pages/operations/operations.css";

// Lazy-loaded pages for high performance and fast navigation
const Login = lazy(() => import("./pages/auth/Login").then(m => ({ default: m.Login })));
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard").then(m => ({ default: m.Dashboard })));
const TripsPage = lazy(() => import("./pages/trips/TripsPage").then(m => ({ default: m.TripsPage })));
const VehiclesPage = lazy(() => import("./pages/vehicles/VehiclesPage").then(m => ({ default: m.VehiclesPage })));
const DriversPage = lazy(() => import("./pages/drivers/DriversPage").then(m => ({ default: m.DriversPage })));
const RoutesPage = lazy(() => import("./pages/routes/RoutesPage").then(m => ({ default: m.RoutesPage })));
const ClientsPage = lazy(() => import("./pages/clients/ClientsPage").then(m => ({ default: m.ClientsPage })));
const ContractsPage = lazy(() => import("./pages/contracts/ContractsPage").then(m => ({ default: m.ContractsPage })));
const MaintenancePage = lazy(() => import("./pages/maintenance/MaintenancePage").then(m => ({ default: m.MaintenancePage })));
const AccountingPage = lazy(() => import("./pages/accounting/AccountingPage").then(m => ({ default: m.AccountingPage })));
const Insights = lazy(() => import("./pages/operations/Insights").then(m => ({ default: m.Insights })));
const RolesPage = lazy(() => import("./pages/users/RolesPage").then(m => ({ default: m.RolesPage })));
const UsersPage = lazy(() => import("./pages/users/UsersPage").then(m => ({ default: m.UsersPage })));
const Guide = lazy(() => import("./pages/operations/Guide").then(m => ({ default: m.Guide })));
const OperationsSettings = lazy(() => import("./pages/operations/Settings").then(m => ({ default: m.OperationsSettings })));
const AuditLog = lazy(() => import("./pages/operations/Settings").then(m => ({ default: m.AuditLog })));
const Records = lazy(() => import("./pages/operations/Records").then(m => ({ default: m.Records })));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[40vh] w-full" role="status">
    <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<Login />} />

                {/* Authenticated Application Routes */}
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/trips" element={<TripsPage />} />
                  <Route path="/vehicles" element={<VehiclesPage />} />
                  <Route path="/drivers" element={<DriversPage />} />
                  <Route path="/routes" element={<RoutesPage />} />
                  <Route path="/clients" element={<ClientsPage />} />
                  <Route path="/contracts" element={<ContractsPage />} />
                  <Route path="/maintenance" element={<MaintenancePage />} />
                  <Route path="/accounting" element={<AccountingPage />} />
                  <Route path="/reports" element={<Insights />} />
                  <Route
                    path="/passengers"
                    element={<Records key="passengers" resource="passengers" />}
                  />
                  <Route
                    path="/partners"
                    element={<Records key="partners" resource="partners" />}
                  />
                  <Route
                    path="/sites"
                    element={<Records key="sites" resource="sites" />}
                  />
                  <Route
                    path="/enrollments"
                    element={<Records key="enrollments" resource="enrollments" />}
                  />
                  <Route
                    path="/schedules"
                    element={<Records key="plans" resource="plans" />}
                  />
                  <Route path="/settings" element={<OperationsSettings />} />
                  <Route path="/guide" element={<Guide />} />
                  <Route path="/audit" element={<AuditLog />} />
                  <Route path="/roles" element={<RolesPage />} />
                  <Route path="/users" element={<UsersPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </LanguageProvider>
    </QueryClientProvider>
  );
};

export default App;
