# CitChat — Realtime Chat Platform

**Live:** [citchat.vercel.app](https://citchat.vercel.app)

A full-stack realtime chat application built as a **pnpm monorepo**, featuring bidirectional WebSocket communication, persistent message history, online presence tracking, and a unified dark-green UI.

---

## Features

- **Bidirectional WebSockets** via Socket.io — zero-latency message delivery
- **Public & private rooms** — create and join named chat rooms
- **Persistent message history** — all messages stored in PostgreSQL, replayed on join
- **Online presence** — Redis-backed user presence with live status indicators
- **Typing indicators** — real-time "X is typing…" with auto-timeout
- **Emoji picker** — inline emoji selection powered by `emoji-picker-react`
- **JWT authentication** — httpOnly cookie-based sessions, secure by default
- **Dark green theme** — unified design system across all pages
- **REST API + Swagger** — fully documented API at `/api/docs`
- **Rate limiting & Helmet** — production-grade security headers and request throttling

---

## Tech Stack

### Monorepo

| Tool | Version | Role |
|---|---|---|
| **pnpm** | 9+ | Package manager + workspace orchestration |
| **pnpm workspaces** | — | Monorepo with `frontend/` and `backend/` packages |

### Frontend

| Technology | Version | Role |
|---|---|---|
| **Next.js** | 16.2.9 | React framework with Turbopack |
| **React** | 19.2.4 | UI runtime |
| **TypeScript** | 5 | Static typing |
| **Tailwind CSS** | 4 | Utility-first styling |
| **shadcn/ui** | 4 (Base UI) | Component library — DropdownMenu, Sidebar, Resizable, Avatar, etc. |
| **@base-ui/react** | 1.6 | Headless primitives powering shadcn v4 |
| **Zustand** | 5 | Client state management with `persist` middleware |
| **Socket.io-client** | 4.8 | WebSocket client |
| **Axios** | 1.18 | HTTP client |
| **React Hook Form** | 7.80 | Form state and validation |
| **Zod** | 4.4.3 | Schema validation |
| **react-resizable-panels** | 4 | Resizable chat layout |
| **emoji-picker-react** | 4.19 | Emoji picker component |
| **lucide-react** | 1.21 | Icon set |

### Backend

| Technology | Version | Role |
|---|---|---|
| **NestJS** | 11 | Node.js framework (modular, decorator-based) |
| **TypeScript** | 5 | Static typing |
| **Socket.io** | 4.8 | WebSocket server (Gateway) |
| **TypeORM** | 1.0 | ORM for PostgreSQL |
| **PostgreSQL** | 16 | Relational database — users, rooms, messages |
| **Redis / Upstash** | — | Online presence, pub/sub adapter |
| **ioredis** | 5.11 | Redis client |
| **Passport.js** | — | JWT authentication strategy |
| **@nestjs/jwt** | 11 | JWT signing and verification |
| **bcrypt** | 6 | Password hashing |
| **Helmet** | 8 | Security headers |
| **@nestjs/throttler** | 6 | Rate limiting |
| **@nestjs/swagger** | 11 | OpenAPI documentation |
| **class-validator** | 0.15 | DTO validation |
| **cookie-parser** | 1.4 | httpOnly cookie handling |

### Infrastructure

| Service | Role |
|---|---|
| **Docker + Docker Compose** | Local PostgreSQL 16 + Redis 7 (Alpine) |
| **Render** | Backend deployment |
| **Vercel** | Frontend deployment |
| **Upstash** | Managed Redis in production |

---

## Architecture

```
realtime-chat/
├── frontend/                  # Next.js 16 app
│   └── src/
│       ├── app/
│       │   ├── (auth)/        # Login & Register pages
│       │   └── (chat)/        # Protected chat route
│       ├── components/
│       │   ├── ui/            # shadcn/ui primitives
│       │   ├── blocks/        # ChatTemplate, Sidebar wrappers
│       │   └── chat/          # MessageList, MessageInput, RoomList, UserList
│       ├── hooks/             # useChat, useSocket
│       ├── store/             # Zustand stores (auth, chat)
│       ├── lib/               # axios instance, socket singleton
│       └── types/             # Shared TypeScript types
│
├── backend/                   # NestJS 11 app
│   └── src/
│       ├── auth/              # JWT strategy, guards, login/register
│       ├── chat/              # Socket.io Gateway, message service
│       ├── rooms/             # Room CRUD and membership
│       ├── users/             # User entity and service
│       └── common/            # Filters, interceptors, pipes
│
└── docker-compose.yml         # Local PostgreSQL + Redis
```

### WebSocket Flow

```
Client ──connect(token)──► Gateway (auth guard validates JWT)
       ──room:join──────► join Socket.io room → replay history from PostgreSQL
       ──message:send──► persist to PostgreSQL → broadcast to room members
       ──message:typing► broadcast typing event → auto-clear after 3s
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker + Docker Compose

### 1. Clone and install

```bash
git clone https://github.com/your-username/realtime-chat.git
cd realtime-chat
pnpm install
```

### 2. Start infrastructure

```bash
docker compose up -d
```

This starts:
- PostgreSQL on `localhost:5436`
- Redis on `localhost:6379`

### 3. Configure environment

**`backend/.env`**

```env
NODE_ENV=development
PORT=3004

DB_HOST=localhost
DB_PORT=5436
DB_USERNAME=devuser
DB_PASSWORD=devpassword
DB_NAME=chat_db

JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d

REDIS_HOST=localhost
REDIS_PORT=6379

FRONTEND_URL=http://localhost:3000
```

**`frontend/.env.local`**

```env
NEXT_PUBLIC_API_URL=http://localhost:3004/api
NEXT_PUBLIC_WS_URL=http://localhost:3004
```

### 4. Run (both services)

```bash
pnpm dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3004/api |
| Swagger docs | http://localhost:3004/api/docs |

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Login — sets httpOnly cookie |
| `POST` | `/api/auth/logout` | Logout — clears cookie |
| `GET` | `/api/auth/me` | Get current user |
| `GET` | `/api/rooms` | List all rooms |
| `POST` | `/api/rooms` | Create a room |
| `GET` | `/api/rooms/:id/messages` | Fetch message history |

Full interactive docs available at `/api/docs` (Swagger UI).

### WebSocket Events

| Event (emit) | Payload | Description |
|---|---|---|
| `room:join` | `{ roomId }` | Join a room, receive history |
| `room:leave` | `{ roomId }` | Leave a room |
| `message:send` | `{ roomId, content }` | Send a message |
| `message:typing` | `{ roomId, isTyping }` | Broadcast typing state |

| Event (listen) | Description |
|---|---|
| `room:history` | Message history on join |
| `message:new` | New message in active room |
| `message:typing` | Typing indicator update |
| `user:presence` | Online/offline status change |

---

## Deployment

### Backend → Render

1. Connect your GitHub repo to Render
2. Set **Root Directory** to `backend`
3. Set build command:
   ```
   npm install --ignore-scripts --include=dev && npm run build
   ```
4. Set start command:
   ```
   node dist/main.js
   ```
5. Add all `backend/.env` variables in Render's environment panel
6. Use **Upstash** for Redis (set `REDIS_URL`)

### Frontend → Vercel

1. Import the repo in Vercel, set root directory to `frontend/`
2. Add `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` pointing to your Render backend URL
3. Deploy — Vercel auto-detects Next.js

---

## Security

- Passwords hashed with **bcrypt** (cost factor 10)
- JWT stored in **httpOnly cookies** — inaccessible to JavaScript
- **Helmet** sets strict HTTP security headers
- **CORS** restricted to known frontend origins
- **Rate limiting** on all auth endpoints via `@nestjs/throttler`
- WebSocket connections require a valid JWT on handshake

---

## License

MIT
