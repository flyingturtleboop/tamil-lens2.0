# Tamil Lens

<div align="center">

![Next.js](https://img.shields.io/badge/Frontend-Next.js-black)
![React](https://img.shields.io/badge/UI-React-blue)
![Flask](https://img.shields.io/badge/Backend-Flask-black)
![Gemini](https://img.shields.io/badge/AI-Gemini-blue)
![SQLAlchemy](https://img.shields.io/badge/Database-SQLAlchemy-green)

**AI language learning app that makes Tamil vocabulary practice interactive through object scanning, translations, transliterations, flashcards, quizzes, streaks, and classroom-focused learning tools.**

**Demo:** [Watch the Tamil Lens demo](https://youtu.be/yzQfq7iNGYg?si=zAxOZHbuRC3oeV_Z)

</div>

---

## Overview

Tamil Lens is an AI-powered language learning app that helps students learn Tamil by scanning real-world objects and turning them into vocabulary practice.

Users can take a picture of an object, receive the English word, Tamil translation, transliteration, and then save the word into a personal word bank for flashcards, quizzes, and review.

I am also partnering with local Tamil schools to explore how Tamil Lens can make vocabulary learning more interactive for students through classroom and at-home practice.

---

## Core Workflow

User scans object  
↓  
Image sent to backend  
↓  
AI vision model identifies object  
↓  
App returns English + Tamil + transliteration  
↓  
Word is saved to personal word bank  
↓  
User practices with flashcards, quizzes, and streak tracking  

---

## Features

| Feature | Description |
|---|---|
| Object Scanning | Users scan real-world objects to learn vocabulary |
| AI Vision | Uses Gemini Vision to identify objects from images |
| Translation | Returns English, Tamil, and transliteration |
| Word Bank | Saves vocabulary words for later review |
| Flashcards | Lets users practice saved words |
| Quizzes | Tests users on vocabulary knowledge |
| Streaks | Tracks daily learning consistency |
| Achievements | Rewards progress and learning milestones |
| Stats | Shows scan count, quiz count, accuracy, and progress |
| Auth | User registration, login, JWT auth, and profile management |

---

## AI Workflow

| Component | Details |
|---|---|
| Vision Model | Gemini Vision |
| Input | Uploaded object image |
| Output | Object name, Tamil translation, transliteration |
| Backend | Flask API |
| Frontend | Next.js / React |
| Use Case | Interactive language learning through real-world objects |

The goal is to make language learning feel less like memorizing a list and more like exploring the world around you.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | Flask, Python |
| Database | SQLAlchemy |
| Auth | JWT authentication |
| AI / Vision | Gemini Vision API |
| Learning Tools | Flashcards, quizzes, streaks, achievements |
| API Communication | REST APIs |

---

## System Architecture

Next.js + React Frontend  
↓  
Image Upload / API Request  
↓  
Flask Backend  
↓  
Gemini Vision Object Identification  
↓  
Translation + Transliteration Response  
↓  
SQLAlchemy Database  
↓  
Word Bank / Flashcards / Quizzes / Stats  

---

## Database Modules

| Module | Purpose |
|---|---|
| Users | Stores account and profile information |
| Saved Words | Stores user vocabulary words |
| Flashcards | Tracks review history and progress |
| Quizzes | Tracks quiz activity and accuracy |
| Streaks | Stores current and longest streaks |
| Achievements | Stores unlocked learning milestones |
| Stats | Tracks scans, quizzes, and weekly progress |

---

## API Features

| Feature | Description |
|---|---|
| Auth | Register, login, refresh token, logout, profile update |
| Scan | Upload image and identify object |
| Word Bank | Add, view, and delete saved words |
| Flashcards | Fetch due words and submit review results |
| Quizzes | Track quiz activity and learning progress |
| Stats | Return streaks, totals, accuracy, and weekly progress |
| Activity | Log scans and quizzes for streak tracking |

---

## Key Learning Features

### Scan & Learn

Users scan real-world objects and instantly receive:

- English object name
- Tamil translation
- Transliteration
- Optional saved word entry
- Vocabulary practice connection

---

### Personal Word Bank

Users can save words they want to review later.

The word bank supports:

- Default vocabulary
- User-added words
- Saved scan results
- Flashcard and quiz integration

---

### Flashcards and Quizzes

Tamil Lens turns saved words into practice activities.

Users can:

- Review vocabulary with flashcards
- Take quizzes
- Track correct answers
- Build review history
- Improve retention through repeated practice

---

### Streaks and Achievements

The app includes gamified progress tracking.

It tracks:

- Current streak
- Longest streak
- Total scans
- Total quizzes
- Weekly progress
- Achievement unlocks

---

## Getting Started

### Prerequisites

- Node.js
- Python 3.8+
- Git
- Gemini API key

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/psamin/tamil-lens2.0.git
cd tamil-lens2.0
