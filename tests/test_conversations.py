def test_create_conversation(client, auth_headers):
    resp = client.post('/api/conversations', json={'title': '我的对话'},
                       headers=auth_headers)
    assert resp.status_code == 201
    data = resp.get_json()
    assert data['title'] == '我的对话'


def test_create_conversation_default_title(client, auth_headers):
    resp = client.post('/api/conversations', json={}, headers=auth_headers)
    assert resp.status_code == 201
    assert resp.get_json()['title'] == '新对话'


def test_list_conversations_empty(client, auth_headers):
    resp = client.get('/api/conversations', headers=auth_headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['total'] == 0
    assert data['items'] == []


def test_list_conversations(client, auth_headers):
    client.post('/api/conversations', json={'title': 'A'}, headers=auth_headers)
    client.post('/api/conversations', json={'title': 'B'}, headers=auth_headers)
    resp = client.get('/api/conversations', headers=auth_headers)
    data = resp.get_json()
    assert data['total'] == 2
    assert len(data['items']) == 2


def test_get_conversation_detail(client, auth_headers):
    resp = client.post('/api/conversations', json={'title': 'Detail'},
                       headers=auth_headers)
    conv_id = resp.get_json()['id']

    resp = client.get(f'/api/conversations/{conv_id}', headers=auth_headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['title'] == 'Detail'
    assert 'messages' in data


def test_update_conversation(client, auth_headers):
    resp = client.post('/api/conversations', json={'title': 'Old'},
                       headers=auth_headers)
    conv_id = resp.get_json()['id']

    resp = client.patch(f'/api/conversations/{conv_id}',
                        json={'title': 'New Title'}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.get_json()['title'] == 'New Title'


def test_delete_conversation(client, auth_headers):
    resp = client.post('/api/conversations', json={'title': 'To Delete'},
                       headers=auth_headers)
    conv_id = resp.get_json()['id']

    resp = client.delete(f'/api/conversations/{conv_id}', headers=auth_headers)
    assert resp.status_code == 204

    # 删除后不应再出现
    resp = client.get('/api/conversations', headers=auth_headers)
    assert resp.get_json()['total'] == 0


def test_ownership_isolation(client, auth_headers, auth_headers2):
    """用户 A 的对话，用户 B 不能访问"""
    resp = client.post('/api/conversations', json={'title': 'Private'},
                       headers=auth_headers)
    conv_id = resp.get_json()['id']

    resp = client.get(f'/api/conversations/{conv_id}', headers=auth_headers2)
    assert resp.status_code == 403


def test_not_found_conversation(client, auth_headers):
    resp = client.get('/api/conversations/99999', headers=auth_headers)
    assert resp.status_code == 404
