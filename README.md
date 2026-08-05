# FIT-ARC-GYM - AI-Powered Fitness Platform

A premium full-stack MERN application for personalized fitness, biomechanics AI coaching, diet tracking, and workout generation.

## Project Architecture

```
project/
├── frontend/             # React + Vite Client
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
├── backend/              # Node.js + Express + MongoDB Server
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middlewares/
│   ├── services/
│   ├── config/
│   ├── utils/
│   ├── validators/
│   ├── server.js
│   └── package.json
├── README.md
└── .gitignore
```

## Setup & Running Locally

### Backend
1. `cd backend`
2. `npm install`
3. `npm run dev` (Runs on `http://localhost:5001`)

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev` (Runs on `http://localhost:5173`)
