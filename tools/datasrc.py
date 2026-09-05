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
DEFAULT_DATA = r"E:\D&D\Tools\5e.tools.src\5etools-src\data"


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
DEFAULT_HOMEBREW = [r"E:\D&D\Tools\5e.tools"]


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
