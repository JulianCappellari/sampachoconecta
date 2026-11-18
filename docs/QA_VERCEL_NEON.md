# QA de la migración a Postgres (Vercel + Neon)

Revisión del 18/11/2026 sobre la migración de SQLite a Postgres. Se ejecutó todo contra un **Postgres 18 local** (Docker), con bases descartables creadas para la revisión. **No se probó contra Neon, Vercel ni Vercel Blob reales.**

## Verificado

| Qué | Resultado |
|---|---|
| `npx tsc --noEmit` | Sin errores |
| `npx eslint .` (con reglas tipadas contra promesas sin esperar) | Sin errores |
| `npm run build` | Compila completo |
| `npm run test` (clima 12 + fotos 4) | 16/16 |
| `npm run test:db` (con seed cargado en una base `_test`) | 11/11: migraciones repetibles, fechas UTC, `datetime`/`julianday`, transacciones y savepoints, `INSERT OR IGNORE`, **reclamos inborrables (DELETE y TRUNCATE)**, notificaciones idempotentes, concurrencia sin pérdida de actualizaciones, límite de ingresos, upsert de respuestas |
| `npm run test:routes` (servidor de producción + Postgres) | 325 lecturas con cinco roles (visitante, vecino, moderación, municipio, suspendido), 0 errores |
| `npm run test:actions` | 200 llamadas a acciones del servidor, sin excepciones |

Notas para repetirlo: `test:db` exige `TEST_DATABASE_URL` hacia una base local cuyo nombre termine en `_test` y con el seed cargado (`npm run seed`). `test:routes` y `test:actions` necesitan el servidor de producción corriendo (`next start`) y que las fotos del seed estén en su carpeta de fotos.

## No verificado

- Neon real (región, pooler, suspensión por inactividad, ventana de restauración).
- Vercel real (límites de función, región `gru1`, variables de entorno, redeploy).
- **Vercel Blob privado**: en local las fotos van a disco. La subida, la lectura y el borrado contra un store privado real no se probaron.
- Recorrido manual con clics en el navegador (por ejemplo "Retirar" un compromiso) y entrega real de push al teléfono.
- Importador desde SQLite (`db:import-sqlite`) contra datos reales.

## Pendientes y riesgos

- `npm audit` informa 18 vulnerabilidades altas por dependencias transitivas; no se actualizaron a la fuerza.
- Vercel Hobby es para uso personal no comercial: los responsables deben confirmar que el proyecto encaja.
- Los avisos diarios o semanales se revisan al usar la app; no hay cron ni cola durable.
- El registro todavía verifica la cuenta al instante (sin confirmar email o celular).
- Antes de abrir al público: probar en un entorno de prueba real (Neon + Blob + Vercel) con la matriz de [SEED_Y_PRODUCCION.md](SEED_Y_PRODUCCION.md).
