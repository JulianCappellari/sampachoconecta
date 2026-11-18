# Project Context — Sampacho Conecta

- Memory schema: 2.0
- Updated: 2026-11-18, America/Buenos_Aires. Last agent: Codex, T-20261118-013.
- Repo Git en la RAÍZ, rama main. Implementación local: a8728da; guía/QA: 21ff8f1. No push ni deploy. Las afirmaciones históricas sobre un repo anidado y SQLite activo están obsoletas.
- Estado: implementación y preparación Vercel/Neon verificadas localmente; QA manual amplia pero no exhaustiva; proveedores/dispositivos reales NOT_RUN. [Tarea](ACTIVE_TASK.md), [handoff](handoffs/LATEST_HANDOFF.md).

## Producto y prioridades

Plataforma por y para Sampacho: novedades, comercios y oficios, reclamos privados a la municipalidad, información útil e iniciativas vecinales. Participación municipal desde el inicio. Prioridad inicial: guía/oficios, novedades e información útil. Diseño y funcionalidades previas de Claude preservados.

## Stack verificado

Node 24.21; Next 16.4.6 App Router y Server Actions; React 19.3; Tailwind 4.3.3; pg/Postgres 18; Blob privado y sharp; Zod; Leaflet/OpenStreetMap; GSAP/Lenis/Motion; sesiones scrypt propias. No ORM ni Supabase Auth introducidos.

- all/one/run/tx ahora son async. [Arquitectura](architecture/SYSTEM.md), [base](architecture/DATABASE.md).
- web/src/lib/schema.ts conserva migraciones 1–4; db.ts maneja pg/ALS y sql.ts la compatibilidad UTC. No SQLite en runtime; solo importador/test CLI de transición.
- Fotos privadas en Blob; bytes por API, reclamos con autorización y no-store. Compresión previa en navegador; 4 MB de límite Next. Fallback de disco solo local.
- Push existe como mejor esfuerzo con after; no cron/cola durable, entrega real no verificada. Verificación externa de email/celular pendiente.

## Ejecutar y comprobar

Desde web/: npm ci; configurar .env.local con DATABASE_URL; Postgres 18 local mediante docker-compose.dev.yml; npm run db:migrate; npm run seed; npm run dev. Guía completa en [DESPLIEGUE_VERCEL](../docs/DESPLIEGUE_VERCEL.md). No reemplazar archivos de entorno existentes ni guardar secretos en memoria.

Checks PASS: tsc, ESLint tipado, build + start, 25 casos lógicos de DB/fotos/clima, CLI completa, 492 lecturas por roles y 200 llamadas de acciones (79 exportaciones; 78 circuitos válidos, savePush real excluido). Auditoría npm: cero vulnerabilidades tras override compatible de Zod transitivo. [Evidencia y límites](../docs/QA_VERCEL_NEON.md).

## Invariantes que preservar

- Reclamos y fotos: solo autor/municipio, 404 ajeno; moderación no obtiene acceso municipal. Historial interno oculto al vecino. DELETE y TRUNCATE bloqueados en operación normal.
- Cupos/versiones se validan en transacción; notificaciones, votos y opiniones con unicidad. Consultas secuenciales dentro de tx; after no hereda un cliente liberado.
- Sin autoseed en producción. Reset explícito es destructivo y no debe tocar datos reales. Datos, fotos, dumps y .env gitignored.
- Zona sin GPS, WhatsApp solo enlaces validados, transparencia agregada. Fuentes meteorológicas no equivalen a mediciones ni alertas oficiales.
- Preferencia visual: emergencias solo icono, clima pequeño/secundario, detalle desktop flotante para no estirar cabecera. Mantener corrección de etiquetas de formularios repetidos (Fields, asociación implícita).

## Próximo paso seguro

Revisar los commits locales y la guía. Antes de publicar: responsables eligen plan elegible y recursos separados para pruebas/producción; configurar Neon/Blob privado/Vercel, verificar TLS/pooled/subidas reales, privacidad y restauración, completar variantes manuales/dispositivos y push. No publicar ni crear cuentas sin un pedido nuevo. El SQLite y uploads previos están intactos.
