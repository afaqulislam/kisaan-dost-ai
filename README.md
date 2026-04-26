# 🌿 Kisaan Dost AI
### Field Diagnostic Expert for Pakistani Farmers

<div align="center">

![Kisaan Dost AI Banner](https://img.shields.io/badge/Kisaan%20Dost%20AI-Field%20Diagnostic%20Expert-2d6a4f?style=for-the-badge&logoColor=white)

[![Made for Pakistan](https://img.shields.io/badge/Made%20for-Pakistan%20🇵🇰-01411C?style=flat-square)](https://github.com)
[![Google Gemini](https://img.shields.io/badge/Powered%20by-Google%20Gemini%202.0%20Flash-4285F4?style=flat-square&logo=google)](https://aistudio.google.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.0-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![Google Cloud Run](https://img.shields.io/badge/Deployed%20on-Cloud%20Run-4285F4?style=flat-square&logo=google-cloud)](https://cloud.google.com/run)
[![AI Seekho 2026](https://img.shields.io/badge/Google-AI%20Seekho%202026-EA4335?style=flat-square&logo=google)](https://aiseekho.google)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Click%20Here%20🚀-2d6a4f?style=flat-square)](https://kisaan-dost-ai-1055174968017.asia-southeast1.run.app/)

</div>

---

## 🚀 Live Demo

> **Try it now:** [https://kisaan-dost-ai-1055174968017.asia-southeast1.run.app/](https://kisaan-dost-ai-1055174968017.asia-southeast1.run.app/)

Deployed on **Google Cloud Run** — `asia-southeast1` region for fastest access from Pakistan.

---

## 📖 Overview

**Kisaan Dost AI** is a state-of-the-art agricultural companion designed to empower farmers across Pakistan with instant, accurate, and actionable crop health diagnostics. By leveraging computer vision and Google's **Gemini 2.0 Flash** model, the app identifies crop diseases from a simple photo and delivers professional-grade advice in **Roman Urdu** — making expert agricultural knowledge accessible to every farmer, regardless of literacy level.

> 🏆 Built for **Google AI Seekho 2026** — Track: **App Banaao**
> `#AISeekho2026` `#VibeKaregaPakistan`

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🔬 **Instant Disease Diagnosis** | Upload a crop photo — Gemini AI identifies pests, fungal infections, and nutritional deficiencies in seconds |
| 🗣️ **Roman Urdu Support** | All results, treatments, and prevention tips delivered in Roman Urdu for maximum farmer accessibility |
| 🔊 **Voice Feedback (TTS)** | "Awaz Mein Sunein" — farmers listen to the full diagnosis in Urdu/Hindi phonetics via browser Speech Synthesis |
| 📊 **Severity Assessment** | Critical / Moderate / Low risk indicators with visual confidence scoring |
| 💊 **Treatment Plans (Ilaj)** | Step-by-step chemical and organic remedies with specific product names available in Pakistan |
| 📉 **Yield Loss Prediction** | Estimated harvest impact if disease is left untreated |
| 🛡️ **Prevention Tips (Parhez)** | Long-term strategies to avoid disease recurrence next season |
| ⛅ **Weather Alerts** | Context-aware seasonal alerts specific to Pakistani climate |
| 📱 **Fully Responsive** | Bento Grid layout — perfect from 320px mobile to 1280px+ desktop |
| ⚡ **Premium UX** | Framer Motion animations with scan-line effects and smooth state transitions |
| 🍎 **iPhone HEIC Support** | Automatic HEIC-to-JPEG conversion via `heic2any` for iPhone users in the field |

---

## 🏗️ Architecture

The project follows a **Full-Stack Vite + Express** architecture — ensuring the Gemini API Key stays securely on the server side and is never exposed to the client.

```
┌─────────────────────────────────────────────────────┐
│                   KISAAN DOST AI                    │
├──────────────────┬──────────────────────────────────┤
│   FRONTEND (SPA) │         BACKEND (Express)        │
│   React 19 +     │   server.ts — API Proxy +        │
│   TypeScript     │   Vite HMR (dev) / Static (prod) │
├──────────────────┴──────────────────────────────────┤
│           AI ENGINE — Gemini 2.0 Flash              │
│     Custom-prompted for Pakistani Agriculture       │
│         Responds exclusively in Roman Urdu          │
└─────────────────────────────────────────────────────┘
```

---

## 📸 How It Works

```
📷 Capture/Upload → 🤖 AI Analysis → 🔊 Phonetic Processing → 📋 Full Report
```

1. **Capture / Upload** — Farmer takes a photo or selects from gallery (HEIC/iPhone auto-converted)
2. **AI Analysis** — Image sent to Gemini 2.0 Flash via secure server-side proxy
3. **Phonetic Processing** — Roman Urdu text processed for natural Urdu pronunciation in voice mode
4. **Professional Report** — Structured, color-coded Bento Grid report with most critical info first

---

## 🛠️ Technology Stack

```
Frontend        →  React 19 + TypeScript
Styling         →  Tailwind CSS 4.0 (Forest & Sage color palette)
Typography      →  Inter (UI) + Playfair Display (headings)
AI Engine       →  Google Gemini 2.0 Flash (@google/genai)
Backend         →  Node.js + Express (server.ts)
Animations      →  Framer Motion (motion/react)
Icons           →  Lucide React
Image Handling  →  heic2any (HEIC → JPEG on-the-fly conversion)
Build Tool      →  Vite
Deployment      →  Google Cloud Run (asia-southeast1)
```

---

## 📁 Project Structure

```
kisaan-dost-ai/
├── Dockerfile           # Optimized containerization for Google Cloud Run
├── server.ts           # Express backend — API proxy + Vite HMR integration
├── src/
│   ├── App.tsx         # Main app — Diagnosis Engine, TTS, State Machine, UI
│   ├── index.css       # Tailwind 4.0 — Forest/Sage theme + custom animations
│   ├── main.tsx        # React entry point
│   └── constants.ts    # ANALYSIS_PROMPT + system configurations
├── index.html          # Browser entry — SEO meta tags + React root div
├── metadata.json       # AI Studio platform config (name, permissions, camera)
├── package.json        # Dependencies + npm scripts
├── vite.config.ts      # Build tool configuration
└── README.md           # This file
```

---

## 📂 File-by-File Breakdown

### `server.ts` — The Backend
- Loads `GEMINI_API_KEY` securely from environment variables — never reaches the browser
- **Development**: Wires up Vite's Hot Module Replacement (HMR) for fast iteration
- **Production**: Serves compiled static files from the `dist` folder
- Acts as a secure AI proxy between frontend and Gemini API

### `src/App.tsx` — The Brains (90% of logic)
- **AI Prompting**: `ANALYSIS_PROMPT` — carefully crafted instruction making Gemini act as a plant pathologist specialized in Pakistan
- **State Machine**: Manages complete flow `Welcome → Uploading → Analyzing → Result`
- **DiagnosisResult Interface**: TypeScript-enforced consistent AI output (Crop, Disease, Severity, Treatment, etc.)
- **Voice System**: `speakResult()` using browser Speech Synthesis optimized for Urdu/Hindi phonetics
- **Responsive UI**: Tailwind `clamp()` + Bento Grid layout for all screen sizes

### `src/index.css` — Styling Engine
- **Tailwind 4.0** with `@theme` variables for "Forest" and "Sage" color palettes giving an Agricultural/Nature feel
- Custom scan-line animations and backdrop blur transitions
- `clamp()` based responsive typography throughout

### `metadata.json` — Platform Config
- Defines app name, description, and permissions for Google AI Studio platform
- Explicitly requests Camera access for field use by farmers

---

## 🌟 Key Technical Highlights

### 🗣️ Roman Urdu Phonetic Processing
The app uses a `convertToPhoneticRomanUrdu()` regex-based function to fix common browser TTS mispronunciations — e.g., `"Kisaan"` → `"Kissaan"` — ensuring natural and accurate Urdu voice output.

### 🍎 HEIC Image Handling
Modern iPhones shoot in `.heic` format which browsers struggle to process. The app uses `heic2any` to convert these to JPEG on-the-fly, ensuring farmers can use any phone directly from the field without worrying about file formats.

### 🔒 Master Gate — Input Validation
The `ANALYSIS_PROMPT` forces Gemini to return a specific `"Error"` JSON object for unclear or non-plant images — preventing the app from generating false or misleading agricultural advice.

### 📐 Bento Grid Responsive Layout

| Screen Size | Layout |
|---|---|
| **Mobile** (320px+) | Single vertical card stack — optimized for one-hand scrolling |
| **Tablet** (768px+) | 2-column grid for comfortable reading |
| **Desktop** (1280px+) | 3-column professional dashboard layout |

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js **v20+**
- Gemini API Key from [Google AI Studio](https://aistudio.google.com/apikey)

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/your-username/kisaan-dost-ai.git
cd kisaan-dost-ai

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env:
# GEMINI_API_KEY=your_key_here

# 4. Start development server
npm run dev
# → App running at http://localhost:5173
```

### Production Build

```bash
npm run build
# Compiled output in /dist folder
```

---

## ☁️ Deployment — Google Cloud Run

The application is containerized using **Docker** and deployed on **Google Cloud Run** for high availability and low latency in Pakistan.

```bash
gcloud run deploy kisaan-dost-ai \
  --source . \
  --project kisaan-dost-ai \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_key_here \
  --memory 1Gi \
  --port 8080
```

---

## 🐳 Docker (Local Deployment)

To run the application locally using Docker:

```bash
# 1. Build image locally
docker build -t kisaan-dost-ai .

# 2. Run locally
docker run -p 8080:8080 -e GEMINI_API_KEY=your_key kisaan-dost-ai
```

---

## 🛡️ Security & Performance

- **Server-Side Proxy** — API key lives only in `server.ts` environment — never sent to browser
- **Responsive Typography** — `clamp()` functions ensure perfect readability at every viewport width
- **Image Optimization** — Automatic HEIC conversion with visual processing feedback stages
- **Input Validation** — AI hard-rejects non-plant images before generating any response
- **Smooth Animations** — Framer Motion for premium transitions without performance cost

---

## 🎯 Built For

**Google AI Seekho 2026** — Pakistan's premier AI learning and building challenge powered by Google AI Studio and Google Cloud.

> Track: **App Banaao** — Building impactful AI-driven solutions for Pakistan 🇵🇰

---

## 👷 Author

**Afaq Ul Islam** — COO @ Neofyx | Full-Stack & Agentic AI Developer

---

<div align="center">

© 2026 **KISAAN DOST AI** — Field Diagnostic Expert for Pakistani Farmers 🇵🇰

*Kisaan ki madad, AI ke saath.*

</div>