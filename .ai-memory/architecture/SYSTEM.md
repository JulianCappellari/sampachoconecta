# Sistema — arquitectura verificada

- Updated: 2026-11-18. Agent: Codex, T-20261118-013. VERIFIED local; despliegue externo NOT_RUN.
- Monolito modular Next 16 App Router, Node 24, React 19; PWA. Implementación en web/. Se conservan identidad visual, GSAP, mapas Leaflet, clima y emergencias.
- React Server Components y Server Actions esperan la capa async pg; Zod y autorización en servidor. Sesiones propias con token aleatorio hasheado y cookie httpOnly. Verificación externa de identidad pendiente; no se introdujo Supabase Auth.
- Postgres 18 / Neon por conexión pooled en producción; migraciones 1–4 coordinadas, transacciones ALS y constraints. [Detalle de datos](DATABASE.md).
- Fotos: navegador comprime antes del envío; servidor valida/recomprime con sharp. Un Blob store PRIVADO por entorno. /api/fotos sirve bytes públicos con caché y exige autor/municipio con no-store para reclamos. El disco solo existe como fallback local; Vercel sin token falla cerrado.
- Notificaciones internas transaccionales con event_key único. Push mediante after fuera de la transacción, descanso y contenido genérico para privados. Sin cron/cola durable; no garantía de entrega exactamente una vez.
- public/sw.js guarda estáticos y páginas públicas anónimas autorizadas por src/proxy.ts; API/reclamos excluidos, offline anónimo y limpieza al cambiar de cuenta.
- /api/salud consulta Postgres: 200 ok:true o 503 ok:false, no-store. /api/clima conserva modelos públicos, caché y degradación; no recibe GPS.
- Destino preparado: Vercel + Neon + Blob. Root Directory web, región gru1 si Neon São Paulo está disponible; fallback iad1 documentado. Revisar elegibilidad Hobby no comercial.

## Evidencia y siguientes pasos

[Guía de despliegue](../../docs/DESPLIEGUE_VERCEL.md) y [matriz QA](../../docs/QA_VERCEL_NEON.md). Docker se conserva solo para Postgres local; se retiró la preparación Oracle productiva. Sin push, deploy ni cuentas externas. Los recursos reales y las variantes de QA pendientes requieren revisión del responsable antes de abrir a vecinos reales.
