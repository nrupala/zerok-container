import os
from argon2.low_level import hash_secret_raw, Type

def new_salt() -> bytes:
    return os.urandom(16)

def derive_key(password: bytes, salt: bytes) -> bytes:
    return hash_secret_raw(
        secret=password,
        salt=salt,
        time_cost=3,
        memory_cost=65536,
        parallelism=2,
        hash_len=32,
        type=Type.ID
    )