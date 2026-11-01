/**
 * LA COHÉRENCE DES SURFACES — comptée, pas relue.
 *
 * 🔴 CE DÉSORDRE N'EST NÉ D'AUCUNE DÉCISION. Trois chartes se sont succédé
 *    sur cette feuille, chacune ajoutant sans retirer. Au 31/10/2026, avant
 *    reprise : 96 surfaces, 44 noms de fond, 17 rayons, 17 ombres — dont
 *    douze rayons « organiques » et sept ombres manuscrites qui
 *    appartenaient à la charte bleu nuit, sur un site passé au sable.
 *
 * ⭐ LE TRAITEMENT D'UNE SURFACE DOIT ENCODER SON RÔLE, PAS SON ÂGE. Et
 *    personne ne relit six mille lignes de CSS pour s'en assurer : sans un
 *    test qui COMPTE, la quatrième charte ajoutera sa couche sur les trois
 *    autres, et la session suivante lira les quatre langages comme s'ils
 *    étaient voulus.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const FEUILLES = ["src/styles.css", "src/systeme.css", "src/tokens.css"];
const sansCommentaires = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "");
const css = () => FEUILLES.map((f) => sansCommentaires(readFileSync(f, "utf8"))).join("\n");

describe("la charte des surfaces", () => {
  /**
   * ⚠️ Le motif vise les rayons à QUATRE valeurs différentes — la signature
   *    du blob. `var(--r-l) var(--r-l) 0 0` reste permis : c'est un rayon de
   *    token, appliqué à deux coins, et il dit quelque chose (une feuille qui
   *    monte depuis le bas).
   */
  it("⛔ aucun rayon « organique » — quatre valeurs en pixels différentes", () => {
    const fautifs = css().split("\n")
      .map((l, i) => ({ l: l.trim(), n: i + 1 }))
      .filter((x) => /border-radius:\s*\d+px\s+\d+px\s+\d+px\s+\d+px/.test(x.l))
      .map((x) => `ligne ${x.n} : ${x.l.slice(0, 70)}`);
    expect(fautifs, "utiliser --r-s / --r-m / --r-l / --r-xl / --r-rond").toEqual([]);
  });

  it("⛔ aucune pilule écrite en dur — `--r-rond` existe pour ça", () => {
    expect(css()).not.toMatch(/border-radius:\s*999px/);
  });

  /**
   * ⭐ Le reflet intérieur blanc est le MARQUEUR de l'ancienne charte : il
   *    simule une lumière venue d'en haut sur une surface vernie. Sur la
   *    craie il n'a plus d'objet. Le chercher est plus sûr que de chercher
   *    « une ombre complexe » — un motif de forme, pas de goût.
   */
  it("⛔ aucune ombre ne porte de reflet intérieur blanc (charte bleu nuit)", () => {
    const fautifs = css().split("\n")
      .filter((l) => /inset[^;]*rgb\(255 255 255/.test(l))
      .map((l) => l.trim().slice(0, 70));
    expect(fautifs, "utiliser --ombre-carte (posé) ou --ombre-levee (flottant)").toEqual([]);
  });

  it("🔴 aucune couleur en hexadécimal brut hors des tokens", () => {
    /* ⚠️ On n'inspecte QUE les feuilles de composants : `tokens.css` est
       l'endroit où les hex sont légitimes — c'est leur définition. Trois
       vivaient sur les repères de carte (#2a9d4a, #c0392b, #2f6fdd), sans
       aucun lien avec la charte, sur l'écran censé être notre signature. */
    const composants = ["src/styles.css", "src/systeme.css"]
      .map((f) => sansCommentaires(readFileSync(f, "utf8"))).join("\n");
    const hex = [...composants.matchAll(/(?:color|background|fill|stroke|border-color)[^;:]*:\s*(#[0-9a-f]{3,8})/gi)]
      .map((m) => m[1]);
    // ⚠️ #fff et #000 restent admis dans une ombre ou un voile : ce sont des
    //    neutres purs, pas des couleurs de marque.
    const marque = hex.filter((h) => !/^#(fff|000|ffffff|000000)$/i.test(h));
    expect([...new Set(marque)], "nommer la couleur dans tokens.css").toEqual([]);
  });

  it("⛔ les noms de surface périmés ont disparu", () => {
    /* `--sand` et `--blanc-chaud` nommaient la même intention que
       `--fond-surelevé` et `--craie`. Cinq noms pour trois rôles, c'est
       quatre occasions de diverger. */
    for (const mort of ["--sand", "--blanc-chaud"]) {
      expect(css(), `${mort} est encore employé`).not.toContain(`var(${mort})`);
    }
  });
});

describe("l'écran de composition sur son sol ivoire", () => {
  /* 🔴 UN RÔLE DE JETON S'INVERSE SANS BRUIT QUAND ON CHANGE LA SURFACE.
     `--action` (#94702e) a été descendu pour qu'un BLANC tienne dessus —
     4,55. C'est une couleur de FOND d'action. Posée comme couleur de TEXTE
     sur l'ivoire de `/composer`, elle tombe à 3,80 : sous le seuil, sur
     l'écran qui se lit dehors en plein jour.
     ⭐ Mesuré sur la page déployée, pas déduit du code — et c'est bien la
        mesure qui l'a trouvé : rien dans le CSS ne signalait l'inversion. */
  const css = readFileSync("src/styles.css", "utf8");
  /* ⚠️ HORS COMMENTAIRES — la première version découpait sur « } » et
     attrapait le texte d'un commentaire comme s'il était un sélecteur.
     Septième fois aujourd'hui qu'un commentaire répond à la place du code. */
  const bloc = css.slice(css.indexOf("/composer — L'ÉCRAN DE COMPOSITION"))
    .replace(/\/\*[\s\S]*?\*\//g, "");

  const lum = (h: string) => {
    const n = parseInt(h.slice(1), 16);
    const v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
      .map((x) => { const y = x / 255; return y <= 0.03928 ? y / 12.92 : ((y + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  };
  const ratio = (a: string, b: string) => {
    const x = lum(a), y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };

  /** les jetons, lus dans tokens.css — jamais recopiés ici */
  const jeton = (nom: string) => {
    const m = readFileSync("src/tokens.css", "utf8").match(new RegExp(`--${nom}:\\s*(#[0-9a-f]{6})`, "i"));
    expect(m, `le jeton --${nom}`).not.toBeNull();
    return m![1];
  };

  it("⛔ la couleur de texte posée sur l'ivoire tient le seuil de 4,5", () => {
    const ivoire = jeton("craie");
    expect(ratio(jeton("or-profond"), ivoire)).toBeGreaterThanOrEqual(4.5);
    /* ⚠️ et celle qu'on NE doit pas employer comme texte ici, pour mémoire :
       si elle repassait un jour le seuil, ce test deviendrait faux et il
       faudrait le relire plutôt que de le supprimer. */
    expect(ratio(jeton("action"), ivoire)).toBeLessThan(4.5);
  });

  it("⛔ aucun texte de cet écran n'emploie --action sur l'ivoire", () => {
    /* ⚠️ `color:` ET PAS `border-color:` — le premier motif attrapait les
       deux, et une bordure dorée sur ivoire est parfaitement légitime : ce
       n'est pas du texte, aucun seuil de lisibilité ne s'y applique. Un
       garde qui ne distingue pas la propriété condamne le bon geste avec
       le mauvais. */
    const coupables = bloc.split("}")
      .filter((r) => /(^|[^-\w])color:\s*var\(--action\)/.test(r))
      .map((r) => r.split("{")[0].trim())
      .filter(Boolean);
    expect(coupables, `règles fautives : ${coupables.join(" / ")}`).toEqual([]);
  });
});
