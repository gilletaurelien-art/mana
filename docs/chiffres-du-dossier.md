# LES CHIFFRES DU DOSSIER — mesurés, re-mesurables

> **🔴 CE FICHIER VIT DANS LE DÉPÔT, ET C'EST UNE CORRECTION.**
> Ces corrections ont d'abord été écrites dans un dossier temporaire de
> session. Elles ont disparu avec lui le 31/10/2026 au soir — avec les
> vingt-six planches-contact de la moisson photographique.
> ⭐ Ce dépôt écrit pourtant noir sur blanc « rien de vital dans `/tmp` ».
> Un livrable destiné à un rendez-vous n'est pas un fichier de travail :
> il se versionne. Les planches, elles, se régénèrent
> (`node scripts/moisson-images.mjs planche`) ; la prose, non.

Relevé le **31/10/2026**, sur le build de production.

---

## 1 · La sobriété chiffrée

> **Écran d'entrée : 210 Ko sur un téléphone.** 88 Ko de code et 12 Ko de
> style (gzip), 68 Ko de polices auto-hébergées et sous-ensemblées, 42 Ko
> pour la photographie d'accueil (AVIF, variante 960 px). Une promenade
> ouverte avec son fond de carte vectoriel : **432 Ko**, dont 224 Ko pour le
> moteur cartographique, chargé seulement quand on ouvre un parcours. Le
> graphe d'un territoire — la presqu'île de Crozon, 64 028 nœuds,
> 13 265 arêtes, 339 lieux — pèse 2,36 Mo, mis en cache une fois pour tout
> l'usage hors ligne.
>
> La sobriété n'est pas un chiffre décoratif : c'est ce qui rend le
> hors-ligne et l'usage à faible débit possibles. **Chaque chiffre de ce
> paragraphe est mesuré sur le site déployé, pas estimé** — et re-mesurable
> par quiconque, avec la recette en annexe.

| poste | réseau | décodé |
|---|---|---|
| code d'entrée | 88 Ko (gzip) | 311 Ko |
| style d'entrée | 12 Ko (gzip) | 57 Ko |
| polices (3 × WOFF2) | 68 Ko | 68 Ko |
| photographie d'accueil (AVIF 960) | 42 Ko | — |
| moteur de carte + son style | 224 Ko (gzip) | 850 Ko |
| **premier écran, sur un téléphone** | **210 Ko** | — |
| **une promenade ouverte avec carte** | **432 Ko** | — |

⚠️ **Les polices ne se compressent plus** : le WOFF2 porte déjà sa
compression Brotli interne et arrive sans `content-encoding`.

⚠️ **CES CHIFFRES ONT AUGMENTÉ, ET C'EST ASSUMÉ.** L'écran d'entrée pesait
76 Ko avant la refonte. L'écart vient de deux choses nommées : les six écrans
(+16 Ko de code, +8 Ko de style) et la **photographie d'accueil** (42 Ko),
qui n'existait pas. ⭐ Une mesure qui empire n'est pas une mesure à cacher :
elle dit ce qu'on a échangé. Ici, 134 Ko contre une identité visuelle — et la
bibliothèque entière reste hors du premier chargement, image par image.

### L'histoire des polices

```
TTF d'origine .........  405 Ko
converties en WOFF2 ...  172 Ko     (−58 %)
sous-ensemblées .......   85 Ko     (−79 %)
Marelle → Instrument ..   68 Ko     (−83 % au total)
```

Le sous-ensemble retire les glyphes inutilisés : Rubik embarquait 1 075
glyphes — latin, cyrillique, hébreu — pour un site en français qui nomme des
lieux bretons. **Zéro caractère perdu**, vérifié glyphe par glyphe contre le
jeu réellement employé.

⭐ **Le dernier pas n'est pas une optimisation : c'est un choix de direction
qui s'est trouvé gratuit.** Marelle Baton pesait 41,0 Ko — le fichier le plus
lourd du site ; Instrument Serif, qui porte l'identité éditoriale, en pèse
23,9. On a changé de visage **en allégeant de 17 Ko**. Les deux décisions
étaient indépendantes ; c'est la mesure qui a montré qu'elles allaient dans
le même sens.

---

## 2 · Les 62 %

❌ « 62 % des Français en marche (~30 M) » — les deux chiffres ne s'accordent
pas : 62 % de la population française, c'est 42 millions. Ils ne se
réconcilient que si la base est les adultes, et le texte ne le dit pas.

✅ « **62 % des Français de 15 ans et plus** — environ 30 millions de
personnes ».

⚠️ **À vérifier avant diffusion** : que l'enquête Union Sport & Cycle /
FFRandonnée 2025 porte bien sur les 15 ans et plus, et non les 18 ans et
plus. La base de sondage se lit dans la méthodologie, pas dans le communiqué.

---

## 3 · La taxe de séjour

✅ « 22-32 k€ sur deux saisons, soit environ 3 à 4 % de la taxe de séjour
perçue sur le territoire (**756 846 € en 2025 — source : bilan de saison de
l'Office de tourisme Presqu'île de Crozon – Aulne maritime ; à confirmer en
délibération avant citation publique**). Le fonctionnement annuel seul
représente moins de 2 % de cette recette. Le barème reste une hypothèse. »

🔴 **L'office de tourisme EST un service de la communauté de communes**,
depuis le 1er janvier 2017. Ni association, ni EPIC autonome. → Le
prescripteur opérationnel et le financeur sont le même établissement.

🔴 **La comcom a déjà une étude en cours sur la randonnée.** Arriver sur un
sujet déjà instruit n'a rien à voir avec arriver avec une idée.

🔴 **Erreur à ne pas reprendre** : il a été écrit que le président de la
comcom « signe les arrêtés municipaux » de fermeture du GR34. **C'est faux** —
un arrêté municipal est signé par un **maire** (Crozon, Telgruc). Expliquer à
un élu son propre mandat, de travers, coûte plus cher que tout argument gagné
par ailleurs. → L'argument de sécurité reste entier autrement : c'est le
**service Espaces Naturels de la comcom** qui gère fermetures et déviations.

---

## 4 · La bibliothèque photographique

**29 images**, toutes à licence vérifiée par l'API de Wikimedia Commons —
CC BY, CC BY-SA, CC0 et domaine public. 12,4 Mo sur disque, en AVIF et WebP,
trois largeurs. Chaque image porte son auteur, sa licence, sa page source et
sa date de collecte ; le crédit s'affiche sur l'image.

⭐ Choisies **à l'œil**, sur planches-contact, parmi 530 candidates libres :
`Category:GR 34` est à 11/12 des relevés botaniques, `Category:Waves`
contient un schéma de physique au tableau. Une catégorie est un étiquetage,
pas un sujet.

---

## ANNEXE — la recette

```js
// dans la console, sur le site déployé
const r = await fetch('/mana/assets/<fichier>?m=' + Math.random(),
                      { cache: 'no-store' });
r.headers.get('content-length');     // ce qui transite réellement
r.headers.get('content-encoding');   // gzip, ou rien pour le WOFF2
```

⚠️ **Ne jamais lire `performance.getEntriesByType('resource')` pour cela.**
Une ressource servie par le service worker y rapporte sa taille
**décompressée** : la carte y apparaît à 850 Ko alors qu'elle transite en
224 Ko.

⭐ **Et la règle qui vaut pour tout le dossier** : un total obtenu par un
motif de fichiers (`*.ttf`, `*.js`) n'est pas un inventaire. Le premier bilan
de poids omettait 62 Ko — une police déjà convertie, que le motif ne
ramassait pas. Le correctif n'est pas de mieux compter : c'est de **lister ce
qui est servi**, puis de mesurer chaque élément.
