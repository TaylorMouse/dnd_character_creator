"""Upload the hand-out zip to Dropbox.

Answers "put the zip somewhere I can get at it, every time we change something" without a
sync client running on the machine: one HTTPS request to the Dropbox content API, using
only the standard library.

Credentials are read from files that .gitignore excludes and tools/package.py refuses to
package, because a token in the public mirror or in the zip handed to other players is a
token given away. Two arrangements work:

  dropbox.accesstoken     a generated token from the app console. Simple, but Dropbox
                          expires these after about four hours.
  dropbox.refreshtoken    a refresh token, plus the app key and secret in dropbox.app
                          as "key:secret". Renews itself, so the hook keeps working.

If both are present the refresh token wins, since the other will have gone stale.

    python tools/upload_dropbox.py                    # upload "Character Creator.zip"
    python tools/upload_dropbox.py --path "/builds/cc.zip"
    python tools/upload_dropbox.py --file some.zip --quiet
"""
import os, sys, json, base64, hashlib, argparse
import urllib.request, urllib.error, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZIP_NAME = "Character Creator.zip"
BLOCK = 4 * 1024 * 1024          # Dropbox hashes in 4 MiB blocks
SIMPLE_LIMIT = 150 * 1024 * 1024  # above this the API wants an upload session


def _read(name):
    p = os.path.join(ROOT, name)
    if not os.path.exists(p):
        return ""
    with open(p, encoding="utf-8-sig") as f:
        return f.read().strip()


def _post(url, data, headers):
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            return json.loads(r.read().decode("utf-8") or "{}")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        # never let the token itself reach a log or a terminal
        raise RuntimeError("Dropbox said %s: %s" % (e.code, body[:400]))


def access_token():
    """A usable token, minted from the refresh token when one is available."""
    refresh, app = _read("dropbox.refreshtoken"), _read("dropbox.app")
    if refresh and app:
        form = {"grant_type": "refresh_token", "refresh_token": refresh}
        head = {"Content-Type": "application/x-www-form-urlencoded"}
        if ":" in app:
            # confidential client: the secret goes in the Basic header, not the body
            key, secret = app.split(":", 1)
            head["Authorization"] = "Basic " + base64.b64encode(
                ("%s:%s" % (key, secret)).encode()).decode()
        else:
            # public client (PKCE): the app key alone is enough, so no secret is
            # ever stored on this machine
            form["client_id"] = app
        got = _post("https://api.dropboxapi.com/oauth2/token",
                    urllib.parse.urlencode(form).encode(), head)
        return got["access_token"]
    tok = _read("dropbox.accesstoken")
    if not tok:
        raise RuntimeError("no credentials: expected dropbox.accesstoken, or "
                           "dropbox.refreshtoken together with dropbox.app")
    return tok


def content_hash(path):
    """Dropbox's own checksum: SHA-256 of the concatenated per-block SHA-256s."""
    parts = []
    with open(path, "rb") as f:
        while True:
            b = f.read(BLOCK)
            if not b:
                break
            parts.append(hashlib.sha256(b).digest())
    return hashlib.sha256(b"".join(parts)).hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", default=ZIP_NAME, help="the file to upload")
    ap.add_argument("--path", default=None,
                    help="where it lands in Dropbox (default: the file's name at the top)")
    ap.add_argument("--quiet", action="store_true")
    a = ap.parse_args()

    src = a.file if os.path.isabs(a.file) else os.path.join(ROOT, a.file)
    if not os.path.exists(src):
        print("nothing to upload: %s is not there" % src)
        return 1
    size = os.path.getsize(src)
    if size > SIMPLE_LIMIT:
        print("%.1f MB is past the %d MB single-request limit; this needs an upload session"
              % (size / 1048576.0, SIMPLE_LIMIT // 1048576))
        return 1

    dest = a.path or ("/" + os.path.basename(src))
    arg = {"path": dest, "mode": "overwrite", "autorename": False,
           "mute": True, "strict_conflict": False}
    with open(src, "rb") as f:
        payload = f.read()

    got = _post("https://content.dropboxapi.com/2/files/upload", payload,
                {"Authorization": "Bearer " + access_token(),
                 "Dropbox-API-Arg": json.dumps(arg),
                 "Content-Type": "application/octet-stream"})

    # trust the checksum rather than the byte count: a truncated upload can still
    # report a plausible size
    want = content_hash(src)
    if got.get("content_hash") != want:
        print("REFUSING to call this done: Dropbox stored a different file")
        print("  local  %s" % want)
        print("  remote %s" % got.get("content_hash"))
        return 1
    if not a.quiet:
        print("uploaded %s (%.1f MB) -> Dropbox %s"
              % (os.path.basename(src), size / 1048576.0, got.get("path_display", dest)))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except RuntimeError as e:
        # a stale token is the ordinary case here, so say what to do about it
        msg = str(e)
        print("upload failed: %s" % msg)
        if "expired_access_token" in msg or "invalid_access_token" in msg:
            print("  the token has expired - generate a new one, or set up "
                  "dropbox.refreshtoken + dropbox.app so it renews itself")
        sys.exit(1)
