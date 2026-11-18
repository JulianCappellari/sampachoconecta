export const SAMPACHO_CENTER: [number, number] = [-33.3836, -64.7186];

export const POST_CATEGORIES = [
  { id: "noticia", label: "Noticia", color: "#2D69C4" },
  { id: "venta", label: "Venta", color: "#8F6400" },
  { id: "evento", label: "Evento", color: "#B83C78" },
  { id: "aviso", label: "Aviso oficial", color: "#0E6B5A" },
  { id: "perdido", label: "Perdidos y encontrados", color: "#C1571F" },
  { id: "empleo", label: "Empleo", color: "#6650C9" },
] as const;
export type PostCategory = (typeof POST_CATEGORIES)[number]["id"];
export const postCategory = (id: string) =>
  POST_CATEGORIES.find((c) => c.id === id) ?? POST_CATEGORIES[0];

export const CLAIM_CATEGORIES = [
  "Alumbrado",
  "Calles y baches",
  "Residuos",
  "Agua y cloacas",
  "Arbolado",
  "Animales sueltos",
  "Ruidos molestos",
  "Otro",
] as const;

export const CLAIM_STATUS = [
  { id: "recibido", label: "Recibido", tone: "neutral" },
  { id: "en_revision", label: "En revisión", tone: "info" },
  { id: "en_proceso", label: "En proceso", tone: "warn" },
  { id: "resuelto", label: "Resuelto", tone: "ok" },
  { id: "rechazado", label: "Rechazado", tone: "err" },
] as const;
export type ClaimStatus = (typeof CLAIM_STATUS)[number]["id"];
export const claimStatus = (id: string) =>
  CLAIM_STATUS.find((s) => s.id === id) ?? CLAIM_STATUS[0];
export const CLAIM_AREAS = [
  "Obras Públicas",
  "Servicios Públicos",
  "Tránsito",
  "Medio Ambiente",
  "Salud y Acción Social",
  "Otra área",
] as const;

export const SHOP_CATEGORIES = [
  "Alojamiento",
  "Almacén",
  "Panadería",
  "Carnicería",
  "Farmacia",
  "Ferretería",
  "Gastronomía",
  "Indumentaria",
  "Salud",
  "Servicios",
  "Otros",
] as const;

export const TRADE_CATEGORIES = [
  "Electricista",
  "Gasista",
  "Plomero",
  "Albañil",
  "Pintor",
  "Carpintero",
  "Jardinero",
  "Fletero",
  "Cuidado de personas",
  "Otros",
] as const;

export const BARRIOS = [
  "Centro",
  "Norte",
  "Sur",
  "Este",
  "Oeste",
  "Estación",
  "Zona rural",
] as const;

export const IDEA_STATUS = [
  { id: "propuesta", label: "Propuesta" },
  { id: "en_marcha", label: "En marcha" },
  { id: "realizada", label: "Realizada" },
  { id: "cancelada", label: "Cancelada" },
] as const;
export const ideaStatus = (id: string) =>
  IDEA_STATUS.find((s) => s.id === id) ?? IDEA_STATUS[0];

export const IDEA_CATEGORIES = [
  "Espacios verdes",
  "Deporte",
  "Cultura",
  "Educación",
  "Solidaridad",
  "Seguridad vial",
  "Ambiente",
  "Otra",
] as const;

export const PHONE_CATEGORIES = ["Emergencias", "Municipio", "Salud", "Servicios", "Otros"] as const;

export const WA_GROUP_PREFIX = "https://chat.whatsapp.com/";

export type Role = "vecino" | "moderador" | "municipio";

/** Rubros para pedidos y seguimientos (sin repetir «Otros», que existe en comercios y en oficios). */
export const REQUEST_CATEGORIES: readonly string[] = [...new Set<string>([...TRADE_CATEGORIES, ...SHOP_CATEGORIES])];
export const SEVERITY = { informativo: "Informativo", importante: "Importante", urgente: "Urgente" } as const;
export const NEED_KINDS = [
  { id: "personas", label: "Personas", unit: "personas" },
  { id: "materiales", label: "Materiales", unit: "unidades" },
  { id: "herramientas", label: "Herramientas", unit: "unidades" },
  { id: "espacio", label: "Espacio", unit: "espacios" },
  { id: "permiso", label: "Permiso o gestión", unit: "trámite" },
] as const;

/** Transiciones ordinarias de un reclamo. Resuelto y rechazado son finales (no se reabren). */
export const CLAIM_NEXT: Record<string, string[]> = {
  recibido: ["en_revision"],
  en_revision: ["en_proceso", "rechazado", "resuelto"],
  en_proceso: ["resuelto", "rechazado"],
};

export const ALERT_KINDS = [
  { id: "tormenta", label: "Tormenta fuerte", text: "Se esperan tormentas fuertes. Evitá salir, no te refugies bajo árboles y asegurá objetos que puedan volar." },
  { id: "granizo", label: "Posible granizo", text: "Hay riesgo de granizo. Si podés, guardá el auto bajo techo y alejate de ventanas." },
  { id: "viento", label: "Vientos fuertes", text: "Se esperan vientos fuertes. Asegurá techos, chapas y objetos sueltos." },
  { id: "calor", label: "Calor extremo", text: "Se esperan temperaturas muy altas. Tomá agua, evitá el sol del mediodía y cuidá a niños y mayores." },
  { id: "frio", label: "Frío extremo o heladas", text: "Se esperan heladas. Protegé a quienes viven en la calle, a los mayores y a las plantas." },
  { id: "inundacion", label: "Anegamientos o calles cortadas", text: "Hay calles anegadas o cortadas. Evitá circular por la zona afectada." },
  { id: "ruta", label: "Ruta o acceso cortado", text: "Hay un corte en una ruta o acceso al pueblo. Planificá tu viaje con otro recorrido." },
] as const;
export const SMN_URL = "https://www.smn.gob.ar/";

export const WASTE_KINDS = [
  { id: "comun", label: "Residuos comunes" },
  { id: "reciclables", label: "Reciclables" },
  { id: "verde", label: "Poda y residuos verdes" },
  { id: "voluminosos", label: "Voluminosos" },
] as const;
export const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"] as const;

export const JOB_KINDS = [
  { id: "oferta", label: "Ofrecen trabajo" },
  { id: "busco", label: "Buscan trabajo" },
] as const;

export const PLACE_KINDS = [
  { id: "atractivo", label: "Para conocer" },
  { id: "fiesta", label: "Fiestas y tradiciones" },
  { id: "consejo", label: "Consejos para el visitante" },
] as const;
