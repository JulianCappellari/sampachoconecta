# Verificación de la migración Vercel / Neon

Fecha: 18/11/2026. Código probado en Windows, Node 24.21, Next 16.4.6, React 19.3 y **Postgres 18 local**, con `next build` + `next start`. Datos exclusivamente sintéticos, en bases separadas del SQLite anterior. No hubo push, deploy, creación de cuentas externas ni prueba contra recursos reales de Neon o Blob.

## Resultado y alcance

La implementación y las pruebas locales están completas para revisión. **No equivale a certificar el despliegue real ni todas las combinaciones de interacción en todos los dispositivos.** El recorrido manual fue amplio y complementa las pruebas HTTP; no se presenta como una ejecución manual exhaustiva de cada variante de cada acción. Quedan pendientes las comprobaciones externas de la última sección.

| Verificación | Resultado |
|---|---|
| TypeScript (`npx tsc --noEmit`) | PASS |
| ESLint tipado (`npm run lint`) | PASS, sin warnings nuevos |
| Compilación de producción (`npm run build`) y arranque (`npm run start`) | PASS contra Postgres local |
| Capa Postgres (`npm run test:db`) | PASS: 10 casos lógicos + suite contenedora |
| Clima (`npm test`) | PASS: 12 casos existentes |
| Archivos (`npm test`) | PASS: 3 casos lógicos + suite contenedora |
| Comandos (`npm run test:cli`) | PASS en otra base local vacía y descartable |
| Páginas (`npm run test:routes`) | PASS; cinco roles y, además, autor de la foto privada |
| Acciones (`npm run test:actions`) | PASS; las 79 exportaciones sin sesión y 78 con circuitos válidos; `savePush` solo configuración/validación, sin suscripción real |
| Dependencias (`npm audit`) | PASS: cero vulnerabilidades en la última instalación/auditoría |
| Salud con base disponible / conexión inválida | PASS: 200 `{ok:true}` / 503 `{ok:false}`, ambos `no-store` |
| Inicio sobre base vacía | PASS: desarrollo crea 19 cuentas una sola vez; producción conserva cero |

El runner de Node también cuenta los dos contenedores de suites como tests: hay **25 casos lógicos**, no 27 casos independientes. El test de clima mantiene un aviso informativo de Node sobre detección de tipo de módulo; no es un fallo ni un warning de ESLint. Los números exactos de solicitudes HTTP se imprimen al ejecutar los scripts: los detalles recorridos dependen de las filas existentes en el seed.

Última corrida del build final: **492 lecturas y 200 solicitudes de acciones**, sin excepciones inesperadas. `test:actions` informa 78 exportaciones con circuitos válidos; `savePush` es la excepción externa explícita. Las solicitudes de rechazo esperado (conflicto/permisos/validación) también forman parte de esa corrida.

## Persistencia, concurrencia y privacidad

- Migraciones 1–4 repetidas sin duplicar objetos; identidad, email `citext`, UTC, `COUNT/AVG` numéricos, traducción de placeholders, `LIKE`, `INSERT OR IGNORE`, literales/comentarios y parámetros numerados.
- `datetime` y `julianday` contrastados con fechas conocidas, desplazamientos y una transacción que cambia su zona horaria: las funciones conservan UTC.
- Rollback exterior, savepoints anidados, consultas en la misma transacción, reintentos serializables y cuatro incrementos concurrentes sin pérdida.
- Los triggers rechazan **DELETE y TRUNCATE** de reclamos e historial. El reset administrativo puede vaciarlos solo al activar su permiso local a la transacción; se verificó que no se filtra al pool.
- Ocho notificaciones concurrentes por el mismo hecho generan una sola fila. El límite de ingreso se comparte en Postgres: doce intentos simultáneos admiten ocho y bloquean el resto.
- Dos ediciones simultáneas de un reclamo o aviso: una confirma y otra informa conflicto. Tres reclamos se crean en paralelo sin duplicar números. Dos aceptaciones para un solo cupo reservan uno solo.
- Respuestas de pedidos se reenvían/retiran/reactivan sin duplicar filas; al cerrar se conserva un solo agradecimiento. Calificar dos veces mantiene una opinión y recalcula el promedio; el dueño no puede calificarse.
- Vecino y moderación no pueden asignar roles municipales. Suspender invalida las sesiones. El autor recibe su reclamo **sin** las notas internas.
- Fotos de reclamos: autor y municipio con acceso, visitante/otro vecino/moderación sin acceso; `private, no-store`, incluso en errores. Las páginas públicas para offline se autorizan solo sin cookie de sesión.

## Seed, reset e importación

La prueba CLI usa una base local cuyo nombre termina en `_cli_test` y exige que empiece vacía. Verificó:

1. Rechazo en producción sin autorización explícita, de contraseña corta, de seed sobre datos existentes y de reset sin `--yes`.
2. Seed de las **19 cuentas** y todos sus módulos; fotos sintéticas generadas; reset vacío conservando migraciones.
3. `create-admin` repetido crea/promueve una sola cuenta municipal.
4. Importación de SQLite sintético conservando IDs, reclamo e historial; el origen sigue intacto y la siguiente identidad de usuario continúa en el valor correcto.
5. Rechazo de una segunda importación sobre destino con datos.

No se importaron los datos del SQLite existente ni se borraron sus fotos. El importador se probó con un archivo sintético; la importación real requiere copia consistente, ventana de mantenimiento y comparación de conteos. Postgres y Blob no tienen transacción distribuida: una interrupción abrupta puede dejar archivos huérfanos.

## Navegador: evidencia manual

Se usaron las cuentas sintéticas del seed. El navegador interno estuvo temporalmente bloqueado al retirar contenido; se recuperó y se continuó. El retiro se contrastó luego con la base. No se llamaron teléfonos ni se abrieron los enlaces WhatsApp ficticios.

| Área | Operaciones observadas |
|---|---|
| Cuenta | Ingresar/cerrar sesión como vecino, moderación y municipio; cuenta suspendida rechazada; perfil guardado |
| Muro | Publicación con cuatro fotos, comentario, me gusta y denuncia |
| Guía | Alta con pin en mapa; calificación ajena; rechazo de calificación propia; respuesta del titular y postulación al destacado |
| Reclamos | Alta con foto, 404 para otro vecino y moderación; cambio de estado/área/fecha, nota interna, cierre y calificación; dos pestañas muestran conflicto; autor sin notas internas |
| Ideas | Necesidad, novedad, aceptar/rechazar, falta de cupo, recepción parcial y permiso municipal con referencia |
| Pedidos | Alta, respuesta del prestador, actualización de esa respuesta, elección y cierre con agradecimiento público |
| Empleo | Alta y marcado como cubierto |
| Encuestas | Voto único y formulario municipal de creación |
| Moderación | Ocultar/descartar denuncias, suspender vecino; contenido oficial reservado al municipio; retiro de contenido sintético |
| Incidentes | Agrupación, actualización común, resolución común, desvinculación preservando historial |
| Operación municipal | Turno de residuos, lugar turístico, teléfono, farmacia de turno, alerta y corrección del aviso |
| Avisos | Seguir tema, guardar frecuencia/descanso, bandeja y marcar todo leído |

Las variantes de eliminación, renovación, cambios de roles, cierre de ideas/encuestas, visibilidad de resultados y elección de destacados también tienen cobertura **HTTP**, que no se confunde con haber ejecutado cada variante manualmente. Registro e ingreso de una cuenta nueva se probaron por HTTP. Activar Web Push en un dispositivo real no se ejecutó.

La prueba manual encontró etiquetas con IDs repetidos entre formularios. `Fields.tsx` ahora asocia cada etiqueta a su propio control mediante anidación, conserva IDs explícitos y no introduce JavaScript adicional. Se verificó que **Farmacia** cambia el campo correcto, deja **Nombre del servicio** intacto y guarda un turno; se inspeccionó la presentación en escritorio y móvil conservando estilos.

Capturas del resultado con datos ficticios: [escritorio](qa/postgres-formularios-desktop.jpg) y [móvil](qa/postgres-formularios-mobile.jpg). La consola de la última comprobación no registró errores. Emergencias conservó enlaces `tel:107`, `tel:100` y `tel:101` sin llamar; el clima mostró datos actuales de los tres modelos.

### Fotos y límite de petición

En navegador se seleccionaron **cuatro JPEG sintéticos de 4.388.301 bytes cada uno**. La publicación guardó cuatro fotos y se abrió correctamente con el límite Next de 4 MB. El navegador redujo los originales antes de llamar a la acción; no se capturó un HAR ni se afirma un tamaño exacto del multipart. La prueba local respalda el flujo, pero no sustituye una subida real en Vercel.

El servidor se probó con imágenes válidas e inválidas, exceso de cantidad/tamaño, limpieza tras fallo parcial, nombres inválidos, WebP de hasta 1600 px y eliminación de EXIF. Con `VERCEL=1`, sin token, rechaza el disco aunque se configure `ALLOW_LOCAL_UPLOADS=1`.

## Repetir las pruebas

Desde `web/`, configurá tus recursos **locales descartables**, con seed. Nunca uses una cadena de producción. Los scripts se niegan a aceptar hosts remotos o bases que no terminen en `_test`; CLI exige `_cli_test` vacía porque hace resets deliberados.

```powershell
npx tsc --noEmit
npm run lint
npm test
npm run build
# En otra terminal: npm run start -- --hostname 127.0.0.1 --port 3138
# Para start local sin Blob, ALLOW_LOCAL_UPLOADS=1 y SAMPACHO_DATA_DIR del seed.
# Configurar TEST_DATABASE_URL con la misma base local de prueba del servidor.
npm run test:db
$env:TEST_BASE_URL='http://127.0.0.1:3138'
npm run test:routes
npm run test:actions
# Otra base local vacía, en TEST_CLI_DATABASE_URL:
npm run test:cli
npm audit
```

`test:actions` utiliza el manifiesto del **mismo build que está ejecutando el servidor** y el codificador Flight que incluye Next 16. Si recompilás, reiniciá `next start`. Crea datos y cuentas sintéticas adicionales; no es un test de solo lectura. No borra los reclamos creados. `test:routes` agrega sesiones temporales y las retira al finalizar. Los tests no configuran cuentas en proveedores ni envían push real.

## Pendiente externo y riesgos conocidos

- **NOT_RUN:** crear Neon Free/Blob privado/Vercel, verificar la cadena pooled real, región disponible, TLS y comportamiento de arranques/fríos y límites de esos servicios.
- **NOT_RUN:** subida, descarga y denegación directa de URL en un Blob privado real. El código usa acceso privado; no se dispone de un token de prueba de ese servicio para comprobarlo sin tocar recursos ajenos.
- **NOT_RUN:** carga real cercana al límite de Vercel, dominios/DNS/HTTPS del sitio publicado, monitoreo y restauración real desde Neon/`pg_dump` con Blob.
- **NOT_RUN:** entrega Web Push a un teléfono, instalación PWA física, pruebas offline reales en iOS/Android y pruebas con lectores de pantalla. Se revisó el código del service worker y se probó por HTTP la autorización de caché.
- **PARCIAL:** recorrido manual de todas las variantes y confirmaciones de todas las acciones. Las rutas y exportaciones sí tienen cobertura automática; la tabla anterior delimita la evidencia manual real.
- La verificación externa de email/celular sigue pendiente, como en el prototipo. El registro todavía verifica al instante. No anunciar validación de identidad real.
- Los avisos diferidos dependen de actividad en la app; no hay cola durable ni cron exacto. `after()` es mejor esfuerzo, no entrega garantizada exactamente una vez.
- Revisar con los responsables si el uso municipal/comercial encuadra en Hobby. No se decidió ni contrató un plan por el usuario.

Antes de abrirlo a personas reales, completá [DESPLIEGUE_VERCEL.md](DESPLIEGUE_VERCEL.md) y repetí las comprobaciones externas y el recorrido por rol de [SEED_Y_PRODUCCION.md](SEED_Y_PRODUCCION.md).

## Verificación independiente (Claude, 18/11/2026)

Repetida sobre bases locales descartables, sin tocar las de Codex. Resultado: `tsc` y `eslint` sin errores; `npm run build` completo; `test` 16/16 (clima 12 + fotos 4); `test:db` 11/11 con el seed cargado en una base `_test`; `test:routes` 325 lecturas con cinco roles y 0 errores; `test:actions` 200 llamadas sin excepciones.

Sigue **sin verificarse** contra servicios reales: Neon, Vercel y Vercel Blob privado (en local las fotos van a disco). `test:db` necesita el seed previo; `test:routes` y `test:actions` necesitan `next start` y las fotos del seed en su carpeta.
