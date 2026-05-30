const abilities = [
  '剑法天赋', '符箓精通', '炼丹奇才', '阵法大师', '御兽之能',
  '雷灵根', '冰灵根', '火灵根', '木灵根', '金灵根',
  '天生神力', '灵识过人', '体质特殊', '悟性超群', '气运加身'
];

const habits = [
  '每日晨练', '夜间修炼', '闭关悟道', '游历四方', '静坐冥想',
  '喜好饮酒', '嗜睡如命', '勤俭节约', '挥金如土', '洁癖严重',
  '夜猫子', '早起达人', '零食不离手', '手机成瘾', '咖啡依赖'
];

const preferences = [
  '独来独往', '结伴同行', '好勇斗狠', '以和为贵', '深藏不露',
  '爱管闲事', '明哲保身', '嫉恶如仇', '贪财好色', '淡泊名利',
  '摸鱼划水', '认真工作', '八卦达人', '社恐患者', '社交牛人'
];

const interests = [
  '收集法宝', '研究古籍', '培育灵药', '锻造兵器', '绘制符箓',
  '下棋对弈', '品茶论道', '烹饪美食', '园艺种植', '音乐欣赏',
  '追剧', '打游戏', '刷短视频', '网购', '健身'
];

const weapons = [
  '飞剑', '长枪', '大刀', '折扇', '玉笛',
  '铜镜', '宝塔', '金铃', '铁笔', '禅杖',
  '键盘', '鼠标', '咖啡杯', '保温杯', '文件夹'
];

const personalities = [
  '沉稳内敛', '张扬跋扈', '阴险狡诈', '豪爽直率', '温文尔雅',
  '冷酷无情', '热情开朗', '多愁善感', '谨小慎微', '胆大妄为',
  '佛系随缘', '卷王本王', '社畜本畜', '摸鱼大师', '加班狂魔'
];

const levels = [
  { name: '凡人', minExp: 0 },
  { name: '炼气期', minExp: 100 },
  { name: '筑基期', minExp: 300 },
  { name: '金丹期', minExp: 600 },
  { name: '元婴期', minExp: 1000 },
  { name: '化神期', minExp: 1500 },
  { name: '炼虚期', minExp: 2100 },
  { name: '合体期', minExp: 2800 },
  { name: '大乘期', minExp: 3600 },
  { name: '渡劫期', minExp: 4500 },
  { name: '真仙', minExp: 5500 }
];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateCharacter(name) {
  return {
    name,
    ability: getRandomItem(abilities),
    habit: getRandomItem(habits),
    preference: getRandomItem(preferences),
    interest: getRandomItem(interests),
    weapon: getRandomItem(weapons),
    personality: getRandomItem(personalities),
    level: '凡人',
    exp: 0
  };
}

function calculateLevel(exp) {
  let currentLevel = levels[0];
  for (let i = levels.length - 1; i >= 0; i--) {
    if (exp >= levels[i].minExp) {
      currentLevel = levels[i];
      break;
    }
  }
  return currentLevel.name;
}

function getNextLevel(currentLevel) {
  const currentIndex = levels.findIndex(l => l.name === currentLevel);
  if (currentIndex < levels.length - 1) {
    return levels[currentIndex + 1];
  }
  return null;
}

function getLevelInfo(levelName) {
  return levels.find(l => l.name === levelName);
}

module.exports = {
  generateCharacter,
  calculateLevel,
  getNextLevel,
  getLevelInfo,
  levels,
  abilities,
  habits,
  preferences,
  interests,
  weapons,
  personalities
};
