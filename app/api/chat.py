from flask import Blueprint, request, Response, jsonify
from app.utils.decorators import require_auth
from app.services.ai_client import stream_chat
from app.services.file_parser import parse_file_content
from app.services.conversation_service import (
    create_conversation, add_message, get_conversation
)
from app.extensions import limiter

chat_bp = Blueprint('chat', __name__)


@chat_bp.route('/chat', methods=['POST', 'OPTIONS'])
@require_auth
@limiter.limit('20 per minute')
def chat(current_user_id):
    if request.method == 'OPTIONS':
        return jsonify({})

    data = request.json
    user_messages = data.get('messages', [])
    file_info = data.get('file')
    conversation_id = data.get('conversation_id')

    if not user_messages and not file_info:
        return jsonify({'error': '消息不能为空'}), 400

    # 解析文件
    file_content = None
    file_name = None
    if file_info:
        file_content = parse_file_content(file_info)
        file_name = file_info.get('name', '文件')

    # 确认或创建对话
    if conversation_id:
        get_conversation(conversation_id, current_user_id)
    else:
        title = None
        if user_messages:
            title = user_messages[-1].get('content', '')[:50]
        conv = create_conversation(current_user_id, title)
        conversation_id = conv.id

    # 保存用户消息
    if user_messages:
        last_content = user_messages[-1].get('content', '')
        add_message(conversation_id, 'user', last_content)

    # 收集 AI 回复内容的容器
    ai_content_holder = {'text': ''}

    def generate():
        for chunk, full_text in stream_chat(user_messages, file_content, file_name):
            if full_text is not None:
                ai_content_holder['text'] = full_text
            yield chunk

        # 流结束后保存 AI 回复
        if ai_content_holder['text']:
            add_message(conversation_id, 'assistant', ai_content_holder['text'])

    return Response(
        generate(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
            'Connection': 'keep-alive'
        }
    )
