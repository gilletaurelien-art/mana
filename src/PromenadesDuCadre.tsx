import { useEffect, useState } from "react";
import { chargerIndex, trajet, estContinu, type Fiche } from "./catalogue";
import { etendueDe } from "./etendue";
import { visage } from "./visage";
import { promenadesDuCadre, direLaListe } from "./promenades-du-cadre";
import { baseUrl } from "./router";

/**
 * LA LISTE DES PROMENADES DE CET HÔTE — rendue le 15/11/2026.
 *
 * ⭐ ELLE EXISTE POUR UN RENDEZ-VOUS. mana.bzh est présenté à Brest terres
 *    océanes le 23/11, puis aux EPCI du nord Finistère pour financer la
 *    promotion de leurs balades. À côté des 111 circuits d'Office, une liste
 *    « 69 promenades au départ de Brest terres océanes » dit que l'outil
 *    connaît leur territoire — et ne parle que de lui.
 *
 * ⛔ ELLE NE TOUCHE PAS À `Composer`. Ajouter une section dans un composant
 *    de 1 800 lignes pour y poser une liste, c'est mêler l'outil qu'on
 *    manipule et le catalogue qu'on feuillette. Elle se rend À CÔTÉ, et
 *    `App.tsx` les assemble — comme avant la fusion du 3/11.
 *
 * ⚠️ CE QU'ELLE PROMET EST CE QU'ELLE FILTRE. Le titre dit « au départ de »,
 *    parce que l'index ne porte que le point de départ : un itinéraire qui
 *    traverse le territoire sans y commencer n'y figure pas. Voir
 *    `promenades-du-cadre.ts` — une session a déjà payé, le 31/10, un titre
 *    qui promettait plus que son filtre.
 */
export function PromenadesDuCadre() {
  const [fiches, setFiches] = useState<Fiche[] | null>(null);
  const [echec, setEchec] = useState(false);
  const e = etendueDe(visage());
  const B = baseUrl();

  useEffect(() => {
    let vivant = true;
    chargerIndex()
      .then((tout) => { if (vivant) setFiches(promenadesDuCadre(tout, e)); })
      /* ⛔ UN ÉCHEC SE DIT. Une liste vide et un réseau coupé se ressemblent
         à l'écran, et l'un des deux est réparable en rechargeant. */
      .catch(() => { if (vivant) setEchec(true); });
    return () => { vivant = false; };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  if (echec) {
    return (
      <section className="page-panel">
        <p className="page-texte">
          La liste des promenades n’a pas pu être lue. Rechargez la page.
        </p>
      </section>
    );
  }
  /* On ne rend rien tant qu'on ne sait pas : un titre qui apparaît puis
     change de compte une seconde plus tard se lit comme une hésitation. */
  if (fiches === null) return null;
  if (fiches.length === 0) return null;

  return (
    <section className="page-panel prom-cadre">
      <h2 className="page-titre"><span>{direLaListe(fiches.length, e)}</span></h2>
      <ol className="prom-liste">
        {fiches.map((f) => (
          <li key={f.s}>
            <a className="prom-ligne" href={`${B}/promenade/${f.s}`}>
              <span className="prom-nom">{f.n}</span>
              <span className="prom-meta">
                {Math.round(f.k)} km · {trajet(f)}
                {/* ⚠️ Un parcours morcelé ne promet pas son arrivée — c'est la
                    règle de `SAUT_TOLERE_M`, et elle se voit ici aussi. */}
                {!estContinu(f) && " · tracé morcelé"}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
