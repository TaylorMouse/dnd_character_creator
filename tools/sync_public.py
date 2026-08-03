"""Sync the source-only files into the public GitHub working copy.

The private repo (this one) holds the generated 5etools data; the public repo must not,
because that data is Wizards of the Coast content. This copies just the code and docs.

Usage:
    python tools/sync_public.py [dest]      # default dest: ..\\dnd_character_creator
"""
import os, shutil, sys

SRC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEST = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(SRC), "dnd_character_creator")

FILES = ["index.html", "README.md", "LICENSE", ".gitignore",
         # our own PDF field mapping is fine to publish; the PDF itself and the
         # generated 5etools data are not.
         os.path.join("resources", "pdf-fields.js")]
DIRS  = ["css", "js", "tools"]

def copy_file(rel):
    s = os.path.join(SRC, rel)
    if not os.path.exists(s): return False
    d = os.path.join(DEST, rel)
    os.makedirs(os.path.dirname(d), exist_ok=True)
    shutil.copy2(s, d)
    return True

os.makedirs(DEST, exist_ok=True)
copied = 0
for f in FILES:
    if copy_file(f): copied += 1
for dirname in DIRS:
    src_dir = os.path.join(SRC, dirname)
    if not os.path.isdir(src_dir): continue
    for root, _dirs, files in os.walk(src_dir):
        for fn in files:
            if fn.endswith((".pyc",)): continue
            rel = os.path.relpath(os.path.join(root, fn), SRC)
            if copy_file(rel): copied += 1

print("synced %d files to %s" % (copied, DEST))
print("NOTE: resources/ is intentionally excluded (contains WotC game data).")
