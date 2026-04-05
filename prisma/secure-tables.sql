-- ============================================
-- BrandsIQ: Disable Supabase API Access for All Tables
-- ============================================
-- This script revokes ALL permissions from anon and authenticated roles.
-- Since we use Prisma (with postgres/service_role) for all database
-- operations, the Supabase PostgREST API is not needed.
--
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ============================================

-- Revoke ALL permissions from anon role (public/unauthenticated API access)
REVOKE ALL ON public.users FROM anon;
REVOKE ALL ON public.accounts FROM anon;
REVOKE ALL ON public.sessions FROM anon;
REVOKE ALL ON public.verification_tokens FROM anon;
REVOKE ALL ON public.brand_voices FROM anon;
REVOKE ALL ON public.reviews FROM anon;
REVOKE ALL ON public.review_responses FROM anon;
REVOKE ALL ON public.response_versions FROM anon;
REVOKE ALL ON public.credit_usage FROM anon;
REVOKE ALL ON public.sentiment_usage FROM anon;

-- Revoke ALL permissions from authenticated role (logged-in Supabase users)
REVOKE ALL ON public.users FROM authenticated;
REVOKE ALL ON public.accounts FROM authenticated;
REVOKE ALL ON public.sessions FROM authenticated;
REVOKE ALL ON public.verification_tokens FROM authenticated;
REVOKE ALL ON public.brand_voices FROM authenticated;
REVOKE ALL ON public.reviews FROM authenticated;
REVOKE ALL ON public.review_responses FROM authenticated;
REVOKE ALL ON public.response_versions FROM authenticated;
REVOKE ALL ON public.credit_usage FROM authenticated;
REVOKE ALL ON public.sentiment_usage FROM authenticated;

-- ============================================
-- Verification: Check current grants
-- ============================================
SELECT
  grantee,
  table_name,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated')
  AND table_name IN (
    'users', 'accounts', 'sessions', 'verification_tokens',
    'brand_voices', 'reviews', 'review_responses',
    'response_versions', 'credit_usage', 'sentiment_usage'
  )
ORDER BY table_name, grantee;

-- If the above query returns no rows, all tables are secured!

-- ============================================
-- Note: Prisma uses the postgres/service_role connection which
-- is NOT affected by these revokes. Your app will work normally.
-- ============================================
