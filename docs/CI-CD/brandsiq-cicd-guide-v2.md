# BrandsIQ CI/CD Pipeline — Complete Setup Guide (v2)

## Overview

This guide walks you through setting up a professional CI/CD pipeline for BrandsIQ, starting from scratch.

**Your Stack:** Next.js + TypeScript + Supabase + Google OAuth + Upstash Redis + Vercel

**Current State:**
- BrandsIQ code exists locally and on GitHub
- Supabase project exists with tables (created by Claude Code)
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
| Pull your existing schema into files | | ✅ |

**Dashboard** = configuration and monitoring (point and click)
**CLI** = automation and reproducibility (commands that can run in CI/CD)

The CLIs run on **your local machine** (in your terminal, inside the BrandsIQ project folder). They talk to the cloud services via API. During CI/CD, the same CLI commands run on GitHub's servers automatically.

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
# Install Supabase CLI
npm install -g supabase

# Install Vercel CLI
npm install -g vercel

# Verify installations
supabase --version
vercel --version
```

Also make sure you have:
- [ ] BrandsIQ repo on GitHub
- [ ] Node.js 18+ installed locally
- [ ] Access to your Supabase dashboard
- [ ] Access to your Vercel dashboard

---

## PHASE 1: Capture Your Current Database Schema

Your tables were created by Claude Code directly in Supabase. Right now, the schema exists only in the Supabase cloud — it's not tracked in your codebase. This phase fixes that.

**Where:** Run all commands in your terminal, inside your BrandsIQ project folder.

### Step 1.1: Initialize Supabase in your repo

```bash
cd brandsiq    # or wherever your project folder is
supabase init
```

This creates a `supabase/` directory in your project. You'll see files like `supabase/config.toml`.

### Step 1.2: Link to your existing Supabase project

```bash
supabase link --project-ref <your-project-ref>
```

**Where to find your project ref:**
1. Go to Supabase Dashboard (https://supabase.com/dashboard)
2. Click on your BrandsIQ project
3. Go to Project Settings (gear icon) → General
4. Copy the "Reference ID" — it looks something like `abcdefghijklmnop`

It will ask for your database password (the one you set when creating the project).

### Step 1.3: Pull your existing schema

```bash
supabase db pull
```

This creates a migration file at `supabase/migrations/<timestamp>_remote_schema.sql` containing your entire current database schema — all tables, RLS policies, functions, everything Claude Code created.

**Open the file and verify** — you should see your tables, columns, and policies in there.

### Step 1.4: Create a seed file (optional but recommended)

Create a file called `supabase/seed.sql` with fake test data. This gets loaded into staging and test databases:

```sql
-- Example: Insert test data for staging/testing
-- Customize this based on your actual BrandsIQ tables
INSERT INTO public.reviews (id, title, content, rating, created_at)
VALUES
  ('test-1', 'Great product', 'Really loved using this', 5, now()),
  ('test-2', 'Needs improvement', 'Could be better', 3, now()),
  ('test-3', 'Terrible experience', 'Would not recommend', 1, now());
```

Adapt this to match your actual table structure.

### Step 1.5: Commit and push

```bash
git add supabase/
git commit -m "chore: add supabase migrations and seed data"
git push
```

**From this point on**, all database changes should be made through migration files (not directly in the Supabase dashboard).

**You don't need to do anything here right now.** This is just explaining how future database changes work once the pipeline is set up. For example, if you later want to add a `category` column to a table, instead of doing it in the Supabase dashboard, you'd run:

```bash
supabase migration new add_category_to_reviews
# Creates an empty .sql file in supabase/migrations/
# You write your SQL in it (e.g., ALTER TABLE reviews ADD COLUMN category TEXT;)
# The pipeline applies it to staging and production automatically
```

This keeps all environments in sync and gives you a git history of every database change.

---

## PHASE 2: Set Up Vercel (From Scratch)

You have a Vercel account but no project. Let's set it up.

### Step 2.1: Connect your GitHub repo to Vercel

1. Go to Vercel Dashboard (https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your BrandsIQ GitHub repository
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

**Nothing else is needed in Vercel for staging.** Vercel's built-in Preview deployment feature + the staging-specific environment variables you set in Phase 3 together create your staging environment. No separate Vercel project or special configuration required. Vercel generates a unique URL for each Preview deploy (like `brandsiq-abc123.vercel.app`). If you want a consistent staging URL, you can optionally assign one under Settings → Domains later.

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
# In your terminal, inside the BrandsIQ project
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

**Important:** Add `.vercel/` to your `.gitignore` if it's not already there.

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
3. Name: `brandsiq-staging`
4. Region: **same region** as your production project
5. Set a database password — **save it securely**
6. Wait for it to provision

**You now have two Supabase projects in your account:**
- `brandsiq` (or whatever you named it) → production
- `brandsiq-staging` → staging

### Step 3.2: Apply your schema to the staging database

**Run this in your terminal** (on your local machine, inside the BrandsIQ folder):

```bash
# Link to the STAGING project
supabase link --project-ref <staging-project-ref>

# Push your migrations to staging
supabase db push
```

This applies the migration file from Phase 1 to the staging database. Now staging has the exact same tables, columns, and policies as production.

**Note:** After this, link back to production for your regular development:

```bash
supabase link --project-ref <production-project-ref>
```

### Step 3.3: Configure Google OAuth for staging

1. Go to Google Cloud Console (https://console.cloud.google.com/) → your OAuth credentials
2. Under **Authorized redirect URIs**, add:
   - `https://<staging-project-ref>.supabase.co/auth/v1/callback`

### Step 3.4: Configure Upstash Redis for staging

**Simplest approach:** Create a second free Redis database in Upstash.

1. Go to Upstash Console (https://console.upstash.com/)
2. Create a new Redis database: `brandsiq-staging`
3. Same region as your app
4. Note the REST URL and REST Token

### Step 3.5: Set environment variables in Vercel

Go to Vercel Dashboard → your BrandsIQ project → **Settings** → **Environment Variables**

For **each** variable, you'll add it twice — once for Preview (staging) and once for Production.

**How to add per-environment in Vercel:**
When adding a variable, you'll see checkboxes for Production, Preview, and Development. Uncheck the ones you don't want for that specific value.

**Add these for PREVIEW environment (= staging):**

| Variable Name | Value | Check only |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | https://<staging-ref>.supabase.co | Preview |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | staging project's anon key | Preview |
| SUPABASE_SERVICE_ROLE_KEY | staging project's service role key | Preview |
| UPSTASH_REDIS_REST_URL | staging Redis REST URL | Preview |
| UPSTASH_REDIS_REST_TOKEN | staging Redis REST token | Preview |
| NEXT_PUBLIC_APP_URL | Your Vercel preview/staging URL | Preview |
| NEXTAUTH_URL | Your Vercel preview/staging URL | Preview |
| NEXTAUTH_SECRET | Run: openssl rand -base64 32 | Preview |
| GOOGLE_CLIENT_ID | Your Google OAuth client ID | Preview |
| GOOGLE_CLIENT_SECRET | Your Google OAuth client secret | Preview |

**Add these for PRODUCTION environment:**

| Variable Name | Value | Check only |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | https://<prod-ref>.supabase.co | Production |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | production project's anon key | Production |
| SUPABASE_SERVICE_ROLE_KEY | production project's service role key | Production |
| UPSTASH_REDIS_REST_URL | production Redis REST URL | Production |
| UPSTASH_REDIS_REST_TOKEN | production Redis REST token | Production |
| NEXT_PUBLIC_APP_URL | Your production domain/URL | Production |
| NEXTAUTH_URL | Your production domain/URL | Production |
| NEXTAUTH_SECRET | Generate a DIFFERENT one | Production |
| GOOGLE_CLIENT_ID | Same Google OAuth client ID | Production |
| GOOGLE_CLIENT_SECRET | Same Google OAuth client secret | Production |

**Where to find Supabase keys:**
Go to Supabase Dashboard → your project → Settings → API
- `anon key` = the one labeled "anon public"
- `service_role key` = the one labeled "service_role" (keep this secret!)

---

## PHASE 4: Set Up Testing Infrastructure

### Step 4.1: Install testing dependencies

Run in your terminal, inside the BrandsIQ project:

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
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

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

Open `package.json` and add/update the scripts section:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Step 4.6: Verify locally

```bash
npm run lint          # Should work with your existing code
npm run type-check    # Should pass if TypeScript is valid
npm run test:unit     # Should run the placeholder test
```

Fix any issues before continuing.

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

      - name: Run ESLint
        run: npm run lint

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
          POSTGRES_DB: brandsiq_test
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

      - name: Apply database migrations to test database
        run: |
          for f in supabase/migrations/*.sql; do
            PGPASSWORD=postgres psql -h localhost -U postgres -d brandsiq_test -f "$f"
          done

      - name: Seed test data
        run: |
          if [ -f supabase/seed.sql ]; then
            PGPASSWORD=postgres psql -h localhost -U postgres -d brandsiq_test -f supabase/seed.sql
          fi

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/brandsiq_test
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

This runs automatically when code is merged to main.

```yaml
name: Deploy to Staging

on:
  push:
    branches: [main]

jobs:
  deploy-staging:
    name: Deploy to Staging
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

      - name: Run database migrations on staging Supabase
        run: |
          npx supabase link --project-ref ${{ secrets.STAGING_SUPABASE_PROJECT_REF }}
          npx supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD: ${{ secrets.STAGING_SUPABASE_DB_PASSWORD }}

      - name: Staging deployment summary
        run: |
          echo "## Staging Deployment" >> $GITHUB_STEP_SUMMARY
          echo "Database migrations applied to staging" >> $GITHUB_STEP_SUMMARY
          echo "Vercel auto-deploys this push as staging" >> $GITHUB_STEP_SUMMARY
```

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
          echo "You must type deploy to confirm. Got: ${{ github.event.inputs.confirm }}"
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
          POSTGRES_DB: brandsiq_test
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

      - name: Run linting
        run: npm run lint

      - name: Run type check
        run: npm run type-check

      - name: Apply migrations to test database
        run: |
          for f in supabase/migrations/*.sql; do
            PGPASSWORD=postgres psql -h localhost -U postgres -d brandsiq_test -f "$f"
          done

      - name: Run all tests
        run: npm run test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/brandsiq_test
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

      - name: Run database migrations on production Supabase
        run: |
          npx supabase link --project-ref ${{ secrets.PROD_SUPABASE_PROJECT_REF }}
          npx supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD: ${{ secrets.PROD_SUPABASE_DB_PASSWORD }}

      - name: Push to production branch (triggers Vercel production deploy)
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git checkout production
          git merge main --no-edit
          git push origin production
```

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

| Secret Name | What It Is | Where to Find It |
|---|---|---|
| SUPABASE_ACCESS_TOKEN | Your personal Supabase API token | Supabase Dashboard → click your avatar (bottom left) → Account → Access Tokens → Generate new token |
| STAGING_SUPABASE_PROJECT_REF | Staging project reference ID | Supabase Dashboard → brandsiq-staging → Settings → General → Reference ID |
| STAGING_SUPABASE_DB_PASSWORD | Staging database password | The password you set when creating the staging project |
| PROD_SUPABASE_PROJECT_REF | Production project reference ID | Supabase Dashboard → your original project → Settings → General → Reference ID |
| PROD_SUPABASE_DB_PASSWORD | Production database password | The password you set when creating your original project |
| VERCEL_TOKEN | Vercel API token | Created in Phase 2, Step 2.5 |
| VERCEL_ORG_ID | Your Vercel organization ID | From .vercel/project.json (Phase 2, Step 2.4) |
| VERCEL_PROJECT_ID | Your Vercel project ID | From .vercel/project.json (Phase 2, Step 2.4) |

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

1. git checkout -b feature/my-feature    (create feature branch)
2. Code your changes
3. git push → Create PR on GitHub

   ┌─────────────────────────────────────────┐
   │  PR Quality Gate (automatic)             │
   │                                          │
   │  > ESLint linting                        │
   │  > TypeScript type checking              │
   │  > Unit tests (Vitest)                   │
   │  > Integration tests (Docker PostgreSQL) │
   │                                          │
   │  Any failure = PR cannot be merged       │
   │  All pass = PR is mergeable              │
   └──────────────────┬──────────────────────-┘
                      | click "Merge PR"
                      v
   ┌─────────────────────────────────────────┐
   │  Staging Deployment (automatic)          │
   │                                          │
   │  > DB migrations applied to staging      │
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
   │  > DB migrations applied to production   │
   │  > Code pushed to production branch      │
   │  > Vercel deploys to production          │
   └─────────────────────────────────────────┘
```

---

## File Structure After Setup

```
brandsiq/
├── .github/
│   └── workflows/
│       ├── pr-checks.yml           <- PR quality gate
│       ├── deploy-staging.yml      <- staging deployment
│       └── deploy-production.yml   <- production deployment
├── supabase/
│   ├── config.toml                 <- supabase CLI config
│   ├── seed.sql                    <- test data
│   └── migrations/
│       └── <timestamp>_remote_schema.sql  <- your database schema
├── tests/
│   ├── setup.ts                    <- test configuration
│   ├── unit/
│   │   └── placeholder.test.ts     <- replace with real tests later
│   ├── integration/                <- add integration tests later
│   └── e2e/                        <- add E2E tests later
├── vitest.config.ts                <- test runner configuration
├── .vercel/                        <- (gitignored) Vercel project link
├── package.json                    <- updated with test scripts
└── ... (your existing files)
```

---

## Execution Order

| Phase | What | Time |
|---|---|---|
| Phase 1 | Capture database schema as migration files | 30 min |
| Phase 2 | Set up Vercel project from scratch | 30 min |
| Phase 3 | Create staging Supabase + configure environments | 1-2 hours |
| Phase 4 | Install test tools + create placeholder test | 1 hour |
| Phase 5 | Create the 3 GitHub Actions workflow files | 30 min |
| Phase 6 | Add secrets + branch protection in GitHub | 30 min |
| **Total** | | **~4-5 hours** |

---

## Tips

- **You can hand this document to Claude Code** for each phase and say "help me execute Phase X for BrandsIQ"
- **If a workflow fails**, check the Actions tab for error logs. Usually it's a missing secret or wrong project ref.
- **Your first PR after setup** is the best test. Create a small change, open a PR, and watch the Actions tab.
- **Test cases come later.** Pipeline works immediately with linting and type checks. Add tests at your own pace.
- **E2E tests (Playwright)** can be added later as a bonus phase.
