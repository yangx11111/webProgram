// ===== 模拟 DOM 的最小实现 =====

// 将 data-msg-id 转为 msgId（模拟浏览器 dataset 的 camelCase 转换）
function camelize(str) {
    // 去掉 data- 前缀（如果有），然后转换连字符为驼峰
    var s = str.replace(/^data-/, '');
    return s.replace(/-([a-z])/g, function(_, c) { return c.toUpperCase(); });
}

// 简易选择器匹配器：支持 .class、.a.b、[attr="val"]、.a[attr="val"]、.a.b[attr="val"]
function matchesMockSelector(el, sel) {
    // 提取属性选择器 [attr="value"] 或 [attr='value']
    var attrKey = null, attrVal = null;
    var attrMatch = sel.match(/\[([\w-]+)=["']([^"']*)["']\]/);
    if (attrMatch) {
        attrKey = attrMatch[1];
        attrVal = attrMatch[2];
        sel = sel.replace(attrMatch[0], '');
    }
    // 提取类选择器 .class
    var classes = [];
    if (sel) {
        classes = sel.split('.').filter(function(s) { return s.length > 0; });
    }
    // 匹配类
    if (classes.length > 0) {
        for (var i = 0; i < classes.length; i++) {
            if (el._classList.indexOf(classes[i]) === -1) return false;
        }
    }
    // 匹配属性
    if (attrKey) {
        // 尝试多种格式：原始、camelCase、dataset 格式
        var elAttrVal = el._dataset[attrKey]
            || el._attrs[attrKey]
            || el._dataset[camelize(attrKey)]
            || el._attrs[camelize(attrKey)];
        if (elAttrVal !== attrVal) return false;
    }
    return classes.length > 0 || attrKey !== null;
}

function createMockElement(tag, parent) {
    const el = {
        tag: tag,
        children: [],
        parentNode: parent || null,
        _classList: [],
        _dataset: {},
        _style: {},
        _attrs: {},
        textContent: '',
        innerHTML: '',
        nextElementSibling: null,
        previousElementSibling: null,
        _listeners: {},
        classList: {
            _el: null,
            add: function() {
                for (var i = 0; i < arguments.length; i++) this._el._classList.push(arguments[i]);
            },
            remove: function() {
                for (var i = 0; i < arguments.length; i++) {
                    var idx = this._el._classList.indexOf(arguments[i]);
                    if (idx >= 0) this._el._classList.splice(idx, 1);
                }
            },
            contains: function(c) { return this._el._classList.indexOf(c) >= 0; }
        },
        dataset: {},
        style: {},
        addEventListener: function(evt, fn) {
            if (!this._listeners[evt]) this._listeners[evt] = [];
            this._listeners[evt].push(fn);
        },
        dispatchEvent: function(evt) {
            var fns = this._listeners[evt.type] || [];
            fns.forEach(function(f) { f(evt); });
        },
        click: function() {
            var fns = this._listeners['click'] || [];
            fns.forEach(function(f) { f({ stopPropagation: function() {}, type: 'click', target: this }); });
        },
        querySelector: function(sel) {
            for (var i = 0; i < this.children.length; i++) {
                if (matchesMockSelector(this.children[i], sel)) return this.children[i];
                var found = this.children[i].querySelector(sel);
                if (found) return found;
            }
            return null;
        },
        querySelectorAll: function(sel) {
            var result = [];
            for (var i = 0; i < this.children.length; i++) {
                if (matchesMockSelector(this.children[i], sel)) result.push(this.children[i]);
                result = result.concat(this.children[i].querySelectorAll(sel));
            }
            return result;
        },
        closest: function(sel) {
            var p = this.parentNode;
            while (p) {
                if (matchesMockSelector(p, sel)) return p;
                p = p.parentNode;
            }
            return null;
        },
        appendChild: function(child) {
            if (child.parentNode && child.parentNode !== this) {
                var idx = child.parentNode.children.indexOf(child);
                if (idx >= 0) child.parentNode.children.splice(idx, 1);
            }
            child.parentNode = this;
            if (this.children.length > 0) {
                this.children[this.children.length - 1].nextElementSibling = child;
                child.previousElementSibling = this.children[this.children.length - 1];
            }
            this.children.push(child);
        },
        remove: function() {
            if (this.parentNode) {
                // 更新兄弟节点的链接
                var idx = this.parentNode.children.indexOf(this);
                if (idx >= 0) {
                    var prev = this.previousElementSibling;
                    var next = this.nextElementSibling;
                    if (prev) prev.nextElementSibling = next;
                    if (next) next.previousElementSibling = prev;
                    this.parentNode.children.splice(idx, 1);
                }
                this.parentNode = null;
            }
        },
    };
    el.classList._el = el;
    el.dataset = el._dataset;
    el.style = el._style;
    return el;
}

// ===== 全局测试状态 =====
var passed = 0;
var failed = 0;
var failures = [];

function test(name, fn) {
    try {
        fn();
        passed++;
        console.log('  [PASS] ' + name);
    } catch (e) {
        failed++;
        failures.push({ name: name, error: e.message });
        console.log('  [FAIL] ' + name + ' — ' + e.message);
    }
}

function assert(condition, msg) {
    if (!condition) throw new Error(msg || 'assertion failed');
}

function assertEquals(a, b, msg) {
    if (a !== b) throw new Error((msg || '') + ' expected [' + b + '] but got [' + a + ']');
}

// ===== 模拟聊天区域 =====
var chatMessages = createMockElement('div');
var conversationHistory = [];
var lastMessageTimestamp = null;

// ===== 从 index.html 复制的核心函数 =====
function appendTimeLabel(timestamp) {
    var show = !lastMessageTimestamp || (timestamp - lastMessageTimestamp >= 5 * 60 * 1000);
    if (show) {
        var timeDiv = createMockElement('div');
        timeDiv._classList.push('msg-time');
        timeDiv.textContent = '' + timestamp;
        chatMessages.appendChild(timeDiv);
    }
    lastMessageTimestamp = timestamp;
}

function attachEditButton(bubble, timestamp) {
    var editBtn = createMockElement('button');
    editBtn._classList.push('user-edit-btn');
    editBtn.textContent = '编辑';
    editBtn.addEventListener('click', function(e) {
        startEditUserMessage(bubble, timestamp);
    });
    bubble.appendChild(editBtn);
}

function attachRegenButton(bubble, timestamp) {
    var regenBtn = createMockElement('button');
    regenBtn._classList.push('ai-regen-btn');
    regenBtn.textContent = '\u{1F504}';
    regenBtn._attrs['title'] = '重新生成';
    regenBtn.addEventListener('click', function(e) {
        regenerateMessage(timestamp);
    });
    bubble.appendChild(regenBtn);
}

function addUserMessage(text, timestamp) {
    appendTimeLabel(timestamp);
    var div = createMockElement('div');
    div._classList.push('message');
    div._classList.push('user');
    div._dataset['msgId'] = '' + timestamp;
    var bubble = createMockElement('div');
    bubble._classList.push('message-bubble');
    bubble.textContent = text;
    attachEditButton(bubble, timestamp);
    div.appendChild(bubble);
    chatMessages.appendChild(div);
    return div;
}

function startEditUserMessage(bubble, timestamp) {
    var msg = conversationHistory.find(function(m) { return m.timestamp === timestamp; });
    if (!msg) return;
    var originalText = msg.content;

    bubble.children = [];
    bubble.innerHTML = '';

    var textarea = createMockElement('textarea');
    textarea._classList.push('edit-textarea');
    textarea.value = originalText;
    textarea.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') cancelEditUserMessage(bubble, timestamp, originalText);
    });

    var btnRow = createMockElement('div');
    btnRow._classList.push('edit-btn-row');

    var cancelBtn = createMockElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.addEventListener('click', function() { cancelEditUserMessage(bubble, timestamp, originalText); });

    var saveBtn = createMockElement('button');
    saveBtn._classList.push('save-btn');
    saveBtn.textContent = '保存';
    saveBtn.addEventListener('click', function() {
        var newText = textarea.value.trim();
        if (!newText) return;
        finishEditUserMessage(bubble, timestamp, newText);
    });

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(saveBtn);
    bubble.appendChild(textarea);
    bubble.appendChild(btnRow);
}

function cancelEditUserMessage(bubble, timestamp, originalText) {
    bubble.children = [];
    bubble.textContent = originalText;
    attachEditButton(bubble, timestamp);
}

function finishEditUserMessage(bubble, timestamp, newText) {
    var msgDiv = bubble.closest('message.user');
    var msgIndex = conversationHistory.findIndex(function(m) { return m.timestamp === timestamp; });
    if (msgIndex === -1) return;

    conversationHistory[msgIndex].content = newText;
    conversationHistory = conversationHistory.slice(0, msgIndex + 1);

    var next = msgDiv.nextElementSibling;
    while (next) {
        var toRemove = next;
        next = next.nextElementSibling;
        toRemove.remove();
    }

    lastMessageTimestamp = timestamp;
    bubble.children = [];
    bubble.textContent = newText;
    attachEditButton(bubble, timestamp);
}

var __regenerateCalled = false;
var __regeneratedTimestamp = null;

function regenerateMessage(aiTimestamp) {
    var aiIndex = conversationHistory.findIndex(function(m) {
        return m.role === 'assistant' && m.timestamp === aiTimestamp;
    });
    if (aiIndex === -1) return;
    conversationHistory.splice(aiIndex, 1);
    var aiDiv = chatMessages.querySelector('.ai[data-msg-id="' + aiTimestamp + '"]');
    if (aiDiv) aiDiv.remove();
    __regenerateCalled = true;
    __regeneratedTimestamp = aiTimestamp;
}

// ===== 开始测试 =====
console.log('========================================');
console.log('  功能测试: 消息编辑 & 重新生成');
console.log('========================================\n');

// ===== 编辑功能测试 =====
console.log('--- 消息编辑功能 ---');

(function() {
    chatMessages.children = [];
    conversationHistory = [];
    lastMessageTimestamp = null;

    var ts1 = Date.now();
    var userDiv = addUserMessage('什么是量子纠缠', ts1);
    conversationHistory.push({ role: 'user', content: '什么是量子纠缠', timestamp: ts1 });

    test('1.1 用户消息渲染', function() {
        assert(userDiv._classList.indexOf('user') >= 0, 'user class missing');
    });

    test('1.2 data-msg-id 属性', function() {
        assertEquals(userDiv._dataset['msgId'], '' + ts1);
    });

    var bubble = userDiv.children[0];
    test('1.3 编辑按钮存在', function() {
        var editBtn = bubble.querySelector('.user-edit-btn');
        assert(editBtn !== null, 'edit button not found');
        assertEquals(editBtn.textContent, '编辑');
    });

    test('1.4 点击编辑进入编辑模式', function() {
        var editBtn = bubble.querySelector('.user-edit-btn');
        editBtn.click();
        var textarea = bubble.querySelector('.edit-textarea');
        assert(textarea !== null, 'textarea not found');
        assertEquals(textarea.value, '什么是量子纠缠');
    });

    test('1.5 编辑模式下有保存和取消按钮', function() {
        var saveBtn = bubble.querySelector('.save-btn');
        var cancelBtn = null;
        for (var i = 0; i < bubble.children.length; i++) {
            if (bubble.children[i]._classList.indexOf('edit-btn-row') >= 0) {
                cancelBtn = bubble.children[i].children[0];
                break;
            }
        }
        assert(saveBtn !== null, 'save button not found');
        assertEquals(saveBtn.textContent, '保存');
        assert(cancelBtn !== null, 'cancel button not found');
        assertEquals(cancelBtn.textContent, '取消');
    });

    test('1.6 取消编辑恢复原文', function() {
        // Find cancel button
        var cancelBtn = null;
        for (var i = 0; i < bubble.children.length; i++) {
            if (bubble.children[i]._classList.indexOf('edit-btn-row') >= 0) {
                cancelBtn = bubble.children[i].children[0];
                break;
            }
        }
        cancelBtn.click();
        assertEquals(bubble.textContent, '什么是量子纠缠');
        var editBtn = bubble.querySelector('.user-edit-btn');
        assert(editBtn !== null, 'edit button not restored after cancel');
    });

    test('1.7 保存编辑更新文本', function() {
        var editBtn = bubble.querySelector('.user-edit-btn');
        editBtn.click();
        var textarea = bubble.querySelector('.edit-textarea');
        textarea.value = '解释一下量子纠缠（编辑后）';
        var saveBtn = bubble.querySelector('.save-btn');
        saveBtn.click();
        assertEquals(bubble.textContent, '解释一下量子纠缠（编辑后）');
    });

    test('1.8 conversationHistory 同步更新', function() {
        assertEquals(conversationHistory[0].content, '解释一下量子纠缠（编辑后）');
    });

    test('1.9 编辑后移除后续消息', function() {
        var ts2 = Date.now() + 100;
        var aiDiv = createMockElement('div');
        aiDiv._classList.push('message');
        aiDiv._classList.push('ai');
        aiDiv._dataset['msgId'] = '' + ts2;
        var aiBubble = createMockElement('div');
        aiBubble.textContent = '这是 AI 的回复';
        aiDiv.appendChild(aiBubble);
        chatMessages.appendChild(aiDiv);
        conversationHistory.push({ role: 'assistant', content: '这是 AI 的回复', timestamp: ts2 });

        assert(chatMessages.querySelector('.ai') !== null, 'AI message should exist before edit');

        var editBtn = bubble.querySelector('.user-edit-btn');
        editBtn.click();
        var textarea = bubble.querySelector('.edit-textarea');
        textarea.value = '最终版本';
        var saveBtn = bubble.querySelector('.save-btn');
        saveBtn.click();

        var aiAfterEdit = chatMessages.querySelector('.ai');
        assertEquals(aiAfterEdit, null);
    });

    test('1.10 编辑后 conversationHistory 长度', function() {
        assertEquals(conversationHistory.length, 1);
        assertEquals(conversationHistory[0].content, '最终版本');
    });

    test('1.11 Escape 取消编辑', function() {
        var editBtn = bubble.querySelector('.user-edit-btn');
        editBtn.click();
        var textarea = bubble.querySelector('.edit-textarea');
        textarea.value = '不应保存';
        textarea.dispatchEvent({ type: 'keydown', key: 'Escape' });
        assertEquals(bubble.textContent, '最终版本');
        assert(bubble.querySelector('.user-edit-btn') !== null, 'edit button should be restored');
    });
})();

// ===== 重新生成功能测试 =====
console.log('');
console.log('--- 重新生成功能 ---');

(function() {
    chatMessages.children = [];
    conversationHistory = [];
    lastMessageTimestamp = null;
    __regenerateCalled = false;

    var userTs = Date.now();
    var userDiv = addUserMessage('测试问题', userTs);
    conversationHistory.push({ role: 'user', content: '测试问题', timestamp: userTs });

    var aiTs = Date.now() + 100;
    var aiDiv = createMockElement('div');
    aiDiv._classList.push('message');
    aiDiv._classList.push('ai');
    aiDiv._dataset['msgId'] = '' + aiTs;
    var aiBubble = createMockElement('div');
    aiBubble._classList.push('message-bubble');
    aiBubble.textContent = '这是 AI 的回复';
    attachRegenButton(aiBubble, aiTs);
    aiDiv.appendChild(aiBubble);
    chatMessages.appendChild(aiDiv);
    conversationHistory.push({ role: 'assistant', content: '这是 AI 的回复', timestamp: aiTs });

    test('2.1 AI 消息渲染', function() {
        assert(chatMessages.querySelector('.ai') !== null);
    });

    test('2.2 AI 消息 data-msg-id', function() {
        assertEquals(aiDiv._dataset['msgId'], '' + aiTs);
    });

    test('2.3 重新生成按钮存在', function() {
        var btn = aiBubble.querySelector('.ai-regen-btn');
        assert(btn !== null, 'regen button not found');
        assertEquals(btn.textContent, '\u{1F504}');
    });

    test('2.4 重新生成按钮 title', function() {
        var btn = aiBubble.querySelector('.ai-regen-btn');
        assertEquals(btn._attrs['title'], '重新生成');
    });

    test('2.5 重新生成前历史长度=2', function() {
        assertEquals(conversationHistory.length, 2);
    });

    test('2.6 点击重新生成移除 AI DOM', function() {
        var btn = aiBubble.querySelector('.ai-regen-btn');
        btn.click();
        assertEquals(chatMessages.querySelector('.ai'), null);
    });

    test('2.7 重新生成后 conversationHistory 长度=1', function() {
        assertEquals(conversationHistory.length, 1);
        assertEquals(conversationHistory[0].role, 'user');
    });

    test('2.8 regenerateMessage 被正确调用', function() {
        assert(__regenerateCalled === true);
        assertEquals(__regeneratedTimestamp, aiTs);
    });

    test('2.9 不存在 ID 时不做操作', function() {
        __regenerateCalled = false;
        regenerateMessage(99999999);
        assert(__regenerateCalled === false);
    });
})();

// ===== 汇总 =====
console.log('');
console.log('========================================');
console.log('  测试汇总: ' + passed + '/' + (passed + failed) + ' 通过');
if (failed > 0) {
    console.log('  失败项:');
    failures.forEach(function(f) {
        console.log('    - ' + f.name + ': ' + f.error);
    });
}
console.log('========================================');

if (failed > 0) process.exit(1);
