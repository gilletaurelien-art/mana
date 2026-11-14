#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# UNE SOURCE, DEUX HÔTES — mana.bzh ET manahome.org, dans le même geste
# ═══════════════════════════════════════════════════════════════════════════
#
# 🔴 CE SCRIPT EXISTE PARCE QUE LA DÉRIVE A ÉTÉ MESURÉE, PAS REDOUTÉE —
#    14/11/2026. Une heure après la promotion de l'app à la racine de
#    manahome, les deux hôtes servaient deux versions :
#
#        mana.bzh       app/index-d4bkds03.js   « MANAhome » : 0 occurrence
#        manahome.org   app/index-BwdSP5pT.js   la correction de signature
#
#    mana.bzh tournait sur le bundle d'AVANT le correctif. ⭐ Et rien ne le
#    disait : les deux répondaient 200 partout, et chacun affichait le bon
#    titre — parce que le titre est écrit par le build, pas par le code servi.
#    Un hôte en retard n'a pas l'air en retard.
#
# ⭐ DEUX DÉPLOIEMENTS POUR UNE SOURCE N'EST PAS UN RISQUE, C'EST UNE
#    ÉCHÉANCE. Le jour où l'on n'en lance qu'un — et ce jour est arrivé le
#    jour même — la moitié des visiteurs reçoit du code périmé. La parade
#    n'est pas de s'en souvenir, c'est de n'avoir qu'un geste à lancer.
#
# ⚠️ LES DEUX EMPREINTES DIFFÈRENT, ET C'EST NORMAL. mana.bzh lit ses graphes
#    en relatif (`/bretagne/g`), manahome en absolu
#    (`https://mana.bzh/bretagne/g`), et les titres statiques diffèrent : deux
#    builds, deux hachages. ⛔ Ce qui doit coïncider n'est donc PAS le nom du
#    bundle — c'est le COMMIT. Comparer les empreintes entre hôtes ferait
#    crier au loup à chaque déploiement réussi.
#
# Usage :  npm run deploy:tous
set -euo pipefail

RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RACINE"

# La même cible, lue au même endroit que le déployeur breton — l'adresse du
# serveur ne s'écrit pas dans ce dépôt, qui est public (voir l'en-tête de
# deployer-mana-bzh.sh).
if [ -f "$RACINE/deploiement/cible.local.sh" ]; then
  _ks5="${MANA_KS5-}"; . "$RACINE/deploiement/cible.local.sh"
  [ -n "$_ks5" ] && MANA_KS5="$_ks5"
fi
# 🔴 PAS D'APOSTROPHE DANS CE MESSAGE, ET CE N'EST PAS DU STYLE — bash 3.2.
#    Une apostrophe SEULE dans un `${VAR:?mot}` ouvre une chaîne que rien ne
#    ferme : tout le reste du fichier devient du texte entre quotes. La
#    première rédaction disait « MANA_KS5 n'est pas posée » et `bash -n`
#    accusait la boucle `for`/`done` quarante-cinq lignes plus bas — à
#    l'endroit où le `done` se retrouvait orphelin, pas à l'endroit du défaut.
# ⭐ Et `deployer-mana-bzh.sh` ne tombe pas dedans PAR CHANCE : son message
#    porte « n'est » ET « l'en-tête », soit DEUX apostrophes, qui se referment
#    l'une sur l'autre. Un compte PAIR passe, un compte IMPAIR casse — donc le
#    même défaut y dort, à un mot près.
: "${MANA_KS5:?MANA_KS5 est absente — voir deploiement/deployer-mana-bzh.sh}"
CIBLE_MANAHOME="${MANA_MANAHOME_CIBLE:-/srv/www-manahome/}"
CLE="${MANA_SSH_KEY:-$HOME/.ssh/id_ed25519}"

vert()  { printf '\033[32m%s\033[0m\n' "$*"; }
rouge() { printf '\033[31m%s\033[0m\n' "$*"; }

# ── 1. MANAHOME D'ABORD ─────────────────────────────────────────────────────
# ⭐ L'ORDRE N'EST PAS ARBITRAIRE. `deploy:bzh` reconstruit pour la racine
#    (étape 2 de son script) et laisse donc `site/` dans l'état BRETON. Si on
#    le lançait d'abord, le rsync vers manahome expédierait le build de
#    mana.bzh : des graphes cherchés en relatif sur un hôte qui n'en sert pas,
#    donc une carte vide — et un 200 partout.
printf '\033[1m→ 1/2  manahome.org\033[0m\n'
npm run build:manahome

[ -f site/index.html ] || { rouge "⛔ site/index.html absent : rien à déposer"; exit 1; }
MARQUEUR_HOME="$(grep -oE 'app/index-[A-Za-z0-9_-]+\.js' site/index.html | head -1)"
[ -n "$MARQUEUR_HOME" ] || { rouge "⛔ impossible de lire le bundle construit"; exit 1; }

# ⛔ AUCUN `--delete` ICI, ET C'EST VITAL. La racine de manahome n'appartient
#    pas à cette app : elle porte les 173 pages pays, l'index, la méthode, le
#    plan de site — écrits par `manahome-app`, un AUTRE dépôt. Un `--delete`
#    les emporterait toutes, et la perte ne se verrait qu'en 404.
# ⚠️ Le prix assumé : les bundles hachés des anciennes versions s'empilent
#    sous `app/`. Quelques centaines de Ko par déploiement, sans effet sur ce
#    qui est servi (l'index ne nomme que le dernier). Un ménage se fait à la
#    main, en connaissance — jamais par un `--delete` à la racine.
# ⚠️ `--rsync-path="sudo rsync"` : `/srv/www-manahome` n'appartient pas au
#    compte distant (voir manahome-app/scripts/deployer.sh).
# ⛔ `llms.txt` et `robots.txt` sont écrits par manahome-app et portent la
#    doctrine d'exploration du domaine. Les expédier d'ici les écraserait.
echo "→ envoi vers $CIBLE_MANAHOME …"
rsync -az --human-readable \
  --exclude 'robots.txt' --exclude 'llms.txt' \
  --rsync-path="sudo rsync" \
  -e "ssh -i $CLE -o IdentitiesOnly=yes -o ConnectTimeout=30" \
  site/ "$MANA_KS5:$CIBLE_MANAHOME"

# ⭐ Le bundle est le SEUL contrôle qui compte : `/`, `/carte`, `/composer`
#    rendent tous index.html et répondraient 200 en servant l'ancienne
#    version. Un nom de bundle tout neuf ne peut répondre 200 que s'il vient
#    d'arriver.
ECHECS=0
for u in / /carte /promenades "/$MARQUEUR_HOME"; do
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 25 "https://manahome.org$u" || echo 000)"
  if [ "$code" = "200" ]; then printf '  \033[32m%s\033[0m %s\n' "$code" "$u"
  else printf '  \033[31m%s\033[0m %s\n' "$code" "$u"; ECHECS=$((ECHECS + 1)); fi
done
[ "$ECHECS" = "0" ] || { rouge "⛔ $ECHECS URL ne répondent pas chez manahome"; exit 1; }
vert "✓ manahome.org sert cette version ($MARQUEUR_HOME)"

# ── 2. PUIS mana.bzh, avec tous ses gardes ──────────────────────────────────
# ⭐ On ne réécrit RIEN de ce qu'il fait : bloc Caddy, racine du bloc, rang de
#    @applove, ponts, build racine, vérification HTTP. Le dupliquer ici serait
#    fabriquer deux gardes qui divergent.
echo
printf '\033[1m→ 2/2  mana.bzh\033[0m\n'
npm run deploy:bzh

echo
vert "✓ les DEUX hôtes servent le commit $(git rev-parse --short HEAD)"
# ⚠️ « le même commit » est ce qu'on vient de déposer, pas ce qui est en
#    ligne : un travail non committé part aussi. C'est voulu — c'est la règle
#    du dépôt partout ailleurs — mais ça veut dire que cette ligne nomme un
#    commit, pas une preuve.
