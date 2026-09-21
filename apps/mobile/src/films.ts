// Mock deck used until the catalog + recommendation engine are built.
// Shape mirrors what /v1/sessions will return so swapping to real data is trivial.
export type Film = {
  id: string;
  title: string;
  year: number;
  runtimeMin: number;
  service: string;
  leavingInDays?: number;
  why: string;
  wildcard?: boolean;
};

export const MOCK_DECK: Film[] = [
  { id: "1", title: "In the Mood for Love", year: 2000, runtimeMin: 98, service: "Max", why: "You keep 'quiet and tender' late on weeknights; this is the most beautiful version of it." },
  { id: "2", title: "Hunt for the Wilderpeople", year: 2016, runtimeMin: 101, service: "Hulu", why: "Big laughs with a soft centre, and it's under two hours like you asked." },
  { id: "3", title: "Sicario", year: 2015, runtimeMin: 121, service: "Prime Video", leavingInDays: 6, why: "Edge of the seat and gorgeous to look at. Leaving Prime this week." },
  { id: "4", title: "Paddington 2", year: 2017, runtimeMin: 103, service: "Netflix", why: "Your comfort rewatches skew warm and funny. Nothing lands better than this." },
  { id: "5", title: "Coherence", year: 2013, runtimeMin: 89, service: "Tubi", why: "A mind-bender that needs no budget, just your attention. Short and sharp." },
  { id: "6", title: "The Handmaiden", year: 2016, runtimeMin: 145, service: "Prime Video", why: "Dark and twisty, a proper epic. You linger on films like this." },
  { id: "7", title: "Booksmart", year: 2019, runtimeMin: 102, service: "Hulu", why: "Coming of age with real jokes. Your weekend picks trend exactly here." },
  { id: "8", title: "Arrival", year: 2016, runtimeMin: 116, service: "Max", why: "Outer space, but the quiet kind. It rewards the mood you're in tonight." },
  { id: "9", title: "The Nice Guys", year: 2016, runtimeMin: 116, service: "Netflix", why: "A stretch for you: noir comedy. Your laughs-plus-tension pattern says yes." },
  { id: "10", title: "Aftersun", year: 2022, runtimeMin: 102, service: "Max", wildcard: true, why: "Wildcard. Quiet and devastating. Not what you'd pick, but it stays with people like you." },
];
