# Verdict: put your skincare on trial

**Live:** https://verdict-skincare.vercel.app · **Try it without an account:** https://verdict-skincare.vercel.app/demo

Verdict tells you whether a skincare product is actually working **before the store's return window closes**.

When a new product arrives, an agent reads its ingredient list and designs a short trial. It decides what should change, when the change should show, what could go wrong, and whether a fair read fits inside the return window. You scan your face on a schedule with **YouCam Skin AI**. Every change is measured against *your own* noise floor, and you get a verdict: **Keep**, **Ditch**, or **Not yet**. A Ditch comes with a ready-to-send return note.

Built for the YouCam API Skin AI & eCommerce VTO Hackathon (Skin AI track).

---

## The problem

- Most actives (niacinamide, retinoids, vitamin C, acids) take **4–12 weeks** to make a measurable change.
- A typical beauty return window is **30 days**.
- A single selfie swings more from light and angle than most products change your skin in a month.

So people judge products by feel, miss the return window, and keep paying for things that don't work. Retailers get vague "didn't work for me" returns with no data behind them.

## What Verdict does

| Moment | What happens | YouCam / logic used |
| --- | --- | --- |
| Product arrives | Paste the ingredient list. The **trial designer agent** finds the actives, predicts which metrics should move and from which day, flags purge windows and routine clashes, and fits the plan to the return deadline. If the full trial runs past the deadline, it adds a checkpoint scan. | `src/lib/agent/` |
| Day 0 | **Two baseline scans, a minute apart.** How much they disagree is your personal measurement noise. | YouCam Skin Analysis ×2 |
| Each scan | Guided capture: an oval guide, a ghost overlay of your baseline, and on-device **light and framing checks**, so bad photos never cost API units. Scored on 12 concerns (HD when the camera allows). | YouCam Skin Analysis (HD/SD) |
| Every day | 30-second log: sleep, stress, sun, cycle, new products. These become chart annotations, so a rough week isn't blamed on a product. | – |
| Verdict | The **verdict engine** compares recent scans to baseline in units of noise (z ≥ 2 counts), only after each active's onset day. It ignores breakouts inside a retinoid purge window, sets aside dim scans, and flags overlapping trials. | `src/lib/verdict.ts` |
| Decision | **Keep** gives you a reorder reminder. **Ditch** gives you a drafted return message plus ingredients to try next. **Not yet** lays out your options against the deadline. | – |

### Why this is a non-obvious use of Skin AI

Most Skin AI apps show a single score. Verdict treats the API as a **measurement instrument inside an experiment**:

- **Uses `raw_score`, not `ui_score`.** YouCam's docs say the UI score is adjusted to be encouraging, so before/after statistics run on the unadjusted raw score.
- **Measures its own error.** Two baseline captures give a per-user, per-metric noise estimate. A per-metric minimum keeps two lucky scans from making the test over-confident.
- **Knows dermatology timelines.** It won't call a retinal a failure on day 14, and it reads a purge flare as expected rather than as harm.
- **Is commerce-aware.** The whole plan is built around the retailer's return deadline.

## Screens

- `/`: landing page
- `/sign-in`, `/sign-up`: Clerk, or a demo-account note when Clerk keys are missing
- `/onboarding`: name, skin type, goals, how a trial works
- `/app`: Today (what's due, running trials, agent notes, settled trials)
- `/app/trials/new`: product, then the agent designing the trial (streamed reasoning), then plan review
- `/app/scan`: guided capture (camera or upload), quality checks, analysis
- `/app/scans/[id]`: 12 scores, change since last scan, photo or skin-map view, which trials the scan counted toward
- `/app/trials/[id]`: litmus strip, trial-vs-return-window timeline, per-metric charts with noise bands, onset and purge windows, confounders, agent notes
- `/app/trials/[id]/verdict`: the verdict, the evidence meters, what could skew it, and the keep or return actions
- `/app/shelf`: AM and PM routine, proven vs untested spend, clash detection
- `/app/log`: daily check-in plus three-week history
- `/app/settings`: profile, goals, connection status, data export

## Running it

```bash
npm install
cp .env.example .env.local   # all keys optional
npm run dev                  # http://localhost:3000
```

### Try it without a selfie

On the scan screen, **"Try a sample portrait"** runs a real YouCam Skin Analysis on one of YouCam's own sample photos (passed by URL with `src_file_url`, so nothing is uploaded). New accounts can also choose **"Explore with sample trials"** during onboarding, which loads a month of realistic trials, scans and logs into the account.

With **no keys at all**, the app runs as a seeded demo account: two live trials (one about to beat its return window, one mid-purge) and two settled trials. Scans give simulated readings. Every screen works.

### Turn on the real services

| Service | Env vars | What changes |
| --- | --- | --- |
| **YouCam API** | `YOUCAM_API_KEY` | Scans are scored by the YouCam Skin Analysis v2 API (`src/lib/youcam.ts`). |
| **Clerk** | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Sign-in and sign-up turn on. New users go through onboarding. `src/proxy.ts` and `src/lib/auth.ts` pick it up automatically. |
| **Neon** | `DATABASE_URL` | Data is saved to Postgres through Drizzle (`src/lib/data/db-store.ts`). |

Set up the Neon schema:

```bash
npm run db:push        # or: npm run db:migrate (uses ./drizzle)
```

Users are keyed by their Clerk user id, so there's no separate users or auth table to sync.

## Architecture

```
src/
  app/
    page.tsx                  landing
    onboarding/               first-run flow
    sign-in, sign-up/         Clerk (or demo note)
    app/                      the product (layout = side nav / mobile tab bar)
      actions.ts              server actions: preview/start/settle trial, check-ins, profile
    api/scans/route.ts        upload, YouCam analysis, store scores, agent reactions
    api/export/route.ts       download all your data as JSON
  lib/
    youcam.ts                 YouCam Skin Analysis v2 client (file, upload, task, poll)
    verdict.ts                verdict engine (noise floor, z-scores, purge logic, litmus strip)
    agent/actives.ts          knowledge base: 21 actives, onset/peak days, purge, clashes
    agent/designer.ts         trial designer agent: explainable step-by-step plan
    capture.ts                on-device light, evenness and framing checks; local photo storage
    data/                     Store interface, demo store (seeded), Neon store (Drizzle)
    auth.ts                   Clerk or demo-user seam
  db/schema.ts                Drizzle schema for Neon
  components/                 litmus strip, trend chart, face map, vial, evidence meter…
```

### YouCam integration (`src/lib/youcam.ts`)

1. `POST /s2s/v2.0/file`: register the image (falls back to `/file/skin-analysis` on older accounts)
2. `PUT` the bytes to the pre-signed URL
3. `POST /s2s/v2.0/task/skin-analysis` with all 12 concerns, `format: "json"` and `enable_mask_overlay`. HD concerns are used when the short side is ≥1080px; SD and HD are never mixed.
4. `GET /s2s/v2.0/task/skin-analysis/{task_id}` is polled until `success` or `error`.

Verified response shape (October 2026): each concern comes back as `{ type, ui_score, raw_score, mask_urls }`, plus `{ type: "all", score }`, `{ type: "skin_age", score }` and a `resize_image` entry. Mask URLs are pre-signed for two hours, so the app shows them only on fresh scans and stores the scores permanently.

Errors are translated into instructions the user can act on (face too small, more than one face, out of units). The capture screen enforces YouCam's guidance before upload: face filling 60–80% of the width, portrait framing, and the 2560px long-edge cap.

### Privacy

The photo goes to YouCam to be scored. A copy stays on the device for the before/after view. Our database stores **scores, not faces**.

## Useful scripts

```bash
npm run simulate     # run the seeded account through the verdict engine and print every trial
npm run typecheck
npm run lint
```

## Not medical advice

Verdict measures cosmetic skin changes. It is not a diagnostic tool. Persistent irritation or skin conditions need a dermatologist.
