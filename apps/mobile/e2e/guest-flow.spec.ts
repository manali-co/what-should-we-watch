import { test, expect, Page } from "@playwright/test";

// A deterministic deck, so the flow never depends on the live catalog API.
const FILMS = [
  { id: "f1", title: "The Quiet Hour", year: 2021, runtimeMin: 98, service: "netflix", why: "A slow burn that rewards patience — your kind of Tuesday." },
  { id: "f2", title: "Midnight Cartography", year: 2019, runtimeMin: 112, service: "hulu", why: "Stranger the later it gets, exactly where you go after 10." },
  { id: "f3", title: "Paper Boats", year: 2023, runtimeMin: 89, service: "hbo", why: "Tender and short — under two hours, like you prefer." },
];

async function mockApi(page: Page) {
  await page.route("**/v1/catalog/deck*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ films: FILMS }) }));
  await page.route("**/v1/catalog/decisions*", (route) => route.fulfill({ status: 204, body: "" }));
  // Intelligence endpoints: rank the kept shortlist (echo the posted order + a verdict) and
  // return a cold-start taste profile, so tests never depend on the live engine.
  await page.route("**/v1/catalog/results*", async (route) => {
    const kept = (route.request().postDataJSON()?.kept ?? []) as { title: string }[];
    const verdict = kept.length ? `Tonight, ${kept[0].title}.` : "";
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ films: kept, verdict }) });
  });
  await page.route("**/v1/catalog/taste*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      notes: "", total: 0, actions: { like: 0, maybe: 0, dislike: 0, watched: 0 },
      reactions: { loved: 0, okay: 0, disliked: 0 }, topMoods: [], patterns: [],
    }) }));
}

async function enterAsGuest(page: Page) {
  await page.goto("/");
  await expect(page.getByText("Get started")).toBeVisible({ timeout: 25_000 });
  await page.getByText("Continue as guest").click();
}

async function completeOnboarding(page: Page) {
  // Step 1 — country
  await expect(page.getByText(/You’re watching from/)).toBeVisible();
  await page.getByText("That’s right").click();
  // Step 2 — detected services are pre-selected, so the continue CTA is already actionable.
  await page.getByText(/Continue with \d+ services?/).click();
  // Step 3 — name is optional
  await page.getByText("Skip for now").click();
}

test.describe("guest flow (web)", () => {
  test.beforeEach(async ({ page }) => { await mockApi(page); });

  test("welcome screen offers guest entry", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Get started")).toBeVisible({ timeout: 25_000 });
    await expect(page.getByText("Continue as guest")).toBeVisible();
  });

  test("guest completes onboarding and reaches the mood screen", async ({ page }) => {
    await enterAsGuest(page);
    await completeOnboarding(page);
    // Mood screen shows moods and the deal bar.
    await expect(page.getByText("Deal ten").or(page.getByText("Surprise us"))).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("mind-bender", { exact: true })).toBeVisible();
  });

  test("mood selection deals a deck of (mocked) films", async ({ page }) => {
    await enterAsGuest(page);
    await completeOnboarding(page);
    await page.getByText("cozy", { exact: true }).first().click();
    await page.getByText("Deal ten").click();
    // After the thinking screen, the (mocked) first film appears on the deck.
    // The deck stacks the top card over the next one, so the title can appear twice.
    await expect(page.getByText(FILMS[0].title).first()).toBeVisible({ timeout: 25_000 });
  });

  test("settings shows the guest banner and gates account-only features", async ({ page }) => {
    await enterAsGuest(page);
    await completeOnboarding(page);
    await page.getByTestId("tab-settings").click();
    await expect(page.getByText("You’re a guest.")).toBeVisible({ timeout: 15_000 });
    // Tapping an account-only row opens the sign-in Gate, not the feature.
    // (Target the row by its unique subtitle — "Account" is also a section label.)
    await page.getByText("Name, email, connected services").click();
    await expect(page.getByText("Sign in to keep this")).toBeVisible();
    // The gate is dismissible — it never blocks the core loop.
    await page.getByText("Not now").click();
    await expect(page.getByText("Sign in to keep this")).toBeHidden();
  });

  test("guest can move between the main tabs", async ({ page }) => {
    await enterAsGuest(page);
    await completeOnboarding(page);
    await page.getByTestId("tab-shortlist").click();
    await page.getByTestId("tab-taste").click();
    await page.getByTestId("tab-settings").click();
    await expect(page.getByText("You’re a guest.")).toBeVisible();
  });

  test("taste shows an honest cold-start, not fabricated patterns", async ({ page }) => {
    await enterAsGuest(page);
    await completeOnboarding(page);
    await page.getByTestId("tab-taste").click();
    // A brand-new viewer must see the truthful empty state, never invented data.
    await expect(page.getByText("We’re still learning your taste.")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("With Jo")).toHaveCount(0);
    // …and the "we've learned a fair bit about you" nudge must not appear before we have.
    await expect(page.getByText("This is only on this phone")).toHaveCount(0);
  });
});

test.describe("Disco avatar picker (web)", () => {
  test.beforeEach(async ({ page }) => { await mockApi(page); });

  test("a guest can open the picker from the mood header, change and save a Disco", async ({ page }) => {
    await enterAsGuest(page);
    await completeOnboarding(page);
    // The mood-header avatar opens the picker (the design's `onSelf`).
    await page.getByLabel("Change your Disco").first().click();
    await expect(page.getByText("Your Disco.")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("swipe it · ↔ face · ↕ colour")).toBeVisible();
    // Save is disabled until something changes; stepping a dial makes it dirty.
    await page.getByLabel("next Colour").click();
    await page.getByText("Save", { exact: true }).click();
    // Back on the mood screen.
    await expect(page.getByText(/feels like/)).toBeVisible({ timeout: 10_000 });
  });
});

// The deck's PanResponder responds to touch events, not synthetic mouse drags, so a
// right-swipe is driven by dispatching a real touch sequence on the top card.
async function swipeRight(page: Page, title: string) {
  const box = await page.getByText(title).first().boundingBox();
  if (!box) throw new Error(`no card for ${title}`);
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return;
    const mk = (c: number) => new Touch({ identifier: 1, target: el, clientX: c, clientY: y, pageX: c, pageY: y, radiusX: 10, radiusY: 10, force: 1 });
    const fire = (type: string, c: number, end: boolean) =>
      el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, composed: true, touches: end ? [] : [mk(c)], changedTouches: [mk(c)], targetTouches: end ? [] : [mk(c)] }));
    fire("touchstart", x, false);
    for (let i = 1; i <= 14; i++) fire("touchmove", x + i * 20, false);
    fire("touchend", x + 280, true);
  }, { x: cx, y: cy });
  await page.waitForTimeout(800);
}

async function dealADeck(page: Page) {
  if (await page.getByText("cozy", { exact: true }).count()) await page.getByText("cozy", { exact: true }).first().click();
  await page.getByText("Deal ten").click();
  await expect(page.getByText(FILMS[0].title).first()).toBeVisible({ timeout: 25_000 });
  const got = page.getByText("Got it");
  if (await got.count()) { await got.first().click(); await page.waitForTimeout(400); }
}

test.describe("deck decisions (web)", () => {
  test.beforeEach(async ({ page }) => { await mockApi(page); });

  test("a right-swipe lands the film in the shortlist and it survives a reload", async ({ page }) => {
    await enterAsGuest(page);
    await completeOnboarding(page);
    await dealADeck(page);
    await swipeRight(page, FILMS[0].title);

    // The deck is immersive (tab bar hidden); leave it via the deck's back to the mood screen.
    await page.getByTestId("deck-back").click();
    await page.getByTestId("tab-shortlist").click();
    await expect(page.getByText(FILMS[0].title).first()).toBeVisible({ timeout: 8_000 });

    // Persistence: an iOS JS reload must not wipe the shortlist.
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    await page.getByTestId("tab-shortlist").click();
    await expect(page.getByText(FILMS[0].title).first()).toBeVisible({ timeout: 8_000 });
  });

  test("re-dealing never re-shows an already-decided film", async ({ page }) => {
    await enterAsGuest(page);
    await completeOnboarding(page);
    await dealADeck(page);
    await swipeRight(page, FILMS[0].title); // decide on the first film

    // Back out of the immersive deck to the mood screen, then re-deal.
    await page.getByTestId("deck-back").click();
    await page.waitForTimeout(400);
    // Deal again — the decided film is gone, so wait on one of the others, not FILMS[0].
    if (await page.getByText("cozy", { exact: true }).count()) await page.getByText("cozy", { exact: true }).first().click();
    await page.getByText("Deal ten").click();
    await expect(page.getByText(/Midnight Cartography|Paper Boats/).first()).toBeVisible({ timeout: 25_000 });
    await page.waitForTimeout(600);
    const body = await page.evaluate(() => document.body.innerText);
    // The decided film is excluded; the others still appear.
    expect(body).not.toContain(FILMS[0].title);
    expect(/Midnight Cartography|Paper Boats/.test(body)).toBeTruthy();
  });
});

// The app shell (nav, backgrounds) must follow the active theme — Light/System should not
// render light screens under dark chrome (issue #61). We assert the tab bar's luminance.
async function navLuminance(page: Page): Promise<number> {
  const bg = await page.getByTestId("tab-bar").evaluate((el) => getComputedStyle(el).backgroundColor);
  const m = bg.match(/(\d+),\s*(\d+),\s*(\d+)/);
  if (!m) throw new Error(`no rgb in "${bg}"`);
  return 0.299 * Number(m[1]) + 0.587 * Number(m[2]) + 0.114 * Number(m[3]);
}

test.describe("theme (web)", () => {
  test.beforeEach(async ({ page }) => { await mockApi(page); });

  test("dark theme (default) renders a dark app shell", async ({ page }) => {
    await enterAsGuest(page);
    await completeOnboarding(page);
    await expect(page.getByTestId("tab-bar")).toBeVisible();
    expect(await navLuminance(page)).toBeLessThan(96); // dark chrome
  });

  test("light theme renders a LIGHT app shell (not dark chrome under light screens)", async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem("wsww:theme", "light"); } catch {} });
    await enterAsGuest(page);
    await completeOnboarding(page);
    await expect(page.getByTestId("tab-bar")).toBeVisible();
    expect(await navLuminance(page)).toBeGreaterThan(150); // light chrome — the #61 fix
  });
});
