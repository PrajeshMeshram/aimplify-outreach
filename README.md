# AImplify Outreach Agent

AI-powered B2B outreach system. Finds verified marketing contacts, writes personalised emails, tracks follow-ups in Google Sheets.

## How it works

### Research agent
1. Reads your Google Sheet to get all already-contacted companies
2. Sends filtered prompt to Claude (stage, geo, industry, role hierarchy)
3. Role hierarchy: Head of Marketing → VP Marketing → Director → CMO → CEO
4. Returns verified prospects with personalised email copy

### Observer agent
1. Takes each prospect from research agent
2. Verifies current employment via Claude knowledge check
3. Corrects email format if needed
4. Flags unverified contacts — they are skipped entirely

### Email agent
1. Takes verified contacts only
2. Saves to Google Sheet with today's date in "1st Email Sent"
3. Follow-up system: Day 3 = Follow-up 1, Day 7 = Follow-up 2

## API cost per run
- Research: ~$0.02–0.04 per run (Sonnet 4.6)
- Verification: ~$0.003 per contact
- 5 prospects = ~$0.04 total per run

## Setup

### 1. Clone and install
```bash
git clone https://github.com/YOUR_USERNAME/aimplify-outreach
cd aimplify-outreach
npm install
```

### 2. Google Sheets setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project → Enable Google Sheets API
3. Create a Service Account → Download JSON key
4. Share your Google Sheet with the service account email

### 3. Environment variables
Copy `.env.example` to `.env.local` and fill in:
```
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
GOOGLE_SHEET_ID=your_sheet_id_here
```

### 4. Run locally
```bash
npm run dev
```

### 5. Deploy to Vercel
```bash
npx vercel --prod
```
Add all env vars in Vercel dashboard → Settings → Environment Variables.

## Google Sheet structure
| Company Name | Contact Name | Email | Role | Stage | Country | 1st Email | 2nd Followup | 3rd Followup | Status | Notes |

## If selling this product
- Add auth (NextAuth.js)
- Add per-user Google Sheet config
- Add Apollo.io API for live verified emails
- Price: $99–299/month per seat
