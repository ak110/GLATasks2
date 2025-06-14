"""ユーザーモデル。"""

import datetime
import re

import bcrypt
import pytilpack.quart_auth_
import sqlalchemy
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .list import List


class User(Base, pytilpack.quart_auth_.UserMixin):
    """ユーザー"""

    __tablename__ = "user"

    id: Mapped[int] = mapped_column(primary_key=True)
    user: Mapped[str] = mapped_column(
        sqlalchemy.String(80), unique=True, nullable=False, comment="ユーザーID"
    )
    pass_hash: Mapped[str] = mapped_column(
        sqlalchemy.String(255), nullable=False, comment="パスワードハッシュ"
    )
    joined: Mapped[datetime.datetime] = mapped_column(
        nullable=False,
        default=lambda: datetime.datetime.now(datetime.UTC),
        comment="登録日時",
    )
    last_login: Mapped[datetime.datetime | None] = mapped_column(
        comment="最終ログイン時刻"
    )

    # リストの参照
    lists = sqlalchemy.orm.relationship(List, order_by=List.title)

    def get_id(self) -> str:
        """認証ID。"""
        return self.user

    def set_password(self, new_password):
        """パスワード設定。"""
        salt = bcrypt.gensalt(rounds=10, prefix=b"2a")
        self.pass_hash = bcrypt.hashpw(new_password.encode("utf-8"), salt).decode(
            "utf-8"
        )

    def password_is_ok(self, input_password):
        """パスワードチェック。"""
        return bcrypt.checkpw(
            input_password.encode("utf-8"), self.pass_hash.encode("utf-8")
        )

    @staticmethod
    def add(user_id, password):
        """ユーザー追加。"""
        if not re.match(r"^[a-zA-Z0-9]{4,32}$", user_id):
            raise ValueError("ユーザーIDは4～32文字の英数字としてください。")
        if len(password) <= 0:
            raise ValueError("パスワードは必須です。")
        stmt = User.select().filter(User.user == user_id)
        result = Base.session().execute(stmt)
        if result.scalar_one_or_none() is not None:
            raise ValueError("既に存在するユーザーIDです。")
        user = User(user=user_id, joined=datetime.datetime.now(datetime.UTC))
        user.set_password(password)
        Base.session().add(user)
        Base.session().commit()
