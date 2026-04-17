#!/usr/bin/env python3
"""Test Zerok - no external dependencies (except cryptography)"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from zerok.crpyto import encrypt, decrypt
from zerok.keys import derive_key, new_salt
from zerok.blob import encrypt_blob, decrypt_blob

def test_crypto():
    print("Testing crypto...")
    key = b"x" * 32
    data = b"secret message"
    encrypted = encrypt(key, data)
    decrypted = decrypt(key, encrypted)
    assert decrypted == data, "Crypto roundtrip failed"
    print("PASS: encrypt/decrypt works")

def test_keys():
    print("Testing key derivation...")
    salt = new_salt()
    key = derive_key(b"password", salt)
    assert len(key) == 32, "Key wrong length"
    print("PASS: key derivation works")

def test_blob():
    print("Testing blob operations...")
    key = b"x" * 32
    data = b"test data"
    blob_id, encrypted = encrypt_blob(key, data)
    decrypted = decrypt_blob(key, encrypted)
    assert decrypted == data
    print(f"PASS: blob encrypt/decrypt works (id: {blob_id[:16]}...)")

def test_different_nonces():
    print("Testing nonce uniqueness...")
    key = b"x" * 32
    data = b"test"
    _, enc1 = encrypt_blob(key, data)
    _, enc2 = encrypt_blob(key, data)
    assert enc1 != enc2, "Nonces should be different"
    print("PASS: nonces are unique")

if __name__ == "__main__":
    print("=" * 50)
    print("Zerok Test Suite")
    print("=" * 50)
    try:
        test_keys()
        test_crypto()
        test_blob()
        test_different_nonces()
        print("=" * 50)
        print("All tests passed!")
        print("=" * 50)
    except Exception as e:
        print(f"FAILED: {e}")
        sys.exit(1)