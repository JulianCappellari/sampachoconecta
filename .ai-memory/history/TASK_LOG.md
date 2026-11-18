# Task Log

| Task ID | Date | Agent | Prompt IDs | Status | Changed paths | Validation | Session |
|---|---|---|---|---|---|---|---|
| T-20261118-001 | 2026-11-18 | Claude Code | P-20261118-001, P-20261118-002 | DONE (design) | web/ (scaffold), docs/diseno-sistema.html, .ai-memory/ | NOT_RUN (no code) | — |
| T-20261118-002 | 2026-11-18 America/Buenos_Aires | Codex | P-20261118-003 | DONE (documentación) | docs/IMPLEMENTACION_FUNCIONES_COMUNITARIAS_CLAUDE.md; memoria de esta tarea; sin editar web/ | PASS cobertura, IDs, enlaces y estructura de memoria; NOT_RUN aplicación/render Mermaid | [sesión](../sessions/2026-11/20261118-T-20261118-002-codex.md) |
| T-20261118-002 | 2026-11-18 | Claude Code | P-20261118-003 | DONE (Fase 1 MVP) | web/** (src/lib, src/actions, src/app, src/components, scripts, next.config.ts, README), .claude/launch.json | tsc PASS, eslint PASS, build PASS, manual QA PARTIAL (see PROJECT_STATE) | — |
| T-20261118-003 | 2026-11-18 | Claude Code | P-20261118-004 | DONE | web/src/components/ui/Form.tsx, web/src/app/guia/[id]/page.tsx, web/src/app/api/fotos/[name]/route.ts, web/src/lib/data.ts | browser QA PASS, tsc/eslint/build PASS | — |
| T-20261118-004 | 2026-11-18 America/Buenos_Aires | Codex | P-20261118-005 | DONE | Emergencias, clima/core/API/widget/test; integración layout/Hoy/Header/CSS; docs y memoria; sin DB/dependencias | 12 tests PASS, tsc/lint/build PASS, 3 modelos reales y QA desktop/móvil; clic fuera manual no certificado | [sesión](../sessions/2026-11/20261118-T-20261118-004-codex.md) |
| T-20261118-005 | 2026-11-18 America/Buenos_Aires | Codex | P-20261118-006 | DONE | EmergencyButton, WeatherWidget, HoySection; docs y memoria | build/tsc/lint PASS; QA desktop/móvil, panel, detalle y ausencia de overflow PASS | [sesión](../sessions/2026-11/20261118-T-20261118-005-codex.md) |
| T-20261118-006 | 2026-11-18 America/Buenos_Aires | Codex | P-20261118-007 | DONE | WeatherWidget/HoySection; documentación y memoria | build/tsc/lint PASS; cabecera no crece desktop 1280/1440 y móvil mantiene detalle en flujo | [sesión](../sessions/2026-11/20261118-T-20261118-006-codex.md) |
| T-20261118-004 | 2026-11-18 | Claude Code | P-20261118-005/006 | DONE (con pendientes) | web/src/lib/{db,notify,hoy,pedidos,incidents,ideas}.ts, web/src/actions/{avisos,seguir,pedidos,resultados,incidentes,recursos,reclamos}.ts, web/src/app/{necesito,resultados,siguiendo,notificaciones,panel/incidentes}, web/src/components/{hoy,motion,resultados,ideas} | tsc/eslint PASS; node --test weather PASS (12); browser QA PASS parcial; build NO corrido tras cambios de Codex (puerto 3000 ocupado por otro next dev) | — |
| T-20261118-005 | 2026-11-18 | Claude Code | P-20261118-007 | DONE | web/src/lib/db.ts (migración 3), web/src/actions/moderacion.ts, web/src/app/panel/contenido, web/src/lib/data.ts, panel/layout.tsx | tsc/eslint PASS; browser QA PASS | — |
| T-20261118-010 | 2026-11-18 | Claude Code | P-20261118-010 | DONE | web/src/lib/{polls,waste,waste-labels,jobs,tourism,featured,transparency,push}.ts, web/src/actions/{encuestas,alertas,operacion,empleo,push}.ts, web/src/app/{encuestas,residuos,empleo,visitar,transparencia,offline,panel/alertas,panel/residuos,panel/turismo,panel/destacados}, web/public/sw.js, db.ts migracion 4 | tsc/eslint PASS; browser QA PASS; build prod NO corrido | — |
| T-20261118-011 | 2026-11-18 | Claude Code | P-20261118-011 | DONE | web/src/lib/seed.ts, web/src/lib/db.ts, web/scripts/seed.mts, web/scripts/create-admin.mts, web/package.json (tsx), docs/SEED_Y_PRODUCCION.md, web/README.md | tsc/eslint/build PASS; seed cargado y recorrido (108 páginas OK) en base aparte | — |
- T-20261118-012: despliegue Oracle. Archivos: web/Dockerfile, web/.dockerignore, web/scripts/backup.mjs, web/src/app/api/salud/route.ts, web/next.config.ts, deploy/*, docs/DESPLIEGUE_ORACLE.md, .gitignore. Prueba local Docker OK. Pendiente: tsc/lint/build, commit y push (si el usuario lo pide).


## Codex — migración Vercel / Neon

| Task ID | Date | Agent | Prompt IDs | Status | Changed paths | Validation | Session |
|---|---|---|---|---|---|---|---|
| T-20261118-013 | 2026-11-18 America/Buenos_Aires | Codex | P-20261118-013/014 | Implementación DONE; validación global PARTIAL | web/src, scripts, pg/Blob/config/tests; docs Vercel/QA; Oracle retirado; memoria | PASS tsc/lint/build/start, 25 casos, CLI, 492 lecturas, 200 acciones, audit 0, salud/autoseed. Manual amplia; proveedores/dispositivos reales y variantes NOT_RUN. Commits a8728da y 21ff8f1, sin push/deploy | [sesión](../sessions/2026-11/20261118-T-20261118-013-codex.md) |
