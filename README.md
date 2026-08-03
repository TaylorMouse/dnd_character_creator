# D&D 5e Character Creator

A fully offline, data-driven **Dungeons & Dragons 5e character builder and sheet**, built as a
single-page app in plain HTML/CSS/JavaScript. No build step, no server, no internet required —
just open `index.html` in a browser (Chrome/Edge recommended).

## Features

- **Guided wizard:** Edition → Class & Features → Background & Details → Species → Ability Scores →
  Equipment → Spells → Character Sheet.
- **Two rule editions:** 2014 (PHB) and 2024 (XPHB).
- **All 13 core classes**, levels 1–20, with full per-level features, subclass selection, and every
  choice surfaced (Metamagic, Fighting Style, Ability Score Improvement / feats, Draconic Ancestry, …).
- **Backgrounds, species/lineages, feats, items, spells** — all pulled from the 5etools data set.
- **Ability scores** via Point Buy, Standard Array, or Roll, folding in every racial/class increase.
- **Equipment**: class/background starting gear or gold, a full item browser (incl. magic items and
  variants like Frost Brand / Flame Tongue), currency, wear/wield, and attunement (max 3).
- **Spells**: correct cantrips/spells known or prepared for class + level, with slot tracking.
- **Live character sheet** (5-column layout): abilities, saves, skills, senses, proficiencies,
  class resources, spell slots, attacks, inventory, features & traits, death saves, rest tracking,
  XP/inspiration — most of it editable in place.
- **Save / Load** characters to JSON, and **Export to PDF** into the official WotC form-fillable sheet.

## Running

Open `index.html` in a browser. That's it. (The "Save As" dialog and PDF export work best in
Chromium-based browsers.)

## Project layout

```
index.html            markup + script/style includes
css/styles.css        all styling
js/app.js             all application logic
resources/
  data-classes.js     class index (per edition)
  features/*.js        per-class resolved features + subclasses
  data-races.js        species / lineages
  data-backgrounds.js  backgrounds
  data-feats.js        feats
  data-items.js        items (base + magic + variants) with descriptions
  data-spells.js       spells (with class lists + descriptions)
  data-spellcasting.js per-class spellcasting progression + slots
  data-resources.js    class resource trackers (sorcery points, ki, rages, …)
  data-starting.js     class/background starting equipment
  pdf-lib.min.js       PDF library (for the fillable-sheet export)
  pdf-template.js      base64 of the official 5e form-fillable sheet
  pdf-fields.js        mapping of character data -> PDF form fields
```

## Getting the game data (required)

The `resources/data-*.js` files are **not included in this repository**. They are generated from a
local [5etools](https://5e.tools/index.html) data set, which contains Dungeons & Dragons content
owned by Wizards of the Coast and is not redistributed here.

1. Get 5etools and its `data` folder from [5e.tools](https://5e.tools/index.html).
2. Generate the data files:

```bash
python tools/regen_all.py "path/to/5etools/data"
```

3. Open `index.html`.

Until you do this, the app shows a short notice explaining the same thing. Each generator also
runs standalone and accepts the data root as its first argument. The app was last built and
validated against 5etools **v2.33.1**.

### Optional: PDF export

To export a filled official character sheet you need two more local files in `resources/`:

```bash
# 1. the PDF engine (MIT licensed)
curl -o resources/pdf-lib.min.js https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js

# 2. embed your own copy of the form-fillable 5e sheet
python tools/gen_pdf_template.py "DnD_5E_CharacterSheet - Form Fillable.pdf"
```

Everything else works without these; the export button just explains what is missing.

## Validating

`tools/validate.js` is a headless regression suite (no browser needed). It mocks the DOM,
loads the real data plus `js/app.js`, builds characters across every core class, edition,
level and subclass, and checks the derived numbers against the 5e rules:

```bash
cscript //nologo tools/validate.js
```

It covers proficiency bonus by level, all 18 skills (ability mapping and bonuses), saving
throws, hit points, subclass timing, caster kind, spell-slot/cantrip progressions, class
resources, Extra Attack, armour class, attunement and overall data integrity — and renders
every subclass to catch runtime errors. It exits non-zero on any failure.

## Licence and content

The code in this repository is released under the MIT licence (see `LICENSE`).

Dungeons & Dragons is a trademark of Wizards of the Coast. This project is an unofficial,
non-commercial fan tool. It ships **no** game content: all rules text, spells, items, classes and
other data are generated locally from your own [5etools](https://5e.tools/index.html) copy and are
never committed here. The PDF export fills the freely distributed official character sheet, which
you supply yourself.
