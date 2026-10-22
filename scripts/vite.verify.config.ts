import { defineConfig } from 'vite'

/** Bundles a verification script for Node (resolves `import.meta.env`). */
export default defineConfig({
  logLevel: 'warn',
  build: {
    ssr: 'scripts/verify-exercise-defaults.ts',
    outDir: 'node_modules/.verify',
    emptyOutDir: true,
    rollupOptions: { output: { entryFileNames: 'verify-exercise-defaults.mjs' } },
  },
})
