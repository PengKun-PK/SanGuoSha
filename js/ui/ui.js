/* ================= 界面与交互 ================= */
const UI = (()=>{

let G = null;            // 当前对局
let P = null;            // 当前待处理的玩家请求
const seatEls = new Map();
let selfCardEl = null;

/* ---------------- 元素构造 ---------------- */
/* 长武将名（颜良文丑、卧龙诸葛亮）要让出右下角的手牌数位置 */
const nameLenCls = name => name.length>=5 ? ' n5' : (name.length===4 ? ' n4' : '');

function cardEl(card, extra){
  const name=cardName(card);
  const info = CARD_INFO[name] || {ct:'basic',tag:''};
  const d = U.el('div','card t-'+info.ct+(extra?' '+extra:''));
  const sc = SUIT[card.suit];
  const n = name.length;
  const lenCls = n>=5 ? ' n5' : (n===4 ? ' n4' : (n===3 ? ' n3' : ''));
  const badge = sc ? `<div class="cf-badge ${sc.color}">
      <span class="cf-num">${NUM_TXT[card.num]||''}</span>
      <span class="cf-suit">${sc.sym}</span></div>` : '';
  d.innerHTML = `
    <div class="cf-art">${Art.cardArt(name)}</div>
    <div class="cf-shade"></div>
    ${badge}
    <div class="cf-tag">${info.tag||''}</div>
    <div class="cf-banner${lenCls}">${name}</div>
    <div class="cf-desc">${info.short||info.desc||''}</div>`;
  d.title = [name, info.desc,card.pack?`${card.pack}篇`:''].filter(Boolean).join(String.fromCharCode(10));
  if(card.nature) d.classList.add('nature-'+card.nature);
  if(card.virtual) d.classList.add('is-virtual');
  Art.bindImage(d.querySelector('.cf-art'),'cards',name);
  d._card = card;
  return d;
}

function generalCardEl(p){
  const d = U.el('div','gcard k-'+p.kingdom);
  d.innerHTML = `
    <div class="gc-portrait">${Art.portrait(p.gid)}</div>
    <div class="gc-shade"></div>
    <div class="gc-kingdom">${KINGDOM_NAME[p.kingdom]}</div>
    <div class="gc-name${nameLenCls(p.name)}">${p.name}</div>
    <div class="gc-hp"></div>
    <div class="gc-skills"></div>`;
  Art.bindImage(d.querySelector('.gc-portrait'),'generals',p.gid);
  return d;
}

function hpBeads(container, p, base){
  /* 注意：必须保留原有的定位用类名（gc-hp / s-hp），
     否则后续的 querySelector 会找不到这个节点 */
  const cls = (base||'gc-hp')+' '+p.hpClass();
  if(container.className!==cls) container.className = cls;
  if(container._hpSig === p.hp+'/'+p.maxHp) return;
  container._hpSig = p.hp+'/'+p.maxHp;
  container.innerHTML='';
  const show = Math.max(p.maxHp, p.hp);
  for(let i=0;i<show;i++){
    const b=U.el('div','hp-bead'+(i<p.hp?'':' empty'));
    container.appendChild(b);
  }
}

function seatEl(p){
  const d = U.el('div','seat k-'+p.kingdom);
  d.innerHTML = `
    <div class="s-mark"></div>
    <div class="seat-box">
      <div class="s-portrait">${Art.portrait(p.gid)}</div>
      <div class="s-shade"></div>
      <div class="s-kingdom">${KINGDOM_NAME[p.kingdom]}</div>
      <div class="s-id"></div>
      <div class="s-hp"></div>
      <div class="s-skills"></div>
      <div class="s-name${nameLenCls(p.name)}">${p.name}</div>
      <div class="s-hand">0</div>
    </div>
    <div class="s-equips"></div>
    <div class="judge-chips"></div>`;
  Art.bindImage(d.querySelector('.s-portrait'),'generals',p.gid);
  d.onclick = ()=>onSeatClick(p);
  return d;
}

/* ---------------- 布局 ---------------- */
function build(g){
  G = g; seatEls.clear();
  const area = U.$('seatsArea'); area.innerHTML='';
  const human = g.human;
  const others = g.orderFrom(human).slice(1);   // 下家 → 上家
  const k = others.length;
  const AW = area.clientWidth || 1000, AH = area.clientHeight || 640;
  // Keep actual font sizes: use an upper row and two lower wings instead of
  // shrinking the entire portrait, equipment and text in eight-player games.
  const topCount = k > 3 ? k-2 : k;
  const seatWidth = Math.min(SEAT_MAX_W, (AW-32)/Math.max(topCount, 1)-12);
  setSeatWidth(area, seatWidth);
  const pos = others.map((p,i)=>{
    const wing = k>3 && (i===0 || i===k-1);
    if(wing) return {x:i===0?AW-seatWidth/2-16:seatWidth/2+16,y:Math.max(220,AH-190)};
    const j=k>3?i-1:i;
    return {x:AW-(j+.5)*AW/topCount,y:32};
  });
  others.forEach((p,i)=>{
    const el = seatEl(p);
    el.style.left = (pos[i].x/AW*100)+'%';
    el.style.top  = (pos[i].y/AH*100)+'%';
    area.appendChild(el);
    seatEls.set(p, el);
  });

  const sg = U.$('selfGeneral'); sg.innerHTML='';
  selfCardEl = generalCardEl(human);
  selfCardEl.onclick = ()=>onSeatClick(human);
  sg.appendChild(selfCardEl);
  const side = U.el('div','self-side');
  side.innerHTML = `<div class="self-id s-id ${IDENTITY[human.identity].cls}">${IDENTITY[human.identity].name}</div>
    <div class="s-equips"></div><div class="judge-chips"></div>`;
  sg.appendChild(side);

  U.$('btnOk').onclick     = ()=>onOk();
  U.$('btnCancel').onclick = ()=>onCancel();
  U.$('btnEnd').onclick    = ()=>onEnd();
  refresh(g);
}

/* 立绘图集的单元格接近正方形，座位框保持同样的比例，整幅立绘才不会被裁掉。
   --seat-width 同时写到 :root，让不在 #seatsArea 内的自己武将牌也能用。 */
const SEAT_MAX_W = 176;
function setSeatWidth(area, w){
  area.style.setProperty('--seat-width', w+'px');
  document.documentElement.style.setProperty('--seat-width', w+'px');
}
function layoutSeats(){
  if(!G||!seatEls.size)return;
  const area=U.$('seatsArea'),bounds=area.getBoundingClientRect();
  if(!bounds.width||!bounds.height)return;
  const others=[...seatEls.keys()],k=others.length,topCount=k>3?k-2:k;
  // Reserve three vertical bands (upper seats, wings, own general), including
  // equipment and judgement rows. Previously the wings were pushed into self.
  const judgeHeight=Math.max(0,...[...seatEls.values(),U.$('selfGeneral')].map(el=>el.querySelector('.judge-chips')?.offsetHeight||0));
  const heightBudget=(innerHeight-bounds.top-32-12-48-3*(48+judgeHeight))/3;
  const width=Math.max(96,Math.min(SEAT_MAX_W,(bounds.width-32)/Math.max(topCount,1)-12,k>3?heightBudget:SEAT_MAX_W));
  setSeatWidth(area, width);
  U.$('selfGeneral').style.width=width+'px';
  U.$('actionStage').style.setProperty('--action-width',Math.max(220,bounds.width-2*width-80)+'px');
  const own=U.$('selfGeneral').getBoundingClientRect();
  const topSeats=others.filter((p,i)=>k<=3||(i!==0&&i!==k-1));
  const upperBottom=32+Math.max(0,...topSeats.map(p=>seatEls.get(p)?.offsetHeight||0));
  others.forEach((p,i)=>{
    const el=seatEls.get(p);if(!el)return;
    const wing=k>3&&(i===0||i===k-1);
    let x,y;
    if(wing){
      const height=el.offsetHeight;
      x=i===0?bounds.width-width/2-16:width/2+16;
      const safeBottom=Math.min(bounds.height,own.top-bounds.top-18);
      y=Math.max(upperBottom+18,Math.min(bounds.height-height-16,safeBottom-height));
    }else{const j=k>3?i-1:i;x=bounds.width-(j+.5)*bounds.width/topCount;y=32;}
    el.style.left=x+'px';el.style.top=y+'px';
  });
}
window.addEventListener('resize',layoutSeats);

const elOf = p => p.isHuman ? selfCardEl : (seatEls.get(p) || selfCardEl);

/* ---------------- 刷新 ----------------
   refresh() 在 AI 的每一步之后都会被调用，所以这里的每个渲染函数都必须是
   幂等的：内容没变就一个 DOM 节点都不要动。否则带 animation 的节点
   （手牌的 dealIn、装备的 chipIn、技能的 skGlow）会在每次刷新时重放动画，
   表现为界面不停闪烁。                                                     */

/* 内容签名没变就跳过重建 */
function sigGuard(container, sig){
  if(container._sig === sig) return true;
  container._sig = sig;
  return false;
}

function equipChips(container, p){
  const slots = ['weapon','armor','horsePlus','horseMinus'];
  const labels = {weapon:'武器',armor:'防具',horsePlus:'+1马',horseMinus:'−1马'};
  const sig = slots.map(s=>p.equips[s]?p.equips[s].uid:'-').join(',');
  if(sigGuard(container, sig)) return;
  container.innerHTML='';
  for(const slot of slots){
    const c = p.equips[slot];
    if(!c){const empty=U.el('div','equip-chip equip-empty',labels[slot]);empty.dataset.slot=slot;empty.title=labels[slot]+'槽（未装备）';empty.setAttribute('aria-label',empty.title);container.appendChild(empty);continue;}
    const cls = slot==='weapon'?'w':slot==='armor'?'a':'h';
    const chip = U.el('div','equip-chip '+cls);
    chip.dataset.slot=slot;
    const distance=slot==='horsePlus'?'+1':slot==='horseMinus'?'−1':'';
    chip.innerHTML = `<span class="eq-name">${c.name}${distance?` <b class="eq-distance">${distance}</b>`:''}</span>`;
    chip.title = `${c.name} · ${SUIT[c.suit].sym}${NUM_TXT[c.num]}${slot==='weapon'?' · 攻击范围 '+c.range:''}\n${CARD_INFO[c.name].desc}`;
    chip.onclick = ev=>{ ev.stopPropagation(); if(P && p===P.p && cardSelectable(c)) onCardClick(c); };
    container.appendChild(chip);
  }
}
function judgeChips(container, p){
  const sig = p.judges.map(c=>c.uid).join(',');
  if(sigGuard(container, sig)) return;
  container.innerHTML='';
  for(const c of p.judges){
    const chip=U.el('div','judge-chip'+(c.name==='闪电'?' lightning':''));
    chip.textContent = c.name;
    container.appendChild(chip);
  }
}
function setText(el, txt){ if(el && el.textContent!==txt) el.textContent = txt; }
function setCls(el, cls){ if(el && el.className!==cls) el.className = cls; }

function renderState(el,p){
  el.classList.toggle('turned',!!p.marks.turned);el.classList.toggle('linked',!!p.marks.linked);
  let badge=el.querySelector('.state-badge');if(!badge){badge=U.el('div','state-badge');el.appendChild(badge);}
  badge.textContent=[p.marks.turned?'背面':'',p.marks.linked?'连环':'',p.marks.fields?.length?'田 '+p.marks.fields.length:'',p.marks.buqu?.length?'不屈 '+p.marks.buqu.map(c=>c.num).join('/'):'',p.marks.forms?.length?'化身 '+p.marks.forms.length:'',p.hp<=0&&p.alive?'体力 '+p.hp:''].filter(Boolean).join(' · ');
  badge.style.display=badge.textContent?'':'none';
}

function refresh(g){
  if(!g) g=G; if(!g) return;
  for(const p of g.players){
    if(p.isHuman) continue;
    const el = seatEls.get(p); if(!el) continue;
    el.classList.toggle('dead', !p.alive);
    renderState(el,p);
    el.classList.toggle('turn', g.curPlayer===p && p.alive);
    setText(el.querySelector('.s-hand'), String(p.handCount));
    hpBeads(el.querySelector('.s-hp'), p, 's-hp');
    const idEl = el.querySelector('.s-id');
    if(p.idShown){ setText(idEl, IDENTITY[p.identity].name); setCls(idEl,'s-id '+IDENTITY[p.identity].cls); }
    else { setText(idEl,'身份未明'); setCls(idEl,'s-id'); }
    const sk = el.querySelector('.s-skills');
    if(!sigGuard(sk, p.skills.join(',')))
      sk.innerHTML = p.skills.map(id=>`<div class="s-sk" title="${SKILL_TEXT[id][1]}">${SKILL_TEXT[id][0]}</div>`).join('');
    equipChips(el.querySelector('.s-equips'), p);
    judgeChips(el.querySelector('.judge-chips'), p);
    const bits = (g.curPlayer===p && g.phase)
      ? ({start:'准备',judge:'判定',draw:'摸牌',play:'出牌',discard:'弃牌',end:'结束'}[g.phase]||'') : '';
    setText(el.querySelector('.s-mark'), bits);
  }
  const h = g.human;
  if(selfCardEl){
    hpBeads(selfCardEl.querySelector('.gc-hp'), h);
    selfCardEl.classList.toggle('dead', !h.alive);
    /* 装备/判定区在武将牌之外，阵亡时一并置灰 */
    U.$('selfGeneral').classList.toggle('dead', !h.alive);
    renderState(selfCardEl,h);
    const sk = selfCardEl.querySelector('.gc-skills');
    const usableSet = h.skills.filter(id=>{
      const s=SKILLS[id];
      return P && P.req.kind==='play' && s && s.active && (!s.avail || s.avail(g,h));
    });
    if(!sigGuard(sk, h.skills.join(',')+'|'+usableSet.join(','))){
      sk.innerHTML='';
      for(const id of h.skills){
        const e = U.el('div','gc-sk');
        e.textContent = SKILL_TEXT[id][0];
        e.title = SKILL_TEXT[id][1];
        if(usableSet.includes(id)){
          e.classList.add('usable');
          e.onclick = ev=>{ ev.stopPropagation(); if(P?.req.kind==='play' && (!SKILLS[id].avail||SKILLS[id].avail(g,h))) finish({type:'skill', skill:id}); };
        }
        sk.appendChild(e);
      }
    }
    const side = U.$('selfGeneral').querySelector('.self-side');
    equipChips(side.querySelector('.s-equips'), h);
    judgeChips(side.querySelector('.judge-chips'), h);
  }
  renderHand(g);
  updateDeck(g);
  layoutSeats();
}

/* 手牌增量渲染：只创建新摸到的牌、只移除已打出的牌，
   已有的节点原地保留，这样发牌动画不会在每次 refresh 时重放。 */
function renderHand(g){
  const box = U.$('handCards');
  const hand = g.human.hand;
  const want = new Set(hand.map(c=>c.uid));
  for(const el of [...box.children])
    if(!el._card || !want.has(el._card.uid)) el.remove();
  const have = new Set([...box.children].map(el=>el._card.uid));
  for(const c of hand){
    if(have.has(c.uid)) continue;
    const el = cardEl(c);
    el.onclick = ()=>onCardClick(c);
    box.appendChild(el);
  }
  applyCardStates();
}

function updateDeck(g){
  if(!g) g=G; if(!g) return;
  const e=U.$('deckCount'); if(e) e.textContent=g.deck.length;
}
function setDiscardTop(card){
  const slot=U.$('discardSlot'); if(!slot||!card) return;
  slot.innerHTML='';
  const e=cardEl(card,'mini'); e.style.transform='scale(.92)';
  slot.appendChild(e);
}

/* ---------------- 出牌展示 ---------------- */
async function showPlay(g, user, card, targets){
  const z = U.$('playZone');
  const w = U.el('div','pz-wrap');
  w.innerHTML = `<div class="pz-src">${user.name} · ${card.name}${targets?.length?' → '+targets.map(t=>t.name).join('、'):''}</div>`;
  const status=U.$('actionStatus'); if(status) status.textContent=w.textContent;
  const shown = card.virtual && card.sub && card.sub.length ? card.sub : [card];
  const row = U.el('div'); row.style.display='flex'; row.style.gap='8px';
  for(const c of shown) row.appendChild(cardEl(c,'mini'));
  if(card.virtual){
    const arrow=U.el('div'); arrow.style.cssText='display:flex;align-items:center;color:#e8c86a;font-size:20px';
    arrow.textContent='→';
    row.appendChild(arrow);
    row.appendChild(cardEl(card,'mini'));
  }
  w.appendChild(row);
  z.appendChild(w);
  await U.wait(1100);
}
function clearPlay(){ U.$('playZone').innerHTML=''; }
function showPool(cards){
  const z=U.$('playZone');
  z.innerHTML='';
  if(!cards) return;
  const row=U.el('div'); row.style.cssText='display:flex;gap:8px;flex-wrap:wrap;justify-content:center';
  for(const c of cards) row.appendChild(cardEl(c,'mini'));
  z.appendChild(row);
}

/* ================= 弹窗 ================= */
function modal({title, body, buttons, cards, onCard}){
  return new Promise(resolve=>{
    const m=U.$('modal');
    U.$('modalTitle').innerHTML = title||'';
    const b=U.$('modalBody'); b.innerHTML='';
    if(body){ const d=U.el('div'); d.innerHTML=body; d.style.width='100%'; b.appendChild(d); }
    if(cards){
      for(const c of cards){
        const e = c._back ? U.el('div','card-back mini') : cardEl(c,'mini');
        e.style.cursor='pointer';
        e.onmouseenter=()=>e.style.transform='translateY(-6px) scale(1.06)';
        e.onmouseleave=()=>e.style.transform='';
        e.onclick=()=>{ m.classList.add('hidden'); resolve(c); };
        if(c._label){
          const wrap=U.el('div'); wrap.style.cssText='display:flex;flex-direction:column;align-items:center;gap:4px';
          wrap.appendChild(e);
          const t=U.el('div'); t.style.cssText='font-size:11px;color:#b5a582';
          t.textContent=c._label; wrap.appendChild(t);
          b.appendChild(wrap);
        } else b.appendChild(e);
      }
    }
    const f=U.$('modalFoot'); f.innerHTML='';
    for(const btn of (buttons||[])){
      const e=U.el('button',null,btn.label);
      e.onclick=()=>{ m.classList.add('hidden'); resolve(btn.value); };
      f.appendChild(e);
    }
    m.classList.remove('hidden');
  });
}

/* ================= 请求处理 ================= */
function setPrompt(html){ U.$('promptText').innerHTML = html||'—'; }
function setBtns(ok,cancel,end){
  U.$('btnOk').disabled=!ok; U.$('btnCancel').disabled=!cancel; U.$('btnEnd').disabled=!end;
  U.$('controlPanel').classList.toggle('hidden',!P || !P.p.isHuman);
  U.$('btnEnd').classList.toggle('hidden',!P || P.req.kind!=='play');
  U.$('btnOk').textContent=P?.req.kind==='play'?'出牌':'确定';
}
function clearTargets(){
  document.querySelectorAll('.borrow-role').forEach(el=>el.remove());
  for(const [p,el] of seatEls) el.classList.remove('targetable','chosen');
  if(selfCardEl) selfCardEl.classList.remove('targetable','chosen');
}
function applyCardStates(){
  const cards=[...U.$('handCards').children];
  if(P) for(const chip of U.$('selfGeneral').querySelectorAll('.equip-chip')){ const c=P.p.equipList().find(x=>chip.textContent.includes(x.name)); if(c){ chip.classList.toggle('sel',P.sel.includes(c)); chip.classList.toggle('usable',cardSelectable(c)); } }
  if(!P){ cards.forEach(e=>e.classList.remove('dis','usable','sel')); return; }
  for(const e of cards){
    const c=e._card; if(!c)continue;
    e.classList.toggle('sel', P.sel.includes(c));
    const ok = cardSelectable(c);
    e.classList.toggle('dis', !ok && !P.sel.includes(c));
    e.classList.toggle('usable', ok);
  }
}

function cardSelectable(c){
  const {g,p,req}=P;
  if(req.kind==='play'){
    if(P.view) return P.view.filter(g,p,c) && (P.view.area==='any'||p.hand.includes(c));
    if(g.canUseInPlay(p,c) && p.hand.includes(c)) return true;
    return VIEW_AS.some(v=>{
      if(v.ask) return false;
      if(v.equip){ if(!(p.equips.weapon&&p.equips.weapon.name==='丈八蛇矛')) return false; }
      else if(!p.hasSkill(v.id)) return false;
      if(v.extra && !v.extra(g,p)) return false;
      if(!v.filter(g,p,c)) return false;
      const probe = makeVirtual(v.as,[c],v.id);
      return v.count===1 ? g.canUseInPlay(p,probe) : true;
    });
  }
  if(req.kind==='respond'){
    return P.respondPool.includes(c);
  }
  if(req.kind==='discard' || req.kind==='select'){
    if(req.area==='any' || req.any) return (p.hand.includes(c)||p.equipList().includes(c)) && (!req.cardFilter || req.cardFilter(c));
    return p.hand.includes(c) && (!req.cardFilter || req.cardFilter(c));
  }
  return false;
}

function request(g, p, req){
  /* 弹窗类请求 */
  if(req.kind==='confirm')
    return modal({title:'请选择', body:req.prompt,
      buttons:[{label:'发动',value:true},{label:'取消',value:false}]});
  if(req.kind==='choose')
    return modal({title:'请选择', body:req.prompt,
      buttons:req.options.map(o=>({label:o,value:o}))});
  if(req.kind==='pickFrom')
    return modal({title:req.prompt||'选择一张牌', cards:req.cards});
  if(req.kind==='pickArea')  return pickAreaModal(g,p,req);
  if(req.kind==='guanxing')  return guanxingModal(g,p,req);

  return new Promise(resolve=>{
    P = {g,p,req,resolve, sel:[], targets:[], play:null, respondPool:[]};
    if(req.kind==='respond') P.respondPool = respondPoolOf(g,p,req);
    startRequest();
    refresh(g);
  });
}

function respondPoolOf(g,p,req){
  const set=new Set();
  const name = req.rescue ? '桃' : req.need;
  const opts = req.rescue ? Skills.saveOptions(g,p,req.dying) : Skills.options(g,p,name);
  for(const o of opts){
    if(o.kind==='real') o.cards.forEach(c=>set.add(c));
    if(o.kind==='view') o.pool.forEach(c=>set.add(c));
  }
  return [...set];
}

function startRequest(){
  const {g,p,req}=P;
  clearTargets();
  P.askOpts = [];
  if(req.kind==='play'){
    setPrompt(`<b>你的出牌阶段</b><br>选择手牌使用，或点击武将技能。`);
    setBtns(false,false,true);
  }else if(req.kind==='respond'){
    const opts = req.rescue ? Skills.saveOptions(g,p,req.dying) : Skills.options(g,p,req.need);
    P.askOpts = opts.filter(o=>o.kind==='ask');
    let extra='';
    if(P.askOpts.length)
      extra = '<br>'+P.askOpts.map(o=>`<a href="#" data-ask="${o.id}" style="color:#8fd0ff">[发动${SKILL_TEXT[o.id][0]}]</a>`).join(' ');
    setPrompt((req.prompt||`请打出【${req.need}】`)+extra);
    setBtns(false, req.cancelable!==false, false);
    U.$('promptText').querySelectorAll('[data-ask]').forEach(a=>{
      a.onclick = async ev=>{
        ev.preventDefault();
        const id=a.dataset.ask;
        const r = P.resolve; const req2=P.req;
        P=null; clearTargets(); setPrompt('—'); setBtns(false,false,false); applyCardStates();
        const card = await Skills.resolveAsk(g,p,id, req2.rescue?'桃':req2.need);
        r(card);
      };
    });
  }else if(req.kind==='discard'){
    setPrompt(req.prompt||`请弃置 ${req.n} 张牌`);
    setBtns(false,false,false);
  }else if(req.kind==='select'){
    setPrompt(req.prompt||'请选择牌');
    setBtns((req.min||0)===0 && !req.needTarget, req.cancelable!==false, false);
    if(req.needTarget) highlightTargets(q=>!req.targetFilter||req.targetFilter(q));
  }else if(req.kind==='chooseTarget'){
    setPrompt(req.prompt||'请选择目标');
    setBtns(false, req.cancelable===true, false);
    highlightTargets(q=>!req.filter||req.filter(q));
  }
  applyCardStates();
  renderActions();
}

function renderActions(){
  const box=U.$('skillActions'); if(!box) return; box.innerHTML='';
  if(!P || P.req.kind!=='play') return;
  const {g,p}=P;
  const add=(label,tip,fn,enabled=true)=>{const b=U.el('button','skill-action',label);b.title=tip;b.disabled=!enabled;b.onclick=fn;box.appendChild(b);};
  for(const id of [...p.skills,'huangtian_give','zhiba_duel','recast']){const sk=SKILLS[id];if(!p.skills.includes(id)&&!sk?.avail?.(g,p))continue;if(sk?.active && p.hasSkill(id)) add(sk.name,SKILL_TEXT[id][1],()=>finish({type:'skill',skill:id}),!sk.avail||sk.avail(g,p));}
  for(const v of VIEW_AS){
    if(v.ask || (!v.equip&&!p.hasSkill(v.id)) || (v.extra&&!v.extra(g,p))) continue;
    if(!g.canUseInPlay(p,makeVirtual(v.as,[],v.id))) continue;
    const pool=(v.area==='any'?p.hand.concat(p.equipList()):p.hand).filter(c=>v.filter(g,p,c));
    add((v.equip?'丈八蛇矛':SKILL_TEXT[v.id][0])+' → '+v.as,`选择${v.count}张牌发动`,()=>{P.view=v;P.sel=[];P.play=null;P.targets=[];clearTargets();setPrompt(`【${v.equip?'丈八蛇矛':SKILL_TEXT[v.id][0]}】：选择 ${v.count} 张牌作为【${v.as}】`);setBtns(false,true,true);applyCardStates();},pool.length>=v.count);
  }
  for(const v of VIEW_AS.filter(v=>v.ask&&v.as==='杀'&&p.hasSkill(v.id)&&(!v.extra||v.extra(g,p)))) add(SKILL_TEXT[v.id][0],SKILL_TEXT[v.id][1],()=>finish({type:'skill',skill:'jijiang_play'}),g.canUseSha(p));
}

function highlightTargets(filter){
  const {g}=P;
  for(const q of g.players){
    const el=elOf(q);
    if(!el) continue;
    el.classList.toggle('targetable', q.alive && filter(q));
  }
}

function finish(val){
  if(!P) return;
  const r=P.resolve;
  P=null;
  clearTargets(); setPrompt('—'); setBtns(false,false,false);
  applyCardStates();
  refresh(G);
  renderActions();
  r(val);
}

/* ---- 点击手牌 ---- */
function onCardClick(c){
  if(!P || !U.$('modal').classList.contains('hidden')) return;
  const {g,p,req}=P;
  if(!cardSelectable(c) && !P.sel.includes(c)) return;
  const i=P.sel.indexOf(c);
  if(i>=0) P.sel.splice(i,1); else P.sel.push(c);

  if(req.kind==='play'){
    const max=P.view?.count||((p.equips.weapon?.name==='丈八蛇矛'||p.hasSkill('luanji'))?2:1);
    while(P.sel.length>max)P.sel.shift();
    updatePlaySelection();
  }else if(req.kind==='respond'){
    const max = maxRespondCount();
    while(P.sel.length>max) P.sel.shift();
    const ok = !!buildRespondCard();
    setBtns(ok, req.cancelable!==false, false);
  }else if(req.kind==='discard'){
    while(P.sel.length>req.n) P.sel.shift();
    setBtns(P.sel.length===req.n, false, false);
  }else if(req.kind==='select'){
    const mx=req.max||1;
    while(P.sel.length>mx) P.sel.shift();
    const enough = P.sel.length>=(req.min||0) && (!req.needTarget || P.targets.length>0 || P.sel.length===0);
    setBtns(enough, req.cancelable!==false, false);
  }
  applyCardStates();
  refreshSelfSkillButtons();
}
function refreshSelfSkillButtons(){ /* 选牌时技能按钮状态不变 */ }

function maxRespondCount(){
  const {g,p,req}=P;
  const name = req.rescue?'桃':req.need;
  const opts = req.rescue ? Skills.saveOptions(g,p,req.dying) : Skills.options(g,p,name);
  return Math.max(1, ...opts.map(o=>o.kind==='view'?o.count:1));
}

/* 依据当前选择组装出一张响应牌 */
function buildRespondCard(){
  const {g,p,req}=P;
  const sel=P.sel;
  if(!sel.length) return null;
  const name = req.rescue ? null : req.need;
  /* 实体同名牌 */
  if(sel.length===1 && p.hand.includes(sel[0])){
    const c=sel[0];
    if(req.rescue){ if(c.name==='桃'||(c.name==='酒'&&req.dying===p)) return c; }
    else if(c.name===name) return c;
  }
  const targetName = req.rescue ? '桃' : name;
  for(const v of VIEW_AS){
    if(v.ask || v.as!==targetName || !sel.every(c=>p.hand.includes(c)||v.area==='any')) continue;
    if(v.equip){ if(!(p.equips.weapon&&p.equips.weapon.name==='丈八蛇矛')) continue; }
    else if(!p.hasSkill(v.id)) continue;
    if(v.extra && !v.extra(g,p)) continue;
    if(sel.length!==v.count) continue;
    if(!sel.every(c=>v.filter(g,p,c))) continue;
    if(v.id==='luanji' && sel[0].suit!==sel[1].suit) continue;
    return makeVirtual(targetName, sel, v.id);
  }
  return null;
}

/* ---- 出牌阶段：选择 → 可用方案 ---- */
function playsForSelection(){
  const {g,p}=P; const sel=P.sel; const out=[];
  if(!sel.length) return out;
  if(!P.view && sel.length===1 && p.hand.includes(sel[0]) && g.canUseInPlay(p,sel[0]))
    out.push({card:sel[0], label:`使用【${sel[0].name}】`});
  for(const v of VIEW_AS){
    if(v.ask || (P.view && P.view!==v)) continue;
    if(!sel.every(c=>p.hand.includes(c)||v.area==='any')) continue;
    if(v.equip){ if(!(p.equips.weapon&&p.equips.weapon.name==='丈八蛇矛')) continue; }
    else if(!p.hasSkill(v.id)) continue;
    if(v.extra && !v.extra(g,p)) continue;
    if(sel.length!==v.count) continue;
    if(!sel.every(c=>v.filter(g,p,c))) continue;
    if(v.id==='luanji' && sel[0].suit!==sel[1].suit) continue;
    const vc = makeVirtual(v.as, sel, v.id);
    if(g.canUseInPlay(p,vc))
      out.push({card:vc, label:`${v.equip?'丈八蛇矛':SKILL_TEXT[v.id][0]} → 【${v.as}】`});
  }
  return out;
}

async function updatePlaySelection(){
  const {g,p}=P;
  P.targets=[]; P.borrowVictim=null; P.play=null; clearTargets();
  const plays = playsForSelection();
  if(!plays.length){
    setPrompt(P.sel.length?`<b>当前选择无法使用</b><br>再次点击可取消选择。`:`<b>你的出牌阶段</b><br>选择手牌使用，或点击武将技能。`);
    setBtns(false,false,true);
    applyCardStates();
    return;
  }
  let chosen = plays[0];
  if(plays.length>1){
    const v = await modal({title:'选择使用方式',
      buttons:plays.map((x,i)=>({label:x.label,value:i})).concat([{label:'取消',value:-1}])});
    if(!P) return;
    if(v===-1 || v==null){ P.sel=[]; applyCardStates(); updatePlaySelection(); return; }
    chosen = plays[v];
  }
  if(!P) return;
  P.play = chosen.card;
  if(P.play.name==='借刀杀人'){renderBorrowSelection();return;}
  const info = CARD_INFO[chosen.card.name];
  if(info.type==='equip' || (info.tgt && info.tgt.all)){
    setPrompt(`将使用 <b>【${chosen.card.name}】</b>${info.tgt&&info.tgt.all?'（所有目标）':''}<br>点击「确定」执行。`);
    setBtns(true,true,true);
    return;
  }
  const legal = g.legalTargets(p, chosen.card);
  if(!legal.length){ setPrompt('没有合法目标。'); setBtns(false,true,true); return; }
  /* 只能选自己 → 自动 */
  if(info.tgt.self==='only'){
    P.targets=[p];
    elOf(p).classList.add('chosen');
    setPrompt(`将对自己使用 <b>【${chosen.card.name}】</b><br>点击「确定」执行。`);
    setBtns(true,true,true);
    return;
  }
  highlightTargets(q=>legal.includes(q));
  setPrompt(`使用 <b>【${chosen.card.name}】</b>：请选择目标（${info.tgt.min}名）`);
  setBtns(false,true,true);
}

/* ---- 点击座位 ---- */
function renderBorrowSelection(){
  const {g,p,play}=P,holder=P.targets[0];
  clearTargets();
  if(!holder){
    highlightTargets(q=>g.canTarget(p,play,q)&&g.borrowVictims(q).length>0);
    setPrompt('<b>借刀杀人 · ① 选择持刀者</b><br>点击一名装备武器的其他武将。');
  }else{
    highlightTargets(q=>g.borrowVictims(holder).includes(q));
    elOf(holder).classList.add('chosen');
    const mark=(q,text)=>{const host=q.isHuman?U.$('selfGeneral'):elOf(q);host.appendChild(U.el('span','borrow-role',text));};
    mark(holder,'① 持刀者');
    if(P.borrowVictim){elOf(P.borrowVictim).classList.add('chosen');mark(P.borrowVictim,'② 被杀者');}
    setPrompt(P.borrowVictim?`<b>${U.escape(holder.name)} → ${U.escape(P.borrowVictim.name)}</b><br>点击「出牌」确认；再点已选武将可重选。`:`<b>借刀杀人 · ② 选择被杀者</b><br>已选 ${U.escape(holder.name)}，请选择其攻击范围内的武将。`);
  }
  setBtns(!!holder&&!!P.borrowVictim,true,true);
}
function onSeatClick(q){
  if(!P || !q.alive || !U.$('modal').classList.contains('hidden')) return;
  const {g,p,req}=P;
  const el=elOf(q);
  if(!el.classList.contains('targetable') && !P.targets.includes(q)) return;

  if(req.kind==='play'){
    if(P.play?.name==='借刀杀人'){
      if(!P.targets.length)P.targets=[q];
      else if(P.targets[0]===q){P.targets=[];P.borrowVictim=null;}
      else P.borrowVictim=P.borrowVictim===q?null:q;
      renderBorrowSelection();return;
    }
    const info=CARD_INFO[P.play.name];
    const max=g.targetMax(p,P.play);
    const i=P.targets.indexOf(q);
    if(i>=0){ P.targets.splice(i,1); el.classList.remove('chosen'); }
    else{
      if(P.targets.length>=max){ const old=P.targets.shift(); elOf(old).classList.remove('chosen'); }
      P.targets.push(q); el.classList.add('chosen');
    }
    setBtns(P.targets.length>=(info.tgt.min||1), true, true);
  }else if(req.kind==='select'){
    P.targets=[q];
    clearTargets(); highlightTargets(x=>!req.targetFilter||req.targetFilter(x));
    el.classList.add('chosen');
    setBtns(P.sel.length>=(req.min||0), req.cancelable!==false, false);
  }else if(req.kind==='chooseTarget'){
    const max=req.max||1;
    const i=P.targets.indexOf(q);
    if(i>=0){ P.targets.splice(i,1); el.classList.remove('chosen'); }
    else{
      if(P.targets.length>=max){ const old=P.targets.shift(); elOf(old).classList.remove('chosen'); }
      P.targets.push(q); el.classList.add('chosen');
    }
    setBtns(P.targets.length>=(req.min||1), req.cancelable===true, false);
  }
}

/* ---- 按钮 ---- */
async function onOk(){
  if(!P) return;
  const {g,p,req}=P;
  if(req.kind==='play'){
    const card=P.play; if(!card) return;
    let opt={};
    if(card.name==='借刀杀人'){
      const holder=P.targets[0];
      if(!holder||!g.canTarget(p,card,holder)||!g.borrowVictims(holder).includes(P.borrowVictim)){P.targets=[];P.borrowVictim=null;renderBorrowSelection();return;}
      opt.extra=P.borrowVictim;
    }
    finish({type:'use', card, targets:P.targets.slice(), opt});
  }else if(req.kind==='respond'){
    const c=buildRespondCard(); if(!c) return;
    finish(c);
  }else if(req.kind==='discard'){
    finish(P.sel.slice());
  }else if(req.kind==='select'){
    finish({cards:P.sel.slice(), target:P.targets[0]||null});
  }else if(req.kind==='chooseTarget'){
    finish(P.targets.slice());
  }
}
function onCancel(){
  if(!P) return;
  const {req}=P;
  if(req.kind==='play'){ P.sel=[]; P.view=null; P.play=null; P.targets=[]; clearTargets(); updatePlaySelection(); applyCardStates(); return; }
  if(req.kind==='select'){ finish(null); return; }
  finish(null);
}
function onEnd(){ if(P && P.req.kind==='play') finish({type:'end'}); }

/* ---- 特殊弹窗 ---- */
function pickAreaModal(g,p,req){
  const t=req.target;
  const list=[];
  t.hand.forEach((c,i)=>{ const o=Object.create(c); o._back=true; o._label='手牌'; o._real=c; list.push(o); });
  t.equipList().forEach(c=>{ const o=Object.create(c); o._label=SLOT_NAME[c.slot]; o._real=c; list.push(o); });
  t.judges.forEach(c=>{ const o=Object.create(c); o._label='判定区'; o._real=c; list.push(o); });
  return modal({title:req.prompt||`选择 ${t.name} 的一张牌`, cards:list}).then(r=>r?r._real:null);
}

function guanxingModal(g,p,req){
  return new Promise(resolve=>{
    const m=U.$('modal');
    m.classList.add('guanxing-modal');
    m.style.setProperty('--guanxing-count',Math.max(1,req.cards.length));
    U.$('modalTitle').textContent='观星 · 安排牌堆';
    const b=U.$('modalBody'); b.innerHTML='';
    const top=[], bottom=[], pool=req.cards.slice();
    const info=U.el('div','guanxing-hint','点击卡牌切换牌堆顶 / 牌堆底。牌堆顶从左到右依次摸取。');
    const rowT=U.el('div','guanxing-row guanxing-top');
    const rowB=U.el('div','guanxing-row guanxing-bottom');
    const lblT=U.el('div','guanxing-label guanxing-top');
    const lblB=U.el('div','guanxing-label guanxing-bottom');
    b.appendChild(info); b.appendChild(lblT); b.appendChild(rowT); b.appendChild(lblB); b.appendChild(rowB);
    pool.forEach(c=>top.push(c));
    function draw(){
      rowT.innerHTML=''; rowB.innerHTML='';
      lblT.textContent=`牌堆顶 · ${top.length} 张`;
      lblB.textContent=`牌堆底 · ${bottom.length} 张`;
      top.forEach(c=>{ const e=cardEl(c,'mini'); e.onclick=()=>{ top.splice(top.indexOf(c),1); bottom.push(c); draw(); }; rowT.appendChild(e); });
      bottom.forEach(c=>{ const e=cardEl(c,'mini'); e.onclick=()=>{ bottom.splice(bottom.indexOf(c),1); top.push(c); draw(); }; rowB.appendChild(e); });
    }
    draw();
    const f=U.$('modalFoot'); f.innerHTML='';
    const ok=U.el('button',null,'确定');
    ok.onclick=()=>{ m.classList.add('hidden'); m.classList.remove('guanxing-modal'); m.style.removeProperty('--guanxing-count'); resolve({top:top.slice(), bottom:bottom.slice()}); };
    f.appendChild(ok);
    m.classList.remove('hidden');
  });
}

/* ---------------- 结算 ---------------- */
function showOver(g, winner){
  const h=g.human;
  const won = (winner==='zhu'  && (h.identity==='zhu'||h.identity==='zhong'))
           || (winner==='fan'  &&  h.identity==='fan')
           || (winner==='nei'  &&  h.identity==='nei');
  U.$('overTitle').textContent = won?'胜 利':'失 败';
  U.$('overTitle').className = won?'win':'lose';
  const wname={zhu:'主公 & 忠臣',fan:'反贼',nei:'内奸',draw:'平局'}[winner];
  U.$('overDesc').textContent = `${wname} 获胜 · 你的身份：${IDENTITY[h.identity].name}`;
  const list=U.$('overList'); list.innerHTML='';
  for(const p of g.players){
    const d=U.el('div','over-item'+(p.alive?'':' dead'));
    d.innerHTML=`<div class="gn">${p.name}</div>
      <div class="idn s-id ${IDENTITY[p.identity].cls}" style="display:inline-block;padding:1px 6px;border-radius:3px">${IDENTITY[p.identity].name}</div>`;
    list.appendChild(d);
  }
  U.$('overScreen').classList.remove('hidden');
}

return {build, refresh, elOf, cardEl, generalCardEl, request, showPlay, clearPlay,
        showPool, updateDeck, setDiscardTop, showOver, modal};
})();
