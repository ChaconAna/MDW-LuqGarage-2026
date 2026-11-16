import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    include: [
      "lib/db/marca.integration.test.ts",
      "lib/db/flujoPrincipalE2e.integration.test.ts",
      "lib/db/limpiezaFlujoE2e.integration.test.ts",
    ],
    passWithNoTests: false,
  },
});
