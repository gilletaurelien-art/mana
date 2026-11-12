import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { MOT_CLEF_OFFICE } from "./ot";

const nu = (f: string) =>
  readFileSync(new URL(f, import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n").filter((l) => !/^\s*(\/\/|\*)/.test(l)).join("\n");

const routeur = nu("./router.ts");
const poste = nu("./poste.ts");

describe("la navigation interne", () => {
  /**
   * 🔴 « FAIRE QUE LA RADIO FONCTIONNE PARTOUT » N'EST PAS UNE AFFAIRE DE
   *    LECTEUR AUDIO, C'EST UNE AFFAIRE DE NAVIGATION. Chaque lien était un
   *    rechargement complet : aucun élément ne survit à ça, où qu'on le
   *    place. Le flux s'arrêtait parce que le DOCUMENT mourait.
   */
  it("navigue sans recharger", () => {
    expect(routeur).toMatch(/history\.pushState/);
    expect(routeur).toMatch(/addEventListener\("popstate"/);
  });

  /**
   * ⛔ ON NE DÉTOURNE PAS TOUT CE QUI RESSEMBLE À UN LIEN. Chacune de ces
   *    exceptions est un geste qu'on casse si on l'oublie — et qui ne se voit
   *    pas tant qu'on ne l'essaie pas soi-même : ouvrir dans un onglet, le
   *    clic du milieu, une fiche de l'Office, un `mailto:`.
   */
  it("laisse au navigateur les gestes qui lui appartiennent", () => {
    for (const geste of [
      /e\.button !== 0/,          // clic du milieu, clic droit
      /metaKey/, /ctrlKey/, /shiftKey/, /altKey/,
      /lien\.target && lien\.target !== "_self"/,
      /hasAttribute\("download"\)/,
      /startsWith\("#"\)/,
      /\(mailto\|tel\|sms\)/,
      /defaultPrevented/,
    ]) expect(routeur, String(geste)).toMatch(geste);
  });

  /**
   * ⛔ LES URL NE CHANGENT PAS DE NATURE. Elles restent réelles, prérendues,
   *    partageables : `pushState` écrit la MÊME adresse que le lien. Un
   *    routeur qui inventerait des adresses casserait le référencement.
   */
  it("écrit l'adresse du lien, pas une adresse à lui", () => {
    expect(routeur).toMatch(/pushState\(null, "", u\.href\)/);
    expect(routeur).toMatch(/u\.origin !== window\.location\.origin/);
  });
});

describe("le poste de radio", () => {
  /**
   * ⭐ UN SEUL ÉLÉMENT, HORS DE REACT. Deux `<audio>` sur la même source, ce
   *    sont deux connexions au flux, deux factures de données mobiles — et
   *    sur un DIRECT, deux instants différents de la même antenne.
   */
  it("vit hors de l'arbre React, en un seul exemplaire", () => {
    expect(poste).toMatch(/document\.createElement\("audio"\)/);
    expect(poste).toMatch(/if \(element\) return element/);
    expect(poste).toMatch(/document\.body\.appendChild/);
    // ⛔ et l'écran ne crée plus le sien
    expect(nu("./Radio.tsx")).not.toMatch(/<audio/);
  });

  /**
   * ⚠️ `pause()` NE FERME PAS LA CONNEXION : le flux continue d'être
   *    téléchargé en arrière-plan. Sur un forfait de terrain, c'est une
   *    facture ; et un direct ne se reprend pas là où on l'a laissé.
   */
  it("coupe vraiment la connexion, il ne met pas en pause", () => {
    const c = poste.slice(poste.indexOf("export function couper"));
    expect(c).toMatch(/removeAttribute\("src"\)/);
    expect(c).toMatch(/\.load\(\)/);
  });

  /**
   * ⭐ LE CASQUE DÉBRANCHÉ, L'APPEL ENTRANT ET LE CONTRÔLE DU SYSTÈME mettent
   *    en pause sans passer par nous. Sans cet écouteur, la façade afficherait
   *    « en lecture » sur un poste muet.
   */
  it("écoute les pauses qui ne viennent pas de nous", () => {
    expect(poste).toMatch(/addEventListener\("pause"/);
  });
});

describe("les cinq sections de la page de l'application", () => {
  /* 🔄 6/11/2026 — elles ont quitté l'accueil pour `/l-application`, une page
     à elles, indexable. ⭐ Le DÉPLACEMENT N'AFFAIBLIT PAS CE GARDE, il le
     rend plus juste : ce qu'il mesure — assez de matière pour être cité,
     des chiffres qui concordent avec les artefacts — est une propriété du
     TEXTE, pas de la page qui l'héberge. Il ne nommait l'accueil que parce
     que le texte y habitait. */
  const app = readFileSync(new URL("./LApplication.tsx", import.meta.url), "utf8");

  /**
   * ⭐ CE QU'UN MOTEUR DE RÉPONSE SAIT EXTRAIRE, C'EST UNE PHRASE QUI RÉPOND.
   *    « Une expérience unique au cœur de la Bretagne » n'est citable par
   *    personne ; « 46 circuits balisés, 708 km, sur 11 communes » l'est.
   *    Ce test tient le VOLUME — une section qui retombe à deux lignes a
   *    perdu ce pour quoi elle a été écrite.
   */
  it("portent assez de matière pour être citées", () => {
    const textes = [...app.matchAll(/texte:\s*\n?\s*"([^"]{40,})"/g)].map((m) => m[1]);
    expect(textes.length).toBeGreaterThanOrEqual(4);
    for (const t of textes) expect(t.split(/\s+/).length, t.slice(0, 40)).toBeGreaterThan(45);
  });

  /**
   * ⛔ CHAQUE CHIFFRE A ÉTÉ COMPTÉ DANS L'ARTEFACT, PAS RAPPELÉ. Un nombre
   *    écrit de mémoire sur une page d'accueil est le faux témoin le plus
   *    coûteux qui soit : il est cité par des machines, et plus personne ne
   *    remonte à la source.
   * ⚠️ Ce test les RECOMPTE. S'il échoue, ce n'est pas lui qu'on corrige.
   */
  it("les chiffres cités correspondent aux artefacts", () => {
    const ot = JSON.parse(readFileSync(new URL("./ot.json", import.meta.url), "utf8"));
    const lx = JSON.parse(readFileSync(new URL("./lieux.json", import.meta.url), "utf8"));
    const km = Math.round(ot.itineraires.reduce((s: number, x: { km: number }) => s + x.km, 0));
    const communes = new Set(ot.itineraires.map((x: { commune?: string }) => x.commune).filter(Boolean));
    const nommes = lx.lieux.filter((l: { n?: string }) => l.n).length;
    const parCat = (nom: string) =>
      lx.lieux.filter((l: { c: string }) => lx.libelles[l.c] === nom).length;

    /* 🔄 RETOURNÉ LE 11/11/2026 — DEUX défauts, et le second explique le
       premier. (1) `1 358 sites` était écrit EN DUR à côté de huit
       vérifications dérivées, et doublé d'un `expect(lx.lieux.length).toBe(1358)`
       qui figeait l'artefact lui-même : étendre la couche de lieux faisait
       échouer un test qui n'avait rien à dire là-dessus. (2) Et il était en dur
       parce que la comparaison dérivée ne POUVAIT pas marcher : `${n} km` rend
       « 1035 km » quand la typographie française écrit « 1 035 km ».
       ⭐ Le garde avait raison sur le fond et tort sur la forme — on normalise
       les espaces des DEUX côtés, et plus rien n'est figé. */
    const sansEspaces = (x: string) => x.replace(/[\s\u00a0\u202f]/g, "");
    const cite = (attendu: string) =>
      expect(sansEspaces(app), attendu).toContain(sansEspaces(attendu));

    cite(`${ot.itineraires.length} circuits balisés`);
    cite(`${km} km`);
    cite(`${communes.size} communes`);
    cite(`${lx.lieux.length} sites`);
    cite(`${nommes} portent un nom`);
    cite(`${parCat("Fortification")} fortifications`);
    cite(`${parCat("Plage")} plages`);
    cite(`${parCat("Mégalithe")} mégalithes`);

    /* 🔴 CES TROIS-LÀ MANQUAIENT, ET LA PAGE LES AFFICHAIT FAUX — trouvé le
       12/11/2026 en REGARDANT l'écran, pas en relisant le code. Le garde
       vérifiait huit chiffres et laissait passer ceux qu'on ne lui avait pas
       nommés : la répartition par pratique (« 25 à pied, 12 en VTT… », soit
       l'ancien total de 46), le nombre de sites anonymes (734 au lieu de
       3 109), et surtout le CRÉDIT, qui nommait UN office sous un bloc qui en
       liste cinq.
       ⭐ « Compter les points de pose est le geste, pas poser le garde » —
       la leçon est déjà dans CLAUDE.md pour `guardedAnswer`, et elle vaut
       pour un garde de CHIFFRES comme pour un garde de sécurité. */
    const anonymes = lx.lieux.filter((l: { n?: string }) => !l.n).length;
    cite(`${anonymes} sites sans nom`);

    const parPratique: Record<string, number> = {};
    for (const x of ot.itineraires as { pratique: string }[]) {
      parPratique[x.pratique] = (parPratique[x.pratique] ?? 0) + 1;
    }
    for (const [libelle, cle] of [["à pied", "pied"], ["en VTT", "vtt"], ["en trail", "trail"], ["à vélo", "velo"]] as const) {
      if (parPratique[cle]) cite(`${parPratique[cle]} ${libelle}`);
    }

    /* ⛔ LE CRÉDIT NOMME TOUS LES OFFICES, ET AUCUN AUTRE. Créditer un
       partenaire pour la donnée d'un autre est précisément ce que la doctrine
       de `LApplication.tsx` interdit — et c'est arrivé, pendant une journée. */
    for (const o of ot.offices as { ot: string; nom: string }[]) {
      const mot = MOT_CLEF_OFFICE[o.ot];
      expect(mot, `office « ${o.ot} » sans mot-clef déclaré dans ot.ts`).toBeTruthy();
      cite(mot);
    }
    /* 🔴 MAIS LE LIEN NE SE VÉRIFIE PLUS PAR SON LITTÉRAL, et la première
       version de ce garde l'a appris en criant au loup. Les cinq liens sont
       DÉRIVÉS de `ot.json` à l'exécution : l'URL n'est plus dans le fichier,
       donc la chercher dans son texte échoue — sur un code devenu MEILLEUR.
       ⭐ C'est le détecteur aveuglé par un refactor propre, dans l'autre sens.
       On vérifie donc le MÉCANISME : le fichier lit l'artefact, et ne porte
       aucune URL d'office en dur. Une liste recopiée peut être juste
       aujourd'hui et fausse demain ; une dérivation ne peut pas dériver. */
    expect(app, "le crédit doit être DÉRIVÉ de ot.json, pas recopié")
      .toMatch(/otJson\.offices\.map/);
    const enDur = (ot.offices as { site: string }[])
      .map((o) => o.site)
      .filter((u) => app.includes(u));
    expect(enDur, "URL d'office écrite en dur : elle vieillira sans bruit").toEqual([]);
  });

  /**
   * 🔴 CE FICHIER A ANNONCÉ PENDANT TROIS JOURS DES FILTRES RETIRÉS — et ils
   *    avaient été retirés précisément pour que personne ne parte en
   *    poussette sur un sentier de falaise. ⭐ Une suppression se fait dans le
   *    code ET dans ce qui la promet.
   */
  it("ne promettent rien que l'application ne fasse", () => {
    /* ⚠️ SUR LE CODE DÉPOUILLÉ, pas sur le fichier brut. Première version :
       elle a crié sur « poussette » écrit dans le COMMENTAIRE qui raconte le
       retrait — quatrième fois cette nuit qu'un commentaire répond à la
       place du code. ⭐ Le helper `nu()` existait déjà en haut de ce
       fichier : l'oublier une fois de plus n'est pas une étourderie, c'est
       que le réflexe n'est pas encore pris. */
    const net = nu("./LApplication.tsx");
    for (const mort of [/poussette/i, /\bPMR\b/, /accessible aux chiens/i, /temps réel/i]) {
      expect(net, String(mort)).not.toMatch(mort);
    }
  });
});

describe("le titre de l'accueil", () => {
  /* ⭐ UN TITRE ARRÊTÉ PAR LE FONDATEUR EST UNE RÈGLE DE PRODUIT, et une règle
     de produit vaut mieux en test qu'en commentaire. Le texte précédent
     (« Bienvenue en Bretagne ») portait au-dessus de lui un commentaire disant
     « TEXTE ARRÊTÉ LE 1/11/2026 PAR LE FONDATEUR » : il n'a rien empêché, et
     il ne pouvait rien empêcher. Celui-ci échoue.
     ⚠️ Il tient le TEXTE et les DEUX LIGNES, pas la mise en forme : la coupe
     manuelle est ce qui tient le titre sur un téléphone, là où
     `text-wrap: balance` le laisse flotter d'un rendu à l'autre. */
  const src = nu("./Invitation.tsx");

  /* 🔄 RETOURNÉ LE 12/11/2026 — LE FONDATEUR A SUPPRIMÉ LE GRAND TITRE. Il
     disait mot pour mot ce que la devise dit depuis le même jour : deux fois
     la même phrase, l'une sous l'autre. ⭐ Ce que ce garde protégeait — « le
     texte de l'accueil est une règle de produit, pas un commentaire » — reste
     vrai et change de porteur : c'est la DEVISE qui est désormais le `h1`.
     ⚠️ CE QUI EST PERDU EST ÉCRIT : les deux `<br />` étaient VOULUS, ils
     tenaient la coupe sur un téléphone là où `text-wrap: balance` la laisse
     flotter. La devise tient sur une ligne, donc la question ne se pose plus —
     mais si la phrase revient en grand un jour, elle se reposera. */

  it("dit « Au cœur de la Bretagne », et c'est le SEUL h1 de l'accueil", () => {
    const h1s = [...src.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)];
    expect(h1s.length, "l'accueil doit porter exactement un h1").toBe(1);
    expect(h1s[0][1].replace(/<br\s*\/?>/g, " ").replace(/\s+/g, " ").trim())
      .toBe("Au cœur de la Bretagne");
  });

  it("🔴 et la section reste DÉSIGNÉE par son titre — l'ancre a suivi le rôle", () => {
    /* ⛔ Le bloc supprimé portait `id="inv-titre"`, et la section le désigne
       par `aria-labelledby="inv-titre"`. Le retirer sans déplacer l'ancre
       aurait laissé un `aria-labelledby` pointant dans le vide : le repère
       perd son nom accessible, et AUCUN écran ne le montre. */
    expect(src).toMatch(/aria-labelledby="inv-titre"/);
    expect(src, "le h1 doit porter l'ancre que la section désigne")
      .toMatch(/<h1[^>]*id="inv-titre"/);
  });
});

describe("de la carte au compositeur", () => {
  /* ⭐ LE PONT EST UNE RÈGLE, PAS UN FICHIER. Ce qui doit rester vrai : d'un
     lieu désigné sur la carte du territoire, on peut demander une balade qui
     y mène — et ce qui voyage est une POSITION, pas une clé de catalogue.
     ⚠️ La distinction n'est pas cosmétique : mesuré le 1/11, 139 des 583
        lieux nommés de la carte seulement (24 %) sont accrochés à une arête
        du graphe. Un lien qui passerait une clé refuserait trois lieux sur
        quatre, et le refus aurait l'air d'un défaut du moteur. Une position
        s'accroche à l'exécution et porte 80 % sous la règle des 150 m. */
  const carte = nu("./Territoire2030.tsx");
  const compo = nu("./Composer.tsx");

  it("la carte propose d'aller vers le lieu désigné, en lui passant sa position", () => {
    /* ⚠️ `/promenades`, PAS `/composer` — depuis le 3/11/2026, les deux
       adresses rendent le même écran, mais `/promenades` est la forme
       CANONIQUE que ce lien doit utiliser, comme le reste de l'app. */
    const lien = carte.match(/\/promenades\?vers=[^`]*/);
    expect(lien, "aucun lien « vers » depuis la fiche d'un lieu").not.toBeNull();
    // ⛔ la position du LIEU, jamais un identifiant de catalogue
    expect(lien![0]).toMatch(/vise\.g\[0\][\s\S]*vise\.g\[1\]/);
  });

  it("le compositeur lit cette position et vise avec", () => {
    expect(compo).toMatch(/p\.get\("vers"\)/);
    expect(compo).toMatch(/composerVers\(/);
  });

  /* 🔴 TROIS SURFACES DISENT CE QU'ON CROISERA — le décompte, la liste
     numérotée, les étapes sur la carte. Le 1/11, le lieu visé a été inséré
     dans UNE des trois : vérifié en production, le titre disait « Aller vers
     le Menhir de Crozon » et la liste citait l'église Saint-Pierre.
     ⭐ Trois porteuses d'une même règle divergent le jour où l'on en corrige
        une. Ce test exige qu'aucune surface d'affichage ne relise `b.lieux` :
        elles dérivent toutes du même tableau, et le lieu visé y entre une
        seule fois. */
  it("les trois surfaces de « ce qu'on croisera » dérivent d'un seul calcul", () => {
    /* ⚠️ DEUX FOIS DE SUITE CE GARDE A NOMMÉ UNE FORME AU LIEU D'UNE RÈGLE.
       D'abord il interdisait `b.lieux` PARTOUT, y compris dans le calcul
       commun — le seul endroit où il doit être lu ; il ne pouvait pas passer.
       Puis il cherchait `const rencontres = useMemo(() => {` et il est tombé
       quand la même fonction est passée en forme d'expression, alors que
       RIEN n'avait changé de ce qu'il protégeait.
       ⭐ La règle, elle, ne bouge pas : `b.lieux` ne se lit qu'UNE fois dans
          cet écran, et ce qu'on en tire est ce que les trois surfaces
          affichent. C'est ce qu'on écrit. */
    /* 🔴 ET UNE TROISIÈME FOIS LE 2/11 — mais pas pour la même raison. Cette
       fois ce n'est pas la FORME qui a bougé, c'est la SOURCE : on lisait
       `b.lieux`, les lieux que la moisson avait accrochés à une arête, et
       cela sous-comptait de deux tiers (1,47 annoncé contre 4,20 mesurés à
       moins de 150 m du tracé, et 27 % de « 0 lieu » tous faux). La mesure
       se fait désormais sur le TRACÉ, contre l'inventaire entier.
       ⭐ LA RÈGLE N'A PAS BOUGÉ D'UN MOT : un seul calcul, trois surfaces qui
          en dérivent. C'est elle qu'on écrit, et c'est pour ça qu'elle a
          survécu à trois changements de forme et à un changement de source. */
    expect([...compo.matchAll(/rencontresLeLong\(/g)].length,
           "la mesure doit se faire aux deux endroits qui en ont besoin — "
           + "le parcours retenu et le décompte des propositions — et nulle part ailleurs")
      .toBe(2);
    expect(compo, "les lieux accrochés par la moisson ne doivent plus être la source")
      .not.toMatch(/lieux\.length\} lieu/);
    // les trois surfaces lisent le résultat, jamais la source
    for (const surface of ["rencontres.length > 0", "rencontres.map(", "etapes: rencontres"]) {
      expect(compo, `la surface « ${surface} » ne lit pas le calcul commun`).toContain(surface);
    }
    /* ⛔ ET LE SEUIL NE SE RECOPIE PAS. Il vit dans `proches.ts`, qui porte
       la règle produit « si c'est listé, on passe devant ». Un 150 écrit en
       dur dans l'écran divergerait le jour où la règle bouge. */
    expect(compo, "un seuil de proximité est recopié dans l'écran")
      .not.toMatch(/\b150\b/);

    /* 🔴 ET ON MESURE SUR LE TRACÉ QU'ON MARCHE — le défaut du 2/11, le plus
       coûteux de la journée. L'écran passait `traits(g, b).flat()` : la
       géométrie STOCKÉE de chaque arête, toujours a→b, jamais inversée, alors
       que 52 % des arêtes sont marchées à l'envers. 89 % des tracés portaient
       un saut de plus de 120 m — des segments droits inexistants, qui frôlaient
       des lieux ensuite annoncés « sur le chemin » — et 20 % des listes
       sortaient dans le mauvais ordre.

       ⚠️ CE GARDE NOMME UNE FORME, ET C'EST ASSUMÉ. `promenade.test.ts` tient
          la PROPRIÉTÉ (« un tracé marché ne saute pas »), mais il la tient sur
          `contour`, qui était déjà juste : il n'aurait rien vu. ⭐ Un garde
          posé sur un objet ne dit rien de celui qui en refabrique un autre.
          Celui-ci interdit donc la seule mauvaise fabrication connue, et il
          dit pourquoi. */
    for (const m of [...compo.matchAll(/rencontresLeLong\(([^,]+),/g)]) {
      expect(m[1].trim(), `rencontresLeLong reçoit « ${m[1].trim()} » : ce doit ` +
        `être le contour MARCHÉ, pas une géométrie recollée`).toMatch(/\.contour$/);
    }
    expect(compo, "traits() aplati sert de tracé quelque part — c'est le zigzag")
      .not.toMatch(/traits\([^)]*\)\s*\.flat\(\)/);
    expect(compo, "les points de la carte ne suivent pas l'ordre de marche")
      .toMatch(/points: b\.contour/);

    /* 🔴 ET CE QUI PORTE DES INDICES D'ARÊTE NE SE LIT JAMAIS SANS SA
       PROVENANCE — défaut bloquant du 2/11. Les propositions ne valent que
       dans le graphe qui les a produites ; un changement de territoire les
       périme, et la moitié des cas ne LÈVE RIEN (indices valides dans un
       graphe plus grand) donc ne se voit pas. */
    expect([...compo.matchAll(/props\.liste/g)].length,
           "les propositions doivent se lire en UN SEUL endroit, celui qui "
           + "vérifie de quel graphe elles viennent").toBe(1);
    expect(compo, "la provenance des propositions n'est pas comparée au territoire")
      .toMatch(/props\.de === territoire\.slug/);
    expect(compo, "un changement de territoire ne périme pas les propositions")
      .toMatch(/setProps\(null\)[\s\S]{0,400}?dejaPropose\.current = false/);

    /* 🔴 `Etape.pos` EST UNE FRACTION DU PARCOURS, PAS UN RANG. Les promenades
       du catalogue portent 0,109 · 0,2439 · 0,5034, et `EnChemin` s'en sert
       pour griser ce qui est passé, poser le jalon sur la barre
       (`${pos * 100}%`) et annoncer la prochaine étape. En y mettant l'indice
       de la boucle, le deuxième jalon partait à 100 % de la barre et le
       troisième à 200 %.
       ⭐ Le nombre juste était déjà calculé et je l'ai jeté en recopiant la
          FORME du catalogue sans relire ce que son champ voulait dire. */
    const etapes = compo.match(/etapes: rencontres\.map\(([^)]*)\) => \(\{[\s\S]*?\}\)\)/);
    expect(etapes, "la fabrique des étapes").not.toBeNull();
    expect(etapes![0], "`pos` doit recevoir une fraction mesurée, jamais un rang")
      .toMatch(/pos: r\.ordre/);
    expect(etapes![1], "la fabrique des étapes ne doit pas même recevoir l'indice")
      .not.toMatch(/,/);
  });

  /* 🔴 LE GARDE QUI COMPTE : UN REFUS MUET RESSEMBLE À UNE ABSENCE. Le
     moteur porte maintenant DEUX vocabulaires de refus — `Visee` pour la
     boucle, `Promenade` pour l'aller — et chacun de leurs états doit mener
     quelque part à l'écran.
     ⭐ CE GARDE A DÛ ÊTRE RETOURNÉ LE 2/11, ET IL AVAIT RAISON DE TOMBER. Il
        exigeait `visee.etat === "<état>"` : la forme exacte du code d'hier,
        quand la boucle était la promenade. Elle est devenue une option, le
        A→B est devenu la forme principale, et le garde a crié sans qu'aucun
        refus n'ait perdu sa phrase.
     ⚠️ Et il n'exige plus une phrase PAR état, parce que ce serait faux :
        certains refus sont AGRÉGÉS à dessein, et l'agrégation est une
        décision de produit. Elle doit donc être écrite ICI, état par état —
        ajouter un refus au moteur sans trancher fait tomber ce test. */
  it("aucun refus du moteur ne reste muet", () => {
    const moteur = nu("./composition.ts");
    /* ⚠️ LA FENÊTRE VA JUSQU'À LA DÉCLARATION SUIVANTE, pas jusqu'au premier
       `;` — vécu le 1/11 : en ajoutant un champ au variant `ok`, le `;` de
       ce champ a coupé la fenêtre, le garde n'a plus vu qu'un état, et il a
       crié alors que rien n'avait perdu sa phrase. ⭐ Un garde dont la
       fenêtre se ferme sur un caractère que la cible peut contenir mesure
       la forme du code, pas la règle. */
    const etatsDe = (type: string) => {
      const bloc = moteur.match(new RegExp(`export type ${type} =([\\s\\S]*?)\\nexport `));
      expect(bloc, `le type ${type}`).not.toBeNull();
      return [...bloc![1].matchAll(/etat: "([a-z-]+)"/g)].map((m) => m[1])
        .filter((e) => e !== "ok");
    };

    /**
     * LES REFUS AGRÉGÉS — chacun avec la raison de l'être.
     *
     * ⭐ Un refus se dit SÉPARÉMENT quand il appelle un geste PROPRE. Deux
     *    refus qui appellent le même geste n'ont pas besoin de deux phrases :
     *    les séparer ferait trois paragraphes pour une seule conduite à tenir,
     *    et une page entièrement faite d'avertissements n'avertit plus.
     */
    const AGREGES: Record<string, string> = {
      // `promenadeVers` tourne pour CHACUN des lieux de la bande, et ses refus
      // n'ont pas de destinataire : personne n'a demandé ce lieu-là. Ils se
      // comptent, et le total se dit — « aucun autre lieu remarquable entre
      // 600 m et 4 km » — avec les deux nombres de la bande.
      "ferme": "refus par proposition : agrégé dans « aucune proposition »",
      "hors-reseau": "refus par proposition : agrégé dans « aucune proposition »",
      "sur-place": "refus par proposition : agrégé dans « aucune proposition »",
      // La boucle est une OPTION, et tous ses refus mènent au même geste :
      // garder l'aller et revenir sur ses pas. Le bloc le dit, avec un texte
      // distinct pour les deux cas fréquents et un repli pour les autres.
      "trop-loin": "option boucle : repli commun « l'aller reste »",
      /* ⭐ `ecarte` EST EMPÊCHÉ, PAS AFFICHÉ — et c'est mieux qu'une phrase.
         Côté départ : l'écran refuse le lieu AVANT d'appeler le moteur, avec
         l'écart mesuré (les deux `expect` en bas de ce test le tiennent).
         Côté boucle : le lieu visé a déjà passé l'accrochage, et `aretesAutour`
         mesure exactement comme lui — le moteur ne peut donc pas le trouver
         écarté. ⚠️ Si ces deux mesures divergeaient un jour, ce serait un
         défaut à part entière, et l'un des deux seuils serait faux. */
      "ecarte": "empêché en amont : le départ est refusé avant tout calcul",
    };

    for (const type of ["Visee", "Promenade"]) {
      const etats = etatsDe(type);
      expect(etats.length, `${type} doit porter des refus nommés`).toBeGreaterThanOrEqual(3);
      for (const e of etats) {
        const dit = compo.includes(`"${e}"`);
        expect(dit || e in AGREGES,
          `l'état « ${e} » (${type}) n'est ni dit à l'écran ni déclaré agrégé ` +
          `dans ce test — il faut trancher : une phrase, ou une raison`).toBe(true);
      }
    }

    /* ⛔ ET LE PREMIER REFUS RESTE LE PLUS IMPORTANT. Mesuré le 2/11 : 18 %
       des lieux nommés de la presqu'île sont à plus de 150 m du chemin le
       plus proche — des baies, des caps, des épaves. C'est le refus le plus
       fréquent, il arrive AVANT tout calcul, et il DIT l'écart mesuré. */
    expect(compo, "le lieu qu'aucun chemin n'approche n'est pas refusé avant calcul")
      .toMatch(/if \(!accroche\(a\)\)/);
    expect(compo, "ce refus ne dit pas l'écart mesuré")
      .toMatch(/refusDepart\.a\.ecart/);
  });
});

describe("ce qu'on fait d'une promenade composée", () => {
  const compo = nu("./Composer.tsx");
  const chemin = nu("./EnChemin.tsx");

  /* 🔴 LA QUESTION D'AURÉLIEN, LE 2/11 : « à quoi sert "emporter le tracé
     (GPX)" alors qu'on veut qu'ils utilisent MANA ? ». Elle était juste, et
     elle pointait un MANQUE, pas un bouton de trop : le compositeur
     n'offrait QUE de partir ailleurs, parce que l'écran de marche ne savait
     se monter que depuis un slug de catalogue.
     ⭐ Il n'a jamais eu besoin que de six champs, et une boucle composée les
        a tous. Ce n'était pas une fonctionnalité à inventer, c'était une
        dépendance à desserrer. */
  it("on peut MARCHER une boucle qui n'est dans aucun catalogue", () => {
    expect(chemin, "l'écran de marche n'accepte pas de promenade directe")
      .toMatch(/walk: direct/);
    expect(chemin).toMatch(/direct \?\? WALKS\.find/);
    expect(compo, "le compositeur ne monte pas l'écran de marche")
      .toMatch(/<EnChemin[\s\S]{0,200}walk=\{walk\}/);
  });

  /* ⛔ ET LE GPX RESTE. Une application qui garde ce qu'on y a fait n'est pas
     celle qu'on veut écrire : ce qui est à vous est à vous, y compris quand
     vous partez avec. Il descend au second rang — il ne disparaît pas.
     ⭐ Ce test tient les DEUX bords : l'action principale doit être de
        marcher, et la sortie doit exister. Un garde qui ne tiendrait que le
        premier laisserait supprimer le second au nom de la même idée. */
  /* 🔄 RETOURNÉ LE 6/11/2026, ET IL AVAIT RAISON DE TOMBER. Il épinglait le
     NOM DE CLASSE `cp-primaire`. L'action a déménagé sur la carte plein écran
     et s'appelle désormais `cp-scene-primaire` — la règle, elle, n'a pas
     bougé d'un mot : un bouton PRINCIPAL lance la marche.
     ⭐ Un garde qui nomme l'implémentation se met en travers de la bonne
        correction : il faut l'éteindre pour avancer, et c'est le moment où
        l'on éteint aussi ce qu'il gardait vraiment. Il lit donc une classe
        de PREMIER RANG, quel que soit l'écran qui la porte. */
  it("⛔ « Partir » est l'action principale, et le GPX reste atteignable", () => {
    const principal = compo.match(/className="cp-[a-z-]*primaire"[\s\S]{0,260}?<\/button>/g) ?? [];
    const partir = principal.find((x) => /setEnMarche\(true\)/.test(x));
    expect(partir, "aucun bouton principal ne lance la marche").toBeTruthy();

    /* ⛔ ET UNE SEULE. Monter l'action sur la carte sans retirer celle d'en
       bas aurait donné deux boutons pour un seul geste — le défaut trouvé sur
       l'accueil en septembre, où « Voir les balades » et « Voir sur la carte »
       menaient au même écran. Déplacer, jamais dupliquer. */
    const lanceurs = principal.filter((x) => /setEnMarche\(true\)/.test(x));
    expect(lanceurs.length, "deux boutons principaux lancent la marche").toBe(1);

    // la sortie existe toujours, et elle emporte un VRAI fichier
    expect(compo).toMatch(/enGpx\(walk\)/);
    expect(compo).toMatch(/GPX/);
  });

  /* ⛔ UNE BOUCLE COMPOSÉE N'A NI PHOTOGRAPHIE NI PLACE DANS L'ATLAS du
     catalogue : l'y chercher par slug ne focaliserait rien et montrerait les
     promenades éditoriales à quelqu'un qui marche tout autre chose. */
  it("⛔ et on ne lui cherche ni image ni voisine dans le catalogue", () => {
    expect(chemin).toMatch(/const duCatalogue = WALKS\.some/);
    expect(chemin).toMatch(/duCatalogue \? ILLUSTRATIONS/);
    expect(chemin).toMatch(/duCatalogue \? WALKS : \[walk\]/);
  });
});

describe("la distance, pas la durée", () => {
  const compo = nu("./Composer.tsx");

  /* 🔴 ARBITRAGE DU FONDATEUR, 2/11 : « certains sont lents, certains
     marchent vite. La pertinence est la distance. Ne pas surestimer ou
     sous-estimer la durée. »
     ⭐ Et c'est la suite de ce qu'on avait mesuré la veille : les 36 989
        arêtes des deux graphes ne portent AUCUN dénivelé. La durée était
        donc calculée à plat, donc fausse dès que ça monte — on annonçait un
        chiffre qu'on ne savait pas faire. Un kilomètre, lui, est un
        kilomètre. */
  it("⛔ l'écran n'annonce aucune durée de marche POUR LA PROMENADE COMPOSÉE", () => {
    /* ⚠️ On vise les FORMATS d'affichage, pas le mot « heure » : il reste
       légitime dans une phrase (« donnez-vous plus de temps »). Ce qui est
       interdit, c'est de RENDRE un nombre d'heures.
       ⚠️ ET LE TITRE A GAGNÉ TROIS MOTS LE 3/11/2026, QUAND CE FICHIER A
          FUSIONNÉ AVEC LE CATALOGUE. L'interdit porte sur la promenade qu'on
          vient de COMPOSER — personne ne connaît votre pas, donc aucune durée
          ne lui est inventée. Le catalogue, lui, montre 1 032 itinéraires
          DÉJÀ DOCUMENTÉS, et porte un filtre « marche ≤ N h » où N est un
          SEUIL CHOISI PAR LA PERSONNE sur un curseur — on lui redit sa propre
          valeur, on ne lui invente rien. `(?<!dureeMax)` exempte CE SEUL cas,
          nommé, et rien d'autre : tout AUTRE `} h` reste interdit. */
    for (const motif of [/\{heuresDe\(/, /dureeEstimeeH\}/, /(?<!dureeMax)\} h\b/, /heure\{/]) {
      expect(compo, `l'écran affiche une durée : ${motif}`).not.toMatch(motif);
    }
    /* 🔴 ET CE GARDE A ÉTÉ RETOURNÉ DEUX FOIS EN UN JOUR, CE QUI EN DIT
       LONG. Première version : il exigeait `const DISTANCES = [3, 6, 9]`, le
       tableau des trois choix. Le fondateur a retiré le choix le 2/11 : le
       tableau est devenu du code mort, et le garde PROTÉGEAIT ce code mort.
       Deuxième version : il exigeait `km * 1000` et `KM_PAR_DEFAUT` — donc
       qu'une distance soit choisie quelque part, par nous.
       ⭐ LA RÈGLE A CHANGÉ, ET C'EST ELLE QU'ON GARDE : plus personne ne
          choisit de distance, elle est la CONSÉQUENCE de deux lieux. Le seul
          nombre qui reste est un RAPPORT — la cible de la boucle dérivée de
          l'aller — et c'est ce qui a fait passer `composerVers` de 58 % à
          plus de 90 % de réussite. Un garde qui exige un MOYEN interdit la
          bonne solution ; celui-ci exige qu'aucune distance ne soit inventée. */
    expect(compo, "la cible de la boucle n'est pas dérivée de l'aller")
      .toMatch(/BOUCLE_PAR_ALLER/);
    expect(compo, "la cible de la boucle doit se calculer sur des mètres MESURÉS")
      .toMatch(/parcours\.metres \* BOUCLE_PAR_ALLER/);
    /* ⛔ ET AUCUNE DISTANCE EN DUR. Un `6 * 1000` ou un `const KM_` qui
       reviendrait serait le retour du nombre inventé — par commodité, et
       sans que rien ne le signale. */
    for (const motif of [/KM_PAR_DEFAUT/, /\bkm \* 1000\b/, /const DISTANCES/]) {
      expect(compo, `une distance est de nouveau choisie en dur : ${motif}`)
        .not.toMatch(motif);
    }
  });

  /* 🔴 LA RECHERCHE PROPOSAIT « CALVAIRE » COMME POINT DE DÉPART — un nom
     qui EST sa catégorie. Le drapeau `anonyme` du graphe n'est pas posé sur
     ces lieux-là. ⭐ Quand une donnée ne porte pas la distinction qu'on
     cherche, on ne la suppose pas : on en dérive une qu'on peut contrôler —
     ici, l'égalité entre le nom et le libellé de la catégorie. */
  it("⛔ on ne propose pas un lieu dont le nom est sa catégorie", () => {
    /* ⚠️ CE GARDE NOMMAIT L'EXPRESSION EXACTE — `plat(L.n) === plat(LIBELLE[
       L.c]` — et il est tombé le 2/11 quand la source des lieux est passée du
       graphe à l'inventaire : la variable a changé de nom, la règle n'avait
       pas bougé. ⭐ Il nomme désormais la règle : le nom se compare au LIBELLÉ
       DE SA CATÉGORIE, et l'égalité écarte. */
    expect(compo, "le nom n'est pas comparé au libellé de sa catégorie")
      .toMatch(/plat\([a-z]+\.n[!]?\) === plat\((?:[a-z]+\.)?libelles\[|plat\([a-z]+\.n[!]?\) === plat\(LIBELLE\[/);
    expect(compo, "les lieux sans nom restent écartés aussi")
      .toMatch(/if \(![a-z]+\.n\) return false;|[a-z]+\.anonyme \|\| ![a-z]+\.n/);
  });

  /* ⭐ DEUX CHEMINS VERS LE POINT DE DÉPART, parce que deux situations :
     dehors on est quelque part, chez soi la veille on prépare. Retirer l'un
     des deux ferme la moitié des usages. */
  it("le point de départ se donne par la position OU par un lieu cherché", () => {
    /* ⚠️ CE GARDE NOMMAIT UNE CLASSE CSS — `.cp-depart-ici` — et il est
       tombé au premier changement de dessin, alors que la règle n'avait
       pas bougé d'un pouce : le bouton est devenu un pin, la classe a
       changé de nom, les deux chemins existaient toujours.
       ⭐ Un garde qui nomme une forme meurt au premier refactor, et il
          meurt en CRIANT — ce qui coûte plus cher qu'un garde absent : on
          cherche une régression qui n'existe pas. Il nomme désormais la
          règle : un contrôle demande la position, un champ cherche un
          lieu, et choisir un résultat pose le départ. */
    expect(compo, "aucun contrôle ne demande la position")
      .toMatch(/onClick=\{localiser\}/);
    expect(compo, "aucun champ de recherche").toMatch(/type="search"/);
    /* ⚠️ ET IL A FALLU LE RETOURNER UNE FOIS DE PLUS le 2/11 : il nommait
       `setPosition(l.g)`, le geste d'hier. Poser le départ veut dire
       aujourd'hui CALCULER LES PROPOSITIONS, parce que choisir un lieu EST
       l'action — il n'y a plus de bouton de confirmation. */
    expect(compo, "choisir un résultat ne pose pas le départ")
      .toMatch(/onClick=\{\(\) => choisirSpot\(i\)\}/);
    expect(compo, "le pin ne mène pas aux propositions, lui aussi")
      .toMatch(/proposer\(accrocherUn\(/);
  });
});

describe("🔴 6/11/2026 — l'écran de l'offre promenade doit se lire sans mode d'emploi", () => {
  const compo = readFileSync(new URL("./Composer.tsx", import.meta.url), "utf8");
  const nu = compo.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

  /* 🔴 LES TROIS CHOIX AVAIENT PERDU LEUR QUESTION. L'en-tête « Où vont vos
     pas depuis X ? » a été retirée le 3/11, à juste titre : dans un DOCUMENT,
     le titre de page et la phrase du dessus la posaient déjà.
     ⭐ Sur une carte nue, plus rien ne la pose. Trois bulles sur un paysage ne
        s'expliquent pas seules — filtres ? lieux croisés ? destinations ? */
  /* 🔄 RETOURNÉ LE 6/11/2026, QUELQUES HEURES APRÈS AVOIR ÉTÉ ÉCRIT. Il
     exigeait un intitulé « Où vont vos pas ? » au-dessus des trois choix.
     Le fondateur, voyant l'écran : « la carte est surchargée […] allège les
     textes sur carte ». Il avait raison — j'avais empilé SEPT couches de
     mobilier sur un fond qui change tous les mètres.
     ⭐ CE QU'IL PROTÉGEAIT RESTE VRAI SOUS UNE AUTRE FORME, et plus courte :
        l'écran doit dire son MÉCANISME — un départ, des promenades autour.
        Il le dit désormais là où l'on tape, par le libellé du champ
        (« D'où partez-vous ? »), et les pastilles portent chacune leur
        distance. Zéro mot de plus sur la carte, la même question posée.
     ⚠️ Un garde écrit le matin peut être juste et devenir faux l'après-midi :
        ce n'est pas qu'il avait tort, c'est que le contexte a bougé — la
        première version de l'écran n'était pas encore pleine. */
  it("l'écran dit où l'on va, sans l'écrire sur la carte", () => {
    expect(nu, "le champ ne pose plus la question du départ")
      .toMatch(/placeholder="D'où partez-vous/);
  });

  /* 🔴 LE GARDE QUI COMPTE LE PLUS DANS CETTE REFONTE. « Cliquer sur le
     tracé, tout simplement » ne doit pas vouloir dire « à la souris
     seulement ». Les pastilles étaient des boutons : focalisables, nommés,
     actionnables au clavier. En les remplaçant par des traits dessinés, tout
     cela se perd par défaut — un `<path>` n'est rien pour un clavier.
     ⭐ Un changement d'interface qui gagne en évidence pour l'œil peut tout
        retirer à qui n'a pas de souris, et rien ne le signale. */
  it("⛔ on choisit un tracé au clavier aussi, et il porte son nom", () => {
    const carte = readFileSync(new URL("./CarteReelle.tsx", import.meta.url), "utf8");
    expect(carte).toMatch(/tabIndex=\{0\}/);
    expect(carte).toMatch(/aria-label=\{`Promenade vers \$\{t\.nom\}`\}/);
    expect(carte, "la touche Entrée ne choisit rien").toMatch(/e\.key === "Enter"/);
    expect(carte, "l'état choisi n'est pas annoncé").toMatch(/aria-pressed=\{t\.choisie\}/);
  });

  /* ⭐ ON CHOISIT ENTRE 1,7 KM ET 2,4 KM, PAS ENTRE TROIS NOMS. Sans la
     distance sur CHAQUE bouton, il fallait les cliquer tous les trois pour
     comparer — et chaque clic recalculait un parcours entier pour répondre à
     une question de deux chiffres. */
  /* 🔄 RETOURNÉ LE 6/11/2026 — demande du fondateur : « pour choisir un
     tracé, cliquer sur le tracé, tout simplement ». Les trois pastilles sont
     parties DANS la carte.
     ⭐ CE QU'IL PROTÉGEAIT : on doit pouvoir COMPARER les trois avant d'en
        choisir un. C'était vrai par les chiffres ; c'est vrai désormais par
        le dessin — trois chemins, trois couleurs, trois arrivées de la même
        couleur que leur chemin. La question qu'on se pose est « lequel va
        où ? », et une forme y répond mieux qu'un nombre.
     ⚠️ CE QU'ON PERD, ET IL FAUT LE DIRE : la distance de chaque option n'est
        plus écrite. Seule celle du tracé tenu l'est, dans la ligne de faits.
        On compare des longueurs à l'œil au lieu de lire trois nombres. C'est
        le prix demandé pour désencombrer la carte ; si cela manque, c'est ici
        qu'il faudra revenir. */
  it("les trois propositions se comparent AVANT d'être choisies", () => {
    const compoCarte = readFileSync(new URL("./CarteReelle.tsx", import.meta.url), "utf8");
    expect(nu, "les trois tracés ne sont pas passés à la carte").toMatch(/traces=\{tracesCarte\}/);
    expect(nu, "les trois tracés n'ont pas de couleurs distinctes").toMatch(/COULEURS_TRACE/);
    expect(compoCarte, "l'arrivée ne prend pas la couleur de son tracé")
      .toMatch(/couleur=\{t\.couleur\}/);
  });

  /* 🔴 DEUX BOUTONS VOISINS SE COMPARENT PAR LEUR LIBELLÉ. « Commencer » et
     « Y aller » disaient tous deux « partir », alors que l'un ouvre l'écran de
     marche et l'autre l'itinéraire ROUTIER vers le point de départ. Le choix
     devenait un pari.
     ⚠️ « Y aller » reste juste sur la carte du territoire, où il est SEUL.
        C'est le voisinage qui décide du mot, pas l'uniformité du vocabulaire. */
  it("les deux gestes ne disent pas la même chose", () => {
    expect(nu).toMatch(/Aller au départ/);
    const actions = nu.match(/cp-scene-actions[\s\S]{0,1400}?<\/div>/)?.[0] ?? "";
    expect(actions, "la section des actions est introuvable").toContain("Commencer");
    expect(actions, "« Y aller » est revenu à côté de « Commencer »")
      .not.toMatch(/>\s*Y aller\s*</);
  });

  /* ⚠️ LE POINT DÉCIMAL N'EST PAS FRANÇAIS. Cet écran écrivait « 1.7 km » à
     quatre endroits pendant qu'un autre écran employait `toLocaleString`.
     ⭐ Le garde porte sur CET écran, pas sur l'application : deux fichiers
        gardent le point, et c'est dit dans le code plutôt que tu. */
  it("les distances de cet écran s'écrivent à la française", () => {
    expect(nu, "un point décimal subsiste sur cet écran")
      .not.toMatch(/\/ 1000\)\.toFixed\(1\)|distanceKm \* 2\)\.toFixed\(1\)/);
    expect(nu).toMatch(/toLocaleString\("fr-FR"/);
  });
});

describe("🔴 6/11/2026 — le parcours de /promenades, pour qui arrive sans rien savoir", () => {
  const compo = readFileSync(new URL("./Composer.tsx", import.meta.url), "utf8");
  const nu = compo.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

  /* 🔴 L'ENTRÉE LA PLUS FACILE N'ÉTAIT QU'UNE ICÔNE. Un geste suffit pour
     partir d'où l'on se trouve ; sans mot, il faut le deviner — et qui ne le
     devine pas doit taper un toponyme breton pour commencer.
     ⭐ L'`aria-label` disait DÉJÀ « Partir d'où je suis ». Quand un libellé
        accessible explique mieux que l'écran, c'est l'écran qu'on corrige. */
  it("le bouton « autour de moi » porte un mot visible, pas seulement un aria-label", () => {
    expect(nu).toMatch(/cp-pin-mot/);
    expect(nu).toMatch(/Autour de moi/);
  });

  /* 🔴 RIEN NE DISAIT CE QUE FAIT L'ÉCRAN. On y arrive sur une carte, un
     départ déjà choisi qu'on n'a pas choisi, et trois bulles. Le mécanisme —
     un point de départ, trois promenades autour — n'était écrit nulle part :
     il fallait le deviner en cliquant. */
  /* 🔄 FUSIONNÉ LE 6/11 DANS LE GARDE CI-DESSUS. Il exigeait une PHRASE sur
     la carte (« nous proposons trois promenades autour »). Le fondateur l'a
     fait retirer avec le reste du mobilier : le mécanisme se dit maintenant
     par le libellé du champ. Deux tests pour une même règle en auraient fait
     tomber deux à la prochaine réécriture, pour une seule décision. */

  /* 🔴 LE GARDE QUI GÉNÉRALISE L'ERREUR. Les deux libellés flottants ont été
     posés en craie claire, SANS FOND, avec une ombre portée, sur une carte
     CLAIRE : mesuré 1,09 et 1,12 de contraste — invisibles.
     ⭐ UNE OMBRE PORTÉE N'EST PAS UN FOND. Elle détoure un gros titre ; elle
        ne fait rien pour une ligne de petit texte. Et sur une carte le fond
        est INCONNU PAR CONSTRUCTION : il change au défilement, au zoom, et
        selon qu'on affiche le plan ou l'orthophoto. C'est pour cela que
        `/carte` met TOUT en bulle — contourné deux fois « pour rester
        discret », et discret a voulu dire absent. */
  /* 🔄 RÉÉCRIT LE 6/11 : il lisait UN BLOC CSS nommé, et ce bloc a disparu
     avec les deux libellés que le fondateur a fait retirer. La règle, elle,
     est la plus durable de la journée — et elle se vérifie mieux en négatif.
     🔴 Les libellés flottants ont été posés en craie claire, SANS FOND, avec
        une ombre portée, sur une carte CLAIRE : mesuré 1,09 et 1,12 de
        contraste. Invisibles.
     ⭐ UNE OMBRE PORTÉE N'EST PAS UN FOND. Elle détoure un gros titre ; elle
        ne fait rien pour une ligne de petit texte. Et sur une carte le fond
        est INCONNU PAR CONSTRUCTION : il change au défilement, au zoom, et
        selon qu'on affiche le plan ou l'orthophoto. Tout ce qui flotte sur
        cette carte porte donc sa propre bulle — et une `text-shadow` qui
        réapparaît dans `.cp-scene` est le signe qu'on y renonce. */
  it("⛔ aucun libellé flottant ne compte sur une ombre portée pour être lu", () => {
    const regles = [...css.matchAll(/\.cp-scene[^{]*\{[^}]*\}/g)].map((m) => m[0]);
    expect(regles.length, "aucune règle `.cp-scene` : le sélecteur a changé de nom")
      .toBeGreaterThan(5);
    const avecOmbre = regles.filter((r) => /text-shadow:\s*(?!none)/.test(r));
    expect(avecOmbre, `ombre portée sur la carte : ${avecOmbre.join(" | ").slice(0, 160)}`)
      .toHaveLength(0);
  });

  /* ⚠️ Le départ est un ÉTAT, pas une phrase : il porte son étiquette, comme
     « Arrivée » sur la carte. « Depuis X » se lisait comme un commentaire. */
  it("le départ s'annonce comme un départ", () => {
    expect(nu).toMatch(/cp-depart-etiquette/);
  });
});

describe("🔴 6/11/2026 — « la carte s'efface ? » : deux défauts trouvés par le fondateur", () => {
  const carte = readFileSync(new URL("./CarteReelle.tsx", import.meta.url), "utf8");

  /* 🔴 LA CARTE ÉTAIT DÉTRUITE ET RECONSTRUITE À CHAQUE CLIC. `walk` est un
     `useMemo` du compositeur qui dépend de la proposition choisie : tant
     qu'il figurait dans les dépendances de l'effet, chaque clic appelait
     `m.remove()` puis rebâtissait une carte WebGL entière — tuiles, style,
     sources. La plupart du temps ça repassait ; parfois la nouvelle carte
     restait vide, et il ne restait que le fond kaki et les traits SVG.
     ⭐ Un défaut qui « repasse la plupart du temps » n'est pas rare : c'est un
        défaut permanent dont on ne voit que les ratés.
     ⚠️ Mesuré en marquant le canvas d'un témoin et en cliquant six fois :
        `memeCanvas` doit rester vrai. Ce test-ci tient la CAUSE, faute de
        pouvoir monter maplibre sans navigateur. */
  it("⛔ ni `walk` ni `traces` dans les dépendances de l'effet qui crée la carte", () => {
    const deps = carte.match(/\n\s*\}, \[([^\]]*)\]\);/g) ?? [];
    const creation = deps.find((d) => /marge/.test(d));
    expect(creation, "l'effet qui crée la carte est introuvable").toBeTruthy();
    expect(creation, "`walk` recrée la carte à chaque choix").not.toMatch(/\bwalk\b/);
    expect(creation, "`traces` recrée la carte à chaque choix").not.toMatch(/\btraces\b(?!Ref)/);
    // et la géométrie se relit donc par référence, à chaque image
    expect(carte).toMatch(/tracesRef\.current/);
    expect(carte).toMatch(/walkRef\.current/);
  });

  /* 🔴 « "Plage …" EST TRONQUÉ ». L'étiquette se posait TOUJOURS à droite du
     point ; au bord, le `overflow: hidden` du conteneur la coupait net.
     ⚠️ ET BASCULER À GAUCHE NE SUFFISAIT PAS — mesuré : « Plaque
        commémorative "Tante Yvonne" » sortait alors par la gauche. Un
        débordement déplacé n'est pas corrigé. On choisit le côté où il reste
        le plus de place, on borne à cette place, et le nom passe à la ligne
        plutôt que de se couper : c'est l'ARRIVÉE, le seul nom qu'on ait
        besoin de lire en entier. */
  it("⛔ l'étiquette choisit son côté sur la place RÉELLE, et ne se coupe pas", () => {
    expect(carte, "le côté n'est pas choisi sur la place restante").toMatch(/resteG > resteD/);
    expect(carte, "l'étiquette n'est pas bornée à la place disponible")
      .toMatch(/--etiquette-max/);
    /* 🔴 Et la mesure doit être reprise quand le NOM apparaît : sans cette
       dépendance, `placer` mesurait une étiquette VIDE (14 px), concluait
       « il y a la place », et le nom débordait ensuite de 64 px sans que rien
       ne le reprenne. ⭐ Une mesure prise avant que la chose mesurée existe
       est une mesure fausse qui a l'air juste. */
    expect(carte, "la bascule ne se recalcule pas quand le nom apparaît")
      .toMatch(/\[carte, point\.lat, point\.lon, libelle\]/);
  });
});

describe("🔴 7/11/2026 — quatre réparations sous la carte, et la distance remontée", () => {
  const compo = readFileSync(new URL("./Composer.tsx", import.meta.url), "utf8");
  const nu = compo.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  const carte = readFileSync(new URL("./CarteReelle.tsx", import.meta.url), "utf8");

  /* 🔴 LE GARDE QUI CORRIGE MA PROPRE ERREUR DE DIAGNOSTIC. J'avais conclu
     que la note SRTM expliquait un dénivelé « jamais affiché », et proposé de
     la SUPPRIMER — après avoir regardé UNE promenade, plate. Le seuil des
     40 m était à quatre lignes de là. La note n'était pas inutile : elle
     s'affichait SANS CONDITION pour un chiffre CONDITIONNEL.
     ⭐ Une mesure sur un seul cas ne dit rien d'un affichage conditionnel —
        c'est le régime qu'on ne regarde pas qui porte le défaut.
     ➜ On ne vérifie donc PAS un échantillon, qui mentirait de la même façon :
       on exige que le chiffre et sa note dépendent de la MÊME constante
       nommée. Une valeur qui commande deux affichages doit avoir un nom,
       sinon le second oublie le premier. */
  it("⛔ la note sur le dénivelé suit le dénivelé, et par la même constante", () => {
    expect(nu, "le seuil n'est pas nommé").toMatch(/const MONTEE_DITE_M =/);
    const gardes = nu.match(/b\.montee >= [A-Za-z0-9_]+/g) ?? [];
    expect(gardes.length, "le dénivelé ou sa note n'est plus conditionné").toBe(2);
    expect(new Set(gardes).size, `deux seuils différents : ${gardes.join(" / ")}`).toBe(1);
    expect(gardes[0], "un seuil écrit en dur est revenu").toMatch(/MONTEE_DITE_M/);
  });

  /* ⛔ « calculé en N ms » était de la fierté d'ingénieur : personne ne décide
     rien avec ce chiffre, et il occupait la fin d'une ligne qu'on lit pour
     savoir ce qu'on va voir. ⚠️ La mesure reste CALCULÉE — elle sert au banc ;
     ce qui part est son affichage. */
  it("⛔ la durée de calcul ne s'affiche plus", () => {
    expect(nu).not.toMatch(/calculé en/);
    expect(nu, "la mesure elle-même a disparu avec son affichage").toMatch(/duree/);
  });

  /* ⛔ Le décompte des lieux est sur la carte (« 2 lieux · Fortification ») ;
     le redire sous elle était une ligne de plus à lire.
     ⚠️ La phrase du cas VIDE reste : elle ne redit rien, elle dit le
        contraire — et c'est précisément le cas où l'on se demande si le
        calcul a échoué. */
  it("⛔ le décompte des lieux ne se redit pas sous la carte", () => {
    expect(nu).not.toMatch(/lieux? croisés?/);
    expect(nu, "le cas vide ne se dit plus").toMatch(/Aucun lieu remarquable/);
  });

  /* 🔴 UN ÉLÉMENT DE LISTE VIDE N'EST PAS DISCRET, IL EST MUET. Deux arrivées
     sur trois ne portent pas leur nom à l'écran — elles se recouvriraient —
     et leur `<li>` ne contenait plus que des pastilles sans texte. Un `title`
     ne se lit ni au clavier ni au lecteur d'écran.
     ⭐ Masquer un libellé à l'ŒIL ne doit pas le retirer à tout le monde. */
  it("⛔ un repère sans nom visible porte quand même son nom", () => {
    expect(carte).toMatch(/aria-label=\{libelle \? undefined : titre\}/);
  });

  /* 🔴 LA DISTANCE ÉTAIT PASSÉE SOUS LA LIGNE DE FLOTTAISON en même temps que
     les pastilles. Il fallait faire défiler pour savoir combien on marche —
     sur l'écran dont c'est la question.
     ⭐ Désencombrer une carte ne veut pas dire en retirer ce qu'on vient y
        chercher. Le coût que j'avais annoncé était réel ; il était trop
        élevé. */
  it("la distance se lit SUR la carte", () => {
    const ligne = nu.match(/cp-choix-detail[\s\S]{0,400}/)?.[0] ?? "";
    expect(ligne, "la ligne de faits de la carte est introuvable").not.toBe("");
    expect(ligne, "la distance n'est pas sur la carte").toMatch(/km\(prop\.metres\)/);
  });
});
