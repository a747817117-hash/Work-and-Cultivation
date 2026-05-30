const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const db = require(path.join(__dirname, '..', 'models', 'db'));
const characterService = require(path.join(__dirname, '..', 'services', 'character'));
const gameEngine = require(path.join(__dirname, '..', 'services', 'gameEngine'));

const router = express.Router();

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: '未登录' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'token无效' });
  }
}

router.get('/', async (req, res) => {
  try {
    const rooms = await db.rooms.find({}).sort({ created_at: -1 });
    
    const roomsWithDetails = await Promise.all(rooms.map(async (room) => {
      const creator = await db.users.findOne({ _id: room.creator_id });
      const playerCount = await db.characters.count({ room_id: room._id });
      return {
        ...room,
        creator_name: creator ? creator.username : '未知',
        player_count: playerCount
      };
    }));
    
    res.json({ rooms: roomsWithDetails });
  } catch (error) {
    console.error('获取房间列表错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, maxStories, storyInterval } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: '房间名称不能为空' });
    }
    
    const maxS = maxStories || parseInt(process.env.DEFAULT_MAX_STORIES) || 50;
    const interval = storyInterval || parseInt(process.env.STORY_INTERVAL_MINUTES) || 1;
    
    const room = await db.rooms.insert({
      name,
      creator_id: req.user.userId,
      max_stories: maxS,
      story_interval: interval,
      status: 'waiting',
      current_stories: 0,
      created_at: new Date()
    });
    
    res.json({ message: '房间创建成功', room });
  } catch (error) {
    console.error('创建房间错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const room = await db.rooms.findOne({ _id: req.params.id });
    
    if (!room) {
      return res.status(404).json({ error: '房间不存在' });
    }
    
    const creator = await db.users.findOne({ _id: room.creator_id });
    const characters = await db.characters.find({ room_id: req.params.id });
    const stories = await db.stories.find({ room_id: req.params.id }).sort({ sequence_num: -1 }).limit(10);
    
    const charactersWithUsername = await Promise.all(characters.map(async (char) => {
      const user = await db.users.findOne({ _id: char.user_id });
      return {
        ...char,
        username: user ? user.username : '未知'
      };
    }));
    
    res.json({
      room: { ...room, creator_name: creator ? creator.username : '未知' },
      characters: charactersWithUsername,
      stories
    });
  } catch (error) {
    console.error('获取房间详情错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/:id/join', authMiddleware, async (req, res) => {
  try {
    const roomId = req.params.id;
    const room = await db.rooms.findOne({ _id: roomId });
    
    if (!room) {
      return res.status(404).json({ error: '房间不存在' });
    }
    
    if (room.status === 'playing') {
      return res.status(400).json({ error: '游戏已开始' });
    }
    
    if (room.status === 'finished') {
      return res.status(400).json({ error: '游戏已结束' });
    }
    
    const existingChar = await db.characters.findOne({ user_id: req.user.userId, room_id: roomId });
    if (existingChar) {
      return res.json({ message: '已在房间内', character: existingChar });
    }
    
    const charCount = await db.characters.count({ room_id: roomId });
    if (charCount >= 10) {
      return res.status(400).json({ error: '房间已满（最多10人）' });
    }
    
    const charData = characterService.generateCharacter(req.user.username);
    
    const character = await db.characters.insert({
      user_id: req.user.userId,
      room_id: roomId,
      name: charData.name,
      ability: charData.ability,
      habit: charData.habit,
      preference: charData.preference,
      interest: charData.interest,
      weapon: charData.weapon,
      personality: charData.personality,
      level: charData.level,
      exp: charData.exp,
      is_online: 1,
      created_at: new Date()
    });
    
    res.json({ message: '加入房间成功', character });
  } catch (error) {
    console.error('加入房间错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/:id/start', authMiddleware, async (req, res) => {
  try {
    const roomId = req.params.id;
    const room = await db.rooms.findOne({ _id: roomId });
    
    if (!room) {
      return res.status(404).json({ error: '房间不存在' });
    }
    
    if (room.creator_id !== req.user.userId) {
      return res.status(403).json({ error: '只有房主可以开始游戏' });
    }
    
    if (room.status !== 'waiting') {
      return res.status(400).json({ error: '游戏已开始或已结束' });
    }
    
    const charCount = await db.characters.count({ room_id: roomId });
    if (charCount < 1) {
      return res.status(400).json({ error: '至少需要1名玩家才能开始游戏' });
    }
    
    await db.rooms.update({ _id: roomId }, { $set: { status: 'playing' } });
    
    res.json({ message: '游戏开始' });
  } catch (error) {
    console.error('开始游戏错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/:id/stories', async (req, res) => {
  try {
    const roomId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const stories = await db.stories.find({ room_id: roomId })
      .sort({ sequence_num: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await db.stories.count({ room_id: roomId });
    
    res.json({
      stories,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取故事列表错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
