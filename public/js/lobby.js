const API_BASE = '';
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  loadRooms();
  initCreateForm();
});

function checkAuth() {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  if (!token || !userStr) {
    window.location.href = '/';
    return;
  }
  
  currentUser = JSON.parse(userStr);
  document.getElementById('username').textContent = currentUser.username;
}

async function loadRooms() {
  try {
    const response = await fetch(`${API_BASE}/api/rooms`);
    const data = await response.json();
    
    if (response.ok) {
      renderRooms(data.rooms);
    }
  } catch (error) {
    console.error('加载房间列表失败:', error);
  }
}

function renderRooms(rooms) {
  const container = document.getElementById('roomsList');
  
  if (!rooms || rooms.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>暂无房间</p>
        <p>点击"创建房间"开始修仙之旅</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = rooms.map(room => `
    <div class="room-card">
      <div class="room-info">
        <h3>${escapeHtml(room.name)}</h3>
        <div class="room-meta">
          <span>房主: ${escapeHtml(room.creator_name)}</span>
          <span>人数: ${room.player_count}</span>
          <span>故事上限: ${room.max_stories}</span>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 10px;">
        <span class="room-status status-${room.status}">
          ${room.status === 'waiting' ? '等待中' : '游戏中'}
        </span>
        <button class="btn-join" onclick="joinRoom(${room.id})">加入</button>
      </div>
    </div>
  `).join('');
}

async function joinRoom(roomId) {
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch(`${API_BASE}/api/rooms/${roomId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      window.location.href = `/game.html?id=${roomId}`;
    } else {
      alert(data.error || '加入房间失败');
    }
  } catch (error) {
    alert('网络错误，请稍后重试');
  }
}

function showCreateModal() {
  document.getElementById('createModal').style.display = 'flex';
}

function hideCreateModal() {
  document.getElementById('createModal').style.display = 'none';
}

function initCreateForm() {
  document.getElementById('createRoomForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('roomName').value.trim();
    const maxStories = parseInt(document.getElementById('maxStories').value) || 50;
    const storyInterval = parseInt(document.getElementById('storyInterval').value) || 1;
    
    if (!name) {
      alert('请输入房间名称');
      return;
    }
    
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`${API_BASE}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, maxStories, storyInterval })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        hideCreateModal();
        await joinRoom(data.room.id);
      } else {
        alert(data.error || '创建房间失败');
      }
    } catch (error) {
      alert('网络错误，请稍后重试');
    }
  });
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
