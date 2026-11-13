import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { hebergementDe } from "./MentionsLegales";

/* ⚠️ Commentaires retirés avant toute lecture de règle : le bloc qui explique
   la réparation NOMME « GitHub Pages », « SIRET » et « l'écosystème MANA »
   pour dire pourquoi on ne les écrit plus. Un garde posé sur le texte brut
   s'accuserait lui-même. */
const page = readFileSync(new URL("./MentionsLegales.tsx", import.meta.url), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

describe("l'hébergeur est dérivé de l'hôte, jamais recopié", () => {
  /* 🔴 POURQUOI — 13/11/2026. La page annonçait « hébergé sur GitHub Pages
     (GitHub, Inc.) ». Vrai de la copie publiée sur Pages, FAUX sur mana.bzh,
     servi depuis la France. L'app vit à deux adresses, chez deux hébergeurs de
     deux pays : une phrase figée est donc fausse à l'une des deux, toujours.
     ⭐ Et c'était mot pour mot le texte que manahome portait, réparé là-bas le
        11/11 : un défaut corrigé sur un site ne se corrige pas sur l'autre, et
        rien ne le signale — les deux pages répondent 200. */

  it("nomme OVH en France sur mana.bzh", () => {
    for (const hote of ["mana.bzh", "MANA.BZH", "www.mana.bzh", "mana.bzh:443"]) {
      const h = hebergementDe(hote);
      expect(h.genre, `${hote} n'est pas reconnu`).toBe("connu");
      if (h.genre !== "connu") return;
      expect(h.nom).toBe("OVH SAS");
      expect(h.pays).toBe("France");
    }
  });

  it("nomme GitHub aux États-Unis sur Pages", () => {
    const h = hebergementDe("gilletaurelien-art.github.io");
    expect(h.genre).toBe("connu");
    if (h.genre !== "connu") return;
    expect(h.nom).toBe("GitHub, Inc.");
    expect(h.pays).toBe("États-Unis");
  });

  it("ne nomme personne en développement local", () => {
    for (const hote of ["localhost", "localhost:5173", "127.0.0.1", "[::1]", "mana.local"]) {
      expect(hebergementDe(hote).genre, hote).toBe("local");
    }
  });

  it("REFUSE DE DEVINER sur un hôte inconnu", () => {
    /* ⛔ C'est le cas qui compte le plus et celui qu'on oublie d'écrire : une
       mention vraisemblable expose plus qu'une mention absente. Un miroir, un
       aperçu, un domaine racheté — la page doit dire qu'elle ne sait pas. */
    const h = hebergementDe("mana-preview.vercel.app");
    expect(h.genre).toBe("inconnu");
    if (h.genre !== "inconnu") return;
    expect(h.hote).toBe("mana-preview.vercel.app");
    /* Et le rendu du cas inconnu existe vraiment : une branche morte serait
       une absence de mention, pas un refus de deviner. */
    expect(page).toContain('heberge.genre === "inconnu"');
    expect(page).toMatch(/que nous ne reconnaissons pas/);
  });

  it("ne fige aucun hébergeur dans le texte de la page", () => {
    /* ⚠️ Le garde cherche la RECOPIE : un hébergeur écrit en dur dans le JSX
       rendrait la dérivation décorative. Les noms n'ont le droit de vivre que
       dans `hebergementDe`. */
    const jsx = page.slice(page.indexOf("export function MentionsLegales"));
    for (const interdit of ["GitHub", "OVH", "Roubaix", "San Francisco"]) {
      expect(jsx, `« ${interdit} » est figé dans le rendu`).not.toContain(interdit);
    }
  });
});

describe("l'éditeur de mana.bzh est l'association", () => {
  /* ⭐ 13/11/2026 : manahome.org est passé à l'entreprise individuelle (vitrine
     commerciale) ; mana.bzh reste à l'association (bien commun). Les deux jeux
     de mentions sont EXACTEMENT inverses, et écrire l'un sur le site de l'autre
     est une fausse déclaration. En test parce qu'il y a huit sites dans
     l'écosystème et un seul rédacteur. */
  /* ⛔ LA LECTURE EST BORNÉE À L'OBJET `EDITEUR`, et il a fallu un échec pour
     l'écrire : un premier jet cherchait `nom:` dans TOUTE la page et attrapait
     le `nom: "OVH SAS"` de `hebergementDe`. Le bon champ dans le mauvais objet
     — troisième variante du même défaut dans la même journée. */
  const bloc = (() => {
    const i = page.indexOf("const EDITEUR = {");
    if (i < 0) throw new Error("objet EDITEUR introuvable");
    return page.slice(i, page.indexOf("};", i));
  })();
  const champ = (nom: string): string => {
    const m = bloc.match(new RegExp(`\\b${nom}:\\s*\\n?\\s*"([^"]*)"`));
    if (!m) throw new Error(`champ ${nom} absent de l'objet EDITEUR`);
    return m[1];
  };

  it("porte le RNA, et aucune immatriculation d'entreprise", () => {
    expect(champ("rna")).toBe("W292008256");
    for (const interdit of ["SIRET", "SIREN", "code APE", "293 B", "TEMPOsystem"]) {
      expect(page, `« ${interdit} » n'a rien à faire sur le site de l'association`)
        .not.toContain(interdit);
    }
  });

  it("nomme une PERSONNE comme directeur de la publication", () => {
    /* 🔴 L'article 6 III 1° de la LCEN veut le directeur de la publication —
       pour une personne morale, son représentant légal, donc une personne
       physique nommée. Un nom commercial ne désigne personne au sens du texte.
       ⚠️ `src/lib/editeur.ts` du dépôt manafrance-app porte encore
          `DIRECTEUR_PUBLICATION = 'TEMPOsystem'` : le même défaut, sur les
          sites de l'association servis par cet autre dépôt. Signalé. */
    expect(champ("directeur")).toBe("Aurélien GILLET");
    expect(page).toContain("Directeur de la publication");
  });

  it("nomme l'éditeur, au lieu de l'annoncer pour plus tard", () => {
    expect(champ("nom")).toBe("Alliance MANA");
    for (const fuite of ["structure juridique définitive", "écosystème MANA, dans le cadre"]) {
      expect(page, `la formule d'attente « ${fuite} » est revenue`).not.toContain(fuite);
    }
  });
});
