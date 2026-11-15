import { randomBytes } from "node:crypto";
import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  reporter: "list",
  use: {
    baseURL,
    browserName: "chromium",
  },
  webServer: {
    // Requiere ejecutar npm run build antes de npm run test:e2e.
    command: "npm run start -- --hostname 127.0.0.1 --port 3000",
    url: `${baseURL}/login`,
    reuseExistingServer: false,
    stderr: "pipe",
    env: {
      AUTH_SECRET: randomBytes(32).toString("hex"),
      AUTH_URL: baseURL,
      // La visita anónima no necesita BD ni OAuth. Evitar heredar credenciales locales.
      DATABASE_URL: "",
      DIRECT_URL: "",
      AUTH_GOOGLE_ID: "",
      AUTH_GOOGLE_SECRET: "",
    },
  },
});
