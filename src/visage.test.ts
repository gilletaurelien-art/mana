import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { ROUTES_APP, ROUTES_LOVE, ROUTE_OFFICE, ROUTES_HORS_LOVE } from "./routes";
import { visage, avecOffice, signature, courriel, titrePourLHote, canonique, poserCanonique } from "./visage";
import { entreesBarre } from "./barre";

const lire = (f: string) => readFileSync(new URL(f, import.meta.url), "utf8");
const nu = (f: string) =>
  lire(f).replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * 🔴 UNE SEULE APP, DEUX HÔTES — décision d'Aurélien, 7/11/2026. mana.bzh est
 * « une version ultra light de mana.love », avec une fonction EN PLUS : les
 * balades de l'Office de tourisme.
 * ⭐ L'alternative — porter la carte dans un second dépôt — a été écartée pour
 *    une raison mesurée : ce dépôt a déjà payé deux codes faisant le même
 *    travail, et les plages du monde sont restées à 5 % pendant seize jours
 *    parce que rien ne les confrontait.
 */
/* ⭐ HISSÉ AU MODULE : deux blocs en ont besoin, et une copie locale
   aurait divergé. */
const surLHote = <T,>(hote: string, faire: () => T): T => {
  const avant = Object.getOwnPropertyDescriptor(globalThis, "location");
  Object.defineProperty(globalThis, "location", {
    value: new URL(`https://${hote}/promenades`), configurable: true, writable: true });
  try { return faire(); }
  finally {
    if (avant) Object.defineProperty(globalThis, "location", avant);
    else delete (globalThis as Record<string, unknown>).location;
  }
};

describe("les deux visages — ce qui change, et ce qui ne doit pas", () => {
  /* 🔴 CES DEUX TESTS SONT RETOURNÉS, PAS SUPPRIMÉS — 7/11, l'après-midi.
     Le matin ils exigeaient « love = bzh moins l'Office », et un écart de
     EXACTEMENT UN. Le fondateur a tranché depuis : mana.love est tenu par
     l'application citoyenne, et la nôtre n'y entre que par la carte et les
     promenades. L'écart vaut cinq.
     ⭐ Ce qu'ils gardaient reste vrai sous une forme plus large : la liste
     est DÉRIVÉE, et l'écart est une DÉCISION, pas un effet de bord. */
  it("la liste love est DÉRIVÉE : elle vaut la liste bzh moins les exclusions", () => {
    const exclus = Object.keys(ROUTES_HORS_LOVE);
    expect(ROUTES_LOVE).toEqual(ROUTES_APP.filter((r) => !exclus.includes(r)));
    expect(ROUTES_LOVE).not.toContain(ROUTE_OFFICE);
    expect(ROUTES_APP).toContain(ROUTE_OFFICE);
    /* ⚠️ L'écart suit la liste des exclusions, et rien d'autre. S'il bouge
       sans qu'elle bouge, c'est un ajout de route qui a fui d'un visage. */
    expect(ROUTES_APP.length - ROUTES_LOVE.length).toBe(exclus.length);
  });

  /* ⛔ LA SOUSTRACTION EST LE POINT. Une seconde liste écrite à la main
     divergerait au premier ajout de route, EN SILENCE — exactement ce que
     `routes.ts` existe pour empêcher entre ses trois listes.
     🔴 ET CE TEST EXIGEAIT UN MOYEN, PAS UN EFFET : il cherchait la chaîne
        `ROUTES_LOVE = ROUTES_APP.filter`. Il est donc tombé le jour où la
        dérivation a changé de FORME — en passant par une fonction qui lève
        si une exclusion ne retire rien, c'est-à-dire en devenant MEILLEURE.
     ⭐ Un test qui nomme la ligne qu'il veut lire interdit la bonne solution.
        Celui-ci éprouve désormais la PROPRIÉTÉ : une route inconnue des
        exclusions appartient aux deux visages. */
  it("une route neuve entre dans les DEUX visages par construction", () => {
    const exclus = Object.keys(ROUTES_HORS_LOVE);
    const neuves = ROUTES_APP.filter((r) => !exclus.includes(r as string));
    expect(neuves.length, "plus rien n'est commun aux deux visages").toBeGreaterThan(0);
    for (const r of neuves) {
      expect(ROUTES_LOVE, `${r} n'est pas exclu et manque pourtant à love`).toContain(r);
    }
  });

  /* 🔴 `/chat` N'EST PAS À NOUS. Sur mana.love il tombe dans la coquille,
     servie par manafrance-app. L'inscrire ici ferait revendiquer à cette app
     une adresse qu'elle ne sait pas rendre — un 200 sur une page qu'on n'a
     pas, le pire des désaccords parce qu'il a l'air de marcher. */
  it("⛔ le chat n'entre pas dans les chemins de cette app", () => {
    expect(ROUTES_APP as readonly string[]).not.toContain("/chat");
    expect(ROUTES_LOVE).not.toContain("/chat");
  });

  /* ⭐ Le prédicat se nomme par la CAPACITÉ, pas par le site : le jour où un
     second office rejoint le produit, c'est la liste des territoires qui
     change, pas ce test. */
  it("l'Office se décide par un seul prédicat, nommé par ce qu'il décide", () => {
    const v = nu("./visage.ts");
    expect(v).toMatch(/export const avecOffice/);
    for (const f of ["./App.tsx", "./Territoire2030.tsx", "./LApplication.tsx"]) {
      expect(nu(f), `${f} décide de l'Office sans passer par le prédicat`)
        .toMatch(/avecOffice\(\)/);
    }
    /* ⛔ Et personne ne teste l'hôte à la main ailleurs : un `hostname ===`
       dispersé serait un second prédicat que rien ne confronte au premier. */
    for (const f of ["./App.tsx", "./Territoire2030.tsx", "./LApplication.tsx"]) {
      expect(nu(f), `${f} lit l'hôte directement`).not.toMatch(/hostname\s*===/);
    }
  });

  /* 🔴 CE GARDE EST NÉ D'UNE MUTATION QUI N'A PAS MORDU. J'ai remplacé la
     condition de la colonne 2 par `true` — la colonne de l'Office revenait
     donc sur mana.love — et les 37 tests sont restés VERTS. Les deux gardes
     voisins comptaient la PRÉSENCE des deux branches dans le source, pas le
     fait que le choix entre elles dépende du visage.
     ⭐ Une mutation qui ne mord pas ne dit pas « c'est bon » : elle dit qu'il
        manque un garde. Celui-ci exige que la colonne de l'Office vive À
        L'INTÉRIEUR de la branche `avecOffice()`, et pas à côté. */
  /* 🔴 RETOURNÉ LE JOUR MÊME, ET IL EST NÉ D'UNE MUTATION QUI N'AVAIT PAS
     MORDU : hardcoder la condition de la colonne 2 à `true` laissait 37 tests
     verts. Il exigeait donc que la colonne de l'Office vive À L'INTÉRIEUR de
     la branche `avecOffice()` — en lisant le JSX.
     ⭐ Et c'est précisément cette lecture du texte qui l'a rendu aveugle au
        défaut suivant : la barre, en production sur mana.love, menait cinq
        fois à la même page, et il était vert. Il gardait l'endroit où la
        décision est écrite, pas la décision.
     ⚠️ Ce qu'il protégeait reste entier — « la colonne 2 est COMMANDÉE par le
        visage, pas seulement voisine » — et vit maintenant dans
        `barre.test.ts`, interrogé sur `entreesBarre()`. Ici on garde la part
        que ce fichier est seul à pouvoir dire : le prédicat existe, il est
        nommé par ce qu'il décide, et rien ne décide de l'Office sans lui. */
  it("⛔ rien ne décide de l'Office sans passer par le prédicat", () => {
    const v = nu("./visage.ts");
    expect(v).toMatch(/export const avecOffice/);
    /* ⚠️ `barre.ts` reçoit le visage en ARGUMENT — c'est ce qui le rend pur
       et testable sans navigateur. Il n'a donc pas à appeler le prédicat, et
       l'exiger de lui interdirait exactement la bonne solution. */
    const decideurs = ["./App.tsx"];
    for (const f of decideurs) {
      expect(nu(f), `${f} décide de l'Office sans passer par le prédicat`)
        .toMatch(/avecOffice\(\)/);
    }
  });

  /* ⚠️ ON NE MASQUE PAS, ON NE CHARGE PAS. Masquer le calque coûterait quand
     même les 264 Ko d'`ot.json` à un hôte qui n'a rien à en faire — et
     laisserait un calque vide à oublier quelque part. */
  it("mana.love ne télécharge pas les 264 Ko de l'Office", () => {
    const t = nu("./Territoire2030.tsx");
    const bloc = t.match(/if \(!avecOffice\(\)\)[\s\S]{0,120}?chargerOT/)?.[0] ?? "";
    expect(bloc, "`ot.json` se charge avant qu'on ait regardé le visage").not.toBe("");
  });

  /* ⛔ LE CRÉDIT SUIT LA DONNÉE. Créditer un partenaire dont on ne montre rien
     n'est pas de la rigueur, c'est du bruit — et ça affaiblit la mention là où
     elle compte vraiment. */
  it("le crédit des Offices ne survit pas à sa matière", () => {
    /* 🔄 `m.source` → `m.sources` le 12/11/2026 : le bloc en crédite CINQ
       depuis l'ajout d'Iroise et de Landerneau-Daoulas, et le champ est passé
       au pluriel. ⭐ Ce garde cherchait l'expression EXACTE — il est donc
       tombé sur un renommage juste, ce qui est le comportement voulu : c'est
       ainsi qu'il tient la règle plutôt que de la décrire. Son intention est
       inchangée — la section part entièrement sur mana.love, parce qu'on n'y
       montre pas la matière des Offices. */
    const l = nu("./LApplication.tsx");
    expect(l).toMatch(/MODULES\.filter\(\(m\) => office \|\| !m\.sources\)/);
  });
});

/* ════════════════════════════════════════════════════════════════════════
   🔴 LE GARDE QUI AURAIT VU LE COURRIEL — posé après coup, le 7/11 au soir
   ════════════════════════════════════════════════════════════════════════
   `mailto:contact@mana.bzh` s'affichait sur `mana.love/promenades`. Je l'avais
   même « analysé » : j'ai écrit un `courriel()`, puis je l'ai RETIRÉ en
   expliquant que `/contact` n'était pas servi sur mana.love — donc que
   l'écran y était inatteignable.
   ⛔ Vrai de la ROUTE, faux du RENDU : `ContactForm` n'est pas une page, c'est
      un bloc DU PIED, présent partout. ⭐ Vérifier qu'une route n'existe pas
      ne dit rien de ce qui est rendu — et c'est une capture d'écran en ligne
      qui me l'a appris, après un déploiement.
   ⚠️ Ce garde liste les composants rendus sur LES DEUX hôtes et refuse qu'un
      nom de domaine y soit écrit en dur. Il ne lit pas les commentaires :
      ceux-ci parlent abondamment des deux domaines, et c'est leur rôle.
*/
describe("🔴 rien de ce qui est RENDU sur les deux hôtes ne nomme un domaine en dur", () => {
  /* ⚠️ Le pied et ses blocs : ce qui apparaît sur chaque écran. Un fichier
     qui rejoint le pied rejoint cette liste — et s'il l'oublie, c'est le
     prochain relevé en ligne qui le dira, comme cette fois. */
  const RENDUS_PARTOUT = ["./ContactForm.tsx", "./barre.ts"];

  /* ⚠️ `nu()` ne retire que les blocs `/* *\/` — PAS les lignes `//`. Ce
     garde a crié à faux dès sa première exécution, sur l'en-tête de
     `ContactForm` qui explique justement pourquoi le domaine ne doit plus y
     être écrit. ⭐ C'est le piège inverse de celui qu'il traque, et ce dépôt
     le connaît : une recherche qui compte les COMMENTAIRES ment dans l'autre
     sens, et un garde qui crie à faux finit par être désarmé. */
  const sansCommentaire = (f: string) =>
    nu(f).split("\n").filter((l) => !/^\s*(\/\/|\*)/.test(l)).join("\n");

  for (const f of RENDUS_PARTOUT) {
    it(`${f} prend sa signature de l'hôte`, () => {
      expect(sansCommentaire(f), `${f} écrit un domaine en dur`)
        /* ⚠️ INSENSIBLE À LA CASSE, et c'est une mutation qui l'a exigé :
           remplacer `{signature()}` par « MANA.bzh » passait le garde, parce
           que le motif cherchait « mana. » en minuscules. Le domaine s'écrit
           des DEUX façons dans ce dépôt — « MANA.bzh » comme marque dans les
           textes, « mana.bzh » comme adresse. Un garde qui n'en connaît
           qu'une n'en garde qu'une. */
        .not.toMatch(/mana\.(bzh|love)/i);
    });
  }

  /* ⛔ ET LE PRÉDICAT DOIT RENDRE DEUX VALEURS DIFFÉRENTES. Une signature qui
     rendrait la même chose des deux côtés passerait le garde ci-dessus en
     n'ayant rien réparé — le domaine serait simplement caché dans une
     fonction. */
  /* ════════════════════════════════════════════════════════════════════
     🔴 CES GARDES APPELLENT LES FONCTIONS. LES PRÉCÉDENTS LISAIENT LE TEXTE.
     ════════════════════════════════════════════════════════════════════
     Une relecture adversariale a muté, dans `visage.ts`, l'ÉCHANGE des deux
     branches : mana.love signait « MANA.bzh » et écrivait à `contact@mana.bzh`
     — et les gardes restaient VERTS, parce qu'ils vérifiaient que les deux
     valeurs sont PRÉSENTES dans le fichier, jamais laquelle répond à quel
     hôte. C'est la troisième fois de la journée que le même trou apparaît :
     ⭐ un garde qui lit un fichier ne dit rien de ce que le code DÉCIDE.
     ⚠️ `visage()` lit `location`. On la remplace donc par une vraie `URL` le
        temps du test — c'est ce que fait le navigateur, en plus petit. */


  it("⛔ chaque hôte reçoit SA signature, et pas celle de l'autre", () => {
    expect(surLHote("mana.bzh", signature)).toBe("MANA.bzh");
    expect(surLHote("mana.love", signature)).toBe("mana.love");
  });

  /* 🔴 L'ADRESSE EXACTE, PAS UN GABARIT — Aurélien, 7/11 : « pour le mail
     c'est welcome@mana.love ». J'avais écrit `contact@mana.love` par
     transposition : changer le domaine, garder la boîte.
     ⭐ Une adresse électronique n'est pas dérivable de son domaine. La partie
        gauche est un choix éditorial ; `contact@` aurait eu l'air juste et
        désigné une boîte qui n'existe pas — le courrier parti nulle part,
        sans rebond visible pour nous. */
  it("⛔ chaque hôte reçoit SON adresse, à la lettre", () => {
    expect(surLHote("mana.bzh", courriel)).toBe("contact@mana.bzh");
    expect(surLHote("mana.love", courriel)).toBe("welcome@mana.love");
  });

  /* ⛔ ET LE TITRE EST SIGNÉ PAR L'HÔTE. Ce geste n'avait qu'un seul point de
     pose, dans un effet d'`App.tsx`, et il n'était gardé par rien : retirer
     le point d'échappement de la recherche laissait tous les tests verts et
     rendait « — MANA.bzh » à mana.love. */
  it("⛔ le titre d'une page porte la signature de l'hôte qui la sert", () => {
    const t = "Composer une promenade — presqu'île de Crozon — MANA.bzh";
    expect(surLHote("mana.bzh", () => titrePourLHote(t))).toContain("MANA.bzh");
    const love = surLHote("mana.love", () => titrePourLHote(t));
    expect(love, "mana.love signe encore du nom de l'autre site").not.toMatch(/MANA\.bzh/i);
    expect(love).toContain("mana.love");
    /* ⚠️ Et le SUJET du titre ne doit pas être abîmé au passage : une
       substitution trop large signerait juste et dirait n'importe quoi. */
    expect(love).toContain("Composer une promenade");

    /* 🔴 ET LE TROISIÈME HÔTE — 14/11/2026, l'app promue à la racine de
       manahome.org. `visage()` y rend « bzh » À RAISON (les balades d'office
       y ont leur place) : c'est `signature()` qui devait cesser de s'en
       déduire. ⭐ Deux questions différentes partageaient un test d'hôte, et
       tant qu'il n'y avait que deux hôtes la même réponse servait aux deux.
       Au troisième, le nom d'un site est passé sur un autre. */
    const home = surLHote("manahome.org", () => titrePourLHote(t));
    expect(home, "manahome signe encore du nom de mana.bzh").not.toMatch(/MANA\.bzh/i);
    expect(home).toContain("MANAhome");
    expect(home).toContain("Composer une promenade");
  });

  it("⛔ le LIEU du titre suit l'hôte, pas seulement sa signature", () => {
    /* ⚠️ Un titre qui dit « en Bretagne » sur un site qui publie le Mullerthal
       décrit l'ancien produit. Sur mana.bzh il reste juste — et il porte le
       référencement, donc on ne le retire pas là-bas. */
    const t = "MANA.bzh — Promenades & découvertes en Bretagne";
    expect(surLHote("mana.bzh", () => titrePourLHote(t))).toContain("en Bretagne");
    expect(surLHote("manahome.org", () => titrePourLHote(t)),
      "manahome annonce encore la Bretagne").not.toMatch(/en Bretagne/);

    const u = "La carte du territoire — presqu'île de Crozon & Aulne maritime — MANA.bzh";
    expect(surLHote("mana.bzh", () => titrePourLHote(u))).toContain("presqu'île de Crozon");
    expect(surLHote("manahome.org", () => titrePourLHote(u)),
      "manahome nomme deux territoires bretons sur trois").not.toMatch(/presqu'île de Crozon/);
    expect(surLHote("manahome.org", () => titrePourLHote(u)),
      "le sujet du titre a été abîmé").toContain("La carte du territoire");
  });

  /* 🔴 ET LE PRÉDICAT DE L'OFFICE : ses deux gardes vérifiaient qu'il EXISTE
     et qu'on l'APPELLE, jamais ce qu'il RÉPOND. L'inverser passait. */
  it("⛔ l'Office répond oui sur mana.bzh et non sur mana.love", () => {
    expect(surLHote("mana.bzh", avecOffice), "l'Office a quitté mana.bzh").toBe(true);
    expect(surLHote("mana.love", avecOffice), "l'Office est apparu sur mana.love").toBe(false);
  });

  /* ⚠️ Et la porte de secours `?visage=love` doit continuer de fonctionner :
     une branche que personne ne peut regarder est une branche que personne
     ne corrige. */
  it("la bascule par paramètre reste praticable hors production", () => {
    const avant = Object.getOwnPropertyDescriptor(globalThis, "location");
    Object.defineProperty(globalThis, "location", {
      value: new URL("https://mana.bzh/promenades?visage=love"),
      configurable: true, writable: true });
    try {
      expect(visage()).toBe("love");
      expect(avecOffice()).toBe(false);
    } finally {
      if (avant) Object.defineProperty(globalThis, "location", avant);
      else delete (globalThis as Record<string, unknown>).location;
    }
  });
});

/* ════════════════════════════════════════════════════════════════════════
   🔴 LA CANONIQUE — LE GARDE QUI MANQUAIT, ET IL MANQUAIT DEPUIS TOUJOURS
   ════════════════════════════════════════════════════════════════════════
   7/11/2026 au soir. Depuis la pose du bloc `@applove` le matin même, cinq
   de nos chemins servent des octets IDENTIQUES sur deux domaines — mesuré,
   4 482 o des deux côtés pour `/promenades`, `/carte`, `/territoire` — et
   cette application n'émettait AUCUNE canonique.

   ⭐ Aucun de mes gardes ne pouvait le voir : ils vérifient QUI SERT QUOI,
      jamais CE QUE LA PAGE DÉCLARE ÊTRE. Nous avons traqué ce défaut toute
      la soirée chez le voisin pendant qu'il vivait ici.
*/
describe("🔴 la canonique : une seule adresse fait foi", () => {
  it("⛔ toujours mana.bzh, quel que soit l'hôte qui sert", () => {
    for (const hote of ["mana.bzh", "mana.love"]) {
      expect(surLHote(hote, () => canonique("/promenades")))
        .toBe("https://mana.bzh/promenades");
    }
  });

  /* ⚠️ Y COMPRIS SUR GITHUB PAGES, troisième adresse de cette application.
     Une démo n'est pas un original — et c'est le cas qu'une règle « l'hôte
     courant fait foi » aurait raté en silence. */
  it("une démo n'est pas un original", () => {
    expect(surLHote("gilletaurelien-art.github.io", () => canonique("/carte")))
      .toBe("https://mana.bzh/carte");
  });

  /* ⛔ ET ELLE COUVRE LES PAGES DYNAMIQUES. C'est la différence avec le
     titre : une fiche de promenade pose son propre titre, mais elle est
     dupliquée sur les deux hôtes exactement comme `/carte`. */
  it("les pages dynamiques aussi — ce sont elles, les plus nombreuses", () => {
    expect(canonique("/promenade/pointe-de-pen-hir"))
      .toBe("https://mana.bzh/promenade/pointe-de-pen-hir");
  });

  it("un chemin sans barre initiale ne produit pas une adresse recollée", () => {
    expect(canonique("carte")).toBe("https://mana.bzh/carte");
  });

  /* ════════════════════════════════════════════════════════════════════
     🔴 ON INTERROGE LA POSE, ON NE LA RELIT PLUS
     ════════════════════════════════════════════════════════════════════
     Trois gardes textuels écrits une heure plus tôt ne mordaient à AUCUNE
     des trois mutations qui comptent. Ils sont remplacés par un faux
     document : on donne un chemin, on regarde ce qui est écrit. */
  const fauxDoc = () => {
    const liens: { rel: string; href: string }[] = [];
    return {
      liens,
      doc: {
        querySelector: (sel: string) =>
          sel.includes("canonical") ? liens.find((l) => l.rel === "canonical") ?? null : null,
        createElement: () => ({ rel: "", href: "" }),
        head: { appendChild: (l: { rel: string; href: string }) => liens.push(l) },
      } as unknown as Document,
    };
  };

  it("⛔ elle pose une balise `canonical`, et une seule", () => {
    const { doc, liens } = fauxDoc();
    poserCanonique(doc, "/carte");
    poserCanonique(doc, "/promenades");
    poserCanonique(doc, "/promenade/pen-hir");
    expect(liens.length, "une balise par navigation, au lieu d'une seule").toBe(1);
    expect(liens[0].rel, "ce n'est plus une canonique").toBe("canonical");
    expect(liens[0].href, "la dernière navigation n'est pas reflétée")
      .toBe("https://mana.bzh/promenade/pen-hir");
  });

  /* ⛔ LE CAS QUI A ÉCHAPPÉ AU GARDE TEXTUEL : une page dynamique, hors de
     la table des titres. Si la pose était glissée sous `if (titre)`, elle
     n'écrirait rien ici — et la fiche serait dupliquée sans canonique. */
  it("⛔ une page dynamique reçoit la sienne, comme les autres", () => {
    const { doc } = fauxDoc();
    expect(poserCanonique(doc, "/promenade/pointe-de-dinan"))
      .toBe("https://mana.bzh/promenade/pointe-de-dinan");
  });

  /* ⚠️ LE SEUL GARDE TEXTUEL QUI RESTE, ET IL EST ASSUMÉ. Le défaut qu'il
     couvre n'est pas DANS la fonction mais dans son APPEL : glisser
     `poserCanonique(document, path)` sous le `if (titre)` priverait de
     canonique toutes les pages dynamiques — les plus nombreuses — et aucun
     test de la fonction ne peut le voir, puisqu'elle n'est alors pas
     appelée. Monter un rendu de `App` entier pour l'éprouver coûterait plus
     que ce qu'il protège.
     ⭐ On garde donc une PLACE, pas une forme : la ligne doit vivre au
        niveau de l'effet. Toute garde ajoutée devant la change. */
  it("⛔ l'appel n'est conditionné par rien, dans l'effet de route", () => {
    const app = lire("./App.tsx");  // ⚠️ `lire` résout depuis src/, pas la racine
    const lignes = app.split("\n").filter((l) => l.includes("poserCanonique(document"));
    expect(lignes.length, "l'appel a disparu ou a été dupliqué").toBe(1);
    expect(lignes[0], "une condition a été posée devant l'appel")
      .toBe("    poserCanonique(document, path);");
  });

  /* ⚠️ ET LE CHEMIN COURANT EST BIEN CELUI QU'ON LUI DONNE — une pose qui
     rendrait toujours la racine passerait tous les tests d'origine. */
  it("elle reflète le chemin, pas seulement l'origine", () => {
    const { doc } = fauxDoc();
    expect(poserCanonique(doc, "/territoire")).toBe("https://mana.bzh/territoire");
    expect(poserCanonique(doc, "/")).toBe("https://mana.bzh/");
  });
});

/* ════════════════════════════════════════════════════════════════════════
   🔴 LE TROISIÈME VISAGE — manahome.org, 14/11/2026
   ════════════════════════════════════════════════════════════════════════ */
describe("🔴 manahome n'est pas la Bretagne par défaut", () => {
  /* ⛔ LE DÉFAUT QUE CES TESTS GARDENT A TOURNÉ EN PRODUCTION. `Visage` ne
     portait que `"bzh" | "love"` et `visage()` rendait `"bzh"` pour TOUT ce
     qui n'était pas mana.love. Relevé sur `manahome.org/carte` le 14/11 : la
     barre du bas proposait « Les balades des Offices de Tourisme », c'est-à-
     dire l'Office de Crozon, à un public mondial.
     ⭐ Et rien ne l'avait signalé — ni le type, ni le typecheck, ni les 571
        tests : un ternaire à deux branches ABSORBE un troisième cas, il ne
        s'en plaint pas. C'est pourquoi ces tests nomment l'hôte. */
  it("⛔ manahome n'a PAS d'Office de tourisme", () => {
    expect(surLHote("manahome.org", () => visage())).toBe("home");
    expect(surLHote("manahome.org", () => avecOffice())).toBe(false);
    // et la Bretagne le garde
    expect(surLHote("mana.bzh", () => avecOffice())).toBe(true);
  });

  it("⛔ et il signe de son propre courriel, pas du nôtre", () => {
    /* 🔴 Ses mentions légales — écrites par l'autre dépôt, vérifiées en ligne
       — déclarent `contact@manahome.org`. L'application y aurait annoncé
       `contact@mana.bzh` : deux adresses d'éditeur contradictoires sur un
       même domaine. Un éditeur faux est une déclaration (LCEN), pas une
       coquille. */
    expect(surLHote("manahome.org", () => courriel())).toBe("contact@manahome.org");
    expect(surLHote("mana.bzh", () => courriel())).toBe("contact@mana.bzh");
    expect(surLHote("mana.love", () => courriel())).toBe("welcome@mana.love");
  });

  it("⚠️ un sous-domaine de manahome est reconnu aussi", () => {
    // Même règle que `signature()` : les laisser diverger ferait un site qui
    // signe « MANAhome » en servant l'Office de Crozon.
    expect(surLHote("www.manahome.org", () => visage())).toBe("home");
    expect(surLHote("manahome.org", () => signature())).toBe("MANAhome");
  });

  it("🔴 la barre de manahome : hébergements, et AUCUNE passerelle mana.love", () => {
    const e = entreesBarre("home");
    const clefs = e.map((x) => x.clef);
    expect(clefs).toContain("hebergements");
    expect(clefs).not.toContain("office");
    /* ⛔ LE PIÈGE QUE CE TEST GARDE VRAIMENT. Avant, la barre testait
       `office = v === "bzh"` et rangeait tout le reste dans la branche de
       mana.love : manahome aurait hérité de SES passerelles — ses déesses,
       sa radio, son compte citoyen, tous pointant vers un autre domaine. */
    expect(clefs, "manahome ne sert pas les passerelles de mana.love")
      .not.toContain("chat");
    expect(clefs).not.toContain("compte");
    // la radio est mondiale (arbitrage d'Aurélien) et reste à NOUS
    const radio = e.find((x) => x.clef === "radio");
    expect(radio?.chemin, "la radio de manahome doit être la nôtre").toBe("/radio");
    // et Réglages reste : il porte le fond de carte et la langue
    expect(clefs).toContain("reglages");
  });

  it("⛔ la Bretagne ne perd rien au passage", () => {
    const clefs = entreesBarre("bzh").map((x) => x.clef);
    expect(clefs).toEqual(["carte", "office", "marque", "radio", "reglages"]);
  });
});
