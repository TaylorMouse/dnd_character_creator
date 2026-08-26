"""Install a git hook that repackages the app after every commit.

Answers "zip it and put it somewhere I can get at it every time we change something"
without anyone having to remember: the hook runs after each commit, rebuilds the zip, and
then sends it wherever it has been told to.

    python tools/install_hooks.py                    # rebuild, then upload to Dropbox
    python tools/install_hooks.py --to "D:\\folder"   # also copy into a local folder
    python tools/install_hooks.py --no-dropbox       # folder copy only
    python tools/install_hooks.py --remove

Dropbox is the upload that works on this machine: one HTTPS request, no sync client
running. It reports and skips if no credentials are present. A folder copy only reaches
the cloud if something is actually syncing that folder.
"""
import os, sys, argparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HOOK = os.path.join(ROOT, ".git", "hooks", "post-commit")

# The hook must never fail a commit over packaging or a network hiccup, so every step
# reports and carries on, and the whole thing ends in exit 0.
TEMPLATE = "#!/bin/sh\n" \
           "# Rebuild the hand-out zip after every commit (installed by tools/install_hooks.py).\n" \
           "%(pack)s\n" \
           "%(upload)s" \
           "exit 0\n"

PACK_TO = 'python tools/package.py --to "%s" --quiet 2>&1 || echo "post-commit: packaging skipped"'
PACK_ONLY = 'python tools/package.py --quiet 2>&1 || echo "post-commit: packaging skipped"'
UPLOAD = 'python tools/upload_dropbox.py --quiet 2>&1 || echo "post-commit: Dropbox upload skipped"'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--to", default="", help="folder the zip is also copied into (optional)")
    ap.add_argument("--no-dropbox", action="store_true",
                    help="skip the Dropbox upload, leaving only the folder copy")
    ap.add_argument("--remove", action="store_true")
    a = ap.parse_args()

    if not os.path.isdir(os.path.dirname(HOOK)):
        print("no .git/hooks here - is this a git working copy?")
        return 1
    if a.remove:
        if os.path.exists(HOOK):
            os.remove(HOOK); print("removed %s" % HOOK)
        else:
            print("nothing installed")
        return 0
    if not a.to and a.no_dropbox:
        print("nothing for the hook to do: pass --to, or drop --no-dropbox")
        return 1

    pack = (PACK_TO % a.to.replace("\\", "/")) if a.to else PACK_ONLY
    with open(HOOK, "w", newline="\n") as f:
        f.write(TEMPLATE % {"pack": pack, "upload": "" if a.no_dropbox else UPLOAD + "\n"})
    try:
        os.chmod(HOOK, 0o755)
    except Exception:
        pass

    print("installed %s" % HOOK)
    print("  after each commit: rebuild the zip")
    if a.to:
        print("    and copy it to %s" % a.to)
        if not os.path.isdir(a.to):
            print("    NOTE: that folder does not exist yet, so the copy will be skipped")
    if not a.no_dropbox:
        print("    and upload it to Dropbox")
        has = any(os.path.exists(os.path.join(ROOT, n))
                  for n in ("dropbox.accesstoken", "dropbox.refreshtoken"))
        if not has:
            print("    NOTE: no Dropbox credentials yet, so the upload will report and skip")
    return 0


if __name__ == "__main__":
    sys.exit(main())
