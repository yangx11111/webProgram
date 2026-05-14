from flask import Blueprint, request, jsonify
from app.utils.decorators import require_auth
from app.services import conversation_service as svc
from app.utils.errors import ValidationError

conversations_bp = Blueprint('conversations', __name__)


@conversations_bp.route('/conversations', methods=['GET'])
@require_auth
def list_conversations(current_user_id):
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    result = svc.get_user_conversations(current_user_id, page, per_page)
    return jsonify(result)


@conversations_bp.route('/conversations', methods=['POST'])
@require_auth
def create_conversation(current_user_id):
    data = request.json or {}
    title = (data.get('title') or '').strip()
    if title and len(title) > 200:
        raise ValidationError('标题不能超过200个字符')
    conv = svc.create_conversation(current_user_id, title)
    return jsonify(conv.to_dict()), 201


@conversations_bp.route('/conversations/<int:conv_id>', methods=['GET'])
@require_auth
def get_conversation_detail(current_user_id, conv_id):
    data = svc.get_conversation_with_messages(conv_id, current_user_id)
    return jsonify(data)


@conversations_bp.route('/conversations/<int:conv_id>', methods=['PATCH'])
@require_auth
def update_conversation(current_user_id, conv_id):
    data = request.json or {}
    title = (data.get('title') or '').strip()
    if not title:
        raise ValidationError('标题不能为空')
    if len(title) > 200:
        raise ValidationError('标题不能超过200个字符')
    conv = svc.update_conversation(conv_id, current_user_id, title)
    return jsonify(conv.to_dict())


@conversations_bp.route('/conversations/<int:conv_id>', methods=['DELETE'])
@require_auth
def delete_conversation(current_user_id, conv_id):
    svc.delete_conversation(conv_id, current_user_id)
    return '', 204
