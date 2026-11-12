import { rencontresLeLong } from "./proches";
import type { Inventaire } from "./lieux";
import type { ItineraireOT } from "./ot";
import type { Walk } from "./walks";

/**
 * UN CIRCUIT D'OFFICE DEVIENT UNE PROMENADE MARCHABLE — 12/11/2026.
 *
 * 🔴 DEMANDE DU FONDATEUR : « les balades de l'OT renvoient automatiquement
 *    vers le site de l'OT ; on pourrait les avoir aussi chez nous avec le
 *    même dispositif d'accompagnement que nos promenades composées ».
 *
 * ⭐ ET C'ÉTAIT PETIT, PARCE QUE TOUT ÉTAIT DÉJÀ LÀ. `EnChemin` ne lit que
 *    huit champs ; un circuit d'Office en porte six tels quels. Le septième,
 *    `points`, est son tracé dans l'autre notation. Le huitième — les étapes,
 *    « ce que vous croiserez » — se calcule avec `rencontresLeLong()`, la
 *    fonction même qui sert aux promenades composées : elle prend des
 *    `[lon, lat][]`, c'est-à-dire exactement la forme que `p` a déjà.
 * ⛔ Ce n'était donc pas une fonctionnalité à inventer, c'était une
 *    conversion à écrire — la même découverte que le jour où l'écran de
 *    marche s'est révélé capable de marcher une boucle sans slug.
 *
 * ⚠️ CE QU'ON AJOUTE, ET QUI EST LE SEUL ÉCHANGE HONNÊTE. Leur fiche dit la
 *    distance, la durée et la difficulté ; elle ne sait pas dire qu'on passe
 *    devant un menhir, une fontaine et trois fortifications. Nous le savons —
 *    5 676 lieux — et c'est ce qu'on apporte en retour de leur tracé. Le lien
 *    vers leur fiche reste partout : c'est le crédit, et c'est elle qui fait
 *    foi sur le balisage.
 *
 * ⛔ L'ACCORD DE REPRISE RESTE À OBTENIR — voir `ot.ts`. Ce module ne le
 *    contourne pas : il ne publie RIEN de neuf. Les tracés sont déjà dans
 *    `src/ot.json`, déjà dessinés sur la carte, déjà dans un dépôt public.
 *    Ce qui change ici est l'USAGE, pas la publication. Si l'accord se
 *    refuse, c'est tout le recueil qui se retire, et ce module tombe avec —
 *    il n'ajoute aucune dépendance nouvelle à retirer séparément.
 */

/**
 * ⚠️ LE PRÉFIXE N'EST PAS DÉCORATIF. Les 26 600 tracés du catalogue distant
 *    et les 116 circuits d'Office vivent sous la MÊME adresse,
 *    `/promenade/<slug>`, et leurs identifiants viennent de deux mondes qui
 *    ne se connaissent pas : les uns d'OpenStreetMap, les autres des URL des
 *    Offices. Rien ne garantit qu'ils ne se croiseront jamais.
 * ⭐ Une collision ne ferait pas une erreur : elle ferait afficher UN AUTRE
 *    CHEMIN sous le bon nom — le genre de défaut qu'on ne voit qu'en
 *    marchant. Le préfixe la rend impossible plutôt qu'improbable.
 */
export const PREFIXE_OT = "ot-";

export const estSlugOT = (slug: string) => slug.startsWith(PREFIXE_OT);
export const slugNu = (slug: string) => slug.slice(PREFIXE_OT.length);

/**
 * ⚠️ `inventaire` est FACULTATIF, et son absence n'est pas une panne. Les
 *    lieux arrivent après le reste ; sans eux la promenade est marchable, elle
 *    n'annonce simplement pas ce qu'on croise. ⛔ Mieux vaut un écran qui
 *    marche sans ses étapes qu'un écran qui attend ses étapes pour marcher.
 */
/**
 * « 3h50 » → 3,833. La durée de l'Office est une CHAÎNE, pas un nombre.
 *
 * ⚠️ MESURÉ SUR LE RECUEIL : 98 circuits sur 116 la déclarent, 18 non. Le
 *    repli est alors la convention de 3,5 km/h — une convention, et elle est
 *    dite ailleurs à l'écran.
 * ⛔ ET ON NE DEVINE PAS UNE FORME QU'ON N'A PAS VUE : un format inattendu
 *    rend `null`, donc le repli, plutôt qu'un nombre fabriqué à partir d'une
 *    moitié de chaîne. Une durée fausse sur un sentier de falaise n'est pas
 *    une approximation.
 */
export function heures(duree: string | null): number | null {
  const m = duree?.match(/^(\d{1,2})\s*h\s*(\d{1,2})?$/i);
  if (!m) return null;
  const h = Number(m[1]), min = Number(m[2] ?? 0);
  if (!Number.isFinite(h) || min > 59) return null;
  return h + min / 60;
}

export function promenadeOT(i: ItineraireOT, inventaire?: Inventaire | null): Walk {
  const points = i.p.map(([lon, lat]) => ({ lat, lon }));
  const etapes = inventaire
    ? rencontresLeLong(i.p, inventaire.lieux).map((r) => ({
        nom: r.l.n ?? inventaire.libelles[r.l.c] ?? r.l.c,
        categorie: inventaire.libelles[r.l.c] ?? r.l.c,
        /* ⭐ `ordre` EST UNE FRACTION DU PARCOURS, PAS UN RANG — et le
           compositeur s'y est fait prendre : avec un indice, le deuxième
           jalon partait à 100 % de la barre de progression et « prochaine
           étape » désignait toujours le même lieu. */
        pos: r.ordre,
        lat: r.l.g[1], lon: r.l.g[0],
      }))
    : [];

  return {
    slug: PREFIXE_OT + i.slug,
    /* ⭐ `ot` existe déjà dans `Provenance`, avec sa mention : « Itinéraire
       balisé par l'Office de tourisme ». Rien à inventer — et c'est elle qui
       s'affiche sur la fiche et dans le `<desc>` du GPX exporté. */
    provenance: "ot",
    titre: i.titre,
    lieu: i.commune ?? i.depart ?? "Finistère",
    /* ⚠️ PAS DE RÉSUMÉ INVENTÉ. Nous n'avons pas leur texte, et en écrire un
       « plausible » serait le mensonge documentaire que ce dépôt refuse pour
       les images. On dit ce qu'on sait, et on renvoie à qui sait le reste. */
    resume: "",
    /* ⚠️ Le kilométrage est celui que NOUS avons mesuré sur le tracé, pas
       celui de leur fiche : les deux diffèrent de 1,2 % en médiane et de 17 %
       au pire. C'est déjà la règle de la liste. */
    distanceKm: i.km,
    /* ⚠️ LEUR DURÉE QUAND ILS LA DÉCLARENT, sinon la convention de 3,5 km/h.
       ⛔ Une durée déclarée par l'Office est leur PAROLE ; une durée calculée
          est une estimation. On préfère la première, et on ne mélange pas les
          deux sans le dire. */
    dureeEstimeeH: heures(i.duree) ?? i.km / 3.5,
    boucle: i.boucle,
    /* 🔴 CES DEUX CHAMPS PORTENT UN NOM D'OPENSTREETMAP ET UNE SOURCE
       D'OFFICE, ET C'EST ASSUMÉ — mais ce n'est pas suffisant. `Walk` a été
       écrit quand toutes les promenades venaient d'OSM ; renommer ses champs
       toucherait quatre écrans. ⛔ CE QUI COMPTE EST CE QUE L'ÉCRAN DIT : la
       fiche branche son crédit sur `provenance`, et n'écrit « contributeurs
       d'OpenStreetMap » que pour ce qui en vient. Un champ mal nommé se
       relit ; un crédit faux se publie. */
    osmUrl: i.source,
    osmRef: `ot:${i.ot}:${i.slug}`,
    points,
    etapes,
  };
}
