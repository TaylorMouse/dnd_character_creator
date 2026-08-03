# Slim item index (base + magic) for the equipment browser.
import json,io,os,re
import sys, os as _os
# 5etools data root: pass as argv[1], else use the default below.
_DEFAULT_DATA = r"E:\D&D\Tools\5e.tools\5etools-v2.33.1\data"
_DATA_ROOT = sys.argv[1] if len(sys.argv) > 1 else _DEFAULT_DATA
_REPO = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
_RES  = _os.path.join(_REPO, "resources")

DATA=_DATA_ROOT
_ib=json.load(open(os.path.join(DATA,"items-base.json"),encoding="utf-8"))
base=_ib["baseitem"]
items=json.load(open(os.path.join(DATA,"items.json"),encoding="utf-8"))["item"]
# weapon/item property code -> readable name
PMAP={}
for p in _ib.get("itemProperty",[]):
    ab=p.get("abbreviation")
    nm=None
    if isinstance(p.get("entries"),list) and p["entries"] and isinstance(p["entries"][0],dict): nm=p["entries"][0].get("name")
    nm=nm or p.get("name") or ab
    if ab and ab not in PMAP: PMAP[ab]=nm
def propcode(x): return PMAP.get(str(x).split("|")[0],str(x).split("|")[0])

def typecode(t):
    if not t: return ""
    return str(t).split("|")[0]
CAT={"LA":"Armor","MA":"Armor","HA":"Armor","S":"Armor",
     "M":"Weapon","R":"Weapon",
     "P":"Potion","RG":"Ring","RD":"Rod","SC":"Scroll","ST":"Staff","WD":"Wand","W":"Wondrous"}
def category(it):
    return CAT.get(typecode(it.get("type")),"Other Gear")
ARMOR_KIND={"LA":"light","MA":"medium","HA":"heavy","S":"shield"}

def slim(it):
    tc=typecode(it.get("type"))
    o={"name":it["name"],"source":it["source"],"cat":category(it),
       "rarity":it.get("rarity","none") or "none"}
    if it.get("value"): o["value"]=it["value"]  # cp
    # armor
    if it.get("armor") or tc in ("LA","MA","HA","S"):
        o["ac"]=it.get("ac"); o["armorKind"]=ARMOR_KIND.get(tc,"")
        if it.get("stealth"): o["stealthDis"]=True
    # weapon
    if it.get("weaponCategory") or tc in ("M","R"):
        o["dmg"]=it.get("dmg1"); o["dmgType"]=it.get("dmgType")
        o["weaponCat"]=it.get("weaponCategory","")
        o["wtype"]=tc  # M (melee) or R (ranged)
        if it.get("range"): o["range"]=it["range"]
        if it.get("property"): o["props"]=[propcode(x) for x in it["property"]]
    if it.get("wondrous"): o["cat"]="Wondrous"
    if it.get("entries"): o["entries"]=it["entries"]
    if it.get("edition"): o["edition"]=it["edition"]   # base items say 'classic' / 'one'
    ra=it.get("reqAttune")
    if ra: o["attune"]=ra          # True | "optional" | condition string e.g. "by a spellcaster"
    if it.get("bonusWeapon"): o["bonusWeapon"]=it["bonusWeapon"]   # "+1" / "+2" / "+3"
    if it.get("bonusAc"): o["bonusAc"]=it["bonusAc"]
    if it.get("baseItem"): o["baseItem"]=it["baseItem"].split("|")[0]
    # category flags so magic variants can be matched to legal base weapons
    tags=[k for k in ("weapon","sword","axe","bow","crossbow","dagger","hammer","mace","polearm","spear","club","staff") if it.get(k) is True]
    if tags: o["tags"]=tags
    return o

seen=set(); out=[]
for it in list(base)+list(items):
    if not it.get("name") or not it.get("source"): continue
    key=(it["name"],it["source"])
    if key in seen: continue
    seen.add(key)
    # skip generic/group placeholders
    if it.get("type") and typecode(it["type"]) in ("$",): continue
    out.append(slim(it))
# magic variants (Flame Tongue, Frost Brand, Vorpal, +1/+2/+3 gear, etc.)
mvs=json.load(open(os.path.join(DATA,"magicvariants.json"),encoding="utf-8"))["magicvariant"]
def variant_cat(v):
    for r in (v.get("requires") or []):
        if r.get("sword") or r.get("weapon") or r.get("bow") or r.get("crossbow") or r.get("dmgType") or r.get("type") in ("M","R"): return "Weapon"
        if r.get("armor") or r.get("type") in ("LA","MA","HA","S"): return "Armor"
    nm=v.get("name","").lower()
    if any(w in nm for w in ("ammunition","arrow","bolt","weapon")): return "Weapon"
    if "armor" in nm or "shield" in nm: return "Armor"
    if "ring" in nm: return "Ring"
    return "Wondrous"
vseen=set()
for v in mvs:
    nm=v.get("name")
    if not nm or nm in vseen: continue
    vseen.add(nm)
    inh=v.get("inherits") or {}
    vo={"name":nm,"source":inh.get("source","") or "","cat":variant_cat(v),"rarity":(inh.get("rarity") or "none"),"variant":True}
    if inh.get("entries"): vo["entries"]=inh["entries"]
    if inh.get("reqAttune"): vo["attune"]=inh["reqAttune"]
    if inh.get("bonusWeapon"): vo["bonusWeapon"]=inh["bonusWeapon"]
    if inh.get("bonusAc"): vo["bonusAc"]=inh["bonusAc"]
    # which base items this variant may be applied to (e.g. [{"sword":true}] -> ["sword"])
    req=[]
    for r in (v.get("requires") or []):
        for k,val in r.items():
            if val is True and k not in req: req.append(k)
    if req: vo["requires"]=req
    out.append(vo)
out.sort(key=lambda x:x["name"].lower())
p=_os.path.join(_RES, 'data-items.js')
io.open(p,"w",encoding="utf-8").write("// Auto-generated from 5etools v2.24.3 items-base.json + items.json\nwindow.CC_ITEMS = "+json.dumps(out,ensure_ascii=False)+";\n")
from collections import Counter
print("items:",len(out),"|",round(os.path.getsize(p)/1024),"KB")
print("by category:",Counter(x["cat"] for x in out))
# samples
for nm in ("Leather Armor","Shield","Longsword","Potion of Healing"):
    m=[x for x in out if x["name"]==nm]
    if m: print(nm,"->",json.dumps(m[0]))
