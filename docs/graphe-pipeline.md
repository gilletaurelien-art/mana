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
python3 scripts/graphe-signaux.py brouillon.json public/bretagne/g/<nom>.json
```

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

⭐ **DEUX GRAPHES, PAS UN.** La comcom entière fait 955 km² contre 517 pour la
presqu'île ; un seul fichier pèserait ~1,5 Mo gzip, et la promesse « ouvrez la
fiche avant de partir » deviendrait « ouvrez-la et attendez ». Personne ne
compose une boucle à Pont-de-Buis et au Cap de la Chèvre dans la même sortie.

⚠️ **LES DEUX EMPRISES SE CHEVAUCHENT** de −4,32 à −4,2554, soit ~4,5 km.
Sans ce recouvrement, un chemin coupé par la frontière se terminerait en
cul-de-sac dans les deux fichiers. Ce qui reste impossible, et qui est le prix
assumé du découpage : composer une boucle qui traverse la frontière.

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
