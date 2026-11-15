import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { carteEnFond, CARTE_EN_ACCUEIL, CHARTE_SUR_CARTE } from "./fond-du-monde";
import { VISAGES } from "./visage";

/**
 * 🔴 CE QUE CE FICHIER PROTÈGE : « carte plein écran vue satellite sur chaque
 *    page » (Aurélien, 14/11/2026) — sauf là où la carte EST la page.
 *
 * ⭐ ET IL NE RECOPIE PAS LA LISTE DES ÉCRANS-CARTES. C'est tout l'objet du
 *    second bloc : il construit le graphe d'imports de `src/`, trouve tout ce
 *    qui atteint `maplibre-gl`, retrouve dans `App.tsx` la route qui le rend,
 *    et exige que `carteEnFond` dise non. Un septième écran-carte ajouté
 *    demain fera tomber ce test sans que personne n'ait à y penser.
 *
 * ⚠️ TROIS GARDES ONT DÉJÀ LAISSÉ PASSER UN DÉFAUT DE BARRE EN LISANT LE
 *    TEXTE D'`App.tsx` (voir l'en-tête de `barre.ts`). Celui-ci lit aussi le
 *    texte — mais pour en extraire les COUPLES (route, composant), et c'est
 *    la fonction qui est ensuite interrogée, pas le fichier.
 */

const ici = (f: string) => readFileSync(new URL(`./${f}`, import.meta.url), "utf8");
const app = ici("App.tsx");

describe("la politique de fond d'écran de MANAhome", () => {
  it("pose la carte sur les écrans de contenu", () => {
    for (const chemin of ["/", "/reglages", "/radio", "/contact",
                          "/mentions-legales", "/l-application", "/territoire",
                          "/espace", "/promenade/x/en-chemin"]) {
      expect(carteEnFond("home", chemin), chemin).toBe(true);
    }
  });

  it("ne la pose pas sur les écrans qui portent déjà une carte", () => {
    for (const chemin of ["/carte", "/composer", "/promenades", "/hebergements",
                          "/promenade/x", "/promenade/x/complet"]) {
      expect(carteEnFond("home", chemin), chemin).toBe(false);
    }
  });

  /**
   * 🔄 RETOURNÉ LE 15/11/2026 AU SOIR, ET C'EST LE FONDATEUR QUI L'A DÉCIDÉ.
   *    Ce garde disait « ne touche ni mana.bzh ni mana.love » — la consigne
   *    du 14/11, « on ne touche qu'à manahome.org ». Aurélien l'a levée :
   *    « pour le site mana.bzh, tu vas lui offrir la même charte graphique
   *    que manahome.org, à l'identique », sol compris.
   * ⭐ CE QU'IL PROTÉGEAIT N'A PAS DISPARU, IL S'EST RÉDUIT À UN HÔTE. La
   *    règle vivante est : un fond qui déborde sur un site qui ne l'a pas
   *    demandé efface une identité sans un mot. mana.love ne l'a pas demandé.
   * ⛔ On ne supprime donc pas le garde : on lui retire la moitié que le
   *    fondateur a tranchée, et on garde l'autre — qui, elle, tient toujours.
   */
  it("ne touche pas mana.love", () => {
    for (const chemin of ["/", "/reglages", "/territoire", "/carte"]) {
      expect(carteEnFond("love", chemin), `love ${chemin}`).toBe(false);
    }
  });

  it("et s'étend bien à mana.bzh, qui a la même charte depuis le 15/11", () => {
    expect(carteEnFond("bzh", "/")).toBe(true);
    expect(carteEnFond("bzh", "/reglages")).toBe(true);
    /* ⚠️ Les écrans-cartes restent exclus chez lui aussi : une carte derrière
       une carte n'a pas plus de sens en Bretagne qu'ailleurs. */
    expect(carteEnFond("bzh", "/carte")).toBe(false);
    expect(carteEnFond("bzh", "/composer")).toBe(false);
  });

  /* ⭐ LE RÉGIME QU'ON NE REGARDE PAS. `CARTE_EN_ACCUEIL` est baissé ; le jour
     où on le relève, l'accueil rendrait la carte en PLEIN ÉCRAN **et** la
     même carte en fond. Deux contextes WebGL sur la page d'entrée, dont un
     invisible. Le drapeau est donc un ARGUMENT, pour que les deux régimes
     s'éprouvent aujourd'hui. */
  it("laisse l'accueil-carte seul quand le drapeau se relève", () => {
    expect(carteEnFond("home", "/", true)).toBe(false);
    expect(carteEnFond("home", "/", false)).toBe(true);
    expect(carteEnFond("home", "/reglages", true)).toBe(true);
  });

  it("le drapeau par défaut est bien celui du module", () => {
    expect(carteEnFond("home", "/")).toBe(!CARTE_EN_ACCUEIL);
  });

  /* ⭐ L'ENSEMBLE COMMANDE, LA FONCTION SUIT — et il est énuméré, pas nié.
     `v === "love"` accueillait tout visage nouveau sans que personne ne le
     décide ; ici un cinquième visage n'a la carte en fond que si on l'écrit. */
  it("un visage hors de l'ensemble n'a pas la carte pour sol", () => {
    for (const v of VISAGES) {
      expect(carteEnFond(v, "/reglages"), `le visage « ${v} »`)
        .toBe(CHARTE_SUR_CARTE.has(v));
    }
  });
});

/* ═══ LA FEUILLE DE STYLE DIT-ELLE LA MÊME CHOSE ? ════════════════════════
   🔴 LE DÉFAUT DU 15/11/2026 AU SOIR, ET IL ÉTAIT MUET DANS LES DEUX SENS.
      `carteEnFond` répondait OUI pour manafrance.org (test en négatif), la
      feuille de style ÉNUMÉRAIT `bzh` et `home` (test en positif). La carte
      était donc montée, et le sol sable de l'application se peignait
      par-dessus : à l'écran, « il n'y a pas la carte vue satellite », plus la
      charte du logo et des encadrés restée à son état d'avant.
   ⭐ CE GARDE EST LE SEUL ENDROIT OÙ LES DEUX LANGAGES SE PARLENT. Un test
      qui n'interrogerait que la fonction resterait vert avec la feuille
      périmée — c'est précisément ce qui vient d'arriver pendant deux heures.
   ⚠️ Il lit le TEXTE de la feuille, et c'est assumé : une feuille de style ne
      s'interroge pas. Mais il n'en extrait pas une apparence — il en extrait
      les VISAGES NOMMÉS, et c'est la seule chose qu'il compare. */
describe("la charte sur fond de carte nomme les mêmes visages des deux côtés", () => {
  const feuille = ici("styles.css");

  /**
   * 🔴 ET CE GARDE A ÉTÉ ÉCRIT FAUX D'ABORD — validé par MUTATION, pas par
   *    relecture. Première rédaction : il ramassait TOUS les
   *    `[data-visage="…"]` de la feuille en UN ensemble et le comparait à
   *    `CHARTE_SUR_CARTE`. Mutation posée pour l'éprouver : retirer
   *    manafrance d'UNE règle sur cinquante-et-une. Le garde est resté VERT —
   *    les cinquante autres suffisaient à faire apparaître le nom dans
   *    l'ensemble.
   * ⛔ OR C'EST EXACTEMENT LE DÉFAUT À ATTRAPER : une charte appliquée à 50
   *    règles sur 51 ne ressemble pas à une charte absente, elle ressemble à
   *    un détail de mise en page — la forme la plus silencieuse. L'ensemble se
   *    vérifie donc RÈGLE PAR RÈGLE.
   */
  it("chaque règle de la charte nomme EXACTEMENT les visages de l'ensemble", () => {
    const groupes = [...feuille.matchAll(
      /:is\(((?:\s*\[data-visage="[a-z]+"\]\s*,?)+)\)/g)];
    expect(groupes.length, "aucune règle de charte trouvée : le motif a raté sa cible")
      .toBeGreaterThan(40);
    for (const g of groupes) {
      const noms = [...g[1].matchAll(/"([a-z]+)"/g)].map((m) => m[1]).sort();
      expect(noms,
        "une règle de la charte a divergé de `CHARTE_SUR_CARTE` — selon le "
        + "sens, la carte sera montée puis cachée par le sol sable, ou la "
        + "charte posée sur un hôte qui ne l'a pas demandée")
        .toEqual([...CHARTE_SUR_CARTE].sort());
    }
    /* ⛔ ET AUCUN `[data-visage=]` NE VIT HORS DE CES GROUPES. Sans cette
       ligne, une règle écrite en direct — `[data-visage="love"] body { … }` —
       échapperait entièrement au garde : il ne regarde que les `:is()`. */
    const dedans = groupes.reduce(
      (n, g) => n + (g[1].match(/data-visage/g) ?? []).length, 0);
    expect(dedans, "un `[data-visage=]` vit hors d'un groupe `:is()`, non gardé")
      .toBe((feuille.match(/\[data-visage=/g) ?? []).length);
    expect(CHARTE_SUR_CARTE.size).toBeGreaterThan(1);
  });

  /* ⚠️ Et les visages ÉCARTÉS ne doivent apparaître nulle part dans la
     feuille : `[data-visage="love"]` posé par mégarde y donnerait à mana.love
     une charte qui n'est pas la sienne — et personne ne compare deux chartes. */
  it("aucun visage écarté n'est nommé dans la feuille", () => {
    for (const v of VISAGES.filter((x) => !CHARTE_SUR_CARTE.has(x))) {
      expect(feuille.includes(`[data-visage="${v}"]`), `« ${v} » est nommé`)
        .toBe(false);
    }
  });
});

/* ═══ LE GRAPHE D'IMPORTS ══════════════════════════════════════════════════ */

/** Les imports d'un fichier, statiques (`from "./x"`) ET différés (`import("./x")`). */
function voisins(texte: string): string[] {
  const out: string[] = [];
  for (const m of texte.matchAll(/(?:from|import)\s*\(?\s*"(\.\/[^"]+)"/g)) out.push(m[1]);
  return out;
}

/** Les fichiers de `src/` qui atteignent `maplibre-gl`, directement ou non. */
function atteignentMaplibre(): Set<string> {
  const fichiers = readdirSync(new URL(".", import.meta.url))
    .filter((f) => /\.tsx?$/.test(f) && !f.includes(".test."));
  const texte = new Map(fichiers.map((f) => [f, ici(f)]));
  const nom = (ref: string) => {
    const base = ref.replace(/^\.\//, "").replace(/\.(tsx?|js)$/, "");
    return [`${base}.tsx`, `${base}.ts`].find((c) => texte.has(c));
  };
  const atteint = new Set<string>();
  for (const [f, t] of texte) if (/"maplibre-gl"/.test(t)) atteint.add(f);
  /* 🔴 ON NE PROPAGE PAS À TRAVERS `App.tsx`, ET CE N'EST PAS UN ARRANGEMENT —
     mesuré à la première exécution : le garde refusait `/reglages` « parce
     qu'il porte une carte ». `Reglages.tsx` importe `ContenuDuPied` **depuis
     `App.tsx`**, et App importe toutes les cartes du dépôt : le chemin
     existait, la conclusion était fausse.
     ⭐ `App.tsx` est l'AIGUILLAGE, pas un écran : « atteignable en passant par
        le routeur » ne veut rien dire — tout l'est. Un garde qui refuse pour
        un motif inventé est aussi faux qu'un garde qui laisse passer.
     ⚠️ Et c'est aussi ce qui casse le cycle App → Reglages → App. */
  const AIGUILLAGE = "App.tsx";
  /* Remontée jusqu'au point fixe : qui importe un atteignant l'atteint. */
  for (let tour = 0; tour < fichiers.length; tour++) {
    let bouge = false;
    for (const [f, t] of texte) {
      if (atteint.has(f) || f === AIGUILLAGE) continue;
      if (voisins(t).some((v) => { const n = nom(v); return n && atteint.has(n); })) {
        atteint.add(f); bouge = true;
      }
    }
    if (!bouge) break;
  }
  return atteint;
}

/**
 * Les branches du grand ternaire de routage d'`App.tsx` : pour chacune, les
 * routes qu'elle sert et le premier composant qu'elle rend.
 */
function branches(): { routes: string[]; composant: string; condition: string }[] {
  const out: { routes: string[]; composant: string; condition: string }[] = [];
  for (const bloc of app.split(/\n\s*\) : /)) {
    const i = bloc.indexOf(" ? (");
    if (i < 0) continue;
    /* 🔴 LA DERNIÈRE LIGNE SEULEMENT, et c'est une mesure qui l'a imposé. Le
       premier morceau du découpage va du début du fichier jusqu'au premier
       `) : ` : il emporte tout l'en-tête et sa barre de navigation. Pris en
       entier, il attribuait la route `/` au composant `Radio`.
       ⭐ Dans ce fichier, chaque condition de l'aiguillage tient sur UNE
          ligne. On ne lit donc que celle-là — un garde qui ramasse trop
          refuse pour un motif inventé, ce qui coûte autant qu'un garde qui
          laisse passer. */
    const condition = bloc.slice(0, i).split("\n").pop()!;
    /* ⚠️ Le corps commence après `? (` ; on y cherche la première balise de
       composant, en sautant les commentaires de bloc qui l'y précèdent — et
       les ENVELOPPES, qui ne rendent rien par elles-mêmes : sans ça, la
       branche de l'accueil-carte rend « Suspense » et échappe au garde. */
    const corps = bloc.slice(i + 4).replace(/\/\*[\s\S]*?\*\//g, " ");
    const ENVELOPPES = new Set(["Suspense", "Fragment"]);
    const tag = [...corps.matchAll(/<([A-Z][A-Za-z0-9]*)/g)]
      .map((m) => m[1]).find((n) => !ENVELOPPES.has(n));
    if (!tag) continue;
    const routes: string[] = [];
    for (const m of condition.matchAll(/path === "([^"]+)"/g)) routes.push(m[1]);
    for (const m of condition.matchAll(/route([A-Za-z]+)\(path\)/g)) {
      routes.push(ECHANTILLON(m[1]));
    }
    if (routes.length) out.push({ routes, composant: tag, condition });
  }
  return out;
}

/** Un chemin qui satisfait chaque matcher de `router.ts`.
 *  ⛔ Il LÈVE sur un matcher inconnu : un nouveau routeur ne doit pas pouvoir
 *     se glisser hors de ce garde en passant pour « rien à vérifier ». */
function ECHANTILLON(nom: string): string {
  const table: Record<string, string> = {
    Promenade: "/promenade/x",
    EnChemin: "/promenade/x/en-chemin",
    Rencontres: "/promenade/x/rencontres",
    Complet: "/promenade/x/complet",
  };
  const c = table[nom];
  if (!c) throw new Error(`route${nom}() n'a pas d'échantillon — ajoutez-le ici`);
  return c;
}

describe("aucune carte derrière une carte", () => {
  const atteint = atteignentMaplibre();

  it("le graphe trouve bien les cartes (sinon ce garde ne garde rien)", () => {
    /* ⭐ UN GARDE QUI NE TROUVE RIEN PASSE. Ces trois-là sont les composants
       de carte du dépôt ; s'ils cessent d'être trouvés, c'est le graphe qui
       est cassé, pas le code qui est devenu sain. */
    for (const f of ["CarteReelle.tsx", "Composer.tsx", "Hebergements.tsx",
                     "EcranTerritoire.tsx"]) {
      expect(atteint.has(f), f).toBe(true);
    }
  });

  it("chaque écran-carte est exclu du fond satellite", () => {
    const vus: string[] = [];
    for (const { routes, composant, condition } of branches()) {
      /* ⛔ Les branches gardées par `avecOffice()` ne sont servies que sur
         mana.bzh ; sur manahome, ce chemin tombe dans la branche suivante.
         Les compter ici exclurait du fond un écran que manahome ne rend pas. */
      if (condition.includes("avecOffice()")) continue;
      /* `CarteMonde` est la carte de fond elle-même : son emploi plein écran
         est gouverné par `CARTE_EN_ACCUEIL`, éprouvé plus haut. */
      if (composant === "CarteMonde") continue;
      const fichier = [`${composant}.tsx`, `${composant}.ts`].find((c) => atteint.has(c));
      if (!fichier) continue;
      for (const r of routes) {
        vus.push(`${r} → ${composant}`);
        expect(carteEnFond("home", r), `${r} rend ${composant}, qui porte une carte`)
          .toBe(false);
      }
    }
    /* ⚠️ Et on exige d'en avoir VU : un parseur qui ne reconnaît plus le
       ternaire d'`App.tsx` rendrait zéro couple et ce test serait vert. */
    expect(vus.length).toBeGreaterThanOrEqual(4);
  });
});
