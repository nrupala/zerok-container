import os
from cryptography.hazmat.primitives.ciphers.aead import XChaCha20Poly1305

def encrypt(key: bytes, plaintext: bytes) -> bytes:
    nonce = os.urandom(24)
    cipher = XChaCha20Poly1305(key)
    return nonce + cipher.encrypt(nonce, plaintext, None)

def decrypt(key: bytes, data: bytes) -> bytes:
    nonce = data[:24]
    ciphertext = data[24:]
    cipher = XChaCha20Poly1305(key)
    return cipher.decrypt(nonce, ciphertext, None)