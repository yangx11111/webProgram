from datetime import datetime
from app.extensions import db


class Conversation(db.Model):
    __tablename__ = 'conversations'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(200), default='新对话')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', back_populates='conversations')
    messages = db.relationship(
        'Message', back_populates='conversation',
        cascade='all, delete-orphan', lazy='dynamic',
        order_by='Message.created_at'
    )

    __table_args__ = (
        db.Index('idx_user_updated', 'user_id', 'updated_at'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'message_count': self.messages.count(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
