import json, io, os, sys
# 5etools data root: pass as argv[1], else use the default below.
import os as _os
_DEFAULT_DATA = r"E:\D&D\Tools\5e.tools\5etools-v2.33.1\data"
_DATA_ROOT = sys.argv[1] if len(sys.argv) > 1 else _DEFAULT_DATA
_REPO = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
_RES  = _os.path.join(_REPO, "resources")


OUT = _os.path.join(_RES, 'data-feats.js')
ABIL = {"str":"Strength","dex":"Dexterity","con":"Constitution",
        "int":"Intelligence","wis":"Wisdom","cha":"Charisma"}
CAT = {"G":"General","O":"Origin","FS":"Fighting Style","EB":"Epic Boon",
       "D":"Dragonmark","FS:P":"Fighting Style","FS:R":"Fighting Style"}

def prereq_text(prs):
    if not prs: return ""
    parts = []
    for pr in prs:
        seg = []
        if "level" in pr:
            lv = pr["level"]
            seg.append("Level %s" % (lv.get("level") if isinstance(lv, dict) else lv))
        if "ability" in pr:
            for ab in pr["ability"]:
                for k, v in ab.items(): seg.append("%s %s+" % (ABIL.get(k, k), v))
        if "race" in pr:
            seg.append(" or ".join(r.get("name", "").title() for r in pr["race"]))
        if "spellcasting" in pr or "spellcasting2020" in pr: seg.append("Spellcasting")
        if "proficiency" in pr:
            for p in pr["proficiency"]:
                seg.append(", ".join(str(v) + " proficiency" for v in p.values()))
        if "feat" in pr: seg.append(", ".join(f.split("|")[0].title() for f in pr["feat"]))
        if "other" in pr: seg.append(pr["other"])
        if "background" in pr: seg.append(", ".join(b.get("name", "") for b in pr["background"]))
        if seg: parts.append(", ".join(seg))
    return " OR ".join(parts)

d = json.load(open(os.path.join(_DATA_ROOT, "feats.json"), encoding="utf-8"))
out = []
for f in d["feat"]:
    ed = "one" if f["source"] == "XPHB" else "classic"
    out.append({"name": f["name"], "source": f["source"], "edition": ed,
                "category": CAT.get(f.get("category"), f.get("category") or "General"),
                "prereq": prereq_text(f.get("prerequisite")),
                "entries": f.get("entries", [])})
out.sort(key=lambda x: x["name"])
io.open(OUT, "w", encoding="utf-8").write(
    "// Auto-generated from 5etools feats.json\nwindow.CC_FEATS = "
    + json.dumps(out, ensure_ascii=False) + ";\n")
print("feats:", len(out), "| classic:", sum(1 for x in out if x["edition"] == "classic"),
      "| one:", sum(1 for x in out if x["edition"] == "one"))
