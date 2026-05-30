const API_BASE = '';
let ws = null;
let roomId = null;
let currentUser = null;
let roomData = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  getRoomId();
  loadRoomData();
});

function checkAuth() {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  if (!token || !userStr) {
    window.location.href = '/';
    return;
  }
  
  currentUser = JSON.parse(userStr);
}

function getRoomId() {
  const params = new URLSearchParams(window.location.search);
  roomId = params.get('id');
  
  if (!roomId) {
    window.location.href = '/lobby.html';
  }
}

async function loadRoomData() {
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch(`${API_BASE}/api/rooms/${roomId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      roomData = data.room;
      
      document.getElementById('roomName').textContent = roomData.name;
      
      renderCharacters(data.characters);
      renderStories(data.stories);
      
      if (roomData.creator_id === currentUser.id && roomData.status === 'waiting') {
        document.getElementById('startBtn').style.display = 'block';
      }
      
      updateProgress();
      
      connectWebSocket();
    } else {
      alert('房间不存在');
      window.location.href = '/lobby.html';
    }
  } catch (error) {
    console.error('加载房间数据失败:', error);
  }
}

function connectWebSocket() {
  const token = localStorage.getItem('token');
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/rooms/${roomId}?token=${token}`;
  
  ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log('WebSocket连接成功');
    reconnectAttempts = 0;
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleGameMessage(data);
    } catch (error) {
      console.error('消息解析错误:', error);
    }
  };
  
  ws.onclose = () => {
    console.log('WebSocket连接关闭');
    
    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++;
      setTimeout(connectWebSocket, 2000 * reconnectAttempts);
    }
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket错误:', error);
  };
}

function handleGameMessage(data) {
  switch (data.type) {
    case 'connected':
      console.log('连接成功:', data.message);
      break;
    
    case 'game_started':
      roomData.status = 'playing';
      document.getElementById('startBtn').style.display = 'none';
      addSystemMessage('游戏开始！故事将自动生成...');
      break;
    
    case 'new_story':
      handleNewStory(data);
      break;
    
    case 'game_over':
      handleGameOver(data);
      break;
    
    case 'user_joined':
      addSystemMessage(data.message);
      loadRoomData();
      break;
    
    case 'user_left':
      addSystemMessage(data.message);
      break;
    
    case 'chat':
      addChatMessage(data);
      break;
    
    case 'error':
      alert(data.message);
      break;
  }
}

function handleNewStory(data) {
  const { story, characters, currentStories, maxStories } = data;
  
  addStory(story);
  renderCharacters(characters);
  
  roomData.current_stories = currentStories;
  roomData.max_stories = maxStories;
  updateProgress();
}

function handleGameOver(data) {
  const { winner, rankings } = data;
  
  const modal = document.getElementById('gameOverModal');
  const winnerCard = document.getElementById('winnerCard');
  const rankingsDiv = document.getElementById('rankings');
  
  winnerCard.innerHTML = winner ? `
    <h2>恭喜获胜</h2>
    <div class="winner-info">
      <strong>${escapeHtml(winner.name)}</strong> (玩家: ${escapeHtml(winner.username)})
    </div>
    <div class="winner-info">境界: ${escapeHtml(winner.level)}</div>
    <div class="winner-info">修为: ${winner.exp}</div>
  ` : '<h2>游戏结束</h2>';
  
  rankingsDiv.innerHTML = `
    <h2>最终排名</h2>
    <ul class="rankings-list">
      ${rankings.map(r => `
        <li>
          <span class="rank rank-${r.rank}">${r.rank}</span>
          <span class="name">${escapeHtml(r.name)} (${escapeHtml(r.username)})</span>
          <span class="level">${escapeHtml(r.level)}</span>
          <span class="exp">${r.exp}修为</span>
        </li>
      `).join('')}
    </ul>
  `;
  
  modal.style.display = 'flex';
}

function addStory(story) {
  const container = document.getElementById('storiesContainer');
  
  const noStories = container.querySelector('.no-stories');
  if (noStories) {
    noStories.remove();
  }
  
  const storyDiv = document.createElement('div');
  storyDiv.className = 'story-item';
  storyDiv.innerHTML = `
    <div class="story-title">第${story.sequence_num}章</div>
    <div class="story-content">${escapeHtml(story.content).replace(/\n/g, '<br>')}</div>
    <div class="story-time">${new Date().toLocaleTimeString()}</div>
  `;
  
  container.insertBefore(storyDiv, container.firstChild);
  
  if (container.children.length > 50) {
    container.removeChild(container.lastChild);
  }
}

function addSystemMessage(message) {
  const container = document.getElementById('storiesContainer');
  
  const noStories = container.querySelector('.no-stories');
  if (noStories) {
    noStories.remove();
  }
  
  const msgDiv = document.createElement('div');
  msgDiv.className = 'story-item';
  msgDiv.style.borderLeft = '3px solid var(--info-color)';
  msgDiv.innerHTML = `
    <div class="story-content" style="color: var(--text-secondary); font-style: italic;">
      ${escapeHtml(message)}
    </div>
  `;
  
  container.insertBefore(msgDiv, container.firstChild);
}

function renderCharacters(characters) {
  const container = document.getElementById('characterList');
  
  if (!characters || characters.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>暂无角色</p></div>';
    return;
  }
  
  const isGameOver = roomData && roomData.status === 'finished';
  
  container.innerHTML = characters.map((char, index) => `
    <div class="character-card ${isGameOver && index === 0 ? 'winner' : ''}">
      <div class="character-header">
        <span class="character-name">${escapeHtml(char.name)}</span>
        <span class="character-level">${escapeHtml(char.level)}</span>
      </div>
      <div class="character-details">
        <div>能力: ${escapeHtml(char.ability)}</div>
        <div>性格: ${escapeHtml(char.personality)}</div>
        <div>武器: ${escapeHtml(char.weapon)}</div>
      </div>
      <div class="exp-bar">
        <div class="exp-fill" style="width: ${getExpPercentage(char.exp)}%"></div>
      </div>
    </div>
  `).join('');
}

function getExpPercentage(exp) {
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
  
  let currentLevel = levels[0];
  let nextLevel = levels[1];
  
  for (let i = levels.length - 1; i >= 0; i--) {
    if (exp >= levels[i].minExp) {
      currentLevel = levels[i];
      nextLevel = levels[i + 1] || levels[i];
      break;
    }
  }
  
  if (!nextLevel || currentLevel === nextLevel) {
    return 100;
  }
  
  const expInCurrentLevel = exp - currentLevel.minExp;
  const expNeeded = nextLevel.minExp - currentLevel.minExp;
  
  return Math.min(100, (expInCurrentLevel / expNeeded) * 100);
}

function renderStories(stories) {
  const container = document.getElementById('storiesContainer');
  
  if (!stories || stories.length === 0) {
    container.innerHTML = `
      <div class="no-stories">
        <p>等待游戏开始...</p>
        <p>故事将自动生成</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = stories.map(story => `
    <div class="story-item">
      <div class="story-title">第${story.sequence_num}章</div>
      <div class="story-content">${escapeHtml(story.content).replace(/\n/g, '<br>')}</div>
      <div class="story-time">${new Date(story.created_at).toLocaleTimeString()}</div>
    </div>
  `).join('');
}

function updateProgress() {
  if (!roomData) return;
  
  const current = roomData.current_stories || 0;
  const max = roomData.max_stories || 50;
  const percentage = Math.min(100, (current / max) * 100);
  
  document.getElementById('progressText').textContent = `${current} / ${max}`;
  document.getElementById('progressFill').style.width = `${percentage}%`;
}

async function startGame() {
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch(`${API_BASE}/api/rooms/${roomId}/start`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      roomData.status = 'playing';
      document.getElementById('startBtn').style.display = 'none';
    } else {
      const data = await response.json();
      alert(data.error || '开始游戏失败');
    }
  } catch (error) {
    alert('网络错误，请稍后重试');
  }
}

function leaveRoom() {
  if (ws) {
    ws.close();
  }
  window.location.href = '/lobby.html';
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

window.addEventListener('beforeunload', () => {
  if (ws) {
    ws.close();
  }
});
