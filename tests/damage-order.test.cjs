const {test}=require('node:test');
const assert=require('node:assert/strict');
const {engine}=require('./harness.cjs');

function setup(skill){
 const a=engine(),g=a.game(['zhangfei','simayi','zhaoyun','sunquan','guanyu']);
 const [source,target,saver]=g.players;
 for(const p of g.players){p.skills=[];p.hand=[];}
 target.skills=[skill];target.hp=1;g.checkWin=()=>false;
 g.askSkill=async()=>false;g.askSave=async()=>null;g.ask=async()=>null;
 return {a,g,source,target,saver,card:(name='杀')=>a.makeCard(name,'heart',7)};
}

// Use actual peach cards through the full dying/rescue pipeline.
function rescue(f,n=1){
 const {g,saver,card}=f;saver.hand=Array.from({length:n},()=>card('桃'));
 g.askSave=async(p)=>p===saver?saver.hand.find(c=>c.name==='桃')||null:null;
}

for(const skill of ['fankui','ganglie','yiji','jieming','fangzhu','xinsheng','enyuan','zhiyu','chengxiang','yuce','duodao','huituo','danxin','guixin']){
 test(`${skill}: multi-point lethal damage waits for all peaches; death skips the skill`,async()=>{
  for(const saved of [true,false]){
   const f=setup(skill),{g,source,target,card,saver}=f;
   source.hand=[card()];source.equips.weapon=card('青釭剑');target.hand=[card()];
   let offered=0;
   if(saved)rescue(f,2);
   g.askSkill=async(p,id)=>{
    if(p===target&&id===skill){
     offered++;assert.equal(target.hp,1);assert.equal(target.alive,true);
     assert.equal(saver.hand.length,0,'both peaches must be consumed first');
    }
    return false;
   };
   await g.damage({source,target,n:2,card:card()});
   assert.equal(target.alive,saved);assert.equal(offered,saved?1:0);
   assert.equal(target.flags.damageTimes,1);
  }
 });
}

test('feedback cannot steal a peach before dying to save itself',async()=>{
 const {g,source,target,card}=setup('fankui');const peach=card('桃');source.hand=[peach];
 g.askSkill=async()=>true;
 g.ask=async(p,r)=>r.kind==='pickArea'?peach:null;
 // Only the victim would use a peach; the source refuses rescue.
 g.askSave=async(p)=>p===target?target.hand.find(c=>c.name==='桃')||null:null;
 await g.damage({source,target,n:1});
 assert.equal(target.alive,false);assert.ok(source.hand.includes(peach));
});

test('feedback really obtains a source card after rescue',async()=>{
 const f=setup('fankui'),{g,source,target,card}=f;rescue(f);
 const loot=card();source.hand=[loot];
 g.askSkill=async(p,id)=>id==='fankui';g.ask=async(p,r)=>r.kind==='pickArea'?loot:null;
 await g.damage({source,target,n:1});
 assert.equal(target.hp,1);assert.ok(target.hand.includes(loot));assert.equal(source.hand.length,0);
});

test('Jianxiong obtains the original slash after rescue while it remains in processing',async()=>{
 const f=setup('jianxiong'),{g,source,target,card}=f;rescue(f);
 const slash=card();source.hand=[slash];
 g.askSkill=async(p,id)=>{if(id==='jianxiong'){assert.equal(target.hp,1);return true;}return false;};
 await g.useCard(source,slash,[target]);
 assert.ok(target.hand.includes(slash));assert.ok(!g.discard.includes(slash));assert.equal(g.processing.length,0);
});

test('Shibei cannot heal out of dying before rescue, but heals after successful rescue',async()=>{
 for(const saved of [false,true]){
  const f=setup('shibei');if(saved)rescue(f);
  await f.g.damage({source:f.source,target:f.target,n:1});
  assert.equal(f.target.alive,saved);assert.equal(f.target.hp,saved?2:0);
 }
});

test('Renjie only gains marks after surviving dying, retaining the damage point count',async()=>{
 for(const saved of [false,true]){
  const f=setup('renjie');if(saved)rescue(f,2);
  const save=f.g.askSave;
  f.g.askSave=async(...args)=>{assert.equal(f.target.marks.bear,undefined);return save(...args);};
  await f.g.damage({source:f.source,target:f.target,n:2});
  assert.equal(f.target.marks.bear,saved?2:undefined);
 }
});

test('fatal damage does not add Wuhun marks before its death judgement',async()=>{
 const {g,source,target}=setup('wuhun');
 await g.damage({source,target,n:1});
 assert.equal(target.alive,false);assert.equal(source.alive,true);assert.equal(source.marks.nightmare,undefined);
});

test('Beige cannot rescue a victim or judge for an already dead victim',async()=>{
 const {g,source,target,saver,card}=setup('fankui');saver.skills=['beige'];saver.hand=[card()];
 let beige=0;g.askSkill=async(p,id)=>{if(id==='beige')beige++;return false;};
 await g.damage({source,target,n:1,card:card()});
 assert.equal(target.alive,false);assert.equal(beige,0);
});

test('source damage skills survive victim death, and fatal damage remains recorded',async()=>{
 const {g,source,target,card}=setup('renjie');source.skills=['kuangbao'];source.marks.wrath=2;
 const slash=card();
 await g.damage({source,target,n:1,card:slash});
 assert.equal(target.alive,false);assert.equal(source.marks.wrath,3);
 assert.equal(slash._yjDamage,true);assert.ok(slash._yjVictims.has(target));assert.equal(g._phaseDamage,true);
});

test('source post-damage skill resolves after rescue and before victim feedback',async()=>{
 const f=setup('fankui'),{g,source,target,card}=f;rescue(f);
 source.skills=['kuanggu'];source.hp=1;source.hand=[card()];
 let seen=false;g.askSkill=async(p,id)=>{if(id==='fankui'){seen=true;assert.equal(target.hp,1);assert.equal(source.hp,2);}return false;};
 await g.damage({source,target,n:1});assert.equal(seen,true);
});

test('Buqu survival at zero HP still allows post-damage skills',async()=>{
 const {g,source,target,card}=setup('fankui');target.skills.push('buqu');source.hand=[card()];
 g.deck=[card()];let seen=false;
 g.askSkill=async(p,id)=>{if(id==='fankui'){seen=true;assert.equal(target.hp,0);assert.equal(target.marks.buquSafe,true);}return id==='buqu';};
 await g.damage({source,target,n:1});assert.equal(target.alive,true);assert.equal(seen,true);
});

test('elemental chains still propagate after the initial victim dies',async()=>{
 const {g,source,target,saver}=setup('fankui');target.marks.linked=saver.marks.linked=true;
 const hp=saver.hp;await g.damage({source,target,n:1,nature:'fire'});
 assert.equal(target.alive,false);assert.equal(saver.hp,hp-1);
 assert.equal(target.marks.linked,false);assert.equal(saver.marks.linked,false);
});
