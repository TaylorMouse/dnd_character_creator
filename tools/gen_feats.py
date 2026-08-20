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

def parse_ability(arr):
    """Ability increases a feat grants: fixed values and/or a choice from a list."""
    fixed, choose, cap = {}, None, None
    for blk in arr or []:
        if not isinstance(blk, dict): continue
        for k, v in blk.items():
            if k == "choose" and isinstance(v, dict):
                choose = {"from": [ABIL.get(x, x) for x in v.get("from", [])],
                          "count": v.get("count", 1), "amount": v.get("amount", 1)}
            elif k == "max":
                cap = v
            elif k in ABIL and isinstance(v, int):
                fixed[ABIL[k]] = v
    if not fixed and not choose: return None
    return {"fixed": fixed, "choose": choose, "max": cap}

SKILL_ANY = "anySkill"
def _norm(s):
    return s.title() if isinstance(s,str) and s.islower() else s

def parse_prof(arr, kind="skill"):
    """A feat's proficiency grants: named ones, a choice from a list, or 'any N'."""
    fixed, choose, anyN = [], None, 0
    for blk in arr or []:
        if not isinstance(blk, dict): continue
        for k, v in blk.items():
            if k == "choose" and isinstance(v, dict):
                choose = {"from": [_norm(x) for x in v.get("from", [])], "count": v.get("count", 1)}
                # Weapon Master says "four weapons of your choice" as a filter, not a list
                if v.get("fromFilter"): choose["fromFilter"] = v["fromFilter"]
            elif k in ("any", "anySkill", "anyTool", "anyLanguage",
                       "anyArtisansTool", "anyStandard", "anyMusicalInstrument"):
                anyN += v if isinstance(v, int) else 1
            elif v is True:
                fixed.append(_norm(k.split("|")[0]))
    if not fixed and not choose and not anyN: return None
    return {"fixed": fixed, "choose": choose, "any": anyN}

def parse_stl(arr):
    """Skilled's 'any three skills or tools' - one pool spanning several kinds."""
    for blk in arr or []:
        if not isinstance(blk, dict): continue
        for ch in (blk.get("choose") or []):
            if isinstance(ch, dict):
                return {"from": ch.get("from", []), "count": ch.get("count", 1)}
    return None

def parse_expertise(arr):
    """Skill Expert doubles the bonus on one skill you are already proficient in."""
    n = 0
    for blk in arr or []:
        if not isinstance(blk, dict): continue
        for k, v in blk.items():
            if isinstance(v, int): n += v
            elif v is True: n += 1
    return n or None

def parse_optprog(arr):
    """Metamagic Adept, Martial Adept, Eldritch Adept, Fighting Initiate: a feat that
    hands out options from a class's list, identified by 5etools feature-type codes."""
    out = []
    for blk in arr or []:
        if not isinstance(blk, dict): continue
        prog = blk.get("progression") or {}
        cnt = prog.get("*")
        if cnt is None:
            nums = [v for v in prog.values() if isinstance(v, int)]
            cnt = max(nums) if nums else 1
        out.append({"name": blk.get("name", "Options"),
                    "types": blk.get("featureType") or [], "count": cnt})
    return out or None

d = json.load(open(os.path.join(_DATA_ROOT, "feats.json"), encoding="utf-8"))
out = []
for f in d["feat"]:
    ed = "one" if f["source"] == "XPHB" else "classic"
    o = {"name": f["name"], "source": f["source"], "edition": ed,
         "category": CAT.get(f.get("category"), f.get("category") or "General"),
         "prereq": prereq_text(f.get("prerequisite")),
         "entries": f.get("entries", [])}
    ab = parse_ability(f.get("ability"))
    if ab: o["ability"] = ab
    # everything else the feat actually grants, so the app can offer/apply it
    for key, val in (
        ("optProg",   parse_optprog(f.get("optionalfeatureProgression"))),
        ("skills",    parse_prof(f.get("skillProficiencies"))),
        ("tools",     parse_prof(f.get("toolProficiencies"))),
        ("langs",     parse_prof(f.get("languageProficiencies"))),
        ("armor",     parse_prof(f.get("armorProficiencies"))),
        ("weapons",   parse_prof(f.get("weaponProficiencies"))),
        ("saves",     parse_prof(f.get("savingThrowProficiencies"))),
        ("stl",       parse_stl(f.get("skillToolLanguageProficiencies"))),
        ("expertise", parse_expertise(f.get("expertise"))),
    ):
        if val: o[key] = val
    if f.get("resist"):          o["resist"]  = [_norm(x) for x in f["resist"] if isinstance(x, str)]
    if f.get("immune"):          o["immune"]  = [_norm(x) for x in f["immune"] if isinstance(x, str)]
    if f.get("conditionImmune"): o["condImmune"] = [_norm(x) for x in f["conditionImmune"] if isinstance(x, str)]
    if f.get("senses"):          o["senses"]  = f["senses"]
    if f.get("additionalSpells"): o["hasSpells"] = True   # the spell grants themselves are not applied yet
    out.append(o)
out.sort(key=lambda x: x["name"])
io.open(OUT, "w", encoding="utf-8").write(
    "// Auto-generated from 5etools feats.json\nwindow.CC_FEATS = "
    + json.dumps(out, ensure_ascii=False) + ";\n")
print("feats:", len(out), "| classic:", sum(1 for x in out if x["edition"] == "classic"),
      "| one:", sum(1 for x in out if x["edition"] == "one"))
