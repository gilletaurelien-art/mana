// LA CARTE DU MONDE — les sites remarquables, partout.
//
// 🔴 ARBITRAGE D'AURÉLIEN, 14/11/2026 : « la carte de MANAhome doit afficher
//    la carte du monde entier avec tous les sites remarquables », puis « tout
//    va se faire via la carte => pas de listing. La carte. Si la plage n'a pas
//    de nom ce n'est pas grave, si elle est à côté, c'est bon. »
//
// ⭐ POURQUOI UNE QUATRIÈME CARTE, ALORS QUE J'AI ÉCRIT QU'IL N'EN FAUDRAIT
//    PAS. J'ai étendu `CarteReelle` plutôt que d'en écrire une pour les
//    hébergements (57 épingles), et c'était juste : ses repères sont des
//    éléments du DOM, positionnés un par un en JavaScript à chaque
//    déplacement. Ici il y en a jusqu'à 1 500 PAR TUILE et plusieurs tuiles à
//    l'écran — le DOM n'est pas le bon outil, la carte doit les dessiner
//    elle-même (une couche WebGL). ⛔ La raison n'est donc pas « c'est un
//    autre écran », c'est « ce n'est pas la même technique de rendu ». Si un
//    jour les repères DOM savaient tenir 10 000 points, ces deux cartes
//    devraient fusionner.
//
// ⚠️ LES TUILES SE CHARGENT SELON CE QU'ON REGARDE. 11 721 fichiers, 138 Mo :
//    on ne les télécharge évidemment pas tous. Le cadre visible donne les
//    tuiles z8 à demander, et on garde celles déjà lues.
import { useEffect, useRef, useState } from "react";
import maplibregl, { type Map as CarteML } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { STYLE_CARTE as STYLE, STYLE_ORTHO } from "./carte-fond";
/* ⭐ L'arithmétique vit dans `tuiles.ts`, qui s'éprouve sans navigateur —
   voir l'en-tête de ce fichier-là : un volet masqué fabrique un écran noir
   et interdit de conclure, il n'interdit pas de vérifier autrement. */
import { Z, SITES_POSES, tuilesDuCadre } from "./tuiles";

const BASE = (import.meta.env.VITE_GRAPHE_BASE ?? "https://mana.bzh/bretagne/g")
  .replace(/\/bretagne\/g$/, "")
  .replace(/\/monde\/g$/, "");
const TUILES = `${BASE}/monde/s`;

interface Site { n: string; c: string; g: [number, number]; a?: 1 }

const LIBELLES: Record<string, string> = {
  parc: "Parc", sommet: "Sommet", memorial: "Mémorial", plage: "Plage",
  panorama: "Point de vue", sentier: "Sentier", baie: "Baie",
  site_archeologique: "Site archéologique", source_naturelle: "Source",
  cap: "Cap", ruine: "Ruines", chateau: "Château", chapelle: "Chapelle",
  grotte: "Grotte", col: "Col", cascade: "Cascade", calvaire: "Calvaire",
  moulin: "Moulin", megalithe: "Mégalithe", phare: "Phare", ile: "Île",
  rocher: "Rocher", fontaine: "Fontaine", epave: "Épave", musee: "Musée",
  oeuvre: "Œuvre", lande: "Lande", lieu_de_culte: "Édifice religieux",
  fortification: "Fortification", archeologie: "Site archéologique",
  nature: "Espace naturel", memoire: "Mémoire",
};

/** La position passée dans l'adresse, s'il y en a une — même contrat que le
 *  compositeur (`?lon=&lat=`), pour qu'un lien partagé ouvre le bon endroit. */
function depuisURL(): [number, number] | null {
  if (typeof location === "undefined") return null;
  const p = new URLSearchParams(location.search);
  const lon = Number(p.get("lon")), lat = Number(p.get("lat"));
  return Number.isFinite(lon) && Number.isFinite(lat) && (lon !== 0 || lat !== 0)
    ? [lon, lat] : null;
}

/**
 * 🔴 DEUX EMPLOIS, UNE SEULE CARTE — Aurélien, 14/11/2026 : « place la carte
 *    du monde en arrière-plan de la landing ».
 *
 * ⭐ ET C'EST LE PLUS SÛR DES DEUX. En plein écran, une carte qui refuse de
 *    s'initialiser rend la page BLANCHE — c'est ce qui est arrivé, et il a
 *    fallu décrocher l'accueil. En arrière-plan, le même échec ne coûte
 *    qu'un décor : la devise, la recherche et les portes restent lisibles
 *    par-dessus. ⛔ Une surface qui peut échouer n'a rien à faire sur le
 *    chemin critique tant qu'on n'a pas compris pourquoi elle échoue.
 *
 * ⚠️ EN FOND, ELLE NE PREND PAS LES GESTES. `interactive: false` : une carte
 *    vivante sous un champ de recherche et trois boutons avalerait le
 *    `pointerdown` qui leur est destiné — c'est la leçon déjà écrite dans
 *    `CarteFondOT`. On la regarde, on ne la manipule pas.
 */
export function CarteMonde({ enFond = false }: { enFond?: boolean } = {}) {
  const boite = useRef<HTMLDivElement | null>(null);
  const carte = useRef<CarteML | null>(null);
  const [choisi, setChoisi] = useState<Site | null>(null);
  const [mot, setMot] = useState("");

  useEffect(() => {
    if (!boite.current) return;
    /* 🔴 LE CACHE APPARTIENT À LA CARTE, PAS AU COMPOSANT — et c'est une
       course qui l'a imposé. `React.StrictMode` monte l'effet DEUX fois.
       Quand le cache vivait dans un `useRef` partagé :
         1. la carte A démarre, son chargement part en `await` ;
         2. React la détruit et monte la carte B ;
         3. le chargement de A REPREND, remplit le cache commun et appelle
            `setData` sur une carte déjà retirée — sans effet ;
         4. la carte B trouve toutes ses tuiles « déjà lues », n'en charge
            aucune, et ne reçoit jamais de données.
       Mesuré : couche présente, source présente, **0 point**, deux tuiles en
       200 dans le réseau — un écran qui ressemble à « il n'y a rien ici ».
       ⭐ Et ce n'est PAS un défaut de banc : tout remontage (revenir sur
          l'écran, un rechargement à chaud) rejouerait la même course.
       ⚠️ Déclarés DANS l'effet : chaque carte a les siens, et ils meurent
          avec elle. Un `useRef` aurait survécu, c'est tout le défaut. */
    const lues = new Set<string>();
    const points: GeoJSON.Feature[] = [];
    const m = new maplibregl.Map({
      container: boite.current, style: enFond ? STYLE_ORTHO : STYLE,
      /* 🔴 LE CENTRE ÉTAIT LE MULLERTHAL, EN DUR — c'est le point où je
         testais, et il est parti en production : tout visiteur du monde
         atterrissait au Luxembourg. ⛔ Un réglage de mise au point qui
         survit au déploiement est une décision que personne n'a prise.
         ⭐ On part de l'URL si elle le dit, sinon du monde entier — et la
            géolocalisation, quand elle répond, vient recadrer. Jamais un
            lieu choisi par moi. */
      /* 🔴 EN FOND : SATELLITE, ET PAS AU ZOOM MONDE — Aurélien, 14/11/2026 :
         « affiche sans frontière, mode satellite ».
         ⚠️ MESURÉ AVANT DE CHOISIR : le relais ortho répond à partir de z6,
            mondialement (Crozon, Mullerthal, Rome, Rio : 200 à z8), et rend
            404 en dessous — z2, z3, z4, z5 tous vides. Une vue du monde
            entier en satellite n'existe donc PAS ici : on ouvre à z6, le plus
            petit zoom qui porte de l'image.
         ⛔ Et on ne « corrige » pas ce 404 par un fond de plan derrière :
            deux mosaïques superposées pour cacher un trou, c'est un trou
            qu'on cesse de voir sans l'avoir comblé. */
      center: depuisURL() ?? [10, 46],
      zoom: depuisURL() ? 10 : (enFond ? 6 : 2),
      attributionControl: false,
      interactive: !enFond,
    });
    carte.current = m;
    /* ⚠️ L'ATTRIBUTION RESTE, MÊME EN FOND : OpenStreetMap et OpenFreeMap se
       citent, décor ou pas — c'est une obligation de licence, pas une
       option d'affichage. Les commandes de zoom, elles, n'ont pas de sens
       sur une carte qu'on ne manipule pas. */
    m.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    if (!enFond) {
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    }

    /* 🔴 `load` PEUT ÊTRE DÉJÀ PASSÉ — mesuré le 14/11/2026, et c'est ce qui
       a tenu la carte vide une demi-heure. En développement, `StrictMode`
       crée la carte #1, la détruit, puis crée la #2 ; le style est alors en
       cache et son chargement se termine AVANT que mon écouteur ne soit
       attaché. Résultat : `isStyleLoaded()` vrai, et pourtant ni source
       `sites`, ni couche, ni chargement de tuiles — la trace s'arrêtait net
       sur « carte #2 créée ».
       ⭐ Un événement qu'on attend sans demander s'il est DÉJÀ survenu est
          une attente qui peut ne jamais finir. On fait les deux. */
    /* 🔴 « SANS FRONTIÈRE » — et le style n'en porte aucune, vérifié couche
       par couche. Ce qu'on prend pour des frontières, ce sont les ÉTIQUETTES :
       noms de pays, de villes, de routes, points d'intérêt — vingt-cinq
       couches de texte posées sur l'image.
       ⭐ En fond, elles n'ont rien à dire : personne ne lit « Deutschland »
          derrière un champ de recherche. On les éteint toutes, et on garde la
          seule couche d'image.
       ⚠️ On les MASQUE (`visibility: none`) au lieu de les retirer : le style
          est partagé avec l'écran ortho du compositeur, où elles servent. */
    const taireLesEtiquettes = () => {
      if (!enFond) return;
      for (const c of m.getStyle()?.layers ?? []) {
        if (c.id !== "ortho") m.setLayoutProperty(c.id, "visibility", "none");
      }
    };

    const installer = () => {
      m.addSource("sites", { type: "geojson",
        data: { type: "FeatureCollection", features: [] } });
      /* ⭐ UNE COUCHE, PAS 1 500 ÉLÉMENTS. C'est toute la raison de cette
         carte : maplibre dessine les points sur le GPU. */
      m.addLayer({
        id: "sites", type: "circle", source: "sites",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 2.5, 12, 5, 16, 8],
          "circle-color": "#c9a227",
          "circle-stroke-width": 1,
          "circle-stroke-color": "rgba(255,255,255,.85)",
        },
      });
      m.on("click", "sites", (e) => {
        const p = e.features?.[0]?.properties as { n: string; c: string; a?: number } | undefined;
        const g = (e.features?.[0]?.geometry as GeoJSON.Point | undefined)?.coordinates;
        if (p && g) setChoisi({ n: p.n, c: p.c, g: [g[0], g[1]], ...(p.a ? { a: 1 } : {}) });
      });
      m.on("mouseenter", "sites", () => { m.getCanvas().style.cursor = "pointer"; });
      m.on("mouseleave", "sites", () => { m.getCanvas().style.cursor = ""; });
      taireLesEtiquettes();
      charger();
    };
    /* 🔴 TROIS CHEMINS VERS LE MÊME MONTAGE, ET AUCUN N'EST DE TROP —
       mesuré deux fois le 14/11/2026. Après que `StrictMode` a créé puis
       détruit une première carte, la seconde arrive dans un état où
       `isStyleLoaded()` est encore FAUX à la construction (donc on s'abonne
       à `load`) et où `load` n'arrive JAMAIS — alors que `isStyleLoaded()`
       devient vrai quelques instants plus tard. Symptôme : style peint ou
       non selon la chance, sources réduites à celles du fond, zéro point, et
       une trace qui s'arrête sur « carte #2 créée ».
       ⭐ `styledata` est l'événement qui, lui, se répète : il suffit d'y
          regarder si le style est prêt. Et `installe` garde la porte pour que
          les trois chemins ne montent qu'une fois. */
    let installe = false;
    const tenter = () => {
      if (installe || !m.isStyleLoaded()) return;
      installe = true;
      installer();
    };
    m.on("load", tenter);
    m.on("styledata", tenter);
    tenter();
    /* 🔴 ET ON VÉRIFIE ACTIVEMENT, PARCE QUE LES ÉVÉNEMENTS NE SUFFISENT PAS.
       Mesuré trois fois le 14/11/2026, EN PRODUCTION : la carte s'initialise
       ou non selon la chance. `load` est parfois manqué, `styledata` ne
       repasse pas toujours, et `isStyleLoaded()` devient vrai sans que rien
       ne le signale. Symptôme : canevas plein écran, style jamais peint,
       aucune source `sites`, aucun message — une page d'accueil BLANCHE.
       ⭐ Un rendez-vous qu'on peut manquer demande qu'on aille voir. Dix
          secondes de vérification toutes les 200 ms coûtent cinquante
          réveils sans travail ; une porte d'entrée blanche coûte le site.
       ⚠️ Bornée, et elle s'arrête dès que la pose a eu lieu : une boucle qui
          ne finit pas serait pire que le défaut qu'elle corrige. */
    const guetteur = window.setInterval(() => {
      if (installe) { window.clearInterval(guetteur); return; }
      tenter();
    }, 200);
    const finDuGuet = window.setTimeout(() => window.clearInterval(guetteur), 10_000);
    m.on("moveend", () => charger());

    /* 🔴 LA CARTE NAÎT PLUS PETITE QUE SON CONTENEUR — mesuré le 14/11/2026 :
       scène 417 × 671, canevas 417 × **300**. maplibre lit la taille de sa
       boîte à la construction ; ici la boîte n'a pas encore sa hauteur
       (`100dvh − la barre`), et rien ne revient la lui dire.
       ⭐ `CarteReelle` porte déjà cette parade, et je ne l'avais pas emportée
          en écrivant une carte à côté — c'est le prix d'un second composant,
          et il se paie en défauts qu'on croyait réglés.
       ⚠️ Un observateur ET des rappels différés : l'observateur attrape les
          changements de boîte, les délais attrapent le premier cadre, où la
          boîte est déjà bonne mais où aucun changement ne se produira plus. */
    /* ⭐ ON DEMANDE OÙ L'ON EST, ET ON RECADRE SI ÇA RÉPOND. Une carte du
       monde ouverte sur le monde est juste mais inutile : ce qu'on cherche
       est autour de soi. ⚠️ Et c'est une DEMANDE : si elle est refusée ou
       trop lente, la carte reste sur le monde — pas d'écran bloqué en
       attente, pas de lieu inventé. */
    if (!depuisURL() && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (g) => { m.jumpTo({ center: [g.coords.longitude, g.coords.latitude], zoom: 10 }); },
        () => {}, { timeout: 8000 });
    }

    const redimensionner = () => { m.resize(); };
    const ro = new ResizeObserver(redimensionner);
    if (boite.current) ro.observe(boite.current);
    const minuteries = [120, 600, 1600].map((d) => window.setTimeout(redimensionner, d));

    /** Charge les tuiles du cadre visible, et seulement celles-là. */
    async function charger() {
      /* ⚠️ RIEN AVANT LA SOURCE. `moveend` arrive avant `load` quand on
         redimensionne tôt ; charger sans source remplirait le cache pour
         rien. La condition est l'existence de la source, pas un drapeau. */
      if (!m.getSource("sites")) return;
      const b = m.getBounds();
      const choix = tuilesDuCadre(
        { ouest: b.getWest(), est: b.getEast(), nord: b.getNorth(), sud: b.getSouth() },
        m.getZoom());
      if (choix.etat !== "ok") {
        /* ⭐ DIRE CE QU'IL Y A, PAS SEULEMENT CE QU'ON NE PEUT PAS. « Approchez »
           seul laisse croire à une carte vide ; le nombre dit qu'il y a de
           quoi chercher, et pourquoi on ne pose pas tout d'un coup. */
        setMot(choix.etat === "loin"
          ? `${SITES_POSES.toLocaleString("fr-FR")} sites remarquables dans le monde. `
            + `Approchez : la carte les pose quartier par quartier.`
          : "Approchez encore un peu — la zone est trop large pour être chargée d'un coup.");
        return;
      }
      setMot("");
      let neuf = 0;
      {
        for (const [x, y] of choix.tuiles) {
          const clef = `${x}/${y}`;
          if (lues.has(clef)) continue;
          lues.add(clef);
          try {
            const r = await fetch(`${TUILES}/${Z}/${x}/${y}.json`);
            if (!r.ok) continue;            // tuile vide : il n'y a rien ici
            const t = (await r.json()) as { l: Site[] };
            for (const s of t.l) {
              points.push({
                type: "Feature",
                geometry: { type: "Point", coordinates: s.g },
                properties: { n: s.n, c: s.c, ...(s.a ? { a: 1 } : {}) },
              });
            }
            neuf++;
          } catch { /* une tuile manquante n'est pas une panne */ }
        }
      }
      if (neuf) {
        /* 🔴 CE `?.` AVALAIT L'ÉCHEC — et il m'a coûté une demi-heure. Écrit
           `getSource("sites")?.setData(...)`, il ne fait RIEN quand la source
           n'existe pas encore, sans un mot. Or `moveend` peut survenir AVANT
           `load` (mes propres rappels de redimensionnement en déclenchent un
           à 120 ms) : la source n'est pas posée, les tuiles sont pourtant
           notées comme lues, et le `charger` qui suit `load` n'a plus rien à
           charger. Résultat mesuré : 3 000 points collectés, source à ZÉRO.
           ⭐ Un appel optionnel sur un objet qu'on sait devoir exister n'est
              pas de la prudence, c'est un silence. */
        const src = m.getSource("sites") as maplibregl.GeoJSONSource | undefined;
        if (!src) {
          /* On n'a rien pu poser : ces tuiles ne sont PAS lues. */
          for (const [x, y] of choix.tuiles) lues.delete(`${x}/${y}`);
          return;
        }
        src.setData({ type: "FeatureCollection", features: points });
      }
    }

    return () => {
      ro.disconnect();
      window.clearInterval(guetteur);
      window.clearTimeout(finDuGuet);
      for (const id of minuteries) window.clearTimeout(id);
      m.remove(); carte.current = null;
    };
  }, []);

  if (enFond) {
    return (
      <div className="monde-fond" aria-hidden="true">
        <div className="monde-plan" ref={boite} />
      </div>
    );
  }

  return (
    <main className="page page-monde">
      <div className="monde-scene">
        <div className="monde-plan" ref={boite} />
        {mot && <p className="monde-mot">{mot}</p>}
        {choisi && (
          <div className="monde-choisi">
            {/* ⚠️ UN LIEU SANS NOM GARDE SA PLACE — « si la plage n'a pas de
                nom ce n'est pas grave, si elle est à côté, c'est bon »
                (Aurélien, 14/11). On montre alors son TYPE, qui est la seule
                chose vraie qu'on sache en dire. */}
            <p className="monde-choisi-nom">
              {choisi.a ? (LIBELLES[choisi.c] ?? choisi.c) : choisi.n}
            </p>
            <p className="monde-choisi-dire">
              {choisi.a ? "Sans nom connu" : (LIBELLES[choisi.c] ?? choisi.c)}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
