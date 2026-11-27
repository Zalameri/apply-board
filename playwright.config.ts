import { defineConfig } from "@playwright/test";

// Smoke test in a real browser. Locally, set PW_CHROMIUM to an installed Chromium;
// in CI the browser comes from `npx playwright install chromium`.
const executablePath = process.env.PW_CHROMIUM || undefined;

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:3100",
    viewport: { width: 390, height: 844 },
    launchOptions: { executablePath, args: ["--no-sandbox"] },
  },
  webServer: {
    command: "npm run build && npx next start -p 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 240_000,
    env: { DATABASE_PATH: "data/e2e.db" },
  },
});
