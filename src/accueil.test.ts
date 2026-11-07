import { describe, it, expect } from "vitest";
import { liensPied } from "./barre";
import { readFileSync } from "node:fs";

/* 🔄 6/11/2026 — CES GARDES ONT SUIVI LEUR CONTENU. Les cinq sections ont
   quitté l'accueil pour `/l-application`, une page à elles, indexable. Les
   règles qu'ils tiennent — la numérotation retirée, les circuits de l'Office
   avant le patrimoine, le crédit qui survit au déplacement — n'ont pas
   changé d'un mot : seul leur domicile a changé.
   ⭐ C'est la DEUXIÈME fois aujourd'hui qu'un garde de ce dépôt se trouve à
      lire le mauvais fichier après un déménagement. Ce matin, quatre d'entre
      eux sont restés VERTS en gardant un composant que plus personne
      n'affichait. Ici ils sont tombés — bruyamment, donc bien. ⚠️ La
      différence tient à une seule chose : le fichier qu'ils lisaient avait
      disparu de l'écran, pas du disque. Un garde qui nomme un fichier n'est
      sûr que lorsque ce fichier est supprimé. */
const APP = readFileSync(new URL("./LApplication.tsx", import.meta.url), "utf8");
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
describe("la page de l'application — la numérotation retirée", () => {
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

describe("la page de l'application — l'ordre des sections sert le lecteur", () => {
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

describe("🔴 6/11/2026 — la page de l'application est indexable, donc elle doit être ATTEIGNABLE", () => {
  const lire = (f: string) => readFileSync(new URL(f, import.meta.url), "utf8");
  const ROUTE = "/l-application";

  /* ⭐ UNE PAGE INDEXABLE QU'AUCUN LIEN NE DÉSIGNE EST UNE PAGE MORTE, et
     rien ne le dit : elle répond 200, elle a un titre, elle est jolie. Ce
     dépôt connaît la forme — « un écran orphelin ne se plaint jamais ». */
  /* 🔄 LE PIED NE S'ÉCRIT PLUS DANS LE JSX — 7/11. Ses liens viennent de
     `liensPied(visage())`, parce qu'ils doivent disparaître sur mana.love
     quand leur destination n'y est pas servie. On interroge donc la fonction
     qui décide, et sur LES DEUX visages : une page indexable qu'aucun lien
     interne ne désigne est une page que les moteurs trouvent mal. */
  it("le pied de page y mène, sur toutes les pages ET les deux visages", () => {
    for (const v of ["bzh", "love"] as const) {
      expect(liensPied(v).map((l) => l.chemin), `visage ${v}`).toContain(ROUTE);
    }
  });

  it("Réglages y mène aussi — le fondateur les y cherchera", () => {
    expect(lire("./Reglages.tsx")).toContain(`\${base}${ROUTE}\``);
  });

  /* 🔴 LE GARDE QUI COMPTE VRAIMENT. Une route sert sur mana.bzh seulement
     si TROIS listes s'accordent — le bloc Caddy, le service worker, le
     routeur — et le désaccord est muet dans les trois sens. `routes.ts` est
     la source ; `trois-listes.test.ts` tient les deux autres. Ici on exige
     seulement que la source la connaisse, car sans elle les deux autres
     n'ont rien à comparer et resteraient d'accord sur une absence. */
  it("la route est dans routes.ts, la source des trois listes", () => {
    expect(lire("./routes.ts")).toContain(`"${ROUTE}"`);
  });

  /* ⚠️ Un titre est ce qui paraît dans un résultat de recherche. Sans lui,
     la page dirait exactement la même chose que l'accueil — c'est le défaut
     corrigé le 1/11 sur cinq routes à la fois. */
  it("elle a un titre à elle, qui nomme le territoire", () => {
    const app = lire("./App.tsx");
    const m = app.match(new RegExp(`"${ROUTE}":\\s*"([^"]+)"`));
    expect(m, "pas de titre pour cette route").not.toBeNull();
    expect(m![1]).toMatch(/Crozon/);
    expect(m![1]).not.toBe("MANA.bzh");
  });

  /* ⛔ ET LE TEXTE NE DOIT EXISTER QU'À UNE SEULE ADRESSE. Le recopier dans
     Réglages aurait donné le même contenu sur deux URL — ce qui abîme
     précisément le référencement que ces sections servent. */
  it("Réglages y RENVOIE, il ne recopie pas le texte", () => {
    const reg = lire("./Reglages.tsx");
    expect(reg).not.toMatch(/16 210 tronçons/);
    expect(reg).not.toMatch(/708 km, sur 11 communes/);
  });
});
