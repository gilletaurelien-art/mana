import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { Z, Z_SERVICES, tuilesDuCadre } from "./tuiles";
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

  /**
   * 🔴 CE GARDE A ÉTÉ ÉCRIT FAUX, ET IL A LAISSÉ PARTIR LE DÉFAUT EN
   *    PRODUCTION — 15/11/2026, mesuré à l'écran vingt minutes après le
   *    déploiement. Sa première rédaction cherchait
   *    `tuilesDuCadre(…{0,200}…Z_SERVICES)` N'IMPORTE OÙ dans le fichier. Il
   *    y a DEUX appels à `tuilesDuCadre` : celui des sites (grille z8, par
   *    défaut) et celui des services (z11). Le motif en trouvait un, se
   *    déclarait content, et ne disait pas LEQUEL.
   *
   * ⛔ CE QUI EST ARRIVÉ EST EXACTEMENT CE QU'IL NE VOYAIT PAS. Mon banc de
   *    mutation a déplacé `Z_SERVICES` d'un appel à l'autre (un
   *    `replace(..., 1)` qui a mordu la première occurrence au retour) : les
   *    SITES se sont mis à demander des coordonnées z11 sous `/monde/s/8/`
   *    — 404 — et les services des coordonnées z8 sous `/monde/c/11/` — 404.
   *    Les deux calques morts, aucune erreur à l'écran, et ce test VERT.
   * ⭐ « Un contrôle qui réussit sur le mauvais objet endort. » Le garde
   *    nomme donc chaque appel par ce qu'il sert, et vérifie les DEUX sens :
   *    la grille fine sur les services, et son ABSENCE sur les sites.
   */
  it("chaque calque cadre sur SA grille, et le garde dit laquelle", () => {
    /* Le cadrage des sites : celui qui précède `moissonner("sites"`. */
    const iSites = carte.indexOf('moissonner("sites"');
    const avantSites = carte.slice(Math.max(0, iSites - 900), iSites);
    const appelSites = avantSites.slice(avantSites.lastIndexOf("tuilesDuCadre("));
    expect(appelSites, "le cadrage des sites est introuvable").toContain("m.getZoom()");
    expect(appelSites,
      "les SITES cadrent sur la grille des services : ils demanderaient des "
      + "coordonnées z11 sous /monde/s/8/, donc 404 — et un 404 se lit « rien ici »")
      .not.toContain("Z_SERVICES");

    /* Celui des services : entre le test du calque et sa moisson. */
    const iServ = carte.indexOf('moissonner("services"');
    expect(iServ, "le calque des services n'est pas moissonné").toBeGreaterThan(0);
    const avantServ = carte.slice(Math.max(0, iServ - 900), iServ);
    const appelServ = avantServ.slice(avantServ.lastIndexOf("tuilesDuCadre("));
    expect(appelServ,
      "les SERVICES cadrent sur la grille z8 : ils demanderaient des "
      + "coordonnées z8 sous /monde/c/11/, donc 404 partout")
      .toContain("Z_SERVICES");

    /* ⚠️ Et la moisson elle-même doit porter la grille, pas seulement le
       cadrage : ce sont deux endroits, et l'un sans l'autre suffit à tout
       casser. */
    expect(carte.slice(iServ, iServ + 200),
      "la moisson des services ne passe pas sa grille : elle retomberait sur z8")
      .toMatch(/Z_SERVICES\)/);
    expect(carte.slice(iSites, iSites + 200),
      "la moisson des sites passe une grille : elle quitterait le z8 partagé")
      .not.toMatch(/Z_SERVICES/);
  });

  /**
   * ⭐ ET CELUI-CI NE LIT PAS LE CODE : IL DEMANDE AU SERVEUR. Le défaut
   *    ci-dessus se résume à « l'adresse construite n'existe pas ». Aucune
   *    relecture ne le dit ; une requête, si. On reconstruit les deux
   *    adresses comme le fait l'écran, et on exige un 200 de chaque côté.
   * ⚠️ Sauté hors ligne plutôt que rouge : un garde qui échoue parce qu'un
   *    train n'a pas de réseau apprend à ignorer les gardes.
   */
  it("les deux adresses construites existent vraiment en ligne", async () => {
    const cadre = { ouest: -4.52, est: -4.44, nord: 48.42, sud: 48.37 };  // Brest
    const paires: [string, ReturnType<typeof tuilesDuCadre>, number][] = [
      ["s", tuilesDuCadre(cadre, 12), Z],
      ["c", tuilesDuCadre(cadre, 12, Z_SERVICES), Z_SERVICES],
    ];
    for (const [jeu, choix, grille] of paires) {
      expect(choix.etat, `${jeu} : le cadre d'essai est refusé`).toBe("ok");
      if (choix.etat !== "ok") continue;
      const [x, y] = choix.tuiles[0];
      const url = `https://mana.bzh/monde/${jeu}/${grille}/${x}/${y}.json`;
      let code = 0;
      try { code = (await fetch(url)).status; } catch { return; }   // hors ligne
      expect(code, `${url} n'existe pas : le calque se tairait en 404`).toBe(200);
    }
  }, 20_000);

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

/* ═══ DEUX TABLES DE CATÉGORIES, AUCUN IMPORT POSSIBLE ════════════════════
   🔴 `scripts/sites-monde.mjs` est du node pur (il tourne sans tsx) et
      `CarteMonde.tsx` du TypeScript : ils ne peuvent pas partager un module,
      et chacun porte SA table `LIBELLES`. Deux écritures d'une même valeur
      divergent toujours — c'est déjà écrit dans ce dépôt à propos du nom de
      cache, partagé entre `public/sw.js` et `emporter.ts` par un test faute
      de pouvoir l'être par un import.
   ⛔ ET LA DIVERGENCE EST MUETTE : une catégorie produite par le générateur
      que l'écran ne sait pas traduire s'affiche en CLÉ TECHNIQUE, en
      minuscules — « onze boutons sur vingt-trois », le 4/11/2026.
   ⚠️ Le garde est ORIENTÉ, et c'est voulu : tout ce que le générateur PRODUIT
      doit être traduisible. L'inverse est permis — l'écran garde les libellés
      de catégories retirées, parce qu'une tuile en cache chez un visiteur les
      porte encore pendant des semaines. */
describe("ce que le générateur produit, l'écran sait le dire", () => {
  const script = lire("../scripts/sites-monde.mjs");

  /**
   * Les clés d'un objet littéral `const NOM = { a: "…" };`.
   * ⚠️ `const NOM` PEUT PORTER UN TYPE — l'écran écrit
   *    `const LIBELLES: Record<string, string> = {`. Ma première rédaction
   *    cherchait `NOM = {` et rendait `null` sur l'écran ; c'est le refus
   *    EXPLICITE du `null` qui l'a dit, au lieu d'un `?? new Set()` qui
   *    aurait rendu le garde vert sur une table vide.
   */
  const tableDe = (texte: string, nom: string) => {
    const m = texte.match(new RegExp(`${nom}(?::[^=]+)? = \\{`));
    if (!m) return null;
    const i = texte.indexOf(m[0]);
    const corps = texte.slice(i, texte.indexOf("\n};", i));
    return new Set([...corps.matchAll(/(\w+):\s*"/g)].map((x) => x[1]));
  };

  it("chaque catégorie produite a un libellé des DEUX côtés", () => {
    const m = script.match(/export const CATEGORIES = \[([\s\S]*?)\];/);
    expect(m, "CATEGORIES est introuvable dans le générateur").not.toBeNull();
    const produites = [...m![1].matchAll(/"([a-z_]+)"/g)].map((x) => x[1]);
    expect(produites.length, "aucune catégorie lue : le motif a raté sa cible")
      .toBeGreaterThan(10);

    const cote = { script: tableDe(script, "const LIBELLES"),
                   ecran: tableDe(carte, "const LIBELLES") };
    for (const [ou, table] of Object.entries(cote)) {
      expect(table, `la table LIBELLES de ${ou} est introuvable`).not.toBeNull();
      const muettes = produites.filter((c) => !table!.has(c));
      expect(muettes,
        `${ou} : ${muettes.join(", ")} s'afficherai(en)t en clé technique`)
        .toEqual([]);
    }
  });

  /* ⛔ ET LES MOTS QUI NE RAMASSENT QUE DU BRUIT NE REVIENNENT PAS. Mesuré le
     15/11/2026 : `fontaine` rendait 207 lignes dont « Square La Fontaine »,
     `archeologie` 133 SOCIÉTÉS savantes annoncées « Site archéologique »,
     et `memoire`/`fortification`/`epave`/`rocher` ZÉRO. 347 épingles fausses.
     ⚠️ Le garde nomme les neuf, pour qu'un retour soit une DÉCISION et non un
        copier-coller depuis une vieille version du fichier. */
  it("les neuf mots qui ne ramassaient que du bruit restent dehors", () => {
    const m = script.match(/export const CATEGORIES = \[([\s\S]*?)\];/)!;
    const produites = new Set([...m[1].matchAll(/"([a-z_]+)"/g)].map((x) => x[1]));
    for (const mot of ["fontaine", "archeologie", "nature", "musee", "oeuvre",
                       "memoire", "fortification", "epave", "rocher"]) {
      expect(produites.has(mot),
        `« ${mot} » est revenu dans la liste blanche — il ne rend que du bruit `
        + "français (sociétés savantes, événements, squares homonymes)")
        .toBe(false);
    }
    /* ⭐ Et `site_archeologique` RESTE : c'est le mot de la moisson mondiale,
       dont `archeologie` n'était que le doublon français. */
    expect(produites.has("site_archeologique")).toBe(true);
  });

  /* ⛔ LE GARDE DES ADRESSES EST DANS LE GISEMENT, PAS DANS UNE INTENTION.
     204 associations étaient posées au bâtiment près depuis le 14/11. */
  it("le générateur appelle le garde des adresses de la base", () => {
    expect(script, "le gisement ne filtre pas les domiciles")
      .toMatch(/AND NOT public\.adresse_est_un_domicile\(/);
    /* ⭐ LE CHAMP ÉCRIT EN SQL ET LE CHAMP LU EN JS SONT LE MÊME — dérivé,
       pas recopié. Mutation posée le 15/11 : renommer le champ côté SQL
       laissait le garde VERT, parce que `Number(undefined)` vaut NaN et que
       `NaN > 0` est faux. Le garde ne mesurait plus rien, en silence. */
    const champ = script.match(
      /'(\w+)', count\(\*\) FILTER \(\s*WHERE public\.adresse_est_un_domicile/)?.[1];
    expect(champ, "le compte des domiciles n'est pas demandé au SQL").toBeTruthy();
    expect(script, `le champ « ${champ} » n'est jamais relu côté JavaScript`)
      .toContain(`g.${champ}`);
    /* ⛔ Et un compte ABSENT doit refuser, pas passer : sans ce contrôle, un
       renommage désarme le garde sans qu'une ligne ne bouge à l'écran. */
    expect(script, "un compte non numérique passerait pour « zéro domicile »")
      .toMatch(/Number\.isFinite\(passent\)/);
    /* ⚠️ Et il appelle la fonction de la BASE : un motif recopié ici
       divergerait du jour où la base affine sa règle. */
    expect(script, "un septième caviardage a été réécrit à la main")
      .not.toMatch(/naf\s+LIKE\s+'94/);
  });
});
