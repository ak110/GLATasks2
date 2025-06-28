"""リストモデル。"""

import typing

import sqlalchemy
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .task import Task


class List(Base):
    """リスト"""

    __tablename__ = "list"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(sqlalchemy.ForeignKey("user.id"), nullable=False, comment="親のユーザーID")
    status: Mapped[str] = mapped_column(sqlalchemy.String(255), nullable=False, default="show", comment="ステータス")
    title: Mapped[str] = mapped_column(sqlalchemy.String(255), nullable=False, comment="リスト名")

    # タスクの参照
    tasks = sqlalchemy.orm.relationship(Task, order_by=Task.updated.desc())

    def to_dict_(self) -> dict[str, typing.Any]:
        """dictへ変換。"""
        tasks = [task.to_dict_() for task in self.tasks]
        return {"id": self.id, "title": self.title, "tasks": tasks}
