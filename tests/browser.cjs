const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:960}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='log')console.log(m.text());});
 fs.mkdirSync('tests/artifacts',{recursive:true});
 try{
  await page.goto('http://127.0.0.1:8765');
  await page.getByRole('button',{name:'开 始 游 戏'}).click();
  await page.waitForFunction(()=>document.querySelectorAll('#pickList .gcard').length===57);
  await page.getByRole('button',{name:'山',exact:true}).click();
  assert.equal(await page.locator('#pickList .gcard:visible').count(),8);
  await page.getByRole('textbox',{name:'搜索武将或技能'}).fill('姜维');
  assert.equal(await page.locator('#pickList .gcard:visible').count(),1);
  await page.getByRole('textbox',{name:'搜索武将或技能'}).fill('');
  await page.screenshot({path:'tests/artifacts/pick.png',animations:'disabled'});
  async function fixture(gid,weapon=null){
   await page.evaluate(({gid,weapon})=>{
    document.getElementById('pickScreen').classList.add('hidden');document.getElementById('gameScreen').classList.remove('hidden');
    U.wait=async()=>{};
    const g=new Game({count:5,aiThink:0});
    g.attach([new Player(0,gid,'zhu',true),new Player(1,'zhangfei','fan',false),new Player(2,'zhaoyun','zhong',false),new Player(3,'guanyu','fan',false),new Player(4,'sunquan','nei',false)]);
    AI.setup(g);g.curPlayer=g.human;g.phase='play';g.human.skills=GENERALS[gid].skills.slice();
    if(weapon)g.human.equips.weapon=makeCard(weapon,'spade',12);
    window.__game=g;UI.build(g);window.__result=null;
    UI.request(g,g.human,{kind:'play'}).then(r=>window.__result=r);
   },{gid,weapon});
  }
  await fixture('huanggai');
  await page.getByRole('button',{name:'苦肉',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.__result.skill),'kurou');
  await page.evaluate(async()=>{await __game.runSkill(__result.skill,__game.human,{});UI.request(__game,__game.human,{kind:'play'}).then(r=>window.__result=r);});
  assert.equal(await page.evaluate(()=>__game.human.hp),4); // five-player lord starts at 5
  assert.equal(await page.evaluate(()=>__game.human.hand.length),2);
  await page.getByRole('button',{name:'结束出牌',exact:true}).click();
  await fixture('zhangfei','丈八蛇矛');
  await page.evaluate(()=>{__game.human.hand=[makeCard('闪','diamond',2),makeCard('闪','heart',3)];UI.refresh(__game);});
  // Start a fresh request so conversion availability is rebuilt from the current hand.
  await page.getByRole('button',{name:'结束出牌',exact:true}).click();
  await page.evaluate(()=>{UI.request(__game,__game.human,{kind:'play'}).then(r=>window.__result=r);});
  await page.getByRole('button',{name:'丈八蛇矛 → 杀'}).click();
  await page.locator('#handCards .card').nth(0).click();
  await page.locator('#handCards .card').nth(1).click();
  await page.locator('.seat.targetable').first().click();
  await page.getByRole('button',{name:'出牌',exact:true}).click();
  assert.equal(await page.evaluate(()=>__result.card.viaSkill),'zhangba');
  assert.equal(await page.evaluate(()=>__result.card.sub.length),2);
  await fixture('daqiao');
  await page.evaluate(()=>{__game.human.equips.horseMinus=makeCard('赤兔','diamond',5);UI.refresh(__game);});
  await page.getByRole('button',{name:'结束出牌',exact:true}).click();
  await page.evaluate(()=>{UI.request(__game,__game.human,{kind:'play'}).then(r=>window.__result=r);});
  await page.getByRole('button',{name:'国色 → 乐不思蜀'}).click();
  await page.locator('#selfGeneral .equip-chip').filter({hasText:'赤兔'}).click();
  await page.locator('.seat.targetable').first().click();
  await page.getByRole('button',{name:'出牌',exact:true}).click();
  assert.equal(await page.evaluate(()=>__result.card.viaSkill),'guose');
  await page.evaluate(()=>{__game.human.hand=__game.popDeck(7);UI.refresh(__game);UI.request(__game,__game.human,{kind:'play'});});
  await page.waitForFunction(()=>document.querySelectorAll('.img-bg').length>=5);
  await page.screenshot({path:'tests/artifacts/battle.png',animations:'disabled'});
  await page.setViewportSize({width:1280,height:800});
  await page.screenshot({path:'tests/artifacts/battle-1280.png',animations:'disabled'});
  const result=await page.evaluate(async()=>{
    let seed=12837;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    U.wait=U.hardWait=async()=>{};
    for(const name of Object.keys(FX))FX[name]=async()=>{};
    UI.showPlay=async()=>{};
    let uiRequests=0;
    UI.request=async(g,p,req)=>{if(++uiRequests>4000)throw new Error('Browser simulation exceeded UI request budget');return req.kind==='play'?AI.playTurn(g,p):AI.decide(g,p,req);};
    const g=new Game({count:8,aiThink:0});
    const ids=['guanyu','zuoci','caiwenji','jiaxu','sunce','dengai','lusu','zhoutai'];
    const roles=['zhu','fan','zhong','fan','zhong','fan','fan','nei'];
    g.attach(ids.map((id,i)=>new Player(i,id,roles[i],i===0)));AI.setup(g);
    window.__game=g;
    const playerTurn=g.playerTurn.bind(g);g.playerTurn=async p=>{if(g.turn%20===0)console.log('simulation turn',g.turn,p.name);return playerTurn(p);};
    let operations=0;
    const ask=g.ask.bind(g);g.ask=async(...args)=>{if(++operations>4000)throw new Error('Browser simulation exceeded request budget');return ask(...args);};
    await g.run();
    return {over:g.over,turns:g.turn,winner:g.winner};
  });
  assert.ok(result.over);assert.ok(result.turns>0);
  assert.deepEqual(errors,[]);
  console.log('Browser passed: catalogue, active/weapon/equipment controls, local artwork, no page errors; complete 8-player game:',result);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

