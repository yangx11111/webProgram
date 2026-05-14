// ===== 登录/注册 UI =====

function showAuthModal(mode) {
    // mode: 'login' or 'register'
    const overlay = document.getElementById('authOverlay');
    const modal = document.getElementById('authModal');
    const title = document.getElementById('authModalTitle');
    const usernameGroup = document.getElementById('authUsernameGroup');
    const usernameInput = document.getElementById('authUsername');
    const emailInput = document.getElementById('authEmail');
    const passwordInput = document.getElementById('authPassword');
    const submitBtn = document.getElementById('authSubmitBtn');
    const switchText = document.getElementById('authSwitch');
    const errorEl = document.getElementById('authError');

    if (!overlay || !modal) return;

    errorEl.textContent = '';
    usernameInput.value = '';
    emailInput.value = '';
    passwordInput.value = '';

    if (mode === 'register') {
        title.textContent = '注册';
        usernameGroup.style.display = 'block';
        submitBtn.textContent = '注册';
        switchText.innerHTML = '已有账号？<a href="#">去登录</a>';
    } else {
        title.textContent = '登录';
        usernameGroup.style.display = 'none';
        submitBtn.textContent = '登录';
        switchText.innerHTML = '没有账号？<a href="#">去注册</a>';
    }

    overlay.classList.add('show');
    modal.classList.add('show');
    (mode === 'register' ? usernameInput : emailInput).focus();
}

function hideAuthModal() {
    const overlay = document.getElementById('authOverlay');
    const modal = document.getElementById('authModal');
    if (overlay) overlay.classList.remove('show');
    if (modal) modal.classList.remove('show');
}

async function handleAuthSubmit() {
    const title = document.getElementById('authModalTitle');
    const usernameInput = document.getElementById('authUsername');
    const emailInput = document.getElementById('authEmail');
    const passwordInput = document.getElementById('authPassword');
    const submitBtn = document.getElementById('authSubmitBtn');
    const errorEl = document.getElementById('authError');

    const isRegister = title.textContent === '注册';
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
        errorEl.textContent = '请填写所有字段';
        return;
    }
    if (isRegister && !usernameInput.value.trim()) {
        errorEl.textContent = '请填写用户名';
        return;
    }
    if (password.length < 6) {
        errorEl.textContent = '密码至少需要6个字符';
        return;
    }

    submitBtn.disabled = true;
    errorEl.textContent = '';

    try {
        const body = isRegister
            ? { username: usernameInput.value.trim(), email, password }
            : { email, password };

        const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
        const resp = await fetch(API_BASE + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await resp.json();

        if (resp.ok) {
            setTokens(data.access_token, data.refresh_token);
            updateAuthUI();
            hideAuthModal();
            // 加载服务端的对话列表
            if (typeof loadConversationsFromServer === 'function') {
                loadConversationsFromServer();
            }
        } else {
            errorEl.textContent = data.error || '操作失败';
        }
    } catch (e) {
        errorEl.textContent = '网络错误，请稍后重试';
    } finally {
        submitBtn.disabled = false;
    }
}

function updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const userInfo = document.getElementById('userInfo');
    const newChatBtn = document.querySelector('.new-chat-btn');

    if (isLoggedIn()) {
        if (loginBtn) loginBtn.textContent = '退出';
        if (userInfo) userInfo.style.display = 'inline';
    } else {
        if (loginBtn) loginBtn.textContent = '登录';
        if (userInfo) userInfo.style.display = 'none';
        if (newChatBtn) newChatBtn.style.display = 'none';
    }
}

function handleAuthBtnClick() {
    if (isLoggedIn()) {
        if (confirm('确定要退出登录吗？')) {
            logout();
            updateAuthUI();
            showWelcome();
        }
    } else {
        showAuthModal('login');
    }
}
