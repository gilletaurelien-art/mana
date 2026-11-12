import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { MOT_CLEF_OFFICE } from "./ot";
import recueil from "./ot.json";

/* ⚠️ LES COMMENTAIRES SONT RETIRÉS AVANT TOUTE LECTURE DE RÈGLE. Celui qui
   explique la correction ci-dessous CITE `.ot-item` et `color: var(--bulle-`
   pour dire pourquoi on ne les emploie plus : un garde posé sur le texte brut
   se serait accusé lui-même. C'est le piège du `grep` de `guardedAnswer` au
   tronc, où quatre fichiers parlent du garde pour expliquer qu'ils n'en ont
   pas besoin. */
const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "");
const ecran = readFileSync(new URL("./BaladesOT.tsx", import.meta.url), "utf8")
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

/* La même arithmétique que `charte.test.ts` — dix lignes de WCAG, recopiées
   plutôt qu'exportées : c'est une formule, pas une décision. Une formule ne
   vieillit pas ; une table de couleurs, si — et celles-ci sont LUES dans
   `tokens.css`, jamais écrites ici. */
const lum = (hex: string) => {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};
const ratio = (a: string, b: string) => {
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const jeton = (nom: string) => {
  const m = readFileSync(new URL("./tokens.css", import.meta.url), "utf8")
    .match(new RegExp(`--${nom}:\\s*(#[0-9a-f]{6})`, "i"));
  expect(m, `le jeton --${nom}`).not.toBeNull();
  return m![1];
};

/**
 * 🔴 CE FICHIER NAÎT D'UNE CAPTURE D'ÉCRAN — 12/11/2026 : « afficher les
 *    libellés de chaque circuit en vert kaki car là ils sont illisibles ».
 *
 * ⛔ ET « ILLISIBLE » ÉTAIT UNE MESURE, PAS UNE IMPRESSION. La ligne de faits
 *    rendait de la craie (`#e9e7d8`) sur un panneau blanc à 55 % : 1,24 pour
 *    1. Le survol du titre rendait `--bulle-action` : 1,26 — c'est l'entrée
 *    pâle qu'on voit sur la capture, et ce n'était pas un défaut
 *    d'affichage, c'était la souris posée dessus.
 * ⭐ LA CAUSE EST TOUJOURS LA MÊME DANS CE DÉPÔT : un jeton nommé pour le
 *    verre SOMBRE des bulles, employé là où le fond est CLAIR. La feuille
 *    l'écrit déjà deux fois — « le ton ne se choisit pas au composant mais
 *    au FOND ». Ce test le tient au lieu de l'écrire une troisième fois.
 */
describe("les balades des Offices — la liste se lit", () => {
  it("⛔ les deux couleurs de la liste tiennent 4,5 sur un panneau clair", () => {
    /* ⚠️ LE PIRE CAS EST LE BLANC. Le panneau est blanc à 55 % posé sur
       l'ivoire : sa couleur composite est entre les deux, donc toujours plus
       sombre que le blanc pur. Mesurer contre le blanc, c'est mesurer contre
       le fond le plus défavorable — si ça passe là, ça passe partout. */
    const blanc = "#ffffff";
    expect(ratio(jeton("kaki"), blanc), "la ligne de faits").toBeGreaterThanOrEqual(4.5);
    expect(ratio(jeton("ocre-sombre"), blanc), "le titre au survol").toBeGreaterThanOrEqual(4.5);
    /* ⛔ ET LES DEUX COUPABLES RESTENT NOMMÉS. S'ils repassaient un jour le
       seuil, ce test deviendrait faux et il faudrait le RELIRE plutôt que de
       le supprimer — c'est la règle de ce dépôt pour les tests retournés. */
    expect(ratio(jeton("bulle-action"), blanc), "--bulle-action est redevenu lisible ici")
      .toBeLessThan(4.5);
  });

  it("⛔ aucune règle de la liste ne reprend un jeton de bulle comme COULEUR", () => {
    /* ⚠️ `color:` seulement — une bordure ou un fond empruntés au verre des
       bulles restent légitimes ; aucun seuil de lisibilité ne s'y applique.
       Un garde qui ne distingue pas la propriété condamne le bon geste avec
       le mauvais (leçon de `charte.test.ts`, même piège). */
    const regles = css.split("}")
      .filter((r) => /\.ot-item/.test(r.split("{")[0] ?? ""))
      .filter((r) => /(^|[^-\w])color:\s*var\(--bulle-/.test(r))
      .map((r) => r.split("{")[0].trim());
    expect(regles, `règles fautives : ${regles.join(" / ")}`).toEqual([]);
  });

  it("⭐ les pays proposés sont DÉRIVÉS de l'artefact, pas écrits dans l'écran", () => {
    /* 🔴 Le recueil est passé d'un office à trois puis à cinq en huit jours.
       Une liste recopiée dans cet écran aurait vieilli à chaque ajout, sans
       bruit — c'est le faux témoin que ce dépôt traque partout. */
    expect(ecran, "l'écran ne lit pas la table des offices").toMatch(/r\.offices/);
    for (const clef of Object.keys(MOT_CLEF_OFFICE)) {
      expect(ecran, `« ${clef} » est écrit en dur dans l'écran`)
        .not.toMatch(new RegExp(`["'\`]${clef}["'\`]`));
    }
  });

  it("⚠️ chaque office du recueil a au moins un circuit", () => {
    /* ⭐ C'est la PRÉMISSE du filtre : on ne propose que les pays qui ont des
       circuits, parce qu'un bouton qui rend une liste vide est un cul-de-sac
       — il a l'air de marcher et ne mène nulle part. Si cette prémisse
       devenait fausse, le filtre se tairait sur un office en silence, et
       c'est ici qu'on veut l'apprendre. */
    const r = recueil as unknown as {
      offices: { ot: string; nom: string }[];
      itineraires: { ot: string }[];
    };
    for (const o of r.offices) {
      const n = r.itineraires.filter((i) => i.ot === o.ot).length;
      expect(n, `« ${o.nom} » n'a aucun circuit dans le recueil`).toBeGreaterThan(0);
    }
    /* ⛔ Et chaque office porte son mot court, sinon la pastille affiche un
       nom d'office entier et la rangée de filtres déborde. */
    for (const o of r.offices) {
      expect(MOT_CLEF_OFFICE[o.ot], `« ${o.ot} » n'a pas de mot court`).toBeTruthy();
    }
  });

  it("⛔ un croisement vide se DIT, il ne se laisse pas lire comme une panne", () => {
    /* « VTT » + « Abers » rend zéro circuit. Sans phrase, la liste disparaît
       et l'écran ressemble à un chargement qui n'a pas abouti — mesuré à
       l'écran avant d'écrire ce garde. */
    expect(ecran).toMatch(/visibles\.length === 0/);
    expect(ecran).toMatch(/Aucun circuit ne réunit ces deux choix/);
  });

  it("⚠️ l'étiquette dit ce qu'on VOIT, l'en-tête dit ce qu'il Y A", () => {
    /* ⭐ Deux nombres qui disent deux choses différentes, et chacun le dit.
       L'étiquette annonçait « Tous les circuits » quoi qu'on ait filtré ;
       avec deux filtres au lieu d'un, le décalage serait devenu la règle. */
    expect(ecran, "l'étiquette ne suit pas la vue").toMatch(/visibles\.length\} circuit/);
    expect(ecran, "l'en-tête ne dit plus le total").toMatch(/\{ot\.length\} circuit/);
    expect(ecran, "l'étiquette fige encore « Tous les circuits »")
      .not.toContain("Tous les circuits");
  });
});
