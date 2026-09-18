/* ================= 电脑 AI ================= */
/* 三层结构：
   1) 身份推理   —— 根据每个人对谁出牌，动态估计其阵营（suspect 值）
   2) 态度函数   —— 由自身身份 + 推理结果得出对每个人的敌友程度
   3) 行动决策   —— 用收益评估在所有可行动作里挑最优
*/
const AI = (()=>{

/* ---------------- 身份推理 ---------------- */
function init(p){
  p.ai = { suspect:{}, };
}
function setup(g){
  for(const p of g.players){
    init(p);
    for(const q of g.players) p.ai.suspect[q.seat] = 0;
    const lord = g.lord();
    p.ai.suspect[lord.seat] = -100;
    p.ai.suspect[p.seat] = {zhu:-100, zhong:-100, fan:100, nei:0}[p.identity];
  }
}
function bump(p, target, delta){
  const s = p.ai.suspect;
  s[target.seat] = U.clamp((s[target.seat]||0)+delta, -100, 100);
}
/* 观察一次行动，更新所有 AI 的推理 */
function observe(g, src, tgt, hostile){
  if(!src||!tgt||src===tgt) return;
  const lord = g.lord();
  for(const ob of g.players){
    if(!ob.ai) continue;
    if(ob===src) continue;                       // 自己知道自己
    const w = hostile ? 1 : -1;
    if(tgt===lord)      bump(ob, src, 62*w);     // 打主公 → 像反贼
    else {
      const sv = ob.ai.suspect[tgt.seat]||0;
      bump(ob, src, -0.38*sv*w);                 // 打反贼 → 像忠臣
    }
    /* 反推：一个立场已明的人去打谁，谁就站在他的对面 */
    const ss = ob.ai.suspect[src.seat]||0;
    if(Math.abs(ss) > 25 && tgt!==lord) bump(ob, tgt, -0.34*ss*w);
    if(src===lord)      bump(ob, tgt, 30*w);     // 主公打谁，谁像反贼
  }
}

/* ---------------- 态度 ---------------- */
/* 返回 [-100,100]，正数=友好 */
function attitude(g, me, other){
  if(me===other) return 100;
  const lord = g.lord();
  const s = me.ai ? (me.ai.suspect[other.seat]||0) : 0;
  const alive = g.alivePlayers();

  if(me.identity==='fan'){
    if(other===lord) return -100;
    return U.clamp(s, -80, 80);
  }
  if(me.identity==='zhu'){
    return U.clamp(-s, -100, 100);
  }
  if(me.identity==='zhong'){
    if(other===lord) return 100;
    return U.clamp(-s, -100, 100);
  }
  /* 内奸：制衡两边，最后单挑主公 */
  const others = alive.filter(x=>x!==me);
  if(others.length===1) return -100;               // 只剩主公，全力进攻
  const rebels = others.filter(x=> (me.ai.suspect[x.seat]||0) > 20);
  const loyals = others.filter(x=> x===lord || (me.ai.suspect[x.seat]||0) < -20);
  const rStr = U.sum(rebels, x=>x.hp + x.handCount*0.4);
  const lStr = U.sum(loyals, x=>x.hp + x.handCount*0.4);
  if(other===lord){
    if(others.length<=2)               return 45;   // 尚有第三人时仍需保住主公
    if(lord.hp<=2)                     return  60;  // 主公危险，先保住他
    if(rStr > lStr)                    return  45;  // 反贼占优，帮官方
    return 5;                                       // 其余时候不主动打主公
  }
  if(rStr > lStr + 2) return s>20 ? -70 : 40;       // 反贼太强，帮官方
  return s>20 ? 20 : -45;                           // 官方太强，压忠臣
}
const isEnemy  = (g,me,o)=> attitude(g,me,o) < -15;
const isFriend = (g,me,o)=> attitude(g,me,o) >  15;

/* ---------------- 牌的价值 ---------------- */
function cardValue(g,p,c){
  const n=c.name;
  let v = {
    '桃':100,'酒':38,'闪':46,'杀':42,'无懈可击':58,'无中生有':62,
    '顺手牵羊':48,'过河拆桥':46,'决斗':36,'五谷丰登':44,'桃园结义':38,
    '南蛮入侵':32,'万箭齐发':40,'借刀杀人':26,'乐不思蜀':30,'兵粮寸断':24,'闪电':12,
  }[n];
  if(v==null){
    if(c.slot==='weapon') v = 26 + c.range*5 + (n==='诸葛连弩'?26:0) + (n==='贯石斧'?6:0);
    else if(c.slot==='armor') v = n==='八卦阵'?58:52;
    else v = 44;
  }
  if(n==='桃' && p.hp<p.maxHp) v += 30;
  if(n==='闪'){
    const shas = p.hand.filter(x=>x.name==='闪').length;
    v += shas<=1 ? 14 : 0;
  }
  if(n==='杀'){
    const shas = p.hand.filter(x=>x.name==='杀').length;
    if(shas>2 && !g.canUseSha(p)) v -= 14;
    if(p.hasSkill('wusheng')||p.hasSkill('longdan')) v -= 4;
  }
  /* 已有更好装备时，同槽位新牌价值下降 */
  if(c.slot && p.equips[c.slot]) v -= 8;
  return v;
}
const worstCards = (g,p,pool,n)=> pool.slice().sort((a,b)=>cardValue(g,p,a)-cardValue(g,p,b)).slice(0,n);
const bestCards  = (g,p,pool,n)=> pool.slice().sort((a,b)=>cardValue(g,p,b)-cardValue(g,p,a)).slice(0,n);

/* 估计某人手上有几张闪 */
function dodgeChance(g,p,t){
  let base = Math.min(0.72, t.handCount*0.17);
  if(t.equips.armor && t.equips.armor.name==='八卦阵') base = 1-(1-base)*0.5;
  if(t.hasSkill('qingguo')||t.hasSkill('longdan')) base = Math.min(0.85, base+0.16);
  return base;
}
/* 威胁度：越高越该打 */
function threat(g,p,t){
  let s = t.hp*1.6 + t.handCount*0.9 + t.equipList().length*1.2;
  if(t.equips.weapon) s += t.equips.weapon.range*0.5;
  if(t.identity==='zhu') s += 3;
  return s;
}

/* ---------------- 响应：找一张可用的牌 ---------------- */
async function findResponse(g,p,name,req){
  const opts = Skills.options(g,p,name);
  if(!opts.length) return null;
  /* 优先：实体牌 → 价值最低的转化 → 求助友方 */
  const real = opts.find(o=>o.kind==='real');
  if(real) return bestForUse(g,p,real.cards,name);
  const views = opts.filter(o=>o.kind==='view');
  if(views.length){
    let best=null, bestCost=1e9;
    for(const v of views){
      const use = worstCards(g,p,v.pool,v.count);
      if(use.length<v.count) continue;
      const cost = U.sum(use,c=>cardValue(g,p,c));
      if(cost<bestCost){ bestCost=cost; best={v,use}; }
    }
    if(best) return makeVirtual(name, best.use, best.v.id);
  }
  const ask = opts.find(o=>o.kind==='ask');
  if(ask) return await Skills.resolveAsk(g,p,ask.id,name);
  return null;
}
function bestForUse(g,p,cards,name){
  /* 同名牌里挑花色最"不值钱"的：避免浪费红桃（急救/武圣需要） */
  const sorted=cards.slice().sort((a,b)=>{
    const pen=c=>((p.hasSkill('wusheng')||p.hasSkill('jijiu'))&&isRed(c)?1:0)
               +((p.hasSkill('qingguo')||p.hasSkill('qixi'))&&isBlack(c)?1:0);
    return pen(a)-pen(b) || a.num-b.num;
  });
  return sorted[0];
}

/* ---------------- 是否响应 ---------------- */
function wantDodge(g,p,req){
  const src = req.from;
  if(!src) return true;
  const att = attitude(g,p,src);
  const lethal = p.hp<=1;
  if(lethal) return true;
  if(att>60 && p.hp>2 && p.hasSkill('yiji') && !src.flags.jiuBuff) return false; // 友方的杀，偶尔不闪
  const cnt = Skills.options(g,p,'闪').length;
  if(p.hp>=3 && p.handCount<=1 && !cnt) return true;
  return true;
}
function wantSave(g,p,req){
  const dying = req.dying;
  const att = attitude(g,p,dying);
  if(p===dying) return true;
  if(p.identity==='nei'&&dying===g.lord())return g.alivePlayers().length>2;
  if(att<=0) return false;
  /* 忠臣必救主公 */
  if(dying.identity==='zhu' && (p.identity==='zhong'||p.identity==='zhu')) return true;
  if(p.identity==='nei' && dying.identity==='zhu'){
    return g.alivePlayers().length>2;   // 内奸：人多时救主公
  }
  return att>35 || (att>10 && p.hand.filter(c=>c.name==='桃').length>1);
}
function wantWuxie(g,p,info){
  const {card,target,user,negated} = info;
  if(!Skills.canProvide(g,p,'无懈可击')) return false;
  const good = ['桃园结义','五谷丰登','无中生有'].includes(card.name);
  let val;
  if(good) val = -attitude(g,p,target||user);          // 好牌落在敌人身上→想无懈
  else     val =  attitude(g,p,target||user);          // 坏牌落在友方身上→想无懈
  if(negated) val = -val;                              // 已被无懈，再无懈是帮倒忙
  const weight = {'决斗':1.3,'万箭齐发':1.1,'南蛮入侵':1.0,'乐不思蜀':1.15,
                  '顺手牵羊':0.9,'过河拆桥':0.9,'桃园结义':0.8,'五谷丰登':0.7,
                  '无中生有':0.6,'借刀杀人':1.0,'兵粮寸断':0.8}[card.name]||1;
  const score = val*weight;
  if(target && target===p && !good) return score>10;
  return score > 45;
}

/* ---------------- 可选技能触发 ---------------- */
function wantSkill(g,p,id,ctx){
  switch(id){
    case 'shensu': return ctx.phase==='judge' && p.judges.length>0;
    case 'qiaobian': return ctx.phase==='judge'?p.judges.some(c=>c.name!=='闪电'):ctx.phase==='discard'&&p.hand.length>p.hp+2;
    case 'zaiqi': return p.maxHp-p.hp>=2;
    case 'haoshi': return p.hand.length<=1||g.alivePlayers().some(q=>q!==p&&isFriend(g,p,q)&&q.hand.length===Math.min(...g.alivePlayers().filter(t=>t!==p).map(t=>t.hand.length)));
    case 'shuangxiong': return p.hand.length>=3&&p.hand.some(c=>c.name==='杀');
    case 'tianxiang': return p.hp<=2||g.alivePlayers().some(q=>q!==p&&isEnemy(g,p,q)&&q.hp>=q.maxHp-1);
    case 'fangquan': return p.hand.length>0&&g.alivePlayers().some(q=>q!==p&&isFriend(g,p,q))&&!p.hand.some(c=>g.canUseInPlay(p,c));
    case 'beige': return attitude(g,p,ctx.target)>0 && p.hand.length+p.equipList().length>1;
    case 'lieren': return p.hand.some(c=>c.num>=10)&&isEnemy(g,p,ctx.target);
    case 'jushou': return p.hp<=2||p.hand.length<=1;
    case 'guidao': return ['乐不思蜀','兵粮寸断','闪电'].includes(ctx.reason)&&wantGuicai(g,p,ctx);

    case 'jianxiong': return true;
    case 'fankui':    return true;
    case 'tiandu':    return true;
    case 'lianying':  return true;
    case 'biyue':     return true;
    case 'keji':      return true;
    case 'yiji':      return true;
    case 'luoshen':   return true;
    case 'guanxing':  return true;
    case 'ganglie':   return ctx.source && attitude(g,p,ctx.source)<20;
    case 'tuxi':      return g.alivePlayers().some(q=>q!==p&&q.handCount>0&&isEnemy(g,p,q));
    case 'luoyi':     return p.hp>=3 && p.handCount>=2 &&
                        g.alivePlayers().some(q=>q!==p&&isEnemy(g,p,q)&&g.inAttackRange(p,q));
    case 'guicai':    return wantGuicai(g,p,ctx);
    case 'tieqi':     return true;
    case 'liuli':     return wantLiuli(g,p,ctx);
    case 'rende':     return false;   // 主动技由 playTurn 决定
    default: return true;
  }
}
function wantGuicai(g,p,jd){
  if(!p.hand.length) return false;
  const owner = jd.player;
  const att = attitude(g,p,owner);
  const reason = jd.reason;
  /* 判定结果对 owner 好不好 */
  let goodNow;
  if(reason==='闪电') goodNow = !(jd.card.suit==='spade'&&jd.card.num>=2&&jd.card.num<=9);
  else if(reason==='乐不思蜀') goodNow = jd.card.suit==='heart';
  else if(reason==='兵粮寸断') goodNow = jd.card.suit==='club';
  else if(reason==='刚烈'||reason==='铁骑') goodNow = false;
  else return false;
  const want = att>15 ? true : false;   // 友方希望好结果
  if(goodNow===want) return false;
  /* 手里有没有能改变结果的牌 */
  return p.hand.some(c=>{
    let gd;
    if(reason==='闪电') gd = !(c.suit==='spade'&&c.num>=2&&c.num<=9);
    else if(reason==='乐不思蜀') gd = c.suit==='heart';
    else if(reason==='兵粮寸断') gd = c.suit==='club';
    else gd=false;
    return gd===want && cardValue(g,p,c)<60;
  });
}
function wantLiuli(g,p,ctx){
  const cand = g.alivePlayers().filter(q=>q!==p&&q!==ctx.user&&g.inAttackRange(p,q));
  if(!cand.length) return false;
  if(p.hp<=1) return true;
  const best = U.max(cand,q=>-attitude(g,p,q));
  return attitude(g,p,best) < -20 && p.cardCount>1;
}

/* ================= 决策入口 ================= */
async function decide(g,p,req){
  switch(req.kind){

  case 'respond':{
    if(req.allyCall && !isFriend(g,p,req.forWho)) return null;
    if(req.rescue)              { if(!wantSave(g,p,req)) return null; }
    else if(req.need==='闪')    { if(!wantDodge(g,p,req)) return null; }
    else if(req.need==='无懈可击'){ if(!wantWuxie(g,p,req.wuxie||{card:{name:'?'},target:p,user:p})) return null; }
    else if(req.need==='杀' && req.allyCall){
      if(!isFriend(g,p,req.forWho)) return null;
      if(p.hand.filter(c=>c.name==='杀').length<1) return null;
    }
    else if(req.need==='闪' && req.allyCall){
      if(!isFriend(g,p,req.forWho)) return null;
    }
    else if(req.need==='杀' && req.duel){
      /* 决斗：血少或牌多就跟 */
      const have = Skills.options(g,p,'杀').length;
      if(!have) return null;
      if(p.hp>=3 && p.handCount<=1 && req.vs && attitude(g,p,req.vs)>0) return null;
    }
    if(req.rescue && req.need==='桃'){
      const opts = Skills.saveOptions(g,p,req.dying);
      if(!opts.length) return null;
      const real = opts.find(o=>o.kind==='real');
      if(real) return real.cards[0];
      return await findResponse(g,p,'桃',req);
    }
    return await findResponse(g,p,req.need,req);
  }

  case 'confirm':{
    if(req.tag==='zhuque'){
      const targets=req.targets||[];
      return !targets.some(t=>t.marks.linked)&&targets.length>0 ||
        g.alivePlayers().filter(t=>t.marks.linked).reduce((s,t)=>s-attitude(g,p,t),0)>0;
    }
    if(req.skill) return wantSkill(g,p,req.skill,req.ctx||{});
    const t=req.prompt||'';
    if(t.includes('颂威')||t.includes('暴虐')){const lord=g.lord();return isFriend(g,p,lord);}
    if(t.includes('青龙')) return true;
    if(t.includes('贯石斧')) return p.cardCount>=3;
    if(t.includes('麒麟弓')) return true;
    if(t.includes('寒冰剑')) return false;
    if(t.includes('洛神')) return true;
    return true;
  }

  case 'choose':{
    const t=req.prompt||'';
    if(req.options.includes('弃置两张手牌'))
      return p.hand.length>=2 && p.hp<=2 ? '弃置两张手牌' : (p.hp<=1?'弃置两张手牌':'受到1点伤害');
    if(req.options.includes('弃置一张手牌'))
      return p.hand.length>1 ? '弃置一张手牌' : '令对方摸一张牌';
    if(t.includes('反间')){
      /* 猜花色：猜自己最可能拿到的——挑一个概率高的 */
      return U.pick(['黑桃','红桃','梅花','方块']);
    }
    return req.options[0];
  }

  case 'discard':{
    const pool = req.any ? p.allCards().filter(c=>!p.judges.includes(c)) : p.hand;
    return worstCards(g,p,pool,req.n);
  }

  case 'select': return selectFor(g,p,req);

  case 'chooseTarget': return targetsFor(g,p,req);

  case 'pickArea':{
    const t=req.target;
    if(isFriend(g,p,t)&&t.judges.length)return t.judges[0];
    /* 优先拆武器/防具/关键装备，其次手牌 */
    const eq = t.equipList();
    const prefer = eq.find(c=>c.name==='诸葛连弩') || eq.find(c=>c.slot==='armor')
                || eq.find(c=>c.slot==='weapon') || eq.find(c=>c.slot==='horseMinus') || eq[0];
    if(prefer && (t.handCount===0 || cardValue(g,p,prefer)>=46)) return prefer;
    if(t.judges.length && t.judges.some(c=>c.name==='闪电')===false && isFriend(g,p,t))
      return t.judges[0];
    if(t.handCount) return U.pick(t.hand);
    return prefer || t.judges[0] || null;
  }

  case 'pickFrom':{
    return bestCards(g,p,req.cards,1)[0];
  }

  case 'guanxing':{
    /* 好牌留顶（自己先摸），坏牌塞底；如果下家是敌人则少留好牌 */
    const nxt = g.nextAlive(p);
    const hostileNext = isEnemy(g,p,nxt);
    const sorted = req.cards.slice().sort((a,b)=>cardValue(g,p,b)-cardValue(g,p,a));
    const top=[], bottom=[];
    sorted.forEach((c,i)=>{
      const v=cardValue(g,p,c);
      if(v>=46 && (!hostileNext || top.length<1)) top.push(c); else bottom.push(c);
    });
    if(!top.length && sorted.length) top.push(bottom.shift());
    return {top, bottom};
  }
  }
  return null;
}

/* ---- select 类请求 ---- */
function selectFor(g,p,req){
  const tag=req.tag||'';
  const hand=p.hand, any=p.hand.concat(p.equipList());
  const pool = (req.area==='any' ? any : hand).filter(c=>!req.cardFilter||req.cardFilter(c));
  if(pool.length<(req.min||0)) return null;
  const enemies = g.alivePlayers().filter(q=>q!==p&&isEnemy(g,p,q));
  const friends = g.alivePlayers().filter(q=>q!==p&&isFriend(g,p,q));

  if(tag==='guicai'){
    const jd=req.jd;
    const want = attitude(g,p,jd.player)>15;
    const fit = hand.filter(c=>{
      let gd;
      if(jd.reason==='闪电') gd=!(c.suit==='spade'&&c.num>=2&&c.num<=9);
      else if(jd.reason==='乐不思蜀') gd=c.suit==='heart';
      else if(jd.reason==='兵粮寸断') gd=c.suit==='club';
      else gd=false;
      return gd===want;
    });
    return {cards:[ (fit.length?worstCards(g,p,fit,1):worstCards(g,p,hand,1))[0] ], target:null};
  }
  if(tag==='rende'){
    if(!friends.length) return null;
    const tgt = U.max(friends,q=>attitude(g,p,q)*1.0 + (q.identity==='zhu'?30:0) - q.handCount*3);
    const give = Math.max(1, Math.min(hand.length-1, p.hp<=2?1:2));
    if(hand.length<=1 && p.hp>2) return null;
    return {cards:worstCards(g,p,hand,give), target:tgt};
  }
  if(tag==='yiji'){
    if(!friends.length || !hand.length) return null;
    const tgt = U.max(friends,q=>attitude(g,p,q)-q.handCount*4);
    if(!tgt || p.handCount<=2) return null;
    return {cards:worstCards(g,p,hand,1), target:tgt};
  }
  if(tag==='zhiheng'){
    const bad = pool.filter(c=>cardValue(g,p,c)<42 && !p.equipList().includes(c));
    const n = Math.max(bad.length, p.handCount<=1?1:0);
    if(n===0) return null;
    return {cards:worstCards(g,p,pool,n), target:null};
  }
  if(tag==='qingnang'){
    const hurt = g.alivePlayers().filter(q=>q.hp<q.maxHp);
    const cand = hurt.filter(q=>attitude(g,p,q)>0 || q===p);
    if(!cand.length) return null;
    const tgt = U.max(cand,q=>(q===p?40:attitude(g,p,q))+(q.maxHp-q.hp)*12);
    return {cards:worstCards(g,p,hand,1), target:tgt};
  }
  if(tag==='liuli'){
    const cand = g.alivePlayers().filter(q=>req.targetFilter(q));
    if(!cand.length) return null;
    const tgt = U.max(cand,q=>-attitude(g,p,q));
    return {cards:worstCards(g,p,pool,1), target:tgt};
  }
  if(tag==='lijian'){
    return {cards:worstCards(g,p,pool,1), target:null};
  }
  /* 通用：弃最差的 min 张 */
  const n = req.min??1;
  const cards = worstCards(g,p,pool,n);
  let target=null;
  if(req.needTarget){
    const cand=g.alivePlayers().filter(q=>!req.targetFilter||req.targetFilter(q));
    target = cand.length?U.max(cand,q=>(['tianxiang'].includes(tag)?-1:1)*attitude(g,p,q)):null;
  }
  return {cards, target};
}

function targetsFor(g,p,req){
  const cand=g.alivePlayers().filter(q=>!req.filter||req.filter(q));
  if(!cand.length) return null;
  const tag=req.tag||'';
  if(tag==='tuxi'){
    const sorted=cand.slice().sort((a,b)=>
      (-attitude(g,p,a)+a.handCount*6) - (-attitude(g,p,b)+b.handCount*6));
    const enemies=sorted.reverse().filter(q=>attitude(g,p,q)<10);
    return enemies.slice(0,Math.min(req.max||2,enemies.length||1));
  }
  if(tag==='fanjian'){
    return [U.max(cand,q=>-attitude(g,p,q)+ (q.hp<=1?30:0))];
  }
  if(tag==='lijian1'){
    /* 让最强的敌人先出杀：他会消耗牌 */
    return [U.max(cand,q=>-attitude(g,p,q)+threat(g,p,q))];
  }
  if(tag==='lijian2'){
    return [U.max(cand,q=>-attitude(g,p,q)+(q.hp<=1?40:0)-threat(g,p,q)*0.3)];
  }
  if(['jieming','zhijian','fangquan'].includes(tag)) return cand.sort((a,b)=>(attitude(g,p,b)-b.hand.length*8)-(attitude(g,p,a)-a.hand.length*8)).slice(0,req.max||1);
  if(tag==='dimeng'){let best=null,score=0;for(const a of cand)for(const b of cand){const cost=Math.abs(a.hand.length-b.hand.length);if(cost>p.hand.length+p.equipList().length)continue;const v=(attitude(g,p,a)-attitude(g,p,b))*(b.hand.length-a.hand.length)-cost*30;if(v>score){score=v;best=[a,b];}}return best;}
  if(tag==='yinghun'){const enemy=cand.filter(q=>isEnemy(g,p,q));if(p.maxHp-p.hp>=2&&enemy.length)return [U.max(enemy,q=>q.hand.length-attitude(g,p,q))];return [U.max(cand,q=>attitude(g,p,q))];}
  if(tag==='fangzhu')return [U.max(cand,q=>q.marks.turned?attitude(g,p,q):-attitude(g,p,q))];
  const n=req.max||1;
  const sorted=cand.slice().sort((a,b)=>attitude(g,p,a)-attitude(g,p,b));
  return sorted.slice(0,n);
}

/* ================= 出牌阶段 ================= */
async function playTurn(g,p){
  const enemies = g.alivePlayers().filter(q=>q!==p&&isEnemy(g,p,q));
  const friends = g.alivePlayers().filter(q=>q!==p&&isFriend(g,p,q));
  const hand = p.hand;

  /* 1. 危急：吃桃 */
  const tao = hand.find(c=>c.name==='桃');
  if(tao && p.hp<p.maxHp && (p.hp<=1 || p.hp<=p.maxHp-2))
    return {type:'use', card:tao, targets:[p]};

  /* 2. 装备（先穿防具/武器） */
  const equipOrder = ['armor','weapon','horseMinus','horsePlus'];
  for(const slot of equipOrder){
    const cands = hand.filter(c=>c.slot===slot);
    if(!cands.length) continue;
    const best = U.max(cands,c=>cardValue(g,p,c));
    const cur  = p.equips[slot];
    if(!cur || cardValue(g,p,best) > cardValue(g,p,cur)+6)
      return {type:'use', card:best, targets:[]};
  }

  /* 3. 无中生有 */
  const wzsy = hand.find(c=>c.name==='无中生有');
  if(wzsy) return {type:'use', card:wzsy, targets:[p]};

  const expansionAction=EX.aiPlay(g,p);if(expansionAction)return expansionAction;
  /* 4. 主动技能 */
  const sk = pickActiveSkill(g,p,enemies,friends);
  if(sk) return {type:'skill', skill:sk};

  /* 5. 群体锦囊（收益为正才用） */
  for(const name of ['五谷丰登','桃园结义','万箭齐发','南蛮入侵']){
    const c = hand.find(x=>x.name===name);
    if(!c) continue;
    if(aoeScore(g,p,name) > 0) return {type:'use', card:c, targets:[]};
  }

  /* 6. 拆牌类 */
  for(const name of ['顺手牵羊','过河拆桥']){
    const c = viewAsPlay(g,p,name);
    if(!c) continue;
    const helped=g.legalTargets(p,c).find(q=>isFriend(g,p,q)&&q.judges.some(j=>j.name!=='闪电'));
    if(helped) return {type:'use',card:c,targets:[helped]};
    const tg = g.legalTargets(p,c).filter(q=>attitude(g,p,q)<0);
    if(tg.length){
      const t = U.max(tg,q=>-attitude(g,p,q)+ (q.equips.weapon?8:0) + (q.equips.armor?10:0) + q.cardCount);
      return {type:'use', card:c, targets:[t]};
    }
  }

  /* 7. 延时锦囊 */
  const yueOpt = viewAsPlay(g,p,'乐不思蜀');
  if(yueOpt){
    const tg = g.legalTargets(p,yueOpt).filter(q=>attitude(g,p,q)<-10);
    if(tg.length){
      const t=U.max(tg,q=>-attitude(g,p,q)+q.handCount*1.5+(q.identity==='zhu'?12:0));
      return {type:'use', card:yueOpt, targets:[t]};
    }
  }
  const blcd = viewAsPlay(g,p,'兵粮寸断');
  if(blcd){
    const tg=g.legalTargets(p,blcd).filter(q=>attitude(g,p,q)<-10);
    if(tg.length) return {type:'use', card:blcd, targets:[U.max(tg,q=>-attitude(g,p,q))]};
  }

  /* 8. 决斗 */
  const duel = viewAsPlay(g,p,'决斗');
  if(duel){
    const myShas = hand.filter(c=>c.name==='杀'||p.hasSkill('wusheng')&&isRed(c)||p.hasSkill('longdan')&&c.name==='闪').length;
    const tg = g.legalTargets(p,duel).filter(q=>attitude(g,p,q)<-20);
    if(tg.length){
      const t = U.max(tg,q=>-attitude(g,p,q) - q.handCount*4 + (q.hp<=1?40:0));
      if(myShas>=1 || t.handCount<=1 || t.hp<=1)
        return {type:'use', card:duel, targets:[t]};
    }
  }

  /* 9. 借刀杀人 */
  const jdsr = hand.find(c=>c.name==='借刀杀人');
  if(jdsr){
    const holders = g.legalTargets(p,jdsr);
    for(const h of holders){
      if(attitude(g,p,h)>40) continue;
      const vic = g.alivePlayers().filter(q=>q!==h && g.inAttackRange(h,q) && attitude(g,p,q)<-20);
      if(vic.length) return {type:'use', card:jdsr, targets:[h], opt:{extra:U.max(vic,q=>-attitude(g,p,q))}};
    }
  }

  /* 酒必须在杀之前评估，且只为有合法目标的进攻消耗。 */
  const wine=viewAsPlay(g,p,'酒'), attack=pickSha(g,p);
  if(wine&&attack&&g.canUseInPlay(p,wine)&&g.canUseSha(p)&&!realCards(attack).some(c=>realCards(wine).includes(c))){
    const targets=g.legalTargets(p,attack).filter(t=>isEnemy(g,p,t)&&!shaImmune(p,t,attack));
    if(targets.some(t=>t.hp<=2&&dodgeChance(g,p,t)<0.55))return {type:'use',card:wine,targets:[p]};
  }
  /* 10. 杀 */
  if(g.canUseSha(p)){
    const shaCard = pickSha(g,p);
    if(shaCard){
      let tg = g.legalTargets(p,shaCard).filter(q=>attitude(g,p,q)<-10&&!shaImmune(p,q,shaCard));
      /* 场上还没有确定的敌人时：手牌富余就对最可疑的人试探性出杀，
         而不是干坐一回合（否则身份公开的主公一方会被反贼白打） */
      if(!tg.length && p.identity!=='zhu' &&
         (p.hand.filter(c=>c.name==='杀').length>=2 || p.hand.length>p.hp)){
        /* 主公误杀忠臣要弃光所有牌，所以主公从不试探；
           忠臣只打"稍有嫌疑"的人，反贼/内奸可以放手一些 */
        const lim = p.identity==='zhong' ? -2 : 12;
        tg = g.legalTargets(p,shaCard).filter(q=>attitude(g,p,q)<lim&&!shaImmune(p,q,shaCard));
      }
      if(tg.length){
        const t = U.max(tg,q=>{
          let s = -attitude(g,p,q);
          s += (1-dodgeChance(g,p,q))*22;
          if(q.hp<=1) s += 45;
          if(q.identity==='zhu' && p.identity==='fan') s += 26;
          if(q.equips.armor && q.equips.armor.name==='仁王盾' && isBlack(shaCard)) s -= 50;
          if(q.hasSkill('ganglie')||q.hasSkill('fankui')) s -= 12;
          return s;
        });
        if(attitude(g,p,t)<12) return {type:'use', card:shaCard, targets:[t,...tg.filter(q=>q!==t&&isEnemy(g,p,q)).slice(0,g.targetMax(p,shaCard)-1)]};
      }
    }
  }

  /* 11. 酒（为下一张杀加伤） */
  const jiu = hand.find(c=>c.name==='酒');
  if(jiu && !p.flags.jiuUsed && g.canUseSha(p)){
    const s2 = pickSha(g,p);
    if(s2){
      const tg=g.legalTargets(p,s2).filter(q=>attitude(g,p,q)<-20 && q.hp<=2);
      if(tg.length) return {type:'use', card:jiu, targets:[p]};
    }
  }

  /* 12. 闪电（手牌多且血厚时） */
  const sd = hand.find(c=>c.name==='闪电');
  if(sd && p.hp>=3 && hand.length>=4 && !p.hasJudge('闪电'))
    return {type:'use', card:sd, targets:[p]};

  /* 13. 桃（补血） */
  if(tao && p.hp<p.maxHp && hand.length>p.hp)
    return {type:'use', card:tao, targets:[p]};

  return {type:'end'};
}

function shaImmune(p,t,c){if(p.equips.weapon?.name==='青釭剑')return false;return t.equips.armor?.name==='藤甲'&&!c.nature&&p.equips.weapon?.name!=='朱雀羽扇' || t.equips.armor?.name==='仁王盾'&&isBlack(c);}

function pickSha(g,p){
  const real = p.hand.filter(c=>c.name==='杀');
  if(real.length){
    const score=c=>Math.max(-100,...g.legalTargets(p,c).filter(t=>!shaImmune(p,t,c)).map(t=>{
      let value=-attitude(g,p,t);
      if(c.nature==='fire'&&t.equips.armor?.name==='藤甲')value+=20;
      if(c.nature&&t.marks.linked)value+=g.alivePlayers().filter(q=>q!==t&&q.marks.linked).reduce((n,q)=>n-attitude(g,p,q)*.5,0);
      return value;
    }));
    return real.slice().sort((a,b)=>score(b)-score(a))[0];
  }
  const opts = Skills.options(g,p,'杀').filter(o=>o.kind==='view');
  if(!opts.length) return null;
  let best=null,bc=1e9;
  for(const v of opts){
    const use=worstCards(g,p,v.pool,v.count);
    if(use.length<v.count) continue;
    const cost=U.sum(use,c=>cardValue(g,p,c));
    if(cost<bc && cost<70){ bc=cost; best={v,use}; }
  }
  return best?makeVirtual('杀',best.use,best.v.id):null;
}
function viewAsPlay(g,p,name){
  const real=p.hand.filter(c=>c.name===name);
  if(real.length) return real[0];
  const opts=Skills.options(g,p,name).filter(o=>o.kind==='view');
  if(!opts.length) return null;
  const viable=opts.filter(v=>v.id!=='guhuo'||v.pool.some(c=>c.name===name));
  if(!viable.length)return null;
  const v=viable[0];
  const use=worstCards(g,p,v.pool,v.count);
  if(use.length<v.count) return null;
  return makeVirtual(name,use,v.id);
}

/* 群体锦囊净收益 */
function aoeScore(g,p,name){
  let s=0;
  const others=g.alivePlayers().filter(q=>q!==p);
  if(name==='桃园结义'){
    if(p.hp<p.maxHp) s+=28;
    for(const q of others) if(q.hp<q.maxHp) s += attitude(g,p,q)*0.34;
    return s-10;
  }
  if(name==='五谷丰登'){
    s += 26;
    for(const q of others) s += attitude(g,p,q)*0.16;
    return s-8;
  }
  /* 南蛮 / 万箭 */
  const need = name==='万箭齐发'?'闪':'杀';
  for(const q of others){
    if(q.equips.armor?.name==='藤甲'||(name==='南蛮入侵'&&(q.hasSkill('huoshou')||q.hasSkill('juxiang'))))continue;
    if(q===g.lord()&&q.hp<=1&&p.identity!=='fan'&&g.alivePlayers().length>2)return -1000;
    const canBlock = name==='万箭齐发' ? dodgeChance(g,p,q)
                   : Math.min(0.75, q.handCount*0.2 + (q.hasSkill('wusheng')||q.hasSkill('longdan')?0.2:0));
    const hitP = 1-canBlock;
    let v = hitP*30 + (1-hitP)*8;          // 打不中也消耗对方一张牌
    if(q.hp<=1) v += hitP*40;
    s += -attitude(g,p,q)/100*v;
  }
  if(name==='南蛮入侵' && others.some(q=>q.equips.armor&&q.equips.armor.name==='藤甲')) s-=10;
  return s-16;
}

function pickActiveSkill(g,p,enemies,friends){
  const order=['zhiheng','tuxi','qingnang','rende','fanjian','lijian','kurou'];
  for(const id of order){
    if(!p.hasSkill(id)) continue;
    const sk=SKILLS[id];
    if(!sk.active) continue;
    if(sk.avail && !sk.avail(g,p)) continue;
    if(id==='zhiheng'){
      const bad=p.hand.filter(c=>cardValue(g,p,c)<42).length;
      if(bad>=2 || p.handCount<=1) return id;
      continue;
    }
    if(id==='rende'){
      if(!friends.length) continue;
      if(p.handCount>=3 || (p.hp<p.maxHp && p.handCount>=2)) return id;
      continue;
    }
    if(id==='kurou'){
      if(p.hp>=3 && p.handCount<=2) return id;
      if(p.hp>=2 && p.handCount===0) return id;
      continue;
    }
    if(id==='qingnang'){
      if(g.alivePlayers().some(q=>q.hp<q.maxHp && (q===p||attitude(g,p,q)>20))) return id;
      continue;
    }
    if(id==='fanjian'){
      if(enemies.length && p.handCount>=2) return id;
      continue;
    }
    if(id==='lijian'){
      const males=g.alivePlayers().filter(q=>q!==p&&q.sex==='m');
      if(males.length>=2 && p.cardCount>=2) return id;
      continue;
    }
    return id;
  }
  return null;
}

return {setup, observe, attitude, isEnemy, isFriend, decide, playTurn,
        wantSkill, wantWuxie, cardValue, findResponse, threat};
})();
