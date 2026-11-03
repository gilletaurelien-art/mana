import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

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

describe("les cinq sections de l'accueil", () => {
  const app = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");

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

    expect(app).toContain(`${ot.itineraires.length} circuits balisés`);
    expect(app).toContain(`${km} km`);
    expect(app).toContain(`${communes.size} communes`);
    expect(app).toContain("1 358 sites");
    expect(lx.lieux.length).toBe(1358);
    expect(app).toContain(`${nommes} portent un nom`);
    expect(app).toContain(`${parCat("Fortification")} fortifications`);
    expect(app).toContain(`${parCat("Plage")} plages`);
    expect(app).toContain(`${parCat("Mégalithe")} mégalithes`);
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
    const net = nu("./App.tsx");
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

  it("dit « Au cœur de la Bretagne », en deux lignes voulues", () => {
    const h1 = src.match(/<h1[^>]*className="inv-titre"[^>]*>([\s\S]*?)<\/h1>/);
    expect(h1, "le h1.inv-titre de l'accueil").not.toBeNull();
    const brut = h1![1];
    expect(brut).toMatch(/<br\s*\/?>/);
    expect(brut.replace(/<br\s*\/?>/g, " ").replace(/\s+/g, " ").trim())
      .toBe("Au cœur de la Bretagne");
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
  it("⛔ « Partir » est l'action principale, et le GPX reste atteignable", () => {
    const principal = compo.match(/className="cp-primaire"[\s\S]{0,220}?<\/button>/g) ?? [];
    const partir = principal.find((x) => /setEnMarche\(true\)/.test(x));
    expect(partir, "aucun bouton principal ne lance la marche").toBeTruthy();

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
