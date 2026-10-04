import { defineConfig, devices } from "@playwright/test";

// Anonymous smoke tests never send email, create users, or mutate backend data.
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-webkit", use: { ...devices["iPhone 13"] } },
  ],
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100/sign-in",
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://smoke-fixture.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "smoke-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "smoke-server-key",
    },
  },
});
