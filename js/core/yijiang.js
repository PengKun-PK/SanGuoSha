/* 一将成名：经典身份局修订规则。技能状态：flags=当前回合，marks=跨回合。
 * 版本与名单说明见 docs/expansion-rules.md。此文件在 expansion.js 后加载。 */
const YJ_ROSTER = [
 ['zhangchunhua','张春华','wei',3,'f',2011,'jueqing','shangshi'],['caozhi','曹植','wei',3,'m',2011,'luoying','jiushi'],['yujin','于禁','wei',4,'m',2011,'yizhong'],['fazheng','法正','shu',3,'m',2011,'enyuan','xuanhuo'],['masu','马谡','shu',3,'m',2011,'xinzhan','huilei'],['xushu','徐庶','shu',3,'m',2011,'wuyan','jujian'],['lingtong','凌统','wu',4,'m',2011,'xuanfeng'],['xusheng','徐盛','wu',4,'m',2011,'pojun'],['wuguotai','吴国太','wu',3,'f',2011,'ganlu','buyi'],['chengong','陈宫','qun',3,'m',2011,'mingce','zhichi'],['gaoshun','高顺','qun',4,'m',2011,'xianzhen','jinjiu'],
 ['xunyou','荀攸','wei',3,'m',2012,'qice','zhiyu'],['wangyi','王异','wei',3,'f',2012,'zhenlie','miji'],['caozhang','曹彰','wei',4,'m',2012,'jiangchi'],['guanxingzhangbao','关兴&张苞','shu',4,'m',2012,'fuhun'],['liaohua','廖化','shu',4,'m',2012,'dangxian','fuli'],['madai','马岱','shu',4,'m',2012,'mashu','qianxi'],['bulianshi','步练师','wu',3,'f',2012,'anxu','zhuiyi'],['chengpu','程普','wu',4,'m',2012,'lihuo','chunlao'],['handang','韩当','wu',4,'m',2012,'gongqi','jiefan'],['huaxiong','华雄','qun',6,'m',2012,'shiyong'],['liubiao','刘表','qun',3,'m',2012,'zishou','zongshi'],
 ['caochong','曹冲','wei',3,'m',2013,'chengxiang','renxin'],['manchong','满宠','wei',3,'m',2013,'junxing','yuce'],['guohuai','郭淮','wei',4,'m',2013,'jingce'],['guanping','关平','shu',4,'m',2013,'longyin'],['jianyong','简雍','shu',3,'m',2013,'qiaoshui','zongshih'],['liufeng','刘封','shu',4,'m',2013,'xiansi'],['zhuran','朱然','wu',4,'m',2013,'danshou'],['yufan','虞翻','wu',3,'m',2013,'zongxuan','zhiyan'],['panzhangmazhong','潘璋&马忠','wu',4,'m',2013,'duodao','anjian'],['liru','李儒','qun',3,'m',2013,'juece','mieji','fencheng'],['fuhuanghou','伏皇后','qun',3,'f',2013,'zhuikong','qiuyuan'],
 ['caozhen','曹真','wei',4,'m',2014,'sidi'],['chenqun','陈群','wei',3,'m',2014,'dingpin','faen'],['hanhaoshihuan','韩浩&史涣','wei',4,'m',2014,'shenduan','yonglve'],['zhangsong','张松','shu',3,'m',2014,'qiangzhi','xiantu'],['wuyi','吴懿','shu',4,'m',2014,'benxi'],['zhoucang','周仓','shu',4,'m',2014,'zhongyong'],['sunluban','孙鲁班','wu',3,'f',2014,'zenhui','jiaojin'],['zhuhuan','朱桓','wu',4,'m',2014,'youdi'],['guyong','顾雍','wu',3,'m',2014,'shenxing','bingyi'],['jushou','沮授','qun',3,'m',2014,'jianying','shibei'],['caifuren','蔡夫人','qun',3,'f',2014,'qieting','xianzhou'],
 ['caorui','曹叡','wei',3,'m',2015,'huituo','mingjian','xingshuai'],['zhongyao','钟繇','wei',3,'m',2015,'huomo','zuoding'],['guohuanghou','郭皇后','wei',3,'f',2015,'jiaozhao','danxin'],['liuchen','刘谌','shu',4,'m',2015,'zhanjue','qinwang'],['xiahoushi','夏侯氏','shu',3,'f',2015,'qiaoshi','yanyu'],['zhangyi','张嶷','shu',4,'m',2015,'furong','shizhi'],['quancong','全琮','wu',4,'m',2015,'zhenshan'],['sunxiu','孙休','wu',3,'m',2015,'yanzhu','xingxue','zhaofu'],['zhuzhi','朱治','wu',4,'m',2015,'anguo'],['gongsunyuan','公孙渊','qun',4,'m',2015,'huaiyi'],['gongsunzan','公孙瓒','qun',4,'m',2015,'yicong','qiaomeng'],
 ['shenguanyu','神关羽','god',5,'m','神·风','wushen','wuhun'],['shenlvmeng','神吕蒙','god',3,'m','神·风','shelie','gongxin'],['shenzhouyu','神周瑜','god',4,'m','神·火','qinyin','yeyan'],['shenzhugeliang','神诸葛亮','god',3,'m','神·火','qixing','kuangfeng','dawu'],['shencaocao','神曹操','god',3,'m','神·林','guixin','feiying'],['shenlvbu','神吕布','god',5,'m','神·林','kuangbao','wumou','wuqian','shenfen'],['shenzhaoyun','神赵云','god',2,'m','神·山','juejing','longhun'],['shensimayi','神司马懿','god',4,'m','神·山','renjie','baiyin','jilve','lianpo'],
];
KINGDOM_NAME.god='神';
for(const [id,name,k,hp,sex,pack,...skills] of YJ_ROSTER){
 GENERALS[id]={name,k,hp,sex,pack:typeof pack==='number'?`一将成名 ${pack}`:pack,skills,art:{hue:{wei:218,shu:20,wu:145,qun:40,god:48}[k],beard:sex==='f'?0:1,hat:sex==='f'?'fa':'guan'},lord:['caorui','liuchen','sunxiu'].includes(id)};
 if(GENERALS[id].lord&&!LORD_LIST.includes(id))LORD_LIST.push(id);
}
// 极略只有拜印后才获得。
GENERALS.shensimayi.skills=['renjie','baiyin','lianpo'];
const YJ={
 type:c=>c.type==='delay'?'trick':c.type,
 pool:p=>p.hand.concat(p.equipList()),
 count:(g,p)=>new Set(g.alivePlayers().map(q=>q.kingdom)).size,
 own:(p,c,phase)=>c.player===p&&c.phase===phase,
 async choice(g,p,id,options){return await g.ask(p,{kind:'choose',tag:id,options,prompt:`【${SKILL_TEXT[id]?.[0]||id}】：请选择`});},
 async target(g,p,id,filter=()=>true,max=1,min=1){const ts=await g.ask(p,{kind:'chooseTarget',tag:id,min,max,filter,cancelable:true,prompt:`【${SKILL_TEXT[id]?.[0]||id}】：选择${min===max?min:min+'～'+max}名角色`});return (ts||[]).filter(q=>q.alive&&filter(q)).slice(0,max);},
 async pick(g,p,id,cards){if(!cards.length)return null;const c=await g.ask(p,{kind:'pickFrom',cards,prompt:`【${SKILL_TEXT[id]?.[0]||id}】：选择一张牌`});return cards.includes(c)?c:null;},
 async cost(g,p,id,n=1,filter=()=>true,area='any',mandatory=false){const pool=(area==='hand'?p.hand:YJ.pool(p)).filter(filter);if(pool.length<n)return null;const r=await EX.cards(g,p,id,n,n,filter,area,{cancelable:!mandatory});const cs=r?.cards;if(cs?.length===n&&new Set(cs).size===n&&cs.every(c=>pool.includes(c)))return cs;return mandatory?pool.slice(0,n):null;},
 async discard(g,p,id,n=1,filter=()=>true,area='any',mandatory=false){const cs=await YJ.cost(g,p,id,n,filter,area,mandatory);if(cs)await g.discardCards(p,cs,SKILL_TEXT[id]?.[0]||id);return cs;},
 async strip(g,p,t,id,gain=false,area='any'){const pool=area==='hand'?t.hand:area==='equip'?t.equipList():t.allCards();if(!pool.length)return null;const c=(area==='any'||area==='hand')?await g.ask(p,{kind:'pickArea',target:t,area:area==='hand'?'hand':undefined,prompt:`【${SKILL_TEXT[id]?.[0]||id}】：选择${t.name}的一张牌`}):await YJ.pick(g,p,id,pool);if(!pool.includes(c))return null;if(gain)await g.gain(p,[c],t);else await g.discardCards(t,[c],SKILL_TEXT[id]?.[0]||id);return c;},
 async top(g,p,c){if(g.ownerOf(c))g.removeCard(g.ownerOf(c),c);g.takeProcessing([c]);const i=g.discard.indexOf(c);if(i>=0)g.discard.splice(i,1);g.deck.push(c);await g.flushLoss();},
 async maxHp(g,p,n){const before=p.hp;p.maxHp=Math.max(0,p.maxHp+n);p.hp=Math.min(p.hp,p.maxHp);await g.trigger('hpChanged',{player:p});if(p.maxHp===0)await g.die(p,null);else if(before>0&&p.hp<=0)await g.enterDying(p,null);},
 async give(g,p,t,id,n){const cs=await YJ.cost(g,p,id,Math.min(n,YJ.pool(p).length),()=>true,'any',true);if(cs?.length)await g.gain(t,cs,p);},
 async virtual(g,p,id,name,sub=[]){const c=makeVirtual(name,sub,id);if(!g.canUseInPlay(p,c))return false;const info=CARD_INFO[c.name];let ts=[],opt={};if(!info.tgt?.all){ts=await YJ.target(g,p,id,q=>g.canTarget(p,c,q),g.targetMax(p,c),info.tgt?.min||1);if(ts.length<(info.tgt?.min||1))return false;}if(name==='借刀杀人'){const [v]=await YJ.target(g,p,id,q=>g.borrowVictims(ts[0]).includes(q));if(!v)return false;opt.extra=v;}await g.useCard(p,c,ts,opt);return true;},
 active(id,name,text,avail,run,once=true){EX.add(id,name,text,{active:true,avail:(g,p)=>(!once||!p.flags[id+'Used'])&&avail(g,p),run});},
 event(id,name,text,event,can,run,forced=false){EX.add(id,name,text,{event,can,run,forced});},
 passive(id,name,text){EX.add(id,name,text,{passive:true});},
 async init(g){if(g._yjInit)return;g._yjInit=true;for(const p of g.players){if(p.g.k==='god'){const selected=await YJ.choice(g,p,'神将势力',['魏','蜀','吴','群']);p.kingdom=({'魏':'wei','蜀':'shu','吴':'wu','群':'qun'})[selected]||'qun';}if(p.hasSkill('kuangbao'))p.marks.wrath=2;if(p.hasSkill('qixing')){await g.drawCards(p,7);const cs=await YJ.cost(g,p,'qixing',7,()=>true,'hand',true);p.marks.stars=cs||[];for(const c of p.marks.stars)g.removeCard(p,c);}}await g.flushLoss();},
};

// Shared events: ownership changes, recovery, discards, damage application and turn end.
for(const name of ['drawCards','gain','recover','loseHp']){
 const base=Game.prototype[name];Game.prototype[name]=async function(p,...args){const hp=p.hp;const r=await base.call(this,p,...args);if(name==='gain'&&args[1])await this.trigger('cardsGained',{player:p,from:args[1],cards:args[0]});if(p.alive){await this.trigger('stateChanged',{player:p});if(hp!==p.hp)await this.trigger('hpChanged',{player:p,before:hp});}return r;};
}
const yjDiscard=Game.prototype.discardCards;
Game.prototype.discardCards=async function(p,cards,why){const types=cards.map(YJ.type);await yjDiscard.call(this,p,cards,why);p.flags.usedTypes||=[];p.flags.usedTypes.push(...types);if(this.curPlayer===p&&this.phase==='discard')p.flags.discardCount=(p.flags.discardCount||0)+cards.length;await this.trigger('cardsDiscarded',{player:p,cards,reason:why});};
const yjJudge=Game.prototype.judge;
Game.prototype.judge=async function(p,opt){const r=await yjJudge.call(this,p,opt);if(r.card&&this.discard.includes(r.card))await this.trigger('judgeDiscarded',{player:p,cards:[r.card]});return r;};
const yjFlip=EX.flip;
EX.flip=async(g,p)=>{await yjFlip(g,p);await g.trigger('turned',{player:p});};
const yjTurn=Game.prototype.playerTurn;
Game.prototype.playerTurn=async function(p){if(!p.alive||this.over)return;await YJ.init(this);for(const q of this.players){if(q.marks.gale===p.seat)delete q.marks.gale;if(q.marks.fog===p.seat)delete q.marks.fog;}await yjTurn.call(this,p);if(!this.over)await this.trigger('turnEnd',{player:p});const extra=this._yjExtra?.splice(0)||[];if(p.marks.extraTurn){const t=p.marks.extraTurn;delete p.marks.extraTurn;if(p.alive&&t.alive)extra.push(t);}for(const q of extra)if(q.alive&&!this.over)await this.playerTurn(q);};
const yjPhase=Game.prototype.runPhase;
Game.prototype.runPhase=async function(p,ph){if(p.flags.endTurn)return;if(ph==='play'&&!p.flags.skipPlay){for(const id of p.skills)if(SKILLS[id]?.active)delete p.flags[id+'Used'];p.flags.playUsed=0;p.flags.jianying=null;p.flags.danshou=0;p.flags.phaseDamage=0;p.flags.yanyu=0;p.flags.zhanjueDraw=0;p.flags.dingpinTargets=[];delete p.flags.jilveZhiheng;this._phaseDamage=false;for(const q of this.players){delete q.flags.phaseKill;delete q.flags.xiantu;}}await yjPhase.call(this,p,ph);};
const yjDamage=Game.prototype.damage;
Game.prototype.damage=async function(c){
 if(!c.target.alive||this.over)return;c.n??=1;
 // 绝情不产生伤害事件或连环传导，但保留来源用于濒死、击杀归属和身份奖惩。
 if(c.source?.hasSkill('jueqing')){c.applied=false;await this.loseHp(c.target,c.n,c.source);return;}
 if(c.target.marks.fog!==undefined&&c.nature!=='thunder'){c.cancelled=true;return;}
 if(c.target.marks.gale!==undefined&&c.nature==='fire')c.n++;
 await this.trigger('damageCaused',c);if(c.cancelled||c.n<=0)return;
 await yjDamage.call(this,c);
 if(c.applied){this._phaseDamage=true;if(c.card){c.card._yjDamage=true;(c.card._yjVictims||=new Set()).add(c.target);}if(c.source)c.source.flags.phaseDamage=(c.source.flags.phaseDamage||0)+c.n;}
};
const yjDie=Game.prototype.die;
Game.prototype.die=async function(p,k){if(p.marks._dyingDeath)return;p.marks._dyingDeath=true;if(k){k.flags.phaseKill=true;k.flags.turnKills=(k.flags.turnKills||0)+1;}await yjDie.call(this,p,k);for(const key of ['stars','wine','sidi','inverse']){this.toDiscard(p.marks[key]||[]);p.marks[key]=[];}for(const q of this.players){if(q.marks.fog===p.seat)delete q.marks.fog;if(q.marks.gale===p.seat)delete q.marks.gale;}};
const yjHas=Player.prototype.hasSkill;
Player.prototype.hasSkill=function(id){if(id==='xiansi_slash')return this.alive;if(this.flags.fuhun&&['wusheng','paoxiao'].includes(id))return this.alive;if(id==='wushuang'&&this.flags.wuqian)return this.alive;if(id==='wansha'&&this.flags.jilveWansha)return this.alive;return yjHas.call(this,id);};
const yjRange=Player.prototype.attackRange;
Player.prototype.attackRange=function(){return this.flags.gongqi?Infinity:yjRange.call(this);};
const yjDistance=Game.prototype.distance;
Game.prototype.distance=function(a,b){if(a===b)return 0;if(a.flags.qiaoshuiRange||a.flags.xianzhen===b.seat||a.flags.zhuikongRange===b.seat)return 1;return Math.max(1,yjDistance.call(this,a,b)+(b.hasSkill('feiying')?1:0)+(b.hasSkill('yicong')&&b.hp<=2?1:0)-(a.hasSkill('yicong')&&a.hp>2?1:0)-(a.hasSkill('benxi')&&a===this.curPlayer?(a.flags.finishedCards||0):0));};
const yjInRange=Game.prototype.inAttackRange;
Game.prototype.inAttackRange=function(a,b){return yjInRange.call(this,a,b)||(a.kingdom==='wu'&&this.alivePlayers().some(q=>q!==a&&q.hasSkill('zhaofu')&&this.distance(q,b)===1));};
const yjLimit=Game.prototype.handLimit;
Game.prototype.handLimit=function(p){return yjLimit.call(this,p)+(p.hasSkill('zongshi')?YJ.count(this,p):0)+(p.hasSkill('juejing')?2:0)+(p.marks.mingjian||0);};
const yjSha=Game.prototype.canUseSha;
YJ.shaQuota=p=>1+(p.flags.jiangchiAttack?1:0)+(p.flags.tianyiWin?1:0)+(p.marks.mingjian||0)-(p.flags.sidi||0);
YJ.unlimited=p=>p.hasSkill('paoxiao')||p.equips.weapon?.name==='诸葛连弩'||p.flags.shaUnlimited;
Game.prototype.canUseSha=function(p){if(p.flags.jiangchiBlock||p.flags.xianzhenLose||p.flags.tianyiLose)return false;return !!(YJ.unlimited(p)||(p.flags.shaUsed||0)<YJ.shaQuota(p)||p.flags.xianzhen!==undefined);};
YJ.blocked=(g,p,c)=>realCards(c).some(x=>p.hand.includes(x)&&p.flags.qianxi===(isRed(x)?'red':'black'));
YJ.effective=(p,c)=>p.hand.includes(c)&&((p.hasSkill('wushen')&&c.suit==='heart')||(p.hasSkill('jinjiu')&&c.name==='酒')||(p.hasSkill('shizhi')&&p.hp===1&&c.name==='闪'))?'杀':c.name;
const yjPlay=Game.prototype.canUseInPlay;
Game.prototype.canUseInPlay=function(p,c){if(p.flags.zhuikongSelf&&CARD_INFO[c.name]?.tgt?.all&&this.alivePlayers().some(q=>q!==p))return false;if(YJ.blocked(this,p,c)||p.flags.qiaoshuiLose&&['trick','delay'].includes(c.type))return false;if(!c.virtual&&YJ.effective(p,c)!==c.name)return false;return yjPlay.call(this,p,c);};
const yjTarget=Game.prototype.canTarget;
Game.prototype.canTarget=function(p,c,t,chosen){if(p.flags.zhuikongSelf&&p!==t)return false;if(c.viaSkill==='jiaozhao'&&p===t)return false;if(c.name==='杀'){if(p.flags.xianzhen!==undefined&&(p.flags.shaUsed||0)>=YJ.shaQuota(p)&&t.seat!==p.flags.xianzhen&&!YJ.unlimited(p))return false;if(p.flags.jiangchiAttack||(p.hasSkill('wushen')&&c.suit==='heart'))return t!==p&&t.alive&&!chosen?.includes(t)&&!(t.hasSkill('kongcheng')&&!t.hand.length);}return yjTarget.call(this,p,c,t,chosen);};
const yjTargetMax=Game.prototype.targetMax;
YJ.benxi=(g,p)=>p.hasSkill('benxi')&&g.curPlayer===p&&g.alivePlayers().every(q=>q===p||g.distance(p,q)===1);
Game.prototype.targetMax=function(p,c){return yjTargetMax.call(this,p,c)+(c.name==='杀'&&p.hasSkill('lihuo')&&c.nature==='fire'?1:0)+(c.name==='杀'&&YJ.benxi(this,p)?1:0);};
// One effect window for ordinary and AOE cards, including non-damage tricks.
YJ.effect=async(g,c)=>{if(c.card.viaSkill==='jiaozhao'&&c.target===c.user)return false;if(c.target.flags.zhichi&&(c.card.name==='杀'||c.card.type==='trick'))return false;const e={...c,cancelled:false};await g.trigger('cardEffectBefore',e);return !e.cancelled;};
YJ.ignoreArmor=(g,user,target)=>user&&(user.equips.weapon?.name==='青釭剑'||user.flags.xianzhen===target.seat||user.flags.wuqianTargets?.includes(target.seat)||YJ.benxi(g,user));
for(const name of Object.keys(CardEffect)){const base=CardEffect[name];CardEffect[name]=async(g,c)=>{if(c.card._effectUser)c={...c,user:c.card._effectUser};if(!await YJ.effect(g,c))return;const result=await base(g,c);if(name==='铁索连环'&&c.target.marks.linked)await g.trigger('linked',{player:c.target});return result;};}
const yjUse=Game.prototype.useCard;
Game.prototype.useCard=async function(p,c,ts,opt={}){if(!c.virtual&&YJ.effective(p,c)!==c.name)c=makeVirtual('杀',[c],p.hasSkill('wushen')?'wushen':p.hasSkill('jinjiu')?'jinjiu':'shizhi');if(YJ.blocked(this,p,c))return;for(const key of ['_effectUser','_dodges','_qiuyuan','_yjDamage','_yjVictims'])delete c[key];if(c.viaSkill==='lihuo'||c.viaSkill==='longhun'&&c.name==='杀')c.nature='fire';if(c.name==='杀')c._drank=!!p.flags.jiuBuff;await yjUse.call(this,p,c,ts,opt);};
const yjOptions=Skills.options;
Skills.options=function(g,p,name){if(name==='杀'&&(p.flags.jiangchiBlock||p.flags.xianzhenLose&&!g._yjResponse))return [];return yjOptions(g,p,name).map(o=>o.kind==='real'?{...o,cards:o.cards.filter(c=>YJ.effective(p,c)===name&&!YJ.blocked(g,p,c))}:o.kind==='view'?{...o,pool:o.pool.filter(c=>!YJ.blocked(g,p,c))}:o).filter(o=>o.kind==='real'?o.cards.length:o.kind==='view'?o.pool.length>=o.count:true);};
// Dynamic counts are represented by mutually exclusive view-as options, so UI and AI share validation.
YJ.views=(id,names,count,filter,extra,area='hand')=>{for(const as of names)for(let n=1;n<=160;n++)VIEW_AS.push({id,as,count:n,area,filter:(g,p,c)=>filter(g,p,c,as),extra:(g,p)=>count(g,p)===n&&(!extra||extra(g,p,as))});};
for(const id of ['wushen','jinjiu','shizhi'])VIEW_AS.push({id,as:'杀',count:1,filter:(g,p,c)=>id==='wushen'?c.suit==='heart':id==='jinjiu'?c.name==='酒':p.hp===1&&c.name==='闪'});
const yjTrigger=Game.prototype.trigger;
Game.prototype.trigger=async function(event,c){
 if(event==='useCard'){
  if(!c.responded){c.player.flags.usedCards=(c.player.flags.usedCards||0)+1;if(this.phase==='play'&&this.curPlayer===c.player)c.player.flags.playUsed=(c.player.flags.playUsed||0)+1;if(c.targets?.some(t=>t!==c.player))c.player.flags.targetedOthers=true;}
  if(c.card.type==='basic'&&(!c.responded||c.card.name==='闪'&&!this._yjResponse?.ctx?.allyCall))(c.player.flags.basicUsed||=[]).push(c.card.name);
 }
 if(event==='damaged'){this._phaseDamage=true;c.target.flags.damageTimes=(c.target.flags.damageTimes||0)+1;if(c.card){c.card._yjDamage=true;(c.card._yjVictims||=new Set()).add(c.target);}await this.trigger('hpChanged',{player:c.target});}
 await yjTrigger.call(this,event,c);
 if(event==='useCard')(c.player.flags.usedTypes||=[]).push(YJ.type(c.card));
 if(event==='cardFinished')c.player.flags.finishedCards=(c.player.flags.finishedCards||0)+1;
 if(event==='cardsLost')await this.trigger('stateChanged',{player:c.player});
};
