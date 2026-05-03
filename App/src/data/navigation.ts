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
    items: [
      { key: "summary", label: "Dashboard", href: ROUTES.summary },
      { key: "home", label: "Home", href: ROUTES.home },
    ],
  },
  {
    key: "functionalities",
    label: "Functionalities",
    items: [
      { key: "control-center", label: "Control Center", href: ROUTES.controlCenter },
      { key: "devices", label: "Devices", href: ROUTES.devices },
      { key: "network", label: "Network", href: ROUTES.network },
      { key: "accounts", label: "Accounts", href: ROUTES.accounts },
      { key: "training", label: "Training", href: ROUTES.training },
      { key: "chat", label: "Chat", href: ROUTES.chat },
      { key: "virtual-machines", label: "Virtual Machines", href: ROUTES.virtualMachines },
      { key: "billing-usage", label: "Billing & Usage", href: ROUTES.billingUsage },
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

