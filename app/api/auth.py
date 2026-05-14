from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    from app.extensions import db
    from app.models.user import User
    from app.utils.errors import ValidationError

    username = (data.get('username') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = (data.get('password') or '').strip()

    if not username or not email or not password:
        raise ValidationError('用户名、邮箱和密码不能为空')
    if len(username) > 50:
        raise ValidationError('用户名不能超过50个字符')
    if len(password) < 6:
        raise ValidationError('密码至少需要6个字符')
    if User.query.filter_by(username=username).first():
        raise ValidationError('用户名已被使用')
    if User.query.filter_by(email=email).first():
        raise ValidationError('邮箱已被注册')

    user = User(username=username, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return jsonify({
        'user': user.to_dict(),
        'access_token': access_token,
        'refresh_token': refresh_token,
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    from app.models.user import User
    from app.utils.errors import AuthenticationError, ValidationError

    email = (data.get('email') or '').strip().lower()
    password = (data.get('password') or '').strip()

    if not email or not password:
        raise ValidationError('邮箱和密码不能为空')

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        raise AuthenticationError('邮箱或密码错误')

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return jsonify({
        'user': user.to_dict(),
        'access_token': access_token,
        'refresh_token': refresh_token,
    })


@auth_bp.route('/refresh', methods=['POST'])
def refresh():
    from flask_jwt_extended import decode_token
    from app.utils.errors import AuthenticationError

    data = request.json or {}
    raw_token = data.get('refresh_token', '')

    if not raw_token:
        raise AuthenticationError('refresh_token 不能为空')

    try:
        decoded = decode_token(raw_token)
        if decoded.get('type') != 'refresh':
            raise AuthenticationError('请提供 refresh_token')
        user_id = decoded['sub']
        access_token = create_access_token(identity=user_id)
        return jsonify({'access_token': access_token})
    except Exception:
        raise AuthenticationError('refresh_token 无效或已过期')
