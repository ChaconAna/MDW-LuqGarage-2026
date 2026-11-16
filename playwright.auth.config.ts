import { randomBytes } from "node:crypto";

import { defineConfig } from "@playwright/test";

import { validarEntornoAutenticacionE2e } from "./lib/schemas/entornoE2e";
import {
  BUCKET_STORAGE_E2E,
  crearCredencialStorageE2e,
  URL_STORAGE_E2E,
} from "./lib/services/storageHttpE2e";

const baseURL = "http://127.0.0.1:3000";
const entornoNextStart = {
  ...process.env,
  AUTH_URL: baseURL,
  NODE_ENV: "production",
};

if (!validarEntornoAutenticacionE2e(entornoNextStart)) {
  throw new Error("La autenticación E2E no está habilitada.");
}

const credencialStorageE2e = crearCredencialStorageE2e(
  process.env.AUTENTICACION_E2E_CREDENCIAL!,
);

export default defineConfig({
  testDir: "./tests/e2e-auth",
  globalSetup: "./tests/e2e-auth/globalSetup.ts",
  reporter: "list",
  use: {
    baseURL,
    browserName: "chromium",
  },
  webServer: {
    // Requiere ejecutar npm run build antes de npm run test:e2e:auth.
    command: "npm run start -- --hostname 127.0.0.1 --port 3000",
    url: `${baseURL}/login`,
    reuseExistingServer: false,
    stderr: "pipe",
    env: {
      AUTH_SECRET: randomBytes(32).toString("hex"),
      AUTH_URL: baseURL,
      AUTH_GOOGLE_ID: "",
      AUTH_GOOGLE_SECRET: "",
      AUTENTICACION_E2E: process.env.AUTENTICACION_E2E!,
      AUTENTICACION_E2E_CREDENCIAL:
        process.env.AUTENTICACION_E2E_CREDENCIAL!,
      AUTENTICACION_E2E_USUARIO_ID:
        process.env.AUTENTICACION_E2E_USUARIO_ID!,
      DATABASE_URL: process.env.DATABASE_URL!,
      DIRECT_URL: process.env.DIRECT_URL!,
      GITHUB_ACTIONS: process.env.GITHUB_ACTIONS!,
      PRUEBAS_PERSISTENCIA: "1",
      SUPABASE_SECRET_KEY: credencialStorageE2e,
      SUPABASE_STORAGE_BUCKET: BUCKET_STORAGE_E2E,
      SUPABASE_URL: URL_STORAGE_E2E,
    },
  },
});
