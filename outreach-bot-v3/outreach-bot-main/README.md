# GET Logistics LLC — AI Outreach Bot

> A full-stack automated email outreach platform built for **GET Logistics LLC**, a freight brokerage business. The bot uses Claude AI to generate personalized cold emails, sends them via a verified business domain, tracks replies automatically, and manages follow-ups — all from a clean, professional web dashboard.

**Live Demo:** [outreach-bot-one.vercel.app](https://outreach-bot-one.vercel.app)

---

## Features

- **AI-Powered Email Generation** — Uses Anthropic's Claude AI to write unique, personalized cold emails for every contact based on their name, company, location, and industry
- **Automated Campaign Sending** — Upload an Excel contact list and send batches of 10–100 emails per day with one click
- **Smart Duplicate Prevention** — Automatically skips contacts who have already been emailed when uploading new lists
- **Automatic Reply Detection** — Connects to Gmail API and scans for replies every hour, automatically marking contacts as replied in the dashboard
- **Auto Follow-ups** — Scheduled cron job sends follow-up emails to non-responders after 3 days
- **Contact Tracker** — Full dashboard to track every contact, their reply status, follow-up status, location, and industry
- **Professional Email Delivery** — Sends from a verified business domain (`erick@getlogistics.llc`) via Resend for high deliverability
- **Secure Authentication** — JWT-based login system with bcrypt password hashing
- **Persistent Storage** — MongoDB Atlas database ensures all contact data and campaign history is never lost

---

## Tech Stack

### Frontend

- **React** (Vite) — Component-based UI
- **Custom CSS** — Dark professional dashboard theme with DM Sans & DM Mono fonts
- **Deployed on Vercel**

### Backend

- **Node.js + Express** — REST API server
- **MongoDB Atlas + Mongoose** — Cloud database for persistent contact and user storage
- **JWT + bcryptjs** — Authentication and password security
- **node-cron** — Scheduled jobs for follow-ups and reply detection
- **Deployed on Railway**

### Integrations

- **Anthropic Claude AI** (`claude-haiku`) — Personalized email generation
- **Resend** — Transactional email delivery via verified domain
- **Gmail API (OAuth2)** — Automatic inbox scanning for reply detection
- **Google Cloud** — OAuth2 credentials for Gmail access

---

## Architecture

```
outreach-bot/
├── client/                  # React frontend (Vite)
│   └── src/
│       └── App.jsx          # Full dashboard UI (Dashboard, Compose, Campaigns, Contacts)
│
└── server/                  # Node.js/Express backend
    ├── controllers/
    │   ├── aiController.js          # Claude AI message generation
    │   ├── automationController.js  # Excel parsing, batch sending, contact tracking
    │   ├── authController.js        # User registration and login
    │   └── emailController.js       # Single email sending via Resend
    ├── jobs/
    │   ├── followUpJob.js           # Daily 9am follow-up cron job
    │   └── replyDetectionJob.js     # Hourly Gmail inbox scanner
    ├── middleware/
    │   └── authMiddleware.js        # JWT verification
    ├── models/
    │   ├── Contact.js               # MongoDB contact schema
    │   └── User.js                  # MongoDB user schema
    ├── routes/
    │   ├── ai.js
    │   ├── auth.js
    │   ├── automation.js
    │   ├── email.js
    │   └── gmail.js                 # Gmail OAuth flow
    └── index.js                     # Express server entry point
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- MongoDB Atlas account (free tier)
- Anthropic API key
- Resend account + verified domain
- Google Cloud project with Gmail API enabled

### Installation

```bash
# Clone the repository
git clone https://github.com/yslchino/outreach-bot.git
cd outreach-bot

# Install backend dependencies
npm install

# Install frontend dependencies
cd client && npm install && cd ..
```

### Environment Variables

Create a `.env` file in the root directory:

```env
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/outreach-bot
ANTHROPIC_API_KEY=your_anthropic_api_key
RESEND_API_KEY=your_resend_api_key
JWT_SECRET=your_jwt_secret
GMAIL_CLIENT_ID=your_google_client_id
GMAIL_CLIENT_SECRET=your_google_client_secret
GMAIL_REDIRECT_URI=http://localhost:5000/auth/gmail/callback
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token
```

### Running Locally

```bash
# Run backend (from root)
npm run dev

# Run frontend (from client/)
cd client && npm run dev
```

Backend runs on `http://localhost:5000`  
Frontend runs on `http://localhost:5173`

---

## Deployment

### Backend → Railway

1. Push to GitHub
2. Connect repo to [Railway](https://railway.app)
3. Add all environment variables in Railway Variables
4. Railway auto-deploys on every push to `main`

### Frontend → Vercel

1. Connect repo to [Vercel](https://vercel.com)
2. Set root directory to `client`
3. Vercel auto-deploys on every push to `main`

---

## Usage

### Sending a Campaign

1. Log in at the live URL
2. Go to **Campaigns** tab
3. Upload your Excel contact list (`.xlsx`)
4. The bot automatically skips already-contacted emails
5. Set your subject line, AI context, and batch size
6. Click **Launch Campaign** — Claude AI generates a unique email for every contact

### Excel Format

Your contact list should have these columns:
| Column | Description |
|--------|-------------|
| First Name | Contact first name |
| Last Name | Contact last name |
| Email Address | Contact email |
| Company Name | Company name |
| Job Title | Contact title |
| Person City | City |
| Person State | State |
| Primary Industry | Industry |

### Composing Individual Emails

1. Go to **Compose** tab
2. Enter recipient name, company, and optional context
3. Click **Generate with Claude AI**
4. Edit if needed, then send

### Tracking Replies

- The bot scans your Gmail inbox every hour
- Replies are automatically marked in the **Contacts** tab
- You can also manually mark contacts as replied

---

## Email Deliverability

- Emails are sent from a verified business domain via Resend
- DKIM, SPF, and DMARC records are configured
- HTML email format for better inbox placement
- Recommended sending limit: 25–50 emails/day to build domain reputation

---

## API Endpoints

| Method | Endpoint                       | Description                   |
| ------ | ------------------------------ | ----------------------------- |
| POST   | `/api/auth/register`           | Register a new user           |
| POST   | `/api/auth/login`              | Login and receive JWT         |
| POST   | `/api/ai/generate`             | Generate AI email message     |
| POST   | `/api/email/test`              | Send a single email           |
| POST   | `/api/automation/parse-excel`  | Upload and parse contact list |
| POST   | `/api/automation/send-all`     | Send batch campaign           |
| GET    | `/api/automation/contacts`     | Get all tracked contacts      |
| POST   | `/api/automation/mark-replied` | Mark a contact as replied     |
| GET    | `/auth/gmail`                  | Initiate Gmail OAuth flow     |
| GET    | `/auth/gmail/callback`         | Gmail OAuth callback          |

---

## Built By

**Erick Hernandez**  
GET Logistics LLC  
303-304-2894  
erick@getlogistics.llc

---

## License

This project is proprietary software built for GET Logistics LLC. Not licensed for redistribution.
