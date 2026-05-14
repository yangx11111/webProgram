// ===== UI 工具函数 =====

function renderLatex(html) {
    var result = html.replace(/\$\$([\s\S]*?)\$\$/g, function (match, formula) {
        try {
            return katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false });
        } catch (e) { return match; }
    });
    result = result.replace(/\$([^$]+)\$/g, function (match, formula) {
        try {
            return katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false });
        } catch (e) { return match; }
    });
    return result;
}

function formatTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const date = new Date(timestamp);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    const timeStr = h + ':' + m;

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (isToday) return timeStr;
    if (isYesterday) return '昨天 ' + timeStr;
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return month + '/' + day + ' ' + timeStr;
}

function appendTimeLabel(timestamp) {
    const show = !window._lastMessageTimestamp || (timestamp - window._lastMessageTimestamp >= 5 * 60 * 1000);
    if (show) {
        const timeDiv = document.createElement('div');
        timeDiv.classList.add('msg-time');
        timeDiv.textContent = formatTime(timestamp);
        chatMessages.appendChild(timeDiv);
    }
    window._lastMessageTimestamp = timestamp;
}

// ===== 构建消息的 HTML 骨架 =====
function createMessageDiv(role, timestamp) {
    const div = document.createElement('div');
    div.classList.add('message', role);
    div.dataset.msgId = timestamp;

    // 头像
    const avatar = document.createElement('div');
    avatar.classList.add('message-avatar');
    if (role === 'ai') {
        avatar.textContent = 'F';
    } else {
        avatar.textContent = '我';
    }
    div.appendChild(avatar);

    // 消息体容器
    const body = document.createElement('div');
    body.classList.add('message-body');
    div.appendChild(body);

    return { div, body };
}

// ===== 用户消息 =====
function addUserMessage(text, timestamp) {
    appendTimeLabel(timestamp);
    window._hideWelcome && window._hideWelcome();

    const { div, body } = createMessageDiv('user', timestamp);
    const bubble = document.createElement('div');
    bubble.classList.add('message-bubble');
    bubble.textContent = text;
    attachEditButton(bubble, timestamp);
    body.appendChild(bubble);
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ===== 流式气泡 =====
function createStreamingBubble(timestamp) {
    appendTimeLabel(timestamp);
    window._hideWelcome && window._hideWelcome();

    const { div, body } = createMessageDiv('ai', timestamp);
    const bubble = document.createElement('div');
    bubble.classList.add('message-bubble');

    // 跳动点动画
    const dots = document.createElement('div');
    dots.classList.add('typing-dots');
    dots.innerHTML = '<span></span><span></span><span></span>';
    bubble.appendChild(dots);
    body.appendChild(bubble);
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return { div, bubble };
}

function updateStreamingBubble(bubble, newText) {
    bubble.textContent = newText;
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function finalizeStreamingBubble(bubble, fullText) {
    bubble.innerHTML = renderLatex(marked.parse(fullText));

    // 代码块复制按钮
    bubble.querySelectorAll('pre').forEach(function (pre) {
        const btn = document.createElement('button');
        btn.classList.add('copy-btn');
        btn.textContent = '复制';
        btn.addEventListener('click', function () {
            const code = pre.querySelector('code');
            const codeText = code ? code.textContent : pre.textContent;
            navigator.clipboard.writeText(codeText);
            btn.textContent = '已复制 ✓';
            btn.classList.add('copied');
            setTimeout(function () { btn.textContent = '复制'; btn.classList.remove('copied'); }, 2000);
        });
        pre.appendChild(btn);
    });

    // 复制整个回复
    const replyBtn = document.createElement('button');
    replyBtn.classList.add('reply-copy-btn');
    replyBtn.textContent = '📋';
    replyBtn.title = '复制回复';
    replyBtn.addEventListener('click', function () {
        navigator.clipboard.writeText(fullText);
        replyBtn.textContent = '✓';
        replyBtn.classList.add('copied');
        setTimeout(function () { replyBtn.textContent = '📋'; replyBtn.classList.remove('copied'); }, 2000);
    });
    bubble.appendChild(replyBtn);

    const msgDiv = bubble.closest('.message.ai');
    const msgTimestamp = Number(msgDiv.dataset.msgId);
    attachRegenButton(bubble, msgTimestamp);

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showErrorBubble(text, timestamp) {
    appendTimeLabel(timestamp);
    const { div, body } = createMessageDiv('ai', timestamp);
    const bubble = document.createElement('div');
    bubble.classList.add('message-bubble');
    bubble.textContent = '⚠️ ' + text;
    bubble.style.color = '#e74c3c';
    body.appendChild(bubble);
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ===== 气泡按钮 =====
function attachEditButton(bubble, timestamp) {
    const editBtn = document.createElement('button');
    editBtn.classList.add('user-edit-btn');
    editBtn.textContent = '编辑';
    editBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        startEditUserMessage(bubble, timestamp);
    });
    bubble.appendChild(editBtn);
}

function attachRegenButton(bubble, timestamp) {
    const regenBtn = document.createElement('button');
    regenBtn.classList.add('ai-regen-btn');
    regenBtn.textContent = '🔄';
    regenBtn.title = '重新生成';
    regenBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        regenerateMessage(timestamp);
    });
    bubble.appendChild(regenBtn);
}

function setStreamingState(streaming) {
    window._isStreaming = streaming;
    if (streaming) {
        sendBtn.textContent = '◼';
        sendBtn.classList.add('stop-btn');
    } else {
        sendBtn.textContent = '➤';
        sendBtn.classList.remove('stop-btn');
    }
}

// ===== 历史消息渲染 =====
function renderAIHistoryBubble(msg) {
    appendTimeLabel(msg.timestamp);
    const { div, body } = createMessageDiv('ai', msg.timestamp);
    const bubble = document.createElement('div');
    bubble.classList.add('message-bubble');
    bubble.innerHTML = renderLatex(marked.parse(msg.content));
    body.appendChild(bubble);
    chatMessages.appendChild(div);

    bubble.querySelectorAll('pre').forEach(function (pre) {
        const btn = document.createElement('button');
        btn.classList.add('copy-btn');
        btn.textContent = '复制';
        btn.addEventListener('click', function () {
            const code = pre.querySelector('code');
            const codeText = code ? code.textContent : pre.textContent;
            navigator.clipboard.writeText(codeText);
            btn.textContent = '已复制 ✓';
            btn.classList.add('copied');
            setTimeout(function () { btn.textContent = '复制'; btn.classList.remove('copied'); }, 2000);
        });
        pre.appendChild(btn);
    });
    attachRegenButton(bubble, msg.timestamp);
}

function showWelcome() {
    chatMessages.innerHTML = '';
    window._lastMessageTimestamp = null;
    const ws = document.createElement('div');
    ws.classList.add('welcome-screen');
    ws.id = 'welcomeScreen';
    ws.innerHTML = '' +
        '<div class="welcome-logo">🎓</div>' +
        '<div class="welcome-title">费曼学习助手</div>' +
        '<div class="welcome-subtitle">用大白话帮你搞懂任何概念</div>' +
        '<div class="suggestion-cards" id="suggestionCards">' +
        '<div class="suggestion-card" data-prompt="什么是量子纠缠？用大白话解释一下">什么是量子纠缠？用大白话解释一下</div>' +
        '<div class="suggestion-card" data-prompt="什么是递归？举一个生活中例子">什么是递归？举一个生活中例子</div>' +
        '<div class="suggestion-card" data-prompt="给我解释一下牛顿第二定律">给我解释一下牛顿第二定律</div>' +
        '<div class="suggestion-card" data-prompt="相对论到底在讲什么？">相对论到底在讲什么？</div>' +
        '</div>';
    chatMessages.appendChild(ws);

    // 重新绑定建议卡片事件
    document.getElementById('suggestionCards').addEventListener('click', function (e) {
        const card = e.target.closest('.suggestion-card');
        if (card) {
            userInput.value = card.dataset.prompt;
            userInput.dispatchEvent(new Event('input'));
            userInput.focus();
        }
    });
}
