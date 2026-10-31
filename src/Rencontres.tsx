/**
 * ÉCRAN 5 — SUR VOTRE CHEMIN. Ce qu'on croise, trié par ce qui est proche.
 *
 * ⭐ LA DIFFÉRENCE AVEC LA LISTE DE LA FICHE EST LE RÉFÉRENTIEL, et elle
 *    change tout. La fiche classe les lieux par leur POSITION LE LONG DU
 *    PARCOURS — on la lit avant de partir, et l'ordre du chemin est le bon
 *    ordre. Ici on classe par DISTANCE À VOUS : on est dehors, et la seule
 *    question est « qu'est-ce qu'il y a autour, maintenant ».
 *    Le même jeu de données, deux ordres, deux écrans. Les fusionner
 *    donnerait une liste qui répond à côté dans les deux situations.
 *
 * ⛔ ET ON NE PROMET RIEN QU'ON NE MESURE. « À 450 m » est une distance À VOL
 *    D'OISEAU, pas une distance à marcher — entre vous et une chapelle, il
 *    peut y avoir une anse à contourner. L'écran l'écrit. Annoncer 450 m de
 *    marche quand il en faut 1 200 est exactement le genre de promesse qui
 *    détourne quelqu'un vers une falaise.
 */
import { useEffect, useState } from "react";
import { WALKS } from "./walks";
import type { Etape } from "./walks";
import { libelleCategorie } from "./categories";
import { ILLUSTRATIONS } from "./illustrations";
import { Photo, image } from "./images/Photo";
import { FICHIER_FERMETURES, fermeturesSurLeParcours } from "./fermetures";
import type { Fermetures } from "./fermetures";

const R = 6371000;
/** ⚠️ Haversine, en mètres. La même formule que `fermetures.ts` — et ce n'est
 *  pas une duplication à corriger : celle-là prend des `[lon, lat]`, celle-ci
 *  des étapes. Les unifier demanderait d'exporter un type partagé pour gagner
 *  six lignes, et c'est le genre de factorisation qui rend deux modules
 *  solidaires sans raison. */
function metres(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const la1 = (aLat * Math.PI) / 180, la2 = (bLat * Math.PI) / 180;
  const dLa = la2 - la1, dLo = ((bLon - aLon) * Math.PI) / 180;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** ⚠️ Arrondi à la précision que le GPS d'un téléphone peut tenir : 10 m sous
 *  le kilomètre, 100 m au-delà. « À 437 m » afficherait une exactitude que
 *  l'appareil n'a pas. */
const lisible = (m: number) =>
  m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;

type AvecDistance = Etape & { m: number | null };

export function Rencontres({ base, slug }: { base: string; slug: string }) {
  const walk = WALKS.find((w) => w.slug === slug);
  const [pos, setPos] = useState<[number, number] | null>(null);
  const [motGps, setMotGps] = useState("");
  const [fermetures, setFermetures] = useState<Fermetures | null>(null);

  useEffect(() => {
    let vivant = true;
    fetch(`${base}/${FICHIER_FERMETURES}`, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (vivant) setFermetures(j); })
      .catch(() => {});
    if (!navigator.geolocation) {
      setMotGps("Votre navigateur ne sait pas vous situer — les lieux restent listés dans l'ordre du chemin.");
      return () => { vivant = false; };
    }
    /* ⭐ `watchPosition` et non `getCurrentPosition` : on marche. Une position
       relevée une fois au chargement vieillit de cent mètres en deux minutes,
       et la liste se met à mentir sans rien signaler. */
    const id = navigator.geolocation.watchPosition(
      (p) => { if (vivant) { setPos([p.coords.latitude, p.coords.longitude]); setMotGps(""); } },
      () => { if (vivant) setMotGps("Position indisponible — les lieux restent listés dans l'ordre du chemin."); },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 },
    );
    return () => { vivant = false; navigator.geolocation.clearWatch(id); };
  }, [base]);

  if (!walk) return null;

  const avec: AvecDistance[] = walk.etapes.map((e) => ({
    ...e,
    m: pos ? metres(pos[0], pos[1], e.lat, e.lon) : null,
  }));
  /* ⚠️ Sans position, on NE TRIE PAS par distance — on garde l'ordre du
     chemin. Trier par une valeur nulle produirait un ordre arbitraire qui
     aurait l'air d'un classement. */
  const liste = pos
    ? avec.slice().sort((a, b) => (a.m ?? Infinity) - (b.m ?? Infinity))
    : avec.slice().sort((a, b) => a.pos - b.pos);

  const proches = pos ? liste.filter((e) => (e.m ?? Infinity) < 2000).length : 0;
  const touchees = fermeturesSurLeParcours(walk.points, fermetures);

  /** une vignette n'existe que si on a VRAIMENT une image de ce parcours */
  const vignettes = (ILLUSTRATIONS[walk.slug]?.corps ?? []).map((id) => image(id)).filter(Boolean);

  return (
    <main className="renc">
      <header className="renc-entete">
        <h1 className="m-titre">Sur votre chemin</h1>
        {pos ? (
          <p className="m-etiquette renc-compte">
            {proches} {proches > 1 ? "lieux à proximité" : "lieu à proximité"}
          </p>
        ) : (
          <p className="m-etiquette renc-compte">{walk.etapes.length} lieux sur le parcours</p>
        )}
      </header>

      {motGps && <p className="m-meta renc-gps" role="status">{motGps}</p>}

      {/* ── LES IMAGES DU PARCOURS, EN BANDEAU ─────────────────────────
          🔴 PAS EN VIGNETTE DANS LA LISTE, et c'est une correction de fond.
             Premier jet : une photo à côté de la 1ʳᵉ et de la 2ᵉ entrée,
             parce qu'on en avait deux. L'association était ARBITRAIRE — rien
             ne dit que cette image montre cette étape-là — et le lecteur, lui,
             lit « voici l'église Saint-Éloi ».
             ⭐ Une image posée à côté d'un nom AFFIRME. Si l'affirmation n'est
                pas vérifiée, l'image doit changer de place, pas de légende.
             En bandeau, elles illustrent LE PARCOURS, ce qui est vrai, et le
             crédit a la place de s'afficher — sur 88 px, il recouvrait
             l'image entière. */}
      {vignettes.length > 0 && (
        <section className="renc-bandeau">
          <h2 className="m-etiquette">Images de ce parcours</h2>
          <div className="renc-bandeau-rang">
            {vignettes.map((im) => (
              <Photo
                key={im!.id}
                id={im!.id}
                usage={im!.documentaire ? "documente" : "evoque"}
                alt={im!.lieu ?? "Paysage du parcours"}
                sizes="(min-width: 620px) 300px, 70vw"
                className="renc-image m-photo-vivante"
              />
            ))}
          </div>
        </section>
      )}

      <ol className="renc-liste">
        {liste.map((e) => (
          <li key={`${e.nom}-${e.pos}`} className="renc-item">
            <span className="renc-pastille" aria-hidden="true">
              {libelleCategorie(e.categorie).slice(0, 1)}
            </span>
            <span className="renc-corps">
              <span className="renc-nom">{e.nom}</span>
              <span className="m-meta">
                {libelleCategorie(e.categorie)}
                {e.m != null ? ` · à ${lisible(e.m)} à vol d'oiseau` : ` · à ${Math.round(e.pos * 100)} % du parcours`}
              </span>
            </span>
          </li>
        ))}
      </ol>

      {pos && (
        <p className="m-meta renc-note">
          Distances à vol d'oiseau. Le chemin peut être plus long.
        </p>
      )}

      {/* ── CE QUI EMPÊCHE, S'IL Y EN A ─────────────────────────────────── */}
      {touchees.map((f) => (
        <section
          key={f.id}
          className={`renc-fermeture ${f.effet === "interdit" ? "renc-fermeture-interdit" : ""}`}
        >
          <h2 className="m-etiquette">{f.libelle}</h2>
          <p className="m-texte">{f.motif}.</p>
          <p className="m-meta">
            {f.autorite}, {f.publie_le} ·{" "}
            <a className="m-lien" href={f.source} target="_blank" rel="noreferrer noopener">
              en savoir plus
            </a>
          </p>
        </section>
      ))}

      <p className="renc-retour">
        <a className="m-lien" href={`${base}/promenade/${walk.slug}`}>Revenir à la fiche</a>
      </p>
    </main>
  );
}
