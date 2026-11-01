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
