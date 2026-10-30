/**
 * LE GARDE DES FERMETURES, ET IL SE VALIDE PAR MUTATION.
 *
 * ⭐ « Un garde qu'on n'a jamais vu refuser n'a jamais été vu. » Chaque test
 *    ici vérifie les DEUX sens : sans la fermeture le chemin existe, avec elle
 *    il disparaît. Un test qui ne constaterait que l'absence prouverait
 *    seulement que le graphe de l'essai est pauvre.
 */
import { describe, it, expect } from "vitest";
import { indexer, composer, type Graphe } from "./composition";
import { aretesTouchees, type Fermetures } from "./fermetures";

/** Un carré de quatre nœuds, deux chemins pour aller de 0 à 2 :
 *  le « littoral » (arête 0 puis 1, au ras de la mer) et « l'intérieur »
 *  (arête 2 puis 3, à 900 m de la mer). */
function grapheCarre(): Graphe {
  return {
    n: [
      [-4.46515, 48.23854],   // 0 — sur la plage de Postolonnec
      [-4.46000, 48.23854],   // 1 — littoral, à l'est
      [-4.46000, 48.24300],   // 2 — nord-est
      [-4.46515, 48.24300],   // 3 — nord-ouest, dans les terres
    ],
    //      a, b, m,    agrément, points,  dist.mer, dénivelé, marée
    a: [
      [0, 1, 380, 90, [0, 1], 20, 2, 0],      // littoral  ← visé par l'arrêté
      [1, 2, 500, 85, [1, 2], 40, 3, 0],      // littoral
      [0, 3, 500, 60, [0, 3], 900, 4, 0],     // intérieur
      [3, 2, 380, 60, [3, 2], 950, 2, 0],     // intérieur
    ],
    l: [],
  } as unknown as Graphe;
}

function fermeturePostolonnec(effet: "interdit" | "avertir" = "interdit"): Fermetures {
  return {
    version: 1, mis_a_jour_le: "2026-10-30", territoire: "crozon",
    fermetures: [{
      id: "essai", libelle: "essai", communes: ["Crozon"], effet,
      motif: "effondrement", autorite: "Commune de Crozon",
      source: "https://exemple.invalid/", publie_le: "2026-03-06",
      releve_le: "2026-10-30",
      geometrie: [{ nom: "Plage de Postolonnec", g: [-4.46515, 48.23854] }],
      rayon_m: 450, distance_mer_max_m: 80, portee_approximative: true,
    }],
  };
}

describe("les fermetures officielles", () => {
  it("CONTRÔLE POSITIF : sans fermeture, le littoral est dans l'adjacence", () => {
    const g = grapheCarre();
    const ix = indexer(g);
    const voisins = ix.adj.get(0)!.map(([ei]) => ei);
    expect(voisins).toContain(0);          // l'arête littorale est atteignable
  });

  it("CONTRÔLE NÉGATIF : avec la fermeture, l'arête disparaît de l'adjacence", () => {
    const g = grapheCarre();
    const t = aretesTouchees(g, fermeturePostolonnec());
    expect(t.interdites.has(0)).toBe(true);
    const ix = indexer(g, t.interdites);
    const voisins = ix.adj.get(0)!.map(([ei]) => ei);
    expect(voisins).not.toContain(0);
  });

  it("une interdiction ne ferme QUE le bord de mer, pas la route de l'intérieur", () => {
    const g = grapheCarre();
    const t = aretesTouchees(g, fermeturePostolonnec());
    // l'arête 2 part du MÊME point mais file dans les terres (900 m de la mer)
    expect(t.interdites.has(2)).toBe(false);
  });

  it("`avertir` signale sans retirer — une marée n'est pas un arrêté", () => {
    const g = grapheCarre();
    const t = aretesTouchees(g, fermeturePostolonnec("avertir"));
    expect(t.averties.has(0)).toBe(true);
    expect(t.interdites.size).toBe(0);
    const ix = indexer(g, t.interdites);
    expect(ix.adj.get(0)!.map(([e]) => e)).toContain(0);
  });

  it("un secteur sans géométrie est DÉCLARÉ et n'influence rien", () => {
    const g = grapheCarre();
    const f = fermeturePostolonnec();
    f.fermetures[0].geometrie = null;
    const t = aretesTouchees(g, f);
    expect(t.interdites.size).toBe(0);
    expect(t.nonSituees).toHaveLength(1);   // ⭐ on le dit, on ne le tait pas
    expect(t.actives).toHaveLength(0);
  });

  it("MUTATION SUR LA COMPOSITION : la boucle cesse d'emprunter le tronçon fermé", () => {
    const g = grapheCarre();

    const avant = composer(g, indexer(g), 0, 1800);
    const empruntaitLeLittoral = avant.some((b) => b.aretes.includes(0));

    const t = aretesTouchees(g, fermeturePostolonnec());
    const apres = composer(g, indexer(g, t.interdites), 0, 1800);

    // le sens qui compte : plus aucune boucle ne passe par l'arête fermée
    expect(apres.every((b) => !b.aretes.includes(0))).toBe(true);

    // ⚠️ et le sens qui PROUVE que le test mord : sans la fermeture, ce
    //    tronçon était bien emprunté. Sans cette ligne, le test passerait
    //    tout aussi bien sur un graphe où rien ne passe jamais par là.
    expect(empruntaitLeLittoral).toBe(true);
  });

  it("l'arête est testée sur TOUT son tracé, pas sur ses deux bouts", () => {
    const g = grapheCarre();
    // une arête dont seuls les points intermédiaires frôlent la falaise
    g.n.push([-4.47400, 48.23854]);                     // 4 — loin, à l'ouest
    g.n.push([-4.47900, 48.23854]);                     // 5 — loin, à l'ouest
    g.a.push([4, 5, 400, 70, [4, 0, 5], 30, 1, 0]);     // passe PAR le nœud 0
    const t = aretesTouchees(g, fermeturePostolonnec());
    expect(t.interdites.has(4)).toBe(true);
  });
});
