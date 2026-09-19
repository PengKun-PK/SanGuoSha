const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));fs.mkdirSync('tests/artifacts',{recursive:true});
 try{
  await page.goto('http://127.0.0.1:8765');await page.getByRole('button',{name:'开 始 游 戏'}).click();
  for(let year=2011;year<=2015;year++){await page.getByRole('button',{name:`一将成名 ${year}`,exact:true}).click();assert.equal(await page.locator('#pickList .gcard:visible').count(),11);}
  await page.screenshot({path:'tests/artifacts/yijiang-catalogue.png'});
  for(const pack of ['神·风','神·火','神·林','神·山']){await page.getByRole('button',{name:pack,exact:true}).click();assert.equal(await page.locator('#pickList .gcard:visible').count(),2);}
  await page.getByRole('button',{name:'全部',exact:true}).click();await page.getByRole('textbox',{name:'搜索武将或技能'}).fill('龙魂');assert.equal(await page.locator('#pickList .gcard:visible').count(),1);
  async function fixture(gid){await page.evaluate(gid=>{
   document.getElementById('pickScreen').classList.add('hidden');document.getElementById('gameScreen').classList.remove('hidden');U.wait=async()=>{};
   const g=new Game({count:5,aiThink:0});g.attach([gid,'caocao','guanyu','sunquan','zhangfei'].map((id,i)=>new Player(i,id,['zhu','fan','zhong','fan','nei'][i],i===0)));AI.setup(g);g.curPlayer=g.human;g.phase='play';g._yjInit=true;window.__game=g;window.__result=null;UI.build(g);
  },gid);}
  await fixture('shenzhaoyun');
  await page.evaluate(()=>{const p=__game.human;p.hp=2;p.hand=[makeCard('闪','diamond',2),makeCard('桃','diamond',3)];UI.refresh(__game);UI.request(__game,p,{kind:'play'}).then(r=>__result=r);});
  await page.getByRole('button',{name:'龙魂 → 杀',exact:true}).click();await page.locator('#handCards .card').nth(0).click();await page.locator('#handCards .card').nth(1).click();await page.locator('.seat.targetable').first().click();await page.getByRole('button',{name:'出牌',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>({count:__result.card.sub.length,nature:__result.card.nature,valid:__game.validPlay(__game.human,__result)})),{count:2,nature:'fire',valid:true});
  await fixture('shenlvbu');await page.evaluate(()=>{const p=__game.human;p.marks.wrath=6;UI.refresh(__game);UI.request(__game,p,{kind:'play'}).then(r=>__result=r);});
  assert.ok(await page.getByRole('button',{name:'神愤',exact:true}).isEnabled());assert.ok(await page.locator('.state-badge').filter({hasText:'暴怒 6'}).count());await page.getByRole('button',{name:'无前',exact:true}).click();assert.equal(await page.evaluate(()=>__result.skill),'wuqian');
  await page.screenshot({path:'tests/artifacts/god-skills.png'});
  await fixture('liufeng');await page.evaluate(()=>{const p=__game.players[1];p.skills=['xiansi'];p.marks.inverse=[makeCard('杀','club',7),makeCard('闪','heart',2)];UI.refresh(__game);UI.request(__game,__game.human,{kind:'play'}).then(r=>__result=r);});assert.ok(await page.getByRole('button',{name:'陷嗣出杀',exact:true}).isEnabled());await page.getByRole('button',{name:'结束出牌',exact:true}).click();
  await fixture('caozhi');await page.evaluate(()=>{const p=__game.human;p.hp=0;UI.request(__game,p,{kind:'respond',need:'桃',rescue:true,dying:p,cancelable:true}).then(r=>__result=r);});await page.locator('[data-ask="jiushi"]').click();await page.waitForFunction(()=>__result!==null);assert.equal(await page.evaluate(()=>__result.name),'酒');assert.equal(await page.evaluate(()=>__game.human.marks.turned),true);
  await fixture('zhongyao');await page.evaluate(()=>{const p=__game.human;p.hp=0;p.hand=[makeCard('决斗','club',7)];p.flags.basicUsed=['桃'];UI.refresh(__game);UI.request(__game,p,{kind:'respond',need:'桃',rescue:true,dying:p,cancelable:true}).then(r=>__result=r);});
  assert.equal(await page.locator('[data-ask="huomo"][data-as="桃"]').count(),0);
  await page.locator('[data-ask="huomo"][data-as="酒"]').click();await page.locator('#handCards .card').click();await page.locator('#btnOk').click();await page.waitForFunction(()=>__result!==null);assert.equal(await page.evaluate(()=>__result.name),'酒');
  assert.deepEqual(errors,[]);console.log('Yijiang UI passed: 55+8 catalogue, search, exact two-card Longhun fire slash, wrath display, active and communal skills, Jiushi and Huomo wine rescue.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
