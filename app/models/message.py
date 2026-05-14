from datetime import datetime, timezone
from app.extensions import db


class Message(db.Model):
    __tablename__ = 'messages'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    conversation_id = db.Column(
        db.Integer, db.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False
    )
    role = db.Column(db.Enum('user', 'assistant', name='message_role'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    conversation = db.relationship('Conversation', back_populates='messages')

    __table_args__ = (
        db.Index('idx_conv_created', 'conversation_id', 'created_at'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'role': self.role,
            'content': self.content,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
