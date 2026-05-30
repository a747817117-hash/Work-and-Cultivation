const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const path = require('path');
const db = require(path.join(__dirname, 'models', 'db'));
const gameEngine = require(path.join(__dirname, 'services', 'gameEngine'));

const wsClients = new Map();

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server });
  
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/');
    
    if (pathParts[1] !== 'ws' || pathParts[2] !== 'rooms' || !pathParts[3]) {
      ws.close(1008, '无效的WebSocket路径');
      return;
    }
    
    const roomId = pathParts[3];
    const token = url.searchParams.get('token');
    
    if (!token) {
      ws.close(1008, '缺少认证token');
      return;
    }
    
    let user;
    try {
      user = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
    } catch (error) {
      ws.close(1008, 'token无效');
      return;
    }
    
    ws.roomId = roomId;
    ws.userId = user.userId;
    ws.username = user.username;
    
    if (!wsClients.has(roomId)) {
      wsClients.set(roomId, new Set());
    }
    wsClients.get(roomId).add(ws);
    
    console.log(`用户 ${user.username} 连接到房间 ${roomId}`);
    
    ws.send(JSON.stringify({
      type: 'connected',
      message: '连接成功',
      roomId,
      username: user.username
    }));
    
    broadcastToRoom(roomId, {
      type: 'user_joined',
      username: user.username,
      message: `${user.username} 进入了房间`
    }, ws);
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data);
        await handleMessage(ws, roomId, user, message);
      } catch (error) {
        console.error('消息解析错误:', error);
      }
    });
    
    ws.on('close', () => {
      const clients = wsClients.get(roomId);
      if (clients) {
        clients.delete(ws);
        if (clients.size === 0) {
          wsClients.delete(roomId);
        }
      }
      
      console.log(`用户 ${user.username} 断开房间 ${roomId} 的连接`);
      
      broadcastToRoom(roomId, {
        type: 'user_left',
        username: user.username,
        message: `${user.username} 离开了房间`
      });
    });
    
    ws.on('error', (error) => {
      console.error(`WebSocket错误:`, error);
    });
  });
  
  return wss;
}

async function handleMessage(ws, roomId, user, message) {
  switch (message.type) {
    case 'start_game':
      await handleStartGame(ws, roomId, user);
      break;
    
    case 'chat':
      handleChat(ws, roomId, user, message);
      break;
    
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' }));
      break;
    
    default:
      ws.send(JSON.stringify({ type: 'error', message: '未知消息类型' }));
  }
}

async function handleStartGame(ws, roomId, user) {
  const room = await db.rooms.findOne({ _id: roomId });
  
  if (!room) {
    ws.send(JSON.stringify({ type: 'error', message: '房间不存在' }));
    return;
  }
  
  if (room.creator_id !== user.userId) {
    ws.send(JSON.stringify({ type: 'error', message: '只有房主可以开始游戏' }));
    return;
  }
  
  if (room.status !== 'waiting') {
    ws.send(JSON.stringify({ type: 'error', message: '游戏已开始或已结束' }));
    return;
  }
  
  await db.rooms.update({ _id: roomId }, { $set: { status: 'playing' } });
  
  broadcastToRoom(roomId, {
    type: 'game_started',
    message: '游戏开始！'
  });
  
  gameEngine.startGame(roomId, wsClients);
}

function handleChat(ws, roomId, user, message) {
  broadcastToRoom(roomId, {
    type: 'chat',
    username: user.username,
    content: message.content,
    timestamp: new Date().toISOString()
  });
}

function broadcastToRoom(roomId, data, excludeWs = null) {
  const clients = wsClients.get(roomId);
  if (clients) {
    const message = JSON.stringify(data);
    clients.forEach(client => {
      if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}

module.exports = {
  setupWebSocket,
  wsClients,
  broadcastToRoom
};
