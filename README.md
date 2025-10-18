# WhatsApp Customer Care Platform

Full stack workspace for building a multi-operator WhatsApp service desk on top of **WPPConnect**.  
It contains a Node.js/Express backend (TypeScript) and a React 18 + Vite frontend with a WhatsApp-like interface for agents, a visual flow builder and automatic chat closing policies.

---

## Key Features

- **Session-based authentication** (no JWT): Express-session persisted in MySQL via Prisma store.
- **Role-aware access control**: `ADMIN`, `SUPERVISOR`, `SUPPORT`, `SALES`, `OPERATOR` with dynamic area membership and load-balancing by workload.
- **Complete conversation history**: all bot, contact and operator messages are persisted with delivery state, timestamps and external identifiers.
- **Areas & automatic routing**: assign flows and conversations to departments; active chats are routed to the least loaded operator in each area.
- **Contact catalog with DNI tracking**: import, create and update contacts (name, phone, DNI, preferred area) and link every conversation automatically.
- **Working hours guardrails**: per-area schedules prevent out-of-hours escalations and send configurable courtesy replies when no human is available.
- **Operator context enhancement**: the chat console now surfaces contact name, DNI and tags the list with DNI/area badges for quicker identification.
- **Visual flow builder**: hierarchical menus (`message`, `menu`, `redirect`, `end`, etc.) stored in MySQL and served via Prisma.
- **Real-time workspace**: refreshed WhatsApp-style UI with conversation search, unread indicators and in-place close actions.
- **Socket.io events**: conversations broadcast to rooms by user, role and area (`conversation:update`, `conversation:incoming`, `message:new`, `conversation:closed`).
- **Scheduler & auto-close**: closes inactive chats, logs events and sends the courtesy message via WPPConnect.
- **Analytics dashboard**: live stats for active/closed chats and area distribution, plus latest bot activity.
- **Full Prisma schema & SQL bootstrap**: includes flows, areas, conversations, messages, events, sessions.

---

## Repository Layout

```
/platform-backend   -> Express API + Prisma + WPPConnect integration
/platform-frontend  -> React 18 + Vite client with Tailwind-style utilities
/docs, /examples    -> Upstream WPPConnect resources (unchanged)
```

---

## Backend (`platform-backend`)

### Requirements

- Node.js 18+
- MySQL or MariaDB

### Environment

Copy `.env.example` to `.env` and adjust:

| Variable                   | Description                                                   |
| -------------------------- | ------------------------------------------------------------- |
| `PORT`                     | API port (default `4000`)                                     |
| `DATABASE_URL`             | Prisma connection string                                      |
| `SESSION_SECRET`           | Cookie signature secret                                       |
| `SESSION_COOKIE_NAME`      | Session cookie name                                           |
| `SESSION_MAX_AGE`          | Cookie max age (ms)                                           |
| `SESSION_COOKIE_SECURE`    | Force secure cookies (default on in prod)                     |
| `SESSION_COOKIE_SAMESITE`  | Cookie same-site policy (`lax` by default)                    |
| `SESSION_CLEANUP_INTERVAL` | Cleanup interval for session store (ms)                       |
| `CORS_ORIGIN`              | Comma-separated allowed origins                               |
| `WPP_HEADLESS`             | WPPConnect headless flag (`true`/`false`)                     |
| `WPP_AUTO_CLOSE`           | Auto-close timeout for the headless client (ms, `0` disables) |
| `AUTO_CLOSE_MINUTES`       | Scheduler inactivity threshold                                |
| `AUTO_CLOSE_MESSAGE`       | Message sent when chats auto-close                            |
| `SCHEDULER_INTERVAL_MS`    | How often the scheduler runs                                  |

### Database bootstrap

_Option A_ – Prisma sync:

```bash
npm install
npm run sync:db    # prisma db push && prisma generate
```

_Option B_ – raw SQL (includes seed admin):

```bash
mysql -u user -p < db/schema_v2.sql
```

### Development

```bash
npm install
npm run build        # type-check / compile
npm run sync:db      # push schema + generate Prisma client
npm run dev          # ts-node-dev hot reload
npm start            # runs dist/index.js
```

Admin creation helper (example used during setup):

```bash
node --loader ts-node/esm scripts/create-lautaro-user.ts
```

### API Highlights

- `POST /auth/login` / `POST /auth/logout` / `GET /auth/me`
- `GET /bot/status`, `POST /bot/start`, `POST /bot/stop`, `POST /bot/pause`, `PATCH /bot/metadata`
- `GET/POST/PUT /areas`
- `GET/POST/PUT /users`
- `GET/POST/DELETE /flows`
- `GET/POST/PATCH/DELETE /contacts`, `POST /contacts/import`
- `GET/POST/PATCH/DELETE /working-hours`
- `GET /conversations`, `GET /conversations/:id/messages`, `POST /conversations/:id/messages`, `POST /conversations/:id/close`

Socket rooms automatically join operators to:
`user:{id}`, `role:{ROLE}`, `area:{AREA_ID}`.
Events in use: `session:status`, `session:qr`, `conversation:update`, `message:new`.

### Contacts & DNI management

- Every conversation is now linked to a record in the new `Contact` table (name, unique phone, optional DNI and preferred area).
- Contacts can be created one by one (`POST /contacts`), imported in bulk (`POST /contacts/import`) using CSV or JSON payloads, and updated or removed via `PATCH /contacts/:id` / `DELETE /contacts/:id`.
- When a new WhatsApp number reaches the bot, the backend creates the contact automatically (defaults to "Desconocido") and logs the event with `logSystem` so the first operator sees the context immediately.
- The conversation list and chat pane expose the linked contact (name + DNI + phone) to speed up operator verification.

Example CSV payload for the importer:

```text
name,phone,dni,area
Juan Perez,+549351555111,34567890,Soporte
Maria Diaz,+549351555222,,Ventas
```

### Working hours & automatic after-hours replies

- Each area can define multiple working-hour windows (`WorkingHour` model) with `start_time`, `end_time`, active `days` and an optional custom courtesy message.
- Before redirecting a flow (`REDIRECT` node) to an area, the bot verifies if the current time is inside any configured window.
- Outside business hours the conversation remains pending, the bot sends the configured message (default: "Nuestro horario de atención es de 8:00 a 18:00 hs. Te responderemos apenas volvamos a estar disponibles.") and logs the event, keeping the automation active until agents are back online.
- Manage the schedules from `POST/GET/PATCH/DELETE /working-hours` or through the new admin UI.

### Post-upgrade checklist

1. Install dependencies and push the new Prisma schema: `npm install && npm run sync:db`.
2. Ensure the session payload column can store full JSON blobs (only once per database):
   ```sql
   ALTER TABLE sessions
     MODIFY data MEDIUMTEXT
     CHARACTER SET utf8mb4
     COLLATE utf8mb4_unicode_ci;
   ```
3. Restart the backend after running the migration so the session store picks up the schema changes.
4. Optional: clear legacy sessions if you still see `[SYSTEM ... Removing invalid session payload ...]` in the logs.

---

## Frontend (`platform-frontend`)

### Requirements

- Node.js 18+

### Environment

Create `.env` (optional) or set CLI vars:

| Variable          | Description        | Default |
| ----------------- | ------------------ | ------- |
| `VITE_API_URL`    | Backend base URL   | `/api`  |
| `VITE_SOCKET_URL` | Socket.io endpoint | `/`     |

### Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle
```

### Screens

- **Login** - username/email + password (session cookie stored server-side).
- **Dashboard** - bot status, live QR, recent messages.
- **Chat** - WhatsApp-like interface with contact card (name, DNI, phone), conversation list, message pane, send and close actions.
- **Flows** - hierarchical builder with types, triggers, ordering, area routing.
- **Users** - CRUD for operators, roles, area memberships, activation toggle.
- **Areas** - manage departments (name, description, active state).
- **Contacts** - import/search/edit the shared contact catalog and review DNI assignments.
- **Working Hours** - define schedules, courtesy messages and area availability windows.
- **Settings** - update bot display name, phone number, pause status.

## Workflow Tips

1. Start backend (`npm run dev`) and ensure MySQL is running.
2. Start frontend (`npm run dev`) pointing to same origin or configure `VITE_*` vars.
3. Login with an admin user, create areas, then flows and operators.
4. Scan QR from dashboard to connect WPPConnect.
5. Test chat flow by sending WhatsApp messages; watch the chat panel and auto-close scheduler actions in the console.

---

## Contributing

Issues and PRs are welcome! When adding features remember to update the Prisma schema, run `npm run build` on both backend and frontend, and document behaviour in this README.

---

## License

Derived from the WPPConnect open source project (LGPL-3.0). See upstream documentation at [wppconnect-team/wppconnect](https://github.com/wppconnect-team/wppconnect).

VIVA EL CODIGO OPEN SOURSE
USALO LIBREMENTE
