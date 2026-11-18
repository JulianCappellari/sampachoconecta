# Datos de prueba (seed) y puesta en producción

Esta guía explica cómo cargar un conjunto **completo** de datos de prueba para recorrer toda la aplicación, cómo hacerlo con seguridad en un entorno publicado y qué probar con cada cuenta.

> Todo el contenido es **inventado**: personas, comercios, hechos y teléfonos (los `3584-0xx-xxx` no corresponden a nadie). Los números nacionales (911, 100, 101, 107…) son reales.

## 1. Comandos

Desde la carpeta `web/`:

| Comando | Qué hace |
|---|---|
| `npm run seed` | Carga los datos de prueba en una base **vacía**, con fotos de ejemplo |
| `npm run seed -- --reset --yes` | **Borra** la base y las fotos de la carpeta de datos y vuelve a cargar |
| `npm run seed -- --reset --yes --no-seed` | Solo **vacía** la base y las fotos, sin cargar nada (para pasar al sitio real) |
| `npm run seed -- --no-photos` | Igual, sin generar fotos |
| `npm run seed -- --allow-production` | Permite correrlo con `NODE_ENV=production` (entornos de prueba previos al lanzamiento) |
| `npm run create-admin -- --email=… --name="…"` | Crea la primera cuenta real de la municipalidad (ver sección 5) |

Variables de entorno:

| Variable | Para qué |
|---|---|
| `SEED_PASSWORD` | Contraseña de **todas** las cuentas de prueba (mínimo 8 caracteres; en producción, 12) |
| `ADMIN_PASSWORD` | Contraseña de la cuenta que crea `create-admin` (mínimo 12) |
| `SAMPACHO_DATA_DIR` | Carpeta donde viven la base `sampacho.db` y las fotos (`uploads/`). Por defecto `web/data` |
| `SEED_ON_EMPTY=1` | Fuerza el seed automático en una base vacía incluso en producción. **No lo uses** salvo en un entorno descartable |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Avisos al teléfono (opcionales) |

### Protecciones del comando

- **No corre en producción** (`NODE_ENV=production`) sin `--allow-production`.
- En producción exige `SEED_PASSWORD` de 12 o más caracteres: no existe contraseña por defecto.
- **No pisa datos**: si la base ya tiene usuarios, se detiene. Para empezar de cero hace falta `--reset --yes`.
- La carga es **todo o nada**: si algo falla, se revierte y no queda una base a medias.
- En producción, una base vacía **queda vacía**: el seed automático solo existe en desarrollo.

## 2. Publicar la app para probarla

1. **Elegí un servidor con disco persistente.** La base es un archivo SQLite y las fotos se guardan en disco. En plataformas sin disco persistente (por ejemplo funciones serverless como Vercel), los datos se pierden en cada despliegue. Sirven un VPS, o Railway, Render o Fly.io con un volumen montado.
2. Configurá `SAMPACHO_DATA_DIR` apuntando al volumen (por ejemplo `/data`).
3. Compilá e iniciá: `npm ci`, `npm run build`, `npm run start`.
4. Cargá los datos de prueba, **una vez**:

   ```bash
   SEED_PASSWORD='una-contraseña-larga-y-unica' npm run seed -- --allow-production
   ```

5. Verificá con las cuentas de la sección 3.
6. Para los avisos al teléfono generá claves VAPID (`node -e "console.log(require('web-push').generateVAPIDKeys())"`) y cargalas como variables de entorno del servidor, nunca en el repositorio. Requieren HTTPS.

## 3. Cuentas de prueba

Todas con la contraseña que definiste en `SEED_PASSWORD`.

| Rol | Email | Para qué sirve |
|---|---|---|
| Municipalidad | `municipio@sampacho.test` | Gestiona reclamos, avisos, alertas, encuestas y todo el panel |
| Municipalidad | `obras@sampacho.test` | Segundo agente: prueba conflictos de edición y es quien responde varios reclamos |
| Moderación | `moderacion@sampacho.test` | Modera contenido y denuncias; **no** ve reclamos |
| Moderación | `moderador2@sampacho.test` | Segundo moderador |
| Vecina | `marta@sampacho.test` | Organiza la idea de la huerta; tiene un reclamo resuelto y un pedido |
| Vecino | `luis@sampacho.test` | Electricista; reclamo con actualización vencida; responde pedidos |
| Vecina | `carla@sampacho.test` | Panadería; reclamo en proceso; pedido resuelto con agradecimiento |
| Vecino | `pedro@sampacho.test` | Almacén y gasista; compromisos en la huerta |
| Vecina | `lucia@sampacho.test` | Cabañas (alojamiento); reclamo agrupado en un incidente |
| Vecino | `diego@sampacho.test` | Plomero y albañil |
| Vecina | `sofia@sampacho.test` | Rotisería y hostal; propuso la campaña de libros |
| Vecino | `bruno@sampacho.test` | Zona rural; fletero; pizzería |
| Vecina | `valentina@sampacho.test` | Busca trabajo; propuso una idea cancelada |
| Vecino | `hernan@sampacho.test` | Ferretería; reclamo sin atender |
| Vecina | `elena@sampacho.test` | Cuidado de personas; vendió una heladera |
| Vecino | `joaquin@sampacho.test` | Vecino común; reclamo resuelto **sin calificar** |
| Vecina | `nelida@sampacho.test` | Usa **letra grande** (accesibilidad) |
| Vecino | `ramiro@sampacho.test` | Autor del contenido de spam (ya retirado u oculto) |
| Suspendido | `suspendido@sampacho.test` | **No debe poder ingresar** |

## 4. Qué hay cargado

| Módulo | Contenido y estados incluidos |
|---|---|
| **Hoy en Sampacho** | Alerta vigente (banner rojo), avisos importantes e informativos, un aviso urgente **programado para dentro de 2 h** ("cambios de servicios"), uno vencido y uno cancelado, farmacia de turno de los próximos 45 días, evento hoy, residuos hoy y mañana en Estación, destacado de la semana, consultas abiertas, resultados |
| **Muro** | 28 publicaciones: avisos, 7 eventos (hoy, mañana, +4, +9, +25, uno pasado, uno cancelado), noticias, ventas (nueva, usada, vendida, vencida), perdidos (abierto y resuelto), empleo. Con fotos, comentarios, "me gusta" |
| **Moderación** | Un spam con 2 denuncias (falta 1 para ocultarse solo), una venta ya oculta por 3 denuncias, un comentario oculto, una publicación eliminada, una ficha eliminada, un pedido retirado |
| **Reclamos** (10) | Recibido ×3, en revisión ×2, en proceso ×2 (uno con **actualización vencida**), resuelto ×2 (uno calificado, otro **sin calificar**), rechazado con motivo. Con notas internas, fotos, mapa y respuestas |
| **Incidentes** | Uno activo con 2 reclamos, uno cerrado, y 3 reclamos libres que el panel **sugiere agrupar** |
| **Guía y oficios** | 21 fichas: comercios por rubro (2 alojamientos, 2 de gastronomía), 9 oficios (matrícula, urgencias, verificadas), 34 opiniones con respuestas del dueño, fichas "Nuevo" (menos de 3 opiniones) y sin opiniones |
| **Pedidos (Necesito)** | Abierto con 2 respuestas, abierto sin respuestas, **vencido** (renovable), resuelto con respuesta elegida y agradecimiento, cancelado, con respuesta oculta |
| **Empleo** | Ofertas y búsquedas, una cubierta y una vencida |
| **Ideas** | En marcha (huerta), propuesta, con marca "en estudio municipal", realizada (con resultado), cancelada, una retirada. Necesidades con compromisos en **todos** los estados (pendiente, aceptada, cumplida parcial y total, rechazada, retirada), con **cupo ajustado** para probar "No hay cupo"; permisos en cada estado; novedades |
| **Encuestas** | Abierta para todos, abierta solo para Norte, cerrada con resultados, nueva sin votos |
| **Residuos** | Cronograma de las 7 zonas (común, reciclables, verde, voluminosos) |
| **Turismo** | 6 lugares y consejos con mapa |
| **Destacado** | 3 semanas anteriores elegidas, 2 comercios postulados esta semana (se elige solo al abrir la app) y 1 para la próxima |
| **Avisos y seguimientos** | Seguimientos y preferencias de varios vecinos, notificaciones leídas, sin leer, urgentes y programadas para el resumen |

## 5. Del entorno de pruebas al lanzamiento

Los datos de prueba **no deben quedar** en el sitio real. Para pasar a producción:

1. Detené la app.
2. Hacé una copia de la carpeta de datos si querés conservar algo.
3. Vaciá la base y las fotos de prueba (**borra todo lo que haya**): `npm run seed -- --reset --yes --no-seed --allow-production`.
4. Iniciá la app (la base se crea vacía y con el esquema al día).
5. Creá la primera cuenta real de la municipalidad:

   ```bash
   ADMIN_PASSWORD='otra-contraseña-larga-y-única' npm run create-admin -- --email=gestion@sampacho.gob.ar --name="Municipalidad de Sampacho"
   ```

6. Desde **Panel → Usuarios** esa cuenta asigna los roles de moderación y de municipio a otras personas.
7. Cargá lo real: teléfonos útiles, farmacias de turno, cronograma de residuos y la guía del visitante.

## 6. Guía de pruebas por rol

### Visitante (sin cuenta)
- [ ] Inicio: banner de alerta, avisos, farmacia, evento de hoy, residuos, destacado, consultas y resultados.
- [ ] Elegir una zona en el inicio (sin permiso de ubicación) filtra los avisos; "Todo el pueblo" los vuelve a mostrar.
- [ ] El muro, la guía (con mapa), oficios, agenda, útiles, residuos, visitar y transparencia se ven sin ingresar.
- [ ] `/reclamos`, `/panel` y `/notificaciones` redirigen a ingresar. Un reclamo por URL directa no se puede abrir.
- [ ] El aviso vencido figura "Finalizado" y el cancelado "Cancelado"; ninguno aparece como vigente en el inicio.
- [ ] Botón de emergencias y página sin conexión (`/offline`).

### Vecino (Marta, Luis, Carla…)
- [ ] Ingresar y cerrar sesión. La cuenta suspendida **no** entra.
- [ ] Publicar en el muro con fotos (comprimidas); cada categoría muestra sus campos propios.
- [ ] Comentar, dar "me gusta", compartir; **denunciar** una publicación ajena.
- [ ] Cerrar una venta propia, o "Ya apareció" en una búsqueda, con y sin agradecimiento público.
- [ ] Presentar un reclamo con mapa y fotos; seguirlo; ver responsable, última respuesta y próxima actualización. Joaquín puede **calificar** el suyo resuelto.
- [ ] Un vecino **no ve** reclamos ajenos ni notas internas (404).
- [ ] Calificar un comercio u oficio (una por vecino, editable); el dueño no puede calificar el suyo; fichas "Nuevo" con menos de 3.
- [ ] Sumar un comercio u oficio; postularlo al destacado; responder un pedido con su ficha.
- [ ] Pedir algo en "Necesito"; elegir una respuesta; cerrar; renovar el vencido.
- [ ] Publicar un aviso de trabajo; marcarlo cubierto.
- [ ] Ideas: "Me sumo", proponer un aporte, retirarlo; ver el grupo de WhatsApp solo tras sumarse.
- [ ] Votar una encuesta (una sola vez); la de Norte solo vota quien tiene ese barrio.
- [ ] Seguir temas, zonas y comercios; elegir frecuencia y horario de descanso; bandeja de avisos con campanita.
- [ ] Nélida: la letra grande se aplica en todo el sitio.

### Moderación (Rosa)
- [ ] Panel → **Denuncias**: ver el spam y la venta oculta; descartar o confirmar.
- [ ] Panel → **Contenido**: retirar publicaciones, comentarios, pedidos, fichas, opiniones, ideas, empleo. Los avisos oficiales muestran "Solo municipio".
- [ ] **No puede** abrir reclamos ni incidentes (404 o redirección).
- [ ] Panel → Usuarios: suspender a un vecino.

### Municipalidad (municipio y obras)
- [ ] Resumen con cifras, reclamos abiertos y **actualizaciones vencidas**.
- [ ] Bandeja de reclamos con filtros y mapa; gestionar uno: estado, área, **próxima actualización**, respuesta visible y nota interna. Las transiciones inválidas se rechazan; cerrar sin explicación se rechaza.
- [ ] Editar el mismo reclamo desde dos pestañas: la segunda recibe un conflicto.
- [ ] Incidentes: agrupar los reclamos sugeridos; enviar una **actualización común** y resolver los vinculados.
- [ ] Publicar un aviso (con nivel, zona y vigencia); corregirlo (avisa a los seguidores); cancelarlo.
- [ ] **Alertas**: emitir una de clima; aparece el banner y llega a la bandeja de todos.
- [ ] Crear una **encuesta**; cerrarla y ver resultados.
- [ ] Cargar teléfonos, farmacias de turno, cronograma de residuos y lugares para visitar.
- [ ] Elegir al destacado de la semana.
- [ ] Idea de la huerta: aprobar o rechazar un permiso con referencia.
- [ ] **Transparencia**: cifras agregadas, sin nombres ni textos.
- [ ] Probar que **ningún** botón elimina un reclamo.

### Pruebas técnicas
- [ ] `npm run build` y `npm run start` sin errores.
- [ ] En el teléfono, instalar la app (PWA) y abrir `/offline` sin señal.
- [ ] Activar avisos al teléfono en "Qué sigo" (requiere claves VAPID y HTTPS) y emitir una alerta.
- [ ] Reiniciar el servidor: los datos y las fotos siguen ahí (comprueba el disco persistente).
