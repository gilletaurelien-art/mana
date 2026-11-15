import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("vite.config.ts", () => {
  it("should not have duplicate keys in defineConfig object", () => {
    const configPath = resolve(__dirname, "../vite.config.ts");
    const configContent = readFileSync(configPath, "utf-8");

    // Parse the defineConfig call to find the object literal
    const objectMatch = configContent.match(/defineConfig\(\{([\s\S]*?)\n\}\);/);
    expect(objectMatch, "Could not parse defineConfig object").toBeTruthy();

    const objectContent = objectMatch![1];

    // Find all top-level keys (lines starting with whitespace, then a key, then colon)
    const keyMatches = objectContent.matchAll(/^\s+(\w+):/gm);
    const keys: string[] = [];

    for (const match of keyMatches) {
      keys.push(match[1]);
    }

    // Check for duplicates
    const uniqueKeys = new Set(keys);
    expect(
      keys.length,
      `Configuration has duplicate keys: ${JSON.stringify(keys)}`
    ).toBe(uniqueKeys.size);
  });

  it("should have react plugin loaded in plugins array", async () => {
    // Dynamic import to get the actual resolved config
    const config = await import("../vite.config.ts");
    const resolvedConfig = config.default;

    expect(resolvedConfig.plugins, "plugins array should exist").toBeInstanceOf(
      Array
    );
    expect(resolvedConfig.plugins.length, "plugins array should not be empty").toBeGreaterThan(
      0
    );

    // The plugins array should have at least 2 plugins (react + titre-de-l-hote)
    expect(
      resolvedConfig.plugins.length,
      "Should have at least 2 plugins (react + titre-de-l-hote)"
    ).toBeGreaterThanOrEqual(2);

    // Also verify the custom title plugin is present
    const hasTitlePlugin = resolvedConfig.plugins.some(
      (plugin: any) => plugin?.name === "titre-de-l-hote"
    );

    expect(hasTitlePlugin, "titre-de-l-hote plugin should be present").toBe(
      true
    );
  });
});
