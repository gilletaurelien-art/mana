/**
 * ÉCRAN 1 — L'INVITATION. Disposition reprise de la maquette du 31/10.
 *
 * L'ordre de lecture, de haut en bas, et il n'est pas interchangeable :
 *    MANA                                  ← qui parle
 *    TERRE, MER & LUMIÈRE — BRETAGNE       ← de quoi il s'agit
 *    Le monde commence ici.                ← la promesse
 *    Découvrez ce que vous croiserez…      ← ce qu'on y fait vraiment
 *    [ photographie ]                      ← la preuve
 *    Autour de moi                         ← le geste
 *    (la carte a quitté cet écran le 31/10 : elle est dans la barre
 *     du bas, donc permanente — un geste permanent n'a pas besoin
 *     d'être proposé une seconde fois ici.)
 *
 * 🔴 LE CHAMP « UNE COMMUNE, UN LIEU » A DISPARU, ET IL FAUT LE DIRE. Il
 *    occupait le milieu de cet écran ; la maquette ne le garde pas. Ce n'est
 *    pas une perte tant que la recherche existe ailleurs — et elle est
 *    dessinée en haut de l'écran 2, « Rechercher un lieu… ». ⚠️ Mais elle n'y
 *    est PAS ENCORE CÂBLÉE : tant qu'elle ne l'est pas, le site a perdu son
 *    entrée par le nom de lieu. C'est écrit ici pour qu'on ne l'oublie pas en
 *    trouvant l'accueil plus beau.
 *
 * ⭐ DEUX ENTRÉES, PAS TROIS. La maquette a raison contre la version
 *    précédente : « Autour de moi », « ou », un champ, et un lien vers la
 *    carte, cela faisait quatre décisions sur un écran qui en demande une.
 */
import { InvitationBalade } from "./InvitationBalade";

export function Invitation({ base }: { base: string }) {
  /* 🔴 « AUTOUR DE MOI » EST PARTI LE 1/11/2026, sur demande du fondateur, et
     sa géolocalisation avec lui. Elle demandait la position puis ouvrait le
     compositeur avec le point dans l'URL.
     ⚠️ VÉRIFIÉ AVANT DE LA RETIRER, PAS APRÈS : `/composer` demande la
        position LUI-MÊME (deux appels à `navigator.geolocation` dans
        `Composer.tsx`), et il reste atteignable depuis `/promenades`, qui est
        liée depuis les sections de l'accueil et le pied. Ce qui disparaît est
        un raccourci d'un clic, pas une fonction ni son seul chemin.
     ⭐ Retirer un bouton sans chercher ce qu'il était seul à ouvrir, c'est
        rendre un écran inatteignable sans que rien ne le dise — un écran
        orphelin ne se plaint jamais. */

  return (
    <section className="inv" aria-labelledby="inv-titre">
      {/* 🔴 L'ACCUEIL N'A PLUS DE FOND PROPRE — 31/10/2026. Il portait une
          photographie fixe ; le fond tournant la remplace sur toute
          l'application. Garder les deux aurait masqué la rotation exactement
          là où l'application se regarde le plus — une fonctionnalité invisible
          sur son premier écran n'existe pas.
          ⭐ Et c'est 42 Ko de moins au premier chargement : l'image d'accueil
             dédiée disparaît, le premier fond la remplace pour 33 Ko. */}

      {/* ── LE FILIGRANE TOPOGRAPHIQUE ───────────────────────────────────
          §7 : « des lignes topographiques en filigrane », « presque
          imperceptibles ». Quatre courbes, 0,10 d'opacité, en haut à droite —
          là où la maquette les place, et là où aucun texte ne passe. */}
      <svg className="inv-filigrane" viewBox="0 0 200 160" aria-hidden="true" preserveAspectRatio="xMaxYMin slice">
        <g fill="none" strokeWidth="1">
          <path d="M210 8C170 14 150 36 120 34S66 10 30 22" />
          <path d="M210 26C168 33 148 56 118 54S60 30 22 44" />
          <path d="M210 46C166 54 146 78 116 76S54 52 14 68" />
          <path d="M210 68C164 77 144 102 114 100S48 76 6 94" />
        </g>
      </svg>

      <div className="inv-contenu">
        <header className="inv-marque">
          <p className="inv-mot">MANA</p>
          <p className="inv-devise">Terre, mer &amp; lumière — Bretagne</p>
        </header>

        <div className="inv-dire">
          {/* ⚠️ TEXTE ARRÊTÉ LE 1/11/2026 PAR LE FONDATEUR, sur maquette.
              « Le monde commence ici » était une promesse de marque ; celle-ci
              dit où l'on est et ce qu'on y fait. ⭐ Les deux retours à la ligne
              sont VOULUS : ils tiennent la coupe du titre sur un téléphone,
              là où `text-wrap: balance` la laisse flotter d'un rendu à
              l'autre. */}
          <h1 id="inv-titre" className="inv-titre">
            Bienvenue<br />en Bretagne
          </h1>
          <p className="inv-sous">
            Explorez, découvrez, respirez…<br />avec MANA.
          </p>
        </div>

        <div className="inv-gestes">
          {/* ⭐ UN <a>, PLUS UN <button> — ET C'EST LA MÊME RÈGLE QU'AVANT,
              retournée. Le commentaire d'hier disait « un <button>, pas un
              <a> : il demande une permission, il ne mène pas à une adresse ».
              Il mène désormais à une adresse : c'est donc un lien, et le clic
              du milieu, « ouvrir dans un nouvel onglet » et la navigation au
              clavier redeviennent possibles.
              ⚠️ La règle ne change pas, c'est l'élément qui a changé de
                 nature. Garder le <button> « parce qu'il a l'air d'un bouton »
                 aurait cassé trois gestes que personne n'aurait signalés. */}
          <a className="inv-primaire" href={`${base}/carte`}>
            <svg className="m-icone inv-pin" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
              <circle cx="12" cy="10" r="2.6" />
            </svg>
            <span className="inv-primaire-mot">Voir les balades</span>
            <span className="inv-fleche" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M5 12h12" /><path d="m12 6 6 6-6 6" /></svg>
            </span>
          </a>
        </div>

        {/* ⭐ LA FICHE DU TERRITOIRE, SUR L'ACCUEIL. C'est la même feuille que
            l'écran suivant — mêmes chiffres, mêmes mentions, même dessin : le
            seul moyen que l'accueil ne promette pas autre chose que ce qu'on
            trouvera. ⚠️ Elle arrive après le premier rendu et ne porte rien :
            si `ot.json` n'arrive pas, l'accueil reste entier. */}
        <InvitationBalade base={base} />
      </div>
    </section>
  );
}
