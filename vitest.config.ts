import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    // Run test files sequentially in a single thread to prevent
    // @vitejs/plugin-react config collisions across parallel jsdom workers
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: [
        'src/components/ui/**',
        'node_modules/**',
        'tests/**',
        '*.config.*',
        'prisma/**',
        'scripts/**',
        'docs/**',
      ],
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 60,
        lines: 70,
      },
    },
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
