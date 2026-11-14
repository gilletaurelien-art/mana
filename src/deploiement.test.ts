// Les scripts de déploiement doivent au moins SE PARSER — et un défaut connu
// de bash 3.2 fait qu'ils peuvent ne pas se parser sans que ça se voie.
//
// 🔴 CE FICHIER NAÎT D'UN DÉFAUT RÉEL, LE 14/11/2026. Une apostrophe SEULE
//    dans un `${VAR:?message}` ouvre, sous bash 3.2 (celui de macOS), une
//    chaîne que rien ne ferme : tout le reste du script devient du texte. Le
//    message de `bash -n` accusait alors un `done` quarante-cinq lignes plus
//    bas — l'endroit où la structure se retrouvait orpheline, pas l'endroit du
//    défaut.
//
// ⛔ ET `deployer-mana-bzh.sh` NE PASSE QUE PAR CHANCE : son message porte
//    « n'est » ET « l'en-tête », donc DEUX apostrophes, qui se referment
//    l'une sur l'autre. Le compte PAIR sauve, le compte IMPAIR casse. Retirer
//    un mot de ce message casserait le déploiement de mana.bzh, et la cause
//    serait cherchée ailleurs.
//
// ⭐ POURQUOI UN TEST ET PAS UN COMMENTAIRE. Un commentaire au-dessus de la
//    ligne fautive prévient qui la relit ; personne ne relit un message
//    d'erreur avant de le reformuler. Le test, lui, parle au moment du
//    changement.
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const DOSSIER = resolve(__dirname, "..", "deploiement");
const SCRIPTS = readdirSync(DOSSIER).filter((f) => f.endsWith(".sh"));

describe("les scripts de déploiement", () => {
  it("il y en a, et on les a trouvés", () => {
    // ⭐ Sans ce premier test, un dossier renommé rendrait une liste vide et
    //    les deux tests suivants passeraient en ne vérifiant RIEN.
    expect(SCRIPTS.length).toBeGreaterThanOrEqual(2);
  });

  for (const nom of SCRIPTS) {
    it(`${nom} se parse (bash -n)`, () => {
      // ⚠️ On EXÉCUTE bash plutôt que de relire le texte : c'est son analyseur
      //    à lui qui décide, et sa version diffère d'une machine à l'autre.
      expect(() =>
        execFileSync("bash", ["-n", resolve(DOSSIER, nom)], { stdio: "pipe" }),
      ).not.toThrow();
    });

    it(`${nom} ne met aucune apostrophe impaire dans un \${VAR:?…}`, () => {
      const texte = readFileSync(resolve(DOSSIER, nom), "utf8");
      // Le corps d'un `${VAR:?mot}` : tout jusqu'au `}` ou au saut de ligne.
      const fautifs: string[] = [];
      for (const m of texte.matchAll(/\$\{[A-Za-z_][A-Za-z0-9_]*:[?-]([^}\n]*)\}/g)) {
        const apostrophes = (m[1].match(/'/g) ?? []).length;
        if (apostrophes % 2 === 1) fautifs.push(m[0]);
      }
      expect(fautifs).toEqual([]);
    });
  }
});
