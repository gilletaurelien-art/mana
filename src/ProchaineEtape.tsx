/**
 * ÉCRAN 4 — CE QUI VIENT. Le bandeau qu'on lit debout, d'un coup d'œil.
 *
 * ⭐ LA PROGRESSION SE DÉDUIT DU POINT DU TRACÉ LE PLUS PROCHE DE VOUS, et
 *    pas d'un chronomètre. Un chronomètre mesure le temps passé ; il ne sait
 *    pas qu'on s'est assis vingt minutes sur un rocher, et il annoncerait
 *    alors une avance qu'on n'a pas. La position, elle, dit où l'on EST.
 *
 * ⛔ ET ON N'ANNONCE AUCUNE DURÉE RESTANTE. Elle demanderait une vitesse — or
 *    la nôtre est une convention (3,5 km/h), pas une mesure : la donner comme
 *    « il vous reste 48 minutes » à quelqu'un qui marche sur un sentier
 *    côtier, c'est l'inviter à presser le pas pour tenir un chiffre que nous
 *    avons inventé. On donne une DISTANCE, qui est un fait.
 *
 * ⚠️ Sans position, le bandeau ne s'affiche PAS. Un bandeau « prochaine étape :
 *    la première » quand on n'a pas encore quitté le parking serait faux la
 *    moitié du temps, et il occuperait la place de l'information utile.
 */
import type { Walk, WalkPoint, Etape } from "./walks";
import { libelleCategorie } from "./categories";

const R = 6371000;
function metres(a: WalkPoint, bLat: number, bLon: number): number {
  const la1 = (a.lat * Math.PI) / 180, la2 = (bLat * Math.PI) / 180;
  const dLa = la2 - la1, dLo = ((bLon - a.lon) * Math.PI) / 180;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** ⚠️ Virgule décimale : `${3.5}` rend « 3.5 », notation anglaise. */
const fr = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

const lisible = (m: number) =>
  m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;

/**
 * La fraction du parcours déjà faite — OU `null` quand le tracé ne permet pas
 * de la savoir.
 *
 * ⚠️ CE GARDE A ÉTÉ AJOUTÉ SUR UNE FAUSSE ALERTE, ET IL FAUT LE DIRE. J'avais
 *    posé une position que je croyais à 40 % du tracé des forts du goulet ;
 *    le bandeau annonçait 87 %, et j'ai accusé le code. Vérification : le
 *    parcours compte 633 points, pas 1 369 — mon extraction avait débordé sur
 *    le tableau suivant du fichier source. L'index était bien à 86,6 %, et le
 *    candidat suivant à 739 m contre 0. Le code avait raison.
 *    ⭐ Une mesure prise sur un objet et appliquée à un autre : la faute qui
 *       revient le plus souvent dans ce dépôt, refaite ici en l'écrivant.
 *
 * 🔴 LE GARDE RESTE, PARCE QUE LE DANGER, LUI, EST RÉEL. Un aller-retour
 *    passe deux fois au même endroit : un `argmin` y a plusieurs réponses et
 *    en rend une au hasard de l'ordre du tableau. Il n'y en avait pas ici ; il
 *    y en aura sur le premier sentier qui revient par le même chemin.
 *    Il est éprouvé par mutation dans `ProchaineEtape.test.ts` — déclenché sur
 *    un aller-retour synthétique, silencieux sur une boucle franche.
 *
 * ⭐ ON NE CHOISIT PAS À PILE OU FACE : ON SE TAIT. Si un second candidat,
 *    éloigné dans le parcours, est presque aussi proche, la position ne
 *    détermine pas l'avancement — et une barre de progression fausse est pire
 *    qu'une barre absente, parce qu'on la croit. Le bandeau affiche alors les
 *    lieux par proximité, sans pourcentage, et dit pourquoi.
 *
 * ⚠️ Le seuil (1,6×) et l'écart (12 % du parcours) sont des conventions, pas
 *    des mesures — et c'est écrit ici pour que personne ne les cite comme
 *    des valeurs établies. Ils sont choisis larges : mieux vaut se taire une
 *    fois de trop que d'afficher un chiffre faux une fois de trop.
 */
export function avancement(walk: Walk, moi: WalkPoint): number | null {
  const n = walk.points.length;
  if (n < 2) return null;
  const d: number[] = new Array(n);
  let meilleur = Infinity, index = 0;
  for (let i = 0; i < n; i++) {
    d[i] = metres(moi, walk.points[i].lat, walk.points[i].lon);
    if (d[i] < meilleur) { meilleur = d[i]; index = i; }
  }
  const ecartMin = Math.max(1, Math.round(n * 0.12));
  for (let i = 0; i < n; i++) {
    if (Math.abs(i - index) < ecartMin) continue;
    if (d[i] <= meilleur * 1.6) return null; // deux endroits possibles : on se tait
  }
  return index / (n - 1);
}

export function ProchaineEtape({ walk, moi }: { walk: Walk; moi: WalkPoint | null }) {
  if (!moi || walk.etapes.length === 0) return null;

  const part = avancement(walk, moi);
  /* ⚠️ « PROCHAINE » SE LIT SUR LE CHEMIN, PAS SUR LA DISTANCE À VOL D'OISEAU.
     Une chapelle à 300 m à vol d'oiseau peut être DERRIÈRE vous, de l'autre
     côté d'une anse : la proposer comme prochaine étape ferait faire demi-tour.
     On prend donc la première étape dont la position le long du parcours est
     devant la nôtre. */
  /* ⚠️ Quand l'avancement est indéterminé, « devant » ne veut plus rien dire :
     on reprend le critère de l'écran 5 — la plus proche à vol d'oiseau — et
     on le DIT, au lieu de laisser croire qu'on sait où l'on en est. */
  const suivante: Etape | undefined =
    part === null
      ? walk.etapes.slice().sort((a, b) =>
          metres(moi, a.lat, a.lon) - metres(moi, b.lat, b.lon))[0]
      : walk.etapes.filter((e) => e.pos > part + 0.005).sort((a, b) => a.pos - b.pos)[0];

  return (
    <section className="chemin" aria-label="Votre progression">
      <div className="chemin-haut">
        <p className="m-etiquette chemin-label">
          {part === null ? "Le plus proche de vous" : suivante ? "Prochaine étape" : "Dernière ligne droite"}
        </p>
        {suivante ? (
          <>
            <p className="chemin-nom">{suivante.nom}</p>
            <p className="m-meta">
              {libelleCategorie(suivante.categorie)} · à{" "}
              {lisible(metres(moi, suivante.lat, suivante.lon))} à vol d'oiseau
            </p>
          </>
        ) : (
          <p className="chemin-nom">
            {walk.boucle ? "Retour au point de départ" : "Vers l'arrivée"}
          </p>
        )}
      </div>

      {/* ── LA BARRE, SEULEMENT QUAND ELLE PEUT ÊTRE JUSTE ───────────── */}
      {part === null ? (
        <p className="m-meta chemin-indetermine">
          Votre position correspond à deux endroits du parcours (l'aller et le
          retour passent tout près l'un de l'autre)&nbsp;: nous ne pouvons pas
          dire où vous en êtes, et nous préférons ne pas l'inventer.
        </p>
      ) : (
        <>
          {/* ⚠️ `aria-hidden` sur le dessin, et le chiffre en toutes lettres
              juste à côté : une barre de progression lue par une synthèse
              vocale ne dit rien d'utile si le nombre n'est pas écrit. */}
          <div className="chemin-barre" aria-hidden="true">
            <span className="chemin-barre-fait" style={{ inlineSize: `${(part * 100).toFixed(1)}%` }} />
            {walk.etapes.map((e) => (
              <span
                key={`${e.nom}-${e.pos}`}
                className={`chemin-jalon ${e.pos <= part ? "chemin-jalon-passe" : ""}`}
                style={{ insetInlineStart: `${(e.pos * 100).toFixed(1)}%` }}
              />
            ))}
          </div>
          <p className="m-meta chemin-chiffres">
            <strong>{Math.round(part * 100)} %</strong> du parcours ·{" "}
            {fr(walk.distanceKm * part)} km sur {fr(walk.distanceKm)}
          </p>
        </>
      )}
    </section>
  );
}
