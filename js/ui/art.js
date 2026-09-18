/* ================= 程序化美术（SVG · 水墨古风） =================
   卡牌插画与武将立绘全部用 SVG 生成，无外部素材依赖。
   若想换成自己的图片，编辑 assets/manifest.js 即可（见该文件说明）。
*/
const Art = (()=>{

/* ---------------- 外部素材接入 ---------------- */
const probeCache = new Map();
function probe(src){
  if(probeCache.has(src)) return probeCache.get(src);
  const p = new Promise(res=>{
    const im = new Image();
    im.onload = ()=>res(true); im.onerror = ()=>res(false);
    im.src = src;
  });
  probeCache.set(src,p); return p;
}
async function bindImage(el, dir, key){
  if(!el) return false;
  const M = (typeof ASSETS!=='undefined') ? ASSETS : null;
  if(!M) return false;
  const explicit = (M[dir]||{})[key];
  if(explicit && typeof explicit==='object'){
    if(!await probe(explicit.src)) return false;
    const {src,x,y,cols,rows}=explicit;
    el.style.backgroundImage=`url("${src}")`;
    // Preserve each painted cell's aspect ratio rather than stretching a
    // square face to fit a tall general card or a wide opponent seat.
    const im=new Image();im.src=src;await im.decode();
    const cellW=im.naturalWidth/cols,cellH=im.naturalHeight/rows;
    const applyCrop=()=>{
      const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;
      const scale=Math.max(w/cellW,h/cellH);
      el.style.backgroundSize=`${im.naturalWidth*scale}px ${im.naturalHeight*scale}px`;
      el.style.backgroundPosition=`${-x*cellW*scale+(w-cellW*scale)/2}px ${-y*cellH*scale+(h-cellH*scale)*0.22}px`;
    };
    applyCrop();
    if(typeof ResizeObserver!=='undefined'){
      const observer=new ResizeObserver(()=>{if(!el.isConnected){observer.disconnect();return;}applyCrop();});
      observer.observe(el);
    }
    (el.closest('.card,.gcard,.seat')||el).classList.add('img-bg');
    return true;
  }
  let src = explicit;
  if(!src && M.autoProbe){
    for(const ext of (M.extensions||['png','jpg','jpeg','webp'])){
      const t = `assets/${dir}/${encodeURIComponent(key)}.${ext}`;
      if(await probe(t)){ src = t; break; }
    }
  }
  if(!src) return false;
  if(!await probe(src)) return false;
  el.style.backgroundImage = `url("${src}")`;
  (el.closest('.card,.gcard,.seat')||el).classList.add('img-bg');
  return true;
}

/* ================= 通用绘制零件 ================= */
const W = 200, H = 278;                       // 卡牌插画画布
let _uid = 0;
const uid = ()=>'a'+(++_uid);

/* 水墨底景：天空 / 日月 / 远山 / 云雾 / 近景 */
function scene(o){
  const id = uid();
  const hue = o.hue!=null ? o.hue : 30;
  const sky1 = o.sky1 || `hsl(${hue} 30% 78%)`;
  const sky2 = o.sky2 || `hsl(${hue} 26% 46%)`;
  const far  = o.far  || `hsl(${hue} 22% 40%)`;
  const mid  = o.mid  || `hsl(${hue} 24% 26%)`;
  const near = o.near || `hsl(${hue} 28% 14%)`;
  const disc = o.disc==null ? true : o.disc;
  return `
  <defs>
    <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0"   stop-color="${sky1}"/>
      <stop offset=".55" stop-color="${sky2}"/>
      <stop offset="1"   stop-color="${near}"/>
    </linearGradient>
    <radialGradient id="${id}g" cx=".5" cy=".3" r=".7">
      <stop offset="0" stop-color="#fff6dd" stop-opacity=".55"/>
      <stop offset="1" stop-color="#fff6dd" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${id}m" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".22"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#${id}s)"/>
  ${disc?`<circle cx="${o.dx||142}" cy="${o.dy||54}" r="${o.dr||26}" fill="${o.dc||'#fdf0cf'}" opacity=".85"/>
          <circle cx="${o.dx||142}" cy="${o.dy||54}" r="${(o.dr||26)+14}" fill="url(#${id}g)"/>`:''}
  <!-- 远山 -->
  <path d="M0 ${o.h1||120} L26 ${(o.h1||120)-26} L48 ${(o.h1||120)-6} L74 ${(o.h1||120)-34}
           L104 ${(o.h1||120)-4} L132 ${(o.h1||120)-30} L164 ${(o.h1||120)-8} L200 ${(o.h1||120)-24}
           L200 ${H} L0 ${H} Z" fill="${far}" opacity=".55"/>
  <!-- 中山 -->
  <path d="M0 ${o.h2||160} L34 ${(o.h2||160)-30} L64 ${(o.h2||160)-8} L96 ${(o.h2||160)-40}
           L128 ${(o.h2||160)-10} L162 ${(o.h2||160)-28} L200 ${(o.h2||160)-4}
           L200 ${H} L0 ${H} Z" fill="${mid}" opacity=".8"/>
  <!-- 云雾 -->
  <g opacity=".5">
    <ellipse cx="46"  cy="${(o.h2||160)-14}" rx="62" ry="9"  fill="url(#${id}m)"/>
    <ellipse cx="150" cy="${(o.h2||160)+4}"  rx="70" ry="11" fill="url(#${id}m)"/>
  </g>
  <!-- 近景 -->
  <path d="M0 ${o.h3||230} C40 ${(o.h3||230)-16} 74 ${(o.h3||230)+8} 112 ${(o.h3||230)-8}
           C150 ${(o.h3||230)-24} 176 ${(o.h3||230)+4} 200 ${(o.h3||230)-10}
           L200 ${H} L0 ${H} Z" fill="${near}"/>`;
}
/* 顶部压暗 + 四角暗角，让文字压得住 */
function vignette(){
  const id=uid();
  return `<defs>
    <radialGradient id="${id}v" cx=".5" cy=".42" r=".78">
      <stop offset=".55" stop-color="#000" stop-opacity="0"/>
      <stop offset="1"   stop-color="#000" stop-opacity=".52"/>
    </radialGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#${id}v)"/>`;
}
/* 墨点飞溅 */
function splatter(n, col, op){
  let s='';
  for(let i=0;i<n;i++){
    const x=10+((i*67)%180), y=30+((i*97)%220), r=0.8+((i*13)%7)/4;
    s+=`<circle cx="${x}" cy="${y}" r="${r}" fill="${col||'#1a120a'}" opacity="${op||.28}"/>`;
  }
  return s;
}
/* 祥云 */
function cloud(x,y,s,col,op){
  return `<g transform="translate(${x} ${y}) scale(${s})" opacity="${op||.5}" fill="${col||'#fff'}">
    <path d="M0 0 C0 -9 10 -13 15 -8 C18 -18 34 -17 36 -7 C46 -9 50 0 42 4 L2 4 Z"/>
    <path d="M6 6 C2 6 0 10 4 11 L38 11 C43 10 42 6 38 6 Z" opacity=".75"/></g>`;
}
const wrapArt = inner => `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${inner}</svg>`;

/* ================= 卡牌插画 ================= */
const GOLD='#e6c574', IVORY='#f6ecd6', STEEL='#cfd8e2', DARK='#1c140c', BLOOD='#b8342a';

/* 通用：握刀的剪影武将 */
function warrior(x,y,s,col,accent){
  return `<g transform="translate(${x} ${y}) scale(${s})" fill="${col}">
    <path d="M0 0 C-16 0 -26 14 -28 34 L-34 72 L34 72 L28 34 C26 14 16 0 0 0 Z"/>
    <path d="M-30 20 C-40 26 -44 40 -42 54 L-30 52 Z"/>
    <path d="M30 20 C40 26 44 40 42 54 L30 52 Z"/>
    <circle cx="0" cy="-14" r="16"/>
    <path d="M-18 -18 C-18 -34 18 -34 18 -18 L14 -22 C8 -28 -8 -28 -14 -22 Z" fill="${accent||col}"/>
    <path d="M0 -34 L4 -46 L-4 -46 Z" fill="${accent||col}"/>
  </g>`;
}

const CARD_ART = {

'杀':()=>wrapArt(`${scene({hue:8,sky1:'#f0c9a8',sky2:'#a8402f',near:'#2a0d08',far:'#7d2a20',mid:'#4a1611',dc:'#ffd9a0',dx:52,dy:48,dr:22})}
  ${cloud(120,70,1.1,'#ffd9b0',.35)}${cloud(24,96,.8,'#ffd9b0',.25)}
  ${warrior(102,100,1.0,'#150a06','#3a1a10')}
  <!-- 刀光 -->
  <path d="M16 160 C54 120 108 76 178 32" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" opacity=".92"/>
  <path d="M16 160 C54 120 108 76 178 32" stroke="#ffb27a" stroke-width="15" fill="none" stroke-linecap="round" opacity=".38"/>
  <path d="M152 46 L188 24 L180 60 Z" fill="${IVORY}"/>
  ${splatter(14,'#c0392b',.45)}
  ${vignette()}`),

'闪':()=>wrapArt(`${scene({hue:205,sky1:'#dbeafc',sky2:'#3f6fa8',near:'#0d1a2a',far:'#2f5a86',mid:'#1b3350',dc:'#eaf6ff',dx:150,dy:48,dr:20})}
  ${cloud(40,84,1,'#dff0ff',.4)}
  <!-- 飘带闪避 -->
  <path d="M22 192 C64 160 56 116 100 90 C136 68 144 38 136 12"
        stroke="#bfe4ff" stroke-width="12" fill="none" stroke-linecap="round" opacity=".75"/>
  <path d="M22 192 C64 160 56 116 100 90 C136 68 144 38 136 12"
        stroke="#ffffff" stroke-width="4" fill="none" stroke-linecap="round"/>
  ${warrior(98,114,.9,'#0c1622','#1d3348')}
  <!-- 被弹开的箭 -->
  <g stroke="#e8dcc0" stroke-width="3">
    <line x1="186" y1="114" x2="140" y2="94"/><line x1="182" y1="148" x2="142" y2="122"/>
  </g>
  <path d="M140 94 L128 90 L140 84 Z" fill="${IVORY}"/>
  <circle cx="116" cy="96" r="26" fill="none" stroke="#9fd8ff" stroke-width="3" opacity=".85"/>
  <circle cx="116" cy="96" r="36" fill="none" stroke="#9fd8ff" stroke-width="1.6" opacity=".45"/>
  ${vignette()}`),

'桃':()=>wrapArt(`${scene({hue:344,sky1:'#ffe4ea',sky2:'#d9748c',near:'#3a1420',far:'#b0576c',mid:'#7d3348',dc:'#fff0f4',dx:48,dy:50,dr:20})}
  <!-- 枝干 -->
  <path d="M2 208 C40 180 52 144 86 124 C118 104 150 108 186 92"
        stroke="#4a2b1c" stroke-width="9" fill="none" stroke-linecap="round"/>
  <path d="M86 124 C96 100 92 78 78 62" stroke="#4a2b1c" stroke-width="5" fill="none" stroke-linecap="round"/>
  <!-- 花 -->
  ${[[62,92],[104,112],[150,96],[86,70],[176,80],[40,120],[128,136]].map(([x,y],i)=>
    `<g transform="translate(${x} ${y})">
      ${[0,72,144,216,288].map(a=>`<ellipse cx="0" cy="-6" rx="4.6" ry="6.4" fill="${i%2?'#ffd2dd':'#ffbccd'}" transform="rotate(${a})"/>`).join('')}
      <circle r="2.2" fill="#ffe9a0"/></g>`).join('')}
  <!-- 桃 -->
  <g transform="translate(120 152)">
    <path d="M0 34 C-30 22 -38 -4 -22 -20 C-12 -30 2 -26 6 -14 C12 -28 30 -30 38 -16 C50 4 32 26 0 34 Z" fill="#ec6f88"/>
    <path d="M6 -14 C12 -28 30 -30 38 -16 C43 -8 42 2 38 10 C26 -6 14 -12 6 -14 Z" fill="#ff9fb2"/>
    <path d="M-2 -22 C-6 -34 -16 -40 -26 -37 C-16 -33 -10 -28 -6 -20 Z" fill="#54a85e"/>
  </g>
  ${splatter(10,'#ffffff',.35)}
  ${vignette()}`),

'酒':()=>wrapArt(`${scene({hue:32,sky1:'#f7ddb0',sky2:'#9c6a2e',near:'#2a1708',far:'#7d5320',mid:'#4f3312',dc:'#ffeec4',dx:150,dy:50,dr:18})}
  ${cloud(38,80,.9,'#ffe6bb',.3)}
  <!-- 酒坛 -->
  <g transform="translate(68 144)">
    <path d="M-26 -52 C-34 -30 -36 -6 -26 10 C-14 24 14 24 26 10 C36 -6 34 -30 26 -52 Z" fill="#4a3320"/>
    <path d="M-26 -52 C-34 -30 -36 -6 -26 10 C-20 16 -12 20 -4 21 C-14 2 -16 -26 -8 -52 Z" fill="#6b4a2c"/>
    <rect x="-16" y="-62" width="32" height="12" rx="3" fill="#8a6234"/>
    <path d="M-18 -50 H18" stroke="#c9a06a" stroke-width="3"/>
    <text x="0" y="-16" font-size="20" fill="#e6c574" text-anchor="middle" font-weight="700">酒</text>
  </g>
  <!-- 酒爵 -->
  <g transform="translate(150 156)">
    <path d="M-20 -26 H20 L12 0 H-12 Z" fill="#d8c08a"/>
    <path d="M-17 -22 H17 L11 -4 H-11 Z" fill="#8f3a24"/>
    <rect x="-3" y="0" width="6" height="16" fill="#d8c08a"/>
    <path d="M-14 16 H14 L18 22 H-18 Z" fill="#d8c08a"/>
    <path d="M-20 -26 L-24 -34 M20 -26 L24 -34" stroke="#d8c08a" stroke-width="3"/>
  </g>
  ${splatter(12,'#ffdba0',.3)}
  ${vignette()}`),

'无懈可击':()=>wrapArt(`${scene({hue:214,sky1:'#dde8f8',sky2:'#3c5f92',near:'#0c1420',far:'#2e4d75',mid:'#1a2f4c',dc:'#eef6ff',dx:100,dy:96,dr:44})}
  <!-- 护盾 -->
  <g transform="translate(100 112)">
    <path d="M0 -76 L64 -52 V-8 C64 34 36 62 0 76 C-36 62 -64 34 -64 -8 V-52 Z" fill="#c9d8ea"/>
    <path d="M0 -66 L54 -45 V-8 C54 28 30 52 0 64 C-30 52 -54 28 -54 -8 V-45 Z" fill="#2f5384"/>
    <path d="M0 -56 L44 -38 V-8 C44 22 24 44 0 54 C-24 44 -44 22 -44 -8 V-38 Z" fill="none" stroke="${GOLD}" stroke-width="2.4"/>
    <path d="M-10 -28 H10 V-8 H30 V12 H10 V32 H-10 V12 H-30 V-8 H-10 Z" fill="${IVORY}"/>
  </g>
  <circle cx="100" cy="112" r="84" fill="none" stroke="#8fc4ff" stroke-width="2" opacity=".5"/>
  <circle cx="100" cy="112" r="94" fill="none" stroke="#8fc4ff" stroke-width="1" opacity=".28"/>
  ${vignette()}`),

'无中生有':()=>wrapArt(`${scene({hue:44,sky1:'#fbf0cd',sky2:'#9e7d33',near:'#241a08',far:'#7f6526',mid:'#4f3d14',disc:false})}
  <!-- 灵光漩涡 -->
  <g transform="translate(100 106)">
    ${[0,1,2,3,4,5].map(i=>`<ellipse rx="${76-i*10}" ry="${30-i*4}" fill="none"
        stroke="${GOLD}" stroke-width="1.6" opacity="${.22+i*.09}" transform="rotate(${i*30})"/>`).join('')}
    <path d="M0 -62 L12 -18 L58 -6 L12 6 L0 52 L-12 6 L-58 -6 L-12 -18 Z" fill="#fff4d0"/>
    <circle r="13" fill="#fffaf0"/>
  </g>
  <!-- 托起的双手 -->
  <path d="M52 182 C52 154 68 142 84 146 L92 162 L76 186 Z" fill="#d9ab7c"/>
  <path d="M148 182 C148 154 132 142 116 146 L108 162 L124 186 Z" fill="#d9ab7c"/>
  ${splatter(16,'#ffe8a8',.5)}
  ${vignette()}`),

'过河拆桥':()=>wrapArt(`${scene({hue:200,sky1:'#d7e6f2',sky2:'#4c6e88',near:'#101c26',far:'#39586e',mid:'#20384a',dc:'#e8f4ff',dx:48,dy:46,dr:18,h3:246})}
  <!-- 河水 -->
  <rect y="148" width="200" height="130" fill="#1d3b4f"/>
  ${[0,1,2,3].map(i=>`<path d="M0 ${160+i*13} C40 ${156+i*13} 60 ${166+i*13} 100 ${162+i*13}
      C140 ${158+i*13} 160 ${168+i*13} 200 ${164+i*13}" stroke="#4e7d9a" stroke-width="2" fill="none" opacity=".7"/>`).join('')}
  <!-- 断桥 -->
  <path d="M-4 118 C22 94 48 88 72 92 L72 110 C50 108 28 114 -4 136 Z" fill="#8a7050"/>
  <path d="M204 118 C178 94 152 88 128 92 L128 110 C150 108 172 114 204 136 Z" fill="#8a7050"/>
  <rect x="6" y="134" width="12" height="34" fill="#5d4830"/>
  <rect x="182" y="134" width="12" height="34" fill="#5d4830"/>
  <!-- 断裂碎块 -->
  ${[[84,108,8],[96,122,6],[110,112,7],[100,138,5]].map(([x,y,r])=>
    `<path d="M${x} ${y} l${r} ${r/2} l${-r/2} ${r} l${-r} ${-r/3} Z" fill="#9c8058"/>`).join('')}
  <!-- 斧 -->
  <g transform="translate(100 70) rotate(24)">
    <rect x="-3" y="-8" width="6" height="66" fill="#6b4a2c"/>
    <path d="M-4 -34 C-30 -34 -34 -6 -4 -6 Z" fill="${STEEL}"/>
    <path d="M4 -34 C30 -34 34 -6 4 -6 Z" fill="#a8b6c4"/>
  </g>
  ${vignette()}`),

'顺手牵羊':()=>wrapArt(`${scene({hue:96,sky1:'#e8f2d4',sky2:'#5f7a3e',near:'#141c0c',far:'#4b6630',mid:'#2c3d1a',dc:'#f4ffe0',dx:154,dy:46,dr:18})}
  ${cloud(38,74,.9,'#f0ffd8',.35)}
  <!-- 羊 -->
  <g transform="translate(94 136)">
    <ellipse cx="0" cy="0" rx="46" ry="30" fill="#efe9dc"/>
    ${[[-34,-16],[-16,-24],[4,-26],[24,-20],[38,-6],[-40,2],[34,12],[0,18],[-20,16]].map(([x,y])=>
      `<circle cx="${x}" cy="${y}" r="11" fill="#f7f3ea"/>`).join('')}
    <ellipse cx="-48" cy="-16" rx="15" ry="12" fill="#e2d8c4"/>
    <path d="M-58 -26 C-70 -32 -72 -18 -60 -16 Z" fill="#c9bda6"/>
    <path d="M-44 -30 C-50 -42 -62 -42 -60 -30 Z" fill="#b8ac95"/>
    <circle cx="-54" cy="-16" r="2.4" fill="#2a2018"/>
    <rect x="-30" y="26" width="7" height="22" fill="#a89a80"/>
    <rect x="-4"  y="28" width="7" height="20" fill="#a89a80"/>
    <rect x="26"  y="24" width="7" height="24" fill="#a89a80"/>
  </g>
  <!-- 牵绳的手 -->
  <path d="M150 62 C168 58 186 74 184 94 C182 112 166 118 152 110 L140 96 Z" fill="#dbab7b"/>
  <path d="M148 104 C132 116 114 126 98 132" stroke="#c0392b" stroke-width="3.4" fill="none"/>
  ${vignette()}`),

'决斗':()=>wrapArt(`${scene({hue:18,sky1:'#f6d9b4',sky2:'#9c4a24',near:'#281006',far:'#7a3216',mid:'#4c1d0c',dc:'#ffe2b0',dx:100,dy:52,dr:30})}
  ${warrior(52,116,.86,'#170a04','#3a1608')}
  ${warrior(148,116,.86,'#170a04','#3a1608')}
  <!-- 交叉长兵 -->
  <g stroke-linecap="round">
    <line x1="26" y1="180" x2="176" y2="48" stroke="#7a5a34" stroke-width="7"/>
    <line x1="174" y1="180" x2="24" y2="48" stroke="#7a5a34" stroke-width="7"/>
  </g>
  <path d="M176 48 L194 30 L182 58 Z" fill="${IVORY}"/>
  <path d="M24 48 L6 30 L18 58 Z" fill="${IVORY}"/>
  <g transform="translate(100 118)">
    <circle r="22" fill="#fff3d0" opacity=".9"/>
    <circle r="34" fill="#ffb066" opacity=".35"/>
    ${[0,45,90,135,180,225,270,315].map(a=>
      `<path d="M0 -30 L4 -46 L-4 -46 Z" fill="#ffd79a" transform="rotate(${a})" opacity=".8"/>`).join('')}
  </g>
  ${vignette()}`),

'借刀杀人':()=>wrapArt(`${scene({hue:268,sky1:'#ded4f0',sky2:'#4a3a72',near:'#150f24',far:'#3b2e5c',mid:'#241c3c',dc:'#efe6ff',dx:150,dy:46,dr:18})}
  <!-- 递刀的手 -->
  <path d="M6 142 C6 116 26 102 48 108 L60 132 L36 162 Z" fill="#d9ab7c"/>
  <path d="M194 162 C194 136 174 122 152 128 L140 152 L164 182 Z" fill="#c9976c"/>
  <!-- 刀 -->
  <g transform="translate(100 108) rotate(-24)">
    <path d="M-66 8 C-20 -4 34 -14 76 -20 L80 -10 C38 -2 -16 10 -64 20 Z" fill="${STEEL}"/>
    <path d="M-66 8 C-20 -4 34 -14 76 -20 L78 -15 C36 -8 -18 4 -65 14 Z" fill="#f2f6fb"/>
    <rect x="-88" y="2" width="26" height="12" rx="3" fill="#6b4a2c"/>
    <rect x="-66" y="-2" width="7" height="22" rx="2" fill="${GOLD}"/>
  </g>
  <!-- 背后的影子目标 -->
  ${warrior(100,176,.6,'#0e0a18','#1c1430')}
  ${splatter(10,'#c0392b',.4)}
  ${vignette()}`),

'南蛮入侵':()=>wrapArt(`${scene({hue:118,sky1:'#dceccb',sky2:'#3f6634',near:'#0f1a0c',far:'#33562a',mid:'#1d3418',disc:false})}
  <!-- 藤蔓 -->
  ${[14,60,140,186].map((x,i)=>`<path d="M${x} 278 C${x-14} 220 ${x+16} 170 ${x-6} 110"
      stroke="#2c4a22" stroke-width="4" fill="none" opacity=".8"/>`).join('')}
  <!-- 蛮族面具 -->
  <g transform="translate(100 102)">
    <path d="M0 -62 C40 -62 58 -30 58 6 C58 46 32 72 0 72 C-32 72 -58 46 -58 6 C-58 -30 -40 -62 0 -62 Z" fill="#7d4a26"/>
    <path d="M0 -54 C34 -54 50 -26 50 6 C50 40 28 62 0 62 C-28 62 -50 40 -50 6 C-50 -26 -34 -54 0 -54 Z" fill="#96602f"/>
    <path d="M-40 -18 C-30 -30 -14 -30 -8 -18 C-16 -10 -32 -10 -40 -18 Z" fill="${IVORY}"/>
    <path d="M40 -18 C30 -30 14 -30 8 -18 C16 -10 32 -10 40 -18 Z" fill="${IVORY}"/>
    <circle cx="-24" cy="-18" r="5" fill="#1a1008"/><circle cx="24" cy="-18" r="5" fill="#1a1008"/>
    <path d="M-34 22 H34 L26 44 H-26 Z" fill="${IVORY}"/>
    ${[-20,-8,4,16].map(x=>`<line x1="${x}" y1="22" x2="${x-2}" y2="44" stroke="#96602f" stroke-width="2.6"/>`).join('')}
    <path d="M-58 -30 L-84 -58 L-66 -22 Z" fill="#b8342a"/>
    <path d="M58 -30 L84 -58 L66 -22 Z" fill="#b8342a"/>
    <path d="M-12 -58 L0 -80 L12 -58 Z" fill="#d8b44a"/>
  </g>
  <!-- 长矛林 -->
  ${[26,52,148,174].map(x=>`<g><line x1="${x}" y1="230" x2="${x+8}" y2="122" stroke="#5d4326" stroke-width="4"/>
    <path d="M${x+8} 122 L${x+14} 102 L${x+2} 104 Z" fill="${STEEL}"/></g>`).join('')}
  ${vignette()}`),

'万箭齐发':()=>wrapArt(`${scene({hue:220,sky1:'#e2e9f5',sky2:'#3c4e72',near:'#0c1120',far:'#2e3e60',mid:'#1a2440',dc:'#f0f4ff',dx:44,dy:44,dr:16})}
  ${[0,1,2,3,4,5,6,7,8,9,10].map(i=>{
    const y=14+i*16, off=(i%3)*14;
    return `<g transform="translate(${-10+off} ${y}) rotate(${10+(i%4)*3})">
      <line x1="0" y1="0" x2="150" y2="0" stroke="#d8c8a4" stroke-width="2.6"/>
      <path d="M150 -5 L168 0 L150 5 Z" fill="${IVORY}"/>
      <path d="M0 -6 L14 0 L0 6 Z" fill="#b8342a" opacity=".9"/>
      <line x1="4" y1="-5" x2="14" y2="0" stroke="#e8dcc0" stroke-width="1.4"/></g>`;}).join('')}
  <path d="M0 250 C46 238 74 252 106 244 C142 235 168 250 200 242 L200 278 L0 278 Z" fill="#090d18"/>
  ${warrior(46,204,.46,'#050810','#0c1220')}
  ${warrior(150,208,.44,'#050810','#0c1220')}
  ${vignette()}`),

'桃园结义':()=>wrapArt(`${scene({hue:344,sky1:'#ffe8ee',sky2:'#c4657e',near:'#33101c',far:'#a85068',mid:'#742f42',dc:'#fff2f6',dx:100,dy:44,dr:22})}
  <!-- 桃树 -->
  <path d="M-6 236 C22 186 12 142 46 114" stroke="#4a2b1c" stroke-width="10" fill="none"/>
  <path d="M206 236 C178 186 188 142 154 114" stroke="#4a2b1c" stroke-width="10" fill="none"/>
  ${[[30,84],[62,64],[96,50],[136,64],[170,84],[14,112],[186,112],[100,84]].map(([x,y],i)=>
    `<circle cx="${x}" cy="${y}" r="${16-(i%3)*3}" fill="${i%2?'#ffc3d2':'#ff9fb6'}" opacity=".92"/>`).join('')}
  <!-- 三兄弟 -->
  ${warrior(58,154,.7,'#2a0e14','#5a1c28')}
  ${warrior(100,144,.78,'#1e0810','#4a1420')}
  ${warrior(142,154,.7,'#2a0e14','#5a1c28')}
  <!-- 香案 -->
  <rect x="66" y="192" width="68" height="9" rx="2" fill="#6b4226"/>
  <rect x="94" y="174" width="12" height="18" rx="2" fill="#c9a06a"/>
  <path d="M100 174 C96 166 104 162 100 154" stroke="#ffe0b0" stroke-width="2" fill="none" opacity=".8"/>
  ${[[38,40],[162,48],[74,26],[130,32]].map(([x,y])=>
    `<g transform="translate(${x} ${y})">${[0,72,144,216,288].map(a=>
      `<ellipse cy="-4" rx="3" ry="4.4" fill="#ffd6e0" transform="rotate(${a})"/>`).join('')}</g>`).join('')}
  ${vignette()}`),

'五谷丰登':()=>wrapArt(`${scene({hue:44,sky1:'#fdf0c8',sky2:'#a8801f',near:'#2a1e06',far:'#8a6a18',mid:'#55400e',dc:'#fff8d8',dx:150,dy:44,dr:22})}
  ${cloud(40,72,.9,'#fff0c0',.35)}
  <!-- 麦浪 -->
  ${Array.from({length:13},(_,i)=>{
    const x=6+i*16, h=90+((i*37)%40);
    return `<g transform="translate(${x} 196)">
      <path d="M0 0 C-3 -${h*0.6} 3 -${h*0.8} 0 -${h}" stroke="#d8ab3c" stroke-width="2.6" fill="none"/>
      ${[0,1,2,3,4].map(j=>`<ellipse cx="${(j%2?4:-4)}" cy="${-h+14+j*13}" rx="4.2" ry="7"
        fill="#f0c94e" transform="rotate(${j%2?20:-20} 0 ${-h+14+j*13})"/>`).join('')}</g>`;}).join('')}
  <!-- 谷筐 -->
  <g transform="translate(100 162)">
    <path d="M-52 -18 L52 -18 L40 26 L-40 26 Z" fill="#8a5f2c"/>
    ${[-30,-12,6,24].map(x=>`<line x1="${x}" y1="-18" x2="${x-4}" y2="26" stroke="#6b4622" stroke-width="3"/>`).join('')}
    <ellipse cy="-18" rx="52" ry="11" fill="#f0c94e"/>
    <ellipse cy="-22" rx="40" ry="8" fill="#ffe08a"/>
  </g>
  ${splatter(14,'#ffe9a8',.4)}
  ${vignette()}`),

'乐不思蜀':()=>wrapArt(`${scene({hue:280,sky1:'#e6dcf4',sky2:'#5a4480',near:'#1a1230',far:'#493768',mid:'#2d2148',dc:'#f2e9ff',dx:44,dy:44,dr:18})}
  ${cloud(140,72,1,'#e8dcff',.35)}
  <!-- 琵琶 -->
  <g transform="translate(74 114) rotate(-18)">
    <path d="M0 -60 C16 -60 26 -40 26 -14 C26 20 14 46 0 46 C-14 46 -26 20 -26 -14 C-26 -40 -16 -60 0 -60 Z" fill="#a5702f"/>
    <path d="M0 -54 C12 -54 20 -36 20 -14 C20 16 10 40 0 40 C-10 40 -20 16 -20 -14 C-20 -36 -12 -54 0 -54 Z" fill="#c98f42"/>
    <rect x="-5" y="-84" width="10" height="26" rx="3" fill="#7d5324"/>
    <path d="M-6 -88 C-14 -94 -12 -102 -2 -98 Z" fill="#7d5324"/>
    ${[-6,-2,2,6].map(x=>`<line x1="${x}" y1="-60" x2="${x}" y2="34" stroke="#f0e2c0" stroke-width="1.1"/>`).join('')}
    <ellipse cy="6" rx="9" ry="7" fill="#5d3c18"/>
  </g>
  <!-- 酒与卧姿 -->
  <g transform="translate(152 154)">
    <path d="M-18 0 H18 L12 20 H-12 Z" fill="#d8c08a"/><path d="M-15 3 H15 L10 16 H-10 Z" fill="#8f3a24"/>
    <rect x="-3" y="20" width="6" height="12" fill="#d8c08a"/>
  </g>
  <path d="M16 192 C60 176 150 184 192 172" stroke="#6b5490" stroke-width="10" fill="none" opacity=".6"/>
  ${[[44,58],[126,68],[174,92]].map(([x,y],i)=>
    `<g transform="translate(${x} ${y})" opacity=".8"><text font-size="${16+i*3}" fill="#e8dcff">♪</text></g>`).join('')}
  ${vignette()}`),

'兵粮寸断':()=>wrapArt(`${scene({hue:36,sky1:'#f2dfba',sky2:'#7d5a2a',near:'#241706',far:'#66491c',mid:'#3d2a0e',disc:false})}
  <!-- 粮袋 -->
  <g transform="translate(94 136)">
    <path d="M-44 -52 C-44 -66 -26 -74 0 -74 C26 -74 44 -66 44 -52 L38 54 C38 66 -38 66 -38 54 Z" fill="#c9a86c"/>
    <path d="M-44 -52 C-44 -66 -26 -74 0 -74 C10 -74 20 -72 27 -69 C6 -64 -8 -58 -14 -48 Z" fill="#dbbd86"/>
    <rect x="-40" y="-14" width="80" height="18" fill="#7d5a2a"/>
    <text x="0" y="1" font-size="16" fill="#f0dcb0" text-anchor="middle" font-weight="700">粮</text>
  </g>
  <!-- 斩断的刀痕 -->
  <path d="M10 30 L190 154" stroke="#ffffff" stroke-width="6" opacity=".9" stroke-linecap="round"/>
  <path d="M10 30 L190 154" stroke="#cfd8e2" stroke-width="16" opacity=".22" stroke-linecap="round"/>
  <!-- 洒出的谷粒 -->
  ${Array.from({length:22},(_,i)=>{
    const x=52+((i*29)%110), y=164+((i*17)%42);
    return `<ellipse cx="${x}" cy="${y}" rx="3" ry="4.4" fill="#f0c94e" transform="rotate(${(i*37)%180} ${x} ${y})" opacity=".9"/>`;
  }).join('')}
  ${vignette()}`),

'闪电':()=>wrapArt(`${scene({hue:214,sky1:'#7d93b4',sky2:'#1b2740',near:'#060a14',far:'#22314e',mid:'#131c30',disc:false})}
  <g opacity=".55">${cloud(40,58,1.5,'#3d4a66',.9)}${cloud(126,44,1.7,'#2f3a52',.9)}${cloud(84,86,1.2,'#46536e',.8)}</g>
  <path d="M116 14 L60 106 H96 L74 190 L152 80 H108 Z" fill="#a8e2ff" opacity=".55"/>
  <path d="M112 18 L66 102 H98 L80 176 L144 82 H104 Z" fill="#e8f8ff"/>
  <path d="M110 28 L78 96 H100 L90 158 L132 86 H102 Z" fill="#ffffff"/>
  <circle cx="100" cy="98" r="70" fill="#9fdcff" opacity=".14"/>
  <circle cx="100" cy="98" r="108" fill="#9fdcff" opacity=".07"/>
  ${splatter(16,'#bfeaff',.4)}
  ${vignette()}`),

/* ---------- 装备 ---------- */
'诸葛连弩':()=>wrapArt(`${scene({hue:150,sky1:'#dceee2',sky2:'#3f6e52',near:'#0d1a12',far:'#345c44',mid:'#1d3728',dc:'#e8fff2',dx:150,dy:46,dr:16})}
  <g transform="translate(100 112)">
    <path d="M-72 -26 C-36 -50 36 -50 72 -26 L72 -14 C36 -38 -36 -38 -72 -14 Z" fill="#6b4a2c"/>
    <line x1="-72" y1="-20" x2="72" y2="-20" stroke="#efe4c8" stroke-width="2"/>
    <rect x="-13" y="-34" width="26" height="86" rx="4" fill="#8a6234"/>
    <rect x="-9"  y="-30" width="18" height="78" rx="3" fill="#a5793f"/>
    ${[-20,0,20,40].map(y=>`<g transform="translate(0 ${y})">
      <line x1="0" y1="0" x2="0" y2="-24" stroke="#d8c8a4" stroke-width="2.4"/>
      <path d="M0 -24 L5 -34 L-5 -34 Z" fill="${IVORY}"/></g>`).join('')}
    <rect x="-16" y="46" width="32" height="10" rx="3" fill="#5d4024"/>
  </g>
  ${vignette()}`),

'八卦阵':()=>wrapArt(`${scene({hue:200,sky1:'#dfeaf4',sky2:'#3d5d78',near:'#0c161e',far:'#2d4a60',mid:'#1a2d3c',disc:false})}
  <g transform="translate(100 106)">
    <circle r="74" fill="#f2e8cc"/>
    <path d="M0 -74 A74 74 0 0 1 0 74 A37 37 0 0 1 0 0 A37 37 0 0 0 0 -74 Z" fill="#241c12"/>
    <circle cy="-37" r="12" fill="#f2e8cc"/><circle cy="37" r="12" fill="#241c12"/>
    <circle r="86" fill="none" stroke="${GOLD}" stroke-width="3"/>
    ${[0,45,90,135,180,225,270,315].map((a,i)=>`<g transform="rotate(${a}) translate(0 -104)">
      ${[0,1,2].map(j=>{
        const broken = (i>>j)&1;
        return broken
          ? `<rect x="-12" y="${j*6}" width="10" height="3.4" fill="${GOLD}"/><rect x="2" y="${j*6}" width="10" height="3.4" fill="${GOLD}"/>`
          : `<rect x="-12" y="${j*6}" width="24" height="3.4" fill="${GOLD}"/>`;
      }).join('')}</g>`).join('')}
  </g>
  ${vignette()}`),

'仁王盾':()=>wrapArt(`${scene({hue:42,sky1:'#f6e6be',sky2:'#8a6420',near:'#241906',far:'#6e5218',mid:'#43310c',disc:false})}
  <g transform="translate(100 108)">
    <path d="M0 -84 L70 -58 V-8 C70 38 40 70 0 86 C-40 70 -70 38 -70 -8 V-58 Z" fill="#d8b04a"/>
    <path d="M0 -74 L60 -51 V-8 C60 32 34 60 0 74 C-34 60 -60 32 -60 -8 V-51 Z" fill="#8f6a1c"/>
    <path d="M0 -62 L48 -42 V-8 C48 24 26 48 0 60 C-26 48 -48 24 -48 -8 V-42 Z" fill="none" stroke="#ffe9a8" stroke-width="2.4"/>
    <path d="M0 -34 C18 -34 28 -18 28 -2 C28 20 14 36 0 44 C-14 36 -28 20 -28 -2 C-28 -18 -18 -34 0 -34 Z" fill="#f6ecd6"/>
    <text y="12" font-size="34" text-anchor="middle" fill="#8f2e1e" font-weight="700">仁</text>
  </g>
  ${vignette()}`),

'藤甲':()=>wrapArt(`${scene({hue:110,sky1:'#e2f0cf',sky2:'#4a6b32',near:'#111c0b',far:'#3d5c28',mid:'#233715',disc:false})}
  <g transform="translate(100 108)">
    <path d="M0 -80 L66 -56 V-6 C66 36 38 68 0 82 C-38 68 -66 36 -66 -6 V-56 Z" fill="#6f9a4a"/>
    ${Array.from({length:8},(_,i)=>`<path d="M-58 ${-46+i*15} Q0 ${-56+i*15} 58 ${-46+i*15}"
      stroke="#3f6b28" stroke-width="5" fill="none" stroke-linecap="round"/>`).join('')}
    ${Array.from({length:7},(_,i)=>`<path d="M${-48+i*16} -58 Q${-44+i*16} 0 ${-48+i*16} 62"
      stroke="#87b25c" stroke-width="3.4" fill="none" opacity=".7"/>`).join('')}
    <path d="M0 -80 L66 -56 V-6 C66 36 38 68 0 82 C-38 68 -66 36 -66 -6 V-56 Z"
      fill="none" stroke="#2c4a1a" stroke-width="3"/>
  </g>
  ${vignette()}`),
};

/* 武器通用：按射程决定刀刃长度与华丽程度 */
function weaponArt(name, range, hue, blade){
  /* 柄长随射程增加，刃形由各武器自己给（blade），保证每把兵器一眼能区分 */
  const L = 40 + range*9;
  return wrapArt(`${scene({hue, sky1:`hsl(${hue} 40% 84%)`, sky2:`hsl(${hue} 34% 40%)`,
      near:`hsl(${hue} 30% 9%)`, far:`hsl(${hue} 28% 34%)`, mid:`hsl(${hue} 30% 20%)`,
      dc:'#fff2cf', dx:150, dy:44, dr:16})}
    ${cloud(40,74,.9,'#ffffff',.25)}
    <!-- 兵器架 -->
    <path d="M40 200 L160 200" stroke="#3a2712" stroke-width="7" stroke-linecap="round" opacity=".8"/>
    <path d="M56 200 L48 236 M144 200 L152 236" stroke="#3a2712" stroke-width="6" stroke-linecap="round" opacity=".8"/>
    <g transform="translate(100 108) rotate(-28) scale(1.28)">
      <rect x="-5.5" y="-10" width="11" height="${L}" rx="4" fill="#5d4024"/>
      <rect x="-5.5" y="-10" width="4"  height="${L}" fill="#7a5730" opacity=".7"/>
      ${Array.from({length:4},(_,i)=>`<rect x="-6.5" y="${8+i*15}" width="13" height="3" fill="${GOLD}" opacity=".85"/>`).join('')}
      <path d="M-22 -16 C-10 -22 10 -22 22 -16 L18 -6 C8 -10 -8 -10 -18 -6 Z" fill="${GOLD}"/>
      ${blade||`<path d="M-9 -16 C-13 -46 -7 -74 0 -92 C7 -74 13 -46 9 -16 Z" fill="${STEEL}"/>
                <path d="M-4 -16 C-7 -46 -3 -72 0 -92 L0 -16 Z" fill="#f4f8fc"/>
                <path d="M-9 -16 C-13 -46 -7 -74 0 -92" stroke="#6e7885" stroke-width="1.2" fill="none"/>`}
      <circle cy="${L-4}" r="7" fill="${GOLD}"/>
      <path d="M-4 ${L+2} C-10 ${L+16} -4 ${L+26} 0 ${L+30} C4 ${L+26} 10 ${L+16} 4 ${L+2} Z"
            fill="#a8302a" opacity=".85"/>
    </g>
    ${splatter(10,'#ffffff',.22)}
    ${vignette()}`);
}
function horseArt(minus){
  const hue = minus?6:212;
  const body = minus?'#8f2f22':'#2c3d5e';
  const mane = minus?'#3d0f08':'#141c30';
  return wrapArt(`${scene({hue, sky1:`hsl(${hue} 42% 82%)`, sky2:`hsl(${hue} 36% 42%)`,
      near:`hsl(${hue} 32% 10%)`, far:`hsl(${hue} 28% 36%)`, mid:`hsl(${hue} 30% 22%)`,
      dc:'#fff0cc', dx:150, dy:46, dr:18})}
    ${cloud(38,80,.9,'#ffffff',.28)}
    <g transform="translate(94 124) scale(1.0)">
      <path d="M-52 62 C-52 26 -44 -2 -26 -18 C-38 -30 -34 -50 -16 -54 C-8 -64 10 -64 18 -54
               L62 -44 L52 -24 L30 -26 C44 -6 52 24 52 62 Z" fill="${body}"/>
      <path d="M-16 -54 L-24 -76 L-6 -60 Z" fill="${body}"/>
      <path d="M8 -58 L20 -78 L20 -56 Z" fill="${body}"/>
      <path d="M-14 -50 C-4 -62 12 -62 18 -52 C6 -56 -4 -55 -14 -50 Z" fill="${mane}"/>
      <path d="M-26 -18 C-16 -34 4 -40 22 -34 C6 -26 -10 -22 -26 -18 Z" fill="${mane}"/>
      <circle cx="26" cy="-44" r="3" fill="#1a1008"/>
      <path d="M-52 62 C-62 42 -64 18 -56 2 C-50 20 -46 40 -42 54 Z" fill="${mane}"/>
      <rect x="-40" y="52" width="10" height="26" fill="${body}"/>
      <rect x="-8"  y="56" width="10" height="22" fill="${body}"/>
      <rect x="28"  y="52" width="10" height="26" fill="${body}"/>
      <path d="M12 -40 C26 -44 40 -40 48 -34" stroke="${GOLD}" stroke-width="3" fill="none"/>
    </g>
    <g opacity=".5">${Array.from({length:8},(_,i)=>
      `<ellipse cx="${20+i*22}" cy="${192-((i*29)%26)}" rx="${8+(i%3)*4}" ry="3" fill="#ffffff" opacity=".35"/>`).join('')}</g>
    ${vignette()}`);
}

function cardArt(name){
  if(CARD_ART[name]) return CARD_ART[name]();
  const info = CARD_INFO[name]||{};
  if(info.slot==='weapon'){
    const hue = {'雌雄双股剑':320,'青釭剑':196,'寒冰剑':190,'青龙偃月刀':150,
                 '丈八蛇矛':268,'贯石斧':26,'方天画戟':42,'麒麟弓':50}[name] || 210;
    let blade = null;
    if(name==='青龙偃月刀'){          /* 宽厚的偃月弯刀 */
      blade = `<path d="M-7 -16 C6 -34 30 -56 34 -92 C40 -70 34 -34 10 -12 Z" fill="${STEEL}"/>
               <path d="M-7 -16 C6 -34 28 -56 32 -88 C34 -66 26 -38 6 -16 Z" fill="#e2f4e8"/>
               <path d="M34 -92 C44 -84 44 -66 38 -56 C40 -70 38 -84 34 -92 Z" fill="${GOLD}"/>
               <path d="M-9 -16 C-2 -30 4 -44 6 -58" stroke="#5f7a68" stroke-width="1.6" fill="none"/>
               <path d="M-14 -14 C-4 -22 6 -22 14 -14 Z" fill="${GOLD}"/>`;
    }else if(name==='方天画戟'){      /* 直刃 + 两侧月牙 */
      blade = `<path d="M-4.5 -16 L-4.5 -84 L4.5 -84 L4.5 -16 Z" fill="${STEEL}"/>
               <path d="M0 -84 L11 -104 L-11 -104 Z" fill="#f4f8fc"/>
               <path d="M4.5 -46 C30 -50 36 -76 20 -82 C26 -70 20 -56 4.5 -54 Z" fill="${STEEL}"/>
               <path d="M-4.5 -46 C-30 -50 -36 -76 -20 -82 C-26 -70 -20 -56 -4.5 -54 Z" fill="#b6c2ce"/>
               <circle cy="-92" r="4" fill="${GOLD}"/>`;
    }else if(name==='麒麟弓'){        /* 张开的长弓 + 搭箭 */
      blade = `<path d="M-26 -96 C24 -70 24 -18 -26 8 L-18 14 C34 -16 34 -72 -18 -102 Z" fill="#8a5f2c"/>
               <path d="M-26 -96 C20 -70 20 -20 -26 6" stroke="#c9a06a" stroke-width="2" fill="none"/>
               <line x1="-22" y1="-99" x2="-22" y2="11" stroke="#f2e8cc" stroke-width="2.4"/>
               <path d="M-22 -44 L36 -44" stroke="#d8c8a4" stroke-width="3"/>
               <path d="M36 -50 L54 -44 L36 -38 Z" fill="${IVORY}"/>
               <path d="M-22 -50 L-12 -44 L-22 -38 Z" fill="#b8342a"/>
               <circle cx="6" cy="-70" r="5" fill="${GOLD}" opacity=".8"/>`;
    }else if(name==='贯石斧'){        /* 双刃巨斧 */
      blade = `<path d="M-5 -22 C-46 -26 -54 -84 -5 -80 Z" fill="${STEEL}"/>
               <path d="M5 -22 C46 -26 54 -84 5 -80 Z" fill="#aab8c6"/>
               <path d="M-5 -30 C-36 -34 -42 -74 -5 -72 Z" fill="#eef3f8" opacity=".55"/>
               <rect x="-4" y="-104" width="8" height="26" rx="3" fill="${STEEL}"/>
               <path d="M0 -112 L7 -100 L-7 -100 Z" fill="#f4f8fc"/>`;
    }else if(name==='雌雄双股剑'){    /* 一对交叉的双剑 */
      blade = `<g transform="translate(-11 0) rotate(-7)">
                 <path d="M-6 -16 C-9 -50 -4 -80 0 -96 C4 -80 9 -50 6 -16 Z" fill="${STEEL}"/>
                 <path d="M-2 -16 C-5 -52 -2 -78 0 -96 L0 -16 Z" fill="#f4f8fc"/></g>
               <g transform="translate(11 0) rotate(7)">
                 <path d="M-6 -16 C-9 -50 -4 -80 0 -96 C4 -80 9 -50 6 -16 Z" fill="#d9a9c4"/>
                 <path d="M-2 -16 C-5 -52 -2 -78 0 -96 L0 -16 Z" fill="#fceaf4"/></g>
               <path d="M-24 -14 C-8 -22 8 -22 24 -14 Z" fill="${GOLD}"/>`;
    }else if(name==='丈八蛇矛'){      /* 蛇形矛尖 */
      blade = `<path d="M-4 -16 L-4 -74 L4 -74 L4 -16 Z" fill="#6b4a2c"/>
               <path d="M0 -74 C14 -84 -12 -94 2 -106 C10 -116 4 -122 0 -126
                        C-4 -122 -10 -116 -2 -106 C-14 -94 12 -84 0 -74 Z" fill="#f4f8fc"/>
               <path d="M0 -74 C10 -82 -6 -92 1 -102" stroke="#93a2b0" stroke-width="1.6" fill="none"/>
               <path d="M-9 -70 C0 -78 9 -78 9 -70 Z" fill="${GOLD}"/>`;
    }else if(name==='青釭剑' || name==='寒冰剑'){
      const c = name==='寒冰剑' ? '#cfeaf6' : '#dff0e8';
      blade = `<path d="M-8 -16 C-11 -48 -6 -76 0 -96 C6 -76 11 -48 8 -16 Z" fill="${STEEL}"/>
               <path d="M-3.5 -16 C-6 -50 -2 -76 0 -96 L0 -16 Z" fill="${c}"/>
               <path d="M-8 -16 C-11 -48 -6 -76 0 -96" stroke="#6e7885" stroke-width="1.2" fill="none"/>
               ${name==='寒冰剑'?`${[0,1,2].map(i=>`<circle cx="${-4+i*4}" cy="${-34-i*18}" r="2.4" fill="#eaf8ff" opacity=".9"/>`).join('')}`:''}`;
    }else if(name==='诸葛连弩'){ blade = null; }
    return weaponArt(name, info.range||2, hue, blade);
  }
  if(info.slot==='horseMinus') return horseArt(true);
  if(info.slot==='horsePlus')  return horseArt(false);
  return wrapArt(`${scene({hue:40})}${vignette()}`);
}

/* ================= 武将立绘 ================= */
const PW=200, PH=280;

function portrait(gid){
  const g = GENERALS[gid]; if(!g) return '';
  const a = g.art||{}; const hue = a.hue!=null?a.hue:30;
  const id = 'g'+gid;
  const female = g.sex==='f';
  const bulk = a.bulk ? 1.08 : 1;

  /* 用武将 id 派生一点五官差异，免得所有人长一张脸 */
  let hsh=0; for(let i=0;i<gid.length;i++) hsh=(hsh*31+gid.charCodeAt(i))>>>0;
  const v = n => ((hsh>>(n*3))&7)/7;                 // 0..1
  const faceW  = 35 + v(0)*6;                        // 脸宽
  const faceH  = 44 + v(1)*6;                        // 脸长
  const eyeGap = 15 + v(2)*3;                        // 眼距
  const eyeSz  = 11.5 + v(3)*2.5;                    // 眼睛大小
  const mouthW = 9 + v(4)*3;
  const browUp = v(5)*3;                             // 眉毛上挑程度

  const skin  = a.face || `hsl(${28+v(6)*8} ${34+v(6)*8}% ${76-v(6)*6}%)`;
  const skinD = a.face ? '#9c3730' : `hsl(${22+v(6)*6} 38% ${54-v(6)*5}%)`;
  const cloth = `hsl(${hue} 44% 30%)`;
  const clothL= `hsl(${hue} 42% 44%)`;
  const clothD= `hsl(${hue} 46% 16%)`;
  const metal = '#8e99a8', metalL = '#c8d2de', metalD='#525b67';
  const hair  = '#17100a', hairL = '#3d2c1c';
  const GOLD2 = '#e6c574';

  const CY = 124, CX = 100;                          // 脸心
  const chin = CY + faceH;
  const eyeY = CY - 6, browY = eyeY - 15;
  const noseTop = CY + 4, noseBot = CY + 24;
  const mouthY = CY + 34;

  /* ---------- 鬓发（戴冠者也要露头发，不然像光头戴帽） ---------- */
  const sideHair = `
    <path d="M${CX-faceW+2} ${CY-20} C${CX-faceW-5} ${CY+6} ${CX-faceW-2} ${CY+26} ${CX-faceW+6} ${CY+34}
             C${CX-faceW+1} ${CY+10} ${CX-faceW+2} ${CY-6} ${CX-faceW+7} ${CY-22} Z" fill="${hair}"/>
    <path d="M${CX+faceW-2} ${CY-20} C${CX+faceW+5} ${CY+6} ${CX+faceW+2} ${CY+26} ${CX+faceW-6} ${CY+34}
             C${CX+faceW-1} ${CY+10} ${CX+faceW-2} ${CY-6} ${CX+faceW-7} ${CY-22} Z" fill="${hair}"/>`;

  /* ---------- 头饰 ---------- */
  let hat = '';
  if(a.hat==='crown'){                       /* 冕冠（主公） */
    hat = `
    <path d="M${CX-38} ${CY-58} C${CX-38} ${CY-84} ${CX+38} ${CY-84} ${CX+38} ${CY-58} L${CX+38} ${CY-46} H${CX-38} Z" fill="${hairL}"/>
    <path d="M${CX-52} ${CY-68} H${CX+52} V${CY-56} H${CX-52} Z" fill="#5f4118"/>
    <path d="M${CX-56} ${CY-76} H${CX+56} L${CX+52} ${CY-66} H${CX-52} Z" fill="#160f07"/>
    <rect x="${CX-58}" y="${CY-80}" width="116" height="6" rx="2" fill="${GOLD2}"/>
    ${[0,1,2,3,4].map(i=>`<g transform="translate(${CX-44+i*22} ${CY-66})">
      <line x1="0" y1="0" x2="0" y2="26" stroke="${GOLD2}" stroke-width="1.5"/>
      ${[0,1,2].map(j=>`<circle cy="${8+j*9}" r="3.2" fill="#f6e8b8"/>`).join('')}</g>`).join('')}
    <circle cx="${CX}" cy="${CY-62}" r="6" fill="${GOLD2}"/>`;
  } else if(a.hat==='helm'){                 /* 兜鍪 */
    hat = `
    <path d="M${CX-44} ${CY-18} C${CX-44} ${CY-70} ${CX-24} ${CY-92} ${CX} ${CY-92}
             C${CX+24} ${CY-92} ${CX+44} ${CY-70} ${CX+44} ${CY-18}
             L${CX+33} ${CY-18} C${CX+33} ${CY-60} ${CX+18} ${CY-76} ${CX} ${CY-76}
             C${CX-18} ${CY-76} ${CX-33} ${CY-60} ${CX-33} ${CY-18} Z" fill="${metal}"/>
    <path d="M${CX-44} ${CY-18} C${CX-44} ${CY-70} ${CX-24} ${CY-92} ${CX} ${CY-92}
             C${CX+10} ${CY-92} ${CX+19} ${CY-88} ${CX+26} ${CY-80}
             C${CX+6} ${CY-82} ${CX-22} ${CY-66} ${CX-30} ${CY-18} Z" fill="${metalL}"/>
    <path d="M${CX-46} ${CY-24} H${CX+46} L${CX+40} ${CY-10} H${CX-40} Z" fill="${metalD}"/>
    <rect x="${CX-46}" y="${CY-26}" width="92" height="4" rx="2" fill="${GOLD2}"/>
    <path d="M${CX-10} ${CY-14} L${CX-5} ${CY+14} H${CX+5} L${CX+10} ${CY-14} Z" fill="${metalD}" opacity=".55"/>
    <path d="M${CX-6} ${CY-92} C${CX-6} ${CY-102} ${CX+6} ${CY-102} ${CX+6} ${CY-92} Z" fill="${GOLD2}"/>
    <path d="M${CX} ${CY-100} C${CX+14} ${CY-108} ${CX+20} ${CY-126} ${CX+9} ${CY-136}
             C${CX+14} ${CY-116} ${CX+4} ${CY-106} ${CX} ${CY-100} Z" fill="#c8352a"/>
    <path d="M${CX} ${CY-100} C${CX-14} ${CY-108} ${CX-20} ${CY-126} ${CX-9} ${CY-136}
             C${CX-14} ${CY-116} ${CX-4} ${CY-106} ${CX} ${CY-100} Z" fill="#9e2019"/>
    <path d="M${CX-46} ${CY-12} C${CX-56} ${CY+8} ${CX-58} ${CY+34} ${CX-52} ${CY+52}
             L${CX-40} ${CY+46} C${CX-46} ${CY+28} ${CX-46} ${CY+6} ${CX-42} ${CY-8} Z" fill="${metalD}"/>
    <path d="M${CX+46} ${CY-12} C${CX+56} ${CY+8} ${CX+58} ${CY+34} ${CX+52} ${CY+52}
             L${CX+40} ${CY+46} C${CX+46} ${CY+28} ${CX+46} ${CY+6} ${CX+42} ${CY-8} Z" fill="${metalD}"/>`;
  } else if(a.hat==='guan'){                 /* 武冠 */
    hat = `
    <path d="M${CX-36} ${CY-22} H${CX+36} L${CX+28} ${CY-72} C${CX+26} ${CY-84} ${CX-26} ${CY-84} ${CX-28} ${CY-72} Z" fill="${clothD}"/>
    <path d="M${CX-36} ${CY-22} H${CX} L${CX} ${CY-80} C${CX-16} ${CY-80} ${CX-26} ${CY-80} ${CX-28} ${CY-72} Z" fill="${cloth}"/>
    <rect x="${CX-42}" y="${CY-30}" width="84" height="11" rx="4" fill="${GOLD2}"/>
    <path d="M${CX-28} ${CY-72} C${CX-26} ${CY-84} ${CX+26} ${CY-84} ${CX+28} ${CY-72}
             L${CX+24} ${CY-92} C${CX+20} ${CY-100} ${CX-20} ${CY-100} ${CX-24} ${CY-92} Z" fill="#120d07"/>
    <path d="M${CX-44} ${CY-22} C${CX-56} ${CY-8} ${CX-58} ${CY+18} ${CX-52} ${CY+34}" stroke="${clothD}" stroke-width="6" fill="none"/>
    <path d="M${CX+44} ${CY-22} C${CX+56} ${CY-8} ${CX+58} ${CY+18} ${CX+52} ${CY+34}" stroke="${clothD}" stroke-width="6" fill="none"/>`;
  } else if(a.hat==='jin'){                  /* 纶巾 */
    hat = `
    <path d="M${CX-42} ${CY-16} C${CX-42} ${CY-66} ${CX-24} ${CY-88} ${CX} ${CY-88}
             C${CX+24} ${CY-88} ${CX+42} ${CY-66} ${CX+42} ${CY-16} Z" fill="${cloth}"/>
    <path d="M${CX-42} ${CY-16} C${CX-42} ${CY-66} ${CX-24} ${CY-88} ${CX} ${CY-88}
             C${CX+6} ${CY-88} ${CX+12} ${CY-86} ${CX+17} ${CY-83}
             C${CX-8} ${CY-78} ${CX-30} ${CY-58} ${CX-34} ${CY-16} Z" fill="${clothL}"/>
    <path d="M${CX-42} ${CY-20} H${CX+42} V${CY-10} H${CX-42} Z" fill="${clothD}"/>
    <path d="M${CX} ${CY-88} C${CX+8} ${CY-102} ${CX+24} ${CY-102} ${CX+28} ${CY-90}
             C${CX+20} ${CY-96} ${CX+8} ${CY-94} ${CX} ${CY-84} Z" fill="${clothD}"/>
    <path d="M${CX+42} ${CY-16} C${CX+58} ${CY-6} ${CX+62} ${CY+22} ${CX+52} ${CY+46}
             L${CX+42} ${CY+38} C${CX+50} ${CY+18} ${CX+48} ${CY-2} ${CX+38} ${CY-12} Z" fill="${cloth}" opacity=".92"/>
    <rect x="${CX-44}" y="${CY-22}" width="88" height="4" rx="2" fill="${GOLD2}" opacity=".75"/>`;
  } else if(a.hat==='fa'){                   /* 女子发髻 */
    hat = `
    <path d="M${CX-48} ${CY+2} C${CX-52} ${CY-64} ${CX-28} ${CY-94} ${CX} ${CY-94}
             C${CX+28} ${CY-94} ${CX+52} ${CY-64} ${CX+48} ${CY+2}
             C${CX+40} ${CY-32} ${CX+24} ${CY-48} ${CX} ${CY-48}
             C${CX-24} ${CY-48} ${CX-40} ${CY-32} ${CX-48} ${CY+2} Z" fill="${hair}"/>
    <path d="M${CX-38} ${CY-16} C${CX-30} ${CY-42} ${CX-18} ${CY-52} ${CX} ${CY-54}
             C${CX-16} ${CY-48} ${CX-28} ${CY-34} ${CX-34} ${CY-12} Z" fill="${hairL}"/>
    <path d="M${CX-22} ${CY-90} C${CX-14} ${CY-108} ${CX+14} ${CY-108} ${CX+22} ${CY-90}
             C${CX+12} ${CY-100} ${CX-12} ${CY-100} ${CX-22} ${CY-90} Z" fill="${hair}"/>
    <circle cx="${CX-24}" cy="${CY-86}" r="11" fill="${hair}"/>
    <circle cx="${CX+24}" cy="${CY-86}" r="11" fill="${hair}"/>
    <circle cx="${CX-24}" cy="${CY-86}" r="4.5" fill="${GOLD2}"/>
    <circle cx="${CX+24}" cy="${CY-86}" r="4.5" fill="${GOLD2}"/>
    <path d="M${CX-40} ${CY-72} L${CX-58} ${CY-88}" stroke="${GOLD2}" stroke-width="3"/>
    <circle cx="${CX-59}" cy="${CY-90}" r="4.2" fill="#e8738f"/>
    ${[0,1,2].map(i=>`<circle cx="${CX+41+i*2}" cy="${CY-68+i*11}" r="3.2" fill="#f4d4de"/>`).join('')}
    <path d="M${CX-48} ${CY+2} C${CX-58} ${CY+40} ${CX-56} ${CY+78} ${CX-44} ${CY+104}"
          stroke="${hair}" stroke-width="13" fill="none" stroke-linecap="round"/>
    <path d="M${CX+48} ${CY+2} C${CX+58} ${CY+40} ${CX+56} ${CY+78} ${CX+44} ${CY+104}"
          stroke="${hair}" stroke-width="13" fill="none" stroke-linecap="round"/>`;
  } else {                                   /* 束发 */
    hat = `
    <path d="M${CX-42} ${CY-14} C${CX-42} ${CY-64} ${CX-24} ${CY-86} ${CX} ${CY-86}
             C${CX+24} ${CY-86} ${CX+42} ${CY-64} ${CX+42} ${CY-14}
             C${CX+32} ${CY-44} ${CX+18} ${CY-56} ${CX} ${CY-56}
             C${CX-18} ${CY-56} ${CX-32} ${CY-44} ${CX-42} ${CY-14} Z" fill="${hair}"/>
    <path d="M${CX-34} ${CY-24} C${CX-26} ${CY-46} ${CX-14} ${CY-56} ${CX} ${CY-58}
             C${CX-14} ${CY-52} ${CX-24} ${CY-40} ${CX-30} ${CY-20} Z" fill="${hairL}"/>
    <path d="M${CX-12} ${CY-86} C${CX-8} ${CY-106} ${CX+8} ${CY-106} ${CX+12} ${CY-86} Z" fill="${hair}"/>
    <rect x="${CX-14}" y="${CY-98}" width="28" height="8" rx="3" fill="${GOLD2}"/>`;
  }

  /* ---------- 须髯 ---------- */
  const bl = a.beard||0;
  let beard='';
  if(bl>=1){                                  /* 八字胡：贴在鼻下、嘴上方 */
    beard += `
    <path d="M${CX-1} ${noseBot+2} C${CX-9} ${noseBot+3} ${CX-17} ${noseBot+7} ${CX-23} ${noseBot+15}
             C${CX-15} ${noseBot+9} ${CX-7} ${noseBot+7} ${CX-1} ${noseBot+7} Z" fill="${hair}"/>
    <path d="M${CX+1} ${noseBot+2} C${CX+9} ${noseBot+3} ${CX+17} ${noseBot+7} ${CX+23} ${noseBot+15}
             C${CX+15} ${noseBot+9} ${CX+7} ${noseBot+7} ${CX+1} ${noseBot+7} Z" fill="${hair}"/>`;
  }
  if(bl===1){                                 /* 短山羊胡 */
    beard += `<path d="M${CX-6} ${mouthY+7} C${CX-5} ${mouthY+22} ${CX+5} ${mouthY+22} ${CX+6} ${mouthY+7}
                       C${CX+9} ${mouthY+26} ${CX-9} ${mouthY+26} ${CX-6} ${mouthY+7} Z" fill="${hair}"/>`;
  }
  if(bl===2){                                 /* 短髯 */
    beard += `
    <path d="M${CX-26} ${mouthY-10} C${CX-26} ${mouthY+26} ${CX+26} ${mouthY+26} ${CX+26} ${mouthY-10}
             C${CX+34} ${mouthY+34} ${CX-34} ${mouthY+34} ${CX-26} ${mouthY-10} Z" fill="${hair}"/>
    <path d="M${CX-14} ${mouthY+10} C${CX-8} ${mouthY+22} ${CX+8} ${mouthY+22} ${CX+14} ${mouthY+10}"
          stroke="${hairL}" stroke-width="2" fill="none"/>`;
  }
  if(bl===3){                                 /* 长须 */
    beard += `
    <path d="M${CX-28} ${mouthY-12} C${CX-28} ${mouthY+44} ${CX+28} ${mouthY+44} ${CX+28} ${mouthY-12}
             C${CX+40} ${mouthY+54} ${CX-40} ${mouthY+54} ${CX-28} ${mouthY-12} Z" fill="${hair}"/>
    <path d="M${CX-34} ${mouthY-22} C${CX-46} ${mouthY-8} ${CX-42} ${mouthY+14} ${CX-30} ${mouthY+6} Z" fill="${hair}"/>
    <path d="M${CX+34} ${mouthY-22} C${CX+46} ${mouthY-8} ${CX+42} ${mouthY+14} ${CX+30} ${mouthY+6} Z" fill="${hair}"/>
    ${[0,1,2].map(i=>`<path d="M${CX-16+i*16} ${mouthY+8} C${CX-14+i*16} ${mouthY+28} ${CX-12+i*16} ${mouthY+38} ${CX-15+i*16} ${mouthY+46}"
       stroke="${hairL}" stroke-width="1.8" fill="none" opacity=".85"/>`).join('')}`;
  }
  if(bl>=4){                                  /* 美髯（关羽） */
    beard += `
    <path d="M${CX-30} ${mouthY-14} C${CX-32} ${mouthY+72} ${CX+32} ${mouthY+72} ${CX+30} ${mouthY-14}
             C${CX+46} ${mouthY+86} ${CX-46} ${mouthY+86} ${CX-30} ${mouthY-14} Z" fill="#140c05"/>
    <path d="M${CX-38} ${mouthY-24} C${CX-52} ${mouthY-8} ${CX-48} ${mouthY+20} ${CX-33} ${mouthY+10} Z" fill="#140c05"/>
    <path d="M${CX+38} ${mouthY-24} C${CX+52} ${mouthY-8} ${CX+48} ${mouthY+20} ${CX+33} ${mouthY+10} Z" fill="#140c05"/>
    ${[0,1,2,3].map(i=>`<path d="M${CX-21+i*14} ${mouthY+10} C${CX-19+i*14} ${mouthY+38} ${CX-16+i*14} ${mouthY+56} ${CX-20+i*14} ${mouthY+74}"
       stroke="#31220f" stroke-width="2.2" fill="none" opacity=".9"/>`).join('')}`;
  }

  /* ---------- 眉 · 眼 ---------- */
  const brow = female
    ? `<path d="M${CX-eyeGap-13} ${browY+4} C${CX-eyeGap-4} ${browY-3-browUp} ${CX-eyeGap+6} ${browY-2} ${CX-eyeGap+11} ${browY+3}"
             stroke="#2b1c10" stroke-width="3" fill="none" stroke-linecap="round"/>
       <path d="M${CX+eyeGap+13} ${browY+4} C${CX+eyeGap+4} ${browY-3-browUp} ${CX+eyeGap-6} ${browY-2} ${CX+eyeGap-11} ${browY+3}"
             stroke="#2b1c10" stroke-width="3" fill="none" stroke-linecap="round"/>`
    : `<path d="M${CX-eyeGap-16} ${browY+6} C${CX-eyeGap-6} ${browY-6-browUp} ${CX-eyeGap+6} ${browY-4} ${CX-eyeGap+12} ${browY+2}
                C${CX-eyeGap+2} ${browY-1} ${CX-eyeGap-7} ${browY+1} ${CX-eyeGap-16} ${browY+6} Z" fill="#241708"/>
       <path d="M${CX+eyeGap+16} ${browY+6} C${CX+eyeGap+6} ${browY-6-browUp} ${CX+eyeGap-6} ${browY-4} ${CX+eyeGap-12} ${browY+2}
                C${CX+eyeGap-2} ${browY-1} ${CX+eyeGap+7} ${browY+1} ${CX+eyeGap+16} ${browY+6} Z" fill="#241708"/>`;

  const oneEye = (sx)=>`<g transform="translate(${CX+sx*eyeGap} ${eyeY})">
      <path d="M${-eyeSz} 0 C${-eyeSz*0.6} -${eyeSz*0.62} ${eyeSz*0.6} -${eyeSz*0.62} ${eyeSz} 0
               C${eyeSz*0.6} ${eyeSz*0.5} ${-eyeSz*0.6} ${eyeSz*0.5} ${-eyeSz} 0 Z" fill="#fdf8ee"/>
      <circle r="${eyeSz*0.42}" fill="#3a2410"/><circle r="${eyeSz*0.19}" fill="#0d0703"/>
      <circle cx="${-eyeSz*0.16}" cy="${-eyeSz*0.16}" r="${eyeSz*0.13}" fill="#fff"/>
      <path d="M${-eyeSz} 0 C${-eyeSz*0.6} -${eyeSz*0.62} ${eyeSz*0.6} -${eyeSz*0.62} ${eyeSz} 0"
            stroke="#201406" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <path d="M${-eyeSz*0.8} ${eyeSz*0.36} C${-eyeSz*0.3} ${eyeSz*0.54} ${eyeSz*0.4} ${eyeSz*0.48} ${eyeSz*0.86} ${eyeSz*0.1}"
            stroke="#8a6748" stroke-width="1.2" fill="none" opacity=".8"/>
    </g>`;
  const eyes = a.eye
    ? `<path d="M${CX-eyeGap-11} ${eyeY+5} L${CX-eyeGap+11} ${eyeY-5} M${CX-eyeGap-11} ${eyeY-5} L${CX-eyeGap+11} ${eyeY+5}"
             stroke="#2a1a10" stroke-width="3.2" stroke-linecap="round"/>${oneEye(1)}`
    : oneEye(-1)+oneEye(1);

  /* ---------- 肩甲 / 衣领 ---------- */
  const armored = (a.hat==='helm' || a.bulk);
  const shoulders = armored ? `
    <path d="M14 280 C14 234 38 206 70 198 L100 212 L130 198 C162 206 186 234 186 280 Z" fill="${cloth}"/>
    <path d="M62 200 C38 210 24 230 20 252 C40 238 58 230 76 226 Z" fill="${metal}"/>
    <path d="M138 200 C162 210 176 230 180 252 C160 238 142 230 124 226 Z" fill="${metal}"/>
    <path d="M62 200 C46 208 34 220 28 234 C44 224 60 220 72 218 Z" fill="${metalL}"/>
    <path d="M138 200 C154 208 166 220 172 234 C156 224 140 220 128 218 Z" fill="${metalL}"/>
    ${[[38,244],[54,232],[162,244],[146,232]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="3" fill="${GOLD2}"/>`).join('')}
    <path d="M100 212 L76 280 H124 Z" fill="${clothD}"/>
    <path d="M100 212 L84 248 L100 262 L116 248 Z" fill="${metalL}"/>
    <circle cx="100" cy="238" r="9" fill="${GOLD2}"/><circle cx="100" cy="238" r="4.5" fill="#8f2e1e"/>`
  : `
    <path d="M16 280 C16 236 40 208 72 200 L100 214 L128 200 C160 208 184 236 184 280 Z" fill="${cloth}"/>
    <path d="M72 200 L100 214 L100 280 L58 280 C56 248 60 222 72 200 Z" fill="${clothL}" opacity=".45"/>
    <path d="M72 200 C86 220 94 238 98 262 L84 280 H62 C60 248 62 222 72 200 Z" fill="${clothD}"/>
    <path d="M128 200 C114 220 106 238 102 262 L116 280 H138 C140 248 138 222 128 200 Z" fill="${clothD}"/>
    <path d="M100 214 C104 238 106 260 106 280 H94 C94 260 96 238 100 214 Z" fill="${GOLD2}" opacity=".5"/>
    ${[0,1,2].map(i=>`<circle cx="100" cy="${234+i*18}" r="3.4" fill="${GOLD2}"/>`).join('')}`;

  return `<svg viewBox="0 0 ${PW} ${PH}" preserveAspectRatio="xMidYMin slice">
  <defs>
    <linearGradient id="${id}bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0"   stop-color="hsl(${hue} 30% 42%)"/>
      <stop offset=".5"  stop-color="hsl(${hue} 30% 20%)"/>
      <stop offset="1"   stop-color="hsl(${hue} 32% 8%)"/>
    </linearGradient>
    <radialGradient id="${id}au" cx=".5" cy=".28" r=".64">
      <stop offset="0"  stop-color="${a.aura||'#ffffff'}" stop-opacity=".5"/>
      <stop offset="1"  stop-color="${a.aura||'#ffffff'}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${id}sk" x1=".22" y1="0" x2=".88" y2="1">
      <stop offset="0"   stop-color="${skin}"/>
      <stop offset=".58" stop-color="${skin}"/>
      <stop offset="1"   stop-color="${skinD}"/>
    </linearGradient>
    <radialGradient id="${id}vg" cx=".5" cy=".38" r=".8">
      <stop offset=".48" stop-color="#000" stop-opacity="0"/>
      <stop offset="1"   stop-color="#000" stop-opacity=".58"/>
    </radialGradient>
  </defs>

  <rect width="${PW}" height="${PH}" fill="url(#${id}bg)"/>
  <path d="M0 178 L30 138 L58 164 L92 122 L124 162 L156 132 L200 170 L200 280 L0 280 Z" fill="#000" opacity=".2"/>
  <path d="M0 204 L36 172 L70 198 L104 166 L140 198 L172 174 L200 200 L200 280 L0 280 Z" fill="#000" opacity=".26"/>
  <circle cx="152" cy="48" r="30" fill="#fff" opacity=".1"/>
  <rect width="${PW}" height="${PH}" fill="url(#${id}au)"/>
  <g stroke="#fff" fill="none" opacity=".1">
    <path d="M-10 224 C30 198 58 214 92 194 C128 172 156 184 210 156" stroke-width="2"/>
    <path d="M-10 246 C34 222 66 238 100 216 C136 192 166 204 210 178" stroke-width="1.4"/>
  </g>

  <!-- 整体缩小并上移，让肩甲露出来、头不至于顶满画面 -->
  <g transform="translate(0 -26) translate(100 150) scale(${(0.84*bulk).toFixed(3)}) translate(-100 -150)">
    ${shoulders}
    <path d="M${CX-18} ${chin-18} C${CX-18} ${chin+26} ${CX+18} ${chin+26} ${CX+18} ${chin-18} Z" fill="${skinD}"/>
    <path d="M${CX-15} ${chin-16} C${CX-15} ${chin+18} ${CX+15} ${chin+18} ${CX+15} ${chin-16} Z" fill="${skin}" opacity=".5"/>
    ${sideHair}
    <ellipse cx="${CX}" cy="${CY}" rx="${faceW}" ry="${faceH}" fill="url(#${id}sk)"/>
    <ellipse cx="${CX-faceW-1}" cy="${CY+6}" rx="6" ry="9.5" fill="${skin}"/>
    <ellipse cx="${CX+faceW+1}" cy="${CY+6}" rx="6" ry="9.5" fill="${skin}"/>
    <ellipse cx="${CX-faceW-1}" cy="${CY+6}" rx="2.8" ry="5" fill="${skinD}" opacity=".45"/>
    <ellipse cx="${CX+faceW+1}" cy="${CY+6}" rx="2.8" ry="5" fill="${skinD}" opacity=".45"/>
    <path d="M${CX-faceW+6} ${CY-faceH+16} C${CX-16} ${CY-faceH+2} ${CX+16} ${CY-faceH+2} ${CX+faceW-6} ${CY-faceH+16}"
          stroke="${skinD}" stroke-width="1.4" fill="none" opacity=".2"/>
    ${brow}
    ${eyes}
    <path d="M${CX-3} ${noseTop} C${CX-6} ${noseTop+12} ${CX-7} ${noseBot-2} ${CX-1} ${noseBot}
             C${CX+4} ${noseBot+1} ${CX+6} ${noseBot-3} ${CX+6} ${noseBot-6}"
          stroke="${skinD}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".75"/>
    <ellipse cx="${CX}" cy="${noseBot+1}" rx="7.5" ry="3" fill="${skinD}" opacity=".3"/>
    ${female
      ? `<path d="M${CX-mouthW} ${mouthY} C${CX-mouthW*0.4} ${mouthY-4} ${CX+mouthW*0.4} ${mouthY-4} ${CX+mouthW} ${mouthY}
                  C${CX+mouthW*0.5} ${mouthY+6} ${CX-mouthW*0.5} ${mouthY+6} ${CX-mouthW} ${mouthY} Z" fill="#c2545e"/>
         <path d="M${CX-mouthW} ${mouthY} C${CX-mouthW*0.4} ${mouthY-1} ${CX+mouthW*0.4} ${mouthY-1} ${CX+mouthW} ${mouthY}"
               stroke="#8e3540" stroke-width="1.2" fill="none"/>`
      : `<path d="M${CX-mouthW} ${mouthY-1} C${CX-mouthW*0.4} ${mouthY+5} ${CX+mouthW*0.4} ${mouthY+5} ${CX+mouthW} ${mouthY-1}"
               stroke="#84463a" stroke-width="2.6" fill="none" stroke-linecap="round"/>`}
    <ellipse cx="${CX-faceW+12}" cy="${CY+18}" rx="10" ry="14" fill="${skinD}" opacity=".14"/>
    <ellipse cx="${CX+faceW-12}" cy="${CY+18}" rx="10" ry="14" fill="${skinD}" opacity=".14"/>
    ${female?`<ellipse cx="${CX-faceW+14}" cy="${CY+16}" rx="9" ry="6" fill="#e07a86" opacity=".28"/>
              <ellipse cx="${CX+faceW-14}" cy="${CY+16}" rx="9" ry="6" fill="#e07a86" opacity=".28"/>`:''}
    ${beard}
    ${hat}
  </g>

  <rect width="${PW}" height="${PH}" fill="url(#${id}vg)"/>
</svg>`;
}

return {cardArt, portrait, bindImage};
})();
