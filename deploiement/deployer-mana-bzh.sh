#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# DÉPOSER CETTE APPLICATION SUR mana.bzh
# ═══════════════════════════════════════════════════════════════════════════
#
# 🔴 CE SCRIPT EXISTE PARCE QUE SON ABSENCE A COÛTÉ L'APPLICATION — 5/11/2026.
#
#    Du 01 au 05/11, mana.bzh servait cette app depuis `_app-bzh`, un dossier
#    rempli À LA MAIN une fois, que RIEN ne rafraîchissait. Pendant ce temps
#    chaque déploiement partait sur GitHub Pages. Le dossier a donc gelé au
#    2/11 — et le 5/11, une autre session a constaté « trois jours de contenu
#    périmé pour tous les visiteurs réels » et retiré la route.
#
# ⭐ SON DIAGNOSTIC ÉTAIT JUSTE. Un mécanisme sans entretien finit par être
#    retiré par quelqu'un de sensé, et c'est la bonne décision face à ce qu'il
#    voit. Ce qui manquait n'était pas de la vigilance, c'était CE FICHIER.
#    Remettre la route sans lui, c'était reprogrammer le même gel.
#
# ⛔ CE QUI N'EST PAS EXPÉDIÉ, ET POURQUOI
#    `robots.txt` et `llms.txt` sont dans le build et NE DOIVENT PAS PARTIR :
#    ceux du domaine portent la doctrine d'exploration et le cache des ~63 885
#    pages d'agrégat. Les écraser toucherait tout le référencement de mana.bzh,
#    pas seulement cette app. ⚠️ Cette consigne ne vivait jusqu'ici que dans un
#    commentaire de `collisions.test.ts` — c'est-à-dire nulle part où un
#    déploiement puisse la lire. Elle est désormais DANS le geste.
#
# ⚠️ `--delete` EST BORNÉ AU DOSSIER DE L'APP. La racine du domaine contient
#    14 534 entrées (les pages d'agrégat) ; `_app-bzh` est un sous-dossier qui
#    n'appartient qu'à nous. Le `--delete` y est non seulement sûr mais
#    nécessaire : sans lui, les bundles hachés des anciennes versions
#    s'empilent indéfiniment.
#
# ⚠️ ET LE BLOC CADDY N'EST PAS POSÉ PAR CE SCRIPT. Il vit sur la machine
#    (`/home/debian/bascule/mana-bzh-ks5.caddy`) et dans `manafrance-app`
#    (`infra/caddy/ks5/`), deux dépôts que celui-ci ne connaît pas. Ce script
#    CONTRÔLE qu'il est en place et refuse de se taire s'il manque — déposer
#    des fichiers que rien ne sert est le genre de succès qui endort.
#
# Usage :  npm run deploy:bzh          (construit puis dépose)
#          ./deploiement/deployer-mana-bzh.sh --verifier   (ne dépose rien)
set -euo pipefail

HOTE="${MANA_KS5:-debian@147.135.254.25}"
CLE="${MANA_SSH_KEY:-$HOME/.ssh/mana_scaleway}"
CIBLE="/home/debian/bascule/volumes/www/_app-bzh"
RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

vert()  { printf '\033[32m%s\033[0m\n' "$*"; }
rouge() { printf '\033[31m%s\033[0m\n' "$*"; }
ssh_()  { ssh -i "$CLE" -o IdentitiesOnly=yes -o ConnectTimeout=20 -o BatchMode=yes "$HOTE" "$@"; }

VERIFIER=0
[ "${1:-}" = "--verifier" ] && VERIFIER=1

cd "$RACINE"

# ── 1. le bloc Caddy du dépôt doit concorder avec les routes ────────────────
# Si `src/routes.ts` gagne une route et que le fragment ne suit pas, la page
# existera dans l'app et tombera sur le site d'agrégat en ligne : un 404 qui
# rend la coquille d'une AUTRE application. C'est ce qui est arrivé à
# /balades-office, resté invisible du 2 au 5/11.
node scripts/caddy-bloc.mjs --verifier

# ── 2. construire pour la RACINE, pas pour /mana/ ───────────────────────────
if [ "$VERIFIER" = "0" ]; then
  npm run build:racine
fi
[ -f site/index.html ] || { rouge "⛔ site/index.html absent : rien à déposer"; exit 1; }

# ⛔ LE BUILD DOIT ÊTRE CELUI DE LA RACINE. `npm run build` produit le même
#    dossier avec la base `/mana/` — déposer celui-là donnerait une page qui
#    charge ses bundles depuis /mana/app/… et n'affiche RIEN, sans erreur
#    serveur. Les deux builds se ressemblent trait pour trait dans `ls`.
if grep -q '"/mana/"' site/index.html || grep -q 'src="/mana/' site/index.html; then
  rouge "⛔ ce build porte la base /mana/ (GitHub Pages), pas la racine."
  rouge "   lancez : npm run build:racine"
  exit 1
fi

# ── 3. le bloc est-il POSÉ sur la machine ? ─────────────────────────────────
if ssh_ 'grep -q appbzh /home/debian/bascule/mana-bzh-ks5.caddy' 2>/dev/null; then
  vert "✓ le bloc @appbzh est en place sur le serveur"
else
  rouge "⛔ @appbzh est ABSENT du Caddyfile de production."
  rouge "   Déposer les fichiers ne servirait à rien : aucune URL ne les sert."
  rouge "   Posez le fragment deploiement/mana-bzh.caddy dans"
  rouge "   /home/debian/bascule/mana-bzh-ks5.caddy, puis rechargez Caddy."
  exit 1
fi

if [ "$VERIFIER" = "1" ]; then vert "✓ --verifier : rien n'a été déposé"; exit 0; fi

# ── 4. déposer ──────────────────────────────────────────────────────────────
rsync -az --delete \
  --exclude 'robots.txt' --exclude 'llms.txt' --exclude 'bretagne' \
  -e "ssh -i $CLE -o IdentitiesOnly=yes -o ConnectTimeout=30" \
  site/ "$HOTE:$CIBLE/"

# ── 5. VÉRIFIER EN HTTP RÉEL, pas au code de sortie de rsync ────────────────
# ⭐ « rsync a réussi » ne dit pas « la page est servie ». Entre les deux il y
#    a Caddy, un cache, et un bloc qui peut avoir changé depuis l'étape 3.
echo
MARQUEUR="$(grep -oE 'app/index-[A-Za-z0-9_-]+\.js' site/index.html | head -1)"
[ -n "$MARQUEUR" ] || { rouge "⛔ impossible de lire le nom du bundle construit"; exit 1; }

ECHECS=0
for u in / /carte /promenades /balades-office "/$MARQUEUR"; do
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 25 "https://mana.bzh$u" || echo 000)"
  if [ "$code" = "200" ]; then printf '  \033[32m%s\033[0m %s\n' "$code" "$u"
  else printf '  \033[31m%s\033[0m %s\n' "$code" "$u"; ECHECS=$((ECHECS + 1)); fi
done

# ⛔ Le bundle est le contrôle qui COMPTE : les quatre premières URL rendent
#    index.html et répondraient 200 même en servant l'ancienne version. Un
#    bundle au nom tout neuf ne peut répondre 200 que s'il vient d'arriver.
if [ "$ECHECS" != "0" ]; then
  rouge "⛔ $ECHECS URL ne répondent pas — l'ancienne version est peut-être encore servie"
  exit 1
fi
vert "✓ mana.bzh sert cette version ($MARQUEUR)"
