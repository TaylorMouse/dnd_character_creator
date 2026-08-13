# Fill the PowerPoint template from a data file. Usage: cc_fill.py <data.txt> <out.pptx>
import sys,re,io
from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE
from pptx.dml.color import RGBColor
data_path,out=sys.argv[1],sys.argv[2]
DATA={}
for line in io.open(data_path,encoding="utf-8"):
    line=line.rstrip("\n")
    if "|" in line: k,v=line.split("|",1); DATA[k]=v
tok=re.compile(r"<([A-Za-z_]+)>"); DOT=RGBColor(0x33,0x33,0x33)
def all_shapes(shapes):
    for sh in shapes:
        if sh.shape_type==MSO_SHAPE_TYPE.GROUP:
            for s in all_shapes(sh.shapes): yield s
        else: yield sh
p=Presentation("resources/character_creator_template.pptx")
for slide in p.slides:
    for sh in all_shapes(slide.shapes):
        if not sh.has_text_frame: continue
        full="".join(r.text for para in sh.text_frame.paragraphs for r in para.runs)
        names=tok.findall(full)
        if not names: continue
        if len(names)==1 and (names[0].startswith("st_") or names[0].startswith("chk_")):  # oval checkbox
            on=DATA.get(names[0],"0")=="1"
            for para in sh.text_frame.paragraphs:
                for r in para.runs: r.text=""
            if on: sh.fill.solid(); sh.fill.fore_color.rgb=DOT
            else: sh.fill.background()
            continue
        for para in sh.text_frame.paragraphs:                    # text token(s)
            ptxt="".join(r.text for r in para.runs)
            if not tok.search(ptxt): continue
            new=tok.sub(lambda m:DATA.get(m.group(1),m.group(0)),ptxt)
            if new==ptxt: continue
            para.runs[0].text=new
            for r in para.runs[1:]: r._r.getparent().remove(r._r)
p.save(out); print("filled ->",out)
