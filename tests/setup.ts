import '@testing-library/jest-dom';

// Set default environment variables for tests (prevents failures in CI)
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
process.env.AUTH_SECRET = process.env.AUTH_SECRET || 'test-secret-for-vitest-unit-tests';
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-secret-for-vitest-unit-tests';
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 'test-resend-api-key';
