from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import validates
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    # NEW
    name = db.Column(db.String(120), nullable=False, default="Tamil Learner")

    email = db.Column(db.String(255), unique=True, index=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    @validates("email")
    def validate_email(self, key, value):
        v = (value or "").strip().lower()
        if not v or "@" not in v:
            raise ValueError("Invalid email")
        return v

    def to_safe_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "created_at": self.created_at.isoformat()
        }

class SavedWord(db.Model):
    __tablename__ = "saved_words"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)

    english = db.Column(db.String(128), nullable=False)
    tamil = db.Column(db.String(128), nullable=False)
    transliteration = db.Column(db.String(128))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        db.UniqueConstraint("user_id", "english", name="uq_saved_word_user_english"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "english": self.english,
            "tamil": self.tamil,
            "transliteration": self.transliteration,
            "createdAt": self.created_at.isoformat() + "Z",
        }
