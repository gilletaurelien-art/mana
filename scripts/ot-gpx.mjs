/**
 * Rapatrie les itinéraires balisés de l'Office de tourisme.
 *
 * ⛔ CE QUE NOUS PUBLIONS N'EST PAS « UN ITINÉRAIRE MANA ». C'est le tracé de
 *    l'Office, crédité comme tel (`provenance: "ot"` → « Itinéraire balisé par
 *    l'Office de tourisme »). MANA ne s'attribue rien et ne recommande rien :
 *    elle constate qu'il y a des marques sur les poteaux.
 *
 * ⚠️ LES FICHIERS SONT PUBLICS, CE QUI NE VEUT PAS DIRE REDISTRIBUABLES.
 *    Aucun des 49 GPX ne porte de licence, ni la page qui les sert. Le
 *    rapatriement est une décision du fondateur, prise le 31/10/2026 ; l'accord
 *    de l'Office reste à obtenir et c'est le sujet du rendez-vous du 6/11.
 *    ⭐ On l'écrit ici plutôt que de le taire : une donnée reprise sans accord
 *       se retire en une commande, à condition qu'on sache qu'elle est là.
 *
 * ⛔ ET ON NE REDESSINE RIEN. Un tracé approché « d'après » un balisage n'est
 *    pas le balisage : il fait quitter le chemin marqué à la première
 *    imprécision, sous un libellé qui dit « balisé ». Soit leur GPX, soit rien.
 *
 * 🔴 LE CONTRÔLE N'EST PAS UNE FORMALITÉ — 3 des 49 fichiers sont faux.
 *    « Le tour du Cap de la chèvre » contient DEUX tracés : le sien et celui
 *    de la Petite cité du Faou, à 23 km de là. 48,5 km au lieu de 14. Intégré
 *    tel quel, MANA aurait dessiné une ligne en travers de la presqu'île sous
 *    un libellé « balisé par l'Office ».
 *
 *     node scripts/ot-gpx.mjs
 */
import { writeFile, mkdir } from "node:fs/promises";

/* ═══ TROIS OFFICES DEPUIS LE 11/11/2026 ═══════════════════════════════════
   Aurélien : « intègre les balades de toutes les offices de tourisme du
   Finistère nord ». Sondé les sept EPCI du Pays de Brest : CINQ partagent le
   MÊME CMS et le même motif `/itineraire/<slug>/`, et tous leurs GPX vivent
   sur un seul hôte institutionnel (`cdt56`/`cdt29.media.tourinsoft.eu`) — la
   donnée vient de Tourinsoft/Cirkwi, pas des offices. ⛔ Brest métropole est
   écarté SUR DEMANDE (motif `/profiter/rando-velo/`, à faire plus tard) ;
   Landivisiau reste à sonder.

   🔴 ET LE GARDE DU CHAMP VIDE A DÛ CHANGER DE PORTÉE. Il courait sur
   l'ENSEMBLE des fiches : les 46 durées de Crozon auraient masqué un zéro
   chez les Abers, et on aurait écrit un office entier sans chiffres sous un
   total rassurant. Il court maintenant PAR OFFICE. ⭐ C'est « un nombre
   d'ensemble juste masque des mesures fausses » appliqué à un agrégat qu'on
   vient d'inventer : agréger trois sources, c'est se donner le moyen de ne
   plus voir laquelle est cassée.

   ⚠️ LE LIBELLÉ DU DÉPART N'EST PAS LE MÊME PARTOUT. Crozon écrit
   « Départ : », Iroise « DEPART : » en capitales sans accent, la Côte des
   Légendes ne met aucun libellé. Le motif d'origine exigeait l'accent et les
   minuscules : il aurait rendu `null` sur un office entier, en silence. */

const OFFICES = [
  {
    ot: "crozon",
    publie: ["duree", "denivele", "difficulte"],
    nom: "Office de tourisme Presqu'île de Crozon – Aulne Maritime",
    site: "https://www.crozon-tourisme.bzh",
    /* ⚠️ La liste de Crozon est rendue en JavaScript — les 49 slugs restent
       donc relevés à la main (31/10/2026). Les deux autres offices servent
       leurs listes en HTML statique, et s'y parcourent. */
    listes: [],
    emprise: [-4.70, 48.10, -4.00, 48.40],
  },
  {
    ot: "abers",
    publie: ["duree", "denivele", "difficulte"],
    nom: "Office de tourisme du Pays des Abers",
    site: "https://www.abers-tourisme.com",
    listes: ["/a-voir-a-faire/activites/balades-et-randonnees/toutes-les-randos/"],
    emprise: [-4.70, 48.42, -4.29, 48.67],
  },
  {
    ot: "iroise",
    nom: "Office de tourisme Iroise Bretagne",
    site: "https://www.iroise-bretagne.bzh",
    /* 🔴 LA PAGINATION DE CE SITE EST UN LEURRE — vérifié le 11/11/2026 :
       `/sorganiser/randonnee/page/2/` et `/page/3/` rendent **HTTP 200 avec
       les 20 MÊMES slugs**. Un parcours naïf croirait tourner les pages et
       recompterait les mêmes fiches. ⚠️ L'office annonce 35 circuits ; on en
       atteint 26 (20 + 6 par la page trail), le reste étant paginé en
       JavaScript. ⭐ On l'écrit : une couverture partielle qu'on croit
       complète est pire qu'une couverture partielle qu'on sait. */
    listes: ["/sorganiser/randonnee/", "/liroise/a-laventure/trail-en-iroise-2/"],
    /* ⚠️ `publie` SONDÉ SUR QUATRE FICHES, PUIS CORRIGÉ PAR LES 22. Le
       sondage donnait dénivelé 0/4 et j'avais déclaré « non publié » ; la
       passe complète en a trouvé UN — « Circuit trail n°20, à l'assaut du
       fort de Toulbroc'h », 305 m, et c'est un vrai champ de la fiche
       (« Distance 12 Km · Durée 2h · Difficulté Moyen · Dénivelé 305 m »).
       ⭐ CET OFFICE LE PUBLIE SELON LA PRATIQUE, PAS SELON L'OFFICE : ses
       circuits TRAIL portent un dénivelé, ses circuits de randonnée non.
       `publie` est donc une granularité trop grossière pour lui — on déclare
       le champ, et le garde dit alors seulement « si tu en lis zéro alors
       qu'il en existe, tu lis mal ». ⏳ Affiner par pratique quand un
       deuxième office posera la même question. */
    publie: ["duree", "difficulte", "denivele"],
    emprise: [-4.8294, 48.3053, -4.4681, 48.5946],
  },
  {
    ot: "landerneau",
    nom: "Office de tourisme du Pays de Landerneau-Daoulas",
    site: "https://www.tourisme-landerneau-daoulas.fr",
    listes: ["/trouver-son-activite/randonnee-et-velo/balades-et-randos/"],
    /* 🔴 SONDÉ SUR QUATRE FICHES, ET LA PREMIÈRE M'AVAIT TROMPÉ. Sur une
       seule page, la difficulté semblait absente ; sur quatre elle est là
       3 fois. Un témoin unique aurait fait déclarer un champ absent qui
       existe — et le garde aurait alors REFUSÉ les 3 valeurs justes.
       Dénivelé : 0/4, absence vraie. Départ : 0/4, cet office ne le donne
       pas en toutes lettres. */
    publie: ["duree", "difficulte"],
    emprise: [-4.3964, 48.2738, -4.0121, 48.5493],
  },
  {
    ot: "legendes",
    /* 🔴 CET OFFICE NE PUBLIE AUCUN DÉNIVELÉ — vérifié le 11/11/2026 sur la
       fiche « Circuit du phare » : distance, durée, difficulté, rien d'autre.
       Au premier passage, le garde a crié « EXTRACTION FAUSSE » sur 0/11, et
       il avait tort : c'est une absence VRAIE. ⭐ Un garde ne peut pas
       distinguer « la source ne le dit pas » de « on lit mal la source » —
       seul le regard sur la source tranche, donc le résultat de ce regard
       s'ÉCRIT. ⚠️ Et il s'écrit dans le sens sûr : si l'office s'y met, on ne
       lira rien, on ne croira pas lire. */
    publie: ["duree", "difficulte"],
    nom: "Tourisme Côte des Légendes",
    site: "https://www.cotedeslegendes.bzh",
    listes: [
      "/a-voir-a-faire/bouger-se-faire-du-bien/activites-outdoor-nature/randonnee/circuits-randonnees/",
      "/a-voir-a-faire/bouger-se-faire-du-bien/activites-outdoor-nature/velo/circuits-vtt/",
      "/a-voir-a-faire/bouger-se-faire-du-bien/activites-outdoor-nature/randonnee/circuits-footing/",
    ],
    emprise: [-4.52, 48.44, -4.18, 48.71],
  },
];

const SORTIE = new URL("../src/ot.json", import.meta.url);
const R = 111320;

/** Les 49 fiches de CROZON, relevées le 31/10/2026 sur les trois pages de la
 *  liste — rendue en JavaScript, donc non parcourable. */
const SLUGS_CROZON = `circuit-50-circuit-des-roz le-circuit-de-chleguer le-saut-du-loup
le-tour-du-cap-de-la-chevre circuit-du-fret circuit-vtt-cap-a-louest
vers-la-plage-de-trez-bellec circuit-vtt-vieux-bourg-quimerch circuit-dargol
circuit-vtt-bois-du-cleguer circuit-vtt-tour-de-roscanvel circuit-56-argol-landevennec
le-sentier-du-menhir le-circuit-de-saint-julien presquile-voies-vertes
circuit-de-camaret circuit-du-vent-roscanvel circuit-54-circuit-dargol
le-tour-de-camaret la-rade-de-brest circuit-vtt-radio-kimerch de-la-baie-a-locean
a-la-decouverte-du-patrimoine-le-faou vers-le-sommet-du-menez-hom
petite-cite-de-caractere-du-faou circuit-vtt-dinan circuit-55-tour-de-landevennec
le-circuit-du-poulmic le-circuit-du-vieux-bourg le-sentier-du-menez-caon
circuit-vtt-rostudel le-moulin-du-seigneur circuit-vtt-petite-boucle-de-menez-luz
circuit-du-cap-de-la-chevre vers-lile-de-laber circuit-vtt-la-foret
la-balade-ty-ar-chure la-foret-du-cranou circuit-vtt-le-bois-de-quezede
circuit-des-collines le-circuit-de-radio-kimerch lanse-de-saint-nicolas
la-pointe-de-dinan la-balade-de-saint-fiacre laulne-maritime
circuit-vtt-letang-de-kerloch circuit-vtt-tremet le-circuit-de-la-fraternite
le-tour-de-landevennec`.split(/\s+/).filter(Boolean);

/* 🔴 LE CONTENU DES `<script>` DOIT PARTIR AVANT LES BALISES — 11/11/2026.
   La version d'origine ne retirait que les BALISES : le JSON-LD et les blobs
   de suivi restaient dans le « texte ». Conséquence mesurée sur la Côte des
   Légendes : la distance annoncée du « Circuit du phare » était lue dans
   `"codeoffre":"72-ITIBRE029V53KML5-"` — le motif y attrape `53KM`. Comparé
   aux 7,79 km réellement mesurés sur le GPX, ça fait −85 %, et le contrôle a
   REFUSÉ un tracé parfaitement bon.
   ⭐ Le garde s'est allumé, ce qui ressemble à un garde qui marche — mais il
   s'est allumé sur une mesure FAUSSE. Un contrôle qui réussit sur le mauvais
   objet endort : il produit une certitude, et on ne rouvre pas une certitude.
   ⚠️ Et la cause ne touchait pas que la distance : durée, dénivelé, difficulté
   et départ sortent tous du même texte. */
const texte = (h) => h
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ")
  .replace(/&#8217;|&rsquo;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

const metres = (a, b) => {
  const k = Math.cos(((a[1] + b[1]) / 2 * Math.PI) / 180);
  return Math.hypot((a[0] - b[0]) * k, a[1] - b[1]) * R;
};

/** ⚠️ Simplification de Douglas-Peucker. 2 m de tolérance : au-delà on
 *  déplacerait le tracé d'un BALISAGE, ce qu'on s'interdit. En deçà on
 *  transporterait le bruit du relevé GPS d'origine. */
function simplifier(pts, tol = 2) {
  if (pts.length < 3) return pts;
  const garde = new Array(pts.length).fill(false);
  garde[0] = garde[pts.length - 1] = true;
  const pile = [[0, pts.length - 1]];
  while (pile.length) {
    const [i, j] = pile.pop();
    let max = -1, k = -1;
    const a = pts[i], b = pts[j];
    const kx = Math.cos((a[1] * Math.PI) / 180);
    const dx = (b[0] - a[0]) * kx * R, dy = (b[1] - a[1]) * R;
    const L2 = dx * dx + dy * dy;
    for (let m = i + 1; m < j; m++) {
      const px = (pts[m][0] - a[0]) * kx * R, py = (pts[m][1] - a[1]) * R;
      const t = L2 === 0 ? 0 : Math.max(0, Math.min(1, (px * dx + py * dy) / L2));
      const d = Math.hypot(px - t * dx, py - t * dy);
      if (d > max) { max = d; k = m; }
    }
    if (max > tol) { garde[k] = true; pile.push([i, k], [k, j]); }
  }
  return pts.filter((_, i) => garde[i]);
}

await mkdir(new URL("../src/", import.meta.url), { recursive: true });
const retenus = [], refuses = [];

/** Les slugs d'un office : sa liste écrite à la main, PLUS ce que ses pages de
 *  liste donnent. ⭐ On parcourt plutôt que de recopier — une liste de 49
 *  slugs relevée à la main vieillit dès que l'office publie un circuit, et
 *  rien ne le dit. ⚠️ Et on REFUSE un office dont on n'obtient aucun slug :
 *  zéro circuit ressemble à « cet office n'en a pas », alors que c'est le
 *  motif de parcours qui a cessé de mordre. */
async function slugsDe(o) {
  const vus = new Set(o.ot === "crozon" ? SLUGS_CROZON : []);
  for (const chemin of o.listes) {
    const html = await (await fetch(`${o.site}${chemin}`)).text();
    for (const m of html.matchAll(/\/itineraire\/([a-z0-9][a-z0-9-]*)\//g)) vus.add(m[1]);
  }
  return [...vus];
}

for (const o of OFFICES) {
  const slugs = await slugsDe(o);
  console.log(`\n${o.nom} — ${slugs.length} fiche(s)`);
  if (slugs.length === 0) {
    console.error(`⛔ AUCUN slug pour ${o.ot} : le parcours de liste ne mord plus. Rien n'est écrit.`);
    process.exit(1);
  }
  const avant = retenus.length;

for (const slug of slugs) {
  const SITE = o.site;
  const page = await (await fetch(`${SITE}/itineraire/${slug}/`)).text();
  const url = page.match(/https:\/\/[^"']*?\.gpx/)?.[0];
  if (!url) { refuses.push({ slug, motif: "aucun GPX sur la fiche" }); continue; }

  const gpx = await (await fetch(url)).text();
  const trks = (gpx.match(/<trk>/g) ?? []).length;
  const pts = [...gpx.matchAll(/<trkpt lat="([-\d.]+)" lon="([-\d.]+)"/g)]
    .map((m) => [+m[2], +m[1]]);
  if (pts.length < 10) { refuses.push({ slug, motif: "tracé vide ou trop court" }); continue; }

  let L = 0;
  for (let i = 1; i < pts.length; i++) L += metres(pts[i - 1], pts[i]);
  L /= 1000;
  const lon = pts.map((p) => p[0]), lat = pts.map((p) => p[1]);
  const etendue = metres([Math.min(...lon), Math.min(...lat)], [Math.max(...lon), Math.max(...lat)]) / 1000;

  /* ⚠️ `(?:^|[^\w])` ET `\b` : un nombre collé à des lettres est un code, pas
     une distance. Sans cette borne, `V53KML5` passe pour « 53 km ». */
  const annonce = +(texte(page).match(/(?:^|[^\w])(\d+[.,]?\d*)\s*km\b/i)?.[1]?.replace(",", ".") ?? 0);
  const motifs = [];
  if (trks > 1) motifs.push(`${trks} tracés dans un seul fichier`);
  /* ⛔ L'EMPRISE DE L'OFFICE, PAS SEULEMENT L'ÉTENDUE DU TRACÉ. L'étendue
     attrape un fichier qui contient deux circuits éloignés ; elle ne dit rien
     d'un tracé compact posé au mauvais endroit. Le garde de `ot.test.ts`
     existait déjà pour Crozon — il devient un contrôle de PRODUCTION, par
     office, parce qu'à trois sources une erreur d'attribution ne se voit
     plus à l'œil. */
  const [ouest, sud, est, nord] = o.emprise;
  const dehors = pts.find(([x, y]) => x <= ouest || x >= est || y <= sud || y >= nord);
  if (dehors) motifs.push(`hors de l'emprise de ${o.ot} (${dehors[0]},${dehors[1]})`);
  if (annonce && Math.abs(L - annonce) / annonce > 0.25) motifs.push(`écart ${((L - annonce) / annonce * 100).toFixed(0)} %`);
  if (etendue > 25) motifs.push(`étendue ${etendue.toFixed(0)} km`);
  if (motifs.length) { refuses.push({ slug, annonce, mesure: +L.toFixed(1), motif: motifs.join(" · ") }); continue; }

  const t = texte(page);
  const simples = simplifier(pts).map(([x, y]) => [+x.toFixed(5), +y.toFixed(5)]);
  retenus.push({
    ot: o.ot,
    slug,
    titre: (page.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ? texte(page.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)[1]) : slug),
    /* ⚠️ LA COMMUNE N'EST PAS SUR LA FICHE, elle est sur la page de LISTE —
       et celle-ci est rendue en JavaScript. Premier jet : un motif de
       capitales dupliquées, qui a rendu quarante-six champs VIDES sans rien
       signaler. ⭐ Un champ vide sur les 46 n'est pas une donnée manquante,
       c'est une extraction fausse : une donnée vraiment absente manque à
       quelques-uns, pas à tous.
       Ce que la fiche porte, elle, est MIEUX : le point de départ en toutes
       lettres. « Parking du belvédère à Rosnoën » dit où se garer ; « ROSNOËN »
       ne le dit pas. */
    /* ⚠️ `D[EÉ]PART` et `i` : Iroise écrit « DEPART : » en capitales sans
       accent, et le motif d'origine (accentué, sensible à la casse) aurait
       rendu `null` sur ses 35 fiches sans rien signaler. La Côte des
       Légendes, elle, ne met aucun libellé — `null` y est une absence VRAIE,
       et c'est le garde par office qui fait la différence. */
    depart: t.match(/D[EÉ]PART\s*:\s*([^"<.]{3,80})/i)?.[1]?.trim() ?? null,
    pratique: /Running - Trail/.test(t) ? "trail" : /VTT/.test(t) ? "vtt"
            : /Cyclotouriste/.test(t) ? "velo" : "pied",
    difficulte: /\b(Facile|Moyen|Difficile)\b/.exec(t)?.[1]?.toLowerCase() ?? null,
    /* ⭐ LA DURÉE ET LE DÉNIVELÉ SONT DÉCLARÉS PAR L'OFFICE, PAS CALCULÉS PAR
       NOUS — et c'est ce qui les rend publiables. Une durée calculée d'une
       formule (Naismith, Tobler) est une ESTIMATION : l'afficher à côté d'un
       libellé « balisé par l'Office » lui ferait endosser notre arithmétique.
       Ici, la fiche dit « Durée 3h · Dénivelé 153 m » ; on la cite.
       ⛔ ET SURTOUT PAS DEPUIS LE GPX. Les 552 balises `<ele>` du « Sentier du
          Menhir » valent TOUTES 0.0 : le relevé n'a pas d'altitude. Un D+
          calculé là-dessus rendrait 0 m pour tous les circuits, ce qui a l'air
          d'une donnée et n'en est pas une. */
    duree: t.match(/Durée\s+(\d{1,2}\s*h(?:\s*\d{2})?|\d{1,3}\s*min)/i)?.[1]?.replace(/\s+/g, "") ?? null,
    denivele: (() => { const m = t.match(/Dénivelé\s+(\d{1,4})\s*m/i); return m ? +m[1] : null; })(),
    km: +L.toFixed(1),
    boucle: metres(pts[0], pts[pts.length - 1]) < 300,
    source: `${SITE}/itineraire/${slug}/`,
    gpx: url,
    p: simples,
  });
  process.stdout.write(".");
}
  console.log(` ${retenus.length - avant} retenu(s)`);
}

/* ── LA COMMUNE, PAR LA SOURCE OFFICIELLE ─────────────────────────────────
   ⭐ Elle n'est NI sur la fiche NI extractible de la liste (rendue en JS).
      Plutôt que de recopier 46 noms d'une capture d'écran — une valeur
      recopiée vieillit en silence — on la DEMANDE à la Base Adresse
      Nationale, à partir du premier point du tracé.
   ⚠️ À LA CONSTRUCTION, JAMAIS À L'EXÉCUTION. Ce sont des départs de
      randonnée publics, pas des positions de personnes ; et le résultat est
      figé dans l'artefact, donc l'app n'appelle personne. */
/* 🔴 « LA SOURCE EST EN PANNE » N'EST PAS « ON LIT MAL LA SOURCE » — et le
   premier passage du 11/11/2026 a confondu les deux. `api-adresse.data.gouv.fr`
   répondait **302 vers `sorry.data.gouv.fr`**, une page d'excuse en HTML ; le
   script lisait `j.features?.[0]` dessus, obtenait `undefined`, et le garde a
   bloqué l'import ENTIER de 73 tracés pour un champ d'enrichissement.
   ⭐ Une panne externe se CONSTATE (le type de contenu n'est pas du JSON) et
   se DIT ; elle ne doit pas retenir la donnée qui, elle, est bonne. Un `catch`
   qui rend `null` efface la différence : c'est le repli discret qui cache le
   défaut qu'il signale. */
/* ⭐ LE CACHE D'ABORD, LA BAN ENSUITE — et le cache est plus JUSTE qu'elle.
   `src/communes-ot.json` vient de `public.commune_contours` (KS-5) par
   `ST_Contains` sur le premier point du tracé : le contour CONTIENT le point,
   là où la BAN rend l'adresse la plus PROCHE. 69 départs sur 77 y trouvent
   leur commune ; les 8 autres démarrent hors de tout contour — quelques
   mètres au large, le contour s'arrêtant au rivage.
   ⛔ ET C'EST AUSSI CE QUI EMPÊCHE UNE RÉGÉNÉRATION D'EFFACER LE TRAVAIL :
   sans cache, chaque passage pendant une panne de data.gouv.fr réécrivait
   `ot.json` avec zéro commune. La commande qui le reconstruit est dans son
   champ `methode`. */
const CACHE = JSON.parse(
  await import("node:fs/promises").then((m) => m.readFile(new URL("../src/communes-ot.json", import.meta.url), "utf8")),
).communes;
let banMuette = 0, parCache = 0;
for (const r of retenus) {
  const [lon, lat] = r.p[0];
  const connue = CACHE[`${r.ot}/${r.slug}`];
  if (connue) { r.commune = connue; parCache++; continue; }
  try {
    const rep = await fetch(
      /* ⚠️ SANS `type=municipality` : ce filtre rend une collection VIDE sur
         un point de campagne — il exige un objet « commune » indexé à cet
         endroit précis. Sans lui, la BAN rend l'adresse la plus proche, dont
         la ville. Vérifié : 0/46 avec, et le filtre ne levait rien — il
         rendait poliment zéro résultat. */
      `https://api-adresse.data.gouv.fr/reverse/?lon=${lon}&lat=${lat}`,
    );
    const type = rep.headers.get("content-type") ?? "";
    if (!type.includes("json")) { banMuette++; r.commune = null; continue; }
    const j = await rep.json();
    r.commune = j.features?.[0]?.properties?.city ?? null;
  } catch { banMuette++; r.commune = null; }
}
const sansCommune = retenus.filter((r) => !r.commune).length;
console.log(`commune : ${retenus.length - sansCommune}/${retenus.length} · ${parCache} par le cache de contours · ${banMuette} réponse(s) non-JSON de la BAN`);
if (banMuette > 0 && parCache < retenus.length) {
  console.log(`⚠️ ${banMuette} départ(s) sans commune ET sans cache : la BAN ne répond pas en JSON. PANNE externe, pas une extraction fausse — les tracés s'écrivent. Pour les combler, rejouer la requête de « methode » dans src/communes-ot.json.`);
}

/* 🔴 LE GARDE DU CHAMP VIDE — posé après l'avoir vécu DEUX FOIS sur la
   commune. ⭐ Un champ vide sur les 46 n'est pas une donnée manquante, c'est
   une extraction fausse : une donnée vraiment absente manque à QUELQUES-UNS,
   pas à tous. Le motif de la durée ou du dénivelé peut cesser de mordre au
   prochain habillage du site de l'Office — et rien, sans ce garde, ne le
   dirait : l'app afficherait simplement des fiches sans chiffres.
   ⚠️ Il court AVANT l'écriture, jamais après : un script qui écrit puis
      vérifie laisse un fichier cassé sur le disque. */
/* 🔴 LE GARDE COURT PAR OFFICE, PAS SUR LE TOTAL — et c'est le changement qui
   compte dans ce passage à trois sources. Sur l'ensemble, les 46 durées de
   Crozon auraient couvert un zéro chez les Abers : le total serait resté
   rassurant pendant qu'un office entier arrivait sans chiffres. ⭐ Agréger
   trois sources, c'est se donner le moyen de ne plus voir laquelle est
   cassée ; le garde doit descendre au niveau où la source existe encore.
   ⚠️ Il court AVANT l'écriture, jamais après. */
let casse = false;
for (const o of OFFICES) {
  const f = retenus.filter((r) => r.ot === o.ot);
  if (f.length === 0) { console.error(`⛔ ${o.ot} : aucune fiche retenue.`); casse = true; continue; }
  /* ⚠️ `commune` N'EST PAS DANS CE TABLEAU, et c'est délibéré : elle ne vient
     pas de l'office mais de la Base Adresse Nationale. L'y mettre faisait
     afficher « non publié par cet office » sur un champ qu'aucun office ne
     publie — une étiquette vraie par accident et trompeuse par construction.
     La BAN rend compte d'elle-même, au-dessus. */
  const compte = {
    duree: f.filter((r) => r.duree).length,
    denivele: f.filter((r) => r.denivele != null).length,
    difficulte: f.filter((r) => r.difficulte).length,
  };
  for (const [champ, n] of Object.entries(compte)) {
    const attendu = o.publie.includes(champ);
    console.log(`  ${o.ot} · ${champ} : ${n}/${f.length}${attendu ? "" : "   (non publié par cet office)"}`);
    if (attendu && n === 0) {
      console.error(`⛔ ${o.ot} : AUCUN « ${champ} » alors que cet office le PUBLIE — extraction fausse.`);
      casse = true;
    }
  }
}
if (casse) { console.error("\nRien n'est écrit."); process.exit(1); }

console.log(`\n${retenus.length} retenus · ${refuses.length} refusés`);
for (const r of refuses) console.log(`  ⛔ ${r.slug} — ${r.motif}`);

const art = {
  genere: new Date().toISOString().slice(0, 10),
  /* ⚠️ `source` NOMMAIT UN SEUL OFFICE, et il en porte trois depuis le
     11/11/2026 : laissé tel quel, l'artefact aurait crédité Crozon pour les
     tracés des Abers. ⭐ MANA crédite l'office — donc elle doit dire LEQUEL,
     et chaque fiche porte désormais son `ot`. `offices` est la liste vivante ;
     `source` en est la phrase, dérivée, jamais recopiée. */
  /* ⭐ `publie` VOYAGE AVEC L'ARTEFACT, parce que le test en a besoin autant
     que le pipeline : sans lui, un test de « majorité » global laisserait
     passer un office entier sans chiffres — c'est le défaut qu'on vient de
     corriger côté production, il n'y a pas de raison de le laisser côté
     garde. ⚠️ Et il porte l'EMPRISE pour la même raison : le garde « aucun
     tracé ne sort du territoire » n'a de sens que par office. */
  offices: OFFICES.map(({ ot, nom, site, publie, emprise }) => ({ ot, nom, site, publie, emprise })),
  source: `Offices de tourisme : ${OFFICES.map((o) => o.nom.replace(/^Office de tourisme (de |du |)/, "")).join(" · ")}`,
  avertissement: "Tracés publiés par les Offices de tourisme. Accord de reprise à obtenir.",
  itineraires: retenus,
};
await writeFile(SORTIE, JSON.stringify(art));
const o = JSON.stringify(art).length;
console.log(`écrit : src/ot.json — ${(o / 1024).toFixed(0)} Ko · ${retenus.reduce((s, r) => s + r.p.length, 0)} points`);
