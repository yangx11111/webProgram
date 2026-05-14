class AppError(Exception):
    status_code = 500

    def __init__(self, message, status_code=None):
        self.message = message
        if status_code is not None:
            self.status_code = status_code

    def to_dict(self):
        return {'error': self.message}


class AuthenticationError(AppError):
    status_code = 401


class NotFoundError(AppError):
    status_code = 404


class ValidationError(AppError):
    status_code = 400


class PermissionDeniedError(AppError):
    status_code = 403


def register_error_handlers(app):
    @app.errorhandler(AppError)
    def handle_app_error(e):
        from flask import jsonify
        return jsonify(e.to_dict()), e.status_code

    @app.errorhandler(400)
    def handle_400(e):
        from flask import jsonify
        return jsonify({'error': '请求参数有误'}), 400

    @app.errorhandler(401)
    def handle_401(e):
        from flask import jsonify
        return jsonify({'error': '请先登录'}), 401

    @app.errorhandler(403)
    def handle_403(e):
        from flask import jsonify
        return jsonify({'error': '无权访问'}), 403

    @app.errorhandler(404)
    def handle_404(e):
        from flask import jsonify
        return jsonify({'error': '资源不存在'}), 404

    @app.errorhandler(500)
    def handle_500(e):
        from flask import jsonify
        app.logger.error(f'Internal error: {e}')
        return jsonify({'error': '服务器内部错误'}), 500
