const $ = selector => document.querySelector(selector);
const POSITIONS = [
  { number: 1, shape: 'E shape', offset: 0, rootString: 6, direction: 'down' },
  { number: 2, shape: 'D shape', offset: 2, rootString: 4, direction: 'down' },
  { number: 3, shape: 'C shape', offset: 4, rootString: 5, direction: 'up' },
  { number: 4, shape: 'A shape', offset: 7, rootString: 5, direction: 'down' },
  { number: 5, shape: 'G shape', offset: 9, rootString: 6, direction: 'up' },
];
const MAJOR_KEYS = [['C',0],['G',7],['D',2],['A',9],['E',4],['B',11],['F♯',6],['G♭',6],['D♭',1],['A♭',8],['E♭',3],['B♭',10],['F',5]];
const MINOR_KEYS = [['C',0],['C♯',1],['D',2],['E♭',3],['E',4],['F',5],['F♯',6],['G',7],['G♯',8],['A',9],['B♭',10],['B',11]];
const TONIC_CHOICES=[['C',0],['D♭ / C♯',1],['D',2],['E♭ / D♯',3],['E',4],['F',5],['F♯ / G♭',6],['G',7],['A♭ / G♯',8],['A',9],['B♭ / A♯',10],['B',11]];
const MAJOR_LABELS={0:['C'],1:['D♭'],2:['D'],3:['E♭'],4:['E'],5:['F'],6:['F♯','G♭'],7:['G'],8:['A♭'],9:['A'],10:['B♭'],11:['B']};
const MINOR_LABELS={0:['C'],1:['C♯'],2:['D'],3:['E♭'],4:['E'],5:['F'],6:['F♯'],7:['G'],8:['G♯'],9:['A'],10:['B♭'],11:['B']};
const SCALES = {
  major: { label: '大調音階', intervals: [0,2,4,5,7,9,11], degrees: [0,1,2,3,4,5,6], minor: false },
  minor: { label: '自然小調音階', intervals: [0,2,3,5,7,8,10], degrees: [0,1,2,3,4,5,6], minor: true },
  majorPent: { label: '大調五聲音階', intervals: [0,2,4,7,9], degrees: [0,1,2,4,5], minor: false },
  minorPent: { label: '小調五聲音階', intervals: [0,3,5,7,10], degrees: [0,2,3,4,6], minor: true },
  blues: { label: '藍調音階', intervals: [0,3,5,6,7,10], degrees: [0,2,3,4,4,6], minor: true },
};
const NATURAL = { C:0,D:2,E:4,F:5,G:7,A:9,B:11 };
const OPEN_PITCH_CLASS = [4,9,2,7,11,4];
const OPEN_MIDI = [40,45,50,55,59,64];
const DURATION_BEATS = { w:4,h:2,q:1,'8':0.5 };
const DURATION_SUBDIVISIONS = { w:8,h:4,q:2,'8':1 };
const SAMPLE_NOTE_NAMES=['C','Cs','D','Ds','E','F','Fs','G','Gs','A','As','B'];
const SAMPLE_MIDI_MIN=40,SAMPLE_MIDI_MAX=84;
const SIGNATURE_COUNTS={major:{C:0,G:1,D:2,A:3,E:4,B:5,'F♯':6,'G♭':-6,'D♭':-5,'A♭':-4,'E♭':-3,'B♭':-2,F:-1},minor:{C:-3,'C♯':4,D:-1,'E♭':-6,E:1,F:-4,'F♯':3,G:-2,'G♯':5,A:0,'B♭':-5,B:2}};
const FRETBOARD_STRINGS=[{label:'Low E 弦',midi:40,pitch:4},{label:'A 弦',midi:45,pitch:9},{label:'D 弦',midi:50,pitch:2},{label:'G 弦',midi:55,pitch:7},{label:'B 弦',midi:59,pitch:11},{label:'High E 弦',midi:64,pitch:4}];
const CHROMATIC_NAMES=['C','C♯ / D♭','D','D♯ / E♭','E','F','F♯ / G♭','G','G♯ / A♭','A','A♯ / B♭','B'];

const notationMode=$('#notationMode'), generatorMode=$('#generatorMode'), toneInstrument=$('#toneInstrument'), metronomeSound=$('#metronomeSound'), pitchSound=$('#pitchSound'), beatsSelect=$('#beats'), rhythmSelect=$('#rhythm'), bpm=$('#bpm');
const state={ queue:[], history:[], build:null, running:false, started:false, subdivision:0, lastSubdivision:0, firstTick:true, timer:null, audio:null };
const fbBpm=$('#fbBpm'),fbToneInstrument=$('#fbToneInstrument'),fbMetronomeSound=$('#fbMetronomeSound'),fbPitchSound=$('#fbPitchSound');
const fbState={questions:[],nextQuestions:[],running:false,started:false,beat:0,lastBeat:0,firstTick:true,measure:1,timer:null};
const sampleBuffers=new Map(),sampleLoads=new Map(),activeAudioVoices=new Set();
let audioEpoch=0;
const SETTINGS_KEY='guitar-practice-settings-v1';
let savedActiveTab='position';

POSITIONS.forEach((position,index)=>$('#positionChoices').insertAdjacentHTML('beforeend',`<label class="position-choice"><input type="checkbox" value="${index}" ${index===0?'checked':''}><span>P${position.number}</span></label>`));
TONIC_CHOICES.forEach(([label,pitch])=>$('#keyChoices').insertAdjacentHTML('beforeend',`<label><input type="checkbox" value="${pitch}" ${pitch===9?'checked':''}><span>${label}</span></label>`));
Object.entries(SCALES).forEach(([id,scale])=>$('#scaleChoices').insertAdjacentHTML('beforeend',`<label><input type="checkbox" value="${id}" ${id==='major'?'checked':''}><span>${scale.label}</span></label>`));

function selectedPositions(){return [...document.querySelectorAll('#positionChoices input:checked')].map(input=>+input.value)}
function checkedValues(selector){return [...document.querySelectorAll(`${selector} input:checked`)].map(input=>input.value)}
function selectedTonicPitches(){return checkedValues('#keyChoices').map(Number)}
function selectedScaleIds(){return checkedValues('#scaleChoices')}
function selectedCombos(){return selectedScaleIds().flatMap(scaleId=>selectedTonicPitches().flatMap(pitch=>(SCALES[scaleId].minor?MINOR_LABELS[pitch]:MAJOR_LABELS[pitch]).map(label=>({scaleId,key:{label,pitch}}))))}
function notesPerMeasure(){return +beatsSelect.value/DURATION_BEATS[rhythmSelect.value]}
function choose(list){return list[Math.floor(Math.random()*list.length)]}
function weightedChoice(items,weightFor){let total=0,weighted=items.map(item=>{const weight=Math.max(0,weightFor(item));total+=weight;return{item,total}}),roll=Math.random()*total;return(weighted.find(entry=>roll<entry.total)||weighted.at(-1)).item}
function updateDurationOptions(){const beats=+beatsSelect.value;[...rhythmSelect.options].forEach(option=>option.disabled=beats%DURATION_BEATS[option.value]!==0);if(rhythmSelect.options[rhythmSelect.selectedIndex].disabled)rhythmSelect.value='q'}
function choosePositionIndex(selected,context){
  if(!context||generatorMode.value==='random'||selected.length===1)return choose(selected);
  const current=context.positionIndex,currentOffset=POSITIONS[current].offset,groups={same:[],adjacent:[],near:[],far:[]};
  selected.forEach(index=>{const distance=Math.abs(POSITIONS[index].offset-currentOffset),group=distance===0?'same':distance<=3?'adjacent':distance<=5?'near':'far';groups[group].push(index)});
  const mass={same:.2,adjacent:.56,near:.18,far:.06};
  if(!groups.adjacent.length){if(groups.near.length)mass.near+=.38;else if(groups.far.length)mass.far+=.22}
  const previousDirection=Math.sign(context.lastPositionDelta||0);
  return weightedChoice(selected,index=>{
    const distance=Math.abs(POSITIONS[index].offset-currentOffset),group=distance===0?'same':distance<=3?'adjacent':distance<=5?'near':'far',direction=Math.sign(index-current);
    let weight=mass[group]/groups[group].length;
    if(direction&&previousDirection)weight*=direction===previousDirection?1.12:.98;
    return weight*(.82+Math.random()*.36);
  });
}

function spelledScale(key,scale){
  const letters='CDEFGAB',root=key.label.replace('♯','#').replace('♭','b'),start=letters.indexOf(root[0]);
  return scale.intervals.map((interval,index)=>{const letter=letters[(start+scale.degrees[index])%7],pitch=(key.pitch+interval)%12,difference=((pitch-NATURAL[letter]+18)%12)-6,accidental=difference===1?'#':difference===-1?'b':difference===2?'##':difference===-2?'bb':'';return{letter,accidental,pitch,name:letter+accidental,scaleIndex:index}});
}

function musicalLocation(locations,scaleNotes,context){
  if(Math.random()<.14)return choose(locations);
  const slot=context.slot,per=notesPerMeasure(),duration=DURATION_BEATS[rhythmSelect.value],beat=slot*duration,strong=beat===0||(+beatsSelect.value===4&&beat===2),ending=slot===per-1,lastMidi=context.lastMidi,lastDelta=context.lastDelta||0;
  return weightedChoice(locations,note=>{
    const midi=OPEN_MIDI[note.string]+note.fret,degree=scaleNotes.findIndex(scaleNote=>scaleNote.pitch===note.pitch),stable=degree===0||degree===2||degree===4;let weight=.8;
    if(lastMidi==null)weight*=degree===0?5:degree===4?3.3:degree===2?2.6:1;
    else{const delta=midi-lastMidi,distance=Math.abs(delta);weight*=distance===0?1:distance<=2?4.3:distance<=4?2.6:distance<=7?1.45:.4;if(Math.abs(lastDelta)>=4&&Math.sign(delta)===-Math.sign(lastDelta)&&distance<=2)weight*=2.5;if(Math.abs(lastDelta)<=2&&Math.sign(delta)===Math.sign(lastDelta)&&distance<=2)weight*=1.18}
    if(strong&&stable)weight*=2.1;if(ending)weight*=degree===0?4.2:degree===4?2.1:degree===2?1.7:.72;
    return weight*(.52+Math.random()*.96);
  });
}

function buildQuestion(first=false){
  const per=notesPerMeasure(),selected=selectedPositions(),combos=selectedCombos();let context=state.build;
  const comboStillSelected=context&&combos.some(combo=>combo.scaleId===context.scaleId&&combo.key.label===context.key.label);
  if(first||!context||context.slot===0||!selected.includes(context.positionIndex)||!comboStillSelected){
    const otherCombos=context?combos.filter(combo=>combo.scaleId!==context.scaleId||combo.key.label!==context.key.label):combos,combo=choose(otherCombos.length?otherCombos:combos);
    const previousPositionIndex=context?.positionIndex,nextPositionIndex=choosePositionIndex(selected,context),positionDelta=previousPositionIndex==null?0:nextPositionIndex-previousPositionIndex;
    context={positionIndex:nextPositionIndex,lastPositionDelta:positionDelta||context?.lastPositionDelta||0,scaleId:combo.scaleId,key:combo.key,slot:0,last:'',lastMidi:context?.lastMidi??null,lastDelta:context?.lastDelta??0};
  }
  const position=POSITIONS[context.positionIndex],scale=SCALES[context.scaleId],start=((context.key.pitch-4+12)%12)+position.offset,scaleNotes=spelledScale(context.key,scale),locations=[];
  for(let string=0;string<6;string++)for(let fret=start;fret<=start+3;fret++){const note=scaleNotes.find(item=>item.pitch===(OPEN_PITCH_CLASS[string]+fret)%12);if(note)locations.push({...note,string,fret})}
  const picked=generatorMode.value==='random'?choose(locations):musicalLocation(locations,scaleNotes,context),pickedMidi=OPEN_MIDI[picked.string]+picked.fret;
  state.build={positionIndex:context.positionIndex,lastPositionDelta:context.lastPositionDelta||0,scaleId:context.scaleId,key:context.key,slot:(context.slot+1)%per,last:picked.name,lastMidi:pickedMidi,lastDelta:context.lastMidi==null?0:pickedMidi-context.lastMidi};
  return {positionIndex:context.positionIndex,position,scaleId:context.scaleId,key:context.key,picked,slot:context.slot+1};
}

function fillQueue(){while(state.queue.length<96)state.queue.push(buildQuestion(state.queue.length===0&&!state.history.length))}
function resetQuestions(){state.queue=[];state.history=[];state.build=null;fillQueue();advanceQuestion()}
function advanceQuestion(){state.history.push(state.queue.shift());fillQueue();render();if(state.audio)void warmPositionSamples()}

function writtenPitch(question){
  const soundingMidi=OPEN_MIDI[question.picked.string]+question.picked.fret;let writtenMidi=soundingMidi+12,octave=Math.floor(writtenMidi/12)-1,diatonic=octave*7+'CDEFGAB'.indexOf(question.picked.letter),octaveShift='';
  if(diatonic<24){writtenMidi+=12;octaveShift='8vb'}else if(diatonic>44){writtenMidi-=12;octaveShift='8va'}
  octave=Math.floor(writtenMidi/12)-1;diatonic=octave*7+'CDEFGAB'.indexOf(question.picked.letter);
  return {key:`${question.picked.letter}${question.picked.accidental}/${octave}`,diatonic,octaveShift};
}
function keySignature(question){const label=question.key.label.replace('♯','#').replace('♭','b');return label+(SCALES[question.scaleId].minor?'m':'')}
function signatureAccidental(question,letter){const family=SCALES[question.scaleId].minor?'minor':'major',count=SIGNATURE_COUNTS[family][question.key.label]||0,order=count>0?'FCGDAEB':'BEADGCF',affected=order.slice(0,Math.abs(count));return affected.includes(letter)?count>0?'#':'b':''}
function accidentalToDraw(question,useSignature){const expected=useSignature?signatureAccidental(question,question.picked.letter):'',desired=question.picked.accidental;return desired===expected?'':desired||'n'}

function renderScore(){
  const VF=window.VexFlow,target=$('#score');if(!VF)throw new Error('VexFlow not loaded');target.innerHTML='';
  const beats=+beatsSelect.value,duration=rhythmSelect.value,per=notesPerMeasure(),measures=3,liveMeasures=2,currentIndex=state.history.length-1,page=Math.floor(currentIndex/(per*liveMeasures))*per*liveMeasures,all=[...state.history,...state.queue],shown=all.slice(page,page+per*measures);
  const useSignature=notationMode.value==='signature',minMeasureWidth=Math.max(390,per*46),header=112,logicalWidth=16+header+minMeasureWidth*measures,height=500,renderer=new VF.Renderer(target,VF.Renderer.Backends.SVG);renderer.resize(logicalWidth,height);const ctx=renderer.getContext(),staffY=180,tabY=330;
  const staffHeader=new VF.Stave(8,staffY,header).setBegBarType(VF.Barline.type.NONE).setEndBarType(VF.Barline.type.NONE).addClef('treble','default','8vb');
  staffHeader.addTimeSignature(`${beats}/4`).setContext(ctx).draw();new VF.TabStave(8,tabY,header).setBegBarType(VF.Barline.type.NONE).setEndBarType(VF.Barline.type.NONE).setContext(ctx).draw();
  const labels=[],octaveMarks=[];let previousSignature='';
  for(let measure=0;measure<measures;measure++){
    const x=8+header+measure*minMeasureWidth,staff=new VF.Stave(x,staffY,minMeasureWidth).setBegBarType(VF.Barline.type.NONE),tab=new VF.TabStave(x,tabY,minMeasureWidth).setBegBarType(VF.Barline.type.NONE),group=shown.slice(measure*per,(measure+1)*per),staffNotes=[],tabNotes=[],octaveEntries=[],singletonEntries=[];
    if(useSignature&&group[0]){const signature=keySignature(group[0]);if(!previousSignature||signature!==previousSignature)try{staff.addKeySignature(signature,previousSignature||undefined)}catch(error){console.warn('Key signature unavailable',error)}previousSignature=signature}
    staff.setContext(ctx).draw();tab.setContext(ctx).draw();if(group[0])labels.push(group[0]);
    const pitches=group.map(writtenPitch),shiftRuns=[];pitches.forEach((pitch,index)=>{if(!pitch.octaveShift)return;const run=shiftRuns.at(-1);if(run&&run.shift===pitch.octaveShift&&run.lastIndex+1===index)run.lastIndex=index;else shiftRuns.push({shift:pitch.octaveShift,firstIndex:index,lastIndex:index})});
    group.forEach((question,index)=>{
      const pitch=pitches[index],absolute=page+measure*per+index,isCurrent=absolute===currentIndex,sn=new VF.StaveNote({clef:'treble',keys:[pitch.key],duration,autoStem:true}),tn=new VF.TabNote({positions:[{str:6-question.picked.string,fret:String(question.picked.fret)}],duration});
      const shownAccidental=accidentalToDraw(question,useSignature);if(shownAccidental)sn.addModifier(new VF.Accidental(shownAccidental),0);
      const singleton=shiftRuns.find(run=>run.firstIndex===index&&run.lastIndex===index);if(singleton)singletonEntries.push({note:sn,shift:singleton.shift});
      if(isCurrent){const red={fillStyle:'#d62f2f',strokeStyle:'#d62f2f'};sn.setStyle(red);if(typeof sn.setKeyStyle==='function')sn.setKeyStyle(0,red);if(typeof sn.setStemStyle==='function')sn.setStemStyle(red);tn.setStyle(red)}
      if(pitch.octaveShift)octaveEntries.push({note:sn,shift:pitch.octaveShift,index});
      staffNotes.push(sn);tabNotes.push(tn);
    });
    if(staffNotes.length){
      const beams=duration==='8'?VF.Beam.generateBeams(staffNotes,{groups:[new VF.Fraction(1,4)]}):[];
      const voice=new VF.Voice({num_beats:beats,beat_value:4}),tabVoice=new VF.Voice({num_beats:beats,beat_value:4});voice.setStrict(false);tabVoice.setStrict(false);voice.addTickables(staffNotes);tabVoice.addTickables(tabNotes);
      const staffSpace=staff.getNoteEndX()-staff.getNoteStartX(),tabSpace=tab.getNoteEndX()-tab.getNoteStartX(),usableWidth=Math.max(80,Math.min(staffSpace,tabSpace)-36);new VF.Formatter().joinVoices([voice]).joinVoices([tabVoice]).format([voice,tabVoice],usableWidth);voice.draw(ctx,staff);tabVoice.draw(ctx,tab);beams.forEach(beam=>beam.setContext(ctx).draw());
      const runs=[];octaveEntries.forEach(entry=>{const run=runs.at(-1);if(run&&run.shift===entry.shift&&run.lastIndex+1===entry.index){run.stop=entry.note;run.lastIndex=entry.index}else runs.push({shift:entry.shift,start:entry.note,stop:entry.note,lastIndex:entry.index})});
      runs.forEach(run=>octaveMarks.push({shift:run.shift,x1:run.start.getAbsoluteX(),x2:run.stop.getAbsoluteX(),single:run.start===run.stop}));
    }
  }
  const currentMeasure=Math.floor((currentIndex-page)/per),strip=$('#positionStrip');strip.innerHTML='';
  $('#scorePanel > p').textContent='目前 2 小節　｜　預告 1 小節';
  const svg=target.querySelector('svg');svg.setAttribute('viewBox',`0 0 ${logicalWidth} ${height}`);svg.setAttribute('preserveAspectRatio','xMinYMin meet');svg.style.width='100%';svg.style.height='auto';
  const labelMarkup=labels.map((question,index)=>{const x=8+header+index*minMeasureWidth,scale=SCALES[question.scaleId],tonic=`${question.key.label}${scale.minor?'m':''}`;return `<g class="measure-label"><text x="${x+minMeasureWidth/2}" y="28">${tonic} · ${scale.label}</text></g>`}).join('');
  const stringLines=Array.from({length:6},(_,index)=>`<line x1="${12+index*10}" y1="13" x2="${12+index*10}" y2="69"/>`).join(''),fretLines=[13,27,41,55,69].map(y=>`<line x1="8" y1="${y}" x2="66" y2="${y}"/>`).join('');
  $('#positionCues').innerHTML=labels.map((question,index)=>{const position=question.position,stringX=12+(6-position.rootString)*10,arrow=position.direction==='up'?'<path d="M 37 36 V 15 M 37 15 l -5 6 M 37 15 l 5 6"/>':'<path d="M 37 46 V 67 M 37 67 l -5 -6 M 37 67 l 5 -6"/>',numbers=[6,5,4,3,2,1].map((number,stringIndex)=>`<text${number===position.rootString?' class="root-string-number"':''} x="${12+stringIndex*10}" y="80">${number}</text>`).join(''),current=index===currentMeasure;return `<div class="position-cue-dom${current?' current':''}" aria-label="Position ${position.number} ${position.shape}，${position.rootString} 弦根音，往${position.direction==='up'?'上':'下'}按"${current?' aria-current="true"':''}><svg class="mini-position-tab" viewBox="0 0 74 84" aria-hidden="true"><g class="mini-grid">${stringLines}${fretLines}</g><g class="mini-arrow">${arrow}</g><circle class="mini-root" cx="${stringX}" cy="41" r="5.5"/>${numbers}</svg></div>`}).join('');
  svg.insertAdjacentHTML('afterbegin',labelMarkup);
  const octaveMarkup=octaveMarks.map(mark=>{const top=mark.shift==='8va',textY=top?140:316,lineY=top?135:311,hook=top?7:-7,line=mark.single?'':`<path d="M ${mark.x1+20} ${lineY} H ${mark.x2+9} v ${hook}" fill="none" stroke="#26332a" stroke-width="1.5" stroke-dasharray="5 4"/>`;return `<g class="octave-mark"><text x="${mark.x1-8}" y="${textY}" fill="#26332a" font-family="Arial,sans-serif" font-size="11" font-weight="700">${mark.shift}</text>${line}</g>`}).join('');
  svg.insertAdjacentHTML('beforeend',octaveMarkup);
}

function drawBeatDots(){const root=$('#beatDots'),active=Math.floor(state.lastSubdivision/2);root.innerHTML='';for(let beat=0;beat<+beatsSelect.value;beat++){const marker=beat===active?(state.running?'active':state.started?'paused':''):'';root.insertAdjacentHTML('beforeend',`<i class="beat-dot ${marker}"></i>`)}}
function render(){const question=state.history.at(-1);if(!question)return;const scale=SCALES[question.scaleId];$('#currentPosition').textContent=`Position ${question.position.number} · ${question.position.shape}`;$('#questionCounter').textContent=`第 ${question.slot} 音 / ${notesPerMeasure()} 音`;$('#scaleDescription').textContent=`${question.key.label}${scale.minor?'m':''} ${scale.label}`;try{renderScore()}catch(error){console.error(error);$('#score').innerHTML='<p class="score-error">樂譜載入失敗，請重新整理。</p>'}drawBeatDots()}

async function ensureAudio(){state.audio||=new(window.AudioContext||window.webkitAudioContext)();if(state.audio.state==='suspended')await state.audio.resume()}
function trackAudioVoice(source,gain){const voice={source,gain};activeAudioVoices.add(voice);source.addEventListener('ended',()=>activeAudioVoices.delete(voice),{once:true})}
function stopActiveSounds(){audioEpoch++;if(!state.audio)return;const now=state.audio.currentTime;activeAudioVoices.forEach(({source,gain})=>{try{if(gain.gain.cancelAndHoldAtTime)gain.gain.cancelAndHoldAtTime(now);else{gain.gain.cancelScheduledValues(now);gain.gain.setValueAtTime(Math.max(.001,gain.gain.value),now)}gain.gain.exponentialRampToValueAtTime(.001,now+.025);source.stop(now+.03)}catch(error){}});activeAudioVoices.clear()}
function click(accent){const now=state.audio.currentTime,oscillator=state.audio.createOscillator(),gain=state.audio.createGain();oscillator.frequency.value=accent?1120:680;gain.gain.setValueAtTime(.001,now);gain.gain.exponentialRampToValueAtTime(accent?.2:.075,now+.003);gain.gain.exponentialRampToValueAtTime(.001,now+.055);oscillator.connect(gain).connect(state.audio.destination);trackAudioVoice(oscillator,gain);oscillator.start(now);oscillator.stop(now+.065)}
function sampleInfo(midi){const baseMidi=Math.max(SAMPLE_MIDI_MIN,Math.min(SAMPLE_MIDI_MAX,midi)),name=SAMPLE_NOTE_NAMES[baseMidi%12],octave=Math.floor(baseMidi/12)-1;return{baseMidi,file:`${name}${octave}.mp3`,rate:Math.pow(2,(midi-baseMidi)/12)}}
async function loadSample(instrument,midi){const info=sampleInfo(midi),key=`${instrument}:${info.baseMidi}`;if(sampleBuffers.has(key))return{buffer:sampleBuffers.get(key),info};if(!sampleLoads.has(key))sampleLoads.set(key,fetch(`${instrument}/${info.file}`).then(response=>{if(!response.ok)throw new Error(`Unable to load ${instrument}/${info.file}`);return response.arrayBuffer()}).then(data=>state.audio.decodeAudioData(data)).then(buffer=>{sampleBuffers.set(key,buffer);sampleLoads.delete(key);return buffer}).catch(error=>{sampleLoads.delete(key);throw error}));return{buffer:await sampleLoads.get(key),info}}
function playFallbackMidi(midi,duration){const frequency=440*Math.pow(2,(midi-69)/12),now=state.audio.currentTime,oscillator=state.audio.createOscillator(),gain=state.audio.createGain();oscillator.type='triangle';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(.001,now);gain.gain.exponentialRampToValueAtTime(.13,now+.008);gain.gain.exponentialRampToValueAtTime(.001,now+duration);oscillator.connect(gain).connect(state.audio.destination);trackAudioVoice(oscillator,gain);oscillator.start(now);oscillator.stop(now+duration+.03)}
function playSample(buffer,rate,instrument,duration){const now=state.audio.currentTime,source=state.audio.createBufferSource(),gain=state.audio.createGain(),release=Math.max(.3,duration),level=instrument==='eguitar'?.42:.52;source.buffer=buffer;source.playbackRate.value=rate;gain.gain.setValueAtTime(.001,now);gain.gain.exponentialRampToValueAtTime(level,now+.012);gain.gain.setValueAtTime(level,now+Math.max(.02,release-.12));gain.gain.exponentialRampToValueAtTime(.001,now+release);source.connect(gain).connect(state.audio.destination);trackAudioVoice(source,gain);source.start(now);source.stop(now+release+.03)}
function playMidi(midi,instrument,duration){const epoch=audioEpoch,info=sampleInfo(midi),key=`${instrument}:${info.baseMidi}`,cached=sampleBuffers.get(key);if(cached){playSample(cached,info.rate,instrument,duration);return}loadSample(instrument,midi).then(({buffer,info:loadedInfo})=>{if(epoch===audioEpoch)playSample(buffer,loadedInfo.rate,instrument,duration)}).catch(()=>{if(epoch===audioEpoch)playFallbackMidi(midi,duration)})}
async function preloadSamples(midis,instrument){await Promise.allSettled([...new Set(midis)].map(midi=>loadSample(instrument,midi)))}
function positionPreviewMidis(){return[state.history.at(-1),...state.queue.slice(0,5)].filter(Boolean).map(question=>OPEN_MIDI[question.picked.string]+question.picked.fret)}
function fretboardPreviewMidis(){return[...fbState.questions,...fbState.nextQuestions].flatMap(question=>question.midis)}
function warmPositionSamples(){return pitchSound.checked&&state.audio?preloadSamples(positionPreviewMidis(),toneInstrument.value):Promise.resolve()}
function warmFretboardSamples(){return fbPitchSound.checked&&state.audio?preloadSamples(fretboardPreviewMidis(),fbToneInstrument.value):Promise.resolve()}
function playPitch(question){const seconds=Math.max(.32,Math.min(3,DURATION_BEATS[rhythmSelect.value]*60/+bpm.value*.9));playMidi(OPEN_MIDI[question.picked.string]+question.picked.fret,toneInstrument.value,seconds)}
function tick(){const total=+beatsSelect.value*2,current=state.subdivision,quarterBoundary=current%2===0,noteBoundary=current%DURATION_SUBDIVISIONS[rhythmSelect.value]===0;if(quarterBoundary&&metronomeSound.checked)click(current===0);if(noteBoundary){if(!state.firstTick)advanceQuestion();if(pitchSound.checked)playPitch(state.history.at(-1))}state.lastSubdivision=current;state.firstTick=false;drawBeatDots();state.subdivision=(current+1)%total}
async function start(){await ensureAudio();if(pitchSound.checked){$('#startButton').innerHTML='<span>…</span> 載入音源';await warmPositionSamples()}state.running=true;state.started=true;$('#startButton').innerHTML='<span>■</span> 暫停';tick();state.timer=setInterval(tick,60000/+bpm.value/2)}
function pause(){clearInterval(state.timer);state.timer=null;state.running=false;stopActiveSounds();$('#startButton').innerHTML='<span>▶</span> 繼續';drawBeatDots()}
async function resetTransport(keepRunning=state.running){if(state.running)pause();updateDurationOptions();resetQuestions();state.subdivision=0;state.lastSubdivision=0;state.firstTick=true;state.started=false;$('#startButton').innerHTML='<span>▶</span> 開始節拍';drawBeatDots();if(keepRunning)await start()}
function makeFretboardQuestion(excluded){let question;do{const stringIndex=Math.floor(Math.random()*FRETBOARD_STRINGS.length),pitch=Math.floor(Math.random()*12),string=FRETBOARD_STRINGS[stringIndex],frets=[];for(let fret=0;fret<=22;fret++)if((string.pitch+fret)%12===pitch)frets.push(fret);question={stringIndex,string,pitch,name:CHROMATIC_NAMES[pitch],frets,midis:[string.midi+frets[0],string.midi+(frets[1]??frets[0])]}}while(excluded&&question.pitch===excluded.pitch);return question}
function makeFretboardPair(previous){const first=makeFretboardQuestion(previous),second=makeFretboardQuestion(first);return[first,second]}
function createFretboardMeasure(){fbState.questions=fbState.nextQuestions.length?fbState.nextQuestions:makeFretboardPair(null);fbState.nextQuestions=makeFretboardPair(fbState.questions[1]);if(state.audio)void warmFretboardSamples()}
function drawFretboardDots(displayBeat=fbState.lastBeat){const root=$('#fbBeatDots');root.innerHTML='';for(let beat=0;beat<4;beat++){const marker=beat===displayBeat?(fbState.running?'active':fbState.started?'paused':''):'';root.insertAdjacentHTML('beforeend',`<i class="beat-dot ${marker}"></i>`)}}
function renderFretboard(displayBeat=fbState.running?fbState.lastBeat:fbState.beat){const question=fbState.questions[displayBeat<2?0:1],next=displayBeat<2?fbState.questions[1]:fbState.nextQuestions[0];if(!question)return;$('#fbStringName').textContent=question.string.label;$('#fbNoteName').textContent=question.name;$('#fbNextQuestion').textContent=`${next.string.label} · ${next.name}`;$('#fbMeasureCounter').textContent=`第 ${fbState.measure} 小節`;$('#fbBeatCounter').textContent=`第 ${displayBeat+1} 拍 / 4`;drawFretboardDots(displayBeat)}
function fretboardTick(){const current=fbState.beat;if(current===0&&!fbState.firstTick){fbState.measure++;createFretboardMeasure()}const question=fbState.questions[current<2?0:1];if(fbMetronomeSound.checked)click(current===0);if(fbPitchSound.checked)playMidi(question.midis[current%2],fbToneInstrument.value,Math.max(.32,Math.min(1.8,60/+fbBpm.value*.9)));fbState.lastBeat=current;fbState.firstTick=false;renderFretboard(current);fbState.beat=(current+1)%4}
async function startFretboard(){await ensureAudio();if(fbPitchSound.checked){$('#fbStartButton').innerHTML='<span>…</span> 載入音源';await warmFretboardSamples()}fbState.running=true;fbState.started=true;$('#fbStartButton').innerHTML='<span>■</span> 暫停';fretboardTick();fbState.timer=setInterval(fretboardTick,60000/+fbBpm.value)}
function pauseFretboard(){clearInterval(fbState.timer);fbState.timer=null;fbState.running=false;stopActiveSounds();$('#fbStartButton').innerHTML='<span>▶</span> 繼續';drawFretboardDots(fbState.lastBeat)}
async function resetFretboard(keepRunning=fbState.running){if(fbState.running)pauseFretboard();fbState.beat=0;fbState.lastBeat=0;fbState.firstTick=true;fbState.measure=1;fbState.started=false;fbState.questions=[];fbState.nextQuestions=[];createFretboardMeasure();$('#fbStartButton').innerHTML='<span>▶</span> 開始節拍';renderFretboard(0);if(keepRunning)await startFretboard()}
function setActiveTab(name,persist=true){const position=name==='position';stopActiveSounds();if(position&&fbState.running)pauseFretboard();if(!position&&state.running)pause();$('#positionPage').hidden=!position;$('#fretboardPage').hidden=position;$('#positionTabButton').classList.toggle('active',position);$('#fretboardTabButton').classList.toggle('active',!position);$('#positionTabButton').setAttribute('aria-selected',String(position));$('#fretboardTabButton').setAttribute('aria-selected',String(!position));savedActiveTab=position?'position':'fretboard';if(persist)saveSettings()}
function updateSummaries(){const keys=selectedTonicPitches().map(pitch=>TONIC_CHOICES.find(choice=>choice[1]===pitch)[0]),scales=selectedScaleIds().map(id=>SCALES[id].label);$('#keySummary').textContent=keys.length<=3?keys.join('、'):`已選 ${keys.length} 個調`;$('#scaleSummary').textContent=scales.length<=3?scales.join('、'):`已選 ${scales.length} 種`}
function saveSettings(){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify({keys:checkedValues('#keyChoices'),scales:selectedScaleIds(),positions:[...document.querySelectorAll('#positionChoices input:checked')].map(input=>input.value),notationMode:notationMode.value,generatorMode:generatorMode.value,toneInstrument:toneInstrument.value,metronomeSound:metronomeSound.checked,pitchSound:pitchSound.checked,bpm:bpm.value,beats:beatsSelect.value,rhythm:rhythmSelect.value,keyOpen:$('#keyDetails').open,scaleOpen:$('#scaleDetails').open,activeTab:savedActiveTab,fbBpm:fbBpm.value,fbToneInstrument:fbToneInstrument.value,fbMetronomeSound:fbMetronomeSound.checked,fbPitchSound:fbPitchSound.checked}))}catch(error){console.warn('Settings could not be saved',error)}}
function restoreChecks(selector,values){if(!Array.isArray(values))return;document.querySelectorAll(`${selector} input`).forEach(input=>input.checked=values.includes(input.value))}
function restoreSelect(control,value){if(value!=null&&[...control.options].some(option=>option.value===String(value)))control.value=String(value)}
function loadSettings(){try{const settings=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'null');if(!settings)return;const migratedKeys=settings.keys||[...(settings.majorKeys||[]),...(settings.minorKeys||[])].map(value=>String(value).split('|').at(-1)).filter((value,index,array)=>array.indexOf(value)===index);restoreChecks('#keyChoices',migratedKeys);restoreChecks('#scaleChoices',settings.scales);restoreChecks('#positionChoices',settings.positions);restoreSelect(notationMode,settings.notationMode);restoreSelect(generatorMode,settings.generatorMode);restoreSelect(toneInstrument,settings.toneInstrument);restoreSelect(fbToneInstrument,settings.fbToneInstrument);restoreSelect(beatsSelect,settings.beats);restoreSelect(rhythmSelect,settings.rhythm);if(settings.bpm!=null)bpm.value=settings.bpm;if(settings.fbBpm!=null)fbBpm.value=settings.fbBpm;if(typeof settings.metronomeSound==='boolean')metronomeSound.checked=settings.metronomeSound;if(typeof settings.pitchSound==='boolean')pitchSound.checked=settings.pitchSound;if(typeof settings.fbMetronomeSound==='boolean')fbMetronomeSound.checked=settings.fbMetronomeSound;if(typeof settings.fbPitchSound==='boolean')fbPitchSound.checked=settings.fbPitchSound;if(settings.activeTab==='fretboard')savedActiveTab='fretboard';$('#keyDetails').open=!!settings.keyOpen;$('#scaleDetails').open=!!settings.scaleOpen}catch(error){console.warn('Settings could not be loaded',error)}}
function ensureChecked(selector,fallback){const inputs=[...document.querySelectorAll(`${selector} input`)];if(!inputs.some(input=>input.checked)){const preferred=inputs.find(input=>input.value===fallback)||inputs[0];preferred.checked=true}}
function restart(){updateDurationOptions();updateSummaries();saveSettings();resetTransport(state.running)}

$('#startButton').onclick=async()=>state.running?pause():await start();
$('#resetButton').onclick=()=>resetTransport(state.running);
$('#fbStartButton').onclick=async()=>fbState.running?pauseFretboard():await startFretboard();
$('#fbResetButton').onclick=()=>resetFretboard(fbState.running);
$('#positionTabButton').onclick=()=>setActiveTab('position');
$('#fretboardTabButton').onclick=()=>setActiveTab('fretboard');
bpm.oninput=async()=>{$('#bpmValue').textContent=bpm.value;saveSettings();if(state.running){pause();await start()}};
fbBpm.oninput=async()=>{$('#fbBpmValue').textContent=fbBpm.value;saveSettings();if(fbState.running){pauseFretboard();await startFretboard()}};
[notationMode,generatorMode,beatsSelect,rhythmSelect].forEach(control=>control.onchange=restart);
toneInstrument.onchange=()=>{saveSettings();if(state.audio)void warmPositionSamples()};
pitchSound.onchange=()=>{saveSettings();if(state.audio)void warmPositionSamples()};
metronomeSound.onchange=saveSettings;
fbToneInstrument.onchange=()=>{saveSettings();if(state.audio)void warmFretboardSamples()};
fbPitchSound.onchange=()=>{saveSettings();if(state.audio)void warmFretboardSamples()};
fbMetronomeSound.onchange=saveSettings;
document.querySelectorAll('#positionChoices input').forEach(control=>control.onchange=()=>{ensureChecked('#positionChoices','0');restart()});
document.querySelectorAll('#keyChoices input').forEach(control=>control.onchange=()=>{ensureChecked('#keyChoices','9');restart()});
document.querySelectorAll('#scaleChoices input').forEach(control=>control.onchange=()=>{ensureChecked('#scaleChoices','major');restart()});
[$('#keyDetails'),$('#scaleDetails')].forEach(details=>details.ontoggle=saveSettings);
loadSettings();setActiveTab(savedActiveTab,false);ensureChecked('#keyChoices','9');ensureChecked('#scaleChoices','major');ensureChecked('#positionChoices','0');$('#bpmValue').textContent=bpm.value;$('#fbBpmValue').textContent=fbBpm.value;restart();resetFretboard(false);saveSettings();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
