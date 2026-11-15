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

## Testing

```bash
# Pure unit tests (plan date math, identity invariant, plan normalization):
cd backend && npm run test:unit

# Wallet verification suite (14 automated tests, in-memory mock):
cd backend && npm run test:wallet

# Full test suite:
cd backend && npm test
```

## Production Deployment & CI/CD

For comprehensive deployment instructions, AWS architecture, OIDC setup, IAM policies, and operations runbook, see:

📖 **[DEPLOYMENT.md](DEPLOYMENT.md)**

- **CI Workflow**: `.github/workflows/ci.yml` (runs on push/PR to main: frontend build, unit tests, integration tests, wallet suite)
- **CD Workflow**: `.github/workflows/deploy.yml` (automated OIDC deployment to AWS S3, CloudFront, and EC2 via SSM)
- **Deployment Scripts**: `deploy/` (`ec2-bootstrap.sh`, `deploy-backend.sh`, `rollback.sh`, `nginx.conf`, `ecosystem.config.js`)

