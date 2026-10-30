import { defineConfig } from 'vite'

/** Bundles the fitness-tips merge checks for Node (resolves `import.meta.env`). */
export default defineConfig({
  logLevel: 'warn',
  build: {
    ssr: 'scripts/verify-fitness-tips.ts',
    outDir: 'node_modules/.verify-tips',
    emptyOutDir: true,
    rollupOptions: { output: { entryFileNames: 'verify-fitness-tips.mjs' } },
  },
})
