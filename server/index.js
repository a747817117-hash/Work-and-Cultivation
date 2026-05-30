const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const { setupWebSocket } = require('./websocket');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
    return res.status(404).json({ error: '接口不存在' });
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║              挂机修仙游戏服务器已启动                      ║
║                                                            ║
║  访问地址: http://localhost:${PORT}                          ║
║                                                            ║
║  API接口:                                                  ║
║  - POST /api/auth/register  用户注册                       ║
║  - POST /api/auth/login     用户登录                       ║
║  - GET  /api/rooms          房间列表                       ║
║  - POST /api/rooms          创建房间                       ║
║  - POST /api/rooms/:id/join 加入房间                       ║
║  - POST /api/rooms/:id/start 开始游戏                      ║
║                                                            ║
║  WebSocket: ws://localhost:${PORT}/ws/rooms/:id              ║
╚════════════════════════════════════════════════════════════╝
  `);
});

module.exports = { app, server };
