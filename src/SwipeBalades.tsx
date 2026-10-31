import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { chargerOT, PRATIQUE, type ItineraireOT } from "./ot";
import { portrait } from "./portrait";
import { ajouterAuCarnet, lireCarnet } from "./carnet";
import { ATTRIBUTION_OSM } from "./carte-fond";

/**
 * ⚠️ MAPLIBRE ET SON STYLE PÈSENT PLUS QUE TOUT LE RESTE DE L'ÉCRAN. Ils ne
 *    partent qu'au moment où une carte en a besoin — c'est-à-dire au premier
 *    rendu du jeu, pas au chargement de l'application.
 */
const CarteFondOT = lazy(() =>
  import("./CarteFondOT").then((m) => ({ default: m.CarteFondOT })),
);

/**
 * LE JEU DE CARTES DES BALADES — l'écran principal du territoire.
 *
 * ⭐ POURQUOI UN JEU DE CARTES ET PAS UNE LISTE. Une liste de 46 circuits
 *    demande de CHOISIR ; un jeu demande de RÉAGIR. On ne sait pas ce qu'on
 *    veut marcher, on le reconnaît quand on le voit. La carte du territoire
 *    reste à un geste — c'est le repli de qui sait déjà où il va.
 *
 * ⛔ CHAQUE CARTE PORTE SON TRACÉ, PAS UNE PHOTOGRAPHIE. Voir `portrait.ts` :
 *    nous n'avons aucune image de ces circuits et nous n'en fabriquons pas.
 *
 * ⛔ CE SONT LES CIRCUITS DE L'OFFICE DE TOURISME, et chaque carte le dit.
 *    MANA ne recommande rien, ne classe rien, n'ajoute aucune étoile : le
 *    jeu rend l'ordre du recueil, sans score caché.
 *
 * ⚠️ CE QUI EST GARDÉ VA AU CARNET, qui vit dans CE navigateur et nulle part
 *    ailleurs. Ce qui est écarté n'est stocké NULLE PART : une balade passée
 *    revient au jeu suivant. Mémoriser les refus demanderait de tenir un
 *    profil de goût — exactement ce que le projet ne fait pas.
 */

/** Au-delà de cette fraction de la largeur de carte, le geste est un verdict. */
const SEUIL = 0.28;
/** Combien de cartes on peint derrière celle du dessus. */
const PILE = 2;
/**
 * ⚠️ COMBIEN DE FONDS OSM VIVENT EN MÊME TEMPS. Un fond = un contexte WebGL,
 *    et les navigateurs en plafonnent le nombre (16 chez Chrome, moins sur
 *    téléphone). Deux suffisent : celle du dessus, et la suivante — pour
 *    qu'aucun fond ne surgisse au moment où elle arrive devant. La troisième
 *    garde sa silhouette, qu'on ne voit de toute façon que par la tranche.
 */
const FONDS_VIVANTS = 2;

type Verdict = "garde" | "passe";

const DIFFICULTE: Record<string, string> = {
  facile: "Facile", moyen: "Moyen", difficile: "Difficile",
};

/** Les familles de pratique, dans l'ordre où elles pèsent dans le recueil. */
const FAMILLES: { clef: ItineraireOT["pratique"] | "tout"; nom: string }[] = [
  { clef: "tout", nom: "Tout" },
  { clef: "pied", nom: "À pied" },
  { clef: "vtt", nom: "VTT" },
  { clef: "velo", nom: "Vélo" },
  { clef: "trail", nom: "Trail" },
];

export function SwipeBalades({ surCarte }: { surCarte: () => void }) {
  const [tout, setTout] = useState<ItineraireOT[] | null>(null);
  const [erreur, setErreur] = useState("");
  const [famille, setFamille] = useState<ItineraireOT["pratique"] | "tout">("tout");
  const [i, setI] = useState(0);
  const [carnet, setCarnet] = useState<string[]>([]);
  /** le geste en cours : décalage en px, ou null quand le doigt n'est pas posé */
  const [glisse, setGlisse] = useState(0);
  /** la carte qui S'EN VA : on la laisse finir son vol avant de l'oublier */
  const [envol, setEnvol] = useState<Verdict | null>(null);
  const depart = useRef<{ x: number; y: number; id: number } | null>(null);
  const boite = useRef<HTMLDivElement>(null);
  const [largeur, setLargeur] = useState(320);

  useEffect(() => { setCarnet(lireCarnet()); }, []);

  useEffect(() => {
    let vivant = true;
    chargerOT()
      .then((r) => { if (vivant) setTout(r.itineraires); })
      .catch(() => { if (vivant) setErreur("Les circuits de l'Office n'ont pas pu être lus."); });
    return () => { vivant = false; };
  }, []);

  useEffect(() => {
    const b = boite.current;
    if (!b) return;
    const ro = new ResizeObserver(() => setLargeur(b.clientWidth || 320));
    ro.observe(b);
    setLargeur(b.clientWidth || 320);
    return () => ro.disconnect();
  }, [tout]);

  const jeu = useMemo(
    () => (tout ?? []).filter((w) => famille === "tout" || w.pratique === famille),
    [tout, famille],
  );

  // ⚠️ Changer de famille REBAT le jeu : rester à l'index 12 d'une pile de 4
  //    afficherait un écran de fin pour une famille qu'on vient d'ouvrir.
  useEffect(() => { setI(0); setEnvol(null); setGlisse(0); }, [famille]);

  const courante = jeu[i] ?? null;

  const trancher = useCallback((v: Verdict) => {
    const w = jeu[i];
    if (!w || envol) return;
    if (v === "garde") setCarnet(ajouterAuCarnet(w.slug));
    setEnvol(v);
    // ⚠️ La carte part en 260 ms ; on ne change d'index qu'APRÈS, sinon la
    //    suivante hérite du vol en cours et traverse l'écran sans raison.
    window.setTimeout(() => { setEnvol(null); setGlisse(0); setI((n) => n + 1); }, 260);
  }, [jeu, i, envol]);

  // ── LE GESTE ────────────────────────────────────────────────────────────
  // ⚠️ `setPointerCapture` : sans lui, un doigt qui sort de la carte pendant
  //    le glissement ne rend plus d'événement, et la carte reste figée en
  //    travers de l'écran. C'est la panne n°1 des piles de cartes faites main.
  const prendre = (e: React.PointerEvent) => {
    if (envol || !courante) return;
    depart.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const bouger = (e: React.PointerEvent) => {
    const d = depart.current;
    if (!d || d.id !== e.pointerId) return;
    setGlisse(e.clientX - d.x);
  };
  const lacher = (e: React.PointerEvent) => {
    const d = depart.current;
    if (!d || d.id !== e.pointerId) return;
    depart.current = null;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > largeur * SEUIL) trancher(dx > 0 ? "garde" : "passe");
    else setGlisse(0);
  };

  // ── LE CLAVIER ──────────────────────────────────────────────────────────
  // ⭐ Un jeu de cartes qui ne répond qu'au doigt est un jeu de cartes qui
  //    n'existe pas pour qui navigue au clavier. Les flèches tranchent.
  useEffect(() => {
    const au = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const c = e.target as HTMLElement | null;
      if (c && (c.tagName === "INPUT" || c.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowRight") { e.preventDefault(); trancher("garde"); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); trancher("passe"); }
    };
    window.addEventListener("keydown", au);
    return () => window.removeEventListener("keydown", au);
  }, [trancher]);

  const dx = envol ? (envol === "garde" ? largeur * 1.6 : -largeur * 1.6) : glisse;
  const part = Math.max(-1, Math.min(1, dx / (largeur * SEUIL || 1)));

  // ── LES ÉTATS QUI NE SONT PAS LE JEU ────────────────────────────────────
  if (erreur) {
    return (
      <main className="jeu">
        <p className="jeu-vide" role="status">{erreur}</p>
        <button type="button" className="m-action-fine jeu-repli" onClick={surCarte}>
          Ouvrir la carte du territoire
        </button>
      </main>
    );
  }

  return (
    <main className="jeu">
      <header className="jeu-entete">
        <h1 className="jeu-titre">Balades</h1>
        <p className="jeu-mesure">
          {tout
            ? `${jeu.length} circuit${jeu.length > 1 ? "s" : ""} balisé${jeu.length > 1 ? "s" : ""} par l’Office de tourisme`
            : "Lecture des circuits…"}
        </p>
      </header>

      <div className="jeu-familles" role="tablist" aria-label="Pratique">
        {FAMILLES.map((f) => {
          const n = f.clef === "tout"
            ? (tout ?? []).length
            : (tout ?? []).filter((w) => w.pratique === f.clef).length;
          if (tout && n === 0) return null;
          return (
            <button
              key={f.clef}
              type="button" role="tab"
              aria-selected={famille === f.clef}
              className={famille === f.clef ? "jeu-famille jeu-famille-active" : "jeu-famille"}
              onClick={() => setFamille(f.clef)}
            >
              {f.nom}
            </button>
          );
        })}
      </div>

      <div className="jeu-pile" ref={boite}>
        {!tout && <p className="jeu-vide" role="status">Lecture des circuits…</p>}

        {tout && !courante && (
          <div className="jeu-fin">
            <p className="jeu-fin-titre">Vous avez tout vu.</p>
            <p className="jeu-fin-mot">
              {carnet.length === 0
                ? "Rien de gardé — le carnet vous attend au prochain tour."
                : `${carnet.length} balade${carnet.length > 1 ? "s" : ""} dans votre carnet, sur cet appareil et nulle part ailleurs.`}
            </p>
            <div className="jeu-fin-actions">
              <button type="button" className="m-action" onClick={() => setI(0)}>
                Revoir le jeu
              </button>
              <button type="button" className="m-action-fine" onClick={surCarte}>
                Ouvrir la carte
              </button>
            </div>
          </div>
        )}

        {/* ⚠️ On peint de l'arrière vers l'avant : la carte du dessus est la
            DERNIÈRE du tableau, donc la dernière dans le flux — aucun
            `z-index` à tenir, et l'ordre du DOM suit l'ordre visuel. */}
        {tout && jeu.slice(i, i + PILE + 1).reverse().map((w, rang, tab) => {
          const dessus = rang === tab.length - 1;
          const profondeur = tab.length - 1 - rang;
          return (
            <Carte
              key={w.slug}
              w={w}
              dessus={dessus}
              profondeur={profondeur}
              fond={profondeur < FONDS_VIVANTS}
              dx={dessus ? dx : 0}
              part={dessus ? part : 0}
              envol={dessus ? envol : null}
              surPrendre={prendre} surBouger={bouger} surLacher={lacher}
            />
          );
        })}
      </div>

      {tout && courante && (
        <div className="jeu-commandes">
          <button type="button" className="jeu-bouton jeu-passe" onClick={() => trancher("passe")}>
            <span className="sr-only">Passer cette balade</span>
            <svg className="m-icone" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <a className="jeu-bouton jeu-ouvre" href={courante.source} target="_blank" rel="noreferrer">
            <span className="sr-only">Voir la fiche de l’Office de tourisme</span>
            <svg className="m-icone" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M14 4h6v6" /><path d="M20 4 10 14" />
              <path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
            </svg>
          </a>
          <button type="button" className="jeu-bouton jeu-garde" onClick={() => trancher("garde")}>
            <span className="sr-only">Garder cette balade dans mon carnet</span>
            <svg className="m-icone" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
            </svg>
          </button>
        </div>
      )}

      <p className="jeu-pied">
        <button type="button" className="jeu-repli" onClick={surCarte}>
          Plutôt la carte
        </button>
        <span className="jeu-carnet" aria-live="polite">
          {carnet.length > 0 && `${carnet.length} au carnet`}
        </span>
      </p>
    </main>
  );
}

/* ═══ UNE CARTE ═════════════════════════════════════════════════════════ */

const L = 300, H = 330;   // le repère du portrait, en unités de `viewBox`

function Carte({
  w, dessus, profondeur, fond, dx, part, envol, surPrendre, surBouger, surLacher,
}: {
  w: ItineraireOT; dessus: boolean; profondeur: number; fond: boolean;
  dx: number; part: number; envol: Verdict | null;
  surPrendre: (e: React.PointerEvent) => void;
  surBouger: (e: React.PointerEvent) => void;
  surLacher: (e: React.PointerEvent) => void;
}) {
  const p = useMemo(() => portrait(w.p, L, H, 0.12), [w]);

  // ⚠️ La rotation est PLAFONNÉE à 9° : au-delà, la carte a l'air de tomber
  //    plutôt que d'être poussée, et le tracé devient illisible pendant le
  //    geste — or c'est précisément sur lui qu'on décide.
  const angle = Math.max(-9, Math.min(9, part * 9));

  const style: React.CSSProperties = {
    transform: `translate3d(${dx}px, ${profondeur * 10}px, 0) rotate(${angle}deg) scale(${1 - profondeur * 0.04})`,
    transition: envol || dx === 0 ? "transform 260ms cubic-bezier(.22,.61,.36,1), opacity 260ms" : "none",
    opacity: envol ? 0 : 1,
    zIndex: 10 - profondeur,
  };

  return (
    <article
      className={dessus ? "jeu-carte jeu-carte-dessus" : "jeu-carte"}
      style={style}
      onPointerDown={dessus ? surPrendre : undefined}
      onPointerMove={dessus ? surBouger : undefined}
      onPointerUp={dessus ? surLacher : undefined}
      onPointerCancel={dessus ? surLacher : undefined}
      aria-hidden={dessus ? undefined : true}
    >
      {/* ── LE VISAGE : LA CARTE OSM, et le tracé dessus ────────────────
          ⭐ LA SILHOUETTE RESTE SOUS LA CARTE, et ce n'est pas une doublure
             décorative : elle est peinte à l'instant même, sans réseau ni
             WebGL, pendant que les tuiles arrivent. Une carte qui charge et
             une carte morte se ressemblent — ici, il y a toujours quelque
             chose de VRAI à l'écran, et c'est le même tracé.
          ⚠️ Les deux projections ne coïncident pas (l'une est
             équirectangulaire, l'autre est Mercator) : c'est pourquoi la
             silhouette s'efface quand le fond est prêt, au lieu de rester
             dessous en désaccord d'un ou deux pixels. */}
      <div className="jeu-portrait">
        {fond && (
          <Suspense fallback={null}>
            <CarteFondOT p={w.p} />
          </Suspense>
        )}
        <svg className="jeu-silhouette" viewBox={`0 0 ${L} ${H}`} role="img"
             aria-label={`Tracé de ${w.titre}, ${w.km} kilomètres`}>
          {p && (
            <>
              {/* l'ombre portée du tracé : elle le détache du voile sans
                  ajouter de couleur au système */}
              <path className="jeu-trace-ombre" d={p.d} />
              <path className="jeu-trace" d={p.d} />
              <circle className="jeu-depart" cx={p.depart[0]} cy={p.depart[1]} r="6" />
              {!p.boucle && (
                <circle className="jeu-arrivee" cx={p.arrivee[0]} cy={p.arrivee[1]} r="5" />
              )}
            </>
          )}
        </svg>
        <span className="jeu-pratique">{PRATIQUE[w.pratique]}</span>
      </div>

      {/* ── LES VERDICTS, qui n'apparaissent qu'avec le geste ────────────── */}
      <span className="jeu-verdict jeu-verdict-garde" style={{ opacity: Math.max(0, part) }}>
        Je garde
      </span>
      <span className="jeu-verdict jeu-verdict-passe" style={{ opacity: Math.max(0, -part) }}>
        Passer
      </span>

      {/* ── LE PIED : ce que la donnée dit, rien de plus ─────────────────── */}
      <div className="jeu-corps">
        <h2 className="jeu-nom">{w.titre}</h2>
        <p className="jeu-lieu">{w.commune ?? w.depart ?? "Presqu’île de Crozon"}</p>
        <dl className="jeu-faits">
          <div><dt>Distance</dt><dd className="jeu-km">{w.km.toLocaleString("fr-FR")} km</dd></div>
          <div><dt>Forme</dt><dd>{w.boucle ? "Boucle" : "Aller simple"}</dd></div>
          {w.difficulte && <div><dt>Niveau</dt><dd>{DIFFICULTE[w.difficulte]}</dd></div>}
        </dl>
        {/* ⛔ LA MENTION NE S'ENLÈVE PAS. Elle n'est pas un crédit en bas de
            page : c'est ce qui distingue un circuit BALISÉ sur le terrain
            d'un itinéraire composé par nous. */}
        <p className="jeu-provenance">
          Itinéraire balisé par l’Office de tourisme
          {/* ⛔ L'ATTRIBUTION VOYAGE AVEC LA CARTE. `attributionControl: false`
              la retire de maplibre ; l'ODbL l'exige partout où le fond
              s'affiche, donc sur chaque carte du jeu. */}
          <span className="jeu-odbl"> · Fond {ATTRIBUTION_OSM}</span>
        </p>
      </div>
    </article>
  );
}
