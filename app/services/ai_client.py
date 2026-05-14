import json
import requests as http_requests
from app.utils.prompts import SYSTEM_PROMPT


def stream_chat(messages, api_key, api_url, model, file_content=None, file_name=None):
    """生成 SSE 流式响应。参数显式传入以避免 generator 内部访问 current_app"""

    if file_content:
        fname = file_name or '文件'
        if messages:
            prefix = f'[用户上传了文件: {fname}]\n文件内容如下：\n\n{file_content}\n\n---\n用户问题：'
            messages[-1]['content'] = prefix + messages[-1]['content']
        else:
            messages = [{
                'role': 'user',
                'content': f'[用户上传了文件: {fname}]\n文件内容如下：\n\n{file_content}\n\n请帮我解读这个文件的内容。'
            }]

    payload = {
        'model': model,
        'messages': [{'role': 'system', 'content': SYSTEM_PROMPT}] + messages,
        'stream': True,
        'thinking': {'type': 'disabled'}
    }

    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }

    try:
        response = http_requests.post(
            api_url, headers=headers, json=payload,
            timeout=120, stream=True
        )

        full_content = []

        for line in response.iter_lines():
            if not line:
                continue
            decoded = line.decode('utf-8')

            if decoded.startswith('data: '):
                data_str = decoded[6:]

                if data_str.strip() == '[DONE]':
                    yield 'data: [DONE]\n\n', ''.join(full_content)
                    return

                try:
                    chunk = json.loads(data_str)
                    delta = chunk.get('choices', [{}])[0].get('delta', {})
                    content = delta.get('content', '')
                    if content:
                        full_content.append(content)
                except json.JSONDecodeError:
                    pass

                yield f'data: {data_str}\n\n', None

    except Exception as e:
        error_msg = json.dumps({'error': str(e)})
        yield f'data: {error_msg}\n\n', None
