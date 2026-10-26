import { defineConfig } from "@playwright/test";
for (const key of ["NO_PROXY", "no_proxy"]) {
  process.env[key] = [process.env[key], "127.0.0.1", "localhost"]
    .filter(Boolean)
    .join(",");
}
export default defineConfig({
  testDir: ".",
  testMatch: "reproduction.spec.mjs",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5182",
    browserName: "chromium",
    viewport: { width: 1280, height: 1000 },
    launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
      : {},
  },
  webServer: {
    command: "npm run dev -- --strictPort",
    url: "http://127.0.0.1:5182",
    reuseExistingServer: !process.env.CI,
  },
});
