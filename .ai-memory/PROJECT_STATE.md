# Project state (VERIFIED 2026-11-18)

T-20261118-006: corregida expansión del clima en escritorio con detalle flotante desde 1024 px y scroll interno; cabecera no crece. Móvil preservado. QA/build/tipos/lint PASS. [Sesión](sessions/2026-11/20261118-T-20261118-006-codex.md).

Actualización visual T-20261118-005: emergencias solo icono en círculo 48 px; clima pequeño en cabecera de Hoy, con detalle desplegable. Build/tipos/lint y QA desktop/móvil PASS. Ver [sesión](sessions/2026-11/20261118-T-20261118-005-codex.md).
Routes: / (hero + ScrollTrigger pinned map + live data), /muro(+nueva,[id]), /guia(+nuevo,[id], vista mapa), /oficios, /reclamos(+nuevo,[id]), /ideas(+nueva,[id]), /agenda (+/api/ics/[id]), /utiles, /perfil, /mas, /privacidad, /ingresar, /registro, /panel (reclamos, moderacion, usuarios, utiles), /api/fotos/[name], /manifest.webmanifest.
Motion: RevealProvider (data-reveal batch), HeroMotion, PinnedMap (pin+scrub), CountUp; all respect prefers-reduced-motion.
QA PASS (browser, local): login; claim create + municipio status/answer; claim 404 for other users; claim photos 200 author/municipio, 403 other/moderator, 401 visitor (no-store); post with photo (3000x2000 -> 1600x1067 WebP 11KB, no EXIF); comment; like; rating create/update (one per user), "Nuevo" under 3 ratings, owner cannot rate; 3 reports auto-hide + moderation panel dismiss restores; idea group link validation (rejects non-whatsapp, strips query), link visible only after joining; non-image upload error keeps typed fields; 23 pages at 375px no horizontal overflow.
Fixed during QA: mobile grid overflow (global min-width:0), Form method=post (no GET leak before hydration), guia detail mobile contact buttons, report list grouped per target, claim photo cache no-store.
NOT tested: reports on comments, claim rating, sales mark-sold/renew, role changes/suspend, pharmacy/phones admin forms, idea status change, real device, dark/light pass of every page. No automated tests.

## Actualización Codex — T-20261118-004 (2026-11-18)

- DONE: acceso global fijo a líneas de emergencia verificadas y mini clima en HoySection. Nuevos módulos `emergency.ts`, `weather-core.ts`, `weather.ts`, `/api/clima`, EmergencyButton y WeatherWidget.
- DONE: ajuste pequeño del encabezado para evitar desbordes móviles; diseño previo preservado.
- PASS: 12 pruebas automáticas de lógica/caché/fuentes con Node; la mención histórica «No automated tests» de arriba ya no aplica a esta ampliación.
- PASS: TypeScript, ESLint, build de producción, consulta real de los tres modelos, QA visual escritorio y móvil 390/360 px. Escape/Tab/foco y destinos tel comprobados; sin realizar llamadas.
- Límites: API gratis para uso no comercial, caché por proceso y datos estimados de modelos; no alertas oficiales automáticas ni estación local. Última comprobación opcional de clic fuera bloqueada por política del navegador; manejador implementado, no certificar esa interacción como probada.
- Sin cambios de DB, cuentas, datos ni paquetes. [Documentación](../docs/EMERGENCIAS_Y_CLIMA.md).

## Actualización 2026-11-18 (funciones del doc de Codex + diseño)
IMPLEMENTADO y probado en navegador: Hoy en Sampacho (vigencia por fecha, zona por cookie sin GPS, cancelar/corregir aviso con aviso a seguidores), Qué sigo + bandeja + campanita, Necesito (respuesta con ficha propia, unicidad, cierre doble idempotente, vencimiento por lectura), Resultados (solo cerrar vs publicar), reclamos (transiciones válidas, próxima actualización, versión/conflicto, notas internas ocultas al vecino, aviso real), incidentes (agrupar, actualización común todo-o-nada, desvincular), ideas (necesidades, compromisos con cupo transaccional, parcial, permisos solo municipio, cierre realizada/cancelada, enlace WhatsApp con host exacto).
De Codex (verificado compila y convive): botón de emergencias (src/components/site/EmergencyButton.tsx, lib/emergency.ts) y clima ECMWF/GFS/ICON (lib/weather*.ts, /api/clima, components/weather). Doc: docs/EMERGENCIAS_Y_CLIMA.md.
NO implementado / pendiente: email y push, worker/outbox, claves de idempotencia, feature flags, horario de descanso aplicado (solo se guarda), Playwright/Vitest (solo node --test del clima), edición de comentarios/pedidos, moderación de respuestas a pedidos, rate limit de seguir.
NO probado: bulk "resolver vinculados", desvincular, permisos municipio, cancelar idea, renovar pedido, retirar respuesta/compromiso, build de producción tras los cambios de Codex (dev server ajeno en :3000 usa web/.next).

## Segunda tanda (2026-11-18, Claude)
Implementado y probado en navegador: encuestas (voto único, envíos simultáneos, cierre), alertas (urgentes inmediatas a todos o a una zona, banner en Hoy, push diferido en horario de descanso, un fallo de envío no rompe nada), residuos (cronograma, bloque en Hoy, recordatorio solo a quien sigue), empleo, turismo, destacado (postulación, regla de 4 semanas, elección automática), transparencia (sin datos personales). 15 pantallas nuevas sin desborde a 375 px.
NO verificado: entrega real de push a un teléfono; service worker y modo sin conexión (solo se registra en producción; sw.js solo con node --check); build de producción (un dev server ajeno usa web/.next); iPhone.
Pendiente: pruebas automáticas, límites de uso en encuestas y empleo, editar avisos de empleo.

## Seed y producción (2026-11-18)
Seed completo verificado en una base aparte: 108 páginas sin error como municipio; estados y permisos por rol confirmados (suspendida no entra; moderador sin acceso a reclamos; fotos de reclamos 200 autora/municipio, 403 otros, 401 visitante). Guía: docs/SEED_Y_PRODUCCION.md.
Requisito de hosting: SQLite + fotos en disco necesitan disco PERSISTENTE (no serverless). Sin commit ni push de estos cambios todavía.
