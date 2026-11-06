import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const APP = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
const CSS = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

/**
 * 🔴 CE FICHIER TIENT DEUX DÉCISIONS D'ACCUEIL PRISES LE 6/11/2026, à la
 * demande d'Aurélien, après vérification des cinq sections.
 *
 * ⭐ POURQUOI EN TEST ET PAS EN COMMENTAIRE. Les deux sont des règles de
 *    PRODUIT, et une règle de produit change plus vite que le code qui la
 *    porte : en commentaire elle se franchit sans le savoir, en test elle se
 *    franchit en le sachant. Ce dépôt a déjà payé l'inverse — une consigne
 *    bien rédigée, datée, argumentée, qui interdisait en docstring le travail
 *    que le fondateur venait de demander.
 */
describe("l'accueil de mana.bzh — la numérotation retirée", () => {
  /* 🔴 LA NUMÉROTATION 01→05 N'ENCODAIT RIEN. Les cinq sections ne sont pas
     des étapes, ce sont des familles de fonctions : rien ne disait pourquoi
     « sécurité » venait après « hors ligne ». Un lecteur qui voit « 01 »
     cherche une séquence qu'il ne trouvera pas.
     ⭐ Un dispositif de structure — numéros, bandeaux, filets — doit encoder
        quelque chose de VRAI du contenu, sinon il décore en ayant l'air
        d'informer. C'est la pire des deux : il occupe la place d'une
        hiérarchie réelle. */
  it("aucune section n'affiche de numéro d'ordre", () => {
    expect(APP).not.toMatch(/section-num/);
    expect(APP).not.toMatch(/\bnum:\s*"\d+"/);
  });

  it("et la règle CSS qui le dessinait est partie avec — pas de style orphelin", () => {
    expect(CSS).not.toMatch(/\.section-num\b/);
  });
});

describe("l'accueil de mana.bzh — l'ordre des sections sert le lecteur", () => {
  const rang = (titre: string) => {
    const i = APP.indexOf(`titre: "${titre}"`);
    expect(i, `section introuvable : ${titre}`).toBeGreaterThan(-1);
    return i;
  };

  const NAVIGATION = "Navigation & cartographie hors ligne";
  const CIRCUITS = "Carnet, export GPX et circuits balisés";
  const PATRIMOINE = "Patrimoine de la presqu’île";
  const SECURITE = "Sécurité sur la côte";

  /* 🔴 LE GARDE QUI COMPTE. Les 46 circuits balisés de l'Office de tourisme
     étaient en QUATRIÈME position, derrière deux sections techniques. C'est
     la section qui dit à l'Office « nous ne vous remplaçons pas, nous vous
     créditons » — l'actif de la relation, et il était enterré. L'argument de
     la démo du 6/11 est la DISPERSION des flux : cette section le porte.
     ⚠️ Ce test ne fige PAS un ordre absolu — il exige que la section qui
        crédite l'Office passe avant le patrimoine et la sécurité. Déplacer
        les autres reste libre ; reléguer celle-là demande de le décider. */
  it("les circuits crédités à l'Office passent avant le patrimoine et la sécurité", () => {
    expect(rang(CIRCUITS)).toBeLessThan(rang(PATRIMOINE));
    expect(rang(CIRCUITS)).toBeLessThan(rang(SECURITE));
  });

  it("l'accroche produit reste la première chose qu'on lit", () => {
    expect(rang(NAVIGATION)).toBeLessThan(rang(CIRCUITS));
  });

  /* ⚠️ ET LE CRÉDIT DOIT SURVIVRE AU DÉPLACEMENT. Remonter la section sans
     son attribution serait pire que la laisser en bas : on gagnerait la
     visibilité en perdant ce qui la justifie. */
  it("l'Office est nommé et MANA ne s'attribue rien", () => {
    expect(APP).toContain("Office de tourisme Presqu’île de Crozon – Aulne Maritime");
    expect(APP).toMatch(/MANA ne s’attribue rien et ne recommande rien/);
  });
});
