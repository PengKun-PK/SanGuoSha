const {test}=require('node:test');
const assert=require('node:assert/strict');
const {engine}=require('./harness.cjs');

function fixture(){
 const a=engine(),g=a.game(['zhangfei','zhaoyun','guanyu','sunquan','simayi']);
 for(const p of g.players){p.skills=[];p.hand=[];p.hp=p.maxHp=8;}
 g.askSkill=async()=>false;g.askSave=async()=>null;g.ask=async()=>null;
 const [source,first,second,third,unlinked]=g.players;
 first.marks.linked=second.marks.linked=third.marks.linked=true;
 return {a,g,source,first,second,third,unlinked};
}

for(const name of ['火杀','雷杀'])test(`${name} propagates through three chained players via actual card use`,async()=>{
 const {a,g,source,first,second,third,unlinked}=fixture();
 const card=a.makeCard(name,'heart',7);source.hand=[card];
 await g.useCard(source,card,[first]);
 for(const p of [first,second,third]){assert.equal(p.hp,7);assert.equal(p.marks.linked,false);}
 assert.equal(unlinked.hp,8);assert.equal(source.hp,8);
});

test('Lightning judgement deals three thunder damage to every chained player',async()=>{
 const {a,g,source,first,second,third,unlinked}=fixture();
 first.judges=[a.makeCard('闪电','spade',1)];g.deck=[a.makeCard('杀','spade',5)];
 g.curPlayer=first;g.phase='judge';
 await g.runPhase(first,'judge');
 for(const p of [first,second,third]){assert.equal(p.hp,5);assert.equal(p.marks.linked,false);}
 assert.equal(unlinked.hp,8);assert.equal(source.hp,8);
});

test('Jueqing fire slash is HP loss and does not propagate or remove chains',async()=>{
 const {a,g,source,first,second,third}=fixture();source.skills=['jueqing'];
 const card=a.makeCard('火杀','heart',7);source.hand=[card];
 await g.useCard(source,card,[first]);
 assert.equal(first.hp,7);assert.equal(second.hp,8);assert.equal(third.hp,8);
 for(const p of [first,second,third])assert.equal(p.marks.linked,true);
});
