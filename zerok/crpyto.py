import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

def encrypt(key: bytes, plaintext: bytes) -> bytes:
    nonce = os.urandom(12)
    cipher = AESGCM(key)
    return nonce + cipher.encrypt(nonce, plaintext, None)

def decrypt(key: bytes, data: bytes) -> bytes:
    nonce = data[:12]
    ciphertext = data[12:]
    cipher = AESGCM(key)
    return cipher.decrypt(nonce, ciphertext, None)