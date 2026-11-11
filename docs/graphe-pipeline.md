# Bâtir le graphe d'un territoire

🔴 **Le pipeline qui a produit `crozon.json` le 28/10/2026 n'existe plus.**
Cherché dans ce dépôt et sur le VPS : rien. Il a été écrit dans un répertoire
de travail et perdu avec lui. Le graphe servi était donc un artefact qu'on ne
savait plus refaire — la définition d'une dette. Celui-ci se rejoue.

```bash
# 0 · la matière (315 Mo, une fois)
curl -O https://download.geofabrik.de/europe/france/bretagne-latest.osm.pbf

# 1 · découper le territoire — 44 s
osmium extract -b <ouest>,<sud>,<est>,<nord> bretagne-latest.osm.pbf -o t.osm.pbf

# 2 · le réseau — 25 s
python3 scripts/graphe.py t.osm.pbf <nom> brouillon.json

# 3 · les signaux et les lieux — 8 s
python3 scripts/graphe-signaux.py brouillon.json signaux.json

# 4 · l'altitude — 4 s   ⛔ NE PAS SAUTER (voir ci-dessous)
python3 scripts/graphe_altitude.py signaux.json data/srtm public/bretagne/g/<nom>.json
```

🔴 **CETTE RECETTE A OUBLIÉ L'ÉTAPE 4 JUSQU'AU 11/11/2026, et l'oubli ne se
voit pas.** Elle s'arrêtait aux signaux et écrivait directement dans
`public/bretagne/g/` : on produisait donc un asset **sans dénivelé**, sans
qu'aucune erreur ne le dise. Le seul indice est l'arité d'une arête — **8
champs au lieu de 9** — et le type de l'app l'accepte en silence, puisque les
cases 5 à 8 y sont **optionnelles** (`composition.ts`). L'écart s'est vu en
comparant un fichier neuf à `presquile.json`, pas en relisant la recette.

⭐ **Une étape manquante dans une recette ne rend pas une erreur, elle rend un
fichier appauvri** — et un fichier appauvri passe tous les contrôles de forme.
C'est `graphe_altitude.py` qui remplit la case 6 (dz net) laissée à `None` par
les signaux, et qui AJOUTE la case 8 (montée cumulée). Sans lui, la fiche
annonce un dénivelé vide et le moteur ne compte aucune montée.

⚠️ Il lui faut les dalles SRTM (`N48W004.hgt`, `N48W005.hgt` pour le Pays de
Brest). Elles ne sont pas dans ce dépôt ; `04_denivele.py` côté
`manafrance-app/pipeline/` les télécharge et les garde dans `data/srtm/`.

⚠️ **Rien de tout ceci ne tourne sur la machine de production.** La jointure
spatiale de l'ancien pipeline avait saturé le VPS le 28/10 — 5,9 cœurs sur 6.
Ici tout se fait sur un poste de travail et le serveur ne reçoit que le
fichier produit. ⭐ Un pipeline qui rend des FICHIERS peut tourner n'importe où ;
c'est ce qui le rend inoffensif.

⚠️ `pyosmium` n'est pas dans `package.json` — c'est du Python. Un
environnement jetable suffit : `python3 -m venv .venv && .venv/bin/pip install osmium`.

## Les emprises relevées

| territoire | emprise | arêtes | km | lieux | gzip |
|---|---|---|---|---|---|
| `presquile` | −4,6240 48,1673 → −4,2554 48,3374 | 16 210 | 1 755 | 495 | 881 Ko |
| `aulne` | −4,3200 48,1673 → −4,0210 48,3520 | 20 779 | 2 474 | 280 | 1 172 Ko |
| `ccpcam` | −4,6240 48,1673 → −4,0210 48,3520 | 34 439 | 3 897 | 751 | 1 918 Ko |

⚠️ **`ccpcam` est l'UNION exacte des deux précédentes**, produite le 11/11/2026
pour vérifier la recette : il rend 34 439 arêtes contre 36 989 pour la somme
des deux (−6,9 %) et 3 897 km contre 4 229 (−7,9 %). Ce n'est pas une perte,
c'est le recouvrement de 4,5 km qui n'est plus compté deux fois — la bande
commune fait ~8 % de l'emprise, et les deux écarts tombent dessus.
⭐ La colonne gzip est la mesure qui tranche le découpage : 1 918 Ko pour le
fichier unique contre 2 053 (881 + 1 172) pour la paire.

⭐ **DEUX GRAPHES, PAS UN** — l'argument tient, mais pas avec ces chiffres-là.

🔴 **« LA COMCOM ENTIÈRE FAIT 955 km² CONTRE 517 POUR LA PRESQU'ÎLE » EST FAUX,
et les deux nombres sont pourtant justes.** Ce sont les aires des **RECTANGLES
MOISSONNÉS**, pas des territoires. Mesuré le 11/11/2026 sur les contours de
communes : CCPCAM fait **280 km²** (10 communes) et la presqu'île **195 km²**
(7 communes). Les boîtes, elles, font 920 et 518 km² — d'où les chiffres
d'origine. ⭐ **Une emprise n'est pas un territoire** : le rectangle qui
contient la presqu'île contient aussi de la mer et le voisin. Présentés comme
des surfaces de territoire, ces nombres le gonflent de 3,4× et 2,7×.

Le vrai argument est le POIDS, et il se mesure : `presquile` + `aulne` font
1,32 Mo brotli. Et le 11/11, l'emprise entière produite en UN fichier
(`ccpcam`) en fait **1,24 Mo — moins que les deux qu'elle remplace**, parce
que le recouvrement de 4,5 km n'est plus payé deux fois. ⛔ Le découpage ne se
justifie donc PAS par le poids à cette échelle ; il se justifie par l'usage —
personne ne compose une boucle à Pont-de-Buis et au Cap de la Chèvre dans la
même sortie — et par le fait qu'une emprise = un interlocuteur.

⚠️ **LES DEUX EMPRISES SE CHEVAUCHENT** de −4,32 à −4,2554, soit ~4,5 km.
Sans ce recouvrement, un chemin coupé par la frontière se terminerait en
cul-de-sac dans les deux fichiers.

🔴 **« CE QUI RESTE IMPOSSIBLE : COMPOSER UNE BOUCLE QUI TRAVERSE LA
FRONTIÈRE » — FAUX DEPUIS LE 4/11/2026**, quand `fusionnerGraphes` a été
écrit : `/carte` charge les deux fichiers et les SOUDE. `territoires.ts`
portait la même phrase et l'a corrigée ; celle-ci avait survécu ici.
⭐ Elle était pire qu'une note périmée : elle énonçait la limite comme un
« prix assumé », c'est-à-dire comme une DÉCISION — et un inconvénient présenté
comme un choix ne se rouvre pas.
Mesuré le 11/11 sur le fichier unique `ccpcam`, au départ d'Argol : 7 boucles
de 9 à 12 km, dont **3 s'étendent à plus de 800 m des deux côtés** de la
couture. Les 4 autres l'effleurent (0 à 200 m) — la traversée est possible et
utilisée, elle n'est pas systématique.

## 🔴 Ce que la reconstruction a révélé

**Le barème d'agrément du graphe servi n'existe nulle part.** Celui-ci est
NEUF (`bareme: mana-2026-10-31`), écrit dans `graphe-signaux.py`, donc
discutable. Le reconstituer par rétro-ingénierie aurait produit un chiffre
plausible adossé à une méthode qu'on n'a pas faite — le pire genre de faux
témoin. Il se comporte comme l'ancien : agrément moyen 196 à moins de 60 m de
la mer, 91 au-delà de 2 km (ancien : 189 → 107).

**La route n'est pas exclue, elle est pénalisée** — c'est le principe du
moteur (`coût = longueur ÷ agrément`). Exclure rendrait des secteurs
inatteignables ; pénaliser laisse le chemin possible et coûteux. D'où un
réseau 22 % plus dense que l'ancien à emprise égale (1 755 km contre 1 455).

**Et ce réseau contredit une phrase du produit.** Deux tests de
`fermetures.reel.test.ts` échouent sur le graphe neuf : ils encodent que
l'accès à la plage de Postolonnec est « un cul-de-sac greffé sur le GR34 »,
donc qu'aucune boucle n'est possible une fois l'arrêté appliqué. Sur le graphe
neuf, **quatre boucles existent, dont deux à 6,4 et 6,8 km avec seulement 5
arêtes de route sur 68** — des sentiers, pas des échappatoires par le bitume.

⭐ Le moignon était un TROU DANS LE RÉSEAU, pas la forme du terrain. Ces deux
tests encodent une propriété de l'ANCIEN GRAPHE. Ils ne se suppriment pas : ils
se RETOURNENT — mais seulement après vérification sur le terrain, parce que ce
qu'ils protègent (ne pas envoyer quelqu'un sur un sentier fermé) reste vrai.
