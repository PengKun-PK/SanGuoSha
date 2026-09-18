/* ============ 外部素材清单 ============
   游戏内置的卡面/立绘全部是 SVG 现画的，不需要任何图片就能跑。
   如果你想换成自己的图片，在这里登记即可（路径相对于 index.html）。

   · generals 的 key 是武将 id（见 js/data/generals.js，例如 guanyu、caocao）
   · cards    的 key 是卡牌名（例如 "杀"、"闪"、"青龙偃月刀"）

   例：
     generals: { guanyu: 'assets/generals/guanyu.jpg' },
     cards:    { '杀': 'assets/cards/sha.png' },

   也可以把 autoProbe 设为 true，游戏会自动去 assets/generals/<id>.png|jpg|webp
   和 assets/cards/<卡名>.png|jpg|webp 找图；代价是找不到时控制台会有一堆
   404 提示，所以默认关闭。
*/
window.ASSETS = {
  autoProbe: false,
  extensions: ['png','jpg','jpeg','webp'],
  generals: {},
  cards: {},
};

// Locally bundled, generated historical paintings. Rectangular atlas cells are
// clipped in the browser; no network connection is needed during a game.
const PORTRAIT_ROWS = [
 ['caocao','simayi','xiahoudun','zhangliao','xuchu','guojia','zhenji','liubei'],
 ['guanyu','zhangfei','zhugeliang','zhaoyun','machao','huangyueying','sunquan','ganning'],
 ['lvmeng','huanggai','zhouyu','daqiao','luxun','huatuo','lvbu','diaochan'],
 ['huaxiong','xiahouyuan','caoren','huangzhong','weiyan','xiaoqiao','zhoutai','zhangjiao'],
 ['yuji','dianwei','xunyu','pangtong','wolong','taishici','yuanshao','yanliangwenchou','pangde'],
 ['caopi','xuhuang','menghuo','zhurong','sunjian','lusu','dongzhuo','jiaxu'],
 ['zhanghe','dengai','jiangwei','liushan','sunce','erzhang','caiwenji','zuoci'],
];
PORTRAIT_ROWS.forEach((row,y)=>row.forEach((id,x)=>ASSETS.generals[id]={src:'assets/art/generals.png',x,y,cols:row.length,rows:7}));
const CARD_ART_NAMES=['杀','闪','桃','酒','无懈可击','无中生有','过河拆桥','顺手牵羊','决斗','借刀杀人','南蛮入侵','万箭齐发','桃园结义','五谷丰登','乐不思蜀','兵粮寸断','闪电','诸葛连弩','雌雄双股剑','青釭剑','寒冰剑','青龙偃月刀','丈八蛇矛','贯石斧','方天画戟','麒麟弓','八卦阵','仁王盾','藤甲','赤兔','的卢','绝影'];
CARD_ART_NAMES.forEach((name,i)=>ASSETS.cards[name]={src:'assets/art/cards.png',x:i%8,y:Math.floor(i/8),cols:8,rows:4});
for(const [name,base] of Object.entries({'大宛':'赤兔','紫骍':'绝影','爪黄飞电':'的卢','火攻':'兵粮寸断','铁索连环':'过河拆桥'}))ASSETS.cards[name]=ASSETS.cards[base];
