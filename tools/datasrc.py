"""Where the 5etools data lives, and which release it is.

Every generator used to carry its own copy of the path, so pointing them at a new mirror
meant editing fourteen files and the version stamped into the generated headers drifted
behind twice. They all read it from here instead.

Order of preference: an explicit path on the command line, then CC_5ETOOLS_DATA in the
environment, then the default below.

    python tools/gen_items.py                       # the default mirror
    python tools/gen_items.py D:\\other\\5etools\\data  # somewhere else, just this once
"""
import os, sys, json, re

# The mirror to read unless told otherwise.
DEFAULT_DATA = r"E:\D&D\Tools\5e.tools.src\data"


def data_root(argv=None):
    """The data folder to read, honouring an argument or the environment."""
    argv = sys.argv if argv is None else argv
    if len(argv) > 1 and argv[1].strip():
        return argv[1]
    return os.environ.get("CC_5ETOOLS_DATA") or DEFAULT_DATA


# Homebrew books are not part of a 5etools release: they are downloaded separately and
# kept outside the repository. They used to be found only because they happened to sit
# beside the data folder, which stopped being true the moment the mirror moved - and the
# only sign was a quietly empty homebrew list. Say where they are instead.
#
# Named file by file rather than by folder: the book now lives among a campaign's working
# files, and pointing at that folder would read the adventure JSON beside it as another
# homebrew book. Run this module directly to see whether these paths still resolve.
DEFAULT_HOMEBREW = [
    r"E:\D&D\Campaigns\Vecna - Eve of Ruin\Adventure\Griffin Macaulay; The Griffon's Saddlebag, Book 2.json",
]


def homebrew_paths():
    """Folders or files to search for homebrew, from CC_HOMEBREW or the default."""
    env = os.environ.get("CC_HOMEBREW", "")
    out = [p.strip() for p in env.split(";") if p.strip()]
    return out + [p for p in DEFAULT_HOMEBREW if p not in out]


def version(root=None):
    """The release this mirror is, for stamping into what we generate.

    Read from the checkout's own package.json where there is one, since that is the
    release's own statement of what it is. Falling back to the folder name covers the
    zipped builds, which are named for their version and carry no package.json.
    """
    root = root or data_root()
    parent = os.path.dirname(os.path.abspath(root))
    pkg = os.path.join(parent, "package.json")
    if os.path.exists(pkg):
        try:
            with open(pkg, encoding="utf-8") as f:
                v = json.load(f).get("version")
            if v:
                return str(v)
        except Exception:
            pass
    m = re.search(r"(\d+\.\d+\.\d+)", parent)
    return m.group(1) if m else "unknown"


def banner(what):
    """The comment line that heads a generated file, naming where it came from."""
    return "// Auto-generated from 5etools v%s: %s\n" % (version(), what)


if __name__ == "__main__":
    print("data root: %s" % data_root())
    print("version  : %s" % version())
    print("homebrew : %s" % ", ".join(homebrew_paths()))


# ---- class slugs -------------------------------------------------------------------
# A class is addressed everywhere by a slug built from its name and edition, and saved
# characters record it, so the official printing must keep the bare form for ever.
#
# That stopped being automatic when 5etools added the World of Warcraft book, which has
# its own Druid, Monk, Paladin, Rogue and Warlock. Two classes then wanted "druid-classic"
# and the second written replaced the first, leaving the official Druid with no features
# and no subclasses. Nothing errored: the file was simply the wrong class.
#
# Every generator that keys by slug must agree on the answer, so the rule lives here.
OFFICIAL_SOURCES = {
    "PHB", "XPHB", "DMG", "XDMG", "MM", "XMM", "TCE", "XGE", "SCAG", "EFA", "ERLW",
    "MOT", "AI", "EGW", "MPMM", "VGM", "SCC", "BMT", "DSotDQ", "FTD", "SatO", "TDCSR",
}


def _slug(name, edition):
    import re
    return re.sub(r"[^a-z0-9]+", "-", str(name).lower()).strip("-") + "-" + str(edition)


def build_class_slugs(classes):
    """Map every class to its slug, official printings keeping the bare form.

    `classes` is the raw class dicts from data/class/class-*.json. Returns a dict keyed
    by (name, edition, source), so a generator can look up whichever it is holding.
    """
    def order(c):
        src = c.get("source", "")
        return (0 if src in OFFICIAL_SOURCES else 1, str(src), str(c.get("name", "")))

    out, taken = {}, {}
    for c in sorted(classes, key=order):
        name = c.get("name", "")
        edition = c.get("edition", "classic")
        source = c.get("source", "")
        slug = _slug(name, edition)
        if slug in taken and taken[slug] != source:
            slug = _slug("%s-%s" % (name, source or "alt"), edition)
        taken[slug] = source
        out[(name, edition, source)] = slug
    return out


_CLASS_SLUGS = None


def class_slug(c, root=None):
    """The slug for one class dict, consistent across every generator.

    The map is built once from the mirror's own class files, so a generator that streams
    them one at a time still gets the same answer as one that holds them all.
    """
    global _CLASS_SLUGS
    if _CLASS_SLUGS is None:
        import glob, json
        classes = []
        for fn in glob.glob(os.path.join(root or data_root(), "class", "class-*.json")):
            try:
                with open(fn, encoding="utf-8") as fh:
                    classes += json.load(fh).get("class", [])
            except Exception:
                pass
        _CLASS_SLUGS = build_class_slugs(classes)
    key = (c.get("name", ""), c.get("edition", "classic"), c.get("source", ""))
    return _CLASS_SLUGS.get(key) or _slug(c.get("name", ""), c.get("edition", "classic"))
