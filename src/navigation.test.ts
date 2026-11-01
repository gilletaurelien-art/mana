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
    const lien = carte.match(/\/composer\?vers=[^`]*/);
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
    expect([...compo.matchAll(/b\.lieux/g)].length,
           "b.lieux doit se lire exactement une fois dans l'écran").toBe(1);
    expect(compo, "et cette lecture alimente la fusion commune")
      .toMatch(/fondreRencontres\(\s*\n?\s*b\.lieux/);
    // les trois surfaces lisent le résultat, jamais la source
    for (const surface of ["rencontres.length > 0", "rencontres.map(", "etapes: rencontres"]) {
      expect(compo, `la surface « ${surface} » ne lit pas la fusion`).toContain(surface);
    }
  });

  /* 🔴 LE GARDE QUI COMPTE. `composerVers` rend six états, dont cinq sont des
     refus — et un refus muet ressemble à une absence. Chacun doit avoir son
     texte à l'écran, sinon l'écran reste vide et personne ne sait lequel des
     cinq gestes faire. Ce test compte les états du type et exige qu'ils
     soient TOUS nommés dans l'écran.
     ⭐ Il se met à jour tout seul : ajouter un état au moteur sans lui écrire
        sa phrase fait tomber ce test, et c'est exactement le moment où il
        faut y penser. */
  it("chaque refus du moteur a sa phrase à l'écran", () => {
    const moteur = nu("./composition.ts");
    /* ⚠️ LA FENÊTRE VA JUSQU'À LA DÉCLARATION SUIVANTE, pas jusqu'au premier
       `;` — vécu le 1/11 : en ajoutant un champ au variant `ok`, le `;` de
       ce champ a coupé la fenêtre, le garde n'a plus vu qu'un état, et il a
       crié alors que rien n'avait perdu sa phrase. ⭐ Un garde dont la
       fenêtre se ferme sur un caractère que la cible peut contenir mesure
       la forme du code, pas la règle. */
    const bloc = moteur.match(/export type Visee =([\s\S]*?)\nexport /);
    expect(bloc, "le type Visee").not.toBeNull();
    const etats = [...bloc![1].matchAll(/etat: "([a-z-]+)"/g)].map((m) => m[1]);
    expect(etats.length).toBeGreaterThanOrEqual(5);
    for (const e of etats) {
      if (e === "ok") continue;
      expect(compo, `l'état « ${e} » n'a aucune phrase à l'écran`)
        .toContain(`visee.etat === "${e}"`);
    }
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
  it("⛔ l'écran n'annonce aucune durée de marche", () => {
    /* ⚠️ On vise les FORMATS d'affichage, pas le mot « heure » : il reste
       légitime dans une phrase (« donnez-vous plus de temps »). Ce qui est
       interdit, c'est de RENDRE un nombre d'heures. */
    for (const motif of [/\{heuresDe\(/, /dureeEstimeeH\}/, /\} h\b/, /heure\{/]) {
      expect(compo, `l'écran affiche une durée : ${motif}`).not.toMatch(motif);
    }
    // et la cible du moteur est bien une distance choisie, pas un temps
    expect(compo).toMatch(/const DISTANCES = \[/);
    expect(compo).toMatch(/km \* 1000/);
  });

  /* 🔴 LA RECHERCHE PROPOSAIT « CALVAIRE » COMME POINT DE DÉPART — un nom
     qui EST sa catégorie. Le drapeau `anonyme` du graphe n'est pas posé sur
     ces lieux-là. ⭐ Quand une donnée ne porte pas la distinction qu'on
     cherche, on ne la suppose pas : on en dérive une qu'on peut contrôler —
     ici, l'égalité entre le nom et le libellé de la catégorie. */
  it("⛔ on ne propose pas un lieu dont le nom est sa catégorie", () => {
    expect(compo).toMatch(/plat\(L\.n\) === plat\(LIBELLE\[L\.c\]/);
    expect(compo, "les lieux anonymes restent écartés aussi")
      .toMatch(/if \(L\.anonyme \|\| !L\.n\) continue;/);
  });

  /* ⭐ DEUX CHEMINS VERS LE POINT DE DÉPART, parce que deux situations :
     dehors on est quelque part, chez soi la veille on prépare. Retirer l'un
     des deux ferme la moitié des usages. */
  it("le point de départ se donne par la position OU par un lieu cherché", () => {
    expect(compo).toMatch(/className="cp-depart-ici"[\s\S]{0,120}onClick=\{localiser\}/);
    expect(compo).toMatch(/type="search"/);
    expect(compo).toMatch(/setPosition\(l\.g\)/);
  });
});
