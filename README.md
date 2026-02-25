# DarwinKPI

A full-stack web application for tracking, managing, and visualizing Key Performance Indicators (KPIs) across organizations. DarwinKPI enables teams to define metrics, import performance data, monitor progress through interactive charts, and generate downloadable reports — all within a role-based, multi-organization platform.

---

## Table of Contents

- [Project Description](#project-description)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Running the Backend](#running-the-backend)
  - [Running the Frontend](#running-the-frontend)
- [Creating Accounts](#creating-accounts)
- [User Roles](#user-roles)
- [Project Structure](#project-structure)

---

## Project Description

DarwinKPI is a performance management platform built for organizations that need a centralized, data-driven way to track KPIs. The system supports multiple organizations, each isolated from one another, with invite-code-based membership. Within each organization, three distinct roles (Admin, Analyst, and User) control access to features like KPI creation, data import, analytics, user management, and report generation.

---

## Features

### Authentication & Organizations
- **Registration** — Create a new organization (becomes Admin) or join an existing one using an invite code.
- **Login** — JWT-based authentication with session persistence.
- **Invite Codes** — Each organization is assigned a unique invite code for onboarding new members.
- **Organization Settings** — Admins can view and manage organization details, including regenerating the invite code.

### KPI Management
- Create, edit, and delete KPIs with fields for name, description, unit, target value, frequency (daily/weekly/monthly), and preferred visualization type.
- KPIs are scoped to the organization — members only see their org's KPIs.

### Data Import
- Upload performance data via **CSV** or **Excel (.xlsx)** files, mapped to a specific KPI.
- Parses and stores data records linked to the importing user and organization.

### Dashboard
- **KPI Performance Overview** — Interactive charts (line or bar) showing performance data over selectable time ranges (7 days, 30 days, 90 days, 1 year, all time, or a custom date range).
- Configurable widgets per KPI for at-a-glance monitoring.

### Analytics
- Aggregated analytics view across all KPIs in the organization.
- Filter and explore performance trends with chart-based visualizations.

### Admin Dashboard
- High-level overview for administrators, including organization-wide performance summaries.

### User Management *(Admin only)*
- View all users in the organization.
- Create new users with specified roles directly from the admin panel.
- Assign roles: Admin, Analyst, or User.
- Manage user status (Active/Inactive).

### Reports & Downloads
- Generate and download **PDF reports** for KPI performance data.
- Reports include branded headers, formatted data tables, and page numbers.

### Activity Logs *(Admin only)*
- Full audit log of user actions within the organization.
- Filter logs by individual user.

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| [Angular 19](https://angular.dev/) | SPA framework |
| [Angular Material](https://material.angular.io/) | UI components |
| [Tailwind CSS 3](https://tailwindcss.com/) | Utility-first styling |
| [Chart.js](https://www.chartjs.org/) + [ng2-charts](https://valor-software.com/ng2-charts/) | Interactive charts |
| [Font Awesome](https://fontawesome.com/) | Icons |
| [RxJS](https://rxjs.dev/) | Reactive state & HTTP |
| [TypeScript 5.7](https://www.typescriptlang.org/) | Type-safe development |

### Backend
| Technology | Purpose |
|---|---|
| [Node.js](https://nodejs.org/) | Runtime environment |
| [Express.js 4](https://expressjs.com/) | HTTP server & routing |
| [SQLite3](https://www.sqlite.org/) | Primary database |
| [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | Password hashing |
| [JSON Web Tokens (jsonwebtoken)](https://github.com/auth0/node-jsonwebtoken) | Authentication |
| [Multer](https://github.com/expressjs/multer) | File upload handling |
| [xlsx](https://sheetjs.com/) | Excel file parsing |
| [csv-parse](https://csv.js.org/parse/) | CSV file parsing |
| [PDFKit](https://pdfkit.org/) | PDF report generation |
| [dotenv](https://github.com/motdotla/dotenv) | Environment configuration |

### Deployment
| Service | Purpose |
|---|---|
| [Vercel](https://vercel.com/) | Frontend hosting |
| [Railway](https://railway.app/) | Backend hosting with persistent volume |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [npm](https://www.npmjs.com/) v9 or higher
- [Angular CLI](https://angular.dev/tools/cli) v21 (`npm install -g @angular/cli`)

### Environment Variables

Create a `.env` file inside the `server/` directory:

```env
JWT_SECRET=your_jwt_secret_key
PORT=3000
# Optional: for Railway persistent storage
# RAILWAY_VOLUME_MOUNT_PATH=/data
```

> The database (`darwinkpi.db`) is created automatically in the `server/` directory on first run.

### Running the Backend

```bash
cd server
npm install
node index.js
```

The API will be available at `http://localhost:3000`.

### Running the Frontend

```bash
cd client
npm install
ng serve --open
```

The app will open at `http://localhost:4200`.

> The frontend points to `http://localhost:3000` by default. To change this, update `client/src/environments/environment.ts`.

---

## Creating Accounts

There are two ways to create an account:

### Option 1 — Create a New Organization (Admin Account)
1. Navigate to the **Register** page.
2. Fill in your name, email, and password (minimum 8 characters).
3. Enter a new **Organization Name**.
4. Submit — you will be registered as the **Admin** of the new organization.
5. After registration, find your organization's **invite code** in Organization Settings to share with colleagues.

### Option 2 — Join an Existing Organization
1. Navigate to the **Register** page.
2. Fill in your name, email, and password.
3. Enter the **Invite Code** provided by your organization's admin (leave Organization Name blank).
4. Submit — you will join the organization as a **User** by default.

### Option 3 — Admin Creates a User Directly *(Admin only)*
1. Log in as an Admin.
2. Go to **User Management**.
3. Click **Add User**, fill in the details, and assign a role.
4. The new user account is created immediately with a default password (`TempPass123!`) unless a custom password is specified.

---

## User Roles

| Role | Permissions |
|---|---|
| **Admin** | Full access — manage users, KPIs, data imports, organization settings, view logs, access admin dashboard |
| **Analyst** | Create and manage KPIs, import data, view analytics and dashboard |
| **User** | View dashboard and analytics, import data |

---

## Project Structure

```
darwinKPI/
├── client/                  # Angular frontend
│   └── src/
│       └── app/
│           ├── admin-dashboard/     # Admin overview page
│           ├── analytics/           # Analytics & trend charts
│           ├── dashboard/           # KPI performance dashboard
│           ├── data-import/         # CSV/Excel data upload
│           ├── kpi-management/      # Create & manage KPIs
│           ├── login/               # Login page
│           ├── register/            # Registration page
│           ├── navbar/              # Side navigation
│           ├── topbar/              # Top bar
│           ├── user-management/     # User CRUD (Admin only)
│           ├── organization-settings/  # Org info & invite code
│           └── welcome/             # Landing/welcome page
│
└── server/                  # Express backend
    ├── index.js             # Entry point & DB initialization
    ├── middleware/
    │   └── auth.js          # JWT authentication middleware
    └── routes/
        ├── auth.js          # Register & login
        ├── kpi.js           # KPI CRUD
        ├── performance.js   # Performance data entries
        ├── analytics.js     # Analytics aggregation
        ├── import.js        # CSV/Excel file import
        ├── download.js      # PDF report generation
        ├── users.js         # User management
        ├── organizations.js # Organization management
        └── logs.js          # Activity audit logs
```
