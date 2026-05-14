def test_register_success(client):
    resp = client.post('/api/auth/register', json={
        'username': 'newuser',
        'email': 'new@test.com',
        'password': '123456'
    })
    assert resp.status_code == 201
    data = resp.get_json()
    assert data['user']['username'] == 'newuser'
    assert 'access_token' in data
    assert 'refresh_token' in data


def test_register_duplicate_username(client):
    client.post('/api/auth/register', json={
        'username': 'dup', 'email': 'a@t.com', 'password': '123456'
    })
    resp = client.post('/api/auth/register', json={
        'username': 'dup', 'email': 'b@t.com', 'password': '123456'
    })
    assert resp.status_code == 400


def test_register_duplicate_email(client):
    client.post('/api/auth/register', json={
        'username': 'a', 'email': 'same@t.com', 'password': '123456'
    })
    resp = client.post('/api/auth/register', json={
        'username': 'b', 'email': 'same@t.com', 'password': '123456'
    })
    assert resp.status_code == 400


def test_register_short_password(client):
    resp = client.post('/api/auth/register', json={
        'username': 'u', 'email': 's@t.com', 'password': '123'
    })
    assert resp.status_code == 400


def test_register_empty_fields(client):
    resp = client.post('/api/auth/register', json={})
    assert resp.status_code == 400


def test_login_success(client):
    client.post('/api/auth/register', json={
        'username': 'loginuser', 'email': 'login@t.com', 'password': 'mypassword'
    })
    resp = client.post('/api/auth/login', json={
        'email': 'login@t.com', 'password': 'mypassword'
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert 'access_token' in data
    assert 'refresh_token' in data


def test_login_wrong_password(client):
    client.post('/api/auth/register', json={
        'username': 'lp', 'email': 'lp@t.com', 'password': 'correct'
    })
    resp = client.post('/api/auth/login', json={
        'email': 'lp@t.com', 'password': 'wrong'
    })
    assert resp.status_code == 401


def test_login_nonexistent_user(client):
    resp = client.post('/api/auth/login', json={
        'email': 'no@t.com', 'password': '123456'
    })
    assert resp.status_code == 401


def test_refresh_token(client):
    resp = client.post('/api/auth/register', json={
        'username': 'rf', 'email': 'rf@t.com', 'password': '123456'
    })
    refresh = resp.get_json()['refresh_token']

    resp = client.post('/api/auth/refresh', json={'refresh_token': refresh})
    assert resp.status_code == 200
    assert 'access_token' in resp.get_json()


def test_unauthenticated_access(client):
    resp = client.get('/api/conversations')
    assert resp.status_code == 401
