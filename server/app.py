# app.py
from datetime import timedelta, datetime, date
import os, io, re, json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()
print(f"DEBUG: GEMINI_API_KEY = {os.environ.get('GEMINI_API_KEY')[:10]}..." if os.environ.get('GEMINI_API_KEY') else "DEBUG: NO KEY FOUND")

from flask import Flask, request, jsonify, current_app
from flask_cors import CORS
from flask_migrate import Migrate
from flask_jwt_extended import (
    JWTManager, create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, set_refresh_cookies,
    unset_jwt_cookies, verify_jwt_in_request
)
from models import db, User, SavedWord, Achievement
from PIL import Image

def ok_image_type(ct):
    return ct in ("image/jpeg", "image/png", "image/webp", "image/heic", "image/heif",
                  "application/octet-stream", None)

def compress_to_jpeg_bytes(file_bytes: bytes, max_w: int = 640, quality: int = 72) -> bytes:
    img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    w, h = img.size
    if max(w, h) > max_w:
        scale = max_w / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)))
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=quality, optimize=True)
    return buf.getvalue()

def clamp01(x) -> float:
    try:
        return max(0.0, min(1.0, float(x)))
    except Exception:
        return 0.0

def extract_json_loose(s: str):
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", s, flags=re.DOTALL)
        if not m:
            raise ValueError("No JSON object found in model output")
        return json.loads(m.group(0))

STRICT_JSON_PROMPT = (
    "Identify the primary everyday object in this photo. "
    "Return JSON ONLY with EXACTLY ONE candidate:\n"
    "{ \"tamil\": \"<Tamil>\", "
    "\"transliteration\": \"<ISO 15919>\", "
    "\"english\": \"<common noun>\", "
    "\"partOfSpeech\": null, "
    "\"confidence\": 0.0 }\n"
    "Rules: (1) 'tamil' MUST be non-empty Tamil script; "
    "(2) 'transliteration' MUST be ISO 15919; "
    "(3) generalize brand/variant to the common noun; "
    "(4) NO extra text."
)

TRANSLATE_JSON_PROMPT = (
    "Given an English common noun, produce Tamil and ISO 15919 transliteration. "
    "Return JSON ONLY with this shape and NO extra text:\n"
    "{ \"tamil\": \"<Tamil>\", \"transliteration\": \"<ISO 15919>\", "
    "\"english\": \"<same english>\", \"partOfSpeech\": null, \"confidence\": 1.0 }"
)

def check_achievements(user):
    """Check and unlock achievements"""
    achievements_to_unlock = []
    
    # First scan
    if user.total_scans == 1:
        achievements_to_unlock.append("first_scan")
    
    # Word milestones
    word_count = SavedWord.query.filter_by(user_id=user.id).count()
    if word_count >= 10:
        achievements_to_unlock.append("words_10")
    if word_count >= 50:
        achievements_to_unlock.append("words_50")
    if word_count >= 100:
        achievements_to_unlock.append("words_100")
    if word_count >= 200:
        achievements_to_unlock.append("words_200")
    
    # Streak milestones
    if user.current_streak >= 3:
        achievements_to_unlock.append("streak_3")
    if user.current_streak >= 7:
        achievements_to_unlock.append("streak_7")
    if user.current_streak >= 14:
        achievements_to_unlock.append("streak_14")
    if user.current_streak >= 30:
        achievements_to_unlock.append("streak_30")
    
    # Quiz milestones
    if user.total_quizzes >= 5:
        achievements_to_unlock.append("quiz_5")
    if user.total_quizzes >= 10:
        achievements_to_unlock.append("quiz_10")
    if user.total_quizzes >= 25:
        achievements_to_unlock.append("quiz_25")
    
    # Unlock new achievements
    for achievement_type in achievements_to_unlock:
        existing = Achievement.query.filter_by(
            user_id=user.id, 
            achievement_type=achievement_type
        ).first()
        
        if not existing:
            new_achievement = Achievement(
                user_id=user.id,
                achievement_type=achievement_type
            )
            db.session.add(new_achievement)

def create_app():
    app = Flask(__name__)

    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-change-me")
    app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "dev-jwt-secret-change-me")

    app.config["JWT_TOKEN_LOCATION"] = ["headers", "cookies"]
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(minutes=60)
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=30)

    app.config["JWT_COOKIE_SECURE"] = False
    app.config["JWT_COOKIE_SAMESITE"] = "Lax"
    app.config["JWT_COOKIE_CSRF_PROTECT"] = False

    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///app.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    db.init_app(app)

    Migrate(app, db)

    FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000")
    CORS(app, resources={r"/*": {"origins": [FRONTEND_ORIGIN]}}, supports_credentials=True)

    JWTManager(app)

    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
    GEMINI_API_VERSION = os.environ.get("GEMINI_API_VERSION", "v1beta")
    GEMINI_VISION_MODEL = os.environ.get("GEMINI_VISION_MODEL", "gemini-2.0-flash")

    genai_client = None
    try:
        if GEMINI_API_KEY:
            os.environ["GOOGLE_API_KEY"] = GEMINI_API_KEY
            from google import genai
            from google.genai import types
            genai_client = genai.Client(
                http_options=types.HttpOptions(api_version=GEMINI_API_VERSION)
            )
            print(f"[Gemini] Using API {GEMINI_API_VERSION}, model {GEMINI_VISION_MODEL}")
        else:
            print("[Gemini] WARNING: GEMINI_API_KEY not set. /api/identify will return 502.")
    except Exception as e:
        print("[Gemini] Init failed:", e)

    app.config["GENAI_CLIENT"] = genai_client
    app.config["GEMINI_VISION_MODEL"] = GEMINI_VISION_MODEL

    if os.environ.get("AUTO_CREATE_DB", "1") == "1":
        with app.app_context():
            db.create_all()

    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"message": "Bad request", "detail": str(e)}), 400

    @app.errorhandler(401)
    def unauthorized(e):
        return jsonify({"message": "Unauthorized", "detail": str(e)}), 401

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"message": "Not found"}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"message": "Internal server error", "detail": str(e)}), 500

    @app.get("/healthz")
    def healthz():
        return {"ok": True}, 200

    # ========== AUTH ==========
    @app.post("/auth/register")
    def register():
        data = request.get_json(silent=True) or {}
        name = (data.get("name") or "").strip() or "Tamil Learner"
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""

        if not email or not password:
            return jsonify({"message": "Email and password required"}), 400
        if User.query.filter_by(email=email).first():
            return jsonify({"message": "User already exists"}), 409

        user = User(email=email, name=name)
        try:
            user.set_password(password)
        except ValueError as e:
            return jsonify({"message": str(e)}), 400

        db.session.add(user)
        db.session.commit()
        return jsonify({"message": "Registered"}), 201

    @app.post("/auth/login")
    def login():
        data = request.get_json(silent=True) or {}
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""

        user = User.query.filter_by(email=email).first()
        if not user or not user.check_password(password):
            return jsonify({"message": "Invalid credentials"}), 401

        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)

        resp = jsonify({"access_token": access_token, "user": user.to_safe_dict()})
        set_refresh_cookies(resp, refresh_token)
        return resp, 200

    @app.get("/auth/me")
    @jwt_required()
    def me():
        uid = get_jwt_identity()
        u = User.query.get(uid)
        if not u:
            return jsonify({"message": "Not found"}), 404
        return jsonify({"user": u.to_safe_dict()}), 200
    @app.put("/auth/update-profile")
    @jwt_required()
    def update_profile():
        uid = get_jwt_identity()
        user = User.query.get(uid)
        if not user:
            return jsonify({"message": "User not found"}), 404
        
        data = request.get_json(silent=True) or {}
        name = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip().lower()
        
        if not name or not email:
            return jsonify({"message": "Name and email required"}), 400
        
        # Check if email is already taken by another user
        if email != user.email:
            existing = User.query.filter_by(email=email).first()
            if existing:
                return jsonify({"message": "Email already in use"}), 409
        
        user.name = name
        user.email = email
        db.session.commit()
        
        return jsonify({
            "message": "Profile updated",
            "user": user.to_safe_dict()
        }), 200

    @app.put("/auth/update-password")
    @jwt_required()
    def update_password():
        uid = get_jwt_identity()
        user = User.query.get(uid)
        if not user:
            return jsonify({"message": "User not found"}), 404
        
        data = request.get_json(silent=True) or {}
        current_password = data.get("currentPassword") or ""
        new_password = data.get("newPassword") or ""
        
        if not current_password or not new_password:
            return jsonify({"message": "Current and new password required"}), 400
        
        # Verify current password
        if not user.check_password(current_password):
            return jsonify({"message": "Current password is incorrect"}), 401
        
        # Validate new password
        if len(new_password) < 8:
            return jsonify({"message": "Password must be at least 8 characters"}), 400
        
        try:
            user.set_password(new_password)
            db.session.commit()
            return jsonify({"message": "Password updated successfully"}), 200
        except ValueError as e:
            return jsonify({"message": str(e)}), 400
    @app.post("/auth/refresh")
    @jwt_required(refresh=True, locations=["cookies"])
    def refresh():
        uid = get_jwt_identity()
        new_access = create_access_token(identity=uid)
        return jsonify({"access_token": new_access}), 200

    @app.post("/auth/logout")
    def logout():
        resp = jsonify({"message": "Logged out"})
        unset_jwt_cookies(resp)
        return resp, 200

    @app.get("/protected")
    @jwt_required()
    def protected():
        uid = get_jwt_identity()
        user = User.query.get(uid)
        return jsonify({"hello": (user.email if user else uid), "msg": "You have access."}), 200

    # ========== WORD BANK ==========
    DEFAULT_BANK_COUNT = int(os.environ.get("DEFAULT_BANK_COUNT", "103"))

    @app.get("/api/bank")
    @jwt_required(optional=True)
    def get_bank():
        uid = get_jwt_identity()
        items = []
        if uid:
            rows = (
                SavedWord.query
                .filter_by(user_id=uid)
                .order_by(SavedWord.created_at.desc())
                .limit(600).all()
            )
            items = [w.to_dict() for w in rows]
        return jsonify({
            "items": items,
            "myListCount": len(items),
            "defaultCount": DEFAULT_BANK_COUNT
        }), 200

    @app.post("/api/bank")
    @jwt_required()
    def add_bank():
        uid = get_jwt_identity()
        data = request.get_json(silent=True) or {}
        english = (data.get("english") or "").strip()
        tamil = (data.get("tamil") or "").strip()
        translit = (data.get("transliteration") or None)
        if not english or not tamil:
            return jsonify({"message": "english and tamil required"}), 400

        existed = SavedWord.query.filter_by(user_id=uid, english=english).first()
        if existed:
            updated = False
            if tamil and existed.tamil != tamil:
                existed.tamil = tamil; updated = True
            if translit and existed.transliteration != translit:
                existed.transliteration = translit; updated = True
            if updated:
                db.session.commit()
            return jsonify({"status": "exists", "id": existed.id, "updated": updated}), 200

        row = SavedWord(user_id=uid, english=english, tamil=tamil, transliteration=translit)
        db.session.add(row)
        db.session.commit()
        
        # Check achievements
        user = User.query.get(uid)
        if user:
            check_achievements(user)
            db.session.commit()
        
        return jsonify({"status": "added", "id": row.id}), 201

    @app.delete("/api/bank/<int:wid>")
    @jwt_required()
    def delete_bank(wid):
        uid = get_jwt_identity()
        row = SavedWord.query.filter_by(id=wid, user_id=uid).first()
        if not row:
            return jsonify({"message": "not found"}), 404
        db.session.delete(row)
        db.session.commit()
        return jsonify({"status": "deleted"}), 200

    # ========== STREAK & STATS ==========
    @app.get("/api/stats")
    @jwt_required()
    def get_stats():
        uid = get_jwt_identity()
        user = User.query.get(uid)
        if not user:
            return jsonify({"message": "User not found"}), 404
        
        word_count = SavedWord.query.filter_by(user_id=uid).count()
        achievements = Achievement.query.filter_by(user_id=uid).all()
        
        # Calculate accuracy from flashcard reviews
        words_with_reviews = SavedWord.query.filter(
            SavedWord.user_id == uid,
            SavedWord.review_count > 0
        ).all()
        
        total_reviews = sum(w.review_count for w in words_with_reviews)
        total_correct = sum(w.correct_count for w in words_with_reviews)
        accuracy = round((total_correct / total_reviews * 100) if total_reviews > 0 else 0)
        
        # Get words learned per week (last 12 weeks)
        from sqlalchemy import func
        weeks_data = db.session.query(
            func.strftime('%Y-%W', SavedWord.created_at).label('week'),
            func.count(SavedWord.id).label('count')
        ).filter(
            SavedWord.user_id == uid,
            SavedWord.created_at >= datetime.utcnow() - timedelta(weeks=12)
        ).group_by('week').order_by('week').all()
        
        weekly_progress = [{"week": w.week, "words": w.count} for w in weeks_data]
        
        return jsonify({
            "currentStreak": user.current_streak,
            "longestStreak": user.longest_streak,
            "totalScans": user.total_scans,
            "totalQuizzes": user.total_quizzes,
            "totalWords": word_count,
            "accuracy": accuracy,
            "lastActivityDate": user.last_activity_date.isoformat() if user.last_activity_date else None,
            "achievements": [a.to_dict() for a in achievements],
            "weeklyProgress": weekly_progress
        }), 200

    @app.post("/api/activity/scan")
    @jwt_required()
    def log_scan():
        uid = get_jwt_identity()
        user = User.query.get(uid)
        if not user:
            return jsonify({"message": "User not found"}), 404
        
        user.total_scans += 1
        user.update_streak()
        check_achievements(user)
        db.session.commit()
        
        return jsonify({
            "currentStreak": user.current_streak,
            "totalScans": user.total_scans
        }), 200

    @app.post("/api/activity/quiz")
    @jwt_required()
    def log_quiz():
        uid = get_jwt_identity()
        user = User.query.get(uid)
        if not user:
            return jsonify({"message": "User not found"}), 404
        
        user.total_quizzes += 1
        user.update_streak()
        check_achievements(user)
        db.session.commit()
        
        return jsonify({
            "currentStreak": user.current_streak,
            "totalQuizzes": user.total_quizzes
        }), 200

    # ========== FLASHCARD REVIEW ==========
    @app.get("/api/flashcards/due")
    @jwt_required()
    def get_due_flashcards():
        uid = get_jwt_identity()
        now = datetime.utcnow()
        
        words = SavedWord.query.filter(
            SavedWord.user_id == uid,
            db.or_(
                SavedWord.next_review == None,
                SavedWord.next_review <= now
            )
        ).order_by(SavedWord.difficulty.desc()).limit(20).all()
        
        return jsonify({
            "flashcards": [w.to_dict() for w in words],
            "total": len(words)
        }), 200

    @app.post("/api/flashcards/<int:word_id>/review")
    @jwt_required()
    def review_flashcard(word_id):
        uid = get_jwt_identity()
        data = request.get_json(silent=True) or {}
        correct = data.get("correct", False)
        
        word = SavedWord.query.filter_by(id=word_id, user_id=uid).first()
        if not word:
            return jsonify({"message": "Word not found"}), 404
        
        word.review_count += 1
        word.last_reviewed = datetime.utcnow()
        
        if correct:
            word.correct_count += 1
            if word.difficulty > 0:
                word.difficulty -= 1
            word.next_review = datetime.utcnow() + timedelta(days=2 ** (word.difficulty + 1))
        else:
            if word.difficulty < 3:
                word.difficulty += 1
            word.next_review = datetime.utcnow() + timedelta(hours=4)
        
        db.session.commit()
        
        user = User.query.get(uid)
        if user:
            user.update_streak()
            db.session.commit()
        
        return jsonify({
            "status": "reviewed",
            "nextReview": word.next_review.isoformat() if word.next_review else None
        }), 200

    # ========== AI IDENTIFY ==========
    @app.post("/api/identify")
    def api_identify():
        genai_client = current_app.config.get("GENAI_CLIENT")
        vision_model = current_app.config.get("GEMINI_VISION_MODEL", "gemini-2.0-flash")

        if genai_client is None:
            return jsonify({"detail": "Vision unavailable: GEMINI_API_KEY not set or init failed"}), 502

        if "image" not in request.files:
            return jsonify({"detail": "Missing 'image' file"}), 400

        image = request.files["image"]
        if not ok_image_type(image.content_type):
            return jsonify({"detail": f"Unsupported image type: {image.content_type}"}), 400

        try:
            raw = image.read()
            jpg = compress_to_jpeg_bytes(raw)

            from google.genai import types
            resp = genai_client.models.generate_content(
                model=vision_model,
                contents=[
                    types.Part.from_text(text=STRICT_JSON_PROMPT),
                    types.Part.from_bytes(data=jpg, mime_type="image/jpeg"),
                ],
                config=types.GenerateContentConfig(
                    temperature=0.1, candidate_count=1, max_output_tokens=200
                ),
            )
            item = extract_json_loose(resp.text or "{}")

            tamil = (item.get("tamil") or "").strip()
            translit = (item.get("transliteration") or "").strip()
            english = (item.get("english") or "").strip()
            pos = (item.get("partOfSpeech") or None)
            conf = clamp01(item.get("confidence", 0))

            if (not tamil or not translit) and english:
                try:
                    tresp = genai_client.models.generate_content(
                        model=vision_model,
                        contents=[
                            types.Part.from_text(text=TRANSLATE_JSON_PROMPT),
                            types.Part.from_text(text=f"English: {english}"),
                        ],
                        config=types.GenerateContentConfig(
                            temperature=0.1, candidate_count=1, max_output_tokens=120
                        ),
                    )
                    tdata = extract_json_loose(tresp.text or "{}")
                    tamil = (tdata.get("tamil") or tamil).strip()
                    translit = (tdata.get("transliteration") or translit).strip()
                except Exception:
                    pass

            # Log scan activity if authenticated
            try:
                verify_jwt_in_request(optional=True)
                uid = get_jwt_identity()
                if uid:
                    user = User.query.get(uid)
                    if user:
                        user.total_scans += 1
                        user.update_streak()
                        check_achievements(user)
                        db.session.commit()
            except:
                pass

            return jsonify({
                "tamil": tamil,
                "transliteration": translit,
                "english": english,
                "partOfSpeech": pos,
                "confidence": conf
            })

        except Exception as e:
            print("[/api/identify ERROR]", e)
            return jsonify({"detail": f"Vision error: {e}"}), 502

    # ========== AI TRANSLATE ==========
    @app.post("/api/translate")
    def api_translate():
        genai_client = current_app.config.get("GENAI_CLIENT")
        vision_model = current_app.config.get("GEMINI_VISION_MODEL", "gemini-2.0-flash")

        if genai_client is None:
            return jsonify({"detail": "Translation unavailable: GEMINI_API_KEY not set"}), 502

        data = request.get_json(silent=True) or {}
        text = (data.get("text") or "").strip()
        
        if not text:
            return jsonify({"detail": "Missing 'text' field"}), 400

        try:
            from google.genai import types
            resp = genai_client.models.generate_content(
                model=vision_model,
                contents=[
                    types.Part.from_text(text=TRANSLATE_JSON_PROMPT),
                    types.Part.from_text(text=f"English: {text}"),
                ],
                config=types.GenerateContentConfig(
                    temperature=0.1, candidate_count=1, max_output_tokens=120
                ),
            )
            
            result = extract_json_loose(resp.text or "{}")
            
            tamil = (result.get("tamil") or "").strip()
            translit = (result.get("transliteration") or "").strip()
            english = (result.get("english") or text).strip()
            
            if not tamil:
                return jsonify({"detail": "Translation failed - no Tamil output"}), 500
            
            return jsonify({
                "tamil": tamil,
                "transliteration": translit,
                "english": english,
                "confidence": 1.0
            })

        except Exception as e:
            print("[/api/translate ERROR]", e)
            return jsonify({"detail": f"Translation error: {e}"}), 502

    return app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)