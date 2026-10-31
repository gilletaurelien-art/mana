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
 *   sous-ensemblées .........  85 Ko
 *   Marelle → Instrument ....  68 Ko   (le soir même)
 *
 * ⭐ LE DERNIER PAS N'EST PAS UNE OPTIMISATION, C'EST UN CHOIX DE DIRECTION
 *    QUI S'EST TROUVÉ GRATUIT. Marelle Baton, police de titrage expressive,
 *    pesait 41,0 Ko sous-ensemblée — le fichier le plus lourd du site.
 *    Instrument Serif, qui porte l'identité éditoriale demandée, en pèse 23,9.
 *    On a donc changé de visage EN ALLÉGEANT de 17 Ko. Les deux décisions
 *    étaient indépendantes ; c'est la MESURE qui a montré qu'elles allaient
 *    dans le même sens, et personne ne l'aurait deviné.
 *
 * ⚠️ CES CHIFFRES SE RECOMPTENT, ILS NE SE RECOPIENT PAS :
 *      ls -l src/fonts/*.woff2
 *    Un nombre vivant recopié dans une note devient un faux témoin qu'on cite.
 *    Celui-ci a déjà vieilli une fois en douze heures.
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

  /**
   * ⛔ AUCUNE POLICE DISTANTE — et c'est une règle de PRODUIT, pas de style.
   *    Une `<link>` vers fonts.googleapis.com, ou un `src: url(https://…)`,
   *    placerait un tiers dans la chaîne d'exécution et casserait le
   *    hors-ligne — le seul argument que le terrain nous reconnaisse. Une
   *    règle de produit vit plus longtemps en test qu'en commentaire :
   *    celle-ci n'existait qu'en prose, et la prose ne refuse rien.
   */
  it("⛔ aucune police n'est chargée depuis un tiers", () => {
    const css = readFileSync("src/styles.css", "utf8") + readFileSync("src/tokens.css", "utf8");
    const distantes = [...css.matchAll(/src:\s*[^;]*url\(\s*["']?(https?:)?\/\//gi)].map((m) => m[0]);
    expect(distantes, "une @font-face pointe hors du dépôt").toEqual([]);
    const html = readFileSync("index.html", "utf8");
    expect(html, "index.html appelle un hébergeur de polices")
      .not.toMatch(/fonts\.(googleapis|gstatic|bunny|cdnfonts)\.com/i);
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

/**
 * 🔴 LE CONTRASTE SE PERD PAR DISTRACTION, PAS PAR DÉCISION. Le 31/10, sept
 *    règles écrivaient du texte en `--sauge` sur fond kaki — 3,38 là où il en
 *    faut 4,5. Aucune n'était un choix : chacune avait repris la voisine.
 * ⭐ Un seuil de contraste ne se tient pas à la relecture. Il se tient par un
 *    test qui refuse la VALEUR, parce que c'est la valeur qu'on recopie.
 *    ⚠️ Il porte sur `color:` seulement : `--sauge` reste la bonne couleur
 *       pour un trait de carte ou un filigrane, où aucun texte n'est en jeu.
 */
import { describe as decrire2, it as cas2, expect as attend2 } from "vitest";
decrire2("le contraste des textes secondaires", () => {
  cas2("⛔ aucun texte n'est peint en --sauge (3,38 sur le kaki)", () => {
    const css = readFileSync("src/systeme.css", "utf8");
    const fautifs = css
      .split("\n")
      .map((l, i) => ({ l: l.trim(), n: i + 1 }))
      .filter((x) => /(^|[;{\s])color:\s*var\(--sauge\)\s*;/.test(x.l))
      .map((x) => `ligne ${x.n} : ${x.l}`);
    attend2(fautifs, "utiliser --texte-inverse-doux (#a5a993, 4,57)").toEqual([]);
  });
});

/**
 * 🔴 UNE PILE DE POLICES PEUT NOMMER UN FICHIER QUI N'EXISTE PLUS, ET RIEN NE
 *    LE DIT. Le 31/10, `--titre` nommait encore « Marelle Baton 2 » après la
 *    suppression du fichier : les dix-sept règles qui l'emploient rendaient en
 *    « Iowan Old Style », une police système de macOS — donc en Georgia sur
 *    Windows et Android. Le site affichait trois serifs selon l'élément et le
 *    système, sans la moindre erreur nulle part.
 * ⭐ Le défaut est né d'un `replace` dont la chaîne ne correspondait pas : il
 *    écrit zéro et ne lève pas. C'est l'édition qui échoue le plus
 *    silencieusement, et seul un test qui RELIE les deux côtés l'attrape.
 */
import { describe as decrire3, it as cas3, expect as attend3 } from "vitest";
decrire3("les familles déclarées", () => {
  cas3("🔴 ne nomment que des polices EMBARQUÉES ou des replis système", () => {
    const css = readFileSync("src/styles.css", "utf8") + readFileSync("src/tokens.css", "utf8");
    // ce que le dépôt sert vraiment, lu dans les @font-face
    const servies = new Set(
      [...css.matchAll(/@font-face\s*\{[^}]*?font-family:\s*"([^"]+)"/g)].map((m) => m[1]),
    );
    attend3(servies.size).toBeGreaterThan(0);
    /** ⚠️ Les replis admis sont NOMMÉS, pas devinés : une pile qui cite une
     *  police inconnue est soit une faute de frappe, soit un fichier
     *  disparu — et les deux rendent la même chose, c'est-à-dire autre
     *  chose que ce qu'on croit. */
    const replis = new Set([
      "Iowan Old Style", "Georgia", "Times New Roman",
      "system-ui", "-apple-system", "Segoe UI", "serif", "sans-serif",
    ]);
    const citees = new Set<string>();
    for (const m of css.matchAll(/--(?:serif|sans|titre|texte-famille|chiffres):\s*([^;]+);/g)) {
      for (const f of m[1].split(",")) {
        const nom = f.trim().replace(/^["']|["']$/g, "");
        if (!nom || nom.startsWith("var(")) continue;
        citees.add(nom);
      }
    }
    const orphelines = [...citees].filter((n) => !servies.has(n) && !replis.has(n));
    attend3(orphelines, "ces familles ne sont ni embarquées ni des replis connus").toEqual([]);
  });

  cas3("⛔ aucune pile ne cite une police dont le fichier a disparu", () => {
    const css = readFileSync("src/styles.css", "utf8") + readFileSync("src/tokens.css", "utf8");
    const fichiers = readdirSync(DOSSIER);
    for (const m of css.matchAll(/@font-face\s*\{[^}]*?url\("\.\/fonts\/([^"]+)"\)/g)) {
      attend3(fichiers, `${m[1]} est déclaré mais absent de ${DOSSIER}`).toContain(m[1]);
    }
  });
});
