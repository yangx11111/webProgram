import json
import requests as http_requests
from flask import current_app
from app.utils.prompts import SYSTEM_PROMPT


def build_payload(messages, file_content=None, file_name=None):
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

    return {
        'model': current_app.config['MOONSHOT_MODEL'],
        'messages': [{'role': 'system', 'content': SYSTEM_PROMPT}] + messages,
        'stream': True,
        'thinking': {'type': 'disabled'}
    }


def stream_chat(messages, file_content=None, file_name=None):
    payload = build_payload(messages, file_content, file_name)
    headers = {
        'Authorization': f"Bearer {current_app.config['MOONSHOT_API_KEY']}",
        'Content-Type': 'application/json'
    }

    try:
        response = http_requests.post(
            current_app.config['MOONSHOT_API_URL'],
            headers=headers, json=payload,
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
