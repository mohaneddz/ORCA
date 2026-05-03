import { Navigate, Route, Routes, useLocation, useSearchParams } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import RequireAuth from "@/components/layout/RequireAuth";
import NotFoundPage from "@/pages/NotFoundPage";
import ControlCenterPage from "@/pages/ControlCenterPage";
import DevicesPage from "@/pages/RegisteredDevicesPage";
import DeviceDetailsPage from "@/pages/DeviceDetailsPage";
import NetworkPage from "@/pages/NetworkPage";
import AccountsPage from "@/pages/AccountsPage";
import TrainingPage from "@/pages/EmployeePlaygroundPage";
import CiscoPage from "@/pages/CiscoPage";
import SettingsPage from "@/pages/SettingsPage";
import AccountPage from "@/pages/AccountPage";
import HomePage from "@/pages/HomePage";
import SummaryPage from "@/pages/SummaryPage";
import VirtualMachinesPage from "@/pages/VirtualMachinesPage";
import ChatPage from "@/pages/ChatPage";
import BillingUsagePage from "@/pages/BillingUsagePage";
import LoginPage from "@/pages/auth/LoginPage";
import { ROUTES } from "@/config/routes";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";
import { useEffect } from "react";

function LoginRoute() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || ROUTES.summary;

  if (user) {
    return <Navigate to={redirect} replace />;
  }

  return <LoginPage />;
}

function RootRoute() {
  const { user } = useAuth();
  return <Navigate to={user ? ROUTES.summary : ROUTES.login} replace />;
}

function NotFoundRoute() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to={`${ROUTES.login}?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return <NotFoundPage />;
}

function RouteLogger() {
  const location = useLocation();

  useEffect(() => {
    logger.info("route.change", { path: location.pathname, search: location.search });
  }, [location.pathname, location.search]);

  return null;
}

export default function App() {
  return (
    <>
      <RouteLogger />
      <Routes>
        <Route path={ROUTES.root} element={<RootRoute />} />
        <Route path={ROUTES.login} element={<LoginRoute />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path={ROUTES.summary} element={<SummaryPage />} />
            <Route path={ROUTES.home} element={<HomePage />} />
            <Route path={ROUTES.controlCenter} element={<ControlCenterPage />} />
            <Route path={ROUTES.devices} element={<DevicesPage />} />
            <Route path={ROUTES.deviceDetails} element={<DeviceDetailsPage />} />
            <Route path={ROUTES.network} element={<NetworkPage />} />
            <Route path={ROUTES.accounts} element={<AccountsPage />} />
            <Route path={ROUTES.training} element={<TrainingPage />} />
            <Route path={ROUTES.cisco} element={<CiscoPage />} />
            <Route path={ROUTES.chat} element={<ChatPage />} />
            <Route path={ROUTES.virtualMachines} element={<VirtualMachinesPage />} />
            <Route path={ROUTES.billingUsage} element={<BillingUsagePage />} />
            <Route path={ROUTES.settings} element={<SettingsPage />} />
            <Route path={ROUTES.account} element={<AccountPage />} />
          </Route>
        </Route>

        <Route path={ROUTES.notFound} element={<NotFoundRoute />} />
      </Routes>
    </>
  );
}
