// Full validation suite for the Character Creator.
// Runs headlessly under Windows cscript:  cscript //nologo tools\validate.js
// Loads the real data files + js/app.js against a mocked DOM, builds characters for
// every core class/edition at several levels, and checks the derived numbers against
// the 5e rules. Exits non-zero if anything fails.

// ---------- ES5 polyfills (old JScript engine) ----------
if(!Array.prototype.forEach){Array.prototype.forEach=function(f){for(var i=0;i<this.length;i++)f(this[i],i,this);};}
if(!Array.prototype.map){Array.prototype.map=function(f){var r=[];for(var i=0;i<this.length;i++)r.push(f(this[i],i,this));return r;};}
if(!Array.prototype.filter){Array.prototype.filter=function(f){var r=[];for(var i=0;i<this.length;i++)if(f(this[i],i,this))r.push(this[i]);return r;};}
if(!Array.prototype.indexOf){Array.prototype.indexOf=function(x){for(var i=0;i<this.length;i++)if(this[i]===x)return i;return -1;};}
if(!Array.prototype.some){Array.prototype.some=function(f){for(var i=0;i<this.length;i++)if(f(this[i],i))return true;return false;};}
if(!Array.prototype.reduce){Array.prototype.reduce=function(f,a){var i=0;if(a===undefined){a=this[0];i=1;}for(;i<this.length;i++)a=f(a,this[i],i,this);return a;};}
if(!Object.keys){Object.keys=function(o){var r=[];for(var k in o)if(o.hasOwnProperty(k))r.push(k);return r;};}
if(!String.prototype.trim){String.prototype.trim=function(){return this.replace(/^\s+|\s+$/g,"");};}
if(!String.prototype.localeCompare){String.prototype.localeCompare=function(b){return this<b?-1:(this>b?1:0);};}

// ---------- DOM mock ----------
function El(){this.innerHTML="";this.value="";this.textContent="";this.style={};this.checked=false;
  this.classList={toggle:function(){},add:function(){},remove:function(){},contains:function(){return false;}};}
El.prototype.addEventListener=function(){};
El.prototype.querySelector=function(){return new El();};
El.prototype.querySelectorAll=function(){return [];};
El.prototype.getAttribute=function(){return "";};
El.prototype.appendChild=function(){};
var _shared=new El();_shared.parentNode=_shared;
var _els={};
var document={getElementById:function(id){if(!_els[id])_els[id]=new El();return _els[id];},
  querySelector:function(){return new El();},querySelectorAll:function(){return [];},
  createElement:function(){return new El();},head:_shared,body:_shared};
var window={scrollTo:function(){}};

// ---------- file helpers ----------
function readFile(p){var s=new ActiveXObject("ADODB.Stream");s.Type=2;s.Charset="utf-8";s.Open();s.LoadFromFile(p);var t=s.ReadText();s.Close();return t;}
var fso=new ActiveXObject("Scripting.FileSystemObject");
var ROOT=fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))+"\\";

// ---------- load data + app ----------
var dataFiles=["data-classes.js","data-feats.js","data-backgrounds.js","data-races.js",
               "data-items.js","data-sources.js","data-proficiencies.js","data-starting.js","data-spells.js","data-spellcasting.js","data-resources.js","data-speed.js","data-condmods.js","data-languages.js"];
for(var i=0;i<dataFiles.length;i++) eval(readFile(ROOT+"resources\\"+dataFiles[i]));
// every generated per-class feature file
var featDir=fso.GetFolder(ROOT+"resources\\features"),fe=new Enumerator(featDir.Files);
for(;!fe.atEnd();fe.moveNext()){var f=fe.item();if(/\.js$/i.test(f.Name))eval(readFile(f.Path));}

var app=readFile(ROOT+"js\\app.js");
app=app.replace("populateLevels();showEdition();",
 "populateLevels();window.__cc={state:state,render:render,renderSheet:renderSheet,"+
 "profBonus:profBonus,maxHP:maxHP,abMod:abMod,totalScore:totalScore,spellInfo:spellInfo,"+
 "proficientSkills:proficientSkills,savingProfs:savingProfs,computeAC:computeAC,"+
 "actionEconomy:actionEconomy,classSpellList:classSpellList,SKILL_ABILITY:SKILL_ABILITY,"+
 "ABILITIES:ABILITIES,maxSpellLevel:maxSpellLevel,speedInfo:speedInfo,"+
 "needsCustomAsi:needsCustomAsi,currentRace:currentRace,currentLineage:currentLineage,"+
 "featAsiPicks:featAsiPicks,featAsiPending:featAsiPending,asiResolved:asiResolved,"+
 "featureAttacks:featureAttacks,featureSkillChoice:featureSkillChoice,featureSkillPicks:featureSkillPicks,"+
 "featuresAndTraits:featuresAndTraits,condNotesFor:condNotesFor,officialLanguages:officialLanguages,languagesAll:languagesAll,mergedLanguages:mergedLanguages,"+
 "expandFeatureRefs:expandFeatureRefs,featureAttacks:featureAttacks,actionsCardHtml:actionsCardHtml,"+
 "fxAvailable:fxAvailable,fxActive:fxActive,fxTotals:fxTotals,fxDmgFor:fxDmgFor,concOptions:concOptions,acBreakdown:acBreakdown,"+
 "martialArtsDie:martialArtsDie,isMonkWeapon:isMonkWeapon,biggerDie:biggerDie,actionsCardHtml:actionsCardHtml,classOptions:classOptions,"+
 "profBlock:profBlock,profOpts:profOpts,customProfs:customProfs,"+
 "allRacialSpells:allRacialSpells,pickedRacialSpells:pickedRacialSpells,spellPicksAll:spellPicksAll,currentRace:currentRace,currentLineage:currentLineage,originShort:originShort,"+
 "defencesHtml:defencesHtml,defLabel:defLabel,defencesSummaryLines:defencesSummaryLines,"+
 "speciesLabel:speciesLabel,cleanLineageName:cleanLineageName,dcAbility:dcAbility,abilitySaveDc:abilitySaveDc,"+
 "srcAbbr:srcAbbr,sourceName:sourceName,isHomebrew:isHomebrew,itemAllowed:itemAllowed,"+
 "rcCardHtml:rcCardHtml,rcWhen:rcWhen,defences:defences,expertiseSkills:expertiseSkills,skillBonus:skillBonus,passiveScore:passiveScore,"+
 "itemMechanics:itemMechanics,skillAdvantage:skillAdvantage};");
eval(app);
var C=window.__cc,S=C.state;

// ---------- test bookkeeping ----------
var pass=0,fails=[];
function check(label,got,want){
  if(String(got)===String(want)){pass++;return true;}
  fails.push(label+"  ->  got "+got+", expected "+want);return false;
}
function checkTrue(label,cond){return check(label,!!cond,true);}
function section(t){WScript.Echo("");WScript.Echo("== "+t+" ==");}

// ---------- reference tables (5e rules) ----------
var PROF={1:2,4:2,5:3,8:3,9:4,12:4,13:5,16:5,17:6,20:6};
var FULL_SLOTS={1:"2",5:"4,3,2",11:"4,3,3,3,2,1",20:"4,3,3,3,3,2,2,1,1"};
// half casters: 4/3/3/3/1 at 17, the 5th-level 2nd slot only arrives at 19
var HALF_SLOTS={2:"2",5:"4,2",9:"4,3,2",13:"4,3,3,1",17:"4,3,3,3,1",19:"4,3,3,3,2"};
var PACT={1:"1@1",5:"2@3",11:"3@5",20:"4@5"};
// class -> expected caster kind
var CASTER={Bard:"full",Cleric:"full",Druid:"full",Sorcerer:"full",Wizard:"full",
            Paladin:"1/2",Ranger:"1/2",Artificer:"artificer",Warlock:"pact",
            Barbarian:null,Fighter:null,Monk:null,Rogue:null};

function setup(slug,name,level){
  S.edition=slug.indexOf("-one")>0?"one":"classic";
  S.className=name;S.slug=slug;S.level=level;
  var ci=null,L=window.CC_CLASSES;
  for(var i=0;i<L.length;i++)if(L[i].slug===slug){ci=L[i];break;}
  S.source=ci?ci.source:"PHB";S.hdFaces=ci?ci.hdFaces:8;
  S.fdata=window.CC_FEATURE_DATA[slug];
  S.subclassName=null;S.choices={};S.raceChoices={};S.race=null;S.raceLineage=null;
  S.background=null;S.bgIsCustom=false;S.bgChoices={};S.customLanguages=[];
  S.spells={cantrips:[],spells:[],levelFilter:"",q:""};
  S.equipment={mode:"equipment",starting:{},startingAdded:false,inventory:[],currency:{pp:0,gp:0,ep:0,sp:0,cp:0},filterType:"",filterQ:""};
  S.sheet={hpCurrent:null,hpTemp:"",res:{},hpEdited:false,invQ:"",invAdd:"",xp:"",inspiration:false,deathSucc:0,deathFail:0,dark:false,acOther:"",acOverride:"",acEditOpen:false,active:{},conc:""};
  S.manualHp=null;
  // standard array so ability-derived numbers are deterministic
  S.abilities={method:"pointbuy",base:{Strength:15,Dexterity:14,Constitution:13,Intelligence:12,Wisdom:10,Charisma:8},
               assign:{},other:{},override:{},rolled:null};
}
function slotsStr(){
  var info=C.spellInfo();if(!info||!info.sc.slots)return "";
  var sl=info.sc.slots;
  if(sl.type==="slots"){var row=sl.rows[S.level-1]||[],out=[];for(var i=0;i<row.length;i++)if(row[i]>0)out.push(row[i]);return out.join(",");}
  if(sl.type==="pact"){var c=sl.count[S.level-1]||0,l=sl.level[S.level-1]||0;return c?c+"@"+l:"";}
  return "";
}


// reusable export-data fetch: cscript cc_fetch.js "<Character>.json"
var fname=WScript.Arguments(0);
function rd(p){var s=new ActiveXObject("ADODB.Stream");s.Type=2;s.Charset="utf-8";s.Open();s.LoadFromFile(p);var t=s.ReadText();s.Close();return t;}
var ch=eval("("+rd(ROOT+"Characters"+String.fromCharCode(92)+fname)+")");
for(var k in ch)S[k]=ch[k];S.fdata=window.CC_FEATURE_DATA[S.slug];
function sign(n){return (n>=0?"+":"")+n;}
function sg(n){return sign(C.abMod(C.totalScore(n)));}
var AB=["Strength","Dexterity","Constitution","Intelligence","Wisdom","Charisma"],UP="ABCDEF",LO="abcdef";
for(var i=0;i<6;i++){WScript.Echo(UP.charAt(i)+"|"+sg(AB[i]));WScript.Echo(LO.charAt(i)+"|"+C.totalScore(AB[i]));}
WScript.Echo("character_name|"+S.name);WScript.Echo("class|"+S.className);
WScript.Echo("subclass|"+(S.subclassName||""));WScript.Echo("level|"+S.level);
var bg=S.background;WScript.Echo("background|"+((bg&&bg.name)?bg.name:(S.bgIsCustom?S.bgCustomName:(bg||""))));
WScript.Echo("species|"+C.speciesLabel());WScript.Echo("alignment|"+((S.details&&S.details.alignment)||""));
WScript.Echo("AC|"+C.computeAC());WScript.Echo("PF|+"+C.profBonus());
WScript.Echo("WS|"+C.speedInfo().total+" ft");WScript.Echo("MHP|"+C.maxHP());
WScript.Echo("INI|"+sg("Dexterity"));
var conm=C.abMod(C.totalScore("Constitution"));
WScript.Echo("HIT_DIE|"+S.level+"d"+S.hdFaces+(conm>=0?" + "+conm:" - "+(-conm)));
// spellcasting save DC: the ability name and 8 + proficiency + ability modifier
var _ab=C.dcAbility();
if(_ab){WScript.Echo("ability_dc|"+_ab);WScript.Echo("a_dc|"+C.abilitySaveDc());}
else{WScript.Echo("ability_dc|");WScript.Echo("a_dc|");}
// saving throws: proficiency checkbox + value
var prof=C.profBonus(),sp=C.savingProfs(),KEYS=["str","dex","con","int","wis","cha"];
for(var j=0;j<6;j++){
  var pr=!!sp[AB[j]];
  WScript.Echo("st_"+KEYS[j]+"|"+(pr?"1":"0"));
  WScript.Echo("stv_"+KEYS[j]+"|"+sign(C.abMod(C.totalScore(AB[j]))+(pr?prof:0)));
}
// skills a..r: proficiency checkbox + value (skillBonus includes expertise)
var SK=[["a","Acrobatics"],["b","Animal Handling"],["c","Arcana"],["d","Athletics"],["e","Deception"],["f","History"],["g","Insight"],["h","Intimidation"],["i","Investigation"],["j","Medicine"],["k","Nature"],["l","Perception"],["m","Performance"],["n","Persuasion"],["o","Religion"],["p","Sleight of Hand"],["q","Stealth"],["r","Survival"]];
var ps=C.proficientSkills();
for(var q=0;q<SK.length;q++){
  var nm=SK[q][1],let=SK[q][0];
  WScript.Echo("chk_"+let+"|"+(ps[nm]?"1":"0"));
  WScript.Echo("chkv_"+let+"|"+sign(C.skillBonus(nm)));
}
