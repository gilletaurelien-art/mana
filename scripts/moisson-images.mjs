/**
 * LA MOISSON D'IMAGES — Wikimedia Commons, licence VÉRIFIÉE par fichier.
 *
 * ⭐ POURQUOI COMMONS ET PAS UNSPLASH NI PEXELS. Ce n'est pas un jugement
 *    esthétique : c'est le seul des cinq dépôts cités dont l'API rende, PAR
 *    FICHIER, le nom de la licence, l'auteur, les conditions d'attribution et
 *    l'URL de la page descriptive. Sur les autres, « cette image est libre »
 *    serait une présomption de ma part — exactement ce que la direction
 *    artistique interdit. Une licence se LIT, elle ne se suppose pas.
 *
 * 🔴 LE FILTRE EST UNE LISTE BLANCHE, PAS UNE LISTE NOIRE. Un garde en négatif
 *    dit oui à tout ce qu'on n'a pas pensé à interdire — ici, à la prochaine
 *    licence non libre inventée par un uploadeur. Toute licence inconnue est
 *    REFUSÉE, et le refus est imprimé avec son libellé exact pour qu'on puisse
 *    l'ajouter en connaissance.
 *
 * ⛔ DOCUMENTAIRE ≠ AMBIANCE, ET LA DISTINCTION EST PORTÉE PAR LA REQUÊTE.
 *    Une image moissonnée depuis la catégorie Commons d'un lieu REPRÉSENTE ce
 *    lieu : elle est documentaire, et le manifeste le dit. Une image prise
 *    dans une catégorie de matière (granit, ajonc, brume) n'est l'illustration
 *    de RIEN : elle est d'ambiance, et le manifeste le dit aussi. Aucun code
 *    d'affichage ne doit avoir à deviner.
 *
 * Deux modes, dans cet ordre, jamais l'inverse :
 *   node scripts/moisson-images.mjs prospecter   → liste et licences, rien d'écrit
 *   node scripts/moisson-images.mjs moissonner   → télécharge, encode, manifeste
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const UA = "MANA-atlas/1.0 (https://mana.bzh ; auwel@me.com) node-fetch";
const API = "https://commons.wikimedia.org/w/api.php";

/**
 * ⚠️ LES LIBELLÉS SONT CEUX QUE COMMONS RENVOIE, pas ceux qu'on croit.
 *    « cc-by-sa-4.0 » et « CC BY-SA 4.0 » coexistent selon les fichiers : on
 *    normalise avant de comparer, sinon le filtre rejette des images libres.
 */
const LICENCES_LIBRES = new Map([
  ["cc0", { nom: "CC0", attribution: false }],
  ["publicdomain", { nom: "Domaine public", attribution: false }],
  ["pd-self", { nom: "Domaine public (auteur)", attribution: false }],
  ["pd-user", { nom: "Domaine public (auteur)", attribution: false }],
  ["ccby1.0", { nom: "CC BY 1.0", attribution: true }],
  ["ccby2.0", { nom: "CC BY 2.0", attribution: true }],
  ["ccby2.5", { nom: "CC BY 2.5", attribution: true }],
  ["ccby3.0", { nom: "CC BY 3.0", attribution: true }],
  ["ccby4.0", { nom: "CC BY 4.0", attribution: true }],
  ["ccbysa1.0", { nom: "CC BY-SA 1.0", attribution: true }],
  ["ccbysa2.0", { nom: "CC BY-SA 2.0", attribution: true }],
  ["ccbysa2.5", { nom: "CC BY-SA 2.5", attribution: true }],
  ["ccbysa3.0", { nom: "CC BY-SA 3.0", attribution: true }],
  ["ccbysa4.0", { nom: "CC BY-SA 4.0", attribution: true }],
]);
const clefLicence = (s) => String(s || "").toLowerCase().replace(/[\s\-_]/g, "");

/**
 * ⛔ GFDL SEULE EST ÉCARTÉE DÉLIBÉRÉMENT. Elle est « libre » au sens de la FSF
 *    mais exige d'embarquer le texte intégral de la licence avec chaque copie
 *    de l'œuvre — inapplicable à une vignette dans une interface. Beaucoup de
 *    fichiers Commons portent GFDL **et** une CC : ceux-là passent par la CC.
 */

/** Les demandes. Chacune nomme SON lieu — ou dit explicitement qu'elle n'en a pas. */
const DEMANDES = [
  // ── A · PAYSAGES IMMERSIFS ────────────────────────────────────────────────
  { id: "pen-hir",      famille: "coastal",  cat: "Pointe de Pen-Hir",        lieu: "Pointe de Pen-Hir, Camaret-sur-Mer", garde: 3 },
  { id: "tas-de-pois",  famille: "coastal",  cat: "Tas de Pois",              lieu: "Tas de Pois, Camaret-sur-Mer", garde: 2 },
  { id: "cap-chevre",   famille: "coastal",  cat: "Cap de la Chèvre",         lieu: "Cap de la Chèvre, Crozon", garde: 3 },
  { id: "pointe-dinan", famille: "coastal",  cat: "Pointe de Dinan",          lieu: "Pointe de Dinan, Crozon", garde: 3 },
  { id: "ile-vierge",   famille: "coastal",  cat: "Plage de l'île Vierge",    lieu: "Plage de l'île Vierge, Crozon", garde: 2 },
  { id: "anse-morgat",  famille: "coastal",  cat: "Anse de Morgat",           lieu: "Anse de Morgat, Crozon", garde: 2 },
  { id: "presquile",    famille: "coastal",  cat: "Presqu'île de Crozon",     lieu: "Presqu'île de Crozon", garde: 3 },
  { id: "espagnols",    famille: "coastal",  cat: "Pointe des Espagnols",     lieu: "Pointe des Espagnols, Roscanvel", garde: 2 },
  { id: "aber",         famille: "coastal",  cat: "Aber de Crozon",           lieu: "L'Aber, Crozon", garde: 2 },

  // ── B · CHEMINS ET PROMENADES ─────────────────────────────────────────────
  { id: "gr34",         famille: "trails",   cat: "GR 34",                    lieu: "Sentier côtier GR 34, Bretagne", garde: 4 },
  { id: "dunes",        famille: "trails",   cat: "Coastal dunes of Finistère", lieu: "Dunes littorales, Finistère", garde: 2 },

  // ── C · PATRIMOINE ET LIEUX ───────────────────────────────────────────────
  { id: "toulinguet",   famille: "heritage", cat: "Pointe du Toulinguet",     lieu: "Pointe du Toulinguet, Camaret-sur-Mer", garde: 2 },
  { id: "phare-toul",   famille: "heritage", cat: "Toulinguet lighthouse",    lieu: "Phare du Toulinguet, Camaret-sur-Mer", garde: 2 },
  { id: "lagatjar",     famille: "heritage", cat: "Alignement de Lagatjar",   lieu: "Alignement de Lagatjar, Camaret-sur-Mer", garde: 3 },
  { id: "saint-hernot", famille: "heritage", cat: "Chapelle Saint-Hernot de Crozon", lieu: "Chapelle Saint-Hernot, Crozon", garde: 2 },
  { id: "arche-hernot", famille: "heritage", cat: "Arche de la Pointe de Saint-Hernot", lieu: "Arche de Saint-Hernot, Crozon", garde: 2 },
  { id: "rocamadour",   famille: "heritage", cat: "Chapelle de Notre-Dame-de-Rocamadour (Camaret-sur-Mer)", lieu: "Chapelle Notre-Dame-de-Rocamadour, Camaret-sur-Mer", garde: 2 },
  { id: "chateau-dinan",famille: "heritage", cat: "Château de la pointe de Dinan", lieu: "Château de Dinan, Crozon", garde: 2 },
  { id: "capucins",     famille: "heritage", cat: "Pointe des Capucins",      lieu: "Pointe des Capucins, Roscanvel", garde: 2 },
  { id: "grottes",      famille: "heritage", cat: "Grottes de Morgat",        lieu: "Grottes de Morgat, Crozon", garde: 2 },
  { id: "phare-morgat", famille: "heritage", cat: "Phare de Morgat",          lieu: "Phare de Morgat, Crozon", garde: 1 },

  // ── D · DÉTAILS SENSORIELS — AUCUN LIEU, et c'est volontaire ──────────────
  { id: "ajonc",        famille: "details",  cat: "Ulex europaeus",      ambiance: true, garde: 3 },
  { id: "bruyere",      famille: "details",  cat: "Calluna vulgaris",    ambiance: true, garde: 3 },
  { id: "armerie",      famille: "details",  cat: "Armeria maritima",    ambiance: true, garde: 2 },
  { id: "vagues",       famille: "details",  cat: "Waves",               ambiance: true, garde: 2 },

  // ── E · VUES AÉRIENNES ────────────────────────────────────────────────────
  { id: "aerien",       famille: "aerial",   cat: "Aerial photographs of Finistère", lieu: "Finistère, vu du ciel", garde: 4 },
];

async function jsonAPI(params) {
  const u = new URL(API);
  for (const [k, v] of Object.entries({ action: "query", format: "json", formatversion: 2, ...params })) u.searchParams.set(k, v);
  const r = await fetch(u, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`API ${r.status} sur ${params.gcmtitle || params.gsrsearch}`);
  return r.json();
}

const txt = (m, k) => (m?.[k]?.value ?? "").replace(/<[^>]*>/g, "").trim();

/** Les candidates d'une catégorie, licences lues, refus EXPLIQUÉS. */
async function candidates(d) {
  const j = await jsonAPI({
    generator: "categorymembers",
    gcmtitle: `Category:${d.cat}`,
    gcmtype: "file",
    gcmlimit: 60,
    prop: "imageinfo",
    iiprop: "url|size|extmetadata|mime",
    // ⭐ On DEMANDE la vignette au lieu de fabriquer son URL : la convention de
    //    nommage des miniatures Commons n'est pas un contrat public, et mon
    //    premier essai l'a devinée de travers — 264 candidates, zéro planche.
    iiurlwidth: 640,
  });
  const pages = j?.query?.pages ?? [];
  const gardees = [], refusees = [];
  for (const p of pages) {
    const ii = p.imageinfo?.[0];
    if (!ii) continue;
    const m = ii.extmetadata;
    const brut = txt(m, "LicenseShortName") || txt(m, "License");
    const lic = LICENCES_LIBRES.get(clefLicence(brut));
    const fiche = {
      titre: p.title,
      page: ii.descriptionurl,
      fichier: ii.url.split("?")[0],
      vignette: (ii.thumburl || "").split("?")[0],
      largeur: ii.width, hauteur: ii.height, octets: ii.size, mime: ii.mime,
      auteur: txt(m, "Artist") || txt(m, "Credit") || "auteur non déclaré",
      licence: lic?.nom ?? null, licenceBrute: brut,
      attribution: lic?.attribution ?? null,
      conditions: txt(m, "UsageTerms") || brut,
      date: txt(m, "DateTimeOriginal") || txt(m, "DateTime") || "",
    };
    // ⚠️ Trois refus structurels AVANT l'esthétique : la licence, le format
    //    (pas de SVG ni de TIFF dans une bibliothèque photographique), et la
    //    taille — une image de moins de 1 600 px de large ne tiendra pas une
    //    couverture sur écran Retina.
    if (!lic) { refusees.push({ ...fiche, pourquoi: `licence non reconnue : « ${brut || "aucune" } »` }); continue; }
    if (!/^image\/(jpeg|png|webp)$/.test(ii.mime)) { refusees.push({ ...fiche, pourquoi: `format ${ii.mime}` }); continue; }
    if (ii.width < 1600) { refusees.push({ ...fiche, pourquoi: `trop petite (${ii.width} px)` }); continue; }
    gardees.push(fiche);
  }
  // ⭐ LE CLASSEMENT EST UN CHOIX DE DIRECTION, PAS UN TRI PAR TAILLE. On
  //    privilégie le PAYSAGE (ratio ≥ 1,3) parce que les couvertures et les
  //    bannières sont horizontales, puis la résolution. Un portrait de 6 000 px
  //    ne sert aucun des cinq recadrages définis par la charte.
  const score = (f) => {
    const r = f.largeur / f.hauteur;
    const paysage = r >= 1.3 ? 2 : r >= 0.95 ? 1 : 0;
    return paysage * 1e9 + f.largeur;
  };
  gardees.sort((a, b) => score(b) - score(a));
  return { gardees, refusees };
}

const mode = process.argv[2];

if (mode === "prospecter") {
  let nGardees = 0, nRefusees = 0;
  const parLicence = new Map();
  const inconnues = new Map();
  for (const d of DEMANDES) {
    try {
      const { gardees, refusees } = await candidates(d);
      nGardees += gardees.length; nRefusees += refusees.length;
      for (const f of gardees) parLicence.set(f.licence, (parLicence.get(f.licence) ?? 0) + 1);
      for (const f of refusees) if (f.pourquoi.startsWith("licence")) inconnues.set(f.licenceBrute || "(aucune)", (inconnues.get(f.licenceBrute || "(aucune)") ?? 0) + 1);
      const r = gardees.slice(0, d.garde);
      console.log(`\n■ ${d.id}  [${d.famille}]  ${d.lieu ?? "— ambiance, aucun lieu —"}`);
      console.log(`  ${gardees.length} libres / ${gardees.length + refusees.length} examinées · on garderait ${r.length}`);
      for (const f of r) console.log(`    · ${f.largeur}×${f.hauteur}  ${f.licence.padEnd(12)} ${f.auteur.slice(0, 44)}\n      ${f.titre}`);
      if (gardees.length < d.garde) console.log(`    ⚠️ MANQUE ${d.garde - gardees.length} — la catégorie n'en offre pas assez`);
    } catch (e) {
      console.log(`\n■ ${d.id}  🔴 ÉCHEC : ${e.message}`);
    }
  }
  console.log(`\n── BILAN ──\n${nGardees} libres, ${nRefusees} écartées.`);
  console.log("licences retenues :", [...parLicence].map(([k, v]) => `${k}×${v}`).join(", "));
  console.log("libellés REFUSÉS (à examiner, jamais à autoriser en masse) :");
  for (const [k, v] of [...inconnues].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`   ${String(v).padStart(4)} × « ${k} »`);
  process.exit(0);
}

/**
 * ── LA PLANCHE-CONTACT ────────────────────────────────────────────────────
 * 🔴 PARCE QU'UNE CATÉGORIE N'EST PAS UN SUJET, ET QUE JE L'AI VÉRIFIÉ À MES
 *    DÉPENS. Première passe, tri automatique par résolution : `Category:GR 34`
 *    a rendu en tête deux gros plans de grande ciguë, et `Category:Granite`
 *    un échantillon de granite BRÉSILIEN. Les deux sont dans la bonne
 *    catégorie — une plante photographiée le long du sentier, une roche qui
 *    est bien du granite — et les deux sont de parfaits contresens éditoriaux.
 *    ⭐ Une catégorie Commons est un ÉTIQUETAGE ; une direction artistique est
 *    un CHOIX. Aucun score de mégapixels ne franchit cet écart.
 *    Ce mode ne choisit donc rien : il fabrique de quoi REGARDER, et la
 *    sélection se fait à l'œil, puis s'inscrit dans `retenues.json`.
 */
if (mode === "planche") {
  const sharp = (await import("sharp")).default;
  const OUT = process.env.PLANCHES || "/tmp/mana-planches";
  mkdirSync(OUT, { recursive: true });
  const COL = 4, CELL = 300, LIG = 34;
  const legende = {};
  for (const d of DEMANDES) {
    const { gardees } = await candidates(d);
    const lot = gardees.slice(0, 12);
    if (!lot.length) { console.log(`— ${d.id} : aucune candidate libre`); continue; }
    const tuiles = [];
    for (let i = 0; i < lot.length; i++) {
      const f = lot[i];
      const etiquette = `${d.id}#${i + 1}`;
      legende[etiquette] = { titre: f.titre, page: f.page, auteur: f.auteur, licence: f.licence, dim: `${f.largeur}×${f.hauteur}` };
      // ⚠️ On tire la VIGNETTE Commons, pas l'original : télécharger douze
      //    fichiers de 8 000 px pour en retenir trois serait indéfendable
      //    envers l'hébergeur comme envers le temps.
      if (!f.vignette) { console.log(`   ⚠️ ${etiquette} : l'API n'a pas rendu de vignette`); continue; }
      let buf;
      try {
        const r = await fetch(f.vignette, { headers: { "User-Agent": UA } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        buf = Buffer.from(await r.arrayBuffer());
        buf = await sharp(buf).rotate().resize(CELL, CELL - LIG, { fit: "cover" }).toBuffer();
      } catch (e) {
        // ⚠️ Un `catch` muet a coûté une passe entière : 26 planches annoncées
        //    « vignettes injoignables » sans jamais dire POURQUOI.
        console.log(`   ⚠️ ${etiquette} : ${e.message}`);
        continue;
      }
      const bandeau = Buffer.from(
        `<svg width="${CELL}" height="${LIG}"><rect width="${CELL}" height="${LIG}" fill="#192b43"/>` +
        `<text x="8" y="22" font-family="monospace" font-size="17" fill="#eeebdd">${etiquette}</text>` +
        `<text x="${CELL - 8}" y="22" text-anchor="end" font-family="monospace" font-size="12" fill="#92977c">${f.largeur}×${f.hauteur}</text></svg>`);
      tuiles.push(await sharp({ create: { width: CELL, height: CELL, channels: 3, background: "#343f32" } })
        .composite([{ input: buf, top: LIG, left: 0 }, { input: bandeau, top: 0, left: 0 }]).png().toBuffer());
    }
    // ⚠️ Zéro vignette téléchargée donne une image de hauteur 0 : sharp lève,
    //    et l'échec d'une seule planche emporterait toutes les suivantes.
    if (!tuiles.length) { console.log(`— ${d.id} : vignettes injoignables`); continue; }
    const lignes = Math.ceil(tuiles.length / COL);
    const sheet = await sharp({ create: { width: COL * CELL, height: lignes * CELL, channels: 3, background: "#eeebdd" } })
      .composite(tuiles.map((input, i) => ({ input, top: Math.floor(i / COL) * CELL, left: (i % COL) * CELL })))
      .jpeg({ quality: 78 }).toBuffer();
    writeFileSync(join(OUT, `${d.famille}-${d.id}.jpg`), sheet);
    console.log(`planche ${d.famille}-${d.id}.jpg — ${tuiles.length} candidates`);
  }
  writeFileSync(join(OUT, "legende.json"), JSON.stringify(legende, null, 2) + "\n");
  console.log(`\n${Object.keys(legende).length} candidates sur planche dans ${OUT}`);
  process.exit(0);
}

/**
 * ── LA MOISSON DES RETENUES ───────────────────────────────────────────────
 * ⭐ ON NE MOISSONNE PAS UNE CATÉGORIE, ON MOISSONNE UNE SÉLECTION. Le mode
 *    `moissonner` prend les premières de chaque catégorie : il sert à
 *    explorer, jamais à livrer. Ce mode-ci lit `src/images/retenues.json`,
 *    c'est-à-dire des fichiers nommés un par un APRÈS avoir été regardés.
 *
 * 🔴 LA LICENCE EST RELUE ICI, et pas « déjà vérifiée à la prospection ».
 *    Une licence Commons peut changer entre deux passes — une image peut être
 *    proposée à la suppression pour violation de droits le lendemain de sa
 *    prospection. Le contrôle qui compte est celui qui tourne au moment où
 *    l'octet entre dans le dépôt.
 */
if (mode === "retenir") {
  const sharp = (await import("sharp")).default;
  const choix = JSON.parse(readFileSync("src/images/retenues.json", "utf8"));
  const SORTIE = "public/images";
  /* 🔴 PAS DE 2400 px, ET C'EST UNE MESURE QUI L'A DÉCIDÉ, PAS UN GOÛT.
     Distribution relevée le 31/10 sur les 29 images, en AVIF :
        480 px → médiane  11 Ko
        960 px → médiane  41 Ko, max  85   ← ce qu'un téléphone charge
       1600 px → médiane 111 Ko, max 226
       2400 px → médiane 233 Ko, max 484
     Or un téléphone de 390 px à 3× réclame 1 170 px : le navigateur prend la
     1600, jamais la 2400. Seul un grand écran de bureau en retina l'atteint —
     et MANA est une application de terrain. Ces 29 fichiers pesaient 6,8 Mo
     que le mobile ne télécharge jamais, et que le cache hors ligne aurait
     gardés quand même.
     ⭐ Le garde de poids avait signalé un dépassement à 440 Ko. La bonne
        réponse n'était pas de relever le seuil pour faire passer le test :
        c'était de regarder QUI charge ce fichier, et de constater que
        personne ne le charge. */
  const LARGEURS = [480, 960, 1600];
  mkdirSync(SORTIE, { recursive: true });

  // ⚠️ Une seule requête pour les 24 titres : l'API en accepte 50, et vingt
  //    quatre allers-retours pour la même information seraient discourtois.
  const titres = choix.images.map((i) => i.fichier);
  const j = await jsonAPI({
    titles: titres.join("|"),
    prop: "imageinfo",
    iiprop: "url|size|extmetadata|mime",
  });
  const parTitre = new Map();
  for (const p of j?.query?.pages ?? []) {
    if (p.missing) { console.log(`🔴 INTROUVABLE sur Commons : ${p.title}`); continue; }
    parTitre.set(p.title, p);
  }
  // Commons normalise certains titres (apostrophes, soulignés) : on suit la
  // table de normalisation que l'API renvoie plutôt que de la deviner.
  for (const n of j?.query?.normalized ?? []) {
    if (parTitre.has(n.to)) parTitre.set(n.from, parTitre.get(n.to));
  }

  const manifeste = [];
  let refus = 0;
  for (const voulu of choix.images) {
    const p = parTitre.get(voulu.fichier);
    if (!p) { console.log(`🔴 ${voulu.id} : absent de la réponse — rien d'inventé, rien de substitué`); refus++; continue; }
    const ii = p.imageinfo?.[0];
    const m = ii.extmetadata;
    const brut = txt(m, "LicenseShortName") || txt(m, "License");
    const lic = LICENCES_LIBRES.get(clefLicence(brut));
    if (!lic) { console.log(`🔴 ${voulu.id} : licence « ${brut} » NON LIBRE aujourd'hui — écartée`); refus++; continue; }

    /* ⚠️ ON NE RETÉLÉCHARGE PAS CE QUI EST DÉJÀ ENCODÉ. Sans ce garde, ajouter
       cinq images à une sélection de vingt-quatre refait vingt-neuf
       téléchargements d'originaux de 8 000 px et deux cent trente-deux
       encodages AVIF — une demi-heure pour cinq fichiers, et autant de charge
       inutile sur l'hébergeur de Commons.
       ⭐ Le témoin est la variante la PLUS GRANDE attendue, pas la première :
          une passe interrompue laisse les petites largeurs écrites et les
          grandes manquantes, et un témoin pris sur la petite déclarerait
          terminé un travail à moitié fait. */
    const deja = existsSync(join(SORTIE, `${voulu.id}-960.avif`))
              && existsSync(join(SORTIE, `${voulu.id}-1600.avif`));
    const r = deja ? null : await fetch(ii.url.split("?")[0], { headers: { "User-Agent": UA } });
    if (r && !r.ok) { console.log(`🔴 ${voulu.id} : téléchargement HTTP ${r.status}`); refus++; continue; }
    const brutBuf = r ? Buffer.from(await r.arrayBuffer()) : readFileSync(join(SORTIE, `${voulu.id}-1600.avif`));
    const meta = await sharp(brutBuf).rotate().metadata();

    const variantes = [];
    for (const w of LARGEURS) {
      // ⚠️ La borne se lit sur l'ORIGINAL distant, pas sur le tampon local :
      //    quand on saute le téléchargement, `meta` décrit une variante déjà
      //    réduite, et on recalculerait les largeurs à partir d'elle.
      if (w > (deja ? ii.width : meta.width)) continue;
      for (const [fmt, opts] of [["avif", { quality: 50, effort: 6 }], ["webp", { quality: 72 }]]) {
        const nom = `${voulu.id}-${w}.${fmt}`;
        const chemin = join(SORTIE, nom);
        let buf;
        if (deja && existsSync(chemin)) {
          buf = readFileSync(chemin);
        } else {
          buf = await sharp(brutBuf).rotate()
            .resize({ width: w, withoutEnlargement: true })[fmt](opts).toBuffer();
          writeFileSync(chemin, buf);
        }
        variantes.push({ fichier: nom, largeur: w, format: fmt, octets: buf.length });
      }
    }

    manifeste.push({
      id: voulu.id, famille: voulu.famille, role: voulu.role,
      // 🔴 LE CONTRAT DOCUMENTAIRE, EN DEUX CHAMPS LIÉS. `lieu` non nul ⇒
      //    cette photographie MONTRE ce lieu, et peut l'illustrer. `lieu: null`
      //    ⇒ ambiance : aucun code n'a le droit de lui coller un toponyme.
      lieu: voulu.lieu ?? null,
      documentaire: voulu.lieu != null,
      pourquoi: voulu.pourquoi ?? null,
      /* ⭐ « entier » = ceci est un DOCUMENT, pas une photographie. Une photo
         se recadre et reste elle-même ; un plan recadré n'est plus un plan. */
      cadrage: voulu.cadrage === "entier" ? "entier" : "recadrable",
      /* ⭐ Le point focal voyage AVEC l'image, pas avec l'écran : la même
         photographie est recadrée en couverture, en bannière et en vignette,
         et son sujet ne change pas de place entre les trois. */
      focale: voulu.focale ?? null,
      // ⭐ Les dimensions publiées sont celles de l'ORIGINAL : elles servent
      //    au `width`/`height` du <img>, donc au RATIO réservé avant chargement.
      //    Celles d'une variante donneraient un ratio juste et une réservation
      //    de place fausse — le décalage de mise en page qu'on cherche à éviter.
      largeur: ii.width, hauteur: ii.height,
      ratio: +(ii.width / ii.height).toFixed(3),
      source: "Wikimedia Commons", page: ii.descriptionurl, fichierSource: voulu.fichier,
      auteur: txt(m, "Artist") || txt(m, "Credit") || "auteur non déclaré",
      licence: lic.nom, attributionRequise: lic.attribution,
      conditions: txt(m, "UsageTerms") || brut,
      dateOeuvre: txt(m, "DateTimeOriginal") || txt(m, "DateTime") || "",
      collecte: new Date().toISOString().slice(0, 10),
      variantes,
    });
    const ko = Math.round(variantes.reduce((s, v) => s + v.octets, 0) / 1024);
    console.log(`${deja ? "↺" : "✓"} ${voulu.id.padEnd(22)} ${ii.width}×${ii.height} · ${variantes.length} fichiers · ${ko} Ko · ${lic.nom}`);
  }

  writeFileSync("src/images/bibliotheque.json", JSON.stringify({
    _: "GÉNÉRÉ par `node scripts/moisson-images.mjs retenir`. ⛔ Ne pas éditer à la main : une image ajoutée ici sans passer par la moisson n'a pas de licence vérifiée, et le crédit affiché serait une affirmation sans preuve.",
    genere: new Date().toISOString(),
    images: manifeste,
  }, null, 2) + "\n");
  const total = manifeste.reduce((s, i) => s + i.variantes.reduce((a, v) => a + v.octets, 0), 0);
  console.log(`\n${manifeste.length} images retenues, ${refus} écartées · ${(total / 1048576).toFixed(1)} Mo sur disque`);
  process.exit(refus ? 1 : 0);
}

if (mode !== "moissonner") {
  console.error("usage : moisson-images.mjs prospecter | moissonner");
  process.exit(2);
}

// ── MOISSON ────────────────────────────────────────────────────────────────
const sharp = (await import("sharp")).default;
const SORTIE = "public/images";
const LARGEURS = [480, 960, 1600, 2400];
mkdirSync(SORTIE, { recursive: true });

const manifeste = [];
for (const d of DEMANDES) {
  const { gardees } = await candidates(d);
  const choisies = gardees.slice(0, d.garde);
  if (choisies.length === 0) { console.log(`⚠️ ${d.id} : rien de libre, on n'invente pas`); continue; }
  for (let i = 0; i < choisies.length; i++) {
    const f = choisies[i];
    const id = choisies.length > 1 ? `${d.id}-${i + 1}` : d.id;
    const r = await fetch(f.fichier, { headers: { "User-Agent": UA } });
    if (!r.ok) { console.log(`⚠️ ${id} : téléchargement ${r.status}`); continue; }
    const brut = Buffer.from(await r.arrayBuffer());
    const variantes = [];
    for (const w of LARGEURS) {
      if (w > f.largeur) continue;
      for (const [fmt, opts] of [["avif", { quality: 52, effort: 6 }], ["webp", { quality: 74 }]]) {
        const nom = `${id}-${w}.${fmt}`;
        const buf = await sharp(brut).rotate().resize({ width: w, withoutEnlargement: true })[fmt](opts).toBuffer();
        writeFileSync(join(SORTIE, nom), buf);
        variantes.push({ fichier: nom, largeur: w, format: fmt, octets: buf.length });
      }
    }
    const meta = await sharp(brut).metadata();
    manifeste.push({
      id, famille: d.famille,
      // 🔴 LE CHAMP QUI COMMANDE TOUT L'AFFICHAGE. `lieu` non nul = cette image
      //    REPRÉSENTE ce lieu. `lieu: null` = ambiance, elle n'illustre rien.
      lieu: d.ambiance ? null : d.lieu,
      documentaire: !d.ambiance,
      ratio: +(meta.width / meta.height).toFixed(3),
      source: "Wikimedia Commons",
      page: f.page, original: f.fichier,
      auteur: f.auteur, licence: f.licence, attributionRequise: f.attribution,
      conditions: f.conditions, dateOeuvre: f.date,
      collecte: new Date().toISOString().slice(0, 10),
      variantes,
    });
    const ko = Math.round(variantes.filter(v => v.format === "avif").reduce((s, v) => s + v.octets, 0) / 1024);
    console.log(`✓ ${id.padEnd(18)} ${f.largeur}×${f.hauteur} → ${variantes.length} fichiers · ${ko} Ko en AVIF · ${f.licence}`);
  }
}

mkdirSync("src/images", { recursive: true });
writeFileSync("src/images/bibliotheque.json", JSON.stringify({
  avertissement: "Généré par scripts/moisson-images.mjs. Ne pas éditer à la main : toute image ajoutée ici sans passer par la moisson n'a pas de licence vérifiée.",
  genere: new Date().toISOString(),
  images: manifeste,
}, null, 2) + "\n");
console.log(`\n${manifeste.length} images, manifeste écrit dans src/images/bibliotheque.json`);
