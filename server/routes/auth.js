const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const db = require(path.join(__dirname, '..', 'models', 'db'));

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    
    if (username.length < 2 || username.length > 20) {
      return res.status(400).json({ error: '用户名长度应为2-20个字符' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度不能少于6个字符' });
    }
    
    const existingUser = await db.users.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
    }
    
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.users.insert({
      username,
      password_hash: passwordHash,
      created_at: new Date()
    });
    
    const token = jwt.sign(
      { userId: user._id, username },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '24h' }
    );
    
    res.json({
      message: '注册成功',
      token,
      user: { id: user._id, username }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    
    const user = await db.users.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '24h' }
    );
    
    res.json({
      message: '登录成功',
      token,
      user: { id: user._id, username: user.username }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: '未登录' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
    const user = await db.users.findOne({ _id: decoded.userId });
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    res.json({ user: { id: user._id, username: user.username, created_at: user.created_at } });
  } catch (error) {
    res.status(401).json({ error: 'token无效' });
  }
});

module.exports = router;
