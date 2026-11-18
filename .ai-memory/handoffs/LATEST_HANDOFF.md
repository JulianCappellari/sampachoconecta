# Latest handoff — Vercel / Neon

- Codex → Claude / siguiente agente. Updated: 2026-11-18, America/Buenos_Aires.
- Task T-20261118-013; prompts P-20261118-013/014. Estado: implementación y QA local terminadas; validación global PARTIAL (ver NOT_RUN). No prometer producción certificada.
- Git está en la RAÍZ, rama main. Commits de trabajo: a8728da (implementación/tests), 21ff8f1 (guía/QA/Oracle). Este handoff se guarda en un tercer commit de memoria. Verificar git status/log al retomar.

## Leer primero

- [Contexto actual](../PROJECT_CONTEXT.md), [tarea](../ACTIVE_TASK.md), [sesión](../sessions/2026-11/20261118-T-20261118-013-codex.md).
- [Despliegue desde cero](../../docs/DESPLIEGUE_VERCEL.md), [QA y límites](../../docs/QA_VERCEL_NEON.md).
- [Datos](../architecture/DATABASE.md), [arquitectura](../architecture/SYSTEM.md), [permisos](../business/PERMISSIONS.md).

## Resultado técnico

- Postgres 18 por pg/DATABASE_URL, API all/one/run/tx async y toda la cadena convertida. Migraciones 1–4 conservadas en schema.ts; compatibilidad SQL UTC en sql.ts. Pool 5, advisory de migración, ALS/savepoints, serializable/reintentos. DELETE/TRUNCATE de reclamos e historial bloqueados; reset administrativo solo con permiso SET LOCAL transaccional.
- Seed completo, scripts env/migrate/create-admin/seed e importador SQLite de transición. No se importó ni borró el SQLite original. No hay SQLite en runtime.
- Store Blob PRIVADO para TODAS las fotos: el access:public del prompt no preservaría privacidad real. Proxy público con caché para fotos p/l/i; c solo autor/municipio, no-store también en errores. Sin token en Vercel falla cerrado, nunca escribe en disco.
- Cliente comprime antes de enviar; presupuesto 3,8 MB, hasta 750 KB/foto; Next 4 MB; servidor vuelve a validar y convierte a WebP sin EXIF.
- Ajustes verificados por concurrencia: cupos, ediciones, respuestas y notificaciones; login compartido; after fuera del cliente de tx liberado. SW cachea solo páginas anónimas autorizadas por proxy. Campos con etiquetas implícitas evitan colisiones de id sin añadir JS ni cambiar la estética.
- Región preparada gru1; cambiar a iad1 si Neon São Paulo no está disponible al crear cuenta. Revisar términos no comerciales de Hobby; decisión del responsable. Oracle/Docker productivo retirado; compose solo para desarrollo.

## Validación real

- PASS: tsc, ESLint tipado sin warnings nuevos, next build + next start con Postgres local.
- PASS: 25 casos lógicos (10 DB, 3 archivos, 12 clima); Node cuenta además dos suites padre. CLI en base aparte: seed/reset/admin/importación/secuencias/origen intacto.
- PASS último build: 492 GET por cinco roles y autor de foto, 200 llamadas de acciones; 79 exportaciones sin sesión, 78 circuitos válidos. savePush real excluido.
- PASS: conflictos simultáneos de avisos/reclamos y cupos, privacidad de notas/fotos, idempotencia, autoseed dev 19/prod 0, salud 200 y 503 no-store. npm audit cero tras override compatible Zod transitivo.
- Manual amplia, NO exhaustiva de todas las variantes; tabla exacta y capturas en QA. IAB se trabó transitoriamente en confirmación, luego se recuperó. La corrección de Farmacia se volvió a probar por etiqueta y DB. Sin errores de consola en la última captura.
- NOT_RUN: Vercel/Neon/Blob reales, entrega push/PWA física/iOS/offline real, backup/restauración externa, lectores de pantalla y todas las variantes manuales. Correo/verificación de identidad siguen pendientes, sin cola durable/cron.

## Estado del entorno y próximo paso

- Sin push, deploy ni cuentas externas. No se usaron recursos reales de Neon/Blob ni dispositivos push; push_subscriptions tenía cero filas.
- Servidores QA propios detenidos (3138/3140 libres); contenedor sampacho-codex-pg detenido con datos sintéticos conservados. No tocar contenedores ni servidor de otros proyectos. No se editó .env.local existente.
- Para repetir: configurar Postgres local y variables privadas propias siguiendo la guía. Tests DB/rutas/acciones exigen host local y nombre terminado _test; CLI otra base vacía _cli_test y hace resets. El servidor y manifiesto de test:actions deben ser del mismo build.
- Siguiente acción segura: revisión humana del diff/guía y completar los NOT_RUN en un entorno de prueba autorizado. No publicar ni resetear producción por inferencia.
