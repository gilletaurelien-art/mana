#!/usr/bin/env python3
"""
Bâtit le graphe piéton d'un territoire depuis un extrait OpenStreetMap.

⭐ POURQUOI CE SCRIPT EXISTE. Celui qui a produit `crozon.json` le 28/10/2026
   n'est NI dans ce dépôt NI sur le VPS — cherché dans les deux. Il a été
   écrit dans un répertoire de travail et perdu avec lui. Le graphe servi est
   donc un artefact qu'on ne sait plus refaire : la définition même d'une
   dette. Celui-ci se rejoue.

⚠️ IL NE TOURNE PAS SUR LA MACHINE DE PRODUCTION. La jointure spatiale de
   l'ancien pipeline avait saturé le VPS le 28/10 — 5,9 cœurs sur 6. Ici tout
   se fait sur un poste de travail, à partir d'un extrait Geofabrik, et le
   serveur ne reçoit que le fichier produit.

⭐ COUPER LES CHEMINS AUX NŒUDS PARTAGÉS EST L'ÉTAPE QUI COMPTE. Sans elle,
   deux sentiers qui se croisent ne se touchent pas, aucune boucle ne se ferme,
   et on obtient une collection de tracés au lieu d'un réseau. C'est la
   différence entre une carte et un graphe.

    python3 scripts/graphe.py <extrait.pbf> <nom> <sortie.json>
"""
import json, math, sys, collections
from datetime import date
import osmium

R = 6371000.0

# ── CE QUI SE MARCHE ──────────────────────────────────────────────────────
# ⛔ `motorway` et `trunk` sont ABSENTS À DESSEIN : on n'envoie personne sur une
#    voie rapide, même si OSM n'y interdit pas formellement le piéton.
MARCHABLE = {
    "path", "footway", "track", "steps", "pedestrian", "bridleway",
    "cycleway", "living_street", "residential", "service", "unclassified",
    "tertiary", "secondary", "primary", "road",
}
# ⚠️ L'accès privé se lit sur le chemin, pas sur son type : un `track` peut
#    être une allée de ferme fermée, un `footway` un passage toléré.
FERME = {"private", "no"}

# ── LES DOUZE CATÉGORIES DE LIEUX ─────────────────────────────────────────
# ⚠️ Reprises du graphe servi, pas inventées : ce sont celles que l'app sait
#    nommer (`categories.ts`). En ajouter une ici sans l'ajouter là-bas
#    produirait des lieux affichés sous leur clé technique.
def categorie(t):
    g = t.get
    if g("natural") == "beach": return "plage"
    if g("tourism") == "viewpoint": return "panorama"
    if g("natural") == "cave_entrance": return "grotte"
    if g("natural") == "spring": return "source"
    if g("man_made") == "lighthouse": return "phare"
    if g("historic") in ("wayside_cross",) or g("man_made") == "cross": return "calvaire"
    if g("man_made") in ("windmill", "watermill") or g("historic") == "watermill": return "moulin"
    if g("historic") == "ruins" or g("ruins") == "yes": return "ruine"
    if g("building") == "chapel": return "chapelle"
    if g("amenity") == "place_of_worship": return "lieu_de_culte"
    if g("historic") in ("castle", "fort", "city_gate") or g("military") == "bunker" \
       or g("historic") == "battery" or g("defensive_works"): return "chateau"
    if g("historic") in ("megalith", "dolmen", "menhir", "tomb", "standing_stone") \
       or g("megalith_type") or (g("historic") == "archaeological_site"
                                 and g("site_type") in ("megalith", "tumulus", "fortification")):
        return "megalithe"
    return None

LIBELLE = {"plage": "Plage", "panorama": "Point de vue", "grotte": "Grotte",
           "source": "Source", "phare": "Phare", "calvaire": "Calvaire",
           "moulin": "Moulin", "ruine": "Ruines", "chapelle": "Chapelle",
           "lieu_de_culte": "Lieu de culte", "chateau": "Fortification",
           "megalithe": "Mégalithe"}


class Moisson(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.chemins = []      # (liste de (ref, lon, lat), tags)
        self.cotes = []        # listes de (lon, lat)
        self.lieux = []        # (lon, lat, categorie, nom)

    def node(self, n):
        c = categorie(n.tags)
        if c:
            self.lieux.append((n.location.lon, n.location.lat, c, n.tags.get("name")))

    def way(self, w):
        t = dict(w.tags)
        if t.get("natural") == "coastline":
            try:
                self.cotes.append([(n.lon, n.lat) for n in w.nodes if n.location.valid()])
            except osmium.InvalidLocationError:
                pass
            return
        h = t.get("highway")
        if h in MARCHABLE and t.get("access") not in FERME and t.get("foot") not in FERME:
            try:
                pts = [(n.ref, n.lon, n.lat) for n in w.nodes if n.location.valid()]
            except osmium.InvalidLocationError:
                return
            if len(pts) >= 2:
                self.chemins.append((pts, t))
            return
        # un lieu peut être une SURFACE (une plage, un fort) : on prend son centre
        c = categorie(t)
        if c:
            try:
                pts = [(n.lon, n.lat) for n in w.nodes if n.location.valid()]
            except osmium.InvalidLocationError:
                return
            if pts:
                self.lieux.append((sum(p[0] for p in pts) / len(pts),
                                   sum(p[1] for p in pts) / len(pts), c, t.get("name")))


def metres(a, b):
    """Distance en mètres, projection locale — exacte à cette échelle."""
    k = math.cos(math.radians((a[1] + b[1]) / 2))
    return math.hypot((a[0] - b[0]) * k, a[1] - b[1]) * math.pi / 180 * R


def bati(src, nom, dest):
    m = Moisson()
    m.apply_file(src, locations=True)
    print(f"  moissonné : {len(m.chemins)} chemins · {len(m.cotes)} traits de côte · {len(m.lieux)} lieux bruts")

    # ── 1 · LES NŒUDS PARTAGÉS ────────────────────────────────────────────
    usage = collections.Counter()
    for pts, _ in m.chemins:
        for i, (ref, _, _) in enumerate(pts):
            # une extrémité est un nœud du graphe même si elle n'est partagée
            # par personne : c'est là que le chemin s'arrête.
            usage[ref] += 2 if i in (0, len(pts) - 1) else 1

    noeuds, index = [], {}
    def idx(ref, lon, lat):
        if ref not in index:
            index[ref] = len(noeuds)
            noeuds.append([round(lon, 6), round(lat, 6)])
        return index[ref]

    # ── 2 · LA COUPE ──────────────────────────────────────────────────────
    aretes = []
    for pts, t in m.chemins:
        debut = 0
        for i in range(1, len(pts)):
            coupe = usage[pts[i][0]] >= 2 or i == len(pts) - 1
            if not coupe:
                continue
            tronc = pts[debut:i + 1]
            L = sum(metres(tronc[j][1:], tronc[j + 1][1:]) for j in range(len(tronc) - 1))
            if L > 0:
                a = idx(*tronc[0]); b = idx(*tronc[-1])
                if a != b or L > 20:  # on garde les micro-boucles utiles, pas les doublons nuls
                    aretes.append([a, b, round(L, 1),
                                   [idx(*p) for p in tronc], t.get("highway"),
                                   t.get("surface"), t.get("tidal") == "yes"])
            debut = i
    print(f"  réseau    : {len(noeuds)} nœuds · {len(aretes)} arêtes · {sum(a[2] for a in aretes)/1000:.0f} km")
    return m, noeuds, aretes


if __name__ == "__main__":
    src, nom, dest = sys.argv[1], sys.argv[2], sys.argv[3]
    print(f"territoire « {nom} » — {src}")
    m, noeuds, aretes = bati(src, nom, dest)
    json.dump({"brouillon": True, "genere": str(date.today()), "territoire": nom,
               "n": noeuds, "a": aretes, "cotes": m.cotes, "lieux": m.lieux},
              open(dest, "w"), separators=(",", ":"))
    print(f"  écrit     : {dest}")
