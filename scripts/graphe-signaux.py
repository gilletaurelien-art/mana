"""
Étape 2 du graphe : distance à la mer, agrément, accrochage des lieux.

Prend le brouillon de `graphe.py` et rend l'artefact que l'app consomme —
même forme que le graphe servi, décrite dans `src/composition.ts` :
`a = [nœudA, nœudB, mètres, agrément, points, dist. mer, dénivelé, marée]`.

⚠️ LE DÉNIVELÉ RESTE À `null`, À DESSEIN. Nous n'avons pas de modèle
   d'altitude, et le GPX de l'app le dit déjà (« Aucune altitude : nous n'en
   disposons pas »). Mettre un zéro serait affirmer du plat.

    python3 scripts/graphe-signaux.py <brouillon.json> <sortie.json>
"""
import json, math, sys, collections
R = 6371000.0

def m_par_deg(lat):
    return (111320.0 * math.cos(math.radians(lat)), 110540.0)

class Grille:
    """⭐ Un index spatial À LA MAIN plutôt qu'une dépendance. 112 traits de
       côte et 16 000 arêtes : une grille de cellules suffit, et elle se lit."""
    def __init__(self, pas_m=250):
        self.pas = pas_m; self.c = collections.defaultdict(list)
    def cle(self, lon, lat):
        kx, ky = m_par_deg(lat)
        return (int(lon * kx / self.pas), int(lat * ky / self.pas))
    def poser(self, lon, lat, charge):
        self.c[self.cle(lon, lat)].append((lon, lat, charge))
    def autour(self, lon, lat, rayon_cellules=1):
        x, y = self.cle(lon, lat)
        for dx in range(-rayon_cellules, rayon_cellules + 1):
            for dy in range(-rayon_cellules, rayon_cellules + 1):
                yield from self.c.get((x + dx, y + dy), ())

def dist_m(a, b):
    kx, ky = m_par_deg((a[1] + b[1]) / 2)
    return math.hypot((a[0] - b[0]) * kx, (a[1] - b[1]) * ky)

def projette(p, a, b):
    """Point le plus proche sur le segment [a,b], et la fraction le long."""
    kx, ky = m_par_deg(p[1])
    ax, ay = a[0] * kx, a[1] * ky
    bx, by = b[0] * kx, b[1] * ky
    px, py = p[0] * kx, p[1] * ky
    dx, dy = bx - ax, by - ay
    L2 = dx * dx + dy * dy
    t = 0.0 if L2 == 0 else max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / L2))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy)), t

src, dest = sys.argv[1], sys.argv[2]
b = json.load(open(src))
N, A = b["n"], b["a"]
print(f"{b['territoire']} — {len(N)} nœuds, {len(A)} arêtes, {len(b['lieux'])} lieux bruts")

# ── 1 · LA DISTANCE À LA MER ──────────────────────────────────────────────
# ⚠️ PLAFONNÉE À 2 km, comme le graphe servi : au-delà, `null`. Stocker une
#    distance de 14 km n'apprend rien et alourdit le fichier pour rien.
PLAFOND = 2000
cote = Grille(500)
for trait in b["cotes"]:
    for i in range(len(trait) - 1):
        a, c = trait[i], trait[i + 1]
        n = max(1, int(dist_m(a, c) / 120))
        for j in range(n + 1):  # on densifie : un segment de côte peut faire 1 km
            t = j / n
            cote.poser(a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, None)
print(f"  côte densifiée : {sum(len(v) for v in cote.c.values())} points")

def dmer(lon, lat):
    best = None
    for r in (1, 2, 4):
        for (x, y, _) in cote.autour(lon, lat, r):
            d = dist_m((lon, lat), (x, y))
            if best is None or d < best: best = d
        if best is not None and best <= r * 500: break
    return None if best is None or best > PLAFOND else round(best)

# ── 2 · L'AGRÉMENT ────────────────────────────────────────────────────────
# 🔴 CE BARÈME EST NEUF, ET IL FAUT LE DIRE. Celui du graphe servi n'existe
#    nulle part — ni dépôt ni serveur. Le reconstituer par rétro-ingénierie
#    aurait produit un chiffre PLAUSIBLE adossé à une méthode qu'on n'a pas
#    faite : le pire genre de faux témoin. Celui-ci est écrit, donc discutable.
# ⭐ La route n'est pas EXCLUE, elle est PÉNALISÉE — c'est le principe du
#    moteur : « coût = longueur ÷ agrément ». Exclure rendrait des secteurs
#    inatteignables ; pénaliser laisse le chemin possible et coûteux.
BASE = {"path": 170, "footway": 160, "track": 150, "bridleway": 150,
        "steps": 120, "pedestrian": 140, "cycleway": 120, "living_street": 100,
        "service": 70, "residential": 70, "unclassified": 75, "road": 70,
        "tertiary": 50, "secondary": 30, "primary": 15}
REVET = {"asphalt": -20, "concrete": -15, "paved": -10,
         "ground": +15, "dirt": +15, "earth": +15, "grass": +15,
         "sand": +10, "gravel": +5, "compacted": +5, "fine_gravel": +5}

def agrement(type_, revetement, d):
    v = BASE.get(type_, 60) + REVET.get(revetement, 0)
    if d is not None:                      # le bonus littoral, continu
        if d <= 60:    v += 70
        elif d <= 200: v += 50
        elif d <= 500: v += 30
        elif d <= 1000: v += 15
    return max(0, min(255, v))

neuves = []
for a in A:
    u, v, L, pts, type_, revet, maree = a
    mi = N[u]; mj = N[v]
    d = dmer((mi[0] + mj[0]) / 2, (mi[1] + mj[1]) / 2)
    neuves.append([u, v, L, agrement(type_, revet, d), pts, d, None, 1 if maree else 0])
print(f"  distance mer   : {sum(1 for a in neuves if a[5] is not None)} arêtes à moins de 2 km")

# ── 3 · LES LIEUX, ACCROCHÉS AU RÉSEAU ────────────────────────────────────
# ⛔ RAYON 150 m, ET CE N'EST PAS UN RÉGLAGE D'OPPORTUNITÉ. Au-delà, le lieu
#    n'est plus « sur le chemin » : il demande un détour, et l'annoncer comme
#    croisé serait exactement ce que la charte interdit.
RAYON = 150
seg = Grille(250)
for ia, a in enumerate(neuves):
    pts = a[4]
    for k in range(len(pts) - 1):
        p, q = N[pts[k]], N[pts[k + 1]]
        seg.poser((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (ia, k, p, q))

LIBELLE = {"plage": "Plage", "panorama": "Point de vue", "grotte": "Grotte",
           "source": "Source", "phare": "Phare", "calvaire": "Calvaire",
           "moulin": "Moulin", "ruine": "Ruines", "chapelle": "Chapelle",
           "lieu_de_culte": "Lieu de culte", "chateau": "Fortification",
           "megalithe": "Mégalithe"}
accroches, perdus = [], 0
for lon, lat, cat, nom in b["lieux"]:
    best = None
    for (_, _, (ia, k, p, q)) in seg.autour(lon, lat, 1):
        d, t = projette((lon, lat), p, q)
        if d <= RAYON and (best is None or d < best[0]):
            best = (d, ia, k, t)
    if best is None:
        perdus += 1; continue
    d, ia, k, t = best
    pts = neuves[ia][4]
    # ⚠️ `f` est une CLÉ D'ORDRE le long de l'arête, jamais une distance :
    #    la fraction du segment k, ramenée à l'arête entière.
    f = (k + t) / max(1, len(pts) - 1)
    accroches.append({"a": ia, "f": round(f, 3), "c": cat,
                      "n": nom or LIBELLE.get(cat, cat),
                      **({"anonyme": True} if not nom else {}),
                      "g": [round(lon, 5), round(lat, 5)], "d": round(d)})
print(f"  lieux accrochés: {len(accroches)} ({perdus} à plus de {RAYON} m d'un chemin, écartés)")

json.dump({"genere": b["genere"], "territoire": b["territoire"],
           "attribution": "© les contributeurs OpenStreetMap (ODbL)",
           "bareme": "mana-2026-10-31",
           "n": N, "a": neuves, "l": accroches},
          open(dest, "w"), separators=(",", ":"))
import os
print(f"  écrit          : {dest} — {os.path.getsize(dest)/1024/1024:.2f} Mo")
