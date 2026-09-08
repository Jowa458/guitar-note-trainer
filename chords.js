/* Chord practice: rooted, compact guitar voicings in the chosen CAGED region. */
const CHORD_GROUPS = [
  ['三和弦', [['','大三和弦',[0,4,7]],['m','小三和弦',[0,3,7]],['dim','減三和弦',[0,3,6]],['aug','增三和弦',[0,4,8]]]],
  ['七和弦', [['maj7','大七',[0,4,7,11]],['m7','小七',[0,3,7,10]],['7','屬七',[0,4,7,10]],['m7b5','半減七',[0,3,6,10]],['dim7','減七',[0,3,6,9]],['mMaj7','小大七',[0,3,7,11]]]],
  ['掛留與加音', [['sus2','掛二',[0,2,7]],['sus4','掛四',[0,5,7]],['7sus4','屬七掛四',[0,5,7,10]],['add9','加九',[0,4,7,2]],['madd9','小加九',[0,3,7,2]],['5','強力和弦',[0,7]]]],
  ['六和弦與延伸', [['6','大六',[0,4,7,9]],['m6','小六',[0,3,7,9]],['6/9','六九',[0,4,7,9,2]],['maj9','大九',[0,4,7,11,2]],['m9','小九',[0,3,7,10,2]],['9','屬九',[0,4,7,10,2]],['m11','小十一',[0,3,7,10,2,5]],['13','屬十三',[0,4,7,10,2,5,9]]]],
  ['變化屬和弦', [['7b9','屬七降九',[0,4,7,10,1]],['7#9','屬七升九',[0,4,7,10,3]],['7#5','屬七升五',[0,4,8,10]]]]
];
const CHORD_TYPES=CHORD_GROUPS.flatMap(([group,items])=>items.map(([symbol,label,tones])=>({id:symbol||'major',symbol,label,tones,group})));
// Explicit movable grips, expressed relative to the indicated root-string fret.
// null means mute; negative numbers are frets toward the headstock, not mute.
const CHORD_GRIPS = [
 [0,'major',[0,2,2,1,0,0]], [0,'m',[0,2,2,0,0,0]],
 [0,'7',[0,2,0,1,0,0]], [0,'maj7',[0,null,1,1,0,null]],
 [0,'m7',[0,null,0,0,0,null]], [0,'mMaj7',[0,null,1,0,0,null]],
 [0,'sus4',[0,2,2,2,0,0]], [0,'7sus4',[0,2,0,2,0,0]], [0,'5',[0,2,2,null,null,null]],
 [0,'6',[0,null,2,1,2,null]], [0,'m6',[0,null,2,0,2,null]],
 [0,'13',[0,null,0,1,2,null]], [0,'9',[0,null,0,1,0,2]],
 [0,'m9',[0,null,0,0,0,2]], [0,'maj9',[0,null,1,1,0,2]],
 [0,'7b9',[0,null,0,1,0,1]], [0,'7#9',[0,null,0,1,0,3]], [0,'7#5',[0,null,0,1,1,null]],
 [3,'major',[null,0,2,2,2,0]], [3,'m',[null,0,2,2,1,0]],
 [3,'7',[null,0,2,0,2,0]], [3,'maj7',[null,0,2,1,2,0]], [3,'m7',[null,0,2,0,1,0]],
 [3,'mMaj7',[null,0,2,1,1,0]], [3,'sus2',[null,0,2,2,0,0]], [3,'sus4',[null,0,2,2,3,0]],
 [3,'7sus4',[null,0,2,0,3,0]], [3,'5',[null,0,2,2,null,null]],
 [3,'m7b5',[null,0,1,0,1,null]], [2,'dim7',[null,0,-2,-1,-2,-1]],
 [3,'dim',[null,0,1,2,1,null]], [0,'madd9',[0,2,4,0,0,0]],
 [3,'m11',[null,0,0,0,1,null]],
 [2,'major',[null,0,-1,-3,-2,-3]], [2,'aug',[null,0,-1,-2,-2,null]],
 [2,'add9',[null,0,-1,-3,0,-3]], [2,'9',[null,0,-1,0,0,null]],
 [2,'6/9',[null,0,-1,-1,0,null]],
 [1,'major',[null,null,0,2,3,2]], [1,'m',[null,null,0,2,3,1]],
 [1,'7',[null,null,0,2,1,2]], [1,'maj7',[null,null,0,2,2,2]], [1,'m7',[null,null,0,2,1,1]],
 [1,'sus2',[null,null,0,2,3,0]], [1,'sus4',[null,null,0,2,3,3]],
 [4,'major',[0,-1,-3,-3,-3,null]]
];
const chordVoicingCache=new Map();
function chordVoicings(root,type,positionIndex){
  const cacheKey=[root,type.id,positionIndex].join(':');
  if(chordVoicingCache.has(cacheKey))return chordVoicingCache.get(cacheKey);
  const rootString=6-POSITIONS[positionIndex].rootString,results=[];
  for(const [pos,id,grip] of CHORD_GRIPS){if(pos!==positionIndex||id!==type.id)continue;
    for(let anchor=(root-OPEN_PITCH_CLASS[rootString]+12)%12;anchor<=15;anchor+=12){
      if(grip.some(f=>f!==null&&(anchor+f<0||anchor+f>19)))continue;
      const frets=grip.map(f=>f===null?-1:anchor+f),notes=frets.flatMap((f,s)=>f<0?[]:[{string:s,fret:f,midi:OPEN_MIDI[s]+f}]);
      const pcs=notes.map(n=>(n.midi-root+120)%12),omitted=type.tones.filter(t=>!pcs.includes(t));
      const optional=type.id==='13'?[7,2,5]:type.id==='m11'?[7,2]:[7];
      if(pcs.some(t=>!type.tones.includes(t))||omitted.some(t=>!optional.includes(t)))continue;
      if(notes.some(n=>n.midi>76))continue;
      results.push({notes,frets,anchor,positionIndex,omitted,low:Math.min(...notes.map(n=>n.fret)),high:Math.max(...notes.map(n=>n.fret))});
    }
  }
  chordVoicingCache.set(cacheKey,results);return results;
}

const CHORD_SCALE_IDS=['major','minor'];
const CHORD_FAMILIES=[['triads','三和弦',3],['sevenths','七和弦',4],['ninths','九和弦',5]];
function diatonicChords(pitch,scaleId,family){
  const scale=SCALES[scaleId],labels=scale.minor?MINOR_LABELS[pitch]:MAJOR_LABELS[pitch],count=CHORD_FAMILIES.find(f=>f[0]===family)?.[2];
  if(!count)return [];
  return labels.flatMap(label=>{
    const tones=spelledScale({label,pitch},scale);
    return tones.flatMap((rootTone,degree)=>{
      const tonesInChord=Array.from({length:count},(_,i)=>tones[(degree+2*i)%7]);
      const intervals=tonesInChord.map(n=>(n.pitch-rootTone.pitch+12)%12);
      const type=CHORD_TYPES.find(t=>t.tones.length===count&&t.tones.every(tone=>intervals.includes(tone)));
      return type?[{root:rootTone.pitch,rootLabel:rootTone.name,type,spellings:tonesInChord,degree:degree+1,contextId:label+':'+scaleId,contextLabel:label+' · '+scale.label}]:[];
    });
  });
}
function buildChordPool(options){
  const {diatonic,manual,keys,scales,families,manualRoots,manualTypes,positions}=options,pool=[];
  if(diatonic)for(const key of keys)for(const scale of scales)for(const family of families)
    for(const item of diatonicChords(key,scale,family))for(const positionIndex of positions){
      const voicings=chordVoicings(item.root,item.type,positionIndex);if(voicings.length)pool.push({...item,positionIndex,voicings});
    }
  const contexts=[...new Map(pool.map(q=>[q.contextId,{contextId:q.contextId,contextLabel:q.contextLabel}])).values()];
  if(!contexts.length)contexts.push({contextId:'manual',contextLabel:'自選和弦'});
  if(manual)for(const root of manualRoots)for(const id of manualTypes){
    const type=CHORD_TYPES.find(t=>t.id===id);if(!type)continue;
    for(const positionIndex of positions){const voicings=chordVoicings(root,type,positionIndex);if(!voicings.length)continue;
      for(const context of contexts)if(!pool.some(q=>q.contextId===context.contextId&&q.root===root&&q.type.id===id&&q.positionIndex===positionIndex))
        pool.push({root,type,positionIndex,voicings,...context,manual:true});
    }
  }
  return pool;
}
function chordsPerMeasure(){return 4/DURATION_BEATS[chValue('Rhythm')]}
const chordPage=document.createElement('section');chordPage.id='chordPage';chordPage.className='tab-page';chordPage.hidden=true;chordPage.setAttribute('role','tabpanel');chordPage.setAttribute('aria-labelledby','chordTabButton');
chordPage.innerHTML=`<section class="settings" aria-label="和弦練習設定">
  <fieldset><legend>和弦來源（可同時勾選）</legend><div id="chSources" class="multi-choice-grid"><label><input type="checkbox" value="diatonic" checked><span>順階和弦</span></label><label><input type="checkbox" value="manual"><span>加入自選和弦</span></label></div></fieldset>
  <details class="multi-select-panel" id="chManualRootsPanel"><summary>和弦根音（可複選）<span id="chManualRootSummary"></span></summary><div class="multi-choice-grid" id="chManualRoots"></div></details>
  <details class="multi-select-panel" id="chManualTypesPanel"><summary>自選和弦種類（分類複選）<span id="chManualTypeSummary"></span></summary><div id="chManualTypes"></div></details>
  <details class="multi-select-panel" id="chRootsPanel"><summary>調性（可複選）<span id="chRootSummary"></span></summary><div class="multi-choice-grid" id="chRoots"></div></details>
  <details class="multi-select-panel" id="chScalesPanel"><summary>音階（可複選）<span id="chScaleSummary"></span></summary><div class="multi-choice-grid" id="chScales"></div></details>\n  <details class="multi-select-panel" id="chTypesPanel"><summary>順階和弦類別（可複選）<span id="chTypeSummary"></span></summary><div id="chTypes"></div></details>
  <fieldset><legend>把位（可複選）</legend><div class="multi-choice-grid" id="chPositions"></div></fieldset>
  <div class="setting-grid"><label>出題方式<select id="chMode"><option value="musical">順暢換把（加權）</option><option value="random">純隨機</option></select></label><label>提示音色<select id="chTone"><option value="guitar">吉他</option><option value="eguitar">電吉他</option></select></label></div>
  <label class="range-label">速度 <output id="chBpmValue">80</output> BPM<input id="chBpm" type="range" min="40" max="180" value="80"></label>
  <input id="chBeats" type="hidden" value="4"><div class="setting-grid"><label>換和弦頻率<select id="chRhythm"><option value="w">每小節一次（全音符）</option><option value="h">每小節兩次（二分音符）</option></select></label></div>
  <fieldset class="sound-options"><legend>聲音與答案</legend><label><input type="checkbox" id="chClick" checked>節拍器</label><label><input type="checkbox" id="chSound">和弦提示音</label><label><input type="checkbox" id="chAnswer" checked>顯示答案</label></fieldset>
  <p class="hint" id="chSourceHint">依所選調性與音階自動產生順階和弦。同一小節維持同一調性／音階，下一小節可切換；僅出收錄的實用指法，省略音會註明，X 弦不彈。</p>
  <p id="chAvailability" role="status"></p>
</section><section class="practice"><div class="status"><span id="chCurrent"></span><span id="chBeat"></span></div><div class="beat-dots" id="chDots"></div><p>目前 2 小節 ｜ 預告 1 小節</p><div id="chCards" class="ch-cards"></div><div id="chScore" class="vex-score"></div><div class="transport"><button id="chStart">▶ 開始節拍</button><button id="chReset" class="secondary">↺ 重置到第一拍</button></div></section>`;
document.querySelector('main').append(chordPage);
document.querySelector('.app-tabs').insertAdjacentHTML('beforeend','<button id="chordTabButton" role="tab" aria-selected="false" aria-controls="chordPage">和弦練習</button>');
const ch={queue:[],index:0,sub:0,last:0,running:false,started:false,timer:null,token:0,pool:[]};
TONIC_CHOICES.forEach(([label,pitch])=>$('#chRoots').insertAdjacentHTML('beforeend',`<label><input type="checkbox" value="${pitch}" ${pitch===0?'checked':''}><span>${label}</span></label>`));
POSITIONS.forEach((p,i)=>$('#chPositions').insertAdjacentHTML('beforeend',`<label><input type="checkbox" value="${i}" ${i===0?'checked':''}><span>P${p.number}</span></label>`));
CHORD_SCALE_IDS.forEach(id=>$('#chScales').insertAdjacentHTML('beforeend',`<label><input type="checkbox" value="${id}" ${id==='major'?'checked':''}><span>${SCALES[id].label}</span></label>`));
CHORD_FAMILIES.forEach(([id,label])=>$('#chTypes').insertAdjacentHTML('beforeend',`<label><input type="checkbox" value="${id}" ${id==='triads'?'checked':''}><span>${label}</span></label>`));$('#chTypes').className='multi-choice-grid';
TONIC_CHOICES.forEach(([label,pitch])=>$('#chManualRoots').insertAdjacentHTML('beforeend',`<label><input type="checkbox" value="${pitch}" ${pitch===0?'checked':''}><span>${label}</span></label>`));
CHORD_GROUPS.forEach(([group,items])=>$('#chManualTypes').insertAdjacentHTML('beforeend',`<details class="multi-select-panel ch-family"><summary>${group}</summary><div class="multi-choice-grid">${items.map(([symbol,label])=>`<label><input type="checkbox" value="${symbol||'major'}" ${['','m','maj7','m7','7'].includes(symbol)?'checked':''}><span>${symbol||'maj'} · ${label}</span></label>`).join('')}</div></details>`));
const chValue=id=>id==='Source'?checkedValues('#chSources').join(','):$('#ch'+id).value,chChecked=id=>$('#ch'+id).checked;
const chordSettingsKey='guitar-chord-settings-v1';
function saveChords(){try{localStorage.setItem(chordSettingsKey,JSON.stringify({manualRoots:checkedValues('#chManualRoots'),manualTypes:checkedValues('#chManualTypes'),scales:checkedValues('#chScales'),roots:checkedValues('#chRoots'),types:checkedValues('#chTypes'),positions:checkedValues('#chPositions'),values:Object.fromEntries(['Source','Mode','Tone','Bpm','Beats','Rhythm'].map(id=>[id,chValue(id)])),checks:Object.fromEntries(['Click','Sound','Answer'].map(id=>[id,chChecked(id)])),open:[...chordPage.querySelectorAll('details')].map(d=>d.open),openById:Object.fromEntries([...chordPage.querySelectorAll('details[id]')].map(d=>[d.id,d.open]))}))}catch{}}
try{const s=JSON.parse(localStorage.getItem(chordSettingsKey));if(s){restoreChecks('#chManualRoots',s.manualRoots||s.roots);restoreChecks('#chManualTypes',s.manualTypes||s.types?.filter(id=>CHORD_TYPES.some(t=>t.id===id)));restoreChecks('#chRoots',s.roots);restoreChecks('#chTypes',s.types?.filter(id=>CHORD_FAMILIES.some(f=>f[0]===id)));restoreChecks('#chScales',s.scales);restoreChecks('#chPositions',s.positions);for(const [id,v] of Object.entries(s.values||{})){if(id==='Source'){restoreChecks('#chSources',String(v).split(','));continue}const el=$('#ch'+id);if(el&&id!=='Beats')el.value=v;}for(const [id,v] of Object.entries(s.checks||{}))$('#ch'+id).checked=v;chordPage.querySelectorAll('details').forEach((d,i)=>d.open=s.openById?.[d.id]??!!s.open?.[i])}}catch{}
function chordSpellings(root,type){
  const label=(type.symbol.startsWith('m')&&!type.symbol.startsWith('maj')?MINOR_LABELS[root][0]:MAJOR_LABELS[root][0]);
  const degrees=type.tones.map(t=>t===0?0:t===1||t===2?1:t===3?(type.id==='7#9'?1:2):t===4?2:t===5?3:t===6||t===7||t===8?4:t===9?(type.id==='dim7'?6:5):6);
  return spelledScale({label,pitch:root},{intervals:type.tones,degrees});
}
function chordOmission(q){const labels={7:'五音',2:'九音',5:'十一音'};return q.v.omitted.length?'省略 '+q.v.omitted.map(t=>labels[t]||t).join('、'):''}
function chordNotationKey(q,n){const tone=(q.spellings||chordSpellings(q.root,q.type)).find(t=>t.pitch===n.midi%12),acc=tone.accidental.split('').reduce((v,c)=>v+(c==='#'?1:-1),0);const octave=(n.midi-NATURAL[tone.letter]-acc)/12;return tone.name+'/'+octave}
function chordName(root,type){return (type.symbol.startsWith('m')&&!type.symbol.startsWith('maj')?MINOR_LABELS[root][0]:MAJOR_LABELS[root][0])+type.symbol}
// Compare actual fretboard locations, not root-string anchors or CAGED numbers.
function chordHandPosition(v){const stopped=v.frets.filter(f=>f>0).sort((a,b)=>a-b);return stopped.length?stopped[Math.floor((stopped.length-1)/2)]:0}
function chordMoveWeight(candidate,previous,history){
  const distance=Math.abs(chordHandPosition(candidate.v)-chordHandPosition(previous.v));
  const samePosition=candidate.positionIndex===previous.positionIndex;
  let repeatRun=0;for(let i=history.length-1;i>=0&&history[i].positionIndex===previous.positionIndex;i--)repeatRun++;
  // A held shape is allowed, but repeated stays progressively lose weight.
  let weight=distance<=1?1.1:distance<=3?1.3:distance<=5?.8:distance<=8?.4:.2;
  if(samePosition)weight*=.85*Math.pow(.5,Math.max(0,repeatRun-1));
  const held=candidate.v.frets.filter((f,s)=>f>=0&&f===previous.v.frets[s]).length;
  // A shared stopped/open string can remain in place, but must not dominate.
  weight*=1+Math.min(held,3)*.09;
  if(candidate.root===previous.root&&candidate.type.id===previous.type.id&&candidate.v.frets.every((f,s)=>f===previous.v.frets[s]))weight*=.4;
  return weight;
}
function fillChords(){while(ch.queue.length<ch.index+7&&ch.pool.length){
  const previous=ch.queue.at(-1),available=ch.queue.length%chordsPerMeasure()&&previous?ch.pool.filter(q=>q.contextId===previous.contextId):ch.pool;
  const different=previous?available.filter(q=>q.root!==previous.root||q.type.id!==previous.type.id):available;
  const pool=different.length?different:available,groups=[...new Set(pool.map(q=>q.positionIndex))].map(positionIndex=>{
    const candidates=pool.filter(q=>q.positionIndex===positionIndex).flatMap(item=>item.voicings.map(v=>({...item,v})));
    return {candidates,weight:candidates.reduce((sum,q)=>sum+(previous?chordMoveWeight(q,previous,ch.queue):1),0)/candidates.length};
  });
  // Pick position first so a position with more supported grips is not overrepresented.
  const random=chValue('Mode')==='random'||!previous,group=random?choose(groups):weightedChoice(groups,g=>g.weight);
  const item=random?choose(group.candidates):weightedChoice(group.candidates,q=>chordMoveWeight(q,previous,ch.queue));
  ch.queue.push({...item,name:(item.rootLabel?item.rootLabel.replaceAll('#','♯').replaceAll('b','♭')+item.type.symbol:chordName(item.root,item.type))});
}}
function resetChords(){
  pauseChords();for(const [id,f] of [['Roots','0'],['Scales','major'],['Types','triads'],['Positions','0'],['ManualRoots','0'],['ManualTypes','major'],['Sources','diatonic']])ensureChecked('#ch'+id,f);
  $('#chBeats').value='4';if(!['w','h'].includes(chValue('Rhythm')))$('#chRhythm').value='w';
  const manual=checkedValues('#chSources').includes('manual'),diatonic=checkedValues('#chSources').includes('diatonic');
  for(const id of ['RootsPanel','ScalesPanel','TypesPanel'])$('#ch'+id).hidden=!diatonic;
  for(const id of ['ManualRootsPanel','ManualTypesPanel'])$('#ch'+id).hidden=!manual;
  $('#chManualRootSummary').textContent=`已選 ${checkedValues('#chManualRoots').length} 個根音`;
  $('#chManualTypeSummary').textContent=`已選 ${checkedValues('#chManualTypes').length} 種`;
  $('#chSourceHint').textContent=manual&&diatonic?'順階和弦與自選和弦合併出題；自選可超出音階，題目會標示「自選加入」。重複和弦不會重複加權。':manual?'自選根音與個別和弦種類，不受音階限制；僅出收錄的實用指法，省略音會註明，X 弦不彈。':'依調性與音階自動產生順階和弦；同一小節維持同一調性／音階，下一小節可切換。僅出收錄的實用指法，省略音會註明。';
  ch.pool=buildChordPool({diatonic,manual,keys:checkedValues('#chRoots').map(Number),scales:checkedValues('#chScales'),families:checkedValues('#chTypes'),manualRoots:checkedValues('#chManualRoots').map(Number),manualTypes:checkedValues('#chManualTypes'),positions:checkedValues('#chPositions').map(Number)});
  ch.queue=[];ch.index=0;ch.sub=0;ch.last=0;ch.started=false;fillChords();
  $('#chAvailability').textContent=ch.pool.length?'':'目前選擇沒有收錄的實用指法，請增加把位或和弦類別。';
  $('#chRootSummary').textContent=`已選 ${checkedValues('#chRoots').length} 個調`;
  $('#chScaleSummary').textContent=checkedValues('#chScales').map(id=>SCALES[id].label).join('、');
  $('#chTypeSummary').textContent=checkedValues('#chTypes').map(id=>CHORD_FAMILIES.find(f=>f[0]===id)[1]).join('、');
  $('#chBpmValue').textContent=chValue('Bpm');$('#chStart').disabled=!ch.pool.length;$('#chStart').textContent='▶ 開始節拍';saveChords();renderChords();
}
function chordDiagram(q){const v=q.v,p=POSITIONS[q.positionIndex],min=Math.max(1,Math.min(...v.notes.map(n=>n.fret).filter(f=>f>0))),rows=Math.max(4,v.high-min+1),step=64/rows,x=s=>20+s*14;return `<svg viewBox="0 0 110 110" role="img" aria-label="${q.name} 指法 ${v.frets.map(f=>f<0?'X':f).join(' ')}"><g stroke="currentColor" fill="none">${[0,1,2,3,4,5].map(s=>`<path d="M${x(s)} 25 V89"/>`).join('')}${Array.from({length:rows+1},(_,i)=>25+i*step).map(y=>`<path d="M20 ${y} H90"/>`).join('')}</g><text x="2" y="39" font-size="10">${min}</text>${v.frets.map((f,s)=>f<0||f===0?`<text x="${x(s)}" y="18" text-anchor="middle" font-size="12">${f<0?'×':'○'}</text>`:`<circle cx="${x(s)}" cy="${25+step*(f-min+.5)}" r="5" fill="${(OPEN_MIDI[s]+f)%12===q.root?'#e62f35':'currentColor'}"/>`).join('')}${[6,5,4,3,2,1].map((n,s)=>`<text x="${x(s)}" y="104" text-anchor="middle" font-size="10" fill="${n===p.rootString?'#e62f35':'currentColor'}">${n}</text>`).join('')}</svg>`}
function cueForChord(q){const p=POSITIONS[q.positionIndex];return `<svg viewBox="0 0 74 84" class="mini-position-tab" aria-label="P${p.number} ${p.rootString} 弦 ${p.direction==='up'?'向上':'向下'}"><g class="mini-grid">${[0,1,2,3,4,5].map(i=>`<path d="M${12+i*10} 13 V69"/>`).join('')}${[13,27,41,55,69].map(y=>`<path d="M8 ${y} H66"/>`).join('')}</g><path class="mini-arrow" d="${p.direction==='up'?'M37 36 V15 M32 21 L37 15 L42 21':'M37 46 V67 M32 61 L37 67 L42 61'}"/><circle class="mini-root" cx="${12+(6-p.rootString)*10}" cy="41" r="5.5"/>${[6,5,4,3,2,1].map((n,i)=>`<text class="${n===p.rootString?'root-string-number':''}" x="${12+i*10}" y="80">${n}</text>`).join('')}</svg>`}
function renderChords(){
  const per=chordsPerMeasure(),page=Math.floor(ch.index/(2*per))*2*per,shown=ch.queue.slice(page,page+3*per),current=ch.index-page;
  $('#chScore').innerHTML='';$('#chCurrent').textContent=ch.queue[ch.index]?.name||'請選擇其他和弦或把位';
  $('#chBeat').textContent=`第 ${Math.floor(ch.last/2)+1} 拍 / 4`;
  $('#chDots').innerHTML=Array.from({length:4},(_,i)=>`<i class="beat-dot ${ch.started&&i===Math.floor(ch.last/2)?'active':''}"></i>`).join('');
  $('#chCards').innerHTML=Array.from({length:3},(_,m)=>{
    const group=shown.slice(m*per,(m+1)*per);return `<section class="ch-measure"><small>${group[0]?.contextLabel||''}</small><div class="ch-measure-chords" style="grid-template-columns:repeat(${per},minmax(0,1fr))">${group.map((q,i)=>`<div class="ch-card"><b>${q.name}</b><small>${q.type.label}${q.manual?' · 自選加入':''}</small><div class="position-cue-dom ${m*per+i===current?'current':''}">${cueForChord(q)}</div>${chChecked('Answer')?`<div class="ch-diagram">${chordDiagram(q)}</div><small>${chordOmission(q)}</small>`:''}</div>`).join('')}</div></section>`;
  }).join('');
  $('#chScore').hidden=!chChecked('Answer');if(chChecked('Answer')&&shown.length)try{renderChordScore(shown,current)}catch(e){$('#chScore').textContent='和弦樂譜載入失敗';console.error(e)}
}
function renderChordScore(shown,current){const VF=window.VexFlow,target=$('#chScore');target.innerHTML='';const duration=chValue('Rhythm'),per=+chValue('Beats')/DURATION_BEATS[duration],width=Math.max(440,per*100),header=110,total=header+3*width+10,renderer=new VF.Renderer(target,VF.Renderer.Backends.SVG);renderer.resize(total,410);$('#chCards').style.paddingLeft=`${100*header/total}%`;const ctx=renderer.getContext();new VF.Stave(0,70,header).setBegBarType(VF.Barline.type.NONE).setEndBarType(VF.Barline.type.NONE).addClef('treble','default','8vb').addTimeSignature(chValue('Beats')+'/4').setContext(ctx).draw();new VF.TabStave(0,255,header).setBegBarType(VF.Barline.type.NONE).setEndBarType(VF.Barline.type.NONE).setContext(ctx).draw();Array.from({length:3},(_,m)=>{const staff=new VF.Stave(header+m*width,70,width).setBegBarType(VF.Barline.type.NONE).setContext(ctx),tab=new VF.TabStave(header+m*width,255,width).setBegBarType(VF.Barline.type.NONE).setContext(ctx);staff.draw();tab.draw();const ns=[],ts=[],accidentals=new Map();for(let i=0;i<per;i++){const q=shown[m*per+i];const keys=q.v.notes.slice().sort((a,b)=>a.midi-b.midi).map(n=>chordNotationKey(q,n)),sn=new VF.StaveNote({clef:'treble',keys,duration,autoStem:true}),tn=new VF.TabNote({positions:q.v.notes.map(n=>({str:6-n.string,fret:n.fret})),duration});keys.forEach((key,j)=>{const accidental=key.split('/')[0].slice(1);const identity=key[0]+key.split('/')[1],previous=accidentals.get(identity)||'';if(accidental!==previous)sn.addModifier(new VF.Accidental(accidental||'n'),j);accidentals.set(identity,accidental)});if(m*per+i===current){sn.setStyle({fillStyle:'#d62f2f',strokeStyle:'#d62f2f'});tn.setStyle({fillStyle:'#d62f2f',strokeStyle:'#d62f2f'})}ns.push(sn);ts.push(tn)}const voice=new VF.Voice({numBeats:+chValue('Beats'),beatValue:4}).addTickables(ns),tv=new VF.Voice({numBeats:+chValue('Beats'),beatValue:4}).addTickables(ts),beams=duration==='8'?VF.Beam.generateBeams(ns,{groups:[new VF.Fraction(1,4)]}):[];new VF.Formatter().joinVoices([voice]).joinVoices([tv]).format([voice,tv],width-65);voice.draw(ctx,staff);tv.draw(ctx,tab);beams.forEach(b=>b.setContext(ctx).draw())});const svg=target.querySelector('svg');svg.setAttribute('viewBox',`0 0 ${total} 410`);svg.style.width='100%';svg.style.height='auto'}
async function warmChords(){if(chChecked('Sound'))await preloadSamples(ch.queue.slice(ch.index,ch.index+3).flatMap(q=>q.v.notes.map(n=>n.midi)),chValue('Tone'))}
function chordTick(){if(ch.sub%DURATION_SUBDIVISIONS[chValue('Rhythm')]===0&&ch.started){ch.index++;fillChords();void warmChords()}ch.last=ch.sub;ch.started=true;if(ch.sub%DURATION_SUBDIVISIONS[chValue('Rhythm')]===0&&chChecked('Sound')){stopActiveSounds();const q=ch.queue[ch.index];q.v.notes.forEach(n=>playMidi(n.midi,chValue('Tone'),Math.min(3,DURATION_BEATS[chValue('Rhythm')]*60/+chValue('Bpm')*.9),1/Math.sqrt(q.v.notes.length)))}if(ch.sub%2===0&&chChecked('Click'))click(ch.sub===0);renderChords();ch.sub=(ch.sub+1)%(+chValue('Beats')*2)}
async function startChords(){if(ch.running||!ch.pool.length)return;const token=++ch.token;$('#chStart').textContent='載入音源…';await ensureAudio();await warmChords();if(token!==ch.token||chordPage.hidden)return;ch.running=true;$('#chStart').textContent='■ 暫停';chordTick();ch.timer=setInterval(chordTick,60000/+chValue('Bpm')/2)}
function pauseChords(){ch.token++;clearInterval(ch.timer);ch.timer=null;ch.running=false;stopActiveSounds();$('#chStart').textContent=ch.started?'▶ 繼續':'▶ 開始節拍'}

setActiveTab=function(name,persist=true){pauseChords();pause();pauseFretboard();for(const key of ['position','fretboard','chord']){const active=name===key;$('#'+key+'Page').hidden=!active;$('#'+key+'TabButton').classList.toggle('active',active);$('#'+key+'TabButton').setAttribute('aria-selected',String(active))}savedActiveTab=name;if(persist)saveSettings()};
$('#chordTabButton').onclick=()=>setActiveTab('chord');$('#chStart').onclick=()=>ch.running?pauseChords():startChords();$('#chReset').onclick=resetChords;
chordPage.querySelectorAll('input,select').forEach(el=>el.onchange=()=>{if(['chAnswer','chClick','chSound','chTone'].includes(el.id)){stopActiveSounds();saveChords();renderChords();if(state.audio)void warmChords()}else resetChords()});$('#chBpm').oninput=()=>$('#chBpmValue').textContent=chValue('Bpm');chordPage.querySelectorAll('details').forEach(d=>d.ontoggle=saveChords);
resetChords();
if(initialPracticeTab==='chord')setActiveTab('chord');
