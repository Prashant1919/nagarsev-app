# Nagarsevak PMC Dashboard — Setup Guide

A secure, private web app for a Nagarsevak (Ward Councillor) with PMC Pune.
Built on HTML + Tailwind + Vanilla JS, Vercel Serverless Functions, and Google Sheets.

---

## Project Structure

```
nagarsevak-app/
├── public/
│   └── index.html          ← Full frontend (login + all modules)
├── api/
│   ├── _sheets.js          ← Shared Google Sheets client (NOT exposed to browser)
│   ├── _auth.js            ← Token verification middleware
│   ├── auth.js             ← POST /api/auth  (login)
│   ├── schedule.js         ← GET/POST/DELETE /api/schedule
│   ├── grievances.js       ← GET/POST/PATCH  /api/grievances
│   └── stats.js            ← GET /api/stats  (dashboard counts)
├── vercel.json
├── package.json
└── README.md
```

---

## Step 1 — Google Sheet Setup

1. Open your Google Sheet:
   `https://docs.google.com/spreadsheets/d/1nZjXop8q2K2JwayI84ANrFeM1Tq-3I2kgAz2NKdZtuM/edit`

2. Create two tabs (exact names matter):

### Tab: `Schedule`
Add this header row in row 1:
```
Date | Time | Title | Location | Notes | Priority | RowID
```
(Columns A through G)

### Tab: `Records`
Add this header row in row 1:
```
GrievanceID | Date | CitizenName | Phone | Ward | Category | Description | Status | Priority | FollowUpDate | Notes | AssignedTo
```
(Columns A through L)

---

## Step 2 — Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable **Google Sheets API**
4. Go to **IAM & Admin → Service Accounts → Create Service Account**
5. Name it (e.g., `nagarsevak-sheets`)
6. Click **Create and Continue**, skip optional roles, click **Done**
7. Click the service account → **Keys** tab → **Add Key → Create new key → JSON**
8. Download the JSON file — keep it safe, never commit it

9. **Share your Google Sheet with the service account email:**
   - Open the sheet → Share
   - Paste the `client_email` from the JSON (looks like `xxx@yyy.iam.gserviceaccount.com`)
   - Give it **Editor** access

---

## Step 3 — Vercel Deployment

### 3a. Install Vercel CLI (if not installed)
```bash
npm install -g vercel
```

### 3b. Deploy
```bash
cd nagarsevak-app
npm install
vercel --prod
```

Follow prompts. When asked about the framework, select "Other".

### 3c. Set Environment Variables in Vercel Dashboard

Go to your Vercel project → **Settings → Environment Variables** and add:

| Variable | Value |
|---|---|
| `GCP_PROJECT_ID` | `your-project-id` from the JSON |
| `GCP_PRIVATE_KEY_ID` | `private_key_id` from the JSON |
| `GCP_PRIVATE_KEY` | The entire `private_key` value (including `-----BEGIN...-----END-----`) |
| `GCP_CLIENT_EMAIL` | `client_email` from the JSON |
| `GCP_CLIENT_ID` | `client_id` from the JSON |
| `ADMIN_PASSWORD` | Your chosen strong password |
| `SESSION_SECRET` | A random 32+ character string |

> ⚠️ **Important for `GCP_PRIVATE_KEY`:** Paste the key exactly as it appears in the JSON.
> Vercel automatically handles the `\n` newline encoding. Do NOT manually replace them.

---

## Step 4 — Change Login Credentials

In `api/auth.js`, line 11:
```javascript
const USERS = {
  admin: process.env.ADMIN_PASSWORD || 'PMC@2025#Secure',
};
```

The username is `admin`. The password comes from the `ADMIN_PASSWORD` env var.

To add more users or change the username, edit the `USERS` object:
```javascript
const USERS = {
  nagarsevak: process.env.ADMIN_PASSWORD,
  assistant:  process.env.ASSISTANT_PASSWORD,
};
```

---

## Step 5 — Local Development

```bash
# Install Vercel CLI
npm install -g vercel

# Create a .env.local file for local dev
cp .env.example .env.local
# Fill in your values in .env.local

# Run locally
vercel dev
```

Create `.env.local`:
```
GCP_PROJECT_ID=your-project-id
GCP_PRIVATE_KEY_ID=your-key-id
GCP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"
GCP_CLIENT_EMAIL=xxx@yyy.iam.gserviceaccount.com
GCP_CLIENT_ID=123456789
ADMIN_PASSWORD=YourStrongPassword
SESSION_SECRET=your-random-32-char-secret-here
```

---

## Security Notes

- ✅ No Google credentials ever reach the browser
- ✅ Every API endpoint requires a valid signed session token
- ✅ Tokens expire after 8 hours automatically
- ✅ Login has a 800ms delay on failure to slow brute-force
- ✅ `noindex, nofollow` meta tag — search engines won't index the app
- ✅ `sessionStorage` (not localStorage) — token cleared when browser closes
- ✅ All user-generated content is HTML-escaped before rendering

---

## Features

### Login
- Hardcoded credential check via `ADMIN_PASSWORD` env var
- HMAC-SHA256 signed session tokens (no database needed)
- 8-hour session expiry

### Daily Scheduler
- View meetings by date
- Add: date, time, title, location, priority, notes
- Delete meetings
- Dashboard shows today's meetings at a glance

### Grievance Tracker
- Log citizen issues with: name, phone, ward, category, description, priority, follow-up date, assigned officer
- Auto-generated `GRV-` ID for each grievance
- Update status: Open → In Progress → Resolved → Closed
- Add internal notes and follow-up dates
- Live search across name, ID, ward, category, description
- Filter by status
- Status count chips for quick overview

### Dashboard
- KPI cards: Today's meetings, Open grievances, In Progress, Resolved
- Quick action buttons
- Today's schedule preview
