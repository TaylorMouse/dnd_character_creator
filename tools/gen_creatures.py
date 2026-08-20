# Generate creature (bestiary) data for the Character Creator reference page.
#
# Writes a slim index of every creature for the list and its filters, plus one file per
# source book holding the full stat blocks. The page loads the index up front and pulls a
# book's stat blocks only when you open a creature from it - the whole bestiary in one
# file would be tens of megabytes.
import json,io,os,glob,re,sys,copy as _copylib

_DEFAULT_DATA = r"E:\D&D\Tools\5e.tools\5etools-v2.33.1\data"
_DATA_ROOT = sys.argv[1] if len(sys.argv) > 1 else _DEFAULT_DATA
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

# ---- normalise the bits the list and the stat block need ----
def size_str(s):
    if isinstance(s,list): return "/".join(SIZE.get(x,x) for x in s)
    return SIZE.get(s,s or "")
def type_str(t):
    if isinstance(t,dict):
        base=t.get("type","")
        if isinstance(base,dict): base=base.get("choose",[""])[0]
        tags=[x if isinstance(x,str) else x.get("tag","") for x in (t.get("tags") or [])]
        return base+(" ("+", ".join(tags)+")" if tags else "")
    return t or ""
def align_str(a):
    if not isinstance(a,list): return ""
    out=[]
    for x in a:
        if isinstance(x,str): out.append(ALIGN.get(x,x))
        elif isinstance(x,dict):
            if x.get("special"): out.append(x["special"])
            elif x.get("alignment"): out.append(align_str(x["alignment"]))
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
def speed_str(sp):
    if isinstance(sp,(int,float)): return "%d ft."%sp
    if not isinstance(sp,dict): return ""
    out=[]
    for k in ("walk","burrow","climb","fly","swim"):
        v=sp.get(k)
        if v is None: continue
        if isinstance(v,dict): v=v.get("number")
        lbl=("" if k=="walk" else k+" ")
        out.append(lbl+"%s ft."%v)
    if sp.get("canHover"): out.append("(hover)")
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
      "mythic":m.get("mythic") or [],"spellcasting":m.get("spellcasting") or [],
      "environment":m.get("environment") or [],
    }
    by_src.setdefault(src,{})[m["name"]]=full
    index.append({"n":m["name"],"s":src,"sz":full["size"],"t":full["type"],
                  "cr":full["cr"],"crn":cr_num(m.get("cr")),"ac":ac_num(m.get("ac")),
                  "hp":(m.get("hp") or {}).get("average") if isinstance(m.get("hp"),dict) else None,
                  "hb":full["hb"]})

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

print("creatures:",len(index),"| sources:",len(by_src))
print("index: %d KB | stat blocks: %d KB across %d files"%(os.path.getsize(p)//1024,total//1024,len(by_src)))
print("homebrew:",sorted({m["s"] for m in index if m["hb"]}) or "none")
