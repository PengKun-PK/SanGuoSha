/* ================= 视觉特效层 ================= */
const FX = (()=>{
const layer  = ()=>U.$('fxLayer');
const banners= ()=>U.$('bannerLayer');

function add(el, life){
  layer().appendChild(el);
  setTimeout(()=>el.remove(), life);
  return el;
}

/* ---- 技能横幅 ---- */
function banner(skillName, whoName){
  const b = U.el('div','sk-banner');
  b.innerHTML = `<span class="sb-who">${U.escape(whoName)}</span>
                 <span class="sb-name">${U.escape(skillName)}</span>`;
  banners().appendChild(b);
  setTimeout(()=>b.remove(), 1400);
  return U.wait(560);
}

/* 同一时刻只留一条横幅。横幅只阻塞几百毫秒，寿命却有一秒多，
   所以弃牌阶段的横幅还没散完，下一位的「回合开始」就压上来了，
   摸牌→出牌之间同理；两条都居中就会叠成一团。 */
let liveBanner = null;
function retireBanner(){
  const el = liveBanner;
  if(!el) return;
  liveBanner = null;
  // 只给终点帧：起点取当前正在播的透明度，于是接着淡出，而不是先跳回不透明
  el.animate([{opacity:0}], {duration:170, fill:'forwards'});
  setTimeout(()=>el.remove(), 190);
}
function holdBanner(el, life){
  retireBanner();
  liveBanner = el;
  banners().appendChild(el);
  setTimeout(()=>{ if(liveBanner===el) liveBanner = null; el.remove(); }, life);
}

function turnBanner(name, sub){
  const b = U.el('div','turn-banner');
  b.innerHTML = `<div class="tb-name">${U.escape(name)}</div><div class="tb-sub">${U.escape(sub||'回合开始')}</div>`;
  holdBanner(b, 1250);
  return U.wait(520);
}

/* ---- 阶段提示 ----
   回合开始/结束阶段没有可见动作，横幅只会拖慢节奏，所以不提示；
   判定阶段只在判定区真有牌时才提示。 */
const PHASE_LABEL = {judge:'判定阶段', draw:'摸牌阶段', play:'出牌阶段', discard:'弃牌阶段'};
function phaseBanner(phase, whoName, ctx){
  const label = PHASE_LABEL[phase];
  if(!label) return Promise.resolve();
  if(phase==='judge' && !(ctx && ctx.judges)) return Promise.resolve();
  const life = 1250*U.speed + 300;
  const b = U.el('div','phase-banner');
  b.style.setProperty('--life', life+'ms');
  b.innerHTML = `<i class="pb-rule"></i>
                 <div class="pb-text">
                   <span class="pb-who">${U.escape(whoName||'')}</span>
                   <span class="pb-name">${label}</span>
                 </div>
                 <i class="pb-rule"></i>`;
  holdBanner(b, life);
  return U.wait(420);
}

/* ---- 伤害 / 回复 ---- */
function damage(el, n, nature){
  const p = U.center(el);
  const d = U.el('div','dmg-num '+(nature||''));
  d.textContent = '-'+n;
  d.style.left = p.x+'px'; d.style.top = p.y+'px';
  add(d,1100);
  if(el){
    const host = el.querySelector('.seat-box') || el;
    const f = U.el('div','hit-flash'); host.appendChild(f);
    setTimeout(()=>f.remove(),480);
    el.classList.add(el.classList.contains('seat')?'shake':'shake-self');
    setTimeout(()=>el.classList.remove('shake','shake-self'),440);
  }
  if(nature==='fire')    screenFx('fx-fire',900);
  if(nature==='thunder') screenFx('fx-thunder',620);
}
function heal(el, n){
  const p = U.center(el);
  const d = U.el('div','dmg-num heal'); d.textContent = '+'+n;
  d.style.left=p.x+'px'; d.style.top=p.y+'px'; add(d,1100);
  if(el){
    const host = el.querySelector('.seat-box')||el;
    const f=U.el('div','hit-flash heal'); host.appendChild(f); setTimeout(()=>f.remove(),480);
  }
}
function loseHp(el,n){
  const p=U.center(el);
  const d=U.el('div','dmg-num'); d.textContent='-'+n;
  d.style.left=p.x+'px'; d.style.top=p.y+'px'; add(d,1100);
}

function screenFx(cls, life){
  const s=U.el('div','screen-fx '+cls);
  layer().appendChild(s); setTimeout(()=>s.remove(),life);
}

/* ---- 杀 / 闪 ---- */
function slash(el){
  const p=U.center(el);
  const s=U.el('div','slash','<i></i>');
  s.style.left=p.x+'px'; s.style.top=p.y+'px'; add(s,450);
}
function dodge(el){
  const p=U.center(el);
  const r=U.el('div','dodge-ring');
  r.style.left=p.x+'px'; r.style.top=p.y+'px'; add(r,600);
}

/* ---- 指向光束 ---- */
function beam(fromEl, toEl, kind){
  const a=U.center(fromEl), b=U.center(toEl);
  const dx=b.x-a.x, dy=b.y-a.y;
  const len=Math.hypot(dx,dy), ang=Math.atan2(dy,dx)*180/Math.PI;
  const e=U.el('div','beam '+(kind||''));
  e.style.left=a.x+'px'; e.style.top=(a.y-2)+'px';
  e.style.width=len+'px'; e.style.transform=`rotate(${ang}deg)`;
  add(e,1100*U.speed);
}

/* ---- 飞牌：从 fromEl 飞到 toEl ---- */
function flyCard(cardObj, fromEl, toEl, opt={}){
  const a=U.center(fromEl), b=U.center(toEl);
  const el = cardObj ? UI.cardEl(cardObj,'mini') : U.el('div','card-back mini');
  el.classList.add('fly-card');
  const dur = (opt.dur||420)*U.speed;
  el.style.setProperty('--t', dur+'ms');
  el.style.left='0'; el.style.top='0';
  el.style.transform=`translate(${a.x-29}px,${a.y-40}px) scale(${opt.s0||.7}) rotate(${opt.r0||0}deg)`;
  layer().appendChild(el);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    el.style.transform=`translate(${b.x-29}px,${b.y-40}px) scale(${opt.s1||.5}) rotate(${opt.r1||0}deg)`;
    if(opt.fade!==false) el.style.opacity='0';
  }));
  setTimeout(()=>el.remove(), dur+60);
  return U.hardWait(dur*0.62);
}

/* ---- 摸牌动画 ---- */
async function drawTo(toEl, n){
  const from = U.$('deckPile');
  const jobs=[];
  for(let i=0;i<n;i++){
    jobs.push((async()=>{
      await U.hardWait(i*70*U.speed);
      const a=U.center(from), b=U.center(toEl);
      const el=U.el('div','card-back mini draw-ghost');
      const dur=380*U.speed;
      el.style.setProperty('--t',dur+'ms');
      el.style.transform=`translate(${a.x-31}px,${a.y-43}px) scale(.8)`;
      layer().appendChild(el);
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        el.style.transform=`translate(${b.x-31}px,${b.y-43}px) scale(.42) rotate(${U.rand(30)-15}deg)`;
        el.style.opacity='0';
      }));
      setTimeout(()=>el.remove(),dur+60);
    })());
  }
  await Promise.all(jobs);
  await U.hardWait(140*U.speed);
}

/* ---- 判定牌展示 ----
   判定牌先翻开并留在台面上，改判技能（鬼才/鬼道等）是在看得见牌面的
   情况下询问的；改判就原地换牌，最后才亮出生效与否的结论。 */
let pendingJudge = null;
function judgeSlot(cardObj){
  const slot = U.el('div','judge-slot');
  slot.appendChild(UI.cardEl(cardObj,''));
  return slot;
}
function judgeReveal(cardObj, reason){
  judgeClear();
  const w = U.el('div','judge-card pending');
  w.style.left='50%'; w.style.top='38%';
  const cap = U.el('div','judge-label');
  cap.textContent = reason ? `【${reason}】判定牌` : '判定牌';
  w.appendChild(cap);
  const slot = judgeSlot(cardObj);
  w.appendChild(slot);
  layer().appendChild(w);
  pendingJudge = {w, slot, card:cardObj};
  return U.wait(620);
}
function judgeSwap(cardObj){
  if(!pendingJudge || !cardObj || pendingJudge.card===cardObj) return Promise.resolve();
  pendingJudge.card = cardObj;
  const slot = judgeSlot(cardObj);
  slot.classList.add('swap');
  pendingJudge.w.replaceChild(slot, pendingJudge.slot);
  pendingJudge.slot = slot;
  return U.wait(420);
}
function judgeClear(){
  if(pendingJudge){ pendingJudge.w.remove(); pendingJudge=null; }
}
async function judge(cardObj, ok, text){
  let w;
  if(pendingJudge){
    w = pendingJudge.w;
    if(pendingJudge.card!==cardObj) w.replaceChild(judgeSlot(cardObj), pendingJudge.slot);
    pendingJudge = null;
    w.classList.remove('pending');
    w.classList.add('settle');
  }else{
    w = U.el('div','judge-card flip');
    w.style.left='50%'; w.style.top='38%';
    w.appendChild(judgeSlot(cardObj));
    layer().appendChild(w);
  }
  const r = U.el('div','judge-result '+(ok?'good':'bad'));
  r.textContent = text || (ok?'成功':'失败');
  w.appendChild(r);
  setTimeout(()=>w.remove(),1600);
  await U.wait(900);
}

/* ---- 死亡 / 身份 ---- */
function death(el){
  const p=U.center(el);
  const d=U.el('div','death-mark'); d.textContent='阵 亡';
  d.style.left=p.x+'px'; d.style.top=p.y+'px'; add(d,1600);
}
function revealIdentity(el, idKey){
  const p=U.center(el);
  const d=U.el('div','reveal-id s-id '+IDENTITY[idKey].cls);
  d.textContent=IDENTITY[idKey].name;
  d.style.left=p.x+'px'; d.style.top=(p.y-46)+'px'; add(d,1700);
}

/* ---- 濒死氛围 ---- */
let vig=null;
function dying(on){
  if(on && !vig){ vig=U.el('div','dying-vignette'); document.body.appendChild(vig); }
  if(!on && vig){ vig.remove(); vig=null; }
}

function aoe(){ screenFx('fx-aoe',820); }

return {banner,turnBanner,phaseBanner,damage,heal,loseHp,slash,dodge,beam,flyCard,drawTo,
        judge,judgeReveal,judgeSwap,judgeClear,death,revealIdentity,dying,aoe,screenFx};
})();
