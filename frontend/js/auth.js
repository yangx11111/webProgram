// ===== 登录/注册 UI =====

function showAuthModal(mode) {
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
        title.textContent = '创建账号';
        usernameGroup.style.display = 'block';
        submitBtn.textContent = '注册';
        switchText.innerHTML = '已有账号？<a href="#">去登录</a>';
    } else {
        title.textContent = '欢迎回来';
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

    const isRegister = title.textContent === '创建账号';
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
            // 保存用户信息到 localStorage
            if (data.user) {
                localStorage.setItem('feynman_user', JSON.stringify(data.user));
            }
            updateAuthUI();
            hideAuthModal();
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
    const newChatBtn = document.getElementById('newChatBtn');
    const sidebarFooter = document.getElementById('sidebarFooter');
    const sidebarAvatar = document.getElementById('sidebarAvatar');
    const sidebarEmail = document.getElementById('sidebarEmail');

    if (isLoggedIn()) {
        if (loginBtn) {
            loginBtn.textContent = '退出';
            loginBtn.classList.add('logged-in');
        }
        if (newChatBtn) newChatBtn.style.display = '';

        // 侧边栏用户信息
        const userData = JSON.parse(localStorage.getItem('feynman_user') || '{}');
        if (sidebarFooter) sidebarFooter.style.display = 'flex';
        if (sidebarAvatar && userData.username) {
            sidebarAvatar.textContent = userData.username.charAt(0).toUpperCase();
        }
        if (sidebarEmail && userData.email) {
            sidebarEmail.textContent = userData.email;
        }
    } else {
        if (loginBtn) {
            loginBtn.textContent = '登录';
            loginBtn.classList.remove('logged-in');
        }
        if (newChatBtn) newChatBtn.style.display = 'none';
        if (sidebarFooter) sidebarFooter.style.display = 'none';
    }
}

function handleAuthBtnClick() {
    if (isLoggedIn()) {
        if (confirm('确定要退出登录吗？')) {
            logout();
            localStorage.removeItem('feynman_user');
            updateAuthUI();
            showWelcome();
        }
    } else {
        showAuthModal('login');
    }
}
