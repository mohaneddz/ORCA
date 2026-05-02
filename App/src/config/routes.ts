export const ROUTES = {
  root: "/",
  login: "/login",
  home: "/home",
  controlCenter: "/control-center",
  registeredDevices: "/registered-devices",
  network: "/network",
  accounts: "/accounts",
  employeePlayground: "/employee-playground",
  settings: "/settings",
  account: "/account",
  notFound: "*",
} as const;

export type AppRouteKey = keyof typeof ROUTES;