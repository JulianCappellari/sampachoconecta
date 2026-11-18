# Active task

- Task: T-20261118-013. Prompts: P-20261118-013 y P-20261118-014. Agent: Codex.
- Updated: 2026-11-18, America/Buenos_Aires.
- Status: PARTIAL de validación global. Implementación, documentación y comprobaciones locales terminadas; algunas variantes manuales y servicios/dispositivos reales NOT_RUN. No confundir con fallo de los checks locales.
- Repo: raíz Git, main. Código/tests/config: a8728da; guía/QA/retiro Oracle: 21ff8f1. Solo faltaba guardar este checkpoint en un commit de memoria al redactarlo. Sin push ni deploy.

## Completado y verificado

- pg async en toda la cadena, migraciones 1–4 con UTC/CITEXT/identidades y protección DELETE/TRUNCATE de reclamos; tx ALS/savepoints/serializable/reintentos; lint tipado.
- Seed 19 cuentas, reset con confirmación, create-admin e importación SQLite sintética; cierre del pool. SQLite y fotos anteriores intactos.
- Blob PRIVADO y fallback solo local; compresión previa al envío. after fuera de tx; caché offline anónima; límite de ingreso compartido; etiquetas de campos corregidas sin rediseño.
- PASS: tsc, lint, build + start, 25 casos lógicos, CLI, 492 lecturas y 200 acciones HTTP, auditoría npm cero. Salud 200/503, autoseed desarrollo 19 / producción 0.
- QA manual amplia por roles y módulos: fotos, reclamos/notas/conflicto, incidentes, guía/opiniones, ideas, pedidos, empleo, encuestas, moderación y operación municipal. Evidencia precisa en [QA](../docs/QA_VERCEL_NEON.md).
- Preparación Oracle eliminada y [guía Vercel](../docs/DESPLIEGUE_VERCEL.md) escrita. Capturas verificadas en docs/qa/.

## Pendiente y siguiente acción segura

- Revisar commits y guía; completar variantes manuales no recorridas y pruebas físicas/lectores de pantalla.
- Responsables deben elegir plan elegible y recursos separados de prueba/producción. Antes de abrir el sitio: comprobar Vercel/Neon/Blob privado reales, TLS/pooled/subidas/límites, privacidad y backup/restauración; push real y PWA en teléfono.
- No crear cuentas externas, desplegar ni hacer push sin un pedido nuevo. No borrar datos reales para reemplazarlos por seed.
- La cuenta pública sigue verificándose de inmediato; email/celular externo pendiente. Push/avisos diferidos sin cola/cron durable.
- Servicios temporales propios detenidos y puertos 3138/3140 liberados. Contenedor sampacho-codex-pg detenido, conservado con datos sintéticos; otros contenedores/servidores ajenos intactos.
- [Sesión y checkpoints](sessions/2026-11/20261118-T-20261118-013-codex.md).
