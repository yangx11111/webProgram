// ===== UI 工具函数 =====
// DOM 操作、时间格式化、气泡渲染

function renderLatex(html) {
    // 先处理显示公式 $$...$$
    var result = html.replace(/\$\$([\s\S]*?)\$\$/g, function (match, formula) {
        try {
            return katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false });
        } catch (e) {
            return match;
        }
    });
    // 再处理行内公式 $...$（$$ 已经没了，剩下的单个 $ 就是行内公式）
    result = result.replace(/\$([^$]+)\$/g, function (match, formula) {
        try {
            return katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false });
        } catch (e) {
            return match;
        }
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

function addUserMessage(text, timestamp) {
    appendTimeLabel(timestamp);
    const div = document.createElement('div');
    div.classList.add('message', 'user');
    div.dataset.msgId = timestamp;
    const bubble = document.createElement('div');
    bubble.classList.add('message-bubble');
    bubble.textContent = text;
    attachEditButton(bubble, timestamp);
    div.appendChild(bubble);
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function createStreamingBubble(timestamp) {
    appendTimeLabel(timestamp);
    const div = document.createElement('div');
    const bubble = document.createElement('div');
    div.classList.add('message', 'ai');
    div.dataset.msgId = timestamp;
    bubble.classList.add('message-bubble', 'streaming-cursor');
    div.appendChild(bubble);
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return { div, bubble };
}

function updateStreamingBubble(bubble, newText) {
    bubble.textContent = newText;
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function finalizeStreamingBubble(bubble, fullText) {
    bubble.classList.remove('streaming-cursor');
    bubble.innerHTML = renderLatex(marked.parse(fullText));

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
    const div = document.createElement('div');
    const bubble = document.createElement('div');
    div.classList.add('message', 'ai');
    bubble.classList.add('message-bubble');
    bubble.textContent = text;
    div.appendChild(bubble);
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

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
        sendBtn.textContent = '停止';
        sendBtn.classList.add('stop-btn');
    } else {
        sendBtn.textContent = '发送';
        sendBtn.classList.remove('stop-btn');
    }
}

function renderAIHistoryBubble(msg) {
    appendTimeLabel(msg.timestamp);
    const div = document.createElement('div');
    const bubble = document.createElement('div');
    div.classList.add('message', 'ai');
    div.dataset.msgId = msg.timestamp;
    bubble.classList.add('message-bubble');
    bubble.innerHTML = renderLatex(marked.parse(msg.content));
    div.appendChild(bubble);
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
    appendTimeLabel(Date.now());
    const div = document.createElement('div');
    const bubble = document.createElement('div');
    div.classList.add('message', 'ai');
    bubble.classList.add('message-bubble');
    bubble.innerHTML = '你好！我是你的费曼学习导师<br>输入一个你不懂的概念，我用大白话给你讲明白！';
    div.appendChild(bubble);
    chatMessages.appendChild(div);
}
