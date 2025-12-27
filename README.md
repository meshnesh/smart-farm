# SmartFarm Dashboard UI (Next.js)

UI-only dashboard scaffold (mobile-first) with:
- Farm selection
- Dashboard with KPI cards + charts
- Sensors list + sensor details
- Workers list
- Profile page
- Responsive sidebar (desktop) + bottom nav (mobile)

## Run locally
```bash
npm install
npm run dev
```

Open http://localhost:3000

## Firebase / Firestore hookup
This project includes a `firebaseClient.ts` file and example read functions.
Set env vars in `.env.local`:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

For now the UI uses mock data by default. Flip `USE_FIRESTORE=true` in `.env.local` to attempt Firestore reads:

```bash
USE_FIRESTORE=true
```

## Deploy
- Push to GitHub
- Import into Vercel
- Add the env vars above
- Deploy
