/**
 * CONTRIBUER À LA CARTE — ajouter un lieu, corriger un lieu, envoyer une photo.
 *
 * 🔴 ARBITRAGE D'AURÉLIEN, 15/11/2026 : la deuxième colonne de la barre de
 *    MANAhome cesse d'être « Où dormir autour de moi » (devenu un calque de
 *    la carte) et devient une porte de CONTRIBUTION — « ajouter / corriger un
 *    lieu sur la carte + ajouter une photo d'un lieu ».
 *
 * ⛔ CE QUE CET ÉCRAN NE FAIT PAS, ET IL LE DIT. Il n'écrit RIEN dans une
 *    base : cette application n'a pas de serveur — c'est le choix de fond du
 *    produit, celui qui la fait marcher hors ligne et sans compte. Un
 *    formulaire qui prétendrait enregistrer une contribution serait une
 *    promesse que rien ici ne tient, et c'est exactement ce que ce dépôt
 *    traque depuis deux jours (`?q=` écrit et jamais lu, « /promenades lit
 *    déjà ?q= » affirmé pendant huit jours).
 * ⭐ IL FAIT CE QUE LE DÉPÔT SAIT DÉJÀ FAIRE, et le dit en toutes lettres :
 *    il prépare un COURRIEL. `ContactForm.tsx` tient la même mécanique depuis
 *    le début — `mailto:` et rien d'autre. Une contribution part donc dans la
 *    boîte d'une personne, qui la lit et la porte sur la carte.
 * ⚠️ ET LA PHOTO PART PAR PIÈCE JOINTE, DE LA MAIN DE QUI L'ENVOIE. Un
 *    `mailto:` ne peut pas joindre un fichier : le navigateur ne le permet
 *    pas, et aucun contournement ne le rendrait vrai. On ne met donc PAS de
 *    sélecteur de fichier — un champ « photo » qui n'emporte rien serait le
 *    pire des deux mondes. On demande la pièce jointe, dans le corps du
 *    message, là où la personne est déjà.
 * ⏳ Le jour où une file de contributions existera (une fonction edge, une
 *    table, une modération), cet écran changera de destination et gardera sa
 *    forme. La porte d'abord, la plomberie ensuite — l'inverse donnerait une
 *    plomberie que personne n'emprunte.
 */
import { useEffect, useState } from "react";
import { courriel, signature } from "./visage";

/** Ce qu'on vient faire. ⭐ Le choix pilote les mots, pas une branche de code :
 *  une contribution est un message, et son objet dit ce qu'on en attend. */
const GESTES = [
  { clef: "manque", titre: "Un lieu manque",
    aide: "Une plage, une fontaine, un menhir que la carte ne connaît pas." },
  { clef: "faux", titre: "Un lieu est faux",
    aide: "Mauvais nom, mauvaise place, ou il n'existe plus." },
  { clef: "photo", titre: "J'ai une photo",
    aide: "Une image d'un lieu déjà sur la carte." },
] as const;

type Geste = (typeof GESTES)[number]["clef"];

export function Contribuer() {
  const [geste, setGeste] = useState<Geste>("manque");
  const [quoi, setQuoi] = useState("");
  const [ou, setOu] = useState("");
  const [moi, setMoi] = useState<[number, number] | null>(null);
  const [motGps, setMotGps] = useState("");

  /* ⭐ LA POSITION EST PROPOSÉE, JAMAIS PRISE. On ne demande rien au montage :
     ouvrir une page ne doit pas déclencher une demande de géolocalisation —
     c'est le genre de question qu'on refuse par réflexe quand elle arrive
     sans qu'on l'ait cherchée, et on la refuse alors POUR TOUJOURS. */
  const situer = () => {
    if (!navigator.geolocation) { setMotGps("Ce navigateur ne sait pas se situer."); return; }
    setMotGps("Recherche de votre position…");
    navigator.geolocation.getCurrentPosition(
      (g) => {
        setMoi([g.coords.longitude, g.coords.latitude]);
        setMotGps("");
      },
      /* ⛔ TROIS CAUSES, TROIS PHRASES. « Position indisponible » couvre le
         refus, la panne et le délai — et qui a refusé ne comprend pas qu'il
         doit rouvrir un réglage du navigateur. */
      (e) => setMotGps(
        e.code === e.PERMISSION_DENIED
          ? "Vous avez refusé la position. Elle se réautorise dans les réglages du navigateur — ou décrivez l'endroit en mots."
          : e.code === e.TIMEOUT
            ? "La position met trop de temps à venir. Décrivez l'endroit en mots, c'est aussi bien."
            : "Votre position n'a pas pu être lue. Décrivez l'endroit en mots.",
      ),
      { timeout: 10_000 },
    );
  };

  /* La position de l'adresse, s'il y en a une : contribuer DEPUIS un lieu
     qu'on regarde doit emporter ce lieu — même contrat que le compositeur. */
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const lon = Number(p.get("lon")), lat = Number(p.get("lat"));
    if (Number.isFinite(lon) && Number.isFinite(lat) && (lon !== 0 || lat !== 0)) {
      setMoi([lon, lat]);
    }
    const nom = p.get("nom");
    if (nom) setOu(nom);
  }, []);

  const choisi = GESTES.find((g) => g.clef === geste)!;
  const prete = quoi.trim().length >= 3;

  /** ⚠️ Tout est encodé : un nom de lieu porte des espaces, des apostrophes
   *  et des accents, et un `mailto:` mal encodé perd son corps en silence. */
  const lien = () => {
    const sujet = `[Carte] ${choisi.titre}`;
    const corps = [
      choisi.titre,
      "",
      quoi.trim(),
      "",
      ou.trim() ? `Endroit : ${ou.trim()}` : "",
      moi ? `Position : ${moi[1].toFixed(5)}, ${moi[0].toFixed(5)}` : "",
      "",
      geste === "photo"
        ? "— J'ai joint la photo à ce message."
        : "— Joignez une photo à ce message si vous en avez une.",
    ].filter((l) => l !== "").join("\n");
    return `mailto:${courriel()}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;
  };

  return (
    <main className="page page-contribuer">
      <div className="wrap">
        <p className="hero-label">Contribuer</p>
        <h1 className="page-titre"><span>La carte vous écoute</span></h1>

        <section className="page-panel">
          {/* ⛔ DIT AVANT LE FORMULAIRE, PAS APRÈS L'ENVOI. Ce qui se passe
              ensuite fait partie de ce qu'on demande : quelqu'un qui croit
              écrire dans une base et découvre un client de messagerie se sent
              détourné, même si le résultat est le même. */}
          <p className="page-intro">
            Ce que vous écrivez ici part par <strong>courriel</strong>, à une
            personne qui le lit et le porte sur la carte. Rien n'est publié
            automatiquement, et rien n'est enregistré sur ce site.
          </p>

          <div className="contrib-gestes" role="group" aria-label="Que voulez-vous signaler ?">
            {GESTES.map((g) => (
              <button
                key={g.clef} type="button"
                className={g.clef === geste ? "ot-filtre ot-filtre-actif" : "ot-filtre"}
                aria-pressed={g.clef === geste}
                onClick={() => setGeste(g.clef)}
              >
                {g.titre}
              </button>
            ))}
          </div>
          <p className="contrib-aide">{choisi.aide}</p>

          <label className="contrib-champ">
            <span className="contrib-label">
              {geste === "faux" ? "Qu'est-ce qui est faux ?"
                : geste === "photo" ? "De quel lieu est la photo ?"
                : "Qu'est-ce qui manque ?"}
            </span>
            <textarea
              rows={4} value={quoi} onChange={(e) => setQuoi(e.target.value)}
              placeholder={geste === "faux"
                ? "Le menhir de… est annoncé au bord de la route, il est dans le champ d'à côté."
                : geste === "photo" ? "La pointe de Dinan, depuis le sentier côtier."
                : "Une fontaine, au bout du chemin après le lavoir."}
            />
          </label>

          <label className="contrib-champ">
            <span className="contrib-label">Où, en mots <em>(facultatif)</em></span>
            <input
              type="text" value={ou} onChange={(e) => setOu(e.target.value)}
              placeholder="Commune, lieu-dit, « à 300 m du parking »…"
            />
          </label>

          {/* ⭐ LA POSITION EST UN BOUTON, PAS UN AUTOMATISME — voir `situer`. */}
          <div className="contrib-position">
            <button type="button" className="m-action-fine" onClick={situer}>
              {moi ? "Mettre à jour ma position" : "Ajouter ma position"}
            </button>
            {moi && (
              <p className="contrib-note">
                Position jointe : {moi[1].toFixed(5)}, {moi[0].toFixed(5)}
              </p>
            )}
            {motGps && <p className="contrib-note">{motGps}</p>}
          </div>

          {/* ⛔ PAS DE SÉLECTEUR DE FICHIER. Un `mailto:` ne peut rien joindre ;
              un champ qui accepterait une image et ne l'emporterait pas serait
              un mensonge de plus, et celui-là se découvrirait trop tard. */}
          <p className="contrib-note">
            {geste === "photo"
              ? "Joignez votre photo au message qui va s'ouvrir — c'est votre messagerie qui l'emporte."
              : "Vous pourrez joindre une photo au message qui va s'ouvrir."}
          </p>

          {/* ⚠️ Un lien, pas un bouton qui navigue : qui veut l'ouvrir dans un
              autre client peut le faire, et il reste visible désactivé tant
              que le message est vide. */}
          {prete ? (
            <a className="btn btn-primary" href={lien()}>Envoyer à {courriel()}</a>
          ) : (
            <p className="contrib-note">
              Écrivez quelques mots ci-dessus, et le message se préparera.
            </p>
          )}

          <p className="contrib-note">
            Les données de la carte viennent d'OpenStreetMap (ODbL). Une
            correction utile là-bas sert tout le monde, bien au-delà
            de {signature()} — on vous dira comment, si vous le souhaitez.
          </p>
        </section>
      </div>
    </main>
  );
}
