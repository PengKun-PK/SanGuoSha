/* ================= 入口 ================= */
(function(){
const opts = { count:5, diff:'hard', speed:1, aiThink:800, identity:'random' };

/* ---- 开始界面选项 ---- */
function seg(id, cb){
  const box=U.$(id);
  box.querySelectorAll('button').forEach(b=>{
    b.onclick=()=>{
      box.querySelectorAll('button').forEach(x=>x.classList.remove('on'));
      b.classList.add('on'); cb(b.dataset.v);
    };
  });
}
seg('optCount', v=>opts.count=+v);
seg('optDiff',  v=>opts.diff=v);
seg('optIdentity', v=>opts.identity=v);
seg('optSpeed', v=>{ opts.speed=+v; U.speed=+v; U.$('battleSpeed').value=v;
  document.documentElement.style.setProperty('--spd', v); });
U.speed = opts.speed;
U.$('battleSpeed').onchange=e=>{U.speed=+e.target.value;document.documentElement.style.setProperty('--spd',U.speed);};

U.$('btnRules').onclick = ()=>UI.modal({title:'玩法说明', body:RULES,
  buttons:[{label:'知道了',value:1}]});

/* 开始与选将界面的背景火星，与战场共用 .ember 的动画 */
for(const host of document.querySelectorAll('.scenery-embers'))
  for(let i=0;i<18;i++){
    const e=U.el('i','ember');
    e.style.cssText=`--x:${(i*47)%100}%;--size:${2+i%3}px;--life:${10+i%8}s;--delay:-${i*1.9}s`;
    host.appendChild(e);
  }

U.$('btnStart').onclick = ()=>startPick();
U.$('btnAgain').onclick = ()=>location.reload();

/* ---- 难度 → AI 参数 ---- */
const DIFF = {
  normal:{think:900, hand:0, hp:0, noise:28},
  hard:  {think:800, hand:0, hp:0, noise:10},
  insane:{think:700, hand:0, hp:0, noise:0},
};

/* ---- 分配身份与座位 ---- */
let setupState = null;
function startPick(){
  const n = opts.count;
  const ids = IDENTITY_SETUP[n].slice();
  const lordId = ids.shift();                  // 主公固定 0 号位
  U.shuffle(ids);
  const seats = [lordId, ...ids];
  /* 指定身份时，从该身份的座位里随机挑一个；主公固定 0 号位 */
  const wanted = opts.identity && opts.identity!=='random'
    ? seats.reduce((acc,id,i)=>(id===opts.identity?acc.concat(i):acc),[]) : [];
  const humanSeat = wanted.length ? U.pick(wanted) : U.rand(n);

  /* 主公用的武将从主公将里选，其余随机 */
  const pool = pickableGenerals();
  const lordPool = LORD_LIST.filter(id=>!DISABLED_GENERALS.has(id));
  const used = new Set();

  const humanIsLord = humanSeat===0;
  let candidates;
  candidates = pool.slice();

  setupState = {n, seats, humanSeat, candidates, used, pool, lordPool};

  U.$('startScreen').classList.add('hidden');
  U.$('pickScreen').classList.remove('hidden');
  U.$('pickIdentity').textContent = IDENTITY[seats[humanSeat]].name;
  U.$('pickIdentity').className = 'id-'+seats[humanSeat];
  U.$('pickHint').innerHTML =
    `目标：${IDENTITY[seats[humanSeat]].desc}　|　本局 ${n} 人：` +
    IDENTITY_SETUP[n].map(i=>IDENTITY[i].name).join('、');

  const list=U.$('pickList'); list.innerHTML='';
  const controls=U.el('div','pick-filters');let selectedPack='全部';
  const search=U.el('input');search.placeholder='搜索武将 / 技能';search.setAttribute('aria-label','搜索武将或技能');
  const filter=()=>{for(const el of list.children){const gen=GENERALS[el.dataset.gid];const term=search.value.trim();el.style.display=(selectedPack==='全部'||gen.pack===selectedPack)&&(!term||[gen.name,...gen.skills.map(s=>SKILL_TEXT[s][0])].some(t=>t.includes(term)))?'':'none';}};
  for(const pack of ['全部','标准','风','火','林','山']){const b=U.el('button',pack==='全部'?'on':'',pack);b.onclick=()=>{selectedPack=pack;controls.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));filter();};controls.appendChild(b);}
  search.oninput=filter;controls.appendChild(search);list.before(controls);
  let chosen=null;
  for(const gid of candidates){
    const g=GENERALS[gid];
    const fake={gid, kingdom:g.k, name:g.name, skills:g.skills,
      hp:g.hp+(humanIsLord&&n>4?1:0), maxHp:g.hp+(humanIsLord&&n>4?1:0),
      hpClass(){return 'hp-full';}};
    const card=UI.generalCardEl(fake);card.dataset.gid=gid;card.title=g.name+' · '+g.pack+'包';
    const hpBox=card.querySelector('.gc-hp');
    for(let i=0;i<fake.maxHp;i++) hpBox.appendChild(U.el('div','hp-bead'));
    hpBox.className='gc-hp hp-full';
    const skBox=card.querySelector('.gc-skills');
    skBox.innerHTML = g.skills.map(id=>`<div class="gc-sk" title="${SKILL_TEXT[id][1]}">${SKILL_TEXT[id][0]}</div>`).join('');
    card.onclick=()=>{
      list.querySelectorAll('.gcard').forEach(x=>x.classList.remove('sel'));
      card.classList.add('sel'); chosen=gid;
      U.$('btnPickConfirm').disabled=false;
      showSkillDetail(gid);
    };
    list.appendChild(card);
  }
  const detail=U.el('div');
  detail.id='pickDetail';detail.className='pick-skill-panel';
  detail.style.cssText='margin-top:6px;font-size:13px;color:#b8a87f;line-height:1.9;max-width:760px;text-align:left;min-height:70px';
  U.$('pickScreen').insertBefore(detail, U.$('btnPickConfirm'));
  function showSkillDetail(gid){
    detail.innerHTML = GENERALS[gid].skills.map(id=>
      `<div><b style="color:#e8c86a">${SKILL_TEXT[id][0]}</b> — ${SKILL_TEXT[id][1]}</div>`).join('');
  }

  U.$('btnPickConfirm').disabled=true;
  U.$('btnPickConfirm').onclick=()=>{ if(chosen) begin(chosen); };
}

function begin(humanGid){
  const st=setupState;
  const d=DIFF[opts.diff];
  opts.aiThink = d.think;

  const used=new Set([humanGid]);
  const players=[];
  for(let i=0;i<st.n;i++){
    let gid;
    if(i===st.humanSeat) gid=humanGid;
    else if(st.seats[i]==='zhu'){
      const c=LORD_LIST.filter(x=>!used.has(x) && !DISABLED_GENERALS.has(x));
      gid = c.length?U.pick(c):U.pick(pickableGenerals().filter(x=>!used.has(x)));
    }else{
      const c=pickableGenerals().filter(x=>!used.has(x) && !LORD_LIST.includes(x));
      gid = U.pick(c.length?c:pickableGenerals().filter(x=>!used.has(x)));
    }
    used.add(gid);
    players.push(new Player(i, gid, st.seats[i], i===st.humanSeat));
  }

  const g = new Game(opts);
  g.attach(players);
  /* 难度加成 */
  if(d.hand||d.hp){
    for(const p of players) if(!p.isHuman){
      p.maxHp += d.hp; p.hp = p.maxHp;
      p.hand.push(...g.popDeck(d.hand));
    }
  }
  AI.setup(g);
  /* 推理噪声：普通难度的 AI 判断更迟钝 */
  if(d.noise) for(const p of players) if(p.ai)
    for(const q of players) if(q!==p && q.identity!=='zhu')
      p.ai.suspect[q.seat] += (Math.random()*2-1)*d.noise;

  window.__game = g;
  U.$('pickScreen').classList.add('hidden');
  U.$('gameScreen').classList.remove('hidden');
  g.run().catch(e=>{
    console.error(e);
    g.log(`<b style="color:#ff6a52">运行出错：${U.escape(e&&e.message||e)}</b>`);
  });
}

const RULES = `<div class="rules-text">
<h4>身份与胜利条件</h4>
<b>主公</b>：消灭所有反贼与内奸。<b>忠臣</b>：与主公同阵营。<br>
<b>反贼</b>：杀死主公即获胜。<b>内奸</b>：需要成为最后一名存活者（先除掉其他人，再单挑主公）。<br>
只有主公的身份是公开的，其余人的身份在阵亡时才会翻开。
<h4>回合流程</h4>
准备 → 判定 → 摸牌(2张) → 出牌 → 弃牌(手牌上限=当前体力) → 结束
<h4>操作</h4>
· 点击手牌选中，再点击目标角色，最后点「确定」。<br>
· 拥有转化技（如武圣、龙胆、倾国）时，选中对应的牌会弹出使用方式选择。<br>
· 主动技（如制衡、仁德、苦肉）在出牌阶段会在武将牌上高亮，点击即可发动。<br>
· 出牌阶段结束请点「结束出牌」。
<h4>距离与攻击范围</h4>
距离 = 座位间的最短间隔；+1马让别人算你距离时+1，−1马让你算别人时−1。<br>
【杀】只能指定攻击范围内的角色，攻击范围默认为1，装备武器后等于武器射程。
<h4>武将与技能</h4>
标准武将与风火林山32名常规武将，共57名。选择卡包或搜索名字、技能选将。<br>
出牌区的金色按钮用于主动技能与转化技能；装备效果会在对应时机自动生效或询问。鼠标停留在技能、装备上可查看说明。<br>
蓝色边框表示横置，灰色立绘表示翻面。觉醒、限定技、田、不屈和化身会保留到后续回合。<br>
对局顶部可随时改变速度；战报保留出牌和结算信息。
</div>`;
})();
