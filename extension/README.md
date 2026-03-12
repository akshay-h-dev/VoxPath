# VoxPath — AI Voice Interview System

> A Chrome Extension that makes any job portal fully voice-navigable with AI-powered feedback for visually impaired candidates.

## Install (Developer Mode)

1. Open Chrome → go to `chrome://extensions`
2. Toggle **Developer Mode** ON (top right)
3. Click **Load Unpacked**
4. Select this `voxpath/` folder
5. The VoxPath icon appears in your toolbar ✓

## Setup

1. Click the VoxPath icon
2. Click **Configure Groq API Key** (or Settings ⚙)
3. Paste your free API key from [console.groq.com](https://console.groq.com)
4. Click **Save Settings**

## Usage

1. Open any job portal (Internshala, LinkedIn, Naukri)
2. Click VoxPath → **Launch VoxPath**
3. Say **"begin interview"** — extension reads questions aloud
4. Speak your answers — AI scores each one after you finish
5. Say **"next question"** to advance
6. Say **"end interview"** to generate your report

## Voice Commands

| Say | Action |
|---|---|
| "begin interview" | Start session |
| "next question" | Advance |
| "repeat question" | Re-read current question |
| "submit answer" | Save & score your answer |
| "go back" | Previous question |
| "end interview" | End + generate report |
| "help" | List all commands |

## Tech Stack

- Manifest V3 Chrome Extension
- Web Speech API (STT + TTS) — built into Chrome, free
- Groq API (llama-3.1-8b-instant) — free tier
- Vanilla JS — zero dependencies

## SDG Alignment
- SDG 4 — Quality Education
- SDG 9 — Industry, Innovation and Infrastructure  
- SDG 10 — Reduced Inequalities
