import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { chargerOT, PRATIQUE, type ItineraireOT } from "./ot";
import { portrait } from "./portrait";
import { ajouterAuCarnet, lireCarnet } from "./carnet";
import { ATTRIBUTION_OSM } from "./carte-fond";
import { chargerLieux, nommer, type Inventaire } from "./lieux";
import { lieuxProches, SEUIL_PROCHES } from "./proches";

/**
 * LE JEU DE CARTES DES BALADES — l'écran principal du territoire.
 *
 * ⭐ UNE CARTE = UNE FICHE PLEIN ÉCRAN : le fond OSM occupe tout le haut, la
 *    feuille du bas porte ce qu'on sait du circuit, et les trois commandes
 *    tranchent. On ne choisit pas dans une liste, on réagit à une fiche.
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

type Verdict = "garde" | "passe";

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
  const [famille, setFamille] = useState<ItineraireOT["pratique"] | "tout">("tout");
  const [i, setI] = useState(0);
  const [carnet, setCarnet] = useState<string[]>([]);
  const [glisse, setGlisse] = useState(0);
  const [envol, setEnvol] = useState<Verdict | null>(null);
  const [inv, setInv] = useState<Inventaire | null>(null);
  const [requete, setRequete] = useState("");
  const [filtresOuverts, setFiltresOuverts] = useState(false);
  const depart = useRef<{ x: number; y: number; id: number } | null>(null);
  const boite = useRef<HTMLDivElement>(null);
  const [largeur, setLargeur] = useState(360);

  useEffect(() => { setCarnet(lireCarnet()); }, []);

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

  const trancher = useCallback((v: Verdict) => {
    const w = jeu[i];
    if (!w || envol) return;
    if (v === "garde") setCarnet(ajouterAuCarnet(w.slug));
    setEnvol(v);
    window.setTimeout(() => { setEnvol(null); setGlisse(0); setI((n) => n + 1); }, 260);
  }, [jeu, i, envol]);

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
    if (Math.abs(dx) > largeur * SEUIL) trancher(dx > 0 ? "garde" : "passe");
    else setGlisse(0);
  };

  // ⭐ Les flèches tranchent : un jeu qui ne répond qu'au doigt n'existe pas
  //    pour qui navigue au clavier.
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

  const dx = envol ? (envol === "garde" ? largeur * 1.6 : -largeur * 1.6) : glisse;
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
          aria-pressed={filtresOuverts}
          onClick={() => setFiltresOuverts((v) => !v)}
        >
          <span className="sr-only">Filtrer par pratique</span>
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

      {filtresOuverts && (
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
                onClick={() => { setFamille(f.clef); setFiltresOuverts(false); }}
              >
                {f.nom}
              </button>
            );
          })}
        </div>
      )}

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
              <button type="button" className="m-action-fine" onClick={() => surCarte()}>
                Ouvrir la carte
              </button>
            </div>
          </div>
        )}

        {/* ⚠️ De l'arrière vers l'avant : la carte du dessus est la dernière
            du flux — aucun `z-index` à tenir. */}
        {tout && jeu.slice(i, i + PILE + 1).reverse().map((w, rang, tab) => {
          const dessus = rang === tab.length - 1;
          const profondeur = tab.length - 1 - rang;
          return (
            <Carte
              key={w.slug}
              w={w} inv={inv}
              dessus={dessus}
              profondeur={profondeur}
              fond={profondeur < FONDS_VIVANTS}
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
          <button type="button" className="jeu-bouton jeu-passe" onClick={() => trancher("passe")}>
            <span className="sr-only">Passer cette balade</span>
            <svg className="m-icone" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <button type="button" className="jeu-bouton jeu-ouvre" onClick={() => surCarte(courante.p[0])}>
            <span className="sr-only">Voir ce circuit sur la carte</span>
            <svg className="m-icone" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 4 3 6.5v13L9 17l6 3 6-2.5v-13L15 7z" />
              <path d="M9 4v13M15 7v13" />
            </svg>
          </button>
          <button type="button" className="jeu-bouton jeu-garde" onClick={() => trancher("garde")}>
            <span className="sr-only">Garder cette balade dans mon carnet</span>
            {/* ⭐ Un cœur, pas un marque-page : le geste dit « celle-là me
                plaît », pas « je la range ». */}
            <svg className="m-icone" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 20.5 4.2 13a4.6 4.6 0 0 1 6.5-6.5l1.3 1.3 1.3-1.3A4.6 4.6 0 1 1 19.8 13z" />
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
  w, inv, dessus, profondeur, fond, dx, part, envol, surCarte,
  surPrendre, surBouger, surLacher,
}: {
  w: ItineraireOT; inv: Inventaire | null;
  dessus: boolean; profondeur: number; fond: boolean;
  dx: number; part: number; envol: Verdict | null;
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
  const [occulte, setOcculte] = useState(0);
  useEffect(() => {
    const f = feuille.current;
    if (!f) return;
    const mesurer = () => {
      const c = f.parentElement;
      if (!c) return;
      // du bas de la carte au HAUT de la feuille : c'est tout ce qui est caché
      setOcculte(Math.round(c.getBoundingClientRect().bottom - f.getBoundingClientRect().top));
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
            <CarteFondOT p={w.p} lieux={proches.map((x) => x.l)} basOcculte={occulte} />
          </Suspense>
        )}
        {/* ⚠️ La silhouette est repoussée au-dessus de la feuille par le même
            chiffre : sinon le repli se dessine, lui aussi, derrière elle. */}
        <svg className="jeu-silhouette" style={{ paddingBottom: occulte }}
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

      <span className="jeu-verdict jeu-verdict-garde" style={{ opacity: Math.max(0, part) }}>
        Je garde
      </span>
      <span className="jeu-verdict jeu-verdict-passe" style={{ opacity: Math.max(0, -part) }}>
        Passer
      </span>

      {/* ── LA FEUILLE DU BAS ────────────────────────────────────────── */}
      <div className="jeu-feuille" ref={feuille}>
        <p className="jeu-bandeau">
          <span className="jeu-pratique">{PRATIQUE[w.pratique]}</span>
          <span className="jeu-forme">{w.boucle ? "Boucle" : "Aller simple"}</span>
          {w.difficulte && <span className="jeu-forme">{DIFFICULTE[w.difficulte]}</span>}
        </p>

        <h2 className="jeu-nom">{w.titre}</h2>
        <p className="jeu-lieu">{w.commune ?? w.depart ?? "Presqu’île de Crozon"}</p>

        {/* ⭐ TROIS CHIFFRES, ET DEUX SONT LA PAROLE DE L'OFFICE. La distance
            est MESURÉE sur le tracé (la leur s'en écarte de 17 % au pire) ;
            la durée et le dénivelé sont DÉCLARÉS par eux, jamais calculés —
            une estimation sous un libellé « balisé par l'Office » lui ferait
            endosser notre arithmétique.
            ⚠️ Un chiffre absent ne s'invente pas : 6 fiches sur 46 ne donnent
               pas de durée, 2 pas de dénivelé. La case disparaît. */}
        <dl className="jeu-faits">
          {w.duree && <div><dt>Durée</dt><dd>{w.duree}</dd></div>}
          <div><dt>Distance</dt><dd className="jeu-km">{w.km.toLocaleString("fr-FR")} km</dd></div>
          {w.denivele != null && <div><dt>Dénivelé</dt><dd>+{w.denivele} m</dd></div>}
        </dl>

        {/* ⭐ LA SEULE LIGNE QUI NE VIENNE PAS DE L'OFFICE. Leur fiche donne
            des chiffres ; elle ne dit pas que le circuit passe à quatre mètres
            d'un alignement mégalithique. ⛔ Et le seuil est DIT : « à
            proximité » n'est pas « sur le chemin ». */}
        {proches.length > 0 && (
          <p className="jeu-proches">
            <span className="jeu-proches-label">À moins de {SEUIL_PROCHES} m du tracé</span>
            {proches.slice(0, 3).map((x) => (
              <span key={x.l.osm} className="jeu-proche">
                {x.l.n}<span className="jeu-proche-cat"> · {inv!.libelles[x.l.c] ?? x.l.c}</span>
              </span>
            ))}
          </p>
        )}

        <div className="jeu-actions">
          <a className="m-action-fine jeu-lien" href={w.source} target="_blank" rel="noreferrer">
            Voir le détail
          </a>
          {/* ⛔ PAS « LANCER LA BALADE ». L'écran de marche guidée n'existe que
              pour les itinéraires MANA, qui portent des étapes ; un circuit de
              l'Office n'en a pas. ⭐ Une promesse d'interface qu'on ne peut pas
              tenir se reformule, elle ne se dessine pas en espérant que
              personne n'appuie dessus. Ce bouton-ci tient : la carte, le tracé,
              et votre position. */}
          <button type="button" className="m-action jeu-lien" onClick={() => surCarte(w.p[0])}>
            Suivre sur la carte
          </button>
        </div>

        {/* ⛔ TROIS MENTIONS, ET AUCUNE N'EST UN ORNEMENT : qui a balisé, qui
            a déclaré les chiffres, d'où vient le fond. La dernière est une
            obligation de l'ODbL, les deux autres une obligation d'honnêteté. */}
        <p className="jeu-provenance">
          Balisé par l’Office de tourisme · durée et dénivelé déclarés par lui
          · fond {ATTRIBUTION_OSM}
        </p>
      </div>
    </article>
  );
}
