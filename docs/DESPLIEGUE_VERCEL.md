# Sampacho Conecta en Vercel + Neon

Guía para empezar desde cero. Revisada el 18/11/2026. El código usa Postgres 18 y un almacén **privado** Vercel Blob. No se creó ninguna cuenta, ni se publicó el sitio durante esta implementación. Las comprobaciones efectivamente realizadas están en [QA de la migración](QA_VERCEL_NEON.md).

## 1. Antes de crear cuentas

Vercel Hobby está destinado a proyectos personales no comerciales. Que la app sea comunitaria, tenga comercios o participación municipal no determina por sí solo su encuadre. Revisá con los responsables los [términos de Hobby](https://vercel.com/docs/plans/hobby) antes de elegirlo. Esta guía no decide esa cuestión por vos. Si el uso requiere Pro, ya no se cumple el objetivo de costo cero.

Neon Free permite empezar sin tarjeta; Vercel ofrece Hobby sin contratar Pro. No actives una prueba paga, agregados pagos ni un método de pago para seguir esta guía. Si el panel te exige pagar o cambia sus condiciones, detené ese paso y revisá el plan. Los proveedores pueden cambiar sus cupos. Un dominio propio se compra aparte; el subdominio `*.vercel.app` viene con Vercel.

Usá un entorno de **prueba separado** del real: una base/proyecto Neon y un Blob store exclusivos para pruebas. Las previews de Vercel nunca deben apuntar a la base y fotos reales. Una rama de Neon copiada de producción contiene sus datos; no la trates como anónima.

## 2. Preparar la computadora y probar localmente

Instalá Node.js 24 LTS, Git y Docker Desktop desde sus sitios oficiales. Abrí PowerShell en la carpeta del proyecto:

```powershell
cd web
npm ci
Copy-Item .env.example .env.local
```

Si `.env.local` ya existe, editá el existente; no lo reemplaces. Es privado y Git lo ignora. Elegí una contraseña local y cargala en `POSTGRES_PASSWORD` y en la cadena local `DATABASE_URL` de `.env.local`. No dejes activa la cadena ilustrativa de Neon.

```powershell
docker compose --env-file .env.local -f docker-compose.dev.yml up -d
npm run db:migrate
npm run seed
npm run dev
```

Abrí `http://localhost:3000`. El Postgres local escucha solo en `127.0.0.1:55438`; no se publica en la red. Si ese puerto está ocupado, cambiá el lado izquierdo del mapeo del compose y el puerto de `DATABASE_URL`. El compose usa un volumen persistente; `docker compose ... down` detiene sin borrar datos. No uses `down -v` para un entorno que quieras conservar.

Sin token Blob, las fotos de desarrollo van a `web/data/uploads/`, o a `SAMPACHO_DATA_DIR/uploads`. La base ya no se guarda en ese directorio. No se borró ni convirtió automáticamente el SQLite anterior.

El autoseed funciona únicamente en desarrollo y sobre una base vacía. `SEED_DISABLE_AUTO=1` lo deshabilita. En producción no existe autoseed, aunque se configure la vieja variable `SEED_ON_EMPTY`.

## 3. Crear el repositorio en GitHub

1. Creá tu cuenta en [GitHub](https://github.com/) y verificá el email.
2. Creá un repositorio privado, sin inicializar otro README si este proyecto ya tiene Git.
3. Revisá `git status`: no deben aparecer `.env.local`, claves VAPID, `data/`, fotos, dumps ni datos personales.
4. Vinculá el remoto y subí los commits **cuando vos decidas publicarlos**. Esta implementación dejó solo commits locales; no hizo push.

Vercel necesita acceso al repositorio. Autorizá solo el repositorio necesario si GitHub ofrece esa opción.

## 4. Crear Postgres en Neon

1. Entrá a [Neon](https://neon.com/) y creá una cuenta Free.
2. Creá un proyecto, por ejemplo `sampacho-pruebas`, con **Postgres 18**. Así coincide con el compose local.
3. Elegí AWS South America **São Paulo**, `aws-sa-east-1`, si el panel Free te lo ofrece. El repo configura Vercel en `gru1`. Neon documenta Postgres en esa región; la disponibilidad concreta se confirma al crear tu proyecto. Si no está disponible, elegí N. Virginia `aws-us-east-1` y cambiá `web/vercel.json` a `"regions": ["iad1"]` antes de desplegar. La región de un proyecto Neon no se cambia después: requiere otro proyecto y migrar los datos. [Regiones de Neon](https://neon.com/docs/introduction/regions).
4. En **Connect**, seleccioná la base, el rol y **Connection pooling**. Copiá la cadena cuyo host incluye `-pooler`, con los parámetros TLS que entrega Neon, por ejemplo `sslmode=require`. No desactives la validación TLS para solucionar errores.
5. Pegá esa cadena en `DATABASE_URL` de tu `.env.local` solo cuando vayas a operar **ese** entorno. No pegues la cadena en el código, terminal compartida, capturas o chats.

La aplicación abre hasta 5 conexiones por instancia. El pooler de Neon evita abrir cientos de conexiones directas al crecer el número de funciones. Los scripts también aceptan la cadena pooled; para `pg_dump` usá la conexión directa de Connect.

## 5. Importar en Vercel y crear Blob privado

1. Creá tu cuenta en [Vercel](https://vercel.com/) con GitHub y elegí Hobby si corresponde al uso acordado.
2. **Add New → Project → Import Git Repository**. Seleccioná el repo.
3. En **Root Directory**, poné **`web`**. Framework: Next.js. Comandos estándar: `npm ci`, `npm run build`. Node: **24.x**. No cargues todavía datos reales.
4. Agregá `DATABASE_URL` del entorno de prueba en Environment Variables. La primera compilación no carga datos; la app necesita la variable para funcionar al recibir consultas.
5. Desde **Storage → Create Database/Store → Blob**, creá un store con acceso **Private**, dedicado a este entorno. Elegí São Paulo si se ofrece, o una región cercana a las funciones. Conectalo al proyecto y verificá que exista **`BLOB_READ_WRITE_TOKEN`** en los entornos correspondientes.
6. No uses un store Public. Una URL larga o difícil de adivinar no vuelve privada una foto. Todas las fotos se guardan privadas; `/api/fotos` sirve las públicas con caché y exige autor o municipio para los reclamos. El token nunca se envía al navegador. [Blob privado](https://vercel.com/docs/vercel-blob/private-storage).
7. Después de cambiar variables o conectar Storage, hacé **Redeploy**. Las variables nuevas no cambian despliegues anteriores.

Si el primer despliegue se crea antes del store, no intentes subir fotos hasta configurar el token y volver a desplegar. En Vercel, la falta de token produce un error explícito: nunca usa el disco temporal como respaldo.

## 6. Variables y primera migración

| Variable | Dónde / función |
|---|---|
| `DATABASE_URL` | Vercel y scripts locales. Cadena Postgres pooled del entorno correcto |
| `BLOB_READ_WRITE_TOKEN` | Vercel y scripts que generan/importan fotos. Token de un store **privado** |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Opcionales, para Web Push. Misma pareja estable en todos los despliegues de un entorno |
| `SEED_PASSWORD` | Solo comando seed: contraseña propia de 12+ caracteres para las cuentas sintéticas |
| `ADMIN_PASSWORD` | Solo comando create-admin: contraseña única de 12+ caracteres |

`NODE_ENV=production` se configura automáticamente en Vercel. No agregues allí `ALLOW_LOCAL_UPLOADS`, `SAMPACHO_DATA_DIR`, `SEED_DISABLE_AUTO` ni contraseñas de seed/admin. Las tres últimas son de operación local, no secretos necesarios en el servidor.

En PowerShell, desde `web/`, con el `.env.local` apuntando a **Neon de prueba**:

```powershell
npm run db:migrate
```

Aplica las migraciones 1–4 en una transacción y con bloqueo coordinado entre instancias. Ejecutarlo otra vez no duplica tablas ni datos. La primera consulta de cada proceso comprueba el esquema y, si falta una migración, la aplica; no reemplaza hacer el paso explícito antes de abrir el sitio.

Para cargar la demostración, poné `SEED_PASSWORD` y el token Blob del entorno de prueba en `.env.local`, y ejecutá:

```powershell
$env:NODE_ENV='production'
npm run seed -- --allow-production
Remove-Item Env:NODE_ENV
```

El script carga las 19 cuentas y todo el contenido dentro de una transacción. Si hay usuarios, se detiene. Consultá [cuentas y recorrido por rol](SEED_Y_PRODUCCION.md). Las cuentas son sintéticas; no invitan ni envían correo a personas reales.

## 7. Conservar la base SQLite anterior

Si ese archivo contiene datos que querés conservar, **no uses reset ni seed** para migrarlo. Detené la versión vieja para que nadie escriba durante el cambio. Conservá una copia del archivo SQLite y de su directorio `uploads` juntos, incluyendo un backup consistente si existía WAL. No subas esa copia a GitHub.

Apuntá `DATABASE_URL` a un Postgres **vacío** y `BLOB_READ_WRITE_TOKEN` a un store privado **vacío** del mismo entorno. Desde la PC:

```powershell
$env:NODE_ENV='production'
npm run db:import-sqlite -- --source="C:/ruta/copia/sampacho.db" --yes --allow-production
Remove-Item Env:NODE_ENV
```

El importador lee el origen sin modificarlo, conserva IDs, relaciones, sesiones e historial y ajusta las secuencias. Copia las fotos de `uploads` contiguo al SQLite. Rechaza tablas/columnas desconocidas y destinos con datos; no omite registros silenciosamente. Para probar sin Blob, usá otro `SAMPACHO_DATA_DIR` local y habilitá `ALLOW_LOCAL_UPLOADS=1` si corrés en producción local. No hace falta activar los triggers de mantenimiento para importar.

La transacción asegura todo-o-nada en Postgres. Postgres y Blob no comparten una transacción distribuida: ante un error se intenta limpiar lo subido, y un corte abrupto puede dejar objetos huérfanos. No borres la copia original hasta comparar conteos, probar sesiones, reclamos y fotos. La importación a Neon/Blob reales queda a cargo del responsable del despliegue.

## 8. Revisar el sitio de prueba

Abrí la URL `https://...vercel.app`. Revisá `/api/salud`: debe devolver `{"ok":true}` y `Cache-Control: no-store`; un fallo de base devuelve 503 sin credenciales ni detalles internos.

Seguí la matriz completa de [SEED_Y_PRODUCCION.md](SEED_Y_PRODUCCION.md), con dos navegadores para conflictos. Confirmá especialmente reclamo ajeno 404, foto privada 401/403 para extraños, autor/municipio con acceso, comentarios y calificaciones, cupos, moderación y subida de fotos desde un teléfono. No llames números de emergencia ni abras los grupos WhatsApp ficticios del seed.

El [límite documentado de funciones Vercel](https://vercel.com/docs/functions/limitations) es **4,5 MB** por cuerpo de petición/respuesta. La app permite 4 MB en Next y prepara antes las fotos en el navegador: hasta 1600 px y 750 KB por foto, con presupuesto total de 3,8 MB. El servidor vuelve a validar y transforma a WebP sin EXIF. Si el navegador no puede comprimir o el conjunto no entra, informa el error sin enviar los originales. El límite no aumenta al pasar a Pro.

Las funciones usan Node y `maxDuration=60`; no hay servidor permanente ni archivos persistentes en Vercel. Si subidas fallan, mirá **Logs** y los cupos del store antes de reintentar muchas veces.

## 9. Push, PWA y tareas periódicas

Para generar claves, en tu PC ejecutá `node -e "console.log(require('web-push').generateVAPIDKeys())"`. Guardalas directamente en variables privadas; no compartas la salida. Configurá las dos claves y `VAPID_SUBJECT=mailto:CONTACTO_REAL` y redeployá. La clave pública llega al cliente; la privada permanece en el servidor.

La PWA requiere HTTPS, salvo localhost. En iPhone puede requerir instalarla en la pantalla de inicio antes de pedir permiso. Sin claves se usa la bandeja interna y la app lo aclara. `after()` intenta enviar luego de responder, con mensajes genéricos para reclamos/ideas y respetando el descanso. No garantiza entrega exactamente una vez: la respuesta de un proveedor o el cierre de una función pueden provocar pérdidas/reintentos. No se verificó entrega en un teléfono real en esta migración.

Los avisos diarios/semanales y recordatorios se revisan al usar la app; **no hay un cron ni una cola durable** que despierte sola a la hora exacta. Si necesitás puntualidad, agregá después un programador y cola persistente. El service worker excluye API/reclamos y solo guarda las páginas públicas anónimas autorizadas por el servidor; al cambiar de cuenta limpia la caché de páginas.

## 10. Abrir el entorno real

Recomendación: creá otra base y otro store para el sitio real, conservando el entorno de prueba. Configurá las variables **Production** hacia los recursos reales, dejá Preview hacia pruebas, aplicá migraciones y creá la cuenta municipal. No copies demostraciones a producción.

Si elegís reutilizar el entorno de prueba, el siguiente comando **borra todos los datos y fotos de la aplicación del destino configurado**, incluidos reclamos. Hacelo antes de recibir datos reales, después de respaldar y comprobar base/store. Nunca sirve como limpieza rutinaria de producción:

```powershell
$env:NODE_ENV='production'
npm run seed -- --reset --yes --no-seed --allow-production
npm run create-admin -- --email="RESPONSABLE@DOMINIO" --name="Responsable municipal"
Remove-Item Env:NODE_ENV
```

Antes del segundo comando definí `ADMIN_PASSWORD` en `.env.local`. Creará o promoverá esa cuenta a municipio. No uses direcciones `.test` en el entorno real. Quitá después `ADMIN_PASSWORD`, `SEED_PASSWORD` y los tokens temporales de operación de tu archivo si no los necesitás.

El reset activa `SET LOCAL sampacho.allow_reset='on'` únicamente dentro de su transacción, trunca tablas y reinicia identidades; al terminar el permiso desaparece. La app normal no lo activa. Los triggers bloquean DELETE y TRUNCATE de reclamos/historial en operaciones normales. Es una protección operativa, no una barrera contra quien controla la contraseña administradora de Postgres.

Definí las cuentas de atención y moderación, privacidad, verificación de identidad y límites de uso antes de invitar al pueblo. La verificación externa de email/celular sigue pendiente: registrarse todavía verifica la cuenta inmediatamente. La migración no agrega ese servicio.

## 11. Dominio y monitoreo

En Vercel → Settings → Domains podés usar el subdominio incluido o agregar uno que ya poseas. Copiá exactamente los registros DNS que indique el panel de Vercel para ese dominio; no uses IPs sacadas de ejemplos viejos. Esperá la validación de DNS y HTTPS antes de anunciarlo. Si no querés comprar dominio, mantené `vercel.app`.

En [UptimeRobot](https://uptimerobot.com/) podés configurar un monitor HTTP(s) para `https://TU-SITIO/api/salud`, método GET y alerta a tu email, si su plan gratuito vigente alcanza. No se creó un monitor en esta tarea. Elegí una frecuencia moderada: consultar continuamente Neon evita que se suspenda y consume horas de cómputo. Revisá **Vercel Logs/Usage** y **Neon Monitoring/Usage**, sin registrar contraseñas ni textos privados.

## 11 bis. Aparecer en Google (SEO)

La app ya trae lo técnico: título y descripción propios en cada página pública, `robots.txt`, `sitemap.xml` con las fichas, publicaciones, ideas y avisos vigentes, imagen para compartir en WhatsApp/redes, y datos estructurados (comercio local con horarios y calificaciones, eventos y migas de pan). Los reclamos y las áreas privadas llevan `noindex` y nunca entran al sitemap.

**El sitio de ejemplo no debe indexarse** (tiene datos de prueba). Por eso la indexación está apagada por defecto: solo se enciende con variables, y solo en el proyecto **real**.

| Variable (proyecto real) | Valor |
|---|---|
| `SITE_URL` | Tu dirección exacta, con `https://` y sin barra final (ej. `https://sampachoconecta.com.ar` o `https://tu-proyecto.vercel.app`) |
| `SITE_INDEXING` | `on` |
| `GOOGLE_SITE_VERIFICATION` | Opcional: el código de verificación de Search Console (ver abajo) |

Dejá estas tres **sin definir** en el proyecto de ejemplo: así devuelve `noindex` en todas las páginas, un `robots.txt` que bloquea todo y un sitemap vacío. Después de cambiar variables, hacé **Redeploy** (el bloqueo se aplica al compilar).

Pasos en Google, una sola vez:
1. Entrá a [Search Console](https://search.google.com/search-console) con tu cuenta de Google y elegí **Agregar propiedad → Prefijo de URL**, con la dirección exacta del sitio real.
2. Elegí verificar con **Etiqueta HTML** y copiá solo el valor de `content="…"`. Pegalo en `GOOGLE_SITE_VERIFICATION` en Vercel, hacé Redeploy y apretá **Verificar**.
3. En **Sitemaps** agregá `sitemap.xml`.
4. En la barra superior pegá la portada, esperá el análisis y usá **Solicitar indexación**.
5. Creá gratis un perfil de [Google Business Profile](https://www.google.com/business/) para "Sampacho Conecta" o la municipalidad, con el enlace al sitio: ayuda en las búsquedas locales.

Comprobá el resultado abriendo `TU-SITIO/robots.txt` (debe decir `Allow: /` y mostrar el sitemap), `TU-SITIO/sitemap.xml` (debe listar páginas) y probando una ficha de comercio en la [Prueba de resultados enriquecidos](https://search.google.com/test/rich-results).

Qué esperar: Google tarda de días a semanas en indexar y no hay garantía de posición. Ayudan mucho un **dominio propio** (un `.com.ar` rinde mejor que un subdominio de Vercel), enlaces desde la web de la municipalidad y redes del pueblo, y contenido nuevo seguido (comercios cargados, novedades, agenda).

## 12. Respaldo y restauración

Neon Free ofrece hasta **6 horas de historial**, limitado a **1 GB de cambios** por proyecto según [los planes vigentes](https://neon.com/docs/introduction/plans). La ventana efectiva puede ser menor. En Console → Branches/Restore elegí el punto disponible, conservá el estado actual en otra rama y probá la restauración antes de cambiar la app. Confirmá el resultado con un entorno aislado. Esta ventana no reemplaza una copia independiente y **no incluye Blob**.

Instalá las herramientas cliente de PostgreSQL 18 (misma versión mayor o posterior a la base). Creá primero la carpeta privada de destino, por ejemplo `C:/Backups`. Para un dump propio usá la cadena **directa** de Connect y TLS. Podés establecer `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGSSLMODE=require` en tu terminal sin poner la contraseña en el comando; `--password` la solicita de forma interactiva:

```powershell
pg_dump --password --format=custom --no-owner --no-acl --file="C:/Backups/sampacho.dump"
```

El dump contiene datos privados. Guardalo fuera del repo, con acceso restringido, cifrado y una copia en otro dispositivo. Respaldá aparte todas las fotos del store privado con sus nombres originales, usando credenciales del responsable y la SDK Blob desde una PC autorizada. La guía no instala una tarea automática de respaldo; acordá quién la ejecuta y con qué frecuencia.

Para restaurar, creá primero una **base vacía distinta**, sin aplicar migraciones ni seed. Cambiá las variables PG de tu terminal a esa base y ejecutá:

```powershell
pg_restore --password --no-owner --no-acl --exit-on-error --dbname=BASE_NUEVA "C:/Backups/sampacho.dump"
```

No uses `--clean` sobre producción: los triggers anti-borrado y los datos existentes hacen peligrosa una restauración destructiva. Restaurá fotos a un store privado de recuperación con los mismos nombres y probá la app apuntando a esa base/store. Luego ejecutá `db:migrate` para versiones nuevas y verificá conteos, reclamos y fotos antes de cambiar las variables del sitio real. Ensayá periódicamente una restauración; un archivo que nunca se restauró no es evidencia suficiente de recuperación.

## 13. Cupos y actualización

El 18/11/2026, [Neon Free](https://neon.com/docs/introduction/plans) documenta 100 CU-h/mes por proyecto, 1 GB de base, 5 GB de transferencia pública y suspensión tras 5 min sin actividad. La primera consulta tras inactividad puede demorar. Los cupos no garantizan disponibilidad ni capacidad para todo el pueblo.

[Blob Hobby](https://vercel.com/docs/vercel-blob/usage-and-pricing) incluye 1 GB de almacenamiento, 10 GB de transferencia, 10.000 operaciones simples y 2.000 avanzadas dentro de su período de uso; si excedés límites, el servicio puede quedar inaccesible hasta la renovación. Servir fotos por proxy también consume funciones y transferencia de Vercel. Revisá los límites actuales en ambos paneles, no solo la cantidad de vecinos registrados.

Si crece el uso, evaluá planes pagos, una ventana mayor de restauración, cola de avisos y monitoreo. Cambiar un plan no requiere volver a SQLite. Para actualizar código: respaldo, prueba en preview/base separada, revisión de migraciones y permisos, checks y despliegue autorizado. No ejecutes `npm audit fix --force` a ciegas: puede bajar versiones e invalidar la SDK de Blob/Next.

Problemas comunes: `DATABASE_URL` ausente → configurar y redeployar; salud 503 → revisar cadena/red/estado Neon; fotos 404 → revisar token privado y entorno; 413 → menos fotos o revisar compresión; cookies que no persisten → usar HTTPS o localhost; cambios de variables sin efecto → redeployar. Nunca pegues secretos en un reporte de error.
