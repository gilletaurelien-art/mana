import { describe, it, expect } from "vitest";
// @ts-expect-error — script node pur, sans types
import { regarder } from "../scripts/verifier-ponts.mjs";

/* ════════════════════════════════════════════════════════════════════════
   🔴 CE QUE LE GARDE DES PONTS PEUT DIRE, ET CE QU'IL NE PEUT PAS
   ════════════════════════════════════════════════════════════════════════
   Le 7/11 au soir, ce garde a imprimé « ✓ les 6 ponts sont déclarés tels
   qu'ils sont » sur six mesures qu'il n'avait pas pu faire. mana.love rend la
   MÊME ENVELOPPE à tout — mesuré : sa racine et un chemin impossible ont le
   même MD5 — donc l'empreinte ne distingue rien, et le garde « réussissait »
   en concordant avec une déclaration périmée.
   ⭐ Un contrôle qui réussit sur le mauvais objet endort plus sûrement qu'un
      contrôle absent : il porte une coche, et une coche ne se rouvre pas.
*/
const p = (empreinte: string, temoin: string | null = null) => ({ empreinte, temoin });

describe("le garde des ponts sait quand il ne sait pas", () => {
  it("⛔ un hôte qui rend la même enveloppe à tout rend NON MESURABLE", () => {
    const etalon = p("aaa"), accueil = p("aaa");
    expect(regarder(etalon, accueil, p("aaa"))).toBeNull();
  });

  /* 🔴 L'AVEUGLEMENT N'EST PAS SYMÉTRIQUE — trouvé en lisant mon propre
     relevé, après que `@manalove_pages` a rendu certaines pages réelles.
     `/radio` rendait 24 277 o contre 45 595 à l'étalon : une page bien
     vivante, et le garde l'annonçait « NON MESURABLE » parce qu'il avait
     déclaré l'hôte illisible en bloc.
     ⭐ Rendre AUTRE CHOSE qu'un chemin qui n'existe pas ne peut vouloir dire
        qu'une chose. C'est l'ÉGALITÉ qui est ambiguë. Un garde doit être
        prudent là où il ne sait pas, et nulle part ailleurs : six « non
        mesurable » qui en cachent un vrai, c'est un relevé qu'on cesse de
        lire. */
  it("⭐ une DIFFÉRENCE tranche, même sur un hôte par ailleurs illisible", () => {
    const etalon = p("aaa"), accueil = p("aaa");
    expect(regarder(etalon, accueil, p("ccc"))).toBe(true);
    /* ⛔ Et l'égalité reste ambiguë sur ce même hôte : elle peut être une
       page morte comme une page que seul le JavaScript dessine. */
    expect(regarder(etalon, accueil, p("aaa"))).toBeNull();
  });

  it("un hôte qui distingue ses adresses se lit à l'empreinte", () => {
    const etalon = p("rien"), accueil = p("accueil");
    expect(regarder(etalon, accueil, p("ecran"))).toBe(true);
    expect(regarder(etalon, accueil, p("rien"))).toBe(false);
  });

  /* 🔴 LE DÉFAUT DE MA PROPRE CONCEPTION, révélé par la session voisine : ses
     cinq chemins tombent tous sur la MÊME coquille, donc un `<meta>` posé là
     ne peut pas varier. Ma première version lisait « témoin présent →
     tranche » : un témoin constant aurait fait répondre « en ligne » à TOUT.
     ⭐ J'aurais remplacé un garde qui ne voit rien par un garde qui voit
        faux — et celui-là aurait porté des ✓. Un signal se valide sur un cas
        NÉGATIF connu, jamais sur sa seule présence. */
  it("⛔ un témoin CONSTANT est ignoré, il ne distingue rien", () => {
    const etalon = p("aaa", "love"), accueil = p("aaa", "love");
    expect(regarder(etalon, accueil, p("aaa", "love"))).toBeNull();
  });

  it("⭐ un témoin qui varie tranche, même si l'enveloppe est identique", () => {
    const etalon = p("aaa", ""), accueil = p("aaa", "accueil");
    expect(regarder(etalon, accueil, p("aaa", "chat"))).toBe(true);
    expect(regarder(etalon, accueil, p("aaa", ""))).toBe(false);
  });

  /* ⚠️ Le témoin PRIME sur l'empreinte quand il discrimine : c'est le seul
     signal qui survit à une coquille unique. */
  it("le témoin l'emporte sur l'empreinte", () => {
    const etalon = p("aaa", ""), accueil = p("bbb", "accueil");
    expect(regarder(etalon, accueil, p("aaa", "chat"))).toBe(true);
  });
});
