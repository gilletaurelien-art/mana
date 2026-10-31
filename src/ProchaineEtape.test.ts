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
  ({ slug: "x", titre: "x", lieu: "x", resume: "", distanceKm: 1,
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
