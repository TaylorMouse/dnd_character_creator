# Generate resolved race/species data for the Character Creator.
import json,io,os,re
import sys, os as _os
# 5etools data root: pass as argv[1], else use the default below.
_DEFAULT_DATA = r"E:\D&D\Tools\5e.tools\5etools-v2.33.1\data"
_DATA_ROOT = sys.argv[1] if len(sys.argv) > 1 else _DEFAULT_DATA
_REPO = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
_RES  = _os.path.join(_REPO, "resources")

DATA=_DATA_ROOT
d=json.load(open(os.path.join(DATA,"races.json"),encoding="utf-8"))
races=d["race"]; subs=d.get("subrace",[])
ABIL={"str":"Strength","dex":"Dexterity","con":"Constitution","int":"Intelligence","wis":"Wisdom","cha":"Charisma"}
SIZE={"T":"Tiny","S":"Small","M":"Medium","L":"Large","H":"Huge","G":"Gargantuan"}
CORE_PHB={"Dragonborn","Dwarf","Elf","Gnome","Half-Elf","Half-Orc","Halfling","Human","Tiefling"}
CORE_XPHB={"Aasimar","Dragonborn","Dwarf","Elf","Gnome","Goliath","Halfling","Human","Orc","Tiefling"}

def tcase(s): return s.title() if isinstance(s,str) and s.islower() else s
def spell_name(s):
    return tcase(s.split("|")[0].split("#")[0].strip())

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

def parse_langs(arr):
    fixed=[]; anyStd=0; anyN=0
    for blk in arr or []:
        if not isinstance(blk,dict): continue
        for k,v in blk.items():
            if k=="anyStandard": anyStd+=v
            elif k=="any": anyN+=v
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

def base_obj(r):
    # 5etools marks MPMM/VRGR-style species with `lineage`; their ability increases and
    # languages are not stored per race because the book states them once:
    # "Common and one other language that you and your DM agree is appropriate".
    langs = parse_langs(r.get("languageProficiencies"))
    lineage = bool(r.get("lineage"))
    lang_note = ""
    if lineage and not r.get("languageProficiencies"):
        langs = {"fixed": ["Common"], "anyStandard": 0, "any": 1, "choose": None}
        lang_note = ("You can speak, read and write Common and one other language that you "
                     "and your DM agree is appropriate for your character.")
    o={
      "name":r.get("name",""),"source":r.get("source",""),"edition":r.get("edition","classic"),
      "lineage":lineage,"langNote":lang_note,
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
    }
    sp=parse_spells(r.get("additionalSpells"))
    o["spells"]=sp["spells"]; o["spellChoices"]=sp["choices"]; o["scAbility"]=sp["scAbility"]
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
       "traits":[],"ancestry":None,"spells":[],"spellChoices":[],"scAbility":None}
    if ver.get("darkvision"): o["senses"]=["Darkvision "+str(ver["darkvision"])+" ft."]
    sp=parse_spells(ver.get("additionalSpells")); o["spells"]=sp["spells"]; o["spellChoices"]=sp["choices"]; o["scAbility"]=sp["scAbility"]
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
io.open(p,"w",encoding="utf-8").write("// Auto-generated from 5etools v2.24.3 races.json\nwindow.CC_RACES = "+json.dumps(out,ensure_ascii=False)+";\n")
print("classic:",len(out["classic"]),"| one:",len(out["one"]),"|",round(os.path.getsize(p)/1024),"KB")
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
