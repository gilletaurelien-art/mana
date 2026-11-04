import { describe, it, expect } from "vitest";
import { lienYAller, plateformeDe } from "./y-aller";

/** Ménez-Hom, tel que l'inventaire l'écrit : [lon, lat]. */
const MENEZ_HOM: [number, number] = [-4.23511, 48.21979];

describe("plateformeDe", () => {
  it("reconnaît les trois familles", () => {
    expect(plateformeDe("Mozilla/5.0 (Linux; Android 14; Pixel 8)")).toBe("android");
    expect(plateformeDe("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe("ios");
    expect(plateformeDe("Mozilla/5.0 (X11; Linux x86_64)")).toBe("autre");
  });

  /**
   * ⚠️ L'IPAD SE DÉCLARE « MACINTOSH » DEPUIS IPADOS 13. Sans le second
   *    critère, il recevrait le lien OpenStreetMap au lieu de Plans — c'est
   *    un appareil qu'on tient dans la main à l'Office de tourisme.
   * ⭐ Et le test garde les DEUX sens : un vrai Mac, lui, doit rester sur
   *    « autre ». Ne tenir qu'un sens laisserait passer un `maxTouchPoints`
   *    ignoré.
   */
  it("🔴 distingue un iPad d'un Mac, qui annoncent le même agent", () => {
    const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)";
    expect(plateformeDe(ua, 5), "un iPad est tactile").toBe("ios");
    expect(plateformeDe(ua, 0), "un Mac ne l'est pas").toBe("autre");
  });

  /** ⚠️ Android AVANT iOS : certains agents Android citent « like Mac OS X ». */
  it("⛔ un Android qui mentionne Mac reste un Android", () => {
    expect(plateformeDe("Mozilla/5.0 (Linux; Android 13) AppleWebKit like Mac OS X")).toBe("android");
  });
});

describe("lienYAller", () => {
  /**
   * 🔴 LE PIÈGE QUI NE LÈVE AUCUNE ERREUR : nos données écrivent
   *    `[lon, lat]`, les trois schémas d'URL attendent `lat,lon`. Inversé,
   *    le lien reste parfaitement valide et pointe au large des Maldives.
   * ⭐ On l'épingle donc sur un lieu RÉEL dont on connaît les deux nombres,
   *    pas sur une paire abstraite : 48 est la latitude bretonne, −4 la
   *    longitude. Une assertion sur l'ordre seul se relit sans rien voir.
   */
  it("🔴 écrit lat,lon — pas lon,lat, qui pointerait dans l'océan Indien", () => {
    for (const p of ["ios", "android", "autre"] as const) {
      const lien = lienYAller(MENEZ_HOM, "Ménez-Hom", p);
      expect(lien, `${p} : la latitude doit précéder la longitude`).toContain("48.21979,-4.23511");
      expect(lien, `${p} : l'ordre de nos données ne doit pas fuir tel quel`)
        .not.toContain("-4.23511,48.21979");
    }
  });

  it("rend à chaque plateforme le schéma qu'elle sait ouvrir", () => {
    expect(lienYAller(MENEZ_HOM, "Ménez-Hom", "ios")).toMatch(/^https:\/\/maps\.apple\.com\//);
    expect(lienYAller(MENEZ_HOM, "Ménez-Hom", "android")).toMatch(/^geo:/);
    expect(lienYAller(MENEZ_HOM, "Ménez-Hom", "autre"))
      .toMatch(/^https:\/\/www\.openstreetmap\.org\/directions\?to=/);
  });

  /**
   * ⛔ AUCUN FOURNISSEUR N'EST IMPOSÉ. Sur Android, `geo:` laisse le système
   *    proposer les applications installées — c'est la même doctrine que les
   *    tuiles relayées : nous ne décidons pas à qui le trajet est confié.
   *    Un lien `google.com/maps` écrit en dur ici serait un choix fait à la
   *    place de la personne, et il se glisserait sans bruit.
   */
  it("⛔ ne nomme aucun fournisseur que la personne n'a pas choisi", () => {
    for (const p of ["ios", "android", "autre"] as const) {
      expect(lienYAller(MENEZ_HOM, "Ménez-Hom", p)).not.toMatch(/google|bing|waze|mappy/i);
    }
  });

  it("encode un nom qui contient une apostrophe ou un espace", () => {
    const lien = lienYAller([-4.5936, 48.2772], "Pointe de Pen-Hir & l'anse", "ios");
    expect(lien).not.toContain(" ");
    expect(lien).not.toContain("&l'anse");
  });
});
