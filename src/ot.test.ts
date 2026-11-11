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
describe("les itinéraires des Offices", () => {
  /* 🔄 TESTS RETOURNÉS LE 11/11/2026 — le recueil est passé de UN office à
     TROIS (Crozon, Pays des Abers, Côte des Légendes). Ils figeaient « 46 »,
     le domaine de Crozon et l'emprise de la seule CCPCAM : trois valeurs
     justes le jour de leur écriture, et trois faux témoins le lendemain.
     ⭐ Ce qu'ils protégeaient reste vrai sous une autre forme, et c'est cette
     forme qui compte : chaque tracé doit venir d'un office DÉCLARÉ, rester
     dans l'emprise de CET office, et les fichiers cassés doivent rester
     dehors. Le nombre, lui, n'était qu'un témoin. */

  it("⚠️ témoin daté : 116 retenus sur 130 au 11/11/2026 — à recompter, pas à croire", () => {
    /* 🔄 46 le 31/10 · 77 à trois offices · 116 à cinq, le même jour. ⭐ Un
       témoin daté se met à jour sans drame — c'est tout l'intérêt de le
       NOMMER témoin plutôt que de le faire passer pour une règle. */
    expect(r.itineraires.length).toBe(116);
  });

  it("⛔ les fichiers cassés restent dehors — chacun pour un motif nommé", () => {
    const slugs = r.itineraires.map((i) => i.slug);
    // ⛔ DEUX tracés : le sien et celui du Faou, 23 km plus loin. 48,5 km au
    //    lieu de 14 — une ligne en travers de la presqu'île sous « balisé ».
    expect(slugs).not.toContain("le-tour-du-cap-de-la-chevre");
    expect(slugs).not.toContain("presquile-voies-vertes");   // 112 tracés
    expect(slugs).not.toContain("circuit-vtt-radio-kimerch"); // écart 42 %
    // ⛔ Les trois des nouveaux offices : une véloroute de 84 km d'étendue qui
    //    traverse trois intercommunalités, son étape sœur hors emprise, et
    //    une fiche sans GPX du tout.
    expect(slugs).not.toContain("velo-route-littorale-v45");
    expect(slugs).not.toContain("v45-velo-route-littorale-etape-plouguerneau-portsall");
    expect(slugs).not.toContain("boucle-de-la-foulee-verte");
  });

  it("les cinq offices sont déclarés, et chaque tracé vient de l'un d'eux", () => {
    expect(r.offices.map((o) => o.ot).sort())
      .toEqual(["abers", "crozon", "iroise", "landerneau", "legendes"]);
    const sites = new Map(r.offices.map((o) => [o.ot, o.site]));
    for (const i of r.itineraires) {
      const site = sites.get(i.ot);
      expect(site, `${i.slug} : office « ${i.ot} » non déclaré`).toBeTruthy();
      expect(i.source, i.slug).toBe(`${site}/itineraire/${i.slug}/`);
    }
  });

  it("chacun porte un tracé, un lien vers la fiche de son Office, et un GPX", () => {
    for (const i of r.itineraires) {
      expect(i.p.length, i.slug).toBeGreaterThan(20);
      expect(i.gpx, i.slug).toMatch(/\.gpx$/);
      expect(i.km, i.slug).toBeGreaterThan(0.5);
    }
  });

  it("⛔ aucun tracé ne dépasse l'emprise de SON office", () => {
    // Le garde qui aurait arrêté « Le tour du Cap de la chèvre » tout seul.
    //
    // 🔄 RETOURNÉ : il tenait l'emprise de la seule CCPCAM, et les tracés des
    //    Abers et de la Côte des Légendes en sont tous dehors — le test
    //    aurait accusé 31 tracés justes. L'emprise voyage donc avec l'office
    //    dans l'artefact, et le garde la lit là.
    //
    // ⚠️ IL FAISAIT 50 174 `expect()` — quatre par point, sur 12 543 points —
    //    et il a fini par DÉPASSER les cinq secondes de vitest : un échec
    //    intermittent, sur un test qui passait seul. ⭐ Cinquante mille
    //    assertions ne disent rien de plus que quatre, elles coûtent
    //    seulement le temps de les compter. On balaie, puis on affirme — et
    //    le message nomme le fautif, ce que la boucle ne faisait pas mieux.
    const emprises = new Map(r.offices.map((o) => [o.ot, o.emprise]));
    const hors: string[] = [];
    for (const i of r.itineraires) {
      const e = emprises.get(i.ot);
      if (!e) { hors.push(`${i.slug} → office « ${i.ot} » sans emprise`); continue; }
      const [ouest, sud, est, nord] = e;
      for (const [lon, lat] of i.p) {
        if (lon <= ouest || lon >= est || lat <= sud || lat >= nord) {
          hors.push(`${i.slug} (${i.ot}) → ${lon},${lat}`);
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
    /* ⚠️ `Offices?` : l'artefact en nomme TROIS depuis le 11/11/2026 et sa
       phrase commence par « Offices de tourisme : » — le motif au singulier ne
       mordait plus, pour un `s`. */
    expect(r.source).toMatch(/Offices? de tourisme/i);
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
  it("🔴 les chiffres sont présents PAR OFFICE, et seulement ceux que l'office publie", () => {
    /* 🔄 RETOURNÉ LE 11/11/2026, et c'est le retournement le plus utile du
       lot. La version globale exigeait une majorité sur l'ENSEMBLE : les 44
       dénivelés de Crozon couvraient les 0 de la Côte des Légendes, et un
       office entier pouvait arriver sans chiffres sous un total rassurant.
       ⭐ Agréger trois sources, c'est se donner le moyen de ne plus voir
       laquelle est cassée — le garde doit descendre au niveau où la source
       existe encore.
       ⚠️ Et la Côte des Légendes ne publie AUCUN dénivelé : vérifié sur sa
       fiche « Circuit du phare », qui ne porte que distance, durée et
       difficulté. C'est une absence VRAIE, déclarée dans `publie` — un garde
       ne sait pas distinguer « la source se taît » de « on lit mal », seul le
       regard sur la source tranche, donc son résultat s'écrit. */
    for (const o of r.offices) {
      const f = r.itineraires.filter((i) => i.ot === o.ot);
      expect(f.length, o.ot).toBeGreaterThan(0);
      for (const champ of ["duree", "denivele", "difficulte"] as const) {
        const n = f.filter((i) => i[champ] != null && i[champ] !== "").length;
        if (o.publie.includes(champ)) {
          expect(n, `${o.ot} · ${champ} : ${n}/${f.length} — un office qui PUBLIE ce champ et n’en rend aucun, c’est une extraction fausse`)
            .toBeGreaterThan(0);
        } else {
          expect(n, `${o.ot} · ${champ} : ${n} rendus alors que l’office ne le publie pas — la déclaration est à revoir`)
            .toBe(0);
        }
      }
    }
  });
});
