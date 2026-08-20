/* Character-data fetch for the PowerPoint template.
     cscript //nologo tools/cc_fetch.js "<Character>.json"
   Emits "tag|value" records that cc_fill.py substitutes into the <tag> placeholders;
   a literal \n inside a value becomes a line break on the slide.

   The data/app loader is taken from validate.js at run time rather than copied here.
   An earlier copy of it silently went stale every time the suite gained an export, so
   this script kept losing access to functions it needed. Sharing it removes that whole
   class of bug: both scripts sit in tools/, so ROOT resolves identically. */
var _fso=new ActiveXObject("Scripting.FileSystemObject");
function _read(p){var s=new ActiveXObject("ADODB.Stream");s.Type=2;s.Charset="utf-8";s.Open();s.LoadFromFile(p);var t=s.ReadText();s.Close();return t;}
// build the path with an explicit backslash: "" is a JS escape and would vanish
var _v=_read(_fso.GetParentFolderName(WScript.ScriptFullName)+String.fromCharCode(92)+"validate.js");
var _cut=_v.indexOf("eval(app);");
if(_cut<0){WScript.Echo("cannot find the loader in validate.js");WScript.Quit(1);}
eval(_v.substring(0,_cut+"eval(app);".length));
var C=window.__cc,S=C.state;

/* Print every export tag as "name|value". The values themselves are computed by the app
   (exportTags in js/app.js), the same function its own PDF export uses, so the deck and
   the in-app sheet always carry identical numbers. */
var fname=WScript.Arguments(0);
function rd(p){var s=new ActiveXObject("ADODB.Stream");s.Type=2;s.Charset="utf-8";s.Open();s.LoadFromFile(p);var t=s.ReadText();s.Close();return t;}
var ch=eval("("+rd(ROOT+"Characters"+String.fromCharCode(92)+fname)+")");
for(var k in ch)S[k]=ch[k];S.fdata=window.CC_FEATURE_DATA[S.slug];

// keep each record on one line: real newlines become the two characters \ and n,
// which cc_fill.py turns back into line breaks inside the PowerPoint text frame
var BS=String.fromCharCode(92);
var T=C.exportTags(),key;
for(key in T){
  WScript.Echo(key+"|"+String(T[key]==null?"":T[key]).replace(/\r/g,"").replace(/\n/g,BS+"n"));
}
