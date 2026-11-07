import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { ROUTES_APP, ROUTES_LOVE, ROUTE_OFFICE, ROUTES_HORS_LOVE } from "./routes";

const lire = (f: string) => readFileSync(new URL(f, import.meta.url), "utf8");
const nu = (f: string) =>
  lire(f).replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * 🔴 UNE SEULE APP, DEUX HÔTES — décision d'Aurélien, 7/11/2026. mana.bzh est
 * « une version ultra light de mana.love », avec une fonction EN PLUS : les
 * balades de l'Office de tourisme.
 * ⭐ L'alternative — porter la carte dans un second dépôt — a été écartée pour
 *    une raison mesurée : ce dépôt a déjà payé deux codes faisant le même
 *    travail, et les plages du monde sont restées à 5 % pendant seize jours
 *    parce que rien ne les confrontait.
 */
describe("les deux visages — ce qui change, et ce qui ne doit pas", () => {
  /* 🔴 CES DEUX TESTS SONT RETOURNÉS, PAS SUPPRIMÉS — 7/11, l'après-midi.
     Le matin ils exigeaient « love = bzh moins l'Office », et un écart de
     EXACTEMENT UN. Le fondateur a tranché depuis : mana.love est tenu par
     l'application citoyenne, et la nôtre n'y entre que par la carte et les
     promenades. L'écart vaut cinq.
     ⭐ Ce qu'ils gardaient reste vrai sous une forme plus large : la liste
     est DÉRIVÉE, et l'écart est une DÉCISION, pas un effet de bord. */
  it("la liste love est DÉRIVÉE : elle vaut la liste bzh moins les exclusions", () => {
    const exclus = Object.keys(ROUTES_HORS_LOVE);
    expect(ROUTES_LOVE).toEqual(ROUTES_APP.filter((r) => !exclus.includes(r)));
    expect(ROUTES_LOVE).not.toContain(ROUTE_OFFICE);
    expect(ROUTES_APP).toContain(ROUTE_OFFICE);
    /* ⚠️ L'écart suit la liste des exclusions, et rien d'autre. S'il bouge
       sans qu'elle bouge, c'est un ajout de route qui a fui d'un visage. */
    expect(ROUTES_APP.length - ROUTES_LOVE.length).toBe(exclus.length);
  });

  /* ⛔ LA SOUSTRACTION EST LE POINT. Une seconde liste écrite à la main
     divergerait au premier ajout de route, EN SILENCE — exactement ce que
     `routes.ts` existe pour empêcher entre ses trois listes.
     🔴 ET CE TEST EXIGEAIT UN MOYEN, PAS UN EFFET : il cherchait la chaîne
        `ROUTES_LOVE = ROUTES_APP.filter`. Il est donc tombé le jour où la
        dérivation a changé de FORME — en passant par une fonction qui lève
        si une exclusion ne retire rien, c'est-à-dire en devenant MEILLEURE.
     ⭐ Un test qui nomme la ligne qu'il veut lire interdit la bonne solution.
        Celui-ci éprouve désormais la PROPRIÉTÉ : une route inconnue des
        exclusions appartient aux deux visages. */
  it("une route neuve entre dans les DEUX visages par construction", () => {
    const exclus = Object.keys(ROUTES_HORS_LOVE);
    const neuves = ROUTES_APP.filter((r) => !exclus.includes(r as string));
    expect(neuves.length, "plus rien n'est commun aux deux visages").toBeGreaterThan(0);
    for (const r of neuves) {
      expect(ROUTES_LOVE, `${r} n'est pas exclu et manque pourtant à love`).toContain(r);
    }
  });

  /* 🔴 `/chat` N'EST PAS À NOUS. Sur mana.love il tombe dans la coquille,
     servie par manafrance-app. L'inscrire ici ferait revendiquer à cette app
     une adresse qu'elle ne sait pas rendre — un 200 sur une page qu'on n'a
     pas, le pire des désaccords parce qu'il a l'air de marcher. */
  it("⛔ le chat n'entre pas dans les chemins de cette app", () => {
    expect(ROUTES_APP as readonly string[]).not.toContain("/chat");
    expect(ROUTES_LOVE).not.toContain("/chat");
  });

  /* ⭐ Le prédicat se nomme par la CAPACITÉ, pas par le site : le jour où un
     second office rejoint le produit, c'est la liste des territoires qui
     change, pas ce test. */
  it("l'Office se décide par un seul prédicat, nommé par ce qu'il décide", () => {
    const v = nu("./visage.ts");
    expect(v).toMatch(/export const avecOffice/);
    for (const f of ["./App.tsx", "./Territoire2030.tsx", "./LApplication.tsx"]) {
      expect(nu(f), `${f} décide de l'Office sans passer par le prédicat`)
        .toMatch(/avecOffice\(\)/);
    }
    /* ⛔ Et personne ne teste l'hôte à la main ailleurs : un `hostname ===`
       dispersé serait un second prédicat que rien ne confronte au premier. */
    for (const f of ["./App.tsx", "./Territoire2030.tsx", "./LApplication.tsx"]) {
      expect(nu(f), `${f} lit l'hôte directement`).not.toMatch(/hostname\s*===/);
    }
  });

  /* 🔴 CE GARDE EST NÉ D'UNE MUTATION QUI N'A PAS MORDU. J'ai remplacé la
     condition de la colonne 2 par `true` — la colonne de l'Office revenait
     donc sur mana.love — et les 37 tests sont restés VERTS. Les deux gardes
     voisins comptaient la PRÉSENCE des deux branches dans le source, pas le
     fait que le choix entre elles dépende du visage.
     ⭐ Une mutation qui ne mord pas ne dit pas « c'est bon » : elle dit qu'il
        manque un garde. Celui-ci exige que la colonne de l'Office vive À
        L'INTÉRIEUR de la branche `avecOffice()`, et pas à côté. */
  /* 🔴 RETOURNÉ LE JOUR MÊME, ET IL EST NÉ D'UNE MUTATION QUI N'AVAIT PAS
     MORDU : hardcoder la condition de la colonne 2 à `true` laissait 37 tests
     verts. Il exigeait donc que la colonne de l'Office vive À L'INTÉRIEUR de
     la branche `avecOffice()` — en lisant le JSX.
     ⭐ Et c'est précisément cette lecture du texte qui l'a rendu aveugle au
        défaut suivant : la barre, en production sur mana.love, menait cinq
        fois à la même page, et il était vert. Il gardait l'endroit où la
        décision est écrite, pas la décision.
     ⚠️ Ce qu'il protégeait reste entier — « la colonne 2 est COMMANDÉE par le
        visage, pas seulement voisine » — et vit maintenant dans
        `barre.test.ts`, interrogé sur `entreesBarre()`. Ici on garde la part
        que ce fichier est seul à pouvoir dire : le prédicat existe, il est
        nommé par ce qu'il décide, et rien ne décide de l'Office sans lui. */
  it("⛔ rien ne décide de l'Office sans passer par le prédicat", () => {
    const v = nu("./visage.ts");
    expect(v).toMatch(/export const avecOffice/);
    /* ⚠️ `barre.ts` reçoit le visage en ARGUMENT — c'est ce qui le rend pur
       et testable sans navigateur. Il n'a donc pas à appeler le prédicat, et
       l'exiger de lui interdirait exactement la bonne solution. */
    const decideurs = ["./App.tsx"];
    for (const f of decideurs) {
      expect(nu(f), `${f} décide de l'Office sans passer par le prédicat`)
        .toMatch(/avecOffice\(\)/);
    }
  });

  /* ⚠️ ON NE MASQUE PAS, ON NE CHARGE PAS. Masquer le calque coûterait quand
     même les 264 Ko d'`ot.json` à un hôte qui n'a rien à en faire — et
     laisserait un calque vide à oublier quelque part. */
  it("mana.love ne télécharge pas les 264 Ko de l'Office", () => {
    const t = nu("./Territoire2030.tsx");
    const bloc = t.match(/if \(!avecOffice\(\)\)[\s\S]{0,120}?chargerOT/)?.[0] ?? "";
    expect(bloc, "`ot.json` se charge avant qu'on ait regardé le visage").not.toBe("");
  });

  /* ⛔ LE CRÉDIT SUIT LA DONNÉE. Créditer un partenaire dont on ne montre rien
     n'est pas de la rigueur, c'est du bruit — et ça affaiblit la mention là où
     elle compte vraiment. */
  it("le crédit de l'Office ne survit pas à sa matière", () => {
    const l = nu("./LApplication.tsx");
    expect(l).toMatch(/MODULES\.filter\(\(m\) => office \|\| !m\.source\)/);
  });
});
