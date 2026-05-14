from app.extensions import db
from app.models import Conversation, Message
from app.utils.errors import NotFoundError, PermissionDeniedError


def create_conversation(user_id, title=None):
    conv = Conversation(
        user_id=user_id,
        title=title or '新对话'
    )
    db.session.add(conv)
    db.session.commit()
    return conv


def get_user_conversations(user_id, page=1, per_page=20):
    pagination = (
        Conversation.query
        .filter_by(user_id=user_id, is_active=True)
        .order_by(Conversation.updated_at.desc())
        .paginate(page=page, per_page=per_page, error_out=False)
    )
    return {
        'items': [c.to_dict() for c in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    }


def get_conversation(conv_id, user_id):
    conv = db.session.get(Conversation, conv_id)
    if not conv or not conv.is_active:
        raise NotFoundError('对话不存在')
    if conv.user_id != user_id:
        raise PermissionDeniedError('无权访问此对话')
    return conv


def get_conversation_with_messages(conv_id, user_id):
    conv = get_conversation(conv_id, user_id)
    data = conv.to_dict()
    data['messages'] = [m.to_dict() for m in conv.messages.all()]
    return data


def update_conversation(conv_id, user_id, title):
    conv = get_conversation(conv_id, user_id)
    conv.title = title
    db.session.commit()
    return conv


def delete_conversation(conv_id, user_id):
    conv = get_conversation(conv_id, user_id)
    conv.is_active = False
    db.session.commit()


def add_message(conv_id, role, content):
    msg = Message(conversation_id=conv_id, role=role, content=content)
    db.session.add(msg)
    conv = db.session.get(Conversation, conv_id)
    if conv:
        from datetime import datetime, timezone
        conv.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    return msg


def delete_message(msg_id, user_id):
    msg = db.session.get(Message, msg_id)
    if not msg:
        raise NotFoundError('消息不存在')
    conv = db.session.get(Conversation, msg.conversation_id)
    if not conv or conv.user_id != user_id:
        raise PermissionDeniedError('无权操作此消息')
    db.session.delete(msg)
    db.session.commit()
