# ✦ Celestial Desk

A beautiful, self-hosted productivity and deadline management system inspired by the night sky. Built for **Debian 13**, fully dockerized, with a dreamy aesthetic and powerful deadline tracking.

> *"What makes the desert beautiful,' said the little prince, 'is that somewhere it hides a well."*
> — Antoine de Saint-Exupéry, The Little Prince

---

## ✨ Features

- **Deadline Manager** — Create, track, and get reminded about deadlines
- **Smart Notifications** — Desktop notifications at 3d, 2d, 1d, and 1h before deadlines
- **Startup Catch-up** — Detects and shows missed notifications if system was off
- **Weekly Planner** — Day-by-day grid with time blocks, mood tracking, and notes
- **Daily Journal** — Record what you did, your plans, and reflections with mood tracking
- **Trello-like Boards** — Drag-and-drop card organization with checklists and tags
- **Notes System** — Long-term and short-term notes with Markdown support and categorization
- **Dashboard** — Overview of deadlines, tasks, goals, and weekly progress
- **Global Search** — Instant search across all your data (Ctrl+K)
- **Import/Export** — Full JSON backup and restore
- **Keyboard Shortcuts** — Quick navigation and actions

## 🎨 Design Philosophy

- Dark navy aesthetic inspired by Van Gogh's *Starry Night*
- Glassmorphism cards with subtle glows
- Animated star field with shooting particles
- Mouse-reactive ambient glow
- Calming, premium, handcrafted feel
- Responsive layout for desktop and tablet

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                  │
│  Port 3000  │  Vite + TailwindCSS + Framer Motion   │
├─────────────────────────────────────────────────────┤
│                    Backend (FastAPI)                  │
│  Port 8000  │  Python / APScheduler / plyer          │
├─────────────────────────────────────────────────────┤
│                   Data (JSON files)                   │
│  /data      │  deadlines.json / notes.json / ...      │
└─────────────────────────────────────────────────────┘
```

### Project Structure

```
celestial-desk/
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py              # FastAPI entry point
│       ├── config.py            # Configuration
│       ├── models/              # Pydantic data models
│       │   ├── deadline.py
│       │   ├── note.py
│       │   ├── planner.py
│       │   ├── journal.py
│       │   └── board.py
│       ├── routes/              # API endpoints
│       │   ├── deadlines.py
│       │   ├── notes.py
│       │   ├── planner.py
│       │   ├── journal.py
│       │   ├── boards.py
│       │   ├── notifications.py
│       │   ├── search.py
│       │   └── backup.py
│       ├── services/
│       │   ├── storage.py              # JSON file-based persistence
│       │   └── notification_service.py  # Desktop notifications via plyer
│       └── scheduler/
│           └── notification_scheduler.py  # APScheduler deadline checks
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css             # Theme system, glass cards, animations
│       ├── types/index.ts        # TypeScript interfaces
│       ├── api/client.ts         # API client
│       ├── store/useStore.ts     # Zustand state management
│       ├── components/
│       │   ├── StarBackground.tsx  # Animated canvas star field
│       │   ├── Sidebar.tsx
│       │   ├── Layout.tsx
│       │   ├── SearchModal.tsx
│       │   └── NotificationToast.tsx
│       └── pages/
│           ├── Dashboard.tsx
│           ├── Deadlines.tsx
│           ├── Planner.tsx
│           ├── Journal.tsx
│           ├── Boards.tsx
│           ├── Notes.tsx
│           └── Settings.tsx
├── scripts/
│   ├── start.sh
│   ├── stop.sh
│   └── logs.sh
├── docker-compose.yml
├── .env.example
└── README.md
```

## 🚀 Quick Start (Debian 13)

### Prerequisites

```bash
# Install Docker
sudo apt update && sudo apt install -y docker.io docker-compose-v2

# Add your user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Install notify-send (for desktop notifications)
sudo apt install -y libnotify-bin
```

### Installation

```bash
# Clone or copy the project
cd ~/celestial-desk

# Start the application
./scripts/start.sh
```

### Access

| Service  | URL                    |
|----------|------------------------|
| Frontend | http://localhost:3000  |
| Backend  | http://localhost:8000  |
| API Docs | http://localhost:8000/docs |

### Commands

```bash
./scripts/start.sh   # Build and start all services
./scripts/stop.sh    # Stop all services
./scripts/logs.sh    # View logs (add -f for follow)
```

## ⚙️ Configuration

Copy `.env.example` to `.env` and adjust:

```env
TZ=Asia/Tehran           # Your timezone
LOG_LEVEL=INFO           # Debug logging
DATA_DIR=/data           # Data storage path (container)
```

### Desktop Notifications

Celestial Desk sends native Linux desktop notifications for deadlines:

- **3 days before** — Low urgency
- **2 days before** — Low urgency  
- **1 day before** — Normal urgency
- **1 hour before** — Critical urgency
- **Overdue** — Critical urgency

If your system is off during a notification window, the app will **catch up** on startup and show all missed notifications immediately.

## 🗄 Data Persistence

Your data is stored in `/home/mobinabedian/celestial-desk-data/` on the host machine. This directory is bind-mounted into the container and **survives restarts and container recreation**.

### Data Files

| File                    | Contents                    |
|-------------------------|-----------------------------|
| `deadlines.json`        | All deadlines with reminders|
| `notes.json`            | Notes with categories       |
| `planner.json`          | Weekly planner entries      |
| `journal.json`          | Daily journal entries       |
| `boards.json`           | Trello boards/columns/cards |
| `notification_history.json` | Notification log       |

### Example: deadlines.json

```json
[
  {
    "id": "a1b2c3d4e5f6",
    "title": "Submit quarterly report",
    "description": "Q4 financial review",
    "due_date": "2026-06-15T09:00:00Z",
    "priority": "high",
    "tags": ["work", "finance"],
    "status": "pending",
    "progress": 0,
    "reminder_enabled": true,
    "reminded_3d": false,
    "reminded_2d": false,
    "reminded_1d": false,
    "reminded_1h": false,
    "created_at": "2026-05-20T10:00:00Z",
    "updated_at": "2026-05-20T10:00:00Z"
  }
]
```

## 🔌 API Endpoints

### Deadlines
| Method | Endpoint                     | Description        |
|--------|------------------------------|--------------------|
| GET    | `/api/deadlines`             | List all deadlines |
| POST   | `/api/deadlines`             | Create deadline    |
| GET    | `/api/deadlines/{id}`        | Get deadline       |
| PATCH  | `/api/deadlines/{id}`        | Update deadline    |
| DELETE | `/api/deadlines/{id}`        | Delete deadline    |

### Notes
| Method | Endpoint                     | Description        |
|--------|------------------------------|--------------------|
| GET    | `/api/notes`                 | List notes         |
| POST   | `/api/notes`                 | Create note        |
| GET    | `/api/notes/{id}`            | Get note           |
| PATCH  | `/api/notes/{id}`            | Update note        |
| DELETE | `/api/notes/{id}`            | Delete note        |

### Planner
| Method | Endpoint                     | Description             |
|--------|------------------------------|-------------------------|
| GET    | `/api/planner`               | List planner entries    |
| POST   | `/api/planner`               | Create entry            |
| GET    | `/api/planner/{id}`          | Get entry               |
| PATCH  | `/api/planner/{id}`          | Update entry            |
| DELETE | `/api/planner/{id}`          | Delete entry            |

### Journal
| Method | Endpoint                     | Description             |
|--------|------------------------------|-------------------------|
| GET    | `/api/journal`               | List journal entries    |
| POST   | `/api/journal`               | Create entry            |
| GET    | `/api/journal/{id}`          | Get entry               |
| PATCH  | `/api/journal/{id}`          | Update entry            |
| DELETE | `/api/journal/{id}`          | Delete entry            |

### Boards
| Method | Endpoint                                                    | Description           |
|--------|-------------------------------------------------------------|-----------------------|
| GET    | `/api/boards`                                               | List boards           |
| POST   | `/api/boards`                                               | Create board          |
| GET    | `/api/boards/{id}`                                          | Get board             |
| DELETE | `/api/boards/{id}`                                          | Delete board          |
| POST   | `/api/boards/{id}/columns`                                  | Add column            |
| DELETE | `/api/boards/{id}/columns/{col_id}`                         | Delete column         |
| POST   | `/api/boards/{id}/columns/{col_id}/cards`                   | Add card              |
| PATCH  | `/api/boards/{id}/columns/{col_id}/cards/{card_id}`         | Update card           |
| DELETE | `/api/boards/{id}/columns/{col_id}/cards/{card_id}`         | Delete card           |
| POST   | `/api/boards/{id}/columns/{from}/move/{card_id}/to/{to}`    | Move card between cols|

### Other
| Method | Endpoint                          | Description             |
|--------|-----------------------------------|-------------------------|
| GET    | `/api/search?q=...`               | Global search           |
| GET    | `/api/notifications`              | Notification history    |
| POST   | `/api/notifications/{id}/read`    | Mark notification read  |
| GET    | `/api/backup/export`              | Export all data as JSON |
| POST   | `/api/backup/import`              | Import data from JSON   |
| GET    | `/api/health`                     | Health check            |

## 🔔 Notification Engine Details

The scheduler runs an APScheduler `AsyncIOScheduler` inside the FastAPI process.

1. **Periodic check** — Every 15 minutes, all deadlines are evaluated
2. **Time-aware** — Compares current UTC time against deadline `due_date`
3. **Flag-based** — Each reminder stage (3d, 2d, 1d, 1h) has a boolean flag to prevent duplicates
4. **Startup catch-up** — On application start, all deadlines are scanned and any missed notification windows trigger immediately
5. **Desktop integration** — Uses `plyer` (which calls `notify-send` on Linux) for native notifications
6. **History** — All sent notifications are logged to `notification_history.json`

### Missed Notification Handling

If your computer is off when a notification was supposed to fire:

```
System Off ─── 3d before deadline: missed
              ─── 2d before deadline: missed
              ─── 1d before deadline: missed
System On  ─── Startup: catches up and shows ALL missed notifications
              ─── 1h before deadline: fires normally
```

## 🛠 Development

### Build without Docker

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Adding New Features

1. **New data model** — Add model in `backend/app/models/`, create route in `routes/`, add collection to `storage.py`
2. **New frontend page** — Create page in `frontend/src/pages/`, add to sidebar in `Sidebar.tsx`, add to router in `App.tsx`
3. **New notification type** — Extend `notification_scheduler.py` with new check conditions

## 📦 Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 18, TypeScript, Vite, TailwindCSS, Framer Motion, Zustand |
| Backend   | Python 3.12, FastAPI, APScheduler, plyer |
| Storage   | JSON file-based with atomic writes  |
| Container | Docker, Docker Compose, nginx       |

## 📄 License

MIT
