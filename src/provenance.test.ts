import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { MENTION, WALKS } from "./walks";
import type { Provenance } from "./walks";
import { enGpx } from "./Promenade";

/**
 * ⛔ CE FICHIER TIENT UNE RÈGLE DE SÉCURITÉ, PAS UNE RÈGLE DE STYLE.
 *
 * Quelqu'un qui suit une boucle NON BALISÉE sur le sentier côtier doit
 * l'apprendre avant de partir. Les quatre mentions existaient d'abord en
 * commentaire ; un interdit en docstring se franchit sans le savoir.
 */
describe("qui répond de ce tracé", () => {
  it("les quatre rangs ont une mention, et aucune n'est vide", () => {
    const rangs: Provenance[] = ["ot", "mana", "osm", "compose"];
    for (const r of rangs) expect(MENTION[r].length).toBeGreaterThan(10);
  });

  it("⛔ aucune mention n'affirme que l'Office RECOMMANDE MANA", () => {
    // « recommande » est un avis sur un tiers : il se retire, il vieillit, et
    // il dit que l'Office adoube MANA. « balisé par » est un fait qu'on
    // constate sur un poteau.
    for (const m of Object.values(MENTION)) {
      expect(m.toLowerCase()).not.toMatch(/recommand|approuv|valid[ée]|partenaire officiel/);
    }
  });

  it("⛔ seul le rang `ot` emploie le mot « balisé » au positif", () => {
    expect(MENTION.ot).toMatch(/balisé/i);
    expect(MENTION.mana).not.toMatch(/balisé/i);
    // les deux autres ne le promettent pas : l'un le nie, l'autre le dit inconnu
    expect(MENTION.compose).toMatch(/non balisé/i);
    expect(MENTION.osm).toMatch(/non vérifié/i);
  });

  it("une promenade composée dit NON BALISÉ, jamais le contraire", () => {
    expect(MENTION.compose).toMatch(/non balisé/i);
    expect(MENTION.compose).toMatch(/MANA/);
  });

  it("les quatre promenades embarquées déclarent leur rang", () => {
    expect(WALKS.length).toBeGreaterThan(0);
    for (const w of WALKS) {
      expect(w.provenance, w.slug).toBeDefined();
      // ⛔ aucune ne peut se déclarer balisée par l'Office : nous n'avons pas
      //    leurs tracés. Le jour où on les aura, ce test se RETOURNE.
      expect(w.provenance, w.slug).not.toBe("ot");
    }
  });

  it("la mention VOYAGE dans le GPX, pas seulement à l'écran", () => {
    // ⭐ Même règle que l'attribution ODbL : un fichier exporté se promène
    //    sans sa page. La mention doit être DANS le <desc>.
    const src = readFileSync(new URL("./Promenade.tsx", import.meta.url), "utf8");
    const gpx = src.slice(src.indexOf("function enGpx"), src.indexOf("function telecharger"));
    expect(gpx).toContain("MENTION[walk.provenance]");
  });

  it("les deux écrans qui décident d'un départ portent la mention", () => {
    for (const f of ["./FichePromenade.tsx", "./Promenade.tsx"]) {
      const src = readFileSync(new URL(f, import.meta.url), "utf8");
      expect(src, f).toContain("MENTION[walk.provenance]");
    }
  });

  /**
   * 🔴 L'ATTRIBUTION DES FONDS DE CARTE N'A PLUS QU'UNE ADRESSE — 4/11/2026.
   *    Les trois cartes de l'app portent `attributionControl: false` : aucune
   *    ne nomme ses fournisseurs à l'écran. `/carte` a fait l'exception un
   *    jour, et sa mention est sortie RECOUVERTE par la barre flottante —
   *    illisible, donc inutile à tout le monde. L'arbitrage du fondateur :
   *    une seule page porte les sources, pour tout le site.
   * ⛔ CE QUI REND CE TEST NÉCESSAIRE : `/reglages` est devenu PORTEUR sans
   *    en avoir l'air. Rien dans cette page ne dit qu'elle est la dernière
   *    à nommer l'ODbL ; quelqu'un qui la raccourcit — ou qui remplace la
   *    liste des sources par « voir la carte » — retirerait l'attribution de
   *    l'application ENTIÈRE sans qu'aucune carte ne change d'un pixel.
   * ⭐ C'est le cas exact où une description fidèle occupe la place d'un
   *    garde : le commentaire posé dans `Territoire2030.tsx` décrit
   *    parfaitement la situation, et n'aurait arrêté personne.
   */
  it("🔴 l'attribution des fonds de carte a une adresse, et c'est /reglages", () => {
    const reglages = readFileSync(new URL("./Reglages.tsx", import.meta.url), "utf8");
    for (const source of ["OpenStreetMap", "ODbL", "IGN", "Géoplateforme"]) {
      expect(
        reglages,
        `/reglages ne nomme plus « ${source} » — or c'est la seule page de l'app qui le fasse`,
      ).toContain(source);
    }

    // ⚠️ Et la prémisse se vérifie, elle aussi : si une carte se remettait à
    //    porter sa propre attribution, cette page cesserait d'être l'unique
    //    porteuse — ce test n'aurait plus le même sens, et il doit le dire.
    // 🔴 EN ÉCARTANT LES COMMENTAIRES, ET CE N'EST PAS UN DÉTAIL. Écrit
    //    d'abord en `toContain("attributionControl: false")`, ce garde a
    //    PASSÉ la mutation qui rallumait le contrôle : le commentaire posé
    //    juste au-dessus, qui EXPLIQUE pourquoi les trois cartes le coupent,
    //    contient les mêmes mots et répondait à la place du code.
    // ⭐ Une prose fidèle est le pire des faux témoins : elle dit vrai, au
    //    mot près, sur un état qui n'est plus. Même leçon que le `grep` des
    //    porteurs de `guardedAnswer()` dans CLAUDE.md, qui compte treize
    //    fichiers au lieu de neuf si l'on ne filtre pas les commentaires.
    const sansCommentaires = (s: string) =>
      s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for (const f of ["./Territoire2030.tsx", "./CarteReelle.tsx", "./CarteFondOT.tsx"]) {
      const code = sansCommentaires(readFileSync(new URL(f, import.meta.url), "utf8"));
      expect(code, `${f} ne coupe plus son attribution : relire ce garde`)
        .toContain("attributionControl: false");
      expect(code, `${f} rallume une attribution à l'écran : relire ce garde`)
        .not.toMatch(/attributionControl:\s*(\{|true)/);
    }
  });
});

/* ════════════════════════════════════════════════════════════════════════
   CE QUE LE FICHIER DIT, PAS CE QUE LE CODE A L'AIR DE DIRE
   ════════════════════════════════════════════════════════════════════════

   🔴 LES GARDES DU GPX LISAIENT LA SOURCE, et c'est pour ça qu'ils n'ont rien
      vu le 2/11. Un parcours composé n'est l'objet OSM de personne : son
      `osmRef` est vide et son `osmUrl` est la page de licence. Le fichier
      exporté annonçait donc « Référence : . » et offrait un lien intitulé
      « Le tracé sur OpenStreetMap » qui menait au texte juridique.
   ⭐ Deux affirmations fausses dans un artefact qui VOYAGE — il s'ouvre dans
      une montre six mois plus tard, loin de la page qui pouvait les corriger.
      Ce test GÉNÈRE le fichier et le lit.
*/
describe("le GPX d'une promenade composée", () => {
  const compose = {
    provenance: "compose" as const,
    slug: "composee", titre: "Vers le Manoir de Goandour", lieu: "Crozon", resume: "",
    distanceKm: 1.7, dureeEstimeeH: 0.5, boucle: false,
    osmUrl: "https://www.openstreetmap.org/copyright", osmRef: "",
    points: [{ lon: -4.49, lat: 48.24 }, { lon: -4.48, lat: 48.245 }],
    traits: [[{ lon: -4.49, lat: 48.24 }, { lon: -4.48, lat: 48.245 }]],
    etapes: [],
  };

  it("⛔ n'annonce pas une référence qu'il n'a pas", () => {
    const gpx = enGpx(compose);
    expect(gpx, "une référence vide s'écrit en se taisant")
      .not.toMatch(/Référence\s*:\s*\./);
    expect(gpx, "et surtout pas une référence vide tout court")
      .not.toMatch(/Référence\s*:\s*</);
  });

  it("⛔ son lien ne promet pas le tracé quand il mène à la licence", () => {
    const gpx = enGpx(compose);
    const lien = gpx.match(/<link href="([^"]+)"><text>([^<]+)<\/text><\/link>/);
    expect(lien, "le lien de métadonnées").not.toBeNull();
    const [, href, texte] = lien!;
    /* La règle : le texte décrit CE QU'ON TROUVE à l'adresse. Une page de
       licence ne s'annonce pas comme un tracé. */
    if (/copyright|licenses?\//.test(href)) {
      expect(texte.toLowerCase(), `« ${texte} » pour ${href}`).toMatch(/licence|odbl/);
      expect(texte.toLowerCase()).not.toMatch(/tracé/);
    }
  });

  it("⭐ et l'attribution, elle, voyage bien dans le fichier", () => {
    /* Ce qui était déjà juste doit le rester : un fichier qui porte une
       licence correcte et deux affirmations fausses n'est pas à moitié
       honnête — mais on ne répare pas la moitié fausse en cassant l'autre. */
    const gpx = enGpx(compose);
    expect(gpx).toMatch(/opendatacommons\.org\/licenses\/odbl/);
    expect(gpx).toMatch(/contributeurs d'OpenStreetMap/);
    /* ⭐ CE GARDE A ÉTÉ RETOURNÉ LE 3/11/2026, PAS SUPPRIMÉ. Il exigeait la
       phrase « Aucune altitude : nous n'en disposons pas » — vraie la veille,
       fausse le jour où `graphe_altitude.py` a rempli les deux graphes. Il
       aurait alors tenu en place une affirmation périmée DANS UN FICHIER QUI
       VOYAGE, c'est-à-dire à l'endroit le plus coûteux : un GPX s'ouvre dans
       une montre six mois plus tard, loin de la page qui pourrait le corriger.
       Ce qu'il protégeait reste vrai sous une autre forme — le fichier doit
       DIRE ce qu'il sait du relief et ce qu'il n'en sait pas. */
    expect(gpx, "l'absence d'altitude PAR POINT se dit, et se justifie")
      .toMatch(/[Pp]as d'altitude par point/);
    expect(gpx, "⛔ et aucune élévation n'est inventée dans le tracé")
      .not.toMatch(/<ele>/);

    /* 🔴 L'ABSENCE DOIT RESTER UNE ABSENCE. Ce fixture n'a pas de `monteeM`
       — comme un itinéraire de l'Office, qui porte le relevé que l'Office a
       mesuré au sol, pas le nôtre. Le fichier doit alors SE TAIRE, jamais
       écrire « 0 m » : un zéro se lit « c'est plat », et c'est le défaut
       dans le sens le plus coûteux pour qui part sur un sentier de falaise. */
    expect(gpx, "sans montée connue, le fichier se tait — il n'écrit pas 0")
      .not.toMatch(/Montée cumulée/);

    /* Et quand on la connaît, elle voyage — avec sa source nommée. */
    const avecMontee = enGpx({ ...compose, monteeM: 87 });
    expect(avecMontee).toMatch(/Montée cumulée : 87 m/);
    expect(avecMontee, "la source de l'altitude est nommée dans le fichier")
      .toMatch(/SRTM/);
  });
});
