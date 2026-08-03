# Slim spell index (with class availability) + per-class spellcasting progression.
import json,io,os,glob,re
import sys, os as _os
# 5etools data root: pass as argv[1], else use the default below.
_DEFAULT_DATA = r"E:\D&D\Tools\5e.tools\5etools-v2.33.1\data"
_DATA_ROOT = sys.argv[1] if len(sys.argv) > 1 else _DEFAULT_DATA
_REPO = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
_RES  = _os.path.join(_REPO, "resources")

DATA=_DATA_ROOT
lookup=json.load(open(os.path.join(DATA,"generated","gendata-spell-source-lookup.json"),encoding="utf-8"))
# normalize lookup keys to lowercase source
LK={}
for src,spells in lookup.items(): LK[src.lower()]={k.lower():v for k,v in spells.items()}
SCHOOL={"A":"Abjuration","C":"Conjuration","D":"Divination","E":"Enchantment","V":"Evocation","I":"Illusion","N":"Necromancy","T":"Transmutation","P":"Psionic"}
ABIL={"str":"Strength","dex":"Dexterity","con":"Constitution","int":"Intelligence","wis":"Wisdom","cha":"Charisma"}

def comp_str(c):
    if not c: return ""
    p=[]
    if c.get("v"): p.append("V")
    if c.get("s"): p.append("S")
    if c.get("m"): p.append("M")
    return ",".join(p)
def range_str(r):
    if not isinstance(r,dict): return ""
    d=r.get("distance") or {}
    t=r.get("type")
    if t=="self": return "Self"+((" ("+str(d.get("amount"))+"-ft. "+r.get("type","")+")") if d.get("amount") else "")
    if t=="touch": return "Touch"
    if t in ("sight","unlimited","special"): return t.capitalize()
    if d.get("type")=="feet": return str(d.get("amount",""))+" ft."
    if d.get("type")=="miles": return str(d.get("amount",""))+" mi."
    if d.get("type")=="self": return "Self"
    return t or ""

def time_str(tl):
    if not tl: return ""
    t=tl[0]; n=t.get("number",1); u=t.get("unit","")
    u={"bonus":"bonus action","action":"action","reaction":"reaction"}.get(u,u)
    s=str(n)+" "+u+("s" if n>1 and u in ("minute","hour") else "")
    if t.get("condition"): s+=", "+t["condition"]
    return s

def dur_str(dl):
    if not dl: return ""
    d=dl[0]; ty=d.get("type")
    if ty=="instant": return "Instantaneous"
    if ty=="permanent": return "Until dispelled"+((" or triggered") if "trigger" in (d.get("ends") or []) else "")
    if ty=="special": return "Special"
    if ty=="timed":
        du=d.get("duration") or {}; amt=du.get("amount"); un=du.get("type","")
        base=str(amt)+" "+un+("s" if amt and amt>1 else "")
        return ("Concentration, up to "+base) if d.get("concentration") else base
    return ty or ""

def comp_full(c):
    if not c: return "—"
    p=[]
    if c.get("v"): p.append("V")
    if c.get("s"): p.append("S")
    if c.get("m"):
        m=c["m"]; txt=(m.get("text") if isinstance(m,dict) else (m if isinstance(m,str) else None))
        p.append("M"+((" ("+txt+")") if txt else ""))
    return ", ".join(p)

def classes_for(spell):
    src=spell["source"].lower(); nm=spell["name"].lower()
    ent=LK.get(src,{}).get(nm)
    out={"classic":[],"one":[]}
    if not ent: return out
    cl=ent.get("class",{})
    for csrc,classes in cl.items():
        ed="one" if csrc.upper()=="XPHB" else "classic"
        for cname in classes:
            if cname not in out[ed]: out[ed].append(cname)
    return out

spells=[]
for fn in glob.glob(os.path.join(DATA,"spells","spells-*.json")):
    d=json.load(open(fn,encoding="utf-8"))
    for s in d.get("spell",[]):
        cls=classes_for(s)
        if not cls["classic"] and not cls["one"]: continue  # only spells assignable to a class
        conc=bool((s.get("duration") or [{}])[0].get("concentration"))
        sld=s.get("scalingLevelDice")
        if isinstance(sld,list): sld=sld[0] if sld else None
        scaling=sld.get("scaling") if isinstance(sld,dict) else None
        _sd=json.dumps(s.get("entries",[]),ensure_ascii=False)
        _md=re.search(r"@damage (\d+d\d+)",_sd)
        basedmg=_md.group(1) if _md else None
        spells.append({
            "name":s["name"],"source":s["source"],"level":s["level"],
            "school":SCHOOL.get(s.get("school"),s.get("school")),
            "cls":cls,"comp":comp_str(s.get("components")),
            "range":range_str(s.get("range")),"conc":conc,"ritual":bool(s.get("meta",{}).get("ritual")),
            "time":time_str(s.get("time")),"duration":dur_str(s.get("duration")),
            "compFull":comp_full(s.get("components")),
            "atk":s.get("spellAttack"),
            "save":(s.get("savingThrow") or [None])[0],
            "scaling":scaling,"dmg":basedmg,
            "dmgType":(s.get("damageInflict") or [None])[0],
            "entries":s.get("entries",[]),
            "higher":[e for hl in (s.get("entriesHigherLevel") or []) for e in hl.get("entries",[])]
        })
# dedupe by name+source
seen=set();uniq=[]
for s in spells:
    k=(s["name"],s["source"])
    if k in seen: continue
    seen.add(k);uniq.append(s)
uniq.sort(key=lambda x:(x["level"],x["name"].lower()))
p1=_os.path.join(_RES, 'data-spells.js')
io.open(p1,"w",encoding="utf-8").write("// Auto-generated from 5etools v2.24.3 spells + spell-source lookup\nwindow.CC_SPELLS = "+json.dumps(uniq,ensure_ascii=False)+";\n")

# spellcasting progression per class slug
def slugify(name,edition): return re.sub(r"[^a-z0-9]+","-",name.lower()).strip("-")+"-"+edition
def toint(x):
    m=re.search(r"\d+",str(x)); return int(m.group()) if m else 0
def parse_slots(c):
    for g in c.get("classTableGroups",[]):
        if g.get("title")=="Spell Slots per Spell Level":
            return {"type":"slots","rows":g.get("rowsSpellProgression") or g.get("rows")}
    for g in c.get("classTableGroups",[]):
        labels=g.get("colLabels") or []
        si=li=None
        for i,l in enumerate(labels):
            if l=="Spell Slots": si=i
            if l=="Slot Level": li=i
        if si is not None and li is not None:
            rows=g.get("rows") or []
            return {"type":"pact","count":[toint(r[si]) if si<len(r) else 0 for r in rows],
                    "level":[toint(r[li]) if li<len(r) else 0 for r in rows]}
    return None

sc={}
for fn in glob.glob(os.path.join(DATA,"class","class-*.json")):
    if "fluff" in fn: continue
    d=json.load(open(fn,encoding="utf-8"))
    for c in d.get("class",[]):
        if not (c.get("casterProgression") or c.get("cantripProgression")): continue
        sc[slugify(c["name"],c.get("edition","classic"))]={
            "ability":ABIL.get(c.get("spellcastingAbility"),c.get("spellcastingAbility")),
            "caster":c.get("casterProgression"),
            "cantrips":c.get("cantripProgression"),
            "known":c.get("spellsKnownProgression"),
            "slots":parse_slots(c),
        }
p2=_os.path.join(_RES, 'data-spellcasting.js')
io.open(p2,"w",encoding="utf-8").write("// Auto-generated from 5etools v2.24.3 class spellcasting\nwindow.CC_SPELLCAST = "+json.dumps(sc,ensure_ascii=False)+";\n")

print("spells:",len(uniq),"|",round(os.path.getsize(p1)/1024),"KB")
print("spellcasting classes:",len(sc))
# checks
def cl(nm,ed,lvl):
    return sorted(s["name"] for s in uniq if s["level"]==lvl and nm in s["cls"][ed])
print("Sorcerer classic cantrips (lvl0) count:",len(cl("Sorcerer","classic",0)))
print("Sorcerer classic L3 spells sample:",cl("Sorcerer","classic",3)[:6])
print("sorcerer-classic spellcast:",json.dumps(sc.get("sorcerer-classic")))
print("wizard-classic known:",sc.get("wizard-classic",{}).get("known"),"(None => prepared caster)")
