const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const app=fs.readFileSync('app.js','utf8'),source=fs.readFileSync('chords.js','utf8');
const ctx=vm.createContext({console,assert});
vm.runInContext(app.slice(0,app.indexOf('const notationMode='))+
  app.slice(app.indexOf('function choose(list)'),app.indexOf('function updateDurationOptions'))+
  app.slice(app.indexOf('function choosePositionIndex'),app.indexOf('function musicalLocation'))+
  source.slice(0,source.indexOf('const chordPage='))+
  source.slice(source.indexOf('function chordSpellings'),source.indexOf('function resetChords'))+`
  let mode='musical',rhythm='w';const chValue=id=>id==='Rhythm'?rhythm:mode,generatorMode={value:'musical'};
  const ch={queue:[],index:0,pool:[]};
  let voicings=0;
  for(let root=0;root<12;root++)for(const type of CHORD_TYPES)for(let p=0;p<5;p++){
    const vs=chordVoicings(root,type,p);
    if(vs.length)ch.pool.push({root,type,positionIndex:p,voicings:vs});
    for(const v of vs){voicings++;assert(v.notes.every(n=>type.tones.includes((n.midi-root+120)%12)));assert(v.notes.some(n=>n.midi%12===root));
      assert(v.frets.filter(f=>f>=0).every(f=>POSITIONS[p].direction==='up'?f<=v.anchor:f>=v.anchor));
      assert.deepEqual(v.omitted,type.tones.filter(t=>!v.notes.some(n=>(n.midi-root+120)%12===t)));
      for(const n of v.notes){const key=chordNotationKey({root,type},n),[name,oct]=key.split('/');const accidental=[...name.slice(1)].reduce((s,c)=>s+(c==='#'?1:-1),0);assert.equal(NATURAL[name[0]]+accidental+Number(oct)*12,n.midi);}
    }
  }
  for(const type of CHORD_TYPES)assert(ch.pool.some(p=>p.type===type),'No usable grips: '+type.id);
  assert.equal(chordVoicings(0,CHORD_TYPES.find(t=>t.id==='13'),4).length,0);
  assert.equal(chordOmission({type:CHORD_TYPES.find(t=>t.id==='13'),v:{omitted:[7,2,5]}}),'省略 五音、九音、十一音');
  let seed=137;Math.random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};
  function sample(m){mode=m;ch.queue=[];ch.index=5000;fillChords();let stays=0,far=0,totalDistance=0;for(let i=1;i<ch.queue.length;i++){const a=ch.queue[i-1],b=ch.queue[i],d=Math.abs(chordHandPosition(a.v)-chordHandPosition(b.v));stays+=a.positionIndex===b.positionIndex;far+=d>8;totalDistance+=d}return {stays:stays/5004,far:far/5004,distance:totalDistance/5004}}
  const musical=sample('musical'),random=sample('random');
  assert(musical.stays<.35);assert(musical.far>0);assert(musical.distance<random.distance);
  // Remaining in place becomes less likely, but is never forbidden.
  const q=ch.queue[0];assert(chordMoveWeight(q,q,[q,q,q])<chordMoveWeight(q,q,[q]));
  assert.deepEqual(diatonicChords(0,'major','triads').map(q=>q.rootLabel+q.type.symbol),['C','Dm','Em','F','G','Am','Bdim']);
  assert.deepEqual(diatonicChords(0,'major','sevenths').map(q=>q.rootLabel+q.type.symbol),['Cmaj7','Dm7','Em7','Fmaj7','G7','Am7','Bm7b5']);
  assert.deepEqual(diatonicChords(9,'minor','triads').map(q=>q.rootLabel+q.type.symbol),['Am','Bdim','C','Dm','Em','F','G']);
  assert(diatonicChords(6,'major','triads').some(q=>q.rootLabel==='E#'&&q.type.id==='dim'));
  assert(diatonicChords(6,'major','triads').some(q=>q.rootLabel==='Cb'&&q.type.id==='major'));
  for(let key=0;key<12;key++)for(const scale of CHORD_SCALE_IDS)for(const [family] of CHORD_FAMILIES)
    for(const q of diatonicChords(key,scale,family))assert(q.type.tones.every(t=>SCALES[scale].intervals.includes((q.root+t-key+12)%12)));
  ch.pool=[0,7].flatMap(key=>diatonicChords(key,'major','triads').flatMap(q=>{const vs=chordVoicings(q.root,q.type,0);return vs.length?[{...q,positionIndex:0,voicings:vs}]:[]}));
  rhythm='h';ch.queue=[];ch.index=50;fillChords();
  for(let i=0;i+1<ch.queue.length;i+=2)assert.equal(ch.queue[i].contextId,ch.queue[i+1].contextId);
  const settings={diatonic:true,manual:true,keys:[0],scales:['major'],families:['triads'],manualRoots:[0],manualTypes:['7','major'],positions:[0,1,2,3,4]};
  const mixed=buildChordPool(settings);
  assert(mixed.some(q=>q.root===0&&q.type.id==='7'&&q.manual));
  assert(mixed.some(q=>q.root===2&&q.type.id==='m'&&!q.manual));
  assert.equal(mixed.length,new Set(mixed.map(q=>[q.contextId,q.root,q.type.id,q.positionIndex].join(':'))).size);
  assert(buildChordPool({...settings,diatonic:false}).every(q=>q.root===0&&['7','major'].includes(q.type.id)));
  assert(!buildChordPool({...settings,manual:false}).some(q=>q.root===0&&q.type.id==='7'));
  console.log(JSON.stringify({voicings,musical,random,diatonic:'passed',mixed:'passed'},null,2));
`,ctx);
const timing=vm.createContext({assert});
vm.runInContext(`
const DURATION_SUBDIVISIONS={w:8,h:4,q:2,'8':1},DURATION_BEATS={w:4,h:2,q:1,'8':.5};
let beats=4,rhythm='q',events=[];
const ch={sub:0,started:false,index:0,last:0,queue:Array.from({length:20},()=>({v:{notes:[{midi:48}]}}))};
const chValue=id=>id==='Beats'?beats:id==='Rhythm'?rhythm:80,chChecked=()=>true;
const click=accent=>events.push({accent,sub:ch.last,index:ch.index}),stopActiveSounds=()=>events.push('stop');
const playMidi=()=>{},renderChords=()=>{},fillChords=()=>{},warmChords=async()=>{};
`+source.slice(source.indexOf('function chordTick'),source.indexOf('async function startChords'))+`
for(rhythm of ['w','h']){
 ch.sub=0;ch.started=false;ch.index=0;events=[];
 for(let i=0;i<beats*6;i++)chordTick();
 const clicks=events.filter(e=>typeof e==='object');assert.equal(clicks.length,beats*3);
 clicks.forEach((e,i)=>assert.equal(e.accent,i%beats===0));
 assert(clicks.every(e=>e.accent?e.sub===0:e.sub!==0));
 clicks.forEach((e,i)=>assert.equal(e.index,Math.floor(i/DURATION_BEATS[rhythm])));
 // Stopping between ticks leaves the next subdivision unchanged on resume.
 const next=ch.sub;chordTick();assert.equal(ch.last,next);
}
`,timing);
console.log('4/4: whole/half chord changes, downbeat and resume passed.');
