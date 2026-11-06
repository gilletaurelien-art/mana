import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { ajouterAuCarnet, lireCarnet, viderCarnet } from "./carnet";

const ecran = readFileSync(new URL("./SwipeBalades.tsx", import.meta.url), "utf8");
/** ⚠️ Les commentaires d'abord : une consigne EXPLIQUÉE dans un commentaire
 *  répondrait à la place du code — le piège du `grep guardedAnswer`. */
const code = ecran
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");

describe("le jeu de cartes des balades", () => {
  /**
   * ⛔ LA MENTION N'EST PAS UN CRÉDIT, C'EST LA LIGNE QUI SÉPARE UN CIRCUIT
   *    BALISÉ SUR LE TERRAIN D'UN ITINÉRAIRE COMPOSÉ PAR NOUS. Un jeu de
   *    cartes invite à garder vite ; c'est exactement là qu'une balade
   *    changerait d'auteur sans que personne ne le décide.
   */
  it("chaque carte porte la provenance de l'Office de tourisme", () => {
    /* ⚠️ LE MOTIF PORTE SUR LA SUBSTANCE, PAS SUR LA PHRASE. Première
       version : « Itinéraire balisé par l'Office de tourisme », au mot près.
       Elle a refusé une reformulation qui disait exactement la même chose en
       plus court — un garde qui exige un LIBELLÉ interdit de réécrire ce
       libellé, et finit par se faire désarmer plutôt que corriger.
       ⭐ Ce qui doit tenir, c'est que la carte dise QUI A BALISÉ. */
    expect(code).toMatch(/balisé par l[’']Office de tourisme/i);
  });

  /** ⛔ Pas d'étoile, pas de note, pas de « recommandé » : MANA ne classe pas
   *  les circuits d'un tiers. */
  it("n'invente aucun classement", () => {
    expect(code).not.toMatch(/recommand|coup de c(œ|oe)ur|note|étoile|★/i);
  });

  /**
   * ⚠️ CE QUI EST ÉCARTÉ NE SE STOCKE NULLE PART. Mémoriser les refus
   *    reviendrait à tenir un profil de goût — un jeu de données personnelles
   *    qu'on s'interdit, et qui n'a pas de porte de sortie une fois écrit.
   *    Le carnet (`mana.carnet.v1`) est la SEULE clé que cet écran écrit.
   */
  it("n'écrit aucune autre clé que le carnet", () => {
    const clefs = [...ecran.matchAll(/localStorage\.\w+\(\s*["'`]([^"'`]+)/g)].map((m) => m[1]);
    expect(clefs.filter((c) => c !== "mana.carnet.v1")).toEqual([]);
    // ⚠️ Et l'écran n'écrit pas en direct : il passe par `carnet.ts`, seul
    //    endroit où la clé est nommée et le `try` posé.
    expect(code).not.toMatch(/localStorage\.setItem/);
  });

  /**
   * ⛔ L'ATTRIBUTION ODbL VOYAGE AVEC LA CARTE, PAS SEULEMENT AVEC LA PAGE.
   *    `attributionControl: false` la retire de maplibre — c'est alors à
   *    l'écran de la porter, sur CHAQUE carte où le fond s'affiche. Une
   *    mention posée une fois en pied de site ne couvre pas un jeu où chaque
   *    carte est une vue cartographique à elle seule.
   */
  it("chaque carte porte l'attribution DU FOND AFFICHÉ", () => {
    /* ⚠️ DEUXIÈME FOIS CE SOIR QU'UN GARDE NOMME UNE ORTHOGRAPHE. La version
       précédente exigeait l'identifiant `ATTRIBUTION_OSM` ; elle a refusé le
       jour où l'attribution est devenue variable — ce qui était justement le
       progrès. ⭐ Un garde doit tenir ce qui doit rester vrai, pas la forme
       qu'avait le code quand on l'a écrit. */
    expect(code).toMatch(/ATTRIBUTION\[/);
    const fond = readFileSync(new URL("./carte-fond.ts", import.meta.url), "utf8");
    /* ⛔ CRÉDITER OPENSTREETMAP SOUS UNE PHOTOGRAPHIE DE L'IGN SERAIT FAUX DANS
       LES DEUX SENS : on citerait qui n'a rien fourni et on tairait qui a
       fourni. Les deux fonds ont donc leur mention, et elles diffèrent. */
    const table = fond.slice(fond.indexOf("export const ATTRIBUTION"));
    expect(table).toMatch(/plan:[^\n]*OpenStreetMap[^\n]*ODbL/);
    expect(table).toMatch(/ortho:[^\n]*IGN/);
    expect(table.match(/ortho:[^\n]*/)?.[0]).toMatch(/OpenStreetMap/);
  });

  /**
   * ⛔ LES TUILES AÉRIENNES PASSENT PAR NOTRE RELAIS. En direct, le navigateur
   *    du promeneur dirait à l'IGN son IP ET la zone qu'il regarde. C'est la
   *    même règle que pour OpenFreeMap, et elle se vérifie dans l'artefact.
   */
  it("le fond aérien ne sort pas de notre relais", () => {
    const style = JSON.parse(
      readFileSync(new URL("../public/carte-ortho.json", import.meta.url), "utf8"),
    ) as { sources: Record<string, { tiles?: string[] }>; sprite?: string; glyphs?: string;
           layers: { type: string }[]; metadata: { attribution: string } };
    const urls = [
      ...Object.values(style.sources).flatMap((s) => s.tiles ?? []),
      style.sprite ?? "", style.glyphs ?? "",
    ].filter(Boolean);
    expect(urls.length).toBeGreaterThan(2);
    for (const u of urls) {
      expect(u, u).toMatch(/^https:\/\/mana\.bzh\/carte\//);
      expect(u, u).not.toMatch(/geopf|openfreemap|maptiler|mapbox/);
    }
    /* ⛔ Aucun remplissage : on aurait payé une photographie aérienne pour la
       cacher sous un dessin. */
    expect(style.layers.filter((l) => l.type === "fill" || l.type === "background")).toEqual([]);
    expect(style.metadata.attribution).toMatch(/IGN/);
  });

  /**
   * 🔴 LE FOND NE SE DÉCLARE PAS PRÊT SUR LA FOI DE L'ÉTAT INTERNE.
   *    `areTilesLoaded()` a dit OUI alors qu'aucune tuile n'était arrivée —
   *    il répond « plus rien en attente », ce qui est vrai aussi quand tout a
   *    échoué. Le seul signal qui porte sur ce qu'on VOIT est
   *    `queryRenderedFeatures()`.
   */
  it("le fond OSM ne se montre que s'il a vraiment peint", () => {
    const carte = readFileSync(new URL("./CarteFondOT.tsx", import.meta.url), "utf8");
    /* ⚠️ CE MOTIF A DÉJÀ CHANGÉ DEUX FOIS, parce que le garde lui-même a eu
       tort deux fois : `areTilesLoaded()` acceptait un échec total, puis
       `queryRenderedFeatures()` refusait une photographie aérienne — elle n'a
       aucune entité. ⭐ Ce qui doit rester vrai n'est pas la formule, c'est
       qu'on COMPTE des tuiles réellement acceptées avant de montrer le fond. */
    expect(carte).toMatch(/tuiles > 0 && m\.areTilesLoaded\(\)/);
    expect(carte).toMatch(/dataType === "source"/);
    /* ⭐ ET SEULEMENT LES TUILES DU SOL. « Des tuiles sont arrivées » ne veut
       rien dire si ce ne sont pas celles qui peignent le fond : mesuré, un
       ombrage de relief suffisait à déclarer prête une carte vide. */
    expect(carte).toMatch(/d\.sourceId === base/);
    const fondTs = readFileSync(new URL("./carte-fond.ts", import.meta.url), "utf8");
    expect(fondTs).toMatch(/SOURCE_DE_BASE[\s\S]*plan: "openmaptiles"[\s\S]*ortho: "ortho"/);
    expect(carte).toMatch(/interactive: false/);
    // ⚠️ Et le contexte WebGL se libère, sinon 46 glissements saturent le
    //    plafond du navigateur et les dernières cartes restent blanches.
    expect(carte).toMatch(/m\.remove\(\)/);
  });

  /**
   * ⛔ CE QU'ON NE PROMET PAS. L'écran de marche guidée n'existe que pour les
   *    itinéraires MANA, qui portent des étapes ; un circuit de l'Office n'en
   *    a pas. ⭐ Une promesse d'interface qu'on ne peut pas tenir se
   *    reformule, elle ne se dessine pas en espérant que personne n'appuie
   *    dessus — la même règle que « Mes promenades » sans compte.
   */
  it("ne promet pas de lancer une balade qu'on ne sait pas guider", () => {
    expect(code).not.toMatch(/Lancer la balade/i);
  });

  /**
   * ⛔ AUCUNE PHOTOGRAPHIE, AUCUNE PROSE DE L'OFFICE. Nous n'avons pas
   *    d'images de ces circuits ; celles de l'Office ne portent aucune
   *    licence, et leur texte « À propos » est à eux. Les FAITS qu'ils
   *    déclarent se citent, leur rédaction non — et l'accord n'est pas signé.
   */
  it("n'emprunte ni photographie ni rédaction à l'Office", () => {
    const art = readFileSync(new URL("./ot.json", import.meta.url), "utf8");
    const j = JSON.parse(art) as { itineraires: Record<string, unknown>[] };
    const champs = new Set(j.itineraires.flatMap((w) => Object.keys(w)));
    for (const interdit of ["photo", "photos", "image", "images", "apropos", "a_propos", "description", "texte"]) {
      expect([...champs], `« ${interdit} » dans src/ot.json`).not.toContain(interdit);
    }
  });

  /**
   * ⛔ UN REPÈRE EST À SA COORDONNÉE, JAMAIS DÉPLACÉ POUR ÊTRE LISIBLE. Un
   *    picto poussé de cinquante mètres pour éviter un voisin envoie chercher
   *    autre chose que ce qui est là. Le composant reprojette `l.g` tel quel.
   */
  it("les repères de la carte sont posés à leur coordonnée", () => {
    const carte = readFileSync(new URL("./CarteFondOT.tsx", import.meta.url), "utf8");
    expect(carte).toMatch(/data-lon=\{l\.g\[0\]\}/);
    expect(carte).toMatch(/data-lat=\{l\.g\[1\]\}/);
    /* 🔴 ET LE CADRAGE TIENT COMPTE DE CE QUE LA FEUILLE RECOUVRE. La surface
       VISIBLE d'une carte n'est pas sa surface : depuis qu'elle va à fond
       perdu, cadrer sur la boîte entière centre le tracé DERRIÈRE la feuille. */
    expect(carte).toMatch(/bottom: serre \+ basOcculte/);
  });

  /**
   * 🔴 ZÉRO TUILE DEMANDÉE, ET LA CARTE AVAIT L'AIR DE CHARGER. L'effet qui
   *    crée la carte dépendait de `lieux` — un tableau RECONSTRUIT À CHAQUE
   *    RENDU par le parent — et des deux occultations, qui bougent au gré du
   *    `ResizeObserver`. Il se démontait et se remontait sans fin : chaque
   *    carte neuve annulait les requêtes de la précédente.
   * ⭐ UNE DÉPENDANCE RECRÉÉE À CHAQUE RENDU TRANSFORME UN EFFET EN BOUCLE DE
   *    RECONSTRUCTION — et le symptôme n'est pas « ça boucle », c'est « rien
   *    ne s'affiche ». Seul ce qui change VRAIMENT de carte doit la recréer.
   */
  it("la carte ne se reconstruit que si le terrain ou le fond change", () => {
    const carte = readFileSync(new URL("./CarteFondOT.tsx", import.meta.url), "utf8");
    expect(carte).toMatch(/\}, \[p, fond\]\);/);
    // le cadrage vit dans un SECOND effet, qui ne recrée rien
    expect(carte).toMatch(/\}, \[lieux, basOcculte, hautOcculte, serre\]\);/);
    // et le parent mémorise le tableau qu'il passe
    expect(code).toMatch(/const sites = useMemo/);
  });

  /**
   * ⭐ LES DEUX DÉFAUTS DU 31/10 — « à pied » et « vue aérienne ».
   * ⚠️ Et le repli de `lireFond` quand `localStorage` LÈVE doit être le même
   *    défaut : sans ce soin, une partie des visiteurs (Safari privé, cookies
   *    bloqués) aurait silencieusement l'autre fond, et personne ne saurait
   *    pourquoi la carte n'a pas la même tête chez eux.
   */
  it("ouvre sur « à pied » et sur la vue aérienne", () => {
    expect(code).toMatch(/useState<ItineraireOT\["pratique"\] \| "tout">\("pied"\)/);
    expect(code).toMatch(/useState<Fond>\("ortho"\)/);
    const fondTs = readFileSync(new URL("./carte-fond.ts", import.meta.url), "utf8");
    const lecture = fondTs.slice(fondTs.indexOf("export function lireFond"));
    expect(lecture).toMatch(/=== "plan" \? "plan" : "ortho"/);
    expect(lecture).toMatch(/catch \{ return "ortho"; \}/);
  });

  /**
   * ⛔ L'ATTRIBUTION NE SE ROGNE PAS. Elle a été coupée à l'écran —
   *    « … vue aérienne © IGN · étiq… » — parce que je l'avais mise sur une
   *    ligne avec `text-overflow: ellipsis` pour gagner seize pixels de
   *    carte. L'ODbL et la licence de l'IGN demandent une mention VISIBLE, et
   *    un `title` ne se survole pas au pouce, dehors.
   * ⭐ La ligne des SITES, juste au-dessus, se coupe sans dommage : c'est une
   *    invitation à regarder la carte. Deux lignes qui se ressemblent et
   *    n'ont pas le même statut — ce test tient la différence.
   */
  it("l'attribution n'est jamais rognée, la ligne des sites peut l'être", () => {
    const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
    const bloc = (sel: string) => {
      const i = css.indexOf(sel + " {");
      return css.slice(i, css.indexOf("}", i));
    };
    expect(bloc(".jeu-provenance")).not.toMatch(/text-overflow|white-space: nowrap/);
    expect(bloc(".jeu-proches")).toMatch(/text-overflow: ellipsis/);
  });

  /**
   * ═══ L'ACCUEIL, APRÈS LE 6/11/2026 ═══════════════════════════════════
   *
   * 🔴 CES QUATRE GARDES SONT RETOURNÉS, PAS SUPPRIMÉS — et la façon dont
   *    ils ont failli mourir mérite d'être écrite. Ils lisaient
   *    `InvitationBalade.tsx` SUR LE DISQUE. Quand la fiche de balade a cédé
   *    la place au moteur de recherche, le composant a cessé d'être rendu
   *    mais le FICHIER est resté : les quatre sont restés VERTS en gardant
   *    quelque chose que plus personne n'affichait.
   *
   * ⭐ L'un d'eux portait déjà, écrit noir sur blanc, « TROISIÈME FOIS QU'UN
   *    GARDE NOMME UN FICHIER PLUTÔT QU'UNE RÈGLE ». Il venait de
   *    recommencer une quatrième fois, en silence, dans son propre fichier.
   *    **Un garde qui s'est déjà trompé de cible une fois ne s'en souvient
   *    pas tout seul : nommer le défaut dans un commentaire ne l'empêche pas
   *    de se reproduire à la ligne du dessous.**
   *
   * ➜ Ils lisent désormais CE QUE L'ACCUEIL REND : `Invitation.tsx` et les
   *   composants qu'il importe vraiment, suivis par le code. Renommer,
   *   scinder ou remplacer un composant de l'accueil ne peut plus endormir
   *   ces règles — seul le fait de retirer la règle le peut, et cela se voit.
   */
  const accueil = () => {
    const lire = (f: string) => readFileSync(new URL(f, import.meta.url), "utf8");
    const racine = lire("./Invitation.tsx");
    const importes = [...racine.matchAll(/from "\.\/([A-Za-z0-9_-]+)"/g)].map((m) => m[1]);
    const rendus = importes.filter((n) => racine.includes(`<${n} `) || racine.includes(`<${n}/`));
    return [racine, ...rendus.map((n) => lire(`./${n}.tsx`))].join("\n");
  };
  const sansCommentaires = (t: string) =>
    t.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "")
     .split("\n").filter((l) => !/^\s*(\/\/|\*)/.test(l)).join("\n");

  /**
   * ⛔ LE CRÉDIT DE L'OFFICE NE DISPARAÎT PAS AVEC LE BLOC QUI LE PORTAIT.
   *    Il vivait dans la fiche de balade — « c'est aussi le seul chemin vers
   *    leur fiche depuis l'accueil », disait-elle. En la remplaçant, le lien
   *    sortant est DESCENDU dans la section qui montre leurs 46 circuits et
   *    leurs 708 km, et pas sous le champ de recherche : créditer sous un
   *    bloc qui n'affiche AUCUNE de leurs données dilue la mention.
   * 🔴 Ces chiffres sont LEUR donnée. Une page qui les montre sans les nommer
   *    devient une fiche MANA au premier coup d'œil.
   */
  it("la page qui montre les circuits nomme l'Office ET mène chez lui", () => {
    /* 🔄 6/11 : le crédit a suivi les sections sur `/l-application`. Il n'a
       jamais eu à rester sur l'accueil — il doit rester COLLÉ aux 46
       circuits et aux 708 km, c'est-à-dire à leur donnée. */
    const app = sansCommentaires(readFileSync(new URL("./LApplication.tsx", import.meta.url), "utf8"));
    expect(app).toMatch(/Office de tourisme Presqu’île de Crozon – Aulne Maritime/);
    expect(app).toMatch(/crozon-tourisme\.bzh/);
    expect(app).toMatch(/MANA ne s’attribue rien et ne recommande rien/);
  });

  /**
   * 🔴 RETOURNÉ LE 6/11 — ET SA RAISON SURVIT INTACTE. Il disait : l'accueil
   *    « ne charge PAS l'inventaire — ses 110 Ko valent sur un écran qu'on
   *    feuillette, pas sur une page d'accueil qu'on traverse ». La recherche
   *    a BESOIN de l'inventaire ; la règle, elle, parlait du COÛT POUR QUI
   *    TRAVERSE, pas de l'existence de l'appel.
   * ⭐ Un interdit en test se franchit en le sachant : celui-ci a été lu,
   *    compris, et retourné vers la propriété qu'il protégeait vraiment —
   *    rien au premier rendu, l'inventaire au premier GESTE.
   */
  it("l'accueil ne paie l'inventaire qu'au premier geste, jamais au premier rendu", () => {
    const net = sansCommentaires(accueil());
    expect(net, "l'accueil doit savoir chercher").toMatch(/chargerLieux/);
    /* ⛔ Aucun chargement au montage : ni `useEffect` d'ouverture, ni appel
       nu dans le corps du composant. Il doit pendre à un geste. */
    expect(net).not.toMatch(/useEffect\(\(\) => \{[^}]*chargerLieux/);
    expect(net).toMatch(/on(Focus|Change)=/);
  });

  /**
   * 🔴 LES DEUX PORTES DE L'ACCUEIL MENAIENT AU MÊME ENDROIT, en septembre :
   *    « Voir les balades » et « Voir sur la carte » pointaient toutes deux
   *    `/carte`. ⭐ Deux contrôles côte à côte se comparent par leur LIBELLÉ,
   *    jamais par leur URL — c'est ce qui rend ce doublon invisible, et c'est
   *    le fondateur qui l'a vu, pas les tests.
   * ⚠️ Le défaut n'a jamais été « combien de portes » mais « deux contrôles
   *    pour un seul endroit » : on compte donc les doublons, pas les portes.
   */
  it("aucune porte de l'accueil ne double un onglet de la barre du bas", () => {
    const net = accueil().replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
    /* ⚠️ ON LIT TOUTES LES DESTINATIONS, PAS SEULEMENT LES `href` LITTÉRAUX.
       Le moteur de recherche bâtit son URL dans une fonction
       (`${base}/promenades?lon=…`) : un motif collé à `href={` ne l'aurait
       jamais vue, et ce garde aurait annoncé « aucune porte » d'un accueil
       qui en a trois. ⭐ Un garde qui ne reconnaît qu'une FORME d'écriture
       ne garde que cette forme-là. */
    const liens = [...net.matchAll(/\$\{base\}(\/[a-z0-9-]*)/g)].map((m) => m[1]);
    const app = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
    const barre = [...app.matchAll(/<a[^>]*href=\{`\$\{B\}([^`]*)`\}[^>]*aria-current/g)].map((m) => m[1]);
    expect(barre.length, "les onglets de la barre du bas").toBeGreaterThanOrEqual(4);

    expect(liens.length, "l'accueil n'offre plus aucune porte").toBeGreaterThan(0);

    /* 🔴 LA CLAUSE « AUCUNE DESTINATION EN DOUBLE » EST RETIRÉE, ET IL FAUT
       DIRE POURQUOI PLUTÔT QUE DE LA LAISSER MOURIR. Elle comptait les
       occurrences de texte. Depuis le 6/11, le moteur de recherche mène à
       `/promenades` par TROIS chemins — un lieu choisi, une requête libre,
       et la porte au repos — qui sont les BRANCHES D'UN SEUL contrôle, pas
       trois contrôles. Un comptage textuel ne sait pas distinguer une
       branche d'un jumeau : maintenu, il refusait du travail juste.
       ⭐ Ce qu'elle protégeait reste vrai sous une forme VÉRIFIABLE, et la
          voici juste en dessous : deux contrôles ne se font concurrence que
          s'ils sont visibles EN MÊME TEMPS. */
    for (const l of liens) {
      expect(barre.map((b) => b.split("?")[0]), `« ${l} » est déjà un onglet de la barre du bas`)
        .not.toContain(l);
    }
    // ⭐ et l'écran sait entrer par `?vue=carte`, que la barre emploie, sinon le lien ment
    expect(barre).toContain("/carte?vue=carte");
    const ecranT = readFileSync(new URL("./EcranTerritoire.tsx", import.meta.url), "utf8");
    expect(ecranT).toMatch(/get\("vue"\) === "jeu"/);
  });

  /**
   * 🔴 CE GARDE REMPLACE LE COMPTAGE D'URL EN DOUBLE, et il dit la vraie
   *    règle : le défaut de septembre — « Voir les balades » et « Voir sur
   *    la carte », deux boutons voisins, une seule destination — tenait à ce
   *    qu'ils étaient VISIBLES ENSEMBLE. Deux contrôles côte à côte se
   *    comparent par leur libellé, jamais par leur URL.
   * ⭐ La porte au repos et la liste de résultats mènent toutes deux à
   *    `/promenades`, et ce n'est PAS ce défaut : elles s'excluent. L'une ne
   *    paraît que le champ vide, l'autre que le champ rempli.
   */
  it("la porte au repos et les résultats ne paraissent jamais ensemble", () => {
    const rech = readFileSync(new URL("./RechercheAccueil.tsx", import.meta.url), "utf8");
    expect(rech, "la porte doit être conditionnée au champ VIDE").toMatch(/\{!requete && \(/);
    expect(rech, "les résultats au champ REMPLI").toMatch(/\{resultats\.length > 0 && \(/);
  });

  /**
   * ⭐ UNE SEULE HORLOGE, et la règle survit à la disparition de la fiche qui
   *    l'avait motivée. Deux minuteries de même durée ne donnent pas la même
   *    heure : l'onglet caché gèle l'une et pas l'autre, un rendu redémarre
   *    l'une, le navigateur étale les réveils. `Fond` bat, les autres
   *    s'abonnent.
   * 🔴 Et c'est devenu PLUS strict qu'avant : aucun composant de l'accueil,
   *    quel qu'il soit, ne possède de minuterie. L'ancien garde ne le
   *    demandait qu'à un fichier nommé.
   */
  it("aucun composant de l'accueil ne tient sa propre minuterie", () => {
    expect(sansCommentaires(accueil())).not.toMatch(/setInterval|setTimeout/);
    const fond = readFileSync(new URL("./Fond.tsx", import.meta.url), "utf8");
    expect(fond).toMatch(/diffuserBattement\(n \+ 1\)/);
  });

  /** ⛔ « À proximité » n'est pas « sur le chemin » : le seuil est DIT. */
  it("dit le seuil quand il cite des sites proches", () => {
    expect(code).toMatch(/SEUIL_PROCHES/);
    expect(code).toMatch(/À moins de/);
  });

  /**
   * ⭐ TROIS FONCTIONS, PAS CINQ (31/10/2026, décision du fondateur). Les deux
   *    boutons de la feuille — « Voir le détail » et « Suivre sur la carte » —
   *    ont été retirés : cinq commandes sur une fiche qu'on tranche au pouce,
   *    c'était trois de trop, et quarante-quatre pixels pris à la carte.
   * ⚠️ MAIS LA FICHE DE L'OFFICE RESTE ATTEIGNABLE. Retirer le bouton sans
   *    laisser de chemin aurait rendu leurs 46 circuits sans porte de sortie,
   *    au moment même où l'on négocie l'accord de reprise. Le CRÉDIT est
   *    devenu le lien — sa place juste : un crédit renvoie à qui il crédite.
   */
  it("la fiche de l'Office reste à un doigt, par le crédit", () => {
    expect(code).toMatch(/className="jeu-source"/);
    expect(code).toMatch(/href=\{w\.source\}/);
  });

  /**
   * 🔴 LA BARRE DU BAS A ÉTÉ RÉDUITE DE 40 %, ET « MANA AUSSI HAUT QUE LES
   *    ICÔNES » EST UNE RELATION, PAS DEUX NOMBRES. Les deux valeurs vivaient
   *    en dur — 48 px dans le JSX, 43,2 px dans la feuille — liées par un
   *    calcul que ni l'un ni l'autre ne portait. Réduire l'une sans l'autre
   *    cassait l'égalité en silence.
   */
  it("la marque de la barre DÉRIVE de la taille des icônes", () => {
    const tokens = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");
    expect(tokens).toMatch(/--barre-marque:\s*calc\(var\(--barre-icone\)\s*\*\s*0\.9\)/);
    const feuille = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
    expect(feuille).toMatch(/font-size: var\(--barre-marque\)/);
    /* ⛔ ET PLUS AUCUNE TAILLE D'ICÔNE DANS LE JSX DE LA BARRE.
       ⚠️ On découpe le bloc `<nav>` avant de chercher : la première version
          interdisait `size=` dans tout `App.tsx` et a refusé le glyphe de
          MANAradio sur la page d'accueil, qui n'a rien à voir. ⭐ Un motif
          juste, appliqué trop large, refuse du travail correct — et on finit
          par désarmer le garde plutôt que par corriger sa portée. */
    const app = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
    const barre = app.slice(app.indexOf('<nav className="nav">'), app.indexOf("</nav>"));
    expect(barre.length).toBeGreaterThan(200);
    expect(barre).not.toMatch(/size=/);
  });

  /**
   * 🔴 LE CONTRAT DU GESTE A CHANGÉ LE 1/11, ET AUCUN TEST NE LE PORTAIT.
   *    Les 190 tests sont passés au vert sur la bascule « trancher →
   *    feuilleter » : ils vérifiaient le clavier, la provenance, le stockage —
   *    jamais ce que le geste VEUT DIRE. ⭐ Une suite verte sur un changement
   *    de contrat ne dit pas que le changement est bon : elle dit que le
   *    contrat n'était pas tenu.
   *
   * ⛔ CET ÉCRAN N'ENREGISTRE PLUS RIEN. Le carnet se remplit depuis la fiche
   *    de promenade ; ici, le cœur OUVRE. Si `ajouterAuCarnet` revenait, le
   *    même dessin voudrait dire deux choses selon l'écran.
   */
  it("le geste feuillette, il ne tranche pas", () => {
    expect(code).not.toMatch(/ajouterAuCarnet|basculerCarnet/);
    expect(code).toMatch(/feuilleter\("suivante"\)/);
    expect(code).toMatch(/feuilleter\("precedente"\)/);
    // ⛔ et plus aucun tampon de jugement
    expect(code).not.toMatch(/Je garde|jeu-verdict/);
  });

  /**
   * ⭐ LES BORNES SONT DURES. Un carrousel qui boucle fait croire qu'on avance
   *    alors qu'on repasse : on ne sait plus si l'on a tout vu. Le rang le dit
   *    à la place de l'écran de fin, qui a disparu avec sa raison d'être.
   */
  it("ne boucle pas, et dit le rang", () => {
    expect(code).toMatch(/vise < 0 \|\| vise >= jeu\.length/);
    expect(code).not.toMatch(/% jeu\.length|%jeu\.length/);
    expect(code).toMatch(/\{rang\}\/\{total\}/);
    // ⛔ l'écran de fin promettait une fin qui n'arrive plus
    expect(code).not.toMatch(/Vous avez tout vu|jeu-fin-titre/);
  });

  /** ⭐ Le cœur OUVRE la fiche de l'Office — il n'enregistre pas. */
  it("le cœur central ouvre la fiche de l'Office", () => {
    const bloc = code.slice(code.indexOf("jeu-commandes"), code.indexOf("</div>", code.indexOf("jeu-commandes")));
    expect(bloc).toMatch(/jeu-garde[\s\S]*href=\{courante\.source\}/);
  });

  /** ⭐ Un jeu de cartes qui ne répond qu'au doigt n'existe pas pour qui
   *  navigue au clavier. Les flèches feuillettent, et trois boutons doublent. */
  it("se joue aussi au clavier", () => {
    expect(code).toMatch(/ArrowRight/);
    expect(code).toMatch(/ArrowLeft/);
  });

  /** ⚠️ Sans capture du pointeur, un doigt qui sort de la carte laisse
   *  celle-ci figée en travers de l'écran. C'est la panne n°1 des piles
   *  faites main, et elle ne se voit jamais à la souris sur un grand écran. */
  it("capture le pointeur pendant le geste", () => {
    expect(code).toMatch(/setPointerCapture/);
  });
});

/**
 * ⚠️ LA SUITE TOURNE SANS NAVIGATEUR — pas de jsdom dans ce dépôt. On pose
 *    donc un `localStorage` en mémoire. Ce n'est pas une fixture qui répond à
 *    la place du code : c'est le SUPPORT, et la logique testée reste celle de
 *    `carnet.ts`. Le cas où l'accès LÈVE (Safari privé) est tenu par le `try`
 *    du module, et se vérifie en retirant ce support — ce que fait le dernier
 *    test de ce bloc.
 */
function poserStockage() {
  const m = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
      removeItem: (k: string) => void m.delete(k),
    },
  });
}

describe("le carnet, vu du jeu", () => {
  beforeEach(() => { poserStockage(); viderCarnet(); });

  /** 🔴 `basculerCarnet` serait faux ici : revoir une balade déjà gardée la
   *  RETIRERAIT au moment où la personne croit l'y remettre. */
  it("garder deux fois la même balade ne la retire pas", () => {
    ajouterAuCarnet("le-saut-du-loup");
    ajouterAuCarnet("le-saut-du-loup");
    expect(lireCarnet()).toEqual(["le-saut-du-loup"]);
  });

  it("l'ordre des balades gardées est celui du geste", () => {
    ajouterAuCarnet("a"); ajouterAuCarnet("b"); ajouterAuCarnet("a");
    expect(lireCarnet()).toEqual(["a", "b"]);
  });

  /** 🔴 Sans le `try`, l'écran entier disparaîtrait chez une partie des
   *  visiteurs — et jamais chez nous. On retire le support pour le voir. */
  it("un stockage qui LÈVE ne casse rien", () => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() { throw new Error("accès refusé"); },
    });
    expect(() => lireCarnet()).not.toThrow();
    expect(lireCarnet()).toEqual([]);
    expect(() => ajouterAuCarnet("x")).not.toThrow();
  });
});

describe("la barre du bas", () => {
  const app = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
  const barre = app.slice(app.indexOf('<nav className="nav">'), app.indexOf("</nav>"));

  /**
   * 🔴 TROISIÈME DOUBLON D'URL EN DEUX JOURS, ET C'EST LE FONDATEUR QUI LES A
   *    VUS LES TROIS. « Voir les balades » et « Voir sur la carte » pointaient
   *    `/carte` ; « En savoir plus » et le crédit pointaient la fiche de
   *    l'Office ; et l'icône des étincelles a failli pointer `/carte` comme sa
   *    voisine. ⭐ Deux contrôles voisins se comparent par leur DESSIN ou leur
   *    LIBELLÉ, jamais par leur URL — c'est ce qui rend ce doublon invisible à
   *    la relecture. Ce test lit les `href`.
   */
  it("les cinq entrées mènent à cinq endroits", () => {
    /* 🔴 ET ON COMPARE LES CHEMINS, PAS LES URL. Première version : elle
       comparait `href` entier — donc `/carte?vue=carte&chercher=1` et
       `/carte` comptaient pour deux. La mutation (étincelles ramenées sur
       `/carte`) est PASSÉE : deux icônes vers la même page, et le garde
       content. ⭐ Un garde qui compare des chaînes là où le sujet est une
       DESTINATION laisse passer exactement le cas qu'il devait attraper —
       une requête suffit à déguiser un doublon. */
    const liens = [...barre.matchAll(/href=\{`\$\{B\}([^`]*)`\}/g)].map((m) => m[1]);
    const chemins = liens.map((h) => h.split("?")[0]);
    expect(liens.length).toBe(5);
    expect(new Set(chemins).size, `doublon parmi ${chemins.join(" · ")}`).toBe(5);
  });

  /** ⭐ L'ordre est une décision du fondateur (1/11), pas une mise en page. */
  it("garde l'ordre : carte · sentiers · MANA · radio · réglages", () => {
    const ordre = [...barre.matchAll(/<Glyph(\w+)|className="brand"/g)]
      .map((m) => m[1] ?? "MANA");
    expect(ordre).toEqual(["Carte", "Etincelles", "MANA", "Radio", "Reglages"]);
  });

  /**
   * ⛔ PLUS AUCUNE PORTE N'ÉMET `?chercher=1`, donc l'écran ne doit plus le
   *    lire. ⭐ Un paramètre d'URL orphelin est pire qu'absent : il a l'air
   *    d'une fonctionnalité, et le prochain qui le trouvera dans le code
   *    croira qu'un lien l'utilise quelque part.
   */
  it("ne lit plus un paramètre que personne n'émet", () => {
    /* ⚠️ ON DÉPOUILLE LES COMMENTAIRES D'ABORD. Première version : elle a
       crié sur `?chercher=1` écrit dans la NOTE qui explique son retrait. ⭐ Un
       commentaire répond à la place du code — troisième fois ce soir, et
       c'est exactement le piège du `grep guardedAnswer` du dépôt principal. */
    const nu = (f: string) =>
      readFileSync(new URL(f, import.meta.url), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
        .split("\n").filter((l) => !/^\s*(\/\/|\*)/.test(l)).join("\n");
    expect(nu("./Territoire2030.tsx")).not.toMatch(/get\("chercher"\)/);
    expect(nu("./App.tsx")).not.toMatch(/chercher=1/);
  });
});
