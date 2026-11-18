# Latest handoff

## Corrección desktop — Codex T-20261118-006 / P-20261118-007
- 2026-11-18, America/Buenos_Aires. DONE.
- El usuario mostró captura de la cabecera estirada por el pronóstico abierto. Móvil estaba bien y se preservó.
- WeatherWidget: detalle absoluto desde 1024 px, 416 px de ancho y hasta 50dvh de alto, scroll interno, Escape y salida de foco para cerrar. HoySection: stacking de cabecera solo desktop.
- QA PASS: desktop 1280/1440 mantiene alturas de tarjeta/cabecera al abrir; móvil 390 usa flujo normal sin overflow. Build/tipos/lint PASS; servicio y datos intactos.
- [Sesión](../sessions/2026-11/20261118-T-20261118-006-codex.md). Siguiente acción: revisión del usuario.

## Último ajuste — Codex T-20261118-005 / P-20261118-006
- 2026-11-18, America/Buenos_Aires. DONE.
- Preferencia explícita: emergencias solo icono, clima minimalista/pequeño/secundario.
- Cambios en EmergencyButton (círculo 48 px y aria-label), WeatherWidget (resumen compacto y detalle), HoySection (clima en cabecera secundaria).
- Estado cerrado medido: 288×149 px desktop; 343×149 px móvil 390 px. Fuentes, servicio meteorológico y contactos intactos.
- PASS build/tsc/lint; QA desktop/móvil, detalle, panel/Escape y sin overflow. Sin nuevas pruebas para presentación ni repetición de lógica sin cambios.
- [Sesión](../sessions/2026-11/20261118-T-20261118-005-codex.md). Siguiente acción: revisión del usuario; preservar este menor protagonismo del clima.

## Codex → Claude / siguiente agente — 18/11/2026
- Task: T-20261118-004 / Prompt: P-20261118-005. Status: DONE.
- Implementado acceso global de emergencias y clima multimodelo manteniendo la línea visual y arquitectura existentes.
- Leer [EMERGENCIAS_Y_CLIMA.md](../../docs/EMERGENCIAS_Y_CLIMA.md), [sesión](../sessions/2026-11/20261118-T-20261118-004-codex.md).
- Nuevos: `web/src/lib/emergency.ts`, `weather-core.ts`, `weather.ts`; `web/src/components/site/EmergencyButton.tsx`, `web/src/components/weather/WeatherWidget.tsx`; `web/src/app/api/clima/route.ts`; `web/scripts/weather.test.mjs`.
- Integraciones mínimas en layout, HoySection, globals.css y Header; README enlaza operación. Preservar el trabajo previo de Claude en todos esos archivos.
- Modelos ECMWF/NOAA/DWD distribuidos por Open-Meteo; consulta/caché 10 min, timeout 7 s, fallback hasta 2 h marcado anterior, sin simular datos ni pedir GPS. Una fuente sola se identifica; coincidencia no es probabilidad.
- Emergencias 107/100/101 verificadas en fuente municipal citada en documento; destinos tel, no llamadas automáticas.
- Verificación PASS: 12 tests Node, tsc, eslint, build, HTTP 200 de /api/clima con 3 modelos, desktop y móvil 390/360 px, Escape/Tab/foco. Último chequeo opcional de clic fuera bloqueado por política del navegador; no contarlo como PASS. Viewport restaurado.
- Build inicialmente falló en worker CSS de Turbopack; se movieron únicamente caches generadas a `.next/cache/turbopack-before-codex-T004` y `.next/build-before-codex-T004`; recompilación limpia PASS. No se cambió configuración ni se borraron datos.
- Branch/HEAD: web/master, `80453f6`, cambios previos y propios sin commit. No hubo deploy ni push.
- Siguiente acción: revisión del usuario; para producción revisar términos no comerciales y caché compartida si hay múltiples instancias. No hay migraciones requeridas.

## Handoff histórico previo de Claude
- From agent: Claude Code (claude-sonnet-5-5)  | Timestamp: 2026-11-18
- Branch/HEAD: root not git; web/ own repo, uncommitted
- Active task: T-20261118-002 (DONE, Fase 1)
- Verified: `cd web && npm run build` OK; app runs at :3000 via `.claude/launch.json` preview; data/ was deleted so next start reseeds demo data.
- Unfinished/unverified: see PROJECT_STATE.md "NOT tested"; no automated tests (Vitest/Playwright planned).
- Gotchas: global CSS edits sometimes need dev server restart (Turbopack+Tailwind loader cache); httpOnly cookie cannot be overwritten from JS in QA; qa session rows were created in the deleted DB only.
- Next: see ACTIVE_TASK.md. Required docs: ../PROJECT_CONTEXT.md, ../PROJECT_STATE.md, web/README.md
