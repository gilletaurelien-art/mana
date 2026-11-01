import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const nu = (f: string) =>
  readFileSync(new URL(f, import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n").filter((l) => !/^\s*(\/\/|\*)/.test(l)).join("\n");

const routeur = nu("./router.ts");
const poste = nu("./poste.ts");

describe("la navigation interne", () => {
  /**
   * 🔴 « FAIRE QUE LA RADIO FONCTIONNE PARTOUT » N'EST PAS UNE AFFAIRE DE
   *    LECTEUR AUDIO, C'EST UNE AFFAIRE DE NAVIGATION. Chaque lien était un
   *    rechargement complet : aucun élément ne survit à ça, où qu'on le
   *    place. Le flux s'arrêtait parce que le DOCUMENT mourait.
   */
  it("navigue sans recharger", () => {
    expect(routeur).toMatch(/history\.pushState/);
    expect(routeur).toMatch(/addEventListener\("popstate"/);
  });

  /**
   * ⛔ ON NE DÉTOURNE PAS TOUT CE QUI RESSEMBLE À UN LIEN. Chacune de ces
   *    exceptions est un geste qu'on casse si on l'oublie — et qui ne se voit
   *    pas tant qu'on ne l'essaie pas soi-même : ouvrir dans un onglet, le
   *    clic du milieu, une fiche de l'Office, un `mailto:`.
   */
  it("laisse au navigateur les gestes qui lui appartiennent", () => {
    for (const geste of [
      /e\.button !== 0/,          // clic du milieu, clic droit
      /metaKey/, /ctrlKey/, /shiftKey/, /altKey/,
      /lien\.target && lien\.target !== "_self"/,
      /hasAttribute\("download"\)/,
      /startsWith\("#"\)/,
      /\(mailto\|tel\|sms\)/,
      /defaultPrevented/,
    ]) expect(routeur, String(geste)).toMatch(geste);
  });

  /**
   * ⛔ LES URL NE CHANGENT PAS DE NATURE. Elles restent réelles, prérendues,
   *    partageables : `pushState` écrit la MÊME adresse que le lien. Un
   *    routeur qui inventerait des adresses casserait le référencement.
   */
  it("écrit l'adresse du lien, pas une adresse à lui", () => {
    expect(routeur).toMatch(/pushState\(null, "", u\.href\)/);
    expect(routeur).toMatch(/u\.origin !== window\.location\.origin/);
  });
});

describe("le poste de radio", () => {
  /**
   * ⭐ UN SEUL ÉLÉMENT, HORS DE REACT. Deux `<audio>` sur la même source, ce
   *    sont deux connexions au flux, deux factures de données mobiles — et
   *    sur un DIRECT, deux instants différents de la même antenne.
   */
  it("vit hors de l'arbre React, en un seul exemplaire", () => {
    expect(poste).toMatch(/document\.createElement\("audio"\)/);
    expect(poste).toMatch(/if \(element\) return element/);
    expect(poste).toMatch(/document\.body\.appendChild/);
    // ⛔ et l'écran ne crée plus le sien
    expect(nu("./Radio.tsx")).not.toMatch(/<audio/);
  });

  /**
   * ⚠️ `pause()` NE FERME PAS LA CONNEXION : le flux continue d'être
   *    téléchargé en arrière-plan. Sur un forfait de terrain, c'est une
   *    facture ; et un direct ne se reprend pas là où on l'a laissé.
   */
  it("coupe vraiment la connexion, il ne met pas en pause", () => {
    const c = poste.slice(poste.indexOf("export function couper"));
    expect(c).toMatch(/removeAttribute\("src"\)/);
    expect(c).toMatch(/\.load\(\)/);
  });

  /**
   * ⭐ LE CASQUE DÉBRANCHÉ, L'APPEL ENTRANT ET LE CONTRÔLE DU SYSTÈME mettent
   *    en pause sans passer par nous. Sans cet écouteur, la façade afficherait
   *    « en lecture » sur un poste muet.
   */
  it("écoute les pauses qui ne viennent pas de nous", () => {
    expect(poste).toMatch(/addEventListener\("pause"/);
  });
});
