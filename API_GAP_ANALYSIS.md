# CyberBase API Integration & Gap Analysis

This document serves as the master checklist for the Frontend and Backend teams to synchronize their work, eliminate dead code, and finish the integration for the hackathon pitch.

---

## 🛑 1. CRITICAL: Rogue Code in Frontend (Action Required)
The frontend contains several files and API calls related to **VMware/vSphere**. This has absolutely nothing to do with the CyberBase architecture (which focuses on endpoint agents, browser extensions, and phishing). This is likely boilerplate code from a template that needs to be removed or ignored.

*   **Rogue Files to Delete/Ignore:**
    *   `App/src/pages/BillingUsagePage.tsx`
    *   `App/src/pages/VirtualMachinesPage.tsx`
    *   `App/src/pages/DeviceDetailsPage.tsx`
    *   `App/src/lib/vmware/` (Entire folder: `vsphereClient.ts`, `vmwareService.ts`, etc.)
*   **Action for Frontend:** Stop trying to call `/api/vmware/...` endpoints. Delete these files to clean up the UI routing.

---

## 🟢 2. Ready Backend APIs (Frontend Needs to Connect)
The backend Django server has extensive, fully functional endpoints that the frontend is currently **not utilizing** (relying on `DUMMY_DATA` instead).

### A. Employee & Account Management
*   **Backend Has:** 
    *   `GET/POST /api/employees/`
    *   `PATCH/DELETE /api/employees/<uuid>/`
*   **Frontend Needs:** Update `AccountsPage.tsx` and `AccountPage.tsx`. Remove the hardcoded dummy arrays (e.g., `["karim@org.com", ...]`) and replace them with `fetch('/api/employees/')`.

### B. Dashboard & Analytics (Data Warehouse)
*   **Backend Has:**
    *   `GET /api/dw/summary/` (Get global maturity score and risk-to-money metrics)
    *   `GET /api/dw/trend/` (Get historical risk trends)
    *   `GET /api/dw/ml/anomalies/` (Get AI-detected anomalies)
*   **Frontend Needs:** Update `DashboardPage.tsx`, `HomePage.tsx`, and `SummaryPage.tsx` to pull these real metrics instead of static UI widgets.

### C. Gamification & Phishing
*   **Backend Has:**
    *   `GET /api/gamification/leaderboard/` (Employee scores)
    *   `GET /api/gamification/quizzes/`
    *   `POST /api/phishing/campaigns/<uuid>/launch/` (Launch a simulated attack)
    *   `GET /api/phishing/analytics/`
*   **Frontend Needs:** Update `EmployeePlaygroundPage.tsx` to fetch the leaderboard and available quizzes. Add a button in the `ControlCenterPage.tsx` to hit the `/launch/` endpoint for phishing.

### D. Agent & Device Management
*   **Backend Has:**
    *   `GET /api/agent/network-snapshot/`
    *   `GET /api/agent/port-audit/`
    *   `GET /api/agent/software-audit/`
*   **Frontend Needs:** Update `NetworkPage.tsx` and `RegisteredDevicesPage.tsx` to display real discovered devices and software audits from these endpoints.

---

## 🟡 3. Missing Backend APIs (Backend Needs to Build)
The frontend expects a few features that are not explicitly mapped in the backend `urls.py` yet.

1.  **AI Chatbot Route for Copilot:**
    *   Currently, the frontend (`ChatPage.tsx` and `SummaryPage.tsx`) is making direct API calls to Groq (`GROQ_BASE_URL/chat/completions`). 
    *   *Security Risk:* You shouldn't expose API keys in the frontend. 
    *   *Action for Backend:* Create a proxy endpoint (e.g., `POST /api/ai/chat/`) that securely handles the Groq/Nvidia LLM calls using the backend's `.env` keys.
2.  **Admin Force Password Reset:**
    *   The frontend `ControlCenterPage.tsx` has a button for "Forced account password reset".
    *   *Action for Backend:* The `PATCH /api/employees/<uuid>/` endpoint technically supports updating passwords, but ensure it forces a logout token revocation for that specific employee.
3.  **Approve/Reject Unknown Devices (Shadow IT):**
    *   *Action for Backend:* Ensure there is an endpoint like `PATCH /api/agent/network-snapshot/<id>/approve/` so the admin can whitelist a discovered device from the `NetworkPage.tsx`.

---

