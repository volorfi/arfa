# Production smoke test — arfa.global

Run this checklist against **arfa.global** (the live Railway deploy) after every
material deploy to the auth / billing / Prisma schema surfaces.

The goal is to prove the end-to-end flow works:

> signup → Stripe Checkout → webhook fires → Prisma Subscription updated
> → dashboard shows PREMIUM badge

A failure in any step usually points at the specific bug listed in
"Troubleshooting" at the bottom. Work through the steps in order.

---

## Pre-flight — environment

These verifications are faster to do once up front than after a failed flow.

**0.1 Env vars set on Railway.** Hit the debug endpoint:

```bash
# ADMIN_KEY is a random string you set yourself in Railway env vars.
curl -s https://arfa.global/api/debug/env -H "x-admin-key: $ADMIN_KEY" | jq
```

Expect `status: "ok"` and every value in `env` set to `true` except the
optional `DIRECT_URL`. If any are `false`, set them in Railway → Service
→ Variables and **redeploy** before continuing.

- [ ] `NEXT_PUBLIC_APP_URL` is `https://arfa.global`
- [ ] `NEXT_PUBLIC_APP_NAME` is `ARFA`
- [ ] `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY` set
- [ ] `DATABASE_URL` set (Railway internal Postgres URL, not external)
- [ ] `STRIPE_SECRET_KEY` (live mode, `sk_live_…`)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (matching live publishable)
- [ ] `STRIPE_WEBHOOK_SECRET` matches the **prod** endpoint secret (not the CLI)
- [ ] All 4 `STRIPE_*_PRICE_ID` values set to real live-mode price IDs

**0.2 Supabase Auth config.** In Supabase → Authentication → URL Configuration:

- [ ] **Site URL**: `https://arfa.global`
- [ ] **Redirect URLs** include `https://arfa.global/auth/callback`

**0.3 Stripe Dashboard config.** In Stripe → Developers → Webhooks:

- [ ] Endpoint `https://arfa.global/api/stripe/webhook` exists
- [ ] Events subscribed: `checkout.session.completed`,
      `customer.subscription.updated`, `customer.subscription.deleted`
- [ ] The **Signing secret** shown in the dashboard matches what's in
      Railway as `STRIPE_WEBHOOK_SECRET` (copy fresh — **not** the
      `stripe listen` CLI secret)

**0.4 Prisma migrations applied.** Railway logs from the latest deploy should
include one of:

- `All migrations have been successfully applied.` (first deploy)
- `No pending migrations to apply.` (every subsequent deploy)

If the logs show `Database already contains tables` errors on a fresh DB
that was seeded via `prisma db push` / `generate`, baseline the
migration once:

```bash
# Run from a shell that has DATABASE_URL pointing at prod.
pnpm exec prisma migrate resolve --applied 20260424000000_init
```

**0.5 Health check.** `https://arfa.global/api/health` returns 200 with
`{ status: "ok", timestamp, commit }`.

---

## Step 1 — Auth flow

- [ ] Open `https://arfa.global/register`
- [ ] Enter a fresh email (e.g. `smoke-test+<timestamp>@<your-domain>`)
      + password
- [ ] Submit → redirected to `/dashboard` (or `/login` with a "check your email"
      message if email confirmation is enabled in Supabase)
- [ ] If email confirmation enabled: verify email received from Supabase and
      confirmation link points at `https://arfa.global/auth/callback?...`
- [ ] After clicking the confirmation link you land on `/dashboard`
- [ ] `https://arfa.global/dashboard/settings` shows the **FREE** plan badge
- [ ] **Supabase Dashboard** → Authentication → Users: new user row exists
- [ ] **Supabase Dashboard** → Table Editor → `users` table: Prisma row for
      the new user exists (linked via `supabase_id`)
- [ ] **Supabase Dashboard** → `subscriptions` table: row with
      `plan = FREE`, `status = ACTIVE` exists for the user

---

## Step 2 — Stripe Checkout

Use a fresh browser profile / incognito so you're logged in only as the
test user.

- [ ] On `https://arfa.global/pricing`, click **Upgrade to Premium**
- [ ] Stripe Checkout page loads showing "Premium" + the correct monthly
      price ($39)
- [ ] Enter test card: `4242 4242 4242 4242`, any future expiry, any CVC,
      any ZIP/postcode
- [ ] Complete payment
- [ ] Redirected back to `https://arfa.global/dashboard?upgrade=success`
- [ ] Green success banner reading "🎉 Welcome to ARFA Premium!" appears
- [ ] Banner auto-dismisses after 5 seconds; the `?upgrade=success` query
      param disappears from the URL
- [ ] **Stripe Dashboard** → Developers → Webhooks → endpoint details:
      `checkout.session.completed` delivery status is **Succeeded** (200)
      — not Failed, not Pending retry
- [ ] **Supabase Dashboard** → `subscriptions` table: row now shows
      `plan = PREMIUM`, `status = ACTIVE`, `stripe_subscription_id`
      populated, `current_period_end` in the future,
      `stripe_price_id` matches your Premium monthly price ID
- [ ] `https://arfa.global/dashboard/settings` now shows the **PREMIUM**
      plan badge
- [ ] Gated Premium features unlocked:
  - [ ] `/dashboard/screener` → advanced screener filters are enabled
        (no lock icon on "Individual factors")
  - [ ] `/dashboard/portfolio` → no paywall; add-holding form visible
  - [ ] `/dashboard/alerts` → create-alert form visible
  - [ ] `/dashboard/asset/aapl` → Valuation Lab section renders without
        the UpgradeGate overlay

---

## Step 3 — Stripe Billing Portal

- [ ] On `/dashboard/settings` click **Manage subscription**
- [ ] Stripe Billing Portal opens, showing the Premium subscription
- [ ] Click **Cancel subscription** → choose "Cancel at period end" or
      "Cancel immediately" (pick immediate to speed the test)
- [ ] Return to `arfa.global/dashboard/settings` (portal link or manual nav)
- [ ] **Stripe Dashboard** → Webhooks: `customer.subscription.deleted`
      (or `customer.subscription.updated` with status=canceled for
      "cancel at period end") delivered 200
- [ ] **Supabase Dashboard** → `subscriptions` table: row shows
      `plan = FREE`, `status = CANCELED`, `stripe_subscription_id = NULL`
- [ ] `/dashboard/settings` now shows the **FREE** plan badge again
- [ ] Gated features once again show the UpgradeGate paywall

---

## Results

Fill in after running:

| Step | Result | Notes |
|---|---|---|
| 0. Pre-flight env vars | ☐ pass ☐ fail | |
| 0. Pre-flight Supabase URLs | ☐ pass ☐ fail | |
| 0. Pre-flight Stripe webhook | ☐ pass ☐ fail | |
| 0. Prisma migrations | ☐ pass ☐ fail | |
| 0. Health check | ☐ pass ☐ fail | |
| 1. Auth flow | ☐ pass ☐ fail | |
| 2. Stripe Checkout → Premium | ☐ pass ☐ fail | |
| 3. Billing Portal → FREE | ☐ pass ☐ fail | |

Commit your results into this file and mention any fixes in the commit
message.

---

## Troubleshooting

### The webhook shows "Failed: signature verification" in Stripe Dashboard

Almost always means `STRIPE_WEBHOOK_SECRET` on Railway doesn't match the
signing secret Stripe generated for the `arfa.global/api/stripe/webhook`
endpoint specifically. Common gotchas:

- You pasted the secret from `stripe listen --forward-to …` (the local CLI
  secret) into the Railway variable. Copy instead from **Stripe Dashboard
  → Webhooks → your prod endpoint → Signing secret → Reveal**.
- You set the secret on a different Stripe project (test mode vs. live mode
  have different secrets). Make sure the dashboard is toggled to **Live**.
- Secret has a trailing newline. Re-paste with care.

Fix: update `STRIPE_WEBHOOK_SECRET` in Railway → **redeploy** (env var
changes require a redeploy to take effect).

### The webhook returns 200 but Prisma doesn't update

Check the webhook POST body's `metadata.userId`. If it's missing, the
handler falls back to locating the row by Stripe customer id. That means
the user's `stripe_customer_id` must already be on the Subscription row —
which only happens after a successful first Checkout call created the
customer. For a brand-new account, retry the flow; for an edge case
where metadata vanished, the handler also falls back to subscription id.

Inspect the handler logs in Railway for lines starting `[stripe/webhook]`.

### The dashboard still shows FREE after a successful webhook

`revalidatePath('/dashboard')` is called inside the handler, but the
browser's in-memory cache may still hold the old render. Expected
mitigations:

- A full-page refresh (Cmd-R) always loads fresh.
- The `useUser` hook refetches on Supabase auth events and on a manual
  `refresh()` call.

If a hard refresh still shows FREE:

1. Check Supabase `subscriptions` table directly — did Prisma actually
   update?
2. If yes, `fetch('/api/me').then(r => r.json())` in the browser console —
   do you see `plan: "PREMIUM"`?
3. If yes but UI still says FREE, the issue is client-side — look for
   stale state in `useUser` or a component reading from an older source.

### Redirect URL mismatch error after signup

Supabase → Authentication → URL Configuration → Redirect URLs needs to
include `https://arfa.global/auth/callback`. Subdomain mismatches
(`www.arfa.global`, `app.arfa.global`) count as separate URLs.

### "No pending migrations" but the schema is out of date

If you've added a new field in `prisma/schema.prisma` without creating a
new migration folder, `prisma migrate deploy` won't pick it up. Run
locally:

```bash
pnpm exec prisma migrate dev --name <short_description>
```

Commit the generated migration folder and redeploy.

### `DATABASE_URL` on Railway

Prefer the **internal** Postgres URL (Railway → your Postgres service →
Connect → Postgres Connection URL, the one hostname-suffixed with
`railway.internal`). Internal URLs have zero egress cost and lower
latency. External URLs work but are rate-limited and charge egress.
