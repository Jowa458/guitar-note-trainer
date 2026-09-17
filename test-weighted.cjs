const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const app=fs.readFileSync('app.js','utf8'),ctx=vm.createContext({assert,console});
vm.runInContext(app.slice(0,app.indexOf('const notationMode='))+
  app.slice(app.indexOf('function choose(list)'),app.indexOf('function updateDurationOptions'))+
  app.slice(app.indexOf('function spelledScale'),app.indexOf('let uniformNoteCache='))+`
  const rhythmSelect={value:'q'},notesPerMeasure=()=>4;
  const major={key:{label:'C',pitch:0},scaleId:'major'},minor={key:{label:'C',pitch:0},scaleId:'minor'};
  const context={...major,positionIndex:0,slot:0,lastMidi:null,lastDelta:0};
  const weights=combos=>new Map(musicalPitchCandidates(combos,context).map(c=>[c.pitch,c.weight]));
  const single=weights([major]),mixed=weights([major,minor]),repeated=weights([major,minor,major,major]);
  assert.equal(mixed.size,10);
  for(const pitch of [0,2,5,7])assert.equal(mixed.get(pitch),single.get(pitch),'Shared scale degree received duplicate weight: '+pitch);
  mixed.forEach((weight,pitch)=>assert.equal(repeated.get(pitch),weight));
  assert(mixed.get(0)>mixed.get(2),'Musical root preference must remain');
  const sharp={key:{label:'F♯',pitch:6},scaleId:'major'},flat={key:{label:'G♭',pitch:6},scaleId:'major'};
  const oneSpelling=weights([sharp]),bothSpellings=weights([sharp,flat]);
  oneSpelling.forEach((weight,pitch)=>assert.equal(bothSpellings.get(pitch),weight));
  // Check the same invariance with melodic movement and phrase-ending weights.
  context.lastMidi=60;context.lastDelta=-5;context.slot=3;
  const moving=weights([major,minor]),duplicated=weights([major,minor,minor]);
  moving.forEach((weight,pitch)=>assert.equal(duplicated.get(pitch),weight));
  assert([...moving.values()].every(w=>Number.isFinite(w)&&w>0));
  console.log('Weighted union passed: shared C/D/F/G unchanged; duplicate sources and enharmonic spellings add no weight; musical preferences retained.');
`,ctx);
