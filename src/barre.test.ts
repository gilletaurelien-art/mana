import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { entreesBarre, liensPied, piedDansReglages } from "./barre";
import { VISAGES } from "./visage";
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
    /* ⛔ Et la carte ne bouge sur aucun des deux.
       🔄 LA MARQUE EST SORTIE DE CETTE CLAUSE LE 15/11/2026 : elle a quitté la
          barre de nos deux visages pour la pilule d'en-tête — le sablier
          d'abord, le mot MANA ensuite. Elle n'y est plus une colonne, donc
          elle ne peut plus y être stable.
       ⭐ Ce que la clause protège — une colonne qui ne change pas de place
          d'un hôte à l'autre — vaut toujours pour « carte ». */
    for (const c of ["carte"]) {
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

describe("⛔ aucun hôte ne sert les passerelles d'un autre", () => {
  /* 🔴 TROISIÈME FOIS QUE LE MÊME DÉFAUT MORD, EN DEUX JOURS. `visage()`
     repliait sur « bzh », `entreesBarre` repliait sur mana.love, et chaque
     fois le repli avait l'air délibéré. Le 15/11, manafrance.org — posé une
     heure plus tôt — proposait EN LIGNE « Déesses » et « Mon compte » à des
     visiteurs français.
     ⭐ LE GARDE ÉNUMÈRE LES VISAGES ET COMPARE LEURS BARRES. Vérifier un cas
        à la fois est précisément ce qui a laissé passer les trois : c'est
        l'ARRIVÉE d'un visage non prévu qu'il faut rendre visible, pas la
        justesse d'un visage connu. */
  /* ⭐ LA LISTE VIENT DE `visage.ts` DEPUIS LE 15/11/2026 AU SOIR. Elle était
     recopiée ici — et une liste recopiée ne grandit pas avec sa source : ce
     garde aurait énuméré quatre visages pendant qu'il y en aurait cinq, en
     restant vert. C'est le défaut même qu'il est là pour attraper. */
  const clefs = (v: (typeof VISAGES)[number]) => entreesBarre(v).map((e) => e.clef);

  it("seul mana.love porte les passerelles de mana.love", () => {
    for (const v of VISAGES) {
      const k = clefs(v);
      if (v === "love") continue;
      expect(k, `${v} propose « Mon compte », qui est l'écran de mana.love`)
        .not.toContain("compte");
      expect(k, `${v} propose les déesses de mana.love`).not.toContain("deesses");
    }
  });

  it("seul mana.bzh porte l'Office de tourisme de Crozon", () => {
    const avec = VISAGES.filter((v) => clefs(v).includes("office"));
    expect(avec).toEqual(["bzh"]);
  });

  it("⛔ un visage inconnu ne doit PAS ressembler à un visage connu par hasard", () => {
    /* ⚠️ C'est la mesure qui aurait crié le 14 ET le 15 : deux visages
       distincts dont la barre est identique signalent un repli, pas un
       choix. mana.bzh et mana.love diffèrent ; manahome et manafrance
       partagent délibérément la même forme (même produit, deux domaines) —
       c'est la seule paire admise, et elle est ÉCRITE. */
    const paires: Record<string, string> = {};
    for (const v of VISAGES) paires[v] = clefs(v).join(",");
    expect(paires.bzh).not.toBe(paires.love);
    expect(paires.home).not.toBe(paires.love);
    expect(paires.france).not.toBe(paires.love);
    expect(paires.france, "manafrance et manahome ont divergé sans décision")
      .toBe(paires.home);
  });
});

/* ════════════════════════════════════════════════════════════════════════
   OÙ VIT LE PIED DE PAGE — une décision, deux moitiés, deux fichiers
   ════════════════════════════════════════════════════════════════════════
   🔴 Elle était écrite en toutes lettres des deux côtés : `visage() !== "home"`
      dans `App.tsx`, `visage() === "home"` dans `Reglages.tsx`. manafrance.org
      n'était dans aucune des deux, donc gardait son pied en bas de page — un
      hôte qui se présente comme « la version française de manahome » et qui
      n'en a pas la charte.
   ⛔ ET LE DÉFAUT QU'UN SEUL CORRECTIF AURAIT CRÉÉ EST PIRE : le pied affiché
      deux fois, ou — dans l'autre sens — les mentions légales et le contact
      nulle part. Une déclaration due par la loi, retirée par une correction
      de mise en page.
   ⭐ D'où ces trois gardes : le prédicat s'énumère, et les deux appels sont
      vérifiés COMPLÉMENTAIRES dans le texte des deux fichiers. */
describe("le pied de page est atteignable sur chaque hôte, exactement une fois", () => {
  const lire = (f: string) => readFileSync(new URL(`./${f}`, import.meta.url), "utf8");

  it("chaque visage a une décision prise, et manafrance suit manahome", () => {
    const attendu: Record<string, boolean> = {
      home: true,    // Aurélien, 14/11 : « le footer doit vivre dans réglages »
      france: true,  // « la version française de manahome »
      bzh: false,    // garde son pied en bas de page
      love: false,   // invitée : elle a le pied de l'autre dépôt
    };
    for (const v of VISAGES) {
      expect(attendu[v], `aucune décision de pied pour « ${v} »`).toBeDefined();
      expect(piedDansReglages(v), `le visage « ${v} »`).toBe(attendu[v]);
    }
    expect(Object.keys(attendu).sort()).toEqual([...VISAGES].sort());
  });

  /* ⚠️ CE GARDE LIT LE TEXTE, ET C'EST LE SEUL MOYEN : ce qui doit être tenu
     n'est pas une valeur mais la NÉGATION d'un côté et pas de l'autre. Deux
     appels nus, ou deux appels niés, et le pied se multiplie ou disparaît. */
  it("App.tsx le NIE, Reglages.tsx ne le nie pas", () => {
    const app = lire("App.tsx");
    const reg = lire("Reglages.tsx");
    expect(app, "le pied de bas de page ne consulte plus la décision")
      .toContain("!piedDansReglages(visage())");
    expect(reg, "l'onglet Réglages ne consulte plus la décision")
      .toMatch(/\{piedDansReglages\(visage\(\)\) &&/);
    expect(reg, "Réglages NIE la décision : le pied n'existerait plus nulle part")
      .not.toContain("!piedDansReglages");
  });

  /**
   * ⛔ ET LE NOM DE L'HÔTE NE DOIT PLUS DÉCIDER DE RIEN ICI. C'est la forme
   *    exacte du défaut : `=== "home"` lisait « manahome » là où la question
   *    était « où vit le pied ». Un cinquième hôte le reproduirait.
   *
   * 🔴 ET CE GARDE EST TOMBÉ SUR SA PROPRE DOCUMENTATION. Première rédaction :
   *    il cherchait le motif dans le fichier entier et le trouvait — dans le
   *    COMMENTAIRE que je venais d'écrire au-dessus du correctif, qui CITE
   *    `visage() !== "home"` pour raconter ce qui a été réparé. C'est mot pour
   *    mot le piège que `CLAUDE.md` décrit sous « LA LIGNE CITÉE CONFIRME
   *    ENCORE » : un `grep` ne distingue pas une règle d'un récit.
   * ⭐ D'où le retrait des commentaires AVANT de chercher. Un garde qui lit du
   *    texte doit au moins lire le texte qui s'exécute.
   */
  it("aucun des deux fichiers ne teste le nom de l'hôte pour le pied", () => {
    /* Les blocs `/* … *\/` (donc aussi les `{/* … *\/}` du JSX) et les fins
       de ligne `//` partent : il ne reste que ce que le navigateur exécute. */
    const sansProse = (t: string) =>
      t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[^\n]*?\/\/[^\n]*$/gm, "");
    for (const f of ["App.tsx", "Reglages.tsx"]) {
      expect(sansProse(lire(f)), `${f} compare encore le visage à « home »`)
        .not.toMatch(/visage\(\)\s*[!=]==\s*"home"/);
    }
    /* ⛔ ET LE DÉCAPAGE NE DOIT PAS TOUT EMPORTER : s'il vidait le fichier, le
       garde passerait sur du vide — « une mutation qui rate sa cible ne dit
       rien ». Le code rendu doit rester substantiel et contenir la décision. */
    for (const f of ["App.tsx", "Reglages.tsx"]) {
      const net = sansProse(lire(f));
      expect(net.length, `${f} : le décapage a tout emporté`).toBeGreaterThan(2000);
      expect(net, `${f} : la décision a disparu avec les commentaires`)
        .toContain("piedDansReglages(visage())");
    }
  });

  /* ⭐ ET LE CONTENU LUI-MÊME NE SE DÉDOUBLE PAS : c'est le MÊME composant
     aux deux endroits, pas une recopie. Deux versions du même pied
     divergeraient au premier lien ajouté, et personne ne compare un pied de
     page à un écran de réglages. */
  it("les deux endroits rendent le même composant de pied", () => {
    for (const f of ["App.tsx", "Reglages.tsx"]) {
      expect(lire(f), `${f} ne rend pas ContenuDuPied`).toContain("<ContenuDuPied");
    }
    /* Et les liens qu'il porte viennent d'une seule fonction, déjà gardée
       plus haut dans ce fichier. */
    expect(liensPied("france").length).toBeGreaterThan(3);
  });
});
