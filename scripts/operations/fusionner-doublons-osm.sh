#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
#  FUSION DES DOUBLONS OSM — exécutée le 15/11/2026, gardée pour sa doctrine
# ═══════════════════════════════════════════════════════════════════════════
#
#  🔴 CE QU'IL A FAIT, UNE FOIS. 37 136 objets OpenStreetMap existaient DEUX
#     FOIS dans `ressources` : une ligne du pipeline FRANÇAIS et une ligne du
#     connecteur MONDE, pour le même identifiant OSM. Ce script a donné à la
#     ligne française ce qui lui manquait, puis supprimé la ligne monde.
#
#  ⭐ POURQUOI GARDER UN SCRIPT DÉJÀ JOUÉ. Parce que le geste a vécu dans
#     `/tmp` et que `/tmp` s'évapore : sans ce fichier, la seule trace d'une
#     opération qui a touché 37 136 lignes de production serait un message de
#     session. Un geste qui ne laisse pas de trace est un geste que personne ne
#     pourra comprendre, refaire, ni contredire.
#
# ── LA RÈGLE DE FUSION, ET POURQUOI ELLE EST DANS CE SENS ─────────────────
#
#  ⛔ MON PREMIER ARBITRAGE ÉTAIT L'INVERSE, ET IL ÉTAIT FAUX. J'avais mesuré
#     que la copie française est cinq fois plus riche (5,78 mots contre 1,06 ;
#     commune renseignée 31 081 fois contre 359) et conclu « c'est la copie
#     monde qu'il faut retirer ». ⭐ Je n'avais pas mesuré LAQUELLE DES DEUX
#     LA CARTE LIT. Le générateur des sites clé sur `mots[1]`, et le premier
#     mot de la copie française est souvent un mot pris dans le NOM —
#     « jardin », « architecture », « claude », « albrecht ». Supprimer les
#     copies monde aurait retiré 37 136 épingles.
#
#  La règle retenue garde donc la ligne FRANÇAISE — qui tient le lien vers
#  `entites`, le texte, la commune, le code postal, le territoire — et lui
#  donne du MONDE les deux seules choses qu'elle n'a pas :
#    1. le mot de type EN TÊTE de `mots` (c'est lui que lit la liste blanche) ;
#    2. la position du monde (celle que la carte montre déjà : aucune épingle
#       ne bouge — écart mesuré entre les deux : 0 m pour 56/151, < 50 m pour
#       84, maximum 795 m).
#
#  ⚠️ LOTS DE 500, ET UNE SEULE TRANSACTION PAR LOT. Écrire `mots` rallume
#     `trg_sync_ressource_familles`, qui réécrit `ressource_familles` ligne à
#     ligne ; 20 000 dépassait `statement_timeout`. Et l'enrichissement et la
#     suppression sont dans la MÊME transaction : séparés, un arrêt laisserait
#     un doublon déjà enrichi dont la source a disparu.
#
# ── CE QUE LE CONTRÔLE A DIT, ET CE QU'IL A FALLU EXPLIQUER ───────────────
#
#  Garde posé avant l'exécution : le nombre de lignes éligibles à la carte ne
#  doit pas changer. Mesuré : 4 261 809 avant, 4 260 521 après — **1 288 de
#  moins**, et le garde a donc mordu.
#  ⭐ L'ÉCART S'EXPLIQUE À L'UNITÉ, ET IL A FALLU LE DÉMONTRER AU LIEU DE LE
#     DÉDUIRE. Dans le dump de 02:00, 1 288 des 37 136 lignes françaises
#     portaient DÉJÀ un mot de la liste blanche en tête (659 `baie`,
#     410 `chateau`…) : ces lieux étaient dessinés DEUX FOIS AU MÊME ENDROIT.
#     Aucune épingle n'a disparu — 1 288 doublons visuels ont cessé d'être
#     superposés. 1288 / 1288, exactement.
#
#  ⚠️ ET IL RESTE UNE AUTRE FAMILLE DE DOUBLONS, QUE CE SCRIPT NE VOIT PAS :
#     des objets OSM DIFFÉRENTS décrivant le même lieu réel (un nœud et un
#     contour pour la même église). Mesuré sur 6 002 entrées servies : 9, soit
#     0,15 %. La clé de ce script est l'identifiant OSM ; les résorber
#     demanderait une clé « même nom + même position », donc un arbitrage —
#     deux bâtiments mitoyens peuvent légitimement porter le même nom.
#
#  Archive des 37 136 lignes supprimées, relue :
#    /srv/sauvegardes/ressources-doublons-monde-20261115.tsv.gz  (3,3 Mo)
#
#  Entrée attendue : /tmp/paires-fusion.csv — id_fr,id_monde,type_monde,geom_monde
# ═══════════════════════════════════════════════════════════════════════════
# FUSION DES DOUBLONS OSM — la ligne française reçoit du monde ce qui lui
# manque (le mot de type EN TÊTE, la position), puis la ligne monde part.
#
# ⚠️ LOTS DE 500 : écrire `mots` rallume trg_sync_ressource_familles, qui
#    réécrit ressource_familles pour chaque ligne. 20 000 dépassait le délai.
# ⛔ L'ORDRE COMPTE, ET IL EST DANS UNE SEULE TRANSACTION : on enrichit, puis
#    on supprime. L'inverse perdrait la source de l'enrichissement si un lot
#    tombait au milieu ; séparés, un arrêt laisserait des doublons enrichis.
set -euo pipefail
PSQL="sudo docker exec -i pg-repetition psql -q -t -A -v ON_ERROR_STOP=1 -U postgres -d postgres"
total=0
rm -f /tmp/fus-*
split -l 500 -d -a 3 /tmp/paires-fusion.csv /tmp/fus-
for f in /tmp/fus-*; do
  {
    echo "SET statement_timeout = '5min';"
    echo "BEGIN;"
    echo "WITH p(id_fr, id_monde, type_monde, geom_monde) AS (VALUES"
    awk -F, '{ printf "%s(%s::uuid,%s::uuid,%s,%s)", (NR>1?",":""), "'"'"'"$1"'"'"'", "'"'"'"$2"'"'"'", "'"'"'"$3"'"'"'", "'"'"'"$4"'"'"'" }' "$f"
    echo "),"
    echo "maj AS ("
    echo "  UPDATE public.ressources r"
    echo "     SET mots = ARRAY[p.type_monde] || array_remove(r.mots, p.type_monde),"
    echo "         geom = ST_GeomFromText(p.geom_monde, 4326)"
    echo "    FROM p WHERE r.id = p.id_fr"
    echo "  RETURNING r.id)"
    echo "SELECT count(*) FROM maj;"
    echo "DELETE FROM public.ressources x USING (VALUES"
    awk -F, '{ printf "%s(%s::uuid)", (NR>1?",":""), "'"'"'"$2"'"'"'" }' "$f"
    echo ") AS d(id) WHERE x.id = d.id;"
    echo "COMMIT;"
  } | $PSQL > /dev/null
  n=$(wc -l < "$f"); total=$((total+n)); echo "  $total / 37136"
  rm -f "$f"
done
echo "fusion terminée"
