const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1600,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));fs.mkdirSync('tests/artifacts',{recursive:true});
 try{
  await page.goto('http://127.0.0.1:8765');
  await page.getByRole('button',{name:'开 始 游 戏'}).click();
  await page.locator('#pickList [data-gid="zuoci"]').click();
  assert.match(await page.locator('#pickDetail').innerText(),/化身.*新生/s);
  await page.evaluate(()=>{
    U.wait=async()=>{};
    document.getElementById('pickScreen').classList.add('hidden');document.getElementById('gameScreen').classList.remove('hidden');
    const g=new Game({count:5,aiThink:0});
    g.attach(['zuoci','zhangfei','zhaoyun','guanyu','caocao'].map((id,i)=>new Player(i,id,['nei','fan','zhong','fan','zhu'][i],i===0)));
    AI.setup(g);g.curPlayer=g.players[4];g.phase='play';window.__game=g;UI.build(g);
    g.human.hand=g.popDeck(5);UI.refresh(g);UI.request(g,g.human,{kind:'play'});
  });
  await page.getByRole('button',{name:'标记张飞的身份',exact:true}).click();
  await page.locator('.identity-menu').getByRole('button',{name:'忠臣',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'标记张飞的身份',exact:true}).innerText(),'记·忠臣');
  assert.equal(await page.evaluate(()=>__game.players[1].identity),'fan');
  await page.evaluate(()=>UI.refresh(__game));
  assert.equal(await page.getByRole('button',{name:'标记张飞的身份',exact:true}).innerText(),'记·忠臣');
  // 技能说明现在是悬停提示（#skillTooltip），不再是可点开的侧栏面板
  await page.locator('.seat').filter({hasText:'张飞'}).locator('.s-sk').first().hover();
  assert.match(await page.locator('#skillTooltip').innerText(),/咆哮.*次数限制/s);
  await page.locator('#selfGeneral .gc-sk').first().hover();
  assert.match(await page.locator('#skillTooltip').innerText(),/化身/s);
  const layout=await page.evaluate(()=>{const hand=document.getElementById('handCards').getBoundingClientRect(),buttons=document.querySelector('.ctrl-btns').getBoundingClientRect();return {above:buttons.bottom<hand.top+12,center:Math.abs((buttons.left+buttons.right)/2-(hand.left+hand.right)/2)};});
  assert.ok(layout.above);assert.ok(layout.center<20);
  for(const [name,effect] of [['杀','slash'],['闪','dodge'],['桃','heal'],['火攻','fire'],['闪电','thunder'],['万箭齐发','arrows'],['铁索连环','chain'],['过河拆桥','dismantle'],['顺手牵羊','steal']]){
   await page.evaluate(async({name})=>{await UI.showPlay(__game,__game.players[4],makeCard(name,'heart',5),[__game.players[1]]);},{name});
   assert.ok(await page.locator(`#actionStage .effect-${effect}`).count());
   assert.match(await page.locator('#actionStage').innerText(),/曹操.*张飞/s);
   assert.equal(await page.locator('.target-path .path-head').count(),1);
  }
  await page.screenshot({path:'tests/artifacts/battle-targets.png',animations:'disabled'});
  await page.getByRole('button',{name:'结束出牌',exact:true}).click();
  await page.evaluate(()=>{__game.human.marks.forms=['guanyu','zhugeliang'];window.__formDone=false;EX.transform(__game,__game.human).then(()=>window.__formDone=true);});
  await page.waitForSelector('.skill-choice');
  assert.match(await page.locator('.skill-choice').first().innerText(),/红色.*杀/s);
  await page.screenshot({path:'tests/artifacts/huashen-options.png',animations:'disabled'});
  await page.locator('.skill-choice button').first().click();
  await page.waitForFunction(()=>__formDone);
  assert.equal(await page.evaluate(()=>__game.human.marks.formSkill),'wusheng');
  // Counterspell recipients must follow the card user's seat order, even when
  // the current turn belongs to somebody else. Suspend each AI choice to inspect it.
  await page.evaluate(()=>{
   const g=__game;g.curPlayer=g.players[0];g.players.forEach(p=>p.hand=[]);
   g.players[1].hand=[makeCard('无懈可击','spade',11)];g.players[2].hand=[makeCard('无懈可击','club',12)];
   window.__oldDecide=AI.decide;window.__oldWant=AI.wantWuxie;AI.wantWuxie=()=>true;
   AI.decide=()=>new Promise(r=>window.__answer=r);
   window.__counterDone=false;g.askWuxie(makeCard('过河拆桥','spade',3),g.players[3],g.players[4]).then(()=>window.__counterDone=true);
  });
  // 询问进度现在只靠座位上的 .response-focus 高亮，#responseQueue 面板已从产品移除
  const focused=async()=>(await page.locator('.response-focus').count())?await page.locator('.response-focus').innerText():'';
  await page.waitForFunction(()=>/张飞/.test(document.querySelector('.response-focus')?.innerText||''));
  assert.match(await focused(),/张飞/);
  await page.screenshot({path:'tests/artifacts/response-queue.png',animations:'disabled'});
  await page.evaluate(()=>__answer(null));
  await page.waitForFunction(()=>/赵云/.test(document.querySelector('.response-focus')?.innerText||''));
  await page.evaluate(()=>__answer(null));await page.waitForFunction(()=>__counterDone);
  assert.equal(await page.locator('.response-focus').count(),0);
  await page.evaluate(()=>{AI.decide=__oldDecide;AI.wantWuxie=__oldWant;});
  await page.evaluate(()=>{window.__pickDone=false;__game.ask(__game.human,{kind:'pickFrom',cards:__game.popDeck(3),prompt:'五谷丰登：选取一张牌'}).then(()=>window.__pickDone=true);});
  assert.match(await page.locator('#modal').innerText(),/五谷丰登.*选取一张牌/s);
  await page.locator('#modalBody .card').first().click();await page.waitForFunction(()=>__pickDone);
  await page.setViewportSize({width:1280,height:720});
  await page.evaluate(()=>{UI.request(__game,__game.human,{kind:'play'});});
  await page.screenshot({path:'tests/artifacts/battle-compact.png',animations:'disabled'});
  const compact=await page.locator('#btnEnd').boundingBox();assert.ok(compact.y+compact.height<=720);
 }finally{await browser.close();}
 assert.deepEqual(errors,[]);
 console.log('Battle UI passed: identity notes, both-side skill inspector, Huashen descriptions, centred controls, 9 effect families, target arrows, sequential counterspell highlights, harvest selection.');
})().catch(e=>{console.error(e);process.exitCode=1;});
