import { Navigate, Route, Routes, useLocation, useSearchParams } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import RequireAuth from "@/components/layout/RequireAuth";
import NotFoundPage from "@/pages/NotFoundPage";
import ControlCenterPage from "@/pages/ControlCenterPage";
import RegisteredDevicesPage from "@/pages/RegisteredDevicesPage";
import NetworkPage from "@/pages/NetworkPage";
import AccountsPage from "@/pages/AccountsPage";
import EmployeePlaygroundPage from "@/pages/EmployeePlaygroundPage";
import SettingsPage from "@/pages/SettingsPage";
import AccountPage from "@/pages/AccountPage";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/auth/LoginPage";
import { ROUTES } from "@/config/routes";
import { useAuth } from "@/contexts/AuthContext";
import CiscoPage from "@/pages/CiscoPage";

function LoginRoute() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || ROUTES.home;

  if (user) {
    return <Navigate to={redirect} replace />;
  }

  return <LoginPage />;
}

function RootRoute() {
  const { user } = useAuth();
  return <Navigate to={user ? ROUTES.home : ROUTES.login} replace />;
}

function NotFoundRoute() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to={`${ROUTES.login}?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return <NotFoundPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path={ROUTES.root} element={<RootRoute />} />
      <Route path={ROUTES.login} element={<LoginRoute />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path={ROUTES.home} element={<HomePage />} />
          <Route path={ROUTES.controlCenter} element={<ControlCenterPage />} />
          <Route path={ROUTES.registeredDevices} element={<RegisteredDevicesPage />} />
          <Route path={ROUTES.network} element={<NetworkPage />} />
          <Route path={ROUTES.accounts} element={<AccountsPage />} />
          <Route path={ROUTES.employeePlayground} element={<EmployeePlaygroundPage />} />
          <Route path={ROUTES.settings} element={<SettingsPage />} />
          <Route path={ROUTES.cisco} element={<CiscoPage />} />
          <Route path={ROUTES.account} element={<AccountPage />} />
        </Route>
      </Route>

      <Route path={ROUTES.notFound} element={<NotFoundRoute />} />
    </Routes>
  );
}

