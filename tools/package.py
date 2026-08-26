"""Zip the app for handing to someone else, and optionally drop the zip somewhere.

The package holds what the app needs to run when opened by double-clicking: the pages,
the styles, the script and the generated data. It leaves out everything that only matters
while working on it - tools/, the git directory, the PowerPoint and PDF templates, and any
earlier zips.

Saved characters are left out, but the empty Characters folder is kept: that is where the
app saves to and loads from, so whoever unpacks this needs it to exist.

    python tools/package.py                 # write "Character Creator.zip" beside the app
    python tools/package.py --to <folder>   # also copy it there (e.g. a synced OneDrive folder)
    python tools/package.py --with-characters  # include the saved characters too
"""
import os, sys, zipfile, shutil, argparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZIP_NAME = "Character Creator.zip"

# directories never worth shipping
SKIP_DIRS = {".git", "tools", "__pycache__", "scratchpad", ".vs", ".idea", "temp"}
# files that only matter while working on the app
SKIP_FILES = {
    ".gitignore", ".gitattributes",
    # credentials for the upload hook, which have no business in a hand-out package
    "dropbox.app",
    # the sheet template and its exports are used by the PowerPoint pipeline, not the app
    os.path.join("resources", "character_creator_template.pptx"),
    os.path.join("resources", "character_creator_template.pdf"),
    # the form-fillable sheet the print view replaced; nothing loads these any more
    os.path.join("resources", "pdf-sheet-template.js"),
    os.path.join("resources", "pdf-sheet-fields.js"),
}
SKIP_EXT = {".zip", ".pyc", ".bak", ".tmp", ".orig", ".rej", ".new",
            # credentials never travel with the app
            ".accesstoken", ".refreshtoken"}


def wanted(rel):
    parts = rel.replace("\\", "/").split("/")
    if any(p in SKIP_DIRS for p in parts[:-1]):
        return False
    if parts[0] in SKIP_DIRS:
        return False
    if rel in SKIP_FILES or parts[-1] in SKIP_FILES:
        return False
    if os.path.splitext(rel)[1].lower() in SKIP_EXT:
        return False
    # credentials, whatever they are called: renaming one must not smuggle it in
    if parts[-1].lower().startswith("dropbox."):
        return False
    return True


def collect(include_characters=False):
    out = []
    for base, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for fn in files:
            rel = os.path.relpath(os.path.join(base, fn), ROOT)
            if not include_characters and rel.replace("\\", "/").startswith("Characters/"):
                continue          # somebody else's characters are not ours to hand out
            if wanted(rel):
                out.append(rel)
    out.sort()
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--to", help="folder to copy the finished zip into")
    ap.add_argument("--with-characters", action="store_true",
                    help="include the saved characters as well (they are left out by default)")
    ap.add_argument("--quiet", action="store_true")
    a = ap.parse_args()

    files = collect(include_characters=a.with_characters)
    zip_path = os.path.join(ROOT, ZIP_NAME)
    tmp = zip_path + ".building"
    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for rel in files:
            z.write(os.path.join(ROOT, rel), rel)
        # an entry for the folder itself: the app saves characters here and loads them
        # back, so it has to exist after unpacking even when it ships empty
        if not any(r.replace("\\", "/").startswith("Characters/") for r in files):
            folder = zipfile.ZipInfo("Characters/")
            folder.external_attr = (0o40755 << 16) | 0x10      # directory
            z.writestr(folder, b"")
    os.replace(tmp, zip_path)                     # only overwrite once it is complete
    size = os.path.getsize(zip_path)

    # a package that cannot start is worse than none, so check the essentials made it
    missing = [n for n in ("index.html", os.path.join("js", "app.js"),
                           os.path.join("css", "styles.css"),
                           os.path.join("resources", "data-classes.js")) if n not in files]
    if missing:
        print("REFUSING: the package is missing", ", ".join(missing))
        return 1

    if not a.quiet:
        print("packaged %d files -> %s (%.1f MB)" % (len(files), ZIP_NAME, size / 1048576.0))

    if a.to:
        dest_dir = os.path.expandvars(os.path.expanduser(a.to))
        if not os.path.isdir(dest_dir):
            print("destination does not exist: %s" % dest_dir)
            return 1
        dest = os.path.join(dest_dir, ZIP_NAME)
        shutil.copy2(zip_path, dest)
        if not a.quiet:
            print("copied to %s" % dest)
    return 0


if __name__ == "__main__":
    sys.exit(main())
