"""設定。"""

import os
import pathlib

import dotenv
import pytilpack.secrets

BASE_DIR = pathlib.Path(__file__).parent

dotenv.load_dotenv(BASE_DIR / ".env", verbose=True)

COMPOSE_PROFILE = os.environ.get("COMPOSE_PROFILE", "production")

# asyncioのデバッグモードを有効にする
if COMPOSE_PROFILE != "production":
    os.environ["PYTHONASYNCIODEBUG"] = "1"

DATA_DIR = pathlib.Path(os.environ.get("DATA_DIR", str(BASE_DIR / "data")))

DEV_SERVER_URL = os.environ.get("DEV_SERVER_URL", "http://devserver:5173")

SQLALCHEMY_DATABASE_URI = os.environ.get("SQLALCHEMY_DATABASE_URI")

INTERNAL_API_KEY: str = pytilpack.secrets.generate_secret_key(DATA_DIR / ".internal_api_key").hex()
