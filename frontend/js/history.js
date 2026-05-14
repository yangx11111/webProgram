// ===== 对话历史管理（服务端 + localStorage 兼容） =====

let currentConversationId = null;

async function loadConversationsFromServer() {
    if (!isLoggedIn()) return;
    try {
        const resp = await apiGet('/api/conversations');
        if (resp.ok) {
            const data = await resp.json();
            window._serverConversations = data.items || [];
            renderHistoryList();
        }
    } catch (e) { /* ignore */ }
}

async function loadConversation(convId) {
    if (!isLoggedIn()) return;
    try {
        const resp = await apiGet('/api/conversations/' + convId);
        if (resp.ok) {
            const data = await resp.json();
            closeSidebar();
            chatMessages.innerHTML = '';
            conversationHistory.length = 0;
            window._lastMessageTimestamp = null;
            currentConversationId = convId;

            (data.messages || []).forEach(function (msg) {
                const ts = Date.parse(msg.created_at) || Date.now();
                conversationHistory.push({ role: msg.role, content: msg.content, timestamp: ts });
                if (msg.role === 'user') {
                    addUserMessage(msg.content, ts);
                } else {
                    renderAIHistoryBubble({ content: msg.content, timestamp: ts });
                }
            });
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    } catch (e) { showErrorBubble('加载对话失败', Date.now()); }
}

async function deleteConversation(convId) {
    if (!isLoggedIn()) return;
    try {
        await apiDelete('/api/conversations/' + convId);
        loadConversationsFromServer();
    } catch (e) { /* ignore */ }
}

async function createServerConversation(title) {
    if (!isLoggedIn()) return null;
    try {
        const resp = await apiPost('/api/conversations', { title: title || undefined });
        if (resp.ok) {
            const data = await resp.json();
            return data.id;
        }
    } catch (e) { /* ignore */ }
    return null;
}

function renderHistoryList() {
    historyList.innerHTML = '';
    const convs = window._serverConversations || [];
    if (convs.length === 0) {
        historyList.innerHTML = '<div style="color:#888;text-align:center;padding:40px 0;font-size:14px;">暂无历史记录</div>';
        return;
    }
    convs.forEach(function (conv) {
        const item = document.createElement('div');
        item.classList.add('history-item');
        item.dataset.id = conv.id;
        const timeStr = conv.updated_at
            ? formatTime(Date.parse(conv.updated_at))
            : '';
        item.innerHTML =
            '<div class="history-info">' +
            '<div class="history-title">' + escapeHtml(conv.title) + '</div>' +
            '<div class="history-time">' + timeStr + ' · ' + (conv.message_count || 0) + ' 条消息</div>' +
            '</div>' +
            '<button class="delete-btn" title="删除">🗑</button>';
        historyList.appendChild(item);
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// 侧边栏事件委托
historyList.addEventListener('click', function (e) {
    if (e.target.classList.contains('delete-btn')) {
        e.stopPropagation();
        const item = e.target.closest('.history-item');
        const id = Number(item.dataset.id);
        if (confirm('确定删除这条记录吗？')) {
            deleteConversation(id);
        }
        return;
    }
    const item = e.target.closest('.history-item');
    if (item) {
        const id = Number(item.dataset.id);
        loadConversation(id);
    }
});

// 新建对话
async function startNewChat() {
    if (window._isStreaming) return;
    if (!confirm('确定要新建会话吗？当前对话将清空')) return;

    conversationHistory.length = 0;
    window._lastMessageTimestamp = null;
    currentConversationId = null;
    showWelcome();
    userInput.focus();
}
