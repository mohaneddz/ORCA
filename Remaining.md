# Remaining Work Report (App + Backend Pass)

Date: 2026-05-03
Workspace: `d:\Programming\Tauri\Hackathons\Innov`

## What I Ran

- `App`: `pnpm test` -> failed (1 failing test)
- `App`: `pnpm build` -> failed (TypeScript errors)
- `App/src-tauri`: `cargo check` -> passed
- `App/src-tauri`: `cargo test --quiet` -> passed (48/48)
- `Backend`: `python manage.py check` -> passed
- `Backend`: `python manage.py test` -> blocked/failing due existing `test_postgres` and missing relation `organizations_employee` in test DB state

---

## App Remaining Items (Complete List)

## 1) Release Blockers (must fix before shipping)

- [ ] Frontend build is broken (`pnpm build` fails).
  - TypeScript errors in:
    - `App/src/components/vmware/VmwareDashboard.tsx` (unused imports/vars)
    - `App/src/pages/DashboardPage.tsx` (unused vars, implicit `any`)
    - `App/src/pages/HomePage.tsx` (`tone` type mismatch)
    - `App/src/pages/SettingsPage.tsx` (`helperKey` used but missing in type)
- [ ] Frontend tests are failing (`pnpm test`).
  - `App/src/contexts/__tests__/AppSettingsContext.test.tsx` expects `language: "en"` and old invoke calls, but defaults/state behavior differ.
  - Related defaults now: `App/src/types/settings.ts:16`, `App/src/types/settings.ts:17`

## 2) Security Risks (critical)

- [ ] Secrets are present in `App/.env` and should be rotated immediately.
  - Evidence: `App/.env:1`, `App/.env:6`, `App/.env:18`, `App/.env:20`
- [ ] Malformed env line breaks config parsing.
  - Evidence: `App/.env:22` (`DUMMY_DATA=trueVITE_PINECONE_API_KEY=...`)
- [ ] Login credentials are stored in plaintext in browser storage.
  - Evidence: `App/src/pages/auth/LoginPage.tsx:18`, `App/src/pages/auth/LoginPage.tsx:29`, `App/src/pages/auth/LoginPage.tsx:95`
- [ ] Session object stores plaintext password too.
  - Evidence: `App/src/contexts/AuthContext.tsx:65`, `App/src/contexts/AuthContext.tsx:343`, `App/src/contexts/AuthContext.tsx:393`, `App/src/contexts/AuthContext.tsx:424`
- [ ] Non-`VITE_` secret-style env keys are intentionally exposed to frontend bundle via Vite `envPrefix`.
  - Evidence: `App/vite.config.ts:15`
- [ ] Privacy salt has hardcoded fallback; if env missing, hashing salt becomes predictable.
  - Evidence: `App/src-tauri/src/collectors/private_signal_collector.rs:22`

## 3) Backend Integration Gaps Affecting App

- [ ] VMware frontend calls `/api/vmware/*` but backend has no VMware routes.
  - App calls: `App/src/lib/vmware/vmwareService.ts:40`, `:52`, `:66`, `:102`
  - Performance calls: `App/src/lib/vmware/performanceService.ts:26`, `:46`, `:61`
  - Backend search returned no VMware endpoints.
- [ ] App still defaults to dummy mode, masking missing backend functionality.
  - Evidence: `App/vite.config.ts:9`, `App/src/config/runtime.ts:11`, `App/.env:29`

## 4) Mock/Placeholder Logic Still in Production Paths

- [ ] Network scanner merges hardcoded router mock data into discovered devices.
  - Evidence: `App/src-tauri/src/network_scan.rs:154`, `:171`, `:242`
- [ ] Security collector still reports key fields as placeholders.
  - Evidence: `App/src-tauri/src/collectors/security_collector.rs:7`
- [ ] Network collector still leaves active connections/DNS/default gateway as placeholders.
  - Evidence: `App/src-tauri/src/collectors/network_collector.rs:30`
- [ ] Event log collector is placeholder only.
  - Evidence: `App/src-tauri/src/collectors/event_log_collector.rs:19`, `:29`
- [ ] USB collector is still placeholder for live insertion/removal watchers.
  - Evidence: `App/src-tauri/src/collectors/usb_collector.rs:72`
- [ ] Email/cloud private telemetry is placeholder metadata.
  - Evidence: `App/src-tauri/src/collectors/private_signal_collector.rs:303`

## 5) App UX/Feature Completion Gaps

- [ ] Settings tabs (`security/network/mail/automation/integrations`) are non-functional toggles (display only).
  - Evidence: `App/src/pages/SettingsPage.tsx:67`, `:77`, `:413`
- [ ] Home page "Recent Automations" table has no data source (`rows={[]}`).
  - Evidence: `App/src/pages/HomePage.tsx:119`
- [ ] Network KPIs and charts are still hardcoded/mock-backed in UI.
  - Evidence: `App/src/pages/NetworkPage.tsx:9`, `:168`, `:169`
- [ ] Dashboard includes static fallback tasks and fallback alert text (not fully data-driven).
  - Evidence: `App/src/pages/DashboardPage.tsx:139`, `:146`, `:147`, `:148`
- [ ] Registered Devices table column mismatch: labeled "IP Address" but row uses employee name.
  - Evidence: `App/src/pages/RegisteredDevicesPage.tsx:62`, `:201`, `:207`
- [ ] Control Center still uses blocking `alert(...)` popups instead of in-app toasts/notifications.
  - Evidence: `App/src/pages/ControlCenterPage.tsx:138`, `:141`, `:149`, `:152`, `:169`, `:178`

## 6) Type Safety / Reliability Debt

- [ ] Heavy `any` usage across key pages and auth layer reduces safety and causes runtime drift.
  - Examples: `App/src/pages/NetworkPage.tsx:69`, `App/src/pages/SettingsPage.tsx:174`, `App/src/contexts/AuthContext.tsx:335`
- [ ] `catch(() => null)` is used in several queries, suppressing backend errors and hiding broken features.
  - Example: `App/src/pages/DashboardPage.tsx:119`
- [ ] API key settings typing is inconsistent (`helperKey` in values, not declared in `ApiKeyField`).
  - Evidence: `App/src/pages/SettingsPage.tsx:123`, `:131`

## 7) Data/Environment Hygiene

- [ ] `.env` mixes backend and app secrets in one file and includes sensitive credentials; split per component and keep non-public values out of frontend scope.
- [ ] Defaulting to dummy data (`true`) can make QA think integrations are complete when they are not.
  - Evidence: `App/src/config/runtime.ts:11`, `App/vite.config.ts:9`

---

## Backend Notes from This Pass (for context)

- `python manage.py check` passes.
- `python manage.py test` is not clean in current environment (test DB lifecycle/state issue), which blocks reliable end-to-end verification with App.

---

## Suggested Fix Order

1. Security remediation first: rotate leaked keys, remove plaintext password storage, fix env exposure policy.
2. Restore green CI for App: fix TypeScript errors, then fix failing test expectations.
3. Close integration gaps: either implement `/api/vmware/*` backend routes or remove/feature-flag live VMware mode.
4. Replace mock/placeholder paths used in real UI flows (Network, collectors, Settings toggles).
5. Reduce `any` and silent `catch(() => null)` paths to improve reliability and debuggability.
