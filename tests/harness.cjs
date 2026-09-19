const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function engine(seed=12837){
 const node={appendChild(){},classList:{add(){},remove(){},toggle(){}},querySelector(){return this},style:{},children:[]};
 const context=vm.createContext({console,setTimeout:()=>0,clearTimeout,document:{createElement:()=>({...node}),getElementById:()=>node},window:{},innerWidth:1440,innerHeight:900});
 vm.runInContext(`{let seed=${seed};Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}`,context);
 for(const file of ['js/core/util.js','js/data/cards.js','js/data/generals.js','js/core/skills.js','js/core/game.js','js/core/expansion.js','js/core/yijiang.js','js/core/yijiang-skills.js','js/core/yijiang-later.js','js/core/god.js','js/ai/ai.js','js/core/yijiang-hooks.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context,{filename:file});
 vm.runInContext(`U.wait=async()=>{};const UI=new Proxy({},{get:()=>()=>{}});const FX=new Proxy({},{get:()=>async()=>{}});Game.prototype.log=function(s){this.logs.push(s)};Game.prototype.logTurn=function(){};Game.prototype.finish=function(w){this.over=true;this.winner=w};globalThis.api={Game,Player,GENERALS,SKILLS,SKILL_TEXT,Skills,VIEW_AS,AI,EX,makeCard,makeVirtual,CARD_INFO,CardEffect,realCards};`,context);
 const a=context.api;
 a.game=(gids=['caocao','zhangfei','zhaoyun','sunquan','guanyu'])=>{const g=new a.Game({count:gids.length,aiThink:0,diff:'hard'});g.attach(gids.map((id,i)=>new a.Player(i,id,(gids.length===8?['zhu','zhong','zhong','fan','fan','fan','fan','nei']:['zhu','fan','zhong','fan','nei'])[i],false)));g.curPlayer=g.players[0];g.phase='play';a.AI.setup(g);return g;};
 return a;
}

module.exports={engine};
