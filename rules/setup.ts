import { readFileSync } from "node:fs";
import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";

// Proyecto "demo-": el emulador nunca toca el proyecto real
export function startRules(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: "demo-viajes",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
  });
}
