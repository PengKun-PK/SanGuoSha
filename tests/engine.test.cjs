const {test}=require('node:test');
const assert=require('node:assert/strict');
const {engine}=require('./harness.cjs');

test('Huang Gai AI respects Kurou health and hand thresholds',async()=>{
 for(const [hp,handCount,wantsKurou] of [[1,0,false],[1,2,false],[2,1,false],[2,0,true],[3,2,true],[4,3,false]]){
  const a=engine(),g=a.game(['huanggai','zhangfei','zhaoyun']),p=g.players[0];
  p.hp=hp;p.hand=Array.from({length:handCount},()=>a.makeCard('闪','heart',2));
  assert.equal(a.SKILLS.kurou.avail(g,p),true,'legal player activation remains available');
  const act=await a.AI.playTurn(g,p);
  assert.equal(act.skill==='kurou',wantsKurou,`hp=${hp}, hand=${handCount}`);
 }
});

test('Huang Gai AI stops repeated Kurou instead of dying during its play phase',async()=>{
 const a=engine(),g=a.game(['huanggai','zhangfei','zhaoyun']),p=g.players[0];
 p.hand=[];g.deck=Array.from({length:20},()=>a.makeCard('闪','heart',2));
 g.askSave=async()=>null;
 await g.playPhase(p);
 assert.equal(p.alive,true);assert.equal(p.hp,2);assert.equal(p.hand.length,4);
 assert.equal(g.logs.filter(s=>s.includes('发动了')&&s.includes('苦肉')).length,2);
});

test('AI chains two targets with one known enemy and an unknown second target',async()=>{
 const a=engine(),g=a.game(['caocao','zhangfei','zhaoyun','guanyu','sunquan']);
 const [lord,p,unknown]=g.players;g.curPlayer=p;
 const chain=a.makeCard('铁索连环','club',12);p.hand=[chain];
 const act=await a.AI.playTurn(g,p);
 assert.equal(act.card,chain);assert.deepEqual(Array.from(act.targets),[lord,unknown]);
 assert.ok(g.validPlay(p,act));await g.useCard(p,act.card,act.targets);
 assert.equal(lord.marks.linked,true);assert.equal(unknown.marks.linked,true);
 assert.equal(p.marks.linked,undefined);
});

test('AI prioritizes two known enemies over unknown seats',async()=>{
 const a=engine(),g=a.game(),[p,unknown,enemy1,enemy2]=g.players;
 p.ai.suspect[enemy1.seat]=100;p.ai.suspect[enemy2.seat]=80;
 p.hand=[a.makeCard('铁索连环','club',12)];
 const act=await a.AI.playTurn(g,p);
 assert.deepEqual(Array.from(act.targets),[enemy1,enemy2]);
 assert.ok(!act.targets.includes(unknown));assert.ok(g.validPlay(p,act));
});

test('AI chain can unlink itself while linking an enemy and does not chain known friends',async()=>{
 const a=engine(),g=a.game(['caocao','zhangfei','zhaoyun']),[lord,p,friend]=g.players;
 g.curPlayer=p;p.ai.suspect[friend.seat]=100;p.marks.linked=true;
 p.hand=[a.makeCard('铁索连环','club',12)];
 let act=await a.AI.playTurn(g,p);
 assert.equal(act.targets.length,2);assert.ok(act.targets.includes(p));assert.ok(act.targets.includes(lord));
 assert.ok(g.validPlay(p,act));await g.useCard(p,act.card,act.targets);
 assert.equal(p.marks.linked,false);assert.equal(lord.marks.linked,true);
 lord.marks.linked=false;p.hand=[a.makeCard('铁索连环','club',12)];
 act=await a.AI.playTurn(g,p);assert.deepEqual(Array.from(act.targets),[lord]);
});

test('AI chain respects Weimu and recasts when no beneficial target exists',async()=>{
 const a=engine(),g=a.game(['caocao','zhangfei','jiaxu','zhaoyun']),[lord,p,blocked,unknown]=g.players;
 g.curPlayer=p;p.hand=[a.makeCard('铁索连环','club',12)];
 let act=await a.AI.playTurn(g,p);
 assert.deepEqual(Array.from(act.targets),[lord,unknown]);assert.ok(!act.targets.includes(blocked));
 lord.marks.linked=true;act=await a.AI.playTurn(g,p);
 assert.equal(act.type,'skill');assert.equal(act.skill,'recast');
});

test('119 generals; all expansion generals have executable skill registrations',()=>{const a=engine();assert.equal(Object.keys(a.GENERALS).length,119);for(const pack of ['风','火','林','山'])assert.equal(Object.values(a.GENERALS).filter(x=>x.pack===pack).length,8);for(const gen of Object.values(a.GENERALS))for(const id of gen.skills){assert.ok(a.SKILLS[id],id);assert.ok(a.SKILL_TEXT[id]?.[1],id);assert.ok(a.SKILLS[id].run||a.SKILLS[id].passive||a.SKILLS[id].event==='_viewas',id);}});

test('160-card deck includes a complete 52-card military expansion',()=>{
 const a=engine(),g=a.game(),cards=g.deck.filter(c=>c.pack==='军争');
 assert.equal(g.deck.length,160);assert.equal(cards.length,52);
 for(const suit of ['spade','heart','club','diamond'])assert.deepEqual(Array.from(cards.filter(c=>c.printedSuit===suit),c=>c.num).sort((a,b)=>a-b),Array.from({length:13},(_,i)=>i+1));
 assert.equal(cards.filter(c=>c.nature==='fire').length,5);assert.equal(cards.filter(c=>c.nature==='thunder').length,9);
});
test('elemental slash responds as slash, uses the same limit and interacts with vine',async()=>{
 for(const [name,damage] of [['火杀',2],['雷杀',1]]){
  const a=engine(),g=a.game(['zhangfei','zhaoyun','guanyu']),[p,t]=g.players;p.skills=[];t.skills=[];
  const c=a.makeCard(name,'heart',4);p.hand=[c];t.hand=[];t.equips.armor=a.makeCard('藤甲','club',2);
  assert.ok(a.Skills.canProvide(g,p,'杀'));await g.useCard(p,c,[t]);
  assert.equal(t.hp,t.maxHp-damage);assert.equal(p.flags.shaUsed,1);assert.equal(g.canUseInPlay(p,a.makeCard('杀','spade',7)),false);
 }
});
test('Guding bonus, Silver Lion cap, Qinggang bypass and lion equipment loss',async()=>{
 const a=engine(),g=a.game(['zhangfei','zhaoyun','guanyu']),[p,t]=g.players;p.skills=[];t.skills=[];
 p.equips.weapon=a.makeCard('古锭刀','spade',1);t.hand=[];t.equips.armor=a.makeCard('白银狮子','club',1);
 await a.CardEffect['杀'](g,{user:p,target:t,card:a.makeCard('杀','heart',10),opt:{drank:true}});assert.equal(t.hp,t.maxHp-1);
 p.equips.weapon=a.makeCard('青釭剑','spade',6);
 await a.CardEffect['杀'](g,{user:p,target:t,card:a.makeCard('杀','heart',10),opt:{drank:true}});assert.equal(t.hp,t.maxHp-3);
 await g.installEquip(t,a.makeCard('藤甲','club',2));assert.equal(t.hp,t.maxHp-2);
 await g.installEquip(t,a.makeCard('白银狮子','club',1));await g.gain(p,[t.equips.armor],t);assert.equal(t.hp,t.maxHp-1);
 t.equips.armor=null;t.hp=t.maxHp;p.equips.weapon=a.makeCard('古锭刀','spade',1);
 await a.CardEffect['杀'](g,{user:p,target:t,card:a.makeCard('杀','heart',10),opt:{}});assert.equal(t.hp,t.maxHp-2);
});
test('Vermilion Fan changes only the current slash and Hualiu increases distance',async()=>{
 const a=engine(),g=a.game(['zhangfei','zhaoyun','guanyu']),[p,t]=g.players;p.skills=[];t.skills=[];
 p.equips.weapon=a.makeCard('朱雀羽扇','diamond',1);t.equips.armor=a.makeCard('藤甲','club',2);
 const c=a.makeCard('杀','heart',10);p.hand=[c];g.ask=async(_,req)=>req.tag==='zhuque'?true:null;
 await g.useCard(p,c,[t]);assert.equal(t.hp,t.maxHp-2);assert.equal(c.nature,null);assert.ok(g.discard.includes(c));assert.equal(g.processing.length,0);
 const distance=g.distance(p,t);t.equips.horsePlus=a.makeCard('骅骝','diamond',13);assert.equal(g.distance(p,t),distance+1);
});
test('view-as, active availability, legal targets, duplicate cards and halberd limits',()=>{const a=engine(),g=a.game(['guanyu','zhangfei','zhaoyun']);const p=g.players[0],t=g.players[1];const c=a.makeCard('闪','heart',2);p.hand=[c];const v=a.makeVirtual('杀',[c],'wusheng');assert.ok(g.validPlay(p,{card:v,targets:[t]}));p.flags.shaUsed=1;assert.ok(!g.validPlay(p,{card:v,targets:[t]}));p.flags={};p.equips.weapon=a.makeCard('方天画戟','diamond',12);assert.equal(g.targetMax(p,v),3);const fake=a.makeVirtual('杀',[c,c],'zhangba');assert.ok(!g.validPlay(p,{card:fake,targets:[t]}));});
test('guose needs diamond and allows equipment; zhangba needs two hand cards',()=>{const a=engine(),g=a.game(['daqiao','zhangfei']);const p=g.players[0];p.hand=[a.makeCard('桃','heart',4)];assert.equal(a.Skills.options(g,p,'乐不思蜀').length,0);p.equips.horseMinus=a.makeCard('赤兔','diamond',5);assert.equal(a.Skills.options(g,p,'乐不思蜀').length,1);p.equips.weapon=a.makeCard('丈八蛇矛','spade',12);assert.equal(a.Skills.options(g,p,'杀').length,0);p.hand.push(a.makeCard('闪','diamond',9));assert.equal(a.Skills.options(g,p,'杀').length,1);});
test('Luoshen black judgement remains available to collect',async()=>{const a=engine(),g=a.game(['zhenji','zhangfei']);const p=g.players[0];p.skills=['luoshen'];g.deck=[a.makeCard('桃','heart',4),a.makeCard('杀','club',7)];await a.SKILLS.luoshen.run(g,p);assert.equal(p.hand.length,1);assert.equal(p.hand[0].suit,'club');assert.equal(g.discard.length,1);assert.equal(g.processing.length,0);});
test('drunken slash consumes wine on dodge, and virtual ordinary slash is blocked by vine armour',async()=>{const a=engine(),g=a.game(['zhangfei','zhaoyun']);const [p,t]=g.players;p.skills=[];t.skills=[];p.flags.jiuBuff=true;const c=a.makeCard('杀','heart',7);p.hand=[c];t.hand=[a.makeCard('闪','diamond',2)];await g.useCard(p,c,[t]);assert.equal(t.hp,t.maxHp);assert.equal(p.flags.jiuBuff,false);t.equips.armor=a.makeCard('藤甲','spade',2);await a.CardEffect['杀'](g,{user:p,target:t,card:a.makeVirtual('杀',[],'test'),opt:{}});assert.equal(t.hp,t.maxHp);});
test('Wushuang requires two slashes from opponent in duel',async()=>{const a=engine(),g=a.game(['lvbu','zhaoyun']);const [p,t]=g.players;p.hand=[];t.skills=[];t.hand=[a.makeCard('杀','club',7)];await a.CardEffect['决斗'](g,{user:p,target:t,card:a.makeVirtual('决斗',[],'test')});assert.equal(t.hp,t.maxHp-1);assert.equal(p.hp,p.maxHp);});
test('AI plays wine before slash and avoids slash immune targets',async()=>{const a=engine(),g=a.game(['zhangfei','caocao']);const [p,t]=g.players;p.identity='fan';t.identity='zhu';a.AI.setup(g);p.hand=[a.makeCard('杀','club',7),a.makeCard('酒','diamond',9)];t.hp=2;t.skills=[];const act=await a.AI.playTurn(g,p);assert.equal(act.card.name,'酒');p.hand=p.hand.filter(c=>c.name==='杀');t.equips.armor=a.makeCard('仁王盾','club',2);assert.equal((await a.AI.playTurn(g,p)).type,'end');});
test('Awaken, turn over and fields persist across turns',async()=>{const a=engine(),g=a.game(['dengai','zhangfei']);const p=g.players[0];p.marks.fields=[1,2,3].map(n=>a.makeCard('杀','club',n));await g.trigger('phaseStart',{player:p,phase:'start'});assert.ok(p.hasSkill('jixi'));assert.equal(p.maxHp,3);p.marks.turned=true;const before=g.deck.length;await g.playerTurn(p);assert.equal(p.marks.turned,false);assert.equal(g.deck.length,before);assert.equal(p.marks.fields.length,3); });
test('Niepan rescues, Xiangle cancels unpaid slash, Weimu blocks black tricks',async()=>{const a=engine(),g=a.game(['pangtong','liushan','jiaxu']);const [p,t,w]=g.players;p.hp=0;await g.enterDying(p,t);assert.ok(p.alive);assert.equal(p.hp,3);assert.equal(p.hand.length,3);t.skills=['xiangle'];p.hand=[];const hp=t.hp;await a.CardEffect['杀'](g,{user:p,target:t,card:a.makeVirtual('杀',[],'test'),opt:{}});assert.equal(t.hp,hp);assert.equal(g.canTarget(p,a.makeCard('决斗','spade',1),w),false);});
test('AI selection obeys cost filters and mandatory counts',async()=>{const a=engine(),g=a.game(['dianwei','zhangfei']);const p=g.players[0];p.hand=[a.makeCard('桃','heart',3),a.makeCard('青釭剑','spade',6)];const r=await a.AI.decide(g,p,{kind:'select',tag:'qiangxi',min:1,max:1,area:'any',cardFilter:c=>c.slot==='weapon'});assert.equal(r.cards[0].slot,'weapon');const empty=await a.AI.decide(g,p,{kind:'select',min:2,max:2,cardFilter:c=>c.slot==='weapon'});assert.equal(empty,null);});
test('virtual delayed trick keeps its physical card until judgement',async()=>{const a=engine(),g=a.game(['daqiao','zhangfei']);const [p,t]=g.players;p.skills=['guose'];t.skills=[];const c=a.makeCard('闪','diamond',8);p.hand=[c];await g.useCard(p,a.makeVirtual('乐不思蜀',[c],'guose'),[t]);assert.equal(g.discard.includes(c),false);assert.equal(t.judges.length,1);g.curPlayer=t;await g.runPhase(t,'judge');assert.equal(t.judges.length,0);assert.ok(g.discard.includes(c));});
test('taking a converted delayed trick returns its physical card, not its virtual identity',async()=>{const a=engine(),g=a.game(['daqiao','zhangfei','guanyu']);const [p,t,q]=g.players;p.skills=['guose'];t.skills=[];q.skills=[];const c=a.makeCard('闪','diamond',8);p.hand=[c];await g.useCard(p,a.makeVirtual('乐不思蜀',[c],'guose'),[t]);await g.gain(q,[t.judges[0]],t);assert.equal(t.judges.length,0);assert.equal(q.hand[0],c);assert.equal(q.hand[0].name,'闪');assert.equal(g.discard.includes(c),false);});
test('Hongyan modifies hand, played cards and judgement but not discarded printed suit',async()=>{const a=engine(),g=a.game(['xiaoqiao','zhangfei']);const [p,t]=g.players;const c=a.makeCard('杀','spade',7);p.hand=[c];assert.equal(c.suit,'heart');g.removeCard(p,c);g.processing.push(c);assert.equal(c.suit,'heart');g.toDiscard([c]);assert.equal(c.suit,'spade');const d=a.makeCard('桃','spade',3);g.deck=[d];g.askSkill=async()=>false;const r=await g.judge(p,{reason:'test',check:x=>x.suit==='heart'});assert.ok(r.ok);assert.equal(d.suit,'spade');});
test('Buqu allows nonduplicate ranks, duplicates enter dying, healing removes duplicate ranks',async()=>{const a=engine(),g=a.game(['zhoutai','zhangfei']);const p=g.players[0];p.hp=0;g.deck=[a.makeCard('杀','heart',3)];await g.enterDying(p,g.players[1]);assert.ok(p.alive);assert.equal(p.hp,0);assert.equal(p.marks.buqu.length,1);p.hp=-1;p.marks.buqu.push(a.makeCard('闪','diamond',3));await g.recover(p,1);assert.equal(p.marks.buqu.length,1);assert.equal(p.hp,0);});
test('Luanji same-suit validation, lord hand limit and Wansha save restriction',async()=>{const a=engine(),g=a.game(['yuanshao','jiaxu','guanyu']);const [p,j,t]=g.players;p.hand=[a.makeCard('杀','club',2),a.makeCard('闪','diamond',3)];assert.equal(a.Skills.options(g,p,'万箭齐发').length,0);const card=a.makeVirtual('万箭齐发',p.hand,'luanji');assert.equal(g.validPlay(p,{card,targets:[]}),false);assert.equal(g.handLimit(p),p.hp+2);g.curPlayer=j;t.hp=0;p.hand=[a.makeCard('桃','heart',4)];assert.equal(await g.askSave(p,t),null);});
test('Menghuo and Zhurong are immune to invasion; Zhurong obtains the physical invasion',async()=>{const a=engine(),g=a.game(['zhangfei','menghuo','zhurong']);const [p,m,z]=g.players;const card=a.makeCard('南蛮入侵','spade',7);p.hand=[card];const hp=[m.hp,z.hp];await g.useCard(p,card,[]);assert.equal(m.hp,hp[0]);assert.equal(z.hp,hp[1]);assert.ok(z.hand.includes(card));assert.equal(g.discard.includes(card),false);});
test('Tuntian triggers on outside-turn loss and Tianyi win/lose persists for play phase',async()=>{const a=engine(),g=a.game(['zhangfei','dengai','taishici']);const [p,d,t]=g.players;d.hand=[a.makeCard('闪','diamond',4)];g.deck=[a.makeCard('杀','club',5)];await g.discardCards(d,d.hand.slice(),'test');assert.equal(d.marks.fields.length,1);assert.equal(g.processing.length,0);g.curPlayer=t;t.flags.tianyiWin=true;t.flags.shaUsed=1;assert.ok(g.canUseSha(t));t.flags.tianyiLose=true;assert.equal(g.canUseSha(t),false);});
test('elemental damage propagates through linked players and unlinks them',async()=>{const a=engine(),g=a.game(['zhangfei','zhaoyun','guanyu']);const [p,t,q]=g.players;t.skills=[];q.skills=[];t.marks.linked=q.marks.linked=true;await g.damage({source:p,target:t,n:1,nature:'fire'});assert.equal(t.hp,t.maxHp-1);assert.equal(q.hp,q.maxHp-1);assert.equal(t.marks.linked,false);assert.equal(q.marks.linked,false);});
test('Huashen excludes forbidden skills and Duanchang removes the killer skills',async()=>{const a=engine(),g=a.game(['zuoci','caiwenji','zhangfei']);const [p,c,k]=g.players;await a.EX.getForms(g,p,2);assert.equal(p.marks.forms.length,2);await a.EX.transform(g,p);assert.ok(p.marks.formSkill);assert.ok(!a.SKILLS[p.marks.formSkill].lord);await g.trigger('deathBefore',{player:c,killer:k});assert.equal(k.skills.length,0);});
test('Fangquan schedules extra turn and flipping skips exactly the next turn',async()=>{const a=engine(),g=a.game(['liushan','zhangfei']);const [p,t]=g.players;p.hand=[a.makeCard('闪','diamond',2)];p.flags.fangquan=true;g.ask=async(w,r)=>r.kind==='select'?{cards:[p.hand[0]],target:t}:false;await g.runPhase(p,'end');assert.equal(p.marks.extraTurn,t);assert.equal(p.hand.length,0);});
test('Qiangxi, Zhijian and Jieming execute actual costs and benefits',async()=>{const a=engine(),g=a.game(['dianwei','erzhang','xunyu']);const [p,e,x]=g.players;p.hand=[a.makeCard('青釭剑','spade',6)];g.ask=async(w,r)=>r.kind==='chooseTarget'?[x]:r.kind==='select'?{cards:[w.hand[0]],target:null}:false;await a.SKILLS.qiangxi.run(g,p);assert.equal(p.hand.length,0);assert.equal(x.hp,2);assert.ok(p.flags.qiangxiUsed);e.hand=[a.makeCard('八卦阵','club',2)];await a.SKILLS.zhijian.run(g,e);assert.equal(x.equips.armor.name,'八卦阵');assert.equal(e.hand.length,1);await a.SKILLS.jieming.run(g,x,{n:1});assert.equal(x.hand.length,3);});
test('next player after a death is the immediate living successor',()=>{const a=engine(),g=a.game();g.players[1].alive=false;assert.equal(g.nextAlive(g.players[1]),g.players[2]);});
test('automated 8-seat games across every expansion roster finish turns without errors',async()=>{const a=engine();const ids=Object.keys(a.GENERALS);for(let offset=0;offset<ids.length;offset+=8){const roster=Array.from({length:8},(_,i)=>ids[(offset+i)%ids.length]);const g=a.game(roster);const total=g.deck.length;for(const p of g.players)p.hand.push(...g.popDeck(4));let n=0;const ask=g.ask.bind(g);g.ask=async(...args)=>{if(++n>6000)throw new Error('stalled '+roster.join(',')+' '+g.curPlayer.name+' '+g.phase);return ask(...args);};for(let turn=0;turn<100&&!g.over;turn++){g.turn++;const living=g.alivePlayers();await g.playerTurn(living[turn%living.length]);}for(const p of g.players){assert.ok(Number.isFinite(p.hp));assert.ok(p.maxHp>0);}const zones=[...g.deck,...g.discard,...g.processing];for(const p of g.players){zones.push(...p.hand,...p.equipList(),...p.judges.flatMap(a.realCards),...(p.marks.fields||[]),...(p.marks.buqu||[]),...(p.marks.stars||[]),...(p.marks.wine||[]),...(p.marks.sidi||[]),...(p.marks.inverse||[]));}const physical=zones.filter(c=>!c.virtual);assert.equal(physical.length,total,'card conservation: '+roster.join(','));assert.equal(new Set(physical.map(c=>c.uid)).size,physical.length,'duplicate physical cards: '+roster.join(','));}});
