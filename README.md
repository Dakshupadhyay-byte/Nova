#  NOVA —  NOTICE . ORGANIZE . VISUALIZE . ACT

> **Your health data. Your focus. Your personalized wellness companion.**

[![Live Demo](https://img.shields.io/badge/Live-Demo-00C853?style=for-the-badge)](https://nova-omega-sable.vercel.app/)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge\&logo=github)](https://github.com/NOVA-Wellness/Nova)

**NOVA** is an AI-powered wellness and focus platform that transforms everyday health and activity data into meaningful insights and personalized recommendations.

Instead of simply showing users raw health metrics, NOVA connects their wellness data, analyzes patterns, and turns those patterns into actionable guidance for improving focus, sleep, activity, and overall well-being.

---

## 🚀 Live Demo

### 🌐 [Try NOVA](https://nova-omega-sable.vercel.app/)

### 💻 [GitHub Repository](https://github.com/NOVA-Wellness/Nova)

---

## 💡 The Problem

Modern users generate huge amounts of health and activity data through smartphones, wearables, and health platforms.

However, this data is often:

* Scattered across different applications
* Difficult to interpret
* Presented as numbers rather than meaningful insights
* Not personalized to the user's daily routine
* Disconnected from productivity and focus

**NOVA bridges this gap.**

It converts health telemetry into understandable insights and personalized recommendations that help users understand the relationship between their physical wellness and their ability to focus.

---

## ✨ What NOVA Does

### 📊 Health & Wellness Dashboard

NOVA provides a unified view of important wellness metrics, allowing users to understand their recent activity and health patterns in one place.

### 🔄 Health Data Synchronization

NOVA is designed to receive health data through **Android Health Connect**, allowing supported health and fitness data to flow into the NOVA ecosystem.

```text
Health / Fitness Apps
        ↓
   Android Health Connect
        ↓
   NOVA Sync Layer
        ↓
      Backend
        ↓
      Database
        ↓
   NOVA Dashboard
```

### 🤖 AI-Powered Personalization

NOVA uses AI to interpret a user's wellness context and provide personalized recommendations rather than generic advice.

Recommendations can consider factors such as:

* Sleep
* Activity
* Daily patterns
* Focus habits
* Wellness trends

### 🧠 Focus & Wellness Insights

NOVA's goal is not simply to track health metrics.

It helps users understand:

> **"How does my current lifestyle affect my ability to focus and perform?"**

### 💬 AI Companion

NOVA includes an AI-powered companion that can interact with the user's wellness context and provide personalized guidance.

---

# 🏗️ Architecture

```text
                  ┌──────────────────────┐
                  │  Health / Fitness    │
                  │       Apps           │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │   Android Health     │
                  │       Connect        │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │    NOVA Sync Layer   │
                  │   Android Service    │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │       Backend        │
                  │    APIs + Logic      │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │      PostgreSQL      │
                  │       Database       │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │   NOVA Web App       │
                  │ Dashboard + AI       │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │ Personalized Insights│
                  │ & Recommendations    │
                  └──────────────────────┘
```

---

# 🛠️ Tech Stack

### Frontend

* React
* JavaScript
* Modern responsive UI
* Vercel deployment

### Backend

* Node.js
* Express.js
* REST APIs
* PostgreSQL

### Health Data

* Android Health Connect
* Android native integration
* Health & activity telemetry synchronization

### AI

* Google Gemini API
* Context-aware AI recommendations
* AI wellness companion

### Infrastructure

* Vercel
* PostgreSQL
* GitHub

---

# 📁 Project Structure

```text
Nova/
│
├── Frontend/
│   ├── src/
│   ├── public/
│   └── ...
│
├── backend/
│   ├── src/
│   ├── routes/
│   ├── services/
│   └── ...
│
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

---

# ⚙️ Getting Started

## 1. Clone the repository

```bash
git clone https://github.com/NOVA-Wellness/Nova.git

cd Nova
```

---

## 2. Install dependencies

### Frontend

```bash
cd Frontend
npm install
```

### Backend

```bash
cd ../backend
npm install
```

---

## 3. Environment Variables

Create the required `.env` files for the frontend and backend.

Example:

```env
DATABASE_URL=your_postgresql_connection_string
GEMINI_API_KEY=your_gemini_api_key
```

> **Never commit API keys, database credentials, or other secrets to GitHub.**

---

## 4. Start the Backend

```bash
cd backend
npm run dev
```

---

## 5. Start the Frontend

```bash
cd Frontend
npm run dev
```

The development server will provide the local URL for the NOVA dashboard.

---

# 🔐 Privacy & Security

NOVA is designed around responsible handling of personal wellness data.

Key principles include:

* API keys are stored using environment variables
* Sensitive credentials should never be committed to the repository
* Health data is handled through authorized Health Connect access
* Users should control which health information is shared with NOVA

NOVA is intended as a **wellness and productivity tool**, not a medical diagnosis system.

---

# 🌟 What Makes NOVA Different?

Traditional health applications primarily answer:

> **"What are my numbers?"**

NOVA aims to answer:

> **"What do my numbers mean for me today?"**

By combining:

**Health Data + AI + Personal Context + Focus**

NOVA creates a more connected wellness experience.

---

# 🔮 Future Scope

Potential future improvements include:

* 📱 Expanded Android health integrations
* 🧠 More advanced personalized recommendations
* 📈 Long-term wellness trend analysis
* 💤 Deeper sleep and recovery insights
* 🎯 Adaptive focus recommendations
* 🔔 Intelligent wellness notifications
* 🤖 More capable AI wellness companion
* 📊 Advanced personal analytics
* 🔐 Further privacy and security improvements

---

# 👨‍💻 Team NOVA

Built with ❤️ by:

| Team Member        | Role                  |
| ------------------ | --------------------- |
| **Daksh Upadhyay** | Development           |
| **Divyansh Gupta** | Development & Product |
| **Dipanshu Shah**  | Development           |
| **Ayush Agrawal**  | Development           |

---

# 🌐 Links

**Live Application:**
https://nova-omega-sable.vercel.app/

**GitHub:**
https://github.com/NOVA-Wellness/Nova

---

## ⭐ Support the Project

If you find NOVA interesting, consider giving the repository a ⭐ on GitHub.

**NOVA — Understand your body. Improve your focus. Live better.**
