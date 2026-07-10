import { defineConfig } from 'tsup'

// Two entrypoints → dist/api.js + dist/worker.js, matching the NixOS package
// wrapper in ../infra/modules/zoomez-app.nix. Deps stay external (installed in
// node_modules at runtime, per buildNpmPackage).
export default defineConfig({
  entry: ['src/api.ts', 'src/worker.ts', 'src/migrate.ts', 'src/db/seed.ts'],
  format: ['esm'],
  target: 'node22',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  dts: false,
  // PGlite ships runtime WASM/.data assets that break when inlined — keep it
  // external so it loads from node_modules. (Prod uses the `pg` driver; PGlite
  // is a devDependency for local/test only.)
  external: ['@electric-sql/pglite'],
})
