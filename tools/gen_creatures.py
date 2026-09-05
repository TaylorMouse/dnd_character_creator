# Generate creature (bestiary) data for the Character Creator reference page.
#
# Writes a slim index of every creature for the list and its filters, plus one file per
# source book holding the full stat blocks. The page loads the index up front and pulls a
# book's stat blocks only when you open a creature from it - the whole bestiary in one
# file would be tens of megabytes.
import json,io,os,glob,re,sys,copy as _copylib

import datasrc
_DATA_ROOT = datasrc.data_root()
_REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_RES  = os.path.join(_REPO, "resources")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import homebrew

SIZE={"T":"Tiny","S":"Small","M":"Medium","L":"Large","H":"Huge","G":"Gargantuan"}
ALIGN={"L":"Lawful","N":"Neutral","C":"Chaotic","G":"Good","E":"Evil","U":"Unaligned","A":"Any"}

monsters=[]
for fn in sorted(glob.glob(os.path.join(_DATA_ROOT,"bestiary","bestiary-*.json"))):
    if "fluff" in os.path.basename(fn): continue
    try: d=json.load(open(fn,encoding="utf-8"))
    except Exception: continue
    monsters.extend(d.get("monster",[]))
_hb=homebrew.source_codes(_DATA_ROOT)
monsters.extend(homebrew.merged(_DATA_ROOT,"monster"))

# ---- resolve 5etools "_copy" creatures (a quarter of the bestiary) ----
IDX={(m.get("name"),m.get("source")):m for m in monsters}
def _apply_mod(target,key,ops):
    if not isinstance(ops,list): ops=[ops]
    for op in ops:
        if not isinstance(op,dict): continue
        mode=op.get("mode"); arr=target.get(key)
        if arr is None and mode and mode.endswith("Arr"): arr=[]; target[key]=arr
        items=op.get("items"); items=items if isinstance(items,list) else ([items] if items is not None else [])
        if not isinstance(arr,list): continue
        if mode in ("appendArr","appendIfNotExistsArr"):
            for it in items:
                if mode=="appendIfNotExistsArr" and it in arr: continue
                arr.append(it)
        elif mode=="prependArr": target[key]=items+arr
        elif mode=="insertArr": arr[op.get("index",0):op.get("index",0)]=items
        elif mode=="replaceArr":
            rep=op.get("replace"); rep=rep.get("index") if isinstance(rep,dict) else rep
            new=[];done=False
            for i,el in enumerate(arr):
                nm=el.get("name") if isinstance(el,dict) else el
                if not done and (nm==rep or i==rep): new.extend(items);done=True
                else: new.append(el)
            target[key]=new
        elif mode=="removeArr":
            names=op.get("names") or op.get("items") or []
            names=names if isinstance(names,list) else [names]
            target[key]=[el for el in arr if (el.get("name") if isinstance(el,dict) else el) not in names]
def resolve(m,seen=None):
    if not isinstance(m,dict) or "_copy" not in m: return m
    seen=seen or set(); cp=m["_copy"]; key=(cp.get("name"),cp.get("source"))
    if key in seen or key not in IDX:
        return {k:v for k,v in m.items() if k!="_copy"}
    seen.add(key)
    out=_copylib.deepcopy(resolve(IDX[key],seen))
    for k,v in m.items():
        if k!="_copy": out[k]=_copylib.deepcopy(v)
    try:
        for k,ops in (cp.get("_mod") or {}).items():
            if k!="*": _apply_mod(out,k,ops)
    except Exception: pass
    out.pop("_copy",None)
    return out
monsters=[resolve(m) for m in monsters]

# ---- the versions a stat block carries with it ----
# A creature can bring variants of itself: the Draconic Spirit is one stat block that
# stands for a chromatic, metallic or gem dragon, and Andir Valmakos has a version for
# each level. 5etools lists them as creatures in their own right, so they are built here
# rather than left buried in the parent, where nothing would ever show them.
def _fill(obj,vars):
    """Replace {{name}} placeholders throughout a templated version."""
    if isinstance(obj,str):
        for k,v in vars.items(): obj=obj.replace("{{%s}}"%k,str(v))
        return obj
    if isinstance(obj,list): return [_fill(x,vars) for x in obj]
    if isinstance(obj,dict): return {k:_fill(v,vars) for k,v in obj.items()}
    return obj

def _build_version(base,v):
    out=_copylib.deepcopy(base)
    out.pop("_versions",None)
    mods=v.get("_mod")
    for k,val in v.items():
        if k.startswith("_"): continue
        out[k]=_copylib.deepcopy(val)
    try:
        for k,ops in (mods or {}).items():
            if k!="*": _apply_mod(out,k,ops)
    except Exception: pass
    return out

def expand_versions(m):
    out=[]
    for v in (m.get("_versions") or []):
        if "_abstract" in v:
            for impl in (v.get("_implementations") or []):
                out.append(_build_version(m,_fill(v["_abstract"],impl.get("_variables") or {})))
        else:
            out.append(_build_version(m,v))
    return out

# A creature that copies another inherits its versions too, so the same variant would be
# built once per copy - the Archmage's familiar form appeared twenty-seven times. The first
# of each name wins, and the rest are duplicates of it.
_seen_v={(m.get("name"),m.get("source")) for m in monsters}
_versions=[]
for _m in monsters:
    for _v in expand_versions(_m):
        _key=(_v.get("name"),_v.get("source"))
        if _key in _seen_v: continue
        _seen_v.add(_key)
        _versions.append(_v)
monsters.extend(_versions)

# ---- which printings use the 2024 layout ----
# The two editions lay a stat block out differently: 2024 folds the proficiency bonus into
# the challenge line and calls it CR. The books that mark themselves as the new edition are
# read from the data rather than listed here, so a later printing needs no change.
def _one_sources(root):
    one=set()
    for name in ("races.json","items-base.json","backgrounds.json","feats.json"):
        try: dd=json.load(open(os.path.join(root,name),encoding="utf-8"))
        except Exception: continue
        for arr in dd.values():
            if not isinstance(arr,list): continue
            for o in arr:
                if isinstance(o,dict) and o.get("edition")=="one" and isinstance(o.get("source"),str):
                    one.add(o["source"])
    return one
ONE_SOURCES=_one_sources(_DATA_ROOT)
# a creature given an initiative bonus is written in the new format, whatever book it is in
for _m in monsters:
    if _m.get("initiative") is not None and isinstance(_m.get("source"),str):
        ONE_SOURCES.add(_m["source"])

# ---- values a stat block shows but the data only implies ----
# Experience and proficiency bonus are read off the challenge rating rather than stored,
# so both have to be worked out the way the rules table does.
XP_BY_CR={"0":10,"1/8":25,"1/4":50,"1/2":100,"1":200,"2":450,"3":700,"4":1100,"5":1800,
  "6":2300,"7":2900,"8":3900,"9":5000,"10":5900,"11":7200,"12":8400,"13":10000,"14":11500,
  "15":13000,"16":15000,"17":18000,"18":20000,"19":22000,"20":25000,"21":33000,"22":41000,
  "23":50000,"24":62000,"25":75000,"26":90000,"27":105000,"28":120000,"29":135000,"30":155000}

def xp_for(cr):
    if isinstance(cr,dict):
        if cr.get("xp") is not None: return cr["xp"]
        cr=cr.get("cr")
    return XP_BY_CR.get(str(cr or "").strip())

def pb_for(cr):
    """+2 up to challenge 4, then a step every four ratings."""
    n=cr_num(cr)
    if n < 0: return None
    if n < 5: return 2
    return min(9, 2 + (int(n) - 1) // 4)

# Lair actions and regional effects live in their own file, shared between the creatures
# that use them, and are pulled in by name so the stat block can show them.
_LG={}
try:
    _lgd=json.load(open(os.path.join(_DATA_ROOT,"bestiary","legendarygroups.json"),encoding="utf-8"))
    _lgl=_lgd.get("legendaryGroup",[])
    _LGIDX={(g.get("name"),g.get("source")):g for g in _lgl}
    def _lg_resolve(g,seen=None):
        if "_copy" not in g: return g
        seen=seen or set(); cp=g["_copy"]; key=(cp.get("name"),cp.get("source"))
        if key in seen or key not in _LGIDX:
            return {k:v for k,v in g.items() if k!="_copy"}
        seen.add(key)
        out=_copylib.deepcopy(_lg_resolve(_LGIDX[key],seen))
        for k,v in g.items():
            if k!="_copy": out[k]=_copylib.deepcopy(v)
        out.pop("_copy",None)
        return out
    for g in _lgl:
        r=_lg_resolve(g)
        _LG[(g.get("name"),g.get("source"))]=r
except Exception:
    pass

def legendary_group(m):
    ref=m.get("legendaryGroup")
    if not isinstance(ref,dict): return {}
    g=_LG.get((ref.get("name"),ref.get("source")))
    if not g:
        # the group may be recorded under a different printing of the same book
        for (nm,_src),cand in _LG.items():
            if nm==ref.get("name"): g=cand; break
    if not g: return {}
    return {"lair":g.get("lairActions") or [],
            "regional":g.get("regionalEffects") or [],
            "mythicEnc":g.get("mythicEncounter") or []}

# ---- normalise the bits the list and the stat block need ----
def size_str(s):
    if isinstance(s,list): return "/".join(SIZE.get(x,x) for x in s)
    return SIZE.get(s,s or "")
def type_str(t):
    if isinstance(t,dict):
        base=t.get("type","")
        if isinstance(base,dict): base=base.get("choose",[""])[0]
        tags=[x if isinstance(x,str) else x.get("tag","") for x in (t.get("tags") or [])]
        base=base+(" ("+", ".join(tags)+")" if tags else "")
        if t.get("swarmSize"):
            return "swarm of %s %ss"%(SIZE.get(t["swarmSize"],t["swarmSize"]).lower(),base)
        return base
    return t or ""
def align_str(a):
    if not isinstance(a,list): return ""
    out=[]
    for x in a:
        if isinstance(x,str): out.append(ALIGN.get(x,x))
        elif isinstance(x,dict):
            if x.get("special"): out.append(x["special"])
            elif x.get("alignment"):
                inner=align_str(x["alignment"])
                out.append(("%d%% %s"%(x["chance"],inner)) if x.get("chance") else inner)
    return " ".join(out)
def ac_num(ac):
    if not ac: return None
    a=ac[0]
    return a if isinstance(a,int) else a.get("ac")
def ac_str(ac):
    if not ac: return ""
    parts=[]
    for a in ac:
        if isinstance(a,int): parts.append(str(a))
        else:
            # a summoned creature's armour is a formula, not a number: "14 + the
            # spell's level". It lives under "special" and has no number to read.
            if a.get("special"):
                parts.append(re.sub(r"\{@\w+ ([^}|]+)(\|[^}]*)?\}","\\1",str(a["special"])))
                continue
            v=str(a.get("ac",""))
            frm=a.get("from") or []
            frm=[re.sub(r"\{@\w+ ([^}|]+)(\|[^}]*)?\}",r"\1",f) for f in frm]
            if frm: v+=" ("+", ".join(frm)+")"
            if a.get("condition"): v+=" "+re.sub(r"\{@\w+ ([^}|]+)(\|[^}]*)?\}",r"\1",a["condition"])
            parts.append(v)
    return ", ".join(parts)
def hp_str(hp):
    if not isinstance(hp,dict): return ""
    if hp.get("special"): return str(hp["special"])
    return str(hp.get("average",""))+(" ("+hp["formula"]+")" if hp.get("formula") else "")
MOVES=("walk","burrow","climb","fly","swim")
def _one_speed(k,v,hover):
    """A single movement mode: 'fly 30 ft. (hover)', 'climb 50 ft. (in serpent form)'."""
    cond=""
    if isinstance(v,dict):
        cond=(v.get("condition") or "").strip()
        v=v.get("number")
    lbl=("" if k=="walk" else k+" ")
    s=lbl+"%s ft."%v
    # hover belongs against the flying speed, not loose at the end of the line
    if k=="fly" and hover and "hover" not in cond.lower(): s+=" (hover)"
    if cond: s+=" "+(cond if cond.startswith("(") else "("+cond+")")
    return s
def speed_str(sp):
    if isinstance(sp,(int,float)): return "%d ft."%sp
    if not isinstance(sp,dict): return ""
    hover=bool(sp.get("canHover"))
    out=[_one_speed(k,sp[k],hover) for k in MOVES if sp.get(k) is not None]
    # a second set of speeds for another shape the creature can take
    alt=sp.get("alternate") or {}
    for k in MOVES:
        for v in (alt.get(k) or []):
            out.append(_one_speed(k,v,hover))
    return ", ".join(out)
def cr_str(cr):
    if cr is None: return ""
    if isinstance(cr,dict): return str(cr.get("cr",""))
    return str(cr)
def cr_num(cr):
    s=cr_str(cr)
    if not s: return -1.0
    if "/" in s:
        a,b=s.split("/",1)
        try: return float(a)/float(b)
        except Exception: return -1.0
    try: return float(s)
    except Exception: return -1.0

index=[]; by_src={}
for m in monsters:
    if not m.get("name") or not m.get("source"): continue
    src=m["source"]
    full={
      "name":m["name"],"source":src,"hb":src in _hb,
      "size":size_str(m.get("size")),"type":type_str(m.get("type")),
      "align":align_str(m.get("alignment")),
      "ac":ac_str(m.get("ac")),"hp":hp_str(m.get("hp")),"speed":speed_str(m.get("speed")),
      "cr":cr_str(m.get("cr")),
      "abil":{k:m.get(k) for k in ("str","dex","con","int","wis","cha")},
      "save":m.get("save"),"skill":m.get("skill"),
      "senses":m.get("senses") or [],"passive":m.get("passive"),
      "languages":m.get("languages") or [],
      "resist":m.get("resist"),"immune":m.get("immune"),
      "vulnerable":m.get("vulnerable"),"conditionImmune":m.get("conditionImmune"),
      "trait":m.get("trait") or [],"action":m.get("action") or [],
      "bonus":m.get("bonus") or [],"reaction":m.get("reaction") or [],
      "legendary":m.get("legendary") or [],"legendaryHeader":m.get("legendaryHeader") or [],
      # nearly every legendary creature leaves the opening paragraph to be worked out
      # from these: how many actions (three unless stated) and what to call the creature
      "legendaryActions":m.get("legendaryActions"),
      "shortName":m.get("shortName"),"named":bool(m.get("isNamedCreature")),
      "mythic":m.get("mythic") or [],"spellcasting":m.get("spellcasting") or [],
      "environment":m.get("environment") or [],
      # where to find it in print
      "page":m.get("page"),
      # read off the challenge rating rather than stored with the creature
      "xp":xp_for(m.get("cr")),"pb":m.get("pbNote") or pb_for(m.get("cr")),
      "crLair":(m["cr"].get("lair") if isinstance(m.get("cr"),dict) else None),
      "xpLair":(m["cr"].get("xpLair") if isinstance(m.get("cr"),dict) else None),
      "crCoven":(m["cr"].get("coven") if isinstance(m.get("cr"),dict) else None),
      "xpCoven":(m["cr"].get("xpCoven") if isinstance(m.get("cr"),dict) else None),
      "ed":("2024" if src in ONE_SOURCES else "2014"),
      # 2024 stat blocks
      "initiative":m.get("initiative"),"gear":m.get("gear") or [],
      # small qualifiers that change what a line means
      "alignPrefix":m.get("alignmentPrefix"),"sizeNote":m.get("sizeNote"),
      "actionHeader":m.get("actionHeader") or [],"actionNote":m.get("actionNote"),
      "bonusHeader":m.get("bonusHeader") or [],
      "reactionHeader":m.get("reactionHeader") or [],"reactionNote":m.get("reactionNote"),
      "mythicHeader":m.get("mythicHeader") or [],
      # optional rules printed alongside the creature
      "variant":m.get("variant") or [],
      # where the creature comes from, when it is not simply encountered
      "summonSpell":m.get("summonedBySpell"),"summonLevel":m.get("summonedBySpellLevel"),
      "summonClass":m.get("summonedByClass"),"level":m.get("level"),
      "familiar":bool(m.get("familiar")),"treasure":m.get("treasure") or [],
    }
    full.update(legendary_group(m))   # lair actions and regional effects, where it has them
    by_src.setdefault(src,{})[m["name"]]=full
    index.append({"n":m["name"],"s":src,"sz":full["size"],"t":full["type"],
                  "cr":full["cr"],"crn":cr_num(m.get("cr")),"ac":ac_num(m.get("ac")),
                  "hp":(m.get("hp") or {}).get("average") if isinstance(m.get("hp"),dict) else None,
                  "hb":full["hb"]})

# ---- the lore behind each creature ----
# 5etools keeps this apart from the stat block, in its own files, and shows it on an Info
# tab. It is kept apart here too, one file per book loaded only when a creature is opened,
# because it is bulkier than the stat blocks and most of a session never asks for it.
# The artwork the same files reference is left alone: it is not ours to redistribute.
fluff=[]
for fn in sorted(glob.glob(os.path.join(_DATA_ROOT,"bestiary","fluff-bestiary-*.json"))):
    try: fluff.extend(json.load(open(fn,encoding="utf-8")).get("monsterFluff",[]))
    except Exception: pass
fluff.extend(homebrew.merged(_DATA_ROOT,"monsterFluff"))

FIDX={(f.get("name"),f.get("source")):f for f in fluff}
def _fl_resolve(f,seen=None):
    """Fluff copies from other fluff the same way a creature copies another creature."""
    if not isinstance(f,dict) or "_copy" not in f: return f
    seen=seen or set(); cp=f["_copy"]; key=(cp.get("name"),cp.get("source"))
    if key in seen or key not in FIDX:
        return {k:v for k,v in f.items() if k!="_copy"}
    seen.add(key)
    out=_copylib.deepcopy(_fl_resolve(FIDX[key],seen))
    for k,v in f.items():
        if k!="_copy": out[k]=_copylib.deepcopy(v)
    try:
        for k,ops in (cp.get("_mod") or {}).items():
            if k!="*": _apply_mod(out,k,ops)
    except Exception: pass
    out.pop("_copy",None)
    return out

lore_by_src={}
for f in fluff:
    r=_fl_resolve(f)
    ent=r.get("entries")
    if not ent: continue                      # a record holding only artwork
    src=r.get("source") or f.get("source")
    if not src: continue
    lore_by_src.setdefault(src,{})[r.get("name") or f.get("name")]=ent

index.sort(key=lambda x:(x["n"].lower(),x["s"]))
p=os.path.join(_RES,"data-creatures.js")
io.open(p,"w",encoding="utf-8").write(
  "// Auto-generated from the 5etools bestiary by tools/gen_creatures.py\n"
  "window.CC_CREATURES = "+json.dumps(index,ensure_ascii=False,separators=(",",":"))+";\n")

outdir=os.path.join(_RES,"creatures")
if not os.path.isdir(outdir): os.makedirs(outdir)
for old in glob.glob(os.path.join(outdir,"*.js")): os.remove(old)
def slug(s): return re.sub(r"[^A-Za-z0-9]+","_",s)
total=0
for src,blocks in by_src.items():
    fp=os.path.join(outdir,slug(src)+".js")
    io.open(fp,"w",encoding="utf-8").write(
      "window.CC_CREATURE_DATA = window.CC_CREATURE_DATA || {};\n"
      "window.CC_CREATURE_DATA["+json.dumps(src)+"] = "+json.dumps(blocks,ensure_ascii=False,separators=(",",":"))+";\n")
    total+=os.path.getsize(fp)

# Some lore records describe a family rather than a creature - "Trolls", "Dinosaurs",
# "Quori" - and match no stat block, so they would never be shown. They are dropped
# rather than shipped.
for _src in list(lore_by_src):
    _have=by_src.get(_src) or {}
    lore_by_src[_src]={k:v for k,v in lore_by_src[_src].items() if k in _have}
    if not lore_by_src[_src]: del lore_by_src[_src]

for src,bag in lore_by_src.items():
    fp=os.path.join(outdir,"lore-"+slug(src)+".js")
    io.open(fp,"w",encoding="utf-8").write(
      "window.CC_CREATURE_LORE = window.CC_CREATURE_LORE || {};"+chr(10)+
      "window.CC_CREATURE_LORE["+json.dumps(src)+"] = "+json.dumps(bag,ensure_ascii=False,separators=(",",":"))+";"+chr(10))

print("creatures:",len(index),"| sources:",len(by_src))
# sizes are read after the loop, once every file is closed and flushed
ltotal=sum(os.path.getsize(f) for f in glob.glob(os.path.join(outdir,"lore-*.js")))
print("lore: %d creatures | %d KB across %d files"%(
  sum(len(v) for v in lore_by_src.values()),ltotal//1024,len(lore_by_src)))
print("index: %d KB | stat blocks: %d KB across %d files"%(os.path.getsize(p)//1024,total//1024,len(by_src)))
print("homebrew:",sorted({m["s"] for m in index if m["hb"]}) or "none")
