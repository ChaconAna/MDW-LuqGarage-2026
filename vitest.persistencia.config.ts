import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "lib/db/marca.integration.test.ts",
      "lib/db/flujoPrincipalE2e.integration.test.ts",
    ],
    passWithNoTests: false,
  },
});
