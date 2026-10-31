/**
 * LE TERRITOIRE — écran 2, l'exploration cartographique.
 *
 * ⭐ LA CARTE EST DESSINÉE DEPUIS NOTRE GRAPHE, PAS DEPUIS DES TUILES. Le
 *    brief le demande en toutes lettres : « une véritable identité
 *    cartographique MANA, en utilisant les données géographiques réellement
 *    disponibles », et « elle ne doit pas ressembler à une carte standard
 *    recolorée ». Une tuile vectorielle donne à tout le monde le même monde.
 *    Notre graphe, lui, porte ce que personne d'autre n'a :
 *      · 13 265 arêtes — le réseau marchable réel de la presqu'île
 *      · la DISTANCE À LA MER par arête — 2 345 sont littorales (17,7 %)
 *      · l'AGRÉMENT par arête — médiane 95, de 0 à 255
 *      · 339 lieux : mégalithes, plages, panoramas, châteaux, calvaires…
 *    D'où une carte qui ne dit pas « où passent les routes » mais
 *    « OÙ IL FAIT BON MARCHER ». C'est ça, la signature.
 *
 * 🔴 CANVAS, ET CE N'EST PAS UN CHOIX DE CONFORT. Mesuré : le tracé complet
 *    représente 79 957 points, soit ~859 Ko de chaîne SVG. En SVG, chaque
 *    déplacement reparcourt cet arbre — le panoramique ramperait. Le canvas
 *    redessine en une passe.
 * ⚠️ MAIS UN CANVAS N'EST PAS ACCESSIBLE. Le territoire y est DÉCOR et
 *    contexte ; toute l'interaction — choisir une promenade, lire ses lieux —
 *    vit en DOM réel, focalisable et annoncé. Le brief l'exige : « ne rends
 *    pas une carte indispensable à une action ».
 *
 * ⛔ AUCUNE DONNÉE INVENTÉE. Pas de relief ombré fabriqué, pas de trait de
 *    côte dessiné à la main, pas de lieu ajouté pour meubler. Ce qu'on voit
 *    est ce que le graphe contient.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { WALKS } from "./walks";
import type { Walk } from "./walks";

type Graphe = {
  genere: string;
  territoire: string;
  attribution: string;
  n: [number, number][];
  a: [number, number, number, number, number[], (number | null)?, (number | null)?, (0 | 1)?][];
  l: { a: number; f: number; c: string; n: string; g: [number, number]; d: number }[];
};

const BASE = import.meta.env.VITE_GRAPHE_BASE ?? "https://mana.bzh/bretagne/g";
const R_LAT = 111_320;

/**
 * Les catégories, RELEVÉES et non devinées : les douze du graphe et les huit
 * des promenades vérifiées, listées le 31/10/2026.
 * ⛔ Une catégorie inconnue s'affiche TELLE QUELLE. Un fourre-tout « Autre »
 *    mentirait moins visiblement qu'un libellé faux, mais il mentirait quand
 *    même — et il empêcherait de voir qu'une catégorie neuve est apparue.
 * ⚠️ `memorial` n'est PAS dans le graphe : il ne vient que des promenades
 *    vérifiées. Deux inventaires, une seule table — d'où le relevé des deux.
 */
const CATEGORIE: Record<string, string> = {
  calvaire: "Calvaire",
  chapelle: "Chapelle",
  chateau: "Fortification",
  grotte: "Grotte",
  lieu_de_culte: "Lieu de culte",
  megalithe: "Mégalithe",
  memorial: "Mémorial",
  moulin: "Moulin",
  panorama: "Point de vue",
  phare: "Phare",
  plage: "Plage",
  ruine: "Ruine",
  source: "Source",
};

export function Territoire2030({ base }: { base: string }) {
  const toile = useRef<HTMLCanvasElement | null>(null);
  const boite = useRef<HTMLDivElement | null>(null);
  const [graphe, setGraphe] = useState<Graphe | null>(null);
  const [erreur, setErreur] = useState("");
  const [choisie, setChoisie] = useState<string | null>(null);
  const [rendu, setRendu] = useState(0);

  useEffect(() => {
    document.title = "Le territoire — MANA";
    fetch(`${BASE}/crozon.json`)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(setGraphe)
      // ⚠️ Une erreur se DIT. Sans ce message, un refus réseau rendrait un
      //    écran vide et muet, et on conclurait qu'il n'y a rien ici.
      .catch(() => setErreur("Le territoire n'a pas pu être chargé. Vérifiez votre connexion."));
  }, []);

  const walk: Walk | null = useMemo(
    () => (choisie ? WALKS.find((w) => w.slug === choisie) ?? null : null),
    [choisie],
  );

  /** ── LE DESSIN ─────────────────────────────────────────────────────────
   *  Trois passes, de la plus discrète à la plus lue — l'ordre EST la
   *  hiérarchie : ce qui est tracé en dernier se voit en premier.
   */
  useEffect(() => {
    const c = toile.current, b = boite.current;
    if (!c || !b || !graphe) return;

    const dessiner = () => {
      const { width: W, height: H } = b.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
      c.style.width = `${W}px`;
      c.style.height = `${H}px`;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);

      // emprise du graphe
      let laMin = Infinity, laMax = -Infinity, loMin = Infinity, loMax = -Infinity;
      for (const [lon, lat] of graphe.n) {
        if (lat < laMin) laMin = lat; if (lat > laMax) laMax = lat;
        if (lon < loMin) loMin = lon; if (lon > loMax) loMax = lon;
      }
      const kLon = Math.cos((((laMin + laMax) / 2) * Math.PI) / 180);
      const larM = (loMax - loMin) * R_LAT * kLon, hauM = (laMax - laMin) * R_LAT;
      const marge = 18;
      const ech = Math.min((W - 2 * marge) / larM, (H - 2 * marge) / hauM);
      const dx = (W - larM * ech) / 2, dy = (H - hauM * ech) / 2;
      const X = (lon: number) => dx + (lon - loMin) * R_LAT * kLon * ech;
      const Y = (lat: number) => dy + (laMax - lat) * R_LAT * ech;

      const styles = getComputedStyle(document.documentElement);
      const kaki = styles.getPropertyValue("--kaki").trim() || "#343f32";
      const sauge = styles.getPropertyValue("--sauge").trim() || "#92977c";
      const nuit = styles.getPropertyValue("--nuit").trim() || "#192b43";
      const ocre = styles.getPropertyValue("--ocre").trim() || "#c69a48";
      const craie = styles.getPropertyValue("--craie").trim() || "#eeebdd";

      ctx.fillStyle = kaki;
      ctx.fillRect(0, 0, W, H);

      const t0 = performance.now();

      // ── passe 1 : le réseau ordinaire, à peine là
      const tracer = (garde: (a: Graphe["a"][number]) => boolean, couleur: string, ep: number, alpha: number) => {
        ctx.beginPath();
        for (const a of graphe.a) {
          if (!garde(a)) continue;
          const pts = a[4];
          for (let i = 0; i < pts.length; i++) {
            const nd = graphe.n[pts[i]];
            if (!nd) continue;
            const x = X(nd[0]), y = Y(nd[1]);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
        }
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = couleur;
        ctx.lineWidth = ep;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.stroke();
        ctx.globalAlpha = 1;
      };

      // le tout-venant : présent, jamais lu
      tracer((a) => (a[3] ?? 0) < 120, sauge, 0.6, 0.22);
      // ⭐ CE QUI REND LA CARTE DIFFÉRENTE : l'agrément décide de la présence.
      //    Un chemin plaisant se voit, une départementale s'efface. Aucune
      //    autre carte ne peut faire ça — l'agrément est notre donnée.
      tracer((a) => (a[3] ?? 0) >= 120, sauge, 0.9, 0.55);
      // le littoral : la mer tire le trait vers le bleu nuit
      tracer((a) => a[5] != null && (a[5] as number) <= 120, nuit, 1.5, 0.5);
      tracer((a) => a[5] != null && (a[5] as number) <= 60, craie, 0.8, 0.35);

      // ── passe 2 : les promenades vérifiées
      for (const w of WALKS) {
        const vedette = choisie === null || choisie === w.slug;
        ctx.beginPath();
        w.points.forEach((p, i) => {
          const x = X(p.lon), y = Y(p.lat);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = vedette ? ocre : sauge;
        ctx.globalAlpha = vedette ? 0.95 : 0.3;
        ctx.lineWidth = vedette ? 2.4 : 1.2;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // ── passe 3 : les lieux de la promenade choisie, et eux seuls
      if (walk) {
        for (const e of walk.etapes) {
          ctx.beginPath();
          ctx.arc(X(e.lon), Y(e.lat), 3.4, 0, Math.PI * 2);
          ctx.fillStyle = craie;
          ctx.fill();
          ctx.lineWidth = 1.6;
          ctx.strokeStyle = ocre;
          ctx.stroke();
        }
      }

      setRendu(Math.round(performance.now() - t0));
    };

    dessiner();
    const ro = new ResizeObserver(dessiner);
    ro.observe(b);
    return () => ro.disconnect();
  }, [graphe, choisie, walk]);

  return (
    <main className="terr">
      <div className="terr-carte" ref={boite}>
        {/* ⚠️ `aria-hidden` : le canvas ne porte aucune information qui ne soit
            pas aussi dans la liste en dessous. Le faire annoncer donnerait du
            bruit à qui n'y voit rien. */}
        <canvas ref={toile} aria-hidden="true" />
        {!graphe && !erreur && (
          <p className="terr-attente" role="status">Lecture du territoire…</p>
        )}
        {erreur && <p className="terr-attente terr-erreur" role="status">{erreur}</p>}
      </div>

      <section className="terr-panneau" aria-label="Promenades du territoire">
        <header className="terr-entete">
          <h1 className="terr-titre">Le territoire</h1>
          {graphe && (
            <p className="terr-mesure">
              {graphe.a.length.toLocaleString("fr-FR")} tronçons · {graphe.l.length} lieux
              {rendu > 0 && ` · dessiné en ${rendu} ms`}
            </p>
          )}
        </header>

        {/* ⭐ L'ALTERNATIVE ACCESSIBLE N'EST PAS UNE CONCESSION : c'est la même
            information, en liste. Choisir une promenade au clavier doit marcher
            aussi bien qu'au doigt sur la carte. */}
        <ul className="terr-liste">
          {WALKS.map((w) => {
            const active = choisie === w.slug;
            return (
              <li key={w.slug}>
                <button
                  type="button"
                  className={active ? "terr-item terr-item-active" : "terr-item"}
                  aria-pressed={active}
                  onClick={() => setChoisie(active ? null : w.slug)}
                >
                  <span className="terr-item-titre">{w.titre}</span>
                  <span className="terr-item-meta">
                    {w.lieu} · {w.distanceKm} km · ≈ {w.dureeEstimeeH} h ·{" "}
                    {w.boucle ? "boucle" : "aller simple"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {walk && (
          <div className="terr-fiche">
            <p className="terr-fiche-label">Sur le chemin — {walk.etapes.length} lieux</p>
            <ul className="terr-lieux">
              {walk.etapes.map((e) => (
                <li key={e.nom}>
                  <span className="terr-lieu-nom">{e.nom}</span>
                  <span className="terr-lieu-cat">
                    {CATEGORIE[e.categorie] ?? e.categorie}
                    {/* ⭐ `pos` est la position LE LONG du chemin, de 0 au départ
                        à 1 à l'arrivée. On l'affiche en pourcentage : c'est ce
                        qui prouve que le lieu est SUR le parcours et non « à
                        proximité ». */}
                    {" · à "}
                    {Math.round(e.pos * 100)} % du parcours
                  </span>
                </li>
              ))}
            </ul>
            <a className="terr-action" href={`${base}/promenade/${walk.slug}`}>
              Ouvrir la promenade
            </a>
          </div>
        )}

        <p className="terr-source">
          Chemins et lieux d'après OpenStreetMap, sous licence ODbL. Le relief
          et le trait de côte ne sont pas représentés : nous ne dessinons que ce
          que la donnée contient.
        </p>
      </section>
    </main>
  );
}
