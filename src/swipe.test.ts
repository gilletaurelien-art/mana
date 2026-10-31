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
