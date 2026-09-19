const {chromium}=require('playwright');
const assert=require('node:assert/strict');

(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://127.0.0.1:8765');
  await page.evaluate(()=>{
   document.querySelector('#startScreen').classList.add('hidden');
   document.querySelector('#gameScreen').classList.remove('hidden');
   const ids=['caocao','zhangfei','zhaoyun','guanyu','sunquan','simayi','daqiao','luxun'];
   const roles=['zhu','zhong','zhong','fan','fan','fan','nei','fan'];
   const g=new Game({count:8,aiThink:0});
   g.attach(ids.map((id,i)=>new Player(i,id,roles[i],i===0)));
   window.__game=g;AI.setup(g);g.curPlayer=g.human;g.phase='play';UI.build(g);
  });
  for(const viewport of [{width:1280,height:720},{width:1600,height:900},{width:1920,height:1080}]){
   await page.setViewportSize(viewport);
   const sizes=()=>page.evaluate(()=>Array.from(document.querySelectorAll('.seat .seat-box,#selfGeneral .gcard'),el=>{
    const r=el.getBoundingClientRect();return {width:r.width,height:r.height};
   }));
   await page.evaluate(()=>UI.refresh(__game));
   const before=await sizes();
   await page.evaluate(()=>{
    for(const p of __game.players){
     p.judges=['乐不思蜀','兵粮寸断','闪电'].map(n=>makeCard(n,'spade',6));
     p.equips.weapon=makeCard('青釭剑','spade',6);p.marks.linked=true;p.marks.bear=6;
    }
    __game.curPlayer=__game.players[1];UI.refresh(__game);
   });
   assert.deepEqual(await sizes(),before,`card sizes changed with judgement/equipment at ${viewport.width}`);
   await page.evaluate(()=>{for(const p of __game.players){p.judges=[];p.equips.weapon=null;p.marks={};}UI.refresh(__game);});
   assert.deepEqual(await sizes(),before,'card sizes changed after clearing state');
   await page.evaluate(()=>{UI.request(__game,__game.human,{kind:'play'});});
   assert.deepEqual(await sizes(),before,'card sizes changed during human input');
   await page.locator('#btnEnd').click();
   assert.deepEqual(await sizes(),before,'card sizes changed after human input');
  }
  assert.deepEqual(errors,[]);
  console.log('Seat layout passed: fixed portrait dimensions across judgement, equipment, marks, turns and input at three viewport sizes.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
