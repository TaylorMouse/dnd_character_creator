import json, io, os, sys
# 5etools data root: pass as argv[1], else use the default below.
_DEFAULT_DATA = r"E:\D&D\Tools\5e.tools\5etools-v2.33.1\data"
_DATA_ROOT = sys.argv[1] if len(sys.argv) > 1 else _DEFAULT_DATA
_REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_RES = os.path.join(_REPO, "resources")
OUT = os.path.join(_RES, "data-languages.js")

# The PHB core lists: these are the pools RAW draws on for "a standard language"
# or "an exotic language", so they stay authoritative regardless of what other
# sources tag their regional tongues as.
CORE_STANDARD = ["Common", "Dwarvish", "Elvish", "Giant", "Gnomish", "Goblin", "Halfling", "Orc"]
CORE_EXOTIC = ["Abyssal", "Celestial", "Deep Speech", "Draconic", "Infernal",
               "Primordial", "Sylvan", "Undercommon"]

d = json.load(open(os.path.join(_DATA_ROOT, "languages.json"), encoding="utf-8"))["language"]

best = {}
for x in d:
    nm = x.get("name")
    if not nm: continue
    t = (x.get("type") or "other").lower()
    if t == "rare": t = "exotic"
    if nm not in best or best[nm] == "other":
        best[nm] = t

out = []
for nm in sorted(best):
    t = best[nm]
    if nm in CORE_STANDARD: t, core = "standard", True
    elif nm in CORE_EXOTIC: t, core = "exotic", True
    else: core = False
    o = {"name": nm, "type": t}
    if core: o["core"] = True
    out.append(o)

io.open(OUT, "w", encoding="utf-8").write(
    "// Auto-generated language list from 5etools languages.json\n"
    "window.CC_LANGUAGES = " + json.dumps(out, ensure_ascii=False) + ";\n")

from collections import Counter
print("languages:", len(out), dict(Counter(x["type"] for x in out)),
      "| core:", sum(1 for x in out if x.get("core")))
