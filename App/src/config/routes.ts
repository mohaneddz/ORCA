export const ROUTES = {
  root: "/",
  login: "/login",
  summary: "/summary",
  home: "/home",
  controlCenter: "/control-center",
  devices: "/devices",
  deviceDetails: "/devices/:deviceId",
  network: "/network",
  accounts: "/accounts",
  training: "/training",
  chat: "/chat",
  billingUsage: "/billing-usage",
  settings: "/settings",
  account: "/account",
  virtualMachines: "/virtual-machines",
  notFound: "*",
} as const;

export type AppRouteKey = keyof typeof ROUTES;
