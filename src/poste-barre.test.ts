import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { entreesBarre, liensPied } from "./barre";

const lire = (f: string) => readFileSync(new URL(`./${f}`, import.meta.url), "utf8");
const nu = (f: string) =>
  lire(f).replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "")
         .replace(/^\s*\/\/.*$/gm, "");

/**
 * 🔴 LE BOUTON MANARADIO DE LA BARRE EST UN COMMUTATEUR — 12/11/2026,
 *    demande du fondateur : « le bouton MANAradio dans la bottom bar devient
 *    un commutateur ON/OFF. Si ON l'icône change = liseré doré tournant ».
 *
 * ⛔ CE FICHIER GARDE DEUX CHOSES QUI SE RESSEMBLENT ET NE SONT PAS LA MÊME :
 *    que le bouton COMMANDE vraiment le poste (et pas un second élément
 *    audio à lui), et qu'il ne PRÉTENDE jamais jouer ce qui ne joue pas.
 */
describe("le commutateur du poste, dans la barre", () => {
  it("⛔ il ne commute que CHEZ NOUS — ailleurs la radio est un pont", () => {
    /* ⭐ Sur mana.love, `/radio` mène à l'autre application : le poste de ce
       dépôt n'y a rien à commander, et un commutateur qui ne commute rien
       serait pire qu'un lien. Même règle que « Réglages »/« Mon compte » —
       le même dessin ne fait pas le même métier selon l'hôte. */
    const radioBzh = entreesBarre("bzh").find((e) => e.clef === "radio");
    const radioLove = entreesBarre("love").find((e) => e.clef === "radio");
    expect(radioBzh?.commute, "le commutateur a quitté mana.bzh").toBe("radio");
    expect(radioLove?.commute, "mana.love commute un poste qui n'est pas le sien").toBeUndefined();
  });

  it("⚠️ l'entrée garde son CHEMIN — la page n'a pas disparu avec le geste", () => {
    /* 🔴 C'EST LA MOITIÉ QU'ON PERD EN REMPLAÇANT UN LIEN PAR UN BOUTON.
       Trois choses dépendent de ce `chemin` : les gardes de `barre.test.ts`
       (« tout ce que la barre revendique, cet hôte le sert »), le titre de
       `/radio` qui est une adresse INDEXÉE, et le pied de page qui continue
       d'y mener. On remplace le geste, pas l'existence de la page. */
    const radio = entreesBarre("bzh").find((e) => e.clef === "radio");
    expect(radio?.chemin).toBe("/radio");
    /* ⛔ ET LE PIED RESTE LE CHEMIN VERS LA PAGE. Sans lui, « ce qui passe à
       l'antenne » deviendrait inatteignable le jour où la barre ne fait plus
       que commuter. */
    expect(liensPied("bzh").map((l) => l.chemin), "le pied ne mène plus à la radio")
      .toContain("/radio");
  });

  it("⛔ la barre COMMANDE le poste commun, elle n'en fabrique pas un second", () => {
    /* ⚠️ Deux `<audio>` sur la même source, c'est deux connexions au flux,
       deux factures de données mobiles, et sur un DIRECT deux instants
       différents de la même antenne. `poste.ts` existe exactement pour ça :
       un seul élément, au niveau du document, que les façades commandent. */
    const app = nu("App.tsx");
    expect(app, "la barre n'appelle pas le poste commun").toMatch(/from "\.\/poste"/);
    expect(app).toMatch(/\blire\(\)/);
    expect(app).toMatch(/\bcouper\(\)/);
    expect(app, "la barre fabrique son propre élément audio")
      .not.toMatch(/new Audio\(|createElement\("audio"\)/);
    /* ⭐ ET ELLE S'ABONNE : le casque débranché, un appel entrant ou le
       contrôle du système mettent en pause sans passer par nous. Sans
       abonnement, l'anneau tournerait sur un poste muet. */
    expect(app, "la barre ne s'abonne pas à l'état du poste").toMatch(/ecouterPoste\(/);
  });

  it("⛔ il ne prétend jamais jouer ce qui ne joue pas", () => {
    /* 🔴 `radio.mana.bzh` peut ne pas répondre. Un liseré doré qui tournerait
       sur du silence serait une émission simulée — ce que ce produit refuse
       depuis l'origine, au même titre qu'une marée calculée ou une météo
       devinée. Quatre états, quatre noms, et l'erreur en a un. */
    const app = nu("App.tsx");
    expect(app, "l'état d'erreur du poste n'est pas lu").toMatch(/poste\.erreur/);
    for (const etat of ["est-", "sourd", "branche", "joue", "muet"]) {
      expect(app, `l'état « ${etat} » a disparu`).toContain(etat);
    }
    /* ⚠️ ET `aria-pressed` SUIT CE QUI JOUE, pas ce qu'on a demandé : il doit
       se lier à `poste.joue`, l'état RÉEL de l'élément audio, et non à un
       drapeau local qui resterait vrai sur un flux mort. */
    expect(app).toMatch(/aria-pressed=\{poste\.joue\}/);
  });

  it("⚠️ l'anneau survit à l'escamotage des libellés sous 900 px", () => {
    /* 🔴 LE PIÈGE EXACT, TROUVÉ EN ÉCRIVANT. La barre escamote ses `<span>`
       sous 900 px pour ne garder que les icônes — et la colonne de cette
       application fait 440 px, donc c'est TOUJOURS le cas. Sans exception
       nommée, le liseré doré (un `<span>`) était réduit à un pixel caché :
       le seul signe visible de l'état ON, supprimé partout, par une règle
       écrite pour du texte.
       ⭐ Un escamotage écrit pour du texte attrape tout ce qui lui ressemble. */
    const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
    expect(css, "l'anneau retombe dans l'escamotage des libellés")
      .toMatch(/\.nav button > span:not\(\.nav-poste-anneau\)/);
  });

  it("⚠️ la rotation s'arrête pour qui demande moins de mouvement — l'anneau RESTE", () => {
    /* ⭐ Respecter une préférence de mouvement ne veut pas dire supprimer ce
       qui bougeait, mais l'immobiliser : l'anneau EST le signe d'état, le
       retirer priverait d'information. */
    const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
    const bloc = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce) {\n  .nav-poste"));
    expect(bloc.slice(0, 160), "la rotation continue sous reduced-motion")
      .toMatch(/\.nav-poste \.nav-poste-anneau \{ animation: none; \}/);
    expect(bloc.slice(0, 160), "l'anneau est supprimé au lieu d'être immobilisé")
      .not.toMatch(/display: none|opacity: 0/);
  });
});
