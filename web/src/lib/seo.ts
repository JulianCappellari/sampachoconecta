import { SITE_DESCRIPTION, SITE_NAME, abs } from "./site";
import { clamp } from "./format";

/** Fechas locales de Argentina (UTC-3, sin horario de verano) a ISO 8601 con zona. */
export function schemaDate(s: string | null | undefined): string | undefined {
  if (!s) return undefined;
  const t = s.trim().replace(" ", "T");
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(t)) return t;
  return `${t.length === 10 ? `${t}T00:00` : t}${t.length <= 16 ? ":00" : ""}-03:00`;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const photoUrl = (name: string) => abs(`/api/fotos/${name}`);

export function homeJsonLd() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": abs("/#sitio"),
      name: SITE_NAME,
      url: abs("/"),
      description: SITE_DESCRIPTION,
      inLanguage: "es-AR",
      about: { "@type": "City", name: "Sampacho", containedInPlace: { "@type": "AdministrativeArea", name: "Córdoba, Argentina" } },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": abs("/#organizacion"),
      name: SITE_NAME,
      url: abs("/"),
      logo: abs("/icons/icon-512.png"),
      areaServed: { "@type": "City", name: "Sampacho" },
    },
  ];
}

type ListingLike = {
  name: string;
  description: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string;
  photos: string[];
  open_time: string | null;
  close_time: string | null;
  open_days: string | null;
  avg: number;
  count: number;
};

export function listingJsonLd(l: ListingLike, path: string) {
  const days = (l.open_days ?? "").split(",").filter((d) => d !== "").map(Number).filter((d) => d >= 0 && d <= 6);
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${abs(path)}#negocio`,
    name: l.name,
    description: clamp(l.description, 300),
    url: abs(path),
    telephone: l.phone,
    image: l.photos.length ? l.photos.map(photoUrl) : undefined,
    address: { "@type": "PostalAddress", streetAddress: l.address ?? undefined, addressLocality: "Sampacho", addressRegion: "Córdoba", addressCountry: "AR" },
    geo: l.lat != null && l.lng != null ? { "@type": "GeoCoordinates", latitude: l.lat, longitude: l.lng } : undefined,
    openingHoursSpecification: l.open_time && l.close_time && days.length ? [{ "@type": "OpeningHoursSpecification", dayOfWeek: days.map((d) => DAYS[d]), opens: l.open_time, closes: l.close_time }] : undefined,
    // Calificaciones reales de vecinos; solo se informan si existen.
    aggregateRating: l.count > 0 ? { "@type": "AggregateRating", ratingValue: Number(l.avg.toFixed(1)), reviewCount: l.count, bestRating: 5, worstRating: 1 } : undefined,
  };
}

type EventLike = {
  title: string;
  body: string;
  event_at: string | null;
  event_end_at: string | null;
  event_place: string | null;
  lifecycle: string;
  photos: string[];
};

export function eventJsonLd(p: EventLike, path: string) {
  const start = schemaDate(p.event_at);
  if (!start) return undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: p.title,
    description: clamp(p.body, 300),
    url: abs(path),
    startDate: start,
    endDate: schemaDate(p.event_end_at),
    eventStatus: p.lifecycle === "cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: p.event_place ?? "Sampacho", address: { "@type": "PostalAddress", addressLocality: "Sampacho", addressRegion: "Córdoba", addressCountry: "AR" } },
    image: p.photos.length ? p.photos.map(photoUrl) : undefined,
  };
}

/** Imagen para compartir: la primera foto de la publicación o, si no hay, la imagen general del sitio. */
export const shareImages = (photos: string[]) => (photos.length ? [{ url: photoUrl(photos[0]), alt: "Foto de la publicación" }] : undefined);
