const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const {portraits}=require('../assets/art/generals/prompts.json');
(async()=>{
 assert.equal(portraits.length,63);
 assert.equal(new Set(portraits.map(p=>p.id)).size,63);
 const hashes=new Set();
 for(const p of portraits){
  const bytes=fs.readFileSync(path.join(root,'assets/art/generals',p.id+'.webp'));
  assert.equal(bytes.toString('ascii',0,4),'RIFF',p.id);
  assert.equal(bytes.toString('ascii',8,12),'WEBP',p.id);
  hashes.add(crypto.createHash('sha256').update(bytes).digest('hex'));
 }
 assert.equal(hashes.size,63,'Every general must have distinct artwork');
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:960}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const out=path.join(root,'tests/artifacts');fs.mkdirSync(out,{recursive:true});
 try{
  await page.goto('http://127.0.0.1:8765');
  const decoded=await page.evaluate(async ids=>{
   const roster=Object.entries(GENERALS).filter(([,g])=>g.pack.startsWith('一将成名')||g.k==='god').map(([id])=>id).sort();
   const images=[];
   // Decode individually so full-resolution bitmap validation stays bounded.
   for(const id of ids){
    const src=ASSETS.generals[id],im=new Image();im.src=src;
    try{await im.decode();}catch{throw new Error(id+': cannot decode '+JSON.stringify(src));}
    images.push({id,src,w:im.naturalWidth,h:im.naturalHeight});
   }
   return {roster,images};
  },portraits.map(p=>p.id));
  assert.deepEqual(decoded.roster,portraits.map(p=>p.id).sort());
  for(const im of decoded.images){
   assert.equal(im.src,'assets/art/generals/'+im.id+'.webp');
   assert.ok(im.w>=768&&im.h>im.w,im.id+' portrait resolution');
  }
  await page.getByRole('button',{name:'开 始 游 戏'}).click();
  await page.waitForFunction(ids=>ids.every(id=>document.querySelector('[data-gid="'+id+'"]')?.classList.contains('img-bg')),portraits.map(p=>p.id));
  for(let year=2011;year<=2015;year++){
   await page.getByRole('button',{name:'一将成名 '+year,exact:true}).click();
   assert.equal(await page.locator('#pickList .gcard:visible').count(),11);
   await page.screenshot({path:path.join(out,'portraits-'+year+'.png')});
  }
  for(const pack of ['神·风','神·火','神·林','神·山']){
   await page.getByRole('button',{name:pack,exact:true}).click();
   assert.equal(await page.locator('#pickList .gcard.is-divine:visible').count(),2);
  }
  await page.getByRole('button',{name:'全部',exact:true}).click();
  // Gather the four divine packs in one screenshot using their real card DOM.
  await page.evaluate(()=>{for(const el of document.querySelectorAll('#pickList .gcard'))el.style.display=el.classList.contains('is-divine')?'':'none';});
  assert.equal(await page.locator('#pickList .gcard:visible').count(),8);
  assert.equal(await page.locator('#pickList .gcard.is-divine:visible').count(),8);
  await page.screenshot({path:path.join(out,'portraits-gods.png')});
  await page.evaluate(()=>{
   document.getElementById('pickScreen').classList.add('hidden');
   document.getElementById('gameScreen').classList.remove('hidden');
   const ids=['shenzhaoyun','shenguanyu','shenlvmeng','shenzhouyu','shenzhugeliang','shencaocao','shenlvbu','shensimayi'];
   const g=new Game({count:8,aiThink:0});
   g.attach(ids.map((id,i)=>{const p=new Player(i,id,['zhu','fan','zhong','fan','nei','zhong','fan','fan'][i],i===0);p.kingdom=['shu','wei','wu','qun'][i%4];return p;}));
   AI.setup(g);g.curPlayer=g.human;g.phase='play';g._yjInit=true;UI.build(g);UI.refresh(g);
  });
  await page.waitForFunction(()=>document.querySelectorAll('#gameScreen .is-divine.img-bg').length===8);
  for(const [width,height] of [[1440,960],[1024,768]]){
   await page.setViewportSize({width,height});
   await page.mouse.move(width/2,height/2);
   await page.screenshot({path:path.join(out,'portraits-battle-'+width+'.png')});
  }
  assert.deepEqual(errors,[]);
  console.log('Portraits passed: 63 unique WebP assets decoded, five packs, eight divine cards and battle avatars with chosen kingdoms.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
