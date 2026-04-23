# ARFA Markets — Migration & Deployment Guide
## Manus.im → Railway (+ optional AWS path)

---

## What changed in the codebase

| File | Was | Now |
|---|---|---|
| `server/_core/llm.ts` | `forge.manus.im` proxy | Google Gemini API directly |
| `server/_core/auth.ts` | *(new file)* | Google OAuth 2.0 |
| `server/_core/context.ts` | `sdk.authenticateRequest` | `auth.authenticateRequest` |
| `server/_core/index.ts` | `registerOAuthRoutes` | `registerAuthRoutes` |
| `server/_core/notification.ts` | Manus notification service | Resend email |
| `server/storage.ts` | Manus storage proxy | AWS S3 / Cloudflare R2 |
| `server/_core/env.ts` | Manus-named vars | Standard named vars |
| `client/src/const.ts` | Manus OAuth portal URL | `/api/auth/google` |
| `Dockerfile` | *(new)* | Production container |
| `railway.json` | *(new)* | Railway config |

---

## Step 1 — Google OAuth setup (15 min)

1. Go to https://console.cloud.google.com
2. Create a new project (or use existing)
3. **APIs & Services → OAuth consent screen**
   - User type: External
   - App name: ARFA Markets
   - Add scope: `email`, `profile`, `openid`
4. **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: Web application
   - Authorised redirect URIs: `https://arfa.markets/api/auth/google/callback`
   - Also add `http://localhost:3000/api/auth/google/callback` for local dev
5. Copy **Client ID** and **Client Secret** — you'll need them in Step 4

---

## Step 2 — Get API keys (10 min)

### Gemini API (replaces Manus LLM proxy)
1. Go to https://aistudio.google.com/apikey
2. Create API key → copy it
3. Free tier: 1500 requests/day. Paid: $0.075 per 1M input tokens

### Anthropic API (agent pipeline)
1. Go to https://console.anthropic.com/settings/keys
2. Create key → copy it

### Resend (contact form emails)
1. Go to https://resend.com → sign up (free: 3000 emails/month)
2. Add & verify your domain (arfa.markets)
3. Create API key → copy it

---

## Step 3 — Railway setup (20 min)

### 3a. Create project
1. Go to https://railway.app → New Project
2. Deploy from GitHub repo → select your repo
3. Railway will detect the Dockerfile automatically

### 3b. Add MySQL database
1. In your Railway project → **+ New** → **Database** → **MySQL**
2. Click the MySQL service → **Connect** tab
3. Copy the `DATABASE_URL` connection string (keep it safe)

### 3c. Migrate your database
```bash
# Install mysqldump locally if needed: brew install mysql-client
export MANUS_DB_URL="mysql://user:pass@manus-host:port/dbname"  # from Manus dashboard
export RAILWAY_DB_URL="mysql://user:pass@railway-host:port/railway"  # from step 3b

chmod +x scripts/migrate-db.sh
./scripts/migrate-db.sh

# Then run new schema migrations:
DATABASE_URL="$RAILWAY_DB_URL" pnpm db:push
```

### 3d. Set environment variables
In Railway → your app service → **Variables** tab, add all of these:

```
NODE_ENV               = production
PORT                   = 3000
APP_BASE_URL           = https://arfa.markets

JWT_SECRET             = <run: openssl rand -hex 32>

DATABASE_URL           = <from step 3b>

GOOGLE_CLIENT_ID       = <from step 1>
GOOGLE_CLIENT_SECRET   = <from step 1>

GEMINI_API_KEY         = <from step 2>
ANTHROPIC_API_KEY      = <from step 2>

RAPIDAPI_KEY           = <your existing key>

RESEND_API_KEY         = <from step 2>
OWNER_EMAIL            = you@arfa.markets
```

### 3e. Set custom domain
1. Railway app service → **Settings** → **Domains**
2. Add custom domain: `arfa.markets`
3. Railway gives you CNAME records → add them to your DNS registrar
4. SSL is automatic (Let's Encrypt)

### 3f. Deploy
```bash
git add .
git commit -m "migrate from manus to railway"
git push origin main
```
Railway auto-deploys on every push. Watch the build logs in the dashboard.

---

## Step 4 — Verify everything works

```bash
# Health check
curl https://arfa.markets/api/trpc/system.health

# Test auth flow
# 1. Open https://arfa.markets in browser
# 2. Click Log In → redirects to Google
# 3. Sign in → redirects back to / with session cookie set
# 4. Check user appears in /os/users (admin role check)

# Make yourself admin (first time)
# Connect to Railway MySQL and run:
# UPDATE users SET role = 'admin' WHERE email = 'you@arfa.markets';
```

---

## Local development after migration

```bash
# Copy the example env file
cp .env.example .env
# Fill in all values (use localhost redirect URI for Google OAuth)

# Install deps
pnpm install

# Start dev server (same as before)
pnpm dev
```

For local Google OAuth, you must have added `http://localhost:3000/api/auth/google/callback`
as an authorised redirect URI in Google Cloud Console (step 1).

---

## Optional: AWS path (instead of Railway)

Use this if you need enterprise compliance, VPC isolation, or expect high traffic.

### AWS services needed
| Service | Purpose | Cost estimate |
|---|---|---|
| ECS Fargate | Run the Docker container | ~$15-30/month |
| RDS MySQL t3.micro | Database | ~$15/month |
| ALB | Load balancer + SSL termination | ~$18/month |
| ACM | Free SSL certificate | Free |
| Route 53 | DNS | ~$0.50/month |
| ECR | Docker image registry | ~$1/month |
| **Total** | | **~$50-65/month** |

### AWS deployment (summary)
```bash
# 1. Build and push Docker image to ECR
aws ecr create-repository --repository-name arfa-markets
aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
docker build -t arfa-markets .
docker tag arfa-markets:latest <account>.dkr.ecr.<region>.amazonaws.com/arfa-markets:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/arfa-markets:latest

# 2. Create RDS MySQL instance (via AWS Console or Terraform)
# 3. Create ECS cluster + Fargate task definition pointing to your ECR image
# 4. Create ALB → target group → ECS service
# 5. Create ACM certificate for arfa.markets → attach to ALB
# 6. Route 53: A record → ALB DNS name
```

> Railway is recommended unless you have a specific reason for AWS.
> You can always migrate from Railway to AWS later — the Dockerfile is identical.

---

## Cloudflare R2 (cheaper storage alternative to S3)

R2 has no egress fees, making it significantly cheaper for a public-facing app.

1. Cloudflare dashboard → R2 → Create bucket: `arfa-assets`
2. Manage R2 API tokens → Create token with R2 read & write
3. Set in Railway env vars:
   ```
   S3_BUCKET    = arfa-assets
   S3_ENDPOINT  = https://<account_id>.r2.cloudflarestorage.com
   AWS_REGION   = auto
   AWS_ACCESS_KEY_ID     = <R2 token ID>
   AWS_SECRET_ACCESS_KEY = <R2 token secret>
   ```

---

## Making yourself admin after first deploy

The first user to sign in via Google will have role `user`.
Promote yourself to admin via Railway's MySQL console:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@arfa.markets';
```

Then log out and back in. You'll see **Research OS** in the sidebar.
To grant subscribers: go to `/os/users` → Grant button next to any user.

---

## Removing legacy Manus vars (after cutover is confirmed working)

Once everything is working, you can clean up:
- Delete `server/_core/sdk.ts` (no longer imported anywhere)
- Delete `server/_core/oauth.ts` (replaced by `auth.ts`)
- Remove the `oAuthServerUrl`, `ownerOpenId`, `forgeApiUrl`, `forgeApiKey` lines from `env.ts`
- Remove `VITE_OAUTH_PORTAL_URL` from any Vite config / env
