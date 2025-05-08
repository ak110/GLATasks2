"""設定。"""

import datetime
import os
import pathlib

import dotenv
import pytilpack.secrets_

BASE_DIR = pathlib.Path(__file__).parent

dotenv.load_dotenv(BASE_DIR / ".env", verbose=True)

COMPOSE_PROFILE = os.environ.get("COMPOSE_PROFILE", "production")

DATA_DIR = pathlib.Path(os.environ.get("DATA_DIR", str(BASE_DIR / "data")))

DEV_SERVER_URL = os.environ.get("DEV_SERVER_URL", "http://devserver:5173")

SQLALCHEMY_DATABASE_URI = os.environ.get("SQLALCHEMY_DATABASE_URI")

FLASK_CONFIG = {
    "SECRET_KEY": pytilpack.secrets_.generate_secret_key(DATA_DIR / ".secret_key"),
    "SESSION_COOKIE_NAME": "gla-session",
    "SESSION_COOKIE_HTTPONLY": True,
    "PERMANENT_SESSION_LIFETIME": datetime.timedelta(days=365),
    "SEND_FILE_MAX_AGE_DEFAULT": 12 * 3600,  # Flask 2.0対策
    "DEBUG": True,
    "TEMPLATES_AUTO_RELOAD": True,
    # Quart-Auth
    # https://quart-auth.readthedocs.io/en/latest/how_to_guides/configuration.html
    "QUART_AUTH_COOKIE_NAME": "gla-remember",
    "QUART_AUTH_COOKIE_SECURE": False,
    "QUART_AUTH_SALT": "gla-auth",
}
