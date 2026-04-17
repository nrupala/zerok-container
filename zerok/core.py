"""
Core interface boundary.

Only this module may be imported by GUI or CLI layers.
Direct access to crypto or keys is forbidden by design.
"""

from .client import ZeroKClient

__all__ = ["init_client"]

def init_client(endpoint: str, password: str) -> ZeroKClient:
    if not isinstance(password, str) or len(password) < 8:
        raise ValueError("Password must be at least 8 characters")
    return ZeroKClient(endpoint, password)