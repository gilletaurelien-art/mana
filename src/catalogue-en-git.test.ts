import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

/**
 * 🔴 CE GARDE EXISTE PARCE QUE CE CATALOGUE A VÉCU EN UN SEUL EXEMPLAIRE AU
 *    MONDE PENDANT DIX-SEPT JOURS.
 *
 * Mesuré le 14/11/2026 : `data/bretagne/t/` porte 1 032 itinéraires et
 * `index.json` les recense. Tous datés du MÊME JOUR, le 28 octobre 2026, et
 * produits par quelque chose qui n'est pas dans ce dépôt — `docs/graphe-pipeline.md`
 * ouvre d'ailleurs sur « le pipeline qui a produit crozon.json le 28/10/2026
 * n'existe plus ». Ils ne vivaient que sur une machine, protégés d'un
 * `rsync --delete` par une ligne d'exclusion et de rien d'autre.
 *
 * ⭐ ET LA RÈGLE DU DÉPÔT NE LES COUVRAIT PAS. « Une recette se versionne, son
 *    résultat non » suppose qu'il EXISTE une recette. Quand elle a disparu, le
 *    résultat est la source. Les graphes (`g/`) restent donc exclus — ils se
 *    rejouent en quatre-vingts secondes — et le catalogue, non.
 *
 * ⚠️ Ce que ce test empêche : qu'un futur nettoyage de `.gitignore` les fasse
 *    ressortir de l'histoire sans qu'un producteur ait été écrit. Il échouerait
 *    alors, et c'est le but.
 */

const suivis = (chemin: string): string[] =>
  execFileSync("git", ["ls-files", chemin], { encoding: "utf8" })
    .split("\n").filter(Boolean);

describe("le catalogue des itinéraires est dans l'histoire", () => {
  it("index.json est suivi par git", () => {
    expect(suivis("data/bretagne/index.json"),
      "index.json est ressorti de git : le catalogue n'a plus qu'une copie")
      .toHaveLength(1);
  });

  it("les itinéraires sont suivis, et AUTANT que le catalogue en annonce", () => {
    /* ⛔ Compter les fichiers ne suffit pas : une perte PARTIELLE laisserait le
       compte « plausible ». C'est `index.json` qui dit combien il doit y en
       avoir, et c'est lui qu'on croit. */
    const annonces = JSON.parse(
      readFileSync("data/bretagne/index.json", "utf8"),
    ) as unknown[];
    const fichiers = suivis("data/bretagne/t");
    expect(annonces.length, "le catalogue s'est vidé").toBeGreaterThan(900);
    expect(fichiers.length, `${annonces.length} itinéraires annoncés, ${fichiers.length} suivis par git`)
      .toBe(annonces.length);
  });

  it("chaque itinéraire annoncé a bien son fichier", () => {
    /* ⚠️ Le compte peut coller alors que les NOMS ne correspondent pas : un
       fichier en trop et un manquant s'annulent. On vérifie les slugs. */
    const annonces = JSON.parse(
      readFileSync("data/bretagne/index.json", "utf8"),
    ) as { s: string }[];
    const manquants = annonces
      .map((e) => e.s)
      .filter((s) => !existsSync(`data/bretagne/t/${s}.json`));
    expect(manquants.slice(0, 5), `${manquants.length} itinéraires annoncés sans fichier`)
      .toEqual([]);
  });

  it("⛔ le catalogue n'est PAS dans `public/` — ce nom est une adresse prise", () => {
    /* 🔴 PREMIER JET REFUSÉ PAR `collisions.test.ts`, LE 14/11/2026, ET IL AVAIT
       RAISON. Le catalogue avait été rangé dans `public/bretagne/` : or
       `bretagne` est déjà pris à la racine du domaine, et le premier niveau
       d'un fichier servi est une ADRESSE. Deux dossiers ne peuvent pas répondre
       à `/bretagne/*`, la collision est muette des deux côtés, et le perdant
       rend une page blanche sans une ligne d'erreur.
       ⭐ Et la leçon est plus large que le nom : CONSERVER et SERVIR sont deux
          besoins, donc deux endroits. La production sert ce catalogue depuis la
          racine du domaine ; ce dépôt n'a qu'à le garder. */
    expect(suivis("public/bretagne"),
      "le catalogue est revenu dans public/ : collision d'adresse avec la racine du domaine")
      .toEqual([]);
  });

  it("⛔ les GRAPHES restent hors de l'histoire — ils ont une recette", () => {
    /* ⭐ L'inverse du test précédent, et c'est volontaire : les deux moitiés de
       `public/bretagne/` ont des natures opposées. Versionner `g/` ramènerait
       16 Mo rejouables, et c'est le défaut déjà payé ailleurs — 3,5 Go de .vrm,
       94 % du poids d'un dépôt. */
    expect(suivis("public/bretagne/g"),
      "les graphes sont entrés dans git : 16 Mo rejouables en 80 s")
      .toEqual([]);
    expect(readFileSync("docs/graphe-pipeline.md", "utf8").length,
      "la recette des graphes a disparu : alors ils doivent entrer dans git")
      .toBeGreaterThan(500);
  });

  it("aucune donnée personnelle dans le catalogue", () => {
    /* ⚠️ Le dépôt est PUBLIC. Mesuré au rapatriement : zéro courriel, zéro
       téléphone sur les 1 032 fichiers. Le garde le tient sur un échantillon,
       parce que relire 5 Mo à chaque passage de suite coûterait plus que ça
       ne rapporte. */
    const motif = /[\w.+-]+@[\w-]+\.\w+|\b0[1-9](?:[ .-]?\d{2}){4}\b/;
    const noms = readdirSync("data/bretagne/t").filter((n) => n.endsWith(".json"));
    const pas = Math.max(1, Math.floor(noms.length / 60));
    for (let i = 0; i < noms.length; i += pas) {
      const t = readFileSync(`data/bretagne/t/${noms[i]}`, "utf8");
      expect(motif.test(t), `${noms[i]} porte un courriel ou un téléphone`).toBe(false);
    }
    expect(motif.test(readFileSync("data/bretagne/index.json", "utf8"))).toBe(false);
  });
});
