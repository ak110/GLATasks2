"""テンプレートから呼び出すユーティリティ。"""

import base64
import json
import pathlib
import secrets
import typing

import Crypto.Cipher.AES
import Crypto.Random
import Crypto.Util.Padding
import pytilpack.quart_auth_
import quart

import models

encrypt_key = secrets.token_bytes(16)
encrypt_iv = Crypto.Random.get_random_bytes(16)


def get_logged_in_user() -> models.User:
    """現在のログインユーザを取得する。"""
    current_user = pytilpack.quart_auth_.current_user()
    if not current_user.is_authenticated:
        raise ValueError("User is not authenticated.")
    return typing.cast(models.User, current_user)


def get_title(*args):
    """タイトルタグの中身の生成"""
    system_name = "GLATasks"
    # if config.DEBUG_MODE:
    #     system_name += "【開発環境】"
    parts = list(args) + [system_name]
    return " - ".join(filter(lambda x: x is not None, parts))


def static_url_for(**kwargs):
    """cash busting付きのstatic用url_for。"""
    filename = kwargs.get("filename", None)
    if filename:
        path = pathlib.Path(quart.current_app.root_path) / "static" / filename
        kwargs["q"] = int(path.stat().st_mtime)
    return quart.url_for("static", **kwargs)


def base64encode(s: str | bytes) -> str:
    """BASE64"""
    if isinstance(s, str):
        s = s.encode("utf-8")
    return base64.b64encode(s).decode("utf-8")


def encryptObject(obj: typing.Any) -> str:
    """JSON化してencrypt()"""
    return encrypt(json.dumps(obj))


def encrypt(s: str) -> str:
    """諸事情による難読化。"""
    s = s.encode("utf-8")
    cipher = Crypto.Cipher.AES.new(
        encrypt_key, Crypto.Cipher.AES.MODE_CBC, iv=encrypt_iv
    )
    encrypted = cipher.encrypt(Crypto.Util.Padding.pad(s, Crypto.Cipher.AES.block_size))
    return base64.b64encode(encrypted).decode("utf-8")


def decrypt(s: str) -> str:
    """暗号化されたデータを復号。"""
    encrypted = base64.b64decode(s)
    cipher = Crypto.Cipher.AES.new(
        encrypt_key, Crypto.Cipher.AES.MODE_CBC, iv=encrypt_iv
    )
    decrypted = Crypto.Util.Padding.unpad(
        cipher.decrypt(encrypted), Crypto.Cipher.AES.block_size
    )
    return decrypted.decode("utf-8")
