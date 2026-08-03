# Starting equipment for classes (OR groups + gold) and backgrounds (fixed items).
import json,io,os,glob,re
import sys, os as _os
# 5etools data root: pass as argv[1], else use the default below.
_DEFAULT_DATA = r"E:\D&D\Tools\5e.tools\5etools-v2.33.1\data"
_DATA_ROOT = sys.argv[1] if len(sys.argv) > 1 else _DEFAULT_DATA
_REPO = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
_RES  = _os.path.join(_REPO, "resources")

DATA=_DATA_ROOT
EQUIP={"weaponSimple":"any simple weapon","weaponMartial":"any martial weapon",
 "weaponSimpleMelee":"any simple melee weapon","weaponSimpleRanged":"any simple ranged weapon",
 "focusSpellcastingArcane":"an arcane focus","focusSpellcastingHoly":"a holy symbol",
 "focusSpellcastingDruidic":"a druidic focus","instrumentMusical":"a musical instrument",
 "setGaming":"a gaming set","toolArtisan":"artisan's tools","armorLight":"any light armor",
 "armorMedium":"any medium armor","armorHeavy":"any heavy armor"}
def title(s):
    return " ".join(w if (w and (w[0].isupper() or not w[0].isalpha())) else w.capitalize() for w in s.split(" "))
def gp(cp):
    g=cp/100.0
    return (str(int(g)) if g==int(g) else str(g))+" gp"
def itemname(s):
    if isinstance(s,dict):
        if "special" in s: return s["special"]
        if "item" in s:
            nm=title(s["item"].split("|")[0])
            if s.get("containsValue"): nm+=" (holding "+gp(s["containsValue"])+")"
            return nm
        if "equipmentType" in s: return EQUIP.get(s["equipmentType"],re.sub(r"([A-Z])",r" \1",s["equipmentType"]).lower())
        if "value" in s: return gp(s["value"])
        return ""
    p=s.split("|")
    if len(p)>=3 and p[2]: return p[2]
    return title(p[0])

def class_starting(c):
    se=c.get("startingEquipment")
    if not se: return None
    groups=[]
    for g in se.get("defaultData",[]):
        if "_" in g:
            groups.append({"type":"fixed","items":[itemname(x) for x in g["_"] if itemname(x)]})
        else:
            grp={"type":"or"}
            for opt in ("a","b","c"):
                if opt in g: grp[opt]=[itemname(x) for x in g[opt] if itemname(x)]
            groups.append(grp)
    gold=""
    ga=se.get("goldAlternative")
    if ga:
        m=re.search(r"\{@dice ([^|}]+)",ga)
        gold=(m.group(1) if m else ga).strip()
    return {"groups":groups,"gold":gold}

def slugify(name,edition): return re.sub(r"[^a-z0-9]+","-",name.lower()).strip("-")+"-"+edition

def bg_starting(b):
    se=b.get("startingEquipment")
    if not se: return None
    # take the '_' or 'A' fixed list; capture gold from containsValue / value entries
    items=[]; gold=0
    for block in se:
        arr=block.get("_") or block.get("A") or []
        for x in arr:
            nm=itemname(x);
            if isinstance(x,dict) and x.get("containsValue"): gold+=x["containsValue"]
            if isinstance(x,dict) and set(x.keys())=={"value"}: gold+=x["value"]; continue
            if nm: items.append(nm)
    return {"items":items,"gold":round(gold/100.0)}

out={"classes":{},"backgrounds":{}}
for fn in glob.glob(os.path.join(DATA,"class","class-*.json")):
    if "fluff" in fn: continue
    d=json.load(open(fn,encoding="utf-8"))
    for c in d.get("class",[]):
        s=class_starting(c)
        if s: out["classes"][slugify(c["name"],c.get("edition","classic"))]=s
for b in json.load(open(os.path.join(DATA,"backgrounds.json"),encoding="utf-8"))["background"]:
    s=bg_starting(b)
    if s: out["backgrounds"][b["name"]+"|"+b["source"]]=s
p=_os.path.join(_RES, 'data-starting.js')
io.open(p,"w",encoding="utf-8").write("// Auto-generated from 5etools v2.24.3\nwindow.CC_STARTING = "+json.dumps(out,ensure_ascii=False)+";\n")
print("classes:",len(out["classes"]),"| backgrounds:",len(out["backgrounds"]),"|",round(os.path.getsize(p)/1024),"KB")
print("\nSorcerer classic:",json.dumps(out["classes"]["sorcerer-classic"],indent=1))
print("\nSage PHB:",json.dumps(out["backgrounds"].get("Sage|PHB")))
