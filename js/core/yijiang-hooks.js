/* Cross-skill follow-ups stay mandatory after the optional activation resolves. */
const yjVirtual=makeVirtual;
makeVirtual=function(name,cards,id){const declared=id==='jiaozhao'&&cards[0]?._game?.ownerOf(cards[0])?.flags.jiaozhao?.name;if(name==='杀'&&['火杀','雷杀'].includes(declared))name=declared;const fire=name==='火杀'||id==='lihuo'||id==='longhun'&&name==='杀';const thunder=name==='雷杀';if(fire||thunder)name='杀';const c=yjVirtual(name,cards,id);if(fire)c.nature='fire';if(thunder)c.nature='thunder';return c;};
VIEW_AS.find(v=>v.id==='lihuo').extra=(g,p)=>!g._yjResponse&&g.curPlayer===p&&g.phase==='play';
const yjAwaken=EX.awaken;
EX.awaken=async(g,p,id,skills)=>{await yjAwaken(g,p,id,skills);await g.trigger('hpChanged',{player:p});};
const yjPindian=EX.pindian;
EX.pindian=async(g,a,b)=>{g.lastPindian=null;const win=await yjPindian(g,a,b);const pair=g.lastPindian?.slice();if(pair?.length===2){for(const [p,won,own,other] of [[a,win,pair[0],pair[1]],[b,pair[1].num>pair[0].num,pair[1],pair[0]]]){const x=won?other:own;if(p.hasSkill('zongshih')&&g.discard.includes(x)&&await g.askSkill(p,'zongshih',{}))await g.gain(p,[x]);}}return win;};
const yjFollowTrigger=Game.prototype.trigger;
Game.prototype.trigger=async function(event,c){
 if(event==='damageBefore'&&c.target.hasSkill('jiushi'))c._jiushiBack=!!c.target.marks.turned;
 if(event==='useCard'&&!c.responded&&c.player.flags.qiaoshui&&['basic','trick'].includes(c.card.type)){
  const p=c.player;p.flags.qiaoshui=false;
  const options=['不改变目标'];if(c.targets?.length>1)options.push('减少目标');if(c.targets?.length&&c.card.name!=='借刀杀人')options.push('增加目标');
  const mode=await YJ.choice(this,p,'qiaoshui',options);
  if(mode==='减少目标'){const [t]=await YJ.target(this,p,'qiaoshui',q=>c.targets.includes(q));if(t)c.targets.splice(c.targets.indexOf(t),1);}
  if(mode==='增加目标'){p.flags.qiaoshuiRange=p.flags.ignoreRange=true;const [t]=await YJ.target(this,p,'qiaoshui',q=>!c.targets.includes(q)&&this.canTarget(p,c.card,q));delete p.flags.ignoreRange;delete p.flags.qiaoshuiRange;if(t)c.targets.push(t);}
 }
 await yjFollowTrigger.call(this,event,c);
 if(event==='useCard'&&!c.responded&&c.player===this.curPlayer&&this.phase==='play')c.player.flags.jianying={suit:c.card.suit,num:c.card.num};
 if(event==='damageDone'&&c.source?.hasSkill('fuhun')&&c.card?.viaSkill==='fuhun'&&this.curPlayer===c.source&&this.phase==='play')c.source.flags.fuhun=true;
 if(event==='damaged'&&c._jiushiBack&&c.target.alive&&c.target.hasSkill('jiushi')&&await this.askSkill(c.target,'jiushi',c)&&c.target.marks.turned)await EX.flip(this,c.target);
 if(event==='cardFinished'){
  const p=c.player;
  if(c.card.viaSkill==='lihuo'&&c.card._yjDamage&&p.alive)await this.loseHp(p,1);
  if(c.card.viaSkill==='zhanjue'){
   if(p.alive){await this.drawCards(p,1);p.flags.zhanjueDraw=(p.flags.zhanjueDraw||0)+1;}
   for(const t of c.card._yjVictims||[])if(t.alive){await this.drawCards(t,1);if(t===p)p.flags.zhanjueDraw=(p.flags.zhanjueDraw||0)+1;}
  }
 }
 if(event==='phaseAfter'&&c.phase==='play'){
  for(const q of this.alivePlayers())if(q.flags.xiantu===c.player.seat){delete q.flags.xiantu;if(!c.player.flags.phaseKill)await this.loseHp(q,1);}
  if(c.player.hasSkill('yanyu')&&(c.player.flags.yanyu||0)>=2&&await this.askSkill(c.player,'yanyu',c)){const [t]=await YJ.target(this,c.player,'yanyu',q=>q.sex==='m');if(t)await this.drawCards(t,2);}
  delete c.player.flags.qiangzhi;
 }
 if(event==='turnEnd')delete c.player.marks.mingjian;
 // 极略的三个响应窗口，消耗标记后调用原技能，不临时污染技能列表。
 for(const p of this.alivePlayers())if(p.hasSkill('jilve')&&(p.marks.bear||0)>0){
  const id=event==='judgeCard'&&p.hand.length?'guicai':event==='damaged'&&c.target===p?'fangzhu':event==='useCard'&&!c.responded&&c.player===p&&c.card.type==='trick'?'jizhi':null;
  if(id&&await this.ask(p,{kind:'confirm',prompt:`极略：弃1忍发动${SKILL_TEXT[id][0]}？`})){p.marks.bear--;await SKILLS[id].run(this,p,c);}
 }
};
const yjRequire=Game.prototype.requireCard;
Game.prototype.requireCard=async function(p,name,ctx={}){const prev=this._yjResponse;this._yjResponse={p,name,ctx};try{const c=await yjRequire.call(this,p,name,ctx);if(c&&ctx.sha&&name==='闪')(ctx.sha._dodges||=[]).push(...realCards(c));return c;}finally{this._yjResponse=prev;}};
const yjAskSave=Game.prototype.askSave;
Game.prototype.askSave=async function(p,t){this._yjSaving=t;try{return await yjAskSave.call(this,p,t);}finally{delete this._yjSaving;}};
// Ask-based conversions can pay non-card costs and still use the normal response UI.
for(const as of ['杀','火杀','雷杀','闪','桃','酒']){
 VIEW_AS.push({id:'zhenshan',as,ask:true,extra:(g,p)=>!p.flags.zhenshan&&g.alivePlayers().some(q=>q!==p&&q.hand.length<p.hand.length)});
 VIEW_AS.push({id:'huomo',as,ask:true,extra:(g,p)=>!(p.flags.basicUsed||[]).includes(['火杀','雷杀'].includes(as)?'杀':as)&&p.hand.concat(p.equipList()).some(c=>isBlack(c)&&c.type!=='basic')&&(!g._yjResponse||as==='闪'&&!g._yjResponse.ctx?.allyCall)});
}
VIEW_AS.push({id:'qinwang',as:'杀',ask:true,extra:(g,p)=>YJ.pool(p).length>0&&g.alivePlayers().some(q=>q!==p&&q.kingdom==='shu')});
VIEW_AS.push({id:'jiushi',as:'酒',ask:true,extra:(g,p)=>!p.marks.turned});
const yjResolveAsk=Skills.resolveAsk;
Skills.resolveAsk=async function(g,p,id,as){
 if(['jiushi','zhenshan','huomo','qinwang'].includes(id)&&!Skills.options(g,p,as).some(o=>o.kind==='ask'&&o.id===id))return null;
 if(id==='jiushi'){if(p.marks.turned)return null;await EX.flip(g,p);return makeVirtual('酒',[],id);}
 if(id==='zhenshan'){
  if(p.flags.zhenshan)return null;const [t]=await YJ.target(g,p,id,q=>q!==p&&q.hand.length<p.hand.length);if(!t)return null;p.flags.zhenshan=true;
  const a=p.hand.slice(),b=t.hand.slice();for(const c of a)g.removeCard(p,c);for(const c of b)g.removeCard(t,c);p.hand.push(...b);t.hand.push(...a);await g.flushLoss();return makeVirtual(as,[],id);
 }
 if(id==='huomo'){
  if((p.flags.basicUsed||[]).includes(['火杀','雷杀'].includes(as)?'杀':as))return null;const cs=await YJ.cost(g,p,id,1,c=>isBlack(c)&&c.type!=='basic');if(!cs)return null;await YJ.top(g,p,cs[0]);return makeVirtual(as,[],id);
 }
 if(id==='qinwang'){
  if(!await YJ.discard(g,p,id))return null;
  for(const q of g.orderFrom(p).filter(q=>q!==p&&q.kingdom==='shu')){const c=await g.requireCard(q,'杀',{allyCall:true,forWho:p,keepForCaller:true,prompt:`勤王：为${p.name}提供杀并摸一张？`});if(c){await g.drawCards(q,1);return makeVirtual('杀',realCards(c),id);}}return null;
 }
 return yjResolveAsk(g,p,id,as);
};
const yjSaveOptions=Skills.saveOptions;
Skills.saveOptions=function(g,p,t){const opts=yjSaveOptions(g,p,t).map(o=>o.kind==='real'?{...o,cards:o.cards.filter(c=>YJ.effective(p,c)===o.as&&!YJ.blocked(g,p,c))}:o).filter(o=>o.kind!=='real'||o.cards.length);if(p===t)opts.push(...Skills.options(g,p,'酒').filter(o=>o.kind!=='real'));return opts;};
for(const id of ['huomo','zhenshan','qinwang']){
 const sk=SKILLS[id];sk.active=true;sk.avail=(g,p)=>['杀','火杀','雷杀','桃','酒'].some(as=>Skills.options(g,p,as).some(o=>o.kind==='ask'&&o.id===id)&&g.canUseInPlay(p,makeVirtual(as,[],id)));
 sk.run=async(g,p)=>{
  const names=['杀','火杀','雷杀','桃','酒'].filter(as=>Skills.options(g,p,as).some(o=>o.kind==='ask'&&o.id===id)&&g.canUseInPlay(p,makeVirtual(as,[],id)));
  const as=await YJ.choice(g,p,id,names);if(!as)return;const v=makeVirtual(as,[],id),ts=await YJ.target(g,p,id,q=>g.canTarget(p,v,q));if(!ts.length)return;
  const card=await Skills.resolveAsk(g,p,id,as);if(card)await g.useCard(p,card,ts);
 };
}
// Disabled skills and limited / awakening skills must never be offered by Huashen.
for(const id of ['niepan','luanwu'])SKILLS[id].limited=true;
for(const id of ['zaoxian','zhiji','hunzi','ruoyu'])SKILLS[id].awakening=true;
// Sensible bounded decisions for expansion activations and shared selection requests.
const yjAi=EX.aiPlay;
const yjRecastRun=SKILLS.recast.run,yjRecastAvail=SKILLS.recast.avail;
SKILLS.recast.avail=(g,p)=>yjRecastAvail(g,p)&&(p.isHuman||(p.flags.aiRecasts||0)<3);
SKILLS.recast.run=async(g,p)=>{p.flags.aiRecasts=(p.flags.aiRecasts||0)+1;await yjRecastRun(g,p);};
EX.aiPlay=function(g,p){
 const old=yjAi(g,p);if(old)return old;
 for(const id of [...p.skills,'xiansi_slash']){
  // Standard active skills have dedicated risk/benefit checks in AI.playTurn.
  // Availability alone must not bypass those checks (especially Kurou at 1 HP).
  if(AI.activeSkillIds.includes(id))continue;
  const sk=SKILLS[id];if(!sk?.active||!p.hasSkill(id)||!sk.avail?.(g,p))continue;
  if(['shenxing','danshou','huaiyi'].includes(id)&&p.hand.length<3)continue;
  if(id==='wuqian'&&p.flags.wuqian||id==='jiushi'&&(p.flags.jiuUsed||!p.hand.some(c=>c.name==='杀')))continue;
  if(['yeyan','fencheng','shenfen'].includes(id)&&g.alivePlayers().filter(q=>AI.isEnemy(g,p,q)).length<2)continue;
  if(id==='xianzhou'&&p.hp===p.maxHp)continue;
  return {type:'skill',skill:id};
 }
 return null;
};
const yjAiDecide=AI.decide;
const yjFriendly=new Set(['jujian','mingce','miji','zhuiyi','jiefan','zhiyan','bingyi','mingjian','xingxue','huituo','zuoding','dawu','yanyu','qiaoshi']);
AI.decide=async function(g,p,r){if(r.kind==='pickArea'&&r.area==='hand')return U.pick(r.target.hand);if(r.kind==='chooseTarget'&&yjFriendly.has(r.tag)){const ts=g.alivePlayers().filter(q=>!r.filter||r.filter(q)).sort((a,b)=>AI.attitude(g,p,b)-AI.attitude(g,p,a));return ts.slice(0,r.max||1);}if(r.kind==='choose'&&r.tag==='qinyin')return g.alivePlayers().filter(q=>q.hp<q.maxHp&&AI.isFriend(g,p,q)).length>=2?'所有角色回复1体力':'所有角色失去1体力';return yjAiDecide(g,p,r);};
