import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { MOT_CLEF_OFFICE } from "./ot";
import recueil from "./ot.json";

/* ⚠️ LES COMMENTAIRES SONT RETIRÉS AVANT TOUTE LECTURE DE RÈGLE. Celui qui
   explique la correction ci-dessous CITE `.ot-item` et `color: var(--bulle-`
   pour dire pourquoi on ne les emploie plus : un garde posé sur le texte brut
   se serait accusé lui-même. C'est le piège du `grep` de `guardedAnswer` au
   tronc, où quatre fichiers parlent du garde pour expliquer qu'ils n'en ont
   pas besoin. */
const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "");
const ecran = readFileSync(new URL("./BaladesOT.tsx", import.meta.url), "utf8")
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

/* La même arithmétique que `charte.test.ts` — dix lignes de WCAG, recopiées
   plutôt qu'exportées : c'est une formule, pas une décision. Une formule ne
   vieillit pas ; une table de couleurs, si — et celles-ci sont LUES dans
   `tokens.css`, jamais écrites ici. */
const lum = (hex: string) => {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};
const ratio = (a: string, b: string) => {
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const jeton = (nom: string) => {
  const m = readFileSync(new URL("./tokens.css", import.meta.url), "utf8")
    .match(new RegExp(`--${nom}:\\s*(#[0-9a-f]{6})`, "i"));
  expect(m, `le jeton --${nom}`).not.toBeNull();
  return m![1];
};

/**
 * 🔴 CE FICHIER NAÎT D'UNE CAPTURE D'ÉCRAN — 12/11/2026 : « afficher les
 *    libellés de chaque circuit en vert kaki car là ils sont illisibles ».
 *
 * ⛔ ET « ILLISIBLE » ÉTAIT UNE MESURE, PAS UNE IMPRESSION. La ligne de faits
 *    rendait de la craie (`#e9e7d8`) sur un panneau blanc à 55 % : 1,24 pour
 *    1. Le survol du titre rendait `--bulle-action` : 1,26 — c'est l'entrée
 *    pâle qu'on voit sur la capture, et ce n'était pas un défaut
 *    d'affichage, c'était la souris posée dessus.
 * ⭐ LA CAUSE EST TOUJOURS LA MÊME DANS CE DÉPÔT : un jeton nommé pour le
 *    verre SOMBRE des bulles, employé là où le fond est CLAIR. La feuille
 *    l'écrit déjà deux fois — « le ton ne se choisit pas au composant mais
 *    au FOND ». Ce test le tient au lieu de l'écrire une troisième fois.
 */
describe("les balades des Offices — la liste se lit", () => {
  it("⛔ les deux couleurs de la liste tiennent 4,5 sur un panneau clair", () => {
    /* ⚠️ LE PIRE CAS EST LE BLANC. Le panneau est blanc à 55 % posé sur
       l'ivoire : sa couleur composite est entre les deux, donc toujours plus
       sombre que le blanc pur. Mesurer contre le blanc, c'est mesurer contre
       le fond le plus défavorable — si ça passe là, ça passe partout. */
    const blanc = "#ffffff";
    expect(ratio(jeton("kaki"), blanc), "la ligne de faits").toBeGreaterThanOrEqual(4.5);
    expect(ratio(jeton("ocre-sombre"), blanc), "le titre au survol").toBeGreaterThanOrEqual(4.5);
    /* ⛔ ET LES DEUX COUPABLES RESTENT NOMMÉS. S'ils repassaient un jour le
       seuil, ce test deviendrait faux et il faudrait le RELIRE plutôt que de
       le supprimer — c'est la règle de ce dépôt pour les tests retournés. */
    expect(ratio(jeton("bulle-action"), blanc), "--bulle-action est redevenu lisible ici")
      .toBeLessThan(4.5);
  });

  it("⛔ aucune règle de la liste ne reprend un jeton de bulle comme COULEUR", () => {
    /* ⚠️ `color:` seulement — une bordure ou un fond empruntés au verre des
       bulles restent légitimes ; aucun seuil de lisibilité ne s'y applique.
       Un garde qui ne distingue pas la propriété condamne le bon geste avec
       le mauvais (leçon de `charte.test.ts`, même piège). */
    const regles = css.split("}")
      .filter((r) => /\.ot-item/.test(r.split("{")[0] ?? ""))
      .filter((r) => /(^|[^-\w])color:\s*var\(--bulle-/.test(r))
      .map((r) => r.split("{")[0].trim());
    expect(regles, `règles fautives : ${regles.join(" / ")}`).toEqual([]);
  });

  it("⭐ les pays proposés sont DÉRIVÉS de l'artefact, pas écrits dans l'écran", () => {
    /* 🔴 Le recueil est passé d'un office à trois puis à cinq en huit jours.
       Une liste recopiée dans cet écran aurait vieilli à chaque ajout, sans
       bruit — c'est le faux témoin que ce dépôt traque partout. */
    expect(ecran, "l'écran ne lit pas la table des offices").toMatch(/r\.offices/);
    for (const clef of Object.keys(MOT_CLEF_OFFICE)) {
      expect(ecran, `« ${clef} » est écrit en dur dans l'écran`)
        .not.toMatch(new RegExp(`["'\`]${clef}["'\`]`));
    }
  });

  it("⚠️ chaque office du recueil a au moins un circuit", () => {
    /* ⭐ C'est la PRÉMISSE du filtre : on ne propose que les pays qui ont des
       circuits, parce qu'un bouton qui rend une liste vide est un cul-de-sac
       — il a l'air de marcher et ne mène nulle part. Si cette prémisse
       devenait fausse, le filtre se tairait sur un office en silence, et
       c'est ici qu'on veut l'apprendre. */
    const r = recueil as unknown as {
      offices: { ot: string; nom: string }[];
      itineraires: { ot: string }[];
    };
    for (const o of r.offices) {
      const n = r.itineraires.filter((i) => i.ot === o.ot).length;
      expect(n, `« ${o.nom} » n'a aucun circuit dans le recueil`).toBeGreaterThan(0);
    }
    /* ⛔ Et chaque office porte son mot court, sinon la pastille affiche un
       nom d'office entier et la rangée de filtres déborde. */
    for (const o of r.offices) {
      expect(MOT_CLEF_OFFICE[o.ot], `« ${o.ot} » n'a pas de mot court`).toBeTruthy();
    }
  });

  it("⛔ tout ce qui commande vit DANS la bannière, rien ne traîne sous elle", () => {
    /* 🔴 12/11/2026 : « tous les textes sous la bannière verte doivent migrer
       dans la bannière verte ». ⭐ On garde la RÈGLE, pas une capture : les
       deux groupes de filtres sont entre l'ouverture et la fermeture du
       `<header>`, et le panneau qui suit ne porte plus que la liste. */
    const entete = ecran.slice(ecran.indexOf("<header"), ecran.indexOf("</header>"));
    expect(entete, "le filtre des pays a quitté la bannière").toContain('aria-label="Pays"');
    expect(entete, "le filtre des pratiques a quitté la bannière").toContain('aria-label="Pratique"');
    const apres = ecran.slice(ecran.indexOf("</header>"));
    expect(apres, "un groupe de filtres est resté sous la bannière").not.toContain("ot-filtres");
  });

  it("⛔ plus de redondance : un seul compte, et « Office » n'est plus écrit trois fois", () => {
    /* ⚠️ LA REDONDANCE SE COMPTAIT, elle ne se jugeait pas : le nombre de
       circuits paraissait DEUX fois à quatre centimètres d'écart, et
       « Office de tourisme » TROIS fois au-dessus de la liste — surtitre,
       titre, mention de provenance.
       ⭐ Ce garde compte dans le RENDU, commentaires retirés : c'est la seule
          lecture qui corresponde à ce qu'on voit. */
    const rendu = ecran.slice(ecran.indexOf("return ("));
    expect([...rendu.matchAll(/circuit\{/g)].length, "le compte est écrit plus d'une fois")
      .toBe(1);
    expect(rendu, "le surtitre « Office de tourisme » est revenu")
      .not.toMatch(/hero-label/);
    /* 🔴 LA PHRASE DE PROVENANCE EST PARTIE LE 12/11, sur demande — et ce
       garde est RETOURNÉ plutôt que supprimé, parce que ce qu'il protégeait
       reste vrai sous une autre forme. `ot.ts` porte `⛔ CE NE SONT PAS DES
       ITINÉRAIRES MANA` : ce n'est pas une phrase qu'il faut, c'est que
       chaque entrée RENVOIE à l'Office qui l'entretient.
       ⭐ Une phrase se supprime d'un geste ; un lien par entrée se verrait
          manquer. On garde donc le MÉCANISME, qui est plus solide que le
          texte qu'on vient d'enlever. */
    expect(rendu, "le titre ne nomme plus les Offices")
      .toMatch(/Les balades des Offices de Tourisme/);
    expect(rendu, "une entrée de la liste ne renvoie plus à sa fiche d'origine")
      .toMatch(/href=\{i\.source\}/);
  });

  it("⭐ les deux filtres ouvrent sur « tous » — aucun n'exclut au démarrage", () => {
    /* 🔴 Demande du fondateur, 12/11 : « par défaut = tous les pays + Tous ».
       ⚠️ Et ce n'est pas qu'une préférence : ce dépôt a déjà payé un défaut
          qui exclut. Le filtre de durée du compositeur plafonnait à 24 h et
          cachait PAR DÉFAUT les dix-sept plus longs itinéraires — la page
          annonçait 1 032 et en montrait 1 015. Un filtre dont la valeur
          initiale exclut ne paraît pas trop serré : il fait croire que le
          reste n'existe pas. */
    expect(ecran).toMatch(/setPratique\] = useState<[^>]*>\("tous"\)/);
    expect(ecran).toMatch(/setPays\] = useState<string>\("tous"\)/);
  });

  it("⛔ les pastilles de la bannière portent une couleur, elles ne l'héritent pas", () => {
    /* 🔴 TROISIÈME FOIS POUR `.ot-filtre`, et la plus coûteuse si elle était
       passée. La règle porte `color: inherit` ; montées dans la bannière
       KAKI, les pastilles auraient hérité de `.page-composer { color:
       var(--nuit) }` — du bleu nuit sur du vert sombre, c'est-à-dire des
       boutons peints et invisibles. C'est exactement ce qui est arrivé aux
       vingt-trois genres de `.terr-calques` le 4/11.
       ⭐ `inherit` n'est pas une valeur neutre, c'est une DÉLÉGATION : elle
          change de réponse quand le composant change de parent. */
    expect(css, "les pastilles de la bannière héritent encore leur couleur")
      .toMatch(/\.ot-entete \.ot-filtre \{[^}]*color: var\(--craie\)/);
    const blanc = "#ffffff";
    void blanc;
    expect(ratio(jeton("craie"), jeton("kaki")), "craie sur kaki").toBeGreaterThanOrEqual(4.5);
  });

  it("⛔ un croisement vide se DIT, il ne se laisse pas lire comme une panne", () => {
    /* « VTT » + « Abers » rend zéro circuit. Sans phrase, la liste disparaît
       et l'écran ressemble à un chargement qui n'a pas abouti — mesuré à
       l'écran avant d'écrire ce garde. */
    expect(ecran).toMatch(/visibles\.length === 0/);
    expect(ecran).toMatch(/Aucun circuit ne réunit ces deux choix/);
  });

  it("⚠️ LE compte dit ce qu'on VOIT, et il n'y en a plus qu'un", () => {
    /* 🔴 RETOURNÉ LE MÊME JOUR QUE SON ÉCRITURE, et c'est instructif. Écrit
       le matin, il gardait DEUX nombres qui disaient deux choses : le total
       du recueil dans la bannière, la vue filtrée sous elle. Le fondateur a
       tranché l'après-midi — « il y a de la redondance : simplifie » — et
       les deux surfaces ont fusionné.
       ⭐ CE QUI SURVIT EST LA MOITIÉ QUI COMPTE : le nombre affiché doit
          suivre ce qu'on voit. Un compte qui annonce le total au-dessus
          d'une liste filtrée se contredit dès qu'on touche un filtre, et
          c'est le nombre AFFICHÉ qu'on lit, jamais celui du recueil. */
    expect(ecran, "le compte ne suit pas la vue").toMatch(/visibles\.length\} circuit/);
    expect(ecran, "le total du recueil est réapparu à côté de la vue")
      .not.toMatch(/\{ot\.length\} circuit/);
    expect(ecran, "l'étiquette fige encore « Tous les circuits »")
      .not.toContain("Tous les circuits");
  });
});
