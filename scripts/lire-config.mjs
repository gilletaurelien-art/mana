#!/usr/bin/env node
/**
 * LA CONFIGURATION DE CONSTRUCTION, RÉSOLUE COMME LE BUILD LA RÉSOUT.
 *
 * 🔴 POURQUOI UN PROCESSUS À PART, ET PAS UN `import` DANS LE TEST. Importer
 *    `vite.config.ts` depuis un fichier de test charge l'API Node de Vite
 *    DANS le worker de vitest. Mesuré le 15/11/2026 : la suite passait de
 *    63 s à 103 s, et vitest rendait « [vitest-worker]: Timeout calling
 *    onTaskUpdate » — un avertissement qui dit lui-même « this might cause
 *    false positive tests ». ⛔ Un garde qui déstabilise la suite qu'il
 *    protège coûte plus qu'il ne rapporte.
 *
 * ⭐ `loadConfigFromFile` est l'outil de Vite lui-même : il transpile le TS,
 *    applique `defineConfig` et rend l'objet que le build emploie. 0,53 s
 *    dans un processus propre, sans rien charger chez l'appelant.
 *
 * ⚠️ ET C'EST LA RÉSOLUTION, PAS LE TEXTE. Une clé déclarée deux fois ne
 *    laisse aucune trace ici : elle a simplement retiré une valeur. C'est
 *    exactement ce qu'on veut mesurer — voir `src/viteConfig.test.ts`.
 */
import { loadConfigFromFile } from "vite";

const r = await loadConfigFromFile(
  { command: "build", mode: "production" },
  new URL("../vite.config.ts", import.meta.url).pathname,
);
if (!r?.config) {
  console.error("🔴 vite.config.ts n'a pas pu être résolu.");
  process.exit(1);
}
console.log(JSON.stringify(r.config));
