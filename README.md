# NOVA

<p align="center">
  <img src="assets/logo.jpeg" alt="NOVA Logo" width="180">
</p>

<h1 align="center">NOVA</h1>

<p align="center">
  <strong>Health × Focus × AI × Habits × Adaptive Roadmaps</strong>
</p>

### Notice. Organize. Visualize. Act.
> An AI-powered wellness and focus companion that turns personal health, focus, and wellness data into actionable recommendations, adaptive Roadmaps, and habit-supporting daily actions.

**Health × Focus × AI × Habits × Adaptive Roadmaps**

[![Live Demo](https://img.shields.io/badge/Live-Demo-00685F?style=for-the-badge&logo=vercel&logoColor=white)](https://nova-omega-sable.vercel.app/)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)](https://github.com/NOVA-Wellness/Nova)
[![Demo Video](https://img.shields.io/badge/Demo-Video-712AE2?style=for-the-badge&logo=youtube&logoColor=white)](https://youtu.be/4K4ktwDnZpk)
[![Presentation](https://img.shields.io/badge/Presentation-Gslides-EA4335?style=for-the-badge&logo=google-slides&logoColor=white)](https://docs.google.com/presentation/d/1S7dqkkIVTNm0Rvxm-dfwBFq1XCnv_K5-/edit?usp=sharing&ouid=113880005579482280751&rtpof=true&sd=true)

![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?style=flat-square&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4.0-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.19-000000?style=flat-square&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Kotlin](https://img.shields.io/badge/Kotlin-Android-7F52FF?style=flat-square&logo=kotlin&logoColor=white)
![Android Health Connect](https://img.shields.io/badge/Health_Connect-Android_Native-3DDC84?style=flat-square&logo=android&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Gemini_API-3.1_&_2.5-8E75B2?style=flat-square&logo=googlegemini&logoColor=white)

---

## 1. Project Overview

- **🌐 Live Web Application:** [https://nova-omega-sable.vercel.app/](https://nova-omega-sable.vercel.app/)
- 📱 **NOVA Health Connect APK:** [Download APK](https://drive.google.com/file/d/1_fmLiuRY47-yU3s0378ciIMVIyW9aO9D/view?usp=sharing)
- **💻 GitHub Repository:** [https://github.com/NOVA-Wellness/Nova](https://github.com/NOVA-Wellness/Nova)
- **💻 Presentation :** [View PPT](https://docs.google.com/presentation/d/1S7dqkkIVTNm0Rvxm-dfwBFq1XCnv_K5-/edit?usp=sharing&ouid=113880005579482280751&rtpof=true&sd=true)
- **🎥 ASYNC'26 Demo Video:** [https://youtu.be/4K4ktwDnZpk](https://youtu.be/4K4ktwDnZpk)
- **📱 NOVA Health Connect Repo**: [https://github.com/Dakshupadhyay-byte/NOVA-Health-Sync](https://github.com/Dakshupadhyay-byte/NOVA-Health-Sync)

---

## 2. What is NOVA?

Modern health applications generate large volumes of personal activity data through smartphones, wearables, and health platforms. However, most existing solutions leave users with isolated numbers:

- Daily step counts
- Active exercise minutes
- Recorded sleep durations
- Focus session logs

Users are still left asking: **"What should I do next?"**

NOVA bridges this gap by connecting personal health telemetry, focus sessions, and subjective wellness check-ins into an intelligent feedback loop that drives real-world action.

```text
Data → Context → AI → Action → Check-in → Feedback → Adaptation → Habit
```

NOVA shifts the user experience from *static tracking* (*"What are my numbers?"*) to *adaptive execution* (*"What do my numbers mean for me today, and what action should I take?"*).

---

## 3. What NOVA Does

NOVA connects physical wellness data with productivity tools and an AI companion:

1. **Unified Health & Focus Dashboard:** Visualizes daily steps, exercise burn, sleep alignment, HRV, resting heart rate, and focus sprint performance in one dynamic glassmorphic interface.
2. **Context-Aware AI Companion:** Answers natural-language questions about health metrics, focus trends, and active schedules using authorized, user-scoped data.
3. **Adaptive Goal Roadmaps:** Converts high-level user outcomes into multi-day action plans with daily missions.
4. **Flexible Rescheduling & Shifting:** Allows users to modify, move, or push schedule missions through typed AI confirmation dialogs.
5. **Habit Building Loops:** Reinforces consistency through scheduled reminders, reaction tests, daily check-ins, and data-driven feedback.

---

## 4. Why NOVA Is Different

| Feature | Traditional Health Apps | Traditional AI Assistants | NOVA Platform |
| :--- | :--- | :--- | :--- |
| **Data Scope** | Isolated health metrics | No real-world user data | Unified Health + Focus + Check-in context |
| **Actionability** | Passive charts & graphs | Generic text advice | Structured daily missions & roadmaps |
| **Adaptability** | Static schedules | One-off answers | Dynamic Roadmap rescheduling & shifting |
| **Verification** | N/A | Hallucinated changes | Typed action confirmation cards with backend validation |
| **Availability** | Local app dependent | Single cloud API dependency | 3-Tier AI Fallback Engine (Gemini 3.1 → 2.5 → Local Llama 3.2) |

---

## NOVA at a Glance
<p align="center">
  <img src="assets/image.png" alt="nova-snapshot">
</p>


## 5. NOVA Health Connect — Our Android Health Bridge

### Technical Problem
Android **Health Connect** APIs are native Android OS interfaces. They cannot be queried directly from a browser-based web application.

### Solution
To bridge this gap, we engineered **NOVA Health Connect** — a dedicated native Android application written in **Kotlin**. It connects to native Health Connect data providers (Google Fit, Samsung Health, Xiaomi Health), aggregates physical telemetry, and streams authenticated updates to the NOVA backend via secure webhooks.

```text
Google Fit / Samsung Health / Wearables
                   ↓
         Android Health Connect
                   ↓
   NOVA Health Connect (Kotlin Android App)
                   ↓
      Authenticated Webhook API
                   ↓
         NOVA Backend (Node/Express)
                   ↓
            PostgreSQL Database
                   ↓
     Daily Aggregations & Dashboard
                   ↓
            NOVA AI Context
```

### Ingested Telemetry
- **Steps:** Cumulative step counts & daily targets
- **Exercise:** Active duration (minutes) & distance (meters)
- **Energy:** Active calorie burn
- **Sleep & HR:** Sleep stage durations, resting heart rate, and HRV

---

## 6. Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            HEALTH DATA SOURCES                              │
│                Google Fit  •  Samsung Health  •  Sensors                    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ANDROID HEALTH CONNECT                            │
│                         Native Android Telemetry                            │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     NOVA HEALTH CONNECT (KOTLIN APP)                        │
│             Android Native Service  •  Authenticated Webhook                │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            NOVA BACKEND (NODE/EXPRESS)                      │
│     Telemetry Ingestion  •  AI Context Service  •  Auth  •  PostgreSQL      │
└──────────────────┬───────────────────────────────────────┬──────────────────┘
                   │                                       │
                   ▼                                       ▼
┌─────────────────────────────────────┐ ┌─────────────────────────────────────┐
│          NOVA WEB APP               │ │         AI FALLBACK ENGINE          │
│   React + TypeScript + Vite + CSS   │ │ Gemini 3.1 → Gemini 2.5 → Llama 3.2 │
└─────────────────────────────────────┘ └─────────────────────────────────────┘
```

---


## 7. End-to-End Flow

<p align="center">
  <img src="assets/architecture.png" alt="NOVA End-to-End Architecture" width="900">
</p>

<p align="center">
  <em>NOVA end-to-end health data, AI, and personalization flow</em>
</p>

---

## 📸 Product Screenshots

### NOVA Dashboard

<p align="center">
  <img src="assets/dashboard.png" alt="NOVA Dashboard" width="900">
</p>

### Health & Activity History

<p align="center">
  <img src="assets/history.png" alt="Health and Activity History" width="900">
</p>

### AI Assistant

<p align="center">
  <img src="assets/ques.png" alt="NOVA AI Assistant" width="900">
</p>

### Roadmap Schedule

<p align="center">
  <img src="assets/roadmap_schedule.png" alt="Roadmap Schedule" width="900">
</p>

### Adaptive Roadmap

<p align="center">
  <img src="assets/roadmap.png" alt="NOVA Roadmap" width="900">
</p>

## 8. NOVA AI

NOVA AI is powered by a backend context assembly service (`aiContext.service.js`). Rather than granting raw, unvalidated database access, the backend builds a scoped data context for the authenticated user containing:

- User Profile & Sync States
- Today's Health Aggregates (Steps, Exercise, Distance)
- Recent Focus Blocks & Interruptions
- Daily Wellness Check-ins & Latency Scores
- Active Roadmap Blueprint & Day Statuses

### General Wellness Recommendations
NOVA AI can generate actionable wellness, mindfulness, and activity routines:
- **Yoga:** Structured restorative routines (e.g. *"15-minute evening wind-down flow"*).
- **Breathing:** Stress downregulation protocols (e.g. *"4-7-8 parasympathetic breathwork"*).
- **Exercise:** Quick bodyweight routines (e.g. *"10-minute morning energizer"*).
- **Mobility:** Posture alignment and joint mobility routines.
- **Activity-Aware Personalization:** Adjusts suggestions dynamically based on recent sleep hours, energy scores, and focus fatigue.

*Medical Safety Notice:* NOVA provides wellness and productivity support. It is not a medical diagnosis or prescription system. If data is missing, NOVA acknowledges unavailability rather than hallucinating metrics.

---

## 9. Adaptive Roadmaps

Users specify a desired outcome and plan duration (e.g. *"I want to improve my deep focus during the afternoon over the next 14 days"*). NOVA generates a structured daily Roadmap:

```text
Goal Specification
        ↓
AI Roadmap Blueprint
        ↓
Daily Action Missions
        ↓
Real-World Data & Check-ins
        ↓
Contextual Adaptation & Shift
```

### Roadmap Capabilities
- **Mission Lifecycle:** Status tracking for `pending`, `in_progress`, `completed`, and `skipped` missions.
- **Individual Mission Rescheduling:** Move a single pending day to a valid date with date-collision detection.
- **Whole-Roadmap Shifting:** Push all remaining pending days forward by N calendar days while preserving completed/skipped history.
- **Safety Authorization:** AI proposes action cards; explicit user confirmation is required before any database state change occurs.

*Internal Naming Note:* The backend database schema uses `blueprints` and `blueprint_days` tables, while the user-facing interface presents this feature as **Roadmap**.

---

## 10. Real-Life Adaptation Example

When a user encounters a schedule conflict or fatigue:

> **User:** *"I don't want to do today's mission today."* or *"Move today's mission to Friday."*

NOVA processes the request through a strict safety pipeline:

```text
User Request ("Move today's mission")
                  ↓
          AI Proposal Action
                  ↓
   Backend Date & Conflict Validation
                  ↓
    Action Confirmation Card Rendered
                  ↓
       User Explicitly Confirms
                  ↓
    Backend Updates Database Schedule
                  ↓
      Frontend Refreshes Roadmap
```

### Whole-Roadmap Shifting
> **User:** *"Push my whole Roadmap by 2 days."*

NOVA AI generates a `SHIFT_ROADMAP` action card showing a concise preview of affected dates. Once confirmed, the backend shifts all pending days while leaving completed and skipped missions intact.

---

## 11. Habit-Building Loop

NOVA supports long-term habit formation by structuring repetition and continuous feedback:

```text
Goal Specification → Daily Mission → Scheduled Reminder → Action → Check-in → Telemetry → AI Feedback → Adaptation → Repetition
```

*Design Principle:* NOVA is designed to support consistent behavior through repeated actions, reminders, check-ins, and adaptive feedback loops.

---

## 12. Technology Stack

### Frontend
- **Framework:** React 18, TypeScript 5.6, Vite 8.3
- **Styling:** Tailwind CSS v4, Custom Glassmorphic System
- **Icons & Motion:** Lucide Icons, Framer Motion

### Backend
- **Runtime:** Node.js (v18+), Express.js
- **Database:** PostgreSQL with `pg` connection pool
- **Services:** Custom AI Context Assembler, Health Webhook Processor, Roadmap Manager

### Android Bridge App
- **Language:** Kotlin
- **Platform:** Android SDK, Android Health Connect API
- **Networking:** Authenticated Webhook Client

### AI Engine & Fallbacks
- **Primary AI:** Google Gemini API (`gemini-3.1-flash-lite`)
- **Secondary Fallback:** Google Gemini API (`gemini-2.5-flash`)
- **Local Fallback:** Ollama self-hosted Llama 3.2

### Infrastructure & Auth
- **Authentication:** Firebase Auth (Google OAuth 2.0)
- **Deployment:** Vercel (Frontend), Node Server (Backend)

---

## 13. Repository Structure

```text
NOVA/
├── Frontend/                      # React + TypeScript + Vite Web App
│   ├── src/
│   │   ├── components/            # Header, Sidebar, Cards, Modals, Logo
│   │   ├── screens/               # Overview, Focus, CheckIn, Analytics, History, Blueprint, NovaAI, Simulator, Settings, Login, Landing
│   │   ├── services/              # API Client, Firebase Auth, NOVA AI Service
│   │   ├── types/                 # TypeScript Types & Interfaces
│   │   ├── index.css              # Glassmorphic Design System & Tokens
│   │   └── App.tsx                # Main App Shell & Routing
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                       # Node.js + Express + PostgreSQL Backend
│   ├── src/
│   │   ├── config/                # Database Pool & Environment Config
│   │   ├── controllers/           # Auth, Dashboard, Health, AI, Blueprints, Checkin
│   │   ├── middleware/            # Auth & Webhook Middleware
│   │   ├── routes/                # Express Route Handlers
│   │   └── services/              # Gemini, Ollama, AI Context, Blueprint Engine
│   ├── schema.sql                 # PostgreSQL Database Schema
│   ├── migrate.js                 # Database Migration Script
│   ├── server.js                  # Entry Point
│   ├── package.json
│   └── test-*.js                  # Automated Test Verification Suite
│
├── .gitignore
├── package.json
└── README.md                      # Repository Documentation
```

---

## 14. Getting Started

### Prerequisites
- **Node.js:** v18.0.0 or higher
- **PostgreSQL:** v15.0 or higher
- **Git**

### 1. Clone Repository
```bash
git clone https://github.com/NOVA-Wellness/Nova.git
cd Nova
```

### 2. Backend Setup
```bash
cd backend
npm install
# Configure .env file (see Environment Variables section)
node migrate.js
npm run dev
```

### 3. Frontend Setup
```bash
cd ../Frontend
npm install
npm run dev
```

The application will be accessible locally at `http://localhost:3000`.

---

## 15. Android / NOVA Health Connect Setup

**NOVA Health Connect** is our custom Android/Kotlin bridge application that connects authorized Health Connect data from an Android device to the NOVA backend.

> **Note:** The APK is distributed through Google Drive for ASYNC'26 evaluation and is not currently published on Google Play.

### 📱 Download NOVA Health Connect APK

**[Download NOVA Health Connect APK](https://drive.google.com/file/d/1JR9-z9Vt0-wDKcS3W6WMq0v_iIPittb1/view?usp=drive_link)**

### Setup & Pairing Instructions

1. **Download APK:** Download the APK from the Google Drive link above on an Android smartphone.
2. **Install APK:** Install the **NOVA Health Connect** APK.
3. **Grant Permissions:** Open the app and grant the required Health Connect permissions.
4. **Complete Pairing:** Open the [NOVA Web Application](https://nova-omega-sable.vercel.app/), navigate to **Settings → Health Sync**, and scan the pairing QR code or enter the Webhook Auth Token into the Android app.
5. **Synchronize:** Once paired, authorized health data is transmitted to the NOVA backend and reflected in the dashboard and AI context.

---

## 16. Environment Variables

### Backend (`backend/.env`)
```env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/nova_db
GEMINI_API_KEY=your_gemini_api_key
FIREBASE_PROJECT_ID=your_firebase_project_id
OLLAMA_BASE_URL=http://localhost:11434
HEALTH_WEBHOOK_SECRET=your_webhook_signing_secret
```

### Frontend (`Frontend/.env`)
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 17. API Overview

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/google` | Authenticate Firebase token & sync user profile | No |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Yes (Bearer Token) |
| `POST` | `/api/auth/webhook-token` | Generate persistent Android webhook token | Yes (Bearer Token) |
| `POST` | `/api/health-pairing/create` | Create a pairing session with QR payload | Yes (Bearer Token) |
| `POST` | `/api/health-pairing/claim` | Claim device pairing token (Android side) | No (Pairing Code) |
| `POST` | `/api/health/webhook` | Ingest telemetry batch from Android bridge | Yes (Webhook Secret) |
| `GET` | `/api/health/daily` | Fetch aggregated daily health telemetry | Yes (Bearer Token) |
| `GET` | `/api/dashboard` | Fetch user dashboard metrics & summaries | Yes (Bearer Token) |
| `POST` | `/api/ai/chat` | Send message to NOVA AI & receive structured actions | Yes (Bearer Token) |
| `GET` | `/api/blueprints` | List active & past Roadmaps | Yes (Bearer Token) |
| `POST` | `/api/blueprints` | Generate a new AI Roadmap from goal & duration | Yes (Bearer Token) |
| `PATCH` | `/api/blueprints/days/:dayId/reschedule` | Reschedule a single pending mission | Yes (Bearer Token) |
| `PATCH` | `/api/blueprints/:blueprintId/shift` | Shift all pending missions by N days | Yes (Bearer Token) |
| `POST` | `/api/checkin` | Submit daily wellness rating & reaction speed test | Yes (Bearer Token) |
| `POST` | `/api/sessions` | Log completed focus sprint session | Yes (Bearer Token) |
| `POST` | `/api/simulation/what-if` | Run sleep vs. energy correlation simulation | Yes (Bearer Token) |

---

## 18. Usage Examples

### AI Chat & Action Proposal
```json
// POST /api/ai/chat
{
  "message": "Move today's mission to Friday."
}

// Response
{
  "success": true,
  "reply": "I can reschedule your 'Set a Bedtime Anchor' mission to Friday, 2026-10-02. Please confirm to proceed.",
  "action": {
    "type": "RESCHEDULE_ROADMAP_DAY",
    "dayId": 42,
    "dayNumber": 3,
    "missionTitle": "Set a Bedtime Anchor",
    "currentDate": "2026-09-30",
    "targetDate": "2026-10-02"
  }
}
```

---

## 19. Testing & Quality

The backend contains an automated verification test suite:

- `test-ai-holistic.js`: Validates cross-domain AI responses and context assembly.
- `test-ai-roadmap.js`: Validates AI Roadmap action parsing and proposal cards.
- `test-blueprints.js`: Tests Roadmap blueprint creation, day rescheduling, and shift calculations.
- `test-gemini-fallback.js`: Simulates primary API failures and verifies secondary/tertiary model fallback.
- `test-health-pairing.js`: Tests pairing token generation, claiming, and webhook ingestion.

### Frontend Quality Checks
```bash
# Type-check
cd Frontend && npx tsc --noEmit

# Production Build Check
cd Frontend && npm run build
```

---

## 20. Reliability & AI Fallback

To prevent service degradation during API outages, NOVA uses a 3-tier fallback chain:

1. **Tier 1:** Gemini 3.1 Flash-Lite (Fast, context-rich primary)
2. **Tier 2:** Gemini 2.5 Flash (High-capacity secondary)
3. **Tier 3:** Self-Hosted Ollama / Llama 3.2 (Local fallback)

If Tier 1 experiences rate-limiting or transient errors, the backend automatically fails over to Tier 2 and Tier 3 without user interruption. All structured outputs undergo backend JSON schema validation regardless of model tier.

---

## 21. Security & Privacy

- **User Isolation:** All database queries scope results strictly to `req.user.id` derived from verified Firebase tokens.
- **Parametrized Queries:** SQL queries use parametrized inputs (`$1`, `$2`) to prevent SQL injection vulnerabilities.
- **Webhook Token Authentication:** Android telemetry webhooks require cryptographic token validation.
- **Credential Protection:** Secrets and API keys are restricted to server-side environment variables and never exposed to client bundles.

---

## 22. Known Limitations

- **Android Health Connect Scope:** Health Connect telemetry ingestion requires an Android device running the NOVA Health Connect bridge app.
- **Non-Medical Usage:** NOVA is designed for wellness and focus tracking, not medical diagnosis or treatment.

---

## 23. Demo

- **Live Application:** [https://nova-omega-sable.vercel.app/](https://nova-omega-sable.vercel.app/)
- 📱 **Android App:** [Download NOVA Health Connect APK](https://drive.google.com/file/d/1JR9-z9Vt0-wDKcS3W6WMq0v_iIPittb1/view?usp=drive_link)
- **GitHub:** [https://github.com/NOVA-Wellness/Nova](https://github.com/NOVA-Wellness/Nova)
- **Demo Video:** [https://youtu.be/4K4ktwDnZpk](https://youtu.be/4K4ktwDnZpk)

---

## 24. Team

Built with ❤️ for **ASYNC'26**:

| Team Member | Role |
| :--- | :--- |
| **Daksh Upadhyay** | Team Leader & App Developer |
| **Ayush Agrawal** | Backend Developer |
| **Dipanshu Shah** | Frontend Developer |
| **Divyansh Gupta** | Database Developer |

---

## 25. License

This project is open-source under the [Apache 2.0 License](LICENSE).

**NOVA — Notice. Organize. Visualize. Act.**
