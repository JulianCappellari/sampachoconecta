import "server-only";
import { all } from "./db";
import { PLACE_KINDS } from "./constants";
export type Place = {
    id: number;
    kind: string;
    name: string;
    description: string;
    address: string | null;
    lat: number | null;
    lng: number | null;
};
export const listPlaces = async () => await all<Place>("SELECT id,kind,name,description,address,lat,lng FROM tourist_places ORDER BY sort, id");
export const placeKindLabel = (k: string) => PLACE_KINDS.find((x) => x.id === k)?.label ?? k;
