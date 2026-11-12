/**
 * ÉCRAN 1 — L'INVITATION. Disposition reprise de la maquette du 31/10.
 *
 * L'ordre de lecture, de haut en bas, et il n'est pas interchangeable :
 *    MANA                                  ← qui parle
 *    AU CŒUR DE LA BRETAGNE                 ← de quoi il s'agit (12/11/2026)
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
import { RechercheAccueil } from "./RechercheAccueil";

export function Invitation({ base }: { base: string }) {
  /* 🔴 « AUTOUR DE MOI » EST PARTI LE 1/11/2026, sur demande du fondateur, et
     sa géolocalisation avec lui. Elle demandait la position puis ouvrait le
     compositeur avec le point dans l'URL.
     ⚠️ VÉRIFIÉ AVANT DE LA RETIRER, PAS APRÈS : `/composer` demande la
        position LUI-MÊME (deux appels à `navigator.geolocation` dans
        `Composer.tsx`), et il reste atteignable depuis `/promenades`, qui est
        liée depuis les sections de l'accueil et le pied — et depuis le
        3/11/2026, ce sont la MÊME adresse : `/promenades` rend désormais le
        compositeur en tête de page. Ce qui disparaît est un raccourci d'un
        clic, pas une fonction ni son seul chemin.
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
          {/* 🔄 « Terre, mer & lumière » → « Au cœur de la Bretagne », puis le
              grand titre SUPPRIMÉ — demandes du fondateur, 12/11/2026. La
              devise disait une ATMOSPHÈRE, celle-ci dit un LIEU ; et la phrase
              ne se dit plus qu'UNE fois.
              🔴 ELLE PORTE DONC LE RÔLE DE TITRE, et ce n'était pas un détail :
              la section est désignée par `aria-labelledby="inv-titre"` et
              c'était le SEUL `h1` de l'accueil. Retirer le bloc sans déplacer
              l'ancre aurait laissé un `aria-labelledby` pointant dans le vide
              et une page d'accueil sans titre — deux défauts qu'aucun écran
              ne montre. ⚠️ La classe reste `inv-devise` : l'élément change de
              RÔLE, pas d'apparence. */}
          <h1 id="inv-titre" className="inv-devise">Au cœur de la Bretagne</h1>
        </header>

        <div className="inv-dire">
          {/* 🔄 LE GRAND TITRE EST PARTI LE 12/11/2026, demande du fondateur.
              Il disait « Au cœur / de la Bretagne » — mot pour mot ce que la
              devise dit maintenant, trois lignes plus haut. Deux fois la même
              phrase, l'une sous l'autre.
              ⚠️ Le texte d'origine avait été arrêté le 1/11 sur maquette, et
              ses deux retours à la ligne étaient VOULUS : ils tenaient la
              coupe sur un téléphone là où `text-wrap: balance` la laisse
              flotter. Si la phrase revient en grand un jour, c'est à savoir.
              ⛔ `.inv-titre` reste dans `systeme.css` : une règle sans
              porteur ne casse rien, et la retirer en même temps que le texte
              ferait deux gestes dans un seul. */}
          {/* 🔄 ET LE SOUS-TITRE AUSSI — « Explorez, découvrez, respirez…
              avec MANA. », supprimé le 12/11/2026 à la demande du fondateur,
              après le grand titre.
              ⚠️ `.inv-dire` ne porte donc plus AUCUN texte : le bloc reste
              pour sa place dans la grille, et c'est écrit ici parce qu'un
              conteneur vide se fait supprimer par quelqu'un qui le croit
              oublié. Si l'accueil reste sans texte au-delà de la devise, le
              retirer est un geste à FAIRE, pas à subir. */}
        </div>

        {/* 🔴 LA FICHE DE BALADE A CÉDÉ LA PLACE AU MOTEUR DE RECHERCHE —
            6/11/2026, demande du fondateur. Elle PROPOSAIT un circuit ; le
            champ fait ENTRER par le nom du lieu qu'on a en tête.
            ⭐ Et c'est la note du 1/11, vingt lignes plus haut, qui se
               referme : « le site a perdu son entrée par le nom de lieu […]
               c'est écrit ici pour qu'on ne l'oublie pas en trouvant
               l'accueil plus beau ». Elle a attendu cinq jours.
            ⚠️ CE QUE LA FICHE EMPORTAIT AVEC ELLE, ET QU'IL A FALLU REPOSER :
               elle portait le SEUL lien sortant vers l'Office de tourisme
               depuis l'accueil. Il n'est pas venu ici — créditer sous un
               champ de recherche, qui n'affiche aucune de leurs données,
               diluerait la mention au lieu de l'honorer. Il est descendu
               dans la section « Carnet, export GPX et circuits balisés »,
               celle qui montre leurs 46 circuits et leurs 708 km. */}
        <RechercheAccueil base={base} />


      </div>
    </section>
  );
}
