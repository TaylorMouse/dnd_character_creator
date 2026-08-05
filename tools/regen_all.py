"""Regenerate every resources/data-*.js file from a 5etools data mirror.

Usage:
    python tools/regen_all.py [path\\to\\5etools\\data]

With no argument each generator falls back to its own default data root
(currently the 5etools v2.33.1 mirror).
"""
import subprocess, sys, os

SCRIPTS = ["gen_features.py", "gen_races.py", "gen_backgrounds.py", "gen_feats.py",
           "gen_items.py", "gen_spells.py", "gen_starting.py", "gen_resources.py", "gen_sources.py", "gen_languages.py", "gen_proficiencies.py"]

here = os.path.dirname(os.path.abspath(__file__))
extra = sys.argv[1:2]

failed = []
for s in SCRIPTS:
    print("=" * 60); print("running", s)
    r = subprocess.run([sys.executable, os.path.join(here, s)] + extra)
    if r.returncode != 0:
        failed.append(s)

print("=" * 60)
print("FAILED:", ", ".join(failed) if failed else "none")
sys.exit(1 if failed else 0)
