# 🚨 PROCRASTINATION POLICE — ANTI-WORK ALARM DIVISION

> **"AYOOO SAYIP OP!"** — Anti-Work Detection & Audio Alarm Web App.

Welcome to **Procrastination Police**, Officer Sayip Op's official web application designed to punish work and reward peaceful procrastination!

---

## ⚡ Features
- 👮‍♂️ **Officer Sayip Op Mascot**: Reactive SVG avatar with speech bubbles.
- 🚨 **Real-Time Input Sensor**: Detects keyboard keypresses, mouse clicks, and scroll activity.
- 🔊 **Dual-Layer Audio Engine**: High-performance Web Audio API with HTML5 fallback playing the iconic *"AYOOO SAYIP OP!"* alarm sound.
- 📈 **4-Stage Escalation Matrix**:
  - **Level 1**: Safe & Resting (🟢)
  - **Level 2**: Work Warning Issued (🟡)
  - **Level 3**: "AYOOO SAYIP OP!" Sound Alarm & Police Siren Lightbar (🟠)
  - **Level 4**: Mandatory Anti-Work Lockdown Modal (🔴)
- 📊 **Procrastination Analytics**: Tracks total rest time, work attempts, and calculates your Procrastination Score %.

---

## 🚀 How to Deploy on Vercel

This repository is fully configured for zero-setup deployment on **Vercel**.

### Option 1: Deploy via GitHub (Recommended)
1. Push this repository to GitHub, GitLab, or Bitbucket.
2. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..." -> "Project"**.
3. Select your repository.
4. Keep all default settings:
   - **Framework Preset**: Other / Static HTML
   - **Root Directory**: `./`
5. Click **Deploy**! Your site will be live on Vercel in seconds.

### Option 2: Deploy via Vercel CLI
If you have the Vercel CLI installed:
```bash
# Login to Vercel
npx vercel login

# Deploy to preview
npx vercel

# Deploy to production
npx vercel --prod
```

---

## 🛠 Local Development
To test the site locally:
```bash
# Using Node.js serve
npx serve .

# Or using Python static server
python -m http.server 8000
```
Open `http://localhost:8000` in your browser.

---

## 📄 File Structure
```
├── index.html           # Main HTML structure with meta tags & overlays
├── styles.css           # Custom comic typography, glassmorphism & lightbars
├── app.js               # Sensor logic, AudioContext engine & escalation loop
├── ayooo-sayip-op.mp3   # Audio alarm file
├── vercel.json          # Vercel configuration & HTTP header rules
├── package.json         # Project manifest
└── .gitignore           # Git ignore rules
```
