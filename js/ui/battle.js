/* Presentation only: no identity notes or visual state enter AI/rule decisions. */
(()=>{
const ns='http://www.w3.org/2000/svg';
const friendlyNames=new Set(['桃','桃园结义','五谷丰登','无中生有','酒']);
const effects={'杀':'slash','闪':'dodge','桃':'heal','桃园结义':'heal','酒':'wine','火攻':'fire','闪电':'thunder','万箭齐发':'arrows','南蛮入侵':'invasion','铁索连环':'chain','无懈可击':'counter','过河拆桥':'dismantle','顺手牵羊':'steal','借刀杀人':'duel','决斗':'duel','无中生有':'draw','五谷丰登':'draw','乐不思蜀':'delay','兵粮寸断':'delay'};
let actionToken=0,routeId=0,settleTimer,routeTimer,activeRoutes=[],routeSource=null,routeTargets=[];
const stage=()=>U.$('actionStage');
function wipeRoutes(){for(const el of activeRoutes)el.remove();activeRoutes=[];routeSource=null;routeTargets=[];clearTimeout(routeTimer);}
function marker(el,text,color,source=false){
 if(!el)return;
 const box=(el.querySelector('.seat-box')||el).getBoundingClientRect();
 if(!box.width)return;
 const m=U.el('div','target-marker'+(source?' source-marker':''));
 m.style.cssText=`left:${box.left-5}px;top:${box.top-5}px;width:${box.width+10}px;height:${box.height+10}px;--path-color:${color}`;
 U.$('fxLayer').appendChild(m);activeRoutes.push(m);
}
function routes(g,user,targets,label,good=false){
 wipeRoutes();const color=good?'#8bf1bc':'#ffb16d';
 const from=UI.elOf(user);if(!from)return;
 routeSource=user;routeTargets=targets.slice();
 marker(from,`${user.name} · 发动`, '#f1d293',true);
 const svg=document.createElementNS(ns,'svg');svg.setAttribute('class','target-path');svg.style.setProperty('--path-color',color);svg.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`);
 const portraitRect=el=>(el.querySelector('.seat-box')||el).getBoundingClientRect();
 const sourceRect=portraitRect(from);
 const a={x:sourceRect.left+sourceRect.width/2,y:sourceRect.top+sourceRect.height/2};
 const duration=Math.max(1500,2400*U.speed);
 svg.style.setProperty('--route-duration',duration+'ms');
 // Clip all portraits out of the overlay, including seats between the players.
 const defs=document.createElementNS(ns,'defs'),mask=document.createElementNS(ns,'mask');
 const maskId='route-mask-'+(++routeId);mask.id=maskId;mask.setAttribute('maskUnits','userSpaceOnUse');
 mask.setAttribute('x','0');mask.setAttribute('y','0');mask.setAttribute('width',innerWidth);mask.setAttribute('height',innerHeight);
 const field=document.createElementNS(ns,'rect');field.setAttribute('width',innerWidth);field.setAttribute('height',innerHeight);field.setAttribute('fill','white');mask.appendChild(field);
 for(const p of g.players){const seat=UI.elOf(p);if(!seat)continue;const r=portraitRect(seat),hole=document.createElementNS(ns,'rect');for(const [key,value] of Object.entries({x:r.left-8,y:r.top-8,width:r.width+16,height:r.height+16,rx:12,fill:'black'}))hole.setAttribute(key,value);mask.appendChild(hole);}
 defs.appendChild(mask);svg.appendChild(defs);
 const lines=document.createElementNS(ns,'g');lines.setAttribute('mask',`url(#${maskId})`);svg.appendChild(lines);
 const edge=(r,dx,dy)=>Math.min((r.width/2+15)/Math.max(Math.abs(dx),.001),(r.height/2+15)/Math.max(Math.abs(dy),.001));
 for(const t of targets){
   const el=UI.elOf(t);if(!el)continue;
   marker(el,`${t.name} · ${label}`,color);
   if(t===user)continue;
   const r=portraitRect(el),b={x:r.left+r.width/2,y:r.top+r.height/2},dx=b.x-a.x,dy=b.y-a.y;
   const start=edge(sourceRect,dx,dy),end=edge(r,dx,dy);
   if(start+end>=1)continue;
   const sx=a.x+dx*start,sy=a.y+dy*start,x=b.x-dx*end,y=b.y-dy*end;
   const gradient=document.createElementNS(ns,'linearGradient'),gradientId=maskId+'-'+targets.indexOf(t);
   gradient.id=gradientId;gradient.setAttribute('gradientUnits','userSpaceOnUse');
   for(const [key,value] of Object.entries({x1:sx,y1:sy,x2:x,y2:y}))gradient.setAttribute(key,value);
   for(const [offset,opacity] of [['0%','.05'],['65%','.55'],['100%','.8']]){const stop=document.createElementNS(ns,'stop');stop.setAttribute('offset',offset);stop.setAttribute('stop-color',color);stop.setAttribute('stop-opacity',opacity);gradient.appendChild(stop);}defs.appendChild(gradient);
   for(const cls of ['path-guide','path-core']){const path=document.createElementNS(ns,'path');path.setAttribute('class',cls);path.setAttribute('d',`M ${sx} ${sy} L ${x} ${y}`);path.setAttribute('pathLength','100');path.style.stroke=`url(#${gradientId})`;lines.appendChild(path);}
   const arrow=document.createElementNS(ns,'path');arrow.setAttribute('class','path-head');arrow.setAttribute('d','M -12 -6 L 0 0 L -12 6');arrow.setAttribute('transform',`translate(${x} ${y}) rotate(${Math.atan2(dy,dx)*180/Math.PI})`);lines.appendChild(arrow);
 }
 U.$('fxLayer').appendChild(svg);activeRoutes.push(svg);
 routeTimer=setTimeout(wipeRoutes,duration);
}
function resolvedTargets(g,user,card,targets){
 if(targets?.length)return targets;
 const all=CARD_INFO[card.name]?.tgt?.all;
 if(!all)return [];
 return g.orderFrom(user).filter(p=>(all!=='others'||p!==user)&&!(p.hasSkill('weimu')&&isBlack(card))&&!(card.name==='南蛮入侵'&&(p.hasSkill('huoshou')||p.hasSkill('juxiang'))));
}
async function present(g,user,card,targets,options={}){
 if(!stage())return;
 const token=++actionToken;clearTimeout(settleTimer);
 const ts=card?resolvedTargets(g,user,card,targets):targets||[];
 const name=options.skill||cardName(card);
 const effect=options.skill?'counter':card.name==='杀'&&card.nature?card.nature:effects[card.name]||(card.type==='equip'?'equip':'draw');
 const root=U.el('div',`battle-action effect-${effect}${card?'':' skill-only'}`);
 const visual=U.el('div','action-visual');visual.setAttribute('aria-hidden','true');
 for(let i=0;i<3;i++){const part=U.el('i');part.style.setProperty('--i',i);visual.appendChild(part);}root.appendChild(visual);
 if(card){const art=U.el('div','action-card');art.appendChild(UI.cardEl(card,'mini'));root.appendChild(art);}
 else root.appendChild(U.el('div','skill-seal','技'));
 const copy=U.el('div','action-copy');
 const via=card?.viaSkill&&SKILL_TEXT[card.viaSkill]?.[0];
 copy.appendChild(U.el('div','action-eyebrow',options.judging?'判定阶段 · 翻牌前':options.skill?'武将技能':`${CARD_INFO[card.name]?.tag||'出牌'}${via?' · '+via+'发动':''}`));
 const title=U.el('div','action-name');title.textContent=name;copy.appendChild(title);
 const source=U.el('div','action-source');source.innerHTML=`<strong>${U.escape(user.name)}</strong> ${options.judging?'即将判定':options.responded?'打出响应':options.skill?'发动技能':'使用卡牌'}`;copy.appendChild(source);
 const targetBox=U.el('div','action-targets');
 targetBox.appendChild(U.el('span',null,ts.length?'目标 → ':options.skill?'正在选择 / 结算':options.responded?'响应当前结算':card.type==='equip'?'装备到自己':'结算中'));
 for(const t of ts){const badge=U.el('span','target-name');badge.textContent=t===user?`${t.name}（自己）`:t.name;targetBox.appendChild(badge);}copy.appendChild(targetBox);root.appendChild(copy);
 stage().replaceChildren(root);
 const status=U.$('actionStatus');status.textContent=options.judging?`${user.name} · 判定阶段 · ${name}`:`${user.name} · ${name}${ts.length?' → '+ts.map(t=>t.name).join('、'):''}`;
 routes(g,user,ts,options.responded?'响应':name,card&&friendlyNames.has(card.name));
 settleTimer=setTimeout(()=>{if(token===actionToken)root.classList.add('settled');},Math.max(2000,3200*U.speed));
 await U.wait(options.skill?950:1500);
}
FX.present=present;
// Replace the old scaleX beam, whose keyframes overwrote its rotation.
FX.beam=(from,to,kind)=>{
 const g=window.__game;if(!g)return;
 const source=g.players.find(p=>UI.elOf(p)===from),target=g.players.find(p=>UI.elOf(p)===to);
 if(source===routeSource&&routeTargets.includes(target))return;
 if(source&&target)routes(g,source,[target],kind==='friendly'?'支援':'目标',kind==='friendly');
};
FX.banner=async(name,who)=>{const g=window.__game,p=g?.players.find(p=>p.name===who);if(p)await present(g,p,null,[],{skill:name});};
UI.showPlay=async(g,user,card,targets,options)=>present(g,user,card,targets,options);
UI.showJudgePending=async(g,p,card)=>present(g,p,card,[p],{judging:true});

// 行动展示只属于当前回合。以前它会一直留在台面上，轮到下一个人出牌时仍显示
// 上一个人的操作，容易被当成当前正在结算的牌。
function clearStage(){
 clearTimeout(settleTimer);actionToken++;
 stage()?.replaceChildren();
 wipeRoutes();
 const status=U.$('actionStatus');if(status)status.textContent='';
}
FX.clearStage=clearStage;
const playerTurn=Game.prototype.playerTurn;
Game.prototype.playerTurn=async function(p){
 try{return await playerTurn.call(this,p);}finally{clearStage();}
};

// Keep source/target context through nested responses and counterspells.
const useCard=Game.prototype.useCard;
Game.prototype.useCard=async function(user,card,targets,opt){
 const prev=this.presentationContext;this.presentationContext={user,card,targets};
 try{return await useCard.call(this,user,card,targets,opt);}finally{this.presentationContext=prev;}
};

// Visible seat-order response queue. A stack handles nested requests without
// leaving the old responder highlighted or clearing a newer request.
let requestStack=[],waitId=0;
function clearWaiting(){document.querySelectorAll('.response-focus').forEach(e=>e.classList.remove('response-focus'));document.querySelectorAll('.response-tag').forEach(e=>e.remove());}
function paintWaiting(){
 clearWaiting();U.$('responseQueue')?.remove();
 const item=requestStack.at(-1);if(!item)return;
 const el=UI.elOf(item.p);
 if(el){
  el.classList.add('response-focus');
  el.style.setProperty('--poll-duration',Math.max(1,900*U.speed)+'ms');
 }

}
function startWaiting(g,p,req){
 if(req.kind==='play'||['guanxing'].includes(req.kind))return ()=>{};
 const id=++waitId;requestStack.push({id,g,p,req});paintWaiting();
 return ()=>{requestStack=requestStack.filter(x=>x.id!==id);paintWaiting();};
}
const ask=Game.prototype.ask;
Game.prototype.ask=async function(p,req){
 const end=startWaiting(this,p,req);
 let result;
 try{result=await ask.call(this,p,req);}finally{end();}
 const targets=req.kind==='chooseTarget'?result:req.kind==='select'&&result?.target?[result.target]:[];
 if(targets?.length&&req.tag&&SKILL_TEXT[req.tag]){
   this.log(`${this.nm(p)} 的 ${this.sn(req.tag)} 选择：${targets.map(t=>this.nm(t)).join('、')}。`);
   await present(this,p,null,targets,{skill:SKILL_TEXT[req.tag][0]});
 }
 return result;
};
const askSkill=Game.prototype.askSkill;
Game.prototype.askSkill=async function(p,id,ctx,event){const end=startWaiting(this,p,{kind:'confirm',skill:id});try{return await askSkill.call(this,p,id,ctx,event);}finally{end();}};

// Private identity notes are intentionally stored outside Player.identity and AI.
const notes=new WeakMap();
let noteMenu=null;
function noteFor(p){return notes.get(p)||'';}
function addIdentityNotes(g){
 for(const p of g.players){
  const host=UI.elOf(p);if(!host)continue;
  host.querySelector('.identity-note')?.remove();
  const b=p.isHuman?(host.querySelector('.self-id')||U.$('selfGeneral').querySelector('.self-id')):host.querySelector('.s-id');
  if(!b)continue;
  if(p.isHuman&&b.parentElement!==host)host.appendChild(b);
  b.setAttribute('role','button');b.tabIndex=0;b.setAttribute('aria-label',`标记${p.name}的身份`);
  const paint=()=>{const id=noteFor(p),known=p.isHuman||p.idShown;b.textContent=id?`记·${IDENTITY[id].name}`:known?IDENTITY[p.identity].name:'身份未知';b.dataset.identity=id;b.dataset.noteControl='true';b.title=(known?'已公开身份：'+IDENTITY[p.identity].name+'。':'')+'点击设置个人身份标记';};paint();
  b.onclick=ev=>{
    ev.stopPropagation();noteMenu?.remove();
    const menu=U.el('div','identity-menu');noteMenu=menu;menu.setAttribute('role','dialog');menu.setAttribute('aria-label',`${p.name}的身份备注`);
    const heading=U.el('div','identity-menu-title');heading.textContent=`${p.name} · 个人标记`;menu.appendChild(heading);
    for(const id of ['fan','zhong','nei','zhu','']){
      const option=U.el('button',null,id?IDENTITY[id].name:'清除标记');option.onclick=e=>{e.stopPropagation();if(id)notes.set(p,id);else notes.delete(p);paint();menu.remove();noteMenu=null;};menu.appendChild(option);
    }
    document.body.appendChild(menu);const rect=b.getBoundingClientRect();
    menu.style.left=Math.max(8,Math.min(innerWidth-menu.offsetWidth-8,rect.left))+'px';
    menu.style.top=(rect.bottom+menu.offsetHeight+8>innerHeight?Math.max(8,rect.top-menu.offsetHeight-5):rect.bottom+5)+'px';
  };b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();b.click();}};
 }
}
document.addEventListener('click',e=>{if(noteMenu&&!noteMenu.contains(e.target)){noteMenu.remove();noteMenu=null;}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){noteMenu?.remove();noteMenu=null;}});
const build=UI.build;
UI.build=function(g){wipeRoutes();requestStack=[];noteMenu?.remove();noteMenu=null;stage().replaceChildren();build(g);addIdentityNotes(g);};
const refresh=UI.refresh;
UI.refresh=function(g){refresh(g);if(g)addIdentityNotes(g);};
window.addEventListener('resize',()=>{wipeRoutes();noteMenu?.remove();noteMenu=null;});

const embers=U.$('battleEmbers');
for(let i=0;i<22;i++){const e=U.el('i','ember');e.style.cssText=`--x:${(i*43)%100}%;--size:${2+i%3}px;--life:${9+i%9}s;--delay:-${i*1.7}s`;embers.appendChild(e);}
})();
