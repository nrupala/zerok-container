import hashlib
from .crpyto import encrypt, decrypt

def blob_id(ciphertext: bytes) -> str:
    return hashlib.sha256(ciphertext).hexdigest()

def encrypt_blob(key: bytes, data: bytes):
    encrypted = encrypt(key, data)
    return blob_id(encrypted), encrypted

def decrypt_blob(key: bytes, encrypted: bytes) -> bytes:
    return decrypt(key, encrypted)