/* ================= 牌 · 数据定义 ================= */

const SUIT = {
  spade:  {name:'黑桃', sym:'♠', color:'b'},
  heart:  {name:'红桃', sym:'♥', color:'r'},
  club:   {name:'梅花', sym:'♣', color:'b'},
  diamond:{name:'方块', sym:'♦', color:'r'},
};
const NUM_TXT = [null,'A','2','3','4','5','6','7','8','9','10','J','Q','K'];

/* ---------- 牌面信息 ----------
   ct   : basic | trick | delay | equip   （决定配色与分类标签）
   tgt  : 目标规则
          {min,max, self:'only'|'no'|'ok', range:true(受攻击范围限制),
           dist:n(距离限制), need:'card'(目标须有牌) , all:'others'|'alive'}
*/
const CARD_INFO = {
  /* ===== 基本牌 ===== */
  '杀':{ct:'basic',type:'basic',tag:'基本',
    tgt:{min:1,max:1,self:'no',range:true},
    short:'对攻击范围内一名角色使用。目标需打出【闪】，否则受到1点伤害。',
    desc:'出牌阶段限一次，对你攻击范围内的一名角色使用。目标需打出一张【闪】，否则受到你造成的1点伤害。'},
  '闪':{ct:'basic',type:'basic',tag:'基本',tgt:null,
    short:'当你成为【杀】的目标时，打出以抵消之。',
    desc:'当你成为【杀】的目标时，你可以打出一张【闪】以抵消之。'},
  '桃':{ct:'basic',type:'basic',tag:'基本',
    tgt:{min:1,max:1,self:'only'},
    short:'对自己使用回复1点体力；有角色濒死时可对其使用。',
    desc:'出牌阶段，对自己使用，回复1点体力。当有角色处于濒死状态时，可对其使用。'},
  '酒':{ct:'basic',type:'basic',tag:'基本',
    tgt:{min:1,max:1,self:'only'},
    short:'本回合下一张【杀】伤害+1；濒死时使用可回复1点体力。',
    desc:'出牌阶段限一次，使用后本回合内下一张【杀】伤害+1；或于濒死时使用，回复1点体力。'},

  /* ===== 普通锦囊 ===== */
  '无懈可击':{ct:'trick',type:'trick',tag:'锦囊',tgt:null,
    short:'抵消一张锦囊对一名角色的效果，或抵消另一张【无懈可击】。',
    desc:'当一张锦囊牌生效前，你可以使用之抵消该牌对一名角色产生的效果，或抵消另一张【无懈可击】。'},
  '无中生有':{ct:'trick',type:'trick',tag:'锦囊',
    tgt:{min:1,max:1,self:'only'},
    short:'对自己使用，摸两张牌。',
    desc:'出牌阶段，对自己使用。摸两张牌。'},
  '过河拆桥':{ct:'trick',type:'trick',tag:'锦囊',
    tgt:{min:1,max:1,self:'no',need:'card'},
    short:'弃置一名其他角色区域里的一张牌。',
    desc:'出牌阶段，对一名区域内有牌的其他角色使用。弃置其区域里的一张牌。'},
  '顺手牵羊':{ct:'trick',type:'trick',tag:'锦囊',
    tgt:{min:1,max:1,self:'no',need:'card',dist:1},
    short:'获得距离1以内一名角色区域里的一张牌。',
    desc:'出牌阶段，对距离1以内且区域内有牌的一名其他角色使用。获得其区域里的一张牌。'},
  '决斗':{ct:'trick',type:'trick',tag:'锦囊',
    tgt:{min:1,max:1,self:'no'},
    short:'与目标轮流打出【杀】，先不出的一方受到1点伤害。',
    desc:'出牌阶段，对一名其他角色使用。由目标开始，双方轮流打出一张【杀】，首先不出的一方受到对方造成的1点伤害。'},
  '借刀杀人':{ct:'trick',type:'trick',tag:'锦囊',
    tgt:{min:1,max:1,self:'no',need:'weapon'},
    short:'令装备武器者对你指定的角色使用【杀】，否则交出武器。',
    desc:'出牌阶段，对一名装备了武器的其他角色使用。该角色需对其攻击范围内你指定的另一角色使用【杀】，否则将武器交给你。'},
  '南蛮入侵':{ct:'trick',type:'trick',tag:'锦囊',tgt:{all:'others'},
    short:'所有其他角色需打出【杀】，否则受到1点伤害。',
    desc:'出牌阶段，对所有其他角色使用。每名目标需打出一张【杀】，否则受到你造成的1点伤害。'},
  '万箭齐发':{ct:'trick',type:'trick',tag:'锦囊',tgt:{all:'others'},
    short:'所有其他角色需打出【闪】，否则受到1点伤害。',
    desc:'出牌阶段，对所有其他角色使用。每名目标需打出一张【闪】，否则受到你造成的1点伤害。'},
  '桃园结义':{ct:'trick',type:'trick',tag:'锦囊',tgt:{all:'alive'},
    short:'所有角色各回复1点体力。',
    desc:'出牌阶段，对所有角色使用。每名目标回复1点体力。'},
  '五谷丰登':{ct:'trick',type:'trick',tag:'锦囊',tgt:{all:'alive'},
    short:'亮出等同存活人数的牌，由你开始每人选走一张。',
    desc:'出牌阶段，对所有角色使用。从牌堆亮出等同存活人数的牌，由你开始每人选走一张。'},

  /* ===== 延时锦囊 ===== */
  '乐不思蜀':{ct:'delay',type:'delay',tag:'延时',
    tgt:{min:1,max:1,self:'no',noDup:true},
    short:'置于判定区。判定不为红桃则跳过其出牌阶段。',
    desc:'出牌阶段，对一名其他角色使用，置于其判定区。其判定阶段判定：若结果不为红桃，跳过其出牌阶段。'},
  '兵粮寸断':{ct:'delay',type:'delay',tag:'延时',
    tgt:{min:1,max:1,self:'no',dist:1,noDup:true},
    short:'置于判定区。判定不为梅花则跳过其摸牌阶段。',
    desc:'出牌阶段，对距离1以内的一名其他角色使用，置于其判定区。其判定阶段判定：若结果不为梅花，跳过其摸牌阶段。'},
  '闪电':{ct:'delay',type:'delay',tag:'延时',
    tgt:{min:1,max:1,self:'only',noDup:true},
    short:'判定为黑桃2~9则受3点雷电伤害，否则移至下家判定区。',
    desc:'出牌阶段，对自己使用，置于判定区。判定阶段判定：若为黑桃2~9，则受到3点雷电伤害；否则将之移动到下家的判定区。'},

  /* ===== 装备 ===== */
  '诸葛连弩':{ct:'equip',type:'equip',slot:'weapon',range:1,tag:'武器',
    short:'锁定技，出牌阶段你使用【杀】无次数限制。',
    desc:'锁定技，出牌阶段你使用【杀】无次数限制。'},
  '雌雄双股剑':{ct:'equip',type:'equip',slot:'weapon',range:2,tag:'武器',
    short:'对异性使用【杀】时，令其弃一张手牌或你摸一张牌。',
    desc:'当你指定异性角色为【杀】的目标后，你可令其选择：弃置一张手牌，或令你摸一张牌。'},
  '青釭剑':{ct:'equip',type:'equip',slot:'weapon',range:2,tag:'武器',
    short:'锁定技，你的【杀】无视目标角色的防具。',
    desc:'锁定技，你的【杀】无视目标角色的防具。'},
  '寒冰剑':{ct:'equip',type:'equip',slot:'weapon',range:2,tag:'武器',
    short:'【杀】造成伤害时，可改为弃置其两张牌。',
    desc:'当你的【杀】造成伤害时，你可以防止此伤害，改为弃置其两张牌。'},
  '青龙偃月刀':{ct:'equip',type:'equip',slot:'weapon',range:3,tag:'武器',
    short:'你使用的【杀】被抵消后，可对其继续使用【杀】。',
    desc:'当你使用的【杀】被抵消时，你可以对其继续使用一张【杀】。'},
  '丈八蛇矛':{ct:'equip',type:'equip',slot:'weapon',range:3,tag:'武器',
    short:'你可以将两张手牌当作一张普通【杀】使用或打出。',
    desc:'你可以将两张手牌当做一张普通【杀】使用或打出。'},
  '贯石斧':{ct:'equip',type:'equip',slot:'weapon',range:3,tag:'武器',
    short:'【杀】被抵消时，可弃置两张牌令其依然造成伤害。',
    desc:'当你使用的【杀】被抵消时，你可以弃置两张牌，令此【杀】依然造成伤害。'},
  '方天画戟':{ct:'equip',type:'equip',slot:'weapon',range:4,tag:'武器',
    short:'锁定技，【杀】为最后手牌时可指定至多三个目标。',
    desc:'锁定技，当你使用的【杀】是你最后的手牌时，此【杀】可以指定至多三个目标。'},
  '麒麟弓':{ct:'equip',type:'equip',slot:'weapon',range:5,tag:'武器',
    short:'【杀】造成伤害时，可弃置目标装备区的一匹坐骑。',
    desc:'当你使用的【杀】对目标角色造成伤害时，你可以弃置其装备区里的一匹坐骑。'},

  '八卦阵':{ct:'equip',type:'equip',slot:'armor',tag:'防具',
    short:'需要【闪】时可进行判定，结果为红色则视为【闪】。',
    desc:'当你需要使用或打出【闪】时，你可以进行judge判定，若结果为红色，视为你使用或打出了一张【闪】。'},
  '仁王盾':{ct:'equip',type:'equip',slot:'armor',tag:'防具',
    short:'锁定技，黑色的【杀】对你无效。',
    desc:'锁定技，黑色的【杀】对你无效。'},
  '藤甲':{ct:'equip',type:'equip',slot:'armor',tag:'防具',
    short:'锁定技，【南蛮】【万箭】和普通【杀】对你无效；火焰伤害+1。',
    desc:'锁定技，【南蛮入侵】【万箭齐发】和普通【杀】对你无效；你受到火焰伤害+1。'},

  '赤兔':{ct:'equip',type:'equip',slot:'horseMinus',tag:'-1坐骑',short:'锁定技，你计算与其他角色的距离时−1。',
    desc:'锁定技，你计算与其他角色的距离时-1。'},
  '大宛':{ct:'equip',type:'equip',slot:'horseMinus',tag:'-1坐骑',short:'锁定技，你计算与其他角色的距离时−1。',
    desc:'锁定技，你计算与其他角色的距离时-1。'},
  '紫骍':{ct:'equip',type:'equip',slot:'horseMinus',tag:'-1坐骑',short:'锁定技，你计算与其他角色的距离时−1。',
    desc:'锁定技，你计算与其他角色的距离时-1。'},
  '的卢':{ct:'equip',type:'equip',slot:'horsePlus',tag:'+1坐骑',short:'锁定技，其他角色计算与你的距离时+1。',
    desc:'锁定技，其他角色计算与你的距离时+1。'},
  '绝影':{ct:'equip',type:'equip',slot:'horsePlus',tag:'+1坐骑',short:'锁定技，其他角色计算与你的距离时+1。',
    desc:'锁定技，其他角色计算与你的距离时+1。'},
  '爪黄飞电':{ct:'equip',type:'equip',slot:'horsePlus',tag:'+1坐骑',short:'锁定技，其他角色计算与你的距离时+1。',
    desc:'锁定技，其他角色计算与你的距离时+1。'},
};

const SLOT_NAME = {weapon:'武器',armor:'防具',horseMinus:'−1',horsePlus:'+1'};
const SLOT_ICON = {weapon:'⚔',armor:'⛨',horseMinus:'➤',horsePlus:'⚑'};

/* ---------- 牌堆构成 ---------- */
const DECK_LIST = [
  ['杀','spade',[2,3,7,8,8,9,9,10,10]],
  ['杀','club',[2,3,4,5,6,7,8,8,9,9,10,10]],
  ['杀','heart',[10,10,11]],
  ['杀','diamond',[6,7,8,9,10,13]],
  ['闪','heart',[2,2,13]],
  ['闪','diamond',[2,2,3,4,5,6,7,8,9,10,11,12]],
  ['桃','heart',[3,4,6,7,8,9,12]],
  ['桃','diamond',[2]],
  ['酒','spade',[3,9]],
  ['酒','club',[3,9]],
  ['无懈可击','spade',[11,13]],
  ['无懈可击','club',[1,12,13]],
  ['无懈可击','heart',[1]],
  ['无懈可击','diamond',[12]],
  ['无中生有','heart',[7,8,9,11]],
  ['过河拆桥','spade',[3,4,12]],
  ['过河拆桥','club',[3,4]],
  ['过河拆桥','heart',[12]],
  ['顺手牵羊','spade',[3,4,11]],
  ['顺手牵羊','diamond',[3,4]],
  ['决斗','spade',[1]],
  ['决斗','club',[1]],
  ['决斗','diamond',[1]],
  ['南蛮入侵','spade',[7,13]],
  ['南蛮入侵','club',[7]],
  ['万箭齐发','heart',[1]],
  ['桃园结义','heart',[1]],
  ['五谷丰登','heart',[3,4]],
  ['借刀杀人','club',[12,13]],
  ['闪电','spade',[1]],
  ['闪电','heart',[12]],
  ['乐不思蜀','spade',[6]],
  ['乐不思蜀','club',[6]],
  ['乐不思蜀','heart',[6]],
  ['兵粮寸断','spade',[10]],
  ['兵粮寸断','club',[4]],
  ['诸葛连弩','spade',[1]],
  ['诸葛连弩','club',[1]],
  ['雌雄双股剑','spade',[2]],
  ['青釭剑','spade',[6]],
  ['寒冰剑','spade',[2]],
  ['青龙偃月刀','spade',[5]],
  ['丈八蛇矛','spade',[12]],
  ['贯石斧','diamond',[5]],
  ['方天画戟','diamond',[12]],
  ['麒麟弓','heart',[5]],
  ['八卦阵','spade',[2]],
  ['八卦阵','club',[2]],
  ['仁王盾','club',[2]],
  ['藤甲','spade',[2]],
  ['赤兔','heart',[5]],
  ['大宛','spade',[13]],
  ['紫骍','diamond',[13]],
  ['的卢','club',[5]],
  ['绝影','spade',[5]],
  ['爪黄飞电','heart',[13]],
];

let _cardUid = 0;
function makeCard(name, suit, num){
  const info = CARD_INFO[name];
  return {
    uid: ++_cardUid,
    name, suit, num,
    ct: info.ct, type: info.type, slot: info.slot || null,
    range: info.range || 0,
    virtual:false, sub:null, viaSkill:null,
  };
}
/* 虚拟牌：把若干实体牌当作某张牌使用 */
function makeVirtual(name, subCards, skillId){
  const info = CARD_INFO[name];
  const one = subCards.length===1 ? subCards[0] : null;
  return {
    uid: -(++_cardUid),
    name,
    suit: one ? one.suit : 'none',
    num:  one ? one.num  : 0,
    ct: info.ct, type: info.type, slot: info.slot||null, range: info.range||0,
    virtual:true, sub: subCards.slice(), viaSkill: skillId||null,
  };
}
function buildDeck(){
  const deck=[];
  for(const [name,suit,nums] of DECK_LIST)
    for(const n of nums) deck.push(makeCard(name,suit,n));
  return U.shuffle(deck);
}

const isRed   = c => c.suit==='heart' || c.suit==='diamond' || (c.virtual && c.sub.length>1 && c.sub.every(isRed));
const isBlack = c => c.suit==='spade' || c.suit==='club' || (c.virtual && c.sub.length>1 && c.sub.every(isBlack));
const cardTxt = c => `${SUIT[c.suit]?SUIT[c.suit].sym:''}${c.num?NUM_TXT[c.num]:''}【${c.name}】`;
/* 一张虚拟/实体牌实际占用的实体牌 */
const realCards = c => c.virtual ? c.sub : [c];
