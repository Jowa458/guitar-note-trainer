const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const app=fs.readFileSync('app.js','utf8');
const ctx=vm.createContext({assert,console});
vm.runInContext(app.slice(0,app.indexOf('const notationMode='))+
  app.slice(app.indexOf('function choose(list)'),app.indexOf('function updateDurationOptions'))+
  app.slice(app.indexOf('function spelledScale'),app.indexOf('function musicalLocation'))+
  app.slice(app.indexOf('let uniformNoteCache='),app.indexOf('function buildQuestion'))+`
  let seed=317;Math.random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};
  let combos=[{key:{label:'A',pitch:9},scaleId:'major'},{key:{label:'A',pitch:9},scaleId:'minor'}],per=4;
  const selectedCombos=()=>combos,selectedPositions=()=>[0,1,2,3,4],notesPerMeasure=()=>per,state={build:null};
  const pool=uniformNotePool();assert.equal(pool.ids.length,10);
  // Every one of the ten equal random intervals remains available on beat 2,
  // even when the reference signature is the minor scale.
  const seededRandom=Math.random,minorGroup=pool.groups.find(g=>g.scaleId==='minor');
  pool.ids.forEach((pitch,index)=>{
    state.build={slot:1,randomGroup:minorGroup,lastMidi:60};let call=0;
    Math.random=()=>call++===0?(index+.5)/pool.ids.length:.5;
    const q=buildUniformQuestion(false);assert.equal(q.picked.pitch,pitch);assert.equal(q.scaleId,'minor');assert(q.randomScopeLabel.includes('混合'));
  });
  Math.random=seededRandom;
  const report={};
  for(per of [1,2,4,8]){
    state.build=null;const counts=new Map(pool.ids.map(id=>[id,0]));
    for(let measure=0;measure<5000;measure++){
      let first;
      for(let slot=0;slot<per;slot++){
        const q=buildUniformQuestion(false);first||=q;
        assert.equal(q.key.label,first.key.label);assert.equal(q.scaleId,first.scaleId);assert.equal(q.positionIndex,first.positionIndex);
        assert(pool.ids.includes(q.picked.pitch));
        assert.equal((OPEN_PITCH_CLASS[q.picked.string]+q.picked.fret)%12,q.picked.pitch);
        counts.set(q.picked.pitch,counts.get(q.picked.pitch)+1);
      }
    }
    const ratios=[...counts.values()].map(n=>n/(5000*per));assert(ratios.every(p=>Math.abs(p-.1)<.02));
    report[per]={min:Math.min(...ratios),max:Math.max(...ratios)};
  }
  // Duplicating a source does not change the exact target probabilities.
  combos=[...combos,combos[0],combos[0]];assert.equal(uniformNotePool().ids.length,10);
  // Every four-fret reference position can represent the entire chromatic union.
  for(let start=0;start<24;start++)for(let pitch=0;pitch<12;pitch++)assert(OPEN_PITCH_CLASS.some(open=>[0,1,2,3].some(offset=>(open+start+offset)%12===pitch)));
  // An identity with many fingerings is still counted once.
  const artificial=makeUniformPool([{options:new Map([['A',Array(100).fill('A')],['B',['B']]])},{options:new Map([['A',['A']],['C',['C']]])}]);
  assert.equal(artificial.ids.length,3);assert.equal(artificial.counts.get('A'),2);
  console.log('A major/minor union: 10 pitch classes, each exact probability 10%.',report);
`,ctx);
