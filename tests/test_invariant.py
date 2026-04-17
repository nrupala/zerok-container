from zerok.crypto import encrypt, decrypt

def test_encrypt_decrypt_roundtrip():
    key = b"x" * 32
    data = b"secret"
    enc = encrypt(key, data)
    dec = decrypt(key, enc)
    assert dec == data
