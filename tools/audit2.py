# Comprehensive audit: find grants/choices a character could gain that the app may not apply.
import json, io, os, glob, re
RES="resources"
def load_js(p):
    t=io.open(p,encoding="utf-8").read(); return json.loads(t[t.index("= ")+2:t.rindex(";")])
def load_feat(p):
    t=io.open(p,encoding="utf-8").read(); return json.loads(t[t.index("] = ")+4:t.rindex(";")])
def txt(e,a):
    if isinstance(e,str): a.append(e)
    elif isinstance(e,list): [txt(x,a) for x in e]
    elif isinstance(e,dict): [txt(v,a) for k,v in e.items() if k not in ("type","name","source")]
def ftext(f):
    a=[]; txt(f.get("entries"),a); return " ".join(a)

issues={}
def flag(cat,msg): issues.setdefault(cat,[]).append(msg)

# iterate every class/subclass feature (incl. refLookup, which holds nested feature text)
def all_features():
    for p in sorted(glob.glob(os.path.join(RES,"features","*.js"))):
        o=load_feat(p); key=o["key"]
        feats=[("class",f) for f in o.get("classFeatures",[])]
        for s in o.get("subclasses",[]):
            feats+=[(s["name"],f) for f in s.get("features",[])]
        for k,f in (o.get("refLookup") or {}).items():
            feats.append(("ref",f))
        for where,f in feats:
            yield key,where,f

# --- 1. permanent damage resistances/immunities stated in feature text (are these applied?) ---
RESIST=re.compile(r"you have resistance to ([a-z, ]+?) damage",re.I)
IMMUNE=re.compile(r"you (?:are|have) immun\w* to ([a-z, ]+?) damage",re.I)
for key,where,f in all_features():
    t=ftext(f)
    # skip clearly-temporary ("for 1 minute", "while raging", "gain resistance ... as a bonus action")
    temp = re.search(r"for 1 minute|while raging|bonus action|until your rage|when you rage|for the duration",t,re.I)
    m=RESIST.search(t)
    if m and not temp:
        flag("feature-resist","%s / %s : %s -> resistance to %s"%(key,where,f.get("name"),m.group(1).strip()))
    m=IMMUNE.search(t)
    if m and not temp:
        flag("feature-immune","%s / %s : %s -> immune to %s"%(key,where,f.get("name"),m.group(1).strip()))

# --- 2. darkvision / senses granted by a feature ---
for key,where,f in all_features():
    t=ftext(f)
    if re.search(r"\bdarkvision\b",t,re.I) and re.search(r"you (?:have|gain|can see)",t,re.I) and "superior darkvision" not in t.lower():
        flag("feature-darkvision","%s / %s : %s"%(key,where,f.get("name")))

# --- 3. CHOICE grants a feature offers (language/tool/skill of your choice) that need a picker ---
for key,where,f in all_features():
    t=ftext(f)
    if re.search(r"one language of your choice|a language of your choice",t,re.I):
        flag("choice-language","%s / %s : %s"%(key,where,f.get("name")))
    if re.search(r"(?:type of )?(?:artisan'?s? )?tools? of your choice|one tool of your choice",t,re.I):
        flag("choice-tool","%s / %s : %s"%(key,where,f.get("name")))

# --- 4. ability score increase granted by a feature (not the standard ASI) ---
for key,where,f in all_features():
    t=ftext(f)
    if re.search(r"increases? by \d|increase.{0,20}(?:score).{0,20}by \d",t,re.I) and "ability score improvement" not in (f.get("name","").lower()):
        if re.search(r"(strength|dexterity|constitution|intelligence|wisdom|charisma) (?:score )?increases? by",t,re.I):
            flag("feature-asi","%s / %s : %s"%(key,where,f.get("name")))

# --- 5. features that grant a skill 'of your choice' (needs picker) ---
for key,where,f in all_features():
    t=ftext(f)
    if re.search(r"proficiency in (?:one|two) (?:skill|of the following skills) .{0,20}of your choice|skills? of your choice",t,re.I):
        flag("choice-skill","%s / %s : %s"%(key,where,f.get("name")))

# --- report ---
total=sum(len(v) for v in issues.values())
print("AUDIT2 —",total,"items across",len(issues),"categories\n")
for cat in sorted(issues):
    items=issues[cat]; uniq=sorted(set(items))
    print("== %s (%d unique) =="%(cat,len(uniq)))
    for m in uniq[:20]: print("  ",m)
    if len(uniq)>20: print("   ...and %d more"%(len(uniq)-20))
    print()
