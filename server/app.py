# app.py
from datetime import timedelta
import os, io, re, json
from flask import Flask, request, jsonify, current_app
from flask_cors import CORS
from flask_migrate import Migrate
from flask_jwt_extended import (
    JWTManager, create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, set_refresh_cookies,
    unset_jwt_cookies  # removed set_access_cookies from here (unused safely)
)
from models import db, User, SavedWord
from PIL import Image

# ---------------------------------------
# Small helpers used by /api/identify
# ---------------------------------------
def ok_image_type(ct):
    # Accept common camera uploads. Some browsers omit content-type, so allow None.
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

# ---------------------------------------
# App factory
# ---------------------------------------
def create_app():
    app = Flask(__name__)

    # ---- Core config ----
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-change-me")
    app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "dev-jwt-secret-change-me")

    # JWT in headers for access, in cookies for refresh
    app.config["JWT_TOKEN_LOCATION"] = ["headers", "cookies"]
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(minutes=15)
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=30)

    # Cookie settings (tune for prod)
    app.config["JWT_COOKIE_SECURE"] = False            # True in prod (HTTPS)
    app.config["JWT_COOKIE_SAMESITE"] = "Lax"
    app.config["JWT_COOKIE_CSRF_PROTECT"] = False      # Enable + send X-CSRF-TOKEN in prod

    # ---- Database ----
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///app.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    db.init_app(app)

    # Migrations (optional but recommended)
    Migrate(app, db)

    # ---- CORS ----
    FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000")
    CORS(
        app,
        resources={r"/*": {"origins": [FRONTEND_ORIGIN]}},
        supports_credentials=True,
    )

    # ---- JWT ----
    JWTManager(app)

    # ----- Gemini client (app-scoped) -----
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
    GEMINI_API_VERSION = os.environ.get("GEMINI_API_VERSION", "v1beta")
    GEMINI_VISION_MODEL = os.environ.get("GEMINI_VISION_MODEL", "gemini-2.0-flash")

    genai_client = None
    try:
        if GEMINI_API_KEY:
            # Make key visible to google-genai SDK
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

    # ---- Create tables automatically in dev (so `flask run` works) ----
    if os.environ.get("AUTO_CREATE_DB", "1") == "1":
        with app.app_context():
            db.create_all()

    # ---------------------------------------
    # Error handlers -> JSON (so frontend never gets HTML)
    # ---------------------------------------
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

    # ---------------------------------------
    # Routes
    # ---------------------------------------
    @app.get("/healthz")
    def healthz():
        return {"ok": True}, 200

    @app.post("/auth/register")
    def register():
        data = request.get_json(silent=True) or {}
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""

        if not email or not password:
            return jsonify({"message": "Email and password required"}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({"message": "User already exists"}), 409

        user = User(email=email)
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
        set_refresh_cookies(resp, refresh_token)  # httpOnly cookie (sent to browser)
        return resp, 200

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
        # removed set_access_cookies(resp, access_token) – access_token is not defined here
        return resp, 200

    @app.get("/protected")
    @jwt_required()
    def protected():
        uid = get_jwt_identity()
        user = User.query.get(uid)
        return jsonify({
            "hello": (user.email if user else uid),
            "msg": "You have access."
        }), 200

    # ---------- Vocabulary bank (personalized) ----------
    DEFAULT_BANK_COUNT = int(os.environ.get("DEFAULT_BANK_COUNT", "103"))

    @app.get("/api/bank")
    @jwt_required(optional=True)
    def get_bank():
        uid = get_jwt_identity()

        items = []
        if uid:
            rows = (SavedWord.query
                .filter_by(user_id=uid)
                .order_by(SavedWord.created_at.desc())
                .limit(600).all())
            items = [{"id": r.id, "english": r.english, "tamil": r.tamil, "transliteration": r.transliteration} for r in rows]

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
        db.session.add(row); db.session.commit()
        return jsonify({"status": "added", "id": row.id}), 201

    @app.delete("/api/bank/<int:wid>")
    @jwt_required()
    def delete_bank(wid):
        uid = get_jwt_identity()
        row = SavedWord.query.filter_by(id=wid, user_id=uid).first()
        if not row:
            return jsonify({"message": "not found"}), 404
        db.session.delete(row); db.session.commit()
        return jsonify({"status": "deleted"}), 200

    # --------- NEW: /api/identify (no auth) ---------
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

            from google.genai import types  # safe import here too
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

            # Fallback translate if needed
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

    return app


# WSGI entrypoint
app = create_app()

if __name__ == "__main__":
    # Running as a script (useful if you do `python app.py`)
    app.run(host="0.0.0.0", port=5000, debug=True)
