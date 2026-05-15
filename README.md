<h1 style="font-family: Arial, sans-serif; font-size: 36px; color: #58A6FF; display: flex; align-items: center; gap: 12px; border-bottom: 3px solid #58A6FF; padding-bottom: 8px;">
  <img src="App/src-tauri/icons/128x128.png" alt="ORCA Icon" style="height: 55px; width: 55px; object-fit: contain; border-radius: 8px;">
  ORCA - Cyber Maturity Cockpit
</h1>

A three-part security awareness and monitoring platform:

| Component | Tech | Purpose |
|---|---|---|
| **Backend** | Django 5, PostgreSQL (Supabase) | REST API, data collection, analytics, ML |
| **Dashboard (App)** | Tauri 2 + React 19 + Vite | Desktop admin dashboard |
| **Extension** | Chrome Manifest V3 | Employee browser guard — DLP, phishing simulation, quizzes |

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Python | 3.11+ | Use a `conda` or `venv` environment |
| Node.js | 18+ | |
| pnpm | 9+ | `npm install -g pnpm` |
| Rust + Cargo | latest stable | Required by Tauri — [rustup.rs](https://rustup.rs) |
| Tauri CLI | v2 | Installed automatically via `pnpm` |
| Chrome / Chromium | any | For the extension |

---

## 1. Backend

### 1.1 Environment variables

Create `Backend/.env` (copy the template below):

```dotenv
SECRET_KEY=your-django-secret-key

# PostgreSQL connection string (Supabase or any Postgres)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# SMTP — needed only to send phishing simulation emails
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=you@example.com
EMAIL_HOST_PASSWORD=your-app-password
EMAIL_USE_TLS=True

# Public URL of this backend (used in phishing click-tracking links)
PHISHING_BASE_URL=http://localhost:8000

# Optional Supabase SDK credentials (used by some views)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
```

### 1.2 Install & run

```bash
cd Backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

API is available at `http://127.0.0.1:8000/api/`.

### 1.3 Create a superuser (Django admin)

```bash
python manage.py createsuperuser
```

Django admin: `http://127.0.0.1:8000/admin/`

### 1.4 Production deployment (Leapcell)

- **Build command:** `pip install -r Backend/requirements.txt && cd Backend && python manage.py migrate`
- **Start command:** `gunicorn core.wsgi:application --chdir Backend`
- Set all `.env` variables as platform environment variables.

---

## 2. Dashboard (App)

The dashboard is a Tauri 2 desktop application (React + Vite frontend embedded in a native window).

### 2.1 Environment variables

```bash
cp App/.env.example App/.env
```

Edit `App/.env`:

```dotenv
VITE_BACKEND_URL=http://127.0.0.1:8000/

# Supabase (storage / auth used by some pages)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx

# Optional — RAG / AI features
GROQ_API_KEY=gsk_...
PINECONE_API_KEY=pcsk_...
PINECONE_INDEX_NAME=innov
```

### 2.2 Install dependencies

```bash
cd App
pnpm install
```

### 2.3 Run in development

```bash
pnpm tauri dev
```

This starts the Vite dev server on port 7777 and opens the native Tauri window. Hot-reload is enabled for the React frontend.

### 2.4 Build a distributable

```bash
pnpm tauri build
```

The installer is output to `App/src-tauri/target/release/bundle/`.

> **Rust note:** The first `tauri dev` / `tauri build` compiles the Rust backend — expect a few minutes on first run.

---

## 3. Chrome Extension

The extension is plain JavaScript (no build step required).

### 3.1 Point at your backend

Open `Extension/background.js` and confirm line 1:

```js
const BACKEND_URL = "http://127.0.0.1:8000"; // change for production
```

### 3.2 Load in Chrome

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select the `Extension/` folder
4. The "CyberBase Web Guard" extension appears in your toolbar

### 3.3 Employee login

Click the extension icon → enter the employee's **email** → **Next** → enter **password** → **Login**.  
The session token is stored in `chrome.storage.local` and sent on every API call as `Authorization: EmployeeToken <token>`.

---

## Running the full stack locally

Open three terminals:

```bash
# Terminal 1 — Backend
cd Backend
python manage.py runserver

# Terminal 2 — Dashboard (Tauri dev window)
cd App
pnpm tauri dev

# Terminal 3 — (no server needed for the extension)
# Load it in Chrome as described in section 3
```

---

## Project structure

```
Innov/
├── Backend/          # Django project (package: core)
│   ├── core/         # Settings, URLs, WSGI
│   ├── organizations/# Org & employee auth, token management
│   ├── extension/    # DLP logs, blacklist, poll events
│   ├── gamification/ # Quizzes, batches, leaderboard
│   ├── phishing/     # Templates, campaigns, training, analytics
│   ├── agent/        # Device snapshots, risk engine, audits
│   └── datawarehouse/# Cross-app analytics, ML, export
├── App/              # Tauri + React dashboard
│   ├── src/          # React components, pages, contexts
│   └── src-tauri/    # Rust Tauri shell
├── Extension/        # Chrome Manifest V3 extension
└── Documents/        # API documentation
```

## API documentation

See [Documents/API_Documentation.md](Documents/API_Documentation.md) for the full reference — 58 endpoints across all 6 Django apps.
