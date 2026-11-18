# Sampacho Conecta

Plataforma comunitaria para Sampacho (Córdoba, Argentina): novedades y avisos de la municipalidad, reclamos privados con seguimiento, guía de comercios con mapa, oficios, pedidos y bolsa de trabajo, ideas vecinales, encuestas, residuos, agenda, teléfonos útiles, alertas y clima.

Pensada por y para los vecinos, como aplicación web instalable (PWA).

## Estructura

| Carpeta | Contenido |
|---|---|
| [`web/`](web/) | La aplicación (Next.js 16, React 19, Tailwind 4, SQLite). Ver [`web/README.md`](web/README.md) |
| [`docs/`](docs/) | Diseño del sistema, especificaciones y notas de operación |
| [`.ai-memory/`](.ai-memory/) | Memoria del proyecto para continuidad entre sesiones de trabajo |

## Probarla en tu computadora

Requiere Node.js 24 o superior.

```bash
cd web
npm install
npm run dev
```

Abrí <http://localhost:3000>. La primera vez se crea una base de datos local con **datos de ejemplo inventados** y cuentas de demostración (ver `web/README.md`). Cambiá o eliminá esas cuentas antes de publicar el sitio.

## Verificación

```bash
cd web
npx tsc --noEmit
npm run lint
node --test scripts/weather.test.mjs
npm run build
```

## Antes de publicarla de verdad

- Pasar la base de SQLite a PostgreSQL y las fotos a almacenamiento en la nube.
- Verificar el email o celular al registrarse (hoy las cuentas se aceptan al instante).
- Configurar las claves VAPID para los avisos al teléfono (`web/.env.local`, nunca en el repositorio).
- Definir con la municipalidad quién atiende reclamos, avisos y moderación.
