# Official lists for the proficiency pickers on the sheet: armor categories, weapons by
# category, and the tool list grouped as the PHB groups them. These are what a feat,
# feature or DM grant would name, so a player can add one from a dropdown instead of typing.
import json, io, os, sys

_DEFAULT_DATA = r"E:\D&D\Tools\5e.tools\5etools-v2.33.1\data"
_DATA_ROOT = sys.argv[1] if len(sys.argv) > 1 else _DEFAULT_DATA
_REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_RES = os.path.join(_REPO, "resources")

ib = json.load(open(os.path.join(_DATA_ROOT, "items-base.json"), encoding="utf-8"))
base = ib["baseitem"]
items = json.load(open(os.path.join(_DATA_ROOT, "items.json"), encoding="utf-8"))["item"]
allitems = list(base) + list(items)

CORE = {"PHB", "XPHB", "DMG"}
def tcode(x): return str(x.get("type", "")).split("|")[0]
def mundane(x):
    # a plain, non-magical piece of equipment — not a magic variant with a rarity
    r = x.get("rarity")
    return (not r or r == "none") and not x.get("wondrous") and not x.get("reqAttune")

def names_of(code):
    seen, out = set(), []
    for x in allitems:
        if tcode(x) != code or x.get("source") not in CORE or not mundane(x): continue
        nm = x["name"]
        if nm in seen: continue
        seen.add(nm); out.append(nm)
    return sorted(out)

# weapons split by their category
weap_simple, weap_martial, wseen = [], [], set()
for x in allitems:
    if tcode(x) not in ("M", "R") or x.get("source") not in CORE or not mundane(x): continue
    nm = x["name"]
    if nm in wseen: continue
    wseen.add(nm)
    cat = x.get("weaponCategory", "")
    if cat == "simple": weap_simple.append(nm)
    elif cat == "martial": weap_martial.append(nm)

out = {
    "armor": ["Light armor", "Medium armor", "Heavy armor", "Shields"],
    "weapons": {
        "Categories": ["Simple weapons", "Martial weapons"],
        "Simple weapons": sorted(weap_simple),
        "Martial weapons": sorted(weap_martial),
    },
    "tools": {
        "Artisan's Tools": names_of("AT"),
        "Gaming Sets": names_of("GS"),
        "Musical Instruments": names_of("INS"),
        "Other Tools": names_of("T"),
    },
}

p = os.path.join(_RES, "data-proficiencies.js")
io.open(p, "w", encoding="utf-8").write(
    "// Auto-generated proficiency options (armor / weapons / tools) from 5etools base items\n"
    "window.CC_PROF_OPTS = " + json.dumps(out, ensure_ascii=False) + ";\n")

print("proficiency options:", round(os.path.getsize(p) / 1024, 1), "KB")
print("  simple weapons:", len(out["weapons"]["Simple weapons"]),
      "| martial weapons:", len(out["weapons"]["Martial weapons"]))
for g, l in out["tools"].items():
    print("  %-20s %d" % (g, len(l)))
