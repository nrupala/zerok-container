import requests
from .crpyto import encrypt, decrypt
from .blob import encrypt_blob, decrypt_blob
from .keys import derive_key, new_salt

class ZeroKClient:
    def __init__(self, endpoint: str, password: str):
        self.endpoint = endpoint
        self.salt = new_salt()
        self.key = derive_key(password.encode(), self.salt)

    def upload(self, data: bytes) -> str:
        blob_id, encrypted = encrypt_blob(self.key, data)
        requests.put(f"{self.endpoint}/blob/{blob_id}", data=encrypted)
        return blob_id

    def download(self, blob_id: str) -> bytes:
        r = requests.get(f"{self.endpoint}/blob/{blob_id}")
        return decrypt_blob(self.key, r.content)