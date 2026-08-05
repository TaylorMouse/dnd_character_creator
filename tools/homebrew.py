# Shared homebrew loader.
#
# 5etools ships official content as a folder of files split by type (items.json,
# races.json, class/class-*.json, ...). A homebrew book is instead a single JSON
# holding every type it defines, keyed the same way, plus a _meta.sources block
# naming the book. So the generators can treat a homebrew file as one more
# document to merge, as long as something finds the files and reads the source
# names out of them. That is this module.
#
# Where homebrew is looked for, in order:
#   1. paths in the CC_HOMEBREW environment variable (files or folders, ';' separated)
#   2. <repo>/homebrew/
#   3. <data root>/../homebrew/          (the 5etools convention)
#   4. <data root>/../  and <data root>/../../   (loose files beside the data folder)
#
# Nothing is copied into the repo: the books stay wherever they were downloaded,
# which also keeps third-party content out of the public repository.
import json, io, os, glob

_REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _candidate_dirs(data_root):
    out = []
    env = os.environ.get("CC_HOMEBREW", "")
    for p in env.split(";"):
        p = p.strip()
        if p: out.append(p)
    out.append(os.path.join(_REPO, "homebrew"))
    up1 = os.path.dirname(os.path.abspath(data_root))          # 5etools-vX.Y.Z
    up2 = os.path.dirname(up1)                                  # 5e.tools
    out += [os.path.join(up1, "homebrew"), os.path.join(up2, "homebrew"), up1, up2]
    return out


def _files(data_root):
    seen, out = set(), []
    for d in _candidate_dirs(data_root):
        if os.path.isfile(d):
            paths = [d]
        elif os.path.isdir(d):
            paths = sorted(glob.glob(os.path.join(d, "*.json")))
        else:
            continue
        for p in paths:
            rp = os.path.realpath(p)
            if rp not in seen:
                seen.add(rp); out.append(p)
    return out


def load(data_root):
    """Every homebrew document found, as (docs, sources).

    A file counts as homebrew only if it declares _meta.sources, which is what
    distinguishes a book from the official data files and from unrelated JSON
    that happens to sit in the same folder. Each source dict carries `json`
    (the code used on entries), `abbreviation` (what to show) and `full`.
    """
    docs, sources = [], []
    for p in _files(data_root):
        try:
            d = json.load(io.open(p, encoding="utf-8"))
        except Exception:
            continue                                   # not JSON we can use; ignore quietly
        if not isinstance(d, dict): continue
        srcs = (d.get("_meta") or {}).get("sources")
        if not srcs: continue                          # official data file or unrelated JSON
        d["_file"] = p
        docs.append(d)
        for s in srcs:
            if s.get("json"): sources.append(s)
    return docs, sources


def source_codes(data_root):
    """The set of source codes that come from homebrew, for flagging in the UI."""
    _, sources = load(data_root)
    return set(s["json"] for s in sources)


def merged(data_root, key):
    """Every entry under `key` across all homebrew documents (e.g. 'item')."""
    docs, _ = load(data_root)
    out = []
    for d in docs:
        v = d.get(key)
        if isinstance(v, list): out += v
    return out


def describe(data_root):
    docs, sources = load(data_root)
    return ["%s (%s) - %s" % (s.get("full", "?"), s.get("abbreviation", s["json"]),
                              os.path.basename(d.get("_file", "?")))
            for d in docs for s in (d.get("_meta") or {}).get("sources", [])]
