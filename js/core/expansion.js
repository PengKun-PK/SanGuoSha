/* 神话再临：经典身份局常规武将。所有持久状态放入 marks，回合状态放入 flags。 */
const EXPANSION_ROSTER = [
 ['xiahouyuan','夏侯渊','wei',4,'m','风','shensu'],['caoren','曹仁','wei',4,'m','风','jushou'],
 ['huangzhong','黄忠','shu',4,'m','风','liegong'],['weiyan','魏延','shu',4,'m','风','kuanggu'],
 ['xiaoqiao','小乔','wu',3,'f','风','tianxiang','hongyan'],['zhoutai','周泰','wu',4,'m','风','buqu'],
 ['zhangjiao','张角','qun',3,'m','风','leiji','guidao','huangtian'],['yuji','于吉','qun',3,'m','风','guhuo'],
 ['dianwei','典韦','wei',4,'m','火','qiangxi'],['xunyu','荀彧','wei',3,'m','火','quhu','jieming'],
 ['pangtong','庞统','shu',3,'m','火','lianhuan','niepan'],['wolong','卧龙诸葛亮','shu',3,'m','火','bazhen','huoji','kanpo'],
 ['taishici','太史慈','wu',4,'m','火','tianyi'],['yuanshao','袁绍','qun',4,'m','火','luanji','xueyi'],
 ['yanliangwenchou','颜良文丑','qun',4,'m','火','shuangxiong'],['pangde','庞德','qun',4,'m','火','mashu','mengjin'],
 ['caopi','曹丕','wei',3,'m','林','xingshang','fangzhu','songwei'],['xuhuang','徐晃','wei',4,'m','林','duanliang'],
 ['menghuo','孟获','shu',4,'m','林','huoshou','zaiqi'],['zhurong','祝融','shu',4,'f','林','juxiang','lieren'],
 ['sunjian','孙坚','wu',4,'m','林','yinghun'],['lusu','鲁肃','wu',3,'m','林','haoshi','dimeng'],
 ['dongzhuo','董卓','qun',8,'m','林','jiuchi','roulin','benghuai','baonue'],['jiaxu','贾诩','qun',3,'m','林','wansha','luanwu','weimu'],
 ['zhanghe','张郃','wei',4,'m','山','qiaobian'],['dengai','邓艾','wei',4,'m','山','tuntian','zaoxian'],
 ['jiangwei','姜维','shu',4,'m','山','tiaoxin','zhiji'],['liushan','刘禅','shu',3,'m','山','xiangle','fangquan','ruoyu'],
 ['sunce','孙策','wu',4,'m','山','jiang','hunzi','zhiba'],['erzhang','张昭张纮','wu',3,'m','山','zhijian','guzheng'],
 ['caiwenji','蔡文姬','qun',3,'f','山','beige','duanchang'],['zuoci','左慈','qun',3,'m','山','huashen','xinsheng'],
];
// 军争篇：每种花色 A–K 各一张，共 52 张，不与标准牌重复追加。
const JUNZHENG_DECK = {
 heart:['无懈可击','火攻','火攻','火杀','桃','桃','火杀','闪','闪','火杀','闪','闪','无懈可击'],
 club:['白银狮子','藤甲','酒','兵粮寸断','雷杀','雷杀','雷杀','雷杀','酒','铁索连环','铁索连环','铁索连环','铁索连环'],
 spade:['古锭刀','藤甲','酒','雷杀','雷杀','雷杀','雷杀','雷杀','酒','兵粮寸断','铁索连环','铁索连环','无懈可击'],
 diamond:['朱雀羽扇','桃','桃','火杀','火杀','闪','闪','闪','酒','闪','闪','火攻','骅骝'],
};
for(const [name,nature,label] of [['火杀','fire','火焰'],['雷杀','thunder','雷电']])
 CARD_INFO[name]={...CARD_INFO['杀'],nature,short:`对攻击范围内一名角色使用，造成1点${label}伤害。`,desc:`与普通杀共用出牌次数；目标须打出闪，否则受到1点${label}伤害。属性伤害可通过铁索连环传导。`};
for(const [name,slot,range,desc] of [
 ['古锭刀','weapon',2,'锁定技，你使用杀对没有手牌的目标造成伤害时，此伤害+1。'],
 ['朱雀羽扇','weapon',4,'使用普通杀时，你可以将其改为火杀。'],
 ['白银狮子','armor',0,'锁定技，你受到的伤害至多为1点；失去装备区里的此牌后，回复1点体力。'],
 ['骅骝','horsePlus',0,'锁定技，其他角色计算与你的距离时+1。'],
]) CARD_INFO[name]={ct:'equip',type:'equip',slot,range,tag:slot==='weapon'?'武器':slot==='armor'?'防具':'+1坐骑',short:desc,desc};
for(const [id,name,k,hp,sex,pack,...skills] of EXPANSION_ROSTER){
 GENERALS[id]={name,k,hp,sex,pack,skills,lord:skills.some(s=>['huangtian','xueyi','songwei','baonue','ruoyu','zhiba'].includes(s)),art:{hue:{wei:218,shu:20,wu:145,qun:40}[k],beard:sex==='f'?0:1,hat:sex==='f'?'fa':'guan'}};
 if(GENERALS[id].lord) LORD_LIST.push(id);
}
for(const g of Object.values(GENERALS)) g.pack ||= '标准';

// Card colour follows the current owner (Hongyan), while a card on the
// processing table retains the suit with which it was used. Printed suits
// return when the card reaches the discard pile or a different owner.
const makePrintedCard=makeCard;
makeCard=function(...args){
 const card=makePrintedCard(...args),printed=card.suit;
 card.printedSuit=printed;card._game=Game.current;
 Object.defineProperty(card,'suit',{enumerable:true,configurable:true,get(){
   const g=card._game,owner=g?.ownerOf(card);
   if(owner)return owner.hasSkill('hongyan')&&printed==='spade'?'heart':printed;
   if(g?.processing.includes(card)){
     if(card._judgedBy)return card._judgedBy.hasSkill('hongyan')&&printed==='spade'?'heart':printed;
     return card._playedSuit||printed;
   }
   return printed;
 }});
 return card;
};
const attachWithCards=Game.prototype.attach;
Game.prototype.attach=function(players){const result=attachWithCards.call(this,players);Game.current=this;for(const c of this.deck)c._game=this;return result;};

// Small shared skill operations. Requests retain card and target filters for both UI and AI.
const EX = {
 async target(g,p,id,filter,max=1){return (await g.ask(p,{kind:'chooseTarget',tag:id,min:1,max,filter,cancelable:true,prompt:`【${SKILL_TEXT[id]?.[0]||id}】：请选择目标`}))||[];},
 async cards(g,p,id,min=1,max=min,filter=()=>true,area='hand',extra={}){return await g.ask(p,{kind:'select',tag:id,min,max,area,cardFilter:filter,cancelable:true,prompt:`【${SKILL_TEXT[id]?.[0]||id}】：选择${min===max?min:min+'～'+max}张牌`,...extra});},
 async pindian(g,a,b){
   if(!a.hand.length||!b.hand.length) return false;
   const pick=async p=>p.isHuman?(await EX.cards(g,p,'拼点',1,1))?.cards?.[0]:U.max(p.hand,c=>c.num);
   const ca=await pick(a);if(!ca)return false;const cb=await pick(b)||b.hand[0];
   g.removeCard(a,ca);g.removeCard(b,cb);g.processing.push(ca,cb);
   await UI.showPlay(g,a,ca,[b]);await UI.showPlay(g,b,cb,[a]);
   const win=ca.num>cb.num;g.log(`${a.name}（${ca.num}）与${b.name}（${cb.num}）拼点：${win?a.name:b.name}胜。`,true);
   g.toDiscard([ca,cb]);g.lastPindian=[ca,cb];await g.flushLoss();return win;
 },
 async flip(g,p){p.marks.turned=!p.marks.turned;g.log(`${g.nm(p)} ${p.marks.turned?'翻至背面，下个回合翻回并跳过':'翻至正面'}。`);UI.refresh(g);},
 async awaken(g,p,id,skills){p.marks[id]=true;p.maxHp=Math.max(1,p.maxHp-1);p.hp=Math.min(p.hp,p.maxHp);for(const s of skills)if(!p.skills.includes(s))p.skills.push(s);g.log(`${p.name}觉醒【${SKILL_TEXT[id][0]}】，获得${skills.map(s=>SKILL_TEXT[s][0]).join('、')}。`,true);},
 add(id,name,text,def){SKILL_TEXT[id]=[name,text];SKILLS[id]={name,...def};},
 view(id,name,text,as,filter,extra,area='hand',count=1){EX.add(id,name,text,{event:'_viewas'});VIEW_AS.push({id,as,count,filter,extra,area});},
};

// Engine extension points: state, legal use, card-loss batches, extra turns and linking.
Game.prototype.targetMax=function(p,c){return c.name==='杀' ? (p.flags.tianyiWin?2:((p.equips.weapon?.name==='方天画戟'&&realCards(c).length===p.hand.length&&realCards(c).every(x=>p.hand.includes(x)))?3:1)) : CARD_INFO[c.name].tgt?.max||1;};
Game.prototype.handLimit=function(p){return p.hp+(p.hasSkill('xueyi')?2*this.alivePlayers().filter(q=>q!==p&&q.kingdom==='qun').length:0);};
Game.prototype.validPlay=function(p,a){
 const c=a.card;if(!c||!this.canUseInPlay(p,c))return false;
 const rs=realCards(c);if(new Set(rs).size!==rs.length||rs.some(x=>!p.hand.includes(x)&&!p.equipList().includes(x)))return false;
 if(c.virtual){const v=VIEW_AS.find(v=>v.id===c.viaSkill&&v.as===c.name&&v.count===rs.length&&(!v.extra||v.extra(this,p))&&rs.every(x=>v.filter(this,p,x)&&(v.area==='any'||p.hand.includes(x))));if(!v||(!v.equip&&!p.hasSkill(v.id))||(v.id==='luanji'&&rs[0].suit!==rs[1].suit))return false;}
 else if(!p.hand.includes(c))return false;
 const info=CARD_INFO[c.name];if(info.type==='equip'||info.tgt?.all)return true;
 const ts=a.targets||[];
 if(c.name==='借刀杀人'&&(ts.length!==1||!this.borrowVictims(ts[0]).includes(a.opt?.extra)))return false;
 return new Set(ts).size===ts.length&&ts.length>=(info.tgt?.min||1)&&ts.length<=this.targetMax(p,c)&&ts.every(t=>this.canTarget(p,c,t));
};
const baseCanSha=Game.prototype.canUseSha;
Game.prototype.canUseSha=function(p){if(p.flags.tianyiLose)return false;if(p.flags.tianyiWin&&(p.flags.shaUsed||0)<2)return true;return baseCanSha.call(this,p);};
const baseDistance=Game.prototype.distance;
Game.prototype.distance=function(a,b){return a===b?0:Math.max(1,baseDistance.call(this,a,b)-(a.hasSkill('tuntian')?(a.marks.fields||[]).length:0));};
const baseTarget=Game.prototype.canTarget;
Game.prototype.canTarget=function(p,c,t,chosen){
 if(t.hasSkill('weimu')&&['trick','delay'].includes(c.type)&&isBlack(c))return false;
 if(c.name==='杀'&&(p.flags.ignoreRange||p.flags.tianyiWin))return t!==p&&t.alive&&!(t.hasSkill('kongcheng')&&!t.hand.length)&&!chosen?.includes(t);
 if(c.name==='兵粮寸断'&&p.hasSkill('duanliang')&&this.distance(p,t)<=2)return t!==p&&t.alive&&!t.hasJudge(c.name);
 return baseTarget.call(this,p,c,t,chosen);
};
const baseRemove=Game.prototype.removeCard;
Game.prototype.removeCard=function(p,c){c._game=this;c._playedSuit=c.suit;delete c._judgedBy;const area=baseRemove.call(this,p,c);if(area){this.lossQueue||=[];this.lossQueue.push({player:p,card:c,area});}return area;};
Game.prototype.flushLoss=async function(){
 if(this.flushingLoss)return;this.flushingLoss=true;
 try{while(this.lossQueue?.length){const batch=this.lossQueue.splice(0);for(const p of new Set(batch.map(x=>x.player))){if(p.alive){const losses=batch.filter(x=>x.player===p);for(const loss of losses)if(loss.area==='equip'&&loss.card.name==='白银狮子')await this.recover(p,1);await this.trigger('cardsLost',{player:p,losses});}}}}finally{this.flushingLoss=false;}
};
for(const name of ['gain','discardCards','useCard','requireCard','installEquip']){
 const base=Game.prototype[name];Game.prototype[name]=async function(...args){const r=await base.apply(this,args);await this.flushLoss();return r;};
}
const basePhase=Game.prototype.runPhase;
Game.prototype.runPhase=async function(p,phase){
 const ctx={player:p,phase,cancelled:false};await this.trigger('phaseBefore',ctx);if(ctx.cancelled||!p.alive||this.over)return;
 await basePhase.call(this,p,phase);if(!this.over)await this.trigger('phaseAfter',ctx);await this.flushLoss();
};
const baseTurn=Game.prototype.playerTurn;
Game.prototype.playerTurn=async function(p){
 if(p.marks.turned){for(const q of this.players)q.flags={};this.curPlayer=p;this.phase='';await EX.flip(this,p);return;}
 if(p.hasSkill('huashen')&&!p.marks.forms){await EX.getForms(this,p,2);await EX.transform(this,p);}
 await baseTurn.call(this,p);
};
const baseDamage=Game.prototype.damage;
Game.prototype.damage=async function(ctx){
 ctx.applied=false;
 const t=ctx.target;const before=t.hp;
 if(ctx.card?.name==='南蛮入侵'){if(t.hasSkill('huoshou')||t.hasSkill('juxiang'))return;const owner=this.alivePlayers().find(p=>p.hasSkill('huoshou'));if(owner)ctx={...ctx,source:owner};}
 const wasLinked=t.marks.linked;
 await baseDamage.call(this,ctx);
 if(ctx.applied&&!ctx.cancelled){if(wasLinked&&ctx.nature&&!ctx.chain){const targets=this.alivePlayers().filter(q=>q!==t&&q.marks.linked);t.marks.linked=false;for(const q of targets){q.marks.linked=false;await this.damage({...ctx,target:q,chain:true});}}}
};
const baseDying=Game.prototype.enterDying;
Game.prototype.enterDying=async function(p,source){if(p.hasSkill('buqu')&&await this.askSkill(p,'buqu',{})){await this.runSkill('buqu',p,{});if(p.marks.buquSafe)return;}return baseDying.call(this,p,source);};
const baseSave=Game.prototype.askSave;
Game.prototype.askSave=async function(p,t){if(this.curPlayer?.hasSkill('wansha')&&p!==t&&p!==this.curPlayer)return null;return baseSave.call(this,p,t);};
const baseDie=Game.prototype.die;
Game.prototype.die=async function(p,killer){await this.trigger('deathBefore',{player:p,killer});return baseDie.call(this,p,killer);};
const baseJudge=Game.prototype.judge;
Game.prototype.judge=async function(p,opt){if(p.hasSkill('hongyan')){const baseCheck=opt.check;opt={...opt,check:c=>baseCheck?.(c.suit==='spade'?{...c,suit:'heart'}:c)};}return baseJudge.call(this,p,opt);};
const baseRecover=Game.prototype.recover;
Game.prototype.recover=async function(p,n){await baseRecover.call(this,p,n);if(p.marks.buqu){const required=Math.max(0,1-p.hp);while(p.marks.buqu.length>required){const card=p.isHuman?await this.ask(p,{kind:'pickFrom',cards:p.marks.buqu,prompt:'不屈：移去一张不屈牌'}):p.marks.buqu.find((c,i,arr)=>arr.some((b,j)=>i!==j&&b.num===c.num))||p.marks.buqu[0];p.marks.buqu.splice(p.marks.buqu.indexOf(card),1);this.toDiscard([card]);}}};

// Military cards needed by expansion skills.
CARD_INFO['火攻']={ct:'trick',type:'trick',tag:'锦囊',tgt:{min:1,max:1,self:'ok',need:'hand'},short:'展示目标手牌，弃置同花色手牌造成火焰伤害。',desc:'目标展示一张手牌，你可弃置一张同花色手牌，对其造成1点火焰伤害。'};
CARD_INFO['铁索连环']={ct:'trick',type:'trick',tag:'锦囊',tgt:{min:1,max:2,self:'ok'},short:'横置或重置至多两名角色；也可重铸。',desc:'横置或重置一至两名角色。横置角色会传导属性伤害。可以重铸：弃置此牌并摸一张牌。'};
CardEffect['火攻']=async(g,{user,target,card})=>{if(!target.hand.length)return;const show=await g.ask(target,{kind:'pickFrom',cards:target.hand,prompt:'火攻：展示一张手牌'});if(!show)return;await UI.showPlay(g,target,show,[user]);const r=await EX.cards(g,user,'火攻',1,1,c=>c.suit===show.suit);if(r?.cards?.length){await g.discardCards(user,r.cards,'火攻');await g.damage({source:user,target,n:1,nature:'fire',card});}};
CardEffect['铁索连环']=async(g,{target})=>{target.marks.linked=!target.marks.linked;g.log(`${target.name}${target.marks.linked?'被横置':'解除横置'}。`);UI.refresh(g);};
const baseTarget2=Game.prototype.canTarget;
Game.prototype.canTarget=function(p,c,t,chosen){return !(c.name==='火攻'&&!t.hand.length)&&baseTarget2.call(this,p,c,t,chosen);};

EX.add('jijiang_play','激将','请求蜀势力角色提供杀。',{async run(g,p){const card=makeVirtual('杀',[],'jijiang');const ts=await EX.target(g,p,'jijiang',t=>g.canTarget(p,card,t));if(!ts.length)return;const c=await Skills.resolveAsk(g,p,'jijiang','杀');if(c)await g.useCard(p,c,ts);}});
// 风
EX.add('shensu','神速','判定前可跳过判定和摸牌；或出牌前弃置装备并跳过出牌。每项视为使用无距离限制的杀。',{event:'phaseBefore',can:(g,p,c)=>c.player===p&&(['judge','play'].includes(c.phase))&&(c.phase!=='play'||p.hand.concat(p.equipList()).some(c=>c.type==='equip')),async run(g,p,c){let cost;if(c.phase==='play'){cost=await EX.cards(g,p,'shensu',1,1,c=>c.type==='equip','any');if(!cost?.cards?.length)return;}p.flags.ignoreRange=true;const sha=makeVirtual('杀',[],'shensu');const ts=await EX.target(g,p,'shensu',t=>g.canTarget(p,sha,t));if(!ts.length){delete p.flags.ignoreRange;return;}if(cost)await g.discardCards(p,cost.cards,'神速');c.cancelled=true;if(c.phase==='judge')p.flags.skipDraw=true;await g.useCard(p,sha,ts,{rescue:true});delete p.flags.ignoreRange;}});
EX.add('jushou','据守','结束阶段可摸三张牌，然后翻面。',{event:'phaseStart',can:(g,p,c)=>c.player===p&&c.phase==='end',async run(g,p){await g.drawCards(p,3);await EX.flip(g,p);}});
EX.add('liegong','烈弓','出牌阶段使用杀时，若目标手牌数不小于你的体力或不大于你的攻击范围，可令其不能闪避。',{event:'shaTarget',can:(g,p,c)=>c.user===p&&g.phase==='play'&&(c.target.hand.length>=p.hp||c.target.hand.length<=p.attackRange()),async run(g,p,c){c.target.flags['noDodge_'+c.card.uid]=true;}});
EX.add('kuanggu','狂骨','锁定技，对距离1以内的角色每造成1点伤害，回复1点体力。',{event:'damageDone',forced:true,can:(g,p,c)=>c.source===p&&c.sourceDistance<=1,async run(g,p,c){await g.recover(p,c.n);}});
EX.add('hongyan','红颜','锁定技，你的黑桃牌视为红桃。',{passive:true});
EX.add('tianxiang','天香','受到伤害前，可弃一张红桃手牌，将伤害转移给其他角色，其摸已损失体力数的牌。',{event:'damageBefore',can:(g,p,c)=>c.target===p&&!c.tianxiang?.includes(p)&&p.hand.some(x=>x.suit==='heart'||(p.hasSkill('hongyan')&&x.suit==='spade')),async run(g,p,c){const r=await EX.cards(g,p,'tianxiang',1,1,x=>x.suit==='heart'||(p.hasSkill('hongyan')&&x.suit==='spade'),'hand',{needTarget:true,targetFilter:q=>q!==p&&q.alive});if(!r?.cards?.length||!r.target)return;await g.discardCards(p,r.cards,'天香');c.cancelled=true;await g.damage({...c,cancelled:false,target:r.target,tianxiang:[...(c.tianxiang||[]),p]});if(r.target.alive)await g.drawCards(r.target,r.target.maxHp-r.target.hp);}});
EX.add('buqu','不屈','体力降至0或更低时，亮出补足至1所需数量的不屈牌；点数互不相同则不进入濒死。回复体力后移去多余不屈牌。',{async run(g,p){p.marks.buqu||=[];const need=1-p.hp;while(p.marks.buqu.length<need){const c=g.popDeck(1)[0];if(!c)break;p.marks.buqu.push(c);await UI.showPlay(g,p,c,[]);}p.marks.buquSafe=p.marks.buqu.length===need&&new Set(p.marks.buqu.map(c=>c.num)).size===need;g.log(`${p.name}不屈点数：${p.marks.buqu.map(c=>c.num).join('、')}，${p.marks.buquSafe?'存活':'存在重复，进入濒死'}。`);}});
EX.add('leiji','雷击','使用或打出闪后，可令一名角色判定；若为黑桃，对其造成2点雷电伤害。',{event:'useCard',can:(g,p,c)=>c.player===p&&c.card.name==='闪',async run(g,p){const ts=await EX.target(g,p,'leiji',q=>q.alive);if(!ts.length)return;const r=await g.judge(ts[0],{reason:'雷击',check:c=>c.suit==='spade'});if(r.ok)await g.damage({source:p,target:ts[0],n:2,nature:'thunder'});}});
EX.add('guidao','鬼道','判定生效前，可用一张黑色手牌或装备替换并获得原判定牌。',{event:'judgeCard',can:(g,p)=>p.hand.concat(p.equipList()).some(isBlack),async run(g,p,j){const r=await EX.cards(g,p,'guidao',1,1,isBlack,'any');if(!r?.cards?.length)return;const c=r.cards[0];g.removeCard(p,c);g.takeProcessing([j.card]);p.hand.push(j.card);j.card=c;g.processing.push(c);}});
EX.add('huangtian','黄天','主公技，其他群势力角色的出牌阶段限一次，可交给你一张闪或闪电。',{lord:true,passive:true});
EX.add('guhuo','蛊惑','以一张手牌声明基本牌或非延时锦囊。其他角色可质疑：真实则质疑者失去1体力，虚假则其摸牌；被质疑时仅真实红桃牌生效。',{event:'_viewas'});
for(const as of ['杀','闪','桃','酒','无懈可击','无中生有','过河拆桥','顺手牵羊','决斗','南蛮入侵','万箭齐发','桃园结义','五谷丰登','火攻','铁索连环'])VIEW_AS.push({id:'guhuo',as,count:1,filter:()=>true});
EX.guhuo=async function(g,p,c){if(c.viaSkill!=='guhuo')return true;const sub=c.sub[0];const challengers=[];for(const q of g.orderFrom(p).filter(q=>q!==p&&q.hp>0)){const yes=q.isHuman?await g.ask(q,{kind:'confirm',prompt:`${p.name}蛊惑声明【${c.name}】，是否质疑？`}):(AI.isEnemy(g,q,p)&&Math.random()<0.22);if(yes)challengers.push(q);}if(!challengers.length)return true;const truth=sub.name===c.name;g.log(`蛊惑验牌：${g.cn(sub)}，声明${truth?'真实':'虚假'}。`,true);for(const q of challengers){if(truth)await g.loseHp(q,1);else await g.drawCards(q,1);}if(truth&&(sub.suit==='heart'||p.hasSkill('hongyan')&&sub.suit==='spade'))return true;await g.discardCards(p,[sub],'蛊惑失败');return false;};

// 火
EX.add('qiangxi','强袭','出牌阶段限一次，弃置一张武器或失去1点体力，对攻击范围内一名其他角色造成1点伤害。',{active:true,avail:(g,p)=>!p.flags.qiangxiUsed,async run(g,p){const ts=await EX.target(g,p,'qiangxi',q=>g.inAttackRange(p,q));if(!ts.length)return;const pool=p.hand.concat(p.equipList()).filter(c=>c.slot==='weapon');let cost=null;if(pool.length)cost=await EX.cards(g,p,'qiangxi',1,1,c=>c.slot==='weapon','any');if(cost?.cards?.length){const weapon=cost.cards[0];if(weapon===p.equips.weapon&&g.distance(p,ts[0])>1)return;await g.discardCards(p,cost.cards,'强袭');}else await g.loseHp(p,1);p.flags.qiangxiUsed=true;if(p.alive)await g.damage({source:p,target:ts[0],n:1});}});
EX.add('quhu','驱虎','出牌阶段限一次，与体力比你多的角色拼点。赢：其对攻击范围内你指定的另一角色造成1伤害；否则其对你造成1伤害。',{active:true,avail:(g,p)=>!p.flags.quhuUsed&&p.hand.length&&g.alivePlayers().some(q=>q!==p&&q.hp>p.hp&&q.hand.length),async run(g,p){const ts=await EX.target(g,p,'quhu',q=>q!==p&&q.hp>p.hp&&q.hand.length);if(!ts.length)return;p.flags.quhuUsed=true;const t=ts[0];if(await EX.pindian(g,p,t)){const vs=await EX.target(g,p,'quhu',q=>g.inAttackRange(t,q));if(vs.length)await g.damage({source:t,target:vs[0],n:1});}else await g.damage({source:t,target:p,n:1});}});
EX.add('jieming','节命','每受到1点伤害，可令一名角色将手牌补至体力上限（最多5张）。',{event:'damaged',can:(g,p,c)=>c.target===p,async run(g,p,c){for(let i=0;i<c.n;i++){const ts=await EX.target(g,p,'jieming',q=>q.hand.length<Math.min(5,q.maxHp));if(ts.length)await g.drawCards(ts[0],Math.min(5,ts[0].maxHp)-ts[0].hand.length);}}});
EX.view('lianhuan','连环','可将一张梅花手牌当铁索连环使用或重铸。','铁索连环',(g,p,c)=>c.suit==='club');
EX.add('niepan','涅槃','限定技，濒死时弃置所有牌，重置武将牌，摸三张牌，体力回复至3（不超过上限）。',{event:'dying',can:(g,p,c)=>c.player===p&&!p.marks.niepan,async run(g,p){p.marks.niepan=true;await g.discardCards(p,p.allCards(),'涅槃');p.marks.turned=false;p.marks.linked=false;await g.recover(p,Math.min(3,p.maxHp)-p.hp);await g.drawCards(p,3);}});
EX.add('bazhen','八阵','没有防具时视为装备八卦阵。',{passive:true});
EX.view('huoji','火计','可将一张红色手牌当火攻使用。','火攻',(g,p,c)=>isRed(c));
EX.view('kanpo','看破','可将一张黑色手牌当无懈可击使用。','无懈可击',(g,p,c)=>isBlack(c));
EX.add('tianyi','天义','出牌阶段限一次，与其他角色拼点。赢：本回合杀无距离限制、可多使用一次、多指定一个目标；没赢：不能使用杀。',{active:true,avail:(g,p)=>!p.flags.tianyiUsed&&p.hand.length&&g.alivePlayers().some(q=>q!==p&&q.hand.length),async run(g,p){const ts=await EX.target(g,p,'tianyi',q=>q!==p&&q.hand.length);if(!ts.length)return;p.flags.tianyiUsed=true;const won=await EX.pindian(g,p,ts[0]);p.flags[won?'tianyiWin':'tianyiLose']=true;}});
EX.view('luanji','乱击','可将两张同花色手牌当万箭齐发使用。','万箭齐发',()=>true,null,'hand',2);
EX.add('xueyi','血裔','主公技，手牌上限增加场上其他群势力角色数的两倍。',{lord:true,passive:true});
EX.add('shuangxiong','双雄','摸牌阶段可改为判定并获得判定牌，本回合可将与判定牌颜色不同的手牌当决斗。',{event:'drawNum',can:(g,p,c)=>c.player===p,async run(g,p,c){c.skip=true;const r=await g.judge(p,{reason:'双雄',keep:true,check:()=>true});if(r.card){g.takeProcessing([r.card]);p.hand.push(r.card);p.flags.shuangxiong=isRed(r.card)?'red':'black';}}});
VIEW_AS.push({id:'shuangxiong',as:'决斗',count:1,filter:(g,p,c)=>p.flags.shuangxiong==='red'?isBlack(c):isRed(c),extra:(g,p)=>!!p.flags.shuangxiong});
EX.add('mengjin','猛进','你的杀被闪抵消后，可弃置目标的一张牌。',{event:'shaDodged',can:(g,p,c)=>c.user===p&&c.target.cardCount,async run(g,p,c){const x=await g.ask(p,{kind:'pickArea',target:c.target,prompt:'猛进：弃置目标一张牌'});if(x)await g.discardCards(c.target,[x],'猛进');}});

// 林
EX.add('xingshang','行殇','其他角色死亡时，可获得其所有手牌和装备。',{event:'deathBefore',can:(g,p,c)=>c.player!==p&&c.player.hand.length+c.player.equipList().length>0,async run(g,p,c){await g.gain(p,c.player.hand.concat(c.player.equipList()),c.player);}});
EX.add('fangzhu','放逐','受到伤害后，可令一名其他角色摸你已损失体力数的牌，然后翻面。',{event:'damaged',can:(g,p,c)=>c.target===p,async run(g,p){const ts=await EX.target(g,p,'fangzhu',q=>q!==p);if(ts.length){await g.drawCards(ts[0],Math.max(0,p.maxHp-p.hp));await EX.flip(g,ts[0]);}}});
EX.add('songwei','颂威','主公技，其他魏势力角色判定为黑色后，其可令你摸一张牌。',{lord:true,event:'judgeDone',can:(g,p,c)=>c.player!==p&&c.player.kingdom==='wei'&&isBlack(c.card),async run(g,p,c){if(await g.ask(c.player,{kind:'confirm',prompt:`是否令${p.name}发动颂威摸一张牌？`}))await g.drawCards(p,1);}});
EX.view('duanliang','断粮','可将一张黑色基本牌或装备牌当兵粮寸断使用，距离限制为2。','兵粮寸断',(g,p,c)=>isBlack(c)&&['basic','equip'].includes(c.type),null,'any');
EX.add('huoshou','祸首','锁定技，南蛮入侵对你无效，你视为南蛮入侵的伤害来源。',{passive:true});
EX.add('zaiqi','再起','摸牌阶段，若已受伤，可改为亮出已损失体力数的牌，每张红桃回复1体力并弃置，其余收入手牌。',{event:'drawNum',can:(g,p,c)=>c.player===p&&p.hp<p.maxHp,async run(g,p,c){c.skip=true;const cards=g.popDeck(p.maxHp-p.hp);for(const x of cards){await UI.showPlay(g,p,x,[]);if(x.suit==='heart'){g.toDiscard([x]);await g.recover(p,1);}else p.hand.push(x);}}});
EX.add('juxiang','巨象','锁定技，南蛮入侵对你无效；其他角色使用的南蛮入侵结算后，你获得之。',{event:'cardFinished',forced:true,can:(g,p,c)=>c.player!==p&&c.card.name==='南蛮入侵'&&realCards(c.card).some(x=>g.processing.includes(x)),async run(g,p,c){const cards=g.takeProcessing(realCards(c.card));p.hand.push(...cards);}});
EX.add('lieren','烈刃','杀造成伤害后，可与目标拼点，赢则获得其一张牌。',{event:'damageDone',can:(g,p,c)=>c.source===p&&c.card?.name==='杀'&&c.target.alive&&c.target.hand.length&&p.hand.length,async run(g,p,c){if(await EX.pindian(g,p,c.target)){const x=await g.ask(p,{kind:'pickArea',target:c.target,prompt:'烈刃：获得一张牌'});if(x)await g.gain(p,[x],c.target);}}});
EX.add('yinghun','英魂','准备阶段，若已受伤，令其他角色摸X弃一或摸一弃X，X为你已损失体力值。',{event:'phaseStart',can:(g,p,c)=>c.player===p&&c.phase==='start'&&p.hp<p.maxHp,async run(g,p){const ts=await EX.target(g,p,'yinghun',q=>q!==p);if(!ts.length)return;const t=ts[0],x=p.maxHp-p.hp;const choice=p.isHuman?await g.ask(p,{kind:'choose',options:['摸X弃一','摸一弃X'],prompt:'英魂：选择效果'}):AI.isFriend(g,p,t)?'摸X弃一':'摸一弃X';await g.drawCards(t,choice==='摸X弃一'?x:1);const n=Math.min(t.hand.length+t.equipList().length,choice==='摸X弃一'?1:x);if(n){const r=await EX.cards(g,t,'英魂',n,n,()=>true,'any',{cancelable:false});await g.discardCards(t,r?.cards||t.hand.concat(t.equipList()).slice(0,n),'英魂');}}});
EX.add('haoshi','好施','摸牌阶段可多摸两张。摸牌后若手牌超过5，交出一半（向下取整）给手牌最少的其他角色。',{event:'drawNum',can:(g,p,c)=>c.player===p,async run(g,p,c){c.n+=2;p.flags.haoshi=true;}});
EX.add('dimeng','缔盟','出牌阶段限一次，弃置等同两名其他角色手牌差的牌，然后交换其手牌。',{active:true,avail:(g,p)=>!p.flags.dimengUsed&&g.alivePlayers().length>=3,async run(g,p){const ts=await EX.target(g,p,'dimeng',q=>q!==p,2);if(ts.length!==2)return;const [a,b]=ts,n=Math.abs(a.hand.length-b.hand.length);if(n>p.hand.length+p.equipList().length)return;if(n){const r=await EX.cards(g,p,'dimeng',n,n,()=>true,'any');if(r?.cards?.length!==n)return;await g.discardCards(p,r.cards,'缔盟');}p.flags.dimengUsed=true;const ah=a.hand.slice(),bh=b.hand.slice();for(const c of ah)g.removeCard(a,c);for(const c of bh)g.removeCard(b,c);a.hand.push(...bh);b.hand.push(...ah);await g.flushLoss();UI.refresh(g);}});
EX.view('jiuchi','酒池','可将一张黑桃手牌当酒使用。','酒',(g,p,c)=>c.suit==='spade');
EX.add('roulin','肉林','锁定技，你对女性角色的杀、女性角色对你的杀，均需两张闪。',{passive:true});
EX.add('benghuai','崩坏','锁定技，结束阶段，若你体力不是全场最少，失去1体力或1体力上限。',{event:'phaseStart',forced:true,can:(g,p,c)=>c.player===p&&c.phase==='end'&&g.alivePlayers().some(q=>q.hp<p.hp),async run(g,p){const choice=await g.ask(p,{kind:'choose',options:['失去1点体力','减1点体力上限'],prompt:'崩坏：请选择'});if(choice==='失去1点体力')await g.loseHp(p,1);else {p.maxHp--;p.hp=Math.min(p.hp,p.maxHp);if(p.hp<=0)await g.enterDying(p,null);}}});
EX.add('baonue','暴虐','主公技，其他群势力角色造成伤害后，其可判定，若为黑桃，你回复1体力。',{lord:true,event:'damageDone',can:(g,p,c)=>c.source&&c.source!==p&&c.source.kingdom==='qun'&&p.hp<p.maxHp,async run(g,p,c){if(!await g.ask(c.source,{kind:'confirm',prompt:`是否发动暴虐，帮助${p.name}回复？`}))return;const r=await g.judge(c.source,{reason:'暴虐',check:x=>x.suit==='spade'});if(r.ok)await g.recover(p,1);}});
EX.add('wansha','完杀','锁定技，你的回合内，只有你和濒死角色能使用桃救援。',{passive:true});
EX.add('luanwu','乱武','限定技，令其他角色依次对距离最近的另一角色使用杀，否则失去1体力。',{active:true,avail:(g,p)=>!p.marks.luanwu,async run(g,p){p.marks.luanwu=true;for(const q of g.orderFrom(p).filter(q=>q!==p)){if(!q.alive||g.over)continue;const dist=Math.min(...g.alivePlayers().filter(t=>t!==q).map(t=>g.distance(q,t)));const sha=makeVirtual('杀',[],'luanwu');const cand=g.alivePlayers().filter(t=>t!==q&&g.distance(q,t)===dist&&g.canTarget(q,sha,t));let used=false;if(cand.length){const ts=await EX.target(g,q,'luanwu',t=>cand.includes(t));if(ts.length){const c=await g.ask(q,{kind:'respond',need:'杀',cancelable:true,prompt:'乱武：使用杀，否则失去1点体力'});if(c){await g.useCard(q,c,ts,{rescue:true});used=true;}}}if(!used)await g.loseHp(q,1);}}});
EX.add('weimu','帷幕','锁定技，不能成为黑色锦囊牌的目标。',{passive:true});

// 山
EX.add('qiaobian','巧变','判定、摸牌、出牌或弃牌阶段前，可弃一张手牌跳过该阶段。跳过摸牌可取至多两人手牌；跳过出牌可移动场上一张装备或判定牌。',{event:'phaseBefore',can:(g,p,c)=>c.player===p&&['judge','draw','play','discard'].includes(c.phase)&&p.hand.length,async run(g,p,c){const r=await EX.cards(g,p,'qiaobian');if(!r?.cards?.length)return;await g.discardCards(p,r.cards,'巧变');c.cancelled=true;if(c.phase==='draw'){const ts=await EX.target(g,p,'qiaobian',q=>q!==p&&q.hand.length,2);for(const t of ts)await g.gain(p,[U.pick(t.hand)],t);}if(c.phase==='play'){const ts=await EX.target(g,p,'qiaobian',q=>q.equipList().length+q.judges.length>0);if(!ts.length)return;const from=ts[0];const card=await g.ask(p,{kind:'pickFrom',cards:from.equipList().concat(from.judges),prompt:'巧变：选择要移动的牌'});if(!card)return;const dst=await EX.target(g,p,'qiaobian',q=>q!==from&&(card.slot?!q.equips[card.slot]:!q.hasJudge(card.name)&&!(q.hasSkill('qianxun')&&card.name==='乐不思蜀')&&!(q.hasSkill('weimu')&&isBlack(card))));if(!dst.length)return;g.removeCard(from,card);if(card.slot)dst[0].equips[card.slot]=card;else dst[0].judges.push(card);await g.flushLoss();}}});
EX.add('tuntian','屯田','回合外失去牌后可判定，若非红桃将判定牌置为田；计算与他人距离减去田数。',{event:'cardsLost',can:(g,p,c)=>c.player===p&&g.curPlayer!==p,async run(g,p){const r=await g.judge(p,{reason:'屯田',keep:true,check:c=>c.suit!=='heart'});if(r.ok&&g.processing.includes(r.card)){g.takeProcessing([r.card]);(p.marks.fields||=[]).push(r.card);}}});
EX.add('zaoxian','凿险','觉醒技，准备阶段田不少于3，减1体力上限，获得急袭。',{event:'phaseStart',forced:true,can:(g,p,c)=>c.player===p&&c.phase==='start'&&!p.marks.zaoxian&&(p.marks.fields||[]).length>=3,async run(g,p){await EX.awaken(g,p,'zaoxian',['jixi']);}});
EX.add('jixi','急袭','可将一张田当顺手牵羊使用。',{active:true,avail:(g,p)=>p.marks.fields?.length&&g.alivePlayers().some(t=>g.canTarget(p,makeVirtual('顺手牵羊',[],'jixi'),t)),async run(g,p){const card=await g.ask(p,{kind:'pickFrom',cards:p.marks.fields,prompt:'急袭：选择一张田'});if(!card)return;const v=makeVirtual('顺手牵羊',[card],'jixi');const ts=await EX.target(g,p,'jixi',q=>g.canTarget(p,v,q));if(!ts.length)return;p.marks.fields.splice(p.marks.fields.indexOf(card),1);await g.useCard(p,v,ts);}});
EX.add('tiaoxin','挑衅','出牌阶段限一次，令攻击范围内包含你的其他角色对你使用杀，否则弃置其一张牌。',{active:true,avail:(g,p)=>!p.flags.tiaoxinUsed&&g.alivePlayers().some(q=>q!==p&&g.inAttackRange(q,p)),async run(g,p){const ts=await EX.target(g,p,'tiaoxin',q=>g.inAttackRange(q,p));if(!ts.length)return;p.flags.tiaoxinUsed=true;const t=ts[0];const c=await g.ask(t,{kind:'respond',need:'杀',cancelable:true,prompt:`挑衅：对${p.name}使用杀，否则被弃一张牌`});if(c&&g.canTarget(t,c,p))await g.useCard(t,c,[p],{rescue:true});else if(t.cardCount){const x=await g.ask(p,{kind:'pickArea',target:t,prompt:'挑衅：弃置一张牌'});if(x)await g.discardCards(t,[x],'挑衅');}}});
EX.add('zhiji','志继','觉醒技，准备阶段没有手牌，回复1体力或摸两张牌，然后减1体力上限并获得观星。',{event:'phaseStart',forced:true,can:(g,p,c)=>c.player===p&&c.phase==='start'&&!p.hand.length&&!p.marks.zhiji,async run(g,p){const s=await g.ask(p,{kind:'choose',options:['摸两张牌','回复1点体力'],prompt:'志继：请选择'});if(s==='摸两张牌')await g.drawCards(p,2);else await g.recover(p,1);await EX.awaken(g,p,'zhiji',['guanxing']);}});
EX.add('xiangle','享乐','锁定技，成为杀的目标后，使用者需弃一张基本牌，否则此杀对你无效。',{event:'shaTarget',forced:true,can:(g,p,c)=>c.target===p,async run(g,p,c){const r=await EX.cards(g,c.user,'享乐',1,1,x=>x.type==='basic');if(r?.cards?.length)await g.discardCards(c.user,r.cards,'享乐');else c.cancelled=true;}});
EX.add('fangquan','放权','可跳过出牌阶段，回合结束时弃一张手牌，令其他角色获得额外回合。',{event:'phaseBefore',can:(g,p,c)=>c.player===p&&c.phase==='play',async run(g,p,c){c.cancelled=true;p.flags.fangquan=true;}});
EX.add('ruoyu','若愚','主公觉醒技，准备阶段体力为全场最少（或并列），加1体力上限、回复1体力，获得激将。',{lord:true,event:'phaseStart',forced:true,can:(g,p,c)=>c.player===p&&c.phase==='start'&&!p.marks.ruoyu&&g.alivePlayers().every(q=>q.hp>=p.hp),async run(g,p){p.marks.ruoyu=true;p.maxHp++;await g.recover(p,1);if(!p.skills.includes('jijiang'))p.skills.push('jijiang');}});
EX.add('jiang','激昂','使用决斗、红色杀，或成为其目标时，可摸一张牌。',{event:'useCard',can:(g,p,c)=>!c.responded&&(c.player===p||c.targets?.includes(p))&&(c.card.name==='决斗'||c.card.name==='杀'&&isRed(c.card)),async run(g,p){await g.drawCards(p,1);}});
EX.add('hunzi','魂姿','觉醒技，准备阶段体力为1，减1体力上限，获得英姿、英魂。',{event:'phaseStart',forced:true,can:(g,p,c)=>c.player===p&&c.phase==='start'&&p.hp===1&&!p.marks.hunzi,async run(g,p){await EX.awaken(g,p,'hunzi',['yingzi','yinghun']);}});
EX.add('zhiba','制霸','主公技，其他吴势力角色出牌阶段限一次可与你拼点；其没赢，你可获得拼点牌。觉醒后可拒绝拼点。',{lord:true,passive:true});
EX.add('zhijian','直谏','出牌阶段可将手牌中的装备置入其他角色空置的对应装备栏，然后摸一张牌。',{active:true,avail:(g,p)=>p.hand.some(c=>c.type==='equip'&&g.alivePlayers().some(q=>q!==p&&!q.equips[c.slot])),async run(g,p){const r=await EX.cards(g,p,'zhijian',1,1,c=>c.type==='equip');if(!r?.cards?.length)return;const card=r.cards[0];const ts=await EX.target(g,p,'zhijian',q=>q!==p&&!q.equips[card.slot]);if(!ts.length)return;g.removeCard(p,card);ts[0].equips[card.slot]=card;await g.drawCards(p,1);await g.flushLoss();}});
EX.add('guzheng','固政','其他角色弃牌阶段结束时，可将其弃置的一张手牌归还，并获得此阶段其余仍在弃牌堆的弃牌。',{event:'phaseAfter',can:(g,p,c)=>c.phase==='discard'&&c.player!==p&&(g.phaseDiscards||[]).some(x=>x.player===c.player&&x.hand&&g.discard.includes(x.card)),async run(g,p,c){const list=g.phaseDiscards.filter(x=>g.discard.includes(x.card));const own=list.filter(x=>x.player===c.player&&x.hand).map(x=>x.card);const x=await g.ask(p,{kind:'pickFrom',cards:own,prompt:'固政：归还一张弃置的手牌'});if(!x)return;await g.gain(c.player,[x]);await g.gain(p,list.map(x=>x.card).filter(c=>c!==x&&g.discard.includes(c)));}});
EX.add('beige','悲歌','角色受到杀的伤害后，可弃置一张牌令其判定：红桃回复1；方块摸2；梅花伤害来源弃2；黑桃来源翻面。',{event:'damaged',can:(g,p,c)=>c.target.alive&&c.card?.name==='杀'&&p.hand.length+p.equipList().length>0,async run(g,p,c){const r=await EX.cards(g,p,'beige',1,1,()=>true,'any');if(!r?.cards?.length)return;await g.discardCards(p,r.cards,'悲歌');const jd=await g.judge(c.target,{reason:'悲歌',check:()=>true});const s=jd.card?.suit;if(s==='heart')await g.recover(c.target,1);if(s==='diamond')await g.drawCards(c.target,2);if(c.source?.alive&&s==='spade')await EX.flip(g,c.source);if(c.source?.alive&&s==='club'){const src=c.source,n=Math.min(2,src.hand.length+src.equipList().length);if(n){const r=await EX.cards(g,src,'悲歌',n,n,()=>true,'any',{cancelable:false});await g.discardCards(src,r?.cards||src.hand.concat(src.equipList()).slice(0,n),'悲歌');}}}});
EX.add('duanchang','断肠','锁定技，杀死你的角色失去所有武将技能。',{event:'deathBefore',forced:true,can:(g,p,c)=>c.player===p&&c.killer&&c.killer!==p,async run(g,p,c){c.killer.skills=[];g.log(`${c.killer.name}断肠，失去所有武将技能。`,true);}});
EX.getForms=async(g,p,n)=>{p.marks.forms||=[];const used=g.players.map(q=>q.gid);const pool=Object.keys(GENERALS).filter(id=>id!=='zuoci'&&GENERALS[id].k!=='god'&&!DISABLED_GENERALS.has(id)&&!used.includes(id)&&!p.marks.forms.includes(id));p.marks.forms.push(...U.sample(pool,n));};
EX.transform=async(g,p)=>{
 const pool=(p.marks.forms||[]).flatMap(gid=>GENERALS[gid].skills.filter(id=>!SKILLS[id].lord&&!SKILLS[id].limited&&!SKILLS[id].awakening&&!['niepan','luanwu','huashen','xinsheng','zaoxian','zhiji','hunzi','ruoyu'].includes(id)).map(id=>({gid,id,label:GENERALS[gid].name+' · '+SKILL_TEXT[id][0]})));
 if(!pool.length)return;
 const label=await g.ask(p,{kind:'choose',options:pool.map(x=>x.label),
   optionDetails:Object.fromEntries(pool.map(x=>[x.label,{general:KINGDOM_NAME[GENERALS[x.gid].k]+' · '+(GENERALS[x.gid].sex==='f'?'女性':'男性'),description:SKILL_TEXT[x.id][1]}])),
   prompt:'化身：查看说明并选择技能'});
 const f=pool.find(x=>x.label===label)||pool[0];
 p.skills=p.skills.filter(s=>s!==p.marks.formSkill);p.marks.formSkill=f.id;p.skills.push(f.id);p.kingdom=GENERALS[f.gid].k;p.sex=GENERALS[f.gid].sex;
 g.log(`${p.name}化身${GENERALS[f.gid].name}，获得${SKILL_TEXT[f.id][0]}。`);
};
EX.add('huashen','化身','开局随机获得两张未登场武将作为化身。准备或结束阶段可选化身的一项非主公、限定、觉醒技能，并改为其势力和性别。',{event:'phaseStart',can:(g,p,c)=>c.player===p&&['start','end'].includes(c.phase),async run(g,p){await EX.transform(g,p);}});
EX.add('xinsheng','新生','每受到1点伤害，可获得一张新化身。',{event:'damaged',can:(g,p,c)=>c.target===p,async run(g,p,c){await EX.getForms(g,p,c.n);}});

// Compound skill follow-ups, kept outside optional trigger confirmation.
const phaseWithHooks=Game.prototype.runPhase;
Game.prototype.runPhase=async function(p,ph){
 if(ph==='discard')this.phaseDiscards=[];
 await phaseWithHooks.call(this,p,ph);
 if(!p.alive||this.over)return;
 if(ph==='draw'&&p.flags.haoshi&&p.hand.length>5){const others=this.alivePlayers().filter(q=>q!==p),min=Math.min(...others.map(q=>q.hand.length));const n=Math.floor(p.hand.length/2);const r=await EX.cards(this,p,'haoshi',n,n,()=>true,'hand',{needTarget:true,targetFilter:q=>q!==p&&q.hand.length===min,cancelable:false});if(r?.cards?.length&&r.target)await this.gain(r.target,r.cards,p);}
 if(ph==='end'&&p.flags.fangquan&&p.hand.length){const r=await EX.cards(this,p,'fangquan',1,1,()=>true,'hand',{needTarget:true,targetFilter:q=>q!==p&&q.alive});if(r?.cards?.length&&r.target){await this.discardCards(p,r.cards,'放权');p.marks.extraTurn=r.target;}}
};
const recordDiscard=Game.prototype.discardCards;
Game.prototype.discardCards=async function(p,cards,reason){if(this.phase==='discard'){this.phaseDiscards||=[];this.phaseDiscards.push(...cards.map(card=>({player:p,card,hand:p.hand.includes(card)})));}return recordDiscard.call(this,p,cards,reason);};

// Lord support is available to other eligible players, not as an always-on passive label.
EX.add('huangtian_give','黄天献牌','交给张角一张闪或闪电。',{active:true,avail:(g,p)=>p.kingdom==='qun'&&!p.flags.huangtianGiven&&p.hand.some(c=>['闪','闪电'].includes(c.name))&&g.alivePlayers().some(q=>q!==p&&q.hasSkill('huangtian')),async run(g,p){const lord=g.alivePlayers().find(q=>q!==p&&q.hasSkill('huangtian'));const r=await EX.cards(g,p,'huangtian_give',1,1,c=>['闪','闪电'].includes(c.name));if(r?.cards?.length){p.flags.huangtianGiven=true;await g.gain(lord,r.cards,p);}}});
EX.add('zhiba_duel','制霸拼点','与孙策拼点，没赢时他可获得两张拼点牌。',{active:true,avail:(g,p)=>p.kingdom==='wu'&&!p.flags.zhibaGiven&&p.hand.length&&g.alivePlayers().some(q=>q!==p&&q.hasSkill('zhiba')&&q.hand.length),async run(g,p){const lord=g.alivePlayers().find(q=>q!==p&&q.hasSkill('zhiba'));if(!lord)return;p.flags.zhibaGiven=true;if(lord.marks.hunzi&&!await g.ask(lord,{kind:'confirm',prompt:`${p.name}请求制霸拼点，是否接受？`}))return;const win=await EX.pindian(g,p,lord);if(!win&&await g.ask(lord,{kind:'confirm',prompt:'制霸：获得拼点牌？'}))await g.gain(lord,(g.lastPindian||[]).filter(c=>g.discard.includes(c)));}});
const originalHas=Player.prototype.hasSkill;
Player.prototype.hasSkill=function(id){if(id==='huangtian_give'||id==='zhiba_duel')return this.alive;return originalHas.call(this,id);};
// Resolve bluff before consuming any real cards, including response and saving.
const useWithBluff=Game.prototype.useCard;
Game.prototype.useCard=async function(p,c,ts,opt){if(!c._guhuoChecked&&!await EX.guhuo(this,p,c))return;c._guhuoChecked=true;await useWithBluff.call(this,p,c,ts,opt);};

EX.add('recast','重铸','弃置铁索连环（或连环的梅花手牌），摸一张牌。',{active:true,avail:(g,p)=>p.hand.some(c=>c.name==='铁索连环'||p.hasSkill('lianhuan')&&c.suit==='club'),async run(g,p){const r=await EX.cards(g,p,'recast',1,1,c=>c.name==='铁索连环'||p.hasSkill('lianhuan')&&c.suit==='club');if(r?.cards?.length){await g.discardCards(p,r.cards,'重铸');await g.drawCards(p,1);}}});
const hasWithSupport=Player.prototype.hasSkill;
Player.prototype.hasSkill=function(id){if(id==='recast')return this.alive;return hasWithSupport.call(this,id);};
Game.prototype.actionSignature=function(){return this.players.map(p=>[p.hp,p.alive,p.hand.map(c=>c.uid).join(','),p.equipList().map(c=>c.uid).join(','),p.judges.map(c=>c.uid).join(','),JSON.stringify(p.flags),p.skills.join(','),p.marks.fields?.length,p.marks.turned,p.marks.luanwu].join(':')).join('|');};
EX.aiPlay=function(g,p){
 const enemy=q=>q!==p&&AI.isEnemy(g,p,q),friend=q=>q!==p&&AI.isFriend(g,p,q);
 const enemies=g.alivePlayers().filter(enemy),friends=g.alivePlayers().filter(friend);
 const useSkill=id=>p.hasSkill(id)&&SKILLS[id].avail(g,p)?{type:'skill',skill:id}:null;
 if(p.hasSkill('zhijian')&&friends.some(q=>p.hand.some(c=>c.type==='equip'&&!q.equips[c.slot])))return useSkill('zhijian');
 if(p.hasSkill('qiangxi')&&p.hp>1&&enemies.some(q=>g.inAttackRange(p,q))&&!p.flags.qiangxiUsed)return useSkill('qiangxi');
 if(p.hasSkill('tiaoxin')&&enemies.some(q=>g.inAttackRange(q,p)&&q.hand.length<2)&&!p.flags.tiaoxinUsed)return useSkill('tiaoxin');
 if(p.hasSkill('tianyi')&&p.hand.some(c=>c.num>=11)&&p.hand.some(c=>c.name==='杀')&&!p.flags.tianyiUsed)return useSkill('tianyi');
 if(p.hasSkill('quhu')&&p.hand.some(c=>c.num>=11)&&enemies.some(q=>q.hp>p.hp&&q.hand.length)&&!p.flags.quhuUsed)return useSkill('quhu');
 if(p.hasSkill('jixi')&&SKILLS.jixi.avail(g,p)&&enemies.some(q=>g.canTarget(p,makeVirtual('顺手牵羊',[],'jixi'),q)))return useSkill('jixi');
 if(p.hasSkill('dimeng')&&!p.flags.dimengUsed&&friends.some(a=>enemies.some(b=>b.hand.length>a.hand.length&&b.hand.length-a.hand.length<=p.hand.length)))return useSkill('dimeng');
 if(p.hasSkill('luanwu')&&!p.marks.luanwu&&enemies.length>friends.length&&!(g.lord().hp<=1&&p.identity!=='fan'))return useSkill('luanwu');
 if(SKILLS.huangtian_give.avail(g,p)&&AI.isFriend(g,p,g.lord()))return useSkill('huangtian_give');
 const attackNames=['火攻','万箭齐发','决斗'];
 for(const name of attackNames){
   const opts=Skills.options(g,p,name).filter(o=>o.kind==='view'&&o.id!=='guhuo');
   for(const v of opts){
     let pool=v.pool.slice().sort((a,b)=>AI.cardValue(g,p,a)-AI.cardValue(g,p,b));
     if(v.id==='luanji'){const pairs=pool.flatMap((a,i)=>pool.slice(i+1).filter(b=>a.suit===b.suit).map(b=>[a,b]));pool=pairs.sort((a,b)=>U.sum(a,c=>AI.cardValue(g,p,c))-U.sum(b,c=>AI.cardValue(g,p,c)))[0]||[];}
     const cs=pool.slice(0,v.count);if(cs.length!==v.count||cs.some(c=>c.name==='桃'))continue;
     const card=makeVirtual(name,cs,v.id);if(!g.canUseInPlay(p,card))continue;
     if(name==='万箭齐发'){if(enemies.length>friends.length&&g.lord().hp>1)return {type:'use',card,targets:[]};continue;}
     const targets=g.legalTargets(p,card).filter(enemy);if(targets.length)return {type:'use',card,targets:[U.max(targets,q=>-AI.attitude(g,p,q)-q.hp*8)]};
   }
 }
 const fire=p.hand.find(c=>c.name==='火攻');if(fire&&p.hand.length>=3){const targets=g.legalTargets(p,fire).filter(enemy);if(targets.length)return {type:'use',card:fire,targets:[targets[0]]};}
 // 优先连敌、解己方连锁；开局只认出一个敌人时，可用未知阵营补足第二目标。
 // 仍须检查合法性（如帷幕），不能为凑人数连上已知队友或解开敌人的连锁。
 const chain=p.hand.find(c=>c.name==='铁索连环');
 if(chain){
   const legal=g.legalTargets(p,chain),max=g.targetMax(p,chain);
   const score=q=>q.marks.linked?AI.attitude(g,p,q):-AI.attitude(g,p,q);
   const ts=legal.filter(q=>q.marks.linked?(q===p||friend(q)):enemy(q))
     .sort((a,b)=>score(b)-score(a)).slice(0,max);
   if(ts.some(q=>enemy(q)&&!q.marks.linked)&&ts.length<max){
     const uncertain=legal.filter(q=>q!==p&&!q.marks.linked&&!ts.includes(q)&&!friend(q)&&!enemy(q))
       .sort((a,b)=>score(b)-score(a));
     ts.push(...uncertain.slice(0,max-ts.length));
   }
   if(ts.length)return {type:'use',card:chain,targets:ts};
   return useSkill('recast');
 }
 return null;
};
