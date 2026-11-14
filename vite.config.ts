import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  /* ⭐ UNE SEULE DÉCLARATION DU PRÉFIXE, ET ELLE EST VARIABLE — 1/11.
     GitHub Pages sert sous `/mana/` : sans base, les bundles 404 et la page
     reste blanche. Mais la même application doit pouvoir servir la RACINE
     d'un domaine (mana.bzh), où `/mana/` n'existe pas.
     ⚠️ Tout le reste du dépôt doit lire `import.meta.env.BASE_URL` ou
        `%BASE_URL%`, jamais écrire « /mana » : un préfixe recopié ailleurs ne
        suit pas celui-ci, et le défaut est MUET — les bundles partent en 404,
        l'écran est blanc, et rien ne dit pourquoi. Un test tient la règle. */
  base: process.env.MANA_BASE ?? "/mana/",
  plugins: [
    {
      /* 🔴 LE TITRE STATIQUE EST CE QU'UN ROBOT LIT SANS JAVASCRIPT, et il
         était figé à « MANA.bzh — Promenades & découvertes en Bretagne ».
         Promue à la racine de manahome.org le 14/11/2026, l'app y annonçait
         donc le nom d'un autre site, en première ligne de l'accueil.
         ⭐ `titrePourLHote()` corrige le titre À L'EXÉCUTION — mais un robot
         qui n'exécute rien ne voit que celui-ci. Le même défaut que les
         coquilles React de manahome, à un seul fichier près.
         ⚠️ Il ne peut pas être host-aware : il est écrit une fois, au build.
         Mais on construit DÉJÀ une fois par hôte — c'est donc une variable
         de build, et `npm run build:manahome` la pose. */
      name: "titre-de-l-hote",
      transformIndexHtml(html: string) {
        const titre = process.env.MANA_TITRE;
        if (!titre) return html;
        if (!/<title>[^<]*<\/title>/.test(html)) {
          throw new Error("aucun <title> à remplacer dans index.html");
        }
        return html.replace(/<title>[^<]*<\/title>/, `<title>${titre}</title>`);
      },
    },
  ],
  /* 🔴 « assets » EST DÉJÀ PRIS SUR mana.bzh — 73 Mo de bundles qui servent
     63 885 pages d'agrégat. Deux applications sur une même origine ne peuvent
     pas se partager ce nom : les fichiers sont hachés, donc ils ne
     s'écraseraient pas l'un l'autre, mais un seul dossier peut répondre à
     « /assets/* », et l'autre application devient alors une page blanche.
     ⭐ Le nom est à NOUS, pas au domaine : on le change ici une fois, et la
        collision n'existe plus nulle part — y compris sur GitHub Pages, où
        rien ne l'imposait. */
  build: { outDir: "site", assetsDir: "app" },
});
