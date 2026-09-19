// Encode generated originals for the game without changing their composition.
// PNG originals are kept in ignored tests/artifacts/portrait-originals.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const dir=path.join(root,'assets/art/generals');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 let sourceBytes=0,outputBytes=0,count=0;
 try{
  const page=await browser.newPage();
  const originals=path.join(root,'tests/artifacts/portrait-originals');
  fs.mkdirSync(originals,{recursive:true});
  for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.png'))){
   const source=path.join(dir,file),buf=fs.readFileSync(source);
   const encoded=await page.evaluate(async src=>{
    const im=new Image();im.src=src;await im.decode();
    const canvas=document.createElement('canvas');
    canvas.width=im.naturalWidth;canvas.height=im.naturalHeight;
    canvas.getContext('2d').drawImage(im,0,0);
    return canvas.toDataURL('image/webp',0.86);
   },'data:image/png;base64,'+buf.toString('base64'));
   if(!encoded.startsWith('data:image/webp;base64,'))throw new Error('WebP encoder unavailable');
   const out=Buffer.from(encoded.split(',')[1],'base64');
   fs.writeFileSync(source.replace(/\.png$/,'.webp'),out);
   fs.renameSync(source,path.join(originals,file));
   sourceBytes+=buf.length;outputBytes+=out.length;count++;
  }
  console.log(JSON.stringify({count,sourceBytes,outputBytes}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
