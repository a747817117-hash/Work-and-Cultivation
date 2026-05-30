const path = require('path');
const db = require(path.join(__dirname, '..', 'models', 'db'));
const aiService = require('./ai');
const characterService = require('./character');

const activeGames = new Map();

function startGame(roomId, wsClients) {
  const intervalMs = 60 * 1000;
  
  const gameState = {
    roomId,
    interval: null,
    wsClients,
    isRunning: true
  };
  
  gameState.interval = setInterval(async () => {
    if (!gameState.isRunning) return;
    
    try {
      await generateNextStory(roomId, wsClients);
    } catch (error) {
      console.error(`游戏 ${roomId} 生成故事失败:`, error);
    }
  }, intervalMs);
  
  activeGames.set(roomId, gameState);
  console.log(`游戏 ${roomId} 已启动`);
  
  return gameState;
}

async function generateNextStory(roomId, wsClients) {
  const room = await db.rooms.findOne({ _id: roomId });
  if (!room || room.status !== 'playing') {
    stopGame(roomId);
    return;
  }
  
  if (room.current_stories >= room.max_stories) {
    await endGame(roomId, wsClients);
    return;
  }
  
  const characters = await db.characters.find({ room_id: roomId });
  
  if (characters.length === 0) {
    return;
  }
  
  const charactersWithUser = await Promise.all(characters.map(async (char) => {
    const user = await db.users.findOne({ _id: char.user_id });
    return {
      ...char,
      id: char._id,
      username: user ? user.username : '未知'
    };
  }));
  
  const storyNumber = room.current_stories + 1;
  const result = await aiService.generateStory(charactersWithUser, storyNumber);
  
  if (!result) {
    return;
  }
  
  const story = await db.stories.insert({
    room_id: roomId,
    sequence_num: storyNumber,
    content: result.story,
    created_at: new Date()
  });
  
  for (const change of result.changes) {
    const char = characters.find(c => c._id === change.characterId);
    if (!char) continue;
    
    const newExp = char.exp + change.expGain;
    const newLevel = characterService.calculateLevel(newExp);
    const oldLevel = char.level;
    
    await db.characters.update({ _id: char._id }, { $set: { exp: newExp, level: newLevel } });
    
    const levelChanged = newLevel !== oldLevel;
    await db.gameEvents.insert({
      room_id: roomId,
      character_id: char._id,
      story_id: story._id,
      event_type: levelChanged ? 'level_up' : 'exp_gain',
      description: levelChanged ? `${char.name} 突破至 ${newLevel}！` : `${char.name} 获得 ${change.expGain} 修为`,
      level_change: levelChanged ? `${oldLevel} -> ${newLevel}` : null,
      exp_change: change.expGain,
      created_at: new Date()
    });
  }
  
  await db.rooms.update({ _id: roomId }, { $set: { current_stories: storyNumber } });
  
  const updatedCharacters = await db.characters.find({ room_id: roomId });
  const updatedCharactersWithUser = await Promise.all(updatedCharacters.map(async (char) => {
    const user = await db.users.findOne({ _id: char.user_id });
    return {
      ...char,
      id: char._id,
      username: user ? user.username : '未知'
    };
  }));
  
  const gameData = {
    type: 'new_story',
    story: {
      id: story._id,
      sequence_num: storyNumber,
      content: result.story
    },
    characters: updatedCharactersWithUser,
    currentStories: storyNumber,
    maxStories: room.max_stories
  };
  
  broadcastToRoom(wsClients, roomId, gameData);
  
  return gameData;
}

async function endGame(roomId, wsClients) {
  const gameState = activeGames.get(roomId);
  if (gameState) {
    gameState.isRunning = false;
    if (gameState.interval) {
      clearInterval(gameState.interval);
    }
    activeGames.delete(roomId);
  }
  
  await db.rooms.update({ _id: roomId }, { $set: { status: 'finished' } });
  
  const characters = await db.characters.find({ room_id: roomId });
  
  const charactersWithUser = await Promise.all(characters.map(async (char) => {
    const user = await db.users.findOne({ _id: char.user_id });
    return {
      ...char,
      username: user ? user.username : '未知'
    };
  }));
  
  charactersWithUser.sort((a, b) => b.exp - a.exp);
  
  const winner = charactersWithUser[0];
  
  const gameResult = {
    type: 'game_over',
    winner: winner ? {
      name: winner.name,
      username: winner.username,
      level: winner.level,
      exp: winner.exp
    } : null,
    rankings: charactersWithUser.map((c, index) => ({
      rank: index + 1,
      name: c.name,
      username: c.username,
      level: c.level,
      exp: c.exp
    }))
  };
  
  broadcastToRoom(wsClients, roomId, gameResult);
  
  return gameResult;
}

function stopGame(roomId) {
  const gameState = activeGames.get(roomId);
  if (gameState) {
    gameState.isRunning = false;
    if (gameState.interval) {
      clearInterval(gameState.interval);
    }
    activeGames.delete(roomId);
  }
}

function broadcastToRoom(wsClients, roomId, data) {
  const clients = wsClients.get(roomId);
  if (clients) {
    const message = JSON.stringify(data);
    clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(message);
      }
    });
  }
}

function getGameState(roomId) {
  return activeGames.has(roomId);
}

module.exports = {
  startGame,
  stopGame,
  endGame,
  generateNextStory,
  getGameState,
  activeGames
};
