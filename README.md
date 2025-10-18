# WhatsApp Customer Care Platform

Full stack workspace built on top of WPPConnect to run a multi-operator WhatsApp help desk. The monorepo bundles the upstream WPPConnect automation service, an Express/Prisma API, and a React console for human agents. This README captures the complete structure and operating model so any developer or automation can install, configure, and operate the stack without additional context.

## System Architecture

```
Browsers (agents)
    |
    | HTTP + Socket.IO
    v
Platform Frontend (React/Vite, port 5173)
    |
    | REST + Socket.IO
    v
Platform Backend (Express + Prisma, port 4000)
    |
    | WhatsApp session control
    v
WPPConnect Core (Node, port 3000)
    |
    | Puppeteer drives WhatsApp Web
    v
WhatsApp Web
```

Persistent data (users, conversations, quick replies, sessions, media metadata) lives in MySQL or MariaDB.

| Component            | Default port | Notes                                                                 |
| -------------------- | ------------ | --------------------------------------------------------------------- |
| WPPConnect dashboard | 3000         | Web UI to start/stop the WhatsApp client, view QR codes, inspect logs |
| Platform backend API | 4000         | REST API, Socket.IO server, static `/uploads` for media               |
| Platform frontend    | 5173         | Vite dev server for the operator console                              |
| MySQL / MariaDB      | 3306         | Prisma datasource, stores all platform entities                       |

## Repository Layout

| Path                                   | Purpose                                                                                |
| -------------------------------------- | -------------------------------------------------------------------------------------- |
| `/`                                    | Upstream `@wppconnect-team/wppconnect` package, dashboard assets, base package.json    |
| `platform-backend/`                    | Express API (TypeScript), Prisma schema, scheduler, WhatsApp session management, seeds |
| `platform-frontend/`                   | React 18 + Vite operator console with quick reply UI and Socket.IO client              |
| `platform-backend/db/`                 | SQL schemas and seed scripts for quick replies                                         |
| `platform-backend/scripts/`            | Utilities such as `create-test-user.ts` and `seed-quick-replies.ts`                    |
| `docs/`, `examples/`, `platform-docs/` | Vendor documentation retained for reference                                            |
| `dashboard/`                           | Static assets for the WPPConnect dashboard (served on port 3000)                       |
| `STARTUP-GUIDE.md`                     | Step-by-step operational playbook (Windows focused)                                    |
| `QUICK-REPLIES-GUIDE.md`               | Functional deep dive into quick replies and shortcuts                                  |
| `SHORTCUT-DETECTION-IMPLEMENTATION.md` | Frontend implementation notes for shortcut handling                                    |

## Feature Highlights

- Session-based authentication backed by Prisma with role-aware authorization for `ADMIN`, `SUPERVISOR`, `OPERATOR`, `SUPPORT`, and `SALES`.
- Conversation lifecycle tracking: persistent contact data, area ownership, operator assignment, status transitions, and message history for contacts, bot, and operators.
- Areas, load-balanced assignment, and working-hour guardrails that block escalations outside office hours and send configurable courtesy messages.
- Visual flow builder persisted in MySQL covering message, menu, action, redirect, and end nodes.
- Quick replies with `/shortcut` detection, keyboard navigation, and template variables (for example `[OPERADOR]`, `{operatorName}`) injected client side.
- Scheduler that closes inactive conversations, logs events, and attempts to send a WhatsApp courtesy message using any active operator session.
- Media ingestion for images, video, audio, documents, stickers, and locations with storage under `platform-backend/uploads` (auto-created by the service).
- Socket.IO rooms by user, role, and area broadcasting `conversation:update`, `conversation:incoming`, `message:new`, `conversation:closed`, `session:qr`, `session:status`, and error/loading events.
- Operator console with WhatsApp-like layout, unread tracking, search, filters (active/all/closed), image modal, and quick reply suggestions.
- WPPConnect dashboard to manage the WhatsApp session, inspect status history, recent messages, logs, and trigger start/stop/pause actions.

## Technology Stack

| Layer               | Technology                                                                       |
| ------------------- | -------------------------------------------------------------------------------- |
| WhatsApp automation | WPPConnect (Node, Puppeteer)                                                     |
| Backend             | Node.js 18+, Express 4, Prisma 5, Socket.IO 4, express-session with Prisma store |
| Frontend            | React 18, Vite 5, TypeScript, Axios, React Router                                |
| Database            | MySQL 8+ or MariaDB 10.6+                                                        |
| Tooling             | ESLint, TypeScript, ts-node-dev, prisma CLI                                      |

## Prerequisites

- Node.js 18 or newer and npm 9+ on the host machine.
- MySQL 8.x or MariaDB 10.6+ with credentials that match the Prisma connection string.
- Chrome/Chromium or the system dependencies required by Puppeteer (WPPConnect downloads Chromium automatically by default).
- Git (if cloning the repository).
- On Windows PowerShell allow local scripts once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. Alternatively call `npm.cmd` instead of `npm`.

## Initial Installation

1. Clone or download the repository.
2. Install dependencies for each workspace:

   ```powershell
   # WPPConnect core (root of the repository)
   npm install

   # Platform backend
   cd platform-backend
   npm install

   # Platform frontend
   cd ../platform-frontend
   npm install
   ```

3. When preparing a production run of the backend, compile the TypeScript sources once with `npm run build` inside `platform-backend`.

## Configuration

### Backend (`platform-backend/.env`)

Create `.env` from `.env.example`. All values are read in `platform-backend/src/config/env.ts`.

| Variable                   | Required | Default when omitted                            | Description                                                                     |
| -------------------------- | -------- | ----------------------------------------------- | ------------------------------------------------------------------------------- |
| `PORT`                     | No       | `4000`                                          | HTTP port for the API and Socket.IO server                                      |
| `DATABASE_URL`             | Yes      | -                                               | Prisma connection string (`mysql://user:pass@host:port/database`)               |
| `SESSION_SECRET`           | Yes      | -                                               | Secret used to sign and encrypt session cookies                                 |
| `SESSION_COOKIE_NAME`      | No       | `wppconnect.sid`                                | Name of the session cookie                                                      |
| `SESSION_MAX_AGE`          | No       | `43200000` (12h)                                | Session time-to-live in milliseconds                                            |
| `SESSION_CLEANUP_INTERVAL` | No       | `60000`                                         | Interval (ms) to purge expired sessions                                         |
| `SESSION_COOKIE_SECURE`    | No       | `true` when `NODE_ENV=production`, else `false` | Force secure cookies when serving over HTTPS                                    |
| `SESSION_COOKIE_SAMESITE`  | No       | `lax`                                           | SameSite policy (`lax`, `strict`, or `none`)                                    |
| `SESSION_ROLLING`          | No       | `false`                                         | Set to `true` to refresh the session expiration on every request                |
| `CORS_ORIGIN`              | No       | All origins allowed                             | Comma-separated list of allowed origins when limiting CORS                      |
| `WPP_HEADLESS`             | No       | `true`                                          | Run the WhatsApp client without launching a visible browser window              |
| `WPP_AUTO_CLOSE`           | No       | `0`                                             | Timeout in ms before WPPConnect auto-closes the WhatsApp session (`0` disables) |
| `AUTO_CLOSE_MINUTES`       | No       | `30`                                            | Minutes of inactivity before the scheduler closes a conversation                |
| `SCHEDULER_INTERVAL_MS`    | No       | `300000`                                        | Frequency (ms) for the inactivity scheduler                                     |
| `AUTO_CLOSE_MESSAGE`       | No       | `Chat finalizado por inactividad`               | Message sent when the scheduler closes a conversation                           |

Example `.env`:

```dotenv
PORT=4000
DATABASE_URL="mysql://root:password@localhost:3306/wppconnect_platform"
SESSION_SECRET="change-me"
CORS_ORIGIN=http://localhost:5173
WPP_HEADLESS=true
AUTO_CLOSE_MINUTES=30
AUTO_CLOSE_MESSAGE=Chat finalizado por inactividad
```

### Frontend (`platform-frontend/.env`)

The frontend expects a single value:

```dotenv
VITE_API_URL=http://localhost:4000
```

If `VITE_API_URL` is omitted the client falls back to `/api`, suitable when the frontend is served behind the backend proxy.

### WPPConnect Core (optional `.env` at repository root)

The upstream service honors the following environment variables:

| Variable                    | Default          | Description                                          |
| --------------------------- | ---------------- | ---------------------------------------------------- |
| `DASHBOARD_PORT`            | `3000`           | Port for the WPPConnect dashboard                    |
| `WPP_SESSION`               | `session`        | Name for the persisted WhatsApp session              |
| `WPP_AUTO_RUN`              | `true`           | When `false`, the dashboard waits for a manual start |
| `PUPPETEER_EXECUTABLE_PATH` | Bundled Chromium | Set when using a system-installed Chrome             |

## Database Setup

1. Create the database schema (replace credentials as needed):

   ```sql
   CREATE DATABASE IF NOT EXISTS wppconnect_platform
     CHARACTER SET utf8mb4
     COLLATE utf8mb4_unicode_ci;
   ```

2. Sync the Prisma schema:

   ```powershell
   cd platform-backend
   npm run sync:db   # runs `prisma db push && prisma generate`
   ```

   Alternative: import `platform-backend/db/schema_v2.sql` directly via MySQL client if you prefer raw SQL.

3. Seed an administrator for first login:

   ```powershell
   npm run seed:test-user
   ```

   The script creates or updates the user `test` (`test@example.com`) with password `Test1234!` and role `ADMIN`.

4. Seed quick replies (idempotent):

   ```powershell
   node --loader ts-node/esm scripts/seed-quick-replies.ts
   ```

   or execute the SQL variant `db/seed-quick-replies.sql`.

5. Re-run `npm run prisma:generate` anytime you change `prisma/schema.prisma`.

## Running the Stack

Use three terminals during development:

1. **WPPConnect core** (repository root):

   ```powershell
   npm start
   ```

   This compiles the upstream package and launches the dashboard at `http://localhost:3000`.

2. **Platform backend**:

   ```powershell
   cd platform-backend
   npm run dev        # hot reload via ts-node-dev
   # or build once: npm run build && npm start
   ```

   Health check: `http://localhost:4000/health`.

3. **Platform frontend**:

   ```powershell
   cd platform-frontend
   npm run dev
   ```

   The console is available at `http://localhost:5173`.

For Windows PowerShell environments that block `npm.ps1`, run `npm.cmd <command>` instead of `npm <command>`.

## Operational Workflow

### Start the WhatsApp session

1. Navigate to `http://localhost:3000`.
2. If auto-run is disabled, click **Start session**.
3. Scan the QR code with WhatsApp (Settings → Linked devices) and wait for the dashboard status to read `CONNECTED`.
4. Monitor the dashboard logs for errors; the API consumes the same session metadata.

### Log into the operator console

1. Ensure the backend is running and the database seeds are applied.
2. Visit `http://localhost:5173`.
3. Sign in with the seeded credentials (`test` / `Test1234!` or the email `test@example.com`).
4. The session cookie (`wppconnect.sid`) is set by the backend and reused by Socket.IO.

### Use quick replies and shortcuts

- In any conversation input, type `/` to open quick reply suggestions. Navigate with arrow keys and press Enter or Tab to apply; Esc closes the panel.
- Placeholders like `[OPERADOR]`, `{operatorName}`, or `${OPERADOR}` are replaced with the logged-in operator name.
- Manage quick replies via the Quick Replies API (`/api/quick-replies`) or the frontend panel. Global replies require `ADMIN`.

### Manage flows, areas, and working hours

- `Areas` tab: create departments, set description, and toggle activation.
- `Flows` tab: maintain flow trees used for automated bot replies. Nodes reference areas to redirect conversations.
- `Working Hours` tab: define allowed schedules per area; out-of-schedule messages trigger courtesy replies before human takeover.
- `Users` tab: manage operators, assign default areas, and activate/deactivate accounts.
- `Contacts` tab: create or update contact profiles with phone, name, and DNI.

### Automatic policies

- The scheduler closes conversations after `AUTO_CLOSE_MINUTES` of inactivity, emits `conversation:closed`, and attempts to send `AUTO_CLOSE_MESSAGE` through any active operator session.
- When assigned operators disconnect, conversations may return to pending status based on routing logic in `conversation.service.ts`.
- Working hour checks run on inbound messages (see `utils/working-hours.ts`) and can pause the bot or send predefined responses.

### Media handling

- Incoming media is stored under `platform-backend/uploads/<year-month>/filename.ext`. The path is generated in `services/media.service.ts`.
- Files are exposed at `http://localhost:4000/uploads/...` and referenced by `mediaUrl` within message payloads.

## API Surface

All API routes live under the `/api` prefix and require a valid session cookie unless noted.

| Route prefix     | Methods                                                                                              | Summary                                                     |
| ---------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `GET /health`    | GET                                                                                                  | Simple status check                                         |
| `/auth`          | `POST /login`, `POST /logout`, `GET /me`, `POST /register`                                           | Session-based authentication                                |
| `/bot`           | `GET /status`, `GET /qr`, `POST /start`, `POST /stop`, `POST /pause`, `PATCH /metadata`              | Control and inspect the WhatsApp session                    |
| `/areas`         | Standard CRUD                                                                                        | Manage support areas and memberships                        |
| `/users`         | Standard CRUD                                                                                        | Manage platform users and roles                             |
| `/contacts`      | Standard CRUD                                                                                        | Manage contact directory linked to conversations            |
| `/conversations` | `GET /` list, `GET /:id/messages`, `POST /:id/messages`, `POST /:id/close`                           | Retrieve, send messages, close conversations                |
| `/messages`      | `GET /`                                                                                              | Fetch messages across conversations (filtered query params) |
| `/flows`         | Standard CRUD plus tree retrieval                                                                    | Maintain flow nodes for the bot                             |
| `/working-hours` | Standard CRUD                                                                                        | Configure schedules per area                                |
| `/quick-replies` | `GET /`, `GET /:id`, `GET /shortcut/:shortcut`, `POST /`, `PUT /:id`, `DELETE /:id`, `POST /reorder` | Manage quick replies                                        |

Refer to the respective controllers in `platform-backend/src/controllers` for field-level payloads.

## Socket.IO Events

Clients automatically join rooms based on the authenticated session:

- `user:{userId}` for per-user notifications.
- `role:{role}` for role-wide updates.
- `area:{areaId}` for area-scoped events.

Emitted events include:

- `session:status`, `session:qr`, `session:loading`, `session:error` (WhatsApp session lifecycle).
- `conversation:incoming`, `conversation:update`, `conversation:closed`, `conversation:pending_assignment`.
- `message:new` with message payloads.

See `platform-backend/src/services/wpp.service.ts` and `conversation.service.ts` for emission logic and payload structure.

## Data Model Overview

Prisma schema (`platform-backend/prisma/schema.prisma`) defines:

- `User`, `UserArea`, `Area`: operator directory and memberships with default areas.
- `BotSession`: WhatsApp session metadata per owner user.
- `Flow`: hierarchical tree representing automation nodes and redirects.
- `Conversation`, `Message`, `ConversationEvent`: full conversation history, including media URLs and audit events.
- `Contact`: normalized contact catalog with optional DNI and preferred area.
- `WorkingHour`: allowed schedules and courtesy messages per area.
- `QuickReply`: shortcut definitions with global and scoped variants.
- `Session`: `express-session` store table.

## Tooling & Scripts

### WPPConnect core (repository root)

- `npm start` — build the client bundle and run the dashboard (`app.ts`).
- `npm run build` — build both the client library and WAPI bundle.

### Platform backend (`platform-backend`)

- `npm run dev` — watch mode via `ts-node-dev`.
- `npm run build` / `npm start` — compile to `dist/` and run JavaScript output.
- `npm run sync:db` — run `prisma db push` followed by `prisma generate`.
- `npm run prisma:migrate` — create a development migration.
- `npm run prisma:generate` — regenerate Prisma client after schema changes.
- `npm run seed:test-user` — (re)create admin `test` / `Test1234!`.
- `node --loader ts-node/esm scripts/seed-quick-replies.ts` — populate canonical quick replies.
- Additional helpers under `platform-backend/temp-*` inspect or clean active sessions.

### Platform frontend (`platform-frontend`)

- `npm run dev` — Vite dev server with hot module replacement.
- `npm run build` — production build under `dist/`.
- `npm run preview` — preview the built assets.
- `npm run lint` — run ESLint against `src/`.

## Troubleshooting

- **Port already in use (EADDRINUSE)**: stop the process occupying the port or override `PORT`/`DASHBOARD_PORT`. On Windows you can run `Get-Process -Id (Get-NetTCPConnection -LocalPort 4000).OwningProcess`.
- **PowerShell blocks `npm.ps1`**: run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once or use `npm.cmd` commands.
- **WhatsApp session stuck at QR**: ensure WPPConnect (port 3000) is running, scan the QR, and check dashboard logs. You can also call `POST /api/bot/start` to trigger a restart.
- **Database connection errors**: verify `DATABASE_URL`, that the database exists, and that the user has privileges. Re-run `npm run sync:db` after fixing credentials.
- **Quick replies missing**: re-run the seed script or verify entries with `SELECT * FROM quick_replies`.
- **Media not visible**: confirm `platform-backend/uploads` exists and the backend process has write permissions. Media URLs should resolve under `/uploads/...`.
- **Session expires too fast**: adjust `SESSION_MAX_AGE` and optionally set `SESSION_ROLLING=true`.

## Documentation Map

- `STARTUP-GUIDE.md` — verbose, Windows-focused startup procedure.
- `QUICK-REPLIES-GUIDE.md` — detailed UX expectations and keyboard flows.
- `SHORTCUT-DETECTION-IMPLEMENTATION.md` — internal notes for the frontend shortcut system.
- `FEATURES-ROADMAP.md` — backlog of planned improvements.
- `platform-backend/debug-multimedia.md` — troubleshooting guide for media ingestion.

## License & Credits

The project derives from the open-source [WPPConnect](https://github.com/wppconnect-team/wppconnect) codebase and inherits the LGPL-3.0-or-later license (see `LICENSE.md`). Custom platform code lives under `platform-backend/` and `platform-frontend/`. Contributions are welcome; follow the existing lint, type-check, and Prisma workflows before submitting changes.
