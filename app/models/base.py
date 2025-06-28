"""モデルのベースクラス。"""

import pytilpack.sqlalchemy
from sqlalchemy.orm import DeclarativeBase

STATUS_NAMES = {0: "needsAction", 1: "completed", 2: "hidden", 3: "deleted"}
STATUS_IDS = {v: k for k, v in STATUS_NAMES.items()}


class Base(DeclarativeBase, pytilpack.sqlalchemy.SyncMixin):
    """モデルのベースクラス。"""
