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
   * ⛔ LA FICHE DE L'ACCUEIL PORTE LES MÊMES MENTIONS QUE CELLE DU TERRITOIRE.
   *    Une fiche qui se déplace sans elles devient une fiche MANA au premier
   *    coup d'œil — et c'est exactement ce qu'on s'interdit sur la donnée d'un
   *    tiers, à cinq jours d'un rendez-vous où l'accord se négocie.
   * ⚠️ Et elle ne charge PAS l'inventaire : la ligne « à moins de 150 m » vaut
   *    ses 110 Ko sur un écran qu'on feuillette, pas sur une page d'accueil
   *    qu'on traverse.
   */
  it("la fiche de l'accueil crédite l'Office et ne charge pas l'inventaire", () => {
    const inv = readFileSync(new URL("./InvitationBalade.tsx", import.meta.url), "utf8");
    const net = inv.replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n").filter((l) => !/^\s*(\/\/|\*)/.test(l)).join("\n");
    expect(net).toMatch(/Office de tourisme/);
    expect(net).toMatch(/ATTRIBUTION\[/);
    expect(net).toMatch(/chiffres déclarés/);
    expect(net).not.toMatch(/chargerLieux|lieuxProches/);
    // ⛔ et aucun libellé qui promette une rotation qu'on ne fait pas
    expect(net).not.toMatch(/balade du jour|coup de c(œ|oe)ur|sélection/i);
  });

  /**
   * 🔴 LES DEUX PORTES DE L'ACCUEIL MENAIENT AU MÊME ENDROIT. « Voir les
   *    balades » et « Voir sur la carte » pointaient toutes deux `/carte` :
   *    deux boutons voisins, une seule destination, que seul le libellé
   *    distinguait. ⭐ Deux contrôles côte à côte se comparent par leur
   *    LIBELLÉ, jamais par leur URL — c'est ce qui rend ce doublon-là
   *    invisible, et c'est le fondateur qui l'a vu, pas les tests.
   * ⚠️ La carte du territoire n'était qu'un ÉTAT interne : elle a désormais
   *    une adresse (`?vue=carte`), sans quoi on ne pouvait pas y mener.
   */
  it("les deux portes de l'accueil mènent à deux endroits", () => {
    /* ⚠️ TROISIÈME FOIS QU'UN GARDE NOMME UN FICHIER PLUTÔT QU'UNE RÈGLE.
       Il lisait `Invitation.tsx` ; les deux portes ont déménagé dans la fiche
       le 1/11 et il a crié « 0 porte ». ⭐ Ce qui doit rester vrai, c'est que
       L'ACCUEIL offre deux portes vers deux endroits — pas qu'un fichier
       donné les contienne. On lit donc l'accueil ET ce qu'il rend. */
    const net = ["./Invitation.tsx", "./InvitationBalade.tsx"]
      .map((f) => readFileSync(new URL(f, import.meta.url), "utf8"))
      .join("\n")
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
    const liens = [...net.matchAll(/href=\{`\$\{base\}([^`]*)`\}/g)].map((m) => m[1]);
    const portes = liens.filter((h) => h.startsWith("/carte"));
    expect(portes.length).toBe(2);
    expect(new Set(portes).size, `les deux portes pointent ${portes[0]}`).toBe(2);
    expect(portes).toContain("/carte?vue=carte");

    // ⭐ et l'écran sait entrer par cette adresse, sinon le lien ment
    const ecran = readFileSync(new URL("./EcranTerritoire.tsx", import.meta.url), "utf8");
    expect(ecran).toMatch(/get\("vue"\) === "carte"/);
  });

  /**
   * ⭐ UNE SEULE HORLOGE. La fiche de l'accueil change EN MÊME TEMPS que
   *    l'image de fond — pas « toutes les dix secondes elle aussi ». Deux
   *    minuteries de même durée ne donnent pas la même heure : elles donnent
   *    deux heures qui se ressemblent de moins en moins, parce que l'onglet
   *    caché gèle l'une et pas l'autre, qu'un rendu redémarre l'une, et que
   *    le navigateur étale les réveils.
   * ⛔ La fiche ne doit donc posséder AUCUNE minuterie de rotation : elle
   *    s'abonne au battement de `Fond`.
   */
  it("la fiche de l'accueil tourne sur l'horloge du fond, pas sur la sienne", () => {
    const f = readFileSync(new URL("./InvitationBalade.tsx", import.meta.url), "utf8");
    const net = f.replace(/\/\*[\s\S]*?\*\//g, "").split("\n")
      .filter((l) => !/^\s*(\/\/|\*)/.test(l)).join("\n");
    expect(net).toMatch(/ecouter\(/);
    expect(net).not.toMatch(/setInterval|setTimeout/);
    // et c'est bien `Fond` qui diffuse, à l'instant où l'image change
    const fond = readFileSync(new URL("./Fond.tsx", import.meta.url), "utf8");
    expect(fond).toMatch(/diffuserBattement\(n \+ 1\)/);
  });

  /**
   * 🔴 UN GEL QUI NE TIENT QUE PAR LE SURVOL NE PROTÈGE PERSONNE SUR UN
   *    TÉLÉPHONE — c'est-à-dire là où cette application se regarde. La
   *    première version n'écoutait que `onPointerEnter`.
   * ⭐ Un garde qui ne protège que la souris ne protège pas les marcheurs.
   */
  it("la rotation se gèle au doigt, pas seulement au survol", () => {
    const f = readFileSync(new URL("./InvitationBalade.tsx", import.meta.url), "utf8");
    expect(f).toMatch(/onPointerDown=\{\(\) => setFige\(true\)\}/);
    expect(f).toMatch(/onFocusCapture=\{\(\) => setFige\(true\)\}/);
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
