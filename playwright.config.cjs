const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  webServer: {
    command: "node tools/demo-server.cjs",
    url: "http://127.0.0.1:4173/demo_circuito_2027.html",
    timeout: 120000,
    reuseExistingServer: false,
  },
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
});
