import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { MOT_CLEF_OFFICE } from "./ot";
import { MOTIFS } from "./CarteBalades";
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
    /* 🔴 « UNE FOIS » EST DEVENU « ZÉRO FOIS » LE SOIR MÊME — le fondateur a
       supprimé le compte après l'avoir fait fusionner. Le garde qui tient le
       nombre d'occurrences vit juste en dessous ; celui-ci ne garde plus que
       le nom, qui est l'autre moitié de la redondance mesurée ce matin. */
    expect([...rendu.matchAll(/circuit\{/g)].length, "un compte est revenu")
      .toBe(0);
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

  it("⭐ la carte montre TOUS les tracés, et elle suit les mêmes filtres que la liste", () => {
    /* 🔴 12/11/2026 : « la carte à afficher est celle du Finistère avec tous
       les tracés de balade ». ⚠️ Et elle reçoit `visibles`, PAS `ot` : une
       carte qui montrerait les 116 pendant que la liste en montre 17 ferait
       deux écrans qui se contredisent, et c'est la carte qu'on croit. */
    expect(ecran, "la carte a quitté la page").toContain("<CarteBalades");
    expect(ecran, "la carte ne suit pas les filtres").toMatch(/circuits=\{visibles\}/);
    expect(ecran, "le jeu de cartes est resté sur cette page").not.toContain("<SwipeBalades");
  });

  it("⚠️ le jeu de cartes n'est pas orphelin : il a gardé son écran", () => {
    /* ⭐ RETIRER N'EST PAS SUPPRIMER, et la différence se vérifie. Le jeu
       `SwipeBalades` reste la vue « Balades » de `/carte` ; le laisser sans
       appelant aurait fait un composant mort que ses tests auraient continué
       de garder au vert — le fantôme que ce dépôt connaît. */
    const ecranTerritoire = readFileSync(new URL("./EcranTerritoire.tsx", import.meta.url), "utf8");
    expect(ecranTerritoire, "le jeu de cartes n'a plus aucun appelant")
      .toContain("<SwipeBalades");
  });

  it("⛔ chaque tracé est cliquable, et le clavier passe par la liste", () => {
    /* ⚠️ UNE COUCHE MAPLIBRE NE SE FOCALISE PAS. « Cliquable » ne doit pas
       vouloir dire « à la souris seulement » — c'est écrit dans
       `CarteReelle` depuis que le fondateur a demandé « cliquer sur le
       tracé, tout simplement ». Le chemin clavier ici est la LISTE : son
       focus allume le tracé, et les deux surfaces commandent le même état. */
    const carte = readFileSync(new URL("./CarteBalades.tsx", import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(carte, "le clic sur un tracé n'est pas écouté")
      .toMatch(/on\("click", "balades-cible"/);
    /* ⛔ ET LA CIBLE EST LARGE. Un trait de 2 px ne se touche pas au pouce :
       la règle des 44 px vaut aussi pour une ligne. `CarteReelle` porte la
       même paire trait/cible pour la même raison. */
    expect(carte, "la cible de clic a la largeur du trait")
      .toMatch(/"line-width": 18/);
    expect(ecran, "le focus d'une ligne n'allume plus son tracé")
      .toMatch(/onFocus=\{\(\) => setChoisi\(i\.slug\)\}/);
  });

  it("⛔ un choix que le filtre vient de masquer ne se garde pas", () => {
    /* Une sélection invisible est pire qu'aucune : on choisit un circuit à
       Crozon, on bascule sur « Abers », et la bulle continue d'annoncer un
       circuit qui n'est plus ni sur la carte ni dans la liste. ⭐ Vérifié à
       l'écran avant d'écrire ce garde — le choix tombe bien. */
    expect(ecran).toMatch(/const tenu = visibles\.find\(\(i\) => i\.slug === choisi\) \?\? null/);
  });

  it("⭐ les tracés sont dorés et ils courent — mais pas pour qui n'en veut pas", () => {
    /* 🔴 12/11/2026 : « plutôt que du vert kaki pour les tracés, affiche
       notre doré, et donne-lui un effet tournant, sur chaque balade ». */
    const carte = readFileSync(new URL("./CarteBalades.tsx", import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(carte, "le doré a quitté les tracés").toContain(jeton("ocre"));
    /* ⭐ maplibre ne sait pas décaler un pointillé : on fait tourner le
       MOTIF. La séquence doit donc exister ET compter plus d'un état —
       un seul ferait un pointillé fixe qu'on prendrait pour l'animation. */
    expect(carte).toMatch(/line-dasharray/);
    /* 🔴 CE GARDE COMPTAIT DES CROCHETS, ET IL EST TOMBÉ LE JOUR OÙ LA
       SÉQUENCE EST PASSÉE D'UNE LISTE ÉCRITE À UN `Array.from`. Rien de ce
       qu'il protégeait n'avait bougé : il mesurait une FORME.
       ⭐ On importe donc la séquence et on affirme ce qui compte vraiment —
          c'est aussi ce qui permet d'écrire l'invariant que le commentaire
          annonce et que rien ne vérifiait. */
    expect(MOTIFS.length, "un seul état de pointillé n'anime rien").toBeGreaterThan(4);
    /* ⛔ CE SONT DES POINTS, PAS DES TRAITS — demande du fondateur, 12/11 :
       « plutôt que des petites lignes dans le liseré, de petits points ». Un
       point est un tiret de longueur ZÉRO à bout rond ; les longueurs de
       tiret vivent aux index PAIRS du motif. */
    for (const m of MOTIFS) {
      const tirets = m.filter((_, i) => i % 2 === 0);
      expect(tirets, `des traits sont revenus dans le motif ${JSON.stringify(m)}`)
        .toEqual(tirets.map(() => 0));
    }
    /* ⚠️ ET LA PÉRIODE NE CHANGE JAMAIS. Si elle variait d'un état à l'autre,
       tout le pointillé se dilaterait et se contracterait au lieu d'avancer —
       un clignotement, pas un écoulement. C'est l'invariant que le
       commentaire de `MOTIFS` annonce ; il est tenu ici. */
    const periodes = new Set(MOTIFS.map((m) => m.reduce((a, b) => a + b, 0)));
    expect([...periodes], "la période du pointillé respire au lieu d'avancer")
      .toHaveLength(1);
    /* ⛔ ET ELLE S'ARRÊTE SOUS `prefers-reduced-motion`. Cent seize chemins
       qui ondulent en permanence, c'est beaucoup d'écran qui bouge. Le doré
       RESTE — c'est le mouvement qui part, jamais l'information. */
    expect(carte, "la préférence de mouvement n'est pas demandée")
      .toMatch(/prefers-reduced-motion: reduce/);
    expect(carte, "le pointillé s'anime quoi qu'on ait demandé")
      .toMatch(/if \(anime\)/);
    /* ⚠️ Et la minuterie s'arrête avec la carte : un intervalle qui survit à
       son composant repeint un calque qui n'existe plus, à chaque battement,
       pour toujours. */
    expect(carte).toMatch(/clearInterval\(battement\.current\)/);
  });

  it("⛔ le doré ne se lit pas seul sur une carte — il a son halo blanc", () => {
    /* 🔴 MESURÉ : `--ocre` sur la craie du plan donne 2,17 pour 1. Un trait
       doré seul se perdrait sur les champs et les grèves — et d'autant plus
       qu'il est POINTILLÉ, donc absent la moitié du temps.
       ⚠️ LE HALO ÉTAIT OLIVE JUSQU'AU 12/11, le fondateur l'a voulu BLANC —
          et le blanc fait mieux le travail : il DÉTOURE au lieu
          d'assombrir, donc il sépare le doré des verts des champs comme des
          bleus de la mer. Ce garde change de raison, pas de sujet : un trait
          doré ne va jamais seul sur une carte. */
    expect(
      readFileSync(new URL("./CarteBalades.tsx", import.meta.url), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, ""),
      "le halo n'est plus blanc",
    ).toMatch(/balades-gaine[\s\S]*?"line-color": "#ffffff"/);
    const carte = readFileSync(new URL("./CarteBalades.tsx", import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(carte, "la gaine a disparu sous le doré").toContain("balades-gaine");
    expect(ratio(jeton("ocre"), "#ffffff"), "l'ocre seul sur un fond clair")
      .toBeLessThan(3);
    /* ⚠️ Et la gaine doit être PLUS LARGE que le doré, sinon elle ne borde
       rien. Les deux largeurs se lisent dans le fichier plutôt que dans ma
       tête. */
    const gaine = Number(carte.match(/balades-gaine[\s\S]*?"line-width": ([\d.]+)/)?.[1]);
    const trace = Number(carte.match(/balades-trace[\s\S]*?"line-width": ([\d.]+)/)?.[1]);
    expect(gaine, `gaine ${gaine} · doré ${trace}`).toBeGreaterThan(trace);
  });

  it("⭐ le parcours touché s'affiche SOUS LA CARTE, et c'est un seul lien", () => {
    /* 🔴 12/11/2026 : « quand on clique sur un parcours, affiche au-dessous
       de la carte le parcours choisi », exemple à l'appui — titre, pratique,
       distance, forme, difficulté, commune, le tout en lien.
       ⭐ SOUS LA CARTE, PAS SOUS LA BANNIÈRE : il vivait trois cents pixels
          plus bas, après les deux rangées de filtres. Une réponse qui n'est
          pas là où l'on a posé le doigt n'est pas une réponse. On vérifie
          donc l'ORDRE, pas seulement la présence. */
    const i = ecran.indexOf("<CarteBalades");
    const j = ecran.indexOf("ot-choisi");
    const k = ecran.indexOf('aria-label="Pays"');
    expect(i, "la carte a disparu").toBeGreaterThan(0);
    expect(j, "le parcours choisi ne s'affiche plus").toBeGreaterThan(i);
    expect(j, "le parcours choisi est passé SOUS les filtres").toBeLessThan(k);
    for (const champ of ["tenu.titre", "tenu.pratique", "tenu.km", "tenu.boucle",
                         "tenu.difficulte", "tenu.commune"]) {
      expect(ecran, `« ${champ} » manque à la ligne du parcours choisi`).toContain(champ);
    }
    /* 🔴 RETOURNÉ LE SOIR MÊME. Le matin, le bloc était UN SEUL lien vers la
       fiche de l'Office — « deux cibles côte à côte pour un seul geste font
       hésiter ». Le fondateur a tranché autrement, et il a raison : ce ne
       sont pas deux façons de faire la même chose. « + d'infos = site de
       l'OT · commencer = mana » — deux destinations VRAIMENT différentes,
       donc deux boutons.
       ⭐ Le partage se lit en deux mots : ce qu'ILS savent (balisage,
          conditions, horaires) est chez eux ; ce que NOUS savons (où l'on met
          les pieds, ce qu'on croise, le GPS, le SOS, le hors-ligne) est ici.
       ⛔ Et le premier part DEHORS : cible externe et `rel` complet, sinon
          la fiche de l'Office s'ouvre dans notre application comme si elle
          était à nous. */
    expect(ecran, "« + d'infos » ne mène plus chez l'Office")
      .toMatch(/href=\{tenu\.source\}[\s\S]{0,120}\+ d'infos/);
    expect(ecran, "« + d'infos » ouvre la fiche de l'Office DANS notre app")
      .toMatch(/href=\{tenu\.source\}\s*\n?\s*target="_blank" rel="noreferrer noopener"/);
    expect(ecran, "« Commencer » ne mène plus à la promenade MANA")
      .toMatch(/promenade\/\$\{PREFIXE_OT\}\$\{tenu\.slug\}/);
  });

  it("⛔ l'attribution de la carte est VISIBLE et suit le fond affiché", () => {
    /* 🔴 `attributionControl: false` la retire de maplibre : c'est alors à
       l'écran de la porter. L'ODbL et la licence de l'IGN demandent une
       mention visible, et elle a DÉJÀ été rognée une fois sur cet écran pour
       gagner seize pixels de carte. ⛔ Créditer OpenStreetMap sous une
       photographie de l'IGN serait faux dans les deux sens : on citerait qui
       n'a rien fourni, et on tairait qui a fourni. */
    const carte = readFileSync(new URL("./CarteBalades.tsx", import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(carte).toMatch(/attributionControl: false/);
    expect(carte, "l'attribution ne dépend pas du fond").toMatch(/ATTRIBUTION\[fond\]/);
    expect(css, "le crédit de la carte peut être rogné")
      .not.toMatch(/\.carte-balades-credit \{[^}]*text-overflow/);
  });

  it("⭐ chaque pratique a son ton pâle, et il tient dans les DEUX régimes", () => {
    /* 🔴 12/11/2026 : « donne une couleur pâle à chaque option : À pied,
       VTT, Vélo, Trail ».
       ⭐ DEUX RÉGIMES POUR UNE SEULE COULEUR : au repos elle est l'ENCRE sur
          le dégradé de la bannière, enfoncée elle devient la SURFACE sous
          `--nuit`. Une teinte qui ne tiendrait que dans un des deux rendrait
          la moitié des états illisible, et c'est l'état ENFONCÉ qu'on
          regarde le moins — donc celui où le défaut dure. */
    const basDuDegrade = "#634b1f";   // le point le plus clair du dégradé
    for (const p of ["pied", "vtt", "velo", "trail"]) {
      const t = jeton(`pratique-${p}`);
      expect(ratio(t, basDuDegrade), `${p} en ENCRE sur la bannière`).toBeGreaterThanOrEqual(4.5);
      expect(ratio(t, jeton("nuit")), `${p} en SURFACE sous l'encre`).toBeGreaterThanOrEqual(4.5);
      expect(css, `la pastille « ${p} » ne porte pas sa teinte`)
        .toMatch(new RegExp(`\\[data-pratique="${p}"\\]`));
    }
    /* ⛔ ET « TOUS » N'EN A PAS : il ne désigne aucune pratique, donc aucune
       couleur ne lui revient — la règle déjà écrite pour le bouton « Tous »
       des vingt-trois genres de la carte du territoire. */
    expect(css, "« Tous » s'est vu attribuer une couleur de pratique")
      .not.toMatch(/\[data-pratique="tous"\]/);
  });

  it("⛔ le socle des pastilles est écrit AVANT ses états — la cascade l'exige", () => {
    /* 🔴 CE GARDE EXISTE PARCE QUE LE DÉFAUT EST ARRIVÉ DEUX FOIS LE MÊME
       JOUR, dans les deux sens. `.ot-entete .ot-filtre` et
       `.ot-entete .ot-filtre-actif` ont la MÊME spécificité — deux classes
       chacun : seul l'ordre de source tranche. Écrit après, le socle efface
       le `color: var(--nuit)` de la pastille enfoncée, et le mot « Tous »
       tombe à **2,16 pour 1** sur sa propre pastille d'or.
       ⭐ Une feuille se lit dans l'ordre : le socle d'abord, les états
          ensuite. Et écrire un commentaire sur la cascade ne protège pas de
          la cascade — ce test, si. */
    const socle = css.indexOf(".ot-entete .ot-filtre {");
    const etat = css.indexOf(".ot-entete .ot-filtre-actif {");
    expect(socle, "le socle des pastilles a disparu").toBeGreaterThan(0);
    expect(etat, "l'état actif des pastilles a disparu").toBeGreaterThan(0);
    expect(socle, "le socle est écrit APRÈS l'état : il l'efface").toBeLessThan(etat);
  });

  it("⭐ choisir une balade amène la carte à elle, lentement", () => {
    /* 🔴 12/11/2026 : « quand on clique sur une balade, zoomer la carte sur
       la balade ».
       ⭐ ET LE VOL EST LENT, pour la raison que le fondateur a donnée du
          liseré : « c'est du slow tourisme ». Un saut instantané fait perdre
          le fil — on ne sait plus OÙ dans le Finistère on vient d'atterrir.
          Un vol montre le chemin parcouru, ce qu'un saut détruit. */
    const carte = readFileSync(new URL("./CarteBalades.tsx", import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(carte, "la carte ne vient plus au tracé choisi")
      .toMatch(/cadrer\(m, \[c\]/);
    expect(carte, "le vol ne respecte pas la préférence de mouvement")
      .toMatch(/MOUVEMENT_VOULU\(\) \? \d{3,} : 0/);
    /* ⛔ ET LA CARTE EST MARQUÉE « TENUE » : sans ça le prochain
       redimensionnement — un clavier qui s'ouvre, une rotation — recadrerait
       sur les 116 et annulerait le zoom qu'on vient de demander. */
    expect(carte, "un zoom demandé ne tient pas contre un redimensionnement")
      .toMatch(/touche\.current = true;\s*\n\s*cadrer\(m, \[c\]/);
  });

  it("⛔ un déplacement PROGRAMMÉ n'est pas un geste — `originalEvent` tranche", () => {
    /* 🔴 CE GARDE NAÎT D'UN DÉFAUT QUE MON PROPRE COMMENTAIRE AFFIRMAIT.
       Il disait « `dragstart`/`zoomstart` ne se déclenchent que sur un
       geste, `fitBounds` ne les émet pas ». maplibre les émet AUSSI pour un
       déplacement programmé : le `cadrer()` du chargement marquait donc la
       carte comme « touchée » avant que personne ne l'ait touchée, et le
       recadrage automatique que je venais d'écrire ne s'exécutait jamais.
       ⭐ Un garde désarmé par la ligne censée l'armer — et la seule
          différence qui tienne est `originalEvent`, que maplibre pose pour
          une souris, un doigt ou une molette, et laisse vide pour un appel.
          Le NOM de l'événement n'en dit rien. */
    const carte = readFileSync(new URL("./CarteBalades.tsx", import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(carte, "les gestes ne se distinguent plus des déplacements programmés")
      .toMatch(/if \(e\.originalEvent\) touche\.current = true/);
  });

  it("⛔ un croisement vide se DIT, il ne se laisse pas lire comme une panne", () => {
    /* « VTT » + « Abers » rend zéro circuit. Sans phrase, la liste disparaît
       et l'écran ressemble à un chargement qui n'a pas abouti — mesuré à
       l'écran avant d'écrire ce garde. */
    expect(ecran).toMatch(/visibles\.length === 0/);
    expect(ecran).toMatch(/Aucun circuit ne réunit ces deux choix/);
  });

  it("⛔ la bannière ne porte plus AUCUN compte — c'est la liste qui compte", () => {
    /* 🔴 TROISIÈME RETOURNEMENT DE CE GARDE EN UNE JOURNÉE, et les trois
       sont écrits parce que la trace vaut plus que la règle finale :
         · le matin il exigeait DEUX nombres (le total, la vue filtrée) ;
         · à midi UN SEUL, celui qui suit la vue — « il y a de la
           redondance : simplifie » ;
         · le soir AUCUN — « supprime : 116 circuits balisés ».
       ⭐ Aucune de ces trois versions n'était fausse quand elle a été
          écrite. Ce qui a changé n'est pas le raisonnement, c'est la
          demande — et c'est pourquoi on retourne plutôt qu'on n'efface.
       ⚠️ CE QUI SURVIT, ET QUI EST LE VRAI SUJET : la page ne doit pas
          ANNONCER un nombre que la liste contredit. Zéro nombre annoncé
          satisfait la règle au moins aussi bien qu'un nombre juste — la
          liste, elle, se voit s'allonger et se réduire quand on filtre. */
    expect(ecran, "un compte est revenu dans la bannière").not.toMatch(/\} circuit\{/);
    expect(ecran, "la classe du compte est restée sans son texte").not.toContain("cp-compte");
    expect(ecran, "l'étiquette fige encore « Tous les circuits »")
      .not.toContain("Tous les circuits");
    /* ⛔ ET LA LISTE RESTE LE COMPTE : si elle cessait de rendre une ligne
       par circuit visible, plus rien sur cette page ne dirait combien il y
       en a. */
    expect(ecran).toMatch(/\{visibles\.map\(\(i\) => \(/);
  });
});
