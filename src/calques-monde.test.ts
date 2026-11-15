import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { Z, Z_SERVICES } from "./tuiles";
import { FAMILLES, direLaFamille } from "./services-familles";
import { existsSync, readdirSync, readFileSync as lireFichier } from "node:fs";

const lire = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const carte = lire("./CarteMonde.tsx");

/**
 * 🔴 DEUX JEUX DE TUILES, UN SEUL CADRAGE — 15/11/2026. La carte commune lit
 *    `/monde/s` (les sites) et `/monde/h` (les hébergements) avec le MÊME
 *    `tuilesDuCadre()`, donc le même zoom. Si un producteur s'écarte, chaque
 *    tuile demandée rend 404 — et le code traite un 404 comme « il n'y a rien
 *    ici ». Le calque s'allumerait, ne montrerait rien, et aurait l'air
 *    d'un territoire vide.
 * ⭐ C'est la forme la plus silencieuse de la panne : pas d'erreur, pas de
 *    trace, une réponse plausible. D'où ce garde.
 */
describe("les deux calques de la carte commune partagent leur découpage", () => {
  it("le script d'export écrit au zoom que l'écran demande", () => {
    const script = lire("../scripts/hebergements-monde.ts");
    const m = script.match(/const ZOOM = (\d+);/);
    expect(m, "le zoom du script est introuvable").not.toBeNull();
    expect(Number(m![1]), "le script d'hébergements n'écrit pas au zoom lu").toBe(Z);
  });

  it("les TROIS calques sont moissonnés par la MÊME fonction", () => {
    /* ⛔ Deux moissonneuses auraient divergé au premier correctif — c'est
       écrit dans ce dépôt depuis que les plages du monde sont restées à 5 %
       pendant seize jours, « parce que le pipeline FRANÇAIS prenait `nwr`
       pendant que le pipeline MONDE prenait `node` ».
       🔄 TROIS depuis le 15/11/2026 : les commerces et services rejoignent
          les sites et les hébergements. Le compte est écrit ici pour qu'un
          quatrième calque passe par la même porte, ou fasse tomber ce test. */
    expect(carte.match(/async function moissonner\(/g)?.length ?? 0).toBe(1);
    const appels = carte.match(/moissonner\("(sites|hebergements|services)"/g) ?? [];
    expect(appels).toHaveLength(3);
  });

  it("le calque éteint ne se télécharge pas", () => {
    /* ⭐ Masquer coûte la bande passante de ce qu'on cache ; ne pas charger
       coûte zéro. 7 365 tuiles valent la peine qu'on le vérifie. */
    const i = carte.indexOf('moissonner("hebergements"');
    const avant = carte.slice(Math.max(0, i - 400), i);
    expect(avant).toMatch(/calquesVivants\.current\.hebergements/);
  });

  it("les calques se lisent dans un relais, pas dans la closure de montage", () => {
    /* 🔴 L'effet de montage ne tourne qu'UNE fois : une closure y lirait
       éternellement l'état initial — `hebergements: false` — et le calque
       s'allumerait à l'écran sans jamais rien charger. */
    expect(carte).toMatch(/calquesVivants\.current = calques;/);
  });

  it("ce qui est cliquable est ce qui est filtré", () => {
    /* ⭐ `setFilter` est sûr ICI parce qu'il n'y a qu'une liste : le clic
       passe par `m.on("click", "sites")`, que maplibre ne déclenche que pour
       les objets rendus. La carte du territoire, elle, tenait deux listes —
       d'où son retrait des `setFilter` le 4/11. */
    expect(carte).toMatch(/m\.setFilter\("sites"/);
    expect(carte).toMatch(/m\.on\("click", "sites"/);
  });
});

/* ═══ LA FICHE DIT CE QU'ELLE SAIT, ET SEULEMENT ÇA ═══════════════════════ */
import { titreDe, direLeDetail } from "./CarteMonde";

describe("la fiche détaille un hébergement comme un site", () => {
  it("un site nommé porte son nom, un anonyme porte son genre", () => {
    expect(titreDe({ genre: "site", n: "Menhir de Crozon", c: "megalithe", g: [0, 0] }))
      .toBe("Menhir de Crozon");
    expect(titreDe({ genre: "site", n: "Plage", c: "plage", a: 1, g: [0, 0] }))
      .toBe("Plage");
    expect(direLeDetail({ genre: "site", n: "Plage", c: "plage", a: 1, g: [0, 0] }))
      .toBe("Sans nom connu");
  });

  it("un hébergement joint ce qu'on sait, dans l'ordre", () => {
    expect(direLeDetail({ genre: "hebergement", n: "Le Phare", t: "hotel",
                          commune: "Crozon", ch: 12, lits: 24, g: [0, 0] }))
      .toBe("Hôtel · Crozon · 12 chambres · 24 couchages");
  });

  /* ⛔ ON N'ÉCRIT PAS CE QU'ON NE SAIT PAS. Un point OSM porte rarement ses
     couchages : « Hôtel · — chambres » serait un trou maquillé. */
  it("il ne mentionne pas les champs absents", () => {
    expect(direLeDetail({ genre: "hebergement", n: "Chez X", t: "camp_site", g: [0, 0] }))
      .toBe("Camping");
    expect(direLeDetail({ genre: "hebergement", n: "Chez X", g: [0, 0] }))
      .toBe("Hébergement");
  });

  /* ⚠️ « 1 chambres » trahit un gabarit, et se lit comme un défaut du produit
     entier — pas comme une faute de frappe. */
  it("le singulier se dit", () => {
    expect(direLeDetail({ genre: "hebergement", n: "Gîte", ch: 1, lits: 1, g: [0, 0] }))
      .toBe("1 chambre · 1 couchage");
  });

  /* ⭐ Un type inconnu se montre TEL QUEL plutôt que de devenir
     « Hébergement », qui effacerait une information au lieu de l'avouer. */
  it("un type non traduit passe sans être effacé", () => {
    expect(direLeDetail({ genre: "hebergement", n: "X", t: "Rifugio alpino", g: [0, 0] }))
      .toBe("Rifugio alpino");
  });
});

/* ═══ LE CALQUE DES COMMERCES — un quadrillage à lui ══════════════════════
   🔴 BRANCHÉ LE 15/11/2026. Les 3 411 tuiles existaient depuis le matin et
      rien ne les lisait. Le branchement a une difficulté que les deux autres
      calques n'avaient pas : son quadrillage N'EST PAS celui des sites.
   ⛔ ET LE DÉFAUT QU'IL FAUT RENDRE IMPOSSIBLE EST MUET. `moissonner`
      construisait son adresse avec la constante `Z` du module : des
      coordonnées z8 demandées sous `/monde/c/11/` rendent 404, et ce code
      traite un 404 comme « il n'y a rien ici ». Le calque se serait allumé
      sur un monde vide, à l'endroit où il y a 1,28 million de fiches. */
describe("les commerces se lisent au quadrillage où ils sont écrits", () => {
  const script = lire("../scripts/services-monde.ts");

  it("le script écrit au zoom que l'écran demande", () => {
    expect(script, "le script n'importe plus Z_SERVICES : la valeur a été recopiée")
      .toMatch(/import \{ Z_SERVICES \} from "\.\.\/src\/tuiles"/);
    expect(script).toMatch(/const ZOOM = Z_SERVICES;/);
  });

  /**
   * ⭐ ET CELUI-CI NE LIT NI LE SCRIPT NI L'ÉCRAN : IL REGARDE LES FICHIERS.
   *    Les deux pourraient s'accorder sur une valeur et le jeu produit porter
   *    l'autre — c'est arrivé ici même le 15/11, où un essai à z8 avait laissé
   *    19 tuiles orphelines sous `c/8/`. Un garde qui compare deux textes ne
   *    voit pas ce qui est sur le disque.
   */
  it("les tuiles produites vivent au zoom que l'écran demande", () => {
    const racine = new URL("../public/monde/c", import.meta.url);
    if (!existsSync(racine)) return;      // jeu absent : rien à contredire
    const grilles = readdirSync(racine);
    expect(grilles, "aucune tuile de services produite").not.toHaveLength(0);
    expect(grilles, `le jeu porte un quadrillage que l'écran ne demandera pas`)
      .toEqual([String(Z_SERVICES)]);
  });

  it("le cadrage des services est CALCULÉ À PART, pas hérité des sites", () => {
    /* ⛔ Réutiliser `choix` (grille z8) aurait demandé des coordonnées z8
       sous `/monde/c/11/` : 404 partout, donc « il n'y a rien ici ». */
    expect(carte, "les services réutilisent le cadrage des sites")
      .toMatch(/tuilesDuCadre\([\s\S]{0,200}?Z_SERVICES\)/);
    const i = carte.indexOf('moissonner("services"');
    expect(i, "le calque des services n'est pas moissonné").toBeGreaterThan(0);
    expect(carte.slice(i, i + 200),
      "la moisson des services ne passe pas sa grille : elle retomberait sur z8")
      .toMatch(/Z_SERVICES\)/);
  });

  it("l'adresse d'une tuile est bâtie sur la grille REÇUE, jamais sur `Z`", () => {
    /* 🔴 La ligne exacte du défaut : `${racine}/${Z}/${x}/${y}.json`. Elle
       lisait la constante du module, donc les trois calques étaient figés au
       même quadrillage sans qu'aucune ligne ne le dise. */
    expect(carte).toMatch(/fetch\(`\$\{racine\}\/\$\{grille\}\//);
    expect(carte, "l'adresse lit encore la constante du module")
      .not.toMatch(/fetch\(`\$\{racine\}\/\$\{Z\}\//);
  });

  it("le calque éteint ne se télécharge pas", () => {
    /* ⭐ 3 411 tuiles et 110 Mo : qui ouvre la carte pour regarder des sites
       n'a pas à les payer. */
    const i = carte.indexOf('moissonner("services"');
    expect(carte.slice(Math.max(0, i - 900), i))
      .toMatch(/calquesVivants\.current\.services/);
  });

  it("chaque calque a SON cache de tuiles", () => {
    /* ⛔ Les clés sont des `x/y` de quadrillages DIFFÉRENTS : un cache partagé
       ferait croire lue une tuile z11 parce qu'une tuile z8 porte les mêmes
       coordonnées. */
    for (const nom of ["sites", "hebergements", "services"]) {
      expect(carte, `le calque ${nom} n'a pas son propre lot`)
        .toMatch(new RegExp(`${nom}: \\{ lues: new Set<string>\\(\\)`));
    }
  });

  it("ce qui est cliquable est ce qui est filtré, ici aussi", () => {
    expect(carte).toMatch(/m\.setFilter\("services"/);
    expect(carte).toMatch(/m\.on\("click", "services"/);
  });

  /* ⛔ UNE CASE COCHÉE QUI NE MONTRE RIEN SE LIT « IL N'Y EN A PAS ICI ».
     À z11 le refus arrive bien plus tôt qu'aux sites : sans ce mot, le
     calque aurait l'air cassé sur toute une carte de France. */
  it("le refus du calque a son propre mot, sous sa propre case", () => {
    expect(carte).toMatch(/setMotServices\("Approchez/);
    expect(carte, "le mot reste sous une case décochée")
      .toMatch(/if \(!calques\.services\) setMotServices\(""\);/);
  });
});

/* ═══ LA TABLE DES FAMILLES EST ÉCRITE UNE FOIS ═══════════════════════════ */
describe("le producteur et l'écran lisent la MÊME table de familles", () => {
  const script = lire("../scripts/services-monde.ts");

  it("le script importe la table au lieu de la porter", () => {
    expect(script).toMatch(/import \{ FAMILLES \} from "\.\.\/src\/services-familles"/);
    expect(script, "la table est redéclarée dans le script : deux tables divergeront")
      .not.toMatch(/const FAMILLES\s*[:=]/);
  });

  it("l'écran lit la même, et la traduit", () => {
    expect(carte).toMatch(/from "\.\/services-familles"/);
    expect(direLaFamille("manger")).toBe("Restauration");
    expect(direLaFamille("sante")).toBe("Santé");
  });

  /* ⭐ L'ORDRE EST UNE DÉCISION, PAS UN TRI. Une pharmacie porte `sante` ET
     `commerce` ; le `CASE` SQL s'arrête au premier qui recouvre, donc ranger
     cette liste changerait ce que la moisson écrit. */
  it("les familles spécifiques passent avant les générales", () => {
    const rang = (c: string) => FAMILLES.findIndex((f) => f.cle === c);
    expect(rang("sante"), "Santé est passée après Commerces").toBeLessThan(rang("commerce"));
    expect(rang("ecole")).toBeLessThan(rang("commerce"));
    expect(rang("manger")).toBeLessThan(rang("commerce"));
  });

  /* ⚠️ Une clé inconnue se montre TELLE QUELLE — une tuile plus vieille que
     cette table peut porter une famille retirée depuis, et la remplacer par
     un mot générique effacerait une information au lieu de l'avouer. */
  it("une famille non traduite passe sans être effacée", () => {
    expect(direLaFamille("poissonnerie-sous-marine")).toBe("poissonnerie-sous-marine");
  });

  /**
   * 🔴 ET CELUI-CI LIT UNE VRAIE TUILE. Les deux côtés peuvent s'accorder sur
   *    une table et le FICHIER porter autre chose — c'est la famille de défaut
   *    que ce dépôt paie le plus souvent : « mesurer l'outil et croire avoir
   *    mesuré la donnée ». Ici on ouvre le fichier que l'écran va lire.
   */
  it("une tuile réelle porte les champs que l'écran lit", () => {
    const racine = new URL(`../public/monde/c/${Z_SERVICES}/`, import.meta.url);
    if (!existsSync(racine)) return;
    const col = readdirSync(racine)[0];
    const fich = readdirSync(new URL(`${col}/`, racine))[0];
    const t = JSON.parse(lireFichier(new URL(`${col}/${fich}`, racine), "utf8"));
    expect(t.z, "la tuile ne porte pas le zoom attendu").toBe(Z_SERVICES);
    expect(Array.isArray(t.l)).toBe(true);
    const connues = new Set(FAMILLES.map((f) => f.cle));
    for (const e of t.l.slice(0, 50)) {
      expect(typeof e.n, "une fiche sans nom").toBe("string");
      expect(connues.has(e.f), `famille inconnue dans une tuile : ${e.f}`).toBe(true);
      expect(e.g, "une fiche sans position").toHaveLength(2);
      /* ⛔ ET PAS D'ADRESSE, MÊME POUR UN COMMERCE — la règle du producteur,
         vérifiée du côté du fichier et non de son intention. */
      expect(e.adresse ?? e.a ?? null, "une adresse est sortie dans la tuile").toBeNull();
    }
  });
});
