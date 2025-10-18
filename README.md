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
- **Multimedia support**: images, videos, audios, documents, and locations are automatically processed and displayed in chat.
- **Intelligent scroll**: auto-scroll to latest messages with smooth animations and smart detection of user scroll position.
- **Contact name resolution**: automatic extraction of contact names from WhatsApp contacts (no more "Desconocido").
- **Clean phone numbers**: WhatsApp format (@c.us) is automatically cleaned to store only phone numbers.

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

### Multimedia Support & Real-time Processing

#### Overview

The platform now includes comprehensive multimedia support for WhatsApp conversations, including:

- **Images** (JPG, PNG, GIF, WebP)
- **Videos** (MP4, AVI, MOV, WebM)
- **Audio messages** (MP3, OGG, WAV, M4A) including voice notes (PTT)
- **Documents** (PDF, DOC, DOCX, TXT)
- **Locations** (GPS coordinates)
- **Stickers**

#### How It Works

**Backend Processing (`platform-backend/src/services/wpp.service.ts`)**:

1. **Message Detection**: Automatically detects multimedia message types from WPPConnect
2. **Media Download**: Uses `client.downloadMedia()` to retrieve base64 content
3. **File Conversion**: Converts base64 to physical files stored in `/uploads` directory
4. **Smart Organization**: Files are organized by year-month (`/uploads/2024-10/`)
5. **Magic Byte Detection**: Identifies file types by analyzing binary headers (FFD8FF for JPG, 89504E47 for PNG, etc.)
6. **URL Generation**: Creates accessible URLs (`/uploads/2024-10/media-timestamp.jpg`)
7. **Database Storage**: Saves `mediaUrl` and `mediaType` fields in conversation messages

**Media Processing Utility (`platform-backend/src/utils/media-processor.ts`)**:

- `isBase64String()`: Detects if content is base64 encoded
- `getFileExtensionFromBase64()`: Identifies file type from magic bytes
- `getMediaTypeFromExtension()`: Maps extensions to media categories
- `processBase64Content()`: Complete pipeline for base64 → file conversion

**Static File Serving (`platform-backend/src/app.ts`)**:

```typescript
app.use('/uploads', express.static(uploadsPath));
```

All uploaded files are served via HTTP at `/uploads/*` endpoint.

**Frontend Display (`platform-frontend/src/pages/ChatPage.tsx`)**:

- **Images**: Clickable thumbnails that open in fullscreen modal with zoom controls
- **Videos**: Native HTML5 video player with controls
- **Audio**: Native audio player with playback controls
- **Documents**: Download links with file icon
- **Locations**: Formatted GPS coordinates with map emoji
- **Base64 Fallback**: Automatic detection and rendering if backend processing fails

**Intelligent Scroll Features**:

- Auto-scroll to bottom when new messages arrive (only if user is at bottom)
- Smooth scroll animations for better UX
- Smart detection of user's scroll position
- Manual scroll detection to prevent auto-scroll interruption
- Scroll-to-bottom button appears when scrolled up

#### Known Issues & Troubleshooting

**Multimedia Not Displaying**:

1. Verify `/uploads` directory exists and has write permissions
2. Check backend logs for media download errors
3. Ensure `client.downloadMedia()` is working (may fail with some WhatsApp versions)
4. Verify static file serving is configured correctly
5. Check browser console for 404 errors on media URLs

**Audio Not Playing**:

- Verify audio file format is supported by browser (MP3, OGG recommended)
- Check browser compatibility with HTML5 audio element
- Some browsers require user interaction before playing audio

**Images Showing as Base64 Text**:

- This indicates backend processing failed
- Check backend logs for errors in `processBase64Content()`
- Verify file permissions on `/uploads` directory
- Frontend has fallback rendering for this scenario

### Contact Name Resolution

The platform now automatically extracts real contact names from WhatsApp:

**How It Works**:

1. **Phone Number Cleaning**: Removes WhatsApp format suffixes (`@c.us`, `@g.us`, `@s.whatsapp.net`)
2. **Contact Info Retrieval**: Uses `client.getContact()` to fetch contact details from WhatsApp
3. **Name Priority**: Extracts names in order: `name` → `pushname` → `shortName` → fallback to "Desconocido"
4. **Database Update**: Stores clean phone number and real name in `Contact` table
5. **Auto-linking**: Every conversation automatically links to the contact record

**Functions**:

- `extractPhoneNumber()`: Cleans WhatsApp ID format to pure phone number
- `getContactInfoFromWhatsApp()`: Retrieves contact details from WhatsApp API
- `ensureConversation()`: Enhanced to fetch and store contact names automatically

**Example**:

- WhatsApp ID: `5493533473732@c.us`
- Stored Number: `5493533473732`
- Displayed Name: "Juan Pérez" (from WhatsApp contact)

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
6. Send multimedia (images, audios, videos) to test real-time processing and display.
7. Verify contact names are automatically resolved from WhatsApp contacts.

---

## Suggested Future Features

### 🎯 High Priority

1. **Message Search**: Full-text search across conversation history
2. **Quick Replies**: Pre-configured message templates for operators
3. **Typing Indicators**: Show when contact is typing in real-time
4. **Read Receipts**: Track message delivery and read status (✓, ✓✓, blue checks)
5. **Message Reactions**: Support for emoji reactions on messages
6. **Voice Recording**: Direct voice message recording from operator interface
7. **File Upload**: Allow operators to send multimedia from computer

### 📊 Analytics & Reporting

8. **Conversation Metrics**: Average response time, resolution time, CSAT scores
9. **Operator Performance**: Messages sent/received, active time, conversation count
10. **Export Reports**: PDF/Excel reports for conversations and statistics
11. **Real-time Dashboard**: Live metrics with charts and graphs
12. **Sentiment Analysis**: Automatic detection of customer sentiment

### 🤖 Automation & AI

13. **AI-Powered Chatbot**: Integration with OpenAI/Claude for intelligent responses
14. **Auto-categorization**: ML-based conversation categorization
15. **Suggested Replies**: AI-generated response suggestions for operators
16. **Language Detection**: Automatic language detection and translation
17. **Intent Recognition**: Detect customer intent from message content

### 💬 Chat Features

18. **Group Chat Support**: Handle WhatsApp group messages
19. **Message Forwarding**: Forward messages between conversations
20. **Internal Notes**: Private notes visible only to operators
21. **Message Scheduling**: Schedule messages to be sent at specific times
22. **Broadcast Messages**: Send bulk messages to multiple contacts
23. **Chat Tags**: Add custom tags to conversations for organization
24. **Message Pinning**: Pin important messages in conversation

### 👥 Collaboration

25. **Operator Transfer**: Transfer active conversations between operators
26. **Chat Takeover**: Allow supervisor to take over any conversation
27. **Internal Chat**: Operators can chat with each other
28. **Mentions**: @mention operators in internal notes
29. **Shared Inbox**: Multiple operators can view/reply to same conversation

### 🔔 Notifications

30. **Desktop Notifications**: Browser push notifications for new messages
31. **Email Notifications**: Email alerts for unattended conversations
32. **Sound Alerts**: Configurable sound alerts for different events
33. **Mobile App**: React Native mobile app for operators

### 📱 Contact Management

34. **Contact Merge**: Merge duplicate contact records
35. **Contact History**: View full interaction history per contact
36. **Custom Fields**: Add custom fields to contact records
37. **Contact Segments**: Create contact segments for targeted messaging
38. **Import/Export**: CSV/Excel import and export with validation

### 🔒 Security & Compliance

39. **Two-Factor Authentication**: 2FA for operator login
40. **Audit Logs**: Complete audit trail of all actions
41. **Data Encryption**: End-to-end encryption for sensitive data
42. **GDPR Compliance**: Data deletion and export tools
43. **Access Logs**: Track who accessed which conversations

### 🛠️ Integration & API

44. **Webhooks**: Outgoing webhooks for external integrations
45. **REST API**: Complete REST API for third-party integrations
46. **CRM Integration**: Connect with Salesforce, HubSpot, etc.
47. **Calendar Integration**: Schedule meetings from chat interface
48. **Payment Gateway**: Accept payments directly in chat
49. **Ticket System**: Create support tickets from conversations

### 🎨 UI/UX Improvements

50. **Dark Mode**: Full dark theme support
51. **Customizable Themes**: Brand colors and logo customization
52. **Keyboard Shortcuts**: Quick actions via keyboard
53. **Drag & Drop**: Drag files directly into chat
54. **Emoji Picker**: Rich emoji selector
55. **GIF Support**: Built-in GIF search and insertion
56. **Message Formatting**: Bold, italic, strikethrough, code blocks

### 📈 Scalability

57. **Redis Caching**: Cache frequently accessed data
58. **Message Queue**: Process messages asynchronously
59. **Load Balancing**: Distribute conversations across servers
60. **Database Sharding**: Horizontal database scaling
61. **CDN Integration**: Serve media files from CDN

---

## Contributing

Issues and PRs are welcome! When adding features remember to update the Prisma schema, run `npm run build` on both backend and frontend, and document behaviour in this README.

---

## License

Derived from the WPPConnect open source project (LGPL-3.0). See upstream documentation at [wppconnect-team/wppconnect](https://github.com/wppconnect-team/wppconnect).

VIVA EL CODIGO OPEN SOURSE
USALO LIBREMENTE
