const API_BASE = '';

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (token) {
    window.location.href = '/lobby.html';
    return;
  }
  
  initTabs();
  initForms();
});

function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const forms = document.querySelectorAll('.auth-form');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      
      tabs.forEach(t => t.classList.remove('active'));
      forms.forEach(f => f.classList.remove('active'));
      
      tab.classList.add('active');
      document.getElementById(`${target}Form`).classList.add('active');
      
      hideMessage();
    });
  });
}

function initForms() {
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('registerForm').addEventListener('submit', handleRegister);
}

async function handleLogin(e) {
  e.preventDefault();
  
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  
  if (!username || !password) {
    showMessage('请填写用户名和密码', 'error');
    return;
  }
  
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = '登录中...';
  
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      showMessage('登录成功，正在跳转...', 'success');
      setTimeout(() => window.location.href = '/lobby.html', 500);
    } else {
      showMessage(data.error || '登录失败', 'error');
    }
  } catch (error) {
    showMessage('网络错误，请稍后重试', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '登录';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  
  const username = document.getElementById('regUsername').value.trim();
  const password = document.getElementById('regPassword').value;
  const confirmPassword = document.getElementById('regConfirmPassword').value;
  
  if (!username || !password || !confirmPassword) {
    showMessage('请填写所有字段', 'error');
    return;
  }
  
  if (password !== confirmPassword) {
    showMessage('两次输入的密码不一致', 'error');
    return;
  }
  
  if (username.length < 2 || username.length > 20) {
    showMessage('用户名长度应为2-20个字符', 'error');
    return;
  }
  
  if (password.length < 6) {
    showMessage('密码长度不能少于6位', 'error');
    return;
  }
  
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = '注册中...';
  
  try {
    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      showMessage('注册成功，正在跳转...', 'success');
      setTimeout(() => window.location.href = '/lobby.html', 500);
    } else {
      showMessage(data.error || '注册失败', 'error');
    }
  } catch (error) {
    showMessage('网络错误，请稍后重试', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '注册';
  }
}

function showMessage(text, type) {
  const msg = document.getElementById('authMessage');
  msg.textContent = text;
  msg.className = `message ${type}`;
}

function hideMessage() {
  const msg = document.getElementById('authMessage');
  msg.className = 'message';
}
