// ===== 聊天核心逻辑 =====
// 消息发送、SSE 流式解析、编辑、重新生成

let conversationHistory = [];
let currentStreamingBubble = null;
let currentStreamingText = '';
let abortController = null;
let selectedFile = null;

// ===== 消息编辑 =====
function startEditUserMessage(bubble, timestamp) {
    const msgDiv = bubble.closest('.message.user');
    const msg = conversationHistory.find(function (m) { return m.timestamp === timestamp; });
    if (!msg) return;
    const originalText = msg.content;

    bubble.innerHTML = '';
    const textarea = document.createElement('textarea');
    textarea.classList.add('edit-textarea');
    textarea.value = originalText;
    textarea.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') cancelEditUserMessage(bubble, timestamp, originalText);
    });

    const btnRow = document.createElement('div');
    btnRow.classList.add('edit-btn-row');

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.addEventListener('click', function () { cancelEditUserMessage(bubble, timestamp, originalText); });

    const saveBtn = document.createElement('button');
    saveBtn.classList.add('save-btn');
    saveBtn.textContent = '保存';
    saveBtn.addEventListener('click', function () {
        const newText = textarea.value.trim();
        if (!newText) return;
        finishEditUserMessage(bubble, msgDiv, timestamp, newText);
    });

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(saveBtn);
    bubble.appendChild(textarea);
    bubble.appendChild(btnRow);
    textarea.focus();
}

function cancelEditUserMessage(bubble, timestamp, originalText) {
    bubble.innerHTML = '';
    bubble.textContent = originalText;
    attachEditButton(bubble, timestamp);
}

async function finishEditUserMessage(bubble, msgDiv, timestamp, newText) {
    const msgIndex = conversationHistory.findIndex(function (m) { return m.timestamp === timestamp; });
    if (msgIndex === -1) return;

    conversationHistory[msgIndex].content = newText;
    conversationHistory = conversationHistory.slice(0, msgIndex + 1);

    let next = msgDiv.nextElementSibling;
    while (next) {
        const toRemove = next;
        next = next.nextElementSibling;
        toRemove.remove();
    }

    window._lastMessageTimestamp = timestamp;
    bubble.innerHTML = '';
    bubble.textContent = newText;
    attachEditButton(bubble, timestamp);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    setStreamingState(true);
    await executeStreamRequest();
}

// ===== 重新生成 =====
async function regenerateMessage(aiTimestamp) {
    if (window._isStreaming) return;
    if (abortController) abortController.abort();

    const aiIndex = conversationHistory.findIndex(function (m) {
        return m.role === 'assistant' && m.timestamp === aiTimestamp;
    });
    if (aiIndex === -1) return;
    conversationHistory.splice(aiIndex, 1);

    const aiDiv = document.querySelector('.message.ai[data-msg-id="' + aiTimestamp + '"]');
    if (aiDiv) {
        const prev = aiDiv.previousElementSibling;
        if (prev && prev.classList.contains('message')) {
            window._lastMessageTimestamp = Number(prev.dataset.msgId) || window._lastMessageTimestamp;
        }
        aiDiv.remove();
    }

    setStreamingState(true);
    await executeStreamRequest();
}

// ===== 核心流式请求 =====
async function executeStreamRequest() {
    const aiTimestamp = Date.now();
    const { bubble: streamingBubble } = createStreamingBubble(aiTimestamp);
    currentStreamingBubble = streamingBubble;
    currentStreamingText = '';

    abortController = new AbortController();

    try {
        const body = {
            messages: conversationHistory.map(function (m) {
                return { role: m.role, content: m.content };
            })
        };

        if (currentConversationId) {
            body.conversation_id = currentConversationId;
        }

        const lastUserMsg = conversationHistory.slice().reverse().find(function (m) { return m.role === 'user'; });
        if (lastUserMsg && lastUserMsg.file) {
            body.file = lastUserMsg.file;
        }

        const response = await apiStream('/api/chat', body, abortController.signal);

        if (response.status === 401) {
            currentStreamingBubble.parentNode.remove();
            currentStreamingBubble = null;
            showErrorBubble('请先登录后再提问', Date.now());
            setStreamingState(false);
            abortController = null;
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            let lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.slice(6);
                    if (dataStr.trim() === '[DONE]') {
                        if (currentStreamingText) {
                            finalizeStreamingBubble(currentStreamingBubble, currentStreamingText);
                        }
                        currentStreamingBubble = null;
                        conversationHistory.push({
                            role: 'assistant',
                            content: currentStreamingText,
                            timestamp: aiTimestamp
                        });
                        // 刷新对话列表
                        if (isLoggedIn() && typeof loadConversationsFromServer === 'function') {
                            loadConversationsFromServer();
                        }
                        return;
                    }
                    try {
                        const data = JSON.parse(dataStr);
                        if (data.error) {
                            throw new Error(data.error);
                        }
                        const delta = data.choices?.[0]?.delta?.content;
                        if (delta) {
                            currentStreamingText += delta;
                            updateStreamingBubble(currentStreamingBubble, currentStreamingText);
                        }
                    } catch (e) {
                        if (e.message && e.message !== 'Unexpected') {
                            throw e;
                        }
                    }
                }
            }
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            if (currentStreamingText && currentStreamingBubble) {
                finalizeStreamingBubble(currentStreamingBubble, currentStreamingText);
                conversationHistory.push({
                    role: 'assistant',
                    content: currentStreamingText,
                    timestamp: aiTimestamp
                });
            } else if (currentStreamingBubble && currentStreamingBubble.parentNode) {
                currentStreamingBubble.parentNode.remove();
            }
            currentStreamingBubble = null;
        } else {
            if (currentStreamingBubble && currentStreamingBubble.parentNode) {
                currentStreamingBubble.parentNode.remove();
            }
            currentStreamingBubble = null;
            showErrorBubble('出错: ' + (error.message || '未知错误'), Date.now());
        }
    } finally {
        setStreamingState(false);
        abortController = null;
        userInput.focus();
    }
}

// ===== 发送消息 =====
async function sendMessage() {
    const text = userInput.value.trim();
    if (!text && !selectedFile) return;
    if (window._isStreaming) return;

    const userTimestamp = Date.now();
    const displayText = text || (selectedFile ? '请帮我解读这个文件' : '');

    addUserMessage(displayText, userTimestamp);

    const userMsg = { role: 'user', content: displayText, timestamp: userTimestamp };
    if (selectedFile) {
        userMsg.file = {
            name: selectedFile.name,
            type: selectedFile.type,
            dataUrl: selectedFile.dataUrl
        };
    }
    conversationHistory.push(userMsg);

    userInput.value = '';
    userInput.style.height = 'auto';
    selectedFile = null;
    fileInput.value = '';
    fileChip.style.display = 'none';

    setStreamingState(true);
    await executeStreamRequest();
}

// ===== 停止生成 =====
function stopGeneration() {
    if (abortController) abortController.abort();
}
