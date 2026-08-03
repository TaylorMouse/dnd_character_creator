import json, io, os, sys
# 5etools data root: pass as argv[1], else use the default below.
_DEFAULT_DATA = r"E:\D&D\Tools\5e.tools\5etools-v2.33.1\data"
_DATA_ROOT = sys.argv[1] if len(sys.argv) > 1 else _DEFAULT_DATA
_REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_RES = os.path.join(_REPO, "resources")

OUT = os.path.join(_RES, "data-sources.js")

found = {}
# official books and adventures give abbreviation -> full title
for fname, key in (("books.json", "book"), ("adventures.json", "adventure")):
    p = os.path.join(_DATA_ROOT, fname)
    if not os.path.exists(p): continue
    for b in json.load(open(p, encoding="utf-8")).get(key, []):
        src, name = b.get("source"), b.get("name")
        if src and name and src not in found:
            found[src] = name

# Sources that appear on entries but are not listed in books/adventures
# (supplements, online extras and compendium volumes).
for code, title in {
    "UA": "Unearthed Arcana",
    "SRD": "System Reference Document",
    "TftYP": "Tales from the Yawning Portal",
    "RoTOS": "The Rise of Tiamat Online Supplement",
    "HAT-LMI": "Honor Among Thieves: Legendary Magic Items",
    "MCV2DC": "Monstrous Compendium Vol 2: Dragonlance Creatures",
    "EET": "Elemental Evil: Trinkets",
}.items():
    found.setdefault(code, title)

io.open(OUT, "w", encoding="utf-8").write(
    "// Auto-generated source abbreviation -> full book title, from 5etools books/adventures\n"
    "window.CC_SOURCES = " + json.dumps(found, ensure_ascii=False, sort_keys=True) + ";\n")
print("sources:", len(found))
