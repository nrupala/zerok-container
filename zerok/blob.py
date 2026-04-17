import blake3
from .crypto import encrypt, decrypt

def blob_id(ciphertext: bytes) -> str:
    return blake3.blake3(ciphertext).hexdigest()

def encrypt_blob(key: bytes, data: bytes):
    encrypted = encrypt(key, data)
    return blob_id(encrypted), encrypted

def decrypt_blob(key: bytes, encrypted: bytes) -> bytes:
    return decrypt(key, encrypted)