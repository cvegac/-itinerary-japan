import { defineConfig } from "vitest/config";

// Tests de firestore.rules contra el emulador: npm run test:rules
export default defineConfig({
  test: {
    environment: "node",
    include: ["rules/**/*.test.ts"],
    // Todos los archivos usan el mismo emulador: uno a la vez
    fileParallelism: false,
    testTimeout: 20000,
  },
});
