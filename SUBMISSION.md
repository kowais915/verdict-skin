# Devpost submission kit

## Links
- Live app: https://verdict-skincare.vercel.app
- Try without an account: https://verdict-skincare.vercel.app/demo
- Code: https://github.com/kowais915/verdict-skin

## Testing instructions (paste into Devpost)
1. Open https://verdict-skincare.vercel.app/demo. No sign-up needed: you get a guest account with a month of sample trials already loaded. You can also sign up with Google or email; onboarding offers the same sample data.
2. Open **Calm Fix Serum** for the trial page (litmus strip, return-window timeline, noise-band charts), then **Open the verdict**.
3. Tap **Take a scan** and either use your camera or pick one of YouCam's sample portraits under "Try a sample portrait". Both run a real YouCam Skin Analysis (HD, 12 concerns).
4. Tap **Trials** then **New trial**, then **Fill in an example product**, then **Design my trial** to watch the agent plan a trial around the return window.

## Name
Verdict

## Tagline
Put your skincare on trial. Know if it's working before the return window closes.

## Track
Skin AI

## What it does (paste into "About the project")

**Inspiration.** The brief describes the exact moment we built for: *standing in front of a mirror deciding whether a product is working.* Nobody can answer that by looking. Most actives need 4–12 weeks to show a measurable change. A typical beauty return window is 30 days. A single selfie swings more from lighting than most serums change your skin in a month. So people guess, the window closes, and they keep paying for products that don't work.

**What it does.** Verdict turns every new skincare product into a small, honest experiment:

1. **The agent designs the trial.** Paste the ingredient list. The trial designer agent identifies the actives and predicts which skin metrics should move and from which day (niacinamide moves oil from about week 2; retinal moves texture from about week 3). It flags purge windows, finds clashes with the rest of your shelf, and fits the scan schedule to the retailer's return deadline. If a full read won't fit, it adds a checkpoint scan two days before the window closes.
2. **Two baseline scans measure your noise floor.** They're taken a minute apart, before the first use. How much YouCam's readings disagree between them is your personal measurement noise.
3. **Guided scans on schedule.** An oval guide and a ghost overlay of your baseline keep framing consistent. On-device checks for light and evenness catch bad photos before they cost API units. YouCam Skin AI scores 12 concerns per scan, in HD when the camera allows.
4. **A verdict with evidence.** A change counts only when it clears twice the noise, after the active's expected onset. Breakouts inside a retinoid purge window aren't counted against the product. Dim scans are set aside. Overlapping trials and logged confounders (period, sun, short sleep) are surfaced.
5. **Act on it.** Keep sets a reorder reminder. Ditch drafts the return message to the retailer and suggests ingredients with a different mechanism to try next.

**How we built it.** Next.js 16 (App Router, server actions), React 19, Tailwind 4, Clerk for auth, and Neon Postgres via Drizzle. It's mobile-first and installable as a PWA.
- *YouCam Skin Analysis API v2:* file → pre-signed upload → task → poll, with all 12 concerns, HD/SD chosen from the capture resolution, mask overlays enabled, and errors translated into instructions the user can act on.
- *Verdict engine:* per-metric noise estimate from paired baselines (with a per-metric floor), z-scores on **raw_score** (YouCam documents ui_score as adjusted to be encouraging, which would bias a before/after test), onset gating, purge handling, and a "litmus strip" showing what the verdict was at each scan.
- *Trial designer agent:* a knowledge base of 21 actives with onset and peak timelines, purge windows, irritation guards and clashes. It reasons step by step and shows its reasoning to the user.
- *Privacy:* photos go to YouCam for scoring and stay on the device. We store scores, not faces.

**Who it's for.** Skincare buyers spending $30–$80 per product who want to know whether it's working, and retailers and brands that want fewer blind returns and products backed by evidence. A retailer could offer a "Verdict-backed guarantee" and see which products actually move which concerns.

**Challenges.** Making a cosmetic score statistically honest. A naive before/after would call most products winners or losers by chance. The noise floor, onset gating and raw scores are what make a "Keep" mean something.

**What's next.** Mask-based zone analysis to tell purging (usual zones) from new breakouts. Retailer integrations that pull the purchase date and return policy automatically. Opt-in, anonymous product efficacy data across users.

## Built with
nextjs, react, typescript, tailwindcss, youcam-api, perfect-corp, clerk, neon, postgresql, drizzle-orm, vercel

## 3-minute demo video script

| Time | On screen | Voiceover |
| --- | --- | --- |
| 0:00–0:15 | Landing hero: the strip develops, "Returns close tomorrow", then **Keep.** | "You bought a $38 serum. Thirty days to return it. Is it working? You can't tell in a mirror. Verdict can." |
| 0:15–0:45 | New trial: paste ingredients, the agent's reasoning streams in, plan review with the checkpoint highlighted | "Paste the ingredient list. The trial agent knows niacinamide shifts oil from week two and redness from week three. It checks my shelf for clashes and sees that a full read takes 42 days, but returns close on day 27, so it adds a checkpoint." |
| 0:45–1:20 | Scan on a phone: oval guide, ghost overlay, light meter, analysis steps naming YouCam | "Two baseline scans, a minute apart. Their difference is my noise floor. Every scan after that lines up with a ghost of the first, the phone checks the light before uploading, and YouCam Skin AI scores twelve concerns." |
| 1:20–2:00 | Trial page: litmus strip, timeline against the return window, redness chart crossing the noise band, purge window on the retinal trial | "Here's day 26. The grey band is how much my readings wobble on their own. Redness and oil have cleared it. Pores haven't yet, which is expected this early. On my retinal trial, breakouts are up, but that's inside the purge window, so it doesn't count." |
| 2:00–2:40 | Verdict page: **Keep.**, evidence meters, confounders; then the Ditch example with the return note copied | "Verdict: keep, 84% confident, a day before the window closes. When something doesn't work, I get a return note with the numbers and a few ingredients to try instead." |
| 2:40–3:00 | Shelf: proven vs untested spend, then the landing page | "Built on the YouCam Skin Analysis API, using raw scores and a measured noise floor, so a 'keep' actually means something. Verdict: put your skincare on trial." |

Record it on a phone (the rules ask for footage on the target device), at 390px width or on an actual phone through a deployed URL.

## Screenshots to upload
1. Landing hero
2. Today dashboard
3. Agent designing a trial
4. Scan capture with meters
5. Trial page (strip, timeline, chart)
6. Verdict: Keep
7. Verdict: Ditch with the return note
8. Mobile views

## Submission checklist
- [x] Deployed on Vercel with YouCam, Clerk and Neon configured
- [x] Neon schema applied
- [x] Public GitHub repo with MIT license
- [x] Testing instructions with a no-signup demo link
- [ ] YouTube video (public, 1–3 minutes, no copyrighted music)
- [ ] Optional: share the video and tag @YouCam API for the 500-unit bonus
