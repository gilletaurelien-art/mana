import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { ajouterAuCarnet, lireCarnet, viderCarnet } from "./carnet";

const ecran = readFileSync(new URL("./SwipeBalades.tsx", import.meta.url), "utf8");
/** ⚠️ Les commentaires d'abord : une consigne EXPLIQUÉE dans un commentaire
 *  répondrait à la place du code — le piège du `grep guardedAnswer`. */
const code = ecran
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");

describe("le jeu de cartes des balades", () => {
  /**
   * ⛔ LA MENTION N'EST PAS UN CRÉDIT, C'EST LA LIGNE QUI SÉPARE UN CIRCUIT
   *    BALISÉ SUR LE TERRAIN D'UN ITINÉRAIRE COMPOSÉ PAR NOUS. Un jeu de
   *    cartes invite à garder vite ; c'est exactement là qu'une balade
   *    changerait d'auteur sans que personne ne le décide.
   */
  it("chaque carte porte la provenance de l'Office de tourisme", () => {
    expect(code).toMatch(/Itinéraire balisé par l[’']Office de tourisme/);
  });

  /** ⛔ Pas d'étoile, pas de note, pas de « recommandé » : MANA ne classe pas
   *  les circuits d'un tiers. */
  it("n'invente aucun classement", () => {
    expect(code).not.toMatch(/recommand|coup de c(œ|oe)ur|note|étoile|★/i);
  });

  /**
   * ⚠️ CE QUI EST ÉCARTÉ NE SE STOCKE NULLE PART. Mémoriser les refus
   *    reviendrait à tenir un profil de goût — un jeu de données personnelles
   *    qu'on s'interdit, et qui n'a pas de porte de sortie une fois écrit.
   *    Le carnet (`mana.carnet.v1`) est la SEULE clé que cet écran écrit.
   */
  it("n'écrit aucune autre clé que le carnet", () => {
    const clefs = [...ecran.matchAll(/localStorage\.\w+\(\s*["'`]([^"'`]+)/g)].map((m) => m[1]);
    expect(clefs.filter((c) => c !== "mana.carnet.v1")).toEqual([]);
    // ⚠️ Et l'écran n'écrit pas en direct : il passe par `carnet.ts`, seul
    //    endroit où la clé est nommée et le `try` posé.
    expect(code).not.toMatch(/localStorage\.setItem/);
  });

  /**
   * ⛔ L'ATTRIBUTION ODbL VOYAGE AVEC LA CARTE, PAS SEULEMENT AVEC LA PAGE.
   *    `attributionControl: false` la retire de maplibre — c'est alors à
   *    l'écran de la porter, sur CHAQUE carte où le fond s'affiche. Une
   *    mention posée une fois en pied de site ne couvre pas un jeu où chaque
   *    carte est une vue cartographique à elle seule.
   */
  it("chaque carte porte l'attribution du fond", () => {
    expect(code).toMatch(/ATTRIBUTION_OSM/);
    const fond = readFileSync(new URL("./carte-fond.ts", import.meta.url), "utf8");
    expect(fond).toMatch(/OpenStreetMap/);
    expect(fond).toMatch(/ODbL/);
  });

  /**
   * 🔴 LE FOND NE SE DÉCLARE PAS PRÊT SUR LA FOI DE L'ÉTAT INTERNE.
   *    `areTilesLoaded()` a dit OUI alors qu'aucune tuile n'était arrivée —
   *    il répond « plus rien en attente », ce qui est vrai aussi quand tout a
   *    échoué. Le seul signal qui porte sur ce qu'on VOIT est
   *    `queryRenderedFeatures()`.
   */
  it("le fond OSM ne se montre que s'il a vraiment peint", () => {
    const carte = readFileSync(new URL("./CarteFondOT.tsx", import.meta.url), "utf8");
    expect(carte).toMatch(/queryRenderedFeatures\(\)\.length > 0/);
    expect(carte).toMatch(/interactive: false/);
    // ⚠️ Et le contexte WebGL se libère, sinon 46 glissements saturent le
    //    plafond du navigateur et les dernières cartes restent blanches.
    expect(carte).toMatch(/m\.remove\(\)/);
  });

  /**
   * ⛔ CE QU'ON NE PROMET PAS. L'écran de marche guidée n'existe que pour les
   *    itinéraires MANA, qui portent des étapes ; un circuit de l'Office n'en
   *    a pas. ⭐ Une promesse d'interface qu'on ne peut pas tenir se
   *    reformule, elle ne se dessine pas en espérant que personne n'appuie
   *    dessus — la même règle que « Mes promenades » sans compte.
   */
  it("ne promet pas de lancer une balade qu'on ne sait pas guider", () => {
    expect(code).not.toMatch(/Lancer la balade/i);
  });

  /**
   * ⛔ AUCUNE PHOTOGRAPHIE, AUCUNE PROSE DE L'OFFICE. Nous n'avons pas
   *    d'images de ces circuits ; celles de l'Office ne portent aucune
   *    licence, et leur texte « À propos » est à eux. Les FAITS qu'ils
   *    déclarent se citent, leur rédaction non — et l'accord n'est pas signé.
   */
  it("n'emprunte ni photographie ni rédaction à l'Office", () => {
    const art = readFileSync(new URL("./ot.json", import.meta.url), "utf8");
    const j = JSON.parse(art) as { itineraires: Record<string, unknown>[] };
    const champs = new Set(j.itineraires.flatMap((w) => Object.keys(w)));
    for (const interdit of ["photo", "photos", "image", "images", "apropos", "a_propos", "description", "texte"]) {
      expect([...champs], `« ${interdit} » dans src/ot.json`).not.toContain(interdit);
    }
  });

  /** ⛔ « À proximité » n'est pas « sur le chemin » : le seuil est DIT. */
  it("dit le seuil quand il cite des sites proches", () => {
    expect(code).toMatch(/SEUIL_PROCHES/);
    expect(code).toMatch(/À moins de/);
  });

  /** ⭐ Un jeu de cartes qui ne répond qu'au doigt n'existe pas pour qui
   *  navigue au clavier. Les flèches tranchent, et trois boutons doublent. */
  it("se joue aussi au clavier", () => {
    expect(code).toMatch(/ArrowRight/);
    expect(code).toMatch(/ArrowLeft/);
  });

  /** ⚠️ Sans capture du pointeur, un doigt qui sort de la carte laisse
   *  celle-ci figée en travers de l'écran. C'est la panne n°1 des piles
   *  faites main, et elle ne se voit jamais à la souris sur un grand écran. */
  it("capture le pointeur pendant le geste", () => {
    expect(code).toMatch(/setPointerCapture/);
  });
});

/**
 * ⚠️ LA SUITE TOURNE SANS NAVIGATEUR — pas de jsdom dans ce dépôt. On pose
 *    donc un `localStorage` en mémoire. Ce n'est pas une fixture qui répond à
 *    la place du code : c'est le SUPPORT, et la logique testée reste celle de
 *    `carnet.ts`. Le cas où l'accès LÈVE (Safari privé) est tenu par le `try`
 *    du module, et se vérifie en retirant ce support — ce que fait le dernier
 *    test de ce bloc.
 */
function poserStockage() {
  const m = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
      removeItem: (k: string) => void m.delete(k),
    },
  });
}

describe("le carnet, vu du jeu", () => {
  beforeEach(() => { poserStockage(); viderCarnet(); });

  /** 🔴 `basculerCarnet` serait faux ici : revoir une balade déjà gardée la
   *  RETIRERAIT au moment où la personne croit l'y remettre. */
  it("garder deux fois la même balade ne la retire pas", () => {
    ajouterAuCarnet("le-saut-du-loup");
    ajouterAuCarnet("le-saut-du-loup");
    expect(lireCarnet()).toEqual(["le-saut-du-loup"]);
  });

  it("l'ordre des balades gardées est celui du geste", () => {
    ajouterAuCarnet("a"); ajouterAuCarnet("b"); ajouterAuCarnet("a");
    expect(lireCarnet()).toEqual(["a", "b"]);
  });

  /** 🔴 Sans le `try`, l'écran entier disparaîtrait chez une partie des
   *  visiteurs — et jamais chez nous. On retire le support pour le voir. */
  it("un stockage qui LÈVE ne casse rien", () => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() { throw new Error("accès refusé"); },
    });
    expect(() => lireCarnet()).not.toThrow();
    expect(lireCarnet()).toEqual([]);
    expect(() => ajouterAuCarnet("x")).not.toThrow();
  });
});
