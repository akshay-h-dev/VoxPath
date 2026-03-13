# VOXPATH — AI Voice Interview System

🚀 **Team:** CSF-United

VoxPath is a **Chrome Extension that enables fully voice-navigable interviews** on existing job portals. It allows visually impaired candidates to navigate interview questions, answer verbally, receive AI feedback, and generate a bias-free evaluation report — **without requiring any screen interaction**.

---

# Problem Statement

Visually impaired candidates face significant barriers during online interviews and assessments because most job portals rely heavily on visual interfaces.

Common challenges include:

* Difficulty navigating interview forms
* Lack of accessible question reading
* No real-time communication feedback
* Bias in visually dependent interview questions
* Limited independence during the interview process

These limitations restrict equal access to **education and employment opportunities**.

---

# Solution Overview

**VoxPath solves the entire interview journey through voice interaction.**

The Chrome extension integrates directly with existing job portals and provides:

* Voice navigation of interview forms
* Speech-to-text answer capture
* AI-based answer evaluation
* Communication pattern analysis
* Bias-free interview reports

This enables visually impaired candidates to participate in interviews **independently and fairly**.

---

# Key Features

## 1. AI Answer Scoring Engine

After each spoken answer, the response is analyzed using AI.

The system evaluates:

* Relevance to the question
* Completeness of the answer
* Clarity of communication

Each dimension is scored from **1–5**, and the candidate receives a spoken improvement tip.

Example feedback:

> "Your answer scored 4 out of 5 for relevance, 3 for completeness, and 4 for clarity. Try adding a specific example to make your answer stronger."

---

## 2. Full Voice Navigation

The extension supports continuous voice commands so the candidate can control the entire interview without touching the keyboard or mouse.

Supported commands:

| Voice Command   | Action                                     |
| --------------- | ------------------------------------------ |
| Begin interview | Starts the session                         |
| Next question   | Moves to the next question                 |
| Repeat question | Replays the question                       |
| Submit answer   | Saves the response and triggers evaluation |
| Go back         | Returns to the previous question           |
| End interview   | Ends the session and generates report      |
| Help            | Lists available commands                   |

---

## 3. Chrome Extension Portal Integration

The Chrome extension integrates with existing job portals using **DOM parsing**.

Capabilities include:

* Detecting interview questions on the page
* Extracting question text automatically
* Reading questions aloud using Text-to-Speech
* Injecting transcribed answers into form fields

This allows VoxPath to work **without requiring modifications from employers**.

Example supported portals for demo:

* Internshala
* College placement portals
* Generic interview form pages

---

## 4. Bias-Free Evaluation Report

After the interview session ends, VoxPath generates a **PDF report** containing:

### Candidate Performance Analysis

* Average communication score
* Strongest answer
* Weakest answer
* Improvement suggestions

### Question Bias Audit

The system flags visually dependent questions such as:

* "Describe this chart"
* "Walk me through this diagram"
* "What do you see here?"

The report also suggests **accessible alternatives** for employers.

---

## 5. Communication Pattern Detector

VoxPath analyzes communication patterns in each response.

The system detects:

### Filler Words

Examples:

* um
* uh
* like
* basically
* you know

### Additional Metrics

* Words per minute (WPM)
* Speech pacing
* Pause frequency

Example feedback:

> "Three filler words detected. Your speaking pace was slightly fast at 180 words per minute. Try slowing down slightly."

This provides visually impaired candidates with **real-time communication coaching**.

---

# System Architecture

```
Job Portal (Internshala / LinkedIn / etc.)
                │
                ▼
        Chrome Extension
        (DOM Parser Layer)
                │
                ▼
        Voice Navigation Engine
                │
        ┌───────┴─────────┐
        ▼                 ▼
 Speech Recognition   Question Reader
     (STT)                 (TTS)
        │
        ▼
    Answer Processing
        │
   ┌────┴─────────┐
   ▼              ▼
Filler Detection  AI Scoring Engine
   │              │
   └───────┬──────┘
           ▼
     Spoken Feedback
           │
           ▼
      Session Summary
           │
           ▼
   Bias-Free PDF Report
```

---

# Technology Stack

| Component         | Technology          |
| ----------------- | ------------------- |
| Chrome Extension  | Manifest V3         |
| Frontend          | JavaScript          |
| DOM Parsing       | Vanilla JS          |
| Speech-to-Text    | Web Speech API      |
| Text-to-Speech    | SpeechSynthesis API |
| AI Evaluation     | Groq API            |
| Report Generation | jsPDF               |
| NLP Analysis      | JavaScript          |

All technologies used are **free or built directly into the browser**.

---

# Installation

### 1. Clone the repository

```
git clone https://github.com/your-username/voxpath.git
```

### 2. Open Chrome Extensions

```
chrome://extensions
```

### 3. Enable **Developer Mode**

### 4. Click **Load Unpacked**

### 5. Select the VoxPath extension folder

The extension will now be installed.

---

# Demo Flow

1. Open an interview form on a job portal.
2. The extension activates automatically.
3. The system announces:

```
"VoxPath active. Say begin interview to start."
```

4. Candidate says:

```
Begin interview
```

5. The question is read aloud.

6. Candidate answers verbally.

7. AI provides spoken feedback.

8. Candidate says:

```
Next question
```

9. After completing the interview:

```
End interview
```

10. VoxPath generates a **performance summary and PDF report**.

---

# Sustainable Development Goals

VoxPath supports the following UN SDGs:

**SDG 4 — Quality Education**
Improves accessibility in learning and assessment environments.

**SDG 9 — Industry, Innovation, and Infrastructure**
Integrates with existing hiring infrastructure.

**SDG 10 — Reduced Inequalities**
Ensures fair participation in employment opportunities.

---

# Future Improvements

* Support for additional job portals
* Advanced NLP evaluation
* Multilingual voice interaction
* Employer dashboard for analytics
* Real-time interview integration

---

# Project Status

Prototype built for **hackathon demonstration**.

The system demonstrates:

* Voice-controlled interview navigation
* AI answer evaluation
* Communication pattern analysis
* Bias-free reporting

---

# Team

**CSF-United**

---

