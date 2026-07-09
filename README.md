# Agenttrials

Isometric room editor and play experience with gatekeeper NPC negotiation, game saves, and leagues. Built with **Next.js 16** and **Firebase App Hosting**.

**Production:** https://trials--agenttrials-xo.us-east4.hosted.app  
**Firebase project:** `agenttrials-xo`

---

## Local development

```bash
npm install
cp .env.local.example .env.local   # fill in values
npm run dev
```

Open http://localhost:3000

---

## Admin setup (one-time)

Only needed for the account that runs `/admin/editor`, `/admin/leagues`, etc.

1. Copy your Firebase Auth UID from the Firebase Console (Authentication → Users) or from the app after sign-in.
2. Set in `.env.local` (local) and `apphosting.yaml` (production):

   ```
   NEXT_PUBLIC_ADMIN_UID=your_firebase_uid
   ```

3. In **Firestore**, create **one** of:
   - Document `config/app` with field `adminUid` = your UID (string), or
   - Document `admins/{your_uid}` (empty doc is fine)

4. Redeploy after changing `apphosting.yaml`.

Normal players never see admin UI or setup prompts.

---

## Leagues

- **Admin** creates leagues at `/admin/leagues` and gets a **join code** to share privately (Discord, email, etc.).
- **Players** go to `/leaderboard`, enter the invite code, and tap **Start new game for league** — a fresh save is created and linked automatically.
- Join codes are **not** shown on player-facing pages after join (only on the admin leagues screen).

---

## Deploy to production (manual)

Prerequisites:

- Firebase **Blaze** plan on `agenttrials-xo`
- Logged in: `npx -y firebase-tools@latest login`
- Project selected: `npx -y firebase-tools@latest use agenttrials-xo`

From the repo root:

```bash
npm run build                                    # optional sanity check
npx -y firebase-tools@latest deploy            # app + Firestore + Storage rules
```

Deploy only part of the stack:

```bash
npx -y firebase-tools@latest deploy --only apphosting
npx -y firebase-tools@latest deploy --only firestore
npx -y firebase-tools@latest deploy --only storage
```

Check rollout:

```bash
npx -y firebase-tools@latest apphosting:rollouts:list trials
```

### Gemini (gatekeeper AI)

```bash
npx -y firebase-tools@latest apphosting:secrets:set GEMINI_API_KEY
npx -y firebase-tools@latest apphosting:secrets:grantaccess GEMINI_API_KEY --backend trials
```

Uncomment the `GEMINI_API_KEY` secret block in `apphosting.yaml`, then redeploy.

### Storage CORS (tile uploads from production)

One-time, if not already done:

```bash
gsutil cors set storage.cors.json gs://agenttrials-xo.firebasestorage.app
```

---

## Firebase vs GCP — do you need a separate GCP setup?

**Short answer: no separate GCP project.** Firebase *is* Google Cloud. Project `agenttrials-xo` is one GCP project with Firebase services enabled.

| What you use | Where it lives | How you manage it |
|--------------|----------------|-------------------|
| Firestore (rooms, saves, leagues) | Firebase | Firebase Console, `firestore.rules`, `firebase deploy --only firestore` |
| Auth (X / Twitter sign-in) | Firebase | Firebase Console → Authentication |
| Storage (tile textures) | Firebase Storage (GCS bucket) | `storage.rules`, optional CORS via `gsutil` |
| Next.js app (SSR, API routes) | **Firebase App Hosting** (Cloud Run under the hood) | `apphosting.yaml`, `firebase deploy --only apphosting` |
| Secrets (`GEMINI_API_KEY`) | Secret Manager (GCP) | `firebase apphosting:secrets:*` — no manual GCP console required |
| Server Admin SDK in production | Default App Hosting service account | Automatic — no `FIREBASE_SERVICE_ACCOUNT_JSON` in prod |

You do **not** need to enable a pile of random GCP APIs in the console for the core game. Blaze + Firebase CLI deploy is enough for:

- App Hosting
- Firestore reads/writes (rules-controlled)
- Negotiate API (Gemini via secret)
- Leagues and leaderboards

### When you *might* touch GCP directly

- **Secret Manager** — only if you prefer the GCP Console over `firebase apphosting:secrets:set` (same secrets either way).
- **Cloud Storage CORS** — `gsutil cors set` for browser tile uploads (one command).
- **Agent wallets (Turnkey)** — optional feature; bootstrap uses GCP Secret Manager for Turnkey keys (`GCP_PROJECT_ID=agenttrials-xo`). Skip entirely if you are not using `/admin/wallets`.

### Local dev vs production credentials

| Variable | Local | Production |
|----------|-------|------------|
| `NEXT_PUBLIC_FIREBASE_*` | `.env.local` | `apphosting.yaml` |
| `GEMINI_API_KEY` | `.env.local` | App Hosting secret |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Optional, only if Admin SDK errors locally | **Omit** — Cloud Run uses built-in credentials |

---

## Environment reference

See `.env.local.example` for all variables. Never commit `.env.local`.

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local dev server |
| `npm run build` | Production build check |
| `npm run start` | Run production build locally |
| `npm run lint` | ESLint |
