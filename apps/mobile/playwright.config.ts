import { defineConfig, devices } from "@playwright/test";

// E2E runs against the Expo *web* build of the app. This covers navigation, guest
// gating, onboarding, mood selection and reaching the deck — the flows that behave
// the same on web. Swipe gestures, native biometric and native Apple sign-in are
// device-only and are not exercised here (use Maestro/Detox for those).
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:8099",
    headless: true,
    viewport: { width: 390, height: 844 }, // phone-first
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } }],
  webServer: {
    // Build the web bundle, then serve it statically. Reused locally if already running.
    command: "npx expo export --platform web --output-dir dist && npx http-server dist -p 8099 -s -c-1",
    url: "http://localhost:8099",
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
  },
});
