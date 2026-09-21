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
});
