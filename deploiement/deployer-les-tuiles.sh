#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
#  LES JEUX DE TUILES — ce que le déploiement de l'app n'emporte PAS
# ═══════════════════════════════════════════════════════════════════════════
#
#  🔴 CE SCRIPT EXISTE PARCE QUE L'EXCLUSION A DEUX FACES, ET QUE LA SECONDE
#     N'AVAIT PAS DE PORTE. `deployer-mana-bzh.sh` exclut `monde` et
#     `bretagne` de son `--delete`, et il explique pourquoi : ces dossiers
#     vivent sur le serveur et pas dans `site/`, un `--delete` les emporterait
#     et « la perte ne se verrait qu'en 404 ».
#
#  ⛔ MAIS L'EXCLUSION PROTÈGE AUSSI CONTRE L'ENVOI. Les 3 411 tuiles de
#     commerces ont été produites le 15/11/2026 au matin et sont restées sur
#     le Mac : le déployeur ne pouvait pas les emporter, et aucun script ne
#     savait le faire. ⭐ Un jeu de données produit et jamais déposé est le
#     jumeau exact du « fantôme » que ce dépôt traque — une page que plus rien
#     ne désigne — sauf qu'il ne se voit nulle part : rien ne manque à
#     l'écran, le calque se tait, et on croit à un territoire vide.
#
#  Usage :  deploiement/deployer-les-tuiles.sh c        # un jeu
#           deploiement/deployer-les-tuiles.sh          # tous ceux qui existent
#
#  ⚠️ PAS DE `--delete`, ET C'EST MESURÉ PLUTÔT QUE DÉCIDÉ. Les producteurs
#     écrivent par COLONNES (`services-monde.ts 4 5`) : un envoi miroir après
#     une génération partielle effacerait en ligne les colonnes qu'on n'a pas
#     régénérées. Le script compte donc les deux côtés et DIT l'écart au lieu
#     de trancher à la place de qui regarde.
set -euo pipefail

RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RACINE"

if [ -f "$RACINE/deploiement/cible.local.sh" ]; then
  _ks5="${MANA_KS5-}"; _cible="${MANA_BZH_CIBLE-}"; _cle="${MANA_SSH_KEY-}"
  . "$RACINE/deploiement/cible.local.sh"
  [ -n "$_ks5" ]   && MANA_KS5="$_ks5"
  [ -n "$_cible" ] && MANA_BZH_CIBLE="$_cible"
  [ -n "$_cle" ]   && MANA_SSH_KEY="$_cle"
fi
: "${MANA_KS5:?MANA_KS5 est absente — voir deploiement/deployer-mana-bzh.sh}"
: "${MANA_BZH_CIBLE:?MANA_BZH_CIBLE est absente — voir deploiement/deployer-mana-bzh.sh}"

# ⭐ LA RACINE SERVIE SE DÉRIVE, ELLE NE SE RECOPIE PAS. `MANA_BZH_CIBLE`
#    désigne le dossier de l'APP (`…/www/_app-bzh`) ; les tuiles sont servies
#    depuis son PARENT, qui est la racine du site. Écrire ce chemin une
#    seconde fois ici en ferait une valeur à tenir d'accord avec l'autre.
# ⛔ ET ON REFUSE SI LE SUFFIXE N'EST PAS LÀ : sans ce garde, une cible
#    nommée autrement enverrait 110 Mo de tuiles DANS le dossier de l'app,
#    où rien ne les sert — et où le prochain `--delete` les effacerait.
SERVIE="${MANA_BZH_CIBLE%/_app-bzh}"
if [ "$SERVIE" = "$MANA_BZH_CIBLE" ]; then
  echo "⛔ MANA_BZH_CIBLE ne finit pas par /_app-bzh : impossible d'en déduire" >&2
  echo "   la racine servie. Lisez le bloc mana.bzh du Caddyfile (root *)." >&2
  exit 1
fi
CLE="${MANA_SSH_KEY:-$HOME/.ssh/id_ed25519}"
SSH_="ssh -i $CLE -o IdentitiesOnly=yes -o ConnectTimeout=30"

vert()  { printf '\033[32m%s\033[0m\n' "$*"; }
rouge() { printf '\033[31m%s\033[0m\n' "$*"; }

JEUX=("$@")
if [ ${#JEUX[@]} -eq 0 ]; then
  JEUX=()
  for d in public/monde/*/; do JEUX+=("$(basename "$d")"); done
fi

ECHECS=0
for jeu in "${JEUX[@]}"; do
  src="public/monde/$jeu"
  [ -d "$src" ] || { rouge "⛔ $src n'existe pas"; ECHECS=$((ECHECS + 1)); continue; }

  avant="$($SSH_ "$MANA_KS5" "find $SERVIE/monde/$jeu -name '*.json' 2>/dev/null | wc -l" | tr -d ' ')"
  ici="$(find "$src" -name '*.json' | wc -l | tr -d ' ')"
  printf '\033[1m→ monde/%s\033[0m  — %s tuiles ici, %s en ligne\n' "$jeu" "$ici" "${avant:-0}"

  rsync -az --human-readable -e "$SSH_" \
    --rsync-path="sudo rsync" \
    "$src/" "$MANA_KS5:$SERVIE/monde/$jeu/"

  apres="$($SSH_ "$MANA_KS5" "find $SERVIE/monde/$jeu -name '*.json' 2>/dev/null | wc -l" | tr -d ' ')"
  echo "   $apres tuiles en ligne après envoi"
  # ⚠️ UN SURPLUS EN LIGNE SE DIT, IL NE SE SUPPRIME PAS TOUT SEUL. C'est soit
  #    une génération partielle ici, soit un quadrillage abandonné là-bas
  #    (vécu le 15/11 : 19 tuiles z8 restées sous `c/8/`). Les deux se
  #    réparent à la main, en connaissance — et un `--delete` automatique
  #    aurait détruit le premier cas en croyant réparer le second.
  if [ "${apres:-0}" -gt "$ici" ]; then
    echo "   ⚠️  $(( apres - ici )) tuile(s) de plus en ligne qu'ici."
    echo "      Génération partielle, ou quadrillage abandonné : à trancher à la main."
  fi
done

# ── CE QUI EST DÉPOSÉ EST-IL SERVI ? ───────────────────────────────────────
# ⭐ « rsync a réussi » ne dit pas « la tuile est servie » : entre les deux il
#    y a Caddy, son `handle /monde/*` et sa liste blanche d'origines. On
#    demande donc une tuile RÉELLE, tirée de ce qu'on vient d'envoyer.
echo
for jeu in "${JEUX[@]}"; do
  [ -d "public/monde/$jeu" ] || continue
  # 🔴 `-print -quit`, ET PAS `| head -1` — mesuré le 15/11/2026, à la
  #    première exécution de ce script. `head` ferme le tuyau dès la première
  #    ligne, `find` meurt d'un SIGPIPE, et sous `set -o pipefail` le script
  #    s'arrête là : code 141. ⛔ Et il s'arrêtait AVANT sa propre
  #    vérification — donc l'envoi s'affichait comme réussi et rien n'allait
  #    demander si la tuile était servie. Un garde sauté en silence par la
  #    ligne qui le précède, la forme la plus coûteuse du vert qui ne dit rien.
  temoin="$(find "public/monde/$jeu" -name '*.json' -print -quit)"
  [ -n "$temoin" ] || continue
  chemin="${temoin#public/}"
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 25 "https://mana.bzh/$chemin" || echo 000)"
  if [ "$code" = "200" ]; then vert "  ✓ https://mana.bzh/$chemin"
  else rouge "  ✗ https://mana.bzh/$chemin → $code"; ECHECS=$((ECHECS + 1)); fi
done

[ "$ECHECS" -eq 0 ] || { rouge "⛔ $ECHECS échec(s)"; exit 1; }
# ⚠️ Et la liste blanche CORS vaut pour ces fichiers comme pour les tuiles de
#    carte — un hôte absent les reçoit en refus, et le calque reste vide SANS
#    erreur à l'écran (vécu le 15/11 avec manafrance).
node scripts/verifier-relais-cors.mjs
