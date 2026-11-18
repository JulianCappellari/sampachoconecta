# Project Context — Sampacho Conecta
- Memory schema: 2.0
- Updated: 2026-11-18
- Last agent: Codex (T-20261118-006, detalle desktop de clima; conservar trabajo previo de Claude)
- Branch/HEAD: root is NOT a git repo; `web/` has its own git repo from create-next-app (no commits made)
- Evidence freshness: VERIFIED 2026-11-18 (tsc, eslint, `next build` pass; manual browser QA)

## Purpose and scope
Community platform for Sampacho (Córdoba, AR). Spec: `docs/diseno-sistema.html` (also artifact https://claude.ai/artifact/AZKQEFHNo7Gnmxybfin5vf).

## Current implementation status
Fase 1 MVP IMPLEMENTED in `web/` (see PROJECT_STATE.md). Not implemented: email verification, push, service worker/offline, listing edit, surveys, Fase 3 modules.

## Confirmed stack, versions, commands
- VERIFIED: Node 24.21, Next 16.4.6 (cacheComponents DISABLED on purpose), React 19.3, Tailwind 4.3, gsap + @gsap/react (ScrollTrigger), zod, leaflet, lucide-react, sharp, built-in `node:sqlite`.
- Commands (in `web/`): `npm run dev|build|lint`, `npx tsc --noEmit`, `node scripts/make-icons.mjs`.
- Dev preview config: `.claude/launch.json` at project root (`npm --prefix web run dev`, port 3000).
- DB auto-created at `web/data/sampacho.db` + seed (demo accounts in `src/lib/seed.ts`, password from SEED_PASSWORD env or seed default). Delete `web/data` to reset.

## Architecture and navigation
Modular monolith. `src/lib/{db,auth,data,uploads,format,seed}.ts`, `src/actions/*` (Server Actions, Zod + server-side authz), `src/app/*` routes, `src/components/{ui,site,motion,maps,muro,guia,ideas}`. See architecture/SYSTEM.md.

## Critical security and business invariants
RN-01..RN-12 in business/RULES.md. Implemented: RN-01 (claims 404 for non-owner, claim photos gated in /api/fotos), RN-02/03/04, RN-05 (3 reports hide), RN-06 (30d sales), RN-08/09, RN-10/11. RN-12 relaxed in prototype (accounts auto-verified).

## Active work
See ACTIVE_TASK.md.

## Latest implemented extension — VERIFIED 2026-11-18
- T-20261118-006 DONE: desde 1024 px, detalle de clima flotante de 416 px con scroll, sin aumentar altura de la cabecera. Móvil conserva detalle inline. QA 1280/1440/390, build/tipos/lint PASS. [Sesión](sessions/2026-11/20261118-T-20261118-006-codex.md).
- T-20261118-005 DONE: usuario pidió icono sin palabra en emergencias y clima secundario. Botón circular 48 px con aria-label; clima cerrado de ~149 px de alto en cabecera, comparación completa bajo «Ver pronóstico». Build/tipos/lint y QA desktop/móvil PASS; lógica y fuentes sin cambios. [Sesión](sessions/2026-11/20261118-T-20261118-005-codex.md).
- T-20261118-004 / P-20261118-005 DONE: botón fijo global de emergencias (Hospital 107, Bomberos 100, Policía 101), fuente municipal comprobada; enlaces `tel:` y desplegable accesible.
- Widget de clima en HoySection: ECMWF/GFS/ICON vía Open-Meteo, `/api/clima`, síntesis determinista, consulta cada 10 min, caché pública por proceso, recuperación parcial y antigüedad máxima 2 h. Pronósticos, no mediciones en vivo.
- 12 pruebas `node --test scripts/weather.test.mjs` PASS; tipos/lint/build PASS. QA desktop y móvil 390/360 px; no llamadas reales ni publicación externa.
- [Operación y fuentes](../docs/EMERGENCIAS_Y_CLIMA.md), [sesión](sessions/2026-11/20261118-T-20261118-004-codex.md). No nuevas dependencias ni migraciones.
## Recent tasks and next actions
See history/TASK_LOG.md, handoffs/LATEST_HANDOFF.md.
## Unknowns, risks and freshness
- Project lives in OneDrive (node_modules sync is slow) — consider moving to C:\dev.
- Municipality buy-in (who answers claims / moderates) UNKNOWN.
- node:sqlite is experimental in Node 24; fine for prototype, migrate to PostgreSQL for production.
