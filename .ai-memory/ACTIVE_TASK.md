# Active task

## Codex — T-20261118-006 / P-20261118-007
- 2026-11-18, America/Buenos_Aires. Status: DONE.
- Corregir expansión del clima en desktop manteniendo móvil. Detalle fuera de flujo desde 1024 px; validar altura de cabecera antes/después.
- PASS: QA desktop 1280/1440 y móvil 390; tarjeta/cabecera desktop conservan 149/265 px al abrir; panel 416 px con scroll. Build/tipos/lint PASS. Sin cambios de datos ni nuevos tests para presentación.
- [Sesión](sessions/2026-11/20261118-T-20261118-006-codex.md).

## Codex — T-20261118-005 / P-20261118-006
- Updated: 2026-11-18, America/Buenos_Aires. Status: DONE.
- Objetivo: botón fijo solo con icono y clima compacto/secundario, conservando accesibilidad y datos.
- Checkpoint final: botón circular solo icono con nombre accesible; clima 288 px desktop y 149 px de alto cerrado, en cabecera secundaria; detalle opcional preservado.
- PASS: build, tipos, lint; QA visual desktop/móvil 390 px, detalles y panel/Escape; sin desborde horizontal. Sin cambios de lógica meteorológica ni tests nuevos por cambio de presentación.
- Sesión: [registro](sessions/2026-11/20261118-T-20261118-005-codex.md).

## Historial anterior
- Status: DONE (Fase 1) — awaiting user feedback
- Task ID: T-20261118-002
- Prompt IDs: P-20261118-003
- Agent/model: Claude Code / claude-sonnet-5-5
- Updated: 2026-11-18
- Goal: full site with all pages/functions, GSAP ScrollTrigger animation, responsive.
- Verified: build/tsc/eslint pass; claim flow + municipio response + privacy 404 + no mobile overflow.
- Exact next safe action: user review. Then (a) QA remaining flows (photo upload, posting, rating, reports), (b) email verification + service worker, (c) Supabase/PostgreSQL migration.

## Codex — T-20261118-004 / P-20261118-005
- Updated: 2026-11-18, America/Buenos_Aires. Status: DONE.
- Scope autorizado: implementar acceso global fijo a emergencias y widget climático multimodelo manteniendo diseño/arquitectura existentes.
- Checkpoint final: botón global y clima multimodelo integrados; 12 pruebas de lógica PASS, TypeScript/lint/build PASS. QA desktop y móvil 390/360 px realizada; Escape/Tab/foco y enlaces tel verificados sin llamar. Sin migraciones ni cambios de datos.
- Siguiente acción: revisión del usuario. Para continuar, leer [fuentes, operación y pruebas](../docs/EMERGENCIAS_Y_CLIMA.md). No tratar pronósticos de modelos como mediciones de estación.
- Preservar cambios existentes de Claude. Registro: [sesión](sessions/2026-11/20261118-T-20261118-004-codex.md).
