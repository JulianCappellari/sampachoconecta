# Sampacho Conecta

Plataforma comunitaria de Sampacho (Córdoba): muro de novedades, reclamos privados al municipio, guía de comercios con mapa, oficios con calificaciones, ideas vecinales con grupo de WhatsApp, agenda, farmacia de turno y teléfonos útiles.

Diseño completo (requerimientos, casos de uso, arquitectura, identidad visual): [`../docs/diseno-sistema.html`](../docs/diseno-sistema.html).

Acceso fijo a emergencias y clima con comparación ECMWF/GFS/ICON: [funcionamiento, fuentes y pruebas](../docs/EMERGENCIAS_Y_CLIMA.md). Pruebas de lógica: `node --test scripts/weather.test.mjs` (Node 24).

## Funciones comunitarias

Según [`../docs/IMPLEMENTACION_FUNCIONES_COMUNITARIAS_CLAUDE.md`](../docs/IMPLEMENTACION_FUNCIONES_COMUNITARIAS_CLAUDE.md): **Hoy en Sampacho** (avisos con vigencia por fecha, zona sin GPS, eventos de hoy y cambios de servicios), **Qué sigo** y bandeja de avisos, **Necesito** (pedidos que responden los comercios), **Gracias, se resolvió** (resultados), seguimiento de reclamos con próxima actualización, notas internas e incidentes, e ideas con necesidades y compromisos. Las migraciones numeradas están en `src/lib/db.ts`.

Efectos visuales: GSAP + ScrollTrigger + SplitText, Lenis (scroll suave) y Motion (efecto imán).

## Segunda tanda de funciones

Encuestas vecinales (un voto por persona, resultados al cierre) · alertas del municipio por clima severo (aviso urgente a la zona; no es una alerta oficial del SMN) · recolección de residuos por zona con recordatorio · bolsa de trabajo · Visitar Sampacho · destacado de la semana (rota entre comercios postulados) · transparencia (cifras agregadas, sin datos personales) · PWA con página sin conexión y avisos al teléfono (Web Push).

### Avisos al teléfono

Necesitan claves VAPID en `web/.env.local` (no se sube al repositorio): `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT`. Sin claves, la app lo informa y usa solo la bandeja interna. El service worker se registra únicamente en producción (`npm run build` y `npm run start`).

## Cómo correrlo

```powershell
cd web
npm install
npm run dev      # http://localhost:3000
```

Al primer arranque **en desarrollo** se crea `data/sampacho.db` (SQLite) con los datos de prueba y la carpeta `data/uploads` para las fotos. En producción una base vacía queda vacía: los datos de prueba se cargan solo a propósito.

Otros comandos: `npm run build`, `npm run start`, `npm run lint`, `node scripts/make-icons.mjs` (regenera los íconos de la PWA).

## Datos de prueba y producción

```bash
SEED_PASSWORD='una-contraseña-larga' npm run seed                  # carga todo, con fotos de ejemplo
SEED_PASSWORD='…' npm run seed -- --reset --yes                    # borra y vuelve a cargar
npm run seed -- --reset --yes --no-seed --allow-production         # solo vacía (para el sitio real)
ADMIN_PASSWORD='…' npm run create-admin -- --email=… --name="…"    # primera cuenta real de la municipalidad
```

El seed cubre todos los módulos en todos sus estados, con 19 cuentas de prueba (municipio, moderación, vecinos, una suspendida). No corre en producción sin `--allow-production`, exige contraseña propia y no pisa datos existentes. En producción la carpeta de datos se define con `SAMPACHO_DATA_DIR` y debe ser un disco persistente.

Cuentas, qué hay cargado y una guía de pruebas por rol: [`../docs/SEED_Y_PRODUCCION.md`](../docs/SEED_Y_PRODUCCION.md).

Publicar gratis en un servidor propio (Oracle Cloud + Docker + HTTPS): [`../docs/DESPLIEGUE_ORACLE.md`](../docs/DESPLIEGUE_ORACLE.md).

## Stack

Next.js 16 (App Router, Server Actions) · React 19 · Tailwind CSS 4 · GSAP + ScrollTrigger · SQLite (`node:sqlite`) · Zod · Leaflet + OpenStreetMap · sharp.

## Estructura

```
src/app/            rutas (muro, guia, oficios, reclamos, ideas, agenda, utiles, panel, perfil…)
src/actions/        Server Actions: validación con Zod y permisos en el servidor
src/lib/            db (esquema + seed), auth (sesiones scrypt), data (consultas), uploads, format
src/components/     ui, site (header/nav/footer), motion (ScrollTrigger), maps, features
```

## Pendiente para producción

- Migrar SQLite a PostgreSQL (Supabase) y las fotos a almacenamiento en la nube.
- Verificación de email o celular al registrarse (en el prototipo la cuenta se verifica al instante).
- Notificaciones push, service worker para uso sin conexión, edición de fichas, encuestas.
