import { ROUTES } from "@/config/routes";

type NavItem = {
  key: string;
  label: string;
  href: string;
};

type NavSection = {
  key: string;
  label: string;
  items: NavItem[];
};

export const SIDEBAR_SECTIONS: NavSection[] = [
  {
    key: "overview",
    label: "Overview",
    items: [{ key: "home", label: "Home", href: ROUTES.home }],
  },
  {
    key: "functionalities",
    label: "Functionalities",
    items: [
      { key: "control-center", label: "Control Center", href: ROUTES.controlCenter },
      { key: "registered-devices", label: "Registered Devices", href: ROUTES.registeredDevices },
      { key: "network", label: "Network", href: ROUTES.network },
      { key: "accounts", label: "Accounts", href: ROUTES.accounts },
      { key: "employee-playground", label: "Employee Playground", href: ROUTES.employeePlayground },
      { key: "cisco", label: "Cisco Devices", href: ROUTES.cisco },
    ],
  },
  {
    key: "misc",
    label: "Miscellaneous",
    items: [
      { key: "settings", label: "Settings", href: ROUTES.settings },
      { key: "account", label: "Account", href: ROUTES.account },
    ],
  },
  
];

