from zerok.crpyto import encrypt, decrypt

def test_encrypt_decrypt_roundtrip():
    key = b"x" * 32
    data = b"secret"
    enc = encrypt(key, data)
    dec = decrypt(key, enc)
    assert dec == data, "Decryption failed - data mismatch"
    print("test_encrypt_decrypt_roundtrip: PASSED")

def test_different_nonces():
    key = b"x" * 32
    data = b"test"
    enc1 = encrypt(key, data)
    enc2 = encrypt(key, data)
    assert enc1 != enc2, "Encryption should use different nonces"
    print("test_different_nonces: PASSED")

if __name__ == "__main__":
    test_encrypt_decrypt_roundtrip()
    test_different_nonces()
    print("All crypto tests passed!")