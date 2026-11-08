# Smart RemitTrack

A beginner-friendly MERN prototype for creating international remittances and following each transfer from initiation through delivery. The app combines a clear transfer dashboard with database-backed demo rates, status timelines, practical processing insights, and a complete transaction history.

## Features

- Account registration and login with bcrypt password hashing and seven-day JWT sessions.
- Personal dashboard with sent totals, fees, transfer counts, pending items, monthly activity, and recent transfers.
- Transfer creation with sender/recipient, destination, recipient bank/account and country-specific routing code (IFSC, ABA, sort code, CLABE, IBAN, SWIFT/BIC, etc.), currencies, amount, purpose, database-backed exchange-rate estimate, fee, receive amount, and arrival estimate.
- Sender and receiver countries, account type, bank branch, optional SWIFT/BIC and IFSC where applicable, transfer method, and an optional note. Bank fields are only required for bank deposits.
- A pre-submit transfer review with a unique `SRM-YYYY-XXXXXX` reference, amount, fee, rate, receiver amount, and estimated time.
- INR sending to international destinations, including INR → USD transfers to the United States.
- Recipient account numbers encrypted at rest and masked on transfer details; routing codes are shown for verification.
- History-based personal insights and simple action alerts for large or delayed transfers.
- A receipt available after the transfer is received, with print / browser PDF output and a masked account number.
- Unique reference numbers and an Initiated → Verification → Processing → Sent → Received status timeline.
- Demo status controls to move a transfer through the complete journey; each update creates an in-app notification.
- Rule-based Smart Remit Insight and Normal / Delayed / Attention Required risk indicators using status, amount, country, elapsed time, and the customer's transfer history.
- Searchable/filterable transfer history and private transaction details.
- Analytics for USD-normalized totals, fees, monthly activity, status breakdown, and destinations.
- Read/unread notifications and editable profile details.
- Responsive desktop and mobile navigation and layouts.

## MERN Architecture

- **MongoDB** stores users, transactions, notifications, and exchange-rate records. Relationships use MongoDB ObjectIds.
- **Express.js** provides a JSON REST API with validation, authentication middleware, request throttling, and centralized error handling.
- **React.js** with Vite provides the responsive single-page client and reusable components.
- **Node.js** runs the API, calculation and insight rules, and seed tooling.

The demo exchange rates are seed data in MongoDB and are not live quotes. Recipient bank details are demo data; account numbers are encrypted with AES-256-GCM using the server's `JWT_SECRET` key and are never returned in full. This is a learning prototype, not a money-movement service; its status controls simulate progress and do not contact financial institutions.

## Folder Structure

```text
Smart RemitTrack/
├── client/
│   ├── src/
│   │   ├── App.jsx                 # Protected routes and responsive app shell
│   │   ├── AuthContext.jsx         # Sign-in, registration, and session state
│   │   ├── api.js                  # API helper, data hook, formatting
│   │   ├── components.jsx          # Shared buttons, badges, tables, cards
│   │   ├── pages.jsx               # Login, dashboard, tracking, history, analytics, etc.
│   │   ├── TransferFormPage.jsx    # Transfer entry and confirmation summary
│   │   ├── ReceiptPage.jsx         # Completed-transfer receipt and print view
│   │   └── styles.css              # Responsive design system
│   ├── index.html
│   └── vite.config.js
├── server/
│   ├── src/
│   │   ├── config/                 # MongoDB connection
│   │   ├── middleware/             # JWT authentication and errors
│   │   ├── models/                 # User, Transaction, Notification, ExchangeRate
│   │   ├── routes/                 # Auth, user, transaction, notification, analytics APIs
│   │   ├── utils/                  # Reference numbers and insight/risk rules
│   │   ├── app.js                  # Express middleware and routes
│   │   ├── demo.js                 # Disposable MongoDB-backed demo launcher
│   │   ├── seed.js                 # Idempotent exchange rates and sample history
│   │   └── server.js               # Persistent MongoDB API entry point
│   └── tests/                      # Rules and MongoDB-backed API integration tests
├── package.json                    # npm workspaces and root commands
└── README.md
```

## Requirements

- Node.js 20 or newer and npm.
- For persistent data: MongoDB Community Server running locally, or a MongoDB Atlas connection string.
- Internet access the first time the test/demo MongoDB binary is downloaded. The disposable demo uses `mongodb-memory-server`; it is still MongoDB, but its data is temporary.

## Installation

From the project root:

```powershell
npm install
```

### Option A: Persistent MongoDB

1. Start a local MongoDB service, or create an Atlas cluster and allow your development machine to connect.
2. Copy `server/.env.example` to `server/.env`.
3. Set `MONGODB_URI` to your local URI (default `mongodb://127.0.0.1:27017/smart_remittrack`) or your Atlas URI. Set `JWT_SECRET` to a private random value of at least 32 characters. Keep `.env` private.
4. Seed demo rates and a demo customer:

```powershell
npm run seed
```

5. Start the Express API and React development server:

```powershell
npm run dev
```

The client is at `http://localhost:5173`; the API is at `http://localhost:5000`. Data persists in the configured MongoDB database. Seeded demo sign-in: `demo@smartremittrack.com` / `DemoPass123!`.

### Option B: One-command disposable demo

```powershell
npm run demo
```

This starts the API with an ephemeral MongoDB database, seeds the sample customer/rates/transfers, and starts the client. Visit `http://localhost:5173` and use the demo sign-in above. The first run may download the MongoDB binary; subsequent runs use the local cache. **Demo records are removed when the command stops.** Choose Option A to keep your data.

## Environment Variables

Set these in `server/.env` for persistent mode:

| Variable | Purpose | Example |
| --- | --- | --- |
| `PORT` | Express API port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/smart_remittrack` |
| `JWT_SECRET` | Private signing secret, 32+ characters | Generate a random value |
| `CLIENT_URL` | Allowed browser origin for CORS | `http://localhost:5173` |

Optional client override: copy `client/.env.example` to `client/.env` and set `VITE_API_URL` if the API is hosted elsewhere.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the API and Vite against persistent MongoDB |
| `npm run demo` | Start both apps with temporary, seeded MongoDB |
| `npm run seed` | Upsert demo rates and reset the seeded demo customer's sample history |
| `npm run build` | Create the production React build in `client/dist` |
| `npm start` | Start only the Express API against persistent MongoDB |
| `npm test` | Run rules tests and API integration tests against ephemeral MongoDB |

## How to Use the Application

1. Sign in with the seeded demo account, or register a new account.
2. Open **New transfer** and enter the sender, receiver, countries, amount, currency, method, and purpose. For a bank deposit, add the receiver's bank, account, and applicable routing code; wallet and cash methods do not require bank-only fields.
3. Review the quote and generated reference, then confirm to create the transfer and open its tracking timeline.
4. Use **Move to …** on the detail page to simulate each status update. Notifications are created at every step.
5. Find transfers using search and status/country filters. Open a row for its timeline, alerts, masked bank details, rate, fee, and amount received.
6. Advance a demo transfer to **Received** to unlock **View receipt**. Choose **Print receipt** to print or save a PDF in the browser.
7. Review analytics for your totals, average fee, most-used destination, monthly volume, and status distribution.

## API Overview

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET/PATCH /api/users/me`
- `GET /api/transactions/rates`, `GET/POST /api/transactions`, `GET /api/transactions/:id`, `POST /api/transactions/:id/advance`
- `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all`
- `GET /api/analytics`
- `GET /api/health`

All user-specific routes require `Authorization: Bearer <token>` and scope reads/writes to the authenticated user's ObjectId.
