/* Transient skill descriptions, independent of pending game requests. */
(()=>{
// A single transient tooltip; never replace active-skill click handlers.
const tip=U.el('aside','skill-tooltip hidden');tip.id='skillTooltip';tip.setAttribute('role','tooltip');
document.body.appendChild(tip);
let anchor=null,anchorKey=null;
function hide(){tip.classList.add('hidden');anchor?.removeAttribute('aria-describedby');anchor=null;anchorKey=null;}
function show(tag,p,id){
 hide();anchor=tag;anchorKey={seat:p.seat,id};tag.setAttribute('aria-describedby','skillTooltip');tip.replaceChildren();
 tip.appendChild(U.el('h3',null,SKILL_TEXT[id]?.[0]||id));
 tip.appendChild(U.el('p',null,SKILL_TEXT[id]?.[1]||'暂无说明'));
 if(SKILLS[id]?.lord&&p.identity!=='zhu')tip.appendChild(U.el('small',null,'此角色不是主公，此主公技不生效。'));
 if(p.marks.formSkill===id)tip.appendChild(U.el('small',null,'当前化身获得的技能'));
 tip.classList.remove('hidden');
 const r=tag.getBoundingClientRect(),w=tip.offsetWidth,h=tip.offsetHeight;
 tip.style.left=Math.max(10,Math.min(innerWidth-w-10,r.left+r.width/2-w/2))+'px';
 tip.style.top=Math.max(10,r.bottom+h+18<innerHeight?r.bottom+10:r.top-h-10)+'px';
}
function attach(g){
 /* 刷新会重建技能标签，把鼠标正悬停的那个元素换掉。记住是谁的哪个技能，
    重新绑定后挂回新元素，否则手牌动画一刷新说明就消失了。 */
 const stale = anchor && !anchor.isConnected ? anchorKey : null;
 if(stale) hide();
 for(const p of g.players){const host=UI.elOf(p);if(!host)continue;
  host.querySelector('.skill-inspect')?.remove();
  [...host.querySelectorAll('.s-sk,.gc-sk')].forEach((tag,i)=>{
   const id=p.skills[i];if(!id)return;tag.removeAttribute('title');
   tag.tabIndex=0;
   tag.onmouseenter=()=>show(tag,p,id);tag.onmouseleave=hide;
   tag.onfocus=()=>show(tag,p,id);tag.onblur=hide;
  });
 }
 if(stale){
  const owner=g.players.find(x=>x.seat===stale.seat);
  const host=owner&&UI.elOf(owner);
  const idx=owner?owner.skills.indexOf(stale.id):-1;
  const tag=idx>=0&&host?host.querySelectorAll('.s-sk,.gc-sk')[idx]:null;
  if(tag&&tag.matches(':hover'))show(tag,owner,stale.id);
 }
}
const build=UI.build;UI.build=function(g){hide();build(g);attach(g);};
const refresh=UI.refresh;UI.refresh=function(g){refresh(g);if(g)attach(g);};
document.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});
window.addEventListener('resize',hide);
/* 只有滚动的容器包含锚点时，锚点才会真的移动。战报每写一行都会把 #logBody
   滚到底并触发 scroll，若一律隐藏，别人一出牌技能说明就没了。 */
document.addEventListener('scroll',e=>{
 if(!anchor)return;
 const t=e.target;
 if(t===document||t===document.documentElement||t===document.body||(t&&t.contains&&t.contains(anchor)))hide();
},true);

// Detailed choice cards (Huashen): a description and a deliberate select button
// for every option, with no hidden hover-only information.
const request=UI.request;
UI.request=function(g,p,req){
 if(req.kind!=='choose'||!req.optionDetails)return request(g,p,req);
 return new Promise(resolve=>{
   const modal=U.$('modal'),body=U.$('modalBody'),foot=U.$('modalFoot');
   U.$('modalTitle').textContent=req.prompt||'选择技能';body.replaceChildren();foot.replaceChildren();body.classList.add('skill-choice-grid');
   for(const option of req.options){const detail=req.optionDetails[option];const a=U.el('article','skill-choice');
     a.appendChild(U.el('h3',null,option));
     if(detail?.general)a.appendChild(U.el('div','skill-choice-meta',detail.general));
     a.appendChild(U.el('p',null,detail?.description||''));
     const button=U.el('button',null,'选择 '+option);button.onclick=()=>{modal.classList.add('hidden');body.classList.remove('skill-choice-grid');resolve(option);};a.appendChild(button);body.appendChild(a);
   }
   modal.classList.remove('hidden');
 });
};
})();
