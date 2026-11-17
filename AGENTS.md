# Madar engineering rules

- Read `docs/PHASE-1-SPEC.md`, `docs/ARCHITECTURE.md` and current acceptance notes before changing scope.
- Phase 1 is a local foundation. No paid provisioning, production deployment, real notifications or unapproved source activation is implicit.
- Keep source provenance and rights policy on every record. Never present fixture data or algorithmic extraction as verified news.
- Fetch only configured approved sources. Do not weaken HTTPS/domain/DNS/size/time controls to make an integration pass.
- All retries must be idempotent. Preserve article revisions; a changed headline is not automatically a new factual development.
- One writer per file; no automatic nested delegation. Use the actual available model, report an unavailable requested model.
- Run `pnpm check` and `pnpm test:integration` for backend/schema changes. Never aim integration tests at a database you do not own.
- SQL migrations are append-only once used outside local development. No destructive resets in normal setup.
- Secrets belong in ignored `.env` or a secret store. Do not log authorization values, database credentials, or feed query tokens.
- Arabic RTL UI, explicit empty/error states, local fonts, accessible controls. Keep the visual prototype separate from live data.
- Document actual evidence and remaining limits in `docs/ACCEPTANCE.md`; do not claim cloud/container validation without running it.
