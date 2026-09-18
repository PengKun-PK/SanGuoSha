/* ================= 武将技能 ================= */

/* 请求友方势力角色代为打出（护驾 / 激将） */
async function askAllies(g, p, kingdom, needName, skillId){
  const skName = SKILL_TEXT[skillId][0];
  for(const q of g.orderFrom(p)){
    if(q===p || !q.alive || q.kingdom!==kingdom) continue;
    if(!Skills.canProvide(g,q,needName) && !(needName==='闪'&&(q.equips.armor?.name==='八卦阵'||q.hasSkill('bazhen')&&!q.equips.armor))) continue;
    const c = await g.requireCard(q, needName,
      {prompt:`<b>${p.name}</b> 发动【${skName}】，是否打出一张【${needName}】？`, allyCall:true, forWho:p,keepForCaller:true});
    if(c){
      g.log(`${g.nm(q)} 响应了 ${g.nm(p)} 的 ${g.sn(skillId)}。`);
      return makeVirtual(needName, realCards(c), skillId);
    }
  }
  g.log(`无人响应 ${g.nm(p)} 的 ${g.sn(skillId)}。`);
  return null;
}

/* ---------------- 转化技（视为牌） ---------------- */
/* opt: {id, as, count, area, filter, ask}  */
const VIEW_AS = [
  {id:'wusheng', as:'杀', count:1, area:'any', filter:(g,p,c)=>isRed(c)},
  {id:'longdan', as:'杀', count:1, filter:(g,p,c)=>c.name==='闪'},
  {id:'longdan', as:'闪', count:1, filter:(g,p,c)=>c.name==='杀'},
  {id:'qingguo', as:'闪', count:1, filter:(g,p,c)=>isBlack(c)},
  {id:'qixi',    as:'过河拆桥', count:1, area:'any', filter:(g,p,c)=>isBlack(c)},
  {id:'guose',   as:'乐不思蜀', count:1, area:'any', filter:(g,p,c)=>c.suit==='diamond'},
  {id:'jijiu',   as:'桃', count:1, area:'any', filter:(g,p,c)=>isRed(c),
   extra:(g,p)=>g.curPlayer!==p},
  {id:'zhangba', as:'杀', count:2, filter:()=>true,
   extra:(g,p)=>p.equips.weapon && p.equips.weapon.name==='丈八蛇矛', equip:true},
  {id:'hujia',   as:'闪', ask:true,
   extra:(g,p)=>p.identity==='zhu' && g.alivePlayers().some(q=>q!==p&&q.kingdom==='wei')},
  {id:'jijiang', as:'杀', ask:true,
   extra:(g,p)=>p.identity==='zhu' && g.alivePlayers().some(q=>q!==p&&q.kingdom==='shu')},
];

const Skills = {
  /* p 可用于响应 asName 的所有方案 */
  options(g, p, asName){
    const out=[];
    const real = p.hand.filter(c=>c.name===asName);
    if(real.length) out.push({kind:'real', cards:real, as:asName});
    for(const v of VIEW_AS){
      if(v.as!==asName) continue;
      if(v.id==='guhuo' && g._allyCall) continue;
      const skillId = v.equip ? null : v.id;
      if(skillId && !p.hasSkill(skillId)) continue;
      if(v.extra && !v.extra(g,p)) continue;
      if(v.ask){ out.push({kind:'ask', id:v.id, as:asName}); continue; }
      const pool = (v.area==='any'?p.hand.concat(p.equipList()):p.hand).filter(c=>v.filter(g,p,c));
      if(pool.length>=v.count && (v.id!=='luanji'||pool.some(a=>pool.some(b=>a!==b&&a.suit===b.suit))))
        out.push({kind:'view', id:v.id, as:asName, count:v.count, pool,
                  label: v.equip ? '丈八蛇矛' : SKILL_TEXT[v.id][0]});
    }
    return out;
  },
  canProvide(g,p,asName){ return Skills.options(g,p,asName).length>0; },

  /* 濒死可用的救援方案 */
  saveOptions(g,q,dying){
    const out = Skills.options(g,q,'桃');
    if(q===dying){
      const jiu = q.hand.filter(c=>c.name==='酒');
      if(jiu.length) out.push({kind:'real', cards:jiu, as:'酒'});
    }
    return out;
  },

  /* 执行 ask 型转化（护驾/激将） */
  async resolveAsk(g,p,id,asName){
    if(id==='hujia')   return await askAllies(g,p,'wei','闪','hujia');
    if(id==='jijiang') return await askAllies(g,p,'shu','杀','jijiang');
    return null;
  },
};

/* ================= 技能实现 ================= */
const SKILLS = {

/* ---------- 魏 ---------- */
jianxiong:{name:'奸雄', event:'damaged',
  can:(g,p,c)=>c.target===p && c.card && realCards(c.card).some(x=>g.processing.includes(x)),
  async run(g,p,c){
    const got = g.takeProcessing(realCards(c.card));
    p.hand.push(...got);
    g.log(`${g.nm(p)} 获得了 ${got.map(x=>g.cn(x)).join('、')}。`);
    await FX.flyCard(got[0], U.$('playZone'), UI.elOf(p));
    UI.refresh(g);
  }},

hujia:{name:'护驾', lord:true, event:'_viewas'},

fankui:{name:'反馈', event:'damaged',
  can:(g,p,c)=>c.target===p && c.source && c.source!==p && c.source.cardCount>0,
  async run(g,p,c){
    const card = await g.ask(p,{kind:'pickArea', target:c.source, prompt:`【反馈】：获得 ${c.source.name} 的一张牌`});
    if(card) await g.gain(p,[card],c.source);
  }},

guicai:{name:'鬼才', event:'judgeCard',
  can:(g,p,jd)=>p.hand.length>0,
  async run(g,p,jd){
    const cs = await g.ask(p,{kind:'select', tag:'guicai', jd, min:1,max:1, area:'hand',
      prompt:`【鬼才】：打出一张手牌代替 ${jd.player.name} 的判定牌 ${cardTxt(jd.card)}`, cancelable:false});
    if(!cs||!cs.cards||!cs.cards.length) return;
    const nc = cs.cards[0];
    g.removeCard(p,nc);
    const old = jd.card;
    const i=g.processing.indexOf(old); if(i>=0) g.processing.splice(i,1);
    g.toDiscard([old]);
    jd.card = nc; g.processing.push(nc);
    g.log(`${g.nm(p)} 用 ${g.cn(nc)} 替换了判定牌。`);
    UI.refresh(g);
    await U.wait(300);
  }},

ganglie:{name:'刚烈', event:'damaged',
  can:(g,p,c)=>c.target===p && c.source && c.source!==p && c.source.alive,
  async run(g,p,c){
    const src=c.source;
    const r = await g.judge(p,{reason:'刚烈', check:x=>x.suit!=='heart',
      resultText:(x,ok)=>ok?'刚烈发动！':'被化解'});
    if(!r.ok) return;
    let choice='受到1点伤害';
    if(src.hand.length>=2){
      choice = await g.ask(src,{kind:'choose', options:['弃置两张手牌','受到1点伤害'],
        prompt:`${p.name} 的【刚烈】：请选择`});
    }
    if(choice==='弃置两张手牌'){
      const cs = await g.ask(src,{kind:'select',tag:'ganglie',min:2,max:2,area:'hand',prompt:'刚烈：弃置两张手牌',cancelable:false});
      await g.discardCards(src, (cs&&cs.cards)||src.hand.slice(0,2), '刚烈');
    }else{
      await g.damage({source:p,target:src,n:1});
    }
  }},

tuxi:{name:'突袭', event:'drawNum',
  can:(g,p,c)=>c.player===p && g.alivePlayers().some(q=>q!==p&&q.hand.length>0),
  async run(g,p,c){
    c.skip = true;
    const cand = g.alivePlayers().filter(q=>q!==p&&q.hand.length>0);
    const res = await g.ask(p,{kind:'chooseTarget', tag:'tuxi', min:1, max:Math.min(2,cand.length),
      filter:q=>q!==p&&q.hand.length>0, prompt:'【突袭】：选择至多两名角色，获得其各一张手牌'});
    const targets = res||[];
    for(const t of targets){
      if(!t.hand.length) continue;
      const card = U.pick(t.hand);
      await g.gain(p,[card],t);
    }
  }},

luoyi:{name:'裸衣', event:'drawNum',
  can:(g,p,c)=>c.player===p && c.n>0,
  async run(g,p,c){ c.n--; p.flags.luoyiBuff=true;
    g.log(`${g.nm(p)} 少摸一张牌，本回合【杀】和【决斗】伤害+1。`); }},

tiandu:{name:'天妒', event:'judgeDone',
  can:(g,p,jd)=>jd.player===p && jd.card && g.processing.includes(jd.card),
  async run(g,p,jd){
    g.takeProcessing([jd.card]); p.hand.push(jd.card);
    g.log(`${g.nm(p)} 获得判定牌 ${g.cn(jd.card)}。`);
    await FX.flyCard(jd.card, U.$('centerZone'), UI.elOf(p));
    UI.refresh(g);
  }},

yiji:{name:'遗计', event:'damaged',
  can:(g,p,c)=>c.target===p,
  async run(g,p,c){
    for(let k=0;k<(c.n||1);k++){
      /* 只能分配本次摸到的两张牌 */
      let pool = await g.drawCards(p,2);
      const others = g.alivePlayers().filter(q=>q!==p);
      if(!others.length) continue;
      while(pool.length){
        pool = pool.filter(x=>p.hand.includes(x));
        if(!pool.length) break;
        const res = await g.ask(p,{kind:'select', tag:'yiji', min:0,max:1, area:'hand', cancelable:true,
          cardFilter:x=>pool.includes(x),
          needTarget:true, targetFilter:q=>q!==p&&q.alive,
          prompt:'【遗计】：可将刚摸到的一张牌交给其他角色（可取消）'});
        if(!res||!res.cards||!res.cards.length||!res.target) break;
        const give = res.cards.filter(x=>pool.includes(x));
        if(!give.length) break;
        pool = pool.filter(x=>!give.includes(x));
        await g.gain(res.target, give, p);
      }
    }
  }},

qingguo:{name:'倾国', event:'_viewas'},

luoshen:{name:'洛神', event:'phaseStart',
  can:(g,p,c)=>c.player===p && c.phase==='start',
  async run(g,p){
    const got=[];
    while(true){
      const r = await g.judge(p,{reason:'洛神', keep:true, check:x=>isBlack(x),
        resultText:(x,ok)=>ok?'黑色·继续':'红色·结束'});
      if(!r.ok) break;
      if(g.processing.includes(r.card)){ g.takeProcessing([r.card]); p.hand.push(r.card); got.push(r.card);
        await FX.flyCard(r.card, U.$('centerZone'), UI.elOf(p)); UI.refresh(g); }
      if(p.isHuman){
        const again = await UI.request(g,p,{kind:'confirm',prompt:'【洛神】：是否继续判定？'});
        if(!again) break;
      }else{
        if(got.length>=4 && Math.random()<0.5) break;
      }
    }
    if(got.length) g.log(`${g.nm(p)} 通过 ${g.sn('luoshen')} 获得了 ${got.length} 张牌。`);
  }},

/* ---------- 蜀 ---------- */
rende:{name:'仁德', active:true,
  avail:(g,p)=>p.hand.length>0 && g.alivePlayers().length>1,
  async run(g,p){
    const res = await g.ask(p,{kind:'select', tag:'rende', min:1, max:p.hand.length, area:'hand',
      needTarget:true, targetFilter:q=>q!==p&&q.alive, cancelable:true,
      prompt:'【仁德】：将任意张手牌交给一名其他角色'});
    if(!res||!res.cards||!res.cards.length||!res.target) return;
    const before = p.flags.rendeCount||0;
    await g.gain(res.target, res.cards, p);
    p.flags.rendeCount = before + res.cards.length;
    if(before < 2 && p.flags.rendeCount >= 2 && p.hp<p.maxHp){
      g.log(`${g.nm(p)} 本阶段已交出两张牌，回复1点体力。`);
      await g.recover(p,1);
    }
  }},

jijiang:{name:'激将', lord:true, event:'_viewas'},
wusheng:{name:'武圣', event:'_viewas'},
paoxiao:{name:'咆哮', passive:true},

guanxing:{name:'观星', event:'phaseStart',
  can:(g,p,c)=>c.player===p && c.phase==='start',
  async run(g,p){
    const n = Math.min(5, g.alivePlayers().length);
    const cards = g.popDeck(n);
    if(!cards.length) return;
    const res = await g.ask(p,{kind:'guanxing', cards, prompt:`【观星】：安排牌堆顶的 ${cards.length} 张牌`});
    const top = (res&&res.top)||cards, bottom=(res&&res.bottom)||[];
    /* deck 末尾是"顶"，所以倒序压入 */
    for(let i=top.length-1;i>=0;i--) g.deck.push(top[i]);
    for(const c of bottom) g.deck.unshift(c);
    g.log(`${g.nm(p)} 将 ${top.length} 张牌置于牌堆顶，${bottom.length} 张置于牌堆底。`);
    UI.updateDeck(g);
  }},

kongcheng:{name:'空城', passive:true},
longdan:{name:'龙胆', event:'_viewas'},
mashu:{name:'马术', passive:true},

tieqi:{name:'铁骑', event:'shaTarget',
  can:(g,p,c)=>c.user===p && c.target!==p,
  async run(g,p,c){
    const r = await g.judge(p,{reason:'铁骑', check:x=>isRed(x),
      resultText:(x,ok)=>ok?'铁骑！不可闪避':'判定失败'});
    if(r.ok){
      c.target.flags['noDodge_'+c.card.uid]=true;
      g.log(`${g.nm(c.target)} 不能使用【闪】响应。`);
    }
  }},

jizhi:{name:'集智', event:'useCard', forced:true,
  can:(g,p,c)=>c.player===p && c.card && CARD_INFO[c.card.name].type==='trick' && !c.responded,
  async run(g,p){ await g.drawCards(p,1); }},

qicai:{name:'奇才', passive:true},

/* ---------- 吴 ---------- */
zhiheng:{name:'制衡', active:true, once:'zhiheng',
  avail:(g,p)=>!p.flags.zhihengUsed && p.cardCount>0,
  async run(g,p){
    const res = await g.ask(p,{kind:'select', tag:'zhiheng', min:1, max:p.cardCount, area:'any', cancelable:true,
      prompt:'【制衡】：弃置任意张牌，然后摸等量的牌'});
    if(!res||!res.cards||!res.cards.length) return;
    p.flags.zhihengUsed=true;
    const n=res.cards.length;
    await g.discardCards(p,res.cards,'制衡');
    await g.drawCards(p,n);
  }},

jiuyuan:{name:'救援', lord:true, passive:true},
qixi:{name:'奇袭', event:'_viewas'},

keji:{name:'克己', event:'phaseStart',
  can:(g,p,c)=>c.player===p && c.phase==='discard' && !p.flags.usedShaThisTurn && p.hand.length>p.hp,
  async run(g,p){ p.flags.skipDiscard=true; g.log(`${g.nm(p)} 跳过弃牌阶段。`); }},

kurou:{name:'苦肉', active:true,
  avail:(g,p)=>p.hp>0,
  async run(g,p){
    await g.loseHp(p,1);
    if(p.alive) await g.drawCards(p,2);
  }},

yingzi:{name:'英姿', event:'drawNum', forced:true,
  can:(g,p,c)=>c.player===p,
  async run(g,p,c){ c.n++; g.log(`${g.nm(p)} 多摸一张牌。`); }},

fanjian:{name:'反间', active:true,
  avail:(g,p)=>!p.flags.fanjianUsed && p.hand.length>0 && g.alivePlayers().length>1,
  async run(g,p){
    const res = await g.ask(p,{kind:'chooseTarget', tag:'fanjian', min:1,max:1, filter:q=>q!==p&&q.alive,
      prompt:'【反间】：选择一名其他角色'});
    if(!res||!res.length) return;
    p.flags.fanjianUsed=true;
    const t=res[0];
    const card = U.pick(p.hand);
    const suit = await g.ask(t,{kind:'choose', options:['黑桃','红桃','梅花','方块'],
      prompt:`${p.name} 发动【反间】，请选择一种花色`});
    g.log(`${g.nm(t)} 选择了 ${suit}。`);
    g.removeCard(p,card);
    t.hand.push(card);
    g.log(`${g.nm(t)} 获得并展示了 ${g.cn(card)}。`);
    await FX.flyCard(card, UI.elOf(p), UI.elOf(t), {fade:false});
    UI.refresh(g);
    if(SUIT[card.suit].name !== suit){
      await g.damage({source:p,target:t,n:1});
    }else g.log(`花色相同，${g.nm(t)} 未受到伤害。`);
  }},

guose:{name:'国色', event:'_viewas'},

liuli:{name:'流离', event:'shaTarget',
  can:(g,p,c)=>c.target===p && p.cardCount>0 &&
      g.alivePlayers().some(q=>q!==p && q!==c.user && g.inAttackRange(p,q)),
  async run(g,p,c){
    const cand = g.alivePlayers().filter(q=>q!==p && q!==c.user && g.inAttackRange(p,q));
    const res = await g.ask(p,{kind:'select', tag:'liuli', min:1,max:1, area:'any', needTarget:true,
      targetFilter:q=>cand.includes(q), cancelable:true,
      prompt:'【流离】：弃置一张牌，将此【杀】转移给攻击范围内的另一名角色'});
    if(!res||!res.cards||!res.cards.length||!res.target) return;
    await g.discardCards(p,res.cards,'流离');
    g.log(`【杀】的目标转移给 ${g.nm(res.target)}。`, true);
    c.transferTo = res.target;
  }},

qianxun:{name:'谦逊', passive:true},

lianying:{name:'连营', event:'_manual',
  async run(g,p){ await g.drawCards(p,1); }},

/* ---------- 群 ---------- */
qingnang:{name:'青囊', active:true,
  avail:(g,p)=>!p.flags.qingnangUsed && p.hand.length>0 && g.alivePlayers().some(q=>q.hp<q.maxHp),
  async run(g,p){
    const res = await g.ask(p,{kind:'select', tag:'qingnang', min:1,max:1, area:'hand', needTarget:true,
      targetFilter:q=>q.alive&&q.hp<q.maxHp, cancelable:true,
      prompt:'【青囊】：弃置一张手牌，令一名已受伤角色回复1点体力'});
    if(!res||!res.cards||!res.cards.length||!res.target) return;
    p.flags.qingnangUsed=true;
    await g.discardCards(p,res.cards,'青囊');
    await g.recover(res.target,1);
  }},

jijiu:{name:'急救', event:'_viewas'},
wushuang:{name:'无双', passive:true},

lijian:{name:'离间', active:true,
  avail:(g,p)=>!p.flags.lijianUsed && p.cardCount>0 &&
      g.alivePlayers().filter(q=>q!==p&&q.sex==='m').length>=2,
  async run(g,p){
    const males = g.alivePlayers().filter(q=>q!==p&&q.sex==='m');
    const res = await g.ask(p,{kind:'select', tag:'lijian', min:1,max:1, area:'any', cancelable:true,
      prompt:'【离间】：弃置一张牌，令两名男性角色决斗'});
    if(!res||!res.cards||!res.cards.length) return;
    const t1 = await g.ask(p,{kind:'chooseTarget',tag:'lijian1',min:1,max:1,filter:q=>males.includes(q),
      prompt:'【离间】：选择第一名男性角色（视为其使用【决斗】）'});
    if(!t1||!t1.length) return;
    const t2 = await g.ask(p,{kind:'chooseTarget',tag:'lijian2',min:1,max:1,filter:q=>males.includes(q)&&q!==t1[0],
      prompt:'【离间】：选择第二名男性角色（决斗目标）'});
    if(!t2||!t2.length) return;
    p.flags.lijianUsed=true;
    await g.discardCards(p,res.cards,'离间');
    const fake = makeVirtual('决斗',[], 'lijian');
    g.log(`${g.nm(t1[0])} 与 ${g.nm(t2[0])} 展开决斗！`, true);
    FX.beam(UI.elOf(t1[0]),UI.elOf(t2[0]),'hostile');
    await CardEffect['决斗'](g,{user:t1[0], card:fake, target:t2[0], opt:{}});
  }},

biyue:{name:'闭月', event:'phaseStart',
  can:(g,p,c)=>c.player===p && c.phase==='end',
  async run(g,p){ await g.drawCards(p,1); }},

yaowu:{name:'耀武', event:'damaged', forced:true,
  can:(g,p,c)=>c.target===p && c.card && c.card.name==='杀' && isRed(c.card) && c.source && c.source.alive,
  async run(g,p,c){ g.log(`${g.sn('yaowu')}：${g.nm(c.source)} 摸一张牌。`); await g.drawCards(c.source,1); }},
};

/* 把展示名补进 SKILL_TEXT 缺失项 */
for(const id in SKILLS) if(!SKILL_TEXT[id]) SKILL_TEXT[id]=[SKILLS[id].name,''];
