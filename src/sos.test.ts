import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { messageSos, lienSos, NUMERO_SOS } from "./Sos";

const lire = (f: string) => readFileSync(new URL(`./${f}`, import.meta.url), "utf8");
const sansCommentaires = (f: string) =>
  lire(f).replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "")
         .replace(/^\s*\/\/.*$/gm, "");

/**
 * ⛔ CE FICHIER TIENT LA SEULE FONCTION DE CETTE APPLICATION DONT L'ÉCHEC SE
 *    MESURE AUTREMENT QU'EN CONFORT.
 *
 * Le bouton de secours est, à dessein, de la taille d'un pouce mouillé et
 * placé là où on l'atteint sans regarder. Ce qui le rend atteignable en
 * urgence le rend atteignable par erreur — un sac, une manche, un gant.
 * Depuis le 12/11/2026 (demande du fondateur) il passe par une confirmation.
 */
describe("le SOS", () => {
  it("⛔ le numéro et le message ne vivent qu'à UN endroit", () => {
    /* 🔴 ILS VIVAIENT EN DEUX EXEMPLAIRES jusqu'au 12/11/2026 : `EnChemin` et
       `Promenade` construisaient chacun leur `sms:` et leur phrase, à cinq
       mots près. ⭐ Ce dépôt connaît le prix de ce doublon — le caviardage
       des adresses vit en cinq exemplaires, et il a fallu un test qui LIT les
       cinq fichiers pour qu'ils cessent de diverger. Celui-ci coûte moins
       cher : il refuse le deuxième exemplaire. */
    const dossier = new URL("./", import.meta.url);
    const porteurs: string[] = [];
    for (const f of readdirSync(dossier)) {
      if (!/\.tsx?$/.test(f) || /\.test\./.test(f)) continue;
      if (sansCommentaires(f).includes("sms:")) porteurs.push(f);
    }
    expect(porteurs, "le lien d'urgence est écrit ailleurs que dans Sos.tsx").toEqual(["Sos.tsx"]);
  });

  it("⛔ aucun écran n'ouvre le SMS sans passer par la confirmation", () => {
    /* ⭐ UN CONTRÔLE DE MÉCANISME, PAS DE TEXTE. On n'exige pas un libellé —
       on exige que les deux écrans de marche appellent le composant qui
       porte la pop-up, et qu'aucun ne pose un lien direct. */
    for (const f of ["EnChemin.tsx", "Promenade.tsx"]) {
      const src = sansCommentaires(f);
      expect(src, `${f} n'utilise pas le bouton commun`).toContain("<BoutonSos");
      expect(src, `${f} pose encore un lien d'urgence direct`).not.toMatch(/href=\{sosHref\}/);
    }
  });

  it("⛔ la confirmation ne promet JAMAIS un envoi", () => {
    /* 🔴 LE LIEN `sms:` PRÉPARE UN MESSAGE, IL NE L'ENVOIE PAS. C'est la
       personne qui appuie sur envoyer, dans son application. Une pop-up qui
       dirait « envoyer au 112 » ferait croire les secours prévenus alors
       qu'un brouillon attend — et on partirait rassuré.
       ⚠️ « c'est vous qui appuyez sur envoyer » est la formulation qui dit
          l'inverse : elle contient le mot sans faire la promesse. On
          n'interdit donc pas le MOT, on interdit la promesse. */
    /* ⚠️ ON APLATIT LES BLANCS AVANT DE LIRE. La phrase vit dans du JSX :
       « Rien ne part tout\n seul » est coupée par un retour à la ligne et un
       `<strong>`. Un motif posé sur la source brute aurait échoué sur une
       phrase PRÉSENTE — un rouge pour une raison inventée est aussi faux
       qu'un vert pour rien. Première version de ce test : exactement ça. */
    const sos = sansCommentaires("Sos.tsx").replace(/<\/?strong>/g, "").replace(/\s+/g, " ");
    expect(sos, "la pop-up promet d'envoyer le message")
      .not.toMatch(/(Envoyer|envoie|sera envoyé|nous envoyons) (le |un |ce )?(SMS|message|secours)/i);
    expect(sos, "la pop-up ne dit pas que rien ne part tout seul")
      .toMatch(/[Rr]ien ne part tout seul/);
  });

  it("⚠️ les deux gestes existent, et le focus entre sur l'ANNULATION", () => {
    /* ⭐ Une pop-up qui ouvre le focus sur son action irréversible transforme
       un « Entrée » réflexe en déclenchement. Le fondateur a demandé
       « l'annulation à côté de la confirmation » : à côté veut dire
       atteignable, et atteignable d'abord. */
    const sos = sansCommentaires("Sos.tsx");
    expect(sos).toContain("sos-annuler");
    expect(sos).toContain("sos-confirmer");
    expect(sos, "le focus n'entre pas sur Annuler").toMatch(/annuler\.current\?\.focus\(\)/);
    /* ⛔ Et on peut sortir autrement : Échap, et un clic à côté. Trois sorties
       pour une action risquée, aucune qui la déclenche. */
    expect(sos, "Échap ne ferme pas").toMatch(/"Escape"/);
    expect(sos, "le voile ne ferme pas").toMatch(/className="sos-voile" onClick=/);
  });

  it("le message porte la position quand il y en a une — et le DIT quand il n'y en a pas", () => {
    const avec = messageSos({ lat: 48.31523, lon: -4.55482 }, "Les forts du goulet");
    expect(avec).toContain("48.31523");
    expect(avec).toContain("-4.55482");
    expect(avec).toContain("Les forts du goulet");

    /* 🔴 LE CAS SANS POSITION EST CELUI QUI COMPTE. Partir en croyant avoir
       transmis ses coordonnées alors que le message n'en porte aucune est
       exactement le silence que ce produit refuse sur les marées et la
       météo. Le message doit le dire LUI-MÊME : il voyage sans sa page. */
    const sans = messageSos(null, "Les forts du goulet");
    expect(sans, "le message muet sur l'absence de position")
      .toMatch(/pas de position GPS/);
    expect(sans).not.toMatch(/\d+\.\d{4}/);
  });

  it("le lien est un SMS vers le numéro déclaré, et son corps est le message montré", () => {
    /* ⭐ LA POP-UP MONTRE LE TEXTE EXACT, elle ne le paraphrase pas : une
       confirmation qui décrit autre chose que ce qu'elle déclenche est pire
       qu'une absence de confirmation. Ce test relie les deux. */
    const position = { lat: 48.2, lon: -4.5 };
    const lien = lienSos(position, "Ma promenade");
    expect(lien.startsWith(`sms:${NUMERO_SOS}?&body=`), lien).toBe(true);
    const corps = decodeURIComponent(lien.slice(`sms:${NUMERO_SOS}?&body=`.length));
    expect(corps).toBe(messageSos(position, "Ma promenade"));
  });

  it("⏳ le numéro est en attente d'arbitrage, et ce test ne le tranche pas", () => {
    /* 🔴 SOULEVÉ LE 12/11/2026, NON TRANCHÉ. Le lien écrit un SMS au 112 ;
       en France, le numéro qui REÇOIT les SMS d'urgence est le 114, le 112
       étant le numéro vocal européen. ⚠️ Ce n'est pas une mesure — personne
       ici n'a vérifié le comportement réel des opérateurs.
       ⭐ CE TEST NE DIT PAS QUEL NUMÉRO EST JUSTE. Il dit qu'il n'y en a
          qu'UN, nommé, et que la pop-up affiche CELUI-LÀ : le jour où
          l'arbitrage tombe, un seul endroit change et l'écran suit. Un test
          qui figerait « 112 » interdirait la correction ; celui-ci la rend
          sûre. */
    expect(NUMERO_SOS).toMatch(/^\d{3}$/);
    expect(sansCommentaires("Sos.tsx"), "la pop-up affiche un numéro écrit en dur")
      .toMatch(/\{NUMERO_SOS\}/);
  });
});
