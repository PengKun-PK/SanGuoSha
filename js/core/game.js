/* ================= 游戏引擎 ================= */

class Player {
  constructor(seat, gid, identity, isHuman){
    this.seat = seat;
    this.gid  = gid;
    this.g    = GENERALS[gid];
    this.name = this.g.name;
    this.kingdom = this.g.k;
    this.sex  = this.g.sex;
    this.identity = identity;
    this.isHuman = isHuman;
    this.maxHp = this.g.hp;
    this.hp    = this.maxHp;
    this.hand  = [];
    this.equips= {weapon:null,armor:null,horseMinus:null,horsePlus:null};
    this.judges= [];
    this.alive = true;
    this.skills= this.g.skills.slice();
    this.flags = {};            // 每回合重置
    this.marks = {};            // 持久标记
    this.idShown = identity==='zhu';
  }
  hasSkill(id){ return this.alive && this.skills.includes(id) &&
      (!SKILLS[id].lord || this.identity==='zhu'); }
  get handCount(){ return this.hand.length; }
  get cardCount(){ return this.hand.length + this.equipList().length + this.judges.length; }
  equipList(){ return Object.values(this.equips).filter(Boolean); }
  allCards(){ return [...this.hand, ...this.equipList(), ...this.judges]; }
  attackRange(){
    let r = this.equips.weapon ? this.equips.weapon.range : 1;
    if(this.flags.rangeBonus) r += this.flags.rangeBonus;
    return r;
  }
  hasJudge(name){ return this.judges.some(c=>c.name===name); }
  hpClass(){ return this.hp<=1?'hp-low' : (this.hp<=this.maxHp/2?'hp-warn':'hp-full'); }
}

let GAME_PLAYERS = 5;

class Game {
  constructor(opts){
    this.opts   = opts;
    this.count  = opts.count;
    GAME_PLAYERS= opts.count;
    this.deck   = buildDeck();
    this.discard= [];
    this.processing = [];     // 正在结算、尚未进入弃牌堆的实体牌
    this.players= [];
    this.turn   = 0;
    this.over   = false;
    this.curPlayer = null;
    this.phase  = '';
    this.logs   = [];
  }

  /* 绑定玩家（统一处理人数相关的初始化） */
  attach(players){
    this.players = players;
    this.count = players.length;
    GAME_PLAYERS = players.length;
    if(players.length > 4)
      for(const p of players) if(p.identity==='zhu'){ p.maxHp += 1; p.hp = p.maxHp; }
    return this;
  }

  /* ---------------- 基础 ---------------- */
  alivePlayers(){ return this.players.filter(p=>p.alive); }
  get human(){ return this.players.find(p=>p.isHuman); }
  lord(){ return this.players.find(p=>p.identity==='zhu'); }

  /* 以 p 为起点的座位顺序（含 p） */
  orderFrom(p, includeDead){
    const list = includeDead ? this.players : this.alivePlayers();
    const i = list.indexOf(p);
    if(i<0){
      // p 已阵亡，按座位号找最近的
      const all = list.slice().sort((a,b)=>a.seat-b.seat);
      const idx = all.findIndex(x=>x.seat>p.seat);
      const s = idx<0?0:idx;
      return all.slice(s).concat(all.slice(0,s));
    }
    return list.slice(i).concat(list.slice(0,i));
  }
  nextAlive(p){
    const o = this.orderFrom(p);
    if(!p.alive) return o[0]||p;
    return o.length>1 ? o[1] : p;
  }

  distance(a,b){
    if(a===b) return 0;
    const list = this.alivePlayers();
    const ia=list.indexOf(a), ib=list.indexOf(b), n=list.length;
    if(ia<0||ib<0) return 99;
    const raw = Math.abs(ia-ib);
    let d = Math.min(raw, n-raw);
    if(b.equips.horsePlus)  d += 1;
    if(a.equips.horseMinus) d -= 1;
    if(a.hasSkill('mashu')) d -= 1;
    return Math.max(1, d);
  }
  inAttackRange(a,b){ return a!==b && this.distance(a,b) <= a.attackRange(); }

  log(html, hl){
    const line = U.el('div','log-line'+(hl?' hl':''), html);
    U.$('logBody').appendChild(line);
    U.$('logBody').scrollTop = 1e9;
    this.logs.push(html);
  }
  logTurn(t){
    const line=U.el('div','log-turn', t);
    U.$('logBody').appendChild(line); U.$('logBody').scrollTop=1e9;
  }
  nm(p){ return `<span class="n">${p.name}</span>`; }
  cn(c){ return `<span class="c">${cardTxt(c)}</span>`; }
  sn(s){ return `<span class="s">${SKILL_TEXT[s]?SKILL_TEXT[s][0]:s}</span>`; }

  /* ---------------- 牌的流转 ---------------- */
  reshuffle(){
    if(this.discard.length===0){ return false; }
    this.deck = U.shuffle(this.discard.splice(0));
    this.log('牌堆已洗牌重置。');
    UI.updateDeck(this);
    return true;
  }
  popDeck(n){
    const out=[];
    for(let i=0;i<n;i++){
      if(!this.deck.length && !this.reshuffle()) break;
      out.push(this.deck.pop());
    }
    UI.updateDeck(this);
    return out;
  }
  async drawCards(p, n, silent){
    if(n<=0) return [];
    const cards = this.popDeck(n);
    p.hand.push(...cards);
    if(!silent) this.log(`${this.nm(p)} 摸了 ${cards.length} 张牌。`);
    await FX.drawTo(UI.elOf(p), cards.length);
    UI.refresh(this);
    return cards;
  }
  /* 从任意区域移除一张实体牌 */
  removeCard(owner, card){
    let i = owner.hand.indexOf(card);
    if(i>=0){ owner.hand.splice(i,1); return 'hand'; }
    for(const k in owner.equips) if(owner.equips[k]===card){ owner.equips[k]=null; return 'equip'; }
    i = owner.judges.indexOf(card);
    if(i>=0){ owner.judges.splice(i,1); return 'judge'; }
    return null;
  }
  ownerOf(card){
    for(const p of this.players){
      if(p.hand.includes(card)) return p;
      if(p.equipList().includes(card)) return p;
      if(p.judges.includes(card)) return p;
    }
    return null;
  }
  toDiscard(cards){
    for(const original of cards){
      if(original.virtual){const i=this.processing.indexOf(original);if(i>=0)this.processing.splice(i,1);this.toDiscard(realCards(original));continue;}
      const c=original;
      const i=this.processing.indexOf(c);
      if(i>=0) this.processing.splice(i,1);
      if(!this.discard.includes(c)) this.discard.push(c);
    }
    UI.setDiscardTop(cards[cards.length-1]);
  }
  /* 从结算区取回（奸雄/反馈等） */
  takeProcessing(cards){
    const got=[];
    for(const c of cards){
      const i=this.processing.indexOf(c);
      if(i>=0){ this.processing.splice(i,1); got.push(c); }
    }
    return got;
  }

  async gain(p, cards, fromPlayer, silent){
    if(!cards.length) return;
    const gained=[];
    for(const original of cards){
      if(original.virtual){
        if(fromPlayer)this.removeCard(fromPlayer,original);
        for(const c of realCards(original)){const j=this.processing.indexOf(c);if(j>=0)this.processing.splice(j,1);const d=this.discard.indexOf(c);if(d>=0)this.discard.splice(d,1);p.hand.push(c);gained.push(c);}
        continue;
      }
      const c=original;
      if(fromPlayer) this.removeCard(fromPlayer, c);
      else { const i=this.discard.indexOf(c); if(i>=0) this.discard.splice(i,1); }
      const j=this.processing.indexOf(c); if(j>=0) this.processing.splice(j,1);
      p.hand.push(c);gained.push(c);
    }
    if(!silent) this.log(`${this.nm(p)} 获得了 ${cards.length} 张牌。`);
    await FX.flyCard(p.isHuman?gained[0]:null,
      fromPlayer?UI.elOf(fromPlayer):U.$('discardPile'), UI.elOf(p));
    UI.refresh(this);
    if(fromPlayer) await this.checkHandLoss(fromPlayer);
  }

  async discardCards(p, cards, reason){
    if(!cards.length) return;
    for(const c of cards) this.removeCard(p,c);
    this.toDiscard(cards);
    this.log(`${this.nm(p)} 弃置了 ${cards.map(c=>this.cn(c)).join('、')}${reason?'（'+reason+'）':''}。`);
    for(const c of cards) FX.flyCard(c, UI.elOf(p), U.$('discardPile'), {dur:380});
    /* 在中央亮一下，否则只看得见手牌变少，不知道弃的是哪几张 */
    await FX.discardFlash(cards, {label:`${p.name} 弃置${reason?' · '+reason:''}`});
    UI.refresh(this);
    await this.checkHandLoss(p);
  }

  /* 连营：失去最后手牌 */
  async checkHandLoss(p){
    if(p.alive && p.hand.length===0 && p.hasSkill('lianying') && !p.flags._lyGuard){
      p.flags._lyGuard=true;
      if(await this.askSkill(p,'lianying',{})) await this.runSkill('lianying', p, {});
      p.flags._lyGuard=false;
    }
  }

  /* ---------------- 询问 ---------------- */
  async ask(p, req){
    if(!p.alive && req.kind!=='confirm') return null;
    // Every living seat gets the same counterspell window, even with no card.
    // Do not expose private availability or AI intent through skipped seats.
    if(req.wuxie){
      const delay=U.wait(900);
      const decision=Skills.canProvide(this,p,'无懈可击')
        ? (p.isHuman?UI.request(this,p,req):AI.decide(this,p,req)) : null;
      const [,answer]=await Promise.all([delay,decision]);
      return answer;
    }
    if(p.isHuman) return await UI.request(this, p, req);
    await U.wait(900);
    return await AI.decide(this, p, req);
  }

  /* 请求打出/使用一张指定名称的牌（可用转化技） */
  async askCard(p, name, req){
    const r = Object.assign({kind:'respond', need:name, cancelable:true}, req||{});
    return await this.ask(p, r);
  }

  /* ---------------- 技能触发 ---------------- */
  async trigger(event, ctx){
    const order = this.curPlayer ? this.orderFrom(this.curPlayer) : this.alivePlayers();
    for(const p of order){
      if(!p.alive) continue;
      for(const id of p.skills.slice()){
        const sk = SKILLS[id];
        if(!sk || !(Array.isArray(sk.event)?sk.event.includes(event):sk.event===event)) continue;
        if(sk.lord && p.identity!=='zhu') continue;
        if(!p.hasSkill(id)) continue;
        try{
          if(sk.can && !sk.can(this,p,ctx,event)) continue;
        }catch(e){ continue; }
        if(!sk.forced){
          const yes = await this.askSkill(p, id, ctx, event);
          if(!yes) continue;
        }
        await this.runSkill(id, p, ctx, event);
        if(ctx.cancelled&&['damageBefore','damageCaused','cardEffectBefore','shaTarget'].includes(event))return;
        if(this.over) return;
      }
    }
  }
  async askSkill(p, id, ctx, event){
    if(p.isHuman){
      const req = {kind:'confirm', skill:id, ctx,
        prompt:`是否发动 <b>${SKILL_TEXT[id][0]}</b>？<br><span style="font-size:11.5px;opacity:.8">${SKILL_TEXT[id][1]}</span>`};
      /* 判定相关技能：把已经翻开的判定牌摆进弹窗，先看牌面再决定是否改判 */
      if((event==='judgeCard'||event==='judgeDone') && ctx && ctx.card){
        const done = event==='judgeDone';
        const pass = done ? !!ctx.ok : (ctx.check ? !!ctx.check(ctx.card) : null);
        req.preview = [{card:ctx.card, label:`${ctx.player?ctx.player.name:''}的【${ctx.reason||'判定'}】判定牌`}];
        req.prompt += `<br><span style="font-size:12.5px">${done?'判定牌':'当前判定牌'} ${this.cn(ctx.card)}`
          + (pass===null?'':` —— ${done?'':'此时'}<b style="color:${pass?'#6ede8a':'#ef8f74'}">${pass?'生效':'不生效'}</b>`)
          + `</span>`;
      }
      return await UI.request(this,p,req);
    }
    await U.wait(900);
    return AI.wantSkill(this,p,id,ctx);
  }
  async runSkill(id, p, ctx, event){
    const sk=SKILLS[id];
    if(!p.alive || !sk?.run || (sk.active && (!p.hasSkill(id) || (sk.avail&&!sk.avail(this,p))))) return;
    this.log(`${this.nm(p)} 发动了 ${this.sn(id)}。`, true);
    await FX.banner(SKILL_TEXT[id][0], p.name);
    await sk.run(this,p,ctx,event);
    /* 改判技能换牌后，台面上亮着的那张判定牌要跟着换 */
    if(event==='judgeCard' && ctx && ctx.card) await FX.judgeSwap(ctx.card);
    UI.refresh(this);
  }

  /* ---------------- 判定 ---------------- */
  async judge(p, opt){
    /* opt: {reason, check(card)->bool, resultText(card,ok)} */
    const jd = { player:p, card:this.popDeck(1)[0], reason:opt.reason||'', check:opt.check||null };
    if(!jd.card) return {card:null, ok:false};
    jd.card._game=this;jd.card._judgedBy=p;
    this.processing.push(jd.card);
    this.log(`${this.nm(p)} 进行【${opt.reason||'判定'}】判定，亮出 ${this.cn(jd.card)}。`);
    /* 先翻开判定牌，再问鬼才/鬼道等改判技能：看见牌面之后才决定是否改判 */
    await FX.judgeReveal(jd.card, jd.reason);
    await this.trigger('judgeCard', jd);
    jd.card._game=this;jd.card._judgedBy=p;
    const ok = opt.check ? opt.check(jd.card) : true;
    await FX.judge(jd.card, ok, opt.resultText?opt.resultText(jd.card,ok):(ok?'成功':'失败'));
    this.log(`判定结果：${this.cn(jd.card)} —— ${ok?'<span style="color:#6ede8a">生效</span>':'<span style="color:#ef8f74">未生效</span>'}`);
    jd.ok = ok;
    /* 天妒 */
    await this.trigger('judgeDone', jd);
    if(this.processing.includes(jd.card) && !(opt.keep && ok)) this.toDiscard([jd.card]);
    UI.refresh(this);
    return {card:jd.card, ok};
  }

  /* ---------------- 体力 ---------------- */
  async damage(ctx){
    /* ctx:{source,target,n,nature,card} */
    const t = ctx.target;
    if(!t.alive || this.over) return;
    ctx.n = ctx.n||1;
    await this.trigger('damageBefore', ctx);
    if(ctx.cancelled || ctx.n<=0) return;
    /* 藤甲：火焰伤害+1 */
    const ignoreArmor=ctx.isSha&&!ctx.chain&&YJ.ignoreArmor(this,ctx.source,t);
    if(!ignoreArmor&&t.equips.armor?.name==='藤甲'&&ctx.nature==='fire') ctx.n++;
    if(!ignoreArmor&&t.equips.armor?.name==='白银狮子') ctx.n=Math.min(ctx.n,1);
    ctx.applied=true;
    ctx.sourceDistance=ctx.source?this.distance(ctx.source,t):99;
    t.hp -= ctx.n;
    if(ctx.source && ctx.source!==t) AI.observe(this, ctx.source, t, true);
    this.log(`${this.nm(t)} 受到 ${ctx.source?this.nm(ctx.source)+' 造成的 ':''}<b style="color:#ff7a5e">${ctx.n}点${ctx.nature==='fire'?'火焰':ctx.nature==='thunder'?'雷电':''}伤害</b>（剩余 ${Math.max(0,t.hp)}）。`, true);
    FX.damage(UI.elOf(t), ctx.n, ctx.nature);
    UI.refresh(this);
    await U.wait(520);
    // Record the damage before rescue can cause nested events; post-damage
    // skills only resolve after the dying/death procedure has finished.
    await this.trigger('damageApplied', ctx);
    if(t.hp<=0 && t.alive) await this.enterDying(t, ctx.source);
    if(this.over) return;
    await this.trigger('damageDone', ctx);
    if(!t.alive || this.over) return;
    await this.trigger('damaged', ctx);
    UI.refresh(this);
  }

  async loseHp(p, n, source=null){
    p.hp -= n;
    this.log(`${this.nm(p)} 失去 ${n} 点体力（剩余 ${Math.max(0,p.hp)}）。`);
    FX.loseHp(UI.elOf(p), n);
    UI.refresh(this);
    await U.wait(400);
    if(p.hp<=0 && p.alive) await this.enterDying(p, source);
  }

  async recover(p, n){
    const before = p.hp;
    p.hp = Math.min(p.maxHp, p.hp+n);
    const real = p.hp-before;
    if(real>0){
      this.log(`${this.nm(p)} 回复 ${real} 点体力（当前 ${p.hp}）。`);
      FX.heal(UI.elOf(p), real);
    }
    UI.refresh(this);
    await U.wait(360);
  }

  /* ---------------- 濒死 ---------------- */
  async enterDying(p, source){
    FX.dying(true);
    this.log(`<b style="color:#ff6a52">${p.name} 濒死！</b>`, true);
    await this.trigger('dying', {player:p, source});
    if(p.hp>0) { FX.dying(false); return; }
    for(const q of this.orderFrom(p)){
      while(p.hp<=0 && q.alive){
        const need = p.hp<=0 ? (p.maxHp>0?1:1) : 0;
        const card = await this.askSave(q, p);
        if(!card) break;
        await this.useCard(q, card, [p], {rescue:true});
      }
      if(p.hp>0) break;
    }
    FX.dying(false);
    if(p.hp<=0) await this.die(p, source);
  }
  async askSave(q, dying){
    /* q 是否愿意为 dying 出【桃】（自己可用【酒】） */
    const opts = Skills.saveOptions(this, q, dying);
    if(!opts.length) return null;
    return await this.ask(q, {kind:'respond', need:'桃', rescue:true, dying,
      prompt:`<b>${dying.name}</b> 濒死，是否使用【桃】${q===dying?'或【酒】':''}救援？`,
      cancelable:true});
  }

  async die(p, killer){
    p.alive=false; p.hp=0; p.idShown=true;
    this.log(`<b style="color:#e04b3c">${p.name}（${IDENTITY[p.identity].name}）阵亡！</b>`, true);
    FX.death(UI.elOf(p));
    FX.revealIdentity(UI.elOf(p), p.identity);
    UI.refresh(this);
    await U.wait(900);
    /* 弃置所有牌及武将牌上的实体牌 */
    const cards = p.allCards().concat(p.marks.fields||[],p.marks.buqu||[]);
    p.marks.fields=[];p.marks.buqu=[];
    if(cards.length){
      for(const c of cards) this.removeCard(p,c);
      this.toDiscard(cards);
    }
    UI.refresh(this);
    await this.trigger('die', {player:p, killer});
    /* 奖惩 */
    if(killer && killer.alive){
      if(p.identity==='fan'){
        this.log(`${this.nm(killer)} 击杀反贼，摸三张牌。`, true);
        await this.drawCards(killer,3);
      }else if(p.identity==='zhong' && killer.identity==='zhu'){
        this.log(`主公误杀忠臣，弃置所有手牌和装备牌。`, true);
        /* 惩罚只涉及手牌和装备区，判定区的牌保留 */
        const all = [...killer.hand, ...killer.equipList()];
        if(all.length) await this.discardCards(killer, all, '主公杀忠臣');
      }
    }
    this.checkWin();
  }

  checkWin(){
    if(this.over) return true;
    const alive=this.alivePlayers();
    const lord=this.lord();
    if(!lord.alive){
      const rest = alive;
      if(rest.length===1 && rest[0].identity==='nei') this.finish('nei');
      else this.finish('fan');
      return true;
    }
    if(!alive.some(p=>p.identity==='fan'||p.identity==='nei')){ this.finish('zhu'); return true; }
    return false;
  }
  finish(winner){
    this.over=true; this.winner=winner;
    setTimeout(()=>UI.showOver(this, winner), 1200);
  }

  /* ================= 使用牌 ================= */
  canUseSha(p){
    if(p.flags.shaUnlimited) return true;
    if(p.equips.weapon && p.equips.weapon.name==='诸葛连弩') return true;
    if(p.hasSkill('paoxiao')) return true;
    return (p.flags.shaUsed||0) < 1;
  }

  /* 合法目标判定 */
  canTarget(user, card, t, chosen){
    const info=CARD_INFO[card.name]; const tgt=info.tgt;
    if(!tgt || tgt.all) return false;
    if(!t.alive) return false;
    if(tgt.noDup && t.hasJudge(card.name)) return false;
    if(tgt.self==='only') return t===user;
    if(tgt.self==='no'   && t===user) return false;
    if(chosen && chosen.includes(t) && !card._multi) return false;
    if(tgt.need==='card'   && t.cardCount===0) return false;
    if(tgt.need==='weapon' && !t.equips.weapon) return false;
    if(tgt.noDup && t.hasJudge(card.name)) return false;
    /* 空城 */
    if(t.hasSkill('kongcheng') && t.hand.length===0 &&
       (card.name==='杀'||card.name==='决斗')) return false;
    /* 谦逊 */
    if(t.hasSkill('qianxun') && (card.name==='顺手牵羊'||card.name==='乐不思蜀')) return false;
    if(tgt.range && !this.inAttackRange(user,t)) return false;
    if(tgt.dist!=null && !user.hasSkill('qicai') && this.distance(user,t)>tgt.dist) return false;
    return true;
  }
  legalTargets(user, card, chosen){
    return this.alivePlayers().filter(t=>this.canTarget(user,card,t,chosen));
  }
  borrowVictims(holder){
    return holder?.alive&&holder.equips.weapon?this.alivePlayers().filter(q=>q!==holder&&this.inAttackRange(holder,q)):[];
  }
  /* 这张牌此刻能否使用（出牌阶段） */
  canUseInPlay(user, card){
    const info=CARD_INFO[card.name]; if(!info) return false;
    if(card.name==='杀' && !this.canUseSha(user)) return false;
    if(card.name==='酒'){
      if(user.flags.jiuUsed) return false;
      if(user.flags.jiuBuff) return false;
    }
    if(card.name==='桃' && user.hp>=user.maxHp) return false;
    if(card.name==='无懈可击' || card.name==='闪') return false;
    if(info.type==='equip') return true;
    if(info.tgt && info.tgt.all) return true;
    return this.legalTargets(user,card).length>0;
  }

  async useCard(user, card, targets, opt={}){
    opt = opt||{};
    if(card.name==='杀'&&!card.nature&&user.equips.weapon?.name==='朱雀羽扇'){
      const yes=await this.ask(user,{kind:'confirm',tag:'zhuque',card,targets,prompt:'【朱雀羽扇】：是否将此普通杀改为火杀？'});
      if(yes){
        // A temporary use wrapper keeps the physical card unchanged after resolution.
        card={...card,nature:'fire',virtual:true,sub:realCards(card)};
      }
    }
    if(card.name==='杀'){ opt={...opt,drank:!!user.flags.jiuBuff}; user.flags.jiuBuff=false; }
    const info = CARD_INFO[card.name];
    const reals = realCards(card);
    if(card.type==='delay'&&card.virtual&&reals.length===1){const physical=reals[0];card._physical=physical;}

    /* 离开原区域 */
    for(const c of reals) this.removeCard(user, c);
    this.processing.push(...reals.filter(c=>!this.processing.includes(c)));
    await this.flushLoss();
    UI.refresh(this);

    /* 展示 */
    if(card.virtual)
      this.log(`${this.nm(user)} 将 ${reals.map(c=>this.cn(c)).join('、')} 当作 ${this.cn(card)} 使用${targets&&targets.length?'，目标：'+targets.map(t=>this.nm(t)).join('、'):''}。`, true);
    else
      this.log(`${this.nm(user)} 使用 ${this.cn(card)}${targets&&targets.length?'，目标：'+targets.map(t=>this.nm(t)).join('、'):''}。`, true);

    await UI.showPlay(this, user, card, targets, {extra:opt.extra});

    /* AI 阵营推理：记录这次行动 */
    if(targets && targets.length){
      const friendly = ['桃','桃园结义','五谷丰登','无中生有'].includes(card.name);
      for(const t of targets) if(t!==user) AI.observe(this, user, t, !friendly);
    }
    if(opt.extra) AI.observe(this, user, opt.extra, true);

    /* 指向线由展示层按本次用牌统一绘制，避免逐目标覆盖或响应反向。 */

    /* 使用次数统计 */
    if(card.name==='杀' && !opt.rescue && this.phase==='play' && user===this.curPlayer){
      user.flags.shaUsed = (user.flags.shaUsed||0)+1;
      user.flags.usedShaThisTurn = true;
    }
    if(card.name==='酒') user.flags.jiuUsed = true;

    if(info.tgt?.all)targets=this.orderFrom(user).filter(p=>info.tgt.all!=='others'||p!==user).filter(t=>!(t.hasSkill('weimu')&&isBlack(card))&&!(card.name==='南蛮入侵'&&(t.hasSkill('huoshou')||t.hasSkill('juxiang'))));
    await this.trigger('useCard', {player:user, card, targets});

    /* --- 分类结算 --- */
    if(info.type==='equip'){
      await this.installEquip(user, card);
    }else if(info.type==='delay'){
      const t = targets[0];
      t.judges.push(card);
      this.takeProcessing(reals);
      this.log(`${this.cn(card)} 置于 ${this.nm(t)} 的判定区。`);
      UI.refresh(this);
      await U.wait(320);
    }else{
      let list = targets ? targets.slice() : [];
      if(info.tgt && info.tgt.all){
        FX.aoe();
      }
      const eff = CardEffect[card.name];
      if(info.tgt && info.tgt.all && CardEffectAll[card.name]){
        // Each target finishes its counterspell chain and effect before the
        // next target begins. Shared effects such as Harvest keep one pool.
        await CardEffectAll[card.name](this, {user, card, targets:list, opt});
      }else if(eff){
        for(const t of list){
          if(!t.alive || this.over) continue;
          if(info.type==='trick' && await this.askWuxie(card,t,user)) continue;
          await eff(this, {user, card, target:t, opt});
          if(this.over) break;
        }
      }
    }

    await this.trigger('cardFinished',{player:user,card,targets});
    /* 收尾：仍在结算区的牌进弃牌堆 */
    const rest = reals.filter(c=>this.processing.includes(c));
    if(rest.length) this.toDiscard(rest);
    UI.clearPlay();
    UI.refresh(this);
    if(!this.over) await this.checkHandLoss(user);
  }

  async installEquip(p, card){
    const slot = card.slot;
    const old = p.equips[slot];
    if(old) this.removeCard(p,old);
    p.equips[slot] = card;
    const i=this.processing.indexOf(card); if(i>=0) this.processing.splice(i,1);
    this.log(`${this.nm(p)} 装备了 ${this.cn(card)}。`);
    if(old){ this.toDiscard([old]); this.log(`${this.nm(p)} 的 ${this.cn(old)} 被替换并弃置。`); }
    UI.refresh(this);
    await U.wait(320);
  }

  /* ---------------- 无懈可击 ---------------- */
  async askWuxie(card, target, user, timing){
    if(CARD_INFO[card.name].type!=='trick' && CARD_INFO[card.name].type!=='delay') return false;
    if(card.name==='无懈可击') return false;
    if(CARD_INFO[card.name].type==='delay'){
      if(timing!=='judgment'||this.phase!=='judge'||this.curPlayer!==target)return false;
      user=target; // Every counterspell round starts at the judging character.
    }
    let negated=false, level=0;
    while(!this.over && target.alive){
      let played=null, player=null;
      for(const p of this.orderFrom(user)){
        if(this.over||!target.alive)return negated;
        if(!p.alive) continue;
        const c = await this.ask(p,{kind:'respond', need:'无懈可击', cancelable:true,
          wuxie:{card, target, user, negated, level},
          prompt: level===0
            ? CARD_INFO[card.name].type==='delay'
              ? `<b>${target.name}</b> 的【${card.name}】即将判定，是否使用【无懈可击】？`
              : `${user.name} 对 <b>${target.name}</b> 使用了【${card.name}】，是否使用【无懈可击】？`
            : `是否使用【无懈可击】抵消上一张【无懈可击】？`});
        if(c){ played=c; player=p; break; }
      }
      if(!played) break;
      await this.useCard(player, played, null, {wuxie:true});
      negated = !negated; level++;
      this.log(negated?`【${card.name}】对 ${this.nm(target)} 的效果被抵消。`:`抵消被无效，【${card.name}】继续生效。`, true);
    }
    return negated;
  }

  /* ---------------- 响应请求：要求某人打出一张牌 ---------------- */
  async requireCard(p, name, ctx){
    ctx = ctx||{};
    /* 八卦阵：需要【闪】时可先判定 */
    if(name==='闪' && p.alive && ((p.equips.armor && p.equips.armor.name==='八卦阵') || (!p.equips.armor && p.hasSkill('bazhen')))){
      const ignored = ctx.from && YJ.ignoreArmor(this,ctx.from,p);
      if(!ignored){
        const yes = await this.ask(p,{kind:'confirm', bagua:true,
          prompt:'是否发动 <b>八卦阵</b> 进行判定？（红色则视为打出【闪】）'});
        if(yes){
          this.log(`${this.nm(p)} 发动了【八卦阵】。`);
          await FX.banner('八卦阵', p.name);
          const r = await this.judge(p,{reason:'八卦阵', check:x=>isRed(x),
            resultText:(x,ok)=>ok?'红色 · 视为【闪】':'黑色 · 失败'});
          if(r.ok){ const c=makeVirtual('闪', [], 'bagua'); FX.dodge(UI.elOf(p)); await this.trigger('useCard',{player:p,card:c,responded:true}); return c; }
        }
      }
    }
    const c = await this.ask(p, {kind:'respond', need:name, cancelable:true,
      prompt: ctx&&ctx.prompt || `请打出一张【${name}】`, ...(ctx||{})});
    if(c){
      if(!c._guhuoChecked && !await EX.guhuo(this,p,c)) return null; c._guhuoChecked=true;
      if(c.name==='杀'&&this.curPlayer===p&&this.phase==='play')p.flags.usedShaThisTurn=true;
      const reals=realCards(c);
      for(const r of reals) this.removeCard(p,r);
      this.processing.push(...reals.filter(c=>!this.processing.includes(c)));
      if(c.virtual) this.log(`${this.nm(p)} 将 ${reals.map(x=>this.cn(x)).join('、')} 当作 ${this.cn(c)} 打出。`);
      else this.log(`${this.nm(p)} 打出 ${this.cn(c)}。`);
      await UI.showPlay(this,p,c,ctx.from?[ctx.from]:ctx.vs?[ctx.vs]:ctx.forWho?[ctx.forWho]:null,{responded:true});
      await this.trigger('useCard', {player:p, card:c, targets:null, responded:true});
      const rest=reals.filter(x=>this.processing.includes(x));
      if(rest.length && !ctx.keepForCaller) this.toDiscard(rest);
      UI.clearPlay(); UI.refresh(this);
      await this.checkHandLoss(p);
    }
    return c;
  }

  /* ================= 回合流程 ================= */
  async run(){
    UI.build(this);
    this.log('游戏开始，主公为 '+this.nm(this.lord())+'。', true);
    /* 发牌 */
    for(const p of this.orderFrom(this.lord())){
      p.hand.push(...this.popDeck(4));
    }
    UI.refresh(this);
    await FX.turnBanner('游戏开始','三 国 杀');
    for(const p of this.players)if(p.hasSkill('huashen')&&!p.marks.forms){await EX.getForms(this,p,2);await EX.transform(this,p);}
    let cur = this.lord();
    while(!this.over){
      this.turn++;
      await this.playerTurn(cur);
      if(this.over) break;
      cur = this.nextAlive(cur);
      if(this.turn>400){ this.finish('draw'); break; }
    }
  }

  async playerTurn(p){
    if(!p.alive) return;
    this.curPlayer = p;
    for(const q of this.players) q.flags={};
    UI.refresh(this);
    this.logTurn(`—— 第 ${this.turn} 回合 · ${p.name} ——`);
    await FX.turnBanner(p.name, p.isHuman?'你的回合':'回合开始');

    for(const ph of ['start','judge','draw','play','discard','end']){
      if(this.over || !p.alive) break;
      this.phase = ph;
      UI.refresh(this);
      await FX.phaseBanner(ph, p.name, {judges:p.judges.length});
      if(this.over || !p.alive) break;
      await this.runPhase(p, ph);
    }
    this.phase='';
  }

  async runPhase(p, ph){
    if(ph==='start'){
      await this.trigger('phaseStart', {player:p, phase:'start'});
      return;
    }
    if(ph==='judge'){
      while(p.judges.length && p.alive && !this.over){
        const card = p.judges[p.judges.length-1];
        p.judges.pop();
        this.processing.push(card);
        await this.resolveDelay(p, card);
        if(this.processing.includes(card)) this.toDiscard([card]);
        UI.refresh(this);
      }
      return;
    }
    if(ph==='draw'){
      if(p.flags.skipDraw){ this.log(`${this.nm(p)} 跳过摸牌阶段。`); return; }
      const ctx={player:p, n:2};
      await this.trigger('drawNum', ctx);
      if(ctx.skip) return;
      if(ctx.n>0) await this.drawCards(p, ctx.n);
      return;
    }
    if(ph==='play'){
      if(p.flags.skipPlay){ this.log(`${this.nm(p)} 跳过出牌阶段。`); return; }
      await this.trigger('playBefore',{player:p,phase:'play'});
      await this.playPhase(p);
      return;
    }
    if(ph==='discard'){
      await this.trigger('phaseStart', {player:p, phase:'discard'});
      if(p.flags.skipDiscard){ this.log(`${this.nm(p)} 跳过弃牌阶段。`); return; }
      const limit = Math.max(0,this.handLimit(p));
      let over = p.hand.length - limit;
      if(over>0){
        this.log(`${this.nm(p)} 手牌上限 ${limit}，需弃置 ${over} 张。`);
        const cards = await this.ask(p,{kind:'discard', n:over,
          prompt:`请弃置 <b>${over}</b> 张手牌（手牌上限 ${limit}）`});
        await this.discardCards(p, cards||p.hand.slice(0,over), '超出手牌上限');
      }
      return;
    }
    if(ph==='end'){
      await this.trigger('phaseStart', {player:p, phase:'end'});
      return;
    }
  }

  async resolveDelay(p, card){
    // Counter delayed tricks immediately before revealing the judgment card.
    // Placement into the judgment area is not a counterspell window.
    if(this.phase!=='judge'||this.curPlayer!==p||!p.alive||this.over)return;
    this.log(`${this.nm(p)} 开始结算判定区的 ${this.cn(card)}。`);
    if(UI.showJudgePending)await UI.showJudgePending(this,p,card);
    if(await this.askWuxie(card,p,p,'judgment')){
      if(card.name==='闪电')this.passLightning(p,card);
      return;
    }
    if(!p.alive||this.over)return;
    if(card.name==='闪电'){
      const r = await this.judge(p,{reason:'闪电',
        check:c=>c.suit==='spade' && c.num>=2 && c.num<=9,
        resultText:(c,ok)=>ok?'雷击！':'安然无恙'});
      if(r.ok){
        this.toDiscard([card]);
        await this.damage({source:null,target:p,n:3,nature:'thunder',card});
      }else{
        this.passLightning(p,card);
      }
      return;
    }
    if(card.name==='乐不思蜀'){
      const r = await this.judge(p,{reason:'乐不思蜀', check:c=>c.suit==='heart',
        resultText:(c,ok)=>ok?'逃脱':'跳过出牌阶段'});
      if(!r.ok) p.flags.skipPlay=true;
      return;
    }
    if(card.name==='兵粮寸断'){
      const r = await this.judge(p,{reason:'兵粮寸断', check:c=>c.suit==='club',
        resultText:(c,ok)=>ok?'逃脱':'跳过摸牌阶段'});
      if(!r.ok) p.flags.skipDraw=true;
      return;
    }
  }

  passLightning(p,card){
    const nx=this.orderFrom(p).find(q=>q!==p&&q.alive&&!q.hasJudge('闪电')&&!(q.hasSkill('weimu')&&isBlack(card)));
    if(!nx)return;
    this.takeProcessing([card]);
    nx.judges.push(card);
    this.log(`${this.cn(card)} 移动到 ${this.nm(nx)} 的判定区。`);
  }

  /* ---------------- 出牌阶段 ---------------- */
  async playPhase(p){
    /* 非法出牌时人类分支是重新询问；加个上限兜底，避免请求源一直返回同一个
       非法动作时整局卡死（真人永远到不了这个次数）。 */
    let rejected=0;
    while(p.alive && !this.over){
      const beforeAction=this.actionSignature(p);
      const act = p.isHuman
        ? await UI.request(this,p,{kind:'play'})
        : (await U.wait(this.opts.aiThink||280), await AI.playTurn(this,p));
      if(!act || act.type==='end') break;
      if(act.type==='use'){
        if(!this.validPlay(p,act)) { if(!p.isHuman || ++rejected>50) break; continue; }
        await this.useCard(p, act.card, act.targets||[], act.opt||{});
      }else if(act.type==='skill'){
        await this.runSkill(act.skill, p, act.ctx||{});
      }
      UI.refresh(this);
      if(!p.isHuman && beforeAction===this.actionSignature(p)) break;
    }
  }
}

/* ================= 卡牌效果 ================= */
const CardEffect = {
  async '杀'(g, ctx0){
    const {user, card, opt} = ctx0;
    /* 指定目标后：铁骑 / 流离 等 */
    const stx = {user, target:ctx0.target, card, transferTo:null};
    await g.trigger('shaTarget', stx);
    if(stx.cancelled) return;
    if(stx.transferTo && stx.transferTo.alive){
      FX.beam(UI.elOf(user), UI.elOf(stx.transferTo), 'hostile');
      return await CardEffect['杀'](g, {user, card, target:stx.transferTo, opt});
    }
    const target = stx.target;
    if(!target.alive || g.over) return;
    FX.slash(UI.elOf(target));
    await U.wait(300);
    /* 仁王盾 */
    if(target.equips.armor && target.equips.armor.name==='仁王盾' && isBlack(card)
       && !YJ.ignoreArmor(g,user,target)){
      g.log(`${g.nm(target)} 的【仁王盾】使黑色【杀】无效。`);
      await U.wait(300); return;
    }
    if(target.equips.armor && target.equips.armor.name==='藤甲' && !card.nature
       && !YJ.ignoreArmor(g,user,target)){
      g.log(`${g.nm(target)} 的【藤甲】使普通【杀】无效。`);
      await U.wait(300); return;
    }
    /* 雌雄双股剑 */
    if(user.equips.weapon && user.equips.weapon.name==='雌雄双股剑' && user.sex!==target.sex){
      const ch = await g.ask(target,{kind:'choose', options:['弃置一张手牌','令对方摸一张牌'],
        prompt:`${user.name} 的【雌雄双股剑】：请选择`});
      if(ch==='弃置一张手牌' && target.hand.length){
        const cs = await g.ask(target,{kind:'discard',n:1,prompt:'雌雄双股剑：弃置一张手牌'});
        await g.discardCards(target, cs||[target.hand[0]], '雌雄双股剑');
      }else await g.drawCards(user,1);
    }
    /* 铁骑 / 无双：需要的闪数量 */
    let need = 1;
    if(user.hasSkill('wushuang') || (user.hasSkill('roulin')&&target.sex==='f') || (target.hasSkill('roulin')&&user.sex==='f')){ need=2; }
    if(opt.noDodge || target.flags['noDodge_'+card.uid]) need=0;

    let dodged=false;
    if(need>0){
      let cnt=0;
      while(cnt<need){
        const c = await g.requireCard(target,'闪',{
          prompt:`<b>${user.name}</b> 对你使用【杀】${need>1?`（无双：需要第 ${cnt+1} 张【闪】）`:''}`,
          from:user, sha:card});
        if(!c) break;
        cnt++;
      }
      dodged = cnt>=need;
    }
    if(dodged){
      await g.trigger('shaDodged',{user,target,card});
      FX.dodge(UI.elOf(target));
      g.log(`${g.nm(target)} 闪避了这张【杀】。`);
      await U.wait(340);
      /* 青龙偃月刀 */
      if(user.equips.weapon && user.equips.weapon.name==='青龙偃月刀' && user.alive){
        const again = await g.ask(user,{kind:'respond', need:'杀', cancelable:true,
          prompt:`【青龙偃月刀】：是否对 <b>${target.name}</b> 继续使用一张【杀】？`});
        if(again){ await g.useCard(user, again, [target], {rescue:true}); return; }
      }
      /* 贯石斧 */
      if(user.equips.weapon && user.equips.weapon.name==='贯石斧' && user.hand.length+user.equipList().filter(c=>c!==user.equips.weapon).length>=2){
        const yes = await g.ask(user,{kind:'confirm',
          prompt:`【贯石斧】：是否弃置两张牌令此【杀】依然造成伤害？`});
        if(yes){
          const cs = await g.ask(user,{kind:'select',min:2,max:2,area:'any',cardFilter:c=>c!==user.equips.weapon,prompt:'贯石斧：弃置两张牌（不能弃置贯石斧）'});
          if(cs?.cards?.length===2){
            await g.discardCards(user,cs.cards,'贯石斧');
            dodged=false;
          }
        }
      }
      if(dodged) return;
    }
    let n = 1;
    if(user.flags.luoyiBuff) n++;
    if(opt.drank){ n++; g.log(`【酒】使这张【杀】伤害+1。`); }
    if(user.equips.weapon?.name==='古锭刀'&&!target.hand.length){n++;g.log('【古锭刀】使对无手牌目标的伤害+1。');}
    const dctx = {source:user, target, n, nature:card.nature||null, card, isSha:true};
    /* 寒冰剑 */
    if(user.equips.weapon && user.equips.weapon.name==='寒冰剑' && target.cardCount>=1){
      const yes = await g.ask(user,{kind:'confirm', prompt:`【寒冰剑】：防止伤害，改为弃置 ${target.name} 两张牌？`});
      if(yes){
        for(let i=0;i<2;i++){
          if(!target.cardCount) break;
          const c = await g.ask(user,{kind:'pickArea', target, prompt:`寒冰剑：弃置 ${target.name} 的一张牌`});
          if(c) await g.discardCards(target,[c],'寒冰剑');
        }
        return;
      }
    }
    await g.damage(dctx);
    /* 麒麟弓 */
    if(user.equips.weapon && user.equips.weapon.name==='麒麟弓' && target.alive &&
       (target.equips.horseMinus||target.equips.horsePlus)){
      const yes = await g.ask(user,{kind:'confirm', prompt:`【麒麟弓】：是否弃置 ${target.name} 的一匹坐骑？`});
      if(yes){
        /* 两匹坐骑都在时由使用者选择弃置哪一匹，不能默认弃 −1 马 */
        const horses=[target.equips.horseMinus,target.equips.horsePlus].filter(Boolean);
        const h = horses.length>1
          ? (await g.ask(user,{kind:'pickFrom', cards:horses,
              prompt:`【麒麟弓】：选择弃置 ${target.name} 的一匹坐骑`}) || horses[0])
          : horses[0];
        if(h) await g.discardCards(target,[h],'麒麟弓');
      }
    }
  },

  async '桃'(g,{user,target}){
    let n=1;
    if(target.hasSkill('jiuyuan') && target.identity==='zhu' && user!==target && user.kingdom==='wu'){
      n=2; g.log(`${g.nm(target)} 的 ${g.sn('jiuyuan')} 使回复+1。`);
    }
    await g.recover(target,n);
  },

  async '酒'(g,{user,target,opt}){
    if(opt.rescue || user.hp<=0){ await g.recover(user,1); }
    else { user.flags.jiuBuff=true; g.log(`${g.nm(user)} 进入醉酒状态，下一张【杀】伤害+1。`); }
  },

  async '无中生有'(g,{target}){ await g.drawCards(target,2); },

  async '过河拆桥'(g,{user,target}){
    if(!target.cardCount) return;
    const c = await g.ask(user,{kind:'pickArea', target, prompt:`【过河拆桥】：弃置 ${target.name} 的一张牌`});
    if(c) await g.discardCards(target,[c],'过河拆桥');
  },

  async '顺手牵羊'(g,{user,target}){
    if(!target.cardCount) return;
    const c = await g.ask(user,{kind:'pickArea', target, prompt:`【顺手牵羊】：获得 ${target.name} 的一张牌`});
    if(c) await g.gain(user,[c],target);
  },

  async '决斗'(g,{user,card,target}){
    let a=target, b=user;   // a 先出杀
    const needOf = pl => (pl===user ? target : user).hasSkill('wushuang') ? 2 : 1;
    while(true){
      let cnt=0; const need=needOf(a);
      while(cnt<need){
        const c = await g.requireCard(a,'杀',{prompt:`【决斗】：请打出【杀】${need>1?`（无双 ${cnt+1}/2）`:''}`, duel:true, vs:b});
        if(!c) break;
        cnt++;
      }
      if(cnt<need){
        let n=1;
        if(b.flags.luoyiBuff && b===user) n++;
        await g.damage({source:b,target:a,n,card});
        return;
      }
      [a,b]=[b,a];
    }
  },

  async '借刀杀人'(g,{user,card,target,opt}){
    const victim = opt.extra;
    if(!target.equips.weapon) return;
    if(!g.borrowVictims(target).includes(victim)){
      g.log(`【借刀杀人】没有合法目标，无事发生。`); return;
    }
    const c = await g.ask(target,{kind:'respond', need:'杀', cancelable:true,
      prompt:`【借刀杀人】：是否对 <b>${victim.name}</b> 使用【杀】？否则武器归 ${user.name}`});
    if(c){ await g.useCard(target, c, [victim], {rescue:true}); }
    else { g.log(`${g.nm(target)} 拒绝出杀，武器被 ${g.nm(user)} 获得。`);
           await g.gain(user,[target.equips.weapon],target); }
  },

  async '乐不思蜀'(){}, async '闪电'(){}, async '兵粮寸断'(){},
};

const CardEffectAll = {
  async '南蛮入侵'(g,{user,card,targets}){
    for(const t of g.orderFrom(user).filter(x=>targets.includes(x))){
      if(!t.alive||g.over) continue;
      if(await g.askWuxie(card,t,user))continue;
      if(!await YJ.effect(g,{user,card,target:t}))continue;
      if(!t.alive||g.over)continue;
      if(t.equips.armor && t.equips.armor.name==='藤甲'){
        g.log(`${g.nm(t)} 的【藤甲】使【南蛮入侵】无效。`); continue;
      }
      const c = await g.requireCard(t,'杀',{from:user,prompt:`【南蛮入侵】：请打出一张【杀】，否则受到1点伤害`});
      if(!c) await g.damage({source:user,target:t,n:1,card});
    }
  },
  async '万箭齐发'(g,{user,card,targets}){
    for(const t of g.orderFrom(user).filter(x=>targets.includes(x))){
      if(!t.alive||g.over) continue;
      if(await g.askWuxie(card,t,user))continue;
      if(!await YJ.effect(g,{user,card,target:t}))continue;
      if(!t.alive||g.over)continue;
      if(t.equips.armor && t.equips.armor.name==='藤甲'){
        g.log(`${g.nm(t)} 的【藤甲】使【万箭齐发】无效。`); continue;
      }
      const c = await g.requireCard(t,'闪',{from:user,prompt:`【万箭齐发】：请打出一张【闪】，否则受到1点伤害`});
      if(!c) await g.damage({source:user,target:t,n:1,card});
    }
  },
  async '桃园结义'(g,{user,card,targets}){
    for(const t of g.orderFrom(user).filter(x=>targets.includes(x))){
      if(g.over)break;
      if(!t.alive)continue;
      if(await g.askWuxie(card,t,user))continue;
      if(!await YJ.effect(g,{user,card,target:t}))continue;
      if(t.alive&&!g.over&&t.hp<t.maxHp)await g.recover(t,1);
    }
  },
  async '五谷丰登'(g,{user,card,targets}){
    const pool = g.popDeck(targets.length);
    g.log(`【五谷丰登】亮出：${pool.map(c=>g.cn(c)).join('、')}`);
    UI.showPool(pool);
    for(const t of g.orderFrom(user).filter(x=>targets.includes(x))){
      if(!pool.length||g.over) break;
      if(!t.alive) continue;
      if(await g.askWuxie(card,t,user))continue;
      if(!await YJ.effect(g,{user,card,target:t}))continue;
      if(!t.alive||g.over)continue;
      // A counterspell's presentation may clear the central pool display.
      UI.showPool(pool);
      const c = await g.ask(t,{kind:'pickFrom', cards:pool, prompt:`【五谷丰登】：${t.name} 选取一张牌`});
      const got = c || pool[0];
      pool.splice(pool.indexOf(got),1);
      t.hand.push(got);
      g.log(`${g.nm(t)} 选择了 ${g.cn(got)}。`);
      UI.showPool(pool); UI.refresh(g);
      await U.wait(260);
    }
    if(pool.length) g.toDiscard(pool);
    UI.showPool(null);
  },
};
