import logging
from flask import Flask, jsonify
from config import config_map


def create_app(config_name=None):
    if config_name is None:
        config_name = 'development'

    app = Flask(__name__, static_folder='../frontend', static_url_path='/static')
    app.config.from_object(config_map.get(config_name, config_map['default']))

    # 日志
    logging.basicConfig(
        level=logging.DEBUG if app.config.get('DEBUG') else logging.INFO,
        format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
    )

    # 初始化扩展
    from app.extensions import db, jwt, migrate, limiter
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    limiter.init_app(app)

    # 注册蓝图
    from app.api import register_blueprints
    register_blueprints(app)

    # 错误处理器
    from app.utils.errors import register_error_handlers
    register_error_handlers(app)

    # CORS
    @app.after_request
    def add_cors_headers(response):
        origin = app.config.get('CORS_ORIGIN', '*')
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        return response

    # 首页
    @app.route('/')
    def index():
        from flask import send_file
        import os
        return send_file(os.path.join(app.root_path, '..', 'frontend', 'index.html'))

    # 数据库初始化（开发环境自动建表）
    with app.app_context():
        db.create_all()

    return app
