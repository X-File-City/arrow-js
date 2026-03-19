import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: [
      {
        find: '@src',
        replacement: path.resolve(__dirname, 'packages/core/src'),
      },
      {
        find: '@arrow-js/core/internal',
        replacement: path.resolve(__dirname, 'packages/core/src/internal.ts'),
      },
      {
        find: '@arrow-js/core',
        replacement: path.resolve(__dirname, 'packages/core/src/index.ts'),
      },
      {
        find: '@arrow-js/framework/internal',
        replacement: path.resolve(__dirname, 'packages/framework/src/internal.ts'),
      },
      {
        find: '@arrow-js/framework/ssr',
        replacement: path.resolve(__dirname, 'packages/framework/src/ssr.ts'),
      },
      {
        find: '@arrow-js/framework',
        replacement: path.resolve(__dirname, 'packages/framework/src/index.ts'),
      },
      {
        find: '@arrow-js/ssr',
        replacement: path.resolve(__dirname, 'packages/ssr/src/index.ts'),
      },
      {
        find: '@arrow-js/hydrate',
        replacement: path.resolve(__dirname, 'packages/hydrate/src/index.ts'),
      },
      {
        find: '@arrow-js/highlight',
        replacement: path.resolve(__dirname, 'packages/highlight/src/index.ts'),
      },
      {
        find: '@arrow-js/sandbox',
        replacement: path.resolve(__dirname, 'packages/sandbox/src/index.ts'),
      },
      {
        find: '@arrow-js/compiler',
        replacement: path.resolve(__dirname, 'packages/compiler/src/index.ts'),
      },
      {
        find: '@arrow-js/vite-plugin-arrow',
        replacement: path.resolve(__dirname, 'packages/vite-plugin-arrow/src/index.js'),
      },
    ],
  },
  test: {
    environment: 'jsdom',
    include: ['packages/**/*.spec.ts', 'tests/**/*.spec.ts'],
    exclude: ['tests/e2e/**', '**/node_modules/**'],
  },
})
