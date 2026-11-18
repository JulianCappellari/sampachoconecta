import { WASTE_KINDS } from "./constants";

/** Etiqueta legible del tipo de recolección (sin dependencias de servidor, usable en componentes). */
export const kindLabel = (k: string) => WASTE_KINDS.find((x) => x.id === k)?.label ?? k;
