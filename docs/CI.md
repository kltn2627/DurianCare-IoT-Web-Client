# CI — DurianCare IoT Web Client

Workflow: `.github/workflows/ci.yml` ("Web CI").

- Runs on pull requests into `dev`/`main`, pushes to `dev`/`main`, and manually. Older runs for the same PR/branch are cancelled.
- Token permissions: `contents: read`; no secrets.
- Steps (Node 24, `npm ci`): `npm run lint` → `npx next typegen` (route types; `.next` is not committed) →
  `npm run typecheck` → `npm test -- --ci` (Jest) → `npm run build`.
- Local fresh-clone run (2026-10-19): lint 0 errors (8 warnings), typecheck OK, Jest 124/124, build OK.
- Not covered: browser/E2E tests against a running backend.
- Suggested required check for `dev` and `main`: `Lint, typecheck, test and build`.
- No deployment (CD) is configured.
