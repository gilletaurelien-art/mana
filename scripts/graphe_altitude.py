#!/usr/bin/env python3
"""
Étape 3 du graphe : l'altitude — dz ET montée le long de la géométrie.

⭐ REPRIS DE `manafrance-app/pipeline/04_denivele.py` (28-29/10/2026), qui a
   payé les leçons qu'on réutilise ici telles quelles :

🔴 LE dz ENTRE EXTRÉMITÉS NE SUFFIT PAS — mesuré le 29/10 sur la boucle de
   l'Arrée : la montée réelle le long de la géométrie vaut 242 m quand la
   somme des dz d'arêtes n'en rend que 137. L'approximation perd 43 % de la
   montée, parce qu'elle ignore chaque bosse INTÉRIEURE à une arête. D'où
   DEUX champs par arête :
     · case 6 : dz, net, dans le sens a→b (ce que le format promettait) ;
     · case 8 : montée cumulée en marchant de a vers b.
   Dans l'autre sens, la montée vaut EXACTEMENT `montee_ab − dz` : ce qui se
   descend dans un sens moins le net est ce qui se grimpe dans l'autre.

🔴 LE DOMAINE EST ACCEPTÉ EN POSITIF. L'océan est codé −48 m dans ces dalles
   (mesuré sur N48W005) : une borne basse à −10 le tient dehors. L'élargir
   « pour les estrans » rendrait l'océan valide et poserait une falaise de
   90 m sous chaque sentier côtier.

⚠️ PAS d'interpolation bilinéaire : à 30 m de résolution elle lisserait des
   pentes réelles, et un VIDE interpolé devient une altitude plausible, donc
   indétectable. Échantillon le plus proche.

⚠️ UNE PENTE > 50 % SE REFUSE, NE S'ÉCRÊTE PAS. Écrêter inventerait une pente
   plausible ; `null` dit « je ne sais pas », ce qui est la vérité. Mesuré
   côté pipeline : 100 % des refus portaient sur des arêtes ≤ 30 m — sous le
   pas du MNT, ce garde refuse de la RÉSOLUTION, pas du terrain.

⚠️ UNE DALLE ABSENTE N'EST PAS PLATE, un nœud sans altitude n'est pas à zéro :
   l'arête reste à `null` et le moteur n'y compte rien.

    python3 scripts/graphe_altitude.py <graphe.json> <dossier-dalles> <sortie.json>
"""
import json, math, os, sys
from array import array

COTE = 3601          # SRTM 1 seconde d'arc : 3601 × 3601 échantillons
VIDE = -32768
ALT_MIN, ALT_MAX = -10.0, 420.0   # Bretagne : Roc'h Ruz 385 m, marge à 420
PENTE_MAX = 0.5


def nom_dalle(lat, lon):
    ns = "N" if lat >= 0 else "S"
    ew = "E" if lon >= 0 else "W"
    return f"{ns}{abs(lat):02d}{ew}{abs(lon):03d}"


def charger_dalle(dossier, lat, lon):
    local = os.path.join(dossier, f"{nom_dalle(lat, lon)}.hgt")
    if not os.path.exists(local):
        return None
    with open(local, "rb") as f:
        brut = f.read()
    if len(brut) != COTE * COTE * 2:
        print(f"  ⚠️ {nom_dalle(lat, lon)} : {len(brut)} octets, {COTE*COTE*2} attendus — écartée")
        return None
    a = array("h"); a.frombytes(brut); a.byteswap()   # SRTM est big-endian
    return a


def altitude(dalle, lat, lon, lat0, lon0):
    li = int(round((lat - lat0) * (COTE - 1)))
    co = int(round((lon - lon0) * (COTE - 1)))
    if not (0 <= li < COTE and 0 <= co < COTE):
        return None
    v = dalle[(COTE - 1 - li) * COTE + co]   # ligne 0 = bord NORD
    if v == VIDE or not (ALT_MIN <= v <= ALT_MAX):
        return None
    return float(v)


def poser_altitudes(noeuds, dossier):
    """Altitude de chaque nœud — une dalle à la fois, rangés d'abord."""
    par_dalle = {}
    for i, (x, y) in enumerate(noeuds):
        par_dalle.setdefault((int(math.floor(y)), int(math.floor(x))), []).append(i)
    alts = array("f", bytes(4 * len(noeuds)))
    pose = bytearray(len(noeuds))
    for (la, lo), indices in sorted(par_dalle.items()):
        dalle = charger_dalle(dossier, la, lo)
        if dalle is None:
            print(f"  ⚠️ dalle {nom_dalle(la, lo)} ABSENTE — {len(indices)} nœuds sans altitude")
            continue
        pris = 0
        for i in indices:
            v = altitude(dalle, noeuds[i][1], noeuds[i][0], la, lo)
            if v is not None:
                alts[i] = v; pose[i] = 1; pris += 1
        print(f"  {nom_dalle(la, lo)} : {pris} nœuds posés sur {len(indices)}")
        del dalle
    return alts, pose


def remplir(g, dossier):
    """Pose dz (case 6) et montée a→b (case 8) sur chaque arête du graphe SERVI."""
    noeuds, aretes = g["n"], g["a"]
    alts, pose = poser_altitudes(noeuds, dossier)
    couverts = sum(pose)
    print(f"  altitudes : {couverts}/{len(noeuds)} nœuds ({100*couverts/len(noeuds):.2f} %)")

    stats = dict(posees=0, sans=0, refusees=0)
    hist = {"plat (≤5 m)": 0, "6–20 m": 0, "21–50 m": 0, "> 50 m": 0}
    for e in aretes:
        ia, ib, m, pts = e[0], e[1], e[2], e[4]
        # ⚠️ Garde de STRUCTURE : la polyligne doit relier a à b, sinon la
        #    montée serait calculée sur un autre chemin que celui qu'on marche
        #    — le défaut du 2/11 (le tracé mesuré n'était pas celui marché).
        if pts[0] != ia or pts[-1] != ib:
            raise SystemExit(f"arête {ia}→{ib} : la polyligne commence à {pts[0]} et finit à {pts[-1]}")
        while len(e) < 9:
            e.append(None)
        if not (pose[ia] and pose[ib]):
            e[6] = None; e[8] = None; stats["sans"] += 1
            continue
        dz = alts[ib] - alts[ia]
        if m > 0 and abs(dz) / m > PENTE_MAX:
            e[6] = None; e[8] = None; stats["refusees"] += 1
            continue
        e[6] = round(dz, 1)
        if all(pose[i] for i in pts):
            grimpe = 0.0
            for j in range(1, len(pts)):
                d = alts[pts[j]] - alts[pts[j - 1]]
                if d > 0:
                    grimpe += d
            e[8] = round(grimpe, 1)
        else:
            e[8] = None   # un point inconnu et la montée est INCONNUE, pas nulle
        stats["posees"] += 1
        d = abs(dz)
        hist["plat (≤5 m)" if d <= 5 else "6–20 m" if d <= 20 else "21–50 m" if d <= 50 else "> 50 m"] += 1

    print(f"  arêtes : {stats['posees']} posées · {stats['sans']} sans altitude · "
          f"{stats['refusees']} refusées (pente > {PENTE_MAX:.0%} = sous la résolution du MNT)")
    for k, v in hist.items():
        print(f"    {k:<12} {v}")
    # ⭐ Un remplissage quasi vide doit CRIER, pas réussir : une dalle manquante
    #    produirait un graphe « avec altitude » où rien ne monte jamais.
    if stats["posees"] < 0.95 * len(aretes):
        raise SystemExit(f"🔴 seulement {stats['posees']}/{len(aretes)} arêtes posées — dalles manquantes ?")
    return alts, pose, stats


if __name__ == "__main__":
    src, dalles, dest = sys.argv[1], sys.argv[2], sys.argv[3]
    g = json.load(open(src))
    print(f"altitude — {g.get('territoire', src)}")
    remplir(g, dalles)
    json.dump(g, open(dest, "w"), separators=(",", ":"))
    print(f"  écrit : {dest}")
