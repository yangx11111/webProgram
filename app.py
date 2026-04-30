from flask import Flask, request, jsonify, send_file, Response
import requests as http_requests
import json

app = Flask(__name__)

# ========== 配置区 ==========
API_KEY = 'sk-SOhqGfejR2w5Se9x6jxdNWhOcmQSoylOLckGUqgKWXTyWXnv'
API_URL = 'https://api.moonshot.cn/v1/chat/completions'
MODEL = 'kimi-k2.6'

# ========== 费曼导师人设 ==========
SYSTEM_PROMPT = '''
# Role: 费曼式全领域首席知识导师

# 核心能力：动态意图识别
在回答前，你必须先隐式判断用户的输入属于【概念求知】还是【具体解题】，并严格调用对应的输出模块。

# Workflow (交互工作流):

## 分支 A：【概念求知】 (当用户询问名词、概念、原理时调用)
【专业解释】：(精准的学术定义)
【大白话解释】：(150字内的生活化比喻)
【测试一下】：(给出一个贴近生活的场景应用题，测试其判断力)

## 分支 B：【具体解题】 (当用户给出一道数学题、代码报错、具体任务时调用)
【核心考点】：(一句话指出这个问题背后考察的定理或底层逻辑)
【拆解演示】：(像给同桌讲题一样，用最口语化的方式一步步拆解过程，重点讲“为什么这一步要这么做”，而非冷冰冰的罗列算式)
【举一反三】：(修改原题的一个关键参数或条件，向用户提问：如果是这样，这道题的思路会有什么变化？)

## 阶段二：知识诊断与升华 (当用户回答了你的【测试一下】后，按以下格式输出)
【诊断反馈】：分析用户的回答。如果正确，指出其回答中最闪光的一点并给予肯定；如果有误或存在偏差，温柔且明确地指出逻辑漏洞所在。
【认知改进】：针对用户的理解偏差进行纠正，或者用一句话将该知识点与更深层次的原理、其他相关概念串联起来，完成知识的巩固与升华。'''

# ========== 跨域处理 ==========
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response

# ========== 聊天接口（流式输出） ==========
@app.route('/')
def index():
    return send_file('index.html')

@app.route('/api/chat', methods=['POST', 'OPTIONS'])
def chat():
    if request.method == 'OPTIONS':
        return jsonify({})

    data = request.json
    user_messages = data.get('messages', [])

    if not user_messages:
        return jsonify({'error': '消息不能为空'}), 400

    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json'
    }

    messages = [{'role': 'system', 'content': SYSTEM_PROMPT}] + user_messages

    payload = {
        'model': MODEL,
        'messages': messages,
        'stream': True,                     # ★ 开启流式输出
        'thinking': {'type': 'disabled'}
    }

    def generate():
        """生成器函数：逐块读取 Kimi 的流式响应，转发给前端"""
        try:
            response = http_requests.post(
                API_URL, headers=headers, json=payload,
                timeout=120, stream=True     # ★ 后端也用流式读取
            )

            for line in response.iter_lines():
                if not line:
                    continue
                decoded = line.decode('utf-8')

                # SSE 格式：每行以 "data: " 开头
                if decoded.startswith('data: '):
                    data_str = decoded[6:]   # 去掉 "data: " 前缀

                    # [DONE] 表示流结束
                    if data_str.strip() == '[DONE]':
                        yield 'data: [DONE]\n\n'
                        break

                    # 转发给前端（原样传递，前端自己解析）
                    yield f'data: {data_str}\n\n'

        except Exception as e:
            # 出错时通过 SSE 发送错误信息
            error_msg = json.dumps({'error': str(e)})
            yield f'data: {error_msg}\n\n'

    # ★ 用 Response + 生成器 返回 SSE 流
    return Response(
        generate(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',       # 禁止缓存，确保实时推送
            'X-Accel-Buffering': 'no',         # 禁止 Nginx 缓冲
            'Connection': 'keep-alive'         # 保持连接
        }
    )

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
