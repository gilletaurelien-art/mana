import { describe, it, expect } from "vitest";
import maplibregl from "maplibre-gl";
import { zoomMaplibrePour, TUILE_MAPLIBRE_PX, RAYON_TERRE_M } from "./carte-fond";

/**
 * LE ZOOM QUI RECALE LE SATELLITE SUR LE CANVAS.
 *
 * 🔴 CE FICHIER EXISTE PARCE QUE LE DÉFAUT EST PASSÉ SOUS UNE VÉRIFICATION
 *    VISUELLE. Le 4/11/2026, `Territoire2030` calculait ce zoom avec la
 *    constante 156543,03392 — celle du monde des tuiles de 256 px. MapLibre
 *    rend en 512 : le fond satellite sortait exactement deux fois trop
 *    grand. Mesuré ensuite sur les 593 sites nommés de l'emprise : 89 px
 *    d'écart moyen entre la pastille vue et l'endroit où le clic la
 *    cherchait, 157 px au pire, pour une tolérance de 16 px.
 *
 * ⚠️ ET CE QUI REND CE DÉFAUT-LÀ MÉCHANT : une erreur d'ÉCHELLE laisse le
 *    CENTRE exact et croît avec la distance à lui. Le contrôle fait le matin
 *    même — « l'anneau de sélection tombe pile sur la pastille » — avait eu
 *    lieu au milieu de l'écran : le seul endroit où ce défaut ne peut pas se
 *    voir. ⭐ Un contrôle réussi sur le point où le défaut est impossible
 *    endort mieux qu'un contrôle absent.
 *
 * ⛔ CE TEST NE SE CONTENTE PAS DE RELIRE NOTRE CONSTANTE. Relire `512` pour
 *    vérifier `512` ne prouve rien : il faut un témoin EXTÉRIEUR. Celui-ci
 *    est `MercatorCoordinate`, la math de maplibre elle-même, embarquée dans
 *    la bibliothèque et indépendante de ce que nous écrivons.
 */
describe("le zoom maplibre qui recale le satellite", () => {
  /**
   * 🔴 DEUX RAYONS DE TERRE DANS LA MÊME BIBLIOTHÈQUE, ET IL FAUT LE SAVOIR.
   *    Ce test a d'abord été écrit en croyant que `meterInMercatorCoordinateUnits()`
   *    de maplibre validerait notre formule telle quelle. Il a échoué de
   *    0,11 % — et ce n'était pas notre erreur : maplibre MESURE les
   *    distances avec le rayon MOYEN (6 371 008,8 m), tandis que la pyramide
   *    de tuiles Web Mercator — celle qui décide de l'échelle à un zoom
   *    donné — est bâtie sur le rayon ÉQUATORIAL (6 378 137 m). Les deux
   *    cohabitent, chacun juste pour son usage.
   * ⭐ ON PIN DONC L'ÉCART PLUTÔT QUE DE LE LISSER. `toBeCloseTo` avec une
   *    tolérance large aurait laissé passer les deux rayons indifféremment —
   *    et la prochaine main aurait pu « harmoniser » vers le moyen, ce qui
   *    décalerait le fond de 0,11 % (0,2 px au bord de l'emprise, invisible,
   *    mais faux). Ici l'écart attendu est NOMMÉ : s'il change, c'est que
   *    l'un des deux rayons a bougé, et le test le dit.
   * ⚠️ Ce que le relevé navigateur tranche en notre faveur : avec le rayon
   *    moyen, l'écart mesuré au bord aurait été d'environ 0,18 px ; il a été
   *    mesuré à 0,06. C'est faible, mais c'est dans le bon sens.
   */
  const RAYON_MOYEN_MAPLIBRE_M = 6371008.8;
  it("🔴 sait que maplibre MESURE au rayon moyen et DESSINE au rayon équatorial", () => {
    for (const latitude of [0, 30, 48.26, 60]) {
      const partDUnMetre = maplibregl.MercatorCoordinate
        .fromLngLat({ lng: -4.3, lat: latitude })
        .meterInMercatorCoordinateUnits();
      /* ⚠️ `× cos`, PAS `÷ cos` — la première écriture de ce test divisait, et
         l'écart gonflait en 1/cos² (×4 à 60°). Le parallèle RÉTRÉCIT vers le
         pôle : un tour du monde à 60° fait la moitié d'un tour à
         l'équateur. ⭐ La formule du zoom, elle, avait le cosinus du bon
         côté depuis le début — c'est le témoin qui s'était trompé, et il
         accusait le témoigné. */
      const metresDansUnMondeSelonNous =
        2 * Math.PI * RAYON_TERRE_M * Math.cos((latitude * Math.PI) / 180);
      // le produit ne vaut pas 1 : il vaut exactement le rapport des deux rayons
      expect(partDUnMetre * metresDansUnMondeSelonNous)
        .toBeCloseTo(RAYON_TERRE_M / RAYON_MOYEN_MAPLIBRE_M, 9);
    }
    // et ce rapport est bien l'écart de 0,11 % qui a fait échouer la première
    // écriture de ce test — pas un bruit de virgule flottante
    expect(RAYON_TERRE_M / RAYON_MOYEN_MAPLIBRE_M).toBeCloseTo(1.001119, 6);
  });

  /**
   * ⭐ LA TAILLE DE TUILE, ANCRÉE SUR UNE MESURE RÉELLE. maplibre n'exporte
   *    pas sa taille de tuile ; le témoin est donc un relevé fait dans le
   *    navigateur, sur la carte qui tourne : au cadrage initial de l'emprise
   *    fusionnée, le canvas rendait 711,2 pixels par degré de latitude
   *    (soit 156,53 m/px) à 48,26018° — et maplibre, recalé, affichait
   *    zoom 8,379. Avec la constante des tuiles de 256, la même entrée
   *    donnait 9,379 : exactement un cran de trop, c'est-à-dire le facteur
   *    deux qu'on voyait à l'écran.
   */
  it("🔴 rend le zoom MESURÉ dans le navigateur, pas celui des tuiles de 256", () => {
    const metresParPixel = 111320 / 711.2;
    const latitude = 48.26018;

    expect(zoomMaplibrePour(metresParPixel, latitude)).toBeCloseTo(8.379, 2);

    // ⛔ la formule d'avant, gardée ici comme repoussoir chiffré : un cran de
    //    trop, et un cran de zoom EST un facteur deux sur l'échelle.
    const avecLaTuileDe256 = Math.log2(
      (156543.03392 * Math.cos((latitude * Math.PI) / 180)) / metresParPixel,
    );
    expect(avecLaTuileDe256 - zoomMaplibrePour(metresParPixel, latitude)).toBeCloseTo(1, 9);
    expect(TUILE_MAPLIBRE_PX).toBe(512);
  });

  /**
   * ⚠️ CELUI-CI EST CIRCULAIRE, ET IL FAUT L'ÉCRIRE. Il refait le chemin
   *    inverse avec LES MÊMES constantes : il attrape une faute d'algèbre
   *    (un signe, un log, une inversion), jamais une mauvaise constante.
   *    Vérifié par mutation le 4/11 : remis à la tuile de 256, puis au rayon
   *    moyen, il a passé les DEUX fois — ce sont les deux tests au-dessus
   *    qui ont refusé. ⭐ Un test qui ne peut pas échouer sur la régression
   *    qu'on craint n'est pas un garde ; le dire évite qu'on le compte pour
   *    tel le jour où les autres seront touchés.
   */
  it("le zoom rendu redonne bien l'échelle demandée (garde d'algèbre, pas de constante)", () => {
    for (const metresParPixel of [5, 20, 156.53, 400]) {
      for (const latitude of [47.5, 48.26, 49]) {
        const z = zoomMaplibrePour(metresParPixel, latitude);
        const echelleRetrouvee =
          ((2 * Math.PI * RAYON_TERRE_M) / TUILE_MAPLIBRE_PX) *
          Math.cos((latitude * Math.PI) / 180) / 2 ** z;
        expect(echelleRetrouvee).toBeCloseTo(metresParPixel, 6);
      }
    }
  });
});
