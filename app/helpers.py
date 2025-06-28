"""テンプレートから呼び出すユーティリティ。"""

import base64
import json
import typing

import config
import models
import pytilpack.pycrypto
import pytilpack.quart
import pytilpack.quart_auth
import pytilpack.secrets

encrypt_key = pytilpack.secrets.generate_secret_key(config.DATA_DIR / ".encrypt_key", nbytes=32)


def get_logged_in_user() -> models.User:
    """現在のログインユーザを取得する。"""
    current_user = pytilpack.quart_auth.current_user()
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


def static_url_for(filename: str) -> str:
    """cash busting付きのstatic用url_for。"""
    return pytilpack.quart.static_url_for(filename=filename)


def base64encode(s: str | bytes) -> str:
    """BASE64"""
    if isinstance(s, str):
        s = s.encode("utf-8")
    return base64.b64encode(s).decode("utf-8")


def encryptObject(obj: typing.Any) -> str:
    """JSON化してencrypt()"""
    return encrypt(json.dumps(obj))


def encrypt(plaintext: str) -> str:
    """難読化。"""
    return pytilpack.pycrypto.encrypt(plaintext, encrypt_key)


def decrypt(ciphertext: str) -> str:
    """難読化解除。"""
    return pytilpack.pycrypto.decrypt(ciphertext, encrypt_key)
