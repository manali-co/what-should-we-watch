
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

