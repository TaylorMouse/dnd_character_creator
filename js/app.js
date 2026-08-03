(function(){
  "use strict";
  function freshEquipment(){return {mode:"equipment",starting:{},startingAdded:false,inventory:[],currency:{pp:0,gp:0,ep:0,sp:0,cp:0},filterType:"",filterQ:""};}
  function freshSheet(){return {hpCurrent:null,hpTemp:"",res:{},hpEdited:false,invQ:"",invAdd:"",xp:"",inspiration:false,deathSucc:0,deathFail:0,dark:false,acOther:"",acOverride:"",acEditOpen:false};}
  // Single source of truth for a pristine character. Used at start-up and by "start over".
  function freshCharacter(){
    return {edition:null,name:"",className:null,source:null,slug:null,hdFaces:null,level:1,manualHp:null,subclassName:null,fdata:null,choices:{},openPanels:{},
            background:null,bgIsCustom:false,bgCustomName:"",bgCustomDesc:"",bgChoices:{},details:{alignment:"",faith:"",lifestyle:""},
            race:null,raceLineage:null,raceChoices:{},
            abilities:{method:"pointbuy",base:{Strength:8,Dexterity:8,Constitution:8,Intelligence:8,Wisdom:8,Charisma:8},assign:{},other:{},override:{},rolled:null},
            equipment:freshEquipment(),
            spells:{cantrips:[],spells:[],levelFilter:"",q:""},customLanguages:[],portrait:null,
            sheet:freshSheet()};
  }
  var state=freshCharacter();
  // Wipe every character field in place (keeping the same state object) and reset the form controls.
  function resetCharacter(){
    var f=freshCharacter(),k;
    for(k in state)if(state.hasOwnProperty(k))delete state[k];
    for(k in f)state[k]=f[k];
    var n=$("charName");if(n)n.value="";
    var cn=$("bgCustomName");if(cn)cn.value="";
    var cd=$("bgCustomDesc");if(cd)cd.value="";
    var cs=$("classSelect");if(cs)cs.value="";
    var am=$("abilityMethod");if(am)am.value="pointbuy";
    var hr=$("hpEditRow");if(hr)hr.classList.add("hidden");
    document.body.classList.remove("dark");
    populateLevels();
    $("featTitle").textContent="Class Features";
  }
  var ABILITIES=["Strength","Dexterity","Constitution","Intelligence","Wisdom","Charisma"];
  var STD_LANGS=["Common","Dwarvish","Elvish","Giant","Gnomish","Goblin","Halfling","Orc"];
  var EXOTIC_LANGS=["Abyssal","Celestial","Deep Speech","Draconic","Infernal","Primordial","Sylvan","Undercommon"];
  var ALL_LANGS=STD_LANGS.concat(EXOTIC_LANGS);
  var ALL_SKILLS=["Acrobatics","Animal Handling","Arcana","Athletics","Deception","History","Insight","Intimidation","Investigation","Medicine","Nature","Perception","Performance","Persuasion","Religion","Sleight of Hand","Stealth","Survival"];
  var ALIGNMENTS=["Lawful Good","Neutral Good","Chaotic Good","Lawful Neutral","True Neutral","Chaotic Neutral","Lawful Evil","Neutral Evil","Chaotic Evil","Unaligned"];
  var LIFESTYLES=["Wretched","Squalid (1SP)","Poor (2SP)","Modest (1GP)","Comfortable (2GP)","Wealthy (4GP)","Aristocratic (10GP minimum)"];
  var SOURCE_NAMES={
    PHB:"Player's Handbook (2014)",XPHB:"Player's Handbook (2024)",DMG:"Dungeon Master's Guide",
    TCE:"Tasha's Cauldron of Everything",XGE:"Xanathar's Guide to Everything",SCAG:"Sword Coast Adventurer's Guide",
    FTD:"Fizban's Treasury of Dragons",MPMM:"Mordenkainen Presents: Monsters of the Multiverse",
    MTF:"Mordenkainen's Tome of Foes",VGM:"Volo's Guide to Monsters",
    EGW:"Explorer's Guide to Wildemount",ERLW:"Eberron: Rising from the Last War",GGR:"Guildmasters' Guide to Ravnica",
    AI:"Acquisitions Incorporated",AAG:"Astral Adventurer's Guide",SATO:"Sigil and the Outlands",
    PSK:"Plane Shift: Kaladesh",BGG:"Bigby Presents: Glory of the Giants",BMT:"The Book of Many Things",
    MOT:"Mythic Odysseys of Theros",VRGR:"Van Richten's Guide to Ravenloft",SCC:"Strixhaven: A Curriculum of Chaos",
    DSotDQ:"Dragonlance: Shadow of the Dragon Queen",
    TDCSR:"Tal'Dorei Campaign Setting Reborn",UA:"Unearthed Arcana"};
  // Prefer the generated 5etools book list, fall back to the built-in map.
  function bookTitle(code){
    if(!code)return "";
    var g=window.CC_SOURCES&&window.CC_SOURCES[code];
    return g||SOURCE_NAMES[code]||"";
  }
  function sourceName(code){var t=bookTitle(code);return t?t+" ("+code+")":code;}
  // An abbreviation that reveals the full book title on hover.
  function srcTag(code){
    if(!code)return "";
    var t=bookTitle(code);
    return '<span class="src"'+(t?' title="'+esc(t)+'"':"")+">"+esc(code)+"</span>";
  }
  // Subclass features that require picking one row from a table (e.g. which dragon).
  var TABLE_CHOICES=[
    {className:"Sorcerer",sub:"Draconic",feature:"Dragon Ancestor",label:"Draconic Ancestry — choose your dragon",optCol:0,detailCol:1,detailLabel:"Damage type",caption:"Draconic Ancestry"},
    {className:"Warlock",sub:"Genie",feature:"The Genie",label:"Genie Kind — choose your patron",optCol:1,detailCol:2,detailLabel:"Element",caption:"Genie Kind"},
    {className:"Sorcerer",sub:"Divine Soul",feature:"Divine Magic",label:"Divine Magic — choose your affinity",optCol:0,detailCol:1,detailLabel:"Bonus spell"},
    {className:"Rogue",sub:"Scion of the Three",feature:"Dread Allegiance",label:"Dread Allegiance — choose your god",optCol:0,detailCol:1,detailLabel:"Damage resistance"}
  ];
  function tableChoiceCfg(className,subShort,featName){
    for(var i=0;i<TABLE_CHOICES.length;i++){var c=TABLE_CHOICES[i];
      if(c.className===className&&c.sub===subShort&&c.feature===featName)return c;}
    return null;
  }
  var ALL=window.CC_CLASSES||[];
  function $(id){return document.getElementById(id);}
  function editionLabel(ed){return ed==="one"?"2024 Revised Rules":"2014 Core Rules";}
  function autoHp(faces,level){if(!faces||!level)return null;return faces+(level-1)*(Math.floor(faces/2)+1);}
  function classesForEdition(ed){return ALL.filter(function(c){return c.edition===ed&&c.isCore;}).sort(function(a,b){return a.name.localeCompare(b.name);});}

  /* ---------- entry / tag renderer ---------- */
  function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
  function atkText(code){var m={"mw":"Melee Weapon Attack:","rw":"Ranged Weapon Attack:","mw,rw":"Melee or Ranged Weapon Attack:","ms":"Melee Spell Attack:","rs":"Ranged Spell Attack:","ms,rs":"Melee or Ranged Spell Attack:"};return m[code]||"Attack:";}
  function tagHtml(tag,content){
    var p=content.split("|"),txt;
    switch(tag){
      case"b":case"bold":return"<strong>"+p[0]+"</strong>";
      case"i":case"italic":case"nsw":return"<em>"+p[0]+"</em>";
      case"u":return"<u>"+p[0]+"</u>";
      case"s":case"strike":return"<s>"+p[0]+"</s>";
      case"note":return'<span class="tag-note">'+p[0]+"</span>";
      case"h":return"<strong>Hit:</strong> ";
      case"dc":return'<span class="tag-roll">DC '+p[0]+"</span>";
      case"damage":case"scaledamage":
        txt=(p[1]&&p[1]!=="")?p[1]:p[0];return'<span class="tag-dmg">'+txt+"</span>";
      case"dice":case"scaledice":case"d20":case"hit":
        txt=(p[1]&&p[1]!=="")?p[1]:p[0];return'<span class="tag-roll">'+txt+"</span>";
      case"chance":return'<span class="tag-roll">'+p[0]+" percent</span>";
      case"recharge":return"(Recharge "+(p[0]||"6")+")";
      case"atk":return"<em>"+atkText(p[0])+"</em> ";
      case"filter":case"book":case"quickref":case"adventure":case"footnote":case"area":
        return'<span class="tag-link">'+p[0]+"</span>";
      case"deity":  // name|pantheon|source|display — display is 4th, not 3rd
        txt=(p[3]&&p[3]!=="")?p[3]:p[0];return'<span class="tag-link">'+txt+"</span>";
      default:
        txt=(p.length>=3&&p[2])?p[2]:p[0];return'<span class="tag-link">'+txt+"</span>";
    }
  }
  function renderTags(s){
    s=esc(s);
    var re=/\{@(\w+)\s*([^{}]*)\}/,m,guard=0;
    while((m=re.exec(s))&&guard++<800){
      var html=tagHtml(m[1],(m[2]||"").trim());
      s=s.slice(0,m.index)+html+s.slice(m.index+m[0].length);
    }
    return s;
  }
  function renderEntry(e){
    if(e==null)return"";
    if(typeof e==="string")return"<p>"+renderTags(e)+"</p>";
    var t=e.type;
    if(t==="entries"||t==="section"||t===undefined){
      var lead=e.name?'<span class="sub-h">'+esc(e.name)+".</span> ":"";
      var inner=(e.entries||[]).map(renderEntry).join("");
      if(e.name&&inner.indexOf("<p>")===0)inner=inner.replace("<p>","<p>"+lead),lead="";
      return (lead?"<p>"+lead+"</p>":"")+inner;
    }
    if(t==="list"){
      return "<ul>"+(e.items||[]).map(function(it){return "<li>"+renderInline(it)+"</li>";}).join("")+"</ul>";
    }
    if(t==="item"){
      var nm=e.name?'<span class="sub-h">'+esc(e.name)+"</span> ":"";
      var body=(e.entries||e.entry?[].concat(e.entry||e.entries):[]).map(renderInline).join(" ");
      return nm+body;
    }
    if(t==="table"){
      var head=(e.colLabels||[]).map(function(c){return "<th>"+renderTags(c)+"</th>";}).join("");
      var rows=(e.rows||[]).map(function(r){
        return "<tr>"+r.map(function(c){return "<td>"+renderInline(c)+"</td>";}).join("")+"</tr>";
      }).join("");
      var cap=e.caption?"<caption style='text-align:left;font-weight:700;margin-bottom:4px'>"+esc(e.caption)+"</caption>":"";
      return "<table class='ent'>"+cap+(head?"<thead><tr>"+head+"</tr></thead>":"")+"<tbody>"+rows+"</tbody></table>";
    }
    if(t==="inset"||t==="insetReadaloud"){
      var n=e.name?"<p><strong>"+esc(e.name)+"</strong></p>":"";
      return "<div class='inset'>"+n+(e.entries||[]).map(renderEntry).join("")+"</div>";
    }
    if(t==="quote"){return "<blockquote class='ent'>"+(e.entries||[]).map(renderEntry).join("")+"</blockquote>";}
    if(t==="options"){
      var note=e.count?"<p class='tag-note'>Choose "+e.count+".</p>":"";
      return note+(e.entries||[]).map(renderEntry).join("");
    }
    if(t==="abilityDc"){
      return "<p><strong>Spell save DC</strong> = 8 + your proficiency bonus + your "+((e.attributes||[]).join(" or ")||"spellcasting ability")+" modifier</p>";
    }
    if(t==="refClassFeature"||t==="refSubclassFeature"){
      var key=e.classFeature||e.subclassFeature;
      var ref=state.fdata&&state.fdata.refLookup?state.fdata.refLookup[key]:null;
      if(!ref)return "";
      var h=ref.name?"<p><span class='sub-h'>"+esc(ref.name)+"</span></p>":"";
      return h+(ref.entries||[]).map(renderEntry).join("");
    }
    if(e.entries)return (e.entries||[]).map(renderEntry).join("");
    return "";
  }
  function renderInline(x){
    if(typeof x==="string")return renderTags(x);
    return renderEntry(x).replace(/^<p>/,"").replace(/<\/p>$/,"");
  }

  /* ---------- screens ---------- */
  function showEdition(){$("screen-build").classList.add("hidden");$("screen-edition").classList.remove("hidden");}
  function setStep(step){
    $("step-class").classList.toggle("hidden",step!=="class");
    $("step-background").classList.toggle("hidden",step!=="background");
    $("step-species").classList.toggle("hidden",step!=="species");
    $("step-abilities").classList.toggle("hidden",step!=="abilities");
    $("step-equipment").classList.toggle("hidden",step!=="equipment");
    $("step-spells").classList.toggle("hidden",step!=="spells");
    $("step-sheet").classList.toggle("hidden",step!=="sheet");
    Array.prototype.forEach.call(document.querySelectorAll(".step"),function(b){b.classList.toggle("active",b.getAttribute("data-step")===step);});
    var labels={"class":"1 · Class & Features",background:"2 · Background & Details",species:"3 · Species",abilities:"4 · Ability Scores",equipment:"5 · Equipment",spells:"6 · Spells",sheet:"7 · Character Sheet"};
    var mb=$("menuBtn");if(mb)mb.innerHTML="☰";
    var sm=$("stepsMenu");if(sm)sm.classList.remove("open");
    var dk=$("darkToggle");if(dk){dk.classList.toggle("hidden",step!=="sheet");dk.innerHTML=state.sheet.dark?"☀":"🌙";}
    document.body.classList.toggle("dark",step==="sheet"&&!!state.sheet.dark);
    var wrap=document.querySelector(".wrap");if(wrap)wrap.classList.toggle("wide",step==="sheet");
    render();               // always refresh the page we're navigating to with the latest state
    window.scrollTo(0,0);
  }
  function showBuild(step){$("screen-edition").classList.add("hidden");$("screen-build").classList.remove("hidden");setStep(step||"class");}

  function populateClasses(){
    var sel=$("classSelect");sel.innerHTML='<option value="">— Choose a class —</option>';
    classesForEdition(state.edition).forEach(function(c){
      var o=document.createElement("option");o.value=c.slug;o.textContent=c.name;sel.appendChild(o);
    });
  }
  function populateLevels(){
    var sel=$("levelSelect");sel.innerHTML="";
    for(var i=1;i<=20;i++){var o=document.createElement("option");o.value=i;o.textContent=i;sel.appendChild(o);}
    sel.value=state.level;
  }
  function populateBackgrounds(){
    var sel=$("bgSelect");
    var list=(window.CC_BACKGROUNDS&&window.CC_BACKGROUNDS[state.edition])||[];
    var core=state.edition==="one"?"XPHB":"PHB";
    var coreList=list.filter(function(b){return b.source===core;});
    var expList=list.filter(function(b){return b.source!==core;});
    function opt(b){return '<option value="'+esc(b.name+"|"+b.source)+'" title="'+esc(sourceName(b.source))+'">'+esc(b.name+(b.source!==core?" ("+b.source+")":""))+"</option>";}
    var html='<option value="">— Choose a background —</option><option value="custom">✎ Custom Background (write your own)…</option>';
    if(coreList.length)html+='<optgroup label="Core">'+coreList.map(opt).join("")+"</optgroup>";
    if(expList.length)html+='<optgroup label="Expanded">'+expList.map(opt).join("")+"</optgroup>";
    sel.innerHTML=html;
    sel.value=state.bgIsCustom?"custom":(state.background?state.background.name+"|"+state.background.source:"");
  }
  function populateRaces(){
    var sel=$("raceSelect");
    var list=(window.CC_RACES&&window.CC_RACES[state.edition])||[];
    var coreList=list.filter(function(r){return r.isCore;});
    var expList=list.filter(function(r){return !r.isCore;});
    function opt(r){var a=abilShort(r.ability);return '<option value="'+esc(r.name+"|"+r.source)+'" title="'+esc(sourceName(r.source))+'">'+esc(r.name+(!r.isCore?" ("+r.source+")":"")+(a?" ["+a+"]":""))+"</option>";}
    var html='<option value="">— Choose a species —</option>';
    if(coreList.length)html+='<optgroup label="Core">'+coreList.map(opt).join("")+"</optgroup>";
    if(expList.length)html+='<optgroup label="Expanded">'+expList.map(opt).join("")+"</optgroup>";
    sel.innerHTML=html;
    sel.value=state.race?state.race.name+"|"+state.race.source:"";
  }

  function loadFeatureData(slug,cb){
    window.CC_FEATURE_DATA=window.CC_FEATURE_DATA||{};
    if(window.CC_FEATURE_DATA[slug])return cb(window.CC_FEATURE_DATA[slug]);
    var s=document.createElement("script");
    s.src="resources/features/"+slug+".js";
    s.onload=function(){cb(window.CC_FEATURE_DATA[slug]);};
    s.onerror=function(){cb(null);};
    document.head.appendChild(s);
  }

  /* ---------- render ---------- */
  function render(){
    var hasClass=!!state.className;
    var cp=$("charPortrait");if(cp)cp.innerHTML=state.portrait?'<img src="'+state.portrait+'">':"&#9670;";
    $("classCard").classList.toggle("hidden",!hasClass);
    $("noClassMsg").classList.toggle("hidden",hasClass);
    $("featuresWrap").classList.toggle("hidden",!hasClass);
    if(hasClass){
      $("ccName").textContent=state.className;
      $("ccSub").innerHTML=srcTag(state.source)+" • d"+state.hdFaces+" hit die";
      $("classEmblem").textContent=state.className.charAt(0);
    }
    $("lvlDisplay").textContent=state.level;
    var auto=autoHp(state.hdFaces,state.level);
    var shown=(state.manualHp!=null)?state.manualHp:auto;
    $("hpDisplay").textContent=(shown!=null)?shown:"—";
    $("hdDisplay").textContent=state.hdFaces?(state.level+"d"+state.hdFaces):"—";
    var note=$("hpNote");
    if(!hasClass)note.textContent="";
    else if(state.manualHp!=null)note.textContent="Manual HP set. (Auto would be "+auto+".)";
    else note.textContent="Auto HP shown without a Constitution modifier — that comes in a later step. Use Manage HP to override.";
    if(hasClass&&state.fdata)renderFeatures();
    renderBackground();
    renderDetails();
    renderRace();
    renderAbilities();
    renderEquipment();
    renderSpells();
    renderSheet();
  }

  function progAt(p,level){var best=0,bestL=-1;for(var k in p){var l=+k;if(l<=level&&l>bestL){bestL=l;best=p[k];}}return best;}
  function groupFilled(groupKey,count){var n=0;for(var i=0;i<count;i++){if(state.choices[groupKey+":"+i])n++;}return n;}
  function bgFilled(groupKey,count){var n=0;for(var i=0;i<count;i++){if(state.bgChoices[groupKey+":"+i])n++;}return n;}

  function validChoiceKeys(){
    var fd=state.fdata,lvl=state.level,keys={};
    if(!fd)return keys;
    var chosen=state.subclassName?fd.subclasses.filter(function(s){return s.name===state.subclassName;})[0]:null;
    var progMap=optProgMap(fd,chosen);
    var sk=fd.proficiencies&&fd.proficiencies.skills;
    if(sk){for(var i=0;i<sk.count;i++)keys["skill:"+i]=1;}
    var feats=fd.classFeatures.slice();
    if(chosen)feats=feats.concat(chosen.features);
    var seen={};
    feats.forEach(function(f){
      if(f.level>lvl)return;
      if(f.name==="Ability Score Improvement"){
        ["mode","feat","dist","a0","a1"].forEach(function(s){keys["asi:"+f.level+":"+s]=1;});
        return;
      }
      var isChoice=(progMap[f.name]||fd.inlineChoiceCount[f.name])&&(fd.optionLists[f.name]&&fd.optionLists[f.name].length);
      if(isChoice&&!seen[f.name]){
        seen[f.name]=1;
        var count=progMap[f.name]?progAt(progMap[f.name].progression,lvl):fd.inlineChoiceCount[f.name];
        for(var i=0;i<count;i++)keys[f.name+":"+i]=1;
      }
    });
    if(chosen)chosen.features.forEach(function(f){
      if(f.level<=lvl&&tableChoiceCfg(fd.name,chosen.shortName,f.name))keys["tbl:"+f.name+":0"]=1;
    });
    return keys;
  }

  // drop class choices (and subclass) no longer valid at the current level. Background choices live in state.bgChoices and are untouched here.
  function pruneChoices(){
    var fd=state.fdata;if(!fd)return;
    var gains=fd.classFeatures.filter(function(f){return f.gainSubclassFeature;}).map(function(f){return f.level;});
    var subLvl=gains.length?Math.min.apply(null,gains):null;
    if(subLvl&&state.level<subLvl)state.subclassName=null;
    var valid=validChoiceKeys();
    for(var k in state.choices){if(!valid[k])delete state.choices[k];}
  }

  function optProgMap(fd,chosen){
    var m={};
    (fd.optProgression||[]).forEach(function(p){m[p.name]=p;});
    if(chosen)(chosen.optProgression||[]).forEach(function(p){m[p.name]=p;});
    return m;
  }

  function choiceSelectsHtml(groupKey,pool,count,label){
    var fd=state.fdata;
    var chosen=[];for(var i=0;i<count;i++)chosen.push(state.choices[groupKey+":"+i]||"");
    var picked=chosen.filter(Boolean).length;
    var head='<div class="origin-picker"><label>'+esc(label)+' ('+picked+'/'+count+')'+
      (picked<count?'<span class="need-choice">choose '+(count-picked)+' more</span>':'')+'</label>';
    var body="";
    for(var i=0;i<count;i++){
      var others=chosen.filter(function(v,idx){return idx!==i&&v;});
      var opts='<option value="">— Choose —</option>'+pool.map(function(o){
        var val=o.name,dis=others.indexOf(val)>=0?" disabled":"",sel=chosen[i]===val?" selected":"";
        var lbl=o.name+(o.source&&fd&&o.source!==fd.source?" ("+o.source+")":"")+(o.prerequisite?" — "+o.prerequisite:"");
        return '<option value="'+esc(val)+'"'+dis+sel+(o.source?' title="'+esc(sourceName(o.source))+'"':"")+'>'+esc(lbl)+"</option>";
      }).join("");
      body+='<select class="choice-sel" data-group="'+esc(groupKey)+'" data-idx="'+i+'">'+opts+"</select>";
      if(chosen[i]){
        var o=pool.filter(function(x){return x.name===chosen[i];})[0];
        if(o&&o.entries&&o.entries.length)body+='<div class="choice-desc">'+o.entries.map(renderEntry).join("")+"</div>";
      }
    }
    return head+body+"</div>";
  }

  function featByName(nm){
    if(!nm)return null;
    var L=window.CC_FEATS||[];
    for(var i=0;i<L.length;i++)if(L[i].name===nm&&L[i].edition===state.edition)return L[i];
    for(var j=0;j<L.length;j++)if(L[j].name===nm)return L[j];
    return null;
  }
  // ability increases granted by the feat taken at an ASI level
  function featAsiPicks(level){
    var ft=featByName(state.choices["asi:"+level+":feat"]);
    if(!ft||!ft.ability)return [];
    var out=[],k;
    for(k in ft.ability.fixed)out.push({ability:k,amount:ft.ability.fixed[k],from:ft.name});
    var ch=ft.ability.choose;
    if(ch)for(var i=0;i<ch.count;i++){
      var a=state.choices["asi:"+level+":featab"+i];
      if(a)out.push({ability:a,amount:ch.amount,from:ft.name});
    }
    return out;
  }
  function featAsiPending(level){
    var ft=featByName(state.choices["asi:"+level+":feat"]);
    if(!ft||!ft.ability||!ft.ability.choose)return false;
    for(var i=0;i<ft.ability.choose.count;i++)if(!state.choices["asi:"+level+":featab"+i])return true;
    return false;
  }
  function featAsiHtml(level){
    var ft=featByName(state.choices["asi:"+level+":feat"]);
    if(!ft||!ft.ability)return "";
    var html="",k,fixedTxt=[];
    for(k in ft.ability.fixed)fixedTxt.push(k+" +"+ft.ability.fixed[k]);
    if(fixedTxt.length)html+='<div class="choice-desc">Grants '+esc(fixedTxt.join(", "))+".</div>";
    var ch=ft.ability.choose;
    if(ch){
      for(var i=0;i<ch.count;i++){
        var cur=state.choices["asi:"+level+":featab"+i]||"",others=[];
        for(var j=0;j<ch.count;j++){if(j!==i){var v=state.choices["asi:"+level+":featab"+j];if(v)others.push(v);}}
        html+='<div class="asi-row"><select class="asi-featab" data-level="'+level+'" data-idx="'+i+'">'+
          '<option value="">— '+esc(ft.name)+": +"+ch.amount+' to which ability? —</option>'+
          ch.from.map(function(a){
            return '<option value="'+a+'"'+(others.indexOf(a)>=0?" disabled":"")+(cur===a?" selected":"")+">"+a+" +"+ch.amount+"</option>";
          }).join("")+"</select></div>";
      }
      if(ft.ability.max)html+='<div class="choice-desc tag-note">This can raise the score to a maximum of '+ft.ability.max+".</div>";
    }
    return html;
  }
  function asiResolved(level){
    var mode=state.choices["asi:"+level+":mode"];
    if(!mode)return false;
    if(mode==="feat")return !!state.choices["asi:"+level+":feat"]&&!featAsiPending(level);
    var dist=state.choices["asi:"+level+":dist"]||"2",n=dist==="11"?2:1;
    for(var i=0;i<n;i++){if(!state.choices["asi:"+level+":a"+i])return false;}
    return true;
  }

  function asiChoiceHtml(level){
    var modeKey="asi:"+level+":mode",featKey="asi:"+level+":feat",distKey="asi:"+level+":dist";
    var mode=state.choices[modeKey]||"";
    var html='<div class="origin-picker"><label>At '+ordinal(level)+' level, choose one</label>'+
      '<select class="asi-mode" data-level="'+level+'">'+
      '<option value="">— Choose —</option>'+
      '<option value="asi"'+(mode==="asi"?" selected":"")+'>Ability Score Improvement</option>'+
      '<option value="feat"'+(mode==="feat"?" selected":"")+'>Feat</option></select>';
    if(mode==="asi"){
      var dist=state.choices[distKey]||"2",n=dist==="11"?2:1,inc=dist==="11"?"+1":"+2";
      html+='<div class="asi-row"><select class="asi-dist" data-level="'+level+'">'+
        '<option value="2"'+(dist==="2"?" selected":"")+'>+2 to one ability</option>'+
        '<option value="11"'+(dist==="11"?" selected":"")+'>+1 to two abilities</option></select></div>';
      for(var i=0;i<n;i++){
        var cur=state.choices["asi:"+level+":a"+i]||"",others=[];
        for(var j=0;j<n;j++){if(j!==i){var v=state.choices["asi:"+level+":a"+j];if(v)others.push(v);}}
        var opts='<option value="">— Ability —</option>'+ABILITIES.map(function(a){
          var dis=others.indexOf(a)>=0?" disabled":"",sel=cur===a?" selected":"";
          return '<option value="'+a+'"'+dis+sel+'>'+a+" "+inc+"</option>";
        }).join("");
        html+='<div class="asi-row"><select class="asi-abil" data-level="'+level+'" data-idx="'+i+'">'+opts+"</select></div>";
      }
      html+='<div class="choice-desc tag-note">Final ability totals are applied in the Ability Scores step (coming later); here you pick which scores get the bump.</div>';
    }else if(mode==="feat"){
      var feats=(window.CC_FEATS||[]).filter(function(ft){return ft.edition===state.edition&&ft.category!=="Origin";});
      var chosen=state.choices[featKey]||"";
      html+='<select class="asi-feat" data-level="'+level+'"><option value="">— Choose a feat —</option>'+
        feats.map(function(ft){
          var lbl=ft.name+(ft.category&&ft.category!=="General"?" ["+ft.category+"]":"")+(ft.prereq?" — "+ft.prereq:"");
          return '<option value="'+esc(ft.name)+'"'+(chosen===ft.name?" selected":"")+'>'+esc(lbl)+"</option>";
        }).join("")+"</select>";
      if(chosen){
        var ft=feats.filter(function(x){return x.name===chosen;})[0];
        html+=featAsiHtml(level);
        if(ft)html+='<div class="choice-desc">'+(ft.prereq?"<p class='tag-note'>Prerequisite (not enforced yet): "+esc(ft.prereq)+"</p>":"")+(ft.entries||[]).map(renderEntry).join("")+"</div>";
      }
    }
    return html+"</div>";
  }

  function plainTags(s){return renderTags(String(s)).replace(/<[^>]+>/g,"");}
  function tableChoiceHtml(f,cfg){
    var tbl=null;
    (f.entries||[]).forEach(function(e){if(!tbl&&e&&typeof e==="object"&&e.type==="table"&&(!cfg.caption||e.caption===cfg.caption))tbl=e;});
    if(!tbl)(f.entries||[]).forEach(function(e){if(!tbl&&e&&typeof e==="object"&&e.type==="table")tbl=e;});
    if(!tbl)return {html:"",choicesN:0,pending:false};
    var key="tbl:"+f.name,cur=state.choices[key+":0"]||"";
    var opts='<option value="">— Choose —</option>'+tbl.rows.map(function(r){
      var val=plainTags(r[cfg.optCol]),det=cfg.detailCol!=null?plainTags(r[cfg.detailCol]):"",sel=cur===val?" selected":"";
      return '<option value="'+esc(val)+'"'+sel+'>'+esc(val+(det?" — "+det:""))+"</option>";
    }).join("");
    var html='<div class="origin-picker"><label>'+esc(cfg.label)+'</label>'+
      '<select class="tbl-sel" data-key="'+esc(key)+'">'+opts+"</select>";
    if(cur&&cfg.detailCol!=null){
      var row=null;tbl.rows.forEach(function(r){if(plainTags(r[cfg.optCol])===cur)row=r;});
      if(row)html+='<div class="choice-desc">'+esc(cfg.detailLabel||"Detail")+": <b>"+esc(plainTags(row[cfg.detailCol]))+"</b></div>";
    }
    return {html:html+"</div>",choicesN:1,pending:!cur};
  }

  function panelHtml(name,levelLabel,choicesN,badge,body,key,pending){
    if(state.openPanels[key]===undefined)state.openPanels[key]=(pending||name==="Hit Points");
    var open=state.openPanels[key];
    var sub=(choicesN>0?(choicesN+" Choice"+(choicesN>1?"s":"")+" • "):"")+levelLabel;
    var dot=pending?'<span class="fx-dot">!</span>':"";
    return '<div class="feature'+(open?"":" collapsed")+(pending?" needs":"")+'" data-key="'+esc(key)+'">'+
      '<div class="fx-head">'+dot+'<span class="fx-name">'+esc(name)+'</span>'+
      '<span class="fx-choices">'+sub+'</span>'+(badge||"")+
      '<span class="chev">▾</span></div><div class="fx-body">'+body+'</div></div>';
  }

  function hitPointsBody(fd){
    var f=fd.hdFaces,cn=fd.name,avg=Math.floor(f/2)+1;
    return "<p class='prof-line'><b>Hit Dice:</b> 1d"+f+" per "+cn+" level</p>"+
      "<p class='prof-line'><b>Hit Points at 1st Level:</b> "+f+" + your Constitution modifier</p>"+
      "<p class='prof-line'><b>Hit Points at Higher Levels:</b> 1d"+f+" (or "+avg+") + your Constitution modifier per "+cn+" level after 1st</p>";
  }
  function proficienciesBody(fd){
    var p=fd.proficiencies||{};
    var h="<p class='prof-line'><b>Armor:</b> "+renderTags(p.armor||"None")+"</p>"+
      "<p class='prof-line'><b>Weapons:</b> "+renderTags(p.weapons||"None")+"</p>"+
      "<p class='prof-line'><b>Tools:</b> "+renderTags(p.tools||"None")+"</p>"+
      "<p class='prof-line'><b>Saving Throws:</b> "+esc(p.savingThrows||"None")+"</p>";
    if(p.skills){
      h+="<p class='prof-line'><b>Skills:</b> Choose "+p.skills.count+" from "+p.skills.from.join(", ")+"</p>";
      var pool=p.skills.from.map(function(s){return {name:s,source:fd.source,entries:[]};});
      h+=choiceSelectsHtml("skill",pool,p.skills.count,"Skill proficiencies");
    }else{
      h+="<p class='prof-line'><b>Skills:</b> None</p>";
    }
    return h;
  }

  /* ---------- skill proficiencies granted by a feature ----------
     e.g. Primal Knowledge: "proficiency in one skill of your choice from the list of
     skills available to barbarians at 1st level", and again at 10th level. */
  var NUMWORD={a:1,one:1,two:2,three:3};
  function featureSkillChoice(f){
    var txt=entryText(f.entries||"");
    var m=/proficiency (?:in|with) (a|one|two|three) (?:skill|of the following skills)/i.exec(txt);
    if(!m)return null;
    var count=NUMWORD[m[1].toLowerCase()]||1;
    var again=/again at (\d+)(?:st|nd|rd|th) level/i.exec(txt);
    if(again&&state.level>=parseInt(again[1],10))count+=1;
    var pool=ALL_SKILLS,fd=state.fdata;
    if(/list of skills available to/i.test(txt)&&fd&&fd.proficiencies&&fd.proficiencies.skills){
      pool=fd.proficiencies.skills.from;
    }else{
      var listed=[];
      for(var i=0;i<ALL_SKILLS.length;i++){
        if(txt.toLowerCase().indexOf(ALL_SKILLS[i].toLowerCase())>=0)listed.push(ALL_SKILLS[i]);
      }
      if(listed.length>=2)pool=listed;
    }
    return {count:count,pool:pool,key:"featskill:"+f.name};
  }
  function featureSkillPicks(){
    var out=[],seen={};
    featuresAndTraits().forEach(function(f){
      if(seen[f.name])return;
      var c=featureSkillChoice(f);if(!c)return;
      seen[f.name]=1;
      for(var i=0;i<c.count;i++){var v=state.choices[c.key+":"+i];if(v)out.push(v);}
    });
    return out;
  }
  function featureSkillHtml(f){
    var c=featureSkillChoice(f);
    if(!c)return {html:"",count:0,pending:false};
    var picked=0,html='<div class="origin-picker"><label>Skill proficiency from '+esc(f.name)+"</label>";
    for(var i=0;i<c.count;i++){
      var cur=state.choices[c.key+":"+i]||"";if(cur)picked++;
      var others=[];
      for(var j=0;j<c.count;j++){if(j!==i){var v=state.choices[c.key+":"+j];if(v)others.push(v);}}
      html+='<select class="feat-skill" data-key="'+esc(c.key)+'" data-idx="'+i+'"><option value="">- Choose a skill -</option>'+
        c.pool.map(function(s){
          return '<option value="'+esc(s)+'"'+(others.indexOf(s)>=0?" disabled":"")+(cur===s?" selected":"")+">"+esc(s)+"</option>";
        }).join("")+"</select>";
    }
    return {html:html+"</div>",count:c.count,pending:picked<c.count};
  }

  function stripOptions(entries){return (entries||[]).filter(function(e){return !(e&&typeof e==="object"&&e.type==="options");});}

  function renderFeatures(){
    var fd=state.fdata,lvl=state.level;
    var chosen=state.subclassName?fd.subclasses.filter(function(s){return s.name===state.subclassName;})[0]:null;
    var progMap=optProgMap(fd,chosen);

    var list=[];
    fd.classFeatures.forEach(function(f){list.push({level:f.level,name:f.name,entries:f.entries,optional:f.optional,gain:f.gainSubclassFeature,isSub:false,source:f.source});});
    if(chosen)chosen.features.forEach(function(f){list.push({level:f.level,name:f.name,entries:f.entries,isSub:true,source:chosen.source});});

    var shown=list.filter(function(f){return f.level<=lvl;}).sort(function(a,b){return a.level-b.level||(a.isSub?1:0)-(b.isSub?1:0);});
    var higher=list.filter(function(f){return f.level>lvl;}).length;

    var gainLevels=fd.classFeatures.filter(function(f){return f.gainSubclassFeature;}).map(function(f){return f.level;});
    var subChoiceLevel=gainLevels.length?Math.min.apply(null,gainLevels):null;

    var panels=[];
    panels.push(panelHtml("Hit Points","1st level",0,"",hitPointsBody(fd),"Hit Points@1",false));
    var sk=fd.proficiencies&&fd.proficiencies.skills;
    var skN=sk?sk.count:0,skPending=sk?(groupFilled("skill",sk.count)<sk.count):false;
    panels.push(panelHtml("Proficiencies","1st level",skN,"",proficienciesBody(fd),"Proficiencies@1",skPending));

    var seenChoice={},pickerShown=false;
    shown.forEach(function(f){
      var levelLabel=ordinal(f.level)+" level",key=f.name+"@"+f.level+(f.isSub?":s":"");
      var enabled=optEnabled(f);
      var badge=f.optional
        ?'<span class="badge" title="Optional feature from '+esc(sourceName(f.source))+'">OPTIONAL &#183; '+esc(f.source)+'</span>'
        :(f.isSub?'<span class="badge sub" title="'+esc(state.subclassName)+' — from '+esc(sourceName(f.source))+'">'+esc(state.subclassName)+'</span>':"");
      var isASI=(f.name==="Ability Score Improvement");
      var isChoice=!isASI&&(progMap[f.name]||fd.inlineChoiceCount[f.name])&&(fd.optionLists[f.name]&&fd.optionLists[f.name].length);
      var body,choicesN=0,pending=false;
      if(isASI){
        body=(f.entries||[]).map(renderEntry).join("")+asiChoiceHtml(f.level);
        choicesN=1;pending=!asiResolved(f.level);
      }else if(isChoice){
        body=stripOptions(f.entries).map(renderEntry).join("");
        if(!seenChoice[f.name]){
          seenChoice[f.name]=true;
          var count=progMap[f.name]?progAt(progMap[f.name].progression,lvl):fd.inlineChoiceCount[f.name];
          if(count>0){body+=choiceSelectsHtml(f.name,fd.optionLists[f.name],count,f.name);choicesN=count;pending=groupFilled(f.name,count)<count;}
        }
      }else{
        body=(f.entries||[]).map(renderEntry).join("");
        var fsk=featureSkillHtml(f);
        if(fsk.count){body+=fsk.html;choicesN=fsk.count;if(fsk.pending)pending=true;}
        if(f.isSub){
          var tc=tableChoiceCfg(fd.name,chosen&&chosen.shortName,f.name);
          if(tc){var res=tableChoiceHtml(f,tc);body+=res.html;choicesN=res.choicesN;pending=res.pending;}
        }
      }
      if(f.gain&&fd.subclasses.length&&f.level===subChoiceLevel&&!pickerShown){
        pickerShown=true;body+=originPickerHtml(fd);choicesN=1;pending=!state.subclassName;
      }else if(f.gain&&fd.subclasses.length&&!state.subclassName&&f.level>subChoiceLevel){
        body+='<p class="need-choice">Choose your subclass at '+ordinal(subChoiceLevel)+' level (above) to see this feature.</p>';
      }
      if(f.optional){
        body='<label class="opt-toggle"><input type="checkbox" class="opt-chk" data-key="'+esc(optKey(f))+'"'+(enabled?" checked":"")+
             "> Use this optional feature</label>"+(enabled?body:"");
        if(!enabled){choicesN=0;pending=false;}
      }
      panels.push(panelHtml(f.name,levelLabel,choicesN,badge,body,key,pending));
    });

    $("featureList").innerHTML=panels.join("");
    $("higherLevels").textContent=higher?("Available at Higher Levels ("+higher+")"):"";

    wireCollapse($("featureList"));
    var op=$("featureList").querySelector("#originSelect");
    if(op){op.value=state.subclassName||"";
      op.addEventListener("click",function(e){e.stopPropagation();});
      op.addEventListener("change",function(e){state.subclassName=e.target.value||null;pruneChoices();render();});}
    Array.prototype.forEach.call($("featureList").querySelectorAll(".choice-sel"),function(sel){
      sel.addEventListener("click",function(e){e.stopPropagation();});
      sel.addEventListener("change",function(e){state.choices[sel.getAttribute("data-group")+":"+sel.getAttribute("data-idx")]=e.target.value||"";render();});
    });
    Array.prototype.forEach.call($("featureList").querySelectorAll(".asi-mode"),function(sel){
      sel.addEventListener("click",function(e){e.stopPropagation();});
      sel.addEventListener("change",function(e){var lv=sel.getAttribute("data-level");state.choices["asi:"+lv+":mode"]=e.target.value||"";if(e.target.value!=="feat")delete state.choices["asi:"+lv+":feat"];render();});
    });
    Array.prototype.forEach.call($("featureList").querySelectorAll(".asi-feat"),function(sel){
      sel.addEventListener("click",function(e){e.stopPropagation();});
      sel.addEventListener("change",function(e){var lv=sel.getAttribute("data-level");state.choices["asi:"+lv+":feat"]=e.target.value||"";for(var q=0;q<4;q++)delete state.choices["asi:"+lv+":featab"+q];render();});
    });
    Array.prototype.forEach.call($("featureList").querySelectorAll(".opt-chk"),function(cb){
      cb.addEventListener("click",function(e){e.stopPropagation();});
      cb.addEventListener("change",function(){
        var k=cb.getAttribute("data-key");
        if(cb.checked)delete state.choices[k];else state.choices[k]="1";
        render();
      });
    });
    Array.prototype.forEach.call($("featureList").querySelectorAll(".feat-skill"),function(sel){
      sel.addEventListener("click",function(e){e.stopPropagation();});
      sel.addEventListener("change",function(e){
        state.choices[sel.getAttribute("data-key")+":"+sel.getAttribute("data-idx")]=e.target.value||"";
        render();
      });
    });
    Array.prototype.forEach.call($("featureList").querySelectorAll(".asi-featab"),function(sel){
      sel.addEventListener("click",function(e){e.stopPropagation();});
      sel.addEventListener("change",function(e){
        state.choices["asi:"+sel.getAttribute("data-level")+":featab"+sel.getAttribute("data-idx")]=e.target.value||"";
        render();
      });
    });
    Array.prototype.forEach.call($("featureList").querySelectorAll(".asi-dist"),function(sel){
      sel.addEventListener("click",function(e){e.stopPropagation();});
      sel.addEventListener("change",function(e){var lv=sel.getAttribute("data-level");state.choices["asi:"+lv+":dist"]=e.target.value||"2";delete state.choices["asi:"+lv+":a0"];delete state.choices["asi:"+lv+":a1"];render();});
    });
    Array.prototype.forEach.call($("featureList").querySelectorAll(".asi-abil"),function(sel){
      sel.addEventListener("click",function(e){e.stopPropagation();});
      sel.addEventListener("change",function(e){state.choices["asi:"+sel.getAttribute("data-level")+":a"+sel.getAttribute("data-idx")]=e.target.value||"";render();});
    });
    Array.prototype.forEach.call($("featureList").querySelectorAll(".tbl-sel"),function(sel){
      sel.addEventListener("click",function(e){e.stopPropagation();});
      sel.addEventListener("change",function(e){state.choices[sel.getAttribute("data-key")+":0"]=e.target.value||"";render();});
    });
  }

  // shared collapse wiring (persists open/closed state)
  function wireCollapse(container){
    Array.prototype.forEach.call(container.querySelectorAll(".fx-head"),function(h){
      h.addEventListener("click",function(){
        var panel=h.parentNode,k=panel.getAttribute("data-key");
        panel.classList.toggle("collapsed");
        state.openPanels[k]=!panel.classList.contains("collapsed");
      });
    });
  }

  function originPickerHtml(fd){
    var opts='<option value="">— Choose —</option>'+fd.subclasses.map(function(s){
      var lbl=s.name+(s.source!==fd.source?" ("+s.source+")":"");
      return '<option value="'+esc(s.name)+'" title="'+esc(sourceName(s.source))+'">'+esc(lbl)+"</option>";
    }).join("");
    return '<div class="origin-picker"><label>Choose your subclass</label><select id="originSelect">'+opts+"</select></div>";
  }

  /* ---------- background ---------- */
  function currentBg(){
    if(!state.background)return null;
    var list=(window.CC_BACKGROUNDS&&window.CC_BACKGROUNDS[state.edition])||[];
    return list.filter(function(b){return b.name===state.background.name&&b.source===state.background.source;})[0]||null;
  }
  // languages, alphabetical, tagged with type; value stays the bare name
  function langPool(){
    var out=[];
    STD_LANGS.forEach(function(l){out.push({val:l,label:l+" (Standard)"});});
    EXOTIC_LANGS.forEach(function(l){out.push({val:l,label:l+" (Exotic)"});});
    out.sort(function(a,b){return a.val.localeCompare(b.val);});
    return out;
  }
  // multi-pick dropdowns for background choices (stored in state.bgChoices).
  // pool items may be plain strings or {val,label} objects.
  function bgSelectHtml(group,pool,count,label){
    var chosen=[];for(var i=0;i<count;i++)chosen.push(state.bgChoices[group+":"+i]||"");
    var picked=chosen.filter(Boolean).length;
    var html='<div class="origin-picker"><label>'+esc(label)+' ('+picked+'/'+count+')'+
      (picked<count?'<span class="need-choice">choose '+(count-picked)+' more</span>':'')+'</label>';
    for(var i=0;i<count;i++){
      var others=chosen.filter(function(v,idx){return idx!==i&&v;});
      var opts='<option value="">— Choose —</option>'+pool.map(function(o){
        var val=(typeof o==="string")?o:o.val,lab=(typeof o==="string")?o:o.label;
        var dis=others.indexOf(val)>=0?" disabled":"",sel=chosen[i]===val?" selected":"";
        return '<option value="'+esc(val)+'"'+dis+sel+'>'+esc(lab)+"</option>";
      }).join("");
      html+='<select class="bg-sel" data-group="'+esc(group)+'" data-idx="'+i+'">'+opts+"</select>";
    }
    return html+"</div>";
  }
  function bgProficienciesHtml(b){
    var lines=[],groups=[];
    var sk=b.skills;
    if(sk.fixed.length)lines.push("<b>Skill Proficiencies:</b> "+sk.fixed.join(", "));
    if(sk.choose)groups.push({g:"skillChoose",pool:sk.choose.from,n:sk.choose.count,l:"Skill proficiency"});
    if(sk.any)groups.push({g:"skillAny",pool:ALL_SKILLS.filter(function(x){return sk.fixed.indexOf(x)<0;}),n:sk.any,l:"Skill proficiency (any)"});
    var lg=b.langs;
    if(lg.fixed.length)lines.push("<b>Languages:</b> "+lg.fixed.join(", "));
    if(lg.anyStandard)groups.push({g:"langStd",pool:langPool(),n:lg.anyStandard,l:"Language"});
    if(lg.any)groups.push({g:"langAny",pool:langPool(),n:lg.any,l:"Language (any)"});
    if(lg.choose)groups.push({g:"langChoose",pool:lg.choose.from.slice().sort(),n:lg.choose.count,l:"Language"});
    var tl=b.tools;
    if(tl.fixed.length)lines.push("<b>Tool Proficiencies:</b> "+tl.fixed.join(", "));
    if(tl.any)lines.push("<b>Tool Proficiencies:</b> choose "+tl.any+" (see background text)");
    var html=lines.map(function(x){return '<p class="prof-line">'+x+"</p>";}).join("");
    var pending=false,picks=0;
    groups.forEach(function(gr){html+=bgSelectHtml(gr.g,gr.pool,gr.n,gr.l);picks+=gr.n;if(bgFilled(gr.g,gr.n)<gr.n)pending=true;});
    return {html:html,pending:pending,picks:picks};
  }
  function renderBackground(){
    $("bgCustom").classList.toggle("hidden",!state.bgIsCustom);
    var host=$("bgDetail");
    if(state.bgIsCustom){host.innerHTML="";return;}
    var b=currentBg();
    if(!b){host.innerHTML="";return;}
    var html="";
    if(b.desc)html+='<p class="bg-desc">'+renderTags(b.desc)+"</p>";
    var pr=bgProficienciesHtml(b);
    html+=panelHtml("Background Proficiencies",srcTag(b.source),pr.picks,"",pr.html,"bgprof:"+b.name+b.source,pr.pending);
    if(b.feats&&b.feats.length)html+='<p class="prof-line" style="margin:12px 0"><b>Origin Feat:</b> '+esc(b.feats.join(", "))+"</p>";
    if(b.feature)html+=panelHtml("Feature: "+b.feature.name,"Background feature",0,"",(b.feature.entries||[]).map(renderEntry).join(""),"bgfeat:"+b.name+b.source,false);
    var sc=(b.entries||[]).filter(function(e){return e&&typeof e==="object"&&/suggested characteristics/i.test(e.name||"");})[0];
    if(sc)html+=panelHtml("Suggested Characteristics","",0,"",(sc.entries||[]).map(renderEntry).join(""),"bgsc:"+b.name+b.source,false);
    host.innerHTML=html;
    wireCollapse(host);
    Array.prototype.forEach.call(host.querySelectorAll(".bg-sel"),function(sel){
      sel.addEventListener("click",function(e){e.stopPropagation();});
      sel.addEventListener("change",function(e){state.bgChoices[sel.getAttribute("data-group")+":"+sel.getAttribute("data-idx")]=e.target.value||"";render();});
    });
  }

  /* ---------- character details ---------- */
  function renderDetails(){
    var d=state.details;
    var al='<div><label class="fl">Alignment</label><select class="det-sel" data-k="alignment"><option value="">— Choose an Option —</option>'+
      ALIGNMENTS.map(function(a){return '<option'+(d.alignment===a?" selected":"")+'>'+esc(a)+"</option>";}).join("")+"</select></div>";
    var fa='<div><label class="fl">Faith</label><input type="text" class="det-inp" data-k="faith" value="'+esc(d.faith||"")+'" placeholder="e.g. Torm, the Raven Queen…"></div>';
    var lf='<div><label class="fl">Lifestyle</label><select class="det-sel" data-k="lifestyle"><option value="">— Choose an Option —</option>'+
      LIFESTYLES.map(function(l){return '<option'+(d.lifestyle===l?" selected":"")+'>'+esc(l)+"</option>";}).join("")+"</select></div>";
    $("detailsPanel").innerHTML='<div class="details-grid">'+al+fa+lf+"</div>";
    Array.prototype.forEach.call($("detailsPanel").querySelectorAll(".det-sel"),function(s){
      s.addEventListener("change",function(){state.details[s.getAttribute("data-k")]=s.value;});
    });
    var fi=$("detailsPanel").querySelector(".det-inp");
    if(fi)fi.addEventListener("input",function(){state.details.faith=fi.value;});
  }

  /* ---------- species / race ---------- */
  var ABIL_ABBR={Strength:"Str",Dexterity:"Dex",Constitution:"Con",Intelligence:"Int",Wisdom:"Wis",Charisma:"Cha"};
  function abilShort(ab){
    if(!ab)return "";
    var parts=[];
    for(var k in ab.fixed)parts.push((ABIL_ABBR[k]||k)+" +"+ab.fixed[k]);
    (ab.choose||[]).forEach(function(c){parts.push("+"+c.amount+" to "+c.count+" of choice");});
    return parts.join("; ");
  }
  function combineAbil(base,lin){
    var f={},k;
    for(k in base.fixed)f[k]=base.fixed[k];
    for(k in lin.fixed)f[k]=(f[k]||0)+lin.fixed[k];
    return {fixed:f,choose:base.choose.concat(lin.choose)};
  }
  function currentRace(){
    if(!state.race)return null;
    var list=(window.CC_RACES&&window.CC_RACES[state.edition])||[];
    return list.filter(function(r){return r.name===state.race.name&&r.source===state.race.source;})[0]||null;
  }
  function currentLineage(race){
    if(!race||!state.raceLineage)return null;
    return race.lineages.filter(function(l){return l.name===state.raceLineage;})[0]||null;
  }
  function raceChoiceCount(group,count){var n=0;for(var i=0;i<count;i++)if(state.raceChoices[group+":"+i])n++;return n;}

  /* ---------- custom origin ability increases ----------
     Many 2014-era species (MPMM, MOT, AAG, and PHB Human) carry no fixed ability
     increase: the player allocates them ("Customizing Your Origin"). 2024 species
     get theirs from the background instead, so this only applies to classic. */
  var CUSTOM_ASI_MODES={"2-1":[2,1],"1-1-1":[1,1,1],"all":[1,1,1,1,1,1]};
  function needsCustomAsi(race,lin){
    if(!race||state.edition!=="classic")return false;
    var ab=combineAbil(race.ability,lin?lin.ability:{fixed:{},choose:[]});
    for(var k in ab.fixed)return false;
    return !ab.choose.length;
  }
  function customAsiPicks(){
    var mode=state.raceChoices["race:custom:mode"];
    if(!mode||!CUSTOM_ASI_MODES[mode])return [];
    var w=CUSTOM_ASI_MODES[mode],out=[];
    if(mode==="all"){ABILITIES.forEach(function(a){out.push({ability:a,amount:1});});return out;}
    for(var i=0;i<w.length;i++){
      var a=state.raceChoices["race:custom:a"+i];
      if(a)out.push({ability:a,amount:w[i]});
    }
    return out;
  }
  function customAsiHtml(){
    var mode=state.raceChoices["race:custom:mode"]||"";
    var opts=[["","— Choose an arrangement —"],["2-1","+2 to one ability, +1 to another"],
              ["1-1-1","+1 to three different abilities"],["all","+1 to all six (2014 Human)"]];
    var html='<div class="origin-picker"><label>Ability score increases (custom origin)</label>'+
      '<select class="race-custom-mode">'+opts.map(function(o){
        return '<option value="'+o[0]+'"'+(mode===o[0]?" selected":"")+'>'+esc(o[1])+"</option>";
      }).join("")+"</select>";
    if(mode&&mode!=="all"){
      var w=CUSTOM_ASI_MODES[mode];
      for(var i=0;i<w.length;i++){
        var cur=state.raceChoices["race:custom:a"+i]||"",others=[];
        for(var j=0;j<w.length;j++){if(j!==i){var v=state.raceChoices["race:custom:a"+j];if(v)others.push(v);}}
        html+='<select class="race-custom-abil" data-idx="'+i+'"><option value="">— Ability (+'+w[i]+') —</option>'+
          ABILITIES.map(function(a){
            return '<option value="'+a+'"'+(others.indexOf(a)>=0?" disabled":"")+(cur===a?" selected":"")+">"+a+" +"+w[i]+"</option>";
          }).join("")+"</select>";
      }
    }
    if(mode==="all")html+='<div class="choice-desc">+1 to Strength, Dexterity, Constitution, Intelligence, Wisdom and Charisma.</div>';
    return html+"</div>";
  }
  function customAsiPending(){
    var mode=state.raceChoices["race:custom:mode"];
    if(!mode)return true;
    if(mode==="all")return false;
    var w=CUSTOM_ASI_MODES[mode];
    for(var i=0;i<w.length;i++)if(!state.raceChoices["race:custom:a"+i])return true;
    return false;
  }
  function raceSelectHtml(group,pool,count,label){
    var chosen=[];for(var i=0;i<count;i++)chosen.push(state.raceChoices[group+":"+i]||"");
    var picked=chosen.filter(Boolean).length;
    var html='<div class="origin-picker"><label>'+esc(label)+' ('+picked+'/'+count+')'+
      (picked<count?'<span class="need-choice">choose '+(count-picked)+' more</span>':'')+'</label>';
    for(var i=0;i<count;i++){
      var others=chosen.filter(function(v,idx){return idx!==i&&v;});
      var opts='<option value="">— Choose —</option>'+pool.map(function(o){
        var val=(typeof o==="string")?o:o.val,lab=(typeof o==="string")?o:o.label;
        var dis=others.indexOf(val)>=0?" disabled":"",sel=chosen[i]===val?" selected":"";
        return '<option value="'+esc(val)+'"'+dis+sel+'>'+esc(lab)+"</option>";
      }).join("");
      html+='<select class="race-sel" data-group="'+esc(group)+'" data-idx="'+i+'">'+opts+"</select>";
    }
    return html+"</div>";
  }
  function renderRace(){
    var host=$("raceDetail");
    var race=currentRace();
    if(!race){host.innerHTML="";return;}
    var lin=currentLineage(race);
    function line(l,v){return '<p class="prof-line"><b>'+l+':</b> '+esc(v)+"</p>";}

    // merge grants (base + lineage)
    var fixed={};
    function mergeAb(src){for(var k in src)fixed[k]=(fixed[k]||0)+src[k];}
    mergeAb(race.ability.fixed);if(lin)mergeAb(lin.ability.fixed);
    var chooseList=[];
    race.ability.choose.forEach(function(c){chooseList.push({src:"asi",c:c});});
    if(lin)lin.ability.choose.forEach(function(c){chooseList.push({src:"linasi",c:c});});
    var senses=(lin&&lin.senses&&lin.senses.length)?lin.senses:race.senses;
    var resist=race.resist.concat(lin?lin.resist:[]);
    var skills=race.skills,langs=race.languages;
    var spells=race.spells.concat(lin?lin.spells:[]);
    var spellChoices=race.spellChoices.concat(lin?lin.spellChoices:[]);
    var scAbility=(lin&&lin.scAbility)?lin.scAbility:race.scAbility;
    var traits=race.traits.concat(lin?lin.traits:[]);
    var pending=false;

    var s="";
    s+=line("Size",race.size||"—");
    s+=line("Speed",(lin&&lin.speed?lin.speed:race.speed)||"—");
    s+=line("Senses",senses.join(", ")||"—");
    var asiParts=[];for(var k in fixed)asiParts.push(k+" +"+fixed[k]);
    var custom=needsCustomAsi(race,lin);
    var asiText=(state.edition==="one")?"None from species — your ability increases come from your background (2024 rules)"
               :(custom?"You choose them (custom origin)":(asiParts.join(", ")||"None"));
    s+='<p class="prof-line"><b>Ability Score Increase:</b> '+esc(asiText)+"</p>";
    if(custom){s+=customAsiHtml();if(customAsiPending())pending=true;}
    chooseList.forEach(function(ch,idx){
      var grp="race:"+ch.src+idx;
      s+=raceSelectHtml(grp,ch.c.from,ch.c.count,"Ability increase (+"+ch.c.amount+" to "+ch.c.count+" of your choice)");
      if(raceChoiceCount(grp,ch.c.count)<ch.c.count)pending=true;
    });
    if(resist.length)s+=line("Damage Resistances",resist.join(", "));
    if(race.immune.length)s+=line("Damage Immunities",race.immune.join(", "));
    if(race.weapons.length)s+=line("Weapon Proficiencies",race.weapons.join(", "));
    if(race.armor.length)s+=line("Armor Proficiencies",race.armor.join(", "));
    if(race.tools.length)s+=line("Tool Proficiencies",race.tools.join(", "));
    if(skills.fixed.length)s+=line("Skill Proficiencies",skills.fixed.join(", "));
    if(skills.choose){s+=raceSelectHtml("race:skill",skills.choose.from,skills.choose.count,"Skill proficiency");if(raceChoiceCount("race:skill",skills.choose.count)<skills.choose.count)pending=true;}
    if(skills.any){s+=raceSelectHtml("race:skillany",ALL_SKILLS.filter(function(x){return skills.fixed.indexOf(x)<0;}),skills.any,"Skill proficiency (any)");if(raceChoiceCount("race:skillany",skills.any)<skills.any)pending=true;}
    if(langs.fixed.length)s+=line("Languages",langs.fixed.join(", "));
    if(langs.anyStandard){s+=raceSelectHtml("race:lang",langPool(),langs.anyStandard,"Language");if(raceChoiceCount("race:lang",langs.anyStandard)<langs.anyStandard)pending=true;}
    if(langs.any){s+=raceSelectHtml("race:langany",langPool(),langs.any,"Language (any)");if(raceChoiceCount("race:langany",langs.any)<langs.any)pending=true;}
    if(spells.length)s+=line("Innate / Racial Spells",spells.map(function(sp){return sp.name+(sp.cantrip?" (cantrip)":"");}).join(", "));
    spellChoices.forEach(function(lbl){s+='<p class="prof-line tag-note">Plus choose '+esc(lbl)+" — pickable in the Spells step (coming later).</p>";});
    if(scAbility){s+=raceSelectHtml("race:scability",scAbility,1,"Spellcasting ability for racial spells");if(raceChoiceCount("race:scability",1)<1)pending=true;}

    var html=panelHtml("Species Traits & Grants",srcTag(race.source),0,"",s,"race:summary:"+race.name+race.source,pending);

    if(race.lineages.length){
      var opts='<option value="">— Choose —</option>'+race.lineages.map(function(l){
        var a=abilShort(combineAbil(race.ability,l.ability));
        return '<option value="'+esc(l.name)+'"'+(state.raceLineage===l.name?" selected":"")+' title="'+esc(sourceName(l.source))+'">'+esc(l.name+(a?" ["+a+"]":""))+"</option>";
      }).join("");
      html+=panelHtml("Lineage / Subrace","",1,"",'<div class="origin-picker"><label>Choose your lineage</label><select id="lineageSelect">'+opts+"</select></div>","race:lineage:"+race.name+race.source,!state.raceLineage);
    }
    if(race.ancestry){
      var cur=state.raceChoices["race:ancestry:0"]||"";
      var aopts='<option value="">— Choose —</option>'+race.ancestry.rows.map(function(r){
        return '<option value="'+esc(r.name)+'"'+(cur===r.name?" selected":"")+'>'+esc(r.name+(r.detail?" — "+r.detail:""))+"</option>";
      }).join("");
      var aHtml='<div class="origin-picker"><label>'+esc(race.ancestry.label)+'</label><select class="race-sel" data-group="race:ancestry" data-idx="0">'+aopts+"</select>";
      if(cur){var row=race.ancestry.rows.filter(function(r){return r.name===cur;})[0];if(row)aHtml+='<div class="choice-desc">'+esc(row.detail)+"</div>";}
      html+=panelHtml("Draconic Ancestry","",1,"",aHtml+"</div>","race:ancestry:"+race.name+race.source,!cur);
    }
    traits.forEach(function(t){
      html+=panelHtml(t.name,"",0,"",(t.entries||[]).map(renderEntry).join(""),"racetrait:"+race.name+race.source+t.name,false);
    });

    host.innerHTML=html;
    wireCollapse(host);
    Array.prototype.forEach.call(host.querySelectorAll(".race-sel"),function(sel){
      sel.addEventListener("click",function(e){e.stopPropagation();});
      sel.addEventListener("change",function(e){state.raceChoices[sel.getAttribute("data-group")+":"+sel.getAttribute("data-idx")]=e.target.value||"";render();});
    });
    Array.prototype.forEach.call(host.querySelectorAll(".race-custom-mode"),function(sel){
      sel.addEventListener("click",function(e){e.stopPropagation();});
      sel.addEventListener("change",function(){
        state.raceChoices["race:custom:mode"]=sel.value||"";
        for(var i=0;i<6;i++)delete state.raceChoices["race:custom:a"+i];
        render();
      });
    });
    Array.prototype.forEach.call(host.querySelectorAll(".race-custom-abil"),function(sel){
      sel.addEventListener("click",function(e){e.stopPropagation();});
      sel.addEventListener("change",function(){
        state.raceChoices["race:custom:a"+sel.getAttribute("data-idx")]=sel.value||"";render();
      });
    });
    var ls=host.querySelector("#lineageSelect");
    if(ls){
      ls.addEventListener("click",function(e){e.stopPropagation();});
      ls.addEventListener("change",function(e){
        state.raceLineage=e.target.value||null;
        for(var k in state.raceChoices){if(k.indexOf("race:linasi")===0||k.indexOf("race:scability")===0)delete state.raceChoices[k];}
        render();
      });
    }
  }

  /* ---------- ability scores ---------- */
  var POINT_BUY_COST={8:0,9:1,10:2,11:3,12:4,13:5,14:7,15:9};
  var STANDARD_ARRAY=[15,14,13,12,10,8];
  function rollSix(){
    var out=[];
    for(var i=0;i<6;i++){var r=[];for(var j=0;j<4;j++)r.push(1+Math.floor(Math.random()*6));r.sort(function(a,b){return a-b;});out.push(r[1]+r[2]+r[3]);}
    return out.sort(function(a,b){return b-a;});
  }
  function abMod(score){return Math.floor((score-10)/2);}
  function modStr(m){return (m>=0?"+":"")+m;}
  // aggregate every ability increase the character has earned/chosen so far
  function abilityBonusMap(){
    var map={};ABILITIES.forEach(function(a){map[a]=[];});
    function add(ab,src,amt){if(map[ab]!==undefined&&amt)map[ab].push({src:src,amt:amt});}
    var race=currentRace(),lin=race?currentLineage(race):null;
    if(race){
      for(var k in race.ability.fixed)add(k,race.name,race.ability.fixed[k]);
      if(lin)for(var k2 in lin.ability.fixed)add(k2,lin.name,lin.ability.fixed[k2]);
      var chooseList=[];
      race.ability.choose.forEach(function(c){chooseList.push({label:race.name,src:"asi",c:c});});
      if(lin)lin.ability.choose.forEach(function(c){chooseList.push({label:lin.name,src:"linasi",c:c});});
      chooseList.forEach(function(ch,idx){
        var grp="race:"+ch.src+idx;
        for(var i=0;i<ch.c.count;i++){var ab=state.raceChoices[grp+":"+i];if(ab)add(ab,ch.label,ch.c.amount);}
      });
      customAsiPicks().forEach(function(p){add(p.ability,"Custom origin",p.amount);});
    }
    if(state.fdata){
      state.fdata.classFeatures.forEach(function(f){
        if(f.name!=="Ability Score Improvement"||f.level>state.level)return;
        if(state.choices["asi:"+f.level+":mode"]!=="asi")return;
        var dist=state.choices["asi:"+f.level+":dist"]||"2";
        if(dist==="2"){var a=state.choices["asi:"+f.level+":a0"];if(a)add(a,"ASI (level "+f.level+")",2);}
        else{var a0=state.choices["asi:"+f.level+":a0"],a1=state.choices["asi:"+f.level+":a1"];if(a0)add(a0,"ASI (level "+f.level+")",1);if(a1)add(a1,"ASI (level "+f.level+")",1);}
      });
      // half-feats (Slasher, Resilient, Actor, ...) grant their own increases
      state.fdata.classFeatures.forEach(function(f){
        if(f.name!=="Ability Score Improvement"||f.level>state.level)return;
        if(state.choices["asi:"+f.level+":mode"]!=="feat")return;
        featAsiPicks(f.level).forEach(function(p){add(p.ability,p.from+" (level "+f.level+")",p.amount);});
      });
    }
    return map;
  }
  function pbRemaining(){var u=0;ABILITIES.forEach(function(a){u+=(POINT_BUY_COST[state.abilities.base[a]]||0);});return 27-u;}
  function baseScore(a){var ab=state.abilities;if(ab.method==="pointbuy")return ab.base[a]||8;var v=ab.assign[a];return v?parseInt(v,10):null;}
  function bonusSum(a){return abilityBonusMap()[a].reduce(function(s,b){return s+b.amt;},0);}
  function totalScore(a){
    var ov=state.abilities.override[a];
    if(ov!==undefined&&ov!==""&&ov!==null&&!isNaN(parseInt(ov,10)))return parseInt(ov,10);
    var base=baseScore(a);if(base==null)base=0;
    var other=parseInt(state.abilities.other[a],10)||0;
    return base+bonusSum(a)+other;
  }

  function renderAbilities(){
    var ab=state.abilities;
    $("abilityMethod").value=ab.method;
    var html="";
    if(ab.method==="pointbuy"){
      var rem=pbRemaining();
      html+='<div class="pb-remaining"><div class="lbl">Points Remaining</div><div class="pts">'+rem+' <span style="color:var(--muted);font-size:16px">/ 27</span></div></div>';
      html+='<div class="abil-assign">'+ABILITIES.map(function(a){
        var cur=ab.base[a]||8,opts="";
        for(var v=8;v<=15;v++){var afford=(POINT_BUY_COST[v]-POINT_BUY_COST[cur])<=rem;opts+='<option value="'+v+'"'+(cur===v?" selected":"")+(afford?"":" disabled")+'>'+v+"</option>";}
        return '<div class="abil-col"><div class="an">'+ABIL_ABBR[a]+'</div><select class="pb-sel" data-ab="'+a+'">'+opts+'</select><div class="tot">Total '+totalScore(a)+"</div></div>";
      }).join("")+"</div>";
    }else{
      var pool=ab.method==="standard"?STANDARD_ARRAY.slice():(ab.rolled||[]);
      if(ab.method==="roll"){
        html+='<div class="roll-bar"><button class="btn" id="rollBtn">'+(ab.rolled?"Re-roll":"Roll 4d6 × 6")+"</button>"+
          (ab.rolled?'<span class="roll-pool">Rolled: '+ab.rolled.join(", ")+"</span>":'<span class="sec-note" style="margin:0">Roll six sets of 4d6 (drop lowest), then assign.</span>')+"</div>";
      }
      if(pool.length){
        var counts={};pool.forEach(function(v){counts[v]=(counts[v]||0)+1;});
        html+='<div class="abil-assign">'+ABILITIES.map(function(a){
          var cur=ab.assign[a]||"";
          var usedBy={};ABILITIES.forEach(function(x){if(x!==a&&ab.assign[x])usedBy[ab.assign[x]]=(usedBy[ab.assign[x]]||0)+1;});
          var opts='<option value="">—</option>',seen={};
          pool.forEach(function(v){if(seen[v])return;seen[v]=1;var remain=counts[v]-(usedBy[v]||0);var ok=remain>0||String(cur)===String(v);opts+='<option value="'+v+'"'+(String(cur)===String(v)?" selected":"")+(ok?"":" disabled")+'>'+v+"</option>";});
          return '<div class="abil-col"><div class="an">'+ABIL_ABBR[a]+'</div><select class="arr-sel" data-ab="'+a+'">'+opts+'</select><div class="tot">Total '+totalScore(a)+"</div></div>";
        }).join("")+"</div>";
      }
    }
    $("abilityAssign").innerHTML=html;

    var bmap=abilityBonusMap();
    $("abilityCalc").innerHTML='<div class="calc-grid">'+ABILITIES.map(function(a){
      var base=baseScore(a),bsum=bonusSum(a),tot=totalScore(a),m=abMod(tot);
      var subs=bmap[a].map(function(b){return '<div class="calc-row sub"><span>'+esc(b.src)+'</span><span class="rv">'+modStr(b.amt)+"</span></div>";}).join("");
      var other=(state.abilities.other[a]!=null?state.abilities.other[a]:"");
      var ov=(state.abilities.override[a]!=null?state.abilities.override[a]:"");
      return '<div class="calc-card"><div class="cc-h">'+a+"</div>"+
        '<div class="calc-row hl"><span>Total Score</span><span class="rv">'+tot+"</span></div>"+
        '<div class="calc-row hl"><span>Modifier</span><span class="rv">'+modStr(m)+"</span></div>"+
        '<div class="calc-row calc-sep"><span>Base Score</span><span class="rv">'+(base==null?"—":base)+"</span></div>"+
        '<div class="calc-row"><span>Bonus</span><span class="rv">'+modStr(bsum)+"</span></div>"+subs+
        '<div class="calc-row"><span>Other Modifier</span><input type="number" class="ab-other" data-ab="'+a+'" value="'+esc(other)+'"></div>'+
        '<div class="calc-row"><span>Override Score</span><input type="number" class="ab-override" data-ab="'+a+'" value="'+esc(ov)+'"></div>'+
        "</div>";
    }).join("")+"</div>";

    Array.prototype.forEach.call($("abilityAssign").querySelectorAll(".pb-sel"),function(s){s.addEventListener("change",function(){state.abilities.base[s.getAttribute("data-ab")]=parseInt(s.value,10);renderAbilities();});});
    Array.prototype.forEach.call($("abilityAssign").querySelectorAll(".arr-sel"),function(s){s.addEventListener("change",function(){state.abilities.assign[s.getAttribute("data-ab")]=s.value;renderAbilities();});});
    var rb=$("abilityAssign").querySelector("#rollBtn");
    if(rb)rb.addEventListener("click",function(){state.abilities.rolled=rollSix();state.abilities.assign={};renderAbilities();});
    Array.prototype.forEach.call($("abilityCalc").querySelectorAll(".ab-other"),function(inp){inp.addEventListener("change",function(){state.abilities.other[inp.getAttribute("data-ab")]=inp.value;renderAbilities();});});
    Array.prototype.forEach.call($("abilityCalc").querySelectorAll(".ab-override"),function(inp){inp.addEventListener("change",function(){state.abilities.override[inp.getAttribute("data-ab")]=inp.value;renderAbilities();});});
  }

  /* ---------- equipment ---------- */
  var _itemIndex=null;
  function itemIndex(){if(_itemIndex)return _itemIndex;_itemIndex={};(window.CC_ITEMS||[]).forEach(function(it){var k=it.name.toLowerCase();if(!_itemIndex[k])_itemIndex[k]=it;});return _itemIndex;}
  function matchItem(name){
    var n=String(name).toLowerCase(),s=n.replace(/\s*\(.*?\)\s*/g,"").trim(),L=window.CC_ITEMS||[],loose=null;
    for(var i=0;i<L.length;i++){
      var ln=L[i].name.toLowerCase();
      if(ln!==n&&ln!==s)continue;
      if(itemAllowed(L[i]))return L[i];
      if(!loose)loose=L[i];
    }
    return loose;
  }
  var _itemByKey=null;
  function itemInfo(name,source){if(!_itemByKey){_itemByKey={};(window.CC_ITEMS||[]).forEach(function(it){_itemByKey[it.name+"|"+(it.source||"")]=it;});}return _itemByKey[name+"|"+(source||"")]||null;}
  function addItemObj(it){
    var inv=state.equipment.inventory;
    var ex=inv.filter(function(x){return x.name===it.name&&x.source===it.source;})[0];
    if(ex){ex.qty=(ex.qty||1)+1;return;}
    inv.push({name:it.name,source:it.source||"",cat:it.cat||"Other Gear",rarity:it.rarity,ac:it.ac,armorKind:it.armorKind,
              dmg:it.dmg,dmgType:it.dmgType,wtype:it.wtype,range:it.range,props:it.props,
              attune:it.attune||null,bonusWeapon:it.bonusWeapon||null,requires:it.requires||null,base:null,
              qty:1,equipped:false,generic:!!it.generic});
  }
  // base weapons a magic variant may be applied to (from its `requires` tags)
  function baseWeaponsFor(reqs){
    if(!reqs||!reqs.length)return [];
    return (window.CC_ITEMS||[]).filter(function(x){
      if(!itemAllowed(x))return false;
      if(!x.tags||!x.dmg)return false;
      for(var i=0;i<reqs.length;i++)if(x.tags.indexOf(reqs[i])>=0)return true;
      return false;
    }).sort(function(a,b){return a.name.localeCompare(b.name);});
  }
  function isVariantWeapon(it){
    if(it.dmg)return false;
    var r=it.requires||(itemInfo(it.name,it.source)||{}).requires;
    if(!r)return false;
    for(var i=0;i<r.length;i++)if(["weapon","sword","axe","bow","crossbow","dagger","hammer","mace","polearm","spear","club","staff"].indexOf(r[i])>=0)return true;
    return false;
  }
  // effective weapon stats: own stats, or a variant applied to its chosen base weapon
  function resolveWeapon(it){
    var att=itemAttune(it),attRequired=!!att&&att!=="optional",attuneOk=!attRequired||!!it.attuned;
    var bonus=0,bw=it.bonusWeapon||(itemInfo(it.name,it.source)||{}).bonusWeapon;
    if(bw&&attuneOk)bonus=parseInt(String(bw).replace("+",""),10)||0;
    if(it.dmg)return {name:it.name,dmg:it.dmg,dmgType:it.dmgType,wtype:it.wtype,range:it.range,props:it.props||[],bonus:bonus,attuneOk:attuneOk,attRequired:attRequired,att:att};
    if(!isVariantWeapon(it)||!it.base)return null;
    var b=null,L=window.CC_ITEMS||[];
    for(var i=0;i<L.length;i++)if(L[i].name===it.base&&L[i].dmg){b=L[i];break;}
    if(!b)return null;
    return {name:it.name+" ("+b.name+")",dmg:b.dmg,dmgType:b.dmgType,wtype:b.wtype,range:b.range,props:b.props||[],bonus:bonus,attuneOk:attuneOk,attRequired:attRequired,att:att};
  }
  // attunement is only possible on items whose data says so (reqAttune)
  function itemAttune(it){
    if(it&&it.attune)return it.attune;
    var info=itemInfo(it.name,it.source);
    return (info&&info.attune)||null;
  }
  function attuneNote(a){
    if(a===true||a==="true")return "requires attunement";
    if(a==="optional")return "attunement optional";
    return "requires attunement "+String(a);
  }
  function addByName(name){var m=matchItem(name);if(m)addItemObj(m);else addItemObj({name:name,cat:"Other Gear",generic:true});}
  function rollDiceStr(f){
    var m=f.match(/(\d+)d(\d+)/);if(!m)return 0;
    var n=+m[1],s=+m[2],t=0,i;for(i=0;i<n;i++)t+=1+Math.floor(Math.random()*s);
    var rest=f.replace(/\d+\s*d\s*\d+/,""),mu=rest.match(/(\d+)/);  // any leftover number is the multiplier (× / x / *)
    if(mu)t*=+mu[1];
    return t;
  }
  function currencyGP(){var c=state.equipment.currency;return (c.pp||0)*10+(c.gp||0)+(c.ep||0)*0.5+(c.sp||0)*0.1+(c.cp||0)*0.01;}

  /* ---------- armour ---------- */
  // Core books define an edition; supplements, settings and adventures apply to both.
  var EDITION_CORE={PHB:"classic",DMG:"classic",XPHB:"one",XDMG:"one"};
  function itemEdition(it){return it.edition||EDITION_CORE[it.source]||null;}
  // Keep an item unless it is clearly from the other edition's core books.
  function itemAllowed(it){
    var e=itemEdition(it);
    return !e||!state.edition||e===state.edition;
  }
  function findItemByName(nm){var L=window.CC_ITEMS||[];for(var i=0;i<L.length;i++)if(L[i].name===nm)return L[i];return null;}
  // an Armor-category item without an armorKind is a magic variant that needs a base (e.g. "+1 Armor")
  function isVariantArmor(it){
    if(it.armorKind)return false;
    var info=itemInfo(it.name,it.source)||{};
    return (it.cat||info.cat)==="Armor";
  }
  function baseArmorsFor(it){
    var info=itemInfo(it.name,it.source)||{},reqs=it.requires||info.requires||[];
    var wantShield=(reqs.indexOf("shield")>=0)||/shield/i.test(it.name);
    return (window.CC_ITEMS||[]).filter(function(x){
      if(!itemAllowed(x))return false;
      if(!x.armorKind)return false;
      return wantShield?(x.armorKind==="shield"):(x.armorKind!=="shield");
    }).sort(function(a,b){return a.name.localeCompare(b.name);});
  }
  // effective armour stats: own values, or a variant applied to its chosen base armour
  function resolveArmor(it){
    var info=itemInfo(it.name,it.source)||{};
    var att=itemAttune(it),attRequired=!!att&&att!=="optional";
    var bonus=parseInt(String(it.bonusAc||info.bonusAc||"0").replace("+",""),10)||0;
    if(attRequired&&!it.attuned)bonus=0;              // no magic benefit without attunement
    if(it.armorKind)return {name:it.name,ac:it.ac,armorKind:it.armorKind,bonus:bonus};
    if(!isVariantArmor(it)||!it.base)return null;     // variant with no base chosen yet
    var b=findItemByName(it.base);
    if(!b||!b.armorKind)return null;
    return {name:it.name+" ("+b.name+")",ac:b.ac,armorKind:b.armorKind,bonus:bonus};
  }

  /* ---------- AC ----------
     Alternative AC formulas (Unarmored Defense, Natural Armor, Draconic Resilience, ...)
     are read from the feature text rather than hard-coded, so any source works. */
  var ABIL_WORD={strength:"Strength",dexterity:"Dexterity",constitution:"Constitution",
                 intelligence:"Intelligence",wisdom:"Wisdom",charisma:"Charisma"};
  function acFormulas(){
    var out=[],seen={};
    featuresAndTraits().forEach(function(t){
      var txt=entryText(t.entries||"");
      var m=/(?:armor class|ac)\s*(?:equals|is)\s*(?:equal to\s+)?(\d+)\s*(?:\+|plus)\s*([^.]{0,110})/i.exec(txt);
      if(!m)return;
      var tail=m[2];
      if(/beast/i.test(tail))return;                 // wild-shape form AC, not the character's
      var mods=[],re=/(strength|dexterity|constitution|intelligence|wisdom|charisma)/gi,mm;
      while((mm=re.exec(tail)))mods.push(ABIL_WORD[mm[1].toLowerCase()]);
      if(!mods.length)return;
      var key=t.name+"|"+m[1]+"|"+mods.join(",");
      if(seen[key])return;seen[key]=1;
      out.push({label:t.name,base:parseInt(m[1],10),mods:mods,
                noShield:/wielding a shield/i.test(txt)&&!/can (?:use|wield) a shield/i.test(txt)});
    });
    return out;
  }
  // Returns {total, label, parts:[[name,value],...]} using the best applicable formula.
  function acInfo(){
    var dex=abMod(totalScore("Dexterity")),body=null,shield=null;
    state.equipment.inventory.forEach(function(i){
      if(!i.equipped)return;
      var a=resolveArmor(i);if(!a)return;
      if(a.armorKind==="shield"){if(!shield)shield=a;}else if(!body)body=a;
    });
    var shieldBonus=shield?((shield.ac||2)+shield.bonus):0;
    var opts=[];
    if(body){
      var b=(body.ac||10),dexPart=body.armorKind==="light"?dex:(body.armorKind==="medium"?Math.min(dex,2):0);
      var parts=[[body.name,b]];
      if(body.armorKind!=="heavy")parts.push([body.armorKind==="medium"?"Dex (max 2)":"Dex",dexPart]);
      if(body.bonus)parts.push(["magic",body.bonus]);
      opts.push({label:body.name,parts:parts,total:b+dexPart+body.bonus});
    }else{
      opts.push({label:"Unarmoured",parts:[["Base",10],["Dex",dex]],total:10+dex});
      acFormulas().forEach(function(f){
        if(f.noShield&&shield)return;                // e.g. Monk cannot use a shield with it
        var p=[[f.label,f.base]],tot=f.base;
        f.mods.forEach(function(a){var v=abMod(totalScore(a));p.push([ABIL_ABBR[a]||a,v]);tot+=v;});
        opts.push({label:f.label,parts:p,total:tot});
      });
    }
    var best=opts[0];
    opts.forEach(function(o){if(o.total>best.total)best=o;});
    var finalParts=best.parts.slice(),total=best.total;
    if(shieldBonus){finalParts.push([shield.name,shieldBonus]);total+=shieldBonus;}
    var other=parseInt(state.sheet.acOther,10)||0;
    if(other){finalParts.push(["Other",other]);total+=other;}
    var ov=state.sheet.acOverride;
    if(ov!==""&&ov!=null&&!isNaN(parseInt(ov,10))){
      var o2=parseInt(ov,10);
      return {total:o2,label:"Manual override",parts:[["Override",o2]],computed:total,overridden:true};
    }
    return {total:total,label:best.label,parts:finalParts};
  }
  function computeAC(){return acInfo().total;}
  function acBreakdown(){
    var i=acInfo();
    var s=i.parts.map(function(p){return p[0]+" "+(p[1]>=0&&p[0]!==i.label?"+":"")+p[1];}).join("  ")+"  =  "+i.total;
    if(i.overridden)s+="   (calculated value would be "+i.computed+")";
    return s+"   — click to customise";
  }

  function renderEquipment(){renderStarting();renderItemBrowser();renderCurrency();renderInventory();}

  function renderStarting(){
    var host=$("startingEquip"),eq=state.equipment;
    var cls=state.slug&&window.CC_STARTING?window.CC_STARTING.classes[state.slug]:null;
    var bgKey=state.background?state.background.name+"|"+state.background.source:null;
    var bg=bgKey&&window.CC_STARTING?window.CC_STARTING.backgrounds[bgKey]:null;
    var html='<div class="eq-toggle"><button data-mode="equipment"'+(eq.mode==="equipment"?' class="active"':'')+'>Equipment</button><button data-mode="gold"'+(eq.mode==="gold"?' class="active"':'')+'>Gold</button></div>';
    if(eq.mode==="equipment"){
      if(cls){
        html+='<div class="eq-sub">'+esc(state.className)+' Starting Equipment</div>';
        cls.groups.forEach(function(g,gi){
          html+='<div class="eq-group">';
          if(g.type==="fixed"){html+=g.items.map(function(it){return '<div class="eq-opt eq-fixed">✔ '+esc(it)+"</div>";}).join("");}
          else{
            ["a","b","c"].forEach(function(opt,oi){
              if(!g[opt])return;
              if(oi>0)html+='<div class="eq-or">or</div>';
              var checked=(eq.starting["c"+gi]||"a")===opt;
              html+='<label class="eq-opt"><input type="radio" name="cg'+gi+'" class="eq-radio" data-g="c'+gi+'" data-opt="'+opt+'"'+(checked?" checked":"")+"> "+esc(g[opt].join(", "))+"</label>";
            });
          }
          html+="</div>";
        });
      }
      if(bg){html+='<div class="eq-sub">'+esc(state.background.name)+' Starting Equipment</div><div class="eq-group">'+bg.items.map(function(it){return '<div class="eq-opt eq-fixed">✔ '+esc(it)+"</div>";}).join("")+"</div>";}
      if(!cls&&!bg)html+='<p class="sec-note">Pick a class (step 1) and background (step 2) to see starting equipment.</p>';
      else html+='<button class="btn" id="addStarting"'+(eq.startingAdded?" disabled":"")+'>'+(eq.startingAdded?"✔ Added to inventory":"Add starting equipment to inventory")+"</button>";
    }else{
      var g=(cls&&cls.gold)?cls.gold:"";
      html+='<div class="gold-box"><div class="sec-note" style="margin:0 0 8px">Take starting gold instead of equipment'+(g?" (class: "+esc(g)+" gp"+(bg&&bg.gold?" + background "+bg.gold+" gp":"")+")":"")+'</div><div class="amt" id="goldAmt">'+(eq.currency.gp?eq.currency.gp+" gp":"—")+'</div><button class="btn" id="rollGold">Roll starting gold</button></div>';
    }
    host.innerHTML=html;
    Array.prototype.forEach.call(host.querySelectorAll(".eq-toggle button"),function(b){b.addEventListener("click",function(){state.equipment.mode=b.getAttribute("data-mode");renderStarting();});});
    Array.prototype.forEach.call(host.querySelectorAll(".eq-radio"),function(r){r.addEventListener("change",function(){state.equipment.starting[r.getAttribute("data-g")]=r.getAttribute("data-opt");});});
    var addB=host.querySelector("#addStarting");
    if(addB)addB.addEventListener("click",function(){
      if(cls)cls.groups.forEach(function(g,gi){if(g.type==="fixed")g.items.forEach(addByName);else{var opt=state.equipment.starting["c"+gi]||"a";(g[opt]||[]).forEach(addByName);}});
      if(bg)bg.items.forEach(addByName);
      state.equipment.startingAdded=true;renderStarting();renderInventory();
    });
    var rg=host.querySelector("#rollGold");
    if(rg)rg.addEventListener("click",function(){var amt=(cls&&cls.gold?rollDiceStr(cls.gold):0)+(bg&&bg.gold?bg.gold:0);state.equipment.currency.gp=amt;renderStarting();renderCurrency();});
  }

  var ITEM_TYPES=["Armor","Weapon","Potion","Ring","Rod","Scroll","Staff","Wand","Wondrous","Other Gear"];
  function renderItemBrowser(){
    var eq=state.equipment;
    var html='<input type="text" id="itemSearch" placeholder="Search items…" value="'+esc(eq.filterQ||"")+'">';
    html+='<div class="type-filters"><button class="tf'+(eq.filterType===""?" active":"")+'" data-t="">ALL</button>'+
      ITEM_TYPES.map(function(t){return '<button class="tf'+(eq.filterType===t?" active":"")+'" data-t="'+esc(t)+'">'+esc(t.toUpperCase())+"</button>";}).join("")+"</div>";
    html+='<div id="itemResults"></div>';
    $("itemBrowser").innerHTML=html;
    var si=$("itemSearch");
    si.addEventListener("input",function(){state.equipment.filterQ=si.value;renderItemResults();});
    Array.prototype.forEach.call($("itemBrowser").querySelectorAll(".tf"),function(b){b.addEventListener("click",function(){state.equipment.filterType=b.getAttribute("data-t");renderItemBrowser();});});
    renderItemResults();
  }
  function rarBadge(r){
    if(!r||r==="none"||r==="unknown"||r==="unknown (magic)")return "";
    var cls=({uncommon:"rar-uncommon",rare:"rar-rare","very rare":"rar-veryrare",legendary:"rar-legendary",artifact:"rar-legendary"})[r]||"";
    return ' <span class="rar-badge '+cls+'">'+esc(r)+"</span>";
  }
  function renderItemResults(){
    var eq=state.equipment,q=(eq.filterQ||"").toLowerCase();
    var list=(window.CC_ITEMS||[]).filter(function(it){
      if(!itemAllowed(it))return false;                 // hide the other edition's core items
      if(eq.filterType&&it.cat!==eq.filterType)return false;
      if(q&&it.name.toLowerCase().indexOf(q)<0)return false;
      return true;
    });
    var cap=150,shown=list.slice(0,cap);
    var html=shown.map(function(it){
      var att=it.attune?" · "+attuneNote(it.attune):"";
      var meta=it.cat+(it.rarity&&it.rarity!=="none"?" · "+it.rarity:"")+(it.dmg?" · "+it.dmg+" "+dmgAbbr(it.dmgType):"")+(it.ac?" · AC "+it.ac:"")+att;
      var hasDesc=it.entries&&it.entries.length;
      var desc=hasDesc?'<div class="inv-desc">'+it.entries.map(renderEntry).join("")+"</div>":"";
      return '<div class="inv-res-item"><div class="item-row"><div class="res-name-click">'+
        '<div class="nm">'+esc(it.name)+rarBadge(it.rarity)+(hasDesc?' <span class="inv-chev">&#9662;</span>':"")+'</div>'+
        '<div class="meta">'+esc(meta)+" · "+srcTag(it.source)+'</div></div>'+
        '<button class="add" data-name="'+esc(it.name)+'" data-source="'+esc(it.source)+'">ADD</button></div>'+desc+"</div>";
    }).join("")||'<div class="results-note">No items match.</div>';
    if(list.length>cap)html+='<div class="results-note">Showing '+cap+" of "+list.length+" — refine your search.</div>";
    $("itemResults").innerHTML=html;
    Array.prototype.forEach.call($("itemResults").querySelectorAll(".add"),function(b){
      b.addEventListener("click",function(e){
        e.stopPropagation();
        var it=(window.CC_ITEMS||[]).filter(function(x){return x.name===b.getAttribute("data-name")&&x.source===b.getAttribute("data-source");})[0];
        if(it){addItemObj(it);renderInventory();}
      });
    });
    Array.prototype.forEach.call($("itemResults").querySelectorAll(".res-name-click"),function(n){
      n.addEventListener("click",function(){n.parentNode.parentNode.classList.toggle("open");});
    });
  }

  function renderCurrency(){
    var c=state.equipment.currency;
    var coins=[["pp","Platinum","10 gp"],["gp","Gold","—"],["ep","Electrum","5 sp"],["sp","Silver","10 cp"],["cp","Copper","—"]];
    var html='<div class="gp-total">Total in GP: <span id="gpTotal">'+(Math.round(currencyGP()*100)/100)+'</span></div><div class="currency-grid">';
    html+=coins.map(function(k){return '<div class="coin"><div class="cn">'+k[1]+'</div><div class="csub">'+k[2]+'</div><input type="number" min="0" class="cur-inp" data-k="'+k[0]+'" value="'+(c[k[0]]||0)+'"></div>';}).join("");
    $("currencyPanel").innerHTML=html+"</div>";
    Array.prototype.forEach.call($("currencyPanel").querySelectorAll(".cur-inp"),function(inp){
      inp.addEventListener("input",function(){state.equipment.currency[inp.getAttribute("data-k")]=parseInt(inp.value,10)||0;$("gpTotal").textContent=Math.round(currencyGP()*100)/100;});
    });
  }

  function renderInventory(){
    var inv=state.equipment.inventory,dex=abMod(totalScore("Dexterity"));
    var html='<div class="stat-box"><div><div class="sv">'+computeAC()+'</div><div class="sl">Armor Class</div></div><div><div class="sv">'+modStr(dex)+'</div><div class="sl">Initiative</div></div><div><div class="sv">'+inv.length+'</div><div class="sl">Items</div></div></div>';
    if(!inv.length)html+='<p class="sec-note">No items yet. Add starting equipment or browse above.</p>';
    inv.forEach(function(it,i){
      var att=itemAttune(it),info=itemInfo(it.name,it.source),hasDesc=info&&info.entries&&info.entries.length;
      var meta=it.cat+(it.rarity&&it.rarity!=="none"?" · "+it.rarity:"")+(it.dmg?" · "+it.dmg+" "+dmgAbbr(it.dmgType):"")+(it.ac&&it.armorKind!=="shield"?" · AC "+it.ac:"")+(it.armorKind==="shield"?" · +"+(it.ac||2)+" AC":"")+(att?" · "+attuneNote(att):"");
      var ctrl='<input type="number" min="1" class="inv-qty" data-i="'+i+'" value="'+(it.qty||1)+'">';
      var ra2=resolveArmor(it),equippable=ra2||it.cat==="Weapon";
      if(equippable){
        var lbl=ra2?(it.equipped?"Worn":"Wear"):(it.equipped?"Wielding":"Wield");
        ctrl+='<button class="equip-btn'+(it.equipped?" on":"")+'" data-i="'+i+'">'+lbl+"</button>";
      }
      ctrl+='<button class="rm-btn" data-i="'+i+'" title="Remove">×</button>';
      var desc=hasDesc?'<div class="inv-desc">'+info.entries.map(renderEntry).join("")+"</div>":"";
      html+='<div class="inv-item'+(hasDesc?" has-desc":"")+'"><div class="inv-row"><div class="inv-main" data-i="'+i+'"><div class="nm">'+esc(it.name)+rarBadge(it.rarity)+(it.generic?' <span class="meta">(no stats)</span>':"")+(hasDesc?' <span class="inv-chev">&#9662;</span>':"")+'</div><div class="meta">'+esc(meta)+(it.source?" · "+srcTag(it.source):"")+'</div></div><div class="ctrl">'+ctrl+"</div></div>"+desc+"</div>";
    });
    $("inventoryPanel").innerHTML=html;
    Array.prototype.forEach.call($("inventoryPanel").querySelectorAll(".inv-qty"),function(inp){inp.addEventListener("change",function(){inv[+inp.getAttribute("data-i")].qty=parseInt(inp.value,10)||1;});});
    Array.prototype.forEach.call($("inventoryPanel").querySelectorAll(".equip-btn"),function(b){b.addEventListener("click",function(){
      var it=inv[+b.getAttribute("data-i")];
      if(!it.equipped&&it.armorKind&&it.armorKind!=="shield"){inv.forEach(function(x){if(x.armorKind&&x.armorKind!=="shield")x.equipped=false;});}
      it.equipped=!it.equipped;renderInventory();
    });});
    Array.prototype.forEach.call($("inventoryPanel").querySelectorAll(".rm-btn"),function(b){b.addEventListener("click",function(){inv.splice(+b.getAttribute("data-i"),1);renderInventory();});});
    Array.prototype.forEach.call($("inventoryPanel").querySelectorAll(".inv-item.has-desc .inv-main"),function(m){m.addEventListener("click",function(){m.parentNode.parentNode.classList.toggle("open");});});
  }

  /* ---------- spells ---------- */
  function profBonus(){return Math.floor((state.level-1)/4)+2;}
  function maxSpellLevel(caster,L){
    switch(caster){
      case "full":return Math.min(9,Math.ceil(L/2));
      case "pact":return Math.min(5,Math.ceil(L/2));
      case "1/2":return L<2?0:Math.min(5,Math.ceil(L/4));
      case "artificer":return Math.min(5,Math.ceil(L/4));
      default:return Math.min(9,Math.ceil(L/2));
    }
  }
  function spellInfo(){
    var sc=state.slug&&window.CC_SPELLCAST?window.CC_SPELLCAST[state.slug]:null;
    if(!sc)return null;
    var L=state.level,cantripsKnown=(sc.cantrips&&sc.cantrips[L-1])||0,maxLevel=maxSpellLevel(sc.caster,L),prepared=!sc.known,spellsCount;
    if(sc.known)spellsCount=sc.known[L-1]||0;
    else{var mod=abMod(totalScore(sc.ability));spellsCount=Math.max(1,mod+(sc.caster==="full"?L:Math.floor(L/2)));}
    return {sc:sc,ability:sc.ability,cantripsKnown:cantripsKnown,spellsCount:spellsCount,maxLevel:maxLevel,prepared:prepared};
  }
  function classSpellList(minL,maxL){
    var ed=state.edition,cn=state.className;
    return (window.CC_SPELLS||[]).filter(function(s){return s.level>=minL&&s.level<=maxL&&s.cls[ed]&&s.cls[ed].indexOf(cn)>=0;});
  }
  function spKey(s){return s.name+"|"+s.source;}
  function pruneSpells(){
    var info=spellInfo();
    if(!info){state.spells.cantrips=[];state.spells.spells=[];return;}
    var vc={};classSpellList(0,0).forEach(function(s){vc[spKey(s)]=1;});
    var vs={};classSpellList(1,info.maxLevel).forEach(function(s){vs[spKey(s)]=1;});
    state.spells.cantrips=state.spells.cantrips.filter(function(k){return vc[k];}).slice(0,info.cantripsKnown);
    state.spells.spells=state.spells.spells.filter(function(k){return vs[k];}).slice(0,info.spellsCount);
  }
  var _spellIndex=null;
  function spellByKey(k){if(!_spellIndex){_spellIndex={};(window.CC_SPELLS||[]).forEach(function(s){_spellIndex[spKey(s)]=s;});}return _spellIndex[k];}
  function spRowHtml(s,kind,selArr,disableUnsel){
    var k=spKey(s),sel=selArr.indexOf(k)>=0;
    var meta=s.school+(s.range?" · "+s.range:"")+(s.comp?" · "+s.comp:"")+(s.conc?" · Conc.":"")+(s.ritual?" · Ritual":"");
    return '<div class="sp-row'+(sel?" sel":"")+'"><input type="checkbox" class="sp-chk" data-kind="'+kind+'" data-key="'+esc(k)+'"'+(sel?" checked":"")+((!sel&&disableUnsel)?" disabled":"")+'>'+
      '<div class="sp-info" data-key="'+esc(k)+'"><div class="nm">'+esc(s.name)+'</div><div class="meta">'+esc(meta)+" · "+srcTag(s.source)+"</div></div>"+
      (kind==="spell"?'<span class="lv">'+(s.level===0?"Cantrip":"Lvl "+s.level)+"</span>":"")+"</div>";
  }
  function spellDetailHtml(s){
    if(!s)return '<p class="sec-note" style="margin:0">Hover or click a spell to see what it does.</p>';
    var lvl=s.level===0?(s.school+" Cantrip"):(ordinal(s.level)+"-level "+s.school);
    var higher=(s.higher&&s.higher.length)?'<p><span class="sub-h">At Higher Levels.</span> '+s.higher.map(function(e){return typeof e==="string"?renderTags(e):renderEntry(e);}).join(" ")+"</p>":"";
    return '<div class="sd-name">'+esc(s.name)+'</div><div class="sd-sub">'+esc(lvl)+(s.ritual?" (ritual)":"")+"</div>"+
      '<div class="sd-row"><b>Casting Time:</b> '+esc(s.time||"—")+"</div>"+
      '<div class="sd-row"><b>Range:</b> '+esc(s.range||"—")+"</div>"+
      '<div class="sd-row"><b>Components:</b> '+esc(s.compFull||"—")+"</div>"+
      '<div class="sd-row"><b>Duration:</b> '+esc(s.duration||"—")+"</div>"+
      '<div class="sd-body">'+(s.entries||[]).map(renderEntry).join("")+higher+"</div>";
  }
  function showSpellDetail(key){var p=$("spellDetail");if(p)p.innerHTML=spellDetailHtml(spellByKey(key));}
  function wireSpellRows(container){
    Array.prototype.forEach.call(container.querySelectorAll(".sp-chk"),wireSpellChk);
    Array.prototype.forEach.call(container.querySelectorAll(".sp-info"),function(el){
      el.addEventListener("mouseenter",function(){showSpellDetail(el.getAttribute("data-key"));});
      el.addEventListener("click",function(){state.spells.preview=el.getAttribute("data-key");showSpellDetail(el.getAttribute("data-key"));});
    });
  }
  function renderSpells(){
    var host=$("spellsPanel");
    if(!state.className){host.innerHTML='<p class="sec-note">Choose a class first (step 1).</p>';return;}
    var info=spellInfo();
    if(!info){host.innerHTML='<p class="sec-note"><b>'+esc(state.className)+'</b> has no class spellcasting. (Some subclasses grant spells — not handled here yet.)</p>';return;}
    var mod=abMod(totalScore(info.ability)),prof=profBonus(),dc=8+prof+mod,atk=prof+mod;
    var selC=state.spells.cantrips,selS=state.spells.spells;
    function stat(v,l){return '<div><div class="sv">'+v+'</div><div class="sl">'+l+"</div></div>";}
    var html='<div class="sc-summary">'+stat(esc(info.ability),"Ability")+stat(dc,"Spell Save DC")+stat(modStr(atk),"Spell Attack")+stat(info.maxLevel||"—","Max Spell Level")+stat(selC.length+"/"+info.cantripsKnown,"Cantrips")+stat(selS.length+"/"+info.spellsCount,(info.prepared?"Prepared":"Known"))+"</div>";

    // spell slots available at this level
    var sl=info.sc.slots,slotBadges="";
    if(sl&&sl.type==="slots"){
      var row=sl.rows[state.level-1]||[];
      for(var si=0;si<row.length;si++){if(row[si]>0)slotBadges+='<span class="slot-badge"><b>'+row[si]+'</b> &times; '+ordinal(si+1)+"</span>";}
    }else if(sl&&sl.type==="pact"){
      var pc=sl.count[state.level-1]||0,plv=sl.level[state.level-1]||0;
      if(pc>0)slotBadges='<span class="slot-badge"><b>'+pc+"</b> &times; "+ordinal(plv)+" (Pact Magic)</span>";
    }
    if(slotBadges)html+='<div class="slot-row"><span class="slot-label">Spell Slots</span>'+slotBadges+"</div>";

    var left="";
    if(info.cantripsKnown>0){
      var cList=classSpellList(0,0).sort(function(a,b){return a.name.localeCompare(b.name);});
      var cFull=selC.length>=info.cantripsKnown;
      left+='<div class="spell-head"><h3>Cantrips</h3><span class="spell-count '+(cFull?"done":"need")+'">'+selC.length+" / "+info.cantripsKnown+"</span></div>";
      left+='<div class="spell-list" id="cantripList">'+cList.map(function(s){return spRowHtml(s,"cantrip",selC,cFull);}).join("")+"</div>";
    }
    if(info.spellsCount>0&&info.maxLevel>0){
      var sFull=selS.length>=info.spellsCount;
      left+='<div class="spell-head"><h3>'+(info.prepared?"Spells Prepared":"Spells Known")+'</h3><span class="spell-count '+(sFull?"done":"need")+'">'+selS.length+" / "+info.spellsCount+"</span></div>";
      left+='<input type="text" id="spellSearch" placeholder="Search spells…" value="'+esc(state.spells.q||"")+'">';
      var tabs='<button class="lt'+(state.spells.levelFilter===""?" active":"")+'" data-l="">All</button>';
      for(var lv=1;lv<=info.maxLevel;lv++)tabs+='<button class="lt'+(state.spells.levelFilter===String(lv)?" active":"")+'" data-l="'+lv+'">Lvl '+lv+"</button>";
      left+='<div class="lvl-tabs">'+tabs+'</div><div class="spell-list" id="spellResults"></div>';
    }
    html+='<div class="spells-cols"><div class="spells-left">'+left+'</div><div class="spells-right"><div id="spellDetail" class="spell-detail">'+spellDetailHtml(state.spells.preview?spellByKey(state.spells.preview):null)+"</div></div></div>";
    host.innerHTML=html;
    wireSpellRows(host);        // wire cantrip rows while #spellResults is still empty (avoids double-wiring)
    renderSpellResults();       // populates + wires #spellResults rows once
    var ss=host.querySelector("#spellSearch");
    if(ss)ss.addEventListener("input",function(){state.spells.q=ss.value;renderSpellResults();});
    Array.prototype.forEach.call(host.querySelectorAll(".lt"),function(b){b.addEventListener("click",function(){state.spells.levelFilter=b.getAttribute("data-l");renderSpells();});});
  }
  function wireSpellChk(chk){
    chk.addEventListener("change",function(){
      var kind=chk.getAttribute("data-kind"),key=chk.getAttribute("data-key");
      var arr=kind==="cantrip"?state.spells.cantrips:state.spells.spells;
      var info=spellInfo(),max=kind==="cantrip"?info.cantripsKnown:info.spellsCount;
      var i=arr.indexOf(key);
      if(i>=0)arr.splice(i,1);
      else if(arr.length<max)arr.push(key);
      var sr=$("spellResults"),st=sr?sr.scrollTop:0;   // preserve scroll across re-render
      var cl=$("cantripList"),ct=cl?cl.scrollTop:0;
      renderSpells();
      var sr2=$("spellResults");if(sr2)sr2.scrollTop=st;
      var cl2=$("cantripList");if(cl2)cl2.scrollTop=ct;
    });
  }
  function renderSpellResults(){
    var box=$("spellResults");if(!box)return;
    var info=spellInfo(),q=(state.spells.q||"").toLowerCase(),lf=state.spells.levelFilter;
    var lo=lf?parseInt(lf,10):1,hi=lf?parseInt(lf,10):info.maxLevel;
    var list=classSpellList(lo,hi).filter(function(s){return !q||s.name.toLowerCase().indexOf(q)>=0;});
    list.sort(function(a,b){return a.level-b.level||a.name.localeCompare(b.name);});
    var sFull=state.spells.spells.length>=info.spellsCount;
    box.innerHTML=list.map(function(s){return spRowHtml(s,"spell",state.spells.spells,sFull);}).join("")||'<div class="results-note">No spells match.</div>';
    wireSpellRows(box);
  }

  /* ---------- character sheet ---------- */
  var SKILL_ABILITY={Acrobatics:"Dexterity","Animal Handling":"Wisdom",Arcana:"Intelligence",Athletics:"Strength",Deception:"Charisma",History:"Intelligence",Insight:"Wisdom",Intimidation:"Charisma",Investigation:"Intelligence",Medicine:"Wisdom",Nature:"Intelligence",Perception:"Wisdom",Performance:"Charisma",Persuasion:"Charisma",Religion:"Intelligence","Sleight of Hand":"Dexterity",Stealth:"Dexterity",Survival:"Wisdom"};
  function maxHP(){
    if(state.manualHp!=null)return state.manualHp;
    var faces=state.hdFaces;if(!faces)return null;
    var con=abMod(totalScore("Constitution")),avg=Math.floor(faces/2)+1;
    return faces+con+(state.level-1)*(avg+con);
  }
  function proficientSkills(){
    var set={},fd=state.fdata;function add(s){if(s)set[s]=1;}
    if(fd&&fd.proficiencies&&fd.proficiencies.skills)for(var i=0;i<fd.proficiencies.skills.count;i++)add(state.choices["skill:"+i]);
    var bg=currentBg();
    if(bg&&bg.skills){(bg.skills.fixed||[]).forEach(add);
      if(bg.skills.choose)for(var i=0;i<bg.skills.choose.count;i++)add(state.bgChoices["skillChoose:"+i]);
      if(bg.skills.any)for(var i=0;i<bg.skills.any;i++)add(state.bgChoices["skillAny:"+i]);}
    featureSkillPicks().forEach(add);
    var race=currentRace();
    if(race&&race.skills){(race.skills.fixed||[]).forEach(add);
      if(race.skills.choose)for(var i=0;i<race.skills.choose.count;i++)add(state.raceChoices["race:skill:"+i]);
      if(race.skills.any)for(var i=0;i<race.skills.any;i++)add(state.raceChoices["race:skillany:"+i]);}
    return set;
  }
  function savingProfs(){
    var set={},fd=state.fdata,st=fd&&fd.proficiencies&&fd.proficiencies.savingThrows;
    if(st&&st!=="None")st.split(",").forEach(function(s){set[s.trim()]=1;});
    return set;
  }
  function languagesAll(){
    var out=[],seen={};function add(l){if(l&&!seen[l]){seen[l]=1;out.push(l);}}
    var race=currentRace();
    if(race){(race.languages.fixed||[]).forEach(add);
      for(var i=0;i<(race.languages.anyStandard||0);i++)add(state.raceChoices["race:lang:"+i]);
      for(var i=0;i<(race.languages.any||0);i++)add(state.raceChoices["race:langany:"+i]);}
    var bg=currentBg();
    if(bg){(bg.langs.fixed||[]).forEach(add);
      for(var i=0;i<(bg.langs.anyStandard||0);i++)add(state.bgChoices["langStd:"+i]);
      for(var i=0;i<(bg.langs.any||0);i++)add(state.bgChoices["langAny:"+i]);
      if(bg.langs.choose)for(var i=0;i<bg.langs.choose.count;i++)add(state.bgChoices["langChoose:"+i]);}
    (state.customLanguages||[]).forEach(add);
    return out;
  }
  function shCard(title,body){return body?'<div class="sheet-card"><h3>'+esc(title)+'</h3><div class="cbody">'+body+"</div></div>":"";}
  function acStatHtml(ac){
    var i=acInfo(),custom=i.overridden||(parseInt(state.sheet.acOther,10)||0);
    return '<div class="top-stat has-why ac-stat'+(custom?" ac-custom":"")+'" id="acStat" title="Armor Class: '+esc(acBreakdown())+'">'+
      '<div class="tv">'+ac+(custom?' <span class="ac-mark">&#9998;</span>':"")+'</div><div class="tl">Armor Class</div></div>';
  }
  function topStat(v,l,why){
    return '<div class="top-stat'+(why?" has-why":"")+'"'+(why?' title="'+esc(why)+'"':"")+'>'+
      '<div class="tv">'+v+'</div><div class="tl">'+esc(l)+"</div></div>";
  }
  // plain-language explanations for the derived header numbers
  function profWhy(){return "Proficiency bonus for level "+state.level+" = 2 + floor(("+state.level+" - 1) / 4) = +"+profBonus();}
  function initWhy(){
    var d=abMod(totalScore("Dexterity"));
    return "Initiative = Dexterity modifier ("+modStr(d)+"), from a Dexterity score of "+totalScore("Dexterity")+".";
  }
  /* ---------- walking speed ----------
     Base comes from the species (a lineage may override it, e.g. Wood Elf 35 ft.).
     Always-on class features then add to it, subject to their armour condition.
     Activated or temporary boosts (Blade Flourish, Dread Ambusher, Shifting, ...) are
     listed as situational notes instead of being added, so the number stays truthful. */
  var PASSIVE_SPEED={
    "Fast Movement":{bonus:10,notHeavy:true},            // Barbarian 5
    "Roving":{bonus:10,notHeavy:true},                   // Ranger 2024
    "Superior Mobility":{bonus:10},                      // Scout rogue
    "Unarmored Movement":{fromTable:true,noArmor:true,noShield:true}   // Monk, scales by level
  };
  function wornArmor(){
    var out={body:null,shield:false};
    state.equipment.inventory.forEach(function(i){
      if(!i.equipped)return;
      var a=resolveArmor(i);if(!a)return;
      if(a.armorKind==="shield")out.shield=true;else if(!out.body)out.body=a.armorKind;
    });
    return out;
  }
  function speedInfo(){
    var race=currentRace(),lin=race?currentLineage(race):null;
    var raw=(lin&&lin.speed)?lin.speed:(race?race.speed:"");
    var base=parseInt(raw,10)||30;
    var label=(lin&&lin.speed)?lin.name:(race?race.name:"Base");
    var parts=[[label,base]],total=base,notes=[],w=wornArmor(),seen={};
    var prog=(window.CC_SPEEDPROG&&window.CC_SPEEDPROG[state.slug])||null;
    featuresAndTraits().forEach(function(f){
      var cfg=PASSIVE_SPEED[f.name];
      var txt=entryText(f.entries||"");
      if(!cfg){
        var m=/speed increases by (\d+) f/i.exec(txt);          // situational boost
        if(m&&!seen["n"+f.name]){seen["n"+f.name]=1;notes.push(f.name+" +"+m[1]+" ft. (situational)");}
        return;
      }
      if(seen[f.name])return;seen[f.name]=1;
      var amount=cfg.bonus;
      if(cfg.fromTable)amount=prog?(prog.values[state.level-1]||0):0;
      if(!amount)return;
      if(cfg.noArmor&&w.body){notes.push(f.name+" +"+amount+" ft. (needs no armour)");return;}
      if(cfg.noShield&&w.shield){notes.push(f.name+" +"+amount+" ft. (no shield allowed)");return;}
      if(cfg.notHeavy&&w.body==="heavy"){notes.push(f.name+" +"+amount+" ft. (not in heavy armour)");return;}
      parts.push([f.name,amount]);total+=amount;
    });
    return {total:total,parts:parts,notes:notes,extra:String(raw).replace(/^\s*\d+\s*ft\.?,?\s*/,"")};
  }
  function speedText(){var s=speedInfo();return s.total+" ft."+(s.extra?", "+s.extra:"");}
  function speedWhy(){
    var s=speedInfo();
    if(!currentRace())return "Walking speed 30 ft. (default). Choose a species to set this.";
    var str=s.parts.map(function(p){return p[0]+" "+p[1];}).join("  +  ")+"  =  "+s.total+" ft.";
    if(s.notes.length)str+="\nNot counted: "+s.notes.join("; ");
    return str;
  }

  function sheetCollapse(items,prefix){
    if(!items||!items.length)return '<span class="res-sub">None.</span>';
    return items.map(function(it,i){
      var d=(it.entries&&it.entries.length)?it.entries.map(renderEntry).join(""):'<p class="res-sub">No description.</p>';
      return '<div class="sc-item"><div class="sc-h" data-tgt="'+prefix+i+'">'+esc(it.name)+'<span class="sc-chev">&#9662;</span></div><div class="sc-d">'+d+"</div></div>";
    }).join("");
  }
  function spellItems(keys){
    var out=[];(keys||[]).forEach(function(k){var s=spellByKey(k);if(!s)return;
      var hdr=["{@b Casting Time:} "+(s.time||"—")+"  ·  {@b Range:} "+(s.range||"—"),
               "{@b Components:} "+(s.compFull||"—")+"  ·  {@b Duration:} "+(s.duration||"—")];
      var body=hdr.concat(s.entries||[]);
      if(s.higher&&s.higher.length)body=body.concat([{type:"entries",name:"At Higher Levels",entries:s.higher}]);
      var lvl=s.level===0?"Cantrip":ordinal(s.level)+" level";
      out.push({name:s.name+" — "+lvl+" "+s.school+(s.conc?" · Conc.":"")+(s.ritual?" · Ritual":""),entries:body});
    });return out;
  }

  function attunedCount(){return state.equipment.inventory.filter(function(i){return i.attuned&&itemAttune(i);}).length;}
  function longRest(){
    state.sheet.hpCurrent=maxHP();state.sheet.hpEdited=false;state.sheet.hpTemp="";
    state.sheet.deathSucc=0;state.sheet.deathFail=0;
    var res=state.sheet.res,hdTotal=state.level,usedHd=0,i;
    for(i=0;i<hdTotal;i++)if(res["hd:"+i])usedHd++;
    var regain=Math.max(1,Math.floor(hdTotal/2)),keepUsed=Math.max(0,usedHd-regain);
    var nr={};for(i=0;i<keepUsed;i++)nr["hd:"+i]=true;   // clear all slots/resources; regain half the spent hit dice
    state.sheet.res=nr;render();
  }
  function shortRest(){
    var info=spellInfo(),res=state.sheet.res,k,i;
    // Warlock Pact Magic slots recharge on a short rest
    if(info&&info.sc.slots&&info.sc.slots.type==="pact"){for(k in res)if(k.indexOf("slot:")===0)delete res[k];}
    // class resources that recharge on a short (or long) rest
    var sr=["Ki Points","Focus Points","Channel Divinity","Wild Shape"];
    if(state.level>=5)sr.push("Bardic Inspiration");   // Bard: Font of Inspiration (level 5+)
    for(k in res){for(i=0;i<sr.length;i++){if(k.indexOf(sr[i]+":")===0){delete res[k];break;}}}
    render();
  }
  // summarise the player's actual choices for a feature (for the sheet's Features list)
  function choiceSummary(f){
    var fd=state.fdata,name=f.name,L=f.level,i;
    if(name==="Ability Score Improvement"){
      var mode=state.choices["asi:"+L+":mode"];
      if(mode==="feat"){
        var ftn=state.choices["asi:"+L+":feat"];
        if(!ftn)return "Feat (not chosen yet)";
        var picks=featAsiPicks(L),extra=picks.map(function(p){return p.ability+" +"+p.amount;});
        return "Feat — "+ftn+(extra.length?" ("+extra.join(", ")+")":(featAsiPending(L)?" (ability increase not chosen)":""));
      }
      if(mode==="asi"){var dist=state.choices["asi:"+L+":dist"]||"2",n=dist==="11"?2:1,amt=dist==="11"?1:2,parts=[];for(i=0;i<n;i++){var a=state.choices["asi:"+L+":a"+i];if(a)parts.push(a+" +"+amt);}return parts.length?parts.join(", "):"Ability increase (not chosen yet)";}
      return "Not chosen yet";
    }
    if(fd&&fd.optionLists&&fd.optionLists[name]){var picks=[];for(i=0;i<20;i++){var v=state.choices[name+":"+i];if(v)picks.push(v);}if(picks.length)return picks.join(", ");}
    var tbl=state.choices["tbl:"+name+":0"];if(tbl)return tbl;
    return "";
  }
  function featEntriesWithChoice(f){
    var fd=state.fdata,cs=choiceSummary(f),i;
    var isGroup=fd&&fd.optionLists&&fd.optionLists[f.name]&&f.name!=="Ability Score Improvement";
    var base=isGroup?stripOptions(f.entries):(f.entries||[]);
    var extra=[];
    if(isGroup){var pool=fd.optionLists[f.name];for(i=0;i<20;i++){var v=state.choices[f.name+":"+i];if(v){var o=pool.filter(function(x){return x.name===v;})[0];if(o&&o.entries&&o.entries.length)extra.push({type:"entries",name:o.name,entries:o.entries});}}}
    if(f.name==="Ability Score Improvement"&&state.choices["asi:"+f.level+":mode"]==="feat"){var ftn=state.choices["asi:"+f.level+":feat"];if(ftn){var ft=(window.CC_FEATS||[]).filter(function(x){return x.name===ftn;})[0];if(ft&&ft.entries&&ft.entries.length)extra.push({type:"entries",name:ftn,entries:ft.entries});}}
    var head=cs?["{@b Your selection:} "+cs]:[];
    return head.concat(base).concat(extra);
  }
  var _spellByName=null;
  function spellByName(n){if(!_spellByName){_spellByName={};(window.CC_SPELLS||[]).forEach(function(s){var k=s.name.toLowerCase();if(!_spellByName[k])_spellByName[k]=s;});}return n?(_spellByName[String(n).toLowerCase()]||null):null;}
  function entryText(e){
    if(typeof e==="string")return e+" ";
    if(!e)return "";
    if(e instanceof Array){var s="",i;for(i=0;i<e.length;i++)s+=entryText(e[i]);return s;}
    if(typeof e==="object"){var s="",k;for(k in e){if(k==="type"||k==="name"||k==="source")continue;s+=entryText(e[k]);}return s;}
    return "";
  }
  // Text used to classify a feature's action economy. Skips "choose one of these"
  // sub-option menus (lists/items/options): a reaction buried in one optional
  // sub-choice must not label the whole parent feature a Reaction.
  function actionText(e){
    if(typeof e==="string")return e+" ";
    if(!e)return "";
    if(e instanceof Array){var s="",i;for(i=0;i<e.length;i++)s+=actionText(e[i]);return s;}
    if(typeof e==="object"){
      var t=e.type;
      if(t==="list"||t==="item"||t==="options")return "";
      var s="",k;for(k in e){if(k==="type"||k==="name"||k==="source")continue;s+=actionText(e[k]);}
      return s;
    }
    return "";
  }
  // Optional class features (Tasha's) are opt-in; they default to enabled.
  function optKey(f){return "optOff:"+f.name+"@"+f.level;}
  function optEnabled(f){return !f.optional||state.choices[optKey(f)]!=="1";}
  // Every feature/trait the character actually has: race + lineage + class + chosen
  // subclass (up to the current level), with nested feature references expanded.
  function featuresAndTraits(){
    var race=currentRace(),lin=race?currentLineage(race):null,fd=state.fdata,list=[];
    if(race)list=list.concat(race.traits||[]);
    if(lin)list=list.concat(lin.traits||[]);
    if(fd){
      (fd.classFeatures||[]).forEach(function(f){if(f.level<=state.level&&optEnabled(f))list.push(f);});
      var chosen=state.subclassName?(fd.subclasses||[]).filter(function(s){return s.name===state.subclassName;})[0]:null;
      if(chosen)(chosen.features||[]).forEach(function(f){if(f.level<=state.level)list.push(f);});
    }
    var lookup=(fd&&fd.refLookup)||{},expanded=[],seen={};
    function collectRefs(e){
      if(!e)return;
      if(e instanceof Array){for(var i=0;i<e.length;i++)collectRefs(e[i]);return;}
      if(typeof e!=="object")return;
      var key=e.classFeature||e.subclassFeature;
      if((e.type==="refClassFeature"||e.type==="refSubclassFeature")&&key&&lookup[key]&&!seen[key]){
        seen[key]=1;expanded.push(lookup[key]);collectRefs(lookup[key].entries);return;
      }
      for(var k in e){if(k!=="type"&&k!=="name")collectRefs(e[k]);}
    }
    list.forEach(function(t){collectRefs(t.entries);});
    return list.concat(expanded);
  }
  // classify features/traits (+ racial bonus-action spells) by action economy; keep entries for descriptions
  function actionEconomy(){
    var out={action:[],bonus:[],reaction:[]},seen={};
    function push(list,key,it){if(seen[key])return;seen[key]=1;list.push({name:it.name,entries:it.entries||[]});}
    // a feature can belong to several buckets (e.g. Storm Guide: an action AND a bonus action)
    function classify(t){
      var txt=actionText(t.entries||"").toLowerCase();
      if(/\b(?:an|your) action\b/.test(txt))push(out.action,"a"+t.name,t);
      if(txt.indexOf("bonus action")>=0)push(out.bonus,"b"+t.name,t);
      if(txt.indexOf("as a reaction")>=0||txt.indexOf("your reaction")>=0)push(out.reaction,"r"+t.name,t);
    }
    featuresAndTraits().forEach(classify);
    var race=currentRace(),lin=race?currentLineage(race):null;
    var rsp=[];if(race)rsp=rsp.concat(race.spells||[]);if(lin)rsp=rsp.concat(lin.spells||[]);
    rsp.forEach(function(sp){var s=spellByName(sp.name);if(s&&s.time&&s.time.indexOf("bonus")>=0)push(out.bonus,"b"+s.name,s);});
    return out;
  }
  function dmgAbbr(c){return {P:"piercing",S:"slashing",B:"bludgeoning"}[c]||c||"";}
  // Attacks granted by a feature's sub-options, e.g. Path of the Beast's Bite / Claws / Tail.
  function featureAttacks(){
    var out=[],seen={};
    featuresAndTraits().forEach(function(f){
      (f.entries||[]).forEach(function(e){
        if(!e||typeof e!=="object"||e.type!=="list")return;
        (e.items||[]).forEach(function(it){
          if(!it||typeof it!=="object"||!it.name)return;
          var txt=entryText(it.entries||it.entry||"");
          var m=/(\d+d\d+)\}?\s*(acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder)\s*damage/i.exec(txt);
          if(!m)return;
          var key=f.name+":"+it.name;
          if(seen[key])return;seen[key]=1;
          out.push({name:it.name,parent:f.name,dmg:m[1],dmgType:m[2].toLowerCase(),
                    reach:/reach/i.test(txt),finesse:/finesse/i.test(txt)});
        });
      });
    });
    return out;
  }
  function scaledDie(sc,L){var best="",bl=-1;for(var k in sc){var n=+k;if(n<=L&&n>bl){bl=n;best=sc[k];}}return best;}
  function capital(s){return s?s.charAt(0).toUpperCase()+s.slice(1):"";}
  function actionsCardHtml(){
    var prof=profBonus(),strM=abMod(totalScore("Strength")),dexM=abMod(totalScore("Dexterity"));
    var info=spellInfo(),castMod=info?abMod(totalScore(info.ability)):0,spAtk=info?prof+castMod:null,spDC=info?8+prof+castMod:null;
    function row(name,sub,range,hit,dmg,notes){return '<tr><td><div class="atk-name">'+esc(name)+'</div>'+(sub?'<div class="atk-sub">'+esc(sub)+"</div>":"")+"</td><td>"+esc(range||"—")+'</td><td class="atk-hit">'+hit+"</td><td>"+esc(dmg)+'</td><td class="atk-notes">'+esc(notes||"")+"</td></tr>";}
    var rows="";
    state.equipment.inventory.forEach(function(it){
      if(it.cat!=="Weapon")return;
      if(!it.equipped)return;             // only weapons you are actually wielding
      var w=resolveWeapon(it);
      if(!w)return;                       // e.g. a magic variant with no base weapon chosen yet
      if(w.attRequired&&!it.attuned)return;   // requires attunement, and you are not attuned
      var props=w.props||[],finesse=props.indexOf("Finesse")>=0,thrown=props.indexOf("Thrown")>=0;
      var mod=(w.wtype==="R"?dexM:(finesse?Math.max(strM,dexM):strM))+w.bonus;
      var range=w.wtype==="R"?(w.range?w.range+" ft.":"Ranged"):(thrown&&w.range?"5 ft. / "+w.range:"5 ft.");
      var dbonus=(w.wtype==="R"?dexM:(finesse?Math.max(strM,dexM):strM))+w.bonus;
      var dstr=w.dmg+(dbonus>0?"+"+dbonus:(dbonus<0?""+dbonus:""))+" "+dmgAbbr(w.dmgType);
      var notes=props.join(", ");
      if(w.bonus)notes=(notes?notes+" · ":"")+"magic +"+w.bonus;
      if(w.att==="optional"&&!it.attuned)notes=(notes?notes+" · ":"")+"not attuned — no magic bonus";
      rows+=row(w.name,w.wtype==="R"?"Ranged Weapon":"Melee Weapon",range,modStr(mod+prof),dstr,notes);
    });
    rows+=row("Unarmed Strike","Melee","5 ft.",modStr(strM+prof),Math.max(1,1+strM)+" bludgeoning","");   // unarmed damage is always at least 1
    featureAttacks().forEach(function(a){                 // e.g. Bite / Claws / Tail from Form of the Beast
      var mod=a.finesse?Math.max(strM,dexM):strM;
      rows+=row(a.name,a.parent,a.reach?"10 ft. (reach)":"5 ft.",modStr(mod+prof),
                a.dmg+(mod>0?"+"+mod:(mod<0?""+mod:""))+" "+a.dmgType,a.reach?"Reach":"");
    });
    if(info){
      state.spells.cantrips.forEach(function(k){
        var s=spellByKey(k);if(!s||!s.scaling)return;
        var die=scaledDie(s.scaling,state.level);
        var hit=s.atk?modStr(spAtk):(s.save?"DC "+spDC:"—");
        rows+=row(s.name,"Cantrip",s.range||"—",hit,die+" "+(s.dmgType||""),(s.save?"Save: "+capital(s.save):"")+(s.conc?" · Conc.":""));
      });
      state.spells.spells.forEach(function(k){  // leveled damage/attack spells
        var s=spellByKey(k);if(!s||!s.dmg||(!s.atk&&!s.save))return;
        var hit=s.atk?modStr(spAtk):"DC "+spDC;
        rows+=row(s.name,ordinal(s.level)+"-level spell",s.range||"—",hit,s.dmg+" "+(s.dmgType||""),(s.save?"Save: "+capital(s.save):"")+(s.conc?" · Conc.":""));
      });
    }
    // attacks per action (Extra Attack)
    var extra=0;(state.fdata&&state.fdata.classFeatures||[]).forEach(function(f){if(f.level<=state.level&&/Extra Attack/i.test(f.name))extra++;});
    var apa=1+extra;
    var html='<div class="apa">Attacks per Action: <b>'+apa+"</b></div>";
    html+='<table class="atk-table"><thead><tr><th>Attack</th><th>Range</th><th>Hit / DC</th><th>Damage</th><th>Notes</th></tr></thead><tbody>'+rows+"</tbody></table>";
    var ae=actionEconomy();
    if(ae.action.length)html+='<div class="ae-sec"><div class="ae-h">Other Actions</div>'+sheetCollapse(ae.action,"oa")+"</div>";
    if(ae.bonus.length)html+='<div class="ae-sec"><div class="ae-h">Bonus Actions</div>'+sheetCollapse(ae.bonus,"ba")+"</div>";
    if(ae.reaction.length)html+='<div class="ae-sec"><div class="ae-h">Reactions</div>'+sheetCollapse(ae.reaction,"ra")+"</div>";
    html+='<div class="combat-actions"><div class="ca-h">Actions in Combat</div>Attack · Dash · Disengage · Dodge · Grapple · Help · Hide · Influence · Magic · Ready · Search · Shove · Utilize</div>';
    return html;
  }
  function deathSavesHtml(){
    var s=state.sheet.deathSucc||0,f=state.sheet.deathFail||0;
    function dots(kind,n){var h="";for(var i=0;i<3;i++)h+='<span class="death-dot '+kind+(i<n?" on":"")+'" data-kind="'+kind+'" data-i="'+i+'"></span>';return h;}
    var note=(state.sheet.hpEdited&&state.sheet.hpCurrent<=0)?'<div class="death-note">You are at 0 HP — roll death saves!</div>':"";
    return note+'<div class="death-row"><span class="death-lbl">Successes</span>'+dots("succ",s)+'</div><div class="death-row"><span class="death-lbl">Failures</span>'+dots("fail",f)+"</div>";
  }
  function spellSlotsHtml(info){
    var sl=info&&info.sc.slots,html="";
    function line(lv,n,lbl){var pips="";for(var i=0;i<n;i++){var k="slot:"+lv+":"+i;pips+='<span class="pip'+(state.sheet.res[k]?" used":"")+'" data-k="'+k+'"></span>';}return '<div class="slot-line"><span class="slot-lvl">'+lbl+'</span><div class="pips">'+pips+"</div></div>";}
    if(sl&&sl.type==="slots"){var row=sl.rows[state.level-1]||[];for(var L=1;L<=9;L++){if(row[L-1])html+=line(L,row[L-1],"Lvl "+L);}}
    else if(sl&&sl.type==="pact"){var pc=sl.count[state.level-1]||0,plv=sl.level[state.level-1]||0;if(pc)html+=line(plv,pc,"Lvl "+plv+" (Pact)");}
    return html;
  }
  function renderInvResults(){
    var box=$("invResults");if(!box)return;
    var q=(state.sheet.invQ||"").toLowerCase();
    if(!q){box.innerHTML="";return;}
    var full=(window.CC_ITEMS||[]).filter(function(it){return itemAllowed(it)&&it.name.toLowerCase().indexOf(q)>=0;});
    var list=full.slice(0,150);
    var html=list.length?list.map(function(it){
      var hasDesc=it.entries&&it.entries.length;
      var desc=hasDesc?'<div class="inv-desc">'+it.entries.map(renderEntry).join("")+"</div>":"";
      return '<div class="inv-res-item"><div class="inv-res-row"><span class="res-name-click">'+esc(it.name)+(hasDesc?' <span class="inv-chev">&#9662;</span>':"")+' <span class="meta">'+esc(it.cat+(it.rarity&&it.rarity!=="none"?" · "+it.rarity:""))+" · "+srcTag(it.source)+'</span></span><button class="add sh-additem" data-name="'+esc(it.name)+'" data-source="'+esc(it.source)+'">ADD</button></div>'+desc+"</div>";
    }).join(""):'<div class="results-note">No matches.</div>';
    if(full.length>list.length)html+='<div class="results-note">Showing '+list.length+' of '+full.length+' — refine your search.</div>';
    box.innerHTML=html;
    Array.prototype.forEach.call(box.querySelectorAll(".sh-additem"),function(b){b.addEventListener("click",function(){var it=(window.CC_ITEMS||[]).filter(function(x){return x.name===b.getAttribute("data-name")&&x.source===b.getAttribute("data-source");})[0];if(it){addItemObj(it);render();}});});
    Array.prototype.forEach.call(box.querySelectorAll(".res-name-click"),function(n){n.addEventListener("click",function(){n.parentNode.parentNode.classList.toggle("open");});});
  }
  function renderSheet(){
    var host=$("sheetPanel");if(!host)return;
    if(!state.className){host.innerHTML='<p class="sec-note">Pick a class (step 1) to build the sheet.</p>';return;}
    if(!state.fdata){host.innerHTML='<p class="sec-note">Loading class data…</p>';return;}
    try{renderSheetInner(host);}
    catch(e){host.innerHTML='<div class="sheet-card"><h3>Sheet error (please report this text)</h3><div class="cbody"><pre style="white-space:pre-wrap;font-size:12px">'+esc((e&&e.stack)||(e&&e.message)||String(e))+"</pre></div></div>";}
  }
  function renderSheetInner(host){
    var prof=profBonus(),ac=computeAC(),init=abMod(totalScore("Dexterity"));
    var race=currentRace(),lin=race?currentLineage(race):null,mhp=maxHP();
    // current HP tracks max until the player explicitly edits it
    if(!state.sheet.hpEdited)state.sheet.hpCurrent=mhp;
    var sub=((race?race.name+(lin?" ("+lin.name+")":""):"")+" "+state.className+" "+state.level).trim();

    var html='<div class="sheet-head"><div class="sheet-portrait" id="sheetPortrait">'+(state.portrait?'<img src="'+state.portrait+'">':"&#9670;")+'</div><div><div class="sheet-name">'+esc(state.name||"Unnamed")+'</div><div class="sheet-sub">'+esc(sub)+"</div></div>"+
      '<div class="sheet-top">'+topStat("+"+prof,"Prof Bonus",profWhy())+topStat(esc(speedText()),"Speed",speedWhy())+topStat(modStr(init),"Initiative",initWhy())+acStatHtml(ac)+
      '<div class="top-stat insp-box" id="inspBox"><div class="tv">'+(state.sheet.inspiration?"&#9733;":"&#9734;")+'</div><div class="tl">Inspiration</div></div>'+
      '<div class="top-stat sheet-hp"><div class="tv"><input type="number" id="hpCur" value="'+esc(state.sheet.hpCurrent)+'"> / '+(mhp==null?"—":mhp)+'</div><div class="tl">Hit Points</div></div>'+
      '<div class="top-stat"><div class="tv"><input type="number" id="hpTemp" class="stat-inp" value="'+esc(state.sheet.hpTemp||"")+'"></div><div class="tl">Temp HP</div></div>'+
      '<div class="top-stat"><div class="tv"><input type="number" id="xpInput" class="stat-inp xp-inp" value="'+esc(state.sheet.xp||"")+'"></div><div class="tl">XP</div></div></div></div>'+
      '<div class="ac-edit'+(state.sheet.acEditOpen?"":" hidden")+'" id="acEditRow">'+
        '<span class="ac-edit-lbl">Customise Armor Class</span>'+
        '<label>Other modifier <input type="number" id="acOther" value="'+esc(state.sheet.acOther||"")+'" placeholder="0"></label>'+
        '<label>Override total <input type="number" id="acOverride" value="'+esc(state.sheet.acOverride||"")+'" placeholder="auto"></label>'+
        '<button class="btn" id="acApply">Apply</button>'+
        '<button class="btn ghost" id="acReset">Reset</button>'+
        '<button class="btn ghost" id="acClose">Close</button>'+
        '<span class="res-sub" id="acWhy">'+esc(acBreakdown())+'</span>'+
      '</div>';

    // LEFT
    var abilCells=ABILITIES.map(function(a){var t=totalScore(a);return '<div class="abil-cell"><div class="aname">'+ABIL_ABBR[a]+'</div><div class="amod">'+modStr(abMod(t))+'</div><div class="ascore">'+t+"</div></div>";}).join("");
    var sp=savingProfs();
    var saveRows=ABILITIES.map(function(a){var m=abMod(totalScore(a))+(sp[a]?prof:0);return '<div class="line-row"><span class="dot'+(sp[a]?" on":"")+'"></span><span class="ab">'+ABIL_ABBR[a]+'</span><span>'+a+'</span><span class="lv">'+modStr(m)+"</span></div>";}).join("");
    var senses=(lin&&lin.senses&&lin.senses.length)?lin.senses:(race?race.senses:[]);
    var fd=state.fdata,pf=fd.proficiencies||{},langs=languagesAll();
    var langChips=(state.customLanguages||[]).map(function(l,i){return '<span class="lang-chip">'+esc(l)+' <span class="lang-x" data-i="'+i+'">&times;</span></span>';}).join("");
    var profBody='<div class="prof-blk"><div class="pl">Armor</div>'+renderTags(pf.armor||"None")+'</div><div class="prof-blk"><div class="pl">Weapons</div>'+renderTags(pf.weapons||"None")+'</div><div class="prof-blk"><div class="pl">Tools</div>'+renderTags(pf.tools||"None")+'</div>'+
      '<div class="prof-blk"><div class="pl">Languages</div>'+esc(langs.join(", ")||"—")+
      '<div class="lang-edit">'+langChips+'<div class="lang-add"><input type="text" id="custLang" placeholder="Add a language…"><button class="btn" id="addLang">Add</button></div></div></div>';
    var left=shCard("Ability Scores",'<div class="abil-block">'+abilCells+"</div>")+shCard("Saving Throws",saveRows)+shCard("Senses",senses.length?senses.join("<br>"):"Normal vision")+shCard("Proficiencies & Languages",profBody);

    // MIDDLE: skills + passives
    var ps=proficientSkills();
    var skillRows=Object.keys(SKILL_ABILITY).sort().map(function(sk){var ab=SKILL_ABILITY[sk],m=abMod(totalScore(ab))+(ps[sk]?prof:0);return '<div class="line-row"><span class="dot'+(ps[sk]?" on":"")+'"></span><span class="ab">'+ABIL_ABBR[ab]+'</span><span>'+sk+'</span><span class="lv">'+modStr(m)+"</span></div>";}).join("");
    function passive(sk){return 10+abMod(totalScore(SKILL_ABILITY[sk]))+(ps[sk]?prof:0);}
    var passBody='<div class="passive-row"><span>Passive Perception</span><b>'+passive("Perception")+'</b></div><div class="passive-row"><span>Passive Investigation</span><b>'+passive("Investigation")+'</b></div><div class="passive-row"><span>Passive Insight</span><b>'+passive("Insight")+"</b></div>";
    var mid=shCard("Skills",skillRows)+shCard("Passive Senses",passBody);

    // RIGHT: resources, attacks, spells, inventory, features, background
    var res=(window.CC_RESOURCES&&window.CC_RESOURCES[state.slug])||[];
    var resBody=res.map(function(r){var n=r.values[state.level-1]||0;if(!n)return "";var pips="";for(var i=0;i<n;i++){var k=r.name+":"+i;pips+='<span class="pip'+(state.sheet.res[k]?" used":"")+'" data-k="'+esc(k)+'"></span>';}return '<div style="margin-bottom:10px"><div class="res-name">'+esc(r.name)+' <span class="res-sub">('+n+')</span></div><div class="pips">'+pips+"</div></div>";}).join("");
    var cRes=shCard("Class Resources",resBody);
    // actions (weapon attacks, attack cantrips, unarmed, actions in combat)
    var inv=state.equipment.inventory;
    var cAtk=shCard("Actions",actionsCardHtml());
    // spells
    var info=spellInfo(),spBody="";
    if(info){
      // slot counts are shown in the Spell Slots card above, so they are not repeated here
      if(state.spells.cantrips.length)spBody+='<div class="spell-lvl-h">Cantrips</div>'+sheetCollapse(spellItems(state.spells.cantrips),"sc");
      var byLvl={};state.spells.spells.forEach(function(k){var s=spellByKey(k);if(s){(byLvl[s.level]=byLvl[s.level]||[]).push(k);}});
      Object.keys(byLvl).sort().forEach(function(lv){spBody+='<div class="spell-lvl-h">Level '+lv+'</div>'+sheetCollapse(spellItems(byLvl[lv]),"s"+lv);});
      spBody+='<div class="res-sub" style="margin-top:6px">DC '+(8+prof+abMod(totalScore(info.ability)))+" · attack "+modStr(prof+abMod(totalScore(info.ability)))+"</div>";
    }
    // racial / innate spells (from species/lineage), shown even for non-casters
    var rsp=[];if(race)rsp=rsp.concat(race.spells||[]);if(lin)rsp=rsp.concat(lin.spells||[]);
    if(rsp.length){
      var rk=[],rseen={};rsp.forEach(function(sp){var s=spellByName(sp.name);if(s&&!rseen[s.name]){rseen[s.name]=1;rk.push(s.name+"|"+s.source);}});
      if(rk.length)spBody+='<div class="spell-lvl-h">Racial / Innate</div>'+sheetCollapse(spellItems(rk),"rc");
    }
    var cSpells=shCard("Spells",spBody);
    var cSlots=shCard("Spell Slots",spellSlotsHtml(info));
    // currency (editable)
    var c=state.equipment.currency,coinDefs=[["pp","PP"],["gp","GP"],["ep","EP"],["sp","SP"],["cp","CP"]];
    var curBody='<div class="cur-inline">'+coinDefs.map(function(k){return '<label class="cur-cell">'+k[1]+'<input type="number" min="0" class="sh-cur" data-k="'+k[0]+'" value="'+(c[k[0]]||0)+'"></label>';}).join("")+'</div><div class="res-sub" style="margin-top:6px">Total: <b id="shGp">'+(Math.round(currencyGP()*100)/100)+'</b> gp</div>';
    var cCur=shCard("Currency",curBody);
    // inventory (editable + attunement) — drop stale attunements on items that can't be attuned
    inv.forEach(function(it){if(it.attuned&&!itemAttune(it))it.attuned=false;});
    // only one body armour can be worn at a time; drop extras (e.g. from an older save)
    var wornBody=false;
    inv.forEach(function(it){
      if(!it.equipped)return;
      var a=resolveArmor(it);
      if(!a||a.armorKind==="shield")return;
      if(wornBody)it.equipped=false;else wornBody=true;
    });
    var invBody='<div class="res-sub" style="margin-bottom:8px">Attunement: <b>'+attunedCount()+' / 3</b></div>';
    if(inv.length){
      invBody+=inv.map(function(it,i){
        var att=itemAttune(it);
        var badge=(att&&it.attuned)?' <span class="attune-star">&#10022; attuned</span>':"";
        var info=itemInfo(it.name,it.source),hasDesc=info&&info.entries&&info.entries.length;
        var meta=it.cat+(it.dmg?" · "+it.dmg+" "+(it.dmgType||""):"")+(it.ac&&it.armorKind!=="shield"?" · AC "+it.ac:"")+(it.armorKind==="shield"?" · +"+(it.ac||2)+" AC":"")+(it.rarity&&it.rarity!=="none"?" · "+it.rarity:"")+(att?" · "+attuneNote(att):"");
        var qb=(it.qty>1?'<span class="qty-badge">&times;'+it.qty+"</span> ":"");
        var ctrl='<input type="number" min="1" class="sh-qty" data-i="'+i+'" title="Quantity" value="'+(it.qty||1)+'">';
        var ra=resolveArmor(it);
        if(ra||it.cat==="Weapon"){var lbl=ra?(it.equipped?"Worn":"Wear"):(it.equipped?"Wielding":"Wield");ctrl+='<button class="equip-btn sh-equip'+(it.equipped?" on":"")+'" data-i="'+i+'">'+lbl+"</button>";}
        if(att)ctrl+='<button class="equip-btn sh-attune'+(it.attuned?" on":"")+'" data-i="'+i+'" title="'+esc(attuneNote(att))+'">'+(it.attuned?"Attuned":"Attune")+"</button>";
        ctrl+='<button class="rm-btn sh-rm" data-i="'+i+'">&times;</button>';
        var desc=hasDesc?'<div class="inv-desc">'+info.entries.map(renderEntry).join("")+"</div>":"";
        // magic weapon variants (Frost Brand, +1 Weapon, ...) need a base weapon to become an attack
        var basePick="";
        if(isVariantWeapon(it)){
          var reqs=it.requires||(info||{}).requires,pool=baseWeaponsFor(reqs);
          basePick='<div class="base-pick">Applies to: <select class="sh-base" data-i="'+i+'"><option value="">— choose a base weapon —</option>'+
            pool.map(function(b){return '<option value="'+esc(b.name)+'"'+(it.base===b.name?" selected":"")+'>'+esc(b.name+" ("+b.dmg+" "+dmgAbbr(b.dmgType)+")")+"</option>";}).join("")+"</select></div>";
        }else if(isVariantArmor(it)){
          var apool=baseArmorsFor(it);
          basePick='<div class="base-pick">Applies to: <select class="sh-base" data-i="'+i+'"><option value="">— choose base armour —</option>'+
            apool.map(function(b){return '<option value="'+esc(b.name)+'"'+(it.base===b.name?" selected":"")+'>'+esc(b.name+" (AC "+b.ac+", "+b.armorKind+")")+"</option>";}).join("")+"</select></div>";
        }
        return '<div class="inv-item'+(hasDesc?" has-desc":"")+'"><div class="inv-row"><div class="inv-main" data-i="'+i+'"><div class="nm">'+qb+esc(it.name)+badge+(hasDesc?' <span class="inv-chev">&#9662;</span>':"")+'</div><div class="meta">'+esc(meta)+(it.source?" · "+srcTag(it.source):"")+'</div></div><div class="ctrl">'+ctrl+"</div></div>"+basePick+desc+"</div>";
      }).join("");
    }else invBody+='<span class="res-sub">No items yet.</span>';
    invBody+='<div class="hr" style="margin:14px 0 10px"></div><div class="res-sub" style="margin-bottom:6px"><b>Add items</b></div>';
    invBody+='<input type="text" id="invSearch" placeholder="Search all items…" value="'+esc(state.sheet.invQ||"")+'"><div id="invResults" class="inv-results"></div>';
    invBody+='<div class="lang-add" style="margin:8px 0"><input type="text" id="invCustom" placeholder="Add a custom item…"><button class="btn" id="addCustomItem">Add</button></div>';
    var cInv=shCard("Inventory",invBody);
    // features & traits (expandable, with descriptions + the player's choices)
    var featItems=[],seenCh={};
    (fd.classFeatures||[]).forEach(function(f){
      if(f.level>state.level)return;
      var isGroup=fd.optionLists&&fd.optionLists[f.name]&&f.name!=="Ability Score Improvement";
      if(isGroup){if(seenCh[f.name])return;seenCh[f.name]=1;}  // show a repeating choice feature (e.g. Metamagic) once
      var nm=f.name+(f.optional?" (optional)":"")+(f.name==="Ability Score Improvement"?" ("+ordinal(f.level)+" level)":"");
      featItems.push({name:nm,entries:featEntriesWithChoice(f)});
    });
    var chosen=state.subclassName?(fd.subclasses||[]).filter(function(s){return s.name===state.subclassName;})[0]:null;
    if(chosen)(chosen.features||[]).forEach(function(f){if(f.level<=state.level)featItems.push({name:f.name+" ["+state.subclassName+"]",entries:featEntriesWithChoice(f)});});
    if(race)(race.traits||[]).forEach(function(t){featItems.push({name:t.name,entries:t.entries});});
    if(lin)(lin.traits||[]).forEach(function(t){featItems.push({name:t.name,entries:t.entries});});
    var cFeat=shCard("Features & Traits",sheetCollapse(featItems,"f"));
    // background
    var bg=currentBg(),det=state.details,bgBody="";
    if(state.bgIsCustom)bgBody+="<b>"+esc(state.bgCustomName||"Custom Background")+"</b>";
    else if(bg)bgBody+="<b>"+esc(bg.name)+"</b>"+(bg.feature?" — "+esc(bg.feature.name):"");
    bgBody+='<div class="passive-row"><span>Alignment</span><b>'+esc(det.alignment||"—")+'</b></div><div class="passive-row"><span>Faith</span><b>'+esc(det.faith||"—")+'</b></div><div class="passive-row"><span>Lifestyle</span><b>'+esc(det.lifestyle||"—")+"</b></div>";
    var cBg=shCard("Background & Details",bgBody);
    var cDeath=shCard("Death Saves",deathSavesHtml());
    var hdpips="";for(var hi=0;hi<state.level;hi++){var hk="hd:"+hi;hdpips+='<span class="pip'+(state.sheet.res[hk]?" used":"")+'" data-k="'+hk+'"></span>';}
    var srNames=[],resList=(window.CC_RESOURCES&&window.CC_RESOURCES[state.slug])||[];
    var srSet={"Ki Points":1,"Focus Points":1,"Channel Divinity":1,"Wild Shape":1};
    if(state.level>=5)srSet["Bardic Inspiration"]=1;
    resList.forEach(function(r){if(srSet[r.name]&&(r.values[state.level-1]||0))srNames.push(r.name);});
    if(info&&info.sc.slots&&info.sc.slots.type==="pact")srNames.push("Pact Magic slots");
    var restNote='<div class="res-sub" style="margin-top:8px"><b>Short rest:</b> '+(srNames.length?esc(srNames.join(", ")):"nothing to regain (spend hit dice below)")+
      '<br><b>Long rest:</b> full HP, all slots &amp; resources, half your hit dice</div>';
    var cRest=shCard("Rest & Hit Dice",'<div class="rest-btns"><button class="btn ghost" id="shortRest">Short Rest</button><button class="btn" id="longRest">Long Rest</button></div><div class="slot-line"><span class="slot-lvl">Hit Dice '+state.level+"d"+state.hdFaces+'</span><div class="pips">'+hdpips+"</div></div>"+restNote);

    host.innerHTML=html+'<div class="sheet-grid"><div>'+left+"</div><div>"+mid+"</div><div>"+cRes+cSlots+cSpells+"</div><div>"+cAtk+cCur+cInv+"</div><div>"+cRest+cDeath+cFeat+cBg+"</div></div>";
    var spx=host.querySelector("#sheetPortrait");if(spx)spx.addEventListener("click",function(){$("portraitFile").click();});
    var hc=host.querySelector("#hpCur");if(hc)hc.addEventListener("input",function(){state.sheet.hpEdited=true;state.sheet.hpCurrent=parseInt(hc.value,10)||0;});
    var ht=host.querySelector("#hpTemp");if(ht)ht.addEventListener("input",function(){state.sheet.hpTemp=ht.value;});
    var xp=host.querySelector("#xpInput");if(xp)xp.addEventListener("input",function(){state.sheet.xp=xp.value;});
    var acS=host.querySelector("#acStat"),acRow=host.querySelector("#acEditRow");
    if(acS&&acRow)acS.addEventListener("click",function(){
      state.sheet.acEditOpen=!state.sheet.acEditOpen;
      acRow.classList.toggle("hidden",!state.sheet.acEditOpen);
    });
    var acO=host.querySelector("#acOther"),acV=host.querySelector("#acOverride");
    function stash(){                                  // record without re-rendering
      if(acO)state.sheet.acOther=acO.value;
      if(acV)state.sheet.acOverride=acV.value;
    }
    function apply(){stash();state.sheet.acEditOpen=true;render();}
    if(acO)acO.addEventListener("input",stash);
    if(acV)acV.addEventListener("input",stash);
    function onEnter(e){if(e.keyCode===13){e.preventDefault();apply();}}
    if(acO)acO.addEventListener("keydown",onEnter);
    if(acV)acV.addEventListener("keydown",onEnter);
    var acA=host.querySelector("#acApply");
    if(acA)acA.addEventListener("click",apply);
    var acR=host.querySelector("#acReset");
    if(acR)acR.addEventListener("click",function(){state.sheet.acOther="";state.sheet.acOverride="";state.sheet.acEditOpen=true;render();});
    var acC=host.querySelector("#acClose");
    if(acC)acC.addEventListener("click",function(){stash();state.sheet.acEditOpen=false;render();});
    var lr=host.querySelector("#longRest");if(lr)lr.addEventListener("click",longRest);
    var sr=host.querySelector("#shortRest");if(sr)sr.addEventListener("click",shortRest);
    var ib=host.querySelector("#inspBox");if(ib)ib.addEventListener("click",function(){state.sheet.inspiration=!state.sheet.inspiration;render();});
    Array.prototype.forEach.call(host.querySelectorAll(".death-dot"),function(d){d.addEventListener("click",function(){
      var kind=d.getAttribute("kind")||d.getAttribute("data-kind"),i=+d.getAttribute("data-i"),key=kind==="succ"?"deathSucc":"deathFail",cur=state.sheet[key]||0;
      state.sheet[key]=(i<cur)?i:i+1;render();
    });});
    Array.prototype.forEach.call(host.querySelectorAll(".pip"),function(p){p.addEventListener("click",function(){var k=p.getAttribute("data-k");state.sheet.res[k]=!state.sheet.res[k];p.classList.toggle("used");});});
    Array.prototype.forEach.call(host.querySelectorAll(".sc-h"),function(h){h.addEventListener("click",function(){h.parentNode.classList.toggle("open");});});
    // custom languages
    var cl=host.querySelector("#custLang"),al=host.querySelector("#addLang");
    function addLang(){var v=cl&&cl.value.trim();if(v){state.customLanguages.push(v);render();}}
    if(al)al.addEventListener("click",addLang);
    if(cl)cl.addEventListener("keydown",function(e){if(e.keyCode===13){e.preventDefault();addLang();}});
    Array.prototype.forEach.call(host.querySelectorAll(".lang-x"),function(x){x.addEventListener("click",function(){state.customLanguages.splice(+x.getAttribute("data-i"),1);render();});});
    // currency
    Array.prototype.forEach.call(host.querySelectorAll(".sh-cur"),function(inp){inp.addEventListener("input",function(){state.equipment.currency[inp.getAttribute("data-k")]=parseInt(inp.value,10)||0;var g=host.querySelector("#shGp");if(g)g.innerHTML=Math.round(currencyGP()*100)/100;});});
    // inventory add / custom / controls
    var is=host.querySelector("#invSearch");if(is)is.addEventListener("input",function(){state.sheet.invQ=is.value;renderInvResults();});
    var ic=host.querySelector("#invCustom"),aci=host.querySelector("#addCustomItem");
    function addCustom(){var v=ic&&ic.value.trim();if(v){addItemObj({name:v,cat:"Other Gear",generic:true});render();}}
    if(aci)aci.addEventListener("click",addCustom);
    if(ic)ic.addEventListener("keydown",function(e){if(e.keyCode===13){e.preventDefault();addCustom();}});
    Array.prototype.forEach.call(host.querySelectorAll(".sh-qty"),function(inp){inp.addEventListener("change",function(){state.equipment.inventory[+inp.getAttribute("data-i")].qty=parseInt(inp.value,10)||1;});});
    Array.prototype.forEach.call(host.querySelectorAll(".sh-equip"),function(b){b.addEventListener("click",function(){var it=state.equipment.inventory[+b.getAttribute("data-i")];var rk=resolveArmor(it);
      if(!it.equipped&&rk&&rk.armorKind!=="shield")state.equipment.inventory.forEach(function(x){var xk=resolveArmor(x);if(xk&&xk.armorKind!=="shield")x.equipped=false;});it.equipped=!it.equipped;render();});});
    Array.prototype.forEach.call(host.querySelectorAll(".sh-attune"),function(b){b.addEventListener("click",function(){
      var it=state.equipment.inventory[+b.getAttribute("data-i")];
      if(!itemAttune(it))return;                                  // not an attunable item
      if(!it.attuned&&attunedCount()>=3){alert("You can be attuned to at most 3 items at a time.");return;}
      it.attuned=!it.attuned;render();
    });});
    Array.prototype.forEach.call(host.querySelectorAll(".sh-base"),function(s){
      s.addEventListener("click",function(e){e.stopPropagation();});
      s.addEventListener("change",function(){state.equipment.inventory[+s.getAttribute("data-i")].base=s.value||null;render();});
    });
    Array.prototype.forEach.call(host.querySelectorAll(".sh-rm"),function(b){b.addEventListener("click",function(){state.equipment.inventory.splice(+b.getAttribute("data-i"),1);render();});});
    Array.prototype.forEach.call(host.querySelectorAll(".inv-item.has-desc .inv-main"),function(m){m.addEventListener("click",function(){m.parentNode.parentNode.classList.toggle("open");});});
    renderInvResults();
  }

  /* ---------- save / load / export ---------- */
  var SAVE_KEYS=["edition","name","className","source","slug","hdFaces","level","manualHp","subclassName","choices","background","bgIsCustom","bgCustomName","bgCustomDesc","bgChoices","details","race","raceLineage","raceChoices","abilities","equipment","spells","customLanguages","portrait","sheet"];
  function processPortrait(file){
    var rd=new FileReader();
    rd.onload=function(){
      var img=new Image();
      img.onload=function(){
        var s=Math.min(1,256/Math.max(img.width,img.height));
        var w=Math.max(1,Math.round(img.width*s)),h=Math.max(1,Math.round(img.height*s));
        var c=document.createElement("canvas");c.width=w;c.height=h;
        c.getContext("2d").drawImage(img,0,0,w,h);
        try{state.portrait=c.toDataURL("image/png");}catch(e){alert("Could not read that image.");return;}
        render();
      };
      img.onerror=function(){alert("That file isn't a readable image.");};
      img.src=rd.result;
    };
    rd.readAsDataURL(file);
  }
  function serializeChar(){var o={_app:"dnd-cc",_v:1};SAVE_KEYS.forEach(function(k){o[k]=state[k];});return o;}
  function downloadBlob(data,filename,mime){
    var blob=new Blob([data],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=filename;document.body.appendChild(a);a.click();
    setTimeout(function(){URL.revokeObjectURL(url);if(a.parentNode)a.parentNode.removeChild(a);},150);
  }
  function saveChar(){
    if(!state.className){alert("Build a character first (pick a class).");return;}
    var json=JSON.stringify(serializeChar(),null,2);
    var fname=(state.name||"character").replace(/[^\w \-]/g,"")+".json";
    if(window.showSaveFilePicker){  // modern browsers: real "Save As" dialog
      window.showSaveFilePicker({suggestedName:fname,types:[{description:"Character file",accept:{"application/json":[".json"]}}]})
        .then(function(h){return h.createWritable();})
        .then(function(w){return w.write(json).then(function(){return w.close();});})
        ["catch"](function(e){if(!e||e.name!=="AbortError")downloadBlob(json,fname,"application/json");});
    }else downloadBlob(json,fname,"application/json");
  }
  function loadCharObj(o){
    if(!o||o._app!=="dnd-cc"){alert("That doesn't look like a saved character file.");return;}
    SAVE_KEYS.forEach(function(k){if(o[k]!==undefined)state[k]=o[k];});
    state.fdata=null;state.openPanels={};
    $("editionTag").textContent=editionLabel(state.edition);
    populateClasses();populateBackgrounds();populateRaces();
    $("charName").value=state.name||"";
    $("classSelect").value=state.slug||"";
    populateLevels();$("levelSelect").value=state.level;
    $("featTitle").textContent=state.className?state.className+" Features":"Class Features";
    if(state.slug)loadFeatureData(state.slug,function(fd){state.fdata=fd;showBuild("sheet");});
    else showBuild("class");
  }
  function loadCharFile(file){
    var rd=new FileReader();
    rd.onload=function(){try{loadCharObj(JSON.parse(rd.result));}catch(e){alert("Could not read file: "+(e.message||e));}};
    rd.readAsText(file);
  }

  function base64ToBytes(b64){var bin=atob(b64),arr=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);return arr;}
  function featureNamesList(){
    var fd=state.fdata,out=[];if(!fd)return out;
    var race=currentRace(),lin=race?currentLineage(race):null;
    (fd.classFeatures||[]).forEach(function(f){if(f.level<=state.level)out.push(f.name);});
    var chosen=state.subclassName?(fd.subclasses||[]).filter(function(s){return s.name===state.subclassName;})[0]:null;
    if(chosen)(chosen.features||[]).forEach(function(f){if(f.level<=state.level)out.push(f.name+" ["+state.subclassName+"]");});
    if(race)(race.traits||[]).forEach(function(t){out.push(t.name);});
    if(lin)(lin.traits||[]).forEach(function(t){out.push(t.name);});
    (fd.classFeatures||[]).forEach(function(f){if(f.name==="Ability Score Improvement"&&f.level<=state.level&&state.choices["asi:"+f.level+":mode"]==="feat"){var ft=state.choices["asi:"+f.level+":feat"];if(ft)out.push("Feat: "+ft);}});
    return out;
  }
  function fillPdfForm(form){
    var F=window.CC_PDF_FIELDS;
    function setT(name,val){try{form.getTextField(name).setText(val==null?"":String(val));}catch(e){}}
    function check(name){try{form.getCheckBox(name).check();}catch(e){}}
    var prof=profBonus(),race=currentRace(),lin=race?currentLineage(race):null;
    setT("CharacterName",state.name);
    setT("ClassLevel",state.className+" "+state.level+(state.subclassName?" ("+state.subclassName+")":""));
    setT("Background",state.bgIsCustom?state.bgCustomName:(currentBg()?currentBg().name:""));
    setT("Race ",race?race.name+(lin?" ("+lin.name+")":""):"");
    setT("Alignment",state.details.alignment);
    setT("XP",state.sheet.xp);setT("Inspiration",state.sheet.inspiration?"Yes":"");
    ABILITIES.forEach(function(a){var t=totalScore(a);setT(F.abilityFields[a],t);setT(F.abilityMods[a],modStr(abMod(t)));});
    var sp=savingProfs();
    ABILITIES.forEach(function(a){setT(F.saveFields[a],modStr(abMod(totalScore(a))+(sp[a]?prof:0)));if(sp[a])check(F.saveChecks[a]);});
    var ps=proficientSkills();
    for(var sk in F.skillFields){var ab=SKILL_ABILITY[sk];setT(F.skillFields[sk],modStr(abMod(totalScore(ab))+(ps[sk]?prof:0)));if(ps[sk])check(F.skillChecks[sk]);}
    setT("Passive",10+abMod(totalScore("Wisdom"))+(ps["Perception"]?prof:0));
    setT("ProfBonus","+"+prof);setT("AC",computeAC());setT("Initiative",modStr(abMod(totalScore("Dexterity"))));
    setT("Speed",speedText());
    var mhp=maxHP();setT("HPMax",mhp);setT("HPCurrent",state.sheet.hpEdited?state.sheet.hpCurrent:mhp);setT("HPTemp",state.sheet.hpTemp);
    setT("HDTotal",state.level+"d"+state.hdFaces);
    var pf=(state.fdata&&state.fdata.proficiencies)||{};
    setT("ProficienciesLang","Armor: "+plainTags(pf.armor||"None")+"\nWeapons: "+plainTags(pf.weapons||"None")+"\nTools: "+plainTags(pf.tools||"None")+"\nLanguages: "+languagesAll().join(", "));
    var best=Math.max(abMod(totalScore("Strength")),abMod(totalScore("Dexterity")));
    var wpns=state.equipment.inventory.filter(function(i){return i.equipped&&i.cat==="Weapon"&&i.dmg;});
    var wf=[["Wpn Name","Wpn1 AtkBonus","Wpn1 Damage"],["Wpn Name 2","Wpn2 AtkBonus ","Wpn2 Damage "],["Wpn Name 3","Wpn3 AtkBonus  ","Wpn3 Damage "]];
    for(var i=0;i<3&&i<wpns.length;i++){setT(wf[i][0],wpns[i].name);setT(wf[i][1],modStr(best+prof));setT(wf[i][2],wpns[i].dmg+"+"+best+(wpns[i].dmgType?" "+wpns[i].dmgType:""));}
    var c=state.equipment.currency;setT("CP",c.cp);setT("SP",c.sp);setT("EP",c.ep);setT("GP",c.gp);setT("PP",c.pp);
    setT("Equipment",state.equipment.inventory.map(function(it){return it.name+(it.qty>1?" x"+it.qty:"");}).join("\n"));
    var feats=featureNamesList();setT("Features and Traits",feats.join("\n"));setT("Feat+Traits",feats.join("\n"));
    var info=spellInfo();
    if(info){
      setT("Spellcasting Class 2",state.className);setT("SpellcastingAbility 2",F.abilityFields[info.ability]||info.ability);
      setT("SpellSaveDC  2",8+prof+abMod(totalScore(info.ability)));setT("SpellAtkBonus 2",modStr(prof+abMod(totalScore(info.ability))));
      var sl=info.sc.slots;
      if(sl&&sl.type==="slots"){var row=sl.rows[state.level-1]||[];for(var L=1;L<=9;L++)if(row[L-1])setT("SlotsTotal "+(18+L),row[L-1]);}
      else if(sl&&sl.type==="pact"){var pc=sl.count[state.level-1]||0,plv=sl.level[state.level-1]||0;if(pc)setT("SlotsTotal "+(18+plv),pc);}
      fillSpellNames(setT,"0",state.spells.cantrips.map(function(k){var s=spellByKey(k);return s?s.name:"";}));
      var byLvl={};state.spells.spells.forEach(function(k){var s=spellByKey(k);if(s)(byLvl[s.level]=byLvl[s.level]||[]).push(s.name);});
      for(var L2=1;L2<=9;L2++)if(byLvl[L2])fillSpellNames(setT,String(L2),byLvl[L2]);
    }
  }
  function fillSpellNames(setT,lvlKey,names){
    var fields=(window.CC_PDF_FIELDS.spellFields[lvlKey])||[];
    for(var i=0;i<names.length&&i<fields.length;i++)if(names[i])setT(fields[i],names[i]);
  }
  function exportPdf(){
    if(!window.PDFLib){alert("pdf-lib is missing.\n\nDownload pdf-lib.min.js into resources/ (see README).");return;}
    if(!window.CC_PDF_TEMPLATE){alert("No PDF sheet template found.\n\nSupply a form-fillable 5e sheet and run:\n  python tools/gen_pdf_template.py \"your-sheet.pdf\"");return;}
    if(!state.className){alert("Build a character first.");return;}
    var btn=$("btnPdf"),old=btn.textContent;btn.textContent="Building…";btn.disabled=true;
    function done(){btn.textContent=old;btn.disabled=false;}
    PDFLib.PDFDocument.load(base64ToBytes(window.CC_PDF_TEMPLATE)).then(function(doc){
      fillPdfForm(doc.getForm());
      try{doc.getForm().updateFieldAppearances();}catch(e){}
      if(state.portrait){
        return doc.embedPng(state.portrait).then(function(png){
          try{doc.getForm().getButton("CHARACTER IMAGE").setImage(png);}catch(e){}
          return doc.save();
        })["catch"](function(){return doc.save();});
      }
      return doc.save();
    }).then(function(out){
      downloadBlob(out,(state.name||"character").replace(/[^\w \-]/g,"")+".pdf","application/pdf");done();
    })["catch"](function(e){alert("PDF export failed: "+(e.message||e));done();});
  }

  function ordinal(n){var s=["th","st","nd","rd"],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0]);}

  /* ---------- events ---------- */
  document.querySelectorAll(".ed-card").forEach(function(card){
    card.addEventListener("click",function(){
      var ed=card.getAttribute("data-edition");
      resetCharacter();                      // always start an edition with a clean slate
      state.edition=ed;
      $("editionTag").textContent=editionLabel(ed);
      populateClasses();populateBackgrounds();populateRaces();
      showBuild();render();
    });
  });
  $("changeEdition").addEventListener("click",function(){
    resetCharacter();                       // "start over" must forget the loaded/built character
    $("stepsMenu").classList.remove("open");
    showEdition();
  });
  $("charName").addEventListener("input",function(e){state.name=e.target.value;});
  $("charPortrait").addEventListener("click",function(){$("portraitFile").click();});
  $("portraitFile").addEventListener("change",function(e){if(e.target.files&&e.target.files[0])processPortrait(e.target.files[0]);e.target.value="";});

  $("classSelect").addEventListener("change",function(e){
    var slug=e.target.value;
    if(!slug){state.className=null;state.slug=null;state.fdata=null;render();return;}
    var c=classesForEdition(state.edition).filter(function(x){return x.slug===slug;})[0];
    state.className=c.name;state.source=c.source;state.hdFaces=c.hdFaces;state.slug=slug;
    state.manualHp=null;state.subclassName=null;state.fdata=null;state.choices={};state.openPanels={};
    state.equipment.starting={};state.equipment.startingAdded=false;
    state.spells={cantrips:[],spells:[],levelFilter:"",q:""};
    state.sheet=freshSheet();
    populateLevels();
    $("featTitle").textContent=c.name+" Features";
    loadFeatureData(slug,function(fd){state.fdata=fd;render();});
    render();
  });
  $("levelSelect").addEventListener("change",function(e){
    var old=state.level;state.level=parseInt(e.target.value,10)||1;
    if(state.manualHp!=null&&state.hdFaces){
      var per=Math.floor(state.hdFaces/2)+1;
      state.manualHp=Math.max(1,state.manualHp+per*(state.level-old));
    }
    if(state.level<old)pruneChoices();
    pruneSpells();
    render();
  });

  $("manageHpBtn").addEventListener("click",function(){
    if(!state.className)return;
    var row=$("hpEditRow"),opening=row.classList.contains("hidden");
    row.classList.toggle("hidden");
    if(opening){$("hpInput").value=(state.manualHp!=null)?state.manualHp:autoHp(state.hdFaces,state.level);$("hpInput").focus();}
  });
  $("hpSave").addEventListener("click",function(){var v=parseInt($("hpInput").value,10);if(!isNaN(v)&&v>0)state.manualHp=v;$("hpEditRow").classList.add("hidden");render();});
  $("hpReset").addEventListener("click",function(){state.manualHp=null;$("hpEditRow").classList.add("hidden");render();});

  $("expandAll").addEventListener("click",function(){Array.prototype.forEach.call($("featureList").querySelectorAll(".feature"),function(f){f.classList.remove("collapsed");});});
  $("collapseAll").addEventListener("click",function(){Array.prototype.forEach.call($("featureList").querySelectorAll(".feature"),function(f){f.classList.add("collapsed");});});

  // wizard step navigation
  $("menuBtn").addEventListener("click",function(){$("stepsMenu").classList.toggle("open");});
  $("darkToggle").addEventListener("click",function(){state.sheet.dark=!state.sheet.dark;document.body.classList.toggle("dark",state.sheet.dark);this.innerHTML=state.sheet.dark?"☀":"🌙";});
  Array.prototype.forEach.call(document.querySelectorAll(".step"),function(b){b.addEventListener("click",function(){setStep(b.getAttribute("data-step"));});});
  $("toBackground").addEventListener("click",function(){setStep("background");});
  $("toClass").addEventListener("click",function(){setStep("class");});
  $("toSpecies").addEventListener("click",function(){setStep("species");});
  $("toBackground2").addEventListener("click",function(){setStep("background");});

  $("raceSelect").addEventListener("change",function(e){
    var v=e.target.value;state.raceChoices={};state.raceLineage=null;
    if(!v){state.race=null;}else{var p=v.split("|");state.race={name:p[0],source:p[1]};}
    render();
  });
  $("toAbilities").addEventListener("click",function(){setStep("abilities");});
  $("toSpecies2").addEventListener("click",function(){setStep("species");});
  $("toEquipment").addEventListener("click",function(){setStep("equipment");});
  $("toAbilities2").addEventListener("click",function(){setStep("abilities");});
  $("toSpells").addEventListener("click",function(){setStep("spells");});
  $("toEquipment2").addEventListener("click",function(){setStep("equipment");});
  $("toSheet").addEventListener("click",function(){setStep("sheet");});
  $("toSpells2").addEventListener("click",function(){setStep("spells");});
  $("btnSave").addEventListener("click",function(){$("stepsMenu").classList.remove("open");saveChar();});
  $("btnPdf").addEventListener("click",function(){$("stepsMenu").classList.remove("open");exportPdf();});
  $("fileLoad").addEventListener("change",function(e){if(e.target.files&&e.target.files[0])loadCharFile(e.target.files[0]);e.target.value="";});
  $("fileLoadStart").addEventListener("change",function(e){if(e.target.files&&e.target.files[0])loadCharFile(e.target.files[0]);e.target.value="";});
  $("abilityMethod").addEventListener("change",function(e){
    state.abilities.method=e.target.value;
    state.abilities.assign={};state.abilities.rolled=null;
    renderAbilities();
  });

  // background events
  $("bgSelect").addEventListener("change",function(e){
    var v=e.target.value;
    state.bgChoices={};
    if(v==="custom"){state.bgIsCustom=true;state.background=null;}
    else if(!v){state.bgIsCustom=false;state.background=null;}
    else{state.bgIsCustom=false;var p=v.split("|");state.background={name:p[0],source:p[1]};}
    render();
  });
  $("bgCustomName").addEventListener("input",function(e){state.bgCustomName=e.target.value;});
  $("bgCustomDesc").addEventListener("input",function(e){state.bgCustomDesc=e.target.value;});

  // The resources/data-*.js files are generated from a local 5etools mirror and are not
  // distributed with the source. Explain that instead of showing an empty, broken UI.
  function dataMissing(){
    return !(window.CC_CLASSES&&window.CC_CLASSES.length)||!(window.CC_SPELLS&&window.CC_SPELLS.length);
  }
  if(dataMissing()){
    var w=document.querySelector(".wrap");
    if(w)w.innerHTML='<div class="data-missing">'+
      '<h1>Game data not found</h1>'+
      '<p>This is the source-only copy of the Character Creator. The game data files '+
      '(<code>resources/data-*.js</code>) are generated from your own local '+
      '<a href="https://5e.tools" target="_blank" rel="noopener">5etools</a> data mirror and are '+
      'not redistributed here, because they contain Dungeons&nbsp;&amp;&nbsp;Dragons content '+
      'owned by Wizards of the Coast.</p>'+
      '<p>Get 5etools from <a href="https://5e.tools/index.html" target="_blank" rel="noopener">5e.tools</a>, '+
      'then point the generator at its <code>data</code> folder:</p>'+
      '<pre>python tools/regen_all.py "path/to/5etools/data"</pre>'+
      '<p>See the <code>README.md</code> for details, then reload this page.</p>'+
      '</div>';
    return;
  }
  populateLevels();showEdition();
})();
