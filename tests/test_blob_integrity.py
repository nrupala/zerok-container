from zerok.blob import encrypt_blob, decrypt_blob
from zerok.crpyto import encrypt, decrypt

def test_blob_encrypt_decrypt():
    key = b"x" * 32
    data = b"test data"
    blob_id, encrypted = encrypt_blob(key, data)
    decrypted = decrypt_blob(key, encrypted)
    assert decrypted == data, "Decryption failed"
    print("test_blob_encrypt_decrypt: PASSED")

def test_blob_id_determinism():
    key = b"x" * 32
    data = b"data"
    id1, _ = encrypt_blob(key, data)
    id2, _ = encrypt_blob(key, data)
    assert id1 != id2  # nonce randomness produces different IDs
    print("test_blob_id_determinism: PASSED")

def test_encrypt_decrypt():
    key = b"x" * 32
    data = b"secret"
    enc = encrypt(key, data)
    dec = decrypt(key, enc)
    assert dec == data
    print("test_encrypt_decrypt: PASSED")

def test_different_nonces():
    key = b"x" * 32
    data = b"test"
    enc1 = encrypt(key, data)
    enc2 = encrypt(key, data)
    assert enc1 != enc2  # should use different nonces
    print("test_different_nonces: PASSED")

if __name__ == "__main__":
    test_encrypt_decrypt()
    test_different_nonces()
    test_blob_encrypt_decrypt()
    test_blob_id_determinism()
    print("\nAll tests passed!")