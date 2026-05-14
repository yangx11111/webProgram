import json
from unittest.mock import patch, MagicMock


def test_chat_requires_auth(client):
    resp = client.post('/api/chat', json={
        'messages': [{'role': 'user', 'content': 'hello'}]
    })
    assert resp.status_code == 401


def test_chat_empty_messages(client, auth_headers):
    resp = client.post('/api/chat', json={'messages': []}, headers=auth_headers)
    assert resp.status_code == 400


def _mock_stream_response(chunks):
    """模拟 Moonshot API 的 SSE 流式响应"""
    lines = []
    for content in chunks:
        chunk_data = json.dumps({
            'choices': [{'delta': {'content': content}}]
        })
        lines.append(f'data: {chunk_data}\n\n'.encode('utf-8'))
    lines.append(b'data: [DONE]\n\n')

    mock_resp = MagicMock()
    mock_resp.iter_lines.return_value = lines
    return mock_resp


@patch('app.services.ai_client.http_requests.post')
def test_chat_saves_conversation_and_messages(mock_post, client, auth_headers):
    mock_post.return_value = _mock_stream_response(['这是', 'AI', '回复'])

    resp = client.post('/api/chat', json={
        'messages': [{'role': 'user', 'content': '什么是递归'}]
    }, headers=auth_headers)

    # 读取 SSE 流
    body = b''
    for chunk in resp.response:
        body += chunk

    text = body.decode('utf-8')
    assert 'data:' in text

    # 验证对话被创建
    conv_resp = client.get('/api/conversations', headers=auth_headers)
    convs = conv_resp.get_json()
    assert convs['total'] == 1
    assert convs['items'][0]['title'] == '什么是递归'

    # 验证消息被保存（1 user + 1 assistant）
    conv_id = convs['items'][0]['id']
    detail = client.get(f'/api/conversations/{conv_id}', headers=auth_headers)
    messages = detail.get_json()['messages']
    assert len(messages) == 2
    assert messages[0]['role'] == 'user'
    assert messages[1]['role'] == 'assistant'
    assert messages[1]['content'] == '这是AI回复'


@patch('app.services.ai_client.http_requests.post')
def test_chat_with_existing_conversation(mock_post, client, auth_headers):
    mock_post.return_value = _mock_stream_response(['OK'])

    # 先创建对话
    resp = client.post('/api/conversations', json={'title': 'Test'},
                       headers=auth_headers)
    conv_id = resp.get_json()['id']

    # 在已有对话中发消息（必须消费 SSE 流以触发 AI 消息持久化）
    resp = client.post('/api/chat', json={
        'conversation_id': conv_id,
        'messages': [{'role': 'user', 'content': '继续'}]
    }, headers=auth_headers)
    for _ in resp.response:
        pass

    # 应该有 2 条消息
    detail = client.get(f'/api/conversations/{conv_id}', headers=auth_headers)
    assert len(detail.get_json()['messages']) == 2


@patch('app.services.ai_client.http_requests.post')
def test_chat_api_error(mock_post, client, auth_headers):
    mock_post.side_effect = Exception('API error')

    resp = client.post('/api/chat', json={
        'messages': [{'role': 'user', 'content': 'test'}]
    }, headers=auth_headers)

    body = b''
    for chunk in resp.response:
        body += chunk
    text = body.decode('utf-8')
    assert 'error' in text


@patch('app.services.ai_client.http_requests.post')
def test_chat_conversation_ownership(mock_post, client, auth_headers, auth_headers2):
    mock_post.return_value = _mock_stream_response(['OK'])

    # 用户A创建对话
    resp = client.post('/api/conversations', json={'title': 'Mine'},
                       headers=auth_headers)
    conv_id = resp.get_json()['id']

    # 用户B尝试在A的对话中发消息
    resp = client.post('/api/chat', json={
        'conversation_id': conv_id,
        'messages': [{'role': 'user', 'content': 'hack'}]
    }, headers=auth_headers2)

    assert resp.status_code == 403
