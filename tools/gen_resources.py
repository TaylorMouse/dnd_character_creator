import json, glob, re, io, os, sys
# 5etools data root: pass as argv[1], else use the default below.
import os as _os
_DEFAULT_DATA = r"E:\D&D\Tools\5e.tools\5etools-v2.33.1\data"
_DATA_ROOT = sys.argv[1] if len(sys.argv) > 1 else _DEFAULT_DATA
_REPO = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
_RES  = _os.path.join(_REPO, "resources")


OUT = _os.path.join(_RES, 'data-resources.js')
RES = {"sorcery points":"Sorcery Points","ki points":"Ki Points","focus points":"Focus Points",
       "rages":"Rages","bardic inspiration":"Bardic Inspiration","channel divinity":"Channel Divinity",
       "wild shape":"Wild Shape","infused items":"Infused Items"}

def strip(l): return re.sub(r"\{@\w+\s*([^|}]*)[^}]*\}", r"\1", str(l)).strip()
def toint(x):
    m = re.search(r"\d+", str(x)); return int(m.group()) if m else 0
def slugify(n, e): return re.sub(r"[^a-z0-9]+", "-", n.lower()).strip("-") + "-" + e

out = {}
for fn in glob.glob(os.path.join(_DATA_ROOT, "class", "class-*.json")):
    if "fluff" in fn: continue
    d = json.load(open(fn, encoding="utf-8"))
    for c in d.get("class", []):
        slug = slugify(c["name"], c.get("edition", "classic"))
        for g in c.get("classTableGroups", []):
            for i, l in enumerate(g.get("colLabels") or []):
                key = strip(l).lower()
                if key in RES:
                    rows = g.get("rows") or g.get("rowsSpellProgression") or []
                    vals = [toint(rows[j][i]) if i < len(rows[j]) else 0 for j in range(len(rows))]
                    vals = (vals + [0] * 20)[:20]
                    out.setdefault(slug, []).append({"name": RES[key], "values": vals})

io.open(OUT, "w", encoding="utf-8").write(
    "// Auto-generated class resource trackers from 5etools\nwindow.CC_RESOURCES = "
    + json.dumps(out, ensure_ascii=False) + ";\n")
print("classes with resources:", len(out))
