def register_blueprints(app):
    from app.api.auth import auth_bp
    from app.api.chat import chat_bp
    from app.api.conversations import conversations_bp
    from app.api.health import health_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(chat_bp, url_prefix='/api')
    app.register_blueprint(conversations_bp, url_prefix='/api')
    app.register_blueprint(health_bp, url_prefix='/api')
