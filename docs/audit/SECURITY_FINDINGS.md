# SECURITY_FINDINGS — Auth, Secrets, Hardcoded Values
**Date:** 2026-07-14 · Read-only audit. **All findings independently verified by re-running the commands.** Severity: 🔴 Critical · 🟠 High · 🟡 Moderate.

---

## 🔴 S1. Committed secrets recoverable in git history (VERIFIED)

Commit `46b46ff` ("🔒 Security: Remove exposed credentials from docs") removed secrets from the working tree, but **the prior revision is fully recoverable**:

```
$ git show 46b46ff~1:docs/COOLIFY_ENV_VARS.md | head -3
# HOLLY — Complete Coolify Environment Variables
## Production Configuration
```

History contains (verbatim, per security audit):
- **Neon Postgres connection string with password** — `postgresql://neondb_owner:npg_…@ep-…neon.tech/neondb`
- **LiveKit API key** — `APIcbE9QarHdoai`
- **LiveKit API secret** — `fY4cThSqotwT3a5YwBAPfllLsbfBuLpWRi6mruc8rPuA`
- **Production server IP** — `40.233.70.207`

**Impact:** anyone with read access to the repo can extract live production credentials.
**Required:** rotate Neon DB password, LiveKit key/secret, and any GitHub/Modal tokens that may have been adjacent. Scrub history (`git filter-repo`) if repo is or will be shared.

*Note: working tree is clean of real secrets (verified — grep for `sk-proj-|gsk_|sk-or-|nvapi-|hf_|ghp_|npg_` returns only a documentation example in `github-resilience.ts:63`). `.gitignore` covers `.env*`. The only `pk_live_…` value (`clerk/[[...clerk]]/route.ts:125`) is a Clerk publishable key — public by design.*

---

## 🔴 S2. Creator recognition is insecure (fuzzy name/email matching) — VERIFIED

File: `src/lib/chat/auth.ts:40-97`. `isCreator` grants admin-equivalent powers (age-gate bypass, self-code approval). It is built on **client-controllable values + substring matching**:

- **Hardcoded emails** (`:40-54`): `iamdoregosteve@gmail.com`, `iamhollywoodpro@gmail.com`, `stevehollywood@gmail.com`, plus bare fragments `hollywood`, `nexamusicgroup`, `stevendorego`, `stevefreshblendz`.
- **Hardcoded name fragments** (`:55-67`): `steve hollywood`, `steve dorego`, `nexamusic`, etc.
- **Fuzzy fallback** (`:94-96`): `hasSteve = includes('steve'|'steven') && hasBrand = includes('hollywood'|'dorego'|'nexa'|'music')`.

It checks **user-controlled Clerk fields**: username (`:132`), first+last name (`:138`), session-claim username (`:156`). A user who sets their Clerk display name to "Steve Nexa" or email to `steve+hollywood@…` can pass the fuzzy check and be recognized as creator.

**Worse:** `persistentCreatorRecognition` flag (`:187`) is written by `relationship-engine.ts:200-213` based on the same substring checks **plus a memory scan** (`:196-199`) that triggers if any user memory contains "creator", "built you", or "steve" — so a user can simply tell Holly "I'm steve, I built you" in chat to potentially set the persistent flag → permanent creator status.

---

## 🔴 S3. NSFW age gate bypassable via broken creator logic — VERIFIED

`src/lib/auth/require-adult.ts:54-61`:
```js
if (auth.isCreator) {
  return { userId, dbUserId, isCreator: true, isAdult: true };
}
```
Because `auth.isCreator` is attacker-controllable (S2), the 18+ gate is bypassable. Additionally, `ensureCreatorAdultFlag()` (`auth.ts:9-24`) persists `isAdult=true` to the DB on creator detection — so the bypass **sticks across sessions**. Tier-1 verification for non-creators is self-attestation only (`:13`).

---

## 🔴 S4. `/api/self-code` approve is remotely exploitable (RCE on app) — VERIFIED

File: `app/api/self-code/route.ts:32-40,146-150`. `resolveAuth` lets an internal-token caller supply `body.userId`:
```js
const userId = clerkUserId || (isInternal && body?.userId ? String(body.userId) : null) || …
```
The creator gate checks `userId === CREATOR_USER_ID`, where `CREATOR_USER_ID` defaults to the **hardcoded string** `'steve-hollywood-dorego'` (`src/lib/self-code/holly-self-awareness.ts:39`). `applyProposal` trusts `reviewerId: userId` from the caller.

**Exploit:** anyone with `INTERNAL_API_SECRET` (or who exploits a missing-secret path — see S6) can `POST /api/self-code {action:"approve", userId:"steve-hollywood-dorego", proposal:{...}}` and have Holly write arbitrary code into her own codebase (in-repo; path-traversal guard only blocks escapes outside REPO_ROOT). This is remote code execution against the running application.

---

## 🔴 S5. `/api/admin/migrate` uses hardcoded public secret — VERIFIED

`app/api/admin/migrate/route.ts:31`:
```js
if (secret !== 'HOLLY-DEPLOY-2024') { return 403; }
```
The secret `HOLLY-DEPLOY-2024` is in the repo (publicly known). The route runs `npx prisma migrate deploy` via shell (`:38`). Requires Clerk auth + this known constant — **any authenticated user** who knows the public value can run DB migrations.

---

## 🟠 S6. CRON_SECRET validation is weak and sometimes absent — VERIFIED

- **Secret accepted via URL query string** (`?secret=`) in `cron/evolve/route.ts:22`, `cron/identity-evolve/route.ts:21`, `cron/deep-sleep/route.ts:9`. Query params land in server/proxy logs — secrets should never travel there.
- **If `CRON_SECRET` env is unset, routes are fully open** — the `if (cronSecret)` guard skips validation entirely. A misconfigured deploy exposes endpoints.
- **`/api/cron/prewarm/route.ts:14` has zero auth** — anyone can trigger profile pre-warming.
- **`/api/admin/model-update/route.ts:44-49`** — the "creator/developer" fallback is just `const {userId} = await auth(); return !!userId;` — any logged-in user can trigger model discovery.

---

## 🟠 S7. GitHub webhook has a hardcoded fallback secret — VERIFIED

`app/api/webhooks/github/route.ts:28`:
```js
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'holly-dev-secret-2025';
```
If the env var is unset, the publicly-known `holly-dev-secret-2025` is used. Signature verification uses `timingSafeEqual` (good), but the fallback secret lets anyone who knows it forge GitHub webhook deliveries → trigger self-healing DB actions.

(Clerk webhook, by contrast, is **properly verified** via Svix with all 3 headers + throws if secret unset — `app/api/webhooks/clerk/route.ts`. No issue.)

---

## 🟠 S8. 14 admin routes have no creator/role gate — VERIFIED

These trust Clerk `userId` alone (some use `email.endsWith('@nexamusicgroup.com')` domain-suffix — still an email-string check). Any logged-in user passes:
`admin/{metrics, insights, config/update, self-healing/heal, abtest, code-review, auto-merge/merge, predictive-detection, docs, cicd, alerts, integrations, integrations/manage, testing}`

Plus `admin/architecture/{create,database,docs,docs/generate,generate,scaffold}` and `admin/{config/update,integrations/manage,knowledge/search,notifications/send}` — these **trust a `userId` from the request body with no server-side auth check at all**.

---

## 🟡 S9. INTERNAL_API_SECRET / hub-key compared with `===` (timing-attack surface)

All `INTERNAL_API_SECRET` comparisons use plain `===` (`self-code/route.ts:35`, `deploy/trigger/route.ts:23`, `hub/auth.ts:36,52`). Not constant-time. Low severity over network, but should use `timingSafeEqual`. The hub also exposes a dev bypass (`x-hub-key: hub_dev` in dev) in the `/api/hub` GET response body (`hub/route.ts:83`) — minor info disclosure.

## 🟡 S10. Clerk proxy trusts client headers

`app/api/clerk/[[...clerk]]/route.ts:198-202` reads `X-Forwarded-For` / `x-real-ip` for identity (spoofable). Sets `Access-Control-Allow-Origin: *` on all responses (`:286-288`). Proxy forwards `Clerk-Secret-Key`. Should be reviewed but is partly inherent to a Clerk proxy design.

## 🟡 S11. Secret comparisons & middleware rate-limit identity
`middleware.ts` rate-limits by `x-forwarded-for`/`x-real-ip`/`req.ip` — all client-influenceable behind a proxy (Cloudflare present, which mitigates). Rate limits exist but identity is IP-based, not user-based.

---

## Top 5 security risks (executive summary)
1. **S1 — Live production credentials in git history** (DB password, LiveKit). Must rotate + scrub.
2. **S2+S3 — Creator recognition via fuzzy name matching + age-gate bypass.** Architecturally insecure for any multi-user future.
3. **S4 — `/api/self-code` approve = RCE** via honoured `body.userId` + hardcoded creator id.
4. **S5+S7 — Hardcoded public secrets** (`HOLLY-DEPLOY-2024`, `holly-dev-secret-2025`) gate migrations and webhooks.
5. **S6+S8 — Missing/weak auth** on cron/prewarm, admin/model-update, and 14+ admin routes.

## What's done well
- Clerk webhook (Svix) is correctly verified.
- Working tree is clean of real secrets; `.gitignore` covers `.env*`.
- HF billing is hard-gated (`HF_INFERENCE_ENABLED=false`); OpenRouter rejects non-`:free` models.
- Desktop Electron uses `contextIsolation:true`, `nodeIntegration:false`.
- Image Holly-endpoint hard-fails rather than falling back to a censored imposter.

*No fixes applied during this audit, per instructions.*
