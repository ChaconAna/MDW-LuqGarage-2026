import { config } from "dotenv";
import { defineConfig } from "prisma/config";

import { validarEntornoPruebas } from "./lib/schemas/entornoPruebas";

if (process.env.PRUEBAS_PERSISTENCIA === "1") {
  validarEntornoPruebas(process.env);
} else {
  config({ path: ".env.local" });
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
