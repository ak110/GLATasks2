"""タスクモデル。"""

import datetime
import typing

import sqlalchemy
from sqlalchemy.orm import Mapped, mapped_column

from .base import STATUS_IDS, STATUS_NAMES, Base


class Task(Base):
    """タスク"""

    __tablename__ = "task"

    id: Mapped[int] = mapped_column(primary_key=True)
    list_id: Mapped[int] = mapped_column(sqlalchemy.ForeignKey("list.id"), nullable=False, comment="親のリストID")
    status_id: Mapped[int] = mapped_column(nullable=False, default=0, comment="ステータス")
    text: Mapped[str] = mapped_column(sqlalchemy.Text, nullable=False, comment="内容")
    created: Mapped[datetime.datetime] = mapped_column(
        nullable=False,
        default=datetime.datetime.now,
        comment="作成日時",
    )
    updated: Mapped[datetime.datetime] = mapped_column(
        nullable=False,
        default=datetime.datetime.now,
        comment="最終更新日時",
    )
    completed: Mapped[datetime.datetime | None] = mapped_column(comment="完了日時")

    @property
    def status(self):
        return STATUS_NAMES[self.status_id]

    @status.setter
    def status(self, value):
        self.status_id = STATUS_IDS[value]

    @property
    def title(self):
        return self.text.split("\n", 1)[0].lstrip("\r\n").rstrip()

    @property
    def notes(self):
        s = self.text.split("\n", 1)
        return s[1].lstrip("\r\n").rstrip() if len(s) == 2 else ""

    def to_dict_(self) -> dict[str, typing.Any]:
        """dictへ変換。"""
        return {
            "id": self.id,
            "title": self.title,
            "notes": self.notes,
            "status": self.status,
        }
