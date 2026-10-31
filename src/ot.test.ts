import { describe, it, expect } from "vitest";
import recueil from "./ot.json";
import type { Recueil } from "./ot";
import { MENTION } from "./walks";

const r = recueil as unknown as Recueil;

/**
 * ⛔ CE FICHIER TIENT CE QU'ON A LE DROIT DE DIRE DE LA DONNÉE D'UN TIERS.
 *    Les tracés sont ceux de l'Office de tourisme. MANA les affiche, les
 *    crédite, et renvoie à leur fiche — elle ne se les attribue pas et ne les
 *    recommande pas.
 */
describe("les itinéraires de l'Office", () => {
  it("46 retenus — les 3 fichiers cassés restent dehors", () => {
    expect(r.itineraires).toHaveLength(46);
    const slugs = r.itineraires.map((i) => i.slug);
    // ⛔ Celui-ci contient DEUX tracés : le sien et celui du Faou, 23 km plus
    //    loin. 48,5 km au lieu de 14. Le laisser entrer dessinerait une ligne
    //    en travers de la presqu'île sous un libellé « balisé ».
    expect(slugs).not.toContain("le-tour-du-cap-de-la-chevre");
    expect(slugs).not.toContain("presquile-voies-vertes");   // 112 tracés
    expect(slugs).not.toContain("circuit-vtt-radio-kimerch"); // écart 42 %
  });

  it("chacun porte un tracé, un lien vers la fiche de l'Office, et un GPX", () => {
    for (const i of r.itineraires) {
      expect(i.p.length, i.slug).toBeGreaterThan(20);
      expect(i.source, i.slug).toMatch(/^https:\/\/www\.crozon-tourisme\.bzh\/itineraire\//);
      expect(i.gpx, i.slug).toMatch(/\.gpx$/);
      expect(i.km, i.slug).toBeGreaterThan(0.5);
    }
  });

  it("⛔ aucun tracé ne dépasse l'emprise de la communauté de communes", () => {
    // Le garde qui aurait arrêté « Le tour du Cap de la chèvre » tout seul.
    //
    // ⚠️ IL FAISAIT 50 174 `expect()` — quatre par point, sur 12 543 points —
    //    et il a fini par DÉPASSER les cinq secondes de vitest : un échec
    //    intermittent, sur un test qui passait seul. ⭐ Cinquante mille
    //    assertions ne disent rien de plus que quatre, elles coûtent
    //    seulement le temps de les compter. On balaie, puis on affirme — et
    //    le message nomme le fautif, ce que la boucle ne faisait pas mieux.
    const hors: string[] = [];
    for (const i of r.itineraires) {
      for (const [lon, lat] of i.p) {
        if (lon <= -4.70 || lon >= -4.00 || lat <= 48.10 || lat >= 48.40) {
          hors.push(`${i.slug} → ${lon},${lat}`);
          break;
        }
      }
    }
    expect(hors).toEqual([]);
  });

  it("⛔ l'artefact ne dit nulle part que l'Office RECOMMANDE MANA", () => {
    const tout = JSON.stringify(r).toLowerCase();
    expect(tout).not.toMatch(/recommand|approuv|partenaire officiel|valid[ée] par/);
  });

  it("⚠️ l'avertissement sur l'accord de reprise VOYAGE avec la donnée", () => {
    // ⭐ Même règle que l'attribution ODbL : un artefact se promène sans sa
    //    page. Si la reprise doit être retirée, il faut pouvoir la retrouver.
    expect(r.avertissement).toMatch(/accord/i);
    expect(r.source).toMatch(/Office de tourisme/i);
  });

  it("la mention affichée est celle du rang `ot`", () => {
    expect(MENTION.ot).toMatch(/balisé par l'Office de tourisme/i);
  });
});

describe("ce que l'Office déclare", () => {
  /**
   * ⭐ LA DURÉE ET LE DÉNIVELÉ SONT LEUR PAROLE, PAS NOTRE CALCUL. Une durée
   *    sortie d'une formule, affichée sous « balisé par l'Office », leur
   *    ferait endosser notre arithmétique.
   * ⛔ Et le dénivelé ne vient pas du GPX : les 552 balises `<ele>` du
   *    « Sentier du Menhir » valent toutes 0.0.
   */
  it("la durée a la forme que l'Office écrit", () => {
    for (const w of recueil.itineraires) {
      if (w.duree === null) continue;
      expect(w.duree, w.slug).toMatch(/^\d{1,2}h(\d{2})?$|^\d{1,3}min$/);
    }
  });

  it("le dénivelé est un nombre de mètres plausible", () => {
    for (const w of recueil.itineraires) {
      if (w.denivele === null) continue;
      expect(w.denivele, w.slug).toBeGreaterThan(0);
      expect(w.denivele, w.slug).toBeLessThan(2000);
    }
  });

  /**
   * 🔴 UN CHAMP VIDE SUR LES 46 N'EST PAS UNE DONNÉE MANQUANTE, C'EST UNE
   *    EXTRACTION FAUSSE — vécu deux fois sur la commune. Une absence VRAIE
   *    manque à quelques-uns, pas à tous. Le pipeline refuse d'écrire dans ce
   *    cas ; ce test tient l'artefact déjà écrit.
   * ⚠️ Et le seuil n'est pas « tous » : 6 fiches sur 46 ne donnent vraiment
   *    pas de durée, 2 pas de dénivelé. On exige une MAJORITÉ.
   */
  it("les chiffres de l'Office sont présents sur la plupart des fiches", () => {
    const n = recueil.itineraires.length;
    expect(recueil.itineraires.filter((w) => w.duree).length).toBeGreaterThan(n / 2);
    expect(recueil.itineraires.filter((w) => w.denivele != null).length).toBeGreaterThan(n / 2);
  });
});
