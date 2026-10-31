/**
 * LES POLICES — format, poids, ET COUVERTURE.
 *
 * ⭐ Parce qu'un interdit en commentaire se franchit sans le savoir. Les deux
 *    Rubik ont vécu des mois en TTF à côté d'une MarelleBaton déjà en WOFF2 :
 *    personne n'avait tort, personne n'avait regardé. Le poids est le genre de
 *    défaut qui ne casse rien et ne se signale jamais — il se paie dehors, sur
 *    un réseau pauvre, au premier chargement.
 *
 * 🔴 ET LE SOUS-ENSEMBLE DEMANDE UN GARDE D'UNE AUTRE NATURE. Réduire une
 *    police de 1 075 glyphes à 415 fait gagner 60 % — et un caractère oublié
 *    ne se voit QUE sur le mot qui en a besoin. Un « ñ » manquant ne casse
 *    rien : il affiche un toponyme breton dans une autre police, une fois,
 *    sur une page que personne ne regarde ce jour-là.
 *    La couverture se vérifie donc caractère par caractère, en lisant la table
 *    de correspondance de la police — jamais en regardant sa taille.
 *
 * Mesuré le 31/10/2026, en trois pas :
 *   TTF d'origine .......... 343 Ko (Rubik seules) · 405 Ko les trois
 *   en WOFF2 ............... 172 Ko
 *   sous-ensemblées ........  85 Ko
 * Soit −79 % sur le poste le plus lourd du premier écran — celui que le
 * hors-ligne télécharge en entier.
 *
 * ⚠️ `jeu-caracteres.txt` est VERSIONNÉ, et c'est volontaire : il est bâti à
 *    partir du code, des 339 lieux du graphe de Crozon et des fermetures, or
 *    le graphe n'est pas dans le dépôt. Sans ce fichier, la couverture ne
 *    serait vérifiable que sur la machine qui a fait le sous-ensemble — donc
 *    jamais sur le runner, donc jamais.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import * as fontkit from "fontkit";

const DOSSIER = "src/fonts";
const JEU = `${DOSSIER}/jeu-caracteres.txt`;

/**
 * 🔴 LA LIGNE DE BASE EST PAR POLICE, ET CE N'EST PAS UN DÉTAIL. Première
 *    version : une seule liste, relevée sur Rubik, appliquée aux trois. Le
 *    test a aussitôt accusé MarelleBaton de « perdre » 161 caractères —
 *    qu'elle n'avait jamais portés : c'est une police de titrage au répertoire
 *    plus étroit. ⭐ Encore une mesure faite sur un objet et appliquée à un
 *    autre, le défaut qui revient le plus souvent dans ce dépôt.
 *    Relevé sur les fichiers d'ORIGINE, récupérés de l'historique git.
 */
const ORIGINE: { polices: Record<string, string> } =
  JSON.parse(readFileSync(`${DOSSIER}/couverture-origine.json`, "utf8"));

const jamaisPortes = (fichier: string) => [...(ORIGINE.polices[fichier] ?? "")];

/**
 * ⚠️ `openSync` rend `Font | FontCollection` — une collection n'a pas de table
 *    de correspondance à elle. On restreint au lieu de forcer le type : une
 *    collection ici serait une vraie anomalie (nos trois polices sont des
 *    fichiers simples), et elle doit se dire, pas se taire derrière un `as`.
 */
function ouvrir(chemin: string) {
  const f = fontkit.openSync(chemin);
  if (!("hasGlyphForCodePoint" in f)) {
    throw new Error(`${chemin} est une collection de polices, pas une police`);
  }
  return f;
}

const requis = () => [...new Set([...readFileSync(JEU, "utf8")])]
  .filter((c) => c.trim() !== "");

describe("les polices", () => {
  it("⛔ aucune police en TTF — c'est trois fois le poids du WOFF2", () => {
    expect(readdirSync(DOSSIER).filter((f) => /\.ttf$/i.test(f))).toEqual([]);
  });

  it("la feuille de style ne déclare aucun format « truetype »", () => {
    const css = readFileSync("src/styles.css", "utf8");
    expect(css).not.toContain('format("truetype")');
    expect(css).not.toContain("format('truetype')");
  });

  it("chaque police déclarée existe et porte l'en-tête WOFF2", () => {
    const css = readFileSync("src/styles.css", "utf8");
    const noms = [...css.matchAll(/url\("\.\/fonts\/([^"]+)"\)/g)].map((m) => m[1]);
    expect(noms.length).toBeGreaterThan(0);
    for (const n of noms) {
      // ⚠️ On lit l'EN-TÊTE, pas l'extension : un fichier renommé passerait un
      //    contrôle de nom et s'afficherait en police système, en silence.
      expect(readFileSync(`${DOSSIER}/${n}`).subarray(0, 4).toString("latin1")).toBe("wOF2");
    }
  });

  it("aucune police ne dépasse 48 Ko", () => {
    for (const f of readdirSync(DOSSIER).filter((f) => /\.woff2$/.test(f))) {
      const o = statSync(`${DOSSIER}/${f}`).size;
      expect(o, `${f} pèse ${Math.round(o / 1024)} Ko`).toBeLessThan(48 * 1024);
    }
  });

  it("🔴 CHAQUE caractère utilisé par l'interface et les lieux a son glyphe", () => {
    const car = requis();
    expect(car.length).toBeGreaterThan(200);   // le jeu n'a pas été vidé par accident
    for (const f of readdirSync(DOSSIER).filter((f) => /\.woff2$/.test(f))) {
      const police = ouvrir(`${DOSSIER}/${f}`);
      const jamais = jamaisPortes(f);
      const perdus = car
        .filter((c) => !jamais.includes(c))
        .filter((c) => !police.hasGlyphForCodePoint(c.codePointAt(0)!));
      expect(perdus, `${f} a PERDU « ${perdus.join("")} »`).toEqual([]);
    }
  });

  it("les toponymes bretons du terrain passent — c'est le cas qui casse en silence", () => {
    // Des noms RÉELS du graphe de Crozon, et des formes typographiques du site.
    const epreuve = "La Grève · Motte féodale · Site mégalithique · Grotte de Roméo"
      + " · Île Vierge · Pen-Hir · l'Aber · Rostudel · Kerdreux"
      + " · « guillemets » – tiret – apostrophe’ … €";
    for (const f of readdirSync(DOSSIER).filter((f) => /\.woff2$/.test(f))) {
      const police = ouvrir(`${DOSSIER}/${f}`);
      const jamais = jamaisPortes(f);
      const manquants = [...new Set([...epreuve])]
        .filter((c) => c.trim() !== "" && !jamais.includes(c))
        .filter((c) => !police.hasGlyphForCodePoint(c.codePointAt(0)!));
      expect(manquants, `${f} ne porte pas « ${manquants.join("")} »`).toEqual([]);
    }
  });
});
