const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 fs.mkdirSync('tests/artifacts',{recursive:true});
 try{
  await page.goto('http://127.0.0.1:8765');
  for(const [width,height] of [[1600,1000],[1366,768],[1280,720],[1024,768],[850,650]]){
   await page.setViewportSize({width,height});
   await page.evaluate(()=>{
    document.querySelectorAll('.screen').forEach(e=>e.classList.add('hidden'));document.getElementById('gameScreen').classList.remove('hidden');U.wait=async()=>{};
    const g=new Game({count:8,aiThink:0});
    g.attach(['daqiao','zhangfei','zhaoyun','guanyu','caocao','sunquan','liubei','lvbu'].map((id,i)=>new Player(i,id,['zhu','fan','zhong','fan','nei','fan','zhong','fan'][i],i===0)));
    AI.setup(g);g.curPlayer=g.human;g.phase='play';window.__game=g;
    for(const p of g.players){p.equips.weapon=makeCard('朱雀羽扇','diamond',1);p.equips.armor=makeCard('白银狮子','club',1);p.equips.horsePlus=makeCard('骅骝','diamond',13);p.equips.horseMinus=makeCard('赤兔','heart',5);p.judges=[makeCard('兵粮寸断','club',4),makeCard('乐不思蜀','heart',6)];}
    g.human.hand=['火杀','雷杀','古锭刀','朱雀羽扇','白银狮子','骅骝','火攻','铁索连环'].map((n,i)=>makeCard(n,'heart',i+1));
    UI.build(g);UI.request(g,g.human,{kind:'play'});UI.refresh(g);
   });
   await page.waitForFunction(()=>document.querySelectorAll('#handCards .img-bg').length===8);
   const geometry=await page.evaluate(()=>{
    const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    return {own:rect(document.querySelector('#selfGeneral .gcard')),equip:rect(document.querySelector('#selfGeneral .s-equips')),group:rect(document.querySelector('#selfGeneral')),others:[...document.querySelectorAll('.seat')].map(rect),end:rect(document.querySelector('#btnEnd'))};
   });
   assert.ok(geometry.own.bottom<=geometry.equip.y,`own equipment overlap at ${width}x${height}`);
   assert.ok(geometry.group.bottom<=height,`own clipped at ${width}x${height}`);
   for(const r of geometry.others)assert.ok(r.right<=geometry.group.x||r.x>=geometry.group.right||r.bottom<=geometry.group.y||r.y>=geometry.group.bottom,`seat overlap at ${width}x${height}: ${JSON.stringify({r,group:geometry.group})}`);
   assert.ok(geometry.end.bottom<=height&&geometry.end.y>=44,'controls visible');
   assert.equal(await page.locator('#handCards .nature-fire .cf-banner').innerText(),'火杀');
   assert.equal(await page.locator('#handCards .nature-thunder .cf-banner').innerText(),'雷杀');
   await page.screenshot({path:`tests/artifacts/junzheng-${width}.png`,animations:'disabled'});
  }
  assert.deepEqual(errors,[]);console.log('Military expansion artwork and fully equipped 8-seat layouts passed at five viewport sizes.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
