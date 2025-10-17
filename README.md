# WhatsApp Customer Care Platform

Full stack workspace for building a multi-operator WhatsApp service desk on top of **WPPConnect**.  
It contains a Node.js/Express backend (TypeScript) and a Vue 3 + Vite frontend with a WhatsApp-like interface for agents, a visual flow builder and automatic chat closing policies.

---

## Key Features

- **Session-based authentication** (no JWT): Express-session persisted in MySQL via Prisma store.
- **Role-aware access control**: `ADMIN`, `SUPERVISOR`, `OPERATOR` with dynamic area membership.
- **Areas & automatic routing**: assign flows and conversations to departments; operators only see their own workload.
- **Visual flow builder**: hierarchical menus (`message`, `menu`, `redirect`, `end`, etc.) stored in MySQL and served via Prisma.
- **Real-time chat wall**: WhatsApp Web style UI with manual close button, inactivity auto-close (30 min by default) and WPPConnect delivery.
- **Socket.io events**: conversations broadcast to rooms by user, role and area (`conversation:update`, `message:new`).
- **Scheduler**: closes inactive chats, logs events and sends the courtesy message via WPPConnect.
- **Full Prisma schema & SQL bootstrap**: includes flows, areas, conversations, messages, events, sessions.

---

## Repository Layout

```
/platform-backend   → Express API + Prisma + WPPConnect integration
/platform-frontend  → Vue 3 client (Vite) with Tailwind-style utilities
/docs, /examples    → Upstream WPPConnect resources (unchanged)
```

---

## Backend (`platform-backend`)

### Requirements

- Node.js 18+
- MySQL or MariaDB

### Environment

Copy `.env.example` to `.env` and adjust:

| Variable                   | Description                             |
| -------------------------- | --------------------------------------- |
| `PORT`                     | API port (default `4000`)               |
| `DATABASE_URL`             | Prisma connection string                |
| `SESSION_SECRET`           | Cookie signature secret                 |
| `SESSION_COOKIE_NAME`      | Session cookie name                     |
| `SESSION_MAX_AGE`          | Cookie max age (ms)                     |
| `SESSION_CLEANUP_INTERVAL` | Cleanup interval for session store (ms) |
| `CORS_ORIGIN`              | Comma-separated allowed origins         |
| `WPP_HEADLESS`             | WPPConnect headless flag                |
| `WPP_AUTO_CLOSE`           | Enable WPP auto-close (ms)              |
| `AUTO_CLOSE_MINUTES`       | Scheduler inactivity threshold          |
| `AUTO_CLOSE_MESSAGE`       | Message sent when chats auto-close      |
| `SCHEDULER_INTERVAL_MS`    | How often the scheduler runs            |

### Database bootstrap

_Option A_ – Prisma sync:

```bash
npm install
npx prisma db push
npx prisma generate
```

_Option B_ – raw SQL (includes seed admin):

```bash
mysql -u user -p < db/schema_v2.sql
```

### Development

```bash
npm install
npm run build        # type-check / compile
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
- `GET /conversations`, `GET /conversations/:id/messages`, `POST /conversations/:id/messages`, `POST /conversations/:id/close`

Socket rooms automatically join operators to:
`user:{id}`, `role:{ROLE}`, `area:{AREA_ID}`.
Events in use: `session:status`, `session:qr`, `conversation:update`, `message:new`.

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

- **Login** – username/email + password (session cookie stored server-side).
- **Dashboard** – bot status, live QR, recent messages.
- **Chat** – WhatsApp-like interface with conversation list, message pane, send and close actions.
- **Flows** – hierarchical builder with types, triggers, ordering, area routing.
- **Users** – CRUD for operators, roles, area memberships, activation toggle.
- **Áreas** – manage departments (name, description, active state).
- **Settings** – update bot display name, phone number, pause status.

---

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
