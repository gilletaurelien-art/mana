import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { heures, promenadeOT, PREFIXE_OT, estSlugOT, slugNu } from "./promenade-ot";
import recueil from "./ot.json";
import inventaire from "./lieux.json";
import type { ItineraireOT } from "./ot";
import type { Inventaire } from "./lieux";

const r = recueil as unknown as { itineraires: ItineraireOT[] };
const inv = inventaire as unknown as Inventaire;
const nu = (f: string) =>
  readFileSync(new URL(`./${f}`, import.meta.url), "utf8")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/**
 * 🔴 LES CIRCUITS DES OFFICES DEVIENNENT MARCHABLES — 12/11/2026, demande du
 *    fondateur : « on pourrait les avoir aussi chez nous avec le même
 *    dispositif d'accompagnement que nos promenades composées ».
 *
 * ⛔ CE FICHIER NE GARDE PAS UN AFFICHAGE, IL GARDE UNE CONVERSION. Ce qui
 *    casse ici ne se voit pas à l'écran : une position d'étape en rang plutôt
 *    qu'en fraction donne une barre de progression qui part à 200 %, et une
 *    durée mal lue donne un horaire faux sur un sentier de falaise.
 */
describe("un circuit d'Office devient une promenade", () => {
  const essai = () => promenadeOT(r.itineraires[0], inv);

  it("porte les huit champs que l'écran de marche lit", () => {
    const w = essai();
    for (const champ of ["titre", "slug", "boucle", "distanceKm", "points", "etapes"] as const) {
      expect(w[champ], `« ${champ} » manque`).toBeDefined();
    }
    expect(w.points.length, "le tracé est vide").toBeGreaterThan(10);
    expect(w.points[0]).toHaveProperty("lat");
    expect(w.points[0]).toHaveProperty("lon");
  });

  it("⛔ les étapes sont des FRACTIONS du parcours, pas des rangs", () => {
    /* 🔴 LE COMPOSITEUR S'EST FAIT PRENDRE EXACTEMENT LÀ : avec un indice,
       le deuxième jalon partait à 100 % de la barre de progression, le
       troisième à 200 %, et « prochaine étape » désignait toujours le même
       lieu. `EnChemin` lit `pos` comme une fraction — `e.pos <= part`,
       `insetInlineStart: ${e.pos * 100}%`. */
    let vues = 0, multiples = 0;
    for (const i of r.itineraires.slice(0, 20)) {
      const pos = promenadeOT(i, inv).etapes.map((e) => e.pos);
      for (const p of pos) {
        vues++;
        expect(p, `${i.slug} : position hors du parcours`).toBeGreaterThanOrEqual(0);
        expect(p, `${i.slug} : position hors du parcours`).toBeLessThanOrEqual(1);
      }
      /* ⛔ ET ELLES SUIVENT LE CHEMIN. Une plage de valeurs ne suffit pas :
         `0,5` partout tiendrait l'intervalle et poserait tous les jalons au
         même endroit — une barre de progression qui ne progresse pas.
         ⚠️ Trouvé en VALIDANT CE TEST PAR MUTATION : la première version
            n'attrapait que les rangs, et laissait passer la constante. */
      expect(pos, `${i.slug} : les étapes ne suivent pas l'ordre du chemin`)
        .toEqual([...pos].sort((a, b) => a - b));
      if (pos.length > 1) {
        multiples++;
        expect(new Set(pos).size, `${i.slug} : toutes les étapes au même point`)
          .toBeGreaterThan(1);
      }
    }
    expect(multiples, "aucun parcours à plusieurs étapes : la règle d'ordre dort")
      .toBeGreaterThan(3);
    /* ⚠️ ET LA POPULATION SE DÉCLARE : un test qui ne regarde aucune étape
       passerait au vert sans rien affirmer — la forme du « vert qui ne dit
       rien » que ce dépôt traque. */
    expect(vues, "aucune étape calculée : la règle n'est pas éprouvée")
      .toBeGreaterThan(20);
  });

  it("⭐ ce qu'on apporte en échange : les étapes viennent de NOS lieux", () => {
    /* Leur fiche dit la distance, la durée et la difficulté. Elle ne sait pas
       dire qu'on passe devant un lavoir et une chapelle. C'est l'échange. */
    const avec = promenadeOT(r.itineraires[0], inv).etapes.length;
    const sans = promenadeOT(r.itineraires[0], null).etapes.length;
    expect(sans, "sans inventaire, on n'invente pas d'étapes").toBe(0);
    expect(avec, "avec l'inventaire, aucune rencontre trouvée").toBeGreaterThan(0);
  });

  it("la durée déclarée par l'Office est lue, et sinon dite par convention", () => {
    /* ⚠️ MESURÉ SUR LE RECUEIL : 98 circuits sur 116 déclarent une durée. */
    expect(heures("3h50")).toBeCloseTo(3 + 50 / 60, 5);
    expect(heures("2h")).toBe(2);
    expect(heures(null), "une absence n'est pas un zéro").toBeNull();
    /* ⛔ ON NE DEVINE PAS UNE FORME QU'ON N'A PAS VUE : un format inattendu
       rend `null`, donc le repli, plutôt qu'un nombre fabriqué à partir d'une
       moitié de chaîne. Une durée fausse sur un sentier de falaise n'est pas
       une approximation. */
    for (const faux of ["environ 3h", "3:50", "90 min", "3h70", ""]) {
      expect(heures(faux), `« ${faux} » a été interprété`).toBeNull();
    }
    const sansDuree = r.itineraires.find((i) => !i.duree)!;
    expect(promenadeOT(sansDuree, null).dureeEstimeeH)
      .toBeCloseTo(sansDuree.km / 3.5, 5);
  });

  it("⛔ le préfixe rend une collision d'identifiants IMPOSSIBLE", () => {
    /* ⚠️ Les 26 600 tracés du catalogue distant et les 116 circuits d'Office
       partagent l'adresse `/promenade/<slug>`, et leurs identifiants viennent
       de deux mondes qui ne se connaissent pas : OpenStreetMap d'un côté, les
       URL des Offices de l'autre.
       ⭐ Une collision ne ferait pas une erreur : elle afficherait UN AUTRE
          CHEMIN sous le bon nom — le genre de défaut qu'on ne voit qu'en
          marchant. */
    const w = essai();
    expect(w.slug.startsWith(PREFIXE_OT)).toBe(true);
    expect(estSlugOT(w.slug)).toBe(true);
    expect(slugNu(w.slug)).toBe(r.itineraires[0].slug);
    expect(estSlugOT("chemin-des-douaniers"), "un slug de catalogue passe pour un circuit d'Office")
      .toBe(false);
  });

  it("⛔ le crédit suit la provenance : leur tracé, nos lieux", () => {
    /* 🔴 `Walk.osmUrl` porte ici la fiche de l'OFFICE, et ce champ s'appelle
       `osm`. Le nom est un reste — `Walk` a été écrit quand tout venait
       d'OpenStreetMap. ⛔ Ce qui compte est ce que l'ÉCRAN dit : annoncer un
       GPX d'Office comme une relation OSM citerait qui n'a rien fourni et
       tairait qui a fourni. Un champ mal nommé se relit ; un crédit faux se
       publie. */
    const w = essai();
    expect(w.provenance).toBe("ot");
    expect(w.osmUrl).toBe(r.itineraires[0].source);
    expect(w.osmRef).toMatch(/^ot:/);
    const fiche = nu("FichePromenade.tsx");
    expect(fiche, "la fiche annonce encore OpenStreetMap pour tout")
      .toMatch(/provenance === "ot"[\s\S]{0,200}Office de tourisme/);
  });

  it("⭐ la durée DÉCLARÉE par l'Office s'affiche telle quelle, pas recalculée", () => {
    /* 🔴 LA FICHE RECALCULAIT PAR-DESSUS, et c'est le défaut le plus coûteux
       de cette soirée : elle affichait notre estimation à 3,5 km/h SOUS LEUR
       NOM. Un Office connaît ses escaliers, son sable, ses passages de
       marée ; sa durée est une parole, pas un quotient.
       ⭐ Trouvé en COMPACTANT, pas en cherchant : rassembler deux valeurs
          côte à côte montre qu'elles ne parlent pas de la même chose. */
    const avec = r.itineraires.find((i) => i.duree)!;
    const w = promenadeOT(avec, null);
    expect(w.dureeDeclaree, "la déclaration de l'Office n'est plus signalée").toBe(true);
    expect(w.dureeEstimeeH).toBeCloseTo(heures(avec.duree)!, 5);
    /* ⛔ ET L'ABSENCE NE SE DÉGUISE PAS EN DÉCLARATION : 18 circuits sur 116
       n'annoncent aucune durée, et pour ceux-là la convention s'applique — en
       le disant. */
    const sans = r.itineraires.find((i) => !i.duree)!;
    expect(promenadeOT(sans, null).dureeDeclaree,
      "une durée calculée se fait passer pour une parole").toBeUndefined();

    const fiche = nu("FichePromenade.tsx");
    expect(fiche, "la fiche ignore la durée déclarée")
      .toMatch(/walk\.dureeDeclaree \?/);
    expect(fiche, "la parole de l'Office n'est pas attribuée")
      .toMatch(/annoncées par l'Office/);
    /* ⚠️ ET L'HYPOTHÈSE RESTE DANS LA LIGNE pour NOS durées : « 2 h » sans
       « à 3,5 km/h » est un engagement ; avec, c'est une estimation. C'est
       la seule chose de ce bloc qui ne se compacte pas. */
    expect(fiche, "l'estimation ne dit plus son hypothèse")
      .toMatch(/estimée à 3,5 km\/h/);
  });

  it("⛔ la fiche ne redit pas la forme, et ne creuse pas de trou sans résumé", () => {
    /* 🔴 COMPACTÉE LE 12/11 sur demande. « Boucle » s'écrivait DEUX fois — la
       pastille de la couverture, puis « Forme : Boucle » trois cents pixels
       plus bas — et trois colonnes étiquetées tenaient six lignes de texte
       pour trois faits courts.
       ⛔ ET UN RÉSUMÉ VIDE N'EST PAS UN RÉSUMÉ COURT : les circuits d'Office
          n'en ont pas, et le paragraphe rendu quand même creusait un trou
          entre la provenance et les chiffres. Vu à l'écran. */
    const fiche = nu("FichePromenade.tsx");
    expect(fiche, "la grille à trois colonnes est revenue")
      .not.toMatch(/fiche-chiffres/);
    expect([...fiche.matchAll(/\? "Boucle" :/g)].length,
      "« Boucle » est de nouveau écrit deux fois").toBe(1);
    expect(fiche, "un résumé vide est rendu quand même")
      .toMatch(/\{walk\.resume && </);
    /* ⭐ « prévoir le retour » n'est pas perdu avec la colonne « Forme » : il
       a remonté à côté du mot qu'il précise. */
    expect(fiche).toMatch(/prévoir le retour/);
  });

  it("⛔ UN SEUL ENDROIT RÉPOND À « OÙ TROUVE-T-ON CETTE PROMENADE ? »", () => {
    /* 🔴 TROIS FOIS LE MÊME OUBLI CETTE ANNÉE, et c'est pour ça que ce garde
       existe : chaque fois qu'une source est apparue, un écran l'a apprise et
       les voisins non. Le catalogue distant ajouté à `Promenade` et pas à
       `FichePromenade` — sept liens morts. `Rencontres` et `Espace` restés
       sur `WALKS` seul. Et ce soir, « Partir sur ce chemin » qui rendait
       l'accueil pour un circuit d'Office.
       ⭐ La réponse n'est pas de mieux se souvenir : c'est qu'il n'y ait plus
          qu'un endroit où la question reçoive une réponse. */
    const dossier = new URL("./", import.meta.url);
    const fautifs: string[] = [];
    for (const f of readdirSync(dossier)) {
      if (!/\.tsx?$/.test(f) || /\.test\./.test(f)) continue;
      if (["promenade-source.ts", "catalogue.ts", "Promenade.tsx"].includes(f)) continue;
      if (nu(f).includes("chargerItineraire(")) fautifs.push(f);
    }
    expect(fautifs, `ces écrans cherchent une promenade tout seuls : ${fautifs.join(" / ")}`)
      .toEqual([]);
    /* ⛔ Et les trois écrans qui ouvrent une promenade par son slug passent
       bien par le résolveur. */
    for (const f of ["FichePromenade.tsx", "EnChemin.tsx", "Rencontres.tsx"]) {
      expect(nu(f), `${f} n'utilise pas le résolveur commun`)
        .toMatch(/chargerPromenade\(/);
    }
  });
});
