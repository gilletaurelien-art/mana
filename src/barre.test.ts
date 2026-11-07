import { describe, it, expect } from "vitest";
import { entreesBarre, liensPied } from "./barre";
import { PONTS } from "./passerelle";
import { ROUTES_APP, ROUTES_LOVE, estANous } from "./routes";

/* ════════════════════════════════════════════════════════════════════════
   🔴 CES GARDES REMPLACENT TROIS GARDES QUI ONT LAISSÉ PASSER LE DÉFAUT
   ════════════════════════════════════════════════════════════════════════
   Le 7/11/2026, mana.love s'est mis à servir nos écrans — et notre barre est
   arrivée avec eux. Cinq de ses six boutons menaient à l'accueil de l'autre
   application, au MÊME OCTET quel que soit celui qu'on pressait.

   Trois gardes existaient. Les trois étaient verts. Les trois lisaient le
   TEXTE d'`App.tsx` : « la colonne 2 vit-elle dans la branche
   `avecOffice()` ? », « compte-t-on cinq destinations distinctes ? ». Ils
   gardaient la forme du code ; le défaut était dans ce qu'il décide.

   ⭐ Ils ne sont pas supprimés : ce qu'ils protégeaient — cinq colonnes, cinq
      destinations, la colonne 2 commandée par le visage — reste vrai et est
      réécrit ici contre la DÉCISION.
*/
describe("la barre du bas, par visage", () => {
  it("chaque visage mène à des destinations DISTINCTES", () => {
    for (const v of ["bzh", "love"] as const) {
      const d = entreesBarre(v).map((e) => e.chemin.split("?")[0]);
      expect(new Set(d).size, `visage ${v}, doublon parmi ${d.join(" · ")}`).toBe(d.length);
    }
  });

  /* ⛔ LE DÉFAUT EXACT QUI EST PARTI EN PRODUCTION. Un bouton dont la
     destination n'est pas en ligne rend l'accueil de l'autre application —
     200, jolie, et sans rapport avec ce qu'il promettait. */
  /* ⚠️ SUR LE VISAGE LOVE SEULEMENT, et ce n'est pas un affaiblissement :
     `/radio` est un pont fermé là-bas et un chemin BIEN À NOUS sur mana.bzh.
     Un garde qui interdirait le chemin sur les deux visages interdirait la
     radio chez nous — un test qui exige un moyen interdit la bonne solution.
     C'est la DESTINATION sur CET hôte qui est le sujet, pas le chemin. */
  it("⛔ aucun bouton ne mène à un pont qui n'est pas en ligne", () => {
    const morts = Object.values(PONTS).filter((p) => !p.enLigne).map((p) => p.chemin);
    for (const v of ["love"] as const) {
      for (const e of entreesBarre(v)) {
        expect(morts, `« ${e.libelle} » mène à ${e.chemin}, qui rend l'accueil`)
          .not.toContain(e.chemin);
      }
      for (const l of liensPied(v)) {
        expect(morts, `le pied propose ${l.chemin}, qui rend l'accueil`)
          .not.toContain(l.chemin);
      }
    }
  });

  /* ⚠️ ET L'AUTRE SENS COMPTE AUTANT : masquer n'est bon que tant que la
     destination manque. Le jour où un pont passe à `enLigne: true`, son
     entrée doit REVENIR — sinon on aurait remplacé un bouton menteur par un
     bouton absent pour toujours, ce qui ne se signale pas davantage. */
  /* ⚠️ MASQUER N'EST BON QUE TANT QUE LA DESTINATION MANQUE. Le jour où un
     pont passe à `enLigne: true`, son entrée doit REVENIR — sinon on aurait
     remplacé un bouton menteur par un bouton absent POUR TOUJOURS, ce qui ne
     se signale pas davantage.
     🔴 Et ma première version de ce garde comptait faux : `2 + ponts ouverts`,
        où le « 2 » était « la carte et la marque » — or la marque EST le pont
        `/`. Il se comptait deux fois. Un garde arithmétique sur un total est
        exactement ce que ce dépôt reproche aux nombres recopiés : il a l'air
        de mesurer et il mesure autre chose. On vérifie donc la
        CORRESPONDANCE, pont par pont. */
  it("⭐ un bouton est là si et seulement si son pont est ouvert", () => {
    const cheminsVus = entreesBarre("love").map((e) => e.chemin.split("?")[0]);
    for (const [clef, p] of Object.entries(PONTS)) {
      const utilise = cheminsVus.includes(p.chemin);
      if (p.enLigne) continue;   // ouvert : la barre PEUT l'employer, sans y être tenue
      expect(utilise, `le pont « ${clef} » est fermé et la barre y mène`).toBe(false);
    }
    /* ⛔ Et l'accueil, lui, est ouvert ET employé : c'est le bouton central. */
    expect(cheminsVus, "le bouton MANA a disparu").toContain(PONTS.accueil.chemin);
  });

  it("la colonne 2 est COMMANDÉE par le visage, pas seulement voisine", () => {
    const bzh = entreesBarre("bzh").map((e) => e.clef);
    const love = entreesBarre("love").map((e) => e.clef);
    expect(bzh, "l'Office a quitté mana.bzh").toContain("office");
    expect(love, "l'Office est revenu sur mana.love").not.toContain("office");
    /* ⛔ Et la carte et la marque ne bougent sur aucun des deux. */
    for (const c of ["carte", "marque"]) {
      expect(bzh).toContain(c);
      expect(love).toContain(c);
    }
  });

  /* ⛔ UN BOUTON QUI POINTE CHEZ NOUS DOIT POINTER SUR UN CHEMIN QU'ON SERT —
     sur l'hôte concerné. C'est le lien entre cette barre et les trois listes
     de `routes.ts` : sans lui, les deux peuvent dériver en silence. */
  it("🔴 tout ce que la barre revendique, cet hôte le sert", () => {
    const ponts = Object.values(PONTS).map((p) => p.chemin);
    const verifier = (v: "bzh" | "love", nos: readonly string[]) => {
      for (const e of [...entreesBarre(v), ...liensPied(v).map((l) => ({
        chemin: l.chemin, libelle: l.libelle }))]) {
        const c = e.chemin.split("?")[0];
        if (ponts.includes(c)) continue;          // assumé chez l'autre app
        expect(nos, `« ${e.libelle} » → ${c}, que ${v} ne sert pas`).toContain(c);
      }
    };
    verifier("bzh", ROUTES_APP as readonly string[]);
    verifier("love", ROUTES_LOVE as readonly string[]);
    /* ⚠️ ET LES PONTS NE DOIVENT PAS ÊTRE À NOUS SUR LOVE — pas « jamais ».
       Ma première version écrivait `estANous(p) === false` pour tous : elle
       est tombée sur `/`, qui est un pont sur mana.love ET notre accueil sur
       mana.bzh. Le même chemin appartient à deux apps différentes selon
       l'hôte ; c'est tout le sujet de la journée, et mon garde l'avait oublié
       dans sa dernière ligne. */
    for (const p of ponts) {
      expect(ROUTES_LOVE as readonly string[], `${p} est revendiqué sur mana.love`)
        .not.toContain(p);
    }
    expect(estANous("/"), "l'accueil a quitté mana.bzh").toBe(true);
  });
});
