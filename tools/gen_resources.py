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

# --- per-level walking-speed bonuses (Monk's Unarmored Movement uses type:bonusSpeed) ---
speed = {}
for fn in glob.glob(os.path.join(_DATA_ROOT, "class", "class-*.json")):
    if "fluff" in fn: continue
    d = json.load(open(fn, encoding="utf-8"))
    for c in d.get("class", []):
        slug = slugify(c["name"], c.get("edition", "classic"))
        for g in c.get("classTableGroups", []):
            for i, l in enumerate(g.get("colLabels") or []):
                rows = g.get("rows") or []
                vals, found = [], False
                for j in range(len(rows)):
                    cell = rows[j][i] if i < len(rows[j]) else None
                    if isinstance(cell, dict) and cell.get("type") == "bonusSpeed":
                        vals.append(int(cell.get("value") or 0)); found = True
                    else:
                        vals.append(0)
                if found:
                    speed[slug] = {"name": strip(l), "values": (vals + [0] * 20)[:20]}

# --- conditional damage / attack modifiers from the class tables ---
# e.g. Barbarian "Rage Damage" {type:bonus,value:2}, Rogue "Sneak Attack" and
# Monk "Martial Arts" {type:dice,toRoll:[{number,faces}]}
COND = {"Rage Damage": "rage", "Sneak Attack": "sneak", "Martial Arts": "martialArts"}
cond = {}
for fn in glob.glob(os.path.join(_DATA_ROOT, "class", "class-*.json")):
    if "fluff" in fn: continue
    d = json.load(open(fn, encoding="utf-8"))
    for c in d.get("class", []):
        slug = slugify(c["name"], c.get("edition", "classic"))
        for g in c.get("classTableGroups", []):
            for i, l in enumerate(g.get("colLabels") or []):
                label = strip(l)
                if label not in COND: continue
                rows = g.get("rows") or []
                vals = []
                for j in range(len(rows)):
                    cell = rows[j][i] if i < len(rows[j]) else None
                    v = None
                    if isinstance(cell, dict):
                        if cell.get("type") == "bonus":
                            v = int(cell.get("value") or 0)
                        elif cell.get("type") == "dice":
                            tr = (cell.get("toRoll") or [{}])[0]
                            if tr.get("faces"):
                                v = "%dd%d" % (tr.get("number") or 1, tr["faces"])
                    vals.append(v)
                vals = (vals + [None] * 20)[:20]
                cond.setdefault(slug, []).append(
                    {"name": label, "kind": COND[label], "values": vals})

OUT3 = os.path.join(_RES, "data-condmods.js")
io.open(OUT3, "w", encoding="utf-8").write(
    "// Auto-generated conditional damage modifiers from 5etools class tables\n"
    "window.CC_CONDMODS = " + json.dumps(cond, ensure_ascii=False) + ";\n")
print("classes with conditional modifiers:", len(cond), list(cond.keys()))

OUT2 = os.path.join(_RES, "data-speed.js")
io.open(OUT2, "w", encoding="utf-8").write(
    "// Auto-generated per-level walking speed bonuses from 5etools class tables\n"
    "window.CC_SPEEDPROG = " + json.dumps(speed, ensure_ascii=False) + ";\n")
print("classes with a speed progression:", len(speed), list(speed.keys()))
