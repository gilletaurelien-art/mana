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

const SITE = "https://www.crozon-tourisme.bzh";
const SORTIE = new URL("../src/ot.json", import.meta.url);
const R = 111320;

/** Les 49 fiches, relevées le 31/10/2026 sur les trois pages de la liste. */
const SLUGS = `circuit-50-circuit-des-roz le-circuit-de-chleguer le-saut-du-loup
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

const texte = (h) => h.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ")
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

for (const slug of SLUGS) {
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

  const annonce = +(texte(page).match(/([\d]+[.,]?[\d]*)\s*Km/i)?.[1]?.replace(",", ".") ?? 0);
  const motifs = [];
  if (trks > 1) motifs.push(`${trks} tracés dans un seul fichier`);
  if (annonce && Math.abs(L - annonce) / annonce > 0.25) motifs.push(`écart ${((L - annonce) / annonce * 100).toFixed(0)} %`);
  if (etendue > 25) motifs.push(`étendue ${etendue.toFixed(0)} km`);
  if (motifs.length) { refuses.push({ slug, annonce, mesure: +L.toFixed(1), motif: motifs.join(" · ") }); continue; }

  const t = texte(page);
  const simples = simplifier(pts).map(([x, y]) => [+x.toFixed(5), +y.toFixed(5)]);
  retenus.push({
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
    depart: t.match(/Départ\s*:\s*([^"<.]{3,80})/)?.[1]?.trim() ?? null,
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

/* ── LA COMMUNE, PAR LA SOURCE OFFICIELLE ─────────────────────────────────
   ⭐ Elle n'est NI sur la fiche NI extractible de la liste (rendue en JS).
      Plutôt que de recopier 46 noms d'une capture d'écran — une valeur
      recopiée vieillit en silence — on la DEMANDE à la Base Adresse
      Nationale, à partir du premier point du tracé.
   ⚠️ À LA CONSTRUCTION, JAMAIS À L'EXÉCUTION. Ce sont des départs de
      randonnée publics, pas des positions de personnes ; et le résultat est
      figé dans l'artefact, donc l'app n'appelle personne. */
for (const r of retenus) {
  const [lon, lat] = r.p[0];
  try {
    const j = await (await fetch(
      /* ⚠️ SANS `type=municipality` : ce filtre rend une collection VIDE sur
         un point de campagne — il exige un objet « commune » indexé à cet
         endroit précis. Sans lui, la BAN rend l'adresse la plus proche, dont
         la ville. Vérifié : 0/46 avec, et le filtre ne levait rien — il
         rendait poliment zéro résultat. */
      `https://api-adresse.data.gouv.fr/reverse/?lon=${lon}&lat=${lat}`,
    )).json();
    r.commune = j.features?.[0]?.properties?.city ?? null;
  } catch { r.commune = null; }
}
const sansCommune = retenus.filter((r) => !r.commune).length;
console.log(`commune : ${retenus.length - sansCommune}/${retenus.length} par la BAN`);

/* 🔴 LE GARDE DU CHAMP VIDE — posé après l'avoir vécu DEUX FOIS sur la
   commune. ⭐ Un champ vide sur les 46 n'est pas une donnée manquante, c'est
   une extraction fausse : une donnée vraiment absente manque à QUELQUES-UNS,
   pas à tous. Le motif de la durée ou du dénivelé peut cesser de mordre au
   prochain habillage du site de l'Office — et rien, sans ce garde, ne le
   dirait : l'app afficherait simplement des fiches sans chiffres.
   ⚠️ Il court AVANT l'écriture, jamais après : un script qui écrit puis
      vérifie laisse un fichier cassé sur le disque. */
for (const [champ, n] of [
  ["duree", retenus.filter((r) => r.duree).length],
  ["denivele", retenus.filter((r) => r.denivele != null).length],
  ["commune", retenus.length - sansCommune],
]) {
  console.log(`${champ} : ${n}/${retenus.length}`);
  if (n === 0) {
    console.error(`\n⛔ AUCUN « ${champ} » sur ${retenus.length} fiches — c'est une EXTRACTION FAUSSE, pas une donnée absente. Rien n'est écrit.`);
    process.exit(1);
  }
}

console.log(`\n${retenus.length} retenus · ${refuses.length} refusés`);
for (const r of refuses) console.log(`  ⛔ ${r.slug} — ${r.motif}`);

const art = {
  genere: new Date().toISOString().slice(0, 10),
  source: "Office de tourisme Presqu'île de Crozon – Aulne Maritime",
  avertissement: "Tracés publiés par l'Office de tourisme. Accord de reprise à obtenir.",
  itineraires: retenus,
};
await writeFile(SORTIE, JSON.stringify(art));
const o = JSON.stringify(art).length;
console.log(`écrit : src/ot.json — ${(o / 1024).toFixed(0)} Ko · ${retenus.reduce((s, r) => s + r.p.length, 0)} points`);
