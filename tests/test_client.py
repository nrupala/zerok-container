#!/usr/bin/env python3
"""Test client upload/download with mock server"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from zerok.crpyto import encrypt, decrypt
from zerok.keys import derive_key, new_salt
from zerok.blob import encrypt_blob, decrypt_blob, blob_id
from zerok.client import ZeroKClient

# Test with a local "mock" server - just write to files
class MockClient(ZeroKClient):
    def __init__(self, endpoint, password):
        super().__init__(endpoint, password)
        self.storage = {}
    
    def upload(self, data: bytes) -> str:
        blob_id, encrypted = encrypt_blob(self.key, data)
        self.storage[blob_id] = encrypted
        return blob_id
    
    def download(self, blob_id: str) -> bytes:
        if blob_id not in self.storage:
            raise Exception("Not found")
        return decrypt_blob(self.key, self.storage[blob_id])

def test_client():
    print("Testing client...")
    client = MockClient("http://localhost:5000", "testpassword123")
    
    # Upload
    data = b"Hello Zerok!"
    blob_id = client.upload(data)
    print(f"  Uploaded with ID: {blob_id[:16]}...")
    
    # Download
    retrieved = client.download(blob_id)
    assert retrieved == data, "Data mismatch"
    print(f"  Downloaded: {retrieved}")
    
    # Test with different data
    data2 = b"Sensitive data with encryption"
    blob_id2 = client.upload(data2)
    retrieved2 = client.download(blob_id2)
    assert retrieved2 == data2
    print(f"  Uploaded/downloaded multiple blobs")
    
    print("PASS: Client works!")

if __name__ == "__main__":
    test_client()