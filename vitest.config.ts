import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@semantic-agent/core": fileURLToPath(new URL("./packages/core/src/index.ts", import.meta.url)),
      "@semantic-agent/shared": fileURLToPath(new URL("./packages/shared/src/index.ts", import.meta.url))
    }
  },
  test: {
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],
    globals: false,
    environment: "node"
  }
});
