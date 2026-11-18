# Permisos — implementación actual

- Updated: 2026-11-18. Agent: Codex, T-20261118-013. VERIFIED en código y QA local; no certifica proveedores externos.
- Fuente: web/src/lib/auth.ts, src/actions y páginas/rutas; [QA](../../docs/QA_VERCEL_NEON.md). Suspensión hace que getUser devuelva null y elimina sesiones al suspender.

| Actor | Alcance |
|---|---|
| Visitante | Lectura pública de novedades, guía/oficios, agenda, información útil, pedidos/empleo/ideas visibles, encuestas/resultados permitidos y transparencia agregada. Registro/ingreso. Sin acceso a reclamos/fotos privadas ni panel |
| Cuenta activa (vecino, moderador, municipio) | Publicar y operar su propio contenido; calificar fichas ajenas; votar una vez según zona/vigencia; seguir y administrar sus avisos/preferencias. Puede presentar y consultar su propio reclamo |
| Autor de reclamo | Ver su reclamo, fotos y eventos visibles; calificar si está resuelto. No borrar reclamo/historial ni ver notas municipales |
| Moderador | Moderar lista cerrada de contenido/denuncias, verificar fichas y suspender vecinos; no asignar roles, emitir avisos oficiales, gestionar incidentes o acceder a reclamos ajenos |
| Municipio | Panel municipal, reclamos/notas/fotos, incidentes y avisos/alertas/encuestas, teléfonos/farmacias/residuos/turismo/destacados, permisos de ideas y roles ajenos. No gestiona un reclamo que presentó él mismo |
| Organizador de idea | Necesidades/objetivos, aceptar/rechazar y confirmar aportes, novedades, enlace de grupo y cierre. No aprobar un permiso municipal por ser organizador |
| Participante | Proponer/ajustar/retirar dentro de las reglas; ver su detalle. Nombres públicos solo con consentimiento; el organizador ve los aportes de su idea |
| Dueño de ficha | Responder opiniones y postularse; no calificarse. Responder un pedido con ficha propia y activa |

Los roles se verifican en el servidor, no solo ocultando botones. setUserRole no cambia el propio rol; suspensión afecta solo vecinos y se valida en el UPDATE. Las fotos c requieren autor o municipio; moderación solo las ve si es autor, no por su rol. La ruta de reclamo ajeno devuelve 404. La lista moderable excluye reclamos/historial y la base bloquea DELETE/TRUNCATE; reset CLI deliberado es una operación administrativa distinta.

La verificación externa de identidad permanece pendiente: el registro marca verificado inmediatamente. Las encuestas no son una votación oficial ni acreditan residencia. Estos límites están documentados, no resueltos por la migración.
