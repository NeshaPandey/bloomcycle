# 🌸 BloomCycle — Women's Health Tracking App

A full-stack women's health app inspired by Flo — with cycle tracking, mood/craving logs, an AI health companion, community stories, and real-time direct messaging.

---

## 🗂️ Project Structure

```
bloomcycle/
├── backend/              # Node.js + Express API
│   ├── server.js         # Main server + Socket.IO
│   ├── db/
│   │   ├── index.js      # PostgreSQL connection pool
│   │   └── schema.sql    # Full DB schema (run once)
│   ├── middleware/
│   │   └── auth.js       # JWT auth
│   └── routes/
│       ├── auth.js       # Register, login, /me
│       ├── cycle.js      # Cycle logging + predictions
│       ├── logs.js       # Daily mood/symptom/craving logs
│       ├── ai.js         # Bloom AI agent (Claude-powered)
│       ├── community.js  # Posts, likes, comments
│       ├── messages.js   # Direct messaging (REST)
│       └── users.js      # User search + profiles
│
├── frontend/             # React app
│   ├── public/index.html
│   └── src/
│       ├── App.jsx       # All pages + routing
│       ├── index.css     # Design system (CSS vars)
│       ├── index.js      # Entry point
│       ├── context/
│       │   └── AuthContext.jsx
│       └── utils/
│           └── api.js    # Axios instance w/ JWT
```

---

## 🚀 Setup & Running

### 1. Database (PostgreSQL)

```bash
# Create DB
createdb bloomcycle

# Run schema
psql bloomcycle < backend/db/schema.sql
```

### 2. Backend

```bash
cd backend
npm install

# Copy and fill in env vars
cp .env.example .env
# Edit .env — add DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY

npm run dev   # starts on http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
npm install
npm start     # starts on http://localhost:3000
```

---

## ✨ Features

| Feature | Tech |
|---------|------|
| **Cycle tracking** | Log period start/end, auto-compute length |
| **Predictions** | Average cycle math → next period, ovulation, fertile window |
| **Daily logs** | Flow level, moods, symptoms, cravings, activity, sleep |
| **Visual calendar** | Color-coded period / fertile / predicted days |
| **Bloom AI** | Claude-powered health Q&A with conversation history |
| **Community** | Posts (anon option), likes, comments |
| **Direct messages** | Real-time via Socket.IO, REST fallback |
| **Auth** | JWT (7-day), bcrypt passwords |

---

## 🔌 Key API Endpoints

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/cycles
POST   /api/cycles/start
PATCH  /api/cycles/:id/end
GET    /api/cycles/predict

GET    /api/logs?from=&to=
POST   /api/logs              (upsert + tags)
GET    /api/logs/tags/definitions
GET    /api/logs/insights

POST   /api/ai/chat
GET    /api/ai/conversations

GET    /api/community/posts
POST   /api/community/posts
POST   /api/community/posts/:id/like
GET    /api/community/posts/:id/comments
POST   /api/community/posts/:id/comments

GET    /api/messages/conversations
POST   /api/messages/conversations  (start DM)
GET    /api/messages/conversations/:id

GET    /api/users/search?q=
GET    /api/users/:username
PATCH  /api/users/me
```

---

## 🌐 Deployment Tips

- **Backend**: Deploy to Railway, Render, or Fly.io. Set env vars there.
- **Database**: Neon.tech (free Postgres) or Supabase work great.
- **Frontend**: Deploy to Vercel or Netlify. Change `proxy` in package.json to the backend URL.
- **Sockets**: Use sticky sessions if you scale horizontally. Redis adapter available via `socket.io-redis`.

---

## 🔐 Environment Variables

```env
DATABASE_URL=postgresql://...
JWT_SECRET=...              # min 32 chars
ANTHROPIC_API_KEY=sk-ant-...
CLIENT_URL=https://yourfrontend.com
PORT=4000
```

---

## 🌸 Built with love for every body.
