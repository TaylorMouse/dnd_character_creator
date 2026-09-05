# Generate resolved race/species data for the Character Creator.
import json,io,os,re
import sys, os as _os
# 5etools data root: pass as argv[1], else use the default below.
import datasrc
_DATA_ROOT = datasrc.data_root()
_REPO = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
_RES  = _os.path.join(_REPO, "resources")

sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
import homebrew

DATA=_DATA_ROOT
d=json.load(open(os.path.join(DATA,"races.json"),encoding="utf-8"))
races=d["race"]; subs=d.get("subrace",[])
# homebrew species merge in as extra entries
_hb_codes=homebrew.source_codes(_DATA_ROOT)
races=list(races)+list(homebrew.merged(_DATA_ROOT,"race"))
subs=list(subs)+list(homebrew.merged(_DATA_ROOT,"subrace"))

# ---- resolve 5etools "_copy" species (MOT Triton, Boggart, Flamekin, Human (Ixalan)...) ----
# These entries are defined as a copy of another species plus a few modifications; without
# resolving them they come through as empty shells with no size/speed/traits.
import copy as _copylib
_race_index={}
for _r in races: _race_index[(_r.get("name"),_r.get("source"))]=_r
def _apply_mod(target,key,ops):
    if not isinstance(ops,list): ops=[ops]
    for op in ops:
        if not isinstance(op,dict): continue
        mode=op.get("mode"); arr=target.get(key)
        if arr is None and mode and mode.endswith("Arr"): arr=[]; target[key]=arr
        items=op.get("items"); items=items if isinstance(items,list) else ([items] if items is not None else [])
        if mode in ("appendArr","appendIfNotExistsArr"):
            for it in items:
                if mode=="appendIfNotExistsArr" and it in arr: continue
                arr.append(it)
        elif mode=="prependArr":
            target[key]=items+arr
        elif mode=="insertArr":
            idx=op.get("index",0); arr[idx:idx]=items
        elif mode=="replaceArr":
            rep=op.get("replace"); rep=rep.get("index") if isinstance(rep,dict) else rep
            new=[]; done=False
            for i,el in enumerate(arr):
                nm=el.get("name") if isinstance(el,dict) else el
                if not done and (nm==rep or i==rep): new.extend(items); done=True
                else: new.append(el)
            target[key]=new
        elif mode=="removeArr":
            names=op.get("names") or op.get("items") or []
            names=names if isinstance(names,list) else [names]
            target[key]=[el for el in arr if (el.get("name") if isinstance(el,dict) else el) not in names]
def _resolve_copy(r,seen=None):
    if not isinstance(r,dict) or "_copy" not in r: return r
    seen=seen or set(); cp=r["_copy"]; bkey=(cp.get("name"),cp.get("source"))
    if bkey in seen or bkey not in _race_index:
        return {k:v for k,v in r.items() if k!="_copy"}
    seen.add(bkey)
    merged=_copylib.deepcopy(_resolve_copy(_race_index[bkey],seen))
    for k,v in r.items():
        if k!="_copy": merged[k]=_copylib.deepcopy(v)
    try:
        for key,ops in (cp.get("_mod") or {}).items():
            if key!="*": _apply_mod(merged,key,ops)
    except Exception: pass
    merged.pop("_copy",None)
    return merged
races=[_resolve_copy(r) for r in races]
ABIL={"str":"Strength","dex":"Dexterity","con":"Constitution","int":"Intelligence","wis":"Wisdom","cha":"Charisma"}
SIZE={"T":"Tiny","S":"Small","M":"Medium","L":"Large","H":"Huge","G":"Gargantuan"}
CORE_PHB={"Dragonborn","Dwarf","Elf","Gnome","Half-Elf","Half-Orc","Halfling","Human","Tiefling"}
CORE_XPHB={"Aasimar","Dragonborn","Dwarf","Elf","Gnome","Goliath","Halfling","Human","Orc","Tiefling"}

def tcase(s): return s.title() if isinstance(s,str) and s.islower() else s
def spell_name(s):
    return tcase(s.split("|")[0].split("#")[0].strip())

# 5etools records a feat grant structurally: Variant Human and Custom Lineage carry
# feats:[{"any":1}], and the 2024 Human carries anyFromCategory with category "O" (Origin).
FEAT_CAT={"O":"Origin","G":"General","FS":"Fighting Style","EB":"Epic Boon"}
def feat_grant(arr):
    """-> {"count":n,"category":"Origin"|""} for a species that hands out a feat, else None."""
    count=0; cat=""
    for blk in arr or []:
        if not isinstance(blk,dict): continue
        for k,v in blk.items():
            if k=="any" and isinstance(v,int):
                count+=v
            elif k=="anyFromCategory" and isinstance(v,dict):
                count+=v.get("count",1)
                cats=v.get("category") or []
                if isinstance(cats,str): cats=[cats]
                if cats: cat=FEAT_CAT.get(cats[0],cats[0])
    return {"count":count,"category":cat} if count else None

def parse_ability(arr):
    fixed={}; choose=[]
    for blk in arr or []:
        if not isinstance(blk,dict): continue
        for k,v in blk.items():
            if k=="choose":
                choose.append({"from":[ABIL.get(x,x) for x in v.get("from",list(ABIL.keys()))],
                               "count":v.get("count",1),"amount":v.get("amount",1)})
            elif k in ABIL and isinstance(v,int):
                fixed[ABIL[k]]=v
    return {"fixed":fixed,"choose":choose}

def parse_speed(sp):
    if sp is None: return ""
    if isinstance(sp,int): return str(sp)+" ft."
    parts=[]
    for k in ("walk","fly","swim","climb","burrow"):
        if k in sp and sp[k]:
            v=sp[k]; v=("equal to walking" if v is True else str(v)+" ft.")
            parts.append((k.capitalize()+" " if k!="walk" else "")+v)
    if sp.get("fly") is True: pass
    return ", ".join(parts) if parts else ""

def language_from_entries(entries):
    # 5etools marks a race's own language as {"other": true}; the specific name lives in the
    # "Languages" trait ("...Common and Leonin."). Pull the capitalised word after "and".
    for e in entries or []:
        if isinstance(e, dict) and e.get("name") == "Languages":
            txt = " ".join(x for x in e.get("entries", []) if isinstance(x, str))
            m = re.findall(r"\band ([A-Z][a-zA-Z']+)", txt)
            for w in m:
                if w != "Common":
                    return w
    return None

def parse_langs(arr, entries=None):
    fixed=[]; anyStd=0; anyN=0
    for blk in arr or []:
        if not isinstance(blk,dict): continue
        for k,v in blk.items():
            if k=="anyStandard": anyStd+=v
            elif k=="any": anyN+=v
            elif k=="other" and v is True:
                # the race's own language: use its name if the trait states one, else "one of choice"
                spec=language_from_entries(entries)
                if spec: fixed.append(spec)
                else: anyN+=1
            elif v is True: fixed.append(tcase(k))
    return {"fixed":fixed,"anyStandard":anyStd,"any":anyN}

def parse_skills(arr):
    fixed=[]; choose=None; anyN=0
    for blk in arr or []:
        if not isinstance(blk,dict): continue
        for k,v in blk.items():
            if k=="choose": choose={"from":[tcase(x) for x in v.get("from",[])],"count":v.get("count",1)}
            elif k=="any": anyN+=v
            elif v is True: fixed.append(tcase(k))
    return {"fixed":fixed,"choose":choose,"any":anyN}

def prof_text(arr):
    out=[]
    for blk in arr or []:
        if not isinstance(blk,dict): continue
        for k,v in blk.items():
            if v is True: out.append(tcase(k.split("|")[0]))
            elif k in ("any","anyArtisansTool"): out.append("choose "+str(v))
    return out

def parse_spells(arr):
    spells=[]; choices=[]; scAbility=None
    for blk in arr or []:
        if not isinstance(blk,dict): continue
        if isinstance(blk.get("ability"),dict) and blk["ability"].get("choose"):
            scAbility=[ABIL.get(x,x) for x in blk["ability"]["choose"]]
        def walk(x,when=""):
            if isinstance(x,str):
                if "level=" in x and "class=" in x: return  # handled as choose below
                spells.append({"name":spell_name(x),"when":when,"cantrip":x.endswith("#c")})
            elif isinstance(x,dict):
                if "choose" in x and isinstance(x["choose"],str):
                    choices.append(x["choose"])
                for kk,vv in x.items():
                    if kk in ("choose","ability"): continue
                    walk(vv,when)
            elif isinstance(x,list):
                for it in x: walk(it,when)
        if "known" in blk:
            for lvl,val in blk["known"].items(): walk(val,"known")
        if "innate" in blk:
            for lvl,val in blk["innate"].items(): walk(val,"from level "+str(lvl))
    # dedupe
    seen=set(); us=[]
    for s in spells:
        key=s["name"]
        if key in seen: continue
        seen.add(key); us.append(s)
    def choose_label(c):
        m=dict(p.split("=") for p in c.split("|") if "=" in p)
        cls=m.get("class",""); lvl=m.get("level","")
        if lvl=="0": return "a "+cls+" cantrip"
        return "a level-"+lvl+" "+cls+" spell" if lvl else "a "+cls+" spell"
    return {"spells":us,"choices":[choose_label(c) for c in choices],"scAbility":scAbility}

def senses_of(r):
    out=[]
    if r.get("darkvision"): out.append("Darkvision "+str(r["darkvision"])+" ft.")
    for t in (r.get("traitTags") or []):
        if t in ("Blindsight","Truesight","Tremorsense"): out.append(t)
    return out

def named_traits(entries):
    SKIP={"Age","Size","Languages"}
    out=[]
    for e in entries or []:
        if isinstance(e,dict) and e.get("name") and e["name"] not in SKIP:
            out.append({"name":e["name"],"entries":e.get("entries",[])})
    return out

def ancestry_of(entries):
    for e in entries or []:
        if isinstance(e,dict) and "Ancestry" in (e.get("name") or ""):
            for x in e.get("entries",[]):
                if isinstance(x,dict) and x.get("type")=="table":
                    rows=[]
                    for row in x.get("rows",[]):
                        rows.append({"name":spell_name(str(row[0])),
                                     "detail":" · ".join(str(c) for c in row[1:])})
                    return {"label":e["name"]+" — choose one","rows":rows}
    return None

def detect_spell_pick(arr):
    # 5etools encodes "you know one of the following spells of your choice" as several
    # parallel additionalSpells blocks, each granting a single spell at the same level.
    # (Astral Elf's Astral Fire: dancing lights / light / sacred flame.) Detect that shape
    # so the app can offer a pick instead of granting all of them. Cumulative multi-block
    # grants (2024 Elf/Tiefling legacies, which differ in shape) are left alone.
    if not isinstance(arr, list) or len(arr) < 2:
        return None
    specs = []
    for b in arr:
        if not isinstance(b, dict):
            return None
        one = []
        when = lvl = None
        for kind in ("known", "innate"):
            blk = b.get(kind)
            if not isinstance(blk, dict):
                continue
            for L, v in blk.items():
                vs = v if isinstance(v, list) else [v]
                for x in vs:
                    if not isinstance(x, str):   # a {choose:...} directive -> not this pattern
                        return None
                    one.append(x); when = kind; lvl = L
        if len(one) != 1:
            return None
        specs.append((when, lvl, one[0]))
    if len({s[0] for s in specs}) != 1 or len({s[1] for s in specs}) != 1:
        return None                              # blocks must be the same kind and level
    return {"choose": 1,
            "from": [spell_name(s[2]) for s in specs],
            "cantrip": all(s[2].endswith("#c") for s in specs),
            "when": specs[0][0]}


def base_obj(r):
    # 5etools marks MPMM/VRGR-style species with `lineage`; their ability increases and
    # languages are not stored per race because the book states them once:
    # "Common and one other language that you and your DM agree is appropriate".
    langs = parse_langs(r.get("languageProficiencies"), r.get("entries"))
    lineage = bool(r.get("lineage"))
    lang_note = ""
    if lineage and not r.get("languageProficiencies"):
        langs = {"fixed": ["Common"], "anyStandard": 0, "any": 1, "choose": None}
        lang_note = ("You can speak, read and write Common and one other language that you "
                     "and your DM agree is appropriate for your character.")
    o={
      "name":r.get("name",""),"source":r.get("source",""),"edition":r.get("edition","classic"),
      "lineage":lineage,"langNote":lang_note,
      "hb":r.get("source") in _hb_codes,
      "size":", ".join(SIZE.get(s,s) for s in (r.get("size") or [])),
      "speed":parse_speed(r.get("speed")),
      "senses":senses_of(r),
      "ability":parse_ability(r.get("ability")),
      "resist":[tcase(x) for x in (r.get("resist") or []) if isinstance(x,str)],
      "immune":[tcase(x) for x in (r.get("immune") or []) if isinstance(x,str)],
      "condImmune":[tcase(x) for x in (r.get("conditionImmune") or []) if isinstance(x,str)],
      "vulnerable":[tcase(x) for x in (r.get("vulnerable") or []) if isinstance(x,str)],
      "languages":langs,
      "skills":parse_skills(r.get("skillProficiencies")),
      "weapons":prof_text(r.get("weaponProficiencies")),
      "armor":prof_text(r.get("armorProficiencies")),
      "tools":prof_text(r.get("toolProficiencies")),
      "traits":named_traits(r.get("entries")),
      "ancestry":ancestry_of(r.get("entries")),
      "feats":feat_grant(r.get("feats")),
    }
    sp=parse_spells(r.get("additionalSpells"))
    pick=detect_spell_pick(r.get("additionalSpells"))
    picks=[]
    if pick:
        picks=[pick]
        chosen_set={n.lower() for n in pick["from"]}
        sp["spells"]=[s for s in sp["spells"] if s["name"].lower() not in chosen_set]
    o["spells"]=sp["spells"]; o["spellChoices"]=sp["choices"]; o["scAbility"]=sp["scAbility"]; o["spellPicks"]=picks
    return o

def sub_obj(s):
    o=base_obj(s)  # reuse; subrace has many same fields
    o["name"]=s.get("name","(subrace)")
    return o

def version_lineage(base,ver):
    # 2024 _versions: name, _mod(replaceArr on entries), delta fields
    o={"name":ver.get("name","").split(";")[-1].strip() or ver.get("name"),
       "source":ver.get("source",base["source"]),
       "size":"","speed":"","senses":[],"ability":{"fixed":{},"choose":[]},
       "resist":[],"immune":[],"languages":{"fixed":[],"anyStandard":0,"any":0},
       "skills":{"fixed":[],"choose":None,"any":0},"weapons":[],"armor":[],"tools":[],
       "traits":[],"ancestry":None,"spells":[],"spellChoices":[],"scAbility":None,"spellPicks":[]}
    if ver.get("darkvision"): o["senses"]=["Darkvision "+str(ver["darkvision"])+" ft."]
    sp=parse_spells(ver.get("additionalSpells")); o["spells"]=sp["spells"]; o["spellChoices"]=sp["choices"]; o["scAbility"]=sp["scAbility"]
    pick=detect_spell_pick(ver.get("additionalSpells"))
    if pick:
        o["spellPicks"]=[pick]
        chosen_set={n.lower() for n in pick["from"]}
        o["spells"]=[s for s in o["spells"] if s["name"].lower() not in chosen_set]
    # extract replaced trait entries from _mod
    mod=ver.get("_mod",{}).get("entries")
    items=mod if isinstance(mod,list) else ([mod] if mod else [])
    for m in items:
        it=m.get("items") if isinstance(m,dict) else None
        if isinstance(it,dict) and it.get("name"):
            o["traits"].append({"name":it["name"],"entries":it.get("entries",[])})
    return o

out={"classic":[],"one":[]}
for r in races:
    ed="one" if r.get("edition")=="one" else "classic"
    o=base_obj(r)
    o["isCore"]=(r["name"] in (CORE_XPHB if ed=="one" else CORE_PHB)) and r["source"] in ("PHB","XPHB")
    # lineages: subrace array (match) + _versions
    lin=[]
    for s in subs:
        if s.get("raceName")==r["name"] and s.get("raceSource")==r["source"] and s.get("name"):
            lo=sub_obj(s)
            # disambiguate subraces from non-core books (e.g. two Eladrin: DMG & MTF)
            if s.get("source") not in ("PHB","XPHB"): lo["name"]=lo["name"]+" ("+s.get("source")+")"
            lin.append(lo)
    for v in r.get("_versions",[]) or []:
        if isinstance(v,dict) and v.get("name"): lin.append(version_lineage(o,v))
    o["lineages"]=lin
    out[ed].append(o)

for k in out:
    core="XPHB" if k=="one" else "PHB"
    out[k].sort(key=lambda x:(x["source"]!=core, x["name"]))
p=_os.path.join(_RES, 'data-races.js')
io.open(p,"w",encoding="utf-8").write("// Auto-generated from 5etools v"+datasrc.version()+" races.json\nwindow.CC_RACES = "+json.dumps(out,ensure_ascii=False)+";\n")
print("classic:",len(out["classic"]),"| one:",len(out["one"]),"|",round(os.path.getsize(p)/1024),"KB")
print("homebrew species:",[x["name"] for k in out for x in out[k] if x.get("hb")])
def show(nm,ed):
    r=[x for x in out[ed] if x["name"]==nm and x["isCore"]]
    if not r: r=[x for x in out[ed] if x["name"]==nm]
    r=r[0]
    print("\n== %s (%s) =="%(nm,ed))
    print("  size:",r["size"],"| speed:",r["speed"],"| senses:",r["senses"])
    print("  ability:",r["ability"],"| resist:",r["resist"])
    print("  langs:",r["languages"],"| skills:",r["skills"])
    print("  traits:",[t["name"] for t in r["traits"]],"| ancestry:",bool(r["ancestry"]))
    print("  lineages:",[l["name"] for l in r["lineages"]])
    if r["ancestry"]: print("  ancestry opts:",[o["name"] for o in r["ancestry"]["rows"][:4]],"...")
show("Elf","classic"); show("Dragonborn","classic"); show("Half-Elf","classic"); show("Elf","one")
