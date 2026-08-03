# Generate per-class-per-edition feature files (v2): features + subclasses + choices + proficiencies.
import json, glob, os, re
import sys, os as _os
# 5etools data root: pass as argv[1], else use the default below.
_DEFAULT_DATA = r"E:\D&D\Tools\5e.tools\5etools-v2.33.1\data"
_DATA_ROOT = sys.argv[1] if len(sys.argv) > 1 else _DEFAULT_DATA
_REPO = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
_RES  = _os.path.join(_REPO, "resources")


DATA = _os.path.join(_DATA_ROOT,"class")
ROOT = _DATA_ROOT
OUT  = _os.path.join(_RES, 'features')
os.makedirs(OUT, exist_ok=True)

CORE = {"Artificer","Barbarian","Bard","Cleric","Druid","Fighter","Monk",
        "Paladin","Ranger","Rogue","Sorcerer","Warlock","Wizard"}
ABIL = {"str":"Strength","dex":"Dexterity","con":"Constitution","int":"Intelligence","wis":"Wisdom","cha":"Charisma"}
SKILL_CANON = {
 "acrobatics":"Acrobatics","animal handling":"Animal Handling","arcana":"Arcana","athletics":"Athletics",
 "deception":"Deception","history":"History","insight":"Insight","intimidation":"Intimidation",
 "investigation":"Investigation","medicine":"Medicine","nature":"Nature","perception":"Perception",
 "performance":"Performance","persuasion":"Persuasion","religion":"Religion","sleight of hand":"Sleight of Hand",
 "stealth":"Stealth","survival":"Survival"}
ALLSKILLS = list(SKILL_CANON.values())

classFiles = [f for f in glob.glob(os.path.join(DATA,"class-*.json")) if "fluff" not in f]
docs = [json.load(open(f, encoding="utf-8")) for f in classFiles]

# ---- optional features index ----
of = json.load(open(os.path.join(ROOT,"optionalfeatures.json"), encoding="utf-8"))
ofByName = {}      # lower(name) -> list of feature dicts
ofByType = {}      # featureType -> list
for o in of["optionalfeature"]:
    ofByName.setdefault(o["name"].lower(), []).append(o)
    for t in o.get("featureType", []):
        ofByType.setdefault(t, []).append(o)

def resolve_opt(ref):
    p = ref.split("|"); name = p[0]; src = p[1] if len(p) > 1 and p[1] else None
    cands = ofByName.get(name.lower(), [])
    if src:
        for c in cands:
            if c["source"].lower() == src.lower(): return c
    return cands[0] if cands else None

def opt_slim(o):
    return {"name": o["name"], "source": o["source"],
            "prerequisite": prereq_text(o.get("prerequisite")),
            "entries": o.get("entries", [])}

def prereq_text(pr):
    if not pr: return ""
    out = []
    for p in pr:
        if "level" in p:
            lv = p["level"]; out.append("Level %s" % (lv.get("level") if isinstance(lv, dict) else lv))
        if "pact" in p: out.append("Pact of the %s" % p["pact"])
        if "spell" in p: out.append("Knows a spell")
        if "patron" in p: out.append(p["patron"])
    return ", ".join(out)

# ---- feature indices ----
classFeatureIdx, subclassFeatureIdx = {}, {}
def cf_key(n,cn,cs,l,s): return "|".join([n,cn,cs,str(l),s])
def scf_key(n,cn,cs,ss,scs,l,s): return "|".join([n,cn,cs,ss,scs,str(l),s])
for d in docs:
    for f in d.get("classFeature", []):
        classFeatureIdx[cf_key(f["name"],f["className"],f["classSource"],f["level"],f.get("source",f["classSource"]))] = f
    for f in d.get("subclassFeature", []):
        subclassFeatureIdx[scf_key(f["name"],f["className"],f["classSource"],f["subclassShortName"],f["subclassSource"],f["level"],f.get("source",f["subclassSource"]))] = f

def resolve_copy(f):
    if "_copy" not in f: return f
    c = f["_copy"]
    k = scf_key(c["name"],c["className"],c["classSource"],c["subclassShortName"],c["subclassSource"],c["level"],c.get("source",c["subclassSource"]))
    t = subclassFeatureIdx.get(k); m = dict(f)
    m["entries"] = t.get("entries", []) if t else f.get("entries", ["(reprinted feature — source not in local data)"])
    m.pop("_copy", None); return m

def parse_cf_ref(s):
    p = s.split("|"); return cf_key(p[0], p[1] if len(p)>1 and p[1] else "Sorcerer",
        p[2] if len(p)>2 and p[2] else "PHB", p[3] if len(p)>3 and p[3] else "1",
        p[4] if len(p)>4 and p[4] else (p[2] if len(p)>2 and p[2] else "PHB"))
def parse_scf_ref(s):
    p = s.split("|"); cs = p[2] if len(p)>2 and p[2] else "PHB"
    ss = p[4] if len(p)>4 and p[4] else cs
    return scf_key(p[0], p[1] if len(p)>1 and p[1] else "Sorcerer", cs,
        p[3] if len(p)>3 and p[3] else "", ss, p[5] if len(p)>5 and p[5] else "1",
        p[6] if len(p)>6 and p[6] else ss)

def collect_refs(entries, refLookup, seen):
    if isinstance(entries, list):
        for e in entries: collect_refs(e, refLookup, seen)
    elif isinstance(entries, dict):
        t = entries.get("type")
        if t == "refClassFeature":
            s = entries["classFeature"]
            if s not in seen:
                seen.add(s); tgt = classFeatureIdx.get(parse_cf_ref(s))
                if tgt: refLookup[s] = {"name": tgt["name"], "entries": tgt.get("entries", [])}; collect_refs(tgt.get("entries", []), refLookup, seen)
        elif t == "refSubclassFeature":
            s = entries["subclassFeature"]
            if s not in seen:
                seen.add(s); tgt = subclassFeatureIdx.get(parse_scf_ref(s))
                if tgt: tgt = resolve_copy(tgt); refLookup[s] = {"name": tgt["name"], "entries": tgt.get("entries", [])}; collect_refs(tgt.get("entries", []), refLookup, seen)
        else:
            for k in ("entries","items","rows","options"):
                if k in entries: collect_refs(entries[k], refLookup, seen)

def find_option_blocks(entries, out):
    """Collect (count, [optionRefs]) from type:options blocks with refOptionalfeature children."""
    if isinstance(entries, list):
        for e in entries: find_option_blocks(e, out)
    elif isinstance(entries, dict):
        if entries.get("type") == "options":
            refs = [c["optionalfeature"] for c in entries.get("entries", []) if isinstance(c, dict) and c.get("type") == "refOptionalfeature"]
            if refs: out.append({"count": entries.get("count", 1), "refs": refs})
        for k in ("entries","items"):
            if k in entries and isinstance(entries[k], list): find_option_blocks(entries[k], out)

def norm_prog(pr):
    """progression may be {level:count} dict or a 1..20 list of cumulative counts."""
    if isinstance(pr, dict):
        return {str(k): v for k, v in pr.items()}
    out = {}
    for i, v in enumerate(pr or []):
        if v: out[str(i + 1)] = v
    return out

def slugify(name, edition): return re.sub(r"[^a-z0-9]+","-",name.lower()).strip("-") + "-" + edition

def title_skill(s): return SKILL_CANON.get(s.lower(), s.title())

def build_proficiencies(c):
    sp = c.get("startingProficiencies", {})
    saves = [ABIL.get(a, a) for a in c.get("proficiency", [])]
    skills = None
    for blk in sp.get("skills", []):
        if isinstance(blk, dict) and "choose" in blk:
            ch = blk["choose"]
            frm = [title_skill(x) for x in ch.get("from", [])] if "from" in ch else ALLSKILLS[:]
            skills = {"from": frm, "count": ch.get("count", 1)}
        elif isinstance(blk, dict) and "any" in blk:
            skills = {"from": ALLSKILLS[:], "count": blk["any"]}
    def one(it):
        if isinstance(it, str): return it
        if isinstance(it, dict):
            if "choose" in it:
                ch = it["choose"]; frm = ch.get("from", [])
                n = ch.get("count", 1)
                sample = ", ".join(str(f) for f in frm[:6]) + ("…" if len(frm) > 6 else "")
                return "choose %s (%s)" % (n, sample)
            if "proficiency" in it: return str(it["proficiency"])
            return next((str(v) for v in it.values() if isinstance(v, str)), "")
        return str(it)
    def joinlist(x):
        if not x: return "None"
        if isinstance(x, list):
            parts = [one(i) for i in x]; return ", ".join(p for p in parts if p) or "None"
        return one(x)
    return {
        "armor": joinlist(sp.get("armor")),
        "weapons": joinlist(sp.get("weapons")),
        "tools": joinlist(sp.get("tools") or sp.get("toolProficiencies")),
        "savingThrows": ", ".join(saves) if saves else "None",
        "skills": skills,
    }

index = []
for d in docs:
    for c in d.get("class", []):
        edition = c.get("edition","classic"); name = c["name"]; slug = slugify(name, edition)
        refLookup = {}; seen = set()
        optionLists = {}     # featureName -> [opt_slim,...]
        inlineChoiceCount = {}   # featureName -> count (for non-progression inline options)

        def gather_choices(fname, entries):
            blocks = []; find_option_blocks(entries, blocks)
            if not blocks: return
            pool = optionLists.setdefault(fname, [])
            have = {(o["name"], o["source"]) for o in pool}
            total_ct = 0
            for b in blocks:
                total_ct += b["count"]
                for ref in b["refs"]:
                    o = resolve_opt(ref)
                    if o and (o["name"], o["source"]) not in have:
                        have.add((o["name"], o["source"])); pool.append(opt_slim(o))
            inlineChoiceCount.setdefault(fname, total_ct)

        classFeatures = []
        for ref in c.get("classFeatures", []):
            gain = False
            if isinstance(ref, dict): gain = bool(ref.get("gainSubclassFeature")); ref = ref["classFeature"]
            f = classFeatureIdx.get(parse_cf_ref(ref))
            if not f: continue
            entries = f.get("entries", [])
            collect_refs(entries, refLookup, seen)
            gather_choices(f["name"], entries)
            classFeatures.append({"name": f["name"], "level": f["level"], "gainSubclassFeature": gain,
                "entries": entries, "optional": f.get("source", c["source"]) != c["source"], "source": f.get("source", c["source"])})

        # class-level optional feature progression
        optProgression = []
        for p in c.get("optionalfeatureProgression", []):
            optProgression.append({"name": p["name"], "featureType": p.get("featureType", []),
                                   "progression": norm_prog(p.get("progression"))})
            # ensure a pool exists via featureType fallback
            fn = p["name"]
            if fn not in optionLists or not optionLists[fn]:
                pool = optionLists.setdefault(fn, [])
                for t in p.get("featureType", []):
                    for o in ofByType.get(t, []): pool.append(opt_slim(o))

        subclasses = []
        for sc in d.get("subclass", []):
            if sc.get("className") != name or sc.get("classSource") != c["source"]: continue
            feats = []
            for ref in sc.get("subclassFeatures", []):
                f = subclassFeatureIdx.get(parse_scf_ref(ref))
                if not f: continue
                f = resolve_copy(f); entries = f.get("entries", [])
                collect_refs(entries, refLookup, seen); gather_choices(f["name"], entries)
                feats.append({"name": f["name"], "level": f["level"], "entries": entries})
            scProg = []
            for p in sc.get("optionalfeatureProgression", []):
                scProg.append({"name": p["name"], "featureType": p.get("featureType", []),
                               "progression": norm_prog(p.get("progression"))})
                fn = p["name"]
                if fn not in optionLists or not optionLists[fn]:
                    pool = optionLists.setdefault(fn, [])
                    for t in p.get("featureType", []):
                        for o in ofByType.get(t, []): pool.append(opt_slim(o))
            if feats:
                subclasses.append({"name": sc["name"], "shortName": sc.get("shortName", sc["name"]),
                    "source": sc.get("source", c["source"]), "features": feats, "optProgression": scProg})

        obj = {"key": slug, "name": name, "source": c["source"], "edition": edition,
               "hd": c.get("hd", {"number":1,"faces":c.get("hd",{}).get("faces")}),
               "hdFaces": c.get("hd", {}).get("faces"),
               "spellcastingAbility": ABIL.get(c.get("spellcastingAbility"), None),
               "proficiencies": build_proficiencies(c),
               "classFeatures": classFeatures, "subclasses": sorted(subclasses, key=lambda s: s["name"]),
               "optProgression": optProgression, "optionLists": optionLists,
               "inlineChoiceCount": inlineChoiceCount, "refLookup": refLookup}
        with open(os.path.join(OUT, slug + ".js"), "w", encoding="utf-8") as fp:
            fp.write("window.CC_FEATURE_DATA = window.CC_FEATURE_DATA || {};\n")
            fp.write("window.CC_FEATURE_DATA[%s] = %s;\n" % (json.dumps(slug), json.dumps(obj, ensure_ascii=False)))
        index.append({"name": name, "source": c["source"], "edition": edition,
            "editionLabel": "2024" if edition == "one" else "2014", "hdFaces": obj["hdFaces"],
            "isCore": name in CORE, "slug": slug, "nSub": len(subclasses)})

with open(_os.path.join(_RES, 'data-classes.js'), "w", encoding="utf-8") as fp:
    fp.write("// Auto-generated from 5etools v2.24.3 data/class/*.json\n")
    fp.write("window.CC_CLASSES = " + json.dumps(index, ensure_ascii=False, indent=2) + ";\n")

print("wrote", len(index), "files")
d = json.loads(open(os.path.join(OUT,"sorcerer-classic.js"),encoding="utf-8").read().split("] = ",1)[1].rsplit(";",1)[0])
print("Sorcerer proficiencies.skills:", d["proficiencies"]["skills"])
print("optProgression:", [(p["name"], p["progression"]) for p in d["optProgression"]])
print("Metamagic pool size:", len(d["optionLists"].get("Metamagic", [])), "->", [o["name"] for o in d["optionLists"]["Metamagic"][:4]], "...")
