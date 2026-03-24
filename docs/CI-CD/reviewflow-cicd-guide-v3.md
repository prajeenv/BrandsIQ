# ReviewFlow CI/CD Pipeline — Complete Setup Guide (v3)

> **v3 Changes from v2:** Fixed migration strategy (Prisma instead of Supabase CLI), corrected environment variables to match actual `.env.example`, fixed Vitest path alias, added missing `prisma generate` steps in CI, added `--max-warnings 0` for ESLint strictness, added `type-check` script, safer production merge strategy. See [Changelog](#changelog-v2--v3) at the bottom for full diff.

## Overview

This guide walks you through setting up a professional CI/CD pipeline for ReviewFlow, starting from scratch.

**Your Stack:** Next.js 14 + TypeScript + Prisma + Supabase (PostgreSQL) + Google OAuth + Upstash Redis + Vercel

**Current State:**
- ReviewFlow code exists locally and on GitHub
- Supabase project exists with tables (managed by Prisma via `db push`)
- Database schema is defined in `prisma/schema.prisma` but **no migration files exist yet** — Phase 1 creates the baseline migration
- Vercel account exists but NO project set up yet
- No test cases written yet (that's okay — we set up the pipeline first)
- No environment variables configured in Vercel yet

**Target Pipeline:**
```
Feature branch → PR (linting + type checks + tests) → merge to main → auto-deploy to Staging → manual trigger → deploy to Production
```

---

## Why Do I Need CLIs?

You'll use **both** the dashboard (browser) and CLI (terminal) for different purposes:

| Task | Use Dashboard | Use CLI |
|---|---|---|
| Create a new project | ✅ | |
| Set environment variables | ✅ | |
| View data, logs, users | ✅ | |
| Apply database migrations | | ✅ |
| Keep staging + production schemas in sync | | ✅ |
| Deploy from GitHub Actions (automated) | | ✅ |

**Dashboard** = configuration and monitoring (point and click)
**CLI** = automation and reproducibility (commands that can run in CI/CD)

The CLIs run on **your local machine** (in your terminal, inside the ReviewFlow project folder). They talk to the cloud services via API. During CI/CD, the same CLI commands run on GitHub's servers automatically.

---

## About Test Cases

You don't need to write tests before setting up the pipeline. Here's the plan:

1. Set up the pipeline with **linting + type checks** first — these work immediately with zero test files
2. The test jobs will simply report "0 tests found" and pass — that's fine
3. When you eventually write your first test, the pipeline picks it up automatically
4. You can gradually add tests over time

This way the infrastructure is ready and waiting for tests whenever you write them.

---

## Prerequisites

Before starting, install the CLIs on your local machine:

```bash
# Install Vercel CLI
npm install -g vercel

# Verify installation
vercel --version
```

Also make sure you have:
- [ ] ReviewFlow repo on GitHub
- [ ] Node.js 18+ installed locally
- [ ] Access to your Supabase dashboard
- [ ] Access to your Vercel dashboard

> **Note:** You do NOT need the Supabase CLI. ReviewFlow uses Prisma for all database migrations. Prisma is already a project dependency.

---

## PHASE 1: Create Baseline Database Migration

Your schema is defined in `prisma/schema.prisma`, but there are no migration files yet — you've been using `prisma db push` to sync the schema directly. The CI/CD pipeline uses `prisma migrate deploy`, which requires migration files. This phase creates the initial baseline migration.

**Where:** Run all commands in your terminal, inside your ReviewFlow project folder.

### Step 1.1: Create the baseline migration

Make sure your `.env.local` has the correct `DATABASE_URL` and `DIRECT_URL` pointing to your **production** Supabase database, then run:

```bash
npx prisma migrate dev --name init
```

This does two things:
1. Creates `prisma/migrations/<timestamp>_init/migration.sql` containing all the SQL to create your current schema from scratch
2. Records this migration as "already applied" in a `_prisma_migrations` table in your database (so it won't try to re-run it)

**Open the generated file and verify** — you should see `CREATE TABLE` statements for all your tables (users, reviews, brand_voices, etc.).

> **If the command warns about data loss or asks to reset:** This can happen if there's drift between your schema file and the actual database. Do NOT reset your production database. Instead, use `prisma migrate diff` to understand the differences and resolve them manually. Ask for help if unsure.

### Step 1.2: Verify migration status

```bash
npx prisma migrate status
```

This should report "Database schema is up to date" — meaning the migration file exists and the database knows it's been applied.

### Step 1.3: Commit the migration files

```bash
git add prisma/
git commit -m "chore: add baseline prisma migration"
git push
```

**From this point on**, all database changes should be made through Prisma migrations (not directly in the Supabase dashboard):

```bash
# 1. Edit prisma/schema.prisma
# 2. Create a migration
npx prisma migrate dev --name add_category_to_reviews
# 3. Commit the migration
git add prisma/
git commit -m "feat: add category column to reviews"
```

This keeps all environments in sync and gives you a git history of every database change.

---

## PHASE 2: Set Up Vercel (From Scratch)

You have a Vercel account but no project. Let's set it up.

### Step 2.1: Connect your GitHub repo to Vercel

1. Go to Vercel Dashboard (https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your ReviewFlow GitHub repository
4. Vercel will auto-detect it as a Next.js project
5. **Don't add environment variables yet** — we'll do that in Phase 3
6. Click **Deploy** — it will likely fail or show a broken app (that's fine, no env vars yet)

### Step 2.2: Change the production branch

By default, Vercel treats `main` as the production branch. We want `main` to be staging instead:

1. Go to your Vercel project → **Settings** → **Git**
2. Under **Production Branch**, change it from `main` to `production`
3. Save

**What this means:**
- Pushes to `main` → Vercel creates a **Preview deployment** (this becomes your staging)
- Pushes to `production` branch → Vercel creates a **Production deployment**

**Nothing else is needed in Vercel for staging.** Vercel's built-in Preview deployment feature + the staging-specific environment variables you set in Phase 3 together create your staging environment. No separate Vercel project or special configuration required. Vercel generates a unique URL for each Preview deploy (like `reviewflow-abc123.vercel.app`). If you want a consistent staging URL, you can optionally assign one under Settings → Domains later.

### Step 2.3: Create the `production` branch in GitHub

**Why this branch?** Vercel deploys to production when code is pushed to this branch. Your daily work stays on `main` (staging). When you're ready to release, the GitHub Actions workflow merges `main` into `production`, triggering the production deploy. Without this branch, there's no way to separate staging-ready code from production-ready code.

**Option A — Terminal:**
```bash
git checkout main
git checkout -b production
git push origin production
git checkout main    # go back to main for daily work
```

**Option B — GitHub website:**
Go to your repo → click the branch dropdown → type `production` → click "Create branch: production from main"

Either method works. The branch just needs to exist on GitHub.

### Step 2.4: Get Vercel IDs for GitHub Actions

```bash
# In your terminal, inside the ReviewFlow project
vercel link
```

Follow the prompts to link to your Vercel project. This creates a `.vercel/project.json` file with:

```json
{
  "orgId": "your-org-id",
  "projectId": "your-project-id"
}
```

**Save both values** — you'll need them as GitHub secrets later.

**Important:** `.vercel/` is already in your `.gitignore`. Verify this — it should NOT be committed.

### Step 2.5: Create a Vercel API token

Vercel tokens are **account-wide** (not per-project). One token works for all your current and future Vercel projects. GitHub Actions needs this token to authenticate with Vercel's API during automated deployments.

1. Go to Vercel Dashboard → click your avatar → **Settings** → **Tokens**
2. Click **Create Token**
3. Name: `github-actions` (generic name since it works across all projects)
4. Scope: Full Account
5. **Copy and save the token** — you won't see it again

You'll reuse this same token for any future project's CI/CD pipeline.

---

## PHASE 3: Set Up the Staging Environment

### Step 3.1: Create a staging Supabase project

1. Go to Supabase Dashboard (https://supabase.com/dashboard)
2. Click **New Project** (same account, same organization)
3. Name: `reviewflow-staging`
4. Region: **same region** as your production project
5. Set a database password — **save it securely**
6. Wait for it to provision

**You now have two Supabase projects in your account:**
- `reviewflow` (or whatever you named it) → production
- `reviewflow-staging` → staging

### Step 3.2: Apply your schema to the staging database

Get the staging database connection strings from Supabase Dashboard → `reviewflow-staging` → Settings → Database → Connection string.

You need two URLs:
- **Pooler URL** (port 6543, with `?pgbouncer=true`) → this is `DATABASE_URL`
- **Direct URL** (port 5432) → this is `DIRECT_URL`

**Run this in your terminal** (on your local machine, inside the ReviewFlow folder):

```bash
# Temporarily set the staging database URL and apply migrations
DIRECT_URL="postgresql://postgres.[staging-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres" \
DATABASE_URL="postgresql://postgres.[staging-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true" \
npx prisma migrate deploy
```

This applies all existing migrations to the staging database. Now staging has the exact same schema as production.

### Step 3.3: Configure Google OAuth for staging

1. Go to Google Cloud Console (https://console.cloud.google.com/) → your OAuth credentials
2. Under **Authorized redirect URIs**, add your staging URL:
   - `https://<your-staging-url>/api/auth/callback/google`

> **Note:** ReviewFlow uses NextAuth.js for OAuth, not Supabase Auth. The redirect URI points to your Next.js app, not Supabase.

### Step 3.4: Configure Upstash Redis for staging

**Simplest approach:** Create a second free Redis database in Upstash.

1. Go to Upstash Console (https://console.upstash.com/)
2. Create a new Redis database: `reviewflow-staging`
3. Same region as your app
4. Note the REST URL and REST Token

### Step 3.5: Set environment variables in Vercel

Go to Vercel Dashboard → your ReviewFlow project → **Settings** → **Environment Variables**

For **each** variable, you'll add it twice — once for Preview (staging) and once for Production.

**How to add per-environment in Vercel:**
When adding a variable, you'll see checkboxes for Production, Preview, and Development. Uncheck the ones you don't want for that specific value.

**Add these for PREVIEW environment (= staging):**

| Variable Name            | Value                                        | Check only |
| ------------------------ | -------------------------------------------- | ---------- |
| DATABASE_URL             | Staging pooler connection string (port 6543) | Preview    |
| DIRECT_URL               | Staging direct connection string (port 5432) | Preview    |
| NEXTAUTH_URL             | Your Vercel preview/staging URL              | Preview    |
| NEXTAUTH_SECRET          | Run: `openssl rand -base64 32`               | Preview    |
| NEXT_PUBLIC_APP_URL      | Your Vercel preview/staging URL              | Preview    |
| GOOGLE_CLIENT_ID         | Your Google OAuth client ID                  | Preview    |
| GOOGLE_CLIENT_SECRET     | Your Google OAuth client secret              | Preview    |
| ANTHROPIC_API_KEY        | Your Anthropic API key                       | Preview    |
| DEEPSEEK_API_KEY         | Your DeepSeek API key                        | Preview    |
| RESEND_API_KEY           | Your Resend API key                          | Preview    |
| EMAIL_FROM               | Your verified sender email                   | Preview    |
| UPSTASH_REDIS_REST_URL   | Staging Redis REST URL                       | Preview    |
| UPSTASH_REDIS_REST_TOKEN | Staging Redis REST token                     | Preview    |
| CRON_SECRET              | Run: `openssl rand -base64 32`               | Preview    |

**Add these for PRODUCTION environment:**

| Variable Name            | Value                                           | Check only |
| ------------------------ | ----------------------------------------------- | ---------- |
| DATABASE_URL             | Production pooler connection string (port 6543) | Production |
| DIRECT_URL               | Production direct connection string (port 5432) | Production |
| NEXTAUTH_URL             | Your production domain/URL                      | Production |
| NEXTAUTH_SECRET          | Generate a DIFFERENT one                        | Production |
| NEXT_PUBLIC_APP_URL      | Your production domain/URL                      | Production |
| GOOGLE_CLIENT_ID         | Same Google OAuth client ID                     | Production |
| GOOGLE_CLIENT_SECRET     | Same Google OAuth client secret                 | Production |
| ANTHROPIC_API_KEY        | Same Anthropic API key (or separate one)        | Production |
| DEEPSEEK_API_KEY         | Same DeepSeek API key (or separate one)         | Production |
| RESEND_API_KEY           | Same Resend API key                             | Production |
| EMAIL_FROM               | Your verified sender email                      | Production |
| UPSTASH_REDIS_REST_URL   | Production Redis REST URL                       | Production |
| UPSTASH_REDIS_REST_TOKEN | Production Redis REST token                     | Production |
| CRON_SECRET              | Generate a DIFFERENT one                        | Production |

**Where to find Supabase connection strings:**
Go to Supabase Dashboard → your project → Settings → Database → Connection string
- **Pooler** (port 6543, append `?pgbouncer=true`) → `DATABASE_URL`
- **Direct** (port 5432) → `DIRECT_URL`

---

## PHASE 4: Set Up Testing Infrastructure

### Step 4.1: Install testing dependencies

Run in your terminal, inside the ReviewFlow project:

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom @vitest/coverage-v8 @vitejs/plugin-react
```

### Step 4.2: Create Vitest config

Create a new file called `vitest.config.ts` in your **project root** (same level as package.json):

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

> **Important:** The alias maps `@` to `./src` to match your `tsconfig.json` paths (`"@/*": ["./src/*"]`). The v2 guide had this pointing to `./` which would break all `@/` imports in tests.

### Step 4.3: Create test directories and setup file

```bash
mkdir -p tests/unit tests/integration tests/e2e
```

Create `tests/setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

### Step 4.4: Create a placeholder test

Create `tests/unit/placeholder.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'

describe('Pipeline verification', () => {
  it('test infrastructure works', () => {
    expect(true).toBe(true)
  })
})
```

This verifies the test setup works. Replace with real tests later.

### Step 4.5: Add scripts to package.json

Open `package.json` and add these scripts (keep all existing scripts):

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:strict": "next lint --max-warnings 0",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:migrate:deploy": "prisma migrate deploy",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

**New scripts explained:**
- `lint:strict` — treats ESLint warnings as errors (used in CI). Your current rules use `"warn"` level, so plain `next lint` exits 0 on warnings. CI should be strict.
- `type-check` — runs the TypeScript compiler without emitting files (type validation only)
- `test` / `test:unit` / `test:integration` — Vitest test runners
- `db:migrate:deploy` — applies pending migrations without creating new ones (used in CI/staging/production)

### Step 4.6: Verify locally

```bash
npm run lint            # Should work (warnings OK locally)
npm run lint:strict     # May show warnings-as-errors — fix these before CI
npm run type-check      # Should pass if TypeScript is valid
npm run test:unit       # Should run the placeholder test
```

Fix any issues before continuing.

> **About lint:strict failures:** Your codebase currently has ~8 ESLint warnings (unused variables, console statements). You have two options:
> 1. **Fix them now** — rename unused params to `_param`, remove stray `console.log` calls
> 2. **Use `lint` (not `lint:strict`) in CI for now** — and switch to strict later when you clean up
>
> Option 2 is fine for getting the pipeline running quickly. Just swap `npm run lint:strict` for `npm run lint` in the workflow files below.

### Step 4.7: Commit

```bash
git add vitest.config.ts tests/ package.json package-lock.json
git commit -m "chore: add testing infrastructure"
git push
```

---

## PHASE 5: Create GitHub Actions Workflows

GitHub Actions workflows are YAML files that live inside your repository. GitHub automatically detects them and runs them based on triggers you define.

### Step 5.1: Create the workflows directory

```bash
mkdir -p .github/workflows
```

This creates a `.github/` folder (hidden folder, starts with a dot) with a `workflows/` subfolder.

### Step 5.2: Create file `.github/workflows/pr-checks.yml`

This runs automatically on every Pull Request to main.

```yaml
name: PR Quality Gate

on:
  pull_request:
    branches: [main]

concurrency:
  group: pr-${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  lint-and-typecheck:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma client
        run: npx prisma generate

      - name: Run ESLint
        run: npm run lint:strict

      - name: Run TypeScript type check
        run: npm run type-check

  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma client
        run: npx prisma generate

      - name: Run unit tests
        run: npm run test:unit

  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: reviewflow_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma client
        run: npx prisma generate

      - name: Apply database migrations to test database
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/reviewflow_test
          DIRECT_URL: postgresql://postgres:postgres@localhost:5432/reviewflow_test

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/reviewflow_test
          DIRECT_URL: postgresql://postgres:postgres@localhost:5432/reviewflow_test
          NEXTAUTH_SECRET: test-secret-for-ci
          NEXT_PUBLIC_APP_URL: http://localhost:3000

  pr-checks-passed:
    name: All PR Checks Passed
    needs: [lint-and-typecheck, unit-tests, integration-tests]
    runs-on: ubuntu-latest
    steps:
      - run: echo "All checks passed!"
```

### Step 5.3: Create file `.github/workflows/deploy-staging.yml`

This runs automatically when code is merged to main. It applies Prisma migrations to the staging database. Vercel handles the actual app deployment automatically via its Git integration.

```yaml
name: Staging — Apply Migrations

on:
  push:
    branches: [main]

jobs:
  migrate-staging:
    name: Apply Migrations to Staging DB
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma client
        run: npx prisma generate

      - name: Apply Prisma migrations to staging database
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
          DIRECT_URL: ${{ secrets.STAGING_DIRECT_URL }}

      - name: Staging deployment summary
        run: |
          echo "## Staging Deployment" >> $GITHUB_STEP_SUMMARY
          echo "- ✅ Prisma migrations applied to staging database" >> $GITHUB_STEP_SUMMARY
          echo "- ✅ Vercel auto-deploys this push as a Preview deployment" >> $GITHUB_STEP_SUMMARY
```

> **How staging deploys work:** This workflow only handles database migrations. The actual app deployment happens automatically — Vercel detects the push to `main` and creates a Preview deployment with the staging environment variables you configured in Phase 3.

### Step 5.4: Create file `.github/workflows/deploy-production.yml`

This only runs when you manually trigger it from the GitHub Actions tab.

```yaml
name: Deploy to Production

on:
  workflow_dispatch:
    inputs:
      confirm:
        description: 'Type "deploy" to confirm production deployment'
        required: true
        type: string

jobs:
  validate:
    name: Validate Deployment
    runs-on: ubuntu-latest
    steps:
      - name: Confirm deployment intent
        if: github.event.inputs.confirm != 'deploy'
        run: |
          echo "You must type 'deploy' to confirm. Got: ${{ github.event.inputs.confirm }}"
          exit 1

  test:
    name: Run All Tests
    needs: validate
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: reviewflow_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          ref: main

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma client
        run: npx prisma generate

      - name: Run linting
        run: npm run lint:strict

      - name: Run type check
        run: npm run type-check

      - name: Apply migrations to test database
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/reviewflow_test
          DIRECT_URL: postgresql://postgres:postgres@localhost:5432/reviewflow_test

      - name: Run all tests
        run: npm run test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/reviewflow_test
          DIRECT_URL: postgresql://postgres:postgres@localhost:5432/reviewflow_test
          NEXTAUTH_SECRET: test-secret-for-ci
          NEXT_PUBLIC_APP_URL: http://localhost:3000

  deploy-production:
    name: Deploy to Production
    needs: test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          ref: main
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma client
        run: npx prisma generate

      - name: Apply Prisma migrations to production database
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
          DIRECT_URL: ${{ secrets.PROD_DIRECT_URL }}

      - name: Push to production branch (triggers Vercel production deploy)
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git checkout production
          git merge main --ff-only
          git push origin production
```

> **Why `--ff-only`?** This ensures the merge only succeeds if `production` is a direct ancestor of `main` (fast-forward). If someone hotfixed `production` directly, this will fail loudly instead of creating a potentially broken merge commit. If it fails, you'll need to manually reconcile the branches.

### Step 5.5: Commit and push the workflow files

```bash
git add .github/
git commit -m "ci: add GitHub Actions workflows for CI/CD pipeline"
git push
```

**What happens after this push:**
- GitHub sees the `.github/workflows/` folder and registers the workflows
- You'll see them in your repo's **Actions** tab (on GitHub website)
- `pr-checks.yml` will run on the next Pull Request
- `deploy-staging.yml` will run on this push (since you pushed to main)
- `deploy-production.yml` waits for you to trigger it manually

---

## PHASE 6: Configure GitHub Repository Settings

### Step 6.1: Add secrets to GitHub

Go to your GitHub repo (on github.com) → **Settings** → **Secrets and variables** → **Actions** → click **"New repository secret"**

Add each of these one by one:

| Secret Name          | What It Is                                   | Where to Find It                                                                                                             |
| -------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| STAGING_DATABASE_URL | Staging Supabase pooler connection string    | Supabase Dashboard → reviewflow-staging → Settings → Database → Connection string (port 6543, append `?pgbouncer=true`)      |
| STAGING_DIRECT_URL   | Staging Supabase direct connection string    | Supabase Dashboard → reviewflow-staging → Settings → Database → Connection string (port 5432)                                |
| PROD_DATABASE_URL    | Production Supabase pooler connection string | Supabase Dashboard → your production project → Settings → Database → Connection string (port 6543, append `?pgbouncer=true`) |
| PROD_DIRECT_URL      | Production Supabase direct connection string | Supabase Dashboard → your production project → Settings → Database → Connection string (port 5432)                           |
| VERCEL_TOKEN         | Vercel API token                             | Created in Phase 2, Step 2.5                                                                                                 |
| VERCEL_ORG_ID        | Your Vercel organization ID                  | From `.vercel/project.json` (Phase 2, Step 2.4)                                                                              |
| VERCEL_PROJECT_ID    | Your Vercel project ID                       | From `.vercel/project.json` (Phase 2, Step 2.4)                                                                              |

> **Note:** You do NOT need `SUPABASE_ACCESS_TOKEN` or Supabase project refs. Prisma connects directly to the database using the connection string — no Supabase CLI involved.

### Step 6.2: Set up branch protection rules

Go to GitHub repo → **Settings** → **Branches** → **Add branch ruleset** (or Add rule)

**For main branch:**
- Check: Require a pull request before merging
- Check: Require status checks to pass before merging
  - Search for and select: "All PR Checks Passed" (appears after first workflow run — do a test PR first if needed)
- Check: Require branches to be up to date before merging

**This means:** Nobody (including you) can push directly to main. All changes must go through a PR, and all tests must pass.

---

## How to Trigger a Production Deployment

Once everything is set up:

1. Go to your GitHub repo → **Actions** tab
2. In the left sidebar, click **"Deploy to Production"**
3. Click **"Run workflow"** button (top right)
4. Type `deploy` in the confirmation field
5. Click **"Run workflow"**

GitHub Actions will run tests → apply migrations → push to production branch → Vercel deploys.

---

## Your Complete Pipeline — Visual Summary

```
Your daily workflow:

1. git checkout -b feat/my-feature    (create feature branch)
2. Code your changes
3. git push → Create PR on GitHub

   ┌─────────────────────────────────────────┐
   │  PR Quality Gate (automatic)             │
   │                                          │
   │  > ESLint linting (strict)               │
   │  > TypeScript type checking              │
   │  > Unit tests (Vitest)                   │
   │  > Integration tests (Docker PostgreSQL) │
   │  > Prisma migrations applied to test DB  │
   │                                          │
   │  Any failure = PR cannot be merged       │
   │  All pass = PR is mergeable              │
   └──────────────────┬──────────────────────-┘
                      | click "Merge PR"
                      v
   ┌─────────────────────────────────────────┐
   │  Staging Deployment (automatic)          │
   │                                          │
   │  > Prisma migrations applied to staging  │
   │  > Vercel deploys to staging URL         │
   │  > You verify: does it work?             │
   └──────────────────┬──────────────────────-┘
                      | go to Actions tab
                      | click "Run workflow"
                      | type "deploy"
                      v
   ┌─────────────────────────────────────────┐
   │  Production Deployment (manual trigger)  │
   │                                          │
   │  > All tests re-run as safety net        │
   │  > Prisma migrations applied to prod     │
   │  > Code pushed to production branch      │
   │  > Vercel deploys to production          │
   └─────────────────────────────────────────┘
```

---

## File Structure After Setup

```
reviewflow/
├── .github/
│   └── workflows/
│       ├── pr-checks.yml           <- PR quality gate
│       ├── deploy-staging.yml      <- staging migrations
│       └── deploy-production.yml   <- production deployment
├── prisma/
│   ├── schema.prisma              <- database schema (source of truth)
│   ├── seed.ts                    <- seed script
│   └── migrations/
│       └── <timestamp>_init/      <- Prisma migration files
│           └── migration.sql
├── tests/
│   ├── setup.ts                   <- test configuration
│   ├── unit/
│   │   └── placeholder.test.ts    <- replace with real tests later
│   ├── integration/               <- add integration tests later
│   └── e2e/                       <- add E2E tests later
├── vitest.config.ts               <- test runner configuration
├── .vercel/                       <- (gitignored) Vercel project link
├── package.json                   <- updated with test scripts
└── ... (your existing files)
```

---

## Execution Order

| Phase | What | Time |
|---|---|---|
| Phase 1 | Verify Prisma migrations are tracked | 15 min |
| Phase 2 | Set up Vercel project from scratch | 30 min |
| Phase 3 | Create staging Supabase + configure environments | 1-2 hours |
| Phase 4 | Install test tools + create placeholder test | 1 hour |
| Phase 5 | Create the 3 GitHub Actions workflow files | 30 min |
| Phase 6 | Add secrets + branch protection in GitHub | 30 min |
| **Total** | | **~3-5 hours** |

---

## Tips

- **You can hand this document to Claude Code** for each phase and say "help me execute Phase X for ReviewFlow"
- **If a workflow fails**, check the Actions tab for error logs. Usually it's a missing secret or wrong connection string.
- **Your first PR after setup** is the best test. Create a small change, open a PR, and watch the Actions tab.
- **Test cases come later.** Pipeline works immediately with linting and type checks. Add tests at your own pace.
- **E2E tests (Playwright)** can be added later as a bonus phase.
- **Database changes** should always go through `npx prisma migrate dev --name description` locally, then commit the migration files. The pipeline applies them to staging and production automatically.

---

## Changelog: v2 → v3

| What Changed | v2 (Original) | v3 (Corrected) | Why |
|---|---|---|---|
| **Migration tool** | Supabase CLI (`supabase db pull/push`) | Prisma (`prisma migrate deploy`) | Project uses Prisma as source of truth. Using both Supabase CLI and Prisma causes migration state conflicts. |
| **Phase 1** | Initialize Supabase CLI, pull remote schema | Verify existing Prisma migrations | Schema already tracked in `prisma/schema.prisma`. No need to pull from remote. |
| **Environment variables** | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, etc. | `DATABASE_URL`, `DIRECT_URL`, `ANTHROPIC_API_KEY`, etc. | Matched to actual `.env.example`. App doesn't use Supabase JS client — it connects via Prisma. |
| **Vitest path alias** | `'@': path.resolve(__dirname, './')` | `'@': path.resolve(__dirname, './src')` | `tsconfig.json` maps `@/*` to `./src/*`. Wrong alias breaks all `@/` imports in tests. |
| **Prisma generate in CI** | Not included | Added `npx prisma generate` step | Without this, `@prisma/client` imports fail in CI because the generated client doesn't exist after `npm ci`. |
| **ESLint strictness** | `npm run lint` | `npm run lint:strict` (`--max-warnings 0`) | All ESLint rules use `"warn"` level. Plain `next lint` exits 0 on warnings, so lint step always passes. |
| **`type-check` script** | Referenced but not defined | Added `"type-check": "tsc --noEmit"` | Script was used in workflows but missing from `package.json`. |
| **`db:migrate:deploy` script** | Not included | Added `"db:migrate:deploy": "prisma migrate deploy"` | CI/staging/production should use `migrate deploy` (applies pending migrations), not `migrate dev` (creates new migrations). |
| **Production merge** | `git merge main --no-edit` | `git merge main --ff-only` | Fast-forward only is safer. Fails loudly if branches diverged instead of creating a potentially broken merge. |
| **Staging workflow name** | "Deploy to Staging" | "Staging — Apply Migrations" | More accurate. The workflow only applies DB migrations. Vercel handles the actual app deploy via Git integration. |
| **GitHub secrets** | `SUPABASE_ACCESS_TOKEN`, `STAGING_SUPABASE_PROJECT_REF`, `STAGING_SUPABASE_DB_PASSWORD`, `PROD_SUPABASE_PROJECT_REF`, `PROD_SUPABASE_DB_PASSWORD` | `STAGING_DATABASE_URL`, `STAGING_DIRECT_URL`, `PROD_DATABASE_URL`, `PROD_DIRECT_URL` | Prisma connects via connection string directly — no Supabase CLI auth needed. Fewer secrets, simpler setup. |
| **OAuth redirect URI** | `https://<ref>.supabase.co/auth/v1/callback` | `https://<staging-url>/api/auth/callback/google` | ReviewFlow uses NextAuth.js, not Supabase Auth. Redirect URI points to Next.js app. |
| **Prerequisites** | Install Supabase CLI + Vercel CLI | Install Vercel CLI only | Supabase CLI not needed. Prisma is already a project dependency. |
| **`DIRECT_URL` in CI tests** | Not included | Added alongside `DATABASE_URL` | Prisma requires `DIRECT_URL` for migrations (defined in `schema.prisma`). Missing it causes migration failures. |
| **Integration test migrations** | Raw SQL via `psql` loop over `supabase/migrations/*.sql` | `npx prisma migrate deploy` | Prisma handles migration ordering, state tracking, and application. Raw SQL doesn't track migration state. |
