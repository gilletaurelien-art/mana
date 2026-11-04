#!/usr/bin/env python3
"""
Recense les sites remarquables d'un territoire depuis un extrait OpenStreetMap.

⭐ C'EST LA MOITIÉ QUE MANA APPORTE. L'Office de tourisme a les circuits
   balisés — 46, dont il répond. Personne n'a la liste de ce qu'on CROISE.
   Relevé le 31/10/2026 : 769 objets nommés sur la communauté de communes, et
   plusieurs centaines que personne n'a nommés.

⛔ UNE CATÉGORIE N'EST PAS UN SUJET, et ce fichier est écrit contre ça.
   `amenity=drinking_water` compte 30 occurrences : ce sont des robinets.
   `historic=milestone` en compte 27, dont ZÉRO nommé : ce sont des bornes.
   `natural=cliff` en compte 48 : ce sont des LIGNES de falaise, pas des
   lieux. Les retenir ferait un inventaire de 1 880 « sites remarquables »
   dont personne ne voudrait. La liste ci-dessous est donc une DÉCISION, pas
   un filtre technique — elle se discute, et c'est pour ça qu'elle est ici.

⛔ ET ON COMPTE DES OBJETS, PAS DES ÉTIQUETTES. Un fort porte souvent
   `historic=fort` ET `building=bunker` ; un menhir, `megalith_type=menhir` ET
   `historic=archaeological_site`. Sommer les étiquettes gonfle l'inventaire
   d'un tiers sans ajouter un seul lieu. Chaque objet reçoit UNE catégorie,
   par ordre de priorité — la plus précise gagne.

    python3 scripts/lieux.py <extrait.pbf> <sortie.json>
"""
import json, sys, math, collections
from datetime import date
import osmium

# ── L'ORDRE EST LA PRIORITÉ : la première règle qui mord l'emporte ────────
#    ⚠️ Du plus précis au plus général. `megalithe` avant `archeologie`,
#       sinon tous les menhirs deviendraient des « sites archéologiques ».
REGLES = [
    ("megalithe",     lambda t: t.get("megalith_type") or t.get("historic") in ("dolmen","menhir","tumulus","standing_stone")),
    ("archeologie",   lambda t: t.get("historic") == "archaeological_site"),
    ("fortification", lambda t: t.get("historic") in ("fort","battery","castle","city_gate","manor","tower")
                             or t.get("building") == "bunker" or t.get("military") in ("bunker","naval_base")),
    ("phare",         lambda t: t.get("man_made") == "lighthouse"),
    ("moulin",        lambda t: t.get("man_made") in ("windmill","watermill") or t.get("historic") == "watermill"),
    # 🔴 UNE SEULE RÈGLE POUR LES TROIS — 5/11/2026, arbitrage du fondateur :
    #    « rassemble au sein de lieux de culte les églises et chapelles ».
    #    ⭐ Et la donnée disait déjà qu'ils n'en faisaient qu'un. Les trois
    #       règles d'avant ne séparaient pas trois CHOSES, elles séparaient
    #       trois ÉTIQUETAGES de la même chose : `lieu_de_culte` ne ramassait
    #       que les dix objets portant `amenity=place_of_worship` SANS
    #       `building=chapel|church` — et neuf d'entre eux s'appellent
    #       « Chapelle Saint-Guénolé », « Église Notre-Dame de Rumengol »…
    #       Le filtre offrait donc à l'usager trois boutons pour une seule
    #       question, dont un dernier qui n'était que le reliquat des deux
    #       autres. ⚠️ Une catégorie dont le sens est « les cas que les
    #       règles précédentes n'ont pas pris » se lit de l'extérieur comme
    #       une quatrième sorte d'objet.
    #    ⚠️ ON GARDE LES TROIS CONDITIONS : fondre les règles, ce n'est pas
    #       les supprimer. Tout objet `building=chapel` ne porte pas
    #       `amenity=place_of_worship` — ne garder que la troisième ferait
    #       SORTIR de l'inventaire des chapelles qui y sont aujourd'hui.
    ("lieu_de_culte", lambda t: t.get("building") in ("chapel","church","cathedral")
                             or t.get("amenity") == "place_of_worship"),
    ("calvaire",      lambda t: t.get("historic") == "wayside_cross" or t.get("man_made") == "cross"),
    ("plage",         lambda t: t.get("natural") == "beach"),
    ("grotte",        lambda t: t.get("natural") == "cave_entrance"),
    ("cap",           lambda t: t.get("natural") in ("cape","arch","peak")),
    ("baie",          lambda t: t.get("natural") in ("bay","strait")),
    ("ile",           lambda t: t.get("place") in ("island","islet") or t.get("natural") in ("island","islet")),
    ("rocher",        lambda t: t.get("natural") in ("rock","stone","reef")),
    ("fontaine",      lambda t: t.get("amenity") in ("fountain","lavoir") or t.get("natural") == "spring"),
    ("epave",         lambda t: t.get("historic") == "wreck"),
    ("ruine",         lambda t: t.get("historic") == "ruins" or t.get("building") == "ruins" or t.get("ruins") == "yes"),
    ("memoire",       lambda t: t.get("historic") in ("memorial","monument")),
    ("musee",         lambda t: t.get("tourism") == "museum"),
    ("oeuvre",        lambda t: t.get("tourism") == "artwork"),
    ("nature",        lambda t: t.get("leisure") in ("nature_reserve","bird_hide")),
    ("panorama",      lambda t: t.get("tourism") == "viewpoint"),
]

# ⛔ ÉCARTÉS, ET C'EST DIT. Chacun a été compté avant d'être refusé :
#    drinking_water (30, 1 nommé) · milestone (27, 0 nommé) · pier (59) ·
#    slipway (95) · cliff (48, des lignes) · boundary_stone · survey_point ·
#    attraction (35 — fourre-tout qui double les musées et les plages).
#    ⭐ Les écarter en silence aurait fait croire qu'ils n'existent pas.

LIBELLE = {
    "megalithe":"Mégalithe","archeologie":"Site archéologique","fortification":"Fortification",
    "phare":"Phare","moulin":"Moulin",
    # ⚠️ « chapelle » et « eglise » ont disparu d'ici le 5/11 avec leurs
    #    règles — voir REGLES ci-dessus. Le nom de chaque édifice dit déjà
    #    lequel c'est ; la CATÉGORIE n'avait pas à le redire en trois.
    "lieu_de_culte":"Lieu de culte","calvaire":"Calvaire","plage":"Plage","grotte":"Grotte",
    "cap":"Pointe","baie":"Baie","ile":"Île","rocher":"Rocher","fontaine":"Fontaine",
    "epave":"Épave","ruine":"Ruines","memoire":"Mémorial","musee":"Musée","oeuvre":"Œuvre",
    "nature":"Espace naturel","panorama":"Point de vue",
}

def categorie(t):
    for nom, mord in REGLES:
        try:
            if mord(t): return nom
        except Exception:
            pass
    return None


class Moisson(osmium.SimpleHandler):
    def __init__(self):
        super().__init__(); self.lieux = []
    def garder(self, lon, lat, t, kind, oid):
        c = categorie(t)
        if not c: return
        l = {"c": c, "n": t.get("name"), "g": [round(lon,5), round(lat,5)],
             "osm": f"{kind}{oid}"}
        # ⚠️ Ce qui aide à RECONNAÎTRE sur place, quand OSM le porte — et rien
        #    qu'on invente quand il ne le porte pas.
        if t.get("megalith_type"): l["type"] = t["megalith_type"]
        if t.get("description"): l["desc"] = t["description"][:160]
        if t.get("wikipedia"): l["wiki"] = t["wikipedia"]
        self.lieux.append(l)
    def node(self, n):
        self.garder(n.location.lon, n.location.lat, n.tags, "n", n.id)
    def way(self, w):
        if not categorie(w.tags): return
        try:
            pts = [(x.lon, x.lat) for x in w.nodes if x.location.valid()]
        except osmium.InvalidLocationError:
            return
        if pts:
            self.garder(sum(p[0] for p in pts)/len(pts), sum(p[1] for p in pts)/len(pts),
                        w.tags, "w", w.id)
            # ⚠️ FERMÉE ou non : seule une surface FERMÉE est l'empreinte d'un
            #    objet unique. Une ligne traverse des choses, elle n'en est pas
            #    une seule. Voir le dédoublonnage.
            self.lieux[-1]["_ferme"] = w.is_closed()


if __name__ == "__main__":
    src, dest = sys.argv[1], sys.argv[2]
    m = Moisson(); m.apply_file(src, locations=True)

    # ── LE DÉDOUBLONNAGE ──────────────────────────────────────────────────
    # ⚠️ Un même lieu est souvent cartographié DEUX FOIS : en nœud (le repère)
    #    et en surface (le bâtiment). Le fort des Espagnols apparaissait deux
    #    fois à 12 m d'écart.
    #
    # 🔴 TROIS RÈGLES ONT ÉCHOUÉ AVANT CELLE-CI, ET TOUTES DE LA MÊME FAÇON :
    #    elles détruisaient exactement ce qu'elles devaient préserver.
    #      1. « même catégorie, moins de 40 m » → les mégalithes tombaient de
    #         84 à 23. Mesuré : 68 des 84 sont à moins de 40 m d'un autre,
    #         parce que ce sont des ALIGNEMENTS.
    #      2. « un nœud cède à une surface » → « Alignements de Lagatjar »
    #         absorbait les menhirs qu'il contient.
    #      3. « seulement si la surface est FERMÉE » → Lagatjar EST fermé :
    #         c'est un polygone autour du champ, pas l'empreinte d'une pierre.
    #
    # ⭐ LA RÈGLE JUSTE NE REGARDE NI LA DISTANCE NI LA FORME, MAIS LE NOMBRE :
    #    une surface qui absorberait PLUSIEURS objets n'est pas une empreinte,
    #    c'est un ENCLOS — et alors ce sont les objets qui comptent, pas lui.
    #    Un fort absorbe son unique repère ; un alignement n'absorbe rien.
    surfaces = [l for l in m.lieux if l["osm"].startswith("w")]
    candidats = collections.defaultdict(list)
    for i, l in enumerate(m.lieux):
        if not l["osm"].startswith("n"): continue
        for g in surfaces:
            if g["c"] != l["c"]: continue
            if g["n"] and l["n"] and g["n"] != l["n"]: continue
            dx = (g["g"][0]-l["g"][0]) * 111320 * math.cos(math.radians(l["g"][1]))
            dy = (g["g"][1]-l["g"][1]) * 110540
            if math.hypot(dx, dy) < 60:
                candidats[g["osm"]].append(i)
                break
    absorbes = {i for ids in candidats.values() if len(ids) == 1 for i in ids}
    enclos = [k for k, v in candidats.items() if len(v) > 1]
    garde = [l for i, l in enumerate(m.lieux) if i not in absorbes]
    jetes = len(absorbes)
    if enclos:
        print(f"  {len(enclos)} enclos préservés (ils contiennent plusieurs lieux) :")
        for k in enclos:
            nom = next((g["n"] for g in surfaces if g["osm"] == k), k)
            print(f"    « {nom} » contient {len(candidats[k])} lieux — aucun absorbé")

    for l in garde: l.pop("_ferme", None)

    par = collections.Counter(l["c"] for l in garde)
    nommes = sum(1 for l in garde if l["n"])
    print(f"\n{len(m.lieux)} objets moissonnés · {jetes} repères absorbés par leur empreinte · {len(garde)} lieux")
    print(f"{nommes} nommés, {len(garde)-nommes} anonymes\n")
    for c, n in par.most_common():
        print("  %-18s %4d  (%d nommés)" % (LIBELLE[c], n, sum(1 for l in garde if l["c"]==c and l["n"])))

    json.dump({"genere": str(date.today()),
               "attribution": "© les contributeurs OpenStreetMap (ODbL)",
               "libelles": LIBELLE, "lieux": garde},
              open(dest, "w"), ensure_ascii=False, separators=(",", ":"))
    import os
    print(f"\nécrit : {dest} — {os.path.getsize(dest)/1024:.0f} Ko")
