import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * 🔴 LE 31/10/2026, LA CARTE DU TERRITOIRE A DISPARU SUR LES ÉCRANS DE BUREAU.
 *
 * Elle faisait **20 pixels de large**. Un `@media (min-width: 900px)` mettait
 * `.terr` en deux colonnes — `1fr` pour la carte, 420 px pour le panneau — et
 * le `1fr` recevait ce qui restait de la boîte : 440 − 420.
 *
 * ⭐ UNE REQUÊTE DE MÉDIA MESURE LA FENÊTRE, JAMAIS LE CONTENEUR. La règle
 *    était juste le jour de son écriture ; `.app-colonne` a figé toute l'app
 *    à 440 px quelques heures plus tard, et la requête a continué de dire oui
 *    à 1 280 px pendant que la boîte, elle, n'avait pas bougé.
 *
 * Ce test lit le CSS et refuse qu'une requête de média déclenchée AU-DELÀ de
 * la colonne redistribue des colonnes de grille : à cette largeur-là, aucune
 * boîte de l'app ne s'est élargie, donc le calcul se fait sur une place qui
 * n'existe pas. Le jour où un écran devra sortir de la colonne, c'est une
 * requête de CONTENEUR (`@container`) qu'il faudra — et ce test ne la voit pas.
 */
const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const systeme = readFileSync(new URL("./systeme.css", import.meta.url), "utf8");

/** La largeur n'est pas recopiée : elle est LUE là où elle est décidée. */
function colonne(): number {
  const m = systeme.match(/--colonne:\s*(\d+)px/);
  if (!m) throw new Error("`--colonne` introuvable dans systeme.css");
  return Number(m[1]);
}

/** Rend le corps de chaque bloc `@media` et le `min-width` qu'il porte. */
function blocsMedia(source: string): { minWidth: number; corps: string }[] {
  const out: { minWidth: number; corps: string }[] = [];
  const re = /@media([^{]+)\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    const mw = m[1].match(/min-width:\s*(\d+)px/);
    if (!mw) continue;
    // Compter les accolades pour sortir le corps complet du bloc.
    let i = re.lastIndex, prof = 1;
    while (i < source.length && prof > 0) {
      if (source[i] === "{") prof++;
      else if (source[i] === "}") prof--;
      i++;
    }
    out.push({ minWidth: Number(mw[1]), corps: source.slice(re.lastIndex, i - 1) });
  }
  return out;
}

describe("la colonne de 440 px et les requêtes de média", () => {
  it("le fichier porte bien des blocs `@media (min-width: …)` — sinon ce test ne lit rien", () => {
    expect(blocsMedia(css).length).toBeGreaterThan(0);
  });

  it("aucune requête déclenchée au-delà de la colonne ne redistribue des colonnes de grille", () => {
    const seuil = colonne();
    const fautifs = blocsMedia(css)
      .filter((b) => b.minWidth > seuil && /grid-template-columns/.test(b.corps))
      .map((b) => `@media (min-width: ${b.minWidth}px)`);
    expect(fautifs).toEqual([]);
  });
});
