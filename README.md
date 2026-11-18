# Sampacho Conecta

Plataforma comunitaria para Sampacho (Córdoba, Argentina): novedades y avisos de la municipalidad, reclamos privados con seguimiento, guía de comercios con mapa, oficios, pedidos y bolsa de trabajo, ideas vecinales, encuestas, residuos, agenda, teléfonos útiles, alertas y clima.

Pensada por y para los vecinos, como aplicación web instalable (PWA).

## Estructura

| Carpeta | Contenido |
|---|---|
| [`web/`](web/) | La aplicación (Next.js 16, React 19, Tailwind 4, Postgres/Neon y Blob privado). Ver [`web/README.md`](web/README.md) |
| [`docs/`](docs/) | Diseño del sistema, especificaciones y notas de operación |
| [`.ai-memory/`](.ai-memory/) | Memoria del proyecto para continuidad entre sesiones de trabajo |

## Probarla en tu computadora

Requiere Node.js 24 y Postgres 18. La [guía desde cero](docs/DESPLIEGUE_VERCEL.md) explica Docker local, variables y publicación.

```bash
cd web
npm install
Copy-Item .env.example .env.local
# Configurá DATABASE_URL local y POSTGRES_PASSWORD antes de continuar.
docker compose --env-file .env.local -f docker-compose.dev.yml up -d
npm run db:migrate
npm run seed
npm run dev
```

Abrí <http://localhost:3000>. El seed carga **datos inventados** y 19 cuentas de demostración. En producción no hay autoseed. Conservá la base y el store reales separados del entorno de prueba.

## Verificación

```bash
cd web
npx tsc --noEmit
npm run lint
npm test
# Contra una base local descartable con seed, terminada en _test:
npm run test:db
# Con next start en TEST_BASE_URL (por defecto localhost:3138):
npm run test:routes
npm run build
```

## Antes de publicarla de verdad

- Seguir [DESPLIEGUE_VERCEL.md](docs/DESPLIEGUE_VERCEL.md), revisar [QA y límites verificados](docs/QA_VERCEL_NEON.md) y el uso permitido de Hobby. No se hizo push ni deploy.
- Verificar el email o celular al registrarse (hoy las cuentas se aceptan al instante).
- Configurar las claves VAPID para los avisos al teléfono (`web/.env.local`, nunca en el repositorio).
- Definir con la municipalidad quién atiende reclamos, avisos y moderación.
