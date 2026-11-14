// « AUTOUR DE MOI » — les hébergements du territoire, du plus proche au plus loin.
//
// 🔴 ARBITRAGE D'AURÉLIEN, 14/11/2026 : « "autour de moi" n'existe pas encore
//    pour les hébergements > implémente ». La question venait de ce que
//    manahome.org affichait, pour un public mondial, le bouton « Les balades
//    des Offices de Tourisme » — l'Office de Crozon.
//
// ⭐ POURQUOI « AUTOUR DE MOI » ET PAS UN INDEX PAR PAYS. manahome publie déjà
//    173 pages pays qui comptent les hébergements. C'est une réponse de
//    catalogue : combien, où, par pays. Celle-ci répond à la question qu'on se
//    pose debout, dehors : « où puis-je dormir, d'ici ? ». Les deux existent,
//    elles ne disent pas la même chose, et c'est la seconde qui remplace un
//    bouton qui montrait ce qu'il y avait PRÈS DE VOUS.
//
// ⛔ CE QUE CET ÉCRAN NE FAIT PAS, ET NE FERA PAS SANS DÉCISION : réserver,
//    noter, classer par prix. Nous n'avons ni disponibilité ni tarif, et
//    afficher une liste qui ressemble à un moteur de réservation en
//    promettrait. Il dit ce qu'on sait : un nom, un type, une commune, une
//    distance.
import { useEffect, useMemo, useState } from "react";
import { DEFAUT, territoireDe, urlHebergements, type Territoire } from "./territoires";
import { metres } from "./composition";

const BASE = import.meta.env.VITE_GRAPHE_BASE ?? "https://mana.bzh/bretagne/g";

/** Ce que porte le fichier — voir `scripts/hebergements.ts`. */
interface Hebergement {
  n: string; t: string | null; c: string | null;
  lits?: number; ch?: number; g: [number, number];
}

/**
 * ⚠️ LES TYPES VIENNENT D'OSM ET DE PORTAILS RÉGIONAUX, EN PLUSIEURS LANGUES.
 *    « Vakantiewoning », « Locazioni tur. non imprenditoriali » : les afficher
 *    tels quels donnerait une liste qu'on ne peut pas lire.
 * ⛔ Et on ne traduit QUE ce qu'on connaît : un type absent d'ici se montre
 *    tel quel plutôt que de devenir « Hébergement », qui effacerait une
 *    information au lieu de l'avouer.
 */
const TYPES: Record<string, string> = {
  hotel: "Hôtel", Hotel: "Hôtel", motel: "Motel",
  guest_house: "Chambre d'hôtes", Guesthouse: "Chambre d'hôtes",
  hostel: "Auberge de jeunesse", chalet: "Chalet",
  camp_site: "Camping", caravan_site: "Aire de camping-car",
  apartment: "Appartement", alpine_hut: "Refuge", wilderness_hut: "Refuge",
  SelfCateringAccommodation: "Meublé", Vakantiewoning: "Meublé",
};
const direLeType = (t: string | null) => (t ? TYPES[t] ?? t : null);

/** ⭐ Au-delà, ce n'est plus « autour de moi » — c'est le territoire entier. */
const RAYON_M = 25_000;

export function Hebergements() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [liste, setListe] = useState<Hebergement[] | null>(null);
  const [erreur, setErreur] = useState(false);

  /* L'adresse d'abord, la géolocalisation ensuite — même ordre que le
     compositeur, pour qu'un lien partagé ouvre bien le lieu qu'il nomme. */
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const lon = Number(p.get("lon")), lat = Number(p.get("lat"));
    if (Number.isFinite(lon) && Number.isFinite(lat) && (lon !== 0 || lat !== 0)) {
      setPosition([lon, lat]); return;
    }
    if (!navigator.geolocation) { setPosition(null); return; }
    navigator.geolocation.getCurrentPosition(
      (g) => setPosition([g.coords.longitude, g.coords.latitude]),
      () => setPosition(null), { timeout: 8000 });
  }, []);

  const territoire: Territoire | null = useMemo(
    () => (position ? territoireDe(position[0], position[1]) ?? null : null), [position]);

  useEffect(() => {
    if (!territoire) { setListe(null); return; }
    let vivant = true;
    fetch(urlHebergements(BASE, territoire))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => { if (vivant) { setListe(j.h as Hebergement[]); setErreur(false); } })
      /* ⛔ ON NE REND PAS UNE LISTE VIDE SUR UNE ERREUR RÉSEAU : « nous n'en
         connaissons aucun ici » et « je n'ai pas pu demander » ne se disent
         pas pareil, et les confondre ferait croire à un territoire désert. */
      .catch(() => { if (vivant) { setListe(null); setErreur(true); } });
    return () => { vivant = false; };
  }, [territoire]);

  const autour = useMemo(() => {
    if (!liste || !position) return null;
    return liste
      .map((h) => ({ h, m: metres(position, h.g) }))
      .filter((x) => x.m <= RAYON_M)
      .sort((a, b) => a.m - b.m);
  }, [liste, position]);

  const dire = (m: number) =>
    m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace(".", ",")} km`;

  return (
    <main className="page page-hebergements">
      <div className="wrap">
        <p className="hero-label">Autour de moi</p>
        <h1 className="page-titre"><span>Où dormir</span></h1>

        {!position && !erreur && (
          <p className="page-texte">
            {/* ⚠️ On DEMANDE la position, on ne la suppose pas — et on dit
                pourquoi : un écran qui attend sans rien dire a l'air cassé. */}
            MANA cherche où vous êtes, pour vous dire ce qu'il y a autour.
          </p>
        )}

        {position && !territoire && (
          <p className="page-texte">
            <strong>MANA ne couvre pas encore cet endroit.</strong>{" "}
            Les hébergements sont relevés territoire par territoire ; celui où
            vous êtes n'en fait pas encore partie.
          </p>
        )}

        {erreur && (
          <p className="page-texte">
            <strong>La liste n'a pas pu être chargée.</strong>{" "}
            Ce n'est pas qu'il n'y a rien ici : c'est que MANA n'a pas pu
            demander. Réessayez dans un instant.
          </p>
        )}

        {autour && autour.length === 0 && (
          <p className="page-texte">
            <strong>Aucun hébergement connu de MANA à moins de {RAYON_M / 1000} km.</strong>{" "}
            {territoire && `Nous en relevons ${liste?.length ?? 0} sur ${territoire.avecArticle}, mais aucun si près.`}
          </p>
        )}

        {autour && autour.length > 0 && (
          <>
            <p className="page-note">
              {autour.length} hébergement{autour.length > 1 ? "s" : ""} à moins de{" "}
              {RAYON_M / 1000} km, du plus proche au plus loin.
            </p>
            <ul className="heb-liste">
              {autour.map(({ h, m }, i) => (
                <li className="heb" key={`${h.n}|${h.g[0]}|${h.g[1]}|${i}`}>
                  <span className="heb-nom">{h.n}</span>
                  <span className="heb-dire">
                    {[direLeType(h.t), h.c].filter(Boolean).join(" · ")}
                  </span>
                  <span className="heb-loin">{dire(m)}</span>
                </li>
              ))}
            </ul>
            {/* ⛔ LA SOURCE SE DIT, comme pour la carte et les tracés. */}
            <p className="page-note">
              Relevé depuis OpenStreetMap et les portails touristiques régionaux.
              MANA ne connaît ni les disponibilités ni les prix, et ne prend
              aucune réservation.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
