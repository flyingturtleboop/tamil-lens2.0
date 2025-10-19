from datetime import datetime, date
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import validates
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, default="Tamil Learner")
    email = db.Column(db.String(255), unique=True, index=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    
    # STREAK TRACKING
    current_streak = db.Column(db.Integer, default=0, nullable=False)
    longest_streak = db.Column(db.Integer, default=0, nullable=False)
    last_activity_date = db.Column(db.Date, nullable=True)
    total_scans = db.Column(db.Integer, default=0, nullable=False)
    total_quizzes = db.Column(db.Integer, default=0, nullable=False)
    
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

    def update_streak(self):
        """Update user's streak based on activity"""
        today = date.today()
        
        if self.last_activity_date is None:
            # First activity ever
            self.current_streak = 1
            self.last_activity_date = today
        elif self.last_activity_date == today:
            # Already active today, no change
            pass
        elif (today - self.last_activity_date).days == 1:
            # Active yesterday, increment streak
            self.current_streak += 1
            self.last_activity_date = today
        else:
            # Streak broken
            self.current_streak = 1
            self.last_activity_date = today
        
        # Update longest streak
        if self.current_streak > self.longest_streak:
            self.longest_streak = self.current_streak

    def to_safe_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "currentStreak": self.current_streak,
            "longestStreak": self.longest_streak,
            "totalScans": self.total_scans,
            "totalQuizzes": self.total_quizzes,
            "lastActivityDate": self.last_activity_date.isoformat() if self.last_activity_date else None,
            "created_at": self.created_at.isoformat()
        }


class SavedWord(db.Model):
    __tablename__ = "saved_words"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)

    english = db.Column(db.String(128), nullable=False)
    tamil = db.Column(db.String(128), nullable=False)
    transliteration = db.Column(db.String(128))
    
    # FLASHCARD REVIEW TRACKING
    review_count = db.Column(db.Integer, default=0, nullable=False)
    correct_count = db.Column(db.Integer, default=0, nullable=False)
    last_reviewed = db.Column(db.DateTime, nullable=True)
    next_review = db.Column(db.DateTime, nullable=True)
    difficulty = db.Column(db.Integer, default=0, nullable=False)  # 0=new, 1=easy, 2=medium, 3=hard
    
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
            "reviewCount": self.review_count,
            "correctCount": self.correct_count,
            "lastReviewed": self.last_reviewed.isoformat() + "Z" if self.last_reviewed else None,
            "nextReview": self.next_review.isoformat() + "Z" if self.next_review else None,
            "difficulty": self.difficulty,
            "createdAt": self.created_at.isoformat() + "Z",
        }


class Achievement(db.Model):
    __tablename__ = "achievements"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    
    achievement_type = db.Column(db.String(50), nullable=False)  # 'first_scan', 'streak_7', 'words_50', etc.
    unlocked_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    __table_args__ = (
        db.UniqueConstraint("user_id", "achievement_type", name="uq_user_achievement"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "type": self.achievement_type,
            "unlockedAt": self.unlocked_at.isoformat() + "Z"
        }