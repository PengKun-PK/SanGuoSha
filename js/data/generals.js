/* ================= 武将 · 数据定义 ================= */
/* k: 势力 wei/shu/wu/qun   hp: 体力上限   sex: m/f   lord: 是否主公技拥有者
   skills: 技能 id 列表（实现见 skills.js）
   art: 用于程序化头像生成的风格参数 { hue, beard, hat, aura }               */

const GENERALS = {
  /* ---------------- 魏 ---------------- */
  caocao:   {name:'曹操', k:'wei', hp:4, sex:'m', lord:true,
    skills:['jianxiong','hujia'], art:{hue:218,beard:2,hat:'crown',aura:'#4a7fd6'}},
  simayi:   {name:'司马懿', k:'wei', hp:3, sex:'m',
    skills:['fankui','guicai'], art:{hue:232,beard:1,hat:'guan',aura:'#5566cc'}},
  xiahoudun:{name:'夏侯惇', k:'wei', hp:4, sex:'m',
    skills:['ganglie'], art:{hue:205,beard:2,hat:'helm',aura:'#3f74c9',eye:true}},
  zhangliao:{name:'张辽', k:'wei', hp:4, sex:'m',
    skills:['tuxi'], art:{hue:200,beard:1,hat:'helm',aura:'#4d86d9'}},
  xuchu:    {name:'许褚', k:'wei', hp:4, sex:'m',
    skills:['luoyi'], art:{hue:196,beard:3,hat:'none',aura:'#5f93e0',bulk:true}},
  guojia:   {name:'郭嘉', k:'wei', hp:3, sex:'m',
    skills:['tiandu','yiji'], art:{hue:240,beard:0,hat:'jin',aura:'#7d8ff0'}},
  zhenji:   {name:'甄姬', k:'wei', hp:3, sex:'f',
    skills:['qingguo','luoshen'], art:{hue:250,beard:0,hat:'fa',aura:'#9a86e8'}},

  /* ---------------- 蜀 ---------------- */
  liubei:   {name:'刘备', k:'shu', hp:4, sex:'m', lord:true,
    skills:['rende','jijiang'], art:{hue:8,beard:2,hat:'crown',aura:'#d4574a'}},
  guanyu:   {name:'关羽', k:'shu', hp:4, sex:'m',
    skills:['wusheng'], art:{hue:150,beard:4,hat:'guan',aura:'#2f9f6a',face:'#c8524a'}},
  zhangfei: {name:'张飞', k:'shu', hp:4, sex:'m',
    skills:['paoxiao'], art:{hue:18,beard:4,hat:'helm',aura:'#c96a3a',bulk:true}},
  zhugeliang:{name:'诸葛亮', k:'shu', hp:3, sex:'m',
    skills:['guanxing','kongcheng'], art:{hue:44,beard:1,hat:'jin',aura:'#d8c46a'}},
  zhaoyun:  {name:'赵云', k:'shu', hp:4, sex:'m',
    skills:['longdan'], art:{hue:210,beard:0,hat:'helm',aura:'#89b7e8'}},
  machao:   {name:'马超', k:'shu', hp:4, sex:'m',
    skills:['mashu','tieqi'], art:{hue:350,beard:0,hat:'helm',aura:'#e0687a'}},
  huangyueying:{name:'黄月英', k:'shu', hp:3, sex:'f',
    skills:['jizhi','qicai'], art:{hue:96,beard:0,hat:'fa',aura:'#86c46a'}},

  /* ---------------- 吴 ---------------- */
  sunquan:  {name:'孙权', k:'wu', hp:4, sex:'m', lord:true,
    skills:['zhiheng','jiuyuan'], art:{hue:140,beard:2,hat:'crown',aura:'#3fa06a'}},
  ganning:  {name:'甘宁', k:'wu', hp:4, sex:'m',
    skills:['qixi'], art:{hue:172,beard:1,hat:'jin',aura:'#37a9a0'}},
  lvmeng:   {name:'吕蒙', k:'wu', hp:4, sex:'m',
    skills:['keji'], art:{hue:128,beard:2,hat:'helm',aura:'#4aa870'}},
  huanggai: {name:'黄盖', k:'wu', hp:4, sex:'m',
    skills:['kurou'], art:{hue:26,beard:3,hat:'none',aura:'#c98a3a'}},
  zhouyu:   {name:'周瑜', k:'wu', hp:3, sex:'m',
    skills:['yingzi','fanjian'], art:{hue:160,beard:0,hat:'guan',aura:'#48c090'}},
  daqiao:   {name:'大乔', k:'wu', hp:3, sex:'f',
    skills:['guose','liuli'], art:{hue:184,beard:0,hat:'fa',aura:'#6fd0d0'}},
  luxun:    {name:'陆逊', k:'wu', hp:3, sex:'m',
    skills:['qianxun','lianying'], art:{hue:110,beard:0,hat:'jin',aura:'#7fc27a'}},

  /* ---------------- 群 ---------------- */
  huatuo:   {name:'华佗', k:'qun', hp:3, sex:'m',
    skills:['qingnang','jijiu'], art:{hue:70,beard:3,hat:'jin',aura:'#c0b45a'}},
  lvbu:     {name:'吕布', k:'qun', hp:4, sex:'m',
    skills:['wushuang'], art:{hue:30,beard:1,hat:'helm',aura:'#d09030',bulk:true}},
  diaochan: {name:'貂蝉', k:'qun', hp:3, sex:'f',
    skills:['lijian','biyue'], art:{hue:320,beard:0,hat:'fa',aura:'#dd7fc0'}},
  huaxiong: {name:'华雄', k:'qun', hp:6, sex:'m',
    skills:['yaowu'], art:{hue:16,beard:3,hat:'helm',aura:'#b35a2a',bulk:true}},
};

const KINGDOM_NAME = {wei:'魏',shu:'蜀',wu:'吴',qun:'群'};
const LORD_LIST = ['caocao','liubei','sunquan'];

/* 技能描述（展示用，实际逻辑在 skills.js） */
const SKILL_TEXT = {
  jianxiong:['奸雄','当你受到伤害后，你可以获得对你造成伤害的牌。'],
  hujia:['护驾','主公技，当你需要使用或打出【闪】时，你可以令其他魏势力角色打出一张【闪】（视为由你使用或打出）。'],
  fankui:['反馈','当你受到伤害后，你可以获得伤害来源的一张牌。'],
  guicai:['鬼才','当一名角色的判定牌生效前，你可以打出一张手牌代替之。'],
  ganglie:['刚烈','当你受到伤害后，你可以进行判定：若结果不为红桃，则伤害来源选择：弃置两张手牌，或受到你造成的1点伤害。'],
  tuxi:['突袭','摸牌阶段，你可以放弃摸牌，改为获得至多两名其他角色的各一张手牌。'],
  luoyi:['裸衣','摸牌阶段，你可以少摸一张牌。若如此做，本回合你使用【杀】或【决斗】造成的伤害+1。'],
  tiandu:['天妒','当你的判定牌生效后，你可以获得之。'],
  yiji:['遗计','当你受到1点伤害后，你可以摸两张牌，然后你可以将其中任意张交给其他角色。'],
  qingguo:['倾国','你可以将一张黑色手牌当【闪】使用或打出。'],
  luoshen:['洛神','准备阶段，你可以进行判定：若结果为黑色，你获得此牌并可以重复此流程。'],
  rende:['仁德','出牌阶段，你可以将任意张手牌交给其他角色。你于此阶段交出第二张牌时，回复1点体力。'],
  jijiang:['激将','主公技，当你需要使用或打出【杀】时，你可以令其他蜀势力角色打出一张【杀】（视为由你使用或打出）。'],
  wusheng:['武圣','你可以将一张红色牌当【杀】使用或打出。'],
  paoxiao:['咆哮','锁定技，出牌阶段你使用【杀】无次数限制。'],
  guanxing:['观星','准备阶段，你可以观看牌堆顶的X张牌（X为存活角色数，至多5），然后以任意顺序放回牌堆顶或牌堆底。'],
  kongcheng:['空城','锁定技，若你没有手牌，你不能成为【杀】或【决斗】的目标。'],
  longdan:['龙胆','你可以将一张【杀】当【闪】、或将一张【闪】当【杀】使用或打出。'],
  mashu:['马术','锁定技，你计算与其他角色的距离时-1。'],
  tieqi:['铁骑','当你使用【杀】指定目标后，你可以进行判定：若结果为红色，该角色不能使用【闪】响应。'],
  jizhi:['集智','当你使用一张非延时类锦囊牌时，你可以摸一张牌。'],
  qicai:['奇才','锁定技，你使用锦囊牌无距离限制。'],
  zhiheng:['制衡','出牌阶段限一次，你可以弃置任意张牌，然后摸等量的牌。'],
  jiuyuan:['救援','主公技，其他吴势力角色对你使用【桃】时，你额外回复1点体力。'],
  qixi:['奇袭','你可以将一张黑色牌当【过河拆桥】使用。'],
  keji:['克己','若你未于出牌阶段使用或打出过【杀】，你可以跳过弃牌阶段。'],
  kurou:['苦肉','出牌阶段，你可以失去1点体力，然后摸两张牌。'],
  yingzi:['英姿','摸牌阶段，你可以多摸一张牌。'],
  fanjian:['反间','出牌阶段限一次，你可以令一名其他角色选择一种花色，然后其获得你的一张手牌并展示。若花色不同，该角色受到你造成的1点伤害。'],
  guose:['国色','你可以将一张方块牌当【乐不思蜀】使用。'],
  liuli:['流离','当你成为【杀】的目标时，你可以弃置一张牌，将此【杀】转移给你攻击范围内的另一名角色。'],
  qianxun:['谦逊','锁定技，你不能成为【顺手牵羊】和【乐不思蜀】的目标。'],
  lianying:['连营','当你失去最后的手牌时，你可以摸一张牌。'],
  qingnang:['青囊','出牌阶段限一次，你可以弃置一张手牌，令一名已受伤的角色回复1点体力。'],
  jijiu:['急救','你的回合外，你可以将一张红色牌当【桃】使用。'],
  wushuang:['无双','锁定技，当你使用【杀】时，目标需连续打出两张【闪】；当你使用【决斗】时，对方需连续打出两张【杀】。'],
  lijian:['离间','出牌阶段限一次，你可以弃置一张牌，令两名男性角色进行决斗（视为前者对后者使用【决斗】）。'],
  biyue:['闭月','结束阶段，你可以摸一张牌。'],
  yaowu:['耀武','锁定技，当你受到【杀】造成的伤害时，若该【杀】为红色，则伤害来源摸一张牌。'],
};

const IDENTITY = {
  zhu:  {name:'主公', cls:'zhu',  desc:'消灭所有反贼和内奸'},
  zhong:{name:'忠臣', cls:'zhong',desc:'保护主公，消灭反贼与内奸'},
  fan:  {name:'反贼', cls:'fan',  desc:'杀死主公'},
  nei:  {name:'内奸', cls:'nei',  desc:'先助主公除掉所有人，再单挑主公'},
};

/* 不同人数的身份配置 */
const IDENTITY_SETUP = {
  5:['zhu','zhong','fan','fan','nei'],
  6:['zhu','zhong','fan','fan','fan','nei'],
  8:['zhu','zhong','zhong','fan','fan','fan','fan','nei'],
};
