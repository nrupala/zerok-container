import os
import hashlib

def new_salt() -> bytes:
    return os.urandom(16)

def derive_key(password: bytes, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", password, salt, iterations=100000, dklen=32)