import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { chargerOT, PRATIQUE, type ItineraireOT } from "./ot";
import { portrait } from "./portrait";
import { ATTRIBUTION, lireFond, poserFond, type Fond } from "./carte-fond";
import { chargerLieux, nommer, type Inventaire } from "./lieux";
import { lieuxProches, SEUIL_PROCHES } from "./proches";

/**
 * LES FICHES DES BALADES — l'écran principal du territoire.
 *
 * ⭐ UNE CARTE = UNE FICHE PLEIN ÉCRAN : le fond OSM occupe tout le haut, la
 *    feuille du bas porte ce qu'on sait du circuit. On ne choisit pas dans une
 *    liste, on feuillette.
 *
 * 🔴 LE GESTE A CHANGÉ DE NATURE LE 1/11/2026 — demande du fondateur. Il
 *    TRANCHAIT (garder / passer) ; il NAVIGUE désormais : vers la droite la
 *    fiche suivante, vers la gauche la précédente. Ce n'est pas un réglage
 *    d'animation, c'est un autre contrat :
 *    · plus aucune carte n'est CONSOMMÉE, donc il n'y a plus de fin de jeu —
 *      un carrousel n'a pas d'écran « vous avez tout vu », il a un rang ;
 *    · les deux tampons « Je garde » / « Passer » ont disparu : ils nommaient
 *      un jugement qui n'existe plus. ⭐ Un décor qui survit à sa raison
 *      devient un faux témoin, et celui-là aurait été lu comme une promesse ;
 *    · le cœur n'ENREGISTRE plus, il OUVRE la fiche de l'Office.
 *
 * ⚠️ CE QUE ÇA DÉPLACE, ET IL FAUT LE DIRE : cet écran ne nourrit plus le
 *    carnet. Le carnet n'est pas mort — il se remplit depuis la fiche de
 *    promenade (`FichePromenade`), où le cœur a toujours voulu dire « je
 *    garde », et se relit dans `Espace`. Mais depuis ici, plus rien ne
 *    s'enregistre, et l'écran ne le promet donc plus nulle part.
 *
 * ⛔ CE SONT LES CIRCUITS DE L'OFFICE DE TOURISME. Aucune étoile, aucune
 *    note, aucun « recommandé » : MANA ne classe pas les itinéraires d'un
 *    tiers, elle constate qu'il y a des marques sur les poteaux.
 *
 * ⛔ CE QU'ON NE MONTRE PAS, ET POURQUOI :
 *    · AUCUNE PHOTOGRAPHIE. Nous n'en avons pas de ces 46 circuits ; celles
 *      de l'Office ne portent aucune licence, et on n'en fabrique pas.
 *    · AUCUNE PROSE DE L'OFFICE. Leur texte « À propos » est à eux. Les
 *      FAITS qu'ils déclarent — durée, dénivelé — se citent ; leur rédaction
 *      non, et l'accord de reprise n'est pas signé.
 *    · AUCUNE VUE AÉRIENNE. Notre relais ne sert que des tuiles vectorielles
 *      OpenStreetMap. Afficher du satellite demanderait un second fournisseur,
 *      donc une seconde sortie de l'IP du promeneur.
 *
 * ⭐ ET CE QU'ON MONTRE QUE PERSONNE D'AUTRE N'A : les sites remarquables que
 *    le tracé LONGE, pris dans notre inventaire. La fiche de l'Office donne
 *    des chiffres ; elle ne dit pas que le circuit passe à quatre mètres d'un
 *    alignement mégalithique.
 */

/** Au-delà de cette fraction de la largeur de carte, le geste est un verdict. */
const SEUIL = 0.28;
/** Combien de cartes on peint derrière celle du dessus. */
const PILE = 2;
/**
 * ⚠️ COMBIEN DE FONDS OSM VIVENT EN MÊME TEMPS. Un fond = un contexte WebGL,
 *    et les navigateurs en plafonnent le nombre. Deux : celle du dessus et la
 *    suivante — pour qu'aucun fond ne surgisse quand elle arrive devant.
 */
const FONDS_VIVANTS = 2;

/**
 * ⚠️ MAPLIBRE ET SON STYLE PÈSENT PLUS QUE TOUT LE RESTE DE L'ÉCRAN. Ils ne
 *    partent qu'au premier rendu du jeu, pas au chargement de l'application.
 */
const CarteFondOT = lazy(() =>
  import("./CarteFondOT").then((m) => ({ default: m.CarteFondOT })),
);

/** le sens du feuilletage */
type Sens = "suivante" | "precedente";

const DIFFICULTE: Record<string, string> = {
  facile: "Facile", moyen: "Moyen", difficile: "Difficile",
};

const FAMILLES: { clef: ItineraireOT["pratique"] | "tout"; nom: string }[] = [
  { clef: "tout", nom: "Tout" },
  { clef: "pied", nom: "À pied" },
  { clef: "vtt", nom: "VTT" },
  { clef: "velo", nom: "Vélo" },
  { clef: "trail", nom: "Trail" },
];

export function SwipeBalades({ surCarte }: { surCarte: (centre?: [number, number]) => void }) {
  const [tout, setTout] = useState<ItineraireOT[] | null>(null);
  const [erreur, setErreur] = useState("");
  /* ⭐ « À PIED » PAR DÉFAUT (31/10/2026, décision du fondateur). Sur 46
     circuits, 21 sont à vélo, en VTT ou en trail : ouvrir sur « Tout » faisait
     traverser la moitié du jeu à côté du sujet. Les quatre familles restent à
     un geste. */
  const [famille, setFamille] = useState<ItineraireOT["pratique"] | "tout">("pied");
  const [i, setI] = useState(0);
  const [glisse, setGlisse] = useState(0);
  const [envol, setEnvol] = useState<Sens | null>(null);
  const [inv, setInv] = useState<Inventaire | null>(null);
  const [requete, setRequete] = useState("");
  const [calquesOuverts, setCalquesOuverts] = useState(false);
  const [fond, setFond] = useState<Fond>("ortho");
  useEffect(() => { setFond(lireFond()); }, []);
  const depart = useRef<{ x: number; y: number; id: number } | null>(null);
  const boite = useRef<HTMLDivElement>(null);
  const [largeur, setLargeur] = useState(360);

  useEffect(() => {
    let vivant = true;
    chargerOT()
      .then((r) => { if (vivant) setTout(r.itineraires); })
      .catch(() => { if (vivant) setErreur("Les circuits de l'Office n'ont pas pu être lus."); });
    // ⚠️ L'inventaire arrive APRÈS et sans bloquer : la carte s'affiche avec
    //    ses chiffres, la ligne des sites s'ajoute quand elle est là.
    chargerLieux().then((x) => { if (vivant) setInv(x); }).catch(() => {});
    return () => { vivant = false; };
  }, []);

  useEffect(() => {
    const b = boite.current;
    if (!b) return;
    const ro = new ResizeObserver(() => setLargeur(b.clientWidth || 360));
    ro.observe(b);
    setLargeur(b.clientWidth || 360);
    return () => ro.disconnect();
  }, [tout]);

  const jeu = useMemo(
    () => (tout ?? []).filter((w) => famille === "tout" || w.pratique === famille),
    [tout, famille],
  );

  useEffect(() => { setI(0); setEnvol(null); setGlisse(0); }, [famille]);

  const courante = jeu[i] ?? null;

  /**
   * FEUILLETER — et les bornes sont DURES, pas circulaires.
   * ⭐ Un carrousel qui boucle fait croire qu'on avance encore alors qu'on
   *    repasse : on ne sait plus si on a tout vu. Aux deux bouts, le geste ne
   *    fait rien et le bouton correspondant est désactivé — l'écran dit où
   *    l'on est par son rang, pas par une promesse de fin.
   */
  const feuilleter = useCallback((sens: Sens) => {
    if (envol) return;
    const pas = sens === "suivante" ? 1 : -1;
    const vise = i + pas;
    if (vise < 0 || vise >= jeu.length) { setGlisse(0); return; }
    setEnvol(sens);
    window.setTimeout(() => { setEnvol(null); setGlisse(0); setI(vise); }, 260);
  }, [jeu.length, i, envol]);

  // ── LE GESTE ────────────────────────────────────────────────────────────
  // ⚠️ `setPointerCapture` : sans lui, un doigt qui sort de la carte ne rend
  //    plus d'événement et la carte reste figée en travers de l'écran.
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
    if (Math.abs(dx) > largeur * SEUIL) feuilleter(dx > 0 ? "suivante" : "precedente");
    else setGlisse(0);
  };

  // ⭐ Les flèches tranchent : un jeu qui ne répond qu'au doigt n'existe pas
  //    pour qui navigue au clavier.
  useEffect(() => {
    const au = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const c = e.target as HTMLElement | null;
      if (c && (c.tagName === "INPUT" || c.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowRight") { e.preventDefault(); feuilleter("suivante"); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); feuilleter("precedente"); }
    };
    window.addEventListener("keydown", au);
    return () => window.removeEventListener("keydown", au);
  }, [feuilleter]);

  // ── LA RECHERCHE D'UN LIEU ──────────────────────────────────────────────
  // ⭐ Elle ne duplique pas celle de la carte : elle y MÈNE. Chercher un lieu,
  //    c'est vouloir le voir sur le terrain, pas dans un jeu de cartes.
  const resultats = useMemo(() => {
    const q = requete.trim().toLowerCase();
    if (!inv || q.length < 2) return [];
    return inv.lieux
      .filter((l) => l.n && l.n.toLowerCase().includes(q))
      .slice(0, 6);
  }, [inv, requete]);

  // ⚠️ La carte sort DANS LE SENS DU DOIGT. La faire partir dans l'autre sens
  //    donnerait l'impression d'un refus là où il n'y a qu'un feuilletage.
  const dx = envol ? (envol === "suivante" ? largeur * 1.6 : -largeur * 1.6) : glisse;
  const part = Math.max(-1, Math.min(1, dx / (largeur * SEUIL || 1)));

  if (erreur) {
    return (
      <main className="jeu">
        <p className="jeu-vide" role="status">{erreur}</p>
        <button type="button" className="m-action-fine" onClick={() => surCarte()}>
          Ouvrir la carte du territoire
        </button>
      </main>
    );
  }

  return (
    <main className="jeu">
      {/* ── LA BARRE DU HAUT, POSÉE SUR LA CARTE ──────────────────────────
          ⚠️ Elle appartient à L'ÉCRAN, pas à la balade : elle ne part donc
             pas avec la carte qu'on fait glisser. */}
      <div className="jeu-haut">
        <div className="jeu-chercher">
          <svg className="m-icone" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
          <label className="sr-only" htmlFor="jeu-q">Rechercher un lieu du territoire</label>
          <input
            id="jeu-q" type="search" autoComplete="off"
            placeholder="Rechercher un lieu…"
            value={requete} onChange={(e) => setRequete(e.target.value)}
          />
        </div>
        <button
          type="button" className="jeu-rond"
          aria-expanded={calquesOuverts} aria-controls="jeu-calques"
          onClick={() => setCalquesOuverts((v) => !v)}
        >
          <span className="sr-only">Fond de carte et pratique</span>
          <svg className="m-icone" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" />
          </svg>
        </button>
      </div>

      {resultats.length > 0 && (
        <ul className="jeu-resultats" role="listbox" aria-label="Lieux trouvés">
          {resultats.map((l) => (
            <li key={l.osm}>
              <button type="button" onClick={() => { setRequete(""); surCarte(l.g); }}>
                <span className="jeu-resultat-nom">{nommer(l, inv!.libelles)}</span>
                <span className="jeu-resultat-cat">{inv!.libelles[l.c] ?? l.c}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {calquesOuverts && (
        <div className="jeu-calques" id="jeu-calques">
          {/* ── LE FOND ─────────────────────────────────────────────────
              ⭐ LE CHOIX SE RETIENT. Quelqu'un qui préfère la photographie
                 aérienne la préfère aussi à la carte suivante ; le lui
                 redemander quarante-six fois serait une question, pas un
                 réglage. Il vit dans CE navigateur et nulle part ailleurs. */}
          <p className="jeu-calque-titre">Fond</p>
          <div className="jeu-familles" role="radiogroup" aria-label="Fond de carte">
            {([["plan", "Plan"], ["ortho", "Vue aérienne"]] as const).map(([clef, nom]) => (
              <button
                key={clef} type="button" role="radio" aria-checked={fond === clef}
                className={fond === clef ? "jeu-famille jeu-famille-active" : "jeu-famille"}
                onClick={() => { setFond(clef); poserFond(clef); }}
              >
                {nom}
              </button>
            ))}
          </div>

          <p className="jeu-calque-titre">Pratique</p>
          <div className="jeu-familles" role="tablist" aria-label="Pratique">
            {FAMILLES.map((f) => {
              const n = f.clef === "tout"
                ? (tout ?? []).length
                : (tout ?? []).filter((w) => w.pratique === f.clef).length;
              if (tout && n === 0) return null;
              return (
                <button
                  key={f.clef} type="button" role="tab"
                  aria-selected={famille === f.clef}
                  className={famille === f.clef ? "jeu-famille jeu-famille-active" : "jeu-famille"}
                  onClick={() => { setFamille(f.clef); setCalquesOuverts(false); }}
                >
                  {f.nom}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="jeu-pile" ref={boite}>
        {!tout && <p className="jeu-vide" role="status">Lecture des circuits…</p>}

        {/* ⛔ PLUS D'ÉCRAN DE FIN. Il disait « Vous avez tout vu » et comptait
            le carnet ; depuis que le geste feuillette au lieu de trancher,
            aucune carte n'est consommée et rien ne s'enregistre ici. ⭐ Un
            écran qui survit à sa raison ne devient pas inutile, il devient
            FAUX : celui-là aurait annoncé une fin qui n'arrive plus et un
            carnet que plus rien ne remplit. Le rang, lui, dit où l'on est. */}
        {/* ⚠️ De l'arrière vers l'avant : la carte du dessus est la dernière
            du flux — aucun `z-index` à tenir. */}
        {tout && jeu.slice(i, i + PILE + 1).reverse().map((w, rang, tab) => {
          const dessus = rang === tab.length - 1;
          const profondeur = tab.length - 1 - rang;
          return (
            <Carte
              key={w.slug}
              w={w} inv={inv}
              rang={i + 1} total={jeu.length}
              dessus={dessus}
              profondeur={profondeur}
              fond={profondeur < FONDS_VIVANTS}
              substrat={fond}
              dx={dessus ? dx : 0}
              part={dessus ? part : 0}
              envol={dessus ? envol : null}
              surCarte={surCarte}
              surPrendre={prendre} surBouger={bouger} surLacher={lacher}
            />
          );
        })}
      </div>

      {/* ── LES TROIS COMMANDES ───────────────────────────────────────────
          ⭐ Elles sont SOUS la pile et non dans la carte : un verdict porte
             sur la carte, il n'en fait pas partie — et il reste au même
             endroit pendant que les cartes défilent. */}
      {tout && courante && (
        <div className="jeu-commandes">
          {/* ⭐ LES TROIS COMMANDES DOUBLENT LE GESTE, elles ne le complètent
              pas : ‹ et › font exactement ce que font les deux sens du doigt.
              Un écran qui ne répond qu'au glissement n'existe pas pour qui
              navigue au clavier ou vise mal. */}
          <button
            type="button" className="jeu-bouton jeu-passe"
            disabled={i === 0}
            onClick={() => feuilleter("precedente")}
          >
            <span className="sr-only">Fiche précédente</span>
            <svg className="m-icone" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 5 8 12l7 7" />
            </svg>
          </button>

          {/* ⭐ LE CŒUR OUVRE LA FICHE DE L'OFFICE (1/11, décision du
              fondateur). ⚠️ Il n'enregistre plus rien : le carnet se remplit
              depuis la fiche de promenade, où le même dessin veut dire « je
              garde ». Deux sens pour un cœur dans la même application, c'est
              le genre d'écart qu'on écrit pour s'en souvenir. */}
          <a
            className="jeu-bouton jeu-garde"
            href={courante.source} target="_blank" rel="noreferrer"
          >
            <span className="sr-only">Ouvrir la fiche de l’Office de tourisme</span>
            <svg className="m-icone" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 20.5 4.2 13a4.6 4.6 0 0 1 6.5-6.5l1.3 1.3 1.3-1.3A4.6 4.6 0 1 1 19.8 13z" />
            </svg>
          </a>

          <button
            type="button" className="jeu-bouton jeu-passe"
            disabled={i >= jeu.length - 1}
            onClick={() => feuilleter("suivante")}
          >
            <span className="sr-only">Fiche suivante</span>
            <svg className="m-icone" viewBox="0 0 24 24" aria-hidden="true">
              <path d="m9 5 7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

    </main>
  );
}

/* ═══ UNE CARTE ═════════════════════════════════════════════════════════ */

const L = 300, H = 330;   // le repère de la silhouette, en unités de `viewBox`

function Carte({
  w, inv, rang, total, dessus, profondeur, fond, substrat, dx, part, envol, surCarte,
  surPrendre, surBouger, surLacher,
}: {
  w: ItineraireOT; inv: Inventaire | null; rang: number; total: number;
  dessus: boolean; profondeur: number; fond: boolean; substrat: Fond;
  dx: number; part: number; envol: Sens | null;
  surCarte: (centre?: [number, number]) => void;
  surPrendre: (e: React.PointerEvent) => void;
  surBouger: (e: React.PointerEvent) => void;
  surLacher: (e: React.PointerEvent) => void;
}) {
  const p = useMemo(() => portrait(w.p, L, H, 0.12), [w]);
  /* 🔴 CE QUE LA FEUILLE RECOUVRE — mesuré, jamais recopié. La cartographie
     va à fond perdu : sans ce chiffre, le tracé se centre DERRIÈRE la
     feuille. ⭐ La surface visible d'une carte n'est pas sa surface. */
  const feuille = useRef<HTMLDivElement>(null);
  const [occulte, setOcculte] = useState({ haut: 0, bas: 0 });
  useEffect(() => {
    const f = feuille.current;
    if (!f) return;
    const mesurer = () => {
      const c = f.parentElement;
      if (!c) return;
      const b = c.getBoundingClientRect();
      // du bas de la carte au HAUT de la feuille : tout ce qu'elle cache
      const bas = Math.round(b.bottom - f.getBoundingClientRect().top);
      // ⚠️ et la barre de recherche, qui flotte elle aussi SUR la carte
      const barre = document.querySelector(".jeu-haut")?.getBoundingClientRect();
      const haut = barre ? Math.round(barre.bottom - b.top) + 8 : 0;
      setOcculte({ haut: Math.max(0, haut), bas: Math.max(0, bas) });
    };
    const ro = new ResizeObserver(mesurer);
    ro.observe(f);
    mesurer();
    return () => ro.disconnect();
  }, [w]);
  // ⚠️ Calculé pour la carte du dessus SEULEMENT : 1 358 lieux contre 270
  //    segments, ce n'est pas un coût qu'on paie trois fois pour deux cartes
  //    qu'on ne voit que par la tranche.
  /* ⚠️ Calculé pour les cartes QUI PORTENT UN FOND : 1 358 lieux contre 270
     segments, ce n'est pas un coût qu'on paie pour une carte qu'on ne voit
     que par la tranche.
     ⭐ SIX SUR LA CARTE, TROIS DANS LE TEXTE. Les pictos se lisent d'un coup
        d'œil et le tracé a de la place ; la ligne écrite, elle, pousse la
        cartographie vers le bas à chaque nom de plus. */
  const proches = useMemo(
    () => (fond && inv ? lieuxProches(w.p, inv.lieux, 6) : []),
    [fond, inv, w],
  );
  /* ⚠️ MÉMORISÉ, ET CE N'EST PAS UNE OPTIMISATION. `proches.map(...)` rend un
     TABLEAU NEUF à chaque rendu ; passé en dépendance d'un effet, il le fait
     repartir à chaque fois. C'est exactement ce qui a vidé la carte de ses
     tuiles en production — voir la note de `CarteFondOT`. */
  const sites = useMemo(() => proches.map((x) => x.l), [proches]);

  const angle = Math.max(-9, Math.min(9, part * 9));
  const style: React.CSSProperties = {
    transform: `translate3d(${dx}px, ${profondeur * 8}px, 0) rotate(${angle}deg) scale(${1 - profondeur * 0.03})`,
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
      {/* ── LE FOND : la carte OSM, le tracé dessus ──────────────────────
          ⭐ La silhouette reste DESSOUS : peinte à l'instant, sans réseau ni
             WebGL, elle tient pendant que les tuiles arrivent — et elle reste
             si elles n'arrivent jamais. Il y a toujours quelque chose de VRAI
             à l'écran. */}
      <div className="jeu-portrait">
        {fond && (
          <Suspense fallback={null}>
            <CarteFondOT p={w.p} lieux={sites} basOcculte={occulte.bas} hautOcculte={occulte.haut} fond={substrat} />
          </Suspense>
        )}
        {/* ⚠️ La silhouette est repoussée au-dessus de la feuille par le même
            chiffre : sinon le repli se dessine, lui aussi, derrière elle. */}
        <svg className="jeu-silhouette"
             style={{ paddingBottom: occulte.bas, paddingTop: occulte.haut }}
             viewBox={`0 0 ${L} ${H}`} role="img"
             aria-label={`Tracé de ${w.titre}, ${w.km} kilomètres`}>
          {p && (
            <>
              <path className="jeu-trace-ombre" d={p.d} />
              <path className="jeu-trace" d={p.d} />
              <circle className="jeu-depart" cx={p.depart[0]} cy={p.depart[1]} r="6" />
              {!p.boucle && (
                <circle className="jeu-arrivee" cx={p.arrivee[0]} cy={p.arrivee[1]} r="5" />
              )}
            </>
          )}
        </svg>
      </div>

      {/* ⛔ LES DEUX TAMPONS « Je garde » / « Passer » SONT PARTIS. Ils
          nommaient un jugement que le geste ne porte plus : il feuillette.
          ⭐ Un décor qui survit à sa raison devient un faux témoin — celui-là
             aurait été lu comme une promesse d'enregistrement. */}

      {/* ── LA FEUILLE DU BAS ────────────────────────────────────────── */}
      <div className="jeu-feuille" ref={feuille}>
        <p className="jeu-bandeau">
          <span className="jeu-pratique">{PRATIQUE[w.pratique]}</span>
          <span className="jeu-forme">{w.boucle ? "Boucle" : "Aller simple"}</span>
          {w.difficulte && <span className="jeu-forme">{DIFFICULTE[w.difficulte]}</span>}
          {/* ⭐ LE RANG REMPLACE L'ÉCRAN DE FIN. Un carrousel n'a pas de fin à
              annoncer ; il a une position à dire. Sans lui, on ne sait plus si
              l'on a fait le tour — et c'est la seule chose que l'écran de fin
              disait encore de vrai. */}
          <span className="jeu-rang">{rang}/{total}</span>
          <span className="jeu-bandeau-lieu">
            {w.commune ?? w.depart ?? "Presqu’île de Crozon"}
          </span>
        </p>

        <h2 className="jeu-nom">{w.titre}</h2>

        {/* ⭐ UNE SEULE LIGNE DE CHIFFRES, comme la maquette. Le lieu, la
            durée, la distance, le dénivelé : quatre faits sur un rang, avec
            un pictogramme chacun. L'ancienne présentation en `dt`/`dd`
            empilait deux étages et coûtait quarante pixels — c'est-à-dire de
            la cartographie, puisque la feuille prend sur la carte.
            ⚠️ Un chiffre absent ne s'invente pas : 6 fiches sur 46 ne donnent
               pas de durée, 2 pas de dénivelé. La case disparaît. */}
        <p className="jeu-faits">
          {w.duree && (
            <span className="jeu-fait">
              <svg className="jeu-fait-icone" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
              </svg>
              <span className="sr-only">Durée </span>{w.duree}
            </span>
          )}
          <span className="jeu-fait jeu-km">
            <svg className="jeu-fait-icone" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 12h18M6 9l-3 3 3 3M18 9l3 3-3 3" />
            </svg>
            <span className="sr-only">Distance </span>{w.km.toLocaleString("fr-FR")} km
          </span>
          {w.denivele != null && (
            <span className="jeu-fait jeu-km">
              <svg className="jeu-fait-icone" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 19h18M4 17l7-9 4 5 5-7" />
              </svg>
              <span className="sr-only">Dénivelé </span>+{w.denivele} m
            </span>
          )}
        </p>

        {/* ⭐ LA SEULE LIGNE QUI NE VIENNE PAS DE L'OFFICE. Leur fiche donne
            des chiffres ; elle ne dit pas que le circuit passe à quatre mètres
            d'un alignement mégalithique. ⛔ Et le seuil est DIT : « à
            proximité » n'est pas « sur le chemin ».
            ⚠️ Sur UNE ligne, qui se coupe proprement : ces noms sont une
               invitation à regarder la carte, pas un inventaire à lire. */}
        {proches.length > 0 && (
          <p className="jeu-proches">
            <span className="jeu-proches-label">À moins de {SEUIL_PROCHES} m :</span>{" "}
            {proches.slice(0, 3).map((x) => x.l.n).join(" · ")}
          </p>
        )}

        {/* ⛔ TROIS MENTIONS, ET AUCUNE N'EST UN ORNEMENT : qui a balisé, qui
            a déclaré les chiffres, d'où vient le fond. La dernière est une
            obligation de l'ODbL, les deux autres une obligation d'honnêteté.
            ⚠️ SUR UNE LIGNE, ET ELLE NE SE COUPE PAS. Elle tenait sur deux et
               coûtait seize pixels de carte ; la raccourcir était tentant,
               l'abréger aurait été une faute. On l'a resserrée, pas amputée —
               et `title` rend le texte entier au survol. */}
        <p className="jeu-provenance" title={`Itinéraire balisé par l’Office de tourisme. Durée et dénivelé déclarés par l’Office. Fond de carte : ${ATTRIBUTION[substrat]}.`}>
          {/* ⭐ LE CRÉDIT EST LE LIEN, et c'est sa place juste : un crédit
              renvoie à celui qu'il crédite. Les deux boutons « Voir le détail »
              et « Suivre sur la carte » ont quitté la feuille — trois
              fonctions suffisent, et elles sont rondes, sous la carte. La
              fiche de l'Office reste à un doigt, sur la mention qui la nomme
              déjà. ⚠️ `stopPropagation` : sans lui, le lien part en même temps
              que le glissement commence. */}
          <a href={w.source} target="_blank" rel="noreferrer"
             className="jeu-source" onPointerDown={(e) => e.stopPropagation()}>
            Office de tourisme
            <svg className="jeu-source-icone" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M14 4h6v6M20 4 11 13" />
            </svg>
          </a>
          {" · chiffres déclarés · "}{ATTRIBUTION[substrat]}
        </p>
      </div>
    </article>
  );
}
