import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { ROUTES_APP, ROUTES_LOVE, ROUTE_OFFICE } from "./routes";

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
  it("la liste love est DÉRIVÉE, pas recopiée : elle vaut la liste bzh moins l'Office", () => {
    expect(ROUTES_LOVE).toEqual(ROUTES_APP.filter((r) => r !== ROUTE_OFFICE));
    expect(ROUTES_LOVE).not.toContain(ROUTE_OFFICE);
    expect(ROUTES_APP).toContain(ROUTE_OFFICE);
    /* ⚠️ Une seule route sépare les deux visages aujourd'hui. Si ce compte
       bouge, c'est une décision — pas un effet de bord d'un ajout de route. */
    expect(ROUTES_APP.length - ROUTES_LOVE.length).toBe(1);
  });

  /* ⛔ LA SOUSTRACTION EST LE POINT. Une seconde liste écrite à la main
     divergerait au premier ajout de route, EN SILENCE — exactement ce que
     `routes.ts` existe pour empêcher entre ses trois listes. */
  it("une route neuve entre dans les DEUX visages par construction", () => {
    const src = nu("./routes.ts");
    expect(src, "ROUTES_LOVE est recopiée au lieu d'être dérivée")
      .toMatch(/ROUTES_LOVE\s*=\s*ROUTES_APP\.filter/);
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
  it("⛔ la colonne de l'Office est COMMANDÉE par le visage, pas seulement voisine", () => {
    const app = nu("./App.tsx");
    const nav = app.slice(app.indexOf('<nav className="nav">'), app.indexOf("</nav>"));
    const branche = nav.match(/\{avecOffice\(\) \? \([\s\S]*?\) : \(/)?.[0] ?? "";
    expect(branche, "la colonne 2 n'est plus commandée par `avecOffice()`").not.toBe("");
    expect(branche, "la branche `avecOffice()` ne contient pas la colonne de l'Office")
      .toMatch(/balades-office/);
    /* ⛔ Et le chat est dans l'AUTRE branche, pas dans la même. */
    const apres = nav.slice(nav.indexOf(branche) + branche.length);
    expect(apres, "le chat n'est pas dans la branche love").toMatch(/\/chat/);
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
