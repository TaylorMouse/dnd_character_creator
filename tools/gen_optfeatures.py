# Optional-feature pools (Metamagic, Maneuvers, Eldritch Invocations, Fighting Styles...)
# keyed by the 5etools feature-type code, so any feat or class that hands out options from
# one of these lists can offer the real list.
import json, io, os, sys
import datasrc
_DATA_ROOT = datasrc.data_root()
_REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_RES  = os.path.join(_REPO, "resources")

def _flat(v):
    """A prerequisite value can be a string, a list, or a dict with its own summary."""
    if isinstance(v, str): return v
    if isinstance(v, list): return ", ".join(_flat(x) for x in v if x is not None)
    if isinstance(v, dict):
        for k in ("entrySummary", "entry", "name", "level", "other"):
            if k in v: return _flat(v[k])
        return ""
    return str(v)

def prereq_text(prs):
    parts = []
    for pr in prs or []:
        if not isinstance(pr, dict): continue
        seg = []
        if "level" in pr:
            lv = pr["level"]
            seg.append("Level %s" % (lv.get("level") if isinstance(lv, dict) else lv))
        for key, label in (("pact", " pact"), ("patron", ""), ("spell", ""), ("feature", ""),
                           ("optionalfeature", ""), ("item", ""), ("otherSummary", ""), ("other", "")):
            if key in pr and key != "other" or (key == "other" and "otherSummary" not in pr):
                if key in pr:
                    txt = _flat(pr[key])
                    if txt: seg.append(txt.title() + label if key in ("spell", "item", "optionalfeature", "pact") else txt + label)
        if seg: parts.append(", ".join(seg))
    return " OR ".join(parts)

d = json.load(open(os.path.join(_DATA_ROOT, "optionalfeatures.json"), encoding="utf-8"))
byType = {}
for o in d.get("optionalfeature", []):
    ed = "one" if o.get("source") in ("XPHB", "XDMG") else "classic"
    rec = {"name": o.get("name", ""), "source": o.get("source", ""), "edition": ed,
           "prereq": prereq_text(o.get("prerequisite")),
           "entries": o.get("entries", [])}
    if o.get("consumes"): rec["consumes"] = o["consumes"].get("name", "")
    for ft in (o.get("featureType") or []):
        byType.setdefault(ft, []).append(rec)
for ft in byType:
    byType[ft].sort(key=lambda x: (x["name"], x["source"]))

p = os.path.join(_RES, "data-optfeatures.js")
io.open(p, "w", encoding="utf-8").write(
    "// Auto-generated from 5etools optionalfeatures.json by tools/gen_optfeatures.py\n"
    "// feature-type code -> the options in that list (MM Metamagic, MV:B Maneuvers,\n"
    "// EI Eldritch Invocations, FS:F Fighting Styles, ...)\n"
    "window.CC_OPTFEATURES = " + json.dumps(byType, ensure_ascii=False, separators=(",", ":")) + ";\n")
print("optional-feature types:", len(byType), "| options:", sum(len(v) for v in byType.values()),
      "|", round(os.path.getsize(p) / 1024), "KB")
for ft in ("MM", "MV:B", "EI", "FS:F"):
    print("  %-5s %d" % (ft, len(byType.get(ft, []))))
