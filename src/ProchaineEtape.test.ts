/**
 * L'AVANCEMENT — et les deux cas où il doit se taire ou parler.
 *
 * ⭐ Ce test existe parce que le garde d'ambiguïté a été écrit sur une FAUSSE
 *    alerte : j'avais mal mesuré, le code avait raison. Un garde posé dans ces
 *    conditions est exactement celui qu'on n'a jamais vu fonctionner — et un
 *    garde jamais vu refuser n'a jamais été vu. On l'éprouve donc dans les
 *    DEUX régimes : celui où il doit parler, celui où il doit se taire.
 */
import { describe, it, expect } from "vitest";
import { avancement } from "./ProchaineEtape";
import type { Walk } from "./walks";

/** fabrique un parcours minimal : seuls `points` comptent ici */
const parcours = (points: { lat: number; lon: number }[]): Walk =>
  ({ provenance: "mana", slug: "x", titre: "x", lieu: "x", resume: "", distanceKm: 1,
     dureeEstimeeH: 1, boucle: false, osmUrl: "", osmRef: "",
     points, etapes: [] }) as Walk;

/** une ligne droite de n points, vers l'est */
const ligne = (n: number, lat = 48.3) =>
  Array.from({ length: n }, (_, i) => ({ lat, lon: -4.6 + i * 0.0004 }));

describe("l'avancement sur le tracé", () => {
  it("sur un tracé qui ne se recroise pas, il répond — et il répond juste", () => {
    const w = parcours(ligne(200));
    const part = avancement(w, w.points[50]);
    expect(part).not.toBeNull();
    expect(part!).toBeCloseTo(50 / 199, 3);
  });

  it("🔴 sur un ALLER-RETOUR, il se tait plutôt que de choisir", () => {
    // l'aller vers l'est, puis le retour à 25 m au nord : deux passages au
    // même endroit, à une distance qu'aucun GPS de téléphone ne départage.
    const aller = ligne(120, 48.3);
    const retour = ligne(120, 48.30022).reverse();
    const w = parcours([...aller, ...retour]);
    // au milieu de l'aller : le point symétrique du retour est à ~25 m
    expect(avancement(w, { lat: 48.30011, lon: aller[60].lon })).toBeNull();
  });

  it("⚠️ et il ne se tait PAS sur un aller-retour largement séparé", () => {
    // ⭐ Le contre-épreuve compte autant : un garde qui refuse tout est aussi
    //    inutile qu'un garde qui n'attrape rien. Ici le retour passe à 900 m —
    //    un écart que la position tranche sans ambiguïté.
    const aller = ligne(120, 48.3);
    const retour = ligne(120, 48.308).reverse();
    const w = parcours([...aller, ...retour]);
    expect(avancement(w, { lat: 48.3, lon: aller[60].lon })).not.toBeNull();
  });

  it("un tracé d'un seul point ne prétend aucun avancement", () => {
    expect(avancement(parcours([{ lat: 48.3, lon: -4.6 }]), { lat: 48.3, lon: -4.6 })).toBeNull();
  });
});

describe("l'avancement est une fraction de DISTANCE, jamais de POINTS", () => {
  /**
   * 🔴 LE DÉFAUT QUE CE TEST TIENT — trouvé le 3/11/2026, invisible aux 300
   *    tests d'alors. `avancement()` rendait `index / (n − 1)`, la fraction
   *    des POINTS franchis. Les points d'une polyligne ne sont pas
   *    équidistants : mesuré sur 11 boucles réelles de la presqu'île, l'écart
   *    entre les deux fractions atteint 21,5 % — soit 1 292 m annoncés à côté
   *    sur une promenade de 6 km.
   *
   * ⭐ Le fixture reproduit le régime, il ne l'imite pas : vingt points serrés
   *    sur 190 m (un sentier sinueux), puis deux points sur 2 km (une ligne
   *    droite). Au bout du groupe serré, on a franchi 20 points sur 22 — 90 %
   *    de l'index — et seulement 8,7 % de la distance.
   */
  const SERRE = 20, PAS = 0.00009;   // ~10 m entre points
  const pts: { lat: number; lon: number }[] = [];
  for (let i = 0; i < SERRE; i++) pts.push({ lat: 48.24, lon: -4.49 + i * PAS });
  const finSerre = pts[pts.length - 1];
  pts.push({ lat: 48.24, lon: finSerre.lon + 0.0134 });   // ~1 km
  pts.push({ lat: 48.24, lon: finSerre.lon + 0.0268 });   // ~1 km de plus

  it("au bout du tronçon serré, on a fait 9 % du chemin — pas 90 %", () => {
    const p = avancement(parcours(pts), finSerre);
    expect(p).not.toBeNull();
    /* ⛔ C'est l'assertion qui compte : l'ancienne implémentation rendait
       0,90 ici. Une tolérance large suffit — on sépare deux réponses qui
       diffèrent d'un facteur dix, pas deux arrondis. */
    expect(p!).toBeLessThan(0.2);
    expect(p!).toBeGreaterThan(0.03);
  });

  it("au départ 0, à l'arrivée 1 — les deux bouts restent justes", () => {
    expect(avancement(parcours(pts), pts[0])).toBeCloseTo(0, 5);
    expect(avancement(parcours(pts), pts[pts.length - 1])).toBeCloseTo(1, 5);
  });

  it("⛔ un tracé dégénéré se tait au lieu de répondre 0/0", () => {
    /* Tous les points confondus : la longueur est nulle. Rendre 0 dirait
       « vous êtes au départ », ce qui est une affirmation, pas une absence. */
    const plat = [{ lat: 48.24, lon: -4.49 }, { lat: 48.24, lon: -4.49 }];
    expect(avancement(parcours(plat), plat[0])).toBeNull();
  });
});
