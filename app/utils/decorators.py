from functools import wraps
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from app.utils.errors import AuthenticationError


def require_auth(fn=None, optional=False):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request()
                kwargs['current_user_id'] = int(get_jwt_identity())
            except Exception:
                if not optional:
                    raise AuthenticationError('请先登录')
                kwargs['current_user_id'] = None
            return f(*args, **kwargs)
        return wrapper

    if fn is not None:
        return decorator(fn)
    return decorator
