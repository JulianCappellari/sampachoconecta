# Emergencias rápidas y clima de Sampacho

Implementado por Codex el 18/11/2026. Complementa la aplicación existente; sin migraciones de base de datos ni servicios pagos contratados.

Ajuste visual pedido por el usuario: el acceso de emergencia ahora muestra solo el icono en un círculo de 48 px, con nombre accesible. El clima es un bloque secundario de 288 px de ancho en escritorio y unos 149 px de alto cerrado, junto al encabezado de Hoy. Muestra temperatura, resumen y atribución; cifras completas, fuentes y metodología quedan bajo «Ver pronóstico». La lógica y los datos no cambiaron.

Corrección de escritorio: desde 1024 px, «Ver pronóstico» abre un panel flotante de 416 px con altura limitada y scroll interno; no agranda la fila ni desplaza el título. Se cierra con Escape o al salir el foco. En móvil/tablet el detalle sigue abriéndose dentro de la tarjeta.

## Acceso rápido a emergencias

- `web/src/components/site/EmergencyButton.tsx` se monta en el layout global, para visitantes y usuarios con sesión.
- Botón fijo «Emergencias» con Hospital 107, Bomberos 100 y Policía 101. La elección abre un enlace `tel:`; la aplicación no hace una llamada automáticamente.
- Números tomados de la [publicación oficial de la Municipalidad de Sampacho del 10/10/2026](https://sampacho.gob.ar/ultimas-noticias/sampacho-refuerza-las-recomendaciones-de-prevencion-ante-posibles-tormentas-intensas/). Solo se incorporaron las líneas cortas allí verificadas, no teléfonos ficticios de los datos de demostración.
- Datos centralizados en `web/src/lib/emergency.ts`, con enlace de fuente visible en el panel.
- Cierre por botón, Escape, toque fuera o al mover el foco fuera. Escape devuelve el foco al disparador. No bloquea el resto de la página ni exige inicio de sesión.
- En móvil queda por encima de la navegación inferior, respetando áreas seguras. El panel tiene altura máxima y desplazamiento propio en pantallas bajas.
- En escritorio y móvil usa colores, tipografías e iconos del sistema existente. El rojo de la acción conserva contraste con texto blanco en ambos temas.
- Ajuste pequeño en Header: envolver «Registrarme» en un contenedor responsive evita el conflicto entre `inline-flex` del botón y `hidden`, que provocaba desborde del encabezado en móvil.

## Clima: fuentes y límites

El widget vive dentro de «Hoy en Sampacho». Consulta **tres modelos globales distintos mediante un único distribuidor**, Open-Meteo:

| Modelo | Organismo | Identificador solicitado |
|---|---|---|
| IFS | ECMWF, Centro Europeo | `ecmwf_ifs025` |
| GFS | NOAA, Estados Unidos | `gfs_global` |
| ICON | DWD, Alemania | `icon_global` |

La [documentación de Open-Meteo](https://open-meteo.com/en/docs) explica la comparación por modelos y sus variables. Son pronósticos calculados, no observaciones en vivo de una estación de Sampacho. Consultar cada diez minutos no significa que los organismos ejecuten sus modelos cada diez minutos.

La interfaz muestra fuente, hora de consulta y hora de la estimación, convertidas a `America/Argentina/Buenos_Aires`. Incluye enlaces a Open-Meteo y al SMN para pronóstico y alertas oficiales. La aplicación no calcula ni emite alertas oficiales.

## Síntesis implementada

1. Usar las coordenadas de Sampacho ya definidas en `constants.ts`, sin pedir ni transmitir ubicación del vecino.
2. Pedir tres días de series horarias, con instantes Unix UTC, °C, mm y km/h. Validar unidades, orden, continuidad, longitudes y valores finitos/plausibles.
3. Tomar temperatura de la hora vigente y exactamente las doce horas siguientes de cada modelo. Un `null` nunca equivale a cero lluvia; una fuente con ventana incompleta no entra en la síntesis.
4. Temperatura destacada: mediana entre modelos. Rango futuro: mediana de sus mínimas/máximas de las próximas doce horas. Viento: mediana de máximos horarios en esa ventana, no ráfagas.
5. Considerar que un modelo prevé lluvia si acumula al menos 0,5 mm en doce horas. Mostrar cuántos coinciden. Esa proporción **no** es una probabilidad de precipitación ni de acierto.
6. «Coincidencia alta»: al menos dos modelos, misma clasificación de lluvia y diferencia térmica de hasta 3 °C; moderada hasta 5 °C. Fuera de eso mostrar diferencias. Es una heurística explicada, no una certificación estadística de confianza.
7. Si todos prevén lluvia pero la diferencia de acumulados es de al menos 5 mm y el mayor duplica al menor, explicitar desacuerdo en cantidad y mostrar el rango. Evita ocultar discrepancias importantes detrás de un consenso sobre ocurrencia.
8. Con una sola fuente, decirlo y no afirmar un consenso. El detalle identifica modelos faltantes y permite ver las cifras por modelo.

## Servicio y recuperación de errores

- `weather-core.ts`: validación, síntesis y caché pública, sin dependencias Next ni datos de sesión. Permite pruebas deterministas con reloj y cargador inyectados.
- `weather.ts`: adaptador `server-only`, tres solicitudes paralelas al endpoint HTTPS fijo con timeout de 7 segundos. El visitante no controla URL, coordenadas ni modelo.
- `/api/clima`: ruta pública GET para datos de Sampacho; respuesta `no-store`. Sin cookies ni información privada.
- Caché del servicio durante diez minutos por proceso; solicitudes simultáneas comparten una promesa. En caída parcial/total se espera un minuto antes de reintentar para no golpear al proveedor.
- Si existe alguna respuesta nueva utilizable, se usan solo fuentes nuevas; no se mezcla una fuente antigua con otra recién consultada. Si fallan todas, se conserva la última consulta y se etiqueta como anterior. Después de dos horas se deja de mostrar.
- `WeatherWidget.tsx`: carga independiente del resto del inicio, estado de carga, consulta cada diez minutos mientras está visible y al volver a la pestaña. Timeout cliente de doce segundos, reintento manual ante fallo y cancelación al desmontar.
- La caché no es persistente y se pierde al reiniciar el proceso. En despliegues con varias instancias se recomienda un caché compartido para limitar consumo; no hay límites globales distribuidos implementados.
- No se simulan temperaturas ni se usa un pronóstico fijo cuando la consulta falla.

## Operación y uso de la API

La integración actual usa el endpoint público no comercial. Open-Meteo exige atribución, incluida en la interfaz, y diferencia el acceso gratuito no comercial del comercial. Revisar [términos y límites del proveedor](https://open-meteo.com/en/terms) antes de monetizar o desplegar a escala. No se configuraron credenciales ni se contrataron planes.

Las llamadas reales se verificaron desde el servidor local con los tres modelos. Los servicios externos pueden dejar de responder o cambiar disponibilidad; los estados parcial, anterior y no disponible se contemplan explícitamente.

## Verificación

```powershell
cd web
node --test scripts/weather.test.mjs
npx tsc --noEmit
npm run lint
npm run build
```

Las pruebas comprueban unidades, intervalos, mediana, desacuerdos, lluvia nula, modelos duplicados, datos antiguos, caída de fuentes, caché/cooldown y solicitudes simultáneas. La QA de interfaz debe comprobar móvil/escritorio, apertura/cierre, enlaces `tel:` sin hacer llamadas reales, foco, detalle de fuentes y estados de error.

En esta sesión la compilación inicialmente falló en el worker CSS de Turbopack. Se conservaron los artefactos generados previos bajo `.next/cache/turbopack-before-codex-T004` y `.next/build-before-codex-T004`, dentro del directorio ignorado `.next/`, y una compilación con caché nueva terminó correctamente. No se alteró la configuración del compilador ni los datos de la aplicación.
