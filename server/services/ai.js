const OpenAI = require('openai');
require('dotenv').config();

let openai = null;

function getOpenAIClient() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.AI_API_KEY || 'dummy-key',
      baseURL: process.env.AI_API_BASE_URL || 'https://api.openai.com/v1'
    });
  }
  return openai;
}

function buildStoryPrompt(characters, storyNumber) {
  const characterDescriptions = characters.map((c, i) => 
    `角色${i + 1}：${c.name}
- 性格：${c.personality}
- 能力：${c.ability}
- 习惯：${c.habit}
- 偏好：${c.preference}
- 兴趣：${c.interest}
- 善用武器：${c.weapon}
- 当前境界：${c.level}`
  ).join('\n\n');

  return `你是一个修仙小说作家，正在创作一部轻松幽默的修仙小说。

当前是第${storyNumber}个故事片段。以下是参与修仙的角色信息：

${characterDescriptions}

请创作一个有趣的故事片段（200-300字），要求：
1. 故事要包含所有角色，让每个角色都有参与
2. 风格可以搞笑幽默，也可以偶尔正经热血
3. 根据每个角色的性格、能力、武器等特点来描写他们的表现
4. 故事要有一定的戏剧性和趣味性
5. 可以涉及修炼、比试、奇遇、日常等各种场景
6. 故事结尾要为后续发展留下悬念

请直接输出故事内容，不要添加任何解释或前缀。`;
}

function parseLevelChangesFromStory(story, characters) {
  const changes = [];
  const levelUpKeywords = ['突破', '领悟', '顿悟', '晋升', '提升', '进化', '感悟'];
  const expGainKeywords = ['修炼', '战斗', '感悟', '历练', '参悟'];
  
  characters.forEach(char => {
    let expGain = 10;
    let levelUp = false;
    
    if (story.includes(char.name)) {
      const charContext = story.substring(
        Math.max(0, story.indexOf(char.name) - 50),
        Math.min(story.length, story.indexOf(char.name) + 100)
      );
      
      levelUpKeywords.forEach(keyword => {
        if (charContext.includes(keyword)) {
          levelUp = true;
          expGain += 20;
        }
      });
      
      expGainKeywords.forEach(keyword => {
        if (charContext.includes(keyword)) {
          expGain += 5;
        }
      });
    }
    
    changes.push({
      characterId: char.id,
      characterName: char.name,
      expGain,
      levelUp
    });
  });
  
  return changes;
}

async function generateStory(characters, storyNumber, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = getOpenAIClient();
      const prompt = buildStoryPrompt(characters, storyNumber);
      
      const completion = await client.chat.completions.create({
        model: process.env.AI_MODEL || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: '你是一个擅长修仙小说创作的作家，风格幽默有趣。' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.8
      });
      
      const story = completion.choices[0].message.content.trim();
      const changes = parseLevelChangesFromStory(story, characters);
      
      return { story, changes };
    } catch (error) {
      console.error(`AI生成故事失败 (尝试 ${attempt}/${maxRetries}):`, error.message);
      
      if (attempt === maxRetries) {
        return generateFallbackStory(characters, storyNumber);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

function generateFallbackStory(characters, storyNumber) {
  const scenarios = [
    '众人齐聚一堂，共同参悟天道玄机。',
    '一场突如其来的灵气风暴席卷了修炼场。',
    '神秘的古迹现世，众人纷纷前往探索。',
    '一位神秘老者降临，带来了难得的机缘。',
    '众人在山间发现了一处灵泉，争相修炼。'
  ];
  
  const scenario = scenarios[storyNumber % scenarios.length];
  
  let story = `【第${storyNumber}章】${scenario}\n\n`;
  
  characters.forEach((char, index) => {
    const actions = [
      `${char.name}手持${char.weapon}，${char.personality}地站在一旁，${char.ability}的天赋在此刻展现无遗。`,
      `${char.name}一边${char.habit}，一边用${char.weapon}施展着${char.ability}的神通，${char.preference}的性格表露无遗。`,
      `${char.name}对${char.interest}的热爱在此刻得到了回报，凭借${char.ability}成功${char.preference}。`
    ];
    story += actions[index % actions.length] + '\n';
  });
  
  story += '\n一番机缘巧合之下，众人都有所感悟...';
  
  const changes = characters.map(char => ({
    characterId: char.id,
    characterName: char.name,
    expGain: 15,
    levelUp: false
  }));
  
  return { story, changes };
}

module.exports = {
  generateStory
};
