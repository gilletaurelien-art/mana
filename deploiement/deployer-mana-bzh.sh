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
#    (le fichier que `MANA_BZH_CADDY` désigne) et dans `manafrance-app`
#    (`infra/caddy/ks5/`), deux dépôts que celui-ci ne connaît pas. Ce script
#    CONTRÔLE qu'il est en place et refuse de se taire s'il manque — déposer
#    des fichiers que rien ne sert est le genre de succès qui endort.
#
# Usage :  npm run deploy:bzh          (construit puis dépose)
#          ./deploiement/deployer-mana-bzh.sh --verifier   (ne dépose rien)
set -euo pipefail

RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ══ OÙ L'ON DÉPOSE — HORS DE CE FICHIER ═══════════════════════════════════
#
# 🔴 CE DÉPÔT EST PUBLIC (GitHub Pages l'exige), ET J'AI MIS UNE JOURNÉE À LE
#    VÉRIFIER. La première version écrivait ici l'adresse du serveur, son
#    utilisateur et l'arborescence de production. Aucun secret — l'accès est
#    par clé, le mot de passe est refusé — mais du renseignement offert sur
#    une page indexée : une adresse, un compte, les chemins.
# ⭐ LA VALEUR PAR DÉFAUT EST LE PIÈGE. Un `${VAR:-valeur}` a l'air
#    paramétrable et publie quand même : il rend la variable facultative,
#    donc personne ne la pose, donc c'est la valeur écrite qui sert. Ici
#    elles sont EXIGÉES — le script refuse de tourner sans elles, ce qui est
#    la seule façon qu'un paramètre soit vraiment un paramètre.
#
# Posez-les dans votre environnement, ou dans `deploiement/cible.local.sh`,
# qui est hors git :
#
#     MANA_KS5=utilisateur@adresse
#     MANA_BZH_CIBLE=/chemin/du/dossier/_app-bzh
#     MANA_BZH_CADDY=/chemin/du/fichier.caddy
#     MANA_SSH_KEY=$HOME/.ssh/votre_cle        # facultatif
#
# 🔴 LE FICHIER LOCAL EST UN DÉFAUT, PAS UN ÉCRASEMENT — corrigé le
#    6/11/2026. L'en-tête promet « posez-les dans votre environnement, OU dans
#    cible.local.sh » ; le `.` les écrasait toutes, donc la première branche
#    de cette phrase était fausse depuis toujours.
# ⭐ Trouvé en essayant d'ÉPROUVER un garde : je voulais le confronter à une
#    copie du Caddyfile serveur, et il a comparé le vrai fichier sans rien
#    dire. Un garde qu'on ne peut pas pointer ailleurs est un garde qu'on ne
#    peut pas voir refuser — et ce dépôt sait ce que vaut un garde jamais vu
#    refuser.
if [ -f "$RACINE/deploiement/cible.local.sh" ]; then
  _ks5="${MANA_KS5-}"; _cible="${MANA_BZH_CIBLE-}"; _caddy="${MANA_BZH_CADDY-}"; _cle="${MANA_SSH_KEY-}"
  . "$RACINE/deploiement/cible.local.sh"
  [ -n "$_ks5" ]   && MANA_KS5="$_ks5"
  [ -n "$_cible" ] && MANA_BZH_CIBLE="$_cible"
  [ -n "$_caddy" ] && MANA_BZH_CADDY="$_caddy"
  [ -n "$_cle" ]   && MANA_SSH_KEY="$_cle"
fi

: "${MANA_KS5:?⛔ MANA_KS5 n'est pas posée — voir l'en-tête de ce script}"
: "${MANA_BZH_CIBLE:?⛔ MANA_BZH_CIBLE n'est pas posée — voir l'en-tête de ce script}"
: "${MANA_BZH_CADDY:?⛔ MANA_BZH_CADDY n'est pas posée — voir l'en-tête de ce script}"

HOTE="$MANA_KS5"
CLE="${MANA_SSH_KEY:-$HOME/.ssh/id_ed25519}"
CIBLE="$MANA_BZH_CIBLE"

vert()  { printf '\033[32m%s\033[0m\n' "$*"; }
rouge() { printf '\033[31m%s\033[0m\n' "$*"; }
# ⚠️ Un état ATTENDU mais pas final n'est ni un succès vert ni une panne
# rouge : mana.love sans @applove avant la bascule est légitime. Lui donner
# la couleur du succès le ferait passer pour fini ; celle de l'erreur ferait
# refuser un déploiement sain.
note()  { printf '\033[33m%s\033[0m\n' "$*"; }
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

# ── 3. le bloc en ligne PORTE-T-IL LES MÊMES CHEMINS ? ──────────────────────
# 🔴 CE GARDE NE VÉRIFIAIT QUE LA PRÉSENCE DU MOT `appbzh` — corrigé le
#    6/11/2026, après l'avoir vu dire « ✓ en place » le matin même alors qu'il
#    manquait `/l-application` au serveur. C'est moi qui l'ai trouvé en
#    comparant les deux fichiers à la main, pas lui.
# ⭐ UN GARDE QUI VÉRIFIE QU'UNE CHOSE EXISTE NE DIT RIEN DE CE QU'ELLE
#    CONTIENT. Celui-ci aurait signé un bloc amputé de trois chemins : les
#    pages existeraient dans l'application et tomberaient sur l'app
#    historique — un 404 qui rend la coquille d'un AUTRE produit, sans la
#    moindre erreur serveur. C'est exactement l'accident de /balades-office,
#    resté invisible du 2 au 5/11, que l'étape 1 empêche CÔTÉ DÉPÔT et que
#    personne ne surveillait CÔTÉ MACHINE.
# ⚠️ LES DEUX SENS COMPTENT. Un chemin qui MANQUE rend l'ancienne app ; un
#    chemin EN TROP vole une adresse aux 63 885 pages d'agrégat et leur rend
#    notre coquille — « les balades » servies à qui demandait « les
#    associations à Abbeville ». Le second est le pire : il a l'air de marcher.
chemins_du() { tr ' ' '\n' | grep -E '^/' | LC_ALL=C sort -u; }

# 🔴 DEUX BLOCS DEPUIS LE 7/11/2026 — @appbzh (mana.bzh) et @applove
#    (mana.love), ce dernier sans `/balades-office`. On contrôle LES DEUX :
#    ne vérifier que le premier laisserait @applove dériver en silence, et
#    c'est précisément sur mana.love que le chemin de l'Office ne doit pas
#    revenir — il y rendrait une page dont cet hôte n'a pas la matière.
# ⚠️ @applove peut être ABSENT du serveur tant que la bascule n'est pas faite :
#    c'est un état légitime, pas une panne. On ne refuse que s'il EXISTE et
#    diverge. ⭐ Un garde qui exige l'état final avant qu'on y soit empêche
#    d'y aller.
lire_bloc() { ssh_ "awk '/$1[[:space:]]*\\{/,/^[[:space:]]*\\}/' $(printf '%q' "$MANA_BZH_CADDY") | grep -E '^[[:space:]]*path '" 2>/dev/null || true; }

EN_LIGNE="$(lire_bloc @appbzh)"
if [ -z "$EN_LIGNE" ]; then
  rouge "⛔ @appbzh est ABSENT du Caddyfile de production (ou sa ligne `path`)."
  rouge "   Déposer les fichiers ne servirait à rien : aucune URL ne les sert."
  rouge "   Posez le fragment deploiement/mana-bzh.caddy dans"
  rouge "   \$MANA_BZH_CADDY sur le serveur, puis rechargez Caddy."
  exit 1
fi

ATTENDU="$(grep -E '^[[:space:]]*path ' deploiement/mana-bzh.caddy | chemins_du)"
OBTENU="$(printf '%s\n' "$EN_LIGNE" | chemins_du)"
MANQUE="$(comm -23 <(printf '%s\n' "$ATTENDU") <(printf '%s\n' "$OBTENU"))"
EN_TROP="$(comm -13 <(printf '%s\n' "$ATTENDU") <(printf '%s\n' "$OBTENU"))"

if [ -n "$MANQUE" ] || [ -n "$EN_TROP" ]; then
  rouge "⛔ le bloc @appbzh EN LIGNE ne porte pas les mêmes chemins que le dépôt."
  [ -n "$MANQUE" ]  && { rouge "   MANQUENT sur le serveur (l'ancienne app répondra) :"; printf '     %s\n' $MANQUE; }
  [ -n "$EN_TROP" ] && { rouge "   EN TROP sur le serveur (adresses volées aux pages d'agrégat) :"; printf '     %s\n' $EN_TROP; }
  rouge "   Mettez à jour \$MANA_BZH_CADDY, puis : sudo caddy validate --config /etc/caddy/Caddyfile"
  rouge "   --adapter caddyfile && sudo systemctl reload caddy"
  exit 1
fi
vert "✓ le bloc @appbzh porte les $(printf '%s\n' "$ATTENDU" | wc -l | tr -d ' ') chemins attendus"

# 🔴 ET LA RACINE, QUE CE GARDE NE LISAIT PAS — ajouté le 7/11 au soir.
#    Il comparait les `path` des deux blocs et jamais leur `root`. Le dépôt
#    écrivait `/srv/www/_app-bzh`, qui N'EXISTE PAS sur le KS-5 ; la
#    production sert depuis `/home/debian/bascule/volumes/www/_app-bzh` depuis
#    la bascule du 2/11. La divergence a vécu cinq jours.
# ⛔ Elle n'est pas théorique : qui aurait reposé le fragment du dépôt aurait
#    servi un dossier vide — 404 sur toute l'application, sur les deux hôtes.
# ⭐ Et c'est le même aveuglement que partout ailleurs aujourd'hui : un garde
#    qui vérifie une PARTIE de ce qu'il prétend garder endort sur le reste.
RACINE_DEPOT="$(grep -m1 -E '^[[:space:]]*root \*' deploiement/mana-bzh.caddy | awk '{print $3}')"
RACINE_SERVEUR="$(ssh_ "grep -A4 'handle @appbzh' $(printf '%q' "$MANA_BZH_CADDY") | grep -m1 -E '^[[:space:]]*root \*' | awk '{print \$3}'" 2>/dev/null || true)"
if [ -z "$RACINE_SERVEUR" ]; then
  note "· racine du bloc @appbzh illisible sur le serveur — comparaison sautée."
elif [ "$RACINE_DEPOT" != "$RACINE_SERVEUR" ]; then
  rouge "⛔ la racine du bloc DIVERGE entre le dépôt et le serveur."
  rouge "   dépôt   : $RACINE_DEPOT"
  rouge "   serveur : $RACINE_SERVEUR"
  rouge "   Reposer le fragment servirait un dossier vide — 404 sur toute l'app."
  exit 1
else
  vert "✓ la racine du bloc concorde ($RACINE_SERVEUR)"
fi

# ── 3bis. et @applove, s'il est déjà posé ───────────────────────────────────
LOVE_EN_LIGNE="$(lire_bloc @applove)"
if [ -n "$LOVE_EN_LIGNE" ]; then
  LOVE_ATTENDU="$(awk '/@applove[[:space:]]*\{/,/^[[:space:]]*\}/' deploiement/mana-bzh.caddy | grep -E '^[[:space:]]*path ' | chemins_du)"
  LOVE_OBTENU="$(printf '%s\n' "$LOVE_EN_LIGNE" | chemins_du)"
  LOVE_MANQUE="$(comm -23 <(printf '%s\n' "$LOVE_ATTENDU") <(printf '%s\n' "$LOVE_OBTENU"))"
  LOVE_TROP="$(comm -13 <(printf '%s\n' "$LOVE_ATTENDU") <(printf '%s\n' "$LOVE_OBTENU"))"
  if [ -n "$LOVE_MANQUE" ] || [ -n "$LOVE_TROP" ]; then
    rouge "⛔ le bloc @applove EN LIGNE ne porte pas les mêmes chemins que le dépôt."
    [ -n "$LOVE_MANQUE" ] && { rouge "   MANQUENT sur mana.love :"; printf '     %s\n' $LOVE_MANQUE; }
    [ -n "$LOVE_TROP" ]   && { rouge "   EN TROP sur mana.love (dont peut-être l'Office, qui n'y existe pas) :"; printf '     %s\n' $LOVE_TROP; }
    exit 1
  fi
  vert "✓ le bloc @applove porte les $(printf '%s\n' "$LOVE_ATTENDU" | wc -l | tr -d ' ') chemins attendus"

  # 🔴 ET SA POSITION, QUI EST TOUT L'ENJEU — ajouté le 7/11 au soir, après
  #    qu'une relecture a remarqué que ce garde vérifiait l'ENSEMBLE des
  #    chemins et jamais leur RANG.
  # ⛔ Les `handle` d'un même site sont mutuellement exclusifs et évalués DANS
  #    L'ORDRE DU FICHIER. `@manalove` est un attrape-tout : placé avant
  #    `@applove`, il gagne sur tout et l'application n'est jamais atteinte.
  # ⭐ Et l'échec serait MUET : mana.love répondrait 200 sur /carte et
  #    /promenades, avec une page d'accueil qui s'affiche très bien. Les
  #    chemins seraient tous là, le garde d'au-dessus serait vert, et le
  #    produit serait mort. Un garde qui vérifie la liste sans le rang vérifie
  #    la moitié qui ne décide pas.
  RANG_APPLOVE="$(ssh_ "grep -n '@applove[[:space:]]*{' $(printf '%q' "$MANA_BZH_CADDY") | head -1 | cut -d: -f1" 2>/dev/null || true)"
  RANG_MANALOVE="$(ssh_ "grep -n '@manalove[[:space:]]*{' $(printf '%q' "$MANA_BZH_CADDY") | head -1 | cut -d: -f1" 2>/dev/null || true)"
  if [ -z "$RANG_APPLOVE" ] || [ -z "$RANG_MANALOVE" ]; then
    note "· impossible de relever le rang des deux blocs — vérification d'ordre sautée."
  elif [ "$RANG_APPLOVE" -gt "$RANG_MANALOVE" ]; then
    rouge "⛔ @applove (ligne $RANG_APPLOVE) est APRÈS l'attrape-tout @manalove (ligne $RANG_MANALOVE)."
    rouge "   mana.love rendrait la coquille sur /carte et /promenades — en 200,"
    rouge "   avec une page qui s'affiche. Déplacez @applove AVANT @manalove."
    exit 1
  else
    vert "✓ @applove (ligne $RANG_APPLOVE) précède bien @manalove (ligne $RANG_MANALOVE)"
  fi
else
  note "· @applove absent du serveur — mana.love ne sert pas encore l'application (état attendu avant la bascule)."
fi

# ── 3ter. les ponts vers l'autre application sont-ils déclarés tels qu'ils sont ?
# 🔴 LE SEUL GARDE DES PONTS QUI PUISSE MORDRE. `src/passerelle.ts` déclare
#    quels chemins de mana.love sont EN LIGNE chez l'autre app, et un bouton
#    de notre barre en dépend. Mutation faite le 7/11 : déclarer `/chat` en
#    ligne à tort laisse les 53 tests VERTS — ils tournent sans réseau.
# ⭐ ET L'ERREUR EST ARRIVÉE LE JOUR MÊME : « /chat existe » était vrai du
#    dépôt et faux de l'hôte. Un commit dit qu'un travail est FAIT, pas qu'il
#    est ARRIVÉ. Le déploiement est le moment où la déclaration rencontre
#    l'hôte : c'est ici que ça se vérifie, pas dans `npm test`.
# ⚠️ Il ne bloque PAS le déploiement — il ne décide que de boutons, et refuser
#    d'expédier une carte réparée parce qu'un bouton voisin ment serait pire
#    que le mensonge. Il parle fort, et c'est tout ce qu'on lui demande.
if ! node scripts/verifier-ponts.mjs; then
  note "· un pont est déclaré autrement qu'il n'est — corrigez src/passerelle.ts puis redéployez."
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
