"""Embed a form-fillable character sheet PDF for the "Export to PDF" feature.

The official Wizards of the Coast sheet is not redistributed with this project, so you
supply your own copy of the form-fillable PDF.

Usage:
    python tools/gen_pdf_template.py "path/to/DnD_5E_CharacterSheet - Form Fillable.pdf"

Writes resources/pdf-template.js (the PDF as base64, loaded by index.html).
The field mapping lives in resources/pdf-fields.js and already matches the official sheet.
"""
import base64, io, os, sys

if len(sys.argv) < 2:
    print(__doc__)
    sys.exit(1)

src = sys.argv[1]
if not os.path.exists(src):
    print("not found:", src)
    sys.exit(1)

out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   "resources", "pdf-template.js")
data = open(src, "rb").read()
io.open(out, "w", encoding="utf-8").write(
    "// base64 of a form-fillable 5e character sheet (supplied locally, not redistributed)\n"
    "window.CC_PDF_TEMPLATE=\"" + base64.b64encode(data).decode() + "\";\n")
print("wrote %s (%d KB)" % (out, os.path.getsize(out) // 1024))
