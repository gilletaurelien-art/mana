import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { ROUTES_APP, ROUTES_LOVE, ROUTE_OFFICE, ROUTES_HORS_LOVE } from "./routes";

const lire = (f: string) => readFileSync(new URL(f, import.meta.url), "utf8");
const nu = (f: string) =>
  lire(f).replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * 🔴 UNE SEULE APP, DEUX HÔTES — décision d'Aurélien, 7/11/2026. mana.bzh est
 * « une version ultra light de mana.love », avec une fonction EN PLUS : les
 * balades de l'Office de tourisme.
 * ⭐ L'alternative — porter la carte dans un second dépôt — a été écartée pour
 *    une raison mesurée : ce dépôt a déjà payé deux codes faisant le même
 *    travail, et les plages du monde sont restées à 5 % pendant seize jours
 *    parce que rien ne les confrontait.
 */
describe("les deux visages — ce qui change, et ce qui ne doit pas", () => {
  /* 🔴 CES DEUX TESTS SONT RETOURNÉS, PAS SUPPRIMÉS — 7/11, l'après-midi.
     Le matin ils exigeaient « love = bzh moins l'Office », et un écart de
     EXACTEMENT UN. Le fondateur a tranché depuis : mana.love est tenu par
     l'application citoyenne, et la nôtre n'y entre que par la carte et les
     promenades. L'écart vaut cinq.
     ⭐ Ce qu'ils gardaient reste vrai sous une forme plus large : la liste
     est DÉRIVÉE, et l'écart est une DÉCISION, pas un effet de bord. */
  it("la liste love est DÉRIVÉE : elle vaut la liste bzh moins les exclusions", () => {
    const exclus = Object.keys(ROUTES_HORS_LOVE);
    expect(ROUTES_LOVE).toEqual(ROUTES_APP.filter((r) => !exclus.includes(r)));
    expect(ROUTES_LOVE).not.toContain(ROUTE_OFFICE);
    expect(ROUTES_APP).toContain(ROUTE_OFFICE);
    /* ⚠️ L'écart suit la liste des exclusions, et rien d'autre. S'il bouge
       sans qu'elle bouge, c'est un ajout de route qui a fui d'un visage. */
    expect(ROUTES_APP.length - ROUTES_LOVE.length).toBe(exclus.length);
  });

  /* ⛔ LA SOUSTRACTION EST LE POINT. Une seconde liste écrite à la main
     divergerait au premier ajout de route, EN SILENCE — exactement ce que
     `routes.ts` existe pour empêcher entre ses trois listes.
     🔴 ET CE TEST EXIGEAIT UN MOYEN, PAS UN EFFET : il cherchait la chaîne
        `ROUTES_LOVE = ROUTES_APP.filter`. Il est donc tombé le jour où la
        dérivation a changé de FORME — en passant par une fonction qui lève
        si une exclusion ne retire rien, c'est-à-dire en devenant MEILLEURE.
     ⭐ Un test qui nomme la ligne qu'il veut lire interdit la bonne solution.
        Celui-ci éprouve désormais la PROPRIÉTÉ : une route inconnue des
        exclusions appartient aux deux visages. */
  it("une route neuve entre dans les DEUX visages par construction", () => {
    const exclus = Object.keys(ROUTES_HORS_LOVE);
    const neuves = ROUTES_APP.filter((r) => !exclus.includes(r as string));
    expect(neuves.length, "plus rien n'est commun aux deux visages").toBeGreaterThan(0);
    for (const r of neuves) {
      expect(ROUTES_LOVE, `${r} n'est pas exclu et manque pourtant à love`).toContain(r);
    }
  });

  /* 🔴 `/chat` N'EST PAS À NOUS. Sur mana.love il tombe dans la coquille,
     servie par manafrance-app. L'inscrire ici ferait revendiquer à cette app
     une adresse qu'elle ne sait pas rendre — un 200 sur une page qu'on n'a
     pas, le pire des désaccords parce qu'il a l'air de marcher. */
  it("⛔ le chat n'entre pas dans les chemins de cette app", () => {
    expect(ROUTES_APP as readonly string[]).not.toContain("/chat");
    expect(ROUTES_LOVE).not.toContain("/chat");
  });

  /* ⭐ Le prédicat se nomme par la CAPACITÉ, pas par le site : le jour où un
     second office rejoint le produit, c'est la liste des territoires qui
     change, pas ce test. */
  it("l'Office se décide par un seul prédicat, nommé par ce qu'il décide", () => {
    const v = nu("./visage.ts");
    expect(v).toMatch(/export const avecOffice/);
    for (const f of ["./App.tsx", "./Territoire2030.tsx", "./LApplication.tsx"]) {
      expect(nu(f), `${f} décide de l'Office sans passer par le prédicat`)
        .toMatch(/avecOffice\(\)/);
    }
    /* ⛔ Et personne ne teste l'hôte à la main ailleurs : un `hostname ===`
       dispersé serait un second prédicat que rien ne confronte au premier. */
    for (const f of ["./App.tsx", "./Territoire2030.tsx", "./LApplication.tsx"]) {
      expect(nu(f), `${f} lit l'hôte directement`).not.toMatch(/hostname\s*===/);
    }
  });

  /* 🔴 CE GARDE EST NÉ D'UNE MUTATION QUI N'A PAS MORDU. J'ai remplacé la
     condition de la colonne 2 par `true` — la colonne de l'Office revenait
     donc sur mana.love — et les 37 tests sont restés VERTS. Les deux gardes
     voisins comptaient la PRÉSENCE des deux branches dans le source, pas le
     fait que le choix entre elles dépende du visage.
     ⭐ Une mutation qui ne mord pas ne dit pas « c'est bon » : elle dit qu'il
        manque un garde. Celui-ci exige que la colonne de l'Office vive À
        L'INTÉRIEUR de la branche `avecOffice()`, et pas à côté. */
  /* 🔴 RETOURNÉ LE JOUR MÊME, ET IL EST NÉ D'UNE MUTATION QUI N'AVAIT PAS
     MORDU : hardcoder la condition de la colonne 2 à `true` laissait 37 tests
     verts. Il exigeait donc que la colonne de l'Office vive À L'INTÉRIEUR de
     la branche `avecOffice()` — en lisant le JSX.
     ⭐ Et c'est précisément cette lecture du texte qui l'a rendu aveugle au
        défaut suivant : la barre, en production sur mana.love, menait cinq
        fois à la même page, et il était vert. Il gardait l'endroit où la
        décision est écrite, pas la décision.
     ⚠️ Ce qu'il protégeait reste entier — « la colonne 2 est COMMANDÉE par le
        visage, pas seulement voisine » — et vit maintenant dans
        `barre.test.ts`, interrogé sur `entreesBarre()`. Ici on garde la part
        que ce fichier est seul à pouvoir dire : le prédicat existe, il est
        nommé par ce qu'il décide, et rien ne décide de l'Office sans lui. */
  it("⛔ rien ne décide de l'Office sans passer par le prédicat", () => {
    const v = nu("./visage.ts");
    expect(v).toMatch(/export const avecOffice/);
    /* ⚠️ `barre.ts` reçoit le visage en ARGUMENT — c'est ce qui le rend pur
       et testable sans navigateur. Il n'a donc pas à appeler le prédicat, et
       l'exiger de lui interdirait exactement la bonne solution. */
    const decideurs = ["./App.tsx"];
    for (const f of decideurs) {
      expect(nu(f), `${f} décide de l'Office sans passer par le prédicat`)
        .toMatch(/avecOffice\(\)/);
    }
  });

  /* ⚠️ ON NE MASQUE PAS, ON NE CHARGE PAS. Masquer le calque coûterait quand
     même les 264 Ko d'`ot.json` à un hôte qui n'a rien à en faire — et
     laisserait un calque vide à oublier quelque part. */
  it("mana.love ne télécharge pas les 264 Ko de l'Office", () => {
    const t = nu("./Territoire2030.tsx");
    const bloc = t.match(/if \(!avecOffice\(\)\)[\s\S]{0,120}?chargerOT/)?.[0] ?? "";
    expect(bloc, "`ot.json` se charge avant qu'on ait regardé le visage").not.toBe("");
  });

  /* ⛔ LE CRÉDIT SUIT LA DONNÉE. Créditer un partenaire dont on ne montre rien
     n'est pas de la rigueur, c'est du bruit — et ça affaiblit la mention là où
     elle compte vraiment. */
  it("le crédit de l'Office ne survit pas à sa matière", () => {
    const l = nu("./LApplication.tsx");
    expect(l).toMatch(/MODULES\.filter\(\(m\) => office \|\| !m\.source\)/);
  });
});

/* ════════════════════════════════════════════════════════════════════════
   🔴 LE GARDE QUI AURAIT VU LE COURRIEL — posé après coup, le 7/11 au soir
   ════════════════════════════════════════════════════════════════════════
   `mailto:contact@mana.bzh` s'affichait sur `mana.love/promenades`. Je l'avais
   même « analysé » : j'ai écrit un `courriel()`, puis je l'ai RETIRÉ en
   expliquant que `/contact` n'était pas servi sur mana.love — donc que
   l'écran y était inatteignable.
   ⛔ Vrai de la ROUTE, faux du RENDU : `ContactForm` n'est pas une page, c'est
      un bloc DU PIED, présent partout. ⭐ Vérifier qu'une route n'existe pas
      ne dit rien de ce qui est rendu — et c'est une capture d'écran en ligne
      qui me l'a appris, après un déploiement.
   ⚠️ Ce garde liste les composants rendus sur LES DEUX hôtes et refuse qu'un
      nom de domaine y soit écrit en dur. Il ne lit pas les commentaires :
      ceux-ci parlent abondamment des deux domaines, et c'est leur rôle.
*/
describe("🔴 rien de ce qui est RENDU sur les deux hôtes ne nomme un domaine en dur", () => {
  /* ⚠️ Le pied et ses blocs : ce qui apparaît sur chaque écran. Un fichier
     qui rejoint le pied rejoint cette liste — et s'il l'oublie, c'est le
     prochain relevé en ligne qui le dira, comme cette fois. */
  const RENDUS_PARTOUT = ["./ContactForm.tsx", "./barre.ts"];

  /* ⚠️ `nu()` ne retire que les blocs `/* *\/` — PAS les lignes `//`. Ce
     garde a crié à faux dès sa première exécution, sur l'en-tête de
     `ContactForm` qui explique justement pourquoi le domaine ne doit plus y
     être écrit. ⭐ C'est le piège inverse de celui qu'il traque, et ce dépôt
     le connaît : une recherche qui compte les COMMENTAIRES ment dans l'autre
     sens, et un garde qui crie à faux finit par être désarmé. */
  const sansCommentaire = (f: string) =>
    nu(f).split("\n").filter((l) => !/^\s*(\/\/|\*)/.test(l)).join("\n");

  for (const f of RENDUS_PARTOUT) {
    it(`${f} prend sa signature de l'hôte`, () => {
      expect(sansCommentaire(f), `${f} écrit un domaine en dur`)
        /* ⚠️ INSENSIBLE À LA CASSE, et c'est une mutation qui l'a exigé :
           remplacer `{signature()}` par « MANA.bzh » passait le garde, parce
           que le motif cherchait « mana. » en minuscules. Le domaine s'écrit
           des DEUX façons dans ce dépôt — « MANA.bzh » comme marque dans les
           textes, « mana.bzh » comme adresse. Un garde qui n'en connaît
           qu'une n'en garde qu'une. */
        .not.toMatch(/mana\.(bzh|love)/i);
    });
  }

  /* ⛔ ET LE PRÉDICAT DOIT RENDRE DEUX VALEURS DIFFÉRENTES. Une signature qui
     rendrait la même chose des deux côtés passerait le garde ci-dessus en
     n'ayant rien réparé — le domaine serait simplement caché dans une
     fonction. */
  /* 🔴 L'ADRESSE EXACTE, PAS UN GABARIT — Aurélien, 7/11 : « pour le mail
     c'est welcome@mana.love ». J'avais écrit `contact@mana.love` par
     transposition : changer le domaine, garder la boîte.
     ⭐ Une adresse électronique n'est pas dérivable de son domaine. La partie
        gauche est un choix éditorial ; `contact@` aurait eu l'air juste et
        désigné une boîte qui n'existe pas — le courrier serait parti nulle
        part, sans rebond visible pour nous.
     ⚠️ Et le garde d'à côté ne pouvait pas l'attraper : il vérifie que les
        DEUX domaines sont nommés, ce qui était vrai de la mauvaise adresse.
        Mutation faite : `welcome@` → `contact@` passait. D'où ce test-ci, qui
        épingle la valeur parce qu'elle vient d'une décision et non d'une
        règle — un interdit en test se franchit en le sachant. */
  it("⛔ les deux adresses sont celles qu'on a données, à la lettre", () => {
    const v = nu("./visage.ts");
    expect(v, "l'adresse de mana.love n'est plus welcome@").toContain('"welcome@mana.love"');
    expect(v, "l'adresse de mana.bzh a changé").toContain('"contact@mana.bzh"');
  });

  it("⛔ la signature et le courriel CHANGENT selon l'hôte", () => {
    const v = nu("./visage.ts");
    for (const nom of ["signature", "courriel"]) {
      const m = v.match(new RegExp(`export const ${nom} = [^;]+;`));
      expect(m, `${nom} a disparu`).not.toBeNull();
      expect(m![0], `${nom} ne distingue pas les deux hôtes`).toMatch(/love/);
      expect(m![0], `${nom} ne nomme pas les deux domaines`).toMatch(/bzh/);
    }
  });
});
