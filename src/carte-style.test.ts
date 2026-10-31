import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * ⛔ CE FICHIER TIENT DEUX GARANTIES, DONT UNE DE VIE PRIVÉE.
 *
 * 1. Le style doit se suffire : plus aucune `url` vers une TileJSON distante.
 *    C'est ce qui a cassé le 31/10 — `planet.json` en 404 et toute la
 *    cartographie muette.
 * 2. Les tuiles restent RELAYÉES par mana.bzh. Pointer l'hébergeur amont
 *    ferait sortir l'IP du promeneur. C'est une URL absolue À DESSEIN, et la
 *    prochaine personne qui la trouvera « inutilement verbeuse » lira ceci.
 */
const style = JSON.parse(
  readFileSync(new URL("../public/carte-style.json", import.meta.url), "utf8"),
) as {
  sources: Record<string, { url?: string; tiles?: string[] }>;
  sprite?: string; glyphs?: string; layers: unknown[];
};

describe("le style de carte embarqué", () => {
  it("se suffit : aucune source ne dépend d'une TileJSON distante", () => {
    for (const [nom, s] of Object.entries(style.sources)) {
      expect(s.url, `source « ${nom} » : une \`url\` est une route de plus qui peut tomber`).toBeUndefined();
      expect(s.tiles?.length, `source « ${nom} »`).toBeGreaterThan(0);
    }
  });

  it("⛔ chaque URL passe par NOTRE relais, jamais par l'amont", () => {
    const urls = [
      ...Object.values(style.sources).flatMap((s) => s.tiles ?? []),
      style.sprite ?? "",
      style.glyphs ?? "",
    ].filter(Boolean);
    expect(urls.length).toBeGreaterThan(3);
    for (const u of urls) {
      expect(u, u).toMatch(/^https:\/\/mana\.bzh\/carte\//);
      // ⛔ les hébergeurs amont, nommément : les voir ici veut dire que l'IP
      //    du promeneur sort de chez nous.
      expect(u).not.toMatch(/openfreemap|maptiler|mapbox|openstreetmap\.org/);
    }
  });

  it("n'emprunte que les familles de chemins que le serveur sert", () => {
    // Relevé le 31/10 dans la configuration nginx de `mana-tuiles` :
    // planet · natural_earth · sprites · fonts. Tout le reste rend 404.
    const familles = /\/carte\/(planet|natural_earth|sprites|fonts)\//;
    const urls = [
      ...Object.values(style.sources).flatMap((s) => s.tiles ?? []),
      style.sprite ?? "", style.glyphs ?? "",
    ].filter(Boolean);
    for (const u of urls) expect(u, u).toMatch(familles);
  });

  it("porte toujours ses 111 couches et son attribution", () => {
    expect(style.layers.length).toBeGreaterThan(100);
    const att = Object.values(style.sources).map((s) => JSON.stringify(s)).join(" ");
    expect(att).toMatch(/OpenStreetMap/i);
  });

  it("l'app lit le fichier embarqué, pas l'URL distante", () => {
    const src = readFileSync(new URL("./CarteReelle.tsx", import.meta.url), "utf8");
    expect(src).toContain("carte-style.json");
    expect(src).not.toMatch(/const STYLE = "https:\/\/mana\.bzh/);
  });
});
