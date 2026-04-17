from zerok.blob import encrypt_blob

def test_blob_id_determinism():
    key = b"x" * 32
    data = b"data"
    id1, _ = encrypt_blob(key, data)
    id2, _ = encrypt_blob(key, data)
    assert id1 != id2  # nonce randomness