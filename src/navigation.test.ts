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

describe("les cinq sections de l'accueil", () => {
  const app = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");

  /**
   * ⭐ CE QU'UN MOTEUR DE RÉPONSE SAIT EXTRAIRE, C'EST UNE PHRASE QUI RÉPOND.
   *    « Une expérience unique au cœur de la Bretagne » n'est citable par
   *    personne ; « 46 circuits balisés, 708 km, sur 11 communes » l'est.
   *    Ce test tient le VOLUME — une section qui retombe à deux lignes a
   *    perdu ce pour quoi elle a été écrite.
   */
  it("portent assez de matière pour être citées", () => {
    const textes = [...app.matchAll(/texte:\s*\n?\s*"([^"]{40,})"/g)].map((m) => m[1]);
    expect(textes.length).toBeGreaterThanOrEqual(4);
    for (const t of textes) expect(t.split(/\s+/).length, t.slice(0, 40)).toBeGreaterThan(45);
  });

  /**
   * ⛔ CHAQUE CHIFFRE A ÉTÉ COMPTÉ DANS L'ARTEFACT, PAS RAPPELÉ. Un nombre
   *    écrit de mémoire sur une page d'accueil est le faux témoin le plus
   *    coûteux qui soit : il est cité par des machines, et plus personne ne
   *    remonte à la source.
   * ⚠️ Ce test les RECOMPTE. S'il échoue, ce n'est pas lui qu'on corrige.
   */
  it("les chiffres cités correspondent aux artefacts", () => {
    const ot = JSON.parse(readFileSync(new URL("./ot.json", import.meta.url), "utf8"));
    const lx = JSON.parse(readFileSync(new URL("./lieux.json", import.meta.url), "utf8"));
    const km = Math.round(ot.itineraires.reduce((s: number, x: { km: number }) => s + x.km, 0));
    const communes = new Set(ot.itineraires.map((x: { commune?: string }) => x.commune).filter(Boolean));
    const nommes = lx.lieux.filter((l: { n?: string }) => l.n).length;
    const parCat = (nom: string) =>
      lx.lieux.filter((l: { c: string }) => lx.libelles[l.c] === nom).length;

    expect(app).toContain(`${ot.itineraires.length} circuits balisés`);
    expect(app).toContain(`${km} km`);
    expect(app).toContain(`${communes.size} communes`);
    expect(app).toContain("1 358 sites");
    expect(lx.lieux.length).toBe(1358);
    expect(app).toContain(`${nommes} portent un nom`);
    expect(app).toContain(`${parCat("Fortification")} fortifications`);
    expect(app).toContain(`${parCat("Plage")} plages`);
    expect(app).toContain(`${parCat("Mégalithe")} mégalithes`);
  });

  /**
   * 🔴 CE FICHIER A ANNONCÉ PENDANT TROIS JOURS DES FILTRES RETIRÉS — et ils
   *    avaient été retirés précisément pour que personne ne parte en
   *    poussette sur un sentier de falaise. ⭐ Une suppression se fait dans le
   *    code ET dans ce qui la promet.
   */
  it("ne promettent rien que l'application ne fasse", () => {
    /* ⚠️ SUR LE CODE DÉPOUILLÉ, pas sur le fichier brut. Première version :
       elle a crié sur « poussette » écrit dans le COMMENTAIRE qui raconte le
       retrait — quatrième fois cette nuit qu'un commentaire répond à la
       place du code. ⭐ Le helper `nu()` existait déjà en haut de ce
       fichier : l'oublier une fois de plus n'est pas une étourderie, c'est
       que le réflexe n'est pas encore pris. */
    const net = nu("./App.tsx");
    for (const mort of [/poussette/i, /\bPMR\b/, /accessible aux chiens/i, /temps réel/i]) {
      expect(net, String(mort)).not.toMatch(mort);
    }
  });
});

describe("le titre de l'accueil", () => {
  /* ⭐ UN TITRE ARRÊTÉ PAR LE FONDATEUR EST UNE RÈGLE DE PRODUIT, et une règle
     de produit vaut mieux en test qu'en commentaire. Le texte précédent
     (« Bienvenue en Bretagne ») portait au-dessus de lui un commentaire disant
     « TEXTE ARRÊTÉ LE 1/11/2026 PAR LE FONDATEUR » : il n'a rien empêché, et
     il ne pouvait rien empêcher. Celui-ci échoue.
     ⚠️ Il tient le TEXTE et les DEUX LIGNES, pas la mise en forme : la coupe
     manuelle est ce qui tient le titre sur un téléphone, là où
     `text-wrap: balance` le laisse flotter d'un rendu à l'autre. */
  const src = nu("./Invitation.tsx");

  it("dit « Au cœur de la Bretagne », en deux lignes voulues", () => {
    const h1 = src.match(/<h1[^>]*className="inv-titre"[^>]*>([\s\S]*?)<\/h1>/);
    expect(h1, "le h1.inv-titre de l'accueil").not.toBeNull();
    const brut = h1![1];
    expect(brut).toMatch(/<br\s*\/?>/);
    expect(brut.replace(/<br\s*\/?>/g, " ").replace(/\s+/g, " ").trim())
      .toBe("Au cœur de la Bretagne");
  });
});
