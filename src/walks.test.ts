import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { WALKS, verifierTrace, sautMax, pointsRepetes, distM } from "./walks";

/**
 * ⛔ CE FICHIER EST UN INTERDIT, PAS UNE DESCRIPTION.
 *
 * Le 28/10/2026, la page d'accueil affichait un parcours INVENTÉ présenté
 * comme le GR34 — une boucle plausible dessinée à la main. Devant un office
 * de tourisme, leur propre côte se reconnaît en trois secondes, et le jour où
 * un tracé se révèle faux, tout le reste devient suspect.
 *
 * Ces tests refusent d'embarquer un tracé qu'on n'a pas vérifié.
 */

describe("les tracés livrés sont géométriquement sains", () => {
  for (const w of WALKS) {
    it(`${w.slug} — aucun saut, aucun point répété`, () => {
      expect(verifierTrace(w.points)).toEqual([]);
    });
  }
});

describe("chaque promenade dit d'où elle vient", () => {
  for (const w of WALKS) {
    it(`${w.slug} — porte sa référence OSM et son lien`, () => {
      // L'ODbL exige l'attribution : sans source, on ne publie pas.
      expect(w.osmRef).toMatch(/^osm:(way|node|relation):\d+/);
      expect(w.osmUrl).toMatch(/^https:\/\/www\.openstreetmap\.org\//);
    });
  }
});

describe("les étapes sont ordonnées LE LONG du chemin", () => {
  for (const w of WALKS) {
    it(`${w.slug} — positions croissantes de 0 à 1`, () => {
      // Une liste triée par distance sous un titre qui annonce une SÉQUENCE
      // (« ce que vous croiserez ») ment sur l'ordre de la marche.
      const pos = w.etapes.map((e) => e.pos);
      expect(pos).toEqual([...pos].sort((a, b) => a - b));
      for (const p of pos) expect(p).toBeGreaterThanOrEqual(0);
      for (const p of pos) expect(p).toBeLessThanOrEqual(1);
    });
  }
});

describe("on n'affiche QUE ce qu'on sait", () => {
  for (const w of WALKS) {
    it(`${w.slug} — aucune étape au libellé AMBIANT`, () => {
      // ⭐ CETTE RÈGLE A ÉTÉ AFFINÉE LE 28/10 AU SOIR, PAS SUPPRIMÉE.
      //    Première version : on écartait TOUTE étape dont le nom était un
      //    simple libellé de catégorie (objet OSM sans nom). Résultat mesuré :
      //    DEUX fiches sur quatre se retrouvaient sans la moindre étape.
      //    ⭐ « Sans nom » et « sans intérêt » ne sont pas la même chose. Un
      //       menhir, un mémorial, une grotte ou un phare restent des REPÈRES
      //       même anonymes — c'est l'objet qui est remarquable. Une lande ou
      //       une plage, non : c'est du décor, et « Plage · Lande · Plage »
      //       est du bruit présenté comme un repère.
      //    On n'interdit donc plus que les libellés AMBIANTS.
      const ambiant = /^(plage|lande|point de vue|panorama|parc|for[êe]t|[ée]tang|lac|source|fontaine|[îi]le)$/i;
      for (const e of w.etapes) expect(e.nom).not.toMatch(ambiant);
    });

    it(`${w.slug} — une étape ne cite pas le sentier lui-même`, () => {
      // Relevé le 28/10 : « La balade de Saint-Fiacre » figurait comme étape
      // DE la balade de Saint-Fiacre, et « Balade Sonore de l'Île Vierge »
      // comme étape de l'Anse Saint-Nicolas. Un chemin n'est pas un point.
      for (const e of w.etapes) expect(e.categorie).not.toBe("sentier");
    });

    it(`${w.slug} — la longueur annoncée correspond au tracé`, () => {
      // ⚠️ Ce test ne REMPLACE pas verifierTrace : un tracé recollé dans le
      //    désordre a une longueur parfaitement plausible (le moissonneur coupe
      //    tout saut > 500 m). La longueur ne détecte PAS le désordre.
      let m = 0;
      for (let i = 1; i < w.points.length; i++) m += distM(w.points[i - 1], w.points[i]);
      expect(m / 1000).toBeGreaterThan(w.distanceKm * 0.9);
      expect(m / 1000).toBeLessThan(w.distanceKm * 1.1);
    });
  }
});

describe("le contrôle refuse VRAIMENT — validé par mutation", () => {
  // ⚠️ LA MUTATION SE FAIT SUR UNE MATIÈRE FABRIQUÉE ICI, jamais sur un tracé
  //    livré. Première version : on ajoutait un point en double à WALKS[0] et
  //    on attendait `pointsRepetes === 1`. Elle a rendu 37 — parce que le
  //    tracé réel en porte DÉJÀ 36, légitimement. Le test mesurait la donnée
  //    au lieu de mesurer le garde.
  //    ⭐ Une mutation posée sur une matière qu'on n'a pas fabriquée teste
  //       autre chose que ce qu'on croit.
  const droit = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ lat: 48.6 + i * 0.0002, lon: -2.3 }));

  it("un tracé fabriqué sain passe", () => {
    expect(verifierTrace(droit(50))).toEqual([]);
  });

  it("un saut de 900 m est refusé", () => {
    const t = droit(50);
    const abime = [...t.slice(0, 20), { lat: t[19].lat + 0.009, lon: t[19].lon }, ...t.slice(20)];
    expect(sautMax(abime)).toBeGreaterThan(600);
    expect(verifierTrace(abime).join(" ")).toMatch(/saut/);
  });

  it("un segment droit de 300 m N'EST PAS refusé", () => {
    // ⭐ LE SENS DE CE TEST EST L'INVERSE DU PRÉCÉDENT, et il compte autant.
    //    Le seuil valait 150 m jusqu'au 28/10 au soir. Mesure sur la donnée
    //    OSM brute : un way porte légitimement des segments droits allant
    //    jusqu'à ~308 m (ligne droite en pleine lande). Le garde aurait donc
    //    refusé des tracés PARFAITS dès l'arrivée de la moisson réparée — et,
    //    tournant dans `npm run build`, il aurait fait échouer le déploiement
    //    sur de la BONNE donnée.
    //    Un garde calibré sur des données malades prend la guérison pour une
    //    panne. Ce test tient la porte ouverte.
    const t = droit(50);
    const avecLigneDroite = [...t.slice(0, 20), { lat: t[19].lat + 0.0027, lon: t[19].lon }, ...t.slice(20)];
    expect(sautMax(avecLigneDroite)).toBeGreaterThan(250);
    expect(verifierTrace(avecLigneDroite)).toEqual([]);
  });

  it("un recollement désordonné (plus de 8 % de points répétés) est refusé", () => {
    const t = droit(50);
    const abime = [...t, ...t.slice(0, 10)]; // 10 répétés sur 60 = 16,7 %
    expect(pointsRepetes(abime)).toBe(10);
    expect(verifierTrace(abime).join(" ")).toMatch(/répétés/);
  });

  it("quelques répétitions légitimes NE sont PAS refusées", () => {
    // Une antenne aller-retour vers un point de vue repasse par les mêmes nœuds.
    const t = droit(100);
    const abime = [...t, ...t.slice(95)]; // 5 sur 105 = 4,8 %
    expect(verifierTrace(abime)).toEqual([]);
  });

  it("les tracés RÉELLEMENT livrés passent", () => {
    for (const w of WALKS) expect(verifierTrace(w.points)).toEqual([]);
  });

  it("les tracés livrés viennent de la moisson RÉPARÉE", () => {
    // ⭐ CE TEST A ÉTÉ RETOURNÉ LE 28/10 AU SOIR, ET C'ÉTAIT PRÉVU.
    //    Sa version précédente exigeait l'INVERSE — « au moins un tracé porte
    //    plus de 1 % de points répétés » — pour documenter que la donnée
    //    livrée venait d'une moisson non réparée. Il était écrit avec la
    //    consigne : « quand ce test échouera, c'est une bonne nouvelle ».
    //    Le correctif de recollement est passé, il a échoué, on le retourne.
    //    Un test qui devient faux se RETOURNE, il ne se supprime pas : ce
    //    qu'il protégeait est encore vrai, sous une autre forme.
    for (const w of WALKS) {
      const part = pointsRepetes(w.points) / w.points.length;
      expect(part).toBeLessThan(0.01);
    }
  });
});

describe("aucun lien interne ne pointe vers une promenade inexistante", () => {
  // ⛔ UN LIEN MORT NE SE PLAINT PAS ICI. Jusqu'au 28/10, un slug inconnu
  //    rendait `WALKS[0]` : la page affichait une AUTRE promenade, sans
  //    erreur, sans 404, sans rien. Et le risque est devenu réel le jour où
  //    la remoisson a renuméroté les portions de sentier.
  // ⭐ Ce test LIT les sources plutôt que de décrire ce qu'elles contiennent :
  //    une liste recopiée dans un commentaire vieillit en silence.
  const slugs = new Set(WALKS.map((w) => w.slug));

  for (const f of ["src/App.tsx", "src/Promenades.tsx", "src/Promenade.tsx"]) {
    it(`${f} — tous les /promenade/<slug> existent`, () => {
      const src = readFileSync(f, "utf8");
      const cites = [...src.matchAll(/\/promenade\/([a-z0-9-]+)/g)].map((m) => m[1]);
      for (const s of cites) expect(slugs).toContain(s);
    });
  }
});
