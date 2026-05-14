import pytest
from app import create_app
from app.extensions import db as _db


@pytest.fixture(scope='session')
def app():
    app = create_app('testing')
    with app.app_context():
        _db.create_all()
    yield app


@pytest.fixture
def client(app):
    with app.app_context():
        _db.drop_all()
        _db.create_all()
    return app.test_client()


@pytest.fixture
def db(app, client):
    with app.app_context():
        yield _db


_counter = 0


def _register_user(client, prefix='user'):
    global _counter
    _counter += 1
    username = f'{prefix}_{_counter}'
    email = f'{username}@test.com'
    resp = client.post('/api/auth/register', json={
        'username': username, 'email': email, 'password': 'test123456'
    })
    data = resp.get_json()
    return {
        'Authorization': f"Bearer {data['access_token']}",
        'Content-Type': 'application/json'
    }


@pytest.fixture
def auth_headers(client):
    return _register_user(client, 'userA')


@pytest.fixture
def auth_headers2(client):
    return _register_user(client, 'userB')
