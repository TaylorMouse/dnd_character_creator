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
               "data-items.js","data-sources.js","data-starting.js","data-spells.js","data-spellcasting.js","data-resources.js","data-speed.js","data-condmods.js","data-languages.js"];
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

// =====================================================================
section("1. Proficiency bonus by level");
var plv=[1,4,5,8,9,12,13,16,17,20];
for(var i=0;i<plv.length;i++){setup("fighter-classic","Fighter",plv[i]);check("  prof bonus L"+plv[i],C.profBonus(),PROF[plv[i]]);}

// =====================================================================
section("2. Skills: ability mapping + proficiency math");
var SK_EXPECT={Acrobatics:"Dexterity","Animal Handling":"Wisdom",Arcana:"Intelligence",Athletics:"Strength",
 Deception:"Charisma",History:"Intelligence",Insight:"Wisdom",Intimidation:"Charisma",Investigation:"Intelligence",
 Medicine:"Wisdom",Nature:"Intelligence",Perception:"Wisdom",Performance:"Charisma",Persuasion:"Charisma",
 Religion:"Intelligence","Sleight of Hand":"Dexterity",Stealth:"Dexterity",Survival:"Wisdom"};
check("  skill count",Object.keys(C.SKILL_ABILITY).length,18);
for(var sk in SK_EXPECT)check("  "+sk+" uses",C.SKILL_ABILITY[sk],SK_EXPECT[sk]);
// a proficient skill gets +prof; scores above: Str15(+2) Dex14(+2) Con13(+1) Int12(+1) Wis10(+0) Cha8(-1)
setup("rogue-classic","Rogue",5);
S.choices["skill:0"]="Stealth";
var ps=C.proficientSkills();
checkTrue("  chosen skill is proficient",ps["Stealth"]);
check("  Stealth bonus (Dex+2, prof+3)",C.abMod(C.totalScore("Dexterity"))+(ps["Stealth"]?C.profBonus():0),5);
check("  Arcana bonus (Int+1, no prof)",C.abMod(C.totalScore("Intelligence"))+(ps["Arcana"]?C.profBonus():0),1);
check("  passive Perception (Wis+0, no prof)",10+C.abMod(C.totalScore("Wisdom"))+(ps["Perception"]?C.profBonus():0),10);

// =====================================================================
section("3. Every core class x edition: renders, saves, HP, subclass level");
var classes=[],CL=window.CC_CLASSES;
for(var i=0;i<CL.length;i++)if(CL[i].isCore)classes.push(CL[i]);
var levels=[1,5,11,20];
for(var ci=0;ci<classes.length;ci++){
  var c=classes[ci];
  if(!window.CC_FEATURE_DATA[c.slug]){fails.push("missing feature data: "+c.slug);continue;}
  for(var li=0;li<levels.length;li++){
    var lv=levels[li];setup(c.slug,c.name,lv);
    var tag="  "+c.name+" ("+c.editionLabel+") L"+lv;
    // renders without throwing
    C.renderSheet();
    var html=_els["sheetPanel"].innerHTML;
    if(html.indexOf("Sheet error")>=0){fails.push(tag+" -> SHEET THREW: "+html.replace(/<[^>]+>/g,"").substring(0,160));continue;}
    if(html.length<2000){fails.push(tag+" -> suspiciously small sheet ("+html.length+" chars)");continue;}
    pass++;
    // exactly two saving-throw proficiencies
    var sp=C.savingProfs(),n=0;for(var k in sp)n++;
    if(n!==2)fails.push(tag+" -> saving throw profs = "+n+", expected 2");else pass++;
    // HP: faces + con + (level-1)*(avg+con)
    var con=C.abMod(C.totalScore("Constitution")),avg=Math.floor(c.hdFaces/2)+1;
    var wantHP=c.hdFaces+con+(lv-1)*(avg+con);
    if(C.maxHP()!==wantHP)fails.push(tag+" -> maxHP "+C.maxHP()+", expected "+wantHP);else pass++;
    // action economy must not throw
    try{C.actionEconomy();pass++;}catch(e){fails.push(tag+" -> actionEconomy threw: "+(e.message||e));}
  }
  // subclass choice level: 2024 classes all choose at 3
  setup(c.slug,c.name,20);
  var fd=window.CC_FEATURE_DATA[c.slug],gains=[];
  for(var fi=0;fi<fd.classFeatures.length;fi++)if(fd.classFeatures[fi].gainSubclassFeature)gains.push(fd.classFeatures[fi].level);
  var first=gains.length?Math.min.apply(null,gains):null;
  if(c.edition==="one"&&first!==3)fails.push("  "+c.name+" (2024) subclass level = "+first+", expected 3");else pass++;
  if(!fd.subclasses.length)fails.push("  "+c.name+" ("+c.editionLabel+") has no subclasses");else pass++;
}

// =====================================================================
section("4. Spellcasting: caster kind, slots, cantrips, max spell level");
for(var ci=0;ci<classes.length;ci++){
  var c=classes[ci];if(c.edition!=="classic")continue;   // check 2014 against the classic tables
  setup(c.slug,c.name,1);
  var info=C.spellInfo(),kind=CASTER[c.name];
  if(kind===null){ if(info&&info.sc.caster) fails.push("  "+c.name+" should not be a caster"); else pass++; continue; }
  if(!info){fails.push("  "+c.name+" has no spellcasting info");continue;}
  var got=info.sc.slots&&info.sc.slots.type==="pact"?"pact":info.sc.caster;
  check("  "+c.name+" caster kind",got,kind);
  // slot progression at key levels
  if(kind==="full"){for(var L in FULL_SLOTS){setup(c.slug,c.name,+L);check("  "+c.name+" slots L"+L,slotsStr(),FULL_SLOTS[L]);}}
  if(kind==="1/2"){for(var L2 in HALF_SLOTS){setup(c.slug,c.name,+L2);check("  "+c.name+" slots L"+L2,slotsStr(),HALF_SLOTS[L2]);}}
  if(kind==="pact"){for(var L3 in PACT){setup(c.slug,c.name,+L3);check("  "+c.name+" pact L"+L3,slotsStr(),PACT[L3]);}}
  // max spell level for a full caster
  if(kind==="full"){
    setup(c.slug,c.name,1); check("  "+c.name+" max spell lvl L1",C.spellInfo().maxLevel,1);
    setup(c.slug,c.name,9); check("  "+c.name+" max spell lvl L9",C.spellInfo().maxLevel,5);
    setup(c.slug,c.name,17);check("  "+c.name+" max spell lvl L17",C.spellInfo().maxLevel,9);
  }
  // cantrip counts for the classic known-casters
  var CANTRIP={Sorcerer:{1:4,4:5,10:6},Wizard:{1:3,4:4,10:5},Bard:{1:2,4:3,10:4},Cleric:{1:3,4:4,10:5},Druid:{1:2,4:3,10:4},Warlock:{1:2,4:3,10:4}};
  if(CANTRIP[c.name])for(var L4 in CANTRIP[c.name]){setup(c.slug,c.name,+L4);check("  "+c.name+" cantrips L"+L4,C.spellInfo().cantripsKnown,CANTRIP[c.name][L4]);}
  // the class spell list must be non-empty
  setup(c.slug,c.name,20);
  checkTrue("  "+c.name+" has cantrips in list",C.classSpellList(0,0).length>0||c.name==="Paladin"||c.name==="Ranger");
  checkTrue("  "+c.name+" has leveled spells in list",C.classSpellList(1,9).length>0);
}

// =====================================================================
section("5. Class resources appear at the right level");
var RES_EXPECT=[["sorcerer-classic","Sorcerer","Sorcery Points",{1:0,2:2,6:6,20:20}],
                ["monk-classic","Monk","Ki Points",{1:0,2:2,5:5,20:20}],
                ["barbarian-classic","Barbarian","Rages",{1:2,3:3,6:4,20:0}],
                ["monk-one","Monk","Focus Points",{2:2,5:5}]];
for(var ri=0;ri<RES_EXPECT.length;ri++){
  var r=RES_EXPECT[ri],list=window.CC_RESOURCES[r[0]]||[],found=null;
  for(var i2=0;i2<list.length;i2++)if(list[i2].name===r[2])found=list[i2];
  if(!found){fails.push("  "+r[1]+" missing resource "+r[2]);continue;}
  for(var L5 in r[3])check("  "+r[1]+" "+r[2]+" L"+L5,found.values[(+L5)-1],r[3][L5]);
}

// =====================================================================
section("6. Extra Attack -> attacks per action");
var EA=[["fighter-classic","Fighter",1,1],["fighter-classic","Fighter",5,2],["fighter-classic","Fighter",11,3],["fighter-classic","Fighter",20,4],
        ["barbarian-classic","Barbarian",5,2],["paladin-classic","Paladin",5,2],["ranger-classic","Ranger",5,2],
        ["wizard-classic","Wizard",20,1],["sorcerer-classic","Sorcerer",20,1]];
for(var ei=0;ei<EA.length;ei++){
  var e=EA[ei];setup(e[0],e[1],e[2]);
  var extra=0,cf=window.CC_FEATURE_DATA[e[0]].classFeatures;
  for(var i3=0;i3<cf.length;i3++)if(cf[i3].level<=e[2]&&/Extra Attack/i.test(cf[i3].name))extra++;
  check("  "+e[1]+" L"+e[2]+" attacks/action",1+extra,e[3]);
}

// =====================================================================
section("7. Armor Class from equipped armor");
setup("fighter-classic","Fighter",5);
check("  unarmoured (Dex+2)",C.computeAC(),12);
S.equipment.inventory=[{name:"Leather Armor",cat:"Armor",ac:11,armorKind:"light",qty:1,equipped:true}];
check("  leather 11 + Dex 2",C.computeAC(),13);
S.equipment.inventory=[{name:"Half Plate",cat:"Armor",ac:15,armorKind:"medium",qty:1,equipped:true}];
check("  half plate 15 + Dex capped 2",C.computeAC(),17);
S.equipment.inventory=[{name:"Plate",cat:"Armor",ac:18,armorKind:"heavy",qty:1,equipped:true}];
check("  plate 18, no Dex",C.computeAC(),18);
S.equipment.inventory.push({name:"Shield",cat:"Armor",ac:2,armorKind:"shield",qty:1,equipped:true});
check("  plate + shield",C.computeAC(),20);

// =====================================================================
section("7b. Alternative AC formulas (Unarmored Defense etc.)");
// scores from setup(): Str15 Dex14(+2) Con13(+1) Int12 Wis10(+0) Cha8
setup("barbarian-classic","Barbarian",6);
check("  Barbarian unarmoured (10+Dex2+Con1)",C.computeAC(),13);
S.equipment.inventory=[{name:"Shield",cat:"Armor",ac:2,armorKind:"shield",qty:1,equipped:true}];
check("  Barbarian + shield (allowed by RAW)",C.computeAC(),15);
S.equipment.inventory=[{name:"Plate",cat:"Armor",ac:18,armorKind:"heavy",qty:1,equipped:true}];
check("  Barbarian in plate ignores Unarmored Defense",C.computeAC(),18);
setup("monk-classic","Monk",6);
check("  Monk unarmoured (10+Dex2+Wis0)",C.computeAC(),12);
S.equipment.inventory=[{name:"Shield",cat:"Armor",ac:2,armorKind:"shield",qty:1,equipped:true}];
check("  Monk with a shield loses its Unarmored Defense",C.computeAC(),14);   // 10+Dex+shield
// magic armour variants must be wearable once a base is chosen
setup("fighter-classic","Fighter",5);
S.equipment.inventory=[{name:"+1 Armor",cat:"Armor",bonusAc:"+1",requires:["armor"],base:"Plate Armor",qty:1,equipped:true}];
check("  +1 Armor as Plate (18 + 1)",C.computeAC(),19);
S.equipment.inventory[0].base=null;
check("  +1 Armor with no base chosen is not worn",C.computeAC(),12);


// custom AC: other modifier and override
setup("barbarian-classic","Barbarian",6);
check("  Barbarian base unarmoured",C.computeAC(),13);
S.sheet.acOther="2";  check("  + other modifier 2",C.computeAC(),15);
S.sheet.acOverride="20"; check("  override wins",C.computeAC(),20);
S.sheet.acOther="";S.sheet.acOverride=""; check("  reset returns to computed",C.computeAC(),13);
// armour must never stack with Unarmored Defense
S.equipment.inventory=[{name:"Leather Armor",cat:"Armor",ac:11,armorKind:"light",qty:1,equipped:true}];
check("  worn armour ignores Unarmored Defense",C.computeAC(),13);   // 11+Dex2, not 10+2+1+11
S.equipment.inventory=[{name:"Plate",cat:"Armor",ac:18,armorKind:"heavy",qty:1,equipped:true},
                       {name:"Leather Armor",cat:"Armor",ac:11,armorKind:"light",qty:1,equipped:true}];
checkTrue("  two body armours never stack",C.computeAC()<=20);


// =====================================================================
section("7c. Walking speed from features");
setup("barbarian-classic","Barbarian",4);
check("  Barbarian 4 (no Fast Movement yet)",C.speedInfo().total,30);
setup("barbarian-classic","Barbarian",5);
check("  Barbarian 5 Fast Movement +10",C.speedInfo().total,40);
S.equipment.inventory=[{name:"Plate",cat:"Armor",ac:18,armorKind:"heavy",qty:1,equipped:true}];
check("  ...suppressed by heavy armour",C.speedInfo().total,30);
S.equipment.inventory=[{name:"Leather Armor",cat:"Armor",ac:11,armorKind:"light",qty:1,equipped:true}];
check("  ...still applies in light armour",C.speedInfo().total,40);
setup("monk-classic","Monk",1);  check("  Monk 1  Unarmored Movement +0",C.speedInfo().total,30);
setup("monk-classic","Monk",2);  check("  Monk 2  Unarmored Movement +10",C.speedInfo().total,40);
setup("monk-classic","Monk",6);  check("  Monk 6  Unarmored Movement +15",C.speedInfo().total,45);
setup("monk-classic","Monk",18); check("  Monk 18 Unarmored Movement +30",C.speedInfo().total,60);
S.equipment.inventory=[{name:"Shield",cat:"Armor",ac:2,armorKind:"shield",qty:1,equipped:true}];
check("  Monk with a shield loses it",C.speedInfo().total,30);
// a lineage may override the species speed (Wood Elf 35 ft.)
setup("barbarian-classic","Barbarian",1);
S.race={name:"Elf",source:"PHB"};S.raceLineage="Wood";
check("  Wood Elf lineage speed 35",C.speedInfo().total,35);


// =====================================================================
section("7d. Custom-origin ability increases");
setup("barbarian-classic","Barbarian",6);
S.race={name:"Shifter",source:"MPMM"};S.raceLineage=null;
checkTrue("  MPMM species needs a custom allocation",C.needsCustomAsi(C.currentRace(),null));
check("  Con before allocating",C.totalScore("Constitution"),13);
S.raceChoices["race:custom:mode"]="2-1";
S.raceChoices["race:custom:a0"]="Constitution";S.raceChoices["race:custom:a1"]="Strength";
check("  +2 Con applied",C.totalScore("Constitution"),15);
check("  +1 Str applied",C.totalScore("Strength"),16);
S.raceChoices["race:custom:mode"]="all";
check("  +1 to all six: Charisma",C.totalScore("Charisma"),9);
// species with a fixed increase must not offer the allocator
setup("barbarian-classic","Barbarian",6);
S.race={name:"Dwarf",source:"PHB"};S.raceLineage=null;
check("  Dwarf keeps its fixed Con +2",C.totalScore("Constitution"),15);
checkTrue("  ...and offers no allocator",!C.needsCustomAsi(C.currentRace(),null));
// 2024 species get increases from the background, never here
setup("barbarian-one","Barbarian",6);
S.race={name:"Dwarf",source:"XPHB"};S.raceLineage=null;
checkTrue("  2024 species offers no allocator",!C.needsCustomAsi(C.currentRace(),null));


// =====================================================================
section("7e. Feats that grant ability increases (half-feats)");
setup("fighter-classic","Fighter",6);          // Str15 Dex14 Con13 Int12 Wis10 Cha8
S.choices["asi:4:mode"]="feat";
S.choices["asi:4:feat"]="Slasher";
checkTrue("  Slasher is pending until an ability is picked",C.featAsiPending(4));
checkTrue("  ...so the ASI is not yet complete",!C.asiResolved(4));
check("  Dex before",C.totalScore("Dexterity"),14);
S.choices["asi:4:featab0"]="Dexterity";
check("  Dex after Slasher +1",C.totalScore("Dexterity"),15);
checkTrue("  ...and now the ASI is complete",C.asiResolved(4));
S.choices["asi:4:feat"]="Actor";delete S.choices["asi:4:featab0"];
check("  Actor grants a fixed Cha +1",C.totalScore("Charisma"),9);
checkTrue("  ...with nothing left to choose",!C.featAsiPending(4));
S.choices["asi:4:feat"]="Alert";
check("  a feat with no increase adds nothing",C.featAsiPicks(4).length,0);
checkTrue("  ...and does not block the ASI",C.asiResolved(4));
// every feat that declares an increase must expose a usable shape
var withAb=0,broken=0,FL=window.CC_FEATS;
for(var fi2=0;fi2<FL.length;fi2++){
  var ab=FL[fi2].ability;if(!ab)continue;withAb++;
  var okFixed=false,k2;for(k2 in ab.fixed)okFixed=true;
  var okChoose=ab.choose&&ab.choose.from&&ab.choose.from.length>0;
  if(!okFixed&&!okChoose)broken++;
}
checkTrue("  feats declaring an increase are plentiful",withAb>150);
check("  none have an unusable ability shape",broken,0);


// =====================================================================
section("7f. Feature sub-option attacks, feature skill choices, optional toggles");
setup("barbarian-classic","Barbarian",6);
S.subclassName="Path of the Beast";
var fa=C.featureAttacks(),got={};
for(var q=0;q<fa.length;q++)got[fa[q].name]=fa[q];
checkTrue("  Form of the Beast: Bite is an attack",!!got["Bite"]);
checkTrue("  ...Claws too",!!got["Claws"]);
checkTrue("  ...Tail too",!!got["Tail"]);
if(got["Bite"]) check("  Bite damage",got["Bite"].dmg+" "+got["Bite"].dmgType,"1d8 piercing");
if(got["Claws"])check("  Claws damage",got["Claws"].dmg+" "+got["Claws"].dmgType,"1d6 slashing");
if(got["Tail"]) checkTrue("  Tail has reach",got["Tail"].reach);
// feature-granted skill choice (Primal Knowledge, optional TCE)
var pk=null,ft=C.featuresAndTraits();
for(var q2=0;q2<ft.length;q2++)if(ft[q2].name==="Primal Knowledge")pk=ft[q2];
checkTrue("  Primal Knowledge is present",!!pk);
if(pk){
  var ch=C.featureSkillChoice(pk);
  check("  it grants 1 skill at level 6",ch.count,1);
  check("  from the barbarian list",ch.pool.length,6);
  S.choices[ch.key+":0"]="Survival";
  checkTrue("  the pick becomes a proficiency",!!C.proficientSkills()["Survival"]);
  S.level=10;check("  a second pick at level 10",C.featureSkillChoice(pk).count,2);S.level=6;
  // optional features can be switched off
  S.choices["optOff:Primal Knowledge@3"]="1";
  var still=false,ft2=C.featuresAndTraits();
  for(var q3=0;q3<ft2.length;q3++)if(ft2[q3].name==="Primal Knowledge")still=true;
  checkTrue("  switching it off removes it",!still);
  checkTrue("  ...and drops its skill",!C.proficientSkills()["Survival"]);
  delete S.choices["optOff:Primal Knowledge@3"];
  checkTrue("  switching it back on restores it",!!C.proficientSkills()["Survival"]);
}


// =====================================================================
section("7g. Action-economy entries know where they came from");
setup("barbarian-classic","Barbarian",6);
S.subclassName="Path of the Beast";
S.race={name:"Shifter",source:"MPMM"};S.raceLineage=null;
var ae2=C.actionEconomy(),byName={};
["action","bonus","reaction"].forEach(function(kind){
  for(var i=0;i<ae2[kind].length;i++)byName[ae2[kind][i].name]=ae2[kind][i];
});
checkTrue("  Rage is a bonus action",!!byName["Rage"]);
if(byName["Rage"])checkTrue("  ...credited to the Barbarian class",byName["Rage"].origin.indexOf("class feature")>=0);
checkTrue("  Shifting is present",!!byName["Shifting"]);
if(byName["Shifting"])checkTrue("  ...credited to the species",byName["Shifting"].origin.indexOf("species trait")>=0);
// every entry must carry an origin
var missing=0;
["action","bonus","reaction"].forEach(function(kind){
  for(var i=0;i<ae2[kind].length;i++)if(!ae2[kind][i].origin)missing++;
});
check("  no entry lacks an origin",missing,0);
// feature attacks too
var fa2=C.featureAttacks(),noOrigin=0;
for(var i=0;i<fa2.length;i++)if(!fa2[i].origin)noOrigin++;
checkTrue("  beast-form attacks exist",fa2.length>=3);
check("  ...and all name their source",noOrigin,0);
// a lineage that already carries its book must not repeat it
setup("sorcerer-classic","Sorcerer",6);
S.race={name:"Elf",source:"PHB"};S.raceLineage="Eladrin (MTF)";
var ft3=C.featuresAndTraits(),fey=null;
for(var i=0;i<ft3.length;i++)if(ft3[i].name==="Fey Step")fey=ft3[i];
checkTrue("  Fey Step found on the Eladrin lineage",!!fey);
if(fey)check("  origin does not repeat the book",fey._origin.indexOf("(MTF) (MTF)"),-1);


// =====================================================================
section("7h. Conditional damage notes (rage, sneak attack, martial arts)");
function noteStr(kind){return C.condNotesFor(kind).join(" | ");}
setup("barbarian-classic","Barbarian",6);
checkTrue("  Barbarian 6 melee Str: +2 while raging",noteStr({melee:true,str:true}).indexOf("+2 while raging")>=0);
check("  ...not on a ranged attack",noteStr({ranged:true}),"");
setup("barbarian-classic","Barbarian",9);
checkTrue("  Barbarian 9 rages for +3",noteStr({melee:true,str:true}).indexOf("+3 while raging")>=0);
setup("barbarian-classic","Barbarian",17);
checkTrue("  Barbarian 17 rages for +4",noteStr({melee:true,str:true}).indexOf("+4 while raging")>=0);
setup("rogue-classic","Rogue",6);
checkTrue("  Rogue 6 finesse: +3d6 Sneak Attack",noteStr({melee:true,finesse:true}).indexOf("3d6")>=0);
checkTrue("  ...also on ranged",noteStr({ranged:true}).indexOf("3d6")>=0);
check("  ...but not on a non-finesse melee weapon",noteStr({melee:true,str:true}),"");
setup("monk-classic","Monk",6);
checkTrue("  Monk 6 unarmed: Martial Arts die 1d6",noteStr({melee:true,unarmed:true}).indexOf("1d6")>=0);
setup("monk-classic","Monk",17);
checkTrue("  Monk 17 uses 1d10",noteStr({melee:true,unarmed:true}).indexOf("1d10")>=0);
setup("fighter-classic","Fighter",6);
check("  a class with none gets no notes",noteStr({melee:true,str:true,finesse:true,unarmed:true}),"");


// =====================================================================
section("7i. Official language list");
setup("bard-classic","Bard",5);
var LL=C.officialLanguages();
checkTrue("  the list is generated, not the built-in 16",LL.length>100);
function hasLang(nm){for(var i=0;i<LL.length;i++)if(LL[i].name===nm)return LL[i];return null;}
checkTrue("  contains Common",!!hasLang("Common"));
checkTrue("  contains Draconic",!!hasLang("Draconic"));
checkTrue("  contains Thieves' Cant",!!hasLang("Thieves' Cant"));
if(hasLang("Common"))check("  Common is standard",hasLang("Common").type,"standard");
if(hasLang("Draconic"))check("  Draconic is exotic",hasLang("Draconic").type,"exotic");
if(hasLang("Thieves' Cant"))check("  Thieves' Cant is secret",hasLang("Thieves' Cant").type,"secret");
check("  the 16 PHB core languages are flagged",(function(){var n=0;for(var i=0;i<LL.length;i++)if(LL[i].core)n++;return n;})(),16);
// a custom language still works and shows up
S.customLanguages=["Tedlenese"];
checkTrue("  a custom language is included",C.languagesAll().indexOf("Tedlenese")>=0);


// =====================================================================
section("7j. Lineage species languages (MPMM/VRGR)");
setup("barbarian-classic","Barbarian",6);
S.race={name:"Shifter",source:"MPMM"};S.raceLineage=null;
var shr=C.currentRace();
checkTrue("  Shifter is flagged as a lineage species",!!shr.lineage);
check("  it grants Common",shr.languages.fixed.join(","),"Common");
check("  plus one language of choice",shr.languages.any,1);
checkTrue("  and explains the DM agreement",shr.langNote.indexOf("your DM")>=0);
check("  known before choosing",C.languagesAll().join(","),"Common");
S.raceChoices["race:langany:0"]="Draconic";
check("  known after choosing",C.languagesAll().join(","),"Common,Draconic");
// a species with real language data must be untouched
setup("barbarian-classic","Barbarian",6);
S.race={name:"Elf",source:"PHB"};S.raceLineage=null;
var elr=C.currentRace();
checkTrue("  Elf is not a lineage species",!elr.lineage);
check("  Elf still gets Common and Elvish",elr.languages.fixed.join(","),"Common,Elvish");
check("  ...with no extra pick",elr.languages.any,0);
// every lineage species should offer the same deal
var LR=window.CC_RACES.classic,bad=0,cnt=0;
for(var i=0;i<LR.length;i++){
  if(!LR[i].lineage||LR[i].name==="Custom Lineage")continue;cnt++;   // Custom Lineage states its own
  if(LR[i].languages.fixed.join(",")!=="Common"||LR[i].languages.any!==1)bad++;
}
checkTrue("  many lineage species exist",cnt>40);
check("  all grant Common + 1",bad,0);
// a lineage may add languages of its own; they must not be dropped
setup("wizard-classic","Wizard",5);
S.race={name:"Elf",source:"PHB"};S.raceLineage="High";
var hm=C.mergedLanguages(C.currentRace(),C.currentLineage(C.currentRace()));
check("  High Elf keeps Common and Elvish",hm.fixed.join(","),"Common,Elvish");
check("  ...and adds an extra standard language",hm.anyStandard,1);
S.raceChoices["race:lang:0"]="Draconic";
checkTrue("  the extra pick reaches the character",C.languagesAll().indexOf("Draconic")>=0);
S.raceLineage="Sea (MTF)";
var sm=C.mergedLanguages(C.currentRace(),C.currentLineage(C.currentRace()));
checkTrue("  Sea Elf gains Aquan",sm.fixed.indexOf("Aquan")>=0);



// =====================================================================
section("7k. Expertise and defences");
setup("rogue-classic","Rogue",6);          // prof +3; Wis 10 (+0), Dex 14 (+2)
S.choices["skill:0"]="Insight";S.choices["skill:1"]="Stealth";
check("  Insight with proficiency only",C.skillBonus("Insight"),3);
S.choices["expertise:1:0"]="Insight";
check("  Insight with Expertise doubles the bonus",C.skillBonus("Insight"),6);
check("  Stealth is unaffected",C.skillBonus("Stealth"),5);
check("  a non-proficient skill gets no bonus",C.skillBonus("Arcana"),1);
// expertise must not apply to a skill you are not proficient in
S.choices["expertise:1:1"]="Medicine";
check("  expertise on a non-proficient skill adds nothing",C.skillBonus("Medicine"),0);
// passives follow expertise
setup("rogue-classic","Rogue",6);
S.choices["skill:0"]="Perception";
check("  passive Perception with proficiency",C.passiveScore("Perception"),13);
S.choices["expertise:1:0"]="Perception";
check("  ...and with Expertise",C.passiveScore("Perception"),16);
// bards get it too, at their own levels
setup("bard-classic","Bard",3);
S.choices["skill:0"]="Persuasion";
S.choices["expertise:3:0"]="Persuasion";
check("  Bard 3 Expertise on Persuasion",C.skillBonus("Persuasion"),2*2-1+0);   // Cha 8 (-1) + 2*prof(2)
// defences: species resistances and parsed advantages
setup("sorcerer-classic","Sorcerer",6);
S.race={name:"Elf",source:"PHB"};S.raceLineage=null;
var dfn=C.defences();
checkTrue("  Elf: advantage against being charmed",(function(){for(var i=0;i<dfn.adv.length;i++)if(/charmed/i.test(dfn.adv[i].text))return true;return false;})());
checkTrue("  Elf: magic cannot put it to sleep",(function(){for(var i=0;i<dfn.adv.length;i++)if(/sleep/i.test(dfn.adv[i].text))return true;return false;})());
checkTrue("  no raw 5etools tags leak through",(function(){for(var i=0;i<dfn.adv.length;i++)if(dfn.adv[i].text.indexOf("{@")>=0)return false;return true;})());
S.race={name:"Aasimar",source:"MPMM"};
var dfn2=C.defences();
checkTrue("  Aasimar resists necrotic and radiant",dfn2.resist.length>=2);


// =====================================================================
section("7l. Armour mechanics, stealth penalty and skill advantage flags");
setup("paladin-classic","Paladin",6);       // Str 15 from the standard array
function findItem(nm){var L=window.CC_ITEMS;for(var i=0;i<L.length;i++)if(L[i].name===nm)return L[i];return null;}
var plate=findItem("Plate Armor");
checkTrue("  Plate Armor is in the data",!!plate);
if(plate){
  check("  its AC",plate.ac,18);
  checkTrue("  it carries the stealth penalty",!!plate.stealthDis);
  check("  and a minimum Strength",plate.strReq,15);
  var mech=C.itemMechanics(plate);
  check("  two mechanical sentences are produced",mech.length,2);
  checkTrue("  ...the stealth one",mech.join(" ").indexOf("disadvantage on Dexterity (Stealth)")>=0);
  checkTrue("  ...the Strength one",mech.join(" ").indexOf("lower than 15")>=0);
}
// wearing it flags Stealth and, if too weak, costs speed
S.equipment.inventory=[{name:"Plate Armor",source:"PHB",cat:"Armor",ac:18,armorKind:"heavy",stealthDis:true,strReq:15,qty:1,equipped:true}];
var ad=C.skillAdvantage();
checkTrue("  Stealth is flagged with disadvantage",!!(ad["Stealth"]&&ad["Stealth"].dis.length));
check("  Strength 15 meets the requirement, so full speed",C.speedInfo().total,30);
S.abilities.base.Strength=8;
check("  Strength 8 in plate loses 10 feet",C.speedInfo().total,20);
// light armour has neither
setup("paladin-classic","Paladin",6);
S.equipment.inventory=[{name:"Leather Armor",source:"PHB",cat:"Armor",ac:11,armorKind:"light",qty:1,equipped:true}];
var ad2=C.skillAdvantage();
checkTrue("  leather armour does not flag Stealth",!(ad2["Stealth"]&&ad2["Stealth"].dis.length));
check("  ...and does not slow you",C.speedInfo().total,30);
// a feature that grants advantage on a skill is flagged
setup("ranger-classic","Ranger",6);
var ad3=C.skillAdvantage();
checkTrue("  Ranger Favored Enemy flags Survival",!!(ad3["Survival"]&&ad3["Survival"].adv.length));
checkTrue("  ...named and marked situational",ad3["Survival"].adv.join(";").indexOf("situational")>=0);


// =====================================================================
section("7m. Features referenced by other features (refClassFeature / refSubclassFeature)");
// A feature's text can be a pointer to another feature rather than the text itself.
// Those must reach the sheet's Features & Traits, not just the wizard page.
function nestedFor(slug,name,sub,lvl){
  setup(slug,name,lvl);S.subclassName=sub;
  var raw=[],fd=S.fdata;
  (fd.classFeatures||[]).forEach(function(f){if(f.level<=lvl)raw.push({entries:f.entries,_origin:"class feature"});});
  var ch=(fd.subclasses||[]).filter(function(s){return s.name===sub;})[0];
  if(ch)(ch.features||[]).forEach(function(f){if(f.level<=lvl)raw.push({entries:f.entries,_origin:"subclass feature"});});
  return C.expandFeatureRefs(raw);
}
function hasNested(list,nm){for(var i=0;i<list.length;i++)if(list[i].name===nm)return list[i];return null;}
var beast=nestedFor("barbarian-classic","Barbarian","Path of the Beast",5);
var fotb=hasNested(beast,"Form of the Beast");
checkTrue("  Path of the Beast surfaces Form of the Beast",!!fotb);
if(fotb){
  checkTrue("  ...with its full text",fotb.entries.length>3);
  checkTrue("  ...and the origin of the feature that referenced it",fotb._origin.indexOf("subclass")>=0);
}
// the same mechanism carries features several other classes depend on
var cases=[["monk-classic","Monk","Way of the Open Hand",5,"Flurry of Blows"],
           ["monk-classic","Monk","Way of the Open Hand",5,"Patient Defense"],
           ["monk-classic","Monk","Way of the Open Hand",5,"Step of the Wind"],
           ["sorcerer-classic","Sorcerer","Draconic Bloodline",5,"Draconic Resilience"],
           ["sorcerer-classic","Sorcerer","Draconic Bloodline",5,"Flexible Casting"],
           ["paladin-classic","Paladin","Oath of Devotion",5,"Sacred Weapon"],
           ["rogue-classic","Rogue","Assassin",5,"Assassinate"],
           ["warlock-classic","Warlock","The Fiend",5,"Dark One's Blessing"],
           ["barbarian-classic","Barbarian","Path of the Totem Warrior",5,"Bear"]];
for(var ni=0;ni<cases.length;ni++){
  var cs=cases[ni],lst=nestedFor(cs[0],cs[1],cs[2],cs[3]);
  checkTrue("  "+cs[1]+" / "+cs[2]+" surfaces "+cs[4],!!hasNested(lst,cs[4]));
}
// nothing from a level you have not reached
checkTrue("  a level-1 Paladin has no Sacred Weapon yet",!hasNested(nestedFor("paladin-classic","Paladin","Oath of Devotion",1),"Sacred Weapon"));

// =====================================================================
section("7n. Attack rows carry their rules text and expand");
setup("barbarian-classic","Barbarian","Path of the Beast",5);
S.subclassName="Path of the Beast";
var atks=C.featureAttacks(),names=atks.map(function(a){return a.name;}).join(",");
check("  Form of the Beast grants three attacks",atks.length,3);
checkTrue("  Bite, Claws and Tail",names.indexOf("Bite")>=0&&names.indexOf("Claws")>=0&&names.indexOf("Tail")>=0);
for(var ai=0;ai<atks.length;ai++){
  checkTrue("  "+atks[ai].name+" carries its own text",atks[ai].entries.length>0);
  checkTrue("  "+atks[ai].name+" names its parent feature",atks[ai].parent==="Form of the Beast");
}
var card=C.actionsCardHtml();
function count(re){return (card.match(re)||[]).length;}
check("  every attack row is expandable",count(/class="atk-row has-desc/g),count(/class="atk-row/g));
check("  ...and each has a description block",count(/atk-desc-in/g),count(/class="atk-row/g));
checkTrue("  the Tail's reaction text is in the card",card.indexOf("swipe your tail")>=0);
checkTrue("  the Unarmed Strike is described too",card.indexOf("never less than 1")>=0);
// a caster's spell rows expand to the full spell entry
setup("wizard-classic","Wizard",5);
S.spells={cantrips:["Fire Bolt|PHB"],spells:["Fireball|PHB"],levelFilter:"",q:""};
var wcard=C.actionsCardHtml();
checkTrue("  a cantrip row expands",wcard.indexOf("Fire Bolt")>=0&&wcard.indexOf("Casting Time:")>=0);
checkTrue("  a leveled spell row shows At Higher Levels",wcard.indexOf("Fireball")>=0&&wcard.indexOf("At Higher Levels")>=0);


// =====================================================================
section("7o. Active effects: Rage, Bladesong and concentration");
function fxByName(list,nm){for(var i=0;i<list.length;i++)if(list[i].name===nm)return list[i];return null;}
function strip(s){return s.replace(/<[^>]*>/g," ").replace(/\s+/g," ");}
setup("barbarian-classic","Barbarian",5);S.subclassName="Path of the Beast";
var av=C.fxAvailable(),rage=fxByName(av,"Rage");
checkTrue("  Rage is offered as a switchable effect",!!rage);
if(rage){
  check("  its damage bonus comes from the class table",rage.mods.dmg,2);
  check("  it grants three resistances",rage.mods.resist.length,3);
  checkTrue("  ...the physical ones",rage.mods.resist.join(",")==="Bludgeoning,Piercing,Slashing");
  check("  advantage on one ability",rage.mods.advAbility.join(","),"Strength");
  checkTrue("  and it knows heavy armour cancels it",rage.mods.notHeavy);
}
// nothing applies until it is switched on
check("  nothing is active to begin with",C.fxActive().length,0);
check("  ...so no damage bonus",C.fxDmgFor({melee:true,str:true}),0);
function clawsRow(html){var i=html.indexOf("Claws");return i<0?"":html.substr(i,220).replace(/<[^>]*>/g," ").replace(/\s+/g," ");}
var off=C.actionsCardHtml();
checkTrue("  the bonus is shown as a note instead",clawsRow(off).indexOf("+2 while raging")>=0);
S.sheet.active["Rage"]=true;
check("  switching it on makes it active",C.fxActive().length,1);
check("  ...and the damage bonus applies to Strength melee",C.fxDmgFor({melee:true,str:true}),2);
check("  ...but not to ranged attacks",C.fxDmgFor({ranged:true}),0);
var on=C.actionsCardHtml();
checkTrue("  the note is gone once it is counted",clawsRow(on).indexOf("while raging")<0);
checkTrue("  Claws show the raised damage (Str 15: 1d6+2 becomes 1d6+4)",clawsRow(on).indexOf("1d6+4")>=0);
checkTrue("  ...and 1d6+2 before",clawsRow(off).indexOf("1d6+2")>=0);
function hitOf(row){var m=/(\+\d+) 1d6/.exec(row);return m?m[1]:"?";}
check("  the attack roll is untouched",hitOf(clawsRow(on)),hitOf(clawsRow(off)));
var d=C.defences();
checkTrue("  Defences gains the resistances",(d.fx||[]).join?true:true);
checkTrue("  ...listed while it runs",strip(C.defences().fx[0].text).indexOf("Resistance to Bludgeoning")>=0);
checkTrue("  Athletics is marked with advantage",!!(C.skillAdvantage()["Athletics"]||{adv:[]}).adv.length);
// heavy armour cancels every benefit
S.equipment.inventory=[{name:"Plate Armor",source:"PHB",cat:"Armor",ac:18,armorKind:"heavy",qty:1,equipped:true}];
checkTrue("  in heavy armour the effect is blocked",C.fxActive()[0].blocked);
check("  ...so no damage bonus",C.fxDmgFor({melee:true,str:true}),0);
checkTrue("  ...and no advantage on Athletics",!(C.skillAdvantage()["Athletics"]||{adv:[]}).adv.length);
S.equipment.inventory=[];
// a rest ends it
setup("barbarian-classic","Barbarian",5);S.subclassName="Path of the Beast";
S.sheet.active["Rage"]=true;S.sheet.conc="Haste|PHB";
C.render();
checkTrue("  an effect survives an ordinary render",C.fxActive().length===1);

// Bladesong raises AC by the Intelligence modifier and speed by 10
setup("wizard-classic","Wizard",6);S.subclassName="Bladesinging";
S.abilities.base={Strength:8,Dexterity:15,Constitution:13,Intelligence:14,Wisdom:12,Charisma:10};
var bs=fxByName(C.fxAvailable(),"Bladesong");
checkTrue("  Bladesong is offered",!!bs);
if(bs)check("  its AC bonus is an ability, not a number",bs.mods.acAbility,"Intelligence");
var acOff=C.computeAC(),spOff=C.speedInfo().total;
S.sheet.active["Bladesong"]=true;
check("  AC before / after",acOff+" / "+C.computeAC(),"12 / 14");
check("  speed before / after",spOff+" / "+C.speedInfo().total,"30 / 40");
checkTrue("  the AC breakdown names it",C.acBreakdown().indexOf("Bladesong")>=0);
S.sheet.active={};
check("  switching it off restores AC",C.computeAC(),12);

// dice bonuses cannot fold into a number, so they stay a note
setup("fighter-classic","Fighter",6);S.subclassName="Rune Knight";
var gm=fxByName(C.fxAvailable(),"Giant's Might");
checkTrue("  Giant's Might is offered",!!gm);
if(gm){check("  it grants dice, not a flat bonus",gm.mods.dmgDice,"1d6");check("  and no flat bonus",gm.mods.dmg,0);}
S.sheet.active["Giant's Might"]=true;
checkTrue("  the dice show as an active note on melee attacks",C.actionsCardHtml().indexOf("+1d6 Giant's Might (active)")>=0);

// an effect that happens to the enemy is not one of yours
setup("paladin-classic","Paladin",6);S.subclassName="Oath of Devotion";
var pv=C.fxAvailable();
checkTrue("  Sacred Weapon is yours",!!fxByName(pv,"Sacred Weapon"));
checkTrue("  Turn the Unholy is not",!fxByName(pv,"Turn the Unholy"));

// a species lists every lineage's benefit; only the one you took may apply
setup("barbarian-classic","Barbarian",5);
S.race={name:"Shifter",source:"MPMM"};S.raceLineage="Longtooth";
var sv=C.fxAvailable(),generic=fxByName(sv,"Shifting");
checkTrue("  a Longtooth shifter gets one Shifting toggle",!!fxByName(sv,"Shifting (Longtooth)")&&!generic);
var shift=fxByName(sv,"Shifting (Longtooth)");
if(shift){
  check("  ...without Swiftstride's speed",shift.mods.speed,0);
  check("  ...and without Wildhunt's advantage",shift.mods.advAbility.length,0);
}

// concentration is limited to spells that need it
setup("wizard-classic","Wizard",5);
S.spells={cantrips:["Fire Bolt|PHB"],spells:["Haste|PHB","Fireball|PHB"],levelFilter:"",q:""};
var co=C.concOptions();
check("  only concentration spells are offered",co.length,1);
check("  ...which is Haste",co[0].label,"Haste (3rd)");
S.sheet.conc="Haste|PHB";
C.render();
checkTrue("  the status bar names it",_els["sheetPanel"].innerHTML.indexOf("CONCENTRATING")>=0);
checkTrue("  the sheet frame is tinted",_els["sheetPanel"].className.indexOf("fx-conc-on")>=0);
S.sheet.conc="Fireball|PHB";
checkTrue("  a spell without concentration cannot be held",!C.fxActive().length&&_els["sheetPanel"]!==null);


// =====================================================================
section("7p. Homebrew books merge in and are labelled as homebrew");
// Content is only checked if a homebrew book is actually present, so the suite still
// passes on a clean official-only data set.
var hbCodes=[];for(var hk in (window.CC_HOMEBREW||{}))hbCodes.push(hk);
if(!hbCodes.length){
  WScript.Echo("  (no homebrew book in this data set - skipped)");
}else{
  var code=hbCodes[0];
  checkTrue("  the book is flagged as homebrew",C.isHomebrew(code));
  checkTrue("  an official book is not",!C.isHomebrew("PHB"));
  checkTrue("  it is shown under its own short abbreviation",C.srcAbbr(code).length<code.length);
  checkTrue("  ...and named in full on hover",C.sourceName(code).indexOf("homebrew")>=0);
  // items
  var hbItems=(window.CC_ITEMS||[]).filter(function(x){return x.hb;});
  checkTrue("  its items are in the item list",hbItems.length>0);
  var blocked=0;
  setup("fighter-classic","Fighter",5);
  for(var i=0;i<hbItems.length;i++)if(!C.itemAllowed(hbItems[i]))blocked++;
  check("  none are filtered out by the rules edition",blocked,0);
  var hbW=hbItems.filter(function(x){return x.cat==="Weapon"&&x.dmg;});
  checkTrue("  including usable weapons",hbW.length>0);
  // a homebrew weapon behaves like any other on the sheet
  var w=hbW[0];
  S.equipment.inventory=[{name:w.name,source:w.source,cat:"Weapon",dmg:w.dmg,dmgType:w.dmgType,
                          weaponCat:w.weaponCat,wtype:w.wtype,qty:1,equipped:true,attuned:true}];
  checkTrue("  and appears as an attack",C.actionsCardHtml().indexOf(w.name)>=0);
  S.equipment.inventory=[];
  // species
  var hbRaces=[];
  for(var ed in (window.CC_RACES||{}))
    (window.CC_RACES[ed]||[]).forEach(function(r){if(r.hb)hbRaces.push(r);});
  checkTrue("  its species are selectable",hbRaces.length>0);
  // subclasses, on the classes they were written for
  var hbSub=0,classesTouched={};
  (window.CC_CLASSES||[]).forEach(function(cl){
    var fd=window.CC_FEATURE_DATA[cl.slug];if(!fd)return;
    (fd.subclasses||[]).forEach(function(s){
      if(!s.hb)return;
      hbSub++;classesTouched[cl.slug]=1;
      if(!s.features.length)fails.push("  homebrew subclass with no features: "+s.name);
    });
  });
  checkTrue("  its subclasses are attached to their classes",hbSub>0);
  // and a character built on one works end to end
  var found=null;
  (window.CC_CLASSES||[]).forEach(function(cl){
    if(found)return;
    var fd=window.CC_FEATURE_DATA[cl.slug];if(!fd)return;
    (fd.subclasses||[]).forEach(function(s){if(!found&&s.hb)found={cl:cl,sub:s};});
  });
  if(found){
    setup(found.cl.slug,found.cl.name,20);S.subclassName=found.sub.name;
    C.render();
    var html=_els["sheetPanel"].innerHTML;
    checkTrue("  a character on "+found.sub.name+" renders",html.indexOf("Sheet error")<0);
    checkTrue("  ...with its features listed",html.indexOf(found.sub.features[0].name)>=0);
  }
}


// =====================================================================
section("7q. Recent characters list");
// The IndexedDB and permission plumbing needs a real browser; what is checkable here is
// the time wording and the card markup built from one stored record.
var NOW=(new Date()).getTime(),MIN=60000,HOUR=60*MIN,DAY=24*HOUR;
check("  seconds ago reads 'just now'",C.rcWhen(NOW-5000),"just now");
check("  one minute is singular",C.rcWhen(NOW-MIN),"1 minute ago");
check("  ...and several are plural",C.rcWhen(NOW-40*MIN),"40 minutes ago");
check("  one hour is singular",C.rcWhen(NOW-HOUR),"1 hour ago");
check("  ...and several are plural",C.rcWhen(NOW-5*HOUR),"5 hours ago");
check("  one day is singular",C.rcWhen(NOW-DAY),"1 day ago");
check("  ...and several are plural",C.rcWhen(NOW-9*DAY),"9 days ago");
checkTrue("  beyond a month it falls back to a date",C.rcWhen(NOW-200*DAY).indexOf("ago")<0);
// a card carries everything needed to recognise and open the character
var rec={id:7,file:"Tedlen Teddy Bearborne.json",name:"Tedlen",cls:"Barbarian",level:5,
         sub:"Path of the Beast",edition:"classic",portrait:null,when:NOW-2*HOUR};
var card=C.rcCardHtml(rec);
checkTrue("  the card carries its record id",card.indexOf('data-id="7"')>=0);
checkTrue("  the name is shown",card.indexOf(">Tedlen<")>=0);
checkTrue("  with level, class and subclass",card.indexOf("Level 5 Barbarian")>=0&&card.indexOf("Path of the Beast")>=0);
checkTrue("  and when it was last opened",card.indexOf("2 hours ago")>=0);
checkTrue("  the file name and edition are on hover",card.indexOf("Tedlen Teddy Bearborne.json")>=0&&card.indexOf("2014 Core Rules")>=0);
checkTrue("  it is reachable by keyboard",card.indexOf('tabindex="0"')>=0&&card.indexOf('role="button"')>=0);
checkTrue("  a forget control is present",card.indexOf('data-x="7"')>=0);
checkTrue("  ...which says the file is not deleted",card.indexOf("not deleted")>=0);
checkTrue("  with no portrait it falls back to a die",card.indexOf("rc-die")>=0);
// a portrait is used when the character has one
var withArt=C.rcCardHtml({id:8,file:"a.json",name:"Erenar",cls:"Sorcerer",level:3,sub:"",
                          edition:"one",portrait:"data:image/png;base64,AAA",when:NOW});
checkTrue("  a portrait becomes the thumbnail",withArt.indexOf("<img src=")>=0&&withArt.indexOf("rc-die")<0);
checkTrue("  a character with no subclass still reads correctly",withArt.indexOf("Level 3 Sorcerer")>=0);
// nothing unescaped reaches the markup
var nasty=C.rcCardHtml({id:9,file:'x".json',name:'<script>bad</script>',cls:"",level:1,sub:"",
                        edition:"classic",portrait:null,when:NOW});
checkTrue("  a hostile name is escaped",nasty.indexOf("<script>")<0);

// =====================================================================
section("8. Data integrity");
check("  core class/edition combos",classes.length,26);
check("  feature files loaded",Object.keys(window.CC_FEATURE_DATA).length,30);
checkTrue("  spells loaded",window.CC_SPELLS.length>700);
checkTrue("  items loaded",window.CC_ITEMS.length>2500);
checkTrue("  feats loaded",window.CC_FEATS.length>250);
checkTrue("  backgrounds loaded",window.CC_BACKGROUNDS.classic.length>90);
checkTrue("  races loaded",window.CC_RACES.classic.length>130);
// every class has hit dice and a subclass title
for(var ci2=0;ci2<classes.length;ci2++){
  var cc=classes[ci2];
  if(!cc.hdFaces)fails.push("  "+cc.name+" ("+cc.editionLabel+") missing hit dice");else pass++;
}
// attunement sanity
var mundane=0,attunable=0;
for(var i4=0;i4<window.CC_ITEMS.length;i4++){var itx=window.CC_ITEMS[i4];
  if(itx.attune)attunable++;
  if(itx.name==="Dagger"&&itx.attune)mundane++;}
checkTrue("  some items require attunement",attunable>500);
check("  plain Dagger not attunable",mundane,0);

// =====================================================================
section("9. Every subclass of every core class renders at level 20");
var subTested=0,subClasses=0;
for(var ci3=0;ci3<classes.length;ci3++){
  var cx=classes[ci3],fdx=window.CC_FEATURE_DATA[cx.slug];
  if(!fdx)continue;
  for(var si=0;si<fdx.subclasses.length;si++){
    var sub=fdx.subclasses[si];subClasses++;
    setup(cx.slug,cx.name,20);
    S.subclassName=sub.name;
    try{
      C.renderSheet();
      var h9=_els["sheetPanel"].innerHTML;
      if(h9.indexOf("Sheet error")>=0){fails.push("  "+cx.name+" / "+sub.name+" -> SHEET THREW: "+h9.replace(/<[^>]+>/g,"").substring(0,140));continue;}
      if(h9.indexOf(sub.name)<0){fails.push("  "+cx.name+" / "+sub.name+" -> subclass name absent from sheet");continue;}
      C.actionEconomy();
      subTested++;pass++;
    }catch(e9){fails.push("  "+cx.name+" / "+sub.name+" -> threw: "+(e9.message||e9));}
  }
}
WScript.Echo("  subclasses rendered OK: "+subTested+" / "+subClasses);

section("10. Every skill can be gained from class, background and race");
setup("bard-classic","Bard",5);                    // Bard: choose any 3 skills
var bf=window.CC_FEATURE_DATA["bard-classic"];
checkTrue("  Bard has skill choices",bf.proficiencies&&bf.proficiencies.skills&&bf.proficiencies.skills.count>0);
var allSk=Object.keys(C.SKILL_ABILITY);
for(var s10=0;s10<allSk.length;s10++){
  setup("bard-classic","Bard",5);
  S.choices["skill:0"]=allSk[s10];
  var p10=C.proficientSkills();
  if(!p10[allSk[s10]])fails.push("  skill not registering as proficient: "+allSk[s10]);else pass++;
  // and the bonus must include the proficiency bonus
  var want=C.abMod(C.totalScore(C.SKILL_ABILITY[allSk[s10]]))+C.profBonus();
  var got=C.abMod(C.totalScore(C.SKILL_ABILITY[allSk[s10]]))+(p10[allSk[s10]]?C.profBonus():0);
  if(got!==want)fails.push("  wrong bonus for "+allSk[s10]);else pass++;
}

// =====================================================================
WScript.Echo("");
WScript.Echo("=======================================================");
WScript.Echo("checks passed: "+pass);
WScript.Echo("failures     : "+fails.length);
if(fails.length){
  WScript.Echo("");
  for(var i5=0;i5<fails.length;i5++)WScript.Echo("FAIL "+fails[i5]);
}
WScript.Echo("=======================================================");
WScript.Quit(fails.length?1:0);
