/* ================= 通用工具 ================= */
const U = {
  speed: 0.62,
  /* 按动画速度缩放的等待 */
  wait(ms){ return new Promise(r=>setTimeout(r, Math.max(0, ms*U.speed))); },
  /* 不受速度影响的等待 */
  hardWait(ms){ return new Promise(r=>setTimeout(r, ms)); },
  rand(n){ return Math.floor(Math.random()*n); },
  pick(arr){ return arr[U.rand(arr.length)]; },
  shuffle(arr){
    for(let i=arr.length-1;i>0;i--){ const j=U.rand(i+1); [arr[i],arr[j]]=[arr[j],arr[i]]; }
    return arr;
  },
  /* 从数组中取 n 个不重复元素 */
  sample(arr,n){ return U.shuffle(arr.slice()).slice(0,n); },
  clamp(v,a,b){ return v<a?a:(v>b?b:v); },
  sum(arr,f){ return arr.reduce((s,x)=>s+(f?f(x):x),0); },
  max(arr,f){ let b=null,bv=-Infinity; for(const x of arr){ const v=f(x); if(v>bv){bv=v;b=x;} } return b; },
  el(tag,cls,html){
    const e=document.createElement(tag);
    if(cls) e.className=cls;
    if(html!=null) e.innerHTML=html;
    return e;
  },
  $(id){ return document.getElementById(id); },
  /* 元素中心点（视口坐标） */
  center(el){
    if(!el) return {x:innerWidth/2,y:innerHeight/2};
    const r=el.getBoundingClientRect();
    return {x:r.left+r.width/2, y:r.top+r.height/2};
  },
  escape(s){ return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); },
};

/* 可取消的延迟 Promise，配合 AI 思考时间 */
class Deferred {
  constructor(){ this.promise = new Promise((res,rej)=>{ this.resolve=res; this.reject=rej; }); }
}
