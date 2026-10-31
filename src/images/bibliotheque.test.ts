/**
 * LE CONTRÔLE QUALITÉ ARTISTIQUE — en tests, pas en checklist.
 *
 * ⭐ Le §13 du brief est une liste de dix questions à se poser « à la fin ».
 *    Une question qu'on se pose à la fin est une question qu'on oublie à la
 *    troisième refonte. Six des dix sont vérifiables par machine : elles sont
 *    ici. Les quatre autres (l'élégance, la lecture en plein soleil, la
 *    signature cartographique, « est-ce reconnaissable ») demandent un œil —
 *    elles restent au brief, et c'est honnête de le dire plutôt que d'écrire
 *    un test qui ferait semblant de les couvrir.
 *
 * 🔴 LE TEST QUI COMPTE EST CELUI DE L'ATTRIBUTION. Vingt-deux des vingt-quatre
 *    images sont sous CC BY ou CC BY-SA : sans crédit affiché, leur usage est
 *    une contrefaçon, pas une maladresse. Et le jour où quelqu'un ajoutera une
 *    image à la main dans le manifeste — ce que l'en-tête interdit et que l'on
 *    fera quand même — ce test est ce qui l'arrêtera.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";

/**
 * 🔴 LA LECTURE EST PARESSEUSE, ET CE N'EST PAS UN DÉTAIL DE STYLE. Première
 *    version : `readFileSync` au niveau du module. Le manifeste n'étant pas
 *    encore moissonné, le fichier a levé À LA COLLECTE — vitest a rapporté
 *    « 1 fichier en échec, 84 tests passés », c'est-à-dire un échec qui ne
 *    désigne AUCUN test et n'explique rien.
 *    ⭐ Même défaut qu'avec `describe.skipIf` la veille : ce qui s'exécute au
 *       chargement du fichier s'exécute AVANT que le cadre de test puisse
 *       attraper quoi que ce soit, et un plantage de collecte n'est pas un
 *       test rouge — c'est un test ABSENT qui se présente comme un échec.
 * ⚠️ Et l'absence du manifeste reste une FAUTE, pas un cas à sauter : une
 *    bibliothèque qui disparaît doit se voir. Le premier test la nomme.
 */
const lire = (f: string) => JSON.parse(readFileSync(`src/images/${f}`, "utf8"));
const images = (): any[] => lire("bibliotheque.json").images;
const choix = () => lire("retenues.json");

/** ⚠️ La liste blanche est RECOPIÉE ici À DESSEIN, et c'est le contraire d'une
 *  duplication : si le script assouplissait son filtre, un test qui importe sa
 *  constante s'assouplirait avec lui et ne dirait plus rien. Deux listes qui
 *  doivent concorder valent mieux qu'une seule qui ne peut pas se contredire. */
const LIBRES = [
  "CC0", "Domaine public", "Domaine public (auteur)",
  "CC BY 1.0", "CC BY 2.0", "CC BY 2.5", "CC BY 3.0", "CC BY 4.0",
  "CC BY-SA 1.0", "CC BY-SA 2.0", "CC BY-SA 2.5", "CC BY-SA 3.0", "CC BY-SA 4.0",
];

describe("la bibliothèque photographique", () => {
  it("existe, n'est pas vide, et n'a pas silencieusement rétréci", () => {
    expect(existsSync("src/images/bibliotheque.json"),
      "le manifeste manque — lancer `node scripts/moisson-images.mjs retenir`").toBe(true);
    expect(images().length).toBeGreaterThanOrEqual(20);
    // tout ce qui a été retenu à l'œil a bien été moissonné
    expect(images().length).toBe(choix().images.length);
  });

  it("🔴 chaque image porte une licence LIBRE, nommée, de la liste blanche", () => {
    for (const i of images()) {
      expect(LIBRES, `${i.id} porte « ${i.licence} »`).toContain(i.licence);
    }
  });

  it("🔴 chaque image porte un auteur, une page source et une date de collecte", () => {
    for (const i of images()) {
      expect(i.auteur, `${i.id}`).toBeTruthy();
      expect(i.auteur, `${i.id} : auteur non déclaré`).not.toBe("auteur non déclaré");
      expect(i.page, `${i.id}`).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
      expect(i.collecte, `${i.id}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("⛔ documentaire et lieu disent la MÊME chose — jamais l'un sans l'autre", () => {
    for (const i of images()) {
      expect(i.documentaire, `${i.id}`).toBe(i.lieu != null);
    }
  });

  it("🔴 un lieu nommé ne porte pas d'étiquette vague", () => {
    // Une catégorie Commons couvre parfois un département entier : étiqueter
    // « Finistère » une photo de la Pointe du Raz serait vrai et inutilisable.
    for (const i of images().filter((x) => x.documentaire)) {
      expect(i.lieu.length, `${i.id} : « ${i.lieu} » est trop court pour situer`).toBeGreaterThan(6);
      expect(i.lieu, `${i.id} : « ${i.lieu} » désigne un département, pas un lieu`)
        .not.toMatch(/^(Finistère|Bretagne|France)$/);
    }
  });

  it("chaque variante annoncée existe vraiment sur le disque", () => {
    for (const i of images()) {
      expect(i.variantes.length, `${i.id} n'a aucune variante`).toBeGreaterThan(0);
      for (const v of i.variantes) {
        expect(existsSync(`public/images/${v.fichier}`), `${v.fichier} manque`).toBe(true);
      }
    }
  });

  /**
   * ⚠️ 250 Ko, ET LE SEUIL VIENT DE LA MESURE. La plus lourde des variantes
   *    servies (1600 px) pèse 226 Ko. Le plafond est posé juste au-dessus :
   *    assez haut pour ne pas refuser ce qu'on a choisi, assez bas pour
   *    qu'une image mal préparée se fasse remarquer.
   * ⭐ Un seuil qu'on relève chaque fois qu'il refuse quelque chose cesse
   *    d'être un seuil. Celui-ci a refusé une 2400 px à 440 Ko — et la
   *    réponse a été de supprimer la variante, parce qu'aucun appareil ne la
   *    demandait, pas de relever le plafond.
   */
  it("⚠️ aucune variante AVIF ne dépasse 250 Ko — le hors-ligne les télécharge", () => {
    for (const i of images()) {
      for (const v of i.variantes.filter((x: any) => x.format === "avif")) {
        expect(v.octets, `${v.fichier} pèse ${Math.round(v.octets / 1024)} Ko`).toBeLessThan(250 * 1024);
      }
    }
  });

  /**
   * 🔴 LE HORS-LIGNE EST NOTRE SEUL ARGUMENT SUR LE TERRAIN, et il se perd par
   *    une extension oubliée. Le 31/10, le motif du service worker acceptait
   *    `webp` et `png` mais pas `avif` — or l'AVIF est le PREMIER choix servi
   *    par `<picture>`. Hors ligne, les fiches se seraient ouvertes avec leur
   *    texte et un trou à la place de l'image.
   * ⭐ Ce test ne recopie aucune liste de formats : il LIT ceux que la
   *    bibliothèque sert et vérifie que le motif les accepte. Ajouter un
   *    format demain le fera échouer tout seul — c'est tout l'intérêt.
   */
  it("🔴 tout format servi est mis en cache par le service worker", () => {
    const sw = readFileSync("public/sw.js", "utf8");
    const m = sw.match(/\/\\\.\(([a-z0-9?|]+)\)\$\//);
    expect(m, "le motif d'extensions du service worker est introuvable").toBeTruthy();
    const motif = new RegExp(`\\.(${m![1]})$`);
    const formats = new Set(images().flatMap((i) => i.variantes.map((v: any) => v.format)));
    expect(formats.size).toBeGreaterThan(0);
    for (const f of formats) {
      expect(motif.test(`x.${f}`), `le service worker ne garde pas les .${f}`).toBe(true);
    }
  });

  it("⛔ le composant Photo reste le SEUL chemin vers une image de la bibliothèque", () => {
    // ⭐ Un garde ne vaut que par ses points de pose. Si un écran construit son
    //    `<img src="/images/…">` à la main, il contourne le contrat documentaire
    //    ET l'attribution — et rien ne le signalerait.
    const fichiers = ["App.tsx", "Invitation.tsx", "Territoire2030.tsx", "Promenade.tsx",
                      "Promenades.tsx", "Composer.tsx", "Territoire.tsx"]
      .filter((f) => existsSync(`src/${f}`));
    for (const f of fichiers) {
      const src = readFileSync(`src/${f}`, "utf8");
      const enDur = src.split("\n")
        .filter((l) => /images\/[a-z0-9-]+-\d+\.(avif|webp)/.test(l) && !/^\s*(\/\/|\*)/.test(l));
      expect(enDur, `${f} fabrique une URL d'image à la main`).toEqual([]);
    }
  });
});
