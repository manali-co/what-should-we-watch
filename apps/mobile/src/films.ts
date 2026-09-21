import { API_BASE } from "./theme";

export type Film = {
  id: string;
  title: string;
  year: number | null;
  runtimeMin: number | null;
  service: string;
  link?: string;
  leavingInDays?: number | null;
  posterUrl?: string;
  why: string;
  wildcard?: boolean;
};

const SERVICE_LABEL: Record<string, string> = {
  netflix: "Netflix", prime: "Prime Video", disney: "Disney+", hbo: "Max",
  hulu: "Hulu", apple: "Apple TV+", paramount: "Paramount+", peacock: "Peacock",
};
export const serviceLabel = (id: string) => SERVICE_LABEL[id] ?? id;

export async function fetchDeck(services: string[]): Promise<Film[]> {
  const svc = services.length ? `&services=${services.join(",")}` : "";
  const r = await fetch(`${API_BASE}/v1/catalog/deck?country=us&limit=10${svc}`);
  if (!r.ok) throw new Error(`deck ${r.status}`);
  const data = await r.json();
  return (data.films ?? []) as Film[];
}
