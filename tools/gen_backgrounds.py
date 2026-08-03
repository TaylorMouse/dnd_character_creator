import json, io, os, sys
# 5etools data root: pass as argv[1], else use the default below.
import os as _os
_DEFAULT_DATA = r"E:\D&D\Tools\5e.tools\5etools-v2.33.1\data"
_DATA_ROOT = sys.argv[1] if len(sys.argv) > 1 else _DEFAULT_DATA
_REPO = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
_RES  = _os.path.join(_REPO, "resources")


OUT = _os.path.join(_RES, 'data-backgrounds.js')
SK = {"acrobatics":"Acrobatics","animal handling":"Animal Handling","arcana":"Arcana",
      "athletics":"Athletics","deception":"Deception","history":"History","insight":"Insight",
      "intimidation":"Intimidation","investigation":"Investigation","medicine":"Medicine",
      "nature":"Nature","perception":"Perception","performance":"Performance",
      "persuasion":"Persuasion","religion":"Religion","sleight of hand":"Sleight of Hand",
      "stealth":"Stealth","survival":"Survival"}
ALLSK = list(SK.values())

def tskill(s): return SK.get(s.lower(), s.title())
def tcase(s):  return s.title() if isinstance(s, str) and s.islower() else s

def parse_skills(arr):
    fixed, choose, anyN = [], None, 0
    for blk in arr or []:
        if not isinstance(blk, dict): continue
        for k, v in blk.items():
            if k == "choose":
                choose = {"from": [tskill(x) for x in v.get("from", [])] or ALLSK,
                          "count": v.get("count", 1)}
            elif k == "any": anyN = v
            elif v is True: fixed.append(tskill(k))
    return {"fixed": fixed, "choose": choose, "any": anyN}

def parse_langs(arr):
    fixed, anyStd, anyN, choose = [], 0, 0, None
    for blk in arr or []:
        if not isinstance(blk, dict): continue
        for k, v in blk.items():
            if k == "anyStandard": anyStd = v
            elif k == "any": anyN = v
            elif k == "choose":
                choose = {"from": [tcase(x) for x in v.get("from", [])], "count": v.get("count", 1)}
            elif v is True: fixed.append(tcase(k))
    return {"fixed": fixed, "anyStandard": anyStd, "any": anyN, "choose": choose}

def parse_tools(arr):
    fixed, anyN = [], 0
    for blk in arr or []:
        if not isinstance(blk, dict): continue
        for k, v in blk.items():
            if k in ("any", "anyArtisansTool", "anyMusicalInstrument", "anyGamingSet"): anyN += v
            elif k == "choose": anyN += v.get("count", 1)
            elif v is True: fixed.append(tcase(k.replace("|phb", "").replace("|xphb", "")))
    return {"fixed": fixed, "any": anyN}

def feature_of(b):
    for e in b.get("entries", []):
        if isinstance(e, dict) and isinstance(e.get("name"), str) and e["name"].lower().startswith("feature:"):
            return {"name": e["name"].split(":", 1)[1].strip(), "entries": e.get("entries", [])}
    return None

def desc_of(b):
    for e in b.get("entries", []):
        if isinstance(e, str): return e
        if isinstance(e, dict) and not e.get("name"):
            for x in e.get("entries", []):
                if isinstance(x, str): return x
    return ""

bgs = json.load(open(os.path.join(_DATA_ROOT, "backgrounds.json"), encoding="utf-8"))["background"]
out = {"classic": [], "one": []}
for b in bgs:
    ed = "one" if b.get("edition") == "one" else "classic"
    feats = [list(f.keys())[0].split("|")[0] for f in b.get("feats", []) if isinstance(f, dict)]
    out[ed].append({
        "name": b["name"], "source": b["source"], "edition": ed,
        "skills": parse_skills(b.get("skillProficiencies")),
        "langs": parse_langs(b.get("languageProficiencies")),
        "tools": parse_tools(b.get("toolProficiencies")),
        "feature": feature_of(b), "feats": feats,
        "desc": desc_of(b), "entries": b.get("entries", []),
    })
for k in out:
    core = "XPHB" if k == "one" else "PHB"
    out[k].sort(key=lambda x: (x["source"] != core, x["name"]))

io.open(OUT, "w", encoding="utf-8").write(
    "// Auto-generated from 5etools backgrounds.json\nwindow.CC_BACKGROUNDS = "
    + json.dumps(out, ensure_ascii=False) + ";\n")
print("backgrounds — classic:", len(out["classic"]), "| one:", len(out["one"]))
