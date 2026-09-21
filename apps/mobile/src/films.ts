
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

// "1 h 43 m" / "34 m" / "2 h" — never a leading "0 h".
export const formatRuntime = (m?: number | null): string => {
  if (!m) return "";
  const h = Math.floor(m / 60), min = m % 60;
  return h ? (min ? `${h} h ${min} m` : `${h} h`) : `${min} m`;
};

